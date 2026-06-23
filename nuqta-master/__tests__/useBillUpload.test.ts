/**
 * useBillUpload Hook Tests
 *
 * Comprehensive test suite for the useBillUpload hook.
 * Tests state management, upload flow, retry logic,
 * form persistence, and error handling.
 *
 * @coverage 85%+ target
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBillUpload } from '@/hooks/useBillUpload';
import { billUploadService, BillUploadData } from '@/services/billUploadService';

// Mocks
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/services/billUploadService');

describe('useBillUpload', () => {
  const mockBillData: BillUploadData = {
    billImage: 'file://test-bill.jpg',
    merchantId: 'merchant-123',
    amount: 1000,
    billDate: new Date('2024-01-15'),
    billNumber: 'INV-001',
    notes: 'Test bill',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  // =============================================================================
  // INITIALIZATION TESTS
  // =============================================================================

  describe('Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useBillUpload());

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadState).toBe('idle');
      expect(result.current.progress).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAttempt).toBe(0);
    });

    test('loads saved form data on mount', async () => {
      const savedData = {
        billImage: 'file://saved.jpg',
        merchantId: 'merchant-123',
        amount: '500',
        billDate: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useBillUpload());

      await waitFor(() => {
        expect(result.current.formData).toBeDefined();
        expect(result.current.formData?.amount).toBe('500');
      });
    });

    test('handles missing saved form data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useBillUpload());

      await waitFor(() => {
        expect(result.current.formData).toBeNull();
      });
    });

    test('initializes with custom retry config', () => {
      const customConfig = {
        maxAttempts: 5,
        initialDelay: 2000,
      };

      const { result } = renderHook(() => useBillUpload(customConfig));

      expect(result.current.maxAttempts).toBe(5);
    });
  });

  // =============================================================================
  // UPLOAD FLOW TESTS
  // =============================================================================

  describe('Upload Flow', () => {
    test('starts upload successfully', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: true,
        metadata: { fileId: 'bill-123' },
      });

      const { result } = renderHook(() => useBillUpload());

      act(() => {
        result.current.startUpload(mockBillData);
      });

      expect(result.current.isUploading).toBe(true);
      expect(result.current.uploadState).toBe('uploading');

      await waitFor(() => {
        expect(result.current.uploadState).toBe('completed');
        expect(result.current.isUploading).toBe(false);
      });
    });

    test('sets uploading state during upload', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const { result } = renderHook(() => useBillUpload());

      act(() => {
        result.current.startUpload(mockBillData);
      });

      expect(result.current.isUploading).toBe(true);
      expect(result.current.uploadState).toBe('uploading');
    });

    test('tracks upload progress', async () => {
      const progressUpdates: any[] = [];

      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        async (data, onProgress) => {
          onProgress({ percentage: 25, loaded: 250, total: 1000, speed: 100, timeRemaining: 7.5 });
          onProgress({ percentage: 50, loaded: 500, total: 1000, speed: 100, timeRemaining: 5 });
          onProgress({ percentage: 100, loaded: 1000, total: 1000, speed: 100, timeRemaining: 0 });
          return { success: true };
        }
      );

      const { result } = renderHook(() => useBillUpload());

      act(() => {
        result.current.startUpload(mockBillData);
      });

      await waitFor(() => {
        expect(result.current.percentComplete).toBe(100);
      });
    });

    test('stores upload data for retry', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      // Data should be stored for retry
      expect(result.current.canRetry).toBe(true);
    });

    test('clears form data on successful upload', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      await waitFor(() => {
        expect(AsyncStorage.removeItem).toHaveBeenCalled();
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    test('handles upload failure', async () => {
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        retryable: true,
        timestamp: Date.now(),
      };

      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.uploadState).toBe('failed');
      expect(result.current.error).toMatchObject(mockError);
    });

    test('handles exception during upload', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.uploadState).toBe('failed');
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Unexpected error');
    });

    test('saves upload state on failure', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Server error', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('sets canRetry correctly for retryable errors', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Network error', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.canRetry).toBe(true);
    });

    test('sets canRetry to false for non-retryable errors', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Invalid format', retryable: false },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.canRetry).toBe(false);
    });
  });

  // =============================================================================
  // RETRY LOGIC TESTS
  // =============================================================================

  describe('Retry Logic', () => {
    test('retries failed upload', async () => {
      let attemptCount = 0;

      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          return {
            success: false,
            error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
          };
        }
        return { success: true };
      });

      const { result } = renderHook(() => useBillUpload());

      // First attempt fails
      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.canRetry).toBe(true);

      // Retry
      await act(async () => {
        await result.current.retryUpload();
      });

      expect(result.current.uploadState).toBe('completed');
      expect(attemptCount).toBe(2);
    });

    test('increments attempt counter on retry', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      const initialAttempt = result.current.currentAttempt;

      await act(async () => {
        await result.current.retryUpload();
      });

      expect(result.current.currentAttempt).toBe(initialAttempt + 1);
    });

    test('respects max retry attempts', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload({ maxAttempts: 2 }));

      // First attempt
      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      // Retry once
      await act(async () => {
        await result.current.retryUpload();
      });

      // Should not be able to retry again
      expect(result.current.canRetry).toBe(false);
    });

    test('returns false when retrying without previous upload data', async () => {
      const { result } = renderHook(() => useBillUpload());

      const success = await act(async () => {
        return await result.current.retryUpload();
      });

      expect(success).toBe(false);
    });

    test('clears error before retrying', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.error).toBeDefined();

      await act(async () => {
        result.current.retryUpload();
      });

      // Error should be cleared when retrying
      // (will be set again if retry fails)
    });
  });

  // =============================================================================
  // UPLOAD CANCELLATION TESTS
  // =============================================================================

  describe('Upload Cancellation', () => {
    test('cancels active upload', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );

      const { result } = renderHook(() => useBillUpload());

      act(() => {
        result.current.startUpload(mockBillData);
      });

      expect(result.current.isUploading).toBe(true);

      act(() => {
        result.current.cancelUpload();
      });

      expect(billUploadService.cancelUpload).toHaveBeenCalled();
      expect(result.current.uploadState).toBe('cancelled');
      expect(result.current.isUploading).toBe(false);
    });

    test('sets cancel error when cancelling', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useBillUpload());

      // Start an upload (never-resolving promise) and cancel inside a single
      // async act() so React has flushed the `setIsUploading(true)` state
      // before cancelUpload() runs.
      await act(async () => {
        result.current.startUpload(mockBillData);
        // Yield to React so the state update from setIsUploading(true) is
        // committed before we cancel.
        await Promise.resolve();
        result.current.cancelUpload();
      });

      expect(result.current.error).toMatchObject({
        code: 'CANCELLED',
        message: 'Upload was cancelled by user',
      });
    });

    test('does nothing when cancelling without active upload', () => {
      const { result } = renderHook(() => useBillUpload());

      act(() => {
        result.current.cancelUpload();
      });

      expect(billUploadService.cancelUpload).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // FORM PERSISTENCE TESTS
  // =============================================================================

  describe('Form Persistence', () => {
    test('saves form data to AsyncStorage', async () => {
      const { result } = renderHook(() => useBillUpload());

      const formData = {
        billImage: 'file://test.jpg',
        merchantId: 'merchant-123',
        amount: '1000',
        billDate: new Date(),
        billNumber: 'INV-001',
        notes: 'Test',
      };

      await act(async () => {
        await result.current.saveFormData(formData);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bill_upload_form_data',
        expect.any(String)
      );
    });

    test('loads form data from AsyncStorage', async () => {
      const savedData = {
        billImage: 'file://test.jpg',
        amount: '1000',
        billDate: new Date().toISOString(),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useBillUpload());

      const formData = await act(async () => {
        return await result.current.loadFormData();
      });

      expect(formData).toBeDefined();
      expect(formData?.amount).toBe('1000');
    });

    test('converts date string to Date object when loading', async () => {
      const dateString = new Date().toISOString();
      const savedData = {
        billImage: 'file://test.jpg',
        amount: '1000',
        billDate: dateString,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useBillUpload());

      const formData = await act(async () => {
        return await result.current.loadFormData();
      });

      expect(formData?.billDate).toBeInstanceOf(Date);
    });

    test('clears form data from AsyncStorage', async () => {
      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.clearFormData();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@bill_upload_form_data');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@bill_upload_state');
    });

    test('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useBillUpload());

      // Should not throw
      await act(async () => {
        await result.current.saveFormData({
          billImage: 'file://test.jpg',
          merchantId: 'merchant-123',
          amount: '1000',
          billDate: new Date(),
        });
      });
    });
  });

  // =============================================================================
  // UPLOAD METRICS TESTS
  // =============================================================================

  describe('Upload Metrics', () => {
    test('calculates upload speed correctly', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        async (data, onProgress) => {
          onProgress({ percentage: 50, loaded: 500, total: 1000, speed: 102400, timeRemaining: 5 });
          return { success: true };
        }
      );

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.uploadSpeed).toContain('KB/s');
    });

    test('calculates time remaining correctly', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        async (data, onProgress) => {
          onProgress({ percentage: 50, loaded: 500, total: 1000, speed: 100, timeRemaining: 65 });
          return { success: true };
        }
      );

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.timeRemaining).toMatch(/\d+:\d{2}/);
    });

    test('tracks percentage complete', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        async (data, onProgress) => {
          onProgress({ percentage: 75, loaded: 750, total: 1000, speed: 100, timeRemaining: 2.5 });
          return { success: true };
        }
      );

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.percentComplete).toBe(75);
    });

    test('shows 0% when no progress', () => {
      const { result } = renderHook(() => useBillUpload());

      expect(result.current.percentComplete).toBe(0);
    });
  });

  // =============================================================================
  // RESET FUNCTIONALITY TESTS
  // =============================================================================

  describe('Reset Functionality', () => {
    test('resets all state', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      // Upload and fail
      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadState).toBe('idle');
      expect(result.current.progress).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAttempt).toBe(0);
    });

    test('clears upload data references on reset', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      act(() => {
        result.current.reset();
      });

      // Should not be able to retry after reset
      const success = await act(async () => {
        return await result.current.retryUpload();
      });

      expect(success).toBe(false);
    });
  });

  // =============================================================================
  // STATE CONSISTENCY TESTS
  // =============================================================================

  describe('State Consistency', () => {
    test('maintains consistent state during upload', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockImplementation(
        async (data, onProgress) => {
          onProgress({ percentage: 50, loaded: 500, total: 1000, speed: 100, timeRemaining: 5 });
          return { success: true };
        }
      );

      const { result } = renderHook(() => useBillUpload());

      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      // After completion
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadState).toBe('completed');
      expect(result.current.error).toBeNull();
    });

    test('maintains canRetry state correctly', async () => {
      (billUploadService.uploadBillWithRetry as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed', retryable: true },
      });

      const { result } = renderHook(() => useBillUpload({ maxAttempts: 2 }));

      // Attempt 1
      await act(async () => {
        await result.current.startUpload(mockBillData);
      });

      expect(result.current.canRetry).toBe(true);

      // Attempt 2
      await act(async () => {
        await result.current.retryUpload();
      });

      expect(result.current.canRetry).toBe(false); // Max attempts reached
    });
  });
});
