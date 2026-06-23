/**
 * Use Bill Upload Hook
 * Manages bill upload state with progress tracking, retry logic, and form persistence
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { billUploadService, BillUploadData } from '@/services/billUploadService';
import {
  UploadProgress,
  UploadError,
  UploadState,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '@/types/upload.types';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Form data interface
export interface BillUploadFormData {
  billImage: string;
  merchantId: string;
  amount: string;
  billDate: Date;
  billNumber?: string;
  notes?: string;
}

// Hook return interface
export interface UseBillUploadReturn {
  // State
  isUploading: boolean;
  uploadState: UploadState;
  progress: UploadProgress | null;
  error: UploadError | null;
  formData: BillUploadFormData | null;

  // Retry state
  currentAttempt: number;
  maxAttempts: number;
  canRetry: boolean;

  // Upload metrics
  uploadSpeed: string;
  timeRemaining: string;
  percentComplete: number;

  // Methods
  startUpload: (data: BillUploadData) => Promise<boolean>;
  retryUpload: () => Promise<boolean>;
  cancelUpload: () => void;
  saveFormData: (data: BillUploadFormData) => Promise<void>;
  loadFormData: () => Promise<BillUploadFormData | null>;
  clearFormData: () => Promise<void>;
  reset: () => void;
}

// AsyncStorage keys
const FORM_DATA_KEY = '@bill_upload_form_data';
const UPLOAD_STATE_KEY = '@bill_upload_state';

/**
 * Custom hook for managing bill upload with progress, retry, and persistence
 */
