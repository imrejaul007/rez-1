/**
 * Analytics Debugger
 *
 * Debug and test analytics events in development
 */

import { AnalyticsEvent } from '@/services/analytics/types';
import { eventValidator } from './eventValidator';

interface DebugEvent extends AnalyticsEvent {
  id: string;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class AnalyticsDebugger {
  private static instance: AnalyticsDebugger;
  private events: DebugEvent[] = [];
  private maxEvents: number = 100;
  private enabled: boolean = __DEV__;

  private constructor() {}

  static getInstance(): AnalyticsDebugger {
    if (!AnalyticsDebugger.instance) {
      AnalyticsDebugger.instance = new AnalyticsDebugger();
    }
    return AnalyticsDebugger.instance;
  }

  /**
   * Log event for debugging
   */
  logEvent(event: AnalyticsEvent): void {
    if (!this.enabled) return;

    // Validate event
    const validation = eventValidator.validateEvent(event.name, event.properties);

    const debugEvent: DebugEvent = {
      ...event,
      id: this.generateId(),
      validation,
    };

    this.events.push(debugEvent);

    // Trim events if too many
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console with styling
    this.logToConsole(debugEvent);
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(event: DebugEvent): void {
    const isValid = event.validation?.valid !== false;
    const emoji = isValid ? '✅' : '❌';

    console.group(`${emoji} Analytics Event: ${event.name}`);

    if (event.properties && Object.keys(event.properties).length > 0) {
    }


    if (event.validation && !event.validation.valid) {
    }

    if (event.validation && event.validation.warnings.length > 0) {
    }

    console.groupEnd();
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 20): DebugEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get all events
   */
  getAllEvents(): DebugEvent[] {
    return [...this.events];
  }

  /**
   * Get events by name
   */
  getEventsByName(name: string): DebugEvent[] {
    return this.events.filter(e => e.name === name);
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    uniqueEvents: number;
    validEvents: number;
    invalidEvents: number;
    eventCounts: Record<string, number>;
  } {
    const eventCounts: Record<string, number> = {};
    let validCount = 0;
    let invalidCount = 0;

    this.events.forEach(event => {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;

      if (event.validation?.valid !== false) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    return {
      totalEvents: this.events.length,
      uniqueEvents: Object.keys(eventCounts).length,
      validEvents: validCount,
      invalidEvents: invalidCount,
      eventCounts,
    };
  }

  /**
   * Print stats to console
   */
  printStats(): void {
    const stats = this.getStats();

    console.group('📊 Analytics Statistics');
    console.table(stats.eventCounts);
    console.groupEnd();
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Search events
   */
  searchEvents(query: string): DebugEvent[] {
    const lowerQuery = query.toLowerCase();

    return this.events.filter(event => {
      // Search in event name
      if (event.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in properties
      if (event.properties) {
        const propsString = JSON.stringify(event.properties).toLowerCase();
        if (propsString.includes(lowerQuery)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Test event
   */
  testEvent(eventName: string, properties?: Record<string, any>): void {
    const validation = eventValidator.validateEvent(eventName, properties);

    console.group(`🧪 Testing Event: ${eventName}`);

    if (validation.valid) {
    } else {
    }

    if (validation.warnings.length > 0) {
    }

    if (properties) {
    }

    console.groupEnd();
  }

  /**
   * Enable/disable debugger
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const analyticsDebugger = AnalyticsDebugger.getInstance();
export default analyticsDebugger;
