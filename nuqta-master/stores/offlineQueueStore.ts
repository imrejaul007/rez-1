// @ts-nocheck
import { create } from 'zustand';
import {
  billUploadQueueService,
  QueuedBill,
  QueueStatus,
  SyncResult,
} from '../services/billUploadQueueService';
import type { BillUploadData } from '../types/billVerification.types';

export interface OfflineQueueStoreState {
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

export const useOfflineQueueStore = create<OfflineQueueStoreState>((set, get) => ({
  queue: [],
  status: null,
  isSyncing: false,
  isOnline: true,
  lastSyncResult: null,
  error: null,

  addToQueue: async (formData: BillUploadData, imageUri: string): Promise<string> => {
    try {
      set({ error: null });
      const billId = await billUploadQueueService.addToQueue(formData, imageUri);
      await get().refreshQueue();
      return billId;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  removeFromQueue: async (billId: string): Promise<void> => {
    try {
      set({ error: null });
      await billUploadQueueService.removeFromQueue(billId);
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  syncQueue: async (): Promise<SyncResult> => {
    try {
      set({ error: null, isSyncing: true });
      const result = await billUploadQueueService.syncQueue();
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
      await billUploadQueueService.retryFailed();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  clearCompleted: async (): Promise<void> => {
    try {
      set({ error: null });
      await billUploadQueueService.clearCompleted();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      set({ error: null });
      await billUploadQueueService.clearAll();
      await get().refreshQueue();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  getBill: async (billId: string): Promise<QueuedBill | null> => {
    try {
      return await billUploadQueueService.getBill(billId);
    } catch (_err: any) {
      return null;
    }
  },

  refreshQueue: async (): Promise<void> => {
    try {
      const [queueData, statusData] = await Promise.all([
        billUploadQueueService.getQueue(),
        billUploadQueueService.getStatus(),
      ]);
      set({ queue: queueData, status: statusData });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  isPending: (billId: string): boolean => {
    return get().queue.find(b => b.id === billId)?.status === 'pending';
  },

  isUploading: (billId: string): boolean => {
    return get().queue.find(b => b.id === billId)?.status === 'uploading';
  },

  hasFailed: (billId: string): boolean => {
    return get().queue.find(b => b.id === billId)?.status === 'failed';
  },

  hasSucceeded: (billId: string): boolean => {
    return get().queue.find(b => b.id === billId)?.status === 'success';
  },

  getPendingCount: (): number => {
    return get().status?.pending || 0;
  },

  getFailedCount: (): number => {
    return get().status?.failed || 0;
  },
}));
