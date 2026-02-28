import 'server-only';

/**
 * Logging Utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private format(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  private log(entry: LogEntry) {
    const prefix = `[${entry.level.toUpperCase()}]`;

    if (this.isDev) {
      console.log(
        `${prefix} ${entry.timestamp} ${entry.message}`,
        entry.data
      );
    } else {
      // V production: poslat do logging service (Sentry, DataDog, atd.)
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, data?: unknown) {
    this.log(this.format('info', message, data));
  }

  warn(message: string, data?: unknown) {
    this.log(this.format('warn', message, data));
  }

  error(message: string, error?: unknown) {
    const data = error instanceof Error ? error.message : error;
    this.log(this.format('error', message, data));
  }

  debug(message: string, data?: unknown) {
    if (this.isDev) {
      this.log(this.format('debug', message, data));
    }
  }
}

export const logger = new Logger();

