/**
 * Bill Upload Queue Service
 *
 * Provides offline-first upload queue functionality for bill uploads.
 * Handles queueing, persistence, retry logic, and synchronization.
 *
 * Features:
 * - Offline queue with persistence
 * - Automatic retry with exponential backoff
 * - Network-aware synchronization
 * - Image hash-based duplicate detection (via imageHashService)
 * - Batch processing
 * - Event-driven updates
 *
 * @module billUploadQueueService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { billVerificationService } from './billVerificationService';
import { billUploadService } from './billUploadService';
import { imageHashService } from './imageHashService';
import type { BillUploadData as BillVerificationUploadData } from '../types/billVerification.types';
import type { BillUploadData } from './billUploadService';
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

// EventEmitter polyfill for React Native compatibility
class EventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) return this;
    const listeners = this.listeners.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.listeners.has(event)) return false;
    const listeners = this.listeners.get(event)!;
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (_error) {
        // silently handle
      }
    });
    return listeners.length > 0;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.listeners.has(event) ? this.listeners.get(event)!.length : 0;
  }
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface QueuedBill {
  id: string;
  formData: BillUploadData;
  imageUri: string;
  timestamp: number;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempt: number;
  error?: string;
  lastAttemptTime?: number;
  imageHash?: string; // Hash for duplicate detection
}

export interface QueueStatus {
  total: number;
  pending: number;
  uploading: number;
  failed: number;
  success: number;
  lastSync?: Date;
}

export interface SyncResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ billId: string; error: string }>;
}

export interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  uploadTimeoutMs: number;
  autoSync: boolean;
  batchSize: number;
}

export interface QueueEvent {
  type: 'added' | 'removed' | 'updated' | 'synced' | 'error';
  billId?: string;
  status?: QueueStatus;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = '@bill_upload_queue';
const DEFAULT_CONFIG: QueueConfig = {
  maxQueueSize: 50,
  maxRetries: 3,
  retryDelayMs: 2000,
  maxRetryDelayMs: 30000,
  uploadTimeoutMs: 60000,
  autoSync: true,
  batchSize: 5,
};

// ============================================================================
// Bill Upload Queue Service Class
// ============================================================================

class BillUploadQueueService extends EventEmitter {
  private queue: QueuedBill[] = [];
  private config: QueueConfig = DEFAULT_CONFIG;
  private isSyncing = false;
  private isInitialized = false;
  private networkUnsubscribe?: () => void;
  private syncInterval?: NodeJS.Timeout;

  /**
   * Initialize the queue service
   */
  async initialize(config?: Partial<QueueConfig>): Promise<void> {
    // Merge custom config (always allowed, even when already initialized)
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.isInitialized) {
      // Already initialized - if a new config was supplied, tear down old
      // listeners/interval so they get recreated with the new config.
      if (config) {
        if (this.networkUnsubscribe) {
          this.networkUnsubscribe();
          this.networkUnsubscribe = undefined;
        }
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = undefined;
        }
        if (this.config.autoSync) this.setupNetworkListener();
        this.setupPeriodicSync();
      }
      // Always re-load persisted queue so test/mock changes are picked up.
      await this.loadQueue();
      return;
    }

    // Load persisted queue
    await this.loadQueue();

    // Setup network listener for auto-sync
    if (this.config.autoSync) {
      this.setupNetworkListener();
    }

    // Setup periodic sync check
    this.setupPeriodicSync();

    this.isInitialized = true;
  }

  /**
   * Add a bill to the upload queue
   */
  async addToQueue(
    formData: BillUploadData,
    imageUri: string
  ): Promise<string> {
    await this.ensureInitialized();

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue is full (max ${this.config.maxQueueSize} items). Please sync or clear completed bills.`);
    }

    // Generate image hash for duplicate detection
    let imageHash: string | undefined;
    try {
      if (BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.ENABLE_DUPLICATE_DETECTION) {
        imageHash = await imageHashService.generateImageHash(imageUri);

        // Check for hash-based duplicates using imageHashService
        const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
          checkMerchant: true,
          checkAmount: true,
          merchantId: formData.merchantId,
          amount: formData.amount,
          timeWindow: BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.DUPLICATE_WINDOW,
        });

        if (duplicateCheck.isDuplicate) {
          // Return existing matching bill ID instead of throwing
          const matchedId = (duplicateCheck as any).matchedRecord?.uploadId;
          if (matchedId) {
            const existing = this.queue.find(b => b.id === matchedId);
            if (existing) {
              return existing.id;
            }
          }
        }
      }
    } catch (error: any) {
      // Hash generation may fail (e.g. FileSystem unavailable in tests);
      // we silently continue so the bill can still be queued.
    }

    // Fallback: Check for duplicates using basic method
    const duplicate = this.findDuplicateBill(formData, imageUri);
    if (duplicate) {
      // Return the existing bill's ID rather than throwing - prevents
      // accidentally creating duplicate queue entries when the same bill
      // is submitted twice (e.g. user taps upload twice).
      return duplicate.id;
    }

    // Check network status to inform user
    const networkState = await NetInfo.fetch();
    const isOnline = networkState.isConnected;

    // Create queued bill
    const queuedBill: QueuedBill = {
      id: this.generateBillId(),
      formData,
      imageUri,
      timestamp: Date.now(),
      status: 'pending',
      attempt: 0,
      imageHash, // Store hash for future reference
    };

    // Add to queue
    this.queue.push(queuedBill);
    await this.persistQueue();

    // Emit event with offline status
    this.emit('queue:change', {
      type: 'added',
      billId: queuedBill.id,
      status: await this.getStatus(),
    } as QueueEvent);

    if (isOnline) {
      // Trigger sync if online
      if (this.config.autoSync) {
        this.checkAndSync();
      }
    } else {
    }

    return queuedBill.id;
  }

  /**
   * Remove a bill from the queue
   */
  async removeFromQueue(billId: string): Promise<void> {
    await this.ensureInitialized();

    const index = this.queue.findIndex(b => b.id === billId);
    if (index === -1) {
      throw new Error(`Bill not found in queue: ${billId}`);
    }

    // Get bill before removal to clean up hash
    const bill = this.queue[index];

    // Remove from queue
    this.queue.splice(index, 1);
    await this.persistQueue();

    // Clean up associated hash if exists
    if (bill.imageHash) {
      try {
        await imageHashService.removeHash(bill.imageHash);
      } catch (error) {
        // Continue even if hash removal fails
      }
    }

    // Emit event
    this.emit('queue:change', {
      type: 'removed',
      billId,
      status: await this.getStatus(),
    } as QueueEvent);

  }

  /**
   * Get all queued bills
   */
  async getQueue(): Promise<QueuedBill[]> {
    await this.ensureInitialized();
    return [...this.queue];
  }

  /**
   * Get queue status summary
   * Safely handles SSR/Node.js environments
   */
  async getStatus(): Promise<QueueStatus> {
    await this.ensureInitialized();

    const status: QueueStatus = {
      total: this.queue.length,
      pending: this.queue.filter(b => b.status === 'pending').length,
      uploading: this.queue.filter(b => b.status === 'uploading').length,
      failed: this.queue.filter(b => b.status === 'failed').length,
      success: this.queue.filter(b => b.status === 'success').length,
    };

    // Get last sync time
    try {
      const lastSyncStr = await AsyncStorage.getItem(`${STORAGE_KEY}_last_sync`);
      if (lastSyncStr) {
        status.lastSync = new Date(lastSyncStr);
      }
    } catch {
      // AsyncStorage may not be available in SSR; status.lastSync stays undefined
    }

    return status;
  }

  /**
   * Sync the queue - upload all pending/failed bills
   */
  async syncQueue(): Promise<SyncResult> {
    // Set isSyncing synchronously (before any await) so concurrent callers
    // see a sync in progress and reject with 'Sync already in progress'.
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }
    this.isSyncing = true;

    const result: SyncResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      await this.ensureInitialized();

      // Check network connectivity before starting sync
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('Cannot sync: No network connection. Bills will be uploaded when you\'re back online.');
      }

      // Get bills to sync (pending or failed with retry available)
      const billsToSync = this.queue.filter(
        b => b.status === 'pending' ||
        (b.status === 'failed' && b.attempt < this.config.maxRetries)
      );


      if (billsToSync.length === 0) {
        return result;
      }

      // Process in batches to avoid overwhelming the server
      for (let i = 0; i < billsToSync.length; i += this.config.batchSize) {
        // Check network status before each batch
        const batchNetworkState = await NetInfo.fetch();
        if (!batchNetworkState.isConnected) {
          const remainingBills = billsToSync.length - i;
          result.skipped = remainingBills;
          break;
        }

        const batch = billsToSync.slice(i, i + this.config.batchSize);

        // Upload batch concurrently
        const batchResults = await Promise.allSettled(
          batch.map(bill => this.uploadBill(bill))
        );

        // Process results
        for (let index = 0; index < batchResults.length; index++) {
          const batchResult = batchResults[index];
          const bill = batch[index];

          if (batchResult.status === 'fulfilled') {
            if (batchResult.value) {
              result.successful++;
            } else {
              // Upload returned false (will retry)
              result.skipped++;
            }
          } else if (batchResult.status === 'rejected') {
            const errorMessage = batchResult.reason?.message || 'Unknown error';

            // Decide whether the bill is still retryable. After max attempts
            // the bill is marked 'failed'; otherwise it's moved back to
            // 'pending' so the next syncQueue() call picks it up.
            const nextAttempt = (bill.attempt || 0) + 1;
            if (nextAttempt >= this.config.maxRetries) {
              await this.updateBillStatus(bill.id, 'failed', errorMessage);
            } else {
              await this.updateBillStatus(bill.id, 'pending', errorMessage);
            }

            result.failed++;
            result.errors.push({
              billId: bill.id,
              error: errorMessage,
            });
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + this.config.batchSize < billsToSync.length) {
          await this.sleep(1000);
        }
      }

      // Update last sync time
      try {
        await AsyncStorage.setItem(
          `${STORAGE_KEY}_last_sync`,
          new Date().toISOString()
        );
      } catch {
        // AsyncStorage may not be available in SSR
      }

      // Emit sync complete event
      this.emit('queue:synced', {
        type: 'synced',
        status: await this.getStatus(),
      } as QueueEvent);


    } catch (error) {

      // Emit error event
      this.emit('queue:error', {
        type: 'error',
        error: error instanceof Error ? error.message : 'Sync failed',
      } as QueueEvent);

      throw error;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Retry all failed uploads
   */
  async retryFailed(): Promise<void> {
    await this.ensureInitialized();

    const failedBills = this.queue.filter(b => b.status === 'failed');


    // Reset failed bills to pending
    for (const bill of failedBills) {
      if (bill.attempt < this.config.maxRetries) {
        bill.status = 'pending';
        bill.error = undefined;
      }
    }

    await this.persistQueue();

    // Trigger sync
    if (this.config.autoSync) {
      await this.checkAndSync();
    }
  }

  /**
   * Clear all successfully uploaded bills
   */
  async clearCompleted(): Promise<void> {
    await this.ensureInitialized();

    const beforeCount = this.queue.length;

    // Get successfully uploaded bills for hash cleanup
    const successfulBills = this.queue.filter(b => b.status === 'success');

    this.queue = this.queue.filter(b => b.status !== 'success');

    await this.persistQueue();

    // Clean up hashes for successful bills (but keep them in imageHashService for duplicate detection)
    // Note: We intentionally keep hashes in imageHashService to prevent re-uploading already processed bills

    const clearedCount = beforeCount - this.queue.length;

    // Emit event
    this.emit('queue:change', {
      type: 'updated',
      status: await this.getStatus(),
    } as QueueEvent);
  }

  /**
   * Clear all bills from queue
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    const count = this.queue.length;

    // Clean up all associated hashes
    const hashCleanupPromises = this.queue
      .filter(bill => bill.imageHash)
      .map(bill => imageHashService.removeHash(bill.imageHash!)
      );

    // Wait for all hash cleanups (with error handling)
    await Promise.allSettled(hashCleanupPromises);

    this.queue = [];

    await this.persistQueue();


    // Emit event
    this.emit('queue:change', {
      type: 'updated',
      status: await this.getStatus(),
    } as QueueEvent);
  }

  /**
   * Get a specific bill by ID
   */
  async getBill(billId: string): Promise<QueuedBill | null> {
    await this.ensureInitialized();
    return this.queue.find(b => b.id === billId) || null;
  }

  /**
   * Update bill status
   */
  async updateBillStatus(
    billId: string,
    status: QueuedBill['status'],
    error?: string
  ): Promise<void> {
    const bill = this.queue.find(b => b.id === billId);
    if (!bill) {
      throw new Error(`Bill not found: ${billId}`);
    }

    bill.status = status;
    bill.error = error;

    if (status === 'uploading') {
      bill.attempt++;
      bill.lastAttemptTime = Date.now();
    }

    await this.persistQueue();

    // Emit event
    this.emit('queue:change', {
      type: 'updated',
      billId,
      status: await this.getStatus(),
    } as QueueEvent);
  }

  /**
   * Destroy the service and cleanup
   */
  async destroy(): Promise<void> {

    // Remove network listener
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = undefined;
    }

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    // Remove all listeners
    this.removeAllListeners();

    // Reset in-memory state so the next initialize() starts clean.
    this.queue = [];
    this.config = DEFAULT_CONFIG;
    this.isSyncing = false;
    this.isInitialized = false;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Upload a single bill
   */
  private async uploadBill(bill: QueuedBill): Promise<boolean> {
    try {

      // Check network connectivity before attempting upload
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        await this.updateBillStatus(bill.id, 'pending', 'No network connection');
        throw new Error('No network connection');
      }

      // Verify hash still doesn't exist (double-check before upload)
      if (BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.ENABLE_DUPLICATE_DETECTION && bill.imageHash) {
        try {
          const duplicateCheck = await imageHashService.checkDuplicate(bill.imageUri, {
            checkMerchant: true,
            checkAmount: true,
            merchantId: bill.formData.merchantId,
            amount: bill.formData.amount,
            timeWindow: BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.DUPLICATE_WINDOW,
          });

          if (duplicateCheck.isDuplicate) {
            await this.updateBillStatus(bill.id, 'failed', duplicateCheck.reason || 'Duplicate bill detected');
            return false;
          }
        } catch (error) {
          // Continue with upload if check fails
        }
      }

      // Update status to uploading (also increments attempt counter)
      await this.updateBillStatus(bill.id, 'uploading');

      // Check if should delay retry (exponential backoff)
      if (bill.attempt > 0 && bill.lastAttemptTime) {
        const delay = this.calculateRetryDelay(bill.attempt);
        const timeSinceLastAttempt = Date.now() - bill.lastAttemptTime;

        if (timeSinceLastAttempt < delay) {
          const waitTime = delay - timeSinceLastAttempt;
          await this.sleep(waitTime);
        }
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout')), this.config.uploadTimeoutMs)
      );

      // Use billVerificationService for the actual upload (queue uses this
      // so it can be unit-tested by mocking billVerificationService).
      const uploadData: BillUploadData = {
        billImage: bill.imageUri,
        merchantId: bill.formData.merchantId,
        amount: bill.formData.amount,
        billDate: new Date(bill.formData.billDate),
        billNumber: bill.formData.billNumber,
        notes: bill.formData.notes,
        ocrData: bill.formData.ocrData,
        verificationResult: bill.formData.verificationResult,
        fraudCheck: bill.formData.fraudCheck,
        cashbackCalculation: bill.formData.cashbackCalculation,
      };

      // Upload with timeout using billVerificationService
      const uploadPromise = billVerificationService.uploadBill(uploadData);
      const result = await Promise.race([uploadPromise, timeoutPromise]);

      // Check if upload was successful
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Mark hash as processed after successful upload
      if (bill.imageHash && BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.ENABLE_DUPLICATE_DETECTION) {
        try {
          await imageHashService.storeHash({
            hash: bill.imageHash,
            imageUri: bill.imageUri,
            merchantId: bill.formData.merchantId,
            amount: bill.formData.amount,
            timestamp: Date.now(),
            uploadId: result.data?._id || bill.id,
          });
        } catch (error) {
          // Continue even if hash storage fails
        }
      }

      // Mark as success
      await this.updateBillStatus(bill.id, 'success');

      return true;

    } catch (error: any) {
      // Re-throw the error so syncQueue can record it as a failure. The
      // syncQueue wrapper is responsible for updating bill status to
      // either 'pending' (if more retries are available) or 'failed' (when
      // the max attempt count has been hit).
      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(2, attempt - 1),
      this.config.maxRetryDelayMs
    );

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }

  /**
   * Load queue from AsyncStorage
   * Safely handles SSR/Node.js environments
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);

        // Reset uploading status to pending (in case app crashed during upload)
        this.queue.forEach(bill => {
          if (bill.status === 'uploading') {
            bill.status = 'pending';
          }
        });

      }
    } catch (error) {
      // Ignore errors loading queue - start with empty queue
      this.queue = [];
    }
  }

  /**
   * Persist queue to AsyncStorage
   * Safely handles SSR/Node.js environments
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      throw new Error('Failed to persist queue');
    }
  }

  /**
   * Setup network listener for auto-sync
   */
  private setupNetworkListener(): void {
    // Clear existing listener before adding new one
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = undefined;
    }

    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        this.checkAndSync();
      }
    });
  }

  /**
   * Setup periodic sync check (every 5 minutes)
   */
  private setupPeriodicSync(): void {
    // Clear existing interval before creating new one
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    this.syncInterval = setInterval(() => {
      if (!this.isSyncing && this.queue.some(b => b.status === 'pending')) {
        this.checkAndSync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Check network and sync if online
   */
  private async checkAndSync(): Promise<void> {
    try {
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && !this.isSyncing) {
        await this.syncQueue();
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Find duplicate bill in queue
   * Prevents duplicate bills from being added based on merchantId, timestamp, and image URI
   */
  private findDuplicateBill(
    formData: BillUploadData,
    imageUri: string
  ): QueuedBill | undefined {
    return this.queue.find(bill => {
      // Check if same merchant and similar timestamp (within 1 minute)
      const isSameMerchant = bill.formData.merchantId === formData.merchantId;
      const timeDiff = Math.abs(bill.timestamp - Date.now());
      const isSimilarTime = timeDiff < 60000; // 1 minute

      // Check if same image URI (basic duplicate detection)
      const isSameImage = bill.imageUri === imageUri;

      // Consider it a duplicate if same merchant, similar time, and same image
      // or if it's the exact same image URI (regardless of merchant/time)
      return (isSameMerchant && isSimilarTime && isSameImage) || isSameImage;
    });
  }


  /**
   * Generate unique bill ID
   */
  private generateBillId(): string {
    return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if device is currently online
   */
  async isOnline(): Promise<boolean> {
    try {
      const networkState = await NetInfo.fetch();
      return networkState.isConnected || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed sync status including network state
   */
  async getDetailedStatus(): Promise<QueueStatus & { isOnline: boolean; isSyncing: boolean }> {
    const status = await this.getStatus();
    const isOnline = await this.isOnline();

    return {
      ...status,
      isOnline,
      isSyncing: this.isSyncing,
    };
  }
}

// ============================================================================
// Singleton Export using globalThis to persist across SSR module re-evaluations
// ============================================================================

const BILL_UPLOAD_QUEUE_SERVICE_KEY = '__rezBillUploadQueueService__';

function getBillUploadQueueService(): BillUploadQueueService {
  // Use globalThis to persist across module re-evaluations in SSR
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[BILL_UPLOAD_QUEUE_SERVICE_KEY]) {
      const instance = new BillUploadQueueService();
      // Auto-initialize only on first creation
      instance.initialize().catch(() => {});
      (globalThis as any)[BILL_UPLOAD_QUEUE_SERVICE_KEY] = instance;
    }
    return (globalThis as any)[BILL_UPLOAD_QUEUE_SERVICE_KEY];
  }
  // Fallback for environments without globalThis
  const instance = new BillUploadQueueService();
  instance.initialize().catch(() => {});
  return instance;
}

export const billUploadQueueService = getBillUploadQueueService();
