/**
 * Offline Sync Service
 *
 * Generic offline-first queue for serializable API actions.
 * Queues actions when offline, auto-syncs when connectivity returns.
 *
 * Supported action types:
 * - visit_submission: Store visit scheduling
 * - referral_share: Referral link share tracking
 * - reward_claim: Referral reward claims
 *
 * Features:
 * - AsyncStorage persistence across app restarts
 * - Auto-sync on network reconnection (NetInfo)
 * - Exponential backoff retry (2s → 30s, max 3 attempts)
 * - Concurrency limit (3 concurrent actions)
 * - Event-driven updates for UI reactivity
 *
 * @module offlineSyncService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// ─── EventEmitter (lightweight polyfill) ────────────────────

class EventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const arr = this.listeners.get(event);
    if (!arr) return this;
    const idx = arr.indexOf(listener);
    if (idx > -1) arr.splice(idx, 1);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const arr = this.listeners.get(event);
    if (!arr) return false;
    arr.forEach(fn => { try { fn(...args); } catch (_) { /* silent */ } });
    return arr.length > 0;
  }

  removeAllListeners(event?: string): this {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
    return this;
  }
}

// ─── Types ──────────────────────────────────────────────────

export type OfflineActionType = 'visit_submission' | 'referral_share' | 'reward_claim';
export type OfflineActionStatus = 'pending' | 'syncing' | 'success' | 'failed';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, any>;
  status: OfflineActionStatus;
  attempt: number;
  maxAttempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface OfflineQueueStatus {
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  success: number;
}

export interface SyncResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ actionId: string; error: string }>;
}

interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  concurrency: number;
  autoSync: boolean;
}

// ─── Constants ──────────────────────────────────────────────

const STORAGE_KEY = '@offline_action_queue';

const DEFAULT_CONFIG: QueueConfig = {
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelayMs: 2000,
  maxRetryDelayMs: 30000,
  concurrency: 3,
  autoSync: true,
};

// ─── Service ────────────────────────────────────────────────

class OfflineSyncService extends EventEmitter {
  private queue: OfflineAction[] = [];
  private config: QueueConfig = DEFAULT_CONFIG;
  private isSyncing = false;
  private isInitialized = false;
  private networkUnsubscribe?: () => void;
  private wasOffline = false;

  /**
   * Initialize: load persisted queue + setup network listener.
   */
  async initialize(config?: Partial<QueueConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) this.config = { ...this.config, ...config };

    await this.loadQueue();

    if (this.config.autoSync) {
      this.setupNetworkListener();
    }

