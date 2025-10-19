/**
 * Logger Utility
 * 
 * Provides environment-aware logging that:
 * - Only logs debug messages in development
 * - Always logs errors and warnings
 * - Can be extended with external services (Sentry, LogRocket)
 * - Prevents sensitive data leakage in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isTest = import.meta.env.MODE === 'test';

  /**
   * Debug logging - only in development
   * Use for verbose debugging information
   */
  debug(message: string, options?: LogOptions): void {
    if (this.isDev && !this.isTest) {
      this.log('debug', message, options);
    }
  }

  /**
   * Info logging - only in development
   * Use for general information
   */
  info(message: string, options?: LogOptions): void {
    if (this.isDev && !this.isTest) {
      this.log('info', message, options);
    }
  }

  /**
   * Warning logging - always logged
   * Use for recoverable issues
   */
  warn(message: string, options?: LogOptions): void {
    this.log('warn', message, options);
  }

  /**
   * Error logging - always logged
   * Use for errors and exceptions
   */
  error(message: string, error?: Error | unknown, options?: LogOptions): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: this.isDev ? error.stack : undefined,
    } : error;

    this.log('error', message, { ...options, data: errorData });

    // Send to Sentry in production
    if (!this.isDev && error) {
      this.sendToSentry(error, message, options);
    }
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(error: Error | unknown, message: string, options?: LogOptions): void {
    try {
      // Dynamic import to avoid bundling Sentry in development
      import('./sentry').then(({ captureException, setContext }) => {
        // Add context if provided
        if (options?.context || options?.data) {
          setContext('logger', {
            context: options?.context,
            data: options?.data,
          });
        }

        // Capture the exception
        if (error instanceof Error) {
          captureException(error, { message });
        } else {
          captureException(new Error(message), { originalError: error });
        }
      });
    } catch (err) {
      // Fail silently - don't break the app if Sentry fails
      console.warn('Failed to send error to Sentry:', err);
    }
  }

  /**
   * Performance logging - only in development
   * Use for measuring performance
   */
  perf(label: string, duration: number): void {
    if (this.isDev && !this.isTest) {
      console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Group logging - helps organize console output
   */
  group(label: string, fn: () => void): void {
    if (this.isDev && !this.isTest) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  }

  /**
   * Table logging - for structured data
   */
  table(data: any): void {
    if (this.isDev && !this.isTest) {
      console.table(data);
    }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, options?: LogOptions): void {
    const prefix = options?.context ? `[${options.context}]` : '';
    const fullMessage = `${prefix} ${message}`.trim();

    switch (level) {
      case 'debug':
        console.debug(`🔍 ${fullMessage}`, options?.data || '');
        break;
      case 'info':
        console.info(`ℹ️ ${fullMessage}`, options?.data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${fullMessage}`, options?.data || '');
        break;
      case 'error':
        console.error(`❌ ${fullMessage}`, options?.data || '');
        break;
    }
  }

  /**
   * Placeholder for external error service
   * Implement when adding Sentry, LogRocket, etc.
   * 
   * Example implementation:
   * private sendToErrorService(message: string, data: any): void {
   *   if (window.Sentry) {
   *     window.Sentry.captureException(new Error(message), { extra: data });
   *   }
   * }
   */
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Performance measurement utility
 * 
 * Usage:
 * const measure = logger.measure('API Call');
 * // ... do work ...
 * measure.end();
 */
export function createMeasurement(label: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      logger.perf(label, duration);
      return duration;
    },
  };
}

/**
 * Async performance measurement
 * 
 * Usage:
 * await logger.measureAsync('Fetch Data', async () => {
 *   return await fetchData();
 * });
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const measure = createMeasurement(label);
  try {
    return await fn();
  } finally {
    measure.end();
  }
}

// Export helper for backward compatibility
export { logger as default };
