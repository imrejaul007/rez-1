// @ts-nocheck
/**
 * Image Preload Hook
 * Preloads images for offline access and improved performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ============================================================================
// Types
// ============================================================================

export interface ImagePreloadOptions {
  priority?: 'low' | 'medium' | 'high';
  cache?: boolean; // Cache to disk
  headers?: Record<string, string>;
}

export interface PreloadResult {
  success: boolean;
  uri: string;
  cachedUri?: string;
  error?: Error;
}

export interface UseImagePreloadResult {
  preload: (uris: string[], options?: ImagePreloadOptions) => Promise<PreloadResult[]>;
  preloadSingle: (uri: string, options?: ImagePreloadOptions) => Promise<PreloadResult>;
  isPreloading: boolean;
  progress: number; // 0-100
  errors: Error[];
  clearCache: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const IMAGE_CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const CACHE_INDEX_KEY = 'image_cache_index';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CONCURRENT_DOWNLOADS = 3;

// ============================================================================
// Cache Management
// ============================================================================

interface CacheIndex {
  [url: string]: {
    localUri: string;
    timestamp: number;
    size: number;
  };
}

let cacheIndex: CacheIndex = {};
let cacheInitialized = false;

/**
 * Initialize cache directory and index
 */
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;

  try {
    // Create cache directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
    }

    // Load cache index
    const indexStr = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (indexStr) {
      cacheIndex = JSON.parse(indexStr);
    }

    cacheInitialized = true;
    devLog.log('[ImagePreload] Cache initialized');
  } catch (error) {
    devLog.error('[ImagePreload] Failed to initialize cache:', error);
  }
}

/**
 * Save cache index
 */
async function saveCacheIndex(): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(cacheIndex));
  } catch (error) {
    devLog.error('[ImagePreload] Failed to save cache index:', error);
  }
}

/**
 * Get cached image URI
 */
function getCachedUri(url: string): string | null {
  const cached = cacheIndex[url];
  if (!cached) return null;

  // Check if file still exists
  return cached.localUri;
}

/**
 * Generate cache file name from URL
 */
function getCacheFileName(url: string): string {
  const hash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
  return `${Math.abs(hash)}.${extension}`;
}

/**
 * Get total cache size
 */
async function getCacheSize(): Promise<number> {
  let totalSize = 0;
  for (const entry of Object.values(cacheIndex)) {
    totalSize += entry.size;
  }
  return totalSize;
}

/**
 * Evict old cache entries if size exceeds limit
 */
async function evictOldEntries(): Promise<void> {
  const totalSize = await getCacheSize();

  if (totalSize < MAX_CACHE_SIZE) return;

  devLog.log('[ImagePreload] Cache size exceeded, evicting old entries...');

  // Sort by timestamp (oldest first)
  const entries = Object.entries(cacheIndex).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  );

  let currentSize = totalSize;
  const targetSize = MAX_CACHE_SIZE * 0.8; // Target 80% of max

  for (const [url, entry] of entries) {
    if (currentSize <= targetSize) break;

    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
      delete cacheIndex[url];
      currentSize -= entry.size;
    } catch (error) {
      devLog.error('[ImagePreload] Failed to delete cached file:', error);
    }
  }

  await saveCacheIndex();
  devLog.log('[ImagePreload] Eviction complete');
}

// ============================================================================
// Preload Functions
// ============================================================================

/**
 * Preload single image to memory
 */
async function preloadToMemory(uri: string): Promise<PreloadResult> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // Web: use HTML Image
      const img = new window.Image();
      img.onload = () => {
        resolve({ success: true, uri });
      };
      img.onerror = (error) => {
        resolve({ success: false, uri, error: new Error('Failed to load image') });
      };
      img.src = uri;
    } else {
      // Native: use React Native Image.prefetch
      Image.prefetch(uri)
        .then(() => {
          resolve({ success: true, uri });
        })
        .catch((error) => {
          resolve({ success: false, uri, error });
        });
    }
  });
}

/**
 * Download and cache image to disk
 */
