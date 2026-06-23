// File Upload Service
// Handle image/video uploads with expo-image-picker and file management

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { platformAlertSimple, platformAlert } from '@/utils/platformAlert';
import apiClient from './apiClient';

export interface UploadOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
  videoMaxDuration?: number;
}

export interface UploadResult {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  fileSize?: number;
  duration?: number;
  fileName?: string;
  mimeType?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileUploadService {

  // Request permissions for camera and media library
  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraResult.status !== 'granted') {
        platformAlertSimple(
          'Permission Required',
          'Camera permission is required to take photos.'
        );
        return false;
      }

      // Request media library permissions
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaResult.status !== 'granted') {
        platformAlertSimple(
          'Permission Required',
          'Media library permission is required to select photos.'
        );
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Show image picker options (camera vs gallery)
  async showImagePicker(options: UploadOptions = {}): Promise<UploadResult[]> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Permissions not granted');
    }

    return new Promise((resolve, reject) => {
      platformAlert(
        'Select Image',
        'Choose how you want to select your image',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
          { text: 'Camera', onPress: () => this.pickFromCamera(options).then(resolve).catch(reject) },
          { text: 'Gallery', onPress: () => this.pickFromGallery(options).then(resolve).catch(reject) },
        ],
        { cancelable: true, onDismiss: () => resolve([]) }
      );
    });
  }

  // Pick image from camera
  async pickFromCamera(options: UploadOptions = {}): Promise<UploadResult[]> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect || [1, 1],
        quality: options.quality ?? 0.8,
        videoMaxDuration: options.videoMaxDuration || 30,
      });

      if (result.canceled) {
        return [];
      }

      return this.processPickerResults(result.assets);
    } catch (error) {
      throw error;
    }
  }

  // Pick image from gallery
  async pickFromGallery(options: UploadOptions = {}): Promise<UploadResult[]> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect || [1, 1],
        quality: options.quality ?? 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection ?? false,
        videoMaxDuration: options.videoMaxDuration || 30,
      });

      if (result.canceled) {
        return [];
      }

      return this.processPickerResults(result.assets);
    } catch (error) {
      throw error;
    }
  }

  // Process picked files and convert to our format
  private async processPickerResults(assets: ImagePicker.ImagePickerAsset[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const asset of assets) {
      try {
        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        
        const result: UploadResult = {
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? undefined,
          fileName: asset.fileName || `${asset.type}_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          mimeType: asset.mimeType,
          fileSize: fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : undefined,
        };

        results.push(result);
      } catch (_error) {
        // silently handle
      }
    }

    return results;
  }

  // Map upload type to the correct backend endpoint and form field name
  private getUploadConfig(uploadType: 'profile' | 'ugc' | 'review'): { endpoint: string; fieldName: string } {
    switch (uploadType) {
      case 'profile':
        return { endpoint: '/user/profile/picture', fieldName: 'profilePicture' };
      case 'review':
        return { endpoint: '/reviews/upload-image', fieldName: 'image' };
      case 'ugc':
      default:
        return { endpoint: '/projects/upload', fieldName: 'file' };
    }
  }

  // Upload file to server via backend Cloudinary endpoint
  async uploadFile(
    file: UploadResult,
    uploadType: 'profile' | 'ugc' | 'review',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    const { endpoint, fieldName } = this.getUploadConfig(uploadType);

    // Create form data
    const formData = new FormData();

    // Add the file with the correct field name for the backend multer middleware
    formData.append(fieldName, {
      uri: file.uri,
      type: file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'video/mp4'),
      name: file.fileName || 'upload.jpg',
    } as any);

    // Add metadata
    formData.append('type', uploadType);
    if (file.width) formData.append('width', file.width.toString());
    if (file.height) formData.append('height', file.height.toString());
    if (file.duration) formData.append('duration', file.duration.toString());

    // Signal start of upload
    onProgress?.({ loaded: 0, total: 100, percentage: 0 });

    try {
      const response = await apiClient.uploadFile<{
        url: string;
        thumbnailUrl?: string;
        publicId?: string;
      }>(endpoint, formData);

      // Signal upload complete
      onProgress?.({ loaded: 100, total: 100, percentage: 100 });

      if (response.success && response.data) {
        return {
          url: response.data.url,
          thumbnailUrl: response.data.thumbnailUrl,
        };
      }

      throw new Error(response.error || 'Upload failed');
    } catch (error) {
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: UploadResult[],
    uploadType: 'profile' | 'ugc' | 'review',
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<{ url: string; thumbnailUrl?: string }[]> {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadFile(
        file,
        uploadType,
        (progress) => onProgress?.(i, progress)
      );
      results.push(result);
    }
    
    return results;
  }

  // Compress image before upload
  async compressImage(uri: string, quality: number = 0.7): Promise<string> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality,
        base64: false,
      });

      // In a real app, you might use a library like expo-image-manipulator
      // to resize/compress the image before upload
      return uri; // For now, return original URI
    } catch (error) {
      return uri;
    }
  }

  // Get file size in human readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validate file before upload
  validateFile(file: UploadResult, maxSizeMB: number = 10, allowedTypes: string[] = ['image', 'video']): {
    isValid: boolean;
    error?: string;
  } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.fileSize && file.fileSize > maxSizeMB * 1024 * 1024) {
      return {
        isValid: false,
        error: `File size ${this.formatFileSize(file.fileSize)} exceeds maximum allowed size of ${maxSizeMB}MB`
      };
    }

    // Check video duration
    if (file.type === 'video' && file.duration && file.duration > 60) {
      return {
        isValid: false,
        error: 'Video duration cannot exceed 60 seconds'
      };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Export utility functions
export const uploadHelpers = {
  // Create thumbnail from video
  async createVideoThumbnail(videoUri: string): Promise<string> {
    // In real app, use expo-video-thumbnails or similar
    return videoUri; // Mock implementation
  },

  // Resize image
  async resizeImage(uri: string, width: number, height: number): Promise<string> {
    // In real app, use expo-image-manipulator
    return uri; // Mock implementation
  },

  // Generate unique filename
  generateFileName(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  },
};
