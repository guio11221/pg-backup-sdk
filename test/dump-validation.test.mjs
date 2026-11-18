import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyCustomDump } from '../dist/dump-validation.js';

async function withDump(content, check) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pg-dump-verify-'));
  const file = path.join(dir, 'database.dump');
  try {
    await writeFile(file, content);
    await check(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('accepts the PostgreSQL custom dump magic header', async () => {
  const content = Buffer.concat([Buffer.from('PGDMP'), Buffer.from([1, 16, 0, 4, 8])]);
  await withDump(content, async (file) => {
    await verifyCustomDump(file);
    assert.deepEqual(await readFile(file), content);
  });
});

for (const invalid of [Buffer.alloc(0), Buffer.from('PGDM'), Buffer.from('invalid'), Buffer.from('PGDXX')]) {
  test(`removes invalid custom dump output: ${invalid.toString() || 'empty'}`, async () => {
    await withDump(invalid, async (file) => {
      await assert.rejects(verifyCustomDump(file), /Invalid PostgreSQL custom-format dump header/);
      await assert.rejects(stat(file), { code: 'ENOENT' });
    });
  });
}
