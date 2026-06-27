// Project Upload Service
// Handles image/video uploads for project submissions using Cloudinary

import { Platform } from 'react-native';
import apiClient from '@/services/apiClient';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  thumbnailUrl?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  type?: 'image' | 'video';
  error?: string;
}

/**
 * Upload a single image or video file for project submission
 */
export const uploadProjectFile = async (
  fileUri: string,
  fileType: 'image' | 'video'
): Promise<UploadResult> => {
  try {

    // Create FormData
    const formData = new FormData();

    // Handle file based on platform
    const filename = fileUri.split('/').pop() || `${fileType}_${Date.now()}.${fileType === 'video' ? 'mp4' : 'jpg'}`;
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = fileType === 'video' 
      ? `video/${match ? match[1] : 'mp4'}`
      : `image/${match ? match[1] : 'jpeg'}`;

    if (Platform.OS === 'web') {
      // On web, fetch the blob first
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      formData.append('file', blob, filename);
    } else {
      // On mobile (React Native)
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        name: filename,
        type: mimeType,
      } as any);
    }

    // Upload to backend (which uploads to Cloudinary)
    const response = await apiClient.post<{
      url: string;
      publicId: string;
      thumbnailUrl: string;
      format: string;
      width: number;
      height: number;
      bytes: number;
      type: 'image' | 'video';
    }>('/projects/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.success && response.data) {
      return {
        success: true,
        url: response.data.url,
        publicId: response.data.publicId,
        thumbnailUrl: response.data.thumbnailUrl,
        format: response.data.format,
        width: response.data.width,
        height: response.data.height,
        bytes: response.data.bytes,
        type: response.data.type,
      };
    } else {
      throw new Error('Upload failed');
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || `Failed to upload ${fileType}`,
    };
  }
};

/**
 * Upload multiple image/video files for project submission
 */
export const uploadMultipleProjectFiles = async (
  fileUris: string[],
  fileType: 'image' | 'video'
): Promise<UploadResult[]> => {
  try {

    // Create FormData
    const formData = new FormData();

    // Add all files
    fileUris.forEach((fileUri, index) => {
      const filename = fileUri.split('/').pop() || `${fileType}_${Date.now()}_${index}.${fileType === 'video' ? 'mp4' : 'jpg'}`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = fileType === 'video' 
        ? `video/${match ? match[1] : 'mp4'}`
        : `image/${match ? match[1] : 'jpeg'}`;

      if (Platform.OS === 'web') {
        // On web, we'll need to fetch each blob
        // For now, we'll upload one by one
      } else {
        // On mobile (React Native)
        formData.append('files', {
          uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
          name: filename,
          type: mimeType,
        } as any);
      }
    });

    // For web, upload files one by one
    if (Platform.OS === 'web') {
      const results: UploadResult[] = [];
      for (const fileUri of fileUris) {
        const result = await uploadProjectFile(fileUri, fileType);
        results.push(result);
      }
      return results;
    }

    // Upload to backend (which uploads to Cloudinary)
    const response = await apiClient.post<{
      files: Array<{
        url: string;
        publicId: string;
        thumbnailUrl: string;
        format: string;
        width: number;
        height: number;
        bytes: number;
        type: 'image' | 'video';
        originalName: string;
      }>;
      count: number;
    }>('/projects/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.success && response.data) {
      return response.data.files.map(file => ({
        success: true,
        url: file.url,
        publicId: file.publicId,
        thumbnailUrl: file.thumbnailUrl,
        format: file.format,
        width: file.width,
        height: file.height,
        bytes: file.bytes,
        type: file.type,
      }));
    } else {
      throw new Error('Upload failed');
    }
  } catch (error: any) {
    return fileUris.map(() => ({
      success: false,
      error: error?.message || 'Failed to upload files',
    }));
  }
};


