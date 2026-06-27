// @ts-nocheck
import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform, PixelRatio } from 'react-native';
import { Image as ExpoImage, ImageStyle } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ShimmerSkeleton } from './ShimmerSkeleton';
import { optimizeCloudinaryUrl } from '@/utils/cloudinaryHelper';
import { colors } from '@/constants/theme';

const MAX_RETRIES = 2;

export interface CachedImageProps {
  source: string | { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  width?: number;
  height?: number;
  contentFit?: 'cover' | 'contain' | 'fill' | 'center' | 'none';
  placeholder?: string;
  transition?: number;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  priority?: 'low' | 'normal' | 'high';
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackInitials?: string;
  fallbackIconSize?: number;
  showShimmer?: boolean;
  borderRadius?: number;
  recyclingKey?: string;
  accessibilityLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const CachedImage = memo(({
  source,
  style,
  containerStyle,
  width,
  height,
  contentFit = 'cover',
  placeholder,
  transition = 200,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  fallbackIcon = 'image-outline',
  fallbackInitials,
  fallbackIconSize,
  showShimmer = true,
  borderRadius = 0,
  recyclingKey,
  accessibilityLabel,
  onLoad,
  onError,
}: CachedImageProps) => {
  const isLocalAsset = typeof source === 'number';
  const [isLoading, setIsLoading] = useState(!isLocalAsset);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [useRawUrl, setUseRawUrl] = useState(false);

  const rawUri = useMemo(() => {
    if (typeof source === 'number') return source;
    return typeof source === 'string' ? source : source?.uri;
  }, [source]);

  const imageUri = useMemo(() => {
    if (typeof rawUri === 'number') return rawUri;
    if (!rawUri) return rawUri;
    // If transformed URL failed, fall back to raw URL (no f_auto/q_auto)
    if (useRawUrl) return rawUri;
    // Auto-optimize Cloudinary URLs with f_auto, q_auto, and width-based resizing
    const targetWidth = width ? Math.round(width * PixelRatio.get()) : undefined;
    return optimizeCloudinaryUrl(rawUri, {
      width: targetWidth,
      crop: targetWidth ? 'limit' : undefined,
    });
  }, [rawUri, width, useRawUrl]);

  // Reset state when source changes
  useEffect(() => {
    setIsLoading(!isLocalAsset);
    setHasError(false);
    setUseRawUrl(false);
    retryCountRef.current = 0;
    setRetryKey(0);
  }, [rawUri, isLocalAsset]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    retryCountRef.current = 0;
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      setRetryKey(prev => prev + 1);
      return;
    }
    // After retries exhausted, try raw URL (without Cloudinary transformations) once
    if (!useRawUrl && typeof rawUri === 'string' && rawUri.includes('res.cloudinary.com')) {
      setUseRawUrl(true);
      retryCountRef.current = 0;
      setRetryKey(prev => prev + 1);
      return;
    }
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError, useRawUrl, rawUri]);

  const sizeStyle = useMemo(() => {
    const s: ViewStyle = {};
    if (width) s.width = width;
    if (height) s.height = height;
    // If no explicit width/height props, extract from style to size the container
    if (!width || !height) {
      const flatStyle = StyleSheet.flatten(style) as Record<string, any> | undefined;
      if (flatStyle) {
        if (!width && flatStyle.width) s.width = flatStyle.width;
        if (!height && flatStyle.height) s.height = flatStyle.height;
      }
    }
    return s;
  }, [width, height, style]);

  const iconSize = fallbackIconSize || Math.min(width || 32, height || 32) / 2.5;

  if (hasError || (!imageUri && !isLocalAsset)) {
    return (
      <View
        style={[
          styles.container,
          sizeStyle,
          { borderRadius },
          styles.errorContainer,
          containerStyle,
        ]}
      >
        {fallbackInitials ? (
          <View style={[styles.initialsContainer, { borderRadius }]}>
            <View style={styles.initialsCircle}>
              <Ionicons name="person" size={iconSize} color={colors.neutral[400]} />
            </View>
          </View>
        ) : (
          <Ionicons name={fallbackIcon} size={iconSize} color={colors.neutral[400]} />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isLocalAsset && styles.localAssetContainer,
        sizeStyle,
        { borderRadius },
        containerStyle,
      ]}
    >
      {isLoading && showShimmer && !isLocalAsset && (
        <View style={[StyleSheet.absoluteFill, { borderRadius }]}>
          <ShimmerSkeleton
            width="100%"
            height={height || 100}
            borderRadius={borderRadius}
            variant="rect"
          />
        </View>
      )}

      <ExpoImage
        key={retryKey}
        source={imageUri}
        style={[StyleSheet.absoluteFill, { borderRadius }, style]}
        contentFit={contentFit}
        cachePolicy={cachePolicy}
        transition={isLocalAsset ? 0 : transition}
        placeholder={placeholder ? { blurhash: placeholder } : undefined}
        priority={priority}
        recyclingKey={recyclingKey || (typeof imageUri === 'string' ? imageUri : undefined)}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
        {...(Platform.OS === 'web' && typeof imageUri === 'string' ? { crossOrigin: 'anonymous' } : {})}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  const getUri = (s: CachedImageProps['source']) =>
    typeof s === 'number' ? s : typeof s === 'string' ? s : s?.uri;
  return (
    getUri(prevProps.source) === getUri(nextProps.source) &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.priority === nextProps.priority &&
    prevProps.borderRadius === nextProps.borderRadius &&
    prevProps.contentFit === nextProps.contentFit &&
    prevProps.style === nextProps.style &&
    prevProps.containerStyle === nextProps.containerStyle &&
    prevProps.showShimmer === nextProps.showShimmer
  );
});

CachedImage.displayName = 'CachedImage';

export function prefetchImages(urls: string[]): void {
  ExpoImage.prefetch(urls);
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  localAssetContainer: {
    backgroundColor: 'transparent',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  initialsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  initialsCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CachedImage;
