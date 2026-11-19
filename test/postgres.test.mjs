import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';

process.env.PG_HOST = '127.0.0.1';
process.env.PG_USER = 'test';
process.env.PG_PASSWORD = 'test';

const { listDatabases } = await import('../dist/postgres.js');

test('releases PostgreSQL client when the connection fails', async () => {
  const oldConnect = pg.Client.prototype.connect;
  const oldEnd = pg.Client.prototype.end;
  let closeCalls = 0;

  try {
    pg.Client.prototype.connect = async function () {
      throw new Error('simulated connection failure');
    };
    pg.Client.prototype.end = async function () {
      closeCalls += 1;
      throw new Error('simulated cleanup failure');
    };

    await assert.rejects(listDatabases(), /simulated connection failure/);
    assert.equal(closeCalls, 1);
  } finally {
    pg.Client.prototype.connect = oldConnect;
    pg.Client.prototype.end = oldEnd;
  }
});

test('closes PostgreSQL client after successful database listing', async () => {
  const oldConnect = pg.Client.prototype.connect;
  const oldQuery = pg.Client.prototype.query;
  const oldEnd = pg.Client.prototype.end;
  let closeCalls = 0;

  try {
    pg.Client.prototype.connect = async function () {};
    pg.Client.prototype.query = async function () {
      return { rows: [{ datname: 'postgres' }, { datname: 'customers' }] };
    };
    pg.Client.prototype.end = async function () {
      closeCalls += 1;
    };

    assert.deepEqual(await listDatabases(), ['customers']);
    assert.equal(closeCalls, 1);
  } finally {
    pg.Client.prototype.connect = oldConnect;
    pg.Client.prototype.query = oldQuery;
    pg.Client.prototype.end = oldEnd;
  }
});