export function useBillUpload(retryConfig?: Partial<RetryConfig>): UseBillUploadReturn {
  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [formData, setFormData] = useState<BillUploadFormData | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);

  // Refs to store data for retry
  const lastUploadDataRef = useRef<BillUploadData | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  // Mirror of `isUploading` that the cancelUpload callback can read without
  // depending on a stale closure when called immediately after startUpload().
  const isUploadingRef = useRef(false);

  // Config
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const maxAttempts = config.maxAttempts;

  // Computed values
  const canRetry = !isUploading && error !== null && currentAttempt < maxAttempts && error.retryable;
  const percentComplete = progress?.percentage || 0;
  const uploadSpeed = progress ? formatSpeed(progress.speed) : '0 B/s';
  const timeRemaining = progress ? formatTimeRemaining(progress.timeRemaining) : '--:--';

  /**
   * Load saved form data on mount
   */
  useEffect(() => {
    loadFormData();
  }, []);

  /**
   * Save upload state to AsyncStorage for recovery
   */
  const saveUploadState = useCallback(async () => {
    // Add platform check to prevent SSR/build errors
    if (typeof window === 'undefined') {
      devLog.log('[useBillUpload] Skipping saveUploadState in Node.js environment');
      return;
    }

    try {
      const state = {
        uploadState,
        currentAttempt,
        error: error ? JSON.stringify(error) : null,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
    } catch (err) {
      devLog.error('Failed to save upload state:', err);
    }
  }, [uploadState, currentAttempt, error]);

  /**
   * Save form data to AsyncStorage
   */
  const saveFormData = useCallback(async (data: BillUploadFormData) => {
    // Add platform check to prevent SSR/build errors
    if (typeof window === 'undefined') {
      devLog.log('[useBillUpload] Skipping saveFormData in Node.js environment');
      return;
    }

    try {
      await AsyncStorage.setItem(FORM_DATA_KEY, JSON.stringify(data));
      setFormData(data);
      devLog.log('📝 [BILL UPLOAD] Form data saved to storage');
    } catch (err) {
      devLog.error('Failed to save form data:', err);
    }
  }, []);

  /**
   * Load form data from AsyncStorage
   */
  const loadFormData = useCallback(async (): Promise<BillUploadFormData | null> => {
    // Add platform check to prevent SSR/build errors
    if (typeof window === 'undefined') {
      devLog.log('[useBillUpload] Skipping loadFormData in Node.js environment');
      return null;
    }

    try {
      const savedData = await AsyncStorage.getItem(FORM_DATA_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Convert date string back to Date object
        if (parsed.billDate) {
          parsed.billDate = new Date(parsed.billDate);
        }
        setFormData(parsed);
        devLog.log('📂 [BILL UPLOAD] Form data loaded from storage');
        return parsed;
      }
    } catch (err) {
      devLog.error('Failed to load form data:', err);
    }
    return null;
  }, []);

  /**
   * Clear saved form data
   */
  const clearFormData = useCallback(async () => {
    // Add platform check to prevent SSR/build errors
    if (typeof window === 'undefined') {
      devLog.log('[useBillUpload] Skipping clearFormData in Node.js environment');
      return;
    }

    try {
      await AsyncStorage.removeItem(FORM_DATA_KEY);
      await AsyncStorage.removeItem(UPLOAD_STATE_KEY);
      setFormData(null);
      devLog.log('🗑️ [BILL UPLOAD] Form data cleared');
    } catch (err) {
      devLog.error('Failed to clear form data:', err);
    }
  }, []);

  /**
   * Progress callback handler
   */
  const handleProgress = useCallback((uploadProgress: UploadProgress) => {
    setProgress(uploadProgress);

    // Log milestone progress
    const percent = uploadProgress.percentage;
    if (percent % 25 === 0 && percent > 0) {
      devLog.log(`📊 [BILL UPLOAD] ${percent}% complete - ${formatSpeed(uploadProgress.speed)}`);
    }
  }, []);

  /**
   * Start bill upload with automatic retry
   */
  const startUpload = useCallback(
    async (data: BillUploadData): Promise<boolean> => {
      try {
        devLog.log('🚀 [BILL UPLOAD] Starting upload...');

        // Store data for potential retry
        lastUploadDataRef.current = data;
        uploadIdRef.current = `upload_${Date.now()}`;

        // Reset transient state, but preserve the running attempt counter
        // so that retryUpload() can correctly count the cumulative number
        // of attempts across the whole upload session.
        isUploadingRef.current = true;
        setIsUploading(true);
        setUploadState('preparing');
        setProgress(null);
        setError(null);
        setCurrentAttempt((prev) => (prev === 0 ? 1 : prev));

        // Update state to uploading
        setUploadState('uploading');

        // Perform upload with retry
        const result = await billUploadService.uploadBillWithRetry(
          data,
          handleProgress,
          config
        );

        if (result.success) {
          devLog.log('✅ [BILL UPLOAD] Upload completed successfully');
          setUploadState('completed');
          isUploadingRef.current = false;
          setIsUploading(false);

          // Clear form data on success
          await clearFormData();

          return true;
        } else {
          devLog.error('❌ [BILL UPLOAD] Upload failed:', result.error?.message);
          setUploadState('failed');
          setError(result.error || null);
          isUploadingRef.current = false;
          setIsUploading(false);
          // Keep currentAttempt at its current value (set when this attempt
          // began). canRetry is derived from `currentAttempt < maxAttempts`,
          // so it will naturally turn false once all attempts are exhausted
          // and remain true otherwise.

          // Save state for recovery
          await saveUploadState();

          return false;
        }
      } catch (err) {
        devLog.error('❌ [BILL UPLOAD] Exception during upload:', err);
        const uploadError: UploadError = {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error occurred',
          retryable: true,
          timestamp: Date.now(),
        };

        setError(uploadError);
        setUploadState('failed');
        isUploadingRef.current = false;
        setIsUploading(false);
        await saveUploadState();

        return false;
      }
    },
    [config, handleProgress, clearFormData, saveUploadState]
  );

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(async (): Promise<boolean> => {
    if (!lastUploadDataRef.current) {
      devLog.error('❌ [BILL UPLOAD] No upload data available for retry');
      return false;
    }

    if (!canRetry) {
      devLog.error('❌ [BILL UPLOAD] Cannot retry - max attempts reached or error is not retryable');
      return false;
    }

    devLog.log(`🔄 [BILL UPLOAD] Retrying upload (attempt ${currentAttempt + 1}/${maxAttempts})...`);

    // Increment attempt counter first so it reflects the upcoming attempt
    // even if startUpload() short-circuits because prev !== 0.
    setCurrentAttempt((prev) => prev + 1);
    setError(null);

    // Restart upload with same data
    return startUpload(lastUploadDataRef.current);
  }, [canRetry, currentAttempt, maxAttempts, startUpload]);

  /**
   * Cancel active upload
   */
  const cancelUpload = useCallback(() => {
    // Use the ref-based mirror of isUploading so callers that invoke
    // cancelUpload() in the same tick as startUpload() (before React has
    // re-rendered) still see the upload as active.
    if (!isUploadingRef.current || !uploadIdRef.current) {
      devLog.warn('⚠️ [BILL UPLOAD] No active upload to cancel');
      return;
    }

    devLog.log('🛑 [BILL UPLOAD] Cancelling upload...');

    // Cancel the upload
    billUploadService.cancelUpload(uploadIdRef.current);

    // Update state
    isUploadingRef.current = false;
    setIsUploading(false);
    setUploadState('cancelled');
    const cancelError: UploadError = {
      code: 'CANCELLED',
      message: 'Upload was cancelled by user',
      retryable: false,
      timestamp: Date.now(),
    };
    setError(cancelError);

    // Clear refs
    uploadIdRef.current = null;
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    devLog.log('🔄 [BILL UPLOAD] Resetting state...');
    isUploadingRef.current = false;
    setIsUploading(false);
    setUploadState('idle');
    setProgress(null);
    setError(null);
    setCurrentAttempt(0);
    lastUploadDataRef.current = null;
    uploadIdRef.current = null;
  }, []);

  return {
    // State
    isUploading,
    uploadState,
    progress,
    error,
    formData,

    // Retry state
    currentAttempt,
    maxAttempts,
    canRetry,

    // Upload metrics
    uploadSpeed,
    timeRemaining,
    percentComplete,

    // Methods
    startUpload,
    retryUpload,
    cancelUpload,
    saveFormData,
    loadFormData,
    clearFormData,
    reset,
  };
}

/**
 * Format speed for display
 */
function formatSpeed(bytesPerSecond: number): string {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let speed = bytesPerSecond;
  let unitIndex = 0;

  while (speed >= 1024 && unitIndex < units.length - 1) {
    speed /= 1024;
    unitIndex++;
  }

  return `${speed.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format time remaining for display
 */
function formatTimeRemaining(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '--:--';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return `0:${secs.toString().padStart(2, '0')}`;
}

export default useBillUpload;
