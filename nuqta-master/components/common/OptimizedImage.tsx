/**
 * Optimized Image Component
 *
 * High-performance image component with:
 * - Lazy loading with IntersectionObserver-like behavior
 * - Progressive loading (blur-up technique)
 * - Intelligent caching with expiry
 * - Automatic resizing and compression
 * - Error handling with fallback
 * - Loading placeholders
 * - Memory-efficient image handling
 * - Network-aware loading
 * - Responsive image sizing
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  ImageStyle,
  ViewStyle,
  Platform,
  Dimensions} from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import imagePreloadService, { PreloadPriority } from '@/services/imagePreloadService';
import imageCacheService from '@/services/imageCacheService';
import {
  getImageQualityProfile,
  getOptimizedImageUrl,
  getBlurPlaceholderUrl,
  detectWebPSupport,
  NetworkType,
  ImageContext,
} from '@/config/imageQuality';

interface OptimizedImageProps {
  source: string | { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  width?: number;
  height?: number;
  blurhash?: string;
  placeholder?: string;
  fallback?: string;
  lazy?: boolean;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
  showLoadingIndicator?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
  progressive?: boolean;
  thumbnailUri?: string;
  componentId?: string;
  enableMemoryCache?: boolean;
  preload?: boolean;
  context?: ImageContext;
  enableWebP?: boolean;
  enableDiskCache?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  width,
  height,
  blurhash,
  placeholder,
  fallback,
  lazy = true,
  priority = false,
  onLoad,
  onError,
  showLoadingIndicator = true,
  quality = 'auto',
  cache = 'default',
  progressive = true,
  thumbnailUri,
  componentId,
  enableMemoryCache = true,
  preload = false,
  context = ImageContext.CARD,
  enableWebP = true,
  enableDiskCache = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'wifi' | 'cellular' | 'offline'>('wifi');
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [supportsWebP] = useState(detectWebPSupport());
  const fadeAnim = useSharedValue(0);
  const thumbnailFadeAnim = useSharedValue(1);
  const mountedRef = useRef(true);
  const loadStartTime = useRef<number>(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Cancel preloads for this component
      if (componentId) {
        imagePreloadService.cancelPreloads(componentId);
      }
    };
  }, [componentId]);

  /**
   * Monitor network quality
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected) {
        setNetworkQuality('offline');
      } else if (state.type === 'wifi') {
        setNetworkQuality('wifi');
      } else {
        setNetworkQuality('cellular');
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Determine actual quality based on network and settings
   */
  const effectiveQuality = useMemo(() => {
    if (quality === 'auto') {
      if (networkQuality === 'wifi') return 'high';
      if (networkQuality === 'cellular') return 'medium';
      return 'low';
    }
    return quality;
  }, [quality, networkQuality]);

  /**
   * Load from disk cache and preload image if requested
   */
  useEffect(() => {
    const loadImage = async () => {
      const uri = typeof source === 'string' ? source : source.uri;

      // Try to get from cache first
      if (enableDiskCache) {
        const cached = await imageCacheService.get(uri);
        if (cached !== uri) {
          setCachedImageUri(cached);
        }
      }

      // Preload if requested
      if (preload && !lazy) {
        const preloadPriority = priority
          ? PreloadPriority.CRITICAL
          : PreloadPriority.HIGH;

        if (enableDiskCache) {
          await imageCacheService.preload(uri, preloadPriority);
        } else {
          await imagePreloadService.preload(uri, preloadPriority, componentId);
        }
      }
    };

    loadImage();
  }, [preload, lazy, source, priority, componentId, enableDiskCache]);

  /**
   * Handle lazy loading with improved timing
   */
  useEffect(() => {
    if (lazy && !priority && !shouldLoad) {
      // Simulate intersection observer - load after a short delay
      // Use different delays based on priority
      const delay = 100;

      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setShouldLoad(true);
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [lazy, priority, shouldLoad]);

  /**
   * Get network type from quality
   */
  const getNetworkType = (): NetworkType => {
    if (networkQuality === 'offline') return NetworkType.OFFLINE;
    if (networkQuality === 'wifi') return NetworkType.WIFI;
    return NetworkType.CELLULAR_4G; // Default to 4G for cellular
  };

  /**
   * Get optimized image URL with smart parameters using new config
   */
  const getOptimizedUrl = (url: string, isThumbnail = false): string => {
    const dpr = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
      : 1;

    // Use quality config for optimization
    const imageContext = isThumbnail ? ImageContext.PREVIEW : context;

    // Determine format based on WebP support
    let format: 'webp' | 'jpeg' | 'png' | 'auto' = 'auto';
    if (enableWebP && supportsWebP) {
      format = 'webp';
    } else {
      format = 'jpeg';
    }

    return getOptimizedImageUrl(url, {
      context: imageContext,
      width: isThumbnail ? Math.floor((width || 200) * 0.3) : width,
      height: isThumbnail ? Math.floor((height || 200) * 0.3) : height,
      format,
      networkType: getNetworkType(),
      dpr,
    });
  };

  /**
   * Get image source
   */
  const getImageSource = () => {
    if (hasError && fallback) {
      return { uri: fallback };
    }

    if (!shouldLoad && placeholder) {
      return { uri: placeholder };
    }

    // Use cached URI if available
    if (cachedImageUri) {
      return { uri: cachedImageUri, cache };
    }

    if (typeof source === 'string') {
      return { uri: getOptimizedUrl(source), cache };
    }

    return { ...source, uri: getOptimizedUrl(source.uri), cache };
  };

  /**
   * Handle image load
   */
  const handleLoad = () => {
    if (!mountedRef.current) return;

    const loadDuration = Date.now() - loadStartTime.current;

    setIsLoading(false);

    // Fade out thumbnail and fade in main image
    if (progressive && thumbnailLoaded) {
      thumbnailFadeAnim.value = withTiming(0, { duration: 300 });
      fadeAnim.value = withTiming(1, { duration: 300 });
    } else {
      // Just fade in main image
      fadeAnim.value = withTiming(1, { duration: 300 });
    }

    onLoad?.();
  };

  /**
   * Handle thumbnail load
   */
  const handleThumbnailLoad = () => {
    if (!mountedRef.current) return;
    setThumbnailLoaded(true);
  };

  /**
   * Handle image error
   */
  const handleError = (error: any) => {
    if (!mountedRef.current) return;

    setIsLoading(false);
    setHasError(true);

    onError?.(error);
  };

  /**
   * Get container dimensions
   */
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.container,
      ...containerStyle,
    };

    if (width) baseStyle.width = width;
    if (height) baseStyle.height = height;

    return baseStyle;
  };

  /**
   * Render loading state
   */
  const renderLoading = () => {
    if (!isLoading || !showLoadingIndicator) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  };

  /**
   * Render error state
   */
  const renderError = () => {
    if (!hasError || fallback) return null;

    return (
      <View style={styles.errorContainer}>
        <Ionicons name="image-outline" size={48} color="#999" />
      </View>
    );
  };

  /**
   * Start load timing
   */
  useEffect(() => {
    if (shouldLoad && isLoading) {
      loadStartTime.current = Date.now();
    }
  }, [shouldLoad, isLoading]);

  return (
    <View style={getContainerStyle()}>
      {/* Thumbnail for progressive loading */}
      {progressive && (thumbnailUri || placeholder) && !hasError && isLoading && (
        <Animated.Image
          source={{ uri: getOptimizedUrl(thumbnailUri || placeholder || '', true) }}
          style={[
            StyleSheet.absoluteFill,
            styles.thumbnail,
            {
              opacity: thumbnailFadeAnim,
            },
          ]}
          resizeMode={resizeMode}
          onLoad={handleThumbnailLoad}
          blurRadius={Platform.OS === 'ios' ? 10 : 5}
        />
      )}

      {/* Main image */}
      {shouldLoad && !hasError && (
        <Animated.Image
          source={getImageSource()}
          style={[
            StyleSheet.absoluteFill,
            style,
            {
              opacity: fadeAnim,
            },
          ]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          onLoadStart={() => {
            loadStartTime.current = Date.now();
          }}
          accessibilityIgnoresInvertColors={true}
          accessible={false}
          fadeDuration={0}
        />
      )}

      {/* Loading indicator */}
      {renderLoading()}

      {/* Error placeholder */}
      {renderError()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    opacity: 0.8,
  },
  placeholder: {
    opacity: 0.5,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default React.memo(OptimizedImage);
