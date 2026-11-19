import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('applies retention even when PostgreSQL returns no databases', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pg-backup-empty-list-'));

  try {
    const databaseFolder = path.join(root, 'financeiro');
    await mkdir(databaseFolder);
    const oldDump = path.join(databaseFolder, 'financeiro_2026-01-01_00-00-00.dump');
    await writeFile(oldDump, 'expired');
    const old = new Date(Date.now() - 20 * 86400_000);
    await utimes(oldDump, old, old);

    const program = [
      "import pg from 'pg'",
      'pg.Client.prototype.connect = async function () {}',
      'pg.Client.prototype.query = async function () { return { rows: [] } }',
      'pg.Client.prototype.end = async function () {}',
      "const { runBackupJob } = await import('./dist/backup.js')",
      'const results = await runBackupJob()',
      'if (results.length !== 0) process.exitCode = 2',
    ].join(';\n');

    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PG_HOST: '127.0.0.1',
        PG_USER: 'test',
        PG_PASSWORD: 'test',
        BACKUP_DIR: root,
        BACKUP_RETENTION_DAYS: '7',
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    await assert.rejects(stat(oldDump), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
