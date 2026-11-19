import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeValidatedBackup } from '../dist/backup-publication.js';

async function inDirectory(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pg-atomic-backup-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('publishes a complete valid dump without leaving temporary files', async () => {
  await inDirectory(async (directory) => {
    const output = path.join(directory, 'complete.dump');
    const contents = 'PGDMP' + 'payload';
    await writeValidatedBackup(
      process.execPath,
      ['-e', `process.stdout.write(${JSON.stringify(contents)})`],
      output,
      'test'
    );

    assert.equal(await readFile(output, 'utf8'), contents);
    assert.deepEqual(await readdir(directory), ['complete.dump']);
    if (process.platform !== 'win32') {
      assert.equal((await stat(output)).mode & 0o077, 0);
    }
  });
});

test('does not publish a final .dump while the process is still writing', async () => {
  await inDirectory(async (directory) => {
    const output = path.join(directory, 'pending.dump');
    const finished = writeValidatedBackup(
      process.execPath,
      ['-e', "process.stdout.write('PGDMP'); setTimeout(() => process.stdout.write('done'), 300)"],
      output,
      'test'
    );

    // Allow the process to begin; the final name must not be visible before
    // the child has exited and its output stream has finished.
    await new Promise(resolve => setTimeout(resolve, 80));
    await assert.rejects(stat(output), { code: 'ENOENT' });
    await finished;
    assert.equal(await readFile(output, 'utf8'), 'PGDMPdone');
  });
});

test('removes invalid staged output without publishing the final name', async () => {
  await inDirectory(async (directory) => {
    const output = path.join(directory, 'invalid.dump');
    await assert.rejects(
      writeValidatedBackup(process.execPath, ['-e', "process.stdout.write('invalid')"], output, 'test'),
      /Invalid PostgreSQL custom-format dump header/
    );
    await assert.rejects(stat(output), { code: 'ENOENT' });
    assert.deepEqual(await readdir(directory), []);
  });
});

test('preserves existing final backup and removes staged file on collision', async () => {
  await inDirectory(async (directory) => {
    const output = path.join(directory, 'existing.dump');
    await writeFile(output, 'original');

    await assert.rejects(
      writeValidatedBackup(process.execPath, ['-e', "process.stdout.write('PGDMPnew')"], output, 'test'),
      { code: 'EEXIST' }
    );
    assert.equal(await readFile(output, 'utf8'), 'original');
    assert.deepEqual(await readdir(directory), ['existing.dump']);
  });
});

test('removes staged output after nonzero process exit', async () => {
  await inDirectory(async (directory) => {
    const output = path.join(directory, 'failed.dump');
    await assert.rejects(
      writeValidatedBackup(
        process.execPath,
        ['-e', "process.stdout.write('PGDMPpartial'); process.exitCode = 9"],
        output,
        'test'
      ),
      /Exit code: 9/
    );
    await assert.rejects(stat(output), { code: 'ENOENT' });
    assert.deepEqual(await readdir(directory), []);
  });
});
