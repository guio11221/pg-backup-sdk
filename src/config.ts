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

function integerEnv(name: string, fallback: number, min: number, max: number): number {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value.trim());

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${name}: expected an integer between ${min} and ${max}`);
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
    port: integerEnv('PG_PORT', 5432, 1, 65535),
    user: requiredEnv('PG_USER'),
    password: requiredEnv('PG_PASSWORD'),
    adminDatabase: optionalEnv('PG_ADMIN_DATABASE', 'postgres')
  },

  backup: {
    dir: path.resolve(optionalEnv('BACKUP_DIR', './backups')),
    cron: optionalEnv('BACKUP_CRON', '0 2 * * *'),
    retentionDays: integerEnv('BACKUP_RETENTION_DAYS', 7, 1, 36500),
    ignoreDatabases: csvEnv('IGNORE_DATABASES', ['postgres', 'template0', 'template1']),
    onlyDatabases: csvEnv('ONLY_DATABASES', [])
  },

  binaries: {
    pgDump: optionalEnv('PG_DUMP_BIN', 'pg_dump')
  }
} as const;
