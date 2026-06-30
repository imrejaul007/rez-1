// @ts-nocheck
/**
 * Offline Queue Context
 *
 * Provides offline queue functionality throughout the app.
 * Manages bill upload queue state and synchronization.
 *
 * @module OfflineQueueContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import {
  billUploadQueueService,
  QueuedBill,
  QueueStatus,
  SyncResult,
  QueueEvent,
} from '../services/billUploadQueueService';
import type { BillUploadData } from '../types/billVerification.types';
// Lazy-loaded: netinfo not in synchronous dependency chain
const getNetInfo = async () => (await import('@react-native-community/netinfo')).default;

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface OfflineQueueContextValue {
  // State
  queue: QueuedBill[];
  status: QueueStatus | null;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;

  // Actions
  addToQueue: (formData: BillUploadData, imageUri: string) => Promise<string>;
  removeFromQueue: (billId: string) => Promise<void>;
  syncQueue: () => Promise<SyncResult>;
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  clearAll: () => Promise<void>;
  getBill: (billId: string) => Promise<QueuedBill | null>;
  refreshQueue: () => Promise<void>;

  // Utils
  isPending: (billId: string) => boolean;
  isUploading: (billId: string) => boolean;
  hasFailed: (billId: string) => boolean;
  hasSucceeded: (billId: string) => boolean;
  getPendingCount: () => number;
  getFailedCount: () => number;
}

export interface OfflineQueueProviderProps {
  children: ReactNode;
  autoSync?: boolean;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
  onQueueChange?: (status: QueueStatus) => void;
}

// ============================================================================
// Context
// ============================================================================

const OfflineQueueContext = createContext<OfflineQueueContextValue | undefined>(
  undefined
);

// ============================================================================
// Provider Component
// ============================================================================

export const OfflineQueueProvider: React.FC<OfflineQueueProviderProps> = ({
  children,
  autoSync = true,
  onSyncComplete,
  onSyncError,
  onQueueChange,
}) => {
  // State
  const [queue, setQueue] = useState<QueuedBill[]>([]);
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const isInitialized = useRef(false);
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const isOnlineRef = useRef(isOnline);

  // Keep ref in sync with state
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * Initialize queue service and setup listeners
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Initialize service
        await billUploadQueueService.initialize({ autoSync });

        // Load initial data
        if (mounted) {
          await refreshQueue();
        }

        // Listeners are registered in a dedicated useEffect below
        if (mounted) {
          setupNetworkMonitoring();
        }

        isInitialized.current = true;
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  /**
   * Call onQueueChange callback when status changes
   */
  useEffect(() => {
    if (status && onQueueChange) {
      onQueueChange(status);
    }
  }, [status, onQueueChange]);

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Add bill to upload queue
   */
  const addToQueue = useCallback(
    async (formData: BillUploadData, imageUri: string): Promise<string> => {
      try {
        setError(null);

        const billId = await billUploadQueueService.addToQueue(
          formData,
          imageUri
        );

        // Refresh queue
        await refreshQueue();

        return billId;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    []
  );

  /**
   * Remove bill from queue
   */
  const removeFromQueue = useCallback(async (billId: string): Promise<void> => {
    try {
      setError(null);

      await billUploadQueueService.removeFromQueue(billId);

      // Refresh queue
      await refreshQueue();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Sync queue - upload all pending bills
   */
  const syncQueue = useCallback(async (): Promise<SyncResult> => {
    try {
      setError(null);
      setIsSyncing(true);

      const result = await billUploadQueueService.syncQueue();

      setLastSyncResult(result);

      // Refresh queue
      await refreshQueue();

      // Call success callback
      if (onSyncComplete) {
        onSyncComplete(result);
      }

      return result;
    } catch (err: any) {
      setError(err.message);

      // Call error callback
      if (onSyncError) {
        onSyncError(err);
      }

      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [onSyncComplete, onSyncError]);

  /**
   * Retry all failed uploads
   */
  const retryFailed = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      await billUploadQueueService.retryFailed();

      // Refresh queue
      await refreshQueue();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Clear completed bills
   */
  const clearCompleted = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      await billUploadQueueService.clearCompleted();

      // Refresh queue
      await refreshQueue();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Clear all bills
   */
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      await billUploadQueueService.clearAll();

      // Refresh queue
      await refreshQueue();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get specific bill
   */
  const getBill = useCallback(
    async (billId: string): Promise<QueuedBill | null> => {
      try {
        return await billUploadQueueService.getBill(billId);
      } catch (err: any) {
        return null;
      }
    },
    []
  );

  /**
   * Refresh queue data
   */
  const refreshQueue = useCallback(async (): Promise<void> => {
    try {
      const [queueData, statusData] = await Promise.all([
        billUploadQueueService.getQueue(),
        billUploadQueueService.getStatus(),
      ]);

      setQueue(queueData);
      setStatus(statusData);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // ==========================================================================
  // Utils
  // ==========================================================================

  /**
   * Check if bill is pending
   */
  const isPending = useCallback(
    (billId: string): boolean => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status === 'pending';
    },
    [queue]
  );

  /**
   * Check if bill is uploading
   */
  const isUploading = useCallback(
    (billId: string): boolean => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status === 'uploading';
    },
    [queue]
  );

  /**
   * Check if bill has failed
   */
  const hasFailed = useCallback(
    (billId: string): boolean => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status === 'failed';
    },
    [queue]
  );

  /**
   * Check if bill has succeeded
   */
  const hasSucceeded = useCallback(
    (billId: string): boolean => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status === 'success';
    },
    [queue]
  );

  /**
   * Get pending count
   */
  const getPendingCount = useCallback((): number => {
    return status?.pending || 0;
  }, [status]);

  /**
   * Get failed count
   */
  const getFailedCount = useCallback((): number => {
    return status?.failed || 0;
  }, [status]);

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Setup event listeners for queue service
   * Uses useEffect pattern for proper cleanup
   */
  useEffect(() => {
    const onQueueChange = () => refreshQueue();
    const onQueueSynced = () => refreshQueue();
    const onQueueError = (e: QueueEvent) => setError(e.error || 'Unknown error');

    billUploadQueueService.on('queue:change', onQueueChange);
    billUploadQueueService.on('queue:synced', onQueueSynced);
    billUploadQueueService.on('queue:error', onQueueError);

    return () => {
      billUploadQueueService.off('queue:change', onQueueChange);
      billUploadQueueService.off('queue:synced', onQueueSynced);
      billUploadQueueService.off('queue:error', onQueueError);
    };
  }, []);

  /**
   * Setup network monitoring
   */
  const setupNetworkMonitoring = () => {
    getNetInfo().then(NetInfo => {
      networkUnsubscribe.current = NetInfo.addEventListener(state => {
        const wasOnline = isOnlineRef.current;
        const nowOnline = state.isConnected ?? false;

        setIsOnline(nowOnline);

        // Network reconnected
        if (!wasOnline && nowOnline) {
          // Auto-sync if enabled and has pending items
          if (autoSync && (status?.pending || 0) > 0) {
            syncQueue().catch(() => { /* silently handle */ });
          }
        }
      });
    }).catch(() => { /* silently handle */ });
  };

  /**
   * Cleanup listeners
   */
  const cleanup = () => {
    // Remove network listener
    if (networkUnsubscribe.current) {
      networkUnsubscribe.current();
      networkUnsubscribe.current = null;
    }

    // Remove service listeners
    billUploadQueueService.removeAllListeners();
  };

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const value: OfflineQueueContextValue = useMemo(() => ({
    // State
    queue,
    status,
    isSyncing,
    isOnline,
    lastSyncResult,
    error,

    // Actions
    addToQueue,
    removeFromQueue,
    syncQueue,
    retryFailed,
    clearCompleted,
    clearAll,
    getBill,
    refreshQueue,

    // Utils
    isPending,
    isUploading,
    hasFailed,
    hasSucceeded,
    getPendingCount,
    getFailedCount,
  }), [
    queue,
    status,
    isSyncing,
    isOnline,
    lastSyncResult,
    error,
    addToQueue,
    removeFromQueue,
    syncQueue,
    retryFailed,
    clearCompleted,
    clearAll,
    getBill,
    refreshQueue,
    isPending,
    isUploading,
    hasFailed,
    hasSucceeded,
    getPendingCount,
    getFailedCount,
  ]);

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Use offline queue context
 * Must be used within OfflineQueueProvider
 */
// Lazy import to avoid circular deps
const OFFLINE_QUEUE_DEFAULTS: OfflineQueueContextValue = {
  queue: [],
  status: null,
  isSyncing: false,
  isOnline: true,
  lastSyncResult: null,
  error: null,
  addToQueue: async () => '',
  removeFromQueue: async () => {},
  syncQueue: async () => ({ success: 0, failed: 0, total: 0, errors: [] } as any),
  retryFailed: async () => {},
  clearCompleted: async () => {},
  clearAll: async () => {},
  getBill: async () => null,
  refreshQueue: async () => {},
  isPending: () => false,
  isUploading: () => false,
  hasFailed: () => false,
  hasSucceeded: () => false,
  getPendingCount: () => 0,
  getFailedCount: () => 0,
};

let __useOfflineQueueStore: () => any;
try {
  const { useOfflineQueueStore } = require('@/stores/offlineQueueStore');
  __useOfflineQueueStore = useOfflineQueueStore;
} catch {
  __useOfflineQueueStore = () => OFFLINE_QUEUE_DEFAULTS;
}

// Now backed by Zustand store -- works with or without OfflineQueueProvider in tree.
export const useOfflineQueueContext = (): OfflineQueueContextValue => {
  const context = useContext(OfflineQueueContext);
  const store = __useOfflineQueueStore();
  if (context) return context;
  return store as unknown as OfflineQueueContextValue;
};
