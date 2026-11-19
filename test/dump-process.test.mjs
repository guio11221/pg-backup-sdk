import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeProcessOutput } from '../dist/dump-process.js';

async function inTemporaryDirectory(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pg-dump-process-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('waits for all process output to be persisted', async () => {
  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'database.dump');
    const size = 4 * 1024 * 1024;
    await writeProcessOutput(
      process.execPath,
      ['-e', `process.stdout.write(Buffer.alloc(${size}, 65))`],
      outputPath,
      'test'
    );

    const file = await readFile(outputPath);
    assert.equal(file.length, size);
    assert.equal(file[0], 65);
    assert.equal(file[file.length - 1], 65);
  });
});

test('removes an incomplete dump after a nonzero process exit', async () => {
  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'failed.dump');
    await assert.rejects(
      writeProcessOutput(
        process.execPath,
        ['-e', "process.stdout.write('partial'); process.stderr.write('dump failed'); process.exitCode = 7"],
        outputPath,
        'test'
      ),
      /Exit code: 7/
    );
    await assert.rejects(stat(outputPath), { code: 'ENOENT' });
  });
});

test('removes an incomplete dump when the executable is missing', async () => {
  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'missing.dump');
    await assert.rejects(
      writeProcessOutput(
        path.join(directory, 'missing-pg-dump-executable'),
        [],
        outputPath,
        'test'
      ),
      { code: 'ENOENT' }
    );
    await assert.rejects(stat(outputPath), { code: 'ENOENT' });
  });
});

test('never overwrites an existing dump on filename collision', async () => {
  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'existing.dump');
    await writeFile(outputPath, 'original backup');

    await assert.rejects(
      writeProcessOutput(process.execPath, ['-e', "process.stdout.write('replacement')"], outputPath, 'test'),
      { code: 'EEXIST' }
    );
    assert.equal(await readFile(outputPath, 'utf8'), 'original backup');
  });
});

test('creates backup outputs with owner-only permissions on POSIX', async () => {
  if (process.platform === 'win32') return;

  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'private.dump');
    await writeProcessOutput(
      process.execPath,
      ['-e', "process.stdout.write('PGDMP')"],
      outputPath,
      'test'
    );

    const fileStat = await stat(outputPath);
    assert.equal(fileStat.mode & 0o077, 0, 'group/other must not be able to read the dump');
    assert.equal(fileStat.mode & 0o600, 0o600);
  });
});

test('removes reserved output if spawn rejects arguments synchronously', async () => {
  await inTemporaryDirectory(async (directory) => {
    const outputPath = path.join(directory, 'invalid-executable.dump');
    await assert.rejects(
      writeProcessOutput('', [], outputPath, 'test'),
      { code: 'ERR_INVALID_ARG_VALUE' }
    );
    await assert.rejects(stat(outputPath), { code: 'ENOENT' });
  });
});
