// Photo Upload API Service
// Handles uploading store/product photos for earning coins

import apiClient from './apiClient';

export interface PhotoData {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface PhotoUploadRequest {
  photos: PhotoData[];
  caption?: string;
  taggedProducts?: string[];
  taggedStores?: string[];
  contentType?: 'store_photo' | 'product_photo' | 'experience_photo';
  storeId?: string;
  productId?: string;
}

export interface PhotoUploadItem {
  _id: string;
  photos: PhotoData[];
  caption?: string;
  contentType: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  coinsAwarded: number;
  store?: { _id: string; name: string; logo?: string };
  product?: { _id: string; name: string; images?: string[] };
  createdAt: string;
}

class PhotoUploadApiService {
  /**
   * Upload photos for store/product
   */
  async upload(data: PhotoUploadRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.post<any>('/photos/upload', data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to upload photos' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to upload photos' };
    }
  }

  /**
   * Get user's upload history
   */
  async getMyUploads(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ success: boolean; data?: { uploads: PhotoUploadItem[]; pagination: any }; error?: string }> {
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;

      const query = new URLSearchParams(params).toString();
      const response = await apiClient.get<{ uploads: PhotoUploadItem[]; pagination: any }>(
        `/photos/my-uploads?${query}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch uploads' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch uploads' };
    }
  }

  /**
   * Get approved photos for a store
   */
  async getStorePhotos(
    storeId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { photos: PhotoUploadItem[]; pagination: any }; error?: string }> {
    try {
      const response = await apiClient.get<{ photos: PhotoUploadItem[]; pagination: any }>(
        `/photos/store/${storeId}?page=${page}&limit=${limit}`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message || 'Failed to fetch store photos' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch store photos' };
    }
  }
}

export const photoUploadApi = new PhotoUploadApiService();
export default photoUploadApi;
