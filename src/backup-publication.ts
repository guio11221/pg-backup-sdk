import { randomUUID } from 'node:crypto';
import { link, unlink } from 'node:fs/promises';
import { writeProcessOutput } from './dump-process.js';
import { verifyCustomDump } from './dump-validation.js';

/**
 * Publish completed custom-format dumps without exposing in-progress writes as
 * final .dump files. A hard link creates the final name atomically and fails
 * with EEXIST instead of overwriting an existing backup.
 */
export async function writeValidatedBackup(
  binary: string,
  args: string[],
  outputPath: string,
  password: string,
  onStderr: (chunk: string) => void = () => undefined
): Promise<void> {
  const stagingPath = `${outputPath}.${randomUUID()}.partial`;

  try {
    await writeProcessOutput(binary, args, stagingPath, password, onStderr);
    await verifyCustomDump(stagingPath);
    await link(stagingPath, outputPath);
  } finally {
    // A stopped/crashed process may still leave a .partial file; it cannot be
    // mistaken for a valid .dump by consumers or the retention algorithm.
    await unlink(stagingPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
