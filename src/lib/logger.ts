/**
 * Production-ready logging utility
 * Replaces console.log with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private readonly isDev = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDev && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In development: pretty print
    if (this.isDev) {
      const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level];
      console.log(`${emoji} [${level.toUpperCase()}]`, message, context || '');
      return;
    }

    // In production: structured JSON (ready for log aggregation)
    console.log(JSON.stringify(logEntry));

    // Send to error tracking service in production
    if (level === 'error' && globalThis.window !== undefined) {
      // Integrate Sentry: window.Sentry?.captureException(new Error(message), { extra: context });
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
