import { Client } from 'pg';
import { config } from './config.js';

type DatabaseRow = {
  datname: string;
};

export async function listDatabases(): Promise<string[]> {
  const client = new Client({
    host: config.pg.host,
    port: config.pg.port,
    user: config.pg.user,
    password: config.pg.password,
    database: config.pg.adminDatabase
  });

  await client.connect();

  try {
    const result = await client.query<DatabaseRow>(`
      SELECT datname
      FROM pg_database
      WHERE datistemplate = false
        AND datallowconn = true
      ORDER BY datname ASC
    `);

    const ignored = new Set(config.backup.ignoreDatabases);
    const only = new Set(config.backup.onlyDatabases);

    return result.rows
      .map((row) => row.datname)
      .filter((databaseName) => !ignored.has(databaseName))
      .filter((databaseName) => only.size === 0 || only.has(databaseName));
  } finally {
    await client.end();
  }
}
