/**
 * Persisted State Utilities
 * Auto-save state to AsyncStorage with debouncing and restoration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Types
// ============================================================================

export interface PersistedStateOptions<T> {
  key: string;
  defaultValue: T;
  debounceMs?: number; // Debounce save operations
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  onSave?: (value: T) => void;
  onRestore?: (value: T) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Persisted State Hook
// ============================================================================

/**
 * Hook for persisting state to AsyncStorage
 * Automatically saves state changes with debouncing
 *
 * @example
 * ```tsx
 * const [cart, setCart] = usePersistedState({
 *   key: 'cart',
 *   defaultValue: [],
 *   debounceMs: 500,
 * });
 * ```
 */
export function usePersistedState<T>(
  options: PersistedStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => Promise<void>] {
  const {
    key,
    defaultValue,
    debounceMs = 300,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onSave,
    onRestore,
    onError,
  } = options;

  const [state, setState] = useState<T>(defaultValue);
  const [isRestored, setIsRestored] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Restore state on mount
  useEffect(() => {
    isMounted.current = true;

    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(key);

        if (stored !== null) {
          const restoredValue = deserialize(stored);

          if (isMounted.current) {
            setState(restoredValue);

            if (onRestore) {
              onRestore(restoredValue);
            }

          }
        }
      } catch (error) {

        if (onError && isMounted.current) {
          onError(error instanceof Error ? error : new Error('Restore failed'));
        }
      } finally {
        if (isMounted.current) {
          setIsRestored(true);
        }
      }
    };

    restore();

    return () => {
      isMounted.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [key]);

  // Save state to storage (debounced)
  const saveToStorage = useCallback(
    async (value: T): Promise<void> => {
      try {
        const serialized = serialize(value);
        await AsyncStorage.setItem(key, serialized);

        if (onSave) {
          onSave(value);
        }

      } catch (error) {

        if (onError) {
          onError(error instanceof Error ? error : new Error('Save failed'));
        }
      }
    },
    [key, serialize, onSave, onError]
  );

  // Update state and schedule save
  const updateState = useCallback(
    (value: T | ((prev: T) => T)): void => {
      setState((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        // Clear previous timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Schedule save
        saveTimeoutRef.current = setTimeout(() => {
          saveToStorage(newValue);
        }, debounceMs);

        return newValue;
      });
    },
    [debounceMs, saveToStorage]
  );

  // Force immediate save
  const forceSave = useCallback(async (): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToStorage(state);
  }, [state, saveToStorage]);

  // Return state only after restoration attempt
  return isRestored ? [state, updateState, forceSave] : [defaultValue, updateState, forceSave];
}

// ============================================================================
// Persisted State Manager
// ============================================================================

class PersistedStateManager {
  private keys: Set<string> = new Set();

  /**
   * Register a persisted state key
   */
  register(key: string): void {
    this.keys.add(key);
  }

  /**
   * Unregister a persisted state key
   */
  unregister(key: string): void {
    this.keys.delete(key);
  }

  /**
   * Get all registered keys
   */
  getKeys(): string[] {
    return Array.from(this.keys);
  }

  /**
   * Clear a specific persisted state
   */
  async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all persisted states
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Array.from(this.keys);
      await AsyncStorage.multiRemove(keys);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get size of all persisted states
   */
  async getSize(): Promise<number> {
    try {
      const keys = Array.from(this.keys);
      const items = await AsyncStorage.multiGet(keys);

      let totalSize = 0;
      items.forEach(([_, value]) => {
        if (value) {
          totalSize += value.length;
        }
      });

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Export all persisted states
   */
  async export(): Promise<Record<string, any>> {
    try {
      const keys = Array.from(this.keys);
      const items = await AsyncStorage.multiGet(keys);

      const exported: Record<string, any> = {};

      items.forEach(([key, value]) => {
        if (value) {
          try {
            exported[key] = JSON.parse(value);
          } catch {
            exported[key] = value;
          }
        }
      });

      return exported;
    } catch (error) {
      return {};
    }
  }

  /**
   * Import persisted states
   */
  async import(data: Record<string, any>): Promise<void> {
    try {
      const entries: [string, string][] = Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]);

      await AsyncStorage.multiSet(entries);

      entries.forEach(([key]) => this.keys.add(key));

    } catch (_error) {
      // silently handle
    }
  }
}

export const persistedStateManager = new PersistedStateManager();

// ============================================================================
// Pre-defined Persisted States
// ============================================================================

export const PERSISTED_KEYS = {
  CART: 'persisted:cart',
  WISHLIST: 'persisted:wishlist',
  RECENT_SEARCHES: 'persisted:recent_searches',
  USER_PREFERENCES: 'persisted:user_preferences',
  VIEWED_PRODUCTS: 'persisted:viewed_products',
  FORM_DRAFT: 'persisted:form_draft',
} as const;

// Auto-register predefined keys
Object.values(PERSISTED_KEYS).forEach((key) => {
  persistedStateManager.register(key);
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Persist cart state
 */
export function usePersistedCart<T = any>(defaultValue: T[] = []) {
  return usePersistedState({
    key: PERSISTED_KEYS.CART,
    defaultValue,
    debounceMs: 500,
  });
}

/**
 * Persist wishlist state
 */
export function usePersistedWishlist<T = any>(defaultValue: T[] = []) {
  return usePersistedState({
    key: PERSISTED_KEYS.WISHLIST,
    defaultValue,
    debounceMs: 500,
  });
}

/**
 * Persist recent searches
 */
export function usePersistedRecentSearches(defaultValue: string[] = []) {
  return usePersistedState({
    key: PERSISTED_KEYS.RECENT_SEARCHES,
    defaultValue,
    debounceMs: 300,
  });
}

/**
 * Persist user preferences
 */
export function usePersistedPreferences<T = Record<string, any>>(
  defaultValue: T = {} as T
) {
  return usePersistedState({
    key: PERSISTED_KEYS.USER_PREFERENCES,
    defaultValue,
    debounceMs: 500,
  });
}

/**
 * Persist form draft
 */
export function usePersistedFormDraft<T = Record<string, any>>(
  formKey: string,
  defaultValue: T = {} as T
) {
  return usePersistedState({
    key: `${PERSISTED_KEYS.FORM_DRAFT}:${formKey}`,
    defaultValue,
    debounceMs: 1000,
  });
}

export default usePersistedState;
