/**
 * Cloudinary Configuration
 * Configuration for Cloudinary media upload service
 *
 * Setup Instructions:
 * 1. Create a Cloudinary account at https://cloudinary.com
 * 2. Get your Cloud Name from the dashboard
 * 3. Create an unsigned upload preset:
 *    - Go to Settings > Upload > Upload Presets
 *    - Click "Add Upload Preset"
 *    - Set Signing Mode to "Unsigned"
 *    - Configure allowed formats and transformations
 * 4. Add credentials to .env file
 */

// Cloudinary Configuration
export const CLOUDINARY_CONFIG = {
  // Cloud name from Cloudinary dashboard
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',

  // API Key (optional for unsigned uploads)
  apiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '',

  // Upload Presets
  uploadPresets: {
    // For user-generated video content
    ugcVideos: process.env.EXPO_PUBLIC_CLOUDINARY_UGC_PRESET || 'ugc_videos',

    // For profile images
    profileImages: process.env.EXPO_PUBLIC_CLOUDINARY_PROFILE_PRESET || 'profile_images',

    // For product reviews
    reviewMedia: process.env.EXPO_PUBLIC_CLOUDINARY_REVIEW_PRESET || 'review_media',

    // For general images
    images: process.env.EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET || 'general_images',
  },

  // Upload Folders
  folders: {
    ugcVideos: 'videos/ugc/',
    profileImages: 'images/profiles/',
    reviewMedia: 'images/reviews/',
    generalImages: 'images/general/',
  },

  // Max File Sizes (in bytes)
  maxSizes: {
    video: 100 * 1024 * 1024, // 100MB
    image: 10 * 1024 * 1024, // 10MB
  },

  // Allowed Formats
  allowedFormats: {
    video: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
  },

  // Video Transformation Settings
  videoTransformations: {
    // Auto-optimize quality and format
    quality: 'auto',
    fetchFormat: 'auto',

    // Compression settings
    videoBitrate: '1m', // 1 Mbps
    videoCodec: 'h264',

    // Maximum dimensions
    maxWidth: 1920,
    maxHeight: 1080,
  },

  // Thumbnail Generation Settings
  thumbnailTransformations: {
    width: 320,
    height: 180,
    crop: 'fill',
    quality: 'auto',
    fetchFormat: 'auto',
    gravity: 'auto',
  },

  // Upload Options
  uploadOptions: {
    resourceType: 'auto' as const,
    timeout: 600000, // 10 minutes
    chunkSize: 6000000, // 6MB chunks for large files
    useChunkedUpload: true,
  },
} as const;

// Cloudinary Upload URL
export const getCloudinaryUploadUrl = (resourceType: 'image' | 'video' | 'auto' = 'auto') => {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
};

// Generate thumbnail URL from video URL
export const generateThumbnailUrl = (videoUrl: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}) => {
  const { width = 320, height = 180, crop = 'fill' } = options || {};

  // Extract public ID from Cloudinary URL
  const publicIdMatch = videoUrl.match(/\/v\d+\/(.*?)(?:\.[^.]+)?$/);
  if (!publicIdMatch) return '';

  const publicId = publicIdMatch[1];

  // Generate thumbnail URL with transformations
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/video/upload/w_${width},h_${height},c_${crop},f_auto,q_auto/${publicId}.jpg`;
};

// Generate optimized video URL
export const generateOptimizedVideoUrl = (publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
}) => {
  const { width, height, quality = 'auto' } = options || {};

  let transformations = `q_${quality},f_auto`;

  if (width && height) {
    transformations += `,w_${width},h_${height},c_limit`;
  }

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/video/upload/${transformations}/${publicId}`;
};

// Validate Cloudinary configuration
export const validateCloudinaryConfig = (): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!CLOUDINARY_CONFIG.cloudName || CLOUDINARY_CONFIG.cloudName === 'your-cloud-name') {
    errors.push('Cloudinary cloud name is not configured. Please add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME to .env file');
  }

  if (!CLOUDINARY_CONFIG.uploadPresets.ugcVideos || CLOUDINARY_CONFIG.uploadPresets.ugcVideos === 'ugc_videos') {
    errors.push('Cloudinary upload preset for UGC videos is not configured. Please add EXPO_PUBLIC_CLOUDINARY_UGC_PRESET to .env file');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Default export
export default CLOUDINARY_CONFIG;
