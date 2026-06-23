// @ts-nocheck
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { platformAlertSimple, platformAlert } from '@/utils/platformAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/utils/apiClient';

// Types
export interface ImagePickerOptions {
  mediaTypes?: ImagePicker.MediaTypeOptions;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
}

export interface CameraOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  videoQuality?: number;
  videoMaxDuration?: number;
}

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo';
  fileName?: string;
  fileSize?: number;
  exif?: Record<string, any>;
  base64?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export interface CameraPermissions {
  camera: boolean;
  mediaLibrary: boolean;
  canAskAgain: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  CAMERA_SETTINGS: 'camera_settings',
  UPLOAD_HISTORY: 'upload_history',
};

// Default options
const DEFAULT_PICKER_OPTIONS: Required<ImagePickerOptions> = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  allowsMultipleSelection: false,
  selectionLimit: 1,
};

const DEFAULT_CAMERA_OPTIONS: Required<CameraOptions> = {
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  videoQuality: 1,
  videoMaxDuration: 60,
};

class CameraService {
  private permissions: CameraPermissions | null = null;
  private uploadHistory: UploadResult[] = [];

  // Initialize camera service
  async initialize(): Promise<void> {
    try {
      await this.checkPermissions();
      await this.loadUploadHistory();
    } catch (_error) {
      // silently handle
    }
  }

  // Request camera and media library permissions
  async requestPermissions(): Promise<CameraPermissions> {
    try {
      // Request camera permission
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      // Request media library permission
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      const permissions: CameraPermissions = {
        camera: cameraPermission.status === ImagePicker.PermissionStatus.GRANTED,
        mediaLibrary: mediaLibraryPermission.status === ImagePicker.PermissionStatus.GRANTED,
        canAskAgain: 
          cameraPermission.canAskAgain && mediaLibraryPermission.canAskAgain,
      };

      this.permissions = permissions;
      return permissions;
    } catch (error) {
      return {
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      };
    }
  }

  // Check current permissions
  async checkPermissions(): Promise<CameraPermissions> {
    try {
      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();

      const permissions: CameraPermissions = {
        camera: cameraPermission.status === ImagePicker.PermissionStatus.GRANTED,
        mediaLibrary: mediaLibraryPermission.status === ImagePicker.PermissionStatus.GRANTED,
        canAskAgain: 
          cameraPermission.canAskAgain && mediaLibraryPermission.canAskAgain,
      };

      this.permissions = permissions;
      return permissions;
    } catch (error) {
      return {
        camera: false,
        mediaLibrary: false,
        canAskAgain: false,
      };
    }
  }

  // Open camera to take photo/video
  async openCamera(options?: CameraOptions): Promise<ImageAsset | null> {
    try {
      // Check permissions
      if (!this.permissions?.camera) {
        const permissionResult = await this.requestPermissions();
        if (!permissionResult.camera) {
          platformAlertSimple(
            'Camera Permission Required',
            'Please enable camera access in your device settings to take photos.'
          );
          return null;
        }
      }

      const mergedOptions = { ...DEFAULT_CAMERA_OPTIONS, ...options };

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
        videoQuality: mergedOptions.videoQuality,
        videoMaxDuration: mergedOptions.videoMaxDuration,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
          fileName: asset.fileName || undefined,
          fileSize: asset.fileSize || undefined,
          exif: asset.exif || undefined,
          base64: asset.base64 || undefined,
        };
      }

