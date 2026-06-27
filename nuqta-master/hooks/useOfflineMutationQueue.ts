import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import asyncStorageService, { STORAGE_KEYS } from '@/services/asyncStorageService';
import { useToast } from './useToast';
import { devLog } from '@/utils/devLogger';

/**
 * Supported mutation types that can be queued for offline processing
 */
export type MutationType =
  | 'addToCart'
  | 'removeFromCart'
  | 'updateCartItem'
  | 'clearCart'
  | 'addToWishlist'
  | 'removeFromWishlist'
  | 'updateProfile'
  | 'updateAddress'
  | 'addAddress'
  | 'removeAddress'
  | 'placeOrder'
  | 'cancelOrder'
  | 'applyCoupon'
  | 'removeCoupon';

/**
 * Payload structure for queued mutations
 */
export interface MutationPayload {
  // Cart mutations
  addToCart?: { productId: string; quantity: number; variantId?: string };
  removeFromCart?: { productId: string; variantId?: string };
  updateCartItem?: { productId: string; quantity: number; variantId?: string };
  clearCart?: Record<string, never>;
  // Wishlist mutations
  addToWishlist?: { productId: string };
  removeFromWishlist?: { productId: string };
  // Profile mutations
  updateProfile?: { field: string; value: string | number | boolean };
  // Address mutations
  updateAddress?: { addressId: string; data: Record<string, unknown> };
  addAddress?: { data: Record<string, unknown> };
  removeAddress?: { addressId: string };
  // Order mutations
  placeOrder?: { cartId: string; paymentMethod?: string };
  cancelOrder?: { orderId: string; reason?: string };
  // Coupon mutations
  applyCoupon?: { couponCode: string };
  removeCoupon?: Record<string, never>;
}

/**
 * A mutation that has been queued for offline processing
 */
export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: MutationPayload;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
  lastError?: string;
}

/**
 * Configuration for the offline queue
 */
export interface OfflineQueueConfig {
  /** Maximum number of retries for a single mutation */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;
  /** Maximum number of mutations to keep in queue */
  maxQueueSize?: number;
  /** Enable automatic processing when online */
  autoProcess?: boolean;
}

/**
 * Result of processing a mutation
 */
interface MutationResult {
  success: boolean;
  error?: string;
  conflictDetected?: boolean;
}

/**
 * Service functions for executing different mutation types
 * These should be connected to actual API endpoints
 */
type MutationExecutor = (
  payload: MutationPayload
) => Promise<MutationResult>;

/**
 * Hook to manage an offline queue for mutations.
 * Queues mutations when offline and processes them when back online.
 *
 * @example
 * ```tsx
 * const { queueMutation, processQueue, queueLength, isProcessing, isOnline } = useOfflineMutationQueue();
 *
 * // Queue a mutation when offline
 * const handleAddToCart = async () => {
 *   if (!isOnline) {
 *     queueMutation({ type: 'addToCart', payload: { productId: '123', quantity: 1 } });
 *     return;
 *   }
 *   // ... normal add to cart logic
 * };
 *
 * // Manually trigger queue processing
 * const handleSync = () => processQueue();
 * ```
 */
