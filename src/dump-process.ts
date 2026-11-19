import { spawn } from 'node:child_process';
import { open, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export async function writeProcessOutput(
  binary: string,
  args: string[],
  outputPath: string,
  password: string,
  onStderr: (chunk: string) => void = () => undefined
): Promise<void> {
  // Reserve a new file atomically; never truncate an existing backup.
  const outputFile = await open(outputPath, 'wx', 0o600);

  // Preserve the pipe-specific child process type when catching spawn errors.
  const child = await (async () => {
    try {
      return spawn(binary, args, {
        env: { ...process.env, PGPASSWORD: password },
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      // A synchronous validation error occurs before pipeline setup.
      await outputFile.close();
      await unlink(outputPath).catch(() => undefined);
      throw error;
    }
  })();

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
  const outputComplete = pipeline(child.stdout, outputFile.createWriteStream());

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
