// Ring Size API Service
// API service for ring size functionality

import apiClient, { ApiResponse } from './apiClient';
import asyncStorageService from './asyncStorageService';

const RING_SIZE_STORAGE_KEY = 'user_ring_size';

export interface RingSizeData {
  size: string;
  savedAt: string;
  method?: 'measure' | 'compare' | 'guide';
}

class RingSizeApiService {
  private baseUrl = '/user/profile';
  private localCache: RingSizeData | null = null;

  /**
   * Save ring size to user profile with local backup
   */
  async saveRingSize(
    ringSize: string,
    method?: 'measure' | 'compare' | 'guide'
  ): Promise<ApiResponse<RingSizeData>> {
    try {
      const ringSizeData: RingSizeData = {
        size: ringSize,
        savedAt: new Date().toISOString(),
        method
      };

      // Save to local storage first (as backup)
      try {
        await asyncStorageService.save(RING_SIZE_STORAGE_KEY, ringSizeData);
        this.localCache = ringSizeData;
      } catch (_storageError) {
        // silently handle
      }

      // Try to save to backend
      try {
        const response = await apiClient.post(`${this.baseUrl}/ring-size`, {
          ringSize,
          method
        });

        if (response.success) {
          return {
            success: true,
            data: ringSizeData,
            message: 'Ring size saved successfully'
          };
        }

        // Backend failed but local save succeeded
        return {
          success: true,
          data: ringSizeData,
          message: 'Ring size saved locally',
          error: 'Backend sync pending'
        };
      } catch (apiError) {

        // Local save succeeded, backend failed
        return {
          success: true,
          data: ringSizeData,
          message: 'Ring size saved locally (will sync later)',
          error: apiError instanceof Error ? apiError.message : 'Backend sync failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save ring size',
        data: undefined,
      };
    }
  }

  /**
   * Get saved ring size
   */
  async getRingSize(): Promise<ApiResponse<RingSizeData>> {
    try {
      // Check cache first
      if (this.localCache) {
        return {
          success: true,
          data: this.localCache
        };
      }

      // Try backend first
      try {
        const response = await apiClient.get<RingSizeData>(`${this.baseUrl}/ring-size`);
        if (response.success && response.data) {
          this.localCache = response.data;
          return response;
        }
      } catch (_apiError) {
        // silently handle
      }

      // Fallback to local storage
      const localData = await asyncStorageService.get<RingSizeData>(RING_SIZE_STORAGE_KEY);

      if (localData) {
        this.localCache = localData;
        return {
          success: true,
          data: localData,
          message: 'Loaded from local storage'
        };
      }

      return {
        success: false,
        error: 'No saved ring size found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ring size',
      };
    }
  }

  /**
   * Delete saved ring size
   */
  async deleteRingSize(): Promise<ApiResponse<void>> {
    try {
      // Clear cache
      this.localCache = null;

      // Clear local storage
      await asyncStorageService.remove(RING_SIZE_STORAGE_KEY);

      // Try to delete from backend
      try {
        const response = await apiClient.delete<void>(`${this.baseUrl}/ring-size`);
        return response;
      } catch (apiError) {
        return {
          success: true,
          message: 'Ring size deleted locally',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete ring size',
      };
    }
  }

  /**
   * Sync local ring size to backend (retry mechanism)
   */
  async syncToBackend(): Promise<ApiResponse<RingSizeData>> {
    try {
      const localData = await asyncStorageService.get<RingSizeData>(RING_SIZE_STORAGE_KEY);

      if (!localData) {
        return {
          success: false,
          error: 'No local data to sync',
        };
      }

      return await this.saveRingSize(localData.size, localData.method);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const RING_SIZE_API_SERVICE_KEY = '__rezRingSizeApiService__';

function getRingSizeApiService(): RingSizeApiService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[RING_SIZE_API_SERVICE_KEY]) {
      (globalThis as any)[RING_SIZE_API_SERVICE_KEY] = new RingSizeApiService();
    }
    return (globalThis as any)[RING_SIZE_API_SERVICE_KEY];
  }
  return new RingSizeApiService();
}

export default getRingSizeApiService();
