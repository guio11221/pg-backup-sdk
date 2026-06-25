#!/usr/bin/env node

import { runBackupJob } from './backup.js';
import { startBackupScheduler } from './scheduler.js';
import { Logger } from './logger.js';

function printHelp(): void {
  console.log(`
pg-backup-module

Usage:
  pg-backup-module             Start scheduler
  pg-backup-module --now       Run backup once
  pg-backup-module --help      Show help

Environment:
  Copy .env.example to .env and configure PostgreSQL credentials.
`);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));

  if (args.has('--help') || args.has('-h')) {
    printHelp();
    return;
  }

  if (args.has('--now')) {
    const results = await runBackupJob();
    const failures = results.filter((result) => !result.success);

    if (failures.length > 0) {
      process.exitCode = 1;
    }

    return;
  }

  startBackupScheduler();
  process.stdin.resume();
}

main().catch((error) => {
  Logger.error('Fatal error', error);
  process.exit(1);
});
