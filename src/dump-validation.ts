import { open, unlink } from 'node:fs/promises';

const SIGNATURE = Buffer.from('PGDMP', 'ascii');

/** Reject empty or non-custom-format pg_dump output before reporting success. */
export async function verifyCustomDump(outputPath: string): Promise<void> {
  try {
    const file = await open(outputPath, 'r');
    try {
      const header = Buffer.alloc(SIGNATURE.length);
      const { bytesRead } = await file.read(header, 0, header.length, 0);
      if (bytesRead !== SIGNATURE.length || !header.equals(SIGNATURE)) {
        throw new Error('Invalid PostgreSQL custom-format dump header (expected PGDMP)');
      }
    } finally {
      await file.close();
    }
  } catch (error) {
    await unlink(outputPath).catch(() => undefined);
    throw error;
  }
}
