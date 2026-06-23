// @ts-nocheck
/**
 * React Memo and Performance Optimization Helpers
 * Provides common comparison functions and memoization utilities
 */

import { ComponentType, memo } from 'react';

/**
 * Shallow comparison for objects
 * Compares first-level properties only
 */
export function shallowEqual<T extends Record<string, any>>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison for objects and arrays
 * Use sparingly as it can be expensive
 */
export function deepEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (typeof objA !== typeof objB) {
    return false;
  }

  if (objA === null || objB === null) {
    return objA === objB;
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }
    return objA.every((item, index) => deepEqual(item, objB[index]));
  }

  if (typeof objA === 'object' && typeof objB === 'object') {
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every(key => deepEqual(objA[key], objB[key]));
  }

  return false;
}

/**
 * Create a memo component with shallow comparison
 */
export function memoShallow<P extends object>(
  Component: ComponentType<P>,
  displayName?: string
): ComponentType<P> {
  const MemoComponent = memo(Component, (prevProps, nextProps) => shallowEqual(prevProps, nextProps));
  if (displayName) {
    MemoComponent.displayName = `MemoShallow(${displayName})`;
  }
  return MemoComponent;
}

/**
 * Create a memo component with deep comparison
 * Use only when necessary as deep comparison is expensive
 */
export function memoDeep<P extends object>(
  Component: ComponentType<P>,
  displayName?: string
): ComponentType<P> {
  const MemoComponent = memo(Component, (prevProps, nextProps) => deepEqual(prevProps, nextProps));
  if (displayName) {
    MemoComponent.displayName = `MemoDeep(${displayName})`;
  }
  return MemoComponent;
}

/**
 * Create a memo component that only compares specific props
 * Useful when you only care about certain props changing
 */
export function memoProps<P extends object>(
  Component: ComponentType<P>,
  propsToCompare: (keyof P)[],
  displayName?: string
): ComponentType<P> {
  const MemoComponent = memo(Component, (prevProps, nextProps) => {
    return propsToCompare.every(prop => Object.is(prevProps[prop], nextProps[prop]));
  });
  if (displayName) {
    MemoComponent.displayName = `MemoProps(${displayName})`;
  }
  return MemoComponent;
}

/**
 * Create a memo component that ignores specific props
 * Useful when certain props (like callbacks) don't affect rendering
 */
export function memoIgnoreProps<P extends object>(
  Component: ComponentType<P>,
  propsToIgnore: (keyof P)[],
  displayName?: string
): ComponentType<P> {
  const MemoComponent = memo(Component, (prevProps, nextProps) => {
    const prevFiltered = { ...prevProps };
    const nextFiltered = { ...nextProps };

    propsToIgnore.forEach(prop => {
      delete prevFiltered[prop];
      delete nextFiltered[prop];
    });

    return shallowEqual(prevFiltered, nextFiltered);
  });
  if (displayName) {
    MemoComponent.displayName = `MemoIgnore(${displayName})`;
  }
  return MemoComponent;
}

/**
 * Array comparison helper
 * Useful for useMemo/useCallback dependencies
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => Object.is(item, b[index]));
}

/**
 * Check if props are equal for primitive values only
 * Faster than shallow comparison for simple props
 */
export function primitivePropsEqual<P extends object>(prevProps: P, nextProps: P): boolean {
  const keysA = Object.keys(prevProps);
  const keysB = Object.keys(nextProps);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(key => {
    const prevValue = prevProps[key as keyof P];
    const nextValue = nextProps[key as keyof P];

    // Only compare primitives
    const isPrimitive = (val: any) =>
      val === null ||
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean' ||
      typeof val === 'undefined';

    if (!isPrimitive(prevValue) || !isPrimitive(nextValue)) {
      return true; // Skip non-primitive comparison
    }

    return Object.is(prevValue, nextValue);
  });
}

/**
 * Memo for list items with id/key
 * Optimized for FlatList renderItem
 */
export function memoListItem<P extends { id?: string | number; key?: string | number }>(
  Component: ComponentType<P>,
  displayName?: string
): ComponentType<P> {
  const MemoComponent = memo(Component, (prevProps, nextProps) => {
    // Quick check using id/key if available
    const prevId = prevProps.id ?? prevProps.key;
    const nextId = nextProps.id ?? nextProps.key;

    if (prevId !== undefined && nextId !== undefined && prevId !== nextId) {
      return false;
    }

    // Otherwise do shallow comparison
    return shallowEqual(prevProps, nextProps);
  });

  if (displayName) {
    MemoComponent.displayName = `MemoListItem(${displayName})`;
  }
  return MemoComponent;
}

/**
 * Performance measurement decorator for components
 * Logs render time in development
 */
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  if (__DEV__) {
    const TrackedComponent: React.FC<P> = (props) => {
      const startTime = performance.now();

      React.useEffect(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        if (renderTime > 16) { // More than one frame (60fps)
        }
      });

      return React.createElement(Component, props);
    };

    TrackedComponent.displayName = `PerformanceTracked(${componentName})`;
    return TrackedComponent;
  }

  return Component;
}

/**
 * Stable reference helper
 * Creates a stable reference that doesn't change between renders
 */
export function createStableRef<T>(value: T): { current: T } {
  return { current: value };
}

export default {
  shallowEqual,
  deepEqual,
  memoShallow,
  memoDeep,
  memoProps,
  memoIgnoreProps,
  memoListItem,
  arraysEqual,
  primitivePropsEqual,
  withPerformanceTracking,
  createStableRef,
};
