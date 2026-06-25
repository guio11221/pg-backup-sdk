import 'dotenv/config';
import path from 'node:path';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Required environment variable not defined: ${name}`);
  }

  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value.trim();
}

function numberEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number environment variable: ${name}`);
  }

  return parsed;
}

function csvEnv(name: string, fallback: string[]): string[] {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export const config = {
  pg: {
    host: requiredEnv('PG_HOST'),
    port: numberEnv('PG_PORT', 5432),
    user: requiredEnv('PG_USER'),
    password: requiredEnv('PG_PASSWORD'),
    adminDatabase: optionalEnv('PG_ADMIN_DATABASE', 'postgres')
  },

  backup: {
    dir: path.resolve(optionalEnv('BACKUP_DIR', './backups')),
    cron: optionalEnv('BACKUP_CRON', '0 2 * * *'),
    retentionDays: numberEnv('BACKUP_RETENTION_DAYS', 7),
    ignoreDatabases: csvEnv('IGNORE_DATABASES', ['postgres', 'template0', 'template1']),
    onlyDatabases: csvEnv('ONLY_DATABASES', [])
  },

  binaries: {
    pgDump: optionalEnv('PG_DUMP_BIN', 'pg_dump')
  }
} as const;
