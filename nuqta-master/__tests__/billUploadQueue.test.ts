/**
 * Bill Upload Queue Service Tests
 *
 * Comprehensive test suite for the offline queue system.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { billUploadQueueService } from '../services/billUploadQueueService';
import { billVerificationService } from '../services/billVerificationService';
import type { BillUploadData } from '../types/billVerification.types';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../services/billVerificationService');

describe('BillUploadQueueService', () => {
  // Test data
  const mockFormData: BillUploadData = {
    storeId: 'store_123',
    amount: 100.5,
    date: new Date('2025-01-01'),
    categoryId: 'cat_1',
  };

  const mockImageUri = 'file:///path/to/image.jpg';

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Mock NetInfo
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      type: 'wifi',
    });

    // Mock bill verification service
    (billVerificationService.uploadBill as jest.Mock).mockResolvedValue({
      success: true,
      billId: 'uploaded_123',
    });

    // Destroy and reinitialize service
    await billUploadQueueService.destroy();
    await billUploadQueueService.initialize({ autoSync: false });
  });

  afterEach(async () => {
    await billUploadQueueService.destroy();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const service = billUploadQueueService;
      await service.initialize();

      const status = await service.getStatus();
      expect(status.total).toBe(0);
    });

    it('should load persisted queue on initialization', async () => {
      const persistedQueue = [
        {
          id: 'bill_1',
          formData: mockFormData,
          imageUri: mockImageUri,
          timestamp: Date.now(),
          status: 'pending' as const,
          attempt: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(persistedQueue)
      );

      await billUploadQueueService.initialize();

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('bill_1');
    });

    it('should reset uploading status to pending on initialization', async () => {
      const persistedQueue = [
        {
          id: 'bill_1',
          formData: mockFormData,
          imageUri: mockImageUri,
          timestamp: Date.now(),
          status: 'uploading' as const, // App crashed during upload
          attempt: 1,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(persistedQueue)
      );

      await billUploadQueueService.initialize();

      const queue = await billUploadQueueService.getQueue();
      expect(queue[0].status).toBe('pending');
    });
  });

  // ==========================================================================
  // Add to Queue Tests
  // ==========================================================================

  describe('Adding to Queue', () => {
    it('should add bill to queue successfully', async () => {
      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      expect(billId).toBeTruthy();
      expect(billId).toMatch(/^bill_/);

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(billId);
      expect(queue[0].formData).toEqual(mockFormData);
      expect(queue[0].status).toBe('pending');
    });

    it('should persist queue to AsyncStorage', async () => {
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bill_upload_queue',
        expect.any(String)
      );
    });

    it('should emit queue:change event', async () => {
      const listener = jest.fn();
      billUploadQueueService.on('queue:change', listener);

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'added',
          billId: expect.any(String),
        })
      );
    });

    it('should detect duplicate bills', async () => {
      const billId1 = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      // Add duplicate (same store, similar time, same image)
      const billId2 = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      expect(billId1).toBe(billId2);

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(1); // Only one bill added
    });

    it('should throw error when queue is full', async () => {
      // Initialize with small queue size
      await billUploadQueueService.initialize({ maxQueueSize: 2 });

      // Add 2 bills
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      // Try to add 3rd bill
      await expect(
        billUploadQueueService.addToQueue(mockFormData, mockImageUri)
      ).rejects.toThrow('Queue is full');
    });
  });

  // ==========================================================================
  // Queue Status Tests
  // ==========================================================================

  describe('Queue Status', () => {
    it('should return correct queue status', async () => {
      // Add bills with different statuses
      const billId1 = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      const billId2 = await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      // Manually set different statuses for testing
      await billUploadQueueService.updateBillStatus(billId1, 'uploading');
      await billUploadQueueService.updateBillStatus(billId2, 'failed', 'Network error');

      const status = await billUploadQueueService.getStatus();

      expect(status.total).toBe(2);
      expect(status.pending).toBe(0);
      expect(status.uploading).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.success).toBe(0);
    });

    it('should include last sync time in status', async () => {
      const lastSync = new Date().toISOString();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(lastSync);

      const status = await billUploadQueueService.getStatus();

      expect(status.lastSync).toBeDefined();
    });
  });

  // ==========================================================================
  // Sync Tests
  // ==========================================================================

  describe('Queue Synchronization', () => {
    it('should sync pending bills successfully', async () => {
      // Add pending bills
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      const result = await billUploadQueueService.syncQueue();

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify bills are marked as success
      const queue = await billUploadQueueService.getQueue();
      expect(queue.every(b => b.status === 'success')).toBe(true);
    });

    it('should handle upload failures', async () => {
      (billVerificationService.uploadBill as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      const result = await billUploadQueueService.syncQueue();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Network error');
    });

    it('should retry failed bills with exponential backoff', async () => {
      // First attempt fails
      (billVerificationService.uploadBill as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      // First sync - should fail
      await billUploadQueueService.syncQueue();

      let bill = await billUploadQueueService.getBill(billId);
      expect(bill?.status).toBe('pending'); // Reset to pending for retry
      expect(bill?.attempt).toBe(1);

      // Second sync - should succeed
      await billUploadQueueService.syncQueue();

      bill = await billUploadQueueService.getBill(billId);
      expect(bill?.status).toBe('success');
      expect(bill?.attempt).toBe(2);
    });

    it('should stop retrying after max attempts', async () => {
      (billVerificationService.uploadBill as jest.Mock).mockRejectedValue(
        new Error('Persistent error')
      );

      await billUploadQueueService.initialize({ maxRetries: 3 });

      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      // Try syncing 4 times
      for (let i = 0; i < 4; i++) {
        await billUploadQueueService.syncQueue();
      }

      const bill = await billUploadQueueService.getBill(billId);
      expect(bill?.status).toBe('failed');
      expect(bill?.attempt).toBe(3); // Max retries
    });

    it('should process bills in batches', async () => {
      await billUploadQueueService.initialize({ batchSize: 2 });

      // Add 5 bills
      for (let i = 0; i < 5; i++) {
        await billUploadQueueService.addToQueue(
          { ...mockFormData, storeId: `store_${i}` },
          `file:///image_${i}.jpg`
        );
      }

      await billUploadQueueService.syncQueue();

      // Verify all bills were processed
      const queue = await billUploadQueueService.getQueue();
      expect(queue.every(b => b.status === 'success')).toBe(true);

      // Verify uploadBill was called 5 times (in batches of 2)
      expect(billVerificationService.uploadBill).toHaveBeenCalledTimes(5);
    });

    it('should throw error when already syncing', async () => {
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      // Start first sync (make it slow)
      (billVerificationService.uploadBill as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const syncPromise = billUploadQueueService.syncQueue();

      // Try to start second sync
      await expect(billUploadQueueService.syncQueue()).rejects.toThrow(
        'Sync already in progress'
      );

      await syncPromise;
    });

    it('should throw error when offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
      });

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      await expect(billUploadQueueService.syncQueue()).rejects.toThrow(
        'No network connection'
      );
    });

    it('should update last sync time after successful sync', async () => {
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      await billUploadQueueService.syncQueue();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bill_upload_queue_last_sync',
        expect.any(String)
      );
    });

    it('should emit queue:synced event after sync', async () => {
      const listener = jest.fn();
      billUploadQueueService.on('queue:synced', listener);

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.syncQueue();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'synced',
        })
      );
    });
  });

  // ==========================================================================
  // Queue Management Tests
  // ==========================================================================

  describe('Queue Management', () => {
    it('should remove bill from queue', async () => {
      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      await billUploadQueueService.removeFromQueue(billId);

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should throw error when removing non-existent bill', async () => {
      await expect(
        billUploadQueueService.removeFromQueue('nonexistent')
      ).rejects.toThrow('Bill not found');
    });

    it('should retry failed bills', async () => {
      (billVerificationService.uploadBill as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      // First sync fails
      await billUploadQueueService.syncQueue();

      let bill = await billUploadQueueService.getBill(billId);
      expect(bill?.status).toBe('pending');

      // Retry failed
      await billUploadQueueService.retryFailed();

      bill = await billUploadQueueService.getBill(billId);
      expect(bill?.status).toBe('pending');
      expect(bill?.error).toBeUndefined();
    });

    it('should clear completed bills', async () => {
      // Add and sync bills
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      await billUploadQueueService.syncQueue();

      // Clear completed
      await billUploadQueueService.clearCompleted();

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(0);
    });

    it('should not clear non-completed bills when clearing completed', async () => {
      (billVerificationService.uploadBill as jest.Mock)
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Network error'));

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      await billUploadQueueService.syncQueue();

      // Clear completed
      await billUploadQueueService.clearCompleted();

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(1); // Failed bill remains
      expect(queue[0].status).toBe('pending');
    });

    it('should clear all bills', async () => {
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      await billUploadQueueService.clearAll();

      const queue = await billUploadQueueService.getQueue();
      expect(queue).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Bill Retrieval Tests
  // ==========================================================================

  describe('Bill Retrieval', () => {
    it('should get specific bill by ID', async () => {
      const billId = await billUploadQueueService.addToQueue(
        mockFormData,
        mockImageUri
      );

      const bill = await billUploadQueueService.getBill(billId);

      expect(bill).toBeDefined();
      expect(bill?.id).toBe(billId);
      expect(bill?.formData).toEqual(mockFormData);
    });

    it('should return null for non-existent bill', async () => {
      const bill = await billUploadQueueService.getBill('nonexistent');

      expect(bill).toBeNull();
    });

    it('should get all bills in queue', async () => {
      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);
      await billUploadQueueService.addToQueue(
        { ...mockFormData, storeId: 'store_456' },
        'file:///different.jpg'
      );

      const queue = await billUploadQueueService.getQueue();

      expect(queue).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Timeout Tests
  // ==========================================================================

  describe('Upload Timeout', () => {
    it('should timeout slow uploads', async () => {
      await billUploadQueueService.initialize({ uploadTimeoutMs: 1000 });

      // Mock slow upload (2 seconds)
      (billVerificationService.uploadBill as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      await billUploadQueueService.addToQueue(mockFormData, mockImageUri);

      const result = await billUploadQueueService.syncQueue();

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('Upload timeout');
    }, 10000);
  });
});