async function downloadAndCache(
  uri: string,
  options: ImagePreloadOptions = {}
): Promise<PreloadResult> {
  await initializeCache();

  try {
    // Check if already cached
    const cachedUri = getCachedUri(uri);
    if (cachedUri) {
      const fileInfo = await FileSystem.getInfoAsync(cachedUri);
      if (fileInfo.exists) {
        devLog.log('[ImagePreload] Image already cached:', uri);
        return { success: true, uri, cachedUri };
      }
    }

    // Download to cache directory
    const fileName = getCacheFileName(uri);
    const localUri = `${IMAGE_CACHE_DIR}${fileName}`;

    devLog.log('[ImagePreload] Downloading image:', uri);

    const downloadResult = await FileSystem.downloadAsync(uri, localUri, {
      headers: options.headers,
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    const size = fileInfo.size || 0;

    // Update cache index
    cacheIndex[uri] = {
      localUri,
      timestamp: Date.now(),
      size,
    };

    await saveCacheIndex();
    await evictOldEntries();

    devLog.log('[ImagePreload] Image cached:', uri);

    return { success: true, uri, cachedUri: localUri };
  } catch (error) {
    devLog.error('[ImagePreload] Failed to download image:', error);
    return {
      success: false,
      uri,
      error: error instanceof Error ? error : new Error('Download failed'),
    };
  }
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for preloading images
 *
 * @example
 * ```tsx
 * const { preload, isPreloading, progress } = useImagePreload();
 *
 * useEffect(() => {
 *   preload([...productImageUrls], { cache: true });
 * }, [productImageUrls]);
 * ```
 */
export function useImagePreload(): UseImagePreloadResult {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Error[]>([]);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Preload single image
   */
  const preloadSingle = useCallback(
    async (uri: string, options: ImagePreloadOptions = {}): Promise<PreloadResult> => {
      const { cache = false } = options;

      if (cache && Platform.OS !== 'web') {
        return downloadAndCache(uri, options);
      } else {
        return preloadToMemory(uri);
      }
    },
    []
  );

  /**
   * Preload multiple images with concurrency control
   */
  const preload = useCallback(
    async (uris: string[], options: ImagePreloadOptions = {}): Promise<PreloadResult[]> => {
      if (uris.length === 0) return [];

      setIsPreloading(true);
      setProgress(0);
      setErrors([]);

      const results: PreloadResult[] = [];
      const newErrors: Error[] = [];

      try {
        // Process in batches to avoid overwhelming the system
        const batches: string[][] = [];
        for (let i = 0; i < uris.length; i += MAX_CONCURRENT_DOWNLOADS) {
          batches.push(uris.slice(i, i + MAX_CONCURRENT_DOWNLOADS));
        }

        let completed = 0;

        for (const batch of batches) {
          const batchResults = await Promise.all(
            batch.map((uri) => preloadSingle(uri, options))
          );

          results.push(...batchResults);

          // Collect errors
          batchResults.forEach((result) => {
            if (!result.success && result.error) {
              newErrors.push(result.error);
            }
          });

          completed += batch.length;

          if (isMounted.current) {
            setProgress((completed / uris.length) * 100);
          }
        }

        if (isMounted.current) {
          setErrors(newErrors);
        }
      } catch (error) {
        devLog.error('[ImagePreload] Preload failed:', error);
      } finally {
        if (isMounted.current) {
          setIsPreloading(false);
          setProgress(100);
        }
      }

      return results;
    },
    [preloadSingle]
  );

  /**
   * Clear image cache
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });

      cacheIndex = {};
      await AsyncStorage.removeItem(CACHE_INDEX_KEY);

      devLog.log('[ImagePreload] Cache cleared');
    } catch (error) {
      devLog.error('[ImagePreload] Failed to clear cache:', error);
    }
  }, []);

  return {
    preload,
    preloadSingle,
    isPreloading,
    progress,
    errors,
    clearCache,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get cached image URI if available
 */
export async function getCachedImageUri(url: string): Promise<string> {
  await initializeCache();
  return getCachedUri(url) || url;
}

/**
 * Preload critical images on app start
 */
export async function preloadCriticalImages(urls: string[]): Promise<void> {
  devLog.log('[ImagePreload] Preloading critical images...');

  const results = await Promise.all(
    urls.map((url) => preloadToMemory(url))
  );

  const successful = results.filter((r) => r.success).length;
  devLog.log(`[ImagePreload] Preloaded ${successful}/${urls.length} critical images`);
}

export default useImagePreload;