      return null;
    } catch (error) {
      platformAlertSimple('Camera Error', 'Failed to open camera. Please try again.');
      return null;
    }
  }

  // Open image picker to select from gallery
  async openImagePicker(options?: ImagePickerOptions): Promise<ImageAsset[]> {
    try {
      // Check permissions
      if (!this.permissions?.mediaLibrary) {
        const permissionResult = await this.requestPermissions();
        if (!permissionResult.mediaLibrary) {
          platformAlertSimple(
            'Media Library Permission Required',
            'Please enable media library access in your device settings to select photos.'
          );
          return [];
        }
      }

      const mergedOptions = { ...DEFAULT_PICKER_OPTIONS, ...options };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mergedOptions.mediaTypes,
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
        allowsMultipleSelection: mergedOptions.allowsMultipleSelection,
        selectionLimit: mergedOptions.selectionLimit,
      });

      if (!result.canceled && result.assets) {
        return result.assets.map((asset: ImagePicker.ImagePickerAsset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.type,
          fileName: asset.fileName || undefined,
          fileSize: asset.fileSize || undefined,
          exif: asset.exif || undefined,
          base64: asset.base64 || undefined,
        }));
      }

      return [];
    } catch (error) {
      platformAlertSimple('Image Picker Error', 'Failed to open image picker. Please try again.');
      return [];
    }
  }

  // Show action sheet to choose camera or gallery
  async showImageSourceSelector(
    cameraOptions?: CameraOptions,
    pickerOptions?: ImagePickerOptions
  ): Promise<ImageAsset | null> {
    return new Promise((resolve) => {
      platformAlert(
        'Select Image Source',
        'Choose how you want to add an image',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await this.openCamera(cameraOptions);
              resolve(result);
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const results = await this.openImagePicker({
                ...pickerOptions,
                allowsMultipleSelection: false,
              });
              resolve(results.length > 0 ? results[0] : null);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  // Upload image to server
  async uploadImage(
    asset: ImageAsset,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Create FormData
      const formData = new FormData();
      
      // Prepare file object
      const fileExtension = asset.uri.split('.').pop() || 'jpg';
      const fileName = asset.fileName || `image_${Date.now()}.${fileExtension}`;
      
      formData.append('file', {
        uri: asset.uri,
        type: `image/${fileExtension}`,
        name: fileName,
      } as any);

      // Add metadata
      formData.append('width', asset.width.toString());
      formData.append('height', asset.height.toString());
      if (asset.fileSize) {
        formData.append('fileSize', asset.fileSize.toString());
      }

      // Upload with progress tracking
      const result = await apiClient.upload<{ url: string; id: string }>(
        '/upload/image',
        formData,
        (percentage) => {
          if (onProgress) {
            onProgress({
              loaded: percentage,
              total: 100,
              percentage,
            });
          }
        }
      );
      
      const uploadResult: UploadResult = {
        success: true,
        url: result.data.url,
        id: result.data.id,
      };

      // Save to upload history
      await this.saveUploadToHistory(uploadResult);

      return uploadResult;
    } catch (error) {
      
      const uploadResult: UploadResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };

      return uploadResult;
    }
  }

  // Upload multiple images
  async uploadMultipleImages(
    assets: ImageAsset[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    let totalProgress = 0;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      const result = await this.uploadImage(asset, (progress) => {
        const overallProgress = ((totalProgress + progress.percentage) / assets.length);
        if (onProgress) {
          onProgress({
            loaded: overallProgress,
            total: 100,
            percentage: overallProgress,
          });
        }
      });

      results.push(result);
      totalProgress += 100;
    }

    return results;
  }

  // Save image to device gallery
  async saveToGallery(uri: string): Promise<boolean> {
    try {
      // Check permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        platformAlertSimple(
          'Permission Required',
          'Permission to access media library is required to save images.'
        );
        return false;
      }

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(uri);
      if (asset) {
        platformAlertSimple('Success', 'Image saved to gallery successfully!');
        return true;
      }

      return false;
    } catch (error) {
      platformAlertSimple('Error', 'Failed to save image to gallery.');
      return false;
    }
  }

  // Compress image
  async compressImage(
    uri: string,
    quality: number = 0.8
  ): Promise<string | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality,
        base64: false,
      });

      // This is a simplified approach - in a real app, you'd use a library like expo-image-manipulator
      return uri; // Return original for now
    } catch (error) {
      return null;
    }
  }

  // Get upload history
  getUploadHistory(): UploadResult[] {
    return this.uploadHistory;
  }

  // Clear upload history
  async clearUploadHistory(): Promise<void> {
    try {
      this.uploadHistory = [];
      await AsyncStorage.removeItem(STORAGE_KEYS.UPLOAD_HISTORY);
    } catch (_error) {
      // silently handle
    }
  }

  // Get permissions status
  getPermissions(): CameraPermissions | null {
    return this.permissions;
  }

  // Private methods
  private async loadUploadHistory(): Promise<void> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY);
      if (history) {
        this.uploadHistory = JSON.parse(history);
      }
    } catch (_error) {
      // silently handle
    }
  }

  private async saveUploadToHistory(result: UploadResult): Promise<void> {
    try {
      this.uploadHistory.push({
        ...result,
        timestamp: Date.now(),
      } as any);

      // Keep only last 50 uploads
      if (this.uploadHistory.length > 50) {
        this.uploadHistory = this.uploadHistory.slice(-50);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.UPLOAD_HISTORY,
        JSON.stringify(this.uploadHistory)
      );
    } catch (_error) {
      // silently handle
    }
  }
}

// Create and export singleton instance
export const cameraService = new CameraService();

// Utility functions
export const CameraUtils = {
  // Get file size in human readable format
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get aspect ratio description
  getAspectRatioDescription: (width: number, height: number): string => {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return 'Square (1:1)';
    if (Math.abs(ratio - 4/3) < 0.1) return 'Standard (4:3)';
    if (Math.abs(ratio - 16/9) < 0.1) return 'Widescreen (16:9)';
    if (Math.abs(ratio - 3/2) < 0.1) return 'Classic (3:2)';
    return `Custom (${width}:${height})`;
  },

  // Validate image dimensions
  validateImageDimensions: (
    width: number, 
    height: number, 
    minWidth: number = 100, 
    minHeight: number = 100,
    maxWidth: number = 4000,
    maxHeight: number = 4000
  ): { valid: boolean; error?: string } => {
    if (width < minWidth || height < minHeight) {
      return {
        valid: false,
        error: `Image must be at least ${minWidth}x${minHeight} pixels`,
      };
    }
    
    if (width > maxWidth || height > maxHeight) {
      return {
        valid: false,
        error: `Image must be smaller than ${maxWidth}x${maxHeight} pixels`,
      };
    }
    
    return { valid: true };
  },
};

export default cameraService;
