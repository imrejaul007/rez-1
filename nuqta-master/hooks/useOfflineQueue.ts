/**
 * useOfflineQueue Hook
 *
 * Provides easy access to offline queue functionality.
 * Includes utilities and computed values for bill upload queue management.
 *
 * @module useOfflineQueue
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useOfflineQueueContext } from '../contexts/OfflineQueueContext';
import type {
  QueuedBill,
  QueueStatus,
  SyncResult,
} from '../services/billUploadQueueService';
import type { BillUploadData } from '../types/billVerification.types';

// ============================================================================
// Types
// ============================================================================

export interface UseOfflineQueueReturn {
  // State
  queue: QueuedBill[];
  status: QueueStatus | null;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;

  // Computed
  isEmpty: boolean;
  hasPendingUploads: boolean;
  hasFailedUploads: boolean;
  hasCompletedUploads: boolean;
  canSync: boolean;
  needsSync: boolean;
  totalCount: number;
  pendingCount: number;
  uploadingCount: number;
  failedCount: number;
  successCount: number;
  syncProgress: number; // 0-100

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
  getBillStatus: (billId: string) => QueuedBill['status'] | null;
  getBillError: (billId: string) => string | null;
  getBillAttempts: (billId: string) => number;
  canRetry: (billId: string) => boolean;

  // Filtering
  getPendingBills: () => QueuedBill[];
  getUploadingBills: () => QueuedBill[];
  getFailedBills: () => QueuedBill[];
  getSuccessfulBills: () => QueuedBill[];

  // Statistics
  getSuccessRate: () => number;
  getAverageAttempts: () => number;
  getOldestPendingAge: () => number | null; // Age in milliseconds
  getEstimatedSyncTime: () => number; // Estimated time in seconds
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useOfflineQueue Hook
 *
 * Provides comprehensive access to the offline upload queue system.
 * Must be used within OfflineQueueProvider.
 *
 * @example
 * ```tsx
 * const {
 *   queue,
 *   addToQueue,
 *   syncQueue,
 *   hasPendingUploads,
 *   pendingCount
 * } = useOfflineQueue();
 *
 * // Add bill to queue
 * const billId = await addToQueue(formData, imageUri);
 *
 * // Sync when ready
 * if (hasPendingUploads && isOnline) {
 *   await syncQueue();
 * }
 * ```
 */
