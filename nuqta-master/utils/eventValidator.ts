// @ts-nocheck
/**
 * Analytics Event Validator
 *
 * Validates event names and properties before tracking
 */

import { EVENT_SCHEMAS } from '@/services/analytics/events';
import { EventValidationResult } from '@/services/analytics/types';

export class EventValidator {
  private static instance: EventValidator;
  private trackedEvents: Set<string> = new Set();
  private eventCounts: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): EventValidator {
    if (!EventValidator.instance) {
      EventValidator.instance = new EventValidator();
    }
    return EventValidator.instance;
  }

  /**
   * Validate event name
   */
  validateEventName(name: string): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if empty
    if (!name || name.trim() === '') {
      errors.push('Event name cannot be empty');
    }

    // Check length (max 40 characters for most providers)
    if (name.length > 40) {
      warnings.push(`Event name too long (${name.length} chars). Some providers limit to 40 characters`);
    }

    // Check for spaces
    if (name.includes(' ')) {
      errors.push('Event name cannot contain spaces. Use underscores instead');
    }

    // Check for uppercase
    if (name !== name.toLowerCase()) {
      warnings.push('Event name should be lowercase for consistency');
    }

    // Check for special characters
    if (!/^[a-z0-9_]+$/.test(name)) {
      errors.push('Event name should only contain lowercase letters, numbers, and underscores');
    }

    // Check for duplicate tracking
    const count = this.eventCounts.get(name) || 0;
    this.eventCounts.set(name, count + 1);

    if (count > 100) {
      warnings.push(`Event "${name}" has been tracked ${count} times. Check for tracking loops`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate event properties
   */
  validateEventProperties(
    eventName: string,
    properties?: Record<string, any>
  ): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if schema exists for this event
    const schema = EVENT_SCHEMAS[eventName as keyof typeof EVENT_SCHEMAS];

    if (schema) {
      // Check required properties
      schema.required.forEach(prop => {
        if (!properties || !(prop in properties)) {
          errors.push(`Missing required property: ${prop}`);
        }
      });

      // Check for unknown properties
      if (properties) {
        Object.keys(properties).forEach(prop => {
          if (!schema.required.includes(prop) && schema.optional && !schema.optional.includes(prop)) {
            warnings.push(`Unknown property: ${prop}`);
          }
        });
      }
    }

    // Validate property values
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        // Check property name
        if (key.length > 40) {
          warnings.push(`Property name "${key}" too long (${key.length} chars)`);
        }

        // Check for spaces in property names
        if (key.includes(' ')) {
          warnings.push(`Property name "${key}" contains spaces. Use underscores instead`);
        }

        // Check value types
        if (typeof value === 'function') {
          errors.push(`Property "${key}" cannot be a function`);
        }

        // Check for circular references
        try {
          JSON.stringify(value);
        } catch (error) {
          errors.push(`Property "${key}" contains circular reference or cannot be serialized`);
        }

        // Warn about large values
        if (typeof value === 'string' && value.length > 1000) {
          warnings.push(`Property "${key}" value is very large (${value.length} chars)`);
        }

        // Warn about nested objects (some providers don't support)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          warnings.push(`Property "${key}" is a nested object. Some providers may not support this`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete event
   */
  validateEvent(eventName: string, properties?: Record<string, any>): EventValidationResult {
    const nameValidation = this.validateEventName(eventName);
    const propsValidation = this.validateEventProperties(eventName, properties);

    return {
      valid: nameValidation.valid && propsValidation.valid,
      errors: [...nameValidation.errors, ...propsValidation.errors],
      warnings: [...nameValidation.warnings, ...propsValidation.warnings],
    };
  }

  /**
   * Sanitize event name
   */
  sanitizeEventName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 40);
  }

  /**
   * Sanitize property name
   */
  sanitizePropertyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 40);
  }

  /**
   * Check for potential tracking loops
   */
  checkForLoops(eventName: string, threshold: number = 10): boolean {
    const count = this.eventCounts.get(eventName) || 0;
    return count > threshold;
  }

  /**
   * Get event statistics
   */
  getEventStats(): Record<string, number> {
    return Object.fromEntries(this.eventCounts);
  }

  /**
   * Reset event counts
   */
  resetStats(): void {
    this.eventCounts.clear();
    this.trackedEvents.clear();
  }
}

// Export singleton
export const eventValidator = EventValidator.getInstance();
export default eventValidator;