    this.isInitialized = true;
  }

  /**
   * Enqueue an action. If online and autoSync, triggers immediate sync.
   */
  async enqueue(type: OfflineActionType, payload: Record<string, any>): Promise<string> {
    await this.ensureInitialized();

    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Offline queue is full (max ${this.config.maxQueueSize}). Please sync or clear completed actions.`);
    }

    // Dedup: skip if identical pending action exists
    const isDupe = this.queue.some(
      a => a.type === type
        && a.status === 'pending'
        && JSON.stringify(a.payload) === JSON.stringify(payload)
    );
    if (isDupe) {
      throw new Error('This action is already queued');
    }

    const action: OfflineAction = {
      id: this.generateId(),
      type,
      payload,
      status: 'pending',
      attempt: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: Date.now(),
    };

    this.queue.push(action);
    await this.persistQueue();

    this.emit('queue:change', { type: 'added', actionId: action.id });

    // If online, trigger sync
    const netState = await NetInfo.fetch();
    if (netState.isConnected && this.config.autoSync) {
      this.syncAll().catch(() => {});
    }

    return action.id;
  }

  /**
   * Process all pending/eligible-for-retry actions.
   */
  async syncAll(): Promise<SyncResult> {
    await this.ensureInitialized();

    if (this.isSyncing) {
      return { total: 0, successful: 0, failed: 0, errors: [] };
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { total: 0, successful: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = { total: 0, successful: 0, failed: 0, errors: [] };

    try {
      const eligible = this.queue.filter(a =>
        a.status === 'pending' || (a.status === 'failed' && this.isEligibleForRetry(a))
      );

      result.total = eligible.length;
      if (eligible.length === 0) return result;

      // Process in batches of concurrency limit
      for (let i = 0; i < eligible.length; i += this.config.concurrency) {
        const batch = eligible.slice(i, i + this.config.concurrency);
        const batchResults = await Promise.allSettled(
          batch.map(action => this.processAction(action))
        );

        for (let j = 0; j < batchResults.length; j++) {
          const batchResult = batchResults[j]!;
          if (batchResult.status === 'fulfilled') {
            result.successful++;
          } else {
            result.failed++;
            result.errors.push({
              actionId: batch[j]!.id,
              error: batchResult.reason?.message || 'Unknown error',
            });
          }
        }
      }

      await this.persistQueue();
      this.emit('queue:synced', result);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Get the full queue.
   */
  async getQueue(): Promise<OfflineAction[]> {
    await this.ensureInitialized();
    return [...this.queue];
  }

  /**
   * Get queue status summary.
   */
  async getStatus(): Promise<OfflineQueueStatus> {
    await this.ensureInitialized();
    return {
      total: this.queue.length,
      pending: this.queue.filter(a => a.status === 'pending').length,
      syncing: this.queue.filter(a => a.status === 'syncing').length,
      failed: this.queue.filter(a => a.status === 'failed').length,
      success: this.queue.filter(a => a.status === 'success').length,
    };
  }

  /**
   * Remove an action from the queue.
   */
  async remove(actionId: string): Promise<void> {
    await this.ensureInitialized();
    const idx = this.queue.findIndex(a => a.id === actionId);
    if (idx === -1) return;
    this.queue.splice(idx, 1);
    await this.persistQueue();
    this.emit('queue:change', { type: 'removed', actionId });
  }

  /**
   * Clear all completed (success) actions.
   */
  async clearCompleted(): Promise<void> {
    await this.ensureInitialized();
    this.queue = this.queue.filter(a => a.status !== 'success');
    await this.persistQueue();
    this.emit('queue:change', { type: 'cleared' });
  }

  /**
   * Reset failed actions to pending and trigger sync.
   */
  async retryFailed(): Promise<void> {
    await this.ensureInitialized();
    for (const action of this.queue) {
      if (action.status === 'failed') {
        action.status = 'pending';
        action.attempt = 0;
        action.error = undefined;
        action.lastAttemptAt = undefined;
      }
    }
    await this.persistQueue();
    this.emit('queue:change', { type: 'retry' });
    this.syncAll().catch(() => {});
  }

  /**
   * Clear entire queue.
   */
  async clearAll(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.emit('queue:change', { type: 'cleared' });
  }

  /**
   * Cleanup on app teardown.
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = undefined;
    }
    this.removeAllListeners();
    this.isInitialized = false;
  }

  // ─── Private ────────────────────────────────────────────

  private async processAction(action: OfflineAction): Promise<void> {
    // Mark as syncing
    action.status = 'syncing';
    action.attempt++;
    action.lastAttemptAt = Date.now();

    try {
      switch (action.type) {
        case 'visit_submission': {
          const { default: storeVisitService } = await import('./storeVisitApi');
          await storeVisitService.scheduleStoreVisit(action.payload as any);
          break;
        }
        case 'referral_share': {
          const { default: referralService } = await import('./referralApi');
          await referralService.shareReferralLink(action.payload.platform);
          break;
        }
        case 'reward_claim': {
          const { default: referralService } = await import('./referralApi');
          await referralService.claimReferralRewards();
          break;
        }
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      action.status = 'success';
      action.error = undefined;
    } catch (err: any) {
      action.error = err.message || 'Sync failed';

      if (action.attempt >= action.maxAttempts) {
        action.status = 'failed';
      } else {
        action.status = 'pending'; // Will retry on next sync cycle
      }

      throw err;
    }
  }

  private isEligibleForRetry(action: OfflineAction): boolean {
    if (action.attempt >= action.maxAttempts) return false;
    if (!action.lastAttemptAt) return true;

    // Exponential backoff
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(2, action.attempt),
      this.config.maxRetryDelayMs
    );

    return Date.now() - action.lastAttemptAt >= delay;
  }

  private setupNetworkListener(): void {
    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;

      if (!isConnected) {
        this.wasOffline = true;
        return;
      }

      // Reconnected — auto-sync
      if (this.wasOffline && isConnected) {
        this.wasOffline = false;
        // Small delay to let connection stabilize
        setTimeout(() => {
          this.syncAll().catch(() => {});
        }, 1500);
      }
    });
  }

  private async loadQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OfflineAction[];
        // Reset any "syncing" actions back to "pending" (interrupted sync)
        this.queue = parsed.map(a => ({
          ...a,
          status: a.status === 'syncing' ? 'pending' as const : a.status,
        }));
      }
    } catch {
      this.queue = [];
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage write failure — non-blocking
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
