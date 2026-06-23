import { create } from 'zustand';
import offlineSyncService, {
  OfflineAction,
  OfflineActionType,
  OfflineQueueStatus,
  SyncResult,
} from '../services/offlineSyncService';

export interface OfflineSyncStoreState {
  // State
  queue: OfflineAction[];
  status: OfflineQueueStatus | null;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;
  pendingCount: number;
  failedCount: number;

  // Actions
  initialize: () => Promise<void>;
  enqueue: (type: OfflineActionType, payload: Record<string, any>) => Promise<string>;
  syncAll: () => Promise<SyncResult>;
  retryFailed: () => Promise<void>;
  remove: (actionId: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  clearAll: () => Promise<void>;
  refreshQueue: () => Promise<void>;

  // Utilities
  isPending: (actionId: string) => boolean;
  hasFailed: (actionId: string) => boolean;
  hasSucceeded: (actionId: string) => boolean;
}

export const useOfflineSyncStore = create<OfflineSyncStoreState>((set, get) => ({
  queue: [],
  status: null,
  isSyncing: false,
  isOnline: true,
  lastSyncResult: null,
  error: null,
  pendingCount: 0,
  failedCount: 0,

  initialize: async (): Promise<void> => {
    try {
      await offlineSyncService.initialize();

      // Listen for queue changes
      offlineSyncService.on('queue:change', () => {
        get().refreshQueue();
      });
      offlineSyncService.on('queue:synced', (result: SyncResult) => {
        set({ lastSyncResult: result });
        get().refreshQueue();
      });

      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  enqueue: async (type: OfflineActionType, payload: Record<string, any>): Promise<string> => {
    try {
      set({ error: null });
      const actionId = await offlineSyncService.enqueue(type, payload);
      await get().refreshQueue();
      return actionId;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  syncAll: async (): Promise<SyncResult> => {
    try {
      set({ error: null, isSyncing: true });
      const result = await offlineSyncService.syncAll();
      set({ lastSyncResult: result });
      await get().refreshQueue();
      return result;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isSyncing: false });
    }
  },

  retryFailed: async (): Promise<void> => {
    try {
      set({ error: null });
      await offlineSyncService.retryFailed();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  remove: async (actionId: string): Promise<void> => {
    try {
      set({ error: null });
      await offlineSyncService.remove(actionId);
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearCompleted: async (): Promise<void> => {
    try {
      set({ error: null });
      await offlineSyncService.clearCompleted();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      set({ error: null });
      await offlineSyncService.clearAll();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  refreshQueue: async (): Promise<void> => {
    try {
      const [queueData, statusData] = await Promise.all([
        offlineSyncService.getQueue(),
        offlineSyncService.getStatus(),
      ]);
      set({
        queue: queueData,
        status: statusData,
        pendingCount: statusData.pending,
        failedCount: statusData.failed,
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  isPending: (actionId: string): boolean => {
    return get().queue.find(a => a.id === actionId)?.status === 'pending';
  },

  hasFailed: (actionId: string): boolean => {
    return get().queue.find(a => a.id === actionId)?.status === 'failed';
  },

  hasSucceeded: (actionId: string): boolean => {
    return get().queue.find(a => a.id === actionId)?.status === 'success';
  },
}));
