import path from 'node:path';
import { config } from './config.js';
import { listDatabases } from './postgres.js';
import { Logger } from './logger.js';
import { backupFileName, safeFolderName } from './fs-utils.js';
import { writeProcessOutput } from './dump-process.js';
import { removeOldBackups } from './retention.js';
import { verifyCustomDump } from './dump-validation.js';
import { ensureBackupDirectory } from './backup-directory.js';

export type BackupResult = {
  database: string;
  outputPath: string;
  success: boolean;
  error?: unknown;
};

async function dumpDatabase(databaseName: string): Promise<string> {
  const databaseFolder = path.join(config.backup.dir, safeFolderName(databaseName));
  await ensureBackupDirectory(databaseFolder);

  const outputPath = path.join(
    databaseFolder,
    backupFileName(databaseName)
  );

  const args = [
    '--host',
    config.pg.host,
    '--port',
    String(config.pg.port),
    '--username',
    config.pg.user,
    '--dbname',
    databaseName,
    '--format',
    'custom',
    '--blobs',
    '--verbose',
    '--no-password'
  ];

  Logger.info(`Backup started: ${databaseName}`);

  await writeProcessOutput(
    config.binaries.pgDump,
    args,
    outputPath,
    config.pg.password,
    (chunk) => process.stdout.write(`[pg_dump:${databaseName}] ${chunk}`)
  );

  await verifyCustomDump(outputPath);

  Logger.info(`Backup finished: ${outputPath}`);

  return outputPath;
}

export async function runBackupJob(): Promise<BackupResult[]> {
  Logger.info('Backup job started');

  await ensureBackupDirectory(config.backup.dir);

  const databases = await listDatabases();

  if (databases.length === 0) {
    Logger.warn('No database found for backup');
    return [];
  }

  Logger.info(`Databases selected: ${databases.join(', ')}`);

  const results: BackupResult[] = [];

  for (const database of databases) {
    try {
      const outputPath = await dumpDatabase(database);

      results.push({
        database,
        outputPath,
        success: true
      });
    } catch (error) {
      Logger.error(`Backup failed: ${database}`, error);

      results.push({
        database,
        outputPath: '',
        success: false,
        error
      });
    }
  }

  await removeOldBackups(config.backup.dir, config.backup.retentionDays, (filePath) => {
    Logger.info(`Old backup removed: ${filePath}`);
  });

  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    Logger.warn(`Backup job finished with failures: ${failures.length}`);
    return results;
  }

  Logger.info('Backup job finished successfully');

  return results;
}
