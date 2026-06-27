/**
 * Dev Logger Utility
 *
 * Centralized logging utility for development mode.
 * Provides consistent logging interface across all service files.
 *
 * Usage:
 *   import { devLogger } from '@/utils/devLogger';
 *   devLogger.log('message', data);
 *   devLogger.error('error message', error);
 */

// Singleton instance for consistent logging across all services
class DevLogger {
  log(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.log(`[DEV] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.warn(`[DEV WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.error(`[DEV ERROR] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (__DEV__) {
      console.debug(`[DEV DEBUG] ${message}`, ...args);
    }
  }

  group(label: string): void {
    if (__DEV__) {
      console.group(`[DEV] ${label}`);
    }
  }

  groupEnd(): void {
    if (__DEV__) {
      console.groupEnd();
    }
  }

  table(data: any): void {
    if (__DEV__) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const devLogger = new DevLogger();

// Also export for backward compatibility with existing code that uses: const devLog = { ... }
export const devLog = {
  log: __DEV__ ? console.log.bind(console, '[DEV]') : () => {},
  warn: __DEV__ ? console.warn.bind(console, '[DEV WARN]') : () => {},
  error: __DEV__ ? console.error.bind(console, '[DEV ERROR]') : () => {},
};

export default devLogger;
