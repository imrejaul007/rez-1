// UGC Upload Types
// TypeScript interfaces and types for video upload functionality

/**
 * Available sources for video upload
 */
export type UploadSource = 'camera' | 'gallery' | 'url';

/**
 * Upload status states
 */
export type UploadStatus =
  | 'idle'           // No upload in progress
  | 'selecting'      // User is selecting a video
  | 'selected'       // Video selected, ready to upload
  | 'validating'     // Validating video file
  | 'uploading'      // Upload in progress
  | 'processing'     // Server is processing the video
  | 'complete'       // Upload and processing complete
  | 'error';         // Error occurred

/**
 * Video metadata extracted from file
 */
export interface VideoMetadata {
  uri: string;
  fileName: string;
  fileSize: number;        // in bytes
  mimeType: string;
  duration: number;        // in milliseconds
  width?: number;
  height?: number;
  thumbnailUri?: string;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;      // 0-100
  uploadSpeed?: number;    // bytes per second
  estimatedTimeRemaining?: number; // in seconds
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Product reference for tagging
 * Compatible with ProductSelectorProduct
 */
export interface ProductReference {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  salePrice?: number;
  images: string[];
  store: {
    _id: string;
    name: string;
    logo?: string;
  };
  category?: string;
  rating?: {
    average: number;
    count: number;
  };
  inStock?: boolean;
  tags?: string[];
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

/**
 * Main state for video upload
 */
export interface VideoUploadState {
  // Video selection
  source: UploadSource | null;
  video: VideoMetadata | null;

  // Form data
  title: string;
  description: string;
  hashtags: string[];

  // Product tagging (NEW)
  selectedProducts: ProductReference[];
  productSelectorVisible: boolean;

  // Upload state
  status: UploadStatus;
  progress: UploadProgress | null;

  // Error handling
  error: string | null;
  validationErrors: ValidationError[];

  // Cloudinary response
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}

/**
 * Camera recording options
 */
export interface CameraRecordingOptions {
  maxDuration: number;     // in seconds
  quality: 'low' | 'medium' | 'high';
}

/**
 * Gallery picker options
 */
export interface GalleryPickerOptions {
  mediaTypes: 'Videos';
  allowsEditing: boolean;
  quality: number;         // 0-1
}

/**
 * URL import options
 */
export interface UrlImportOptions {
  url: string;
  validateUrl: boolean;
}

/**
 * Video validation rules
 */
export interface VideoValidationRules {
  maxFileSize: number;         // in MB
  maxDuration: number;         // in seconds
  minDuration: number;         // in seconds
  allowedFormats: string[];    // ['mp4', 'mov', etc.]
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxHashtags: number;
}

/**
 * Default validation rules
 */
export const DEFAULT_VIDEO_RULES: VideoValidationRules = {
  maxFileSize: 100,              // 100MB
  maxDuration: 180,              // 3 minutes
  minDuration: 3,                // 3 seconds
  allowedFormats: ['mp4', 'mov', 'avi', 'mkv'],
  maxTitleLength: 100,
  maxDescriptionLength: 500,
  maxHashtags: 10,
};

/**
 * Product tagging constants
 */
export const PRODUCT_TAGGING_RULES = {
  maxProducts: 10,               // Maximum 10 products per video
  minProducts: 0,                // Products are optional
};

/**
 * Upload result from Cloudinary
 */
export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  duration: number;
  width: number;
  height: number;
  bytes: number;
  thumbnailUrl?: string;
}

/**
 * API request payload for creating UGC post
 */
export interface CreateUGCPostPayload {
  title: string;
  description: string;
  hashtags: string[];
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
  cloudinaryPublicId: string;
  products?: string[];  // Array of product _id values (optional, max 10)
}

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Permissions state
 */
export interface PermissionsState {
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
}
