import fs from 'node:fs/promises';
import path from 'node:path';

const TIMESTAMP = String.raw`\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}`;
const UUID = String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`;

export function isManagedBackupFile(folderName: string, fileName: string): boolean {
  if (!/^[a-zA-Z0-9_-]+$/.test(folderName)) return false;
  const pattern = new RegExp(`^${folderName}_${TIMESTAMP}(?:_${UUID})?\\.dump$`, 'i');
  return pattern.test(fileName);
}

/**
 * Treat files disappearing between readdir and stat as normal during
 * overlapping cleanup jobs. Other filesystem errors still propagate.
 */
async function statIfPresent(filePath: string) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function entriesIfPresent(directory: string) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function removeOldBackups(
  backupDir: string,
  retentionDays: number,
  onRemoved: (filePath: string) => void = () => undefined,
  now: number = Date.now()
): Promise<void> {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  await fs.mkdir(backupDir, { recursive: true });

  const folders = await fs.readdir(backupDir, { withFileTypes: true });
  for (const folder of folders) {
    if (!folder.isDirectory() || !/^[a-zA-Z0-9_-]+$/.test(folder.name)) continue;

    const folderPath = path.join(backupDir, folder.name);
    // Recheck directory type instead of following a preexisting directory link.
    const folderStat = await statIfPresent(folderPath);
    if (!folderStat || !folderStat.isDirectory() || folderStat.isSymbolicLink()) continue;

    const entries = await entriesIfPresent(folderPath);
    for (const entry of entries) {
      if (!entry.isFile() || !isManagedBackupFile(folder.name, entry.name)) continue;
      const filePath = path.join(folderPath, entry.name);
      const stat = await statIfPresent(filePath);
      if (!stat || !stat.isFile() || stat.isSymbolicLink()) continue;
      if (now - stat.mtimeMs <= retentionMs) continue;

      try {
        await fs.unlink(filePath);
      } catch (error) {
        // A parallel cleanup may already have removed this backup.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      onRemoved(filePath);
    }
  }
}
