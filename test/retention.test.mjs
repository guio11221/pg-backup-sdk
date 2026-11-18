import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { isManagedBackupFile, removeOldBackups } from '../dist/retention.js';

const legacy = 'financeiro_2026-01-01_00-00-00.dump';
const current = 'financeiro_2026-01-01_00-00-00_123e4567-e89b-42d3-a456-426614174000.dump';

test('recognizes current and legacy SDK filenames, not unrelated dumps', () => {
  assert.equal(isManagedBackupFile('financeiro', legacy), true);
  assert.equal(isManagedBackupFile('financeiro', current), true);
  assert.equal(isManagedBackupFile('financeiro', 'manual.dump'), false);
  assert.equal(isManagedBackupFile('financeiro', 'outro_2026-01-01_00-00-00.dump'), false);
  assert.equal(isManagedBackupFile('financeiro', 'financeiro_2026-01-01_00-00-00.dump.tmp'), false);
});

test('removes only expired managed backups and preserves manual files and symlinks', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pg-backup-retention-'));
  try {
    const dir = path.join(root, 'backups');
    const databaseDir = path.join(dir, 'financeiro');
    const outside = path.join(root, 'outside');
    await Promise.all([mkdir(databaseDir, { recursive: true }), mkdir(outside)]);

    const oldDump = path.join(databaseDir, legacy);
    const recentDump = path.join(databaseDir, current);
    const manualDump = path.join(databaseDir, 'manual.dump');
    const outsideDump = path.join(outside, 'outside.dump');
    const linkPath = path.join(databaseDir, 'financeiro_2026-01-01_00-00-00_223e4567-e89b-42d3-a456-426614174000.dump');
    await Promise.all([
      writeFile(oldDump, 'old'),
      writeFile(recentDump, 'recent'),
      writeFile(manualDump, 'manual'),
      writeFile(outsideDump, 'outside'),
    ]);
    await symlink(outsideDump, linkPath);

    const now = new Date('2026-11-18T12:00:00.000Z').getTime();
    const old = new Date(now - 10 * 86400_000);
    const recent = new Date(now - 86400_000);
    await Promise.all([
      utimes(oldDump, old, old),
      utimes(manualDump, old, old),
      utimes(recentDump, recent, recent),
    ]);

    const deleted = [];
    await removeOldBackups(dir, 7, (file) => deleted.push(file), now);

    assert.deepEqual(deleted, [oldDump]);
    await assert.rejects(readFile(oldDump), { code: 'ENOENT' });
    assert.equal(await readFile(recentDump, 'utf8'), 'recent');
    assert.equal(await readFile(manualDump, 'utf8'), 'manual');
    assert.equal(await readFile(linkPath, 'utf8'), 'outside');
    assert.equal(await readFile(outsideDump, 'utf8'), 'outside');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
