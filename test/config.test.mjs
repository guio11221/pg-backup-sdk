import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const baseEnv = {
  ...process.env,
  PG_HOST: '127.0.0.1',
  PG_USER: 'test',
  PG_PASSWORD: 'test',
  PG_PORT: '5432',
  BACKUP_RETENTION_DAYS: '7'
};

function loadConfig(overrides = {}) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', "import('./dist/config.js')"],
    {
      cwd: process.cwd(),
      env: { ...baseEnv, ...overrides },
      encoding: 'utf8'
    }
  );
}

test('accepts valid PostgreSQL port and retention days', () => {
  const result = loadConfig({ PG_PORT: '5433', BACKUP_RETENTION_DAYS: '30' });
  assert.equal(result.status, 0, result.stderr);
});

for (const value of ['0', '-1', '65536', '1.5', 'NaN', 'Infinity']) {
  test(`rejects invalid PG_PORT: ${value}`, () => {
    const result = loadConfig({ PG_PORT: value });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid PG_PORT/);
  });
}

for (const value of ['0', '-1', '1.5', '36501', 'Infinity']) {
  test(`rejects invalid BACKUP_RETENTION_DAYS: ${value}`, () => {
    const result = loadConfig({ BACKUP_RETENTION_DAYS: value });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid BACKUP_RETENTION_DAYS/);
  });
}

test('accepts a bounded PostgreSQL connection timeout', () => {
  const result = loadConfig({ PG_CONNECT_TIMEOUT_MS: '2500' });
  assert.equal(result.status, 0, result.stderr);
});

for (const value of ['0', '-5', '1.5', '300001', 'Infinity']) {
  test(`rejects invalid PG_CONNECT_TIMEOUT_MS: ${value}`, () => {
    const result = loadConfig({ PG_CONNECT_TIMEOUT_MS: value });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid PG_CONNECT_TIMEOUT_MS/);
  });
}
