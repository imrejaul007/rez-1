/**
 * useDebouncedValue Hook
 *
 * Returns a debounced version of a value that only updates after
 * the specified delay has passed without changes.
 *
 * Perfect for search inputs, filters, and other real-time updates.
 */

import { useState, useEffect, useRef } from 'react';

interface UseDebouncedValueOptions {
  delay?: number;
  leading?: boolean; // Update immediately on first change
  trailing?: boolean; // Update after delay (default: true)
  maxWait?: number; // Maximum time to wait before forcing update
}

export function useDebouncedValue<T>(
  value: T,
  options: UseDebouncedValueOptions = {}
): T {
  const { delay = 500, leading = false, trailing = true, maxWait } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousValueRef = useRef<T>(value);
  const leadingCalledRef = useRef<boolean>(false);

  useEffect(() => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Leading edge - update immediately on first change
    if (leading && !leadingCalledRef.current && value !== previousValueRef.current) {
      setDebouncedValue(value);
      leadingCalledRef.current = true;
      previousValueRef.current = value;
    }

    // Set up maxWait timeout if specified
    if (maxWait && !maxWaitTimeoutRef.current) {
      maxWaitTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        maxWaitTimeoutRef.current = null;
        leadingCalledRef.current = false;
        previousValueRef.current = value;
      }, maxWait);
    }

    // Trailing edge - update after delay
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(value);
        leadingCalledRef.current = false;
        previousValueRef.current = value;

        // Clear maxWait timeout if it exists
        if (maxWaitTimeoutRef.current) {
          clearTimeout(maxWaitTimeoutRef.current);
          maxWaitTimeoutRef.current = null;
        }
      }, delay);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitTimeoutRef.current) {
        clearTimeout(maxWaitTimeoutRef.current);
        maxWaitTimeoutRef.current = null;
      }
    };
  }, [value, delay, leading, trailing, maxWait]);

  return debouncedValue;
}

/**
 * useDebouncedCallback Hook
 *
 * Returns a debounced version of a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}

/**
 * useThrottledValue Hook
 *
 * Returns a throttled version of a value that updates at most
 * once per specified interval
 */
export function useThrottledValue<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdatedRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdatedRef.current;

    if (timeSinceLastUpdate >= interval) {
      // Update immediately if interval has passed
      setThrottledValue(value);
      lastUpdatedRef.current = now;
    } else {
      // Schedule update for when interval is reached
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastUpdatedRef.current = Date.now();
      }, interval - timeSinceLastUpdate);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}

/**
 * useThrottledCallback Hook
 *
 * Returns a throttled version of a callback function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 500
): (...args: Parameters<T>) => void {
  const lastCalledRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCalledRef.current;

    if (timeSinceLastCall >= interval) {
      // Call immediately if interval has passed
      callbackRef.current(...args);
      lastCalledRef.current = now;
    } else if (!timeoutRef.current) {
      // Schedule call for when interval is reached
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        lastCalledRef.current = Date.now();
        timeoutRef.current = null;
      }, interval - timeSinceLastCall);
    }
  };
}

export default useDebouncedValue;
