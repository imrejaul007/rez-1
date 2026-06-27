// hooks/useOptimisticMutation.ts - Optimistic mutation hook with automatic rollback

import { useCallback, useRef, useState } from 'react';
import { useToastStore } from '@/stores/toastStore';

interface OptimisticMutationOptions<T, R> {
  /** Optimistic update function - updates state immediately */
  optimisticUpdate: (currentState: T) => T;

  /** API call - returns server response */
  serverCall: () => Promise<R>;

  /** Rollback function - restores previous state on failure */
  rollback?: (currentState: T) => T;

  /** Success handler - optional post-success logic */
  onSuccess?: (result: R) => void;

  /** Error handler - custom error handling */
  onError?: (error: Error) => void;

  /** Loading state key for tracking */
  loadingKey?: string;

  /** Zustand store for managing state (provides getState and setState) */
  store?: {
    getState: () => T;
    setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void;
  };
}

interface UseOptimisticMutationReturn<T> {
  /** Execute the optimistic mutation */
  mutate: () => Promise<void>;
  /** Whether a mutation is currently in progress */
  isPending: boolean;
  /** Error from the last failed mutation */
  error: Error | null;
}

/**
 * Hook for optimistic updates with automatic rollback on failure.
 *
 * Provides immediate UI feedback by applying optimistic updates before the server
 * confirms the change, with automatic rollback if the request fails.
 *
 * @example
 * ```typescript
 * // Example with Zustand store
 * const { mutate, isPending, error } = useOptimisticMutation({
 *   store: useCartStore,
 *   optimisticUpdate: (cart) => ({
 *     ...cart,
 *     items: [...cart.items, newItem],
 *     total: cart.total + newItem.price
 *   }),
 *   serverCall: () => cartApi.addItem(newItem),
 *   rollback: (cart) => ({
 *     ...cart,
 *     items: cart.items.filter(i => i.id !== newItem.id),
 *     total: cart.total - newItem.price
 *   }),
 *   onSuccess: (result) => {
 *     analytics.track('item_added', { itemId: newItem.id });
 *   },
 * });
 *
 * // Trigger the mutation
 * await mutate();
 * ```
 */
export function useOptimisticMutation<T, R>(
  options: OptimisticMutationOptions<T, R>
): UseOptimisticMutationReturn<T> {
  const {
    store,
    optimisticUpdate,
    serverCall,
    rollback,
    onSuccess,
    onError,
  } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Ref to track request validity - prevents race conditions when multiple
  // mutations are triggered in quick succession
  const requestIdRef = useRef(0);

  // Toast store for showing error notifications
  const showError = useToastStore((state) => state.showError);

  const mutate = useCallback(async () => {
    // Increment request ID to invalidate any in-flight responses
    const currentRequestId = ++requestIdRef.current;

    // Clear any previous errors
    setError(null);
    setIsPending(true);

    // Capture current state for potential rollback
    const previousState = store?.getState();

    // Apply optimistic update immediately if store is provided
    if (store && previousState) {
      const optimisticResult = optimisticUpdate(previousState);
      store.setState(optimisticResult as Partial<T>);
    }

    try {
      // Execute the server call
      const result = await serverCall();

      // Check if this request is still the latest one (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      // Call the success handler if provided
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      // Check if this request is still the latest one (race condition prevention)
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));

      // Rollback to previous state if store and rollback function provided
      if (store && previousState && rollback) {
        const rollbackResult = rollback(previousState);
        store.setState(rollbackResult as Partial<T>);
      }

      // Show error toast
      showError(error.message || 'An error occurred');

      // Call the custom error handler if provided
      if (onError) {
        onError(error);
      }

      // Update error state
      setError(error);
    } finally {
      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setIsPending(false);
      }
    }
  }, [store, optimisticUpdate, serverCall, rollback, onSuccess, onError, showError]);

  return {
    mutate,
    isPending,
    error,
  };
}

export default useOptimisticMutation;
