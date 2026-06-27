// Video Upload Hook
// Manages state and logic for UGC video uploads

import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import {
  VideoUploadState,
  VideoMetadata,
  UploadProgress,
  ValidationError,
  DEFAULT_VIDEO_RULES,
  UploadSource,
  PermissionsState,
  ProductReference,
  PRODUCT_TAGGING_RULES,
} from '@/types/ugc-upload.types';
import {
  CLOUDINARY_CONFIG,
  getCloudinaryUploadUrl,
  generateThumbnailUrl,
} from '@/config/cloudinary.config';
import apiClient from '@/services/apiClient';

const INITIAL_STATE: VideoUploadState = {
  source: null,
  video: null,
  title: '',
  description: '',
  hashtags: [],
  selectedProducts: [],
  productSelectorVisible: false,
  status: 'idle',
  progress: null,
  error: null,
  validationErrors: [],
};

export function useVideoUpload() {
  const [state, setState] = useState<VideoUploadState>(INITIAL_STATE);
  const [permissions, setPermissions] = useState<PermissionsState>({
    camera: 'undetermined',
    mediaLibrary: 'undetermined',
  });

  /**
   * Request camera permissions
   */
  const requestCameraPermission = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermissions(prev => ({ ...prev, camera: status }));
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Request media library permissions
   */
  const requestMediaLibraryPermission = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setPermissions(prev => ({ ...prev, mediaLibrary: status }));
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Validate video metadata
   */
  const validateVideo = useCallback((video: VideoMetadata): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check file size
    const fileSizeMB = video.fileSize / (1024 * 1024);
    if (fileSizeMB > DEFAULT_VIDEO_RULES.maxFileSize) {
      errors.push({
        field: 'video',
        message: `Video size must be less than ${DEFAULT_VIDEO_RULES.maxFileSize}MB`,
      });
    }

    // Check duration
    const durationSeconds = video.duration / 1000;
    if (durationSeconds < DEFAULT_VIDEO_RULES.minDuration) {
      errors.push({
        field: 'video',
        message: `Video must be at least ${DEFAULT_VIDEO_RULES.minDuration} seconds`,
      });
    }
    if (durationSeconds > DEFAULT_VIDEO_RULES.maxDuration) {
      errors.push({
        field: 'video',
        message: `Video must be less than ${DEFAULT_VIDEO_RULES.maxDuration} seconds`,
      });
    }

    // Check format
    const format = video.mimeType.split('/')[1];
    if (!DEFAULT_VIDEO_RULES.allowedFormats.includes(format)) {
      errors.push({
        field: 'video',
        message: `Unsupported video format. Allowed: ${DEFAULT_VIDEO_RULES.allowedFormats.join(', ')}`,
      });
    }

    return errors;
  }, []);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!state.title.trim()) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (state.title.length > DEFAULT_VIDEO_RULES.maxTitleLength) {
      errors.push({
        field: 'title',
        message: `Title must be less than ${DEFAULT_VIDEO_RULES.maxTitleLength} characters`,
      });
    }

    if (state.description.length > DEFAULT_VIDEO_RULES.maxDescriptionLength) {
      errors.push({
        field: 'description',
        message: `Description must be less than ${DEFAULT_VIDEO_RULES.maxDescriptionLength} characters`,
      });
    }

    if (state.hashtags.length > DEFAULT_VIDEO_RULES.maxHashtags) {
      errors.push({
        field: 'hashtags',
        message: `Maximum ${DEFAULT_VIDEO_RULES.maxHashtags} hashtags allowed`,
      });
    }

    return errors;
  }, [state.title, state.description, state.hashtags]);

  /**
   * Select video from camera
   */
  const selectFromCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'selecting', error: null }));

      // Request permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Camera permission denied',
        }));
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: DEFAULT_VIDEO_RULES.maxDuration,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        const videoMetadata: VideoMetadata = {
          uri: asset.uri,
          fileName: asset.fileName || 'video.mp4',
          fileSize: asset.fileSize || 0,
          mimeType: asset.mimeType || 'video/mp4',
          duration: asset.duration || 0,
          width: asset.width,
          height: asset.height,
        };

        // Validate video
        const validationErrors = validateVideo(videoMetadata);
        if (validationErrors.length > 0) {
          setState(prev => ({
            ...prev,
            status: 'error',
            validationErrors,
            error: validationErrors[0].message,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          source: 'camera',
          video: videoMetadata,
          status: 'selected',
          validationErrors: [],
        }));
      } else {
        setState(prev => ({ ...prev, status: 'idle' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to record video',
      }));
    }
  }, [requestCameraPermission, validateVideo]);

  /**
   * Select video from gallery
   */
  const selectFromGallery = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'selecting', error: null }));

      // Request permission
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Media library permission denied',
        }));
        return;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        const videoMetadata: VideoMetadata = {
          uri: asset.uri,
          fileName: asset.fileName || 'video.mp4',
          fileSize: asset.fileSize || 0,
          mimeType: asset.mimeType || 'video/mp4',
          duration: asset.duration || 0,
          width: asset.width,
          height: asset.height,
        };

        // Validate video
        const validationErrors = validateVideo(videoMetadata);
        if (validationErrors.length > 0) {
          setState(prev => ({
            ...prev,
            status: 'error',
            validationErrors,
            error: validationErrors[0].message,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          source: 'gallery',
          video: videoMetadata,
          status: 'selected',
          validationErrors: [],
        }));
      } else {
        setState(prev => ({ ...prev, status: 'idle' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to select video',
      }));
    }
  }, [requestMediaLibraryPermission, validateVideo]);

  /**
   * Set video from URL
   */
  const setUrlVideo = useCallback((url: string) => {
    // Basic URL validation
    if (!url.trim()) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Please enter a valid URL',
      }));
      return;
    }

    // For URL import, we'll create minimal metadata
    // The actual video details will be fetched by the backend
    const videoMetadata: VideoMetadata = {
      uri: url,
      fileName: 'imported-video.mp4',
      fileSize: 0, // Unknown until downloaded
      mimeType: 'video/mp4',
      duration: 0, // Unknown until processed
    };

    setState(prev => ({
      ...prev,
      source: 'url',
      video: videoMetadata,
      status: 'selected',
      error: null,
      validationErrors: [],
    }));
  }, []);

  /**
   * Update title
   */
  const updateTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, title }));
  }, []);

  /**
   * Update description
   */
  const updateDescription = useCallback((description: string) => {
    setState(prev => ({ ...prev, description }));
  }, []);

  /**
   * Update hashtags from comma-separated string
   */
  const updateHashtags = useCallback((hashtagString: string) => {
    const hashtags = hashtagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, DEFAULT_VIDEO_RULES.maxHashtags);

    setState(prev => ({ ...prev, hashtags }));
  }, []);

  /**
   * Clear selected video
   */
  const clearVideo = useCallback(() => {
    setState(prev => ({
      ...prev,
      video: null,
      source: null,
      status: 'idle',
      error: null,
      validationErrors: [],
      progress: null,
    }));
  }, []);

  /**
   * Reset entire form
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  /**
   * Upload to Cloudinary then create video in backend
   */
  const uploadToCloudinary = useCallback(async (): Promise<boolean> => {
    // Validate form before upload
    const formErrors = validateForm();
    if (formErrors.length > 0) {
      setState(prev => ({
        ...prev,
        status: 'error',
        validationErrors: formErrors,
        error: formErrors[0].message,
      }));
      return false;
    }

    if (!state.video) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'No video selected',
      }));
      return false;
    }

    const startTime = Date.now();
    setState(prev => ({
      ...prev,
      status: 'uploading',
      error: null,
      progress: { loaded: 0, total: 100, percentage: 0, speed: 0, timeRemaining: 0, startTime, currentTime: startTime },
    }));

    try {
      // Step 1: Upload to Cloudinary
      const cloudinaryUrl = getCloudinaryUploadUrl('video');
      const formData = new FormData();

      // Handle file based on source
      if (state.source === 'url') {
        // URL import — send the URL directly to Cloudinary
        formData.append('file', state.video.uri);
      } else {
        // File-based upload (gallery/camera)
        if (Platform.OS === 'web') {
          // On web, fetch the blob URI and convert to File
          const response = await fetch(state.video.uri);
          const blob = await response.blob();
          const file = new File([blob], state.video.fileName || 'video.mp4', { type: state.video.mimeType || 'video/mp4' });
          formData.append('file', file);
        } else {
          // On native, send the URI directly
          formData.append('file', {
            uri: state.video.uri,
            name: state.video.fileName || 'video.mp4',
            type: state.video.mimeType || 'video/mp4',
          } as any);
        }
      }

      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.ugcVideos);
      formData.append('folder', CLOUDINARY_CONFIG.folders.ugcVideos);
      if (state.hashtags.length > 0) {
        formData.append('tags', state.hashtags.join(','));
      }

      // Upload with progress tracking via XMLHttpRequest
      const cloudinaryResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', cloudinaryUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 90); // 90% for upload, 10% for backend
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = event.loaded / elapsed;
            const remaining = speed > 0 ? (event.total - event.loaded) / speed : 0;
            setState(prev => ({
              ...prev,
              progress: {
                loaded: event.loaded,
                total: event.total,
                percentage,
                speed,
                timeRemaining: remaining,
                startTime,
                currentTime: Date.now(),
              },
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Failed to parse Cloudinary response'));
            }
          } else {
            let errMsg = 'Upload to Cloudinary failed';
            try {
              const errData = JSON.parse(xhr.responseText);
              errMsg = errData?.error?.message || errMsg;
            } catch {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
        xhr.timeout = 600000; // 10 minutes

        xhr.send(formData);
      });

      const videoUrl = cloudinaryResult.secure_url;
      if (!videoUrl) {
        throw new Error('No video URL returned from Cloudinary');
      }

      // Update progress — Cloudinary done, now saving to backend
      setState(prev => ({
        ...prev,
        progress: prev.progress ? { ...prev.progress, percentage: 92 } : null,
      }));

      // Step 2: Generate thumbnail
      const thumbnailUrl = generateThumbnailUrl(videoUrl) || undefined;

      // Step 3: Create video record in backend
      const backendResponse = await apiClient.post('/videos', {
        title: state.title,
        description: state.description,
        videoUrl,
        thumbnailUrl,
        contentType: 'ugc',
        tags: state.hashtags,
        products: state.selectedProducts.map(p => p._id),
        duration: cloudinaryResult.duration ? Math.round(cloudinaryResult.duration) : undefined,
        isPublic: true,
      });

      if (!backendResponse.success) {
        throw new Error(backendResponse.error || 'Failed to save video');
      }

      // Success!
      setState(prev => ({
        ...prev,
        status: 'complete' as any,
        progress: prev.progress ? { ...prev.progress, percentage: 100 } : null,
      }));

      return true;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Upload failed. Please try again.',
        progress: null,
      }));
      return false;
    }
  }, [state.video, state.source, state.title, state.description, state.hashtags, state.selectedProducts, validateForm]);

  /**
   * Update upload progress
   * Called by Cloudinary service during upload
   */
  const updateProgress = useCallback((progress: UploadProgress) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  /**
   * Open product selector modal
   */
  const openProductSelector = useCallback(() => {
    setState(prev => ({ ...prev, productSelectorVisible: true }));
  }, []);

  /**
   * Close product selector modal
   */
  const closeProductSelector = useCallback(() => {
    setState(prev => ({ ...prev, productSelectorVisible: false }));
  }, []);

  /**
   * Add products to selection
   * Validates max product limit
   */
  const addProducts = useCallback((products: ProductReference[]) => {
    setState(prev => {
      // Combine existing and new products, removing duplicates
      const existingIds = new Set(prev.selectedProducts.map(p => p._id));
      const newProducts = products.filter(p => !existingIds.has(p._id));

      const combined = [...prev.selectedProducts, ...newProducts];

      // Enforce max limit
      if (combined.length > PRODUCT_TAGGING_RULES.maxProducts) {
        return {
          ...prev,
          error: `You can only tag up to ${PRODUCT_TAGGING_RULES.maxProducts} products per video`,
        };
      }

      return {
        ...prev,
        selectedProducts: combined,
        productSelectorVisible: false,
        error: null,
      };
    });
  }, []);

  /**
   * Remove a product from selection
   */
  const removeProduct = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.filter(p => p._id !== productId),
      error: null,
    }));
  }, []);

  /**
   * Clear all selected products
   */
  const clearProducts = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedProducts: [],
      error: null,
    }));
  }, []);

  return {
    // State
    state,
    permissions,

    // Actions
    selectFromCamera,
    selectFromGallery,
    setUrlVideo,
    updateTitle,
    updateDescription,
    updateHashtags,
    clearVideo,
    reset,
    uploadToCloudinary,
    updateProgress,

    // Product tagging (NEW)
    openProductSelector,
    closeProductSelector,
    addProducts,
    removeProduct,
    clearProducts,

    // Permissions
    requestCameraPermission,
    requestMediaLibraryPermission,

    // Computed
    canUpload: state.status === 'selected' && state.title.trim().length > 0,
    isUploading: state.status === 'uploading' || state.status === 'processing',
  };
}
