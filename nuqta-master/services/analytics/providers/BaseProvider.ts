/**
 * Base Analytics Provider
 *
 * Abstract base class for all analytics providers
 */

export class BaseAnalyticsProvider {
  enabled: boolean = true;
  debug: boolean = false;
  sessionId: string = '';
  userId: string | null = null;
  name: string = 'BaseAnalyticsProvider';

  trackError(error: Error, context?: Record<string, any>) {
    this.trackEvent('error_occurred', {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      ...context,
    });
  }

  async flush() {
    // Default implementation - override if provider supports batching
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setDebug(debug: boolean) {
    this.debug = debug;
  }

  log(...args: any[]) {
    if (this.debug || (typeof __DEV__ !== 'undefined' && __DEV__)) {
      console.log(`[${this.name}]`, ...args);
    }
  }

  warn(...args: any[]) {
    if (this.debug || (typeof __DEV__ !== 'undefined' && __DEV__)) {
      console.warn(`[${this.name}]`, ...args);
    }
  }

  error(...args: any[]) {}

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Subclasses should override these:
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trackEvent(_eventName: string, _properties?: Record<string, any>) {
    // to be overridden
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trackScreen(_screenName: string, _properties?: Record<string, any>) {
    // to be overridden
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setUserProperties(_properties: Record<string, any>) {
    // to be overridden
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trackPurchase(_transaction: any) {
    // to be overridden
  }
}
