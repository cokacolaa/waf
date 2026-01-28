import crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../../../utils/logger';
import prisma from '../../../config/database';
import { ClusterRepository } from '../cluster.repository';
import { SyncConfigData, ImportResults } from '../cluster.types';
import { SSL_CONSTANTS } from '../../ssl/ssl.types';
import { nginxConfigService } from '../../domains/services/nginx-config.service';
import { nginxReloadService } from '../../domains/services/nginx-reload.service';
import { aclNginxService } from '../../acl/services/acl-nginx.service';
import { nlbService } from '../../nlb/nlb.service';

/**
 * Node Sync Service
 * Handles configuration synchronization between master and slave nodes
 */
export class NodeSyncService {
  private repository: ClusterRepository;
  private readonly modsecCustomRulesPath = '/etc/nginx/modsec/custom_rules';
  private readonly modsecCrsRulesPath = '/etc/nginx/modsec/coreruleset/rules';
  private readonly modsecCrsDisableFile = '/etc/nginx/modsec/crs_disabled.conf';

  constructor() {
    this.repository = new ClusterRepository();
  }

  /**
   * Export configuration for slave sync (NO timestamps to keep hash stable)
   */
  async exportForSync(slaveNodeId?: string): Promise<{ hash: string; config: SyncConfigData }> {
    try {
      logger.info('[NODE-SYNC] Exporting config for slave sync', {
        slaveNodeId
      });

      // Collect data WITHOUT timestamps/IDs that change
      const syncData = await this.repository.collectSyncData();

      // Calculate hash for comparison
      const dataString = JSON.stringify(syncData);
      const hash = crypto.createHash('sha256').update(dataString).digest('hex');

      // Update slave node's config hash (master knows what config slave should have)
      if (slaveNodeId) {
        await this.repository.updateConfigHash(slaveNodeId, hash);
      }

      return {
        hash,
        config: syncData
      };
    } catch (error) {
      logger.error('[NODE-SYNC] Export for sync error:', error);
      throw error;
    }
  }

  /**
   * Import configuration from master (slave imports synced config)
   */
  async importFromMaster(hash: string, config: SyncConfigData): Promise<{
    imported: boolean;
    hash: string;
    changes: number;
    details?: ImportResults;
  }> {
    try {
      // Get current config hash
      const currentConfig = await this.repository.collectSyncData();
      const currentHash = crypto.createHash('sha256').update(JSON.stringify(currentConfig)).digest('hex');

      logger.info('[NODE-SYNC] Import check', {
        currentHash,
        newHash: hash,
        needsImport: currentHash !== hash
      });

      // If hash is same, skip import
      if (currentHash === hash) {
        // Still ensure filesystem matches config (cert files, nginx configs, etc.)
        await this.applyConfigToFilesystem(config);
        return {
          imported: false,
          hash: currentHash,
          changes: 0
        };
      }

      // Hash different → Import config
      logger.info('[NODE-SYNC] Hash mismatch, importing config...');
      const results = await this.repository.importSyncConfig(config);

      // Materialize config to filesystem (SSL files, nginx configs, ACL, ModSec, NLB)
      await this.applyConfigToFilesystem(config);

      // Update SystemConfig with new connection timestamp
      await this.repository.updateSystemConfigLastConnected();

      logger.info('[NODE-SYNC] Import completed', results);

      return {
        imported: true,
        hash,
        changes: results.totalChanges,
        details: results
      };
    } catch (error: any) {
      logger.error('[NODE-SYNC] Import error:', error);
      throw error;
    }
  }

  /**
   * Apply synced config to filesystem (SSL files, nginx configs, ACL, ModSec, NLB)
   */
  private async applyConfigToFilesystem(config: SyncConfigData): Promise<void> {
    try {
      await this.writeSslFiles(config);
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to write SSL files:', error);
    }

    try {
      await this.writeModSecFiles();
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to write ModSecurity files:', error);
    }

    try {
      await this.writeAclFiles();
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to write ACL files:', error);
    }

    try {
      await this.generateNginxDomainConfigs();
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to generate nginx domain configs:', error);
    }

    try {
      await nlbService.regenerateAllStreamConfigs();
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to regenerate NLB stream configs:', error);
    }

    try {
      await nginxReloadService.autoReload(true);
    } catch (error) {
      logger.error('[NODE-SYNC] Failed to reload nginx after sync:', error);
    }
  }

  /**
   * Write SSL certificate files to disk
   */
  private async writeSslFiles(config: SyncConfigData): Promise<void> {
    if (!config.sslCertificates || config.sslCertificates.length === 0) {
      return;
    }

    await fs.mkdir(SSL_CONSTANTS.CERTS_PATH, { recursive: true });

    for (const cert of config.sslCertificates) {
      if (!cert.domainName) {
        continue;
      }

      const certPath = path.join(SSL_CONSTANTS.CERTS_PATH, `${cert.domainName}.crt`);
      const keyPath = path.join(SSL_CONSTANTS.CERTS_PATH, `${cert.domainName}.key`);
      const chainPath = path.join(SSL_CONSTANTS.CERTS_PATH, `${cert.domainName}.chain.crt`);

      await fs.writeFile(certPath, cert.certificate, 'utf-8');
      await fs.writeFile(keyPath, cert.privateKey, 'utf-8');
      await fs.chmod(keyPath, 0o600);

      if (cert.chain) {
        await fs.writeFile(chainPath, cert.chain, 'utf-8');
      } else {
        await fs.unlink(chainPath).catch(() => {});
      }
    }
  }

