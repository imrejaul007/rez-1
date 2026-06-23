// Profile API Service
// Handles user profile data and completion status

import apiClient, { ApiResponse } from './apiClient';
import { withRetry, createErrorResponse } from '@/utils/apiUtils';

/**
 * Profile Data Interface
 */
export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile Completion Status
 */
export interface ProfileCompletionStatus {
  completionPercentage: number;
  missingFields: string[];
  suggestions: string[];
}

/**
 * Profile API Service Class
 */
class ProfileService {
  /**
   * Get user profile data
   */
  async getProfile(): Promise<ApiResponse<ProfileData>> {
    try {
      return await withRetry(
        () => apiClient.get<ProfileData>('/user/profile'),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to load profile. Please try again.');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<ProfileData>): Promise<ApiResponse<ProfileData>> {
    try {
      return await withRetry(
        () => apiClient.put<ProfileData>('/user/profile', updates),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to update profile. Please try again.');
    }
  }

  /**
   * Get profile completion status
   */
  async getProfileCompletion(): Promise<ApiResponse<ProfileCompletionStatus>> {
    try {
      return await withRetry(
        () => apiClient.get<ProfileCompletionStatus>('/user/profile/completion'),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to load profile completion status. Please try again.');
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(imageUri: string): Promise<ApiResponse<{ profilePicture: string }>> {
    try {
      const formData = new FormData();
      formData.append('profilePicture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile-picture.jpg',
      } as any);

      return await withRetry(
        () => apiClient.post<{ profilePicture: string }>('/user/profile/picture', formData),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to upload profile picture. Please try again.');
    }
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      return await withRetry(
        () => apiClient.delete<{ success: boolean }>('/user/profile/picture'),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to delete profile picture. Please try again.');
    }
  }

  /**
   * Verify profile
   */
  async verifyProfile(verificationData: {
    documentType: 'id' | 'passport' | 'license';
    documentNumber: string;
    documentImage: string;
  }): Promise<ApiResponse<{ verificationStatus: 'pending' | 'approved' | 'rejected' }>> {
    try {
      return await withRetry(
        () => apiClient.post<{ verificationStatus: 'pending' | 'approved' | 'rejected' }>('/user/profile/verify', verificationData),
        { maxRetries: 3 }
      );
    } catch (error: any) {
      return createErrorResponse(error, 'Failed to submit verification. Please try again.');
    }
  }
}

// Export singleton instance
const profileService = new ProfileService();
export default profileService;
