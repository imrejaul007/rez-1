// GalleryImagePreloader.tsx
// Preloads gallery images for better performance

import { useEffect } from 'react';
import { Image } from 'expo-image';
import logger from '@/utils/logger';
import { GalleryItem } from '@/services/storeGalleryApi';

interface GalleryImagePreloaderProps {
  items: GalleryItem[];
  preloadCount?: number; // Number of images to preload ahead
}

export function useGalleryImagePreloader(
  items: GalleryItem[],
  currentIndex: number,
  preloadCount: number = 2
) {
  useEffect(() => {
    if (items.length === 0) return;

    // Preload current image and next/previous images
    const indicesToPreload = new Set<number>([currentIndex]);
    
    // Preload next images
    for (let i = 1; i <= preloadCount && currentIndex + i < items.length; i++) {
      indicesToPreload.add(currentIndex + i);
    }
    
    // Preload previous images
    for (let i = 1; i <= preloadCount && currentIndex - i >= 0; i++) {
      indicesToPreload.add(currentIndex - i);
    }

    // Preload images
    indicesToPreload.forEach((index) => {
      const item = items[index];
      if (item) {
        const imageUrl = item.type === 'video' ? (item.thumbnail || item.url) : item.url;
        if (imageUrl) {
          Image.prefetch(imageUrl, {
            cachePolicy: 'memory-disk',
          }).catch((error) => {
            // Silently fail - preloading is not critical
            logger.debug('Image preload failed:', error);
          });
        }
      }
    });
  }, [items, currentIndex, preloadCount]);
}

export default function GalleryImagePreloader({
  items,
  preloadCount = 2,
}: GalleryImagePreloaderProps) {
  // This component can be used to preload all images at once
  useEffect(() => {
    items.forEach((item) => {
      const imageUrl = item.type === 'video' ? (item.thumbnail || item.url) : item.url;
      if (imageUrl) {
        Image.prefetch(imageUrl, {
          cachePolicy: 'memory-disk',
        }).catch(() => {
          // Silently fail
        });
      }
    });
  }, [items, preloadCount]);

  return null; // This is a utility component, no UI
}