  /**
   * Write ModSecurity custom rules and CRS disable file
   */
  private async writeModSecFiles(): Promise<void> {
    await fs.mkdir(this.modsecCustomRulesPath, { recursive: true });

    // Clean old custom rule files to avoid duplicate IDs
    try {
      const entries = await fs.readdir(this.modsecCustomRulesPath);
      for (const entry of entries) {
        if (entry.startsWith('custom_') && (entry.endsWith('.conf') || entry.endsWith('.conf.disabled'))) {
          await fs.unlink(path.join(this.modsecCustomRulesPath, entry)).catch(() => {});
        }
      }
    } catch (error) {
      logger.warn('[NODE-SYNC] Failed to clean old ModSecurity custom rules:', error);
    }

    const customRules = await prisma.modSecRule.findMany();
    for (const rule of customRules) {
      const enabledFile = path.join(this.modsecCustomRulesPath, `custom_${rule.id}.conf`);
      const disabledFile = path.join(this.modsecCustomRulesPath, `custom_${rule.id}.conf.disabled`);
      const targetFile = rule.enabled ? enabledFile : disabledFile;
      const otherFile = rule.enabled ? disabledFile : enabledFile;

      await fs.writeFile(targetFile, rule.ruleContent, 'utf-8');
      await fs.unlink(otherFile).catch(() => {});
    }

    const disabledCrsRules = await prisma.modSecCRSRule.findMany({
      where: { enabled: false },
    });

    let disableContent = '# CRS Disabled Rules\n';
    disableContent += '# Auto-generated by Nginx Love UI - DO NOT EDIT MANUALLY\n';
    disableContent += `# Generated at: ${new Date().toISOString()}\n\n`;

    if (disabledCrsRules.length === 0) {
      disableContent += '# No disabled rules\n';
    } else {
      for (const rule of disabledCrsRules) {
        disableContent += `# Disable: ${rule.name || rule.ruleFile}\n`;
        disableContent += `# File: ${rule.ruleFile}\n`;

        const crsFilePath = path.join(this.modsecCrsRulesPath, rule.ruleFile);
        try {
          const content = await fs.readFile(crsFilePath, 'utf-8');
          const idMatches = content.matchAll(/id:(\d+)/g);
          const ids = new Set<number>();
          for (const match of idMatches) {
            ids.add(parseInt(match[1], 10));
          }

          if (ids.size === 0) {
            disableContent += `# Warning: No rule IDs found in ${rule.ruleFile}\n`;
          } else {
            for (const id of ids) {
              disableContent += `SecRuleRemoveById ${id}\n`;
            }
          }
        } catch (error) {
          disableContent += `# Warning: Failed to read ${rule.ruleFile}\n`;
        }

        disableContent += '\n';
      }
    }

    await fs.writeFile(this.modsecCrsDisableFile, disableContent, 'utf-8');
  }

  /**
   * Write ACL config files
   */
  private async writeAclFiles(): Promise<void> {
    const aclService = aclNginxService as unknown as {
      generateAclConfig: () => Promise<string>;
      generateRateLimitConfig: () => Promise<string>;
      writeAclConfig: (config: string) => Promise<void>;
      writeRateLimitConfig: (config: string) => Promise<void>;
    };

    const aclConfig = await aclService.generateAclConfig();
    const rateLimitConfig = await aclService.generateRateLimitConfig();

    await aclService.writeAclConfig(aclConfig);
    await aclService.writeRateLimitConfig(rateLimitConfig);
  }

  /**
   * Regenerate nginx configs for all domains
   */
  private async generateNginxDomainConfigs(): Promise<void> {
    const domains = await prisma.domain.findMany({
      include: {
        upstreams: true,
        loadBalancer: true,
        sslCertificate: true,
        modsecRules: true,
        accessLists: {
          include: {
            accessList: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const domain of domains) {
      try {
        await nginxConfigService.generateConfig(domain as any);
      } catch (error) {
        logger.error(`[NODE-SYNC] Failed to generate nginx config for ${domain.name}:`, error);
      }
    }
  }

  /**
   * Get current config hash of slave node
   */
  async getCurrentConfigHash(): Promise<string> {
    try {
      const currentConfig = await this.repository.collectSyncData();
      const configString = JSON.stringify(currentConfig);
      const hash = crypto.createHash('sha256').update(configString).digest('hex');

      logger.info('[NODE-SYNC] Current config hash calculated', { hash });

      return hash;
    } catch (error: any) {
      logger.error('[NODE-SYNC] Get current hash error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const nodeSyncService = new NodeSyncService();
