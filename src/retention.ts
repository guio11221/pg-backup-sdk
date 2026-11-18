import fs from 'node:fs/promises';
import path from 'node:path';

const TIMESTAMP = String.raw`\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}`;
const UUID = String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`;

export function isManagedBackupFile(folderName: string, fileName: string): boolean {
  if (!/^[a-zA-Z0-9_-]+$/.test(folderName)) return false;
  const pattern = new RegExp(`^${folderName}_${TIMESTAMP}(?:_${UUID})?\\.dump$`, 'i');
  return pattern.test(fileName);
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
    const folderStat = await fs.lstat(folderPath);
    if (!folderStat.isDirectory() || folderStat.isSymbolicLink()) continue;

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !isManagedBackupFile(folder.name, entry.name)) continue;
      const filePath = path.join(folderPath, entry.name);
      const stat = await fs.lstat(filePath);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      if (now - stat.mtimeMs <= retentionMs) continue;

      await fs.unlink(filePath);
      onRemoved(filePath);
    }
  }
}
