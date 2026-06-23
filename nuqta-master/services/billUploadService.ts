// Bill Upload Service
// Handles all bill upload and verification API calls with progress tracking and retry mechanism

import apiClient, { ApiResponse } from './apiClient';

// Dev-only logger to prevent string accumulation in production
const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};
import { Platform } from 'react-native';
import {
  OCRExtractedData,
  BillVerificationResult,
  FraudDetectionResult,
  CashbackCalculation,
} from '@/types/billVerification.types';
import {
  UploadProgress,
  UploadError,
  UploadErrorCode,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  UploadResult,
  UploadOptions,
  DEFAULT_UPLOAD_OPTIONS,
} from '@/types/upload.types';
import { API_CONFIG } from '@/config/env';

export interface BillUploadData {
  billImage: string; // Local file URI
  merchantId: string;
  amount: number;
  billDate: Date;
  billNumber?: string;
  notes?: string;
  // Enhanced fields for verification
  ocrData?: OCRExtractedData;
  verificationResult?: BillVerificationResult;
  fraudCheck?: FraudDetectionResult;
  cashbackCalculation?: CashbackCalculation;
}

export interface Bill {
  _id: string;
  user: string;
  merchant: {
    _id: string;
    name: string;
    logo?: string;
  };
  billImage: {
    url: string;
    thumbnailUrl?: string;
    cloudinaryId: string;
  };
  extractedData?: {
    merchantName?: string;
    amount?: number;
    date?: string;
    billNumber?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  amount: number;
  billDate: string;
  billNumber?: string;
  notes?: string;
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  verificationMethod?: 'automatic' | 'manual';
  rejectionReason?: string;
  cashbackAmount?: number;
  cashbackStatus?: 'pending' | 'credited' | 'failed';
  metadata?: {
    ocrConfidence?: number;
    processingTime?: number;
    verifiedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BillHistoryFilters {
  status?: 'pending' | 'processing' | 'approved' | 'rejected';
  startDate?: Date;
  endDate?: Date;
  merchantId?: string;
  limit?: number;
  page?: number;
}

class BillUploadService {
  private activeUploads: Map<string, XMLHttpRequest> = new Map();
  private uploadSpeeds: Map<string, number[]> = new Map();

  /**
   * Calculate upload speed and time remaining
   */
  private calculateUploadMetrics(
    uploadId: string,
    loaded: number,
    total: number,
    startTime: number
  ): { speed: number; timeRemaining: number } {
    const currentTime = Date.now();
    const elapsed = (currentTime - startTime) / 1000; // seconds

    // Calculate current speed
    const currentSpeed = elapsed > 0 ? loaded / elapsed : 0;

    // Store speed sample for averaging
    const speeds = this.uploadSpeeds.get(uploadId) || [];
    speeds.push(currentSpeed);

    // Keep only last 5 samples
    if (speeds.length > 5) {
      speeds.shift();
    }
    this.uploadSpeeds.set(uploadId, speeds);

    // Calculate average speed
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Calculate time remaining
    const remaining = total - loaded;
    const timeRemaining = avgSpeed > 0 ? remaining / avgSpeed : 0;

    return {
      speed: Math.round(avgSpeed),
      timeRemaining: Math.round(timeRemaining),
    };
  }

  /**
   * Upload bill with progress tracking using XMLHttpRequest
   */
  async uploadBillWithProgress(
    data: BillUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<Bill>> {
    const uploadId = `upload_${Date.now()}`;
    const startTime = Date.now();

    try {
      devLog.log('📤 [BILL UPLOAD] Starting upload with progress tracking...');

      // Create FormData
      const formData = await this.createFormData(data);

      // Create upload promise with XMLHttpRequest for progress tracking
      return await new Promise<ApiResponse<Bill>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        this.activeUploads.set(uploadId, xhr);

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const { speed, timeRemaining } = this.calculateUploadMetrics(
              uploadId,
              event.loaded,
              event.total,
              startTime
            );

            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
              speed,
              timeRemaining,
              startTime,
              currentTime: Date.now(),
            };

            devLog.log(`📊 [BILL UPLOAD] Progress: ${progress.percentage}% (${this.formatSpeed(speed)})`);
            onProgress(progress);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          this.activeUploads.delete(uploadId);
          this.uploadSpeeds.delete(uploadId);

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              devLog.log('✅ [BILL UPLOAD] Upload completed successfully');
              resolve({
                success: true,
                data: response.data || response,
                message: response.message,
              });
            } catch (err) {
              devLog.error('❌ [BILL UPLOAD] Failed to parse response:', err);
              reject(this.createUploadError(UploadErrorCode.SERVER_ERROR, 'Invalid server response'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              devLog.error('❌ [BILL UPLOAD] Upload failed:', errorResponse);
              resolve({
                success: false,
                error: errorResponse.message || `HTTP ${xhr.status}: ${xhr.statusText}`,
              });
            } catch (err) {
              resolve({
                success: false,
                error: `HTTP ${xhr.status}: ${xhr.statusText}`,
              });
            }
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          this.activeUploads.delete(uploadId);
          this.uploadSpeeds.delete(uploadId);
          devLog.error('❌ [BILL UPLOAD] Network error occurred');
          reject(this.createUploadError(UploadErrorCode.NETWORK_ERROR, 'Network error during upload'));
        });

        // Handle timeout
        xhr.addEventListener('timeout', () => {
          this.activeUploads.delete(uploadId);
          this.uploadSpeeds.delete(uploadId);
          devLog.error('❌ [BILL UPLOAD] Upload timeout');
          reject(this.createUploadError(UploadErrorCode.TIMEOUT, 'Upload request timed out'));
        });

        // Handle abort
        xhr.addEventListener('abort', () => {
          this.activeUploads.delete(uploadId);
          this.uploadSpeeds.delete(uploadId);
          devLog.log('⚠️ [BILL UPLOAD] Upload cancelled');
          reject(this.createUploadError(UploadErrorCode.CANCELLED, 'Upload was cancelled'));
        });

        // Setup request
        const url = `${apiClient.getBaseURL()}/bills/upload`;
        xhr.open('POST', url);

        // Use configurable timeout from DEFAULT_UPLOAD_OPTIONS or API_CONFIG
        xhr.timeout = DEFAULT_UPLOAD_OPTIONS.timeout || API_CONFIG.timeout;

        // Add auth header if available
        const token = apiClient.getAuthToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        // Send request
        devLog.log('🚀 [BILL UPLOAD] Sending request to:', url);
        xhr.send(formData);
      });
    } catch (error) {
      this.activeUploads.delete(uploadId);
      this.uploadSpeeds.delete(uploadId);
      devLog.error('❌ [BILL UPLOAD] Exception:', error);

      if (error && typeof error === 'object' && 'code' in error) {
        return {
          success: false,
          error: (error as UploadError).message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload bill',
      };
    }
  }

  /**
   * Upload bill with automatic retry on failure
   */
  async uploadBillWithRetry(
    data: BillUploadData,
    onProgress?: (progress: UploadProgress) => void,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<UploadResult> {
    const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    const startTime = Date.now();
    let lastError: UploadError | undefined;
    let totalBytesTransferred = 0;

    devLog.log('🔄 [BILL UPLOAD] Starting upload with retry (max attempts:', config.maxAttempts, ')');

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        devLog.log(`📤 [BILL UPLOAD] Attempt ${attempt}/${config.maxAttempts}`);

        const result = await this.uploadBillWithProgress(data, (progress) => {
          totalBytesTransferred = progress.loaded;
          onProgress?.(progress);
        });

        if (result.success && result.data) {
          const duration = Date.now() - startTime;
          const avgSpeed = duration > 0 ? (totalBytesTransferred / duration) * 1000 : 0;

          devLog.log('✅ [BILL UPLOAD] Upload successful after', attempt, 'attempt(s)');

          return {
            success: true,
            metadata: {
              fileId: result.data._id,
              fileName: data.billImage.split('/').pop() || 'bill.jpg',
              fileSize: totalBytesTransferred,
              fileType: 'image/jpeg',
              uploadUrl: result.data.billImage.url,
              thumbnailUrl: result.data.billImage.thumbnailUrl,
            },
            duration,
            bytesTransferred: totalBytesTransferred,
            averageSpeed: Math.round(avgSpeed),
          };
        }

        // Upload failed, create error object
        lastError = this.createUploadError(
          UploadErrorCode.SERVER_ERROR,
          result.error || 'Upload failed'
        );
      } catch (error) {
        lastError = error as UploadError;
        devLog.error(`❌ [BILL UPLOAD] Attempt ${attempt} failed:`, lastError.message);
      }

      // Check if error is retryable
      if (lastError && !config.retryableErrors.includes(lastError.code)) {
        devLog.log('⚠️ [BILL UPLOAD] Error is not retryable:', lastError.code);
        break;
      }

      // Don't wait after last attempt
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        devLog.log(`⏳ [BILL UPLOAD] Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    devLog.error('❌ [BILL UPLOAD] All retry attempts failed');

    return {
      success: false,
      error: lastError || this.createUploadError(UploadErrorCode.UNKNOWN_ERROR, 'Upload failed'),
      duration,
      bytesTransferred: totalBytesTransferred,
      averageSpeed: 0,
    };
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): boolean {
    const xhr = this.activeUploads.get(uploadId);
    if (xhr) {
      xhr.abort();
      this.activeUploads.delete(uploadId);
      this.uploadSpeeds.delete(uploadId);
      devLog.log('🛑 [BILL UPLOAD] Upload cancelled:', uploadId);
      return true;
    }
    return false;
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(filename: string): { isValid: boolean; extension?: string; error?: string } {
    const match = /\.(\w+)$/.exec(filename.toLowerCase());
    if (!match) {
      return {
        isValid: false,
        error: 'File must have a valid extension',
      };
    }

    const extension = match[1];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'heic'];

    if (!allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        extension,
        error: `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed`,
      };
    }

    return { isValid: true, extension };
  }

  /**
   * Create FormData from BillUploadData
   */
  private async createFormData(data: BillUploadData): Promise<FormData> {
    const formData = new FormData();

    // Add image file
    const imageUri = data.billImage;
    const filename = imageUri.split('/').pop() || 'bill.jpg';

    // Validate file extension
    const validation = this.validateFileExtension(filename);
    if (!validation.isValid) {
      devLog.error('❌ [BILL UPLOAD] Invalid file extension:', validation.error);
      throw this.createUploadError(
        UploadErrorCode.INVALID_FILE_TYPE,
        validation.error || 'Invalid file type',
        false
      );
    }

    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // For web
    if (Platform.OS === 'web') {
      try {
        devLog.log('🌐 [BILL UPLOAD] Fetching image blob for web upload...');
        const response = await fetch(imageUri);

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        devLog.log('✅ [BILL UPLOAD] Image blob fetched successfully:', blob.size, 'bytes');
        formData.append('billImage', blob, filename);
      } catch (error) {
        devLog.error('❌ [BILL UPLOAD] Failed to fetch image blob:', error);
        throw this.createUploadError(
          UploadErrorCode.FILE_NOT_FOUND,
          error instanceof Error ? error.message : 'Failed to load image file',
          false
        );
      }
    } else {
      // For mobile (React Native)
      formData.append('billImage', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }

    // Add basic fields
    formData.append('merchantId', data.merchantId);
    formData.append('amount', data.amount.toString());
    formData.append('billDate', data.billDate.toISOString());

    if (data.billNumber) {
      formData.append('billNumber', data.billNumber);
    }

    if (data.notes) {
      formData.append('notes', data.notes);
    }

    // Add verification metadata if available
    if (data.ocrData) {
      formData.append('ocrData', JSON.stringify(data.ocrData));
    }

    if (data.verificationResult) {
      formData.append('verificationResult', JSON.stringify(data.verificationResult));
    }

    if (data.fraudCheck) {
      formData.append('fraudCheck', JSON.stringify(data.fraudCheck));
    }

    if (data.cashbackCalculation) {
      formData.append('cashbackCalculation', JSON.stringify(data.cashbackCalculation));
    }

    return formData;
  }

  /**
   * Create standardized upload error
   */
  private createUploadError(code: UploadErrorCode, message: string, retryable: boolean = true): UploadError {
    return {
      code,
      message,
      retryable,
      timestamp: Date.now(),
    };
  }

  /**
   * Format speed for display (e.g., "1.5 MB/s")
   */
  private formatSpeed(bytesPerSecond: number): string {
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
   * Upload a bill with photo (Legacy method - maintained for backward compatibility)
   */
  async uploadBill(data: BillUploadData): Promise<ApiResponse<Bill>> {
    return this.uploadBillWithProgress(data);
  }

  /**
   * Get bill history with optional filters
   */
  async getBillHistory(filters?: BillHistoryFilters): Promise<ApiResponse<Bill[]>> {
    try {

      if (filters) {

      }

      const params: Record<string, any> = {};

      if (filters) {
        if (filters.status) params.status = filters.status;
        if (filters.merchantId) params.merchantId = filters.merchantId;
        if (filters.startDate) params.startDate = filters.startDate.toISOString();
        if (filters.endDate) params.endDate = filters.endDate.toISOString();
        if (filters.limit) params.limit = filters.limit;
        if (filters.page) params.page = filters.page;
      }

      const response = await apiClient.get<{ bills: Bill[]; pagination: any; stats?: any }>('/bills', params);

      // Extract bills from the nested response
      if (response.success && response.data) {
        const bills = response.data.bills || [];
        const pagination = response.data.pagination;
        const stats = response.data.stats;

        return {
          ...response,
          data: { bills, pagination, stats } as any
        };
      } else {
        return response as any;
      }
    } catch (error) {
      devLog.error('❌ [BILL HISTORY] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bill history',
      };
    }
  }

  /**
   * Get a single bill by ID
   */
  async getBillById(billId: string): Promise<ApiResponse<Bill>> {
    try {
      devLog.log('📋 [BILL DETAIL] Fetching bill:', billId);
      const response = await apiClient.get<Bill>(`/bills/${billId}`);

      if (response.success && response.data) {
        devLog.log('✅ [BILL DETAIL] Bill fetched successfully:', {
          billId: response.data._id,
          merchant: response.data.merchant.name,
          amount: response.data.amount,
          status: response.data.verificationStatus,
        });
        return response;
      } else {
        devLog.error('❌ [BILL DETAIL] Failed:', response.error);
        return response;
      }
    } catch (error) {
      devLog.error('❌ [BILL DETAIL] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bill',
      };
    }
  }

  /**
   * Resubmit a rejected bill with new photo
   */
  async resubmitBill(billId: string, newPhoto: string): Promise<ApiResponse<Bill>> {
    try {
      devLog.log('🔄 [BILL RESUBMIT] Resubmitting bill:', billId);

      // Create FormData for file upload
      const formData = new FormData();

      // Add image file
      const imageUri = newPhoto;
      const filename = imageUri.split('/').pop() || 'bill.jpg';

      // Validate file extension
      const validation = this.validateFileExtension(filename);
      if (!validation.isValid) {
        devLog.error('❌ [BILL RESUBMIT] Invalid file extension:', validation.error);
        return {
          success: false,
          error: validation.error || 'Invalid file type',
        };
      }

      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // For web
      if (Platform.OS === 'web') {
        try {
          devLog.log('🌐 [BILL RESUBMIT] Fetching image blob for web upload...');
          const fetchResponse = await fetch(imageUri);

          if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch image: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }

          const blob = await fetchResponse.blob();
          devLog.log('✅ [BILL RESUBMIT] Image blob fetched successfully:', blob.size, 'bytes');
          formData.append('billImage', blob, filename);
        } catch (error) {
          devLog.error('❌ [BILL RESUBMIT] Failed to fetch image blob:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load image file',
          };
        }
      } else {
        // For mobile (React Native)
        formData.append('billImage', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const response = await apiClient.uploadFile<Bill>(`/bills/${billId}/resubmit`, formData);

      if (response.success && response.data) {
        devLog.log('✅ [BILL RESUBMIT] Bill resubmitted successfully:', {
          billId: response.data._id,
          status: response.data.verificationStatus,
        });
        return response;
      } else {
        devLog.error('❌ [BILL RESUBMIT] Failed:', response.error);
        return response;
      }
    } catch (error) {
      devLog.error('❌ [BILL RESUBMIT] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resubmit bill',
      };
    }
  }

  /**
   * Get bill statistics
   */
  async getBillStatistics(): Promise<ApiResponse<{
    totalBills: number;
    pendingBills: number;
    approvedBills: number;
    rejectedBills: number;
    totalCashback: number;
    pendingCashback: number;
  }>> {
    try {
      devLog.log('📊 [BILL STATS] Fetching bill statistics...');

      const response = await apiClient.get<{
        totalBills: number;
        pendingBills: number;
        approvedBills: number;
        rejectedBills: number;
        totalCashback: number;
        pendingCashback: number;
      }>('/bills/statistics');

      if (response.success && response.data) {
        devLog.log('✅ [BILL STATS] Statistics fetched successfully:', {
          totalBills: response.data.totalBills,
          pendingBills: response.data.pendingBills,
          approvedBills: response.data.approvedBills,
          rejectedBills: response.data.rejectedBills,
          totalCashback: response.data.totalCashback,
          pendingCashback: response.data.pendingCashback,
        });
        return response;
      } else {
        devLog.error('❌ [BILL STATS] Failed:', response.error);
        return response;
      }
    } catch (error) {
      devLog.error('❌ [BILL STATS] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      };
    }
  }
}

// Create singleton instance
export const billUploadService = new BillUploadService();

export default billUploadService;
