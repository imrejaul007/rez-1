// Bill Verification Service
// Handles OCR, verification, fraud detection, and cashback calculation

import apiClient, { ApiResponse } from './apiClient';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { FILE_SIZE_LIMITS } from '@/utils/fileUploadConstants';
import {
  OCRExtractedData,
  BillVerificationResult,
  FraudDetectionResult,
  CashbackCalculation,
  MerchantMatch,
  BillImageAnalysis,
  ManualCorrectionData,
  BillVerificationWorkflow,
  BillVerificationState,
  BillUploadRequest,
  BillUploadResponse,
} from '@/types/billVerification.types';

class BillVerificationService {
  /**
   * Analyze bill image quality
   */
  async analyzeBillImage(imageUri: string): Promise<ApiResponse<BillImageAnalysis>> {
    try {

      // Get image info
      const imageInfo = await this.getImageInfo(imageUri);

      // Create FormData for analysis
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'bill.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const response = await apiClient.post<BillImageAnalysis>('/bills/analyze-image', formData);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze image',
      };
    }
  }

  /**
   * Extract text from bill using OCR
   */
  async extractBillData(imageUri: string): Promise<ApiResponse<OCRExtractedData>> {
    try {

      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'bill.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('billImage', blob, filename);
      } else {
        formData.append('billImage', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const response = await apiClient.post<OCRExtractedData>('/bills/extract-data', formData);

      if (response.success && response.data) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract bill data',
      };
    }
  }

  /**
   * Find matching merchants based on extracted data
   */
  async findMerchantMatches(
    merchantName: string,
    location?: string
  ): Promise<ApiResponse<MerchantMatch[]>> {
    try {

      // Validate input
      if (!merchantName || merchantName.trim().length < 2) {
        return {
          success: false,
          error: 'Merchant name must be at least 2 characters',
        };
      }

      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Merchant search timed out')), 30000)
      );

      // Create search promise
      const searchPromise = apiClient.post<{ matches: MerchantMatch[] }>(
        '/bills/match-merchant',
        {
          merchantName: merchantName.trim(),
          location: location?.trim(),
        }
      );

      // Race between timeout and search
      const response = await Promise.race([searchPromise, timeoutPromise]);

      if (response.success && response.data) {
        const matches = response.data.matches || [];

        // Sort by match score (highest first)
        matches.sort((a, b) => b.matchScore - a.matchScore);

        return {
          success: true,
          data: matches,
        };
      }

      // No matches found - suggest adding merchant
      return {
        success: true, // Success but empty results
        data: [],
      };
    } catch (error: any) {

      // Check if it's a timeout error
      if (error.message === 'Merchant search timed out') {
        return {
          success: false,
          error: 'Merchant search is taking too long. Please try again or enter merchant details manually.',
        };
      }

      // Check if it's a network error
      if (!error.response && error.message.includes('Network')) {
        return {
          success: false,
          error: 'Unable to search merchants. Please check your internet connection and try again.',
        };
      }

      // Backend API not available - provide fallback
      if (error.response?.status === 404 || error.response?.status === 501) {
        return {
          success: true,
          data: [],
          message: 'Merchant search is temporarily unavailable. Please enter merchant details manually.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find merchant matches. Please try entering merchant details manually.',
      };
    }
  }

  /**
   * Verify bill authenticity and validity
   */
  async verifyBill(data: {
    imageHash: string;
    merchantId: string;
    amount: number;
    billDate: string;
    billNumber?: string;
  }): Promise<ApiResponse<BillVerificationResult>> {
    try {

      const response = await apiClient.post<BillVerificationResult>('/bills/verify', data);

      if (response.success && response.data) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify bill',
      };
    }
  }

  /**
   * Check for fraud indicators
   */
  async checkFraud(data: {
    imageHash: string;
    merchantId: string;
    amount: number;
    billDate: string;
  }): Promise<ApiResponse<FraudDetectionResult>> {
    try {

      const response = await apiClient.post<FraudDetectionResult>('/bills/fraud-check', data);

      if (response.success && response.data) {

        // flags are included in the response data
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check fraud',
      };
    }
  }

  /**
   * Calculate cashback amount
   */
  async calculateCashback(data: {
    merchantId: string;
    amount: number;
    category?: string;
    billDate: string;
  }): Promise<ApiResponse<CashbackCalculation>> {
    try {

      const response = await apiClient.post<CashbackCalculation>(
        '/bills/calculate-cashback',
        data
      );

      if (response.success && response.data) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate cashback',
      };
    }
  }

  /**
   * Complete verification workflow
   */
  async performCompleteVerification(
    imageUri: string,
    manualCorrections?: ManualCorrectionData
  ): Promise<ApiResponse<BillVerificationWorkflow>> {
    try {

      const workflow: BillVerificationWorkflow = {
        imageUri,
        currentState: {
          status: 'uploading',
          currentStep: 1,
          totalSteps: 6,
          message: 'Uploading image...',
          progress: 0,
          timestamp: new Date(),
        },
        isComplete: false,
        canSubmit: false,
        errors: [],
      };

      // Step 1: Analyze image quality
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'ocr_processing',
        currentStep: 1,
        message: 'Analyzing image quality...',
        progress: 15,
      });

      const imageAnalysis = await this.analyzeBillImage(imageUri);
      if (!imageAnalysis.success) {
        workflow.errors.push('Image analysis failed: ' + imageAnalysis.error);
      } else {
        workflow.imageAnalysis = imageAnalysis.data;

        if (imageAnalysis.data?.quality === 'poor') {
          workflow.errors.push('Image quality is too low. Please retake a clearer photo.');
        }
      }

      // Step 2: Extract data with OCR
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'ocr_processing',
        currentStep: 2,
        message: 'Extracting bill details...',
        progress: 30,
      });

      const ocrResult = await this.extractBillData(imageUri);
      if (!ocrResult.success) {
        workflow.errors.push('OCR extraction failed: ' + ocrResult.error);
      } else {
        workflow.ocrData = ocrResult.data;

        // Apply manual corrections if provided
        if (manualCorrections) {
          workflow.manualCorrections = manualCorrections;
          workflow.ocrData = { ...workflow.ocrData, ...manualCorrections } as OCRExtractedData;
        }
      }

      // Step 3: Match merchant
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'merchant_matching',
        currentStep: 3,
        message: 'Finding matching merchants...',
        progress: 45,
      });

      if (workflow.ocrData?.merchantName) {
        const merchantMatches = await this.findMerchantMatches(workflow.ocrData.merchantName);
        if (merchantMatches.success && merchantMatches.data && merchantMatches.data.length > 0) {
          workflow.selectedMerchant = merchantMatches.data[0]; // Select best match
        }
      }

      // Step 4: Verify bill
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'amount_verification',
        currentStep: 4,
        message: 'Verifying bill details...',
        progress: 60,
      });

      if (workflow.imageAnalysis && workflow.selectedMerchant && workflow.ocrData) {
        const verificationResult = await this.verifyBill({
          imageHash: workflow.imageAnalysis.hash,
          merchantId: workflow.selectedMerchant.merchantId,
          amount: workflow.ocrData.amount || 0,
          billDate: workflow.ocrData.date || new Date().toISOString(),
          billNumber: workflow.ocrData.billNumber,
        });

        if (verificationResult.success) {
          workflow.verificationResult = verificationResult.data;

          if (!verificationResult.data?.isValid) {
            workflow.errors.push('Bill verification failed');
          }
        }
      }

      // Step 5: Fraud check
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'fraud_check',
        currentStep: 5,
        message: 'Running security checks...',
        progress: 75,
      });

      if (workflow.imageAnalysis && workflow.selectedMerchant && workflow.ocrData) {
        const fraudCheck = await this.checkFraud({
          imageHash: workflow.imageAnalysis.hash,
          merchantId: workflow.selectedMerchant.merchantId,
          amount: workflow.ocrData.amount || 0,
          billDate: workflow.ocrData.date || new Date().toISOString(),
        });

        if (fraudCheck.success) {
          workflow.fraudCheck = fraudCheck.data;

          if (fraudCheck.data?.riskLevel === 'critical' || !fraudCheck.data?.allowSubmission) {
            workflow.errors.push('Bill failed security checks');
          }
        }
      }

      // Step 6: Calculate cashback
      workflow.currentState = this.updateState(workflow.currentState, {
        status: 'cashback_calculation',
        currentStep: 6,
        message: 'Calculating cashback...',
        progress: 90,
      });

      if (workflow.selectedMerchant && workflow.ocrData) {
        const cashbackCalc = await this.calculateCashback({
          merchantId: workflow.selectedMerchant.merchantId,
          amount: workflow.ocrData.amount || 0,
          billDate: workflow.ocrData.date || new Date().toISOString(),
        });

        if (cashbackCalc.success) {
          workflow.cashbackCalculation = cashbackCalc.data;
        }
      }

      // Complete
      workflow.currentState = this.updateState(workflow.currentState, {
        status: workflow.errors.length === 0 ? 'user_verification' : 'failed',
        currentStep: 6,
        message: workflow.errors.length === 0 ? 'Ready for submission' : 'Verification failed',
        progress: 100,
      });

      workflow.isComplete = true;
      workflow.canSubmit = workflow.errors.length === 0 &&
        workflow.verificationResult?.isValid === true &&
        workflow.fraudCheck?.allowSubmission === true;

      return {
        success: true,
        data: workflow,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification workflow failed',
      };
    }
  }

  /**
   * Upload a bill (queue-friendly API used by billUploadQueueService).
   * Delegates to the existing submitVerifiedBill when a full workflow is provided,
   * otherwise accepts the simpler BillUploadData shape from the offline queue.
   */
  async uploadBill(data: any): Promise<ApiResponse<BillUploadResponse>> {
    try {
      const imageUri = data?.imageUri || data?.billImage;
      if (!imageUri) {
        return {
          success: false,
          error: 'Bill image is required for upload',
        };
      }

      const formData = new FormData();
      const filename = String(imageUri).split('/').pop() || 'bill.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          formData.append('billImage', blob, filename);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load image file',
          };
        }
      } else {
        formData.append('billImage', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const merchantId = data?.merchantId || data?.storeId;
      if (merchantId) {
        formData.append('merchantId', String(merchantId));
      }

      const amount = data?.amount;
      if (amount !== undefined && amount !== null) {
        formData.append('amount', String(amount));
      }

      const date = data?.billDate || data?.date;
      if (date) {
        formData.append(
          'billDate',
          date instanceof Date ? date.toISOString() : String(date)
        );
      }

      if (data?.billNumber) {
        formData.append('billNumber', data.billNumber);
      }
      if (data?.notes) {
        formData.append('notes', data.notes);
      }

      const response = await apiClient.uploadFile<BillUploadResponse>('/bills/upload', formData);

      if (response.success && response.data) {
        const data = response.data as any;
        return {
          success: true,
          data,
          // Provide the billId field for legacy callers (e.g. offline queue tests)
          ...(data && (data.billId || data._id) ? { billId: data.billId || data._id } : {}),
        } as any;
      }

      return response as any;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload bill',
      };
    }
  }

  /**
   * Submit verified bill
   */
  async submitVerifiedBill(
    workflow: BillVerificationWorkflow
  ): Promise<ApiResponse<BillUploadResponse>> {
    try {

      if (!workflow.canSubmit) {
        return {
          success: false,
          error: 'Bill cannot be submitted. Please fix errors first.',
        };
      }

      const formData = new FormData();
      const filename = workflow.imageUri.split('/').pop() || 'bill.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(workflow.imageUri);
        const blob = await response.blob();
        formData.append('billImage', blob, filename);
      } else {
        formData.append('billImage', {
          uri: workflow.imageUri,
          name: filename,
          type,
        } as any);
      }

      // Add verified data
      if (workflow.selectedMerchant) {
        formData.append('merchantId', workflow.selectedMerchant.merchantId);
      }

      if (workflow.ocrData?.amount) {
        formData.append('amount', workflow.ocrData.amount.toString());
      }

      if (workflow.ocrData?.date) {
        formData.append('billDate', workflow.ocrData.date);
      }

      if (workflow.ocrData?.billNumber) {
        formData.append('billNumber', workflow.ocrData.billNumber);
      }

      // Add verification metadata
      formData.append('ocrData', JSON.stringify(workflow.ocrData));
      formData.append('verificationResult', JSON.stringify(workflow.verificationResult));
      formData.append('fraudCheck', JSON.stringify(workflow.fraudCheck));
      formData.append('cashbackCalculation', JSON.stringify(workflow.cashbackCalculation));

      const response = await apiClient.uploadFile<BillUploadResponse>('/bills/upload', formData);

      if (response.success) {

      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit bill',
      };
    }
  }

  /**
   * Get bill requirements
   */
  getBillRequirements() {
    return {
      imageFormats: ['jpg', 'jpeg', 'png', 'heic'],
      maxFileSize: FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE, // 10MB - for bill documents
      minResolution: { width: 800, height: 600 },
      maxBillAge: 30, // days
      minAmount: 50,
      maxAmount: 100000,
      requiredFields: ['merchantName', 'amount', 'date'],
      acceptedMerchantTypes: ['retail', 'restaurant', 'grocery', 'service'],
    };
  }

  /**
   * Validate bill data
   */
  validateBillData(data: Partial<OCRExtractedData>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.merchantName || data.merchantName.trim().length < 2) {
      errors.push('Merchant name is required');
    }

    if (!data.amount || data.amount < 50) {
      errors.push('Amount must be at least ₹50');
    }

    if (data.amount && data.amount > 100000) {
      errors.push('Amount cannot exceed ₹1,00,000');
    }

    if (!data.date) {
      errors.push('Bill date is required');
    } else {
      const billDate = new Date(data.date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > 30) {
        errors.push('Bill is too old (more than 30 days)');
      }

      if (billDate > now) {
        errors.push('Bill date cannot be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper: Update verification state
   */
  private updateState(
    currentState: BillVerificationState,
    updates: Partial<BillVerificationState>
  ): BillVerificationState {
    return {
      ...currentState,
      ...updates,
      timestamp: new Date(),
    };
  }

  /**
   * Helper: Get image info
   */
  private async getImageInfo(imageUri: string): Promise<any> {
    if (Platform.OS === 'web') {
      return {
        size: 0,
        uri: imageUri,
      };
    }

    try {
      const info = await FileSystem.getInfoAsync(imageUri);
      return info;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const billVerificationService = new BillVerificationService();
export default billVerificationService;
