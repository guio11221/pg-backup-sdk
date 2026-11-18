import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('starting the scheduler repeatedly registers only one cron task', () => {
  const script = `
    import cron from 'node-cron';
    const { startBackupScheduler } = await import('./dist/scheduler.js');
    const before = cron.getTasks().size;
    startBackupScheduler();
    startBackupScheduler();
    startBackupScheduler();
    const after = cron.getTasks().size;
    for (const task of cron.getTasks().values()) task.stop();
    if (after !== before + 1) process.exitCode = 1;
  `;

  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PG_HOST: '127.0.0.1',
      PG_USER: 'test',
      PG_PASSWORD: 'test',
      BACKUP_CRON: '0 2 * * *'
    }
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
