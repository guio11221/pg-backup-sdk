import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathExists, safeFolderName, timestampForFile } from '../dist/fs-utils.js';

test('pathExists returns true for existing files and false for missing files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pg-backup-sdk-test-'));

  try {
    const existingFile = path.join(directory, 'backup.dump');
    await writeFile(existingFile, 'test backup');

    assert.equal(await pathExists(existingFile), true);
    assert.equal(await pathExists(path.join(directory, 'missing.dump')), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('safeFolderName replaces unsupported characters', () => {
  assert.equal(safeFolderName('client-db_2026'), 'client-db_2026');
  assert.equal(safeFolderName('my database/production'), 'my_database_production');
  assert.equal(safeFolderName('financeiro.prod'), 'financeiro_prod');
});

test('timestampForFile produces a valid local timestamp', () => {
  const timestamp = timestampForFile();

  assert.match(timestamp, /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);

  const [datePart, timePart] = timestamp.split('_');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split('-').map(Number);

  assert.ok(year >= 2020);
  assert.ok(month >= 1 && month <= 12);
  assert.ok(day >= 1 && day <= 31);
  assert.ok(hour >= 0 && hour <= 23);
  assert.ok(minute >= 0 && minute <= 59);
  assert.ok(second >= 0 && second <= 59);
});
