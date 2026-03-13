/**
 * INFRASTRUCTURE LAYER - Structured Logger
 *
 * High-level: Drop-in replacement for console.log that adds log levels,
 * timestamps, and production-ready structured output. All app code should
 * use this instead of raw console calls so logs are consistent and
 * console.log statements don’t leak into production builds.
 *
 * Low-level:
 * - In development (import.meta.env.DEV): pretty-prints with emoji prefixes
 *   so logs are easy to scan in the browser console.
 * - In production: emits JSON lines suitable for log aggregation tools
 *   (Datadog, CloudWatch, etc.).
 * - debug level is suppressed in production to avoid noise.
 * - error level has a hook for Sentry integration (commented out — uncomment
 *   and install @sentry/browser when ready).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private readonly isDev = import.meta.env.DEV;

  /**
   * log (private)
   * High-level: Core logging method — all public methods delegate here.
   * Low-level: Builds a log entry object, then either pretty-prints it
   * (dev) or serialises it to JSON (prod). Skips debug logs in production.
   */
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

  /** debug — verbose tracing, suppressed in production */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  /** info — normal operational events (page loads, API calls) */
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  /** warn — unexpected but recoverable situations */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  /** error — failures that need attention; hooks into Sentry in production */
  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
