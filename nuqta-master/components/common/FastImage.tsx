// @ts-nocheck
/**
 * FastImage Component - Optimized Image using expo-image
 *
 * A lightweight image component with built-in caching, off-thread decoding,
 * fade-in transitions, error handling, and loading state.
 * Wraps expo-image for consistent API across the app.
 */

import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';

interface FastImageProps {
  source: string | { uri: string };
  width?: number;
  height?: number;
  fadeDuration?: number;
  showLoader?: boolean;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'fill' | 'center';
  [key: string]: any;
}

const FastImage = memo(({
  source,
  width,
  height,
  fadeDuration = 300,
  showLoader = true,
  style,
  resizeMode = 'cover',
  ...props
}: FastImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Get source URI string
  const rawUri = typeof source === 'string' ? source : source?.uri;
  // SSRF guard: only allow http/https. Other schemes would let untrusted data bypass domain restrictions.
  const imageUri = typeof rawUri === 'string' && !/^https?:\/\//i.test(rawUri) ? null : rawUri;

  // Container style
  const containerStyle = [
    styles.container,
    width && height && { width, height },
    style,
  ];

  // Error fallback
  if (hasError) {
    return (
      <View style={[containerStyle, styles.errorContainer]}>
        <Ionicons name="image-outline" size={Math.min(width || 32, height || 32) / 2} color={colors.neutral[400]} />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {/* Loading indicator */}
      {isLoading && showLoader && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.brand.purple} />
        </View>
      )}

      {/* Image - expo-image with off-thread decoding and disk/memory cache */}
      <ExpoImage
        source={imageUri}
        style={[StyleSheet.absoluteFill, style]}
        contentFit={resizeMode}
        cachePolicy="memory-disk"
        transition={fadeDuration}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        recyclingKey={imageUri}
        {...props}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  const prevUri = typeof prevProps.source === 'object' ? prevProps.source.uri : prevProps.source;
  const nextUri = typeof nextProps.source === 'object' ? nextProps.source.uri : nextProps.source;

  return (
    prevUri === nextUri &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height
  );
});

FastImage.displayName = 'FastImage';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.gray[100],
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
});

export default FastImage;
