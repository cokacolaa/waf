import logger from '../../utils/logger';
import { accessListsRepository } from './access-lists.repository';
import { nginxConfigService } from './services/nginx-config.service';
import { domainsService } from '../domains/domains.service';
import {
  AccessListWithRelations,
  AccessListQueryOptions,
  CreateAccessListInput,
  UpdateAccessListInput,
  ApplyAccessListToDomainInput,
  NginxConfigResult,
} from './access-lists.types';
import { PaginationMeta } from '../../shared/types/common.types';
import prisma from '../../config/database';

/**
 * Main service for Access Lists operations
 */
export class AccessListsService {
  /**
   * Get all access lists with pagination and filters
   */
  async getAccessLists(
    options: AccessListQueryOptions
  ): Promise<{ accessLists: AccessListWithRelations[]; pagination: PaginationMeta }> {
    return accessListsRepository.findAll(options);
  }

  /**
   * Get access list by ID
   */
  async getAccessListById(id: string): Promise<AccessListWithRelations | null> {
    return accessListsRepository.findById(id);
  }

  /**
   * Create new access list
   */
  async createAccessList(
    input: CreateAccessListInput,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<AccessListWithRelations> {
    // Check if access list already exists
    const existing = await accessListsRepository.findByName(input.name);
    if (existing) {
      throw new Error('Access list with this name already exists');
    }

    // Validate input based on type
    this.validateAccessListInput(input);

    // Note: Passwords are stored as plain text because htpasswd tool will hash them
    // during nginx config generation with the proper format (apr1/MD5)
    
    // Create access list
    const accessList = await accessListsRepository.create(input);

    // Generate Nginx configuration
    await nginxConfigService.generateConfig(accessList);

    // Reload Nginx if enabled
    if (accessList.enabled) {
      await nginxConfigService.reloadNginx();
    }

    // Log activity
    await this.logActivity(
      userId,
      `Created access list: ${input.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${input.name} created by user ${username}`);

    return accessList;
  }

  /**
   * Update access list
   */
  async updateAccessList(
    id: string,
    input: UpdateAccessListInput,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<AccessListWithRelations> {
    // Check if access list exists
    const existing = await accessListsRepository.findById(id);
    if (!existing) {
      throw new Error('Access list not found');
    }

    // Check name uniqueness if changing
    if (input.name && input.name !== existing.name) {
      const duplicate = await accessListsRepository.findByName(input.name);
      if (duplicate) {
        throw new Error('Access list with this name already exists');
      }
    }

    // Validate input based on type
    if (input.type) {
      this.validateAccessListInput(input as CreateAccessListInput);
    }

    // Note: Passwords are stored as plain text because htpasswd tool will hash them
    // during nginx config generation with the proper format (apr1/MD5)
    
    // Update access list
    const accessList = await accessListsRepository.update(id, input);

    // Delete old config if name changed
    if (input.name && input.name !== existing.name) {
      await nginxConfigService.deleteConfig(existing.name);
    }

    // Generate new Nginx configuration
    await nginxConfigService.generateConfig(accessList);

    // Regenerate nginx configs for all domains using this access list
    if (accessList.domains && accessList.domains.length > 0) {
      for (const domainLink of accessList.domains) {
        try {
          await domainsService.regenerateConfig(domainLink.domainId);
          logger.info(`Regenerated config for domain ${domainLink.domainId} after updating access list`);
        } catch (error) {
          logger.error(`Failed to regenerate config for domain ${domainLink.domainId}:`, error);
        }
      }
    }

    // Always reload Nginx after update (config files changed)
    await nginxConfigService.reloadNginx();

    // Log activity
    await this.logActivity(
      userId,
      `Updated access list: ${accessList.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${accessList.name} updated by user ${username}`);

    return accessList;
  }

  /**
   * Delete access list
   */
  async deleteAccessList(
    id: string,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<void> {
    // Check if access list exists
    const accessList = await accessListsRepository.findById(id);
    if (!accessList) {
      throw new Error('Access list not found');
    }

    // Delete Nginx configuration
    await nginxConfigService.deleteConfig(accessList.name);

    // Delete from database
    await accessListsRepository.delete(id);

    // Reload Nginx
    await nginxConfigService.reloadNginx();

    // Log activity
    await this.logActivity(
      userId,
      `Deleted access list: ${accessList.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${accessList.name} deleted by user ${username}`);
  }

  /**
   * Toggle access list enabled status
   */
  async toggleAccessList(
    id: string,
    enabled: boolean,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<AccessListWithRelations> {
    // Check if access list exists
    const existing = await accessListsRepository.findById(id);
    if (!existing) {
      throw new Error('Access list not found');
    }

    // Toggle enabled status
    const accessList = await accessListsRepository.toggleEnabled(id, enabled);

    // Regenerate access list config file
    await nginxConfigService.generateConfig(accessList);

    // Regenerate nginx configs for all domains using this access list
    if (accessList.domains && accessList.domains.length > 0) {
      for (const domainLink of accessList.domains) {
        try {
          await domainsService.regenerateConfig(domainLink.domainId);
          logger.info(`Regenerated config for domain ${domainLink.domainId} after toggling access list`);
        } catch (error) {
          logger.error(`Failed to regenerate config for domain ${domainLink.domainId}:`, error);
        }
      }
    }

    // Reload Nginx
    await nginxConfigService.reloadNginx();

    // Log activity
    await this.logActivity(
      userId,
      `${enabled ? 'Enabled' : 'Disabled'} access list: ${accessList.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${accessList.name} ${enabled ? 'enabled' : 'disabled'} by user ${username}`);

    return accessList;
  }

  /**
   * Apply access list to domain
   */
  async applyToDomain(
    input: ApplyAccessListToDomainInput,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<NginxConfigResult> {
    const { accessListId, domainId, enabled = true } = input;

    // Verify access list exists
    const accessList = await accessListsRepository.findById(accessListId);
    if (!accessList) {
      throw new Error('Access list not found');
    }

    // Verify domain exists
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) {
      throw new Error('Domain not found');
    }

    // Apply to domain
    await accessListsRepository.applyToDomain(accessListId, domainId, enabled);

    // Regenerate domain's nginx config to include access list
    await domainsService.regenerateConfig(domainId);
    
    const reloadResult: NginxConfigResult = { success: true, message: 'Nginx reloaded successfully' };

    // Log activity
    await this.logActivity(
      userId,
      `Applied access list ${accessList.name} to domain ${domain.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${accessList.name} applied to domain ${domain.name} by user ${username}`);

    return reloadResult;
  }

  /**
   * Remove access list from domain
   */
  async removeFromDomain(
    accessListId: string,
    domainId: string,
    userId: string,
    username: string,
    ip: string,
    userAgent: string
  ): Promise<NginxConfigResult> {
    // Verify access list exists
    const accessList = await accessListsRepository.findById(accessListId);
    if (!accessList) {
      throw new Error('Access list not found');
    }

    // Verify domain exists
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });
    if (!domain) {
      throw new Error('Domain not found');
    }

    // Remove from domain
    await accessListsRepository.removeFromDomain(accessListId, domainId);

    // Regenerate domain's nginx config to remove access list
    await domainsService.regenerateConfig(domainId);
    
    const reloadResult: NginxConfigResult = { success: true, message: 'Nginx reloaded successfully' };

    // Log activity
    await this.logActivity(
      userId,
      `Removed access list ${accessList.name} from domain ${domain.name}`,
      'config_change',
      ip,
      userAgent,
      true
    );

    logger.info(`Access list ${accessList.name} removed from domain ${domain.name} by user ${username}`);

    return reloadResult;
  }

  /**
   * Get access lists by domain ID
   */
  async getAccessListsByDomainId(domainId: string): Promise<AccessListWithRelations[]> {
    return accessListsRepository.findByDomainId(domainId);
  }

  /**
   * Get statistics
   */
  async getStats() {
    return accessListsRepository.getStats();
  }

  /**
   * Validate access list input based on type
   */
  private validateAccessListInput(input: CreateAccessListInput) {
    switch (input.type) {
      case 'ip_whitelist':
        if (!input.allowedIps || input.allowedIps.length === 0) {
          throw new Error('IP whitelist type requires at least one allowed IP');
        }
        break;

      case 'http_basic_auth':
        if (!input.authUsers || input.authUsers.length === 0) {
          throw new Error('HTTP Basic Auth type requires at least one auth user');
        }
        break;

      case 'combined':
        if (!input.allowedIps || input.allowedIps.length === 0) {
          throw new Error('Combined type requires at least one allowed IP');
        }
        if (!input.authUsers || input.authUsers.length === 0) {
          throw new Error('Combined type requires at least one auth user');
        }
        break;

      default:
        throw new Error(`Invalid access list type: ${input.type}`);
    }
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    type: string,
    ip: string,
    userAgent: string,
    success: boolean
  ) {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          type: type as any,
          ip,
          userAgent,
          success,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log activity', error);
    }
  }
}

export const accessListsService = new AccessListsService();
