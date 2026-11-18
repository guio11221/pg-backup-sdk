import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export async function writeProcessOutput(
  binary: string,
  args: string[],
  outputPath: string,
  password: string,
  onStderr: (chunk: string) => void = () => undefined
): Promise<void> {
  const child = spawn(binary, args, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (data: Buffer) => {
    const chunk = data.toString();
    stderr = (stderr + chunk).slice(-8192);
    onStderr(chunk);
  });

  const processComplete = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code));
  });

  // pipeline resolves only after the writable file stream finishes.
  const outputComplete = pipeline(child.stdout, createWriteStream(outputPath));

  // Observe both promises, even if one fails first, to avoid unfinished writes
  // and to ensure that a failed dump is not left on disk.
  const [processResult, outputResult] = await Promise.allSettled([
    processComplete,
    outputComplete
  ]);

  try {
    if (processResult.status === 'rejected') throw processResult.reason;

    if (processResult.value !== 0) {
      throw new Error(
        `pg_dump failed. Exit code: ${processResult.value}. Details: ${stderr}`
      );
    }

    if (outputResult.status === 'rejected') throw outputResult.reason;
  } catch (error) {
    await unlink(outputPath).catch(() => undefined);
    throw error;
  }
}
