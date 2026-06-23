/**
 * Cloudinary Image Optimization Helper
 *
 * Appends Cloudinary transformation parameters to image URLs for
 * automatic format conversion, quality optimization, and resizing.
 *
 * Only transforms Cloudinary-hosted URLs; returns other URLs unchanged.
 */

const CLOUDINARY_REGEX = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)(\/.*)?(\/.+)$/;

interface CloudinaryOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Quality (1-100 or 'auto') */
  quality?: number | 'auto';
  /** Format ('auto', 'webp', 'avif', 'jpg', 'png') */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  /** Crop mode */
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
  /** Gravity for crop */
  gravity?: 'auto' | 'face' | 'center';
  /** Device pixel ratio (1, 2, 3) */
  dpr?: number;
}

/**
 * Optimizes a Cloudinary image URL with transformation parameters.
 *
 * @example
 * optimizeCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v123/photo.jpg', { width: 400 })
 * // → 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v123/photo.jpg'
 */
export function optimizeCloudinaryUrl(url: string, options: CloudinaryOptions = {}): string {
  if (!url || typeof url !== 'string') return url;

  const match = url.match(CLOUDINARY_REGEX);
  if (!match) return url;

  const [, base, existingTransforms, pathAndFile] = match;

  const transforms: string[] = [];

  // Always use auto format and quality unless explicitly set
  const format = options.format ?? 'auto';
  const quality = options.quality ?? 'auto';

  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);
  if (options.dpr) transforms.push(`dpr_${options.dpr}`);

  const transformStr = transforms.join(',');

  // Insert our transforms after /upload/ and before existing transforms
  return `${base}/${transformStr}${existingTransforms || ''}${pathAndFile}`;
}

/**
 * Convenience: optimize for thumbnail display
 */
export function thumbnailUrl(url: string, size: number = 150): string {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'auto',
  });
}

/**
 * Convenience: optimize for card/list images
 */
export function cardImageUrl(url: string, width: number = 400): string {
  return optimizeCloudinaryUrl(url, {
    width,
    crop: 'limit',
  });
}

/**
 * Convenience: optimize for full-screen display
 */
export function fullScreenUrl(url: string, width: number = 1080): string {
  return optimizeCloudinaryUrl(url, {
    width,
    crop: 'limit',
    dpr: 2,
  });
}
