/**
 * Blurhash Utility
 *
 * Generates blurhash strings from image URLs or buffers using Sharp.
 * Blurhash is a compact representation of a placeholder for an image,
 * used by expo-image for instant blurred previews while the full image loads.
 *
 * Usage:
 *   import { generateBlurhash, generateBlurhashFromUrl } from './blurhash';
 *   const hash = await generateBlurhashFromUrl('https://example.com/image.jpg');
 */

import { encode } from 'blurhash';
import { logger } from '../config/logger';

let sharp: any;
let sharpAvailable = false;

try {
  sharp = require('sharp');
  sharpAvailable = true;
} catch {
  logger.warn('[BLURHASH] Sharp not available — blurhash generation disabled');
}

const BLURHASH_WIDTH = 32;
const BLURHASH_HEIGHT = 32;
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 3;

/**
 * Generate a blurhash from a raw image buffer.
 */
export async function generateBlurhash(imageBuffer: Buffer): Promise<string | null> {
  if (!sharpAvailable) return null;

  try {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .ensureAlpha()
      .resize(BLURHASH_WIDTH, BLURHASH_HEIGHT, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    return encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      BLURHASH_X_COMPONENTS,
      BLURHASH_Y_COMPONENTS
    );
  } catch (error) {
    logger.error('[BLURHASH] Failed to generate blurhash from buffer:', error);
    return null;
  }
}

/**
 * Generate a blurhash from an image URL.
 * Fetches the image, resizes to a small thumbnail, then encodes.
 */
export async function generateBlurhashFromUrl(imageUrl: string): Promise<string | null> {
  if (!sharpAvailable) return null;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      logger.error(`[BLURHASH] Failed to fetch image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return generateBlurhash(buffer);
  } catch (error) {
    logger.error('[BLURHASH] Failed to generate blurhash from URL:', error);
    return null;
  }
}

/**
 * Generate blurhashes for multiple image URLs in parallel.
 * Returns a map of URL -> blurhash (null if generation failed).
 */
export async function generateBlurhashBatch(
  imageUrls: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  const promises = imageUrls.map(async (url) => {
    const hash = await generateBlurhashFromUrl(url);
    results.set(url, hash);
  });

  await Promise.allSettled(promises);
  return results;
}
