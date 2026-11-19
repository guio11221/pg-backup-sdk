import { lstat, mkdir } from 'node:fs/promises';

/**
 * Create backup directories with owner-only permissions on POSIX systems.
 * Reject a symlink at the configured directory itself so writes cannot be
 * silently redirected into an unrelated location.
 *
 * Existing real directory permissions are not changed. Parent path
 * components must still be trusted and controlled by the deployment.
 */
export async function ensureBackupDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });

  const entry = await lstat(directory);
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error(`Backup path must be a real directory (symlinks are not allowed): ${directory}`);
  }
}
