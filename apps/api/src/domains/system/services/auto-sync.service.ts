import logger from '../../../utils/logger';
import { SystemConfigService } from '../system-config.service';

/**
 * Auto Sync Service
 * Periodically pulls config from master when node is in slave mode
 */
export class AutoSyncService {
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;
  private lastSyncAt: number | null = null;
  private readonly checkIntervalMs: number;
  private readonly systemConfigService: SystemConfigService;

  constructor(checkIntervalMs: number = 5000) {
    this.checkIntervalMs = checkIntervalMs;
    this.systemConfigService = new SystemConfigService();
  }

  start(): NodeJS.Timeout {
    if (this.timer) {
      return this.timer;
    }

    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        logger.error('[AUTO-SYNC] Tick error:', error);
      });
    }, this.checkIntervalMs);

    // Run once at startup
    this.tick().catch((error) => {
      logger.error('[AUTO-SYNC] Initial tick error:', error);
    });

    return this.timer;
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.inFlight) {
      return;
    }

    const config = await this.systemConfigService.getSystemConfig();

    if (!config || config.nodeMode !== 'slave') {
      return;
    }

    if (!config.connected || !config.masterHost || !config.masterApiKey) {
      return;
    }

    const interval = config.syncInterval;
    if (interval <= 0) {
      return;
    }

    if (interval < 10 || interval > 60) {
      return;
    }

    const now = Date.now();
    if (this.lastSyncAt && now - this.lastSyncAt < interval * 1000) {
      return;
    }

    this.inFlight = true;
    try {
      await this.systemConfigService.syncWithMasterInternal();
      this.lastSyncAt = Date.now();
    } catch (error) {
      logger.error('[AUTO-SYNC] Sync failed:', error);
    } finally {
      this.inFlight = false;
    }
  }
}

// Singleton + helpers
export const autoSyncService = new AutoSyncService();

export function startAutoSync(): NodeJS.Timeout {
  logger.info('[AUTO-SYNC] Starting auto sync service');
  return autoSyncService.start();
}

export function stopAutoSync(): void {
  logger.info('[AUTO-SYNC] Stopping auto sync service');
  autoSyncService.stop();
}
