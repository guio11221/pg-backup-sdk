import { mkdir } from 'node:fs/promises';

/**
 * Restrict permissions on new backup directories. Existing directories are
 * deliberately left untouched to avoid changing deployment-specific ACLs.
 */
export async function ensureBackupDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
}
