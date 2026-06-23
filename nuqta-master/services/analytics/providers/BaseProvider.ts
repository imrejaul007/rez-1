/**
 * Base Analytics Provider
 *
 * Abstract base class for all analytics providers
 */

import { AnalyticsProvider, PurchaseTransaction } from '../types';

export abstract class BaseAnalyticsProvider implements AnalyticsProvider {
  abstract name: string;
  protected enabled: boolean = true;
  protected debug: boolean = false;

  abstract initialize(config: any): Promise<void>;

  abstract trackEvent(name: string, properties?: Record<string, any>): void;

  abstract trackScreen(name: string, properties?: Record<string, any>): void;

  abstract setUserId(userId: string): void;

  abstract setUserProperties(properties: Record<string, any>): void;

  abstract trackPurchase(transaction: PurchaseTransaction): void;

  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent('error_occurred', {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      ...context,
    });
  }

  async flush(): Promise<void> {
    // Default implementation - override if provider supports batching
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  protected log(...args: any[]): void {
    if (this.debug || __DEV__) {
      console.log(`[${this.name}]`, ...args);
    }
  }

  protected warn(...args: any[]): void {
    if (this.debug || __DEV__) {
      console.warn(`[${this.name}]`, ...args);
    }
  }

  protected error(...args: any[]): void {
  }
}