export function useOfflineMutationQueue(config: OfflineQueueConfig = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    maxQueueSize = 100,
    autoProcess = true,
  } = config;

  const { showToast, showSuccess, showError, showInfo } = useToast();

  // Queue state
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Ref to track if we're currently processing
  const isProcessingRef = useRef(false);
  // Ref to track executor functions
  const executorsRef = useRef<Partial<Record<MutationType, MutationExecutor>>>({});

  /**
   * Generate a unique ID for a mutation
   */
  const generateId = useCallback(() => {
    return `mutation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Save queue to persistent storage
   */
  const persistQueue = useCallback(async (mutations: QueuedMutation[]) => {
    try {
      await asyncStorageService.save(STORAGE_KEYS.MUTATION_OFFLINE_QUEUE, mutations);
    } catch (error) {
      devLog.error('Failed to persist mutation queue:', error);
    }
  }, []);

  /**
   * Load queue from persistent storage
   */
  const loadQueue = useCallback(async () => {
    try {
      const stored = await asyncStorageService.get<QueuedMutation[]>(
        STORAGE_KEYS.MUTATION_OFFLINE_QUEUE
      );
      return stored || [];
    } catch (error) {
      devLog.error('Failed to load mutation queue:', error);
      return [];
    }
  }, []);

  /**
   * Add a mutation to the queue
   */
  const queueMutation = useCallback(
    async (
      type: MutationType,
      payload: MutationPayload,
      options: { skipOnlineCheck?: boolean } = {}
    ) => {
      // If not offline and skipOnlineCheck is false, process immediately
      if (isOnline && !options.skipOnlineCheck) {
        devLog.log('Online - processing mutation immediately:', type);
        return;
      }

      // Check queue size limit
      if (queue.length >= maxQueueSize) {
        devLog.warn('Mutation queue is full. Removing oldest failed mutations.');
        // Remove failed mutations first
        setQueue((prev) => {
          const filtered = prev.filter((m) => m.status !== 'failed');
          // If still full, remove oldest
          if (filtered.length >= maxQueueSize) {
            return filtered.slice(filtered.length - maxQueueSize + 1);
          }
          return filtered;
        });
      }

      const mutation: QueuedMutation = {
        id: generateId(),
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      setQueue((prev) => {
        const updated = [...prev, mutation];
        persistQueue(updated);
        return updated;
      });

      devLog.log('Mutation queued:', type, mutation.id);
      showInfo(`Action saved. Will sync when online.`, 2000);
    },
    [isOnline, maxQueueSize, queue.length, generateId, persistQueue, showInfo]
  );

  /**
   * Remove a mutation from the queue
   */
  const removeMutation = useCallback(
    (id: string) => {
      setQueue((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        persistQueue(updated);
        return updated;
      });
    },
    [persistQueue]
  );

  /**
   * Update a mutation in the queue
   */
  const updateMutation = useCallback(
    (id: string, updates: Partial<QueuedMutation>) => {
      setQueue((prev) => {
        const updated = prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
        persistQueue(updated);
        return updated;
      });
    },
    [persistQueue]
  );

  /**
   * Execute a single mutation using registered executor
   */
  const executeMutation = useCallback(
    async (mutation: QueuedMutation): Promise<MutationResult> => {
      const executor = executorsRef.current[mutation.type];

      if (!executor) {
        devLog.warn('No executor registered for mutation type:', mutation.type);
        // Return success for unregistered types to prevent infinite retry
        return { success: true };
      }

      try {
        const result = await executor(mutation.payload);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    []
  );

  /**
   * Process all queued mutations
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !isOnline) {
      devLog.log('Process queue skipped:', isProcessingRef.current ? 'already processing' : 'offline');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    showToast('Syncing offline actions...', 'info', 2000);

    const pendingMutations = queue.filter(
      (m) => m.status === 'pending' || m.status === 'failed'
    );

    devLog.log(`Processing ${pendingMutations.length} queued mutations`);

    let successCount = 0;
    let failCount = 0;

    for (const mutation of pendingMutations) {
      // Skip if already at max retries
      if (mutation.retryCount >= maxRetries) {
        updateMutation(mutation.id, { status: 'failed', lastError: 'Max retries exceeded' });
        failCount++;
        continue;
      }

      // Mark as processing
      updateMutation(mutation.id, { status: 'processing' });

      const result = await executeMutation(mutation);

      if (result.success) {
        // Remove from queue on success
        removeMutation(mutation.id);
        successCount++;
        devLog.log('Mutation processed successfully:', mutation.type, mutation.id);
      } else {
        // Handle failure
        const newRetryCount = mutation.retryCount + 1;

        if (newRetryCount >= maxRetries) {
          updateMutation(mutation.id, {
            status: 'failed',
            retryCount: newRetryCount,
            lastError: result.error,
          });
          failCount++;
          devLog.error('Mutation failed permanently:', mutation.type, result.error);
        } else {
          // Schedule retry with delay
          updateMutation(mutation.id, {
            status: 'pending',
            retryCount: newRetryCount,
            lastError: result.error,
          });

          // Wait before next mutation
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    setIsProcessing(false);
    isProcessingRef.current = false;
    setLastSyncTime(Date.now());

    // Show result toast
    if (successCount > 0 && failCount === 0) {
      showSuccess(`${successCount} action(s) synced successfully`, 3000);
    } else if (successCount > 0 && failCount > 0) {
      showInfo(`Synced ${successCount} action(s). ${failCount} failed.`, 4000);
    } else if (failCount > 0) {
      showError(`${failCount} action(s) failed to sync`, 4000);
    }

    devLog.log(`Queue processing complete: ${successCount} success, ${failCount} failed`);
  }, [
    isOnline,
    queue,
    maxRetries,
    retryDelay,
    executeMutation,
    removeMutation,
    updateMutation,
    showToast,
    showSuccess,
    showError,
    showInfo,
  ]);

  /**
   * Clear all failed mutations from the queue
   */
  const clearFailed = useCallback(() => {
    setQueue((prev) => {
      const updated = prev.filter((m) => m.status !== 'failed');
      persistQueue(updated);
      return updated;
    });
    showInfo('Failed mutations cleared', 2000);
  }, [persistQueue, showInfo]);

  /**
   * Clear the entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    persistQueue([]);
    showInfo('Queue cleared', 2000);
  }, [persistQueue, showInfo]);

  /**
   * Retry a specific failed mutation
   */
  const retryMutation = useCallback(
    (id: string) => {
      updateMutation(id, { status: 'pending', retryCount: 0, lastError: undefined });
      // Trigger processing if not already
      if (!isProcessingRef.current && isOnline) {
        processQueue();
      }
    },
    [updateMutation, isOnline, processQueue]
  );

  /**
   * Register an executor function for a mutation type
   */
  const registerExecutor = useCallback(
    (type: MutationType, executor: MutationExecutor) => {
      executorsRef.current[type] = executor;
    },
    []
  );

  /**
   * Check if a specific mutation type has a registered executor
   */
  const hasExecutor = useCallback((type: MutationType) => {
    return !!executorsRef.current[type];
  }, []);

  /**
   * Get mutations by type
   */
  const getMutationsByType = useCallback(
    (type: MutationType) => {
      return queue.filter((m) => m.type === type);
    },
    [queue]
  );

  /**
   * Get pending mutations count
   */
  const pendingCount = queue.filter(
    (m) => m.status === 'pending' || m.status === 'processing'
  ).length;

  /**
   * Get failed mutations count
   */
  const failedCount = queue.filter((m) => m.status === 'failed').length;

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsOnline(connected);

      if (connected && autoProcess && !isProcessingRef.current) {
        devLog.log('Network restored - processing queue');
        // Small delay to ensure stable connection
        setTimeout(() => {
          if (queue.length > 0) {
            processQueue();
          }
        }, 1000);
      }
    });

    // Initial network check
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, [autoProcess, processQueue, queue.length]);

  // Load queue on mount
  useEffect(() => {
    const initQueue = async () => {
      const storedQueue = await loadQueue();
      setQueue(storedQueue);
      devLog.log('Loaded mutation queue:', storedQueue.length, 'items');
    };
    initQueue();
  }, [loadQueue]);

  // Process queue when coming back online with autoProcess enabled
  useEffect(() => {
    if (isOnline && autoProcess && queue.length > 0 && !isProcessingRef.current) {
      const pendingCount = queue.filter(
        (m) => m.status === 'pending' || m.status === 'failed'
      ).length;
      if (pendingCount > 0) {
        devLog.log('Auto-processing queue due to network restoration');
        setTimeout(processQueue, 1000);
      }
    }
  }, [isOnline, autoProcess, queue, processQueue]);

  return {
    // Queue state
    queue,
    queueLength: queue.length,
    pendingCount,
    failedCount,

    // Processing state
    isProcessing,
    isOnline,
    lastSyncTime,

    // Queue operations
    queueMutation,
    processQueue,
    clearQueue,
    clearFailed,

    // Mutation operations
    removeMutation,
    retryMutation,
    updateMutation,

    // Query helpers
    getMutationsByType,
    hasExecutor,

    // Registration
    registerExecutor,
  };
}

export default useOfflineMutationQueue;
