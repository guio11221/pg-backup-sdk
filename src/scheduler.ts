import cron from 'node-cron';
import { config } from './config.js';
import { runBackupJob } from './backup.js';
import { Logger } from './logger.js';

let isRunning = false;

export function startBackupScheduler(): void {
  if (!cron.validate(config.backup.cron)) {
    throw new Error(`Invalid CRON expression: ${config.backup.cron}`);
  }

  Logger.info(`Scheduler started with CRON: ${config.backup.cron}`);
  Logger.info(`Backup directory: ${config.backup.dir}`);
  Logger.info(`Retention: ${config.backup.retentionDays} days`);

  cron.schedule(config.backup.cron, async () => {
    if (isRunning) {
      Logger.warn('Backup ignored because another job is still running');
      return;
    }

    isRunning = true;

    try {
      await runBackupJob();
    } catch (error) {
      Logger.error('Unexpected scheduler error', error);
    } finally {
      isRunning = false;
    }
  });
}
