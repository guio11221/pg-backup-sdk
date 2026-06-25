export class Logger {
  private static format(level: string, message: string): string {
    return `[${new Date().toISOString()}] [${level}] ${message}`;
  }

  static info(message: string): void {
    console.log(Logger.format('INFO', message));
  }

  static warn(message: string): void {
    console.warn(Logger.format('WARN', message));
  }

  static error(message: string, error?: unknown): void {
    console.error(Logger.format('ERROR', message));

    if (error instanceof Error) {
      console.error(error.stack ?? error.message);
      return;
    }

    if (error !== undefined) {
      console.error(error);
    }
  }
}
