import assert from 'node:assert/strict';
import { chmod, lstat, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ensureBackupDirectory } from '../dist/backup-directory.js';

test('new backup directories only grant access to their owner on POSIX', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pg-backup-private-'));

  try {
    const backupRoot = path.join(root, 'backups');
    const databaseDir = path.join(backupRoot, 'financeiro');
    await ensureBackupDirectory(databaseDir);

    const backupStat = await lstat(backupRoot);
    const databaseStat = await lstat(databaseDir);
    assert.equal(backupStat.isDirectory(), true);
    assert.equal(databaseStat.isDirectory(), true);

    if (process.platform !== 'win32') {
      assert.equal(backupStat.mode & 0o077, 0);
      assert.equal(databaseStat.mode & 0o077, 0);
      assert.equal(backupStat.mode & 0o700, 0o700);
      assert.equal(databaseStat.mode & 0o700, 0o700);
    }

    // Repeated startup must not fail when the directories already exist.
    await ensureBackupDirectory(databaseDir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('existing backup directory permissions are not changed', async () => {
  if (process.platform === 'win32') return;
  const root = await mkdtemp(path.join(os.tmpdir(), 'pg-backup-existing-'));

  try {
    await chmod(root, 0o750);
    await ensureBackupDirectory(root);
    assert.equal((await lstat(root)).mode & 0o777, 0o750);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
