#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { startBackupScheduler } from './scheduler.js';
import { runBackupJob } from './backup.js';

export { startBackupScheduler } from './scheduler.js';
export { runBackupJob } from './backup.js';

function isCliExecution(): boolean {
  const currentFile = fileURLToPath(import.meta.url);
  const executedFile = process.argv[1];

  if (!executedFile) {
    return false;
  }

  return resolve(executedFile) === resolve(currentFile);
}

async function main(): Promise<void> {
  if (!isCliExecution()) {
    return;
  }

  const shouldRunNow = process.argv.includes('--now');

  if (shouldRunNow) {
    await runBackupJob();
    return;
  }

  startBackupScheduler();
  process.stdin.resume();
}

main().catch((error) => {
  console.error('[BKP] Falha fatal:', error);
  process.exit(1);
});