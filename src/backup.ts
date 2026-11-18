import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { listDatabases } from './postgres.js';
import { Logger } from './logger.js';
import { safeFolderName, timestampForFile } from './fs-utils.js';
import { writeProcessOutput } from './dump-process.js';

export type BackupResult = {
  database: string;
  outputPath: string;
  success: boolean;
  error?: unknown;
};

async function dumpDatabase(databaseName: string): Promise<string> {
  const databaseFolder = path.join(config.backup.dir, safeFolderName(databaseName));
  await fs.mkdir(databaseFolder, { recursive: true });

  const outputPath = path.join(
    databaseFolder,
    `${safeFolderName(databaseName)}_${timestampForFile()}.dump`
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

  Logger.info(`Backup finished: ${outputPath}`);

  return outputPath;
}

async function removeOldBackups(): Promise<void> {
  const retentionMs = config.backup.retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  await fs.mkdir(config.backup.dir, { recursive: true });

  const databaseFolders = await fs.readdir(config.backup.dir, {
    withFileTypes: true
  });

  for (const folder of databaseFolders) {
    if (!folder.isDirectory()) {
      continue;
    }

    const folderPath = path.join(config.backup.dir, folder.name);
    const files = await fs.readdir(folderPath, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.dump')) {
        continue;
      }

      const filePath = path.join(folderPath, file.name);
      const stat = await fs.stat(filePath);
      const ageMs = now - stat.mtime.getTime();

      if (ageMs > retentionMs) {
        await fs.unlink(filePath);
        Logger.info(`Old backup removed: ${filePath}`);
      }
    }
  }
}

export async function runBackupJob(): Promise<BackupResult[]> {
  Logger.info('Backup job started');

  await fs.mkdir(config.backup.dir, { recursive: true });

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

  await removeOldBackups();

  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    Logger.warn(`Backup job finished with failures: ${failures.length}`);
    return results;
  }

  Logger.info('Backup job finished successfully');

  return results;
}