export const useOfflineQueue = (): UseOfflineQueueReturn => {
  // Get context
  const context = useOfflineQueueContext();

  const {
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
  } = context;

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  /**
   * Check if queue is empty
   */
  const isEmpty = useMemo(() => {
    return queue.length === 0;
  }, [queue]);

  /**
   * Check if there are pending uploads
   */
  const hasPendingUploads = useMemo(() => {
    return (status?.pending || 0) > 0;
  }, [status]);

  /**
   * Check if there are failed uploads
   */
  const hasFailedUploads = useMemo(() => {
    return (status?.failed || 0) > 0;
  }, [status]);

  /**
   * Check if there are completed uploads
   */
  const hasCompletedUploads = useMemo(() => {
    return (status?.success || 0) > 0;
  }, [status]);

  /**
   * Check if can sync (online and has pending)
   */
  const canSync = useMemo(() => {
    return isOnline && hasPendingUploads && !isSyncing;
  }, [isOnline, hasPendingUploads, isSyncing]);

  /**
   * Check if needs sync
   */
  const needsSync = useMemo(() => {
    return hasPendingUploads || hasFailedUploads;
  }, [hasPendingUploads, hasFailedUploads]);

  /**
   * Get total count
   */
  const totalCount = useMemo(() => {
    return status?.total || 0;
  }, [status]);

  /**
   * Get pending count
   */
  const pendingCount = useMemo(() => {
    return status?.pending || 0;
  }, [status]);

  /**
   * Get uploading count
   */
  const uploadingCount = useMemo(() => {
    return status?.uploading || 0;
  }, [status]);

  /**
   * Get failed count
   */
  const failedCount = useMemo(() => {
    return status?.failed || 0;
  }, [status]);

  /**
   * Get success count
   */
  const successCount = useMemo(() => {
    return status?.success || 0;
  }, [status]);

  /**
   * Calculate sync progress (0-100)
   */
  const syncProgress = useMemo(() => {
    if (totalCount === 0) return 0;

    const completed = successCount;
    return Math.round((completed / totalCount) * 100);
  }, [totalCount, successCount]);

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Get bill status
   */
  const getBillStatus = useCallback(
    (billId: string): QueuedBill['status'] | null => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status || null;
    },
    [queue]
  );

  /**
   * Get bill error
   */
  const getBillError = useCallback(
    (billId: string): string | null => {
      const bill = queue.find(b => b.id === billId);
      return bill?.error || null;
    },
    [queue]
  );

  /**
   * Get bill attempts
   */
  const getBillAttempts = useCallback(
    (billId: string): number => {
      const bill = queue.find(b => b.id === billId);
      return bill?.attempt || 0;
    },
    [queue]
  );

  /**
   * Check if bill can be retried
   */
  const canRetry = useCallback(
    (billId: string): boolean => {
      const bill = queue.find(b => b.id === billId);
      return bill?.status === 'failed' && (bill?.attempt || 0) < 3;
    },
    [queue]
  );

  // ==========================================================================
  // Filtering Functions
  // ==========================================================================

  /**
   * Get pending bills
   */
  const getPendingBills = useCallback((): QueuedBill[] => {
    return queue.filter(b => b.status === 'pending');
  }, [queue]);

  /**
   * Get uploading bills
   */
  const getUploadingBills = useCallback((): QueuedBill[] => {
    return queue.filter(b => b.status === 'uploading');
  }, [queue]);

  /**
   * Get failed bills
   */
  const getFailedBills = useCallback((): QueuedBill[] => {
    return queue.filter(b => b.status === 'failed');
  }, [queue]);

  /**
   * Get successful bills
   */
  const getSuccessfulBills = useCallback((): QueuedBill[] => {
    return queue.filter(b => b.status === 'success');
  }, [queue]);

  // ==========================================================================
  // Statistics Functions
  // ==========================================================================

  /**
   * Calculate success rate (0-100)
   */
  const getSuccessRate = useCallback((): number => {
    if (totalCount === 0) return 0;

    const attempted = totalCount - pendingCount;
    if (attempted === 0) return 0;

    return Math.round((successCount / attempted) * 100);
  }, [totalCount, pendingCount, successCount]);

  /**
   * Calculate average attempts
   */
  const getAverageAttempts = useCallback((): number => {
    if (queue.length === 0) return 0;

    const totalAttempts = queue.reduce((sum, bill) => sum + bill.attempt, 0);
    return Math.round((totalAttempts / queue.length) * 10) / 10; // Round to 1 decimal
  }, [queue]);

  /**
   * Get oldest pending bill age in milliseconds
   */
  const getOldestPendingAge = useCallback((): number | null => {
    const pendingBills = getPendingBills();
    if (pendingBills.length === 0) return null;

    const oldestBill = pendingBills.reduce((oldest, bill) =>
      bill.timestamp < oldest.timestamp ? bill : oldest
    );

    return Date.now() - oldestBill.timestamp;
  }, [getPendingBills]);

  /**
   * Estimate sync time in seconds
   */
  const getEstimatedSyncTime = useCallback((): number => {
    const billsToSync = pendingCount + failedCount;
    if (billsToSync === 0) return 0;

    // Estimate 5 seconds per bill (conservative)
    const estimatedSeconds = billsToSync * 5;

    // Account for retries (add 50% for failed bills)
    const retryOverhead = failedCount * 2.5;

    return Math.round(estimatedSeconds + retryOverhead);
  }, [pendingCount, failedCount]);

  // ==========================================================================
  // Return Value
  // ==========================================================================

  return {
    // State
    queue,
    status,
    isSyncing,
    isOnline,
    lastSyncResult,
    error,

    // Computed
    isEmpty,
    hasPendingUploads,
    hasFailedUploads,
    hasCompletedUploads,
    canSync,
    needsSync,
    totalCount,
    pendingCount,
    uploadingCount,
    failedCount,
    successCount,
    syncProgress,

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
    getBillStatus,
    getBillError,
    getBillAttempts,
    canRetry,

    // Filtering
    getPendingBills,
    getUploadingBills,
    getFailedBills,
    getSuccessfulBills,

    // Statistics
    getSuccessRate,
    getAverageAttempts,
    getOldestPendingAge,
    getEstimatedSyncTime,
  };
};

/**
 * Hook for monitoring queue changes
 *
 * @param callback - Called when queue changes
 *
 * @example
 * ```tsx
 * useQueueMonitor((status) => {
 * });
 * ```
 */
export const useQueueMonitor = (
  callback: (status: QueueStatus) => void
): void => {
  const { status } = useOfflineQueue();

  // Store callback in ref to avoid triggering effect on callback change
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Call callback when status changes
  useEffect(() => {
    if (status) {
      callbackRef.current(status);
    }
  }, [status]);
};

/**
 * Hook for specific bill monitoring
 *
 * @param billId - Bill ID to monitor
 *
 * @example
 * ```tsx
 * const bill = useBillMonitor('bill_123');
 *
 * if (bill?.status === 'success') {
 * }
 * ```
 */
export const useBillMonitor = (billId: string): QueuedBill | null => {
  const { queue } = useOfflineQueue();

  return useMemo(() => {
    return queue.find(b => b.id === billId) || null;
  }, [queue, billId]);
};
