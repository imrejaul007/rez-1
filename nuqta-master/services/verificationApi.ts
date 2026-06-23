// Verification API Service
// Handles zone-specific user verification API calls

import apiClient, { ApiResponse } from './apiClient';

/**
 * Verification status for a single zone
 */
export interface VerificationStatus {
  verified: boolean;
  verifiedAt?: string;
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  rejectionReason?: string;
  documentType?: string;
  instituteName?: string;
  corporateEmail?: string;
  companyName?: string;
  serviceType?: string;
  profession?: string;
  department?: string;
  disabilityType?: string;
}

/**
 * All verification statuses
 */
export interface AllVerifications {
  student: VerificationStatus;
  corporate: VerificationStatus;
  defence: VerificationStatus;
  healthcare: VerificationStatus;
  senior: VerificationStatus;
  teacher: VerificationStatus;
  government: VerificationStatus;
  differentlyAbled: VerificationStatus;
}

/**
 * Data to submit for verification
 */
export interface SubmitVerificationData {
  method: string;
  email?: string;
  documentNumber?: string;
  documentImage?: string;
  additionalInfo?: {
    instituteName?: string;
    serviceType?: string;
    profession?: string;
    department?: string;
    disabilityType?: string;
  };
}

/**
 * Response from submit verification
 */
export interface SubmitVerificationResponse {
  zone: string;
  status: 'approved' | 'pending' | 'rejected';
  verified: boolean;
  message: string;
}

/**
 * Verification methods for a zone
 */
export interface VerificationMethods {
  zone: string;
  methods: string[];
  requiresDocument: boolean;
  autoApproveAvailable: boolean;
}

class VerificationService {
  /**
   * Get verification status for all zones
   */
  async getStatus(): Promise<ApiResponse<AllVerifications>> {
    return apiClient.get('/user/verifications');
  }

  /**
   * Get verification status for a specific zone
   */
  async getZoneStatus(zone: string): Promise<ApiResponse<VerificationStatus>> {
    return apiClient.get(`/user/verifications/${zone}`);
  }

  /**
   * Get available verification methods for a zone
   */
  async getMethods(zone: string): Promise<ApiResponse<VerificationMethods>> {
    return apiClient.get(`/user/verifications/methods/${zone}`);
  }

  /**
   * Submit verification for a specific zone
   */
  async submitVerification(
    zone: string,
    data: SubmitVerificationData
  ): Promise<ApiResponse<SubmitVerificationResponse>> {
    // If there's a document image, we need to send as FormData
    if (data.documentImage) {
      const formData = new FormData();
      formData.append('method', data.method);

      if (data.email) {
        formData.append('email', data.email);
      }

      if (data.documentNumber) {
        formData.append('documentNumber', data.documentNumber);
      }

      // Append the document image
      if (data.documentImage.startsWith('file://') || data.documentImage.startsWith('content://')) {
        // It's a local file URI
        const filename = data.documentImage.split('/').pop() || 'document.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('document', {
          uri: data.documentImage,
          type,
          name: filename,
        } as any);
      } else {
        // It might be a base64 or URL
        formData.append('documentImage', data.documentImage);
      }

      if (data.additionalInfo) {
        formData.append('additionalInfo', JSON.stringify(data.additionalInfo));
      }

      return apiClient.post(`/user/verifications/${zone}`, formData);
    }

    // No document, send as JSON
    return apiClient.post(`/user/verifications/${zone}`, data);
  }

  /**
   * Upload verification document separately
   */
  async uploadDocument(
    zone: string,
    file: { uri: string; type?: string; name?: string }
  ): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('document', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'document.jpg',
    } as any);

    return apiClient.post(`/user/verifications/${zone}/upload`, formData);
  }
}

const verificationService = new VerificationService();
export default verificationService;
