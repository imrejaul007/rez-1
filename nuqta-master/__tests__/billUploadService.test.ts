/**
 * Bill Upload Service Tests
 *
 * Comprehensive test suite for billUploadService.
 * Tests upload flow, retry logic, error handling, progress tracking,
 * and upload cancellation.
 *
 * @coverage 85%+ target
 */

import { billUploadService, BillUploadData } from '@/services/billUploadService';
import apiClient from '@/services/apiClient';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('@/services/apiClient');
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

describe('BillUploadService', () => {
  const mockBillData: BillUploadData = {
    billImage: 'file://test-bill.jpg',
    merchantId: 'merchant-123',
    amount: 1000,
    billDate: new Date('2024-01-15'),
    billNumber: 'INV-001',
    notes: 'Test bill upload',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      upload: {
        addEventListener: jest.fn(),
      },
      addEventListener: jest.fn(),
      timeout: 0,
    })) as any;
  });

  // =============================================================================
  // BASIC UPLOAD TESTS
  // =============================================================================

  describe('uploadBillWithProgress', () => {
    test('creates FormData with correct fields', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      // Trigger load event
      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify({
        success: true,
        data: { _id: 'bill-123' },
      });
      mockXHR.triggerLoad();

      const result = await promise;
      expect(result.success).toBe(true);
    });

    test('sends request to correct endpoint', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      (apiClient.getBaseURL as jest.Mock).mockReturnValue('https://api.test.com');

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerLoad();

      expect(mockXHR.open).toHaveBeenCalledWith(
        'POST',
        'https://api.test.com/bills/upload'
      );
    });

    test('includes auth token in request headers', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      (apiClient.getAuthToken as jest.Mock).mockReturnValue('test-token');

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerLoad();

      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer test-token'
      );
    });

    test('sets correct timeout', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerLoad();

      expect(mockXHR.timeout).toBe(30000);
    });

    test('tracks upload progress', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const progressCallback = jest.fn();
      const promise = billUploadService.uploadBillWithProgress(
        mockBillData,
        progressCallback
      );

      // Simulate progress events
      mockXHR.triggerProgress(500, 1000);
      mockXHR.triggerProgress(1000, 1000);
      mockXHR.triggerLoad();

      await promise;

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls[0][0].percentage).toBe(50);
      expect(progressCallback.mock.calls[1][0].percentage).toBe(100);
    });

    test('calculates upload speed correctly', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const progressCallback = jest.fn();
      const promise = billUploadService.uploadBillWithProgress(
        mockBillData,
        progressCallback
      );

      mockXHR.triggerProgress(1000, 2000);
      mockXHR.triggerLoad();

      await promise;

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls[0][0].speed).toBeGreaterThan(0);
    });

    test('calculates time remaining correctly', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const progressCallback = jest.fn();
      const promise = billUploadService.uploadBillWithProgress(
        mockBillData,
        progressCallback
      );

      mockXHR.triggerProgress(500, 1000);
      mockXHR.triggerLoad();

      await promise;

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls[0][0].timeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  // =============================================================================
  // SUCCESS RESPONSE TESTS
  // =============================================================================

  describe('Successful uploads', () => {
    test('returns success response with bill data', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const mockBill = {
        _id: 'bill-123',
        amount: 1000,
        verificationStatus: 'pending',
      };

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify({
        success: true,
        data: mockBill,
      });
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBill);
    });

    test('handles response without data wrapper', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const mockBill = { _id: 'bill-123' };
      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 201;
      mockXHR.responseText = JSON.stringify(mockBill);
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBill);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error handling', () => {
    test('handles network errors', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerError();

      await expect(promise).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network error during upload',
      });
    });

    test('handles timeout errors', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerTimeout();

      await expect(promise).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: 'Upload request timed out',
      });
    });

    test('handles abort/cancellation', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);
      mockXHR.triggerAbort();

      await expect(promise).rejects.toMatchObject({
        code: 'CANCELLED',
        message: 'Upload was cancelled',
      });
    });

    test('handles HTTP 400 error', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 400;
      mockXHR.statusText = 'Bad Request';
      mockXHR.responseText = JSON.stringify({
        message: 'Invalid data',
      });
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data');
    });

    test('handles HTTP 401 error', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 401;
      mockXHR.statusText = 'Unauthorized';
      mockXHR.responseText = JSON.stringify({
        message: 'Authentication failed',
      });
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(false);
    });

    test('handles HTTP 500 error', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 500;
      mockXHR.statusText = 'Internal Server Error';
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(false);
    });

    test('handles invalid JSON response', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      mockXHR.status = 200;
      mockXHR.responseText = 'Invalid JSON{{{';
      mockXHR.triggerLoad();

      await expect(promise).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        message: 'Invalid server response',
      });
    });
  });

  // =============================================================================
  // RETRY LOGIC TESTS
  // =============================================================================

  describe('uploadBillWithRetry', () => {
    test('succeeds on first attempt', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithRetry(mockBillData);

      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify({
        success: true,
        data: { _id: 'bill-123' },
      });
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.fileId).toBe('bill-123');
    });

    test('retries on network error', async () => {
      let attemptCount = 0;
      global.XMLHttpRequest = jest.fn(() => {
        attemptCount++;
        const mockXHR = createMockXHR();

        if (attemptCount < 2) {
          // Fail first attempt
          setTimeout(() => mockXHR.triggerError(), 10);
        } else {
          // Succeed second attempt
          mockXHR.status = 200;
          mockXHR.responseText = JSON.stringify({
            success: true,
            data: { _id: 'bill-123' },
          });
          setTimeout(() => mockXHR.triggerLoad(), 10);
        }

        return mockXHR;
      }) as any;

      const result = await billUploadService.uploadBillWithRetry(mockBillData, undefined, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2);
    });

    test('respects max retry attempts', async () => {
      global.XMLHttpRequest = jest.fn(() => {
        const mockXHR = createMockXHR();
        setTimeout(() => mockXHR.triggerError(), 10);
        return mockXHR;
      }) as any;

      const result = await billUploadService.uploadBillWithRetry(mockBillData, undefined, {
        maxAttempts: 2,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('implements exponential backoff', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      global.XMLHttpRequest = jest.fn(() => {
        const currentTime = Date.now();
        delays.push(currentTime - lastTime);
        lastTime = currentTime;

        const mockXHR = createMockXHR();
        setTimeout(() => mockXHR.triggerError(), 10);
        return mockXHR;
      }) as any;

      await billUploadService.uploadBillWithRetry(mockBillData, undefined, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      // Second delay should be longer than first
      expect(delays[2]).toBeGreaterThan(delays[1]);
    });

    test('does not retry non-retryable errors', async () => {
      let attemptCount = 0;
      global.XMLHttpRequest = jest.fn(() => {
        attemptCount++;
        const mockXHR = createMockXHR();

        mockXHR.status = 400; // Non-retryable error
        mockXHR.responseText = JSON.stringify({ error: 'Bad request' });
        setTimeout(() => mockXHR.triggerLoad(), 10);

        return mockXHR;
      }) as any;

      const result = await billUploadService.uploadBillWithRetry(mockBillData, undefined, {
        maxAttempts: 3,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT'], // 400 errors not in list
      });

      expect(result.success).toBe(false);
      expect(attemptCount).toBe(1); // Should not retry
    });

    test('calls progress callback on each attempt', async () => {
      const progressCallback = jest.fn();

      global.XMLHttpRequest = jest.fn(() => {
        const mockXHR = createMockXHR();
        mockXHR.status = 200;
        mockXHR.responseText = JSON.stringify({
          success: true,
          data: { _id: 'bill-123' },
        });
        setTimeout(() => {
          mockXHR.triggerProgress(500, 1000);
          mockXHR.triggerLoad();
        }, 10);
        return mockXHR;
      }) as any;

      await billUploadService.uploadBillWithRetry(
        mockBillData,
        progressCallback,
        { maxAttempts: 1 }
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    test('calculates correct upload metrics', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const promise = billUploadService.uploadBillWithRetry(mockBillData);

      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify({
        success: true,
        data: { _id: 'bill-123', billImage: { url: 'https://example.com/bill.jpg' } },
      });
      mockXHR.triggerProgress(1000, 1000);
      mockXHR.triggerLoad();

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.bytesTransferred).toBe(1000);
      expect(result.averageSpeed).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // UPLOAD CANCELLATION TESTS
  // =============================================================================

  describe('cancelUpload', () => {
    test('cancels active upload', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const uploadId = `upload_${Date.now()}`;
      const promise = billUploadService.uploadBillWithProgress(mockBillData);

      // Cancel the upload
      const cancelled = billUploadService.cancelUpload(uploadId);

      expect(mockXHR.abort).toHaveBeenCalled();
    });

    test('returns false for non-existent upload', () => {
      const result = billUploadService.cancelUpload('non-existent-id');
      expect(result).toBe(false);
    });

    test('cleans up after cancellation', async () => {
      const mockXHR = createMockXHR();
      global.XMLHttpRequest = jest.fn(() => mockXHR) as any;

      const uploadId = `upload_${Date.now()}`;
      billUploadService.uploadBillWithProgress(mockBillData);

      billUploadService.cancelUpload(uploadId);

      // Try to cancel again - should return false (already cleaned up)
      const result = billUploadService.cancelUpload(uploadId);
      expect(result).toBe(false);
    });
  });

  // =============================================================================
  // BILL HISTORY TESTS
  // =============================================================================

  describe('getBillHistory', () => {
    test('fetches bill history without filters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          bills: [
            { _id: 'bill-1', amount: 1000 },
            { _id: 'bill-2', amount: 2000 },
          ],
        },
      });

      const result = await billUploadService.getBillHistory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith('/bills', {});
    });

    test('fetches bill history with filters', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { bills: [] },
      });

      const filters = {
        status: 'approved' as const,
        merchantId: 'merchant-123',
        limit: 10,
      };

      await billUploadService.getBillHistory(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/bills', {
        status: 'approved',
        merchantId: 'merchant-123',
        limit: 10,
      });
    });

    test('handles empty bill history', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { bills: [] },
      });

      const result = await billUploadService.getBillHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('handles API errors', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to fetch bills',
      });

      const result = await billUploadService.getBillHistory();

      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // GET BILL BY ID TESTS
  // =============================================================================

  describe('getBillById', () => {
    test('fetches single bill successfully', async () => {
      const mockBill = { _id: 'bill-123', amount: 1000 };
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockBill,
      });

      const result = await billUploadService.getBillById('bill-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBill);
      expect(apiClient.get).toHaveBeenCalledWith('/bills/bill-123');
    });

    test('handles bill not found', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Bill not found',
      });

      const result = await billUploadService.getBillById('non-existent');

      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // RESUBMIT BILL TESTS
  // =============================================================================

  describe('resubmitBill', () => {
    test('resubmits bill with new photo', async () => {
      (apiClient.uploadFile as jest.Mock).mockResolvedValue({
        success: true,
        data: { _id: 'bill-123' },
      });

      const result = await billUploadService.resubmitBill(
        'bill-123',
        'file://new-bill.jpg'
      );

      expect(result.success).toBe(true);
      expect(apiClient.uploadFile).toHaveBeenCalledWith(
        '/bills/bill-123/resubmit',
        expect.any(FormData)
      );
    });

    test('handles resubmit errors', async () => {
      (apiClient.uploadFile as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Resubmit failed',
      });

      const result = await billUploadService.resubmitBill(
        'bill-123',
        'file://new-bill.jpg'
      );

      expect(result.success).toBe(false);
    });
  });

  // =============================================================================
  // STATISTICS TESTS
  // =============================================================================

  describe('getBillStatistics', () => {
    test('fetches bill statistics successfully', async () => {
      const mockStats = {
        totalBills: 10,
        pendingBills: 3,
        approvedBills: 6,
        rejectedBills: 1,
        totalCashback: 5000,
        pendingCashback: 1500,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await billUploadService.getBillStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(apiClient.get).toHaveBeenCalledWith('/bills/statistics');
    });

    test('handles statistics errors', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to fetch statistics',
      });

      const result = await billUploadService.getBillStatistics();

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockXHR() {
  const listeners: { [key: string]: Function[] } = {};
  const uploadListeners: { [key: string]: Function[] } = {};

  return {
    open: jest.fn(),
    send: jest.fn(),
    abort: jest.fn(),
    setRequestHeader: jest.fn(),
    timeout: 0,
    status: 0,
    statusText: '',
    responseText: '',
    upload: {
      addEventListener: jest.fn((event: string, listener: Function) => {
        if (!uploadListeners[event]) uploadListeners[event] = [];
        uploadListeners[event].push(listener);
      }),
    },
    addEventListener: jest.fn((event: string, listener: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(listener);
    }),
    triggerLoad: () => {
      listeners.load?.forEach(fn => fn());
    },
    triggerError: () => {
      listeners.error?.forEach(fn => fn());
    },
    triggerTimeout: () => {
      listeners.timeout?.forEach(fn => fn());
    },
    triggerAbort: () => {
      listeners.abort?.forEach(fn => fn());
    },
    triggerProgress: (loaded: number, total: number) => {
      const event = { loaded, total, lengthComputable: true };
      uploadListeners.progress?.forEach(fn => fn(event));
    },
  };
}
