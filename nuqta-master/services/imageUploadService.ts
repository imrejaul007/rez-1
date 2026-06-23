// Image Upload Service
// Handles image uploads to backend (Cloudinary)

import { Platform } from 'react-native';
import { FILE_SIZE_LIMITS, UPLOAD_TIMEOUTS, formatFileSize } from '@/utils/fileUploadConstants';
import { getAuthToken } from '@/utils/authStorage';
import apiClient from './apiClient';

const API_URL = apiClient.getBaseURL();
const UPLOAD_TIMEOUT = UPLOAD_TIMEOUTS.IMAGE; // Use centralized timeout

interface UploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export const uploadProfileImage = async (imageUri: string, token?: string): Promise<UploadResult> => {
  const startTime = Date.now();
  
  try {
    // Try to get token from parameter first, then secure auth storage
    let authToken = token;
    if (!authToken) {
      authToken = (await getAuthToken()) ?? undefined;
    }

    if (!authToken) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Create FormData
    const formData = new FormData();

    // Handle image file based on platform
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (Platform.OS === 'web') {
      // On web, imageUri is a blob URL, we need to fetch it first
      const blob = await fetch(imageUri).then(r => r.blob());

      // Check file size using centralized limit
      if (blob.size > FILE_SIZE_LIMITS.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: `Image too large. Please select an image smaller than ${formatFileSize(FILE_SIZE_LIMITS.MAX_IMAGE_SIZE)}.`
        };
      }

      // Blob URLs have no extension — derive from blob MIME type so backend accepts it
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
        'image/gif': '.gif', 'image/bmp': '.bmp', 'image/heic': '.heic',
      };
      const ext = extMap[blob.type] || '.jpg';
      const safeFilename = filename.includes('.') ? filename : `avatar${ext}`;

      formData.append('avatar', blob, safeFilename);
    } else {
      // On mobile (React Native)
      formData.append('avatar', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name: filename,
        type,
      } as any);
    }

    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, UPLOAD_TIMEOUT);

    const response = await fetch(`${API_URL}/user/auth/upload-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        // Don't set Content-Type, let browser/fetch set it with boundary
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Upload failed'
      };
    }

    return {
      success: true,
      avatarUrl: data.data?.profile?.avatar || data.data?.avatar
    };
  } catch (error) {
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Upload timeout. Please check your internet connection and try again with a smaller image.'
        };
      }
      
      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Network error. Please check your internet connection and try again.'
        };
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
    };
  }
};
