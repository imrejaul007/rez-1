// @ts-nocheck
/**
 * Lazy Image Component
 * Progressive image loading with blur placeholder, caching, and error handling
 */

import React, { useState, useEffect} from 'react';
import { View, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { Image, ImageProps } from 'expo-image';
import { getCachedImageUri } from '@/hooks/useImagePreload';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================================================
// Types
// ============================================================================

export interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: string | { uri: string } | number;
  placeholder?: string; // Low-quality placeholder URI
  blurhash?: string; // Blurhash string
  fallbackSource?: string | { uri: string }; // Fallback if main source fails
  loadingIndicator?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: Error) => void;
  fadeInDuration?: number; // Fade-in animation duration in ms
  containerStyle?: ViewStyle;
  imageStyle?: ImageStyle;
  priority?: 'low' | 'normal' | 'high'; // Loading priority
  useCache?: boolean; // Use cached version if available
  preload?: boolean; // Preload on mount
}

// ============================================================================
// Default Placeholders
// ============================================================================

const DEFAULT_BLURHASH = 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.'; // Generic gray blurhash

const DefaultErrorPlaceholder = () => (
  <View style={styles.errorContainer}>
    <View style={styles.errorIcon}>
      <Animated.Text style={styles.errorText}>🖼️</Animated.Text>
    </View>
  </View>
);

// ============================================================================
// LazyImage Component
// ============================================================================

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholder,
  blurhash,
  fallbackSource,
  loadingIndicator,
  errorPlaceholder,
  onLoadStart,
  onLoadEnd,
  onError,
  fadeInDuration = 300,
  containerStyle,
  imageStyle,
  style,
  priority = 'normal',
  useCache = true,
  preload = false,
  ...imageProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const isMounted = useIsMounted();

  const opacity = useSharedValue(0);

  // Extract URI from source
  const getSourceUri = (src: string | { uri: string } | number): string | null => {
    if (typeof src === 'string') {
      return src;
    } else if (typeof src === 'object' && 'uri' in src) {
      return src.uri;
    }
    return null;
  };

  const mainSourceUri = getSourceUri(source);
  const fallbackUri = fallbackSource ? getSourceUri(fallbackSource) : null;

  // Load image
  useEffect(() => {
    const loadImage = async () => {
      if (!mainSourceUri) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        // Try to get cached version
        let uri = mainSourceUri;
        if (useCache) {
          uri = await getCachedImageUri(mainSourceUri);
        }

        if (!isMounted()) return;
        setImageUri(uri);
      } catch (err) {
        if (!isMounted()) return;
        setError(true);
        setLoading(false);
      }
    };

    loadImage();
  }, [mainSourceUri, useCache]);

  // Preload image if requested
  useEffect(() => {
    if (preload && mainSourceUri) {
      Image.prefetch(mainSourceUri).catch((err) => {
      });
    }
  }, [preload, mainSourceUri]);

  // Handle load start
  const handleLoadStart = () => {
    if (onLoadStart) {
      onLoadStart();
    }
  };

  // Handle load success
  const handleLoadEnd = () => {
    setLoading(false);

    // Fade in animation
    opacity.value = withTiming(1);

    if (onLoadEnd) {
      onLoadEnd();
    }
  };

  // Handle load error
  const handleError = (err: any) => {

    // Try fallback if available
    if (fallbackUri && !useFallback) {
      setUseFallback(true);
      setImageUri(fallbackUri);
      return;
    }

    setError(true);
    setLoading(false);

    if (onError) {
      onError(err instanceof Error ? err : new Error('Image load failed'));
    }
  };

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, containerStyle]}>
        {errorPlaceholder || <DefaultErrorPlaceholder />}
      </View>
    );
  }

  // Determine source
  const imageSource = imageUri ? { uri: imageUri } : source;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Placeholder/Blurhash */}
      {loading && (
        <View style={styles.placeholderContainer}>
          {placeholder ? (
            <Image
              source={{ uri: placeholder }}
              style={[StyleSheet.absoluteFill, imageStyle, style]}
              contentFit="cover"
            />
          ) : blurhash ? (
            <Image
              source={{ uri: blurhash }}
              placeholder={blurhash}
              style={[StyleSheet.absoluteFill, imageStyle, style]}
              contentFit="cover"
            />
          ) : loadingIndicator ? (
            loadingIndicator
          ) : (
            <Image
              source={{ uri: DEFAULT_BLURHASH }}
              placeholder={DEFAULT_BLURHASH}
              style={[StyleSheet.absoluteFill, imageStyle, style]}
              contentFit="cover"
            />
          )}
        </View>
      )}

      {/* Main Image */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Image
          source={imageSource}
          {...imageProps}
          style={[imageStyle, style]}
          cachePolicy="memory-disk"
          onLoadStart={handleLoadStart}
          onLoad={handleLoadEnd}
          onError={handleError}
          priority={priority}
          placeholder={blurhash || DEFAULT_BLURHASH}
          contentFit={imageProps.contentFit || 'cover'}
          transition={fadeInDuration}
        />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// Optimized LazyImage for Lists
// ============================================================================

export interface LazyImageListItemProps extends LazyImageProps {
  index?: number; // List index for lazy loading
  loadOffset?: number; // Number of items to load ahead
}

/**
 * Optimized LazyImage for FlatList/ScrollView
 * Only loads images when they're within viewport or near it
 */
export const LazyImageListItem: React.FC<LazyImageListItemProps> = React.memo(
  ({ index = 0, loadOffset = 5, ...props }) => {
    const [shouldLoad, setShouldLoad] = useState(index < loadOffset);

    useEffect(() => {
      // Load images progressively
      const timeout = setTimeout(() => {
        setShouldLoad(true);
      }, index * 50); // Stagger loading by 50ms per item

      return () => clearTimeout(timeout);
    }, [index]);

    if (!shouldLoad) {
      return (
        <View style={[styles.container, props.containerStyle]}>
          {props.loadingIndicator || (
            <Image
              source={{ uri: DEFAULT_BLURHASH }}
              placeholder={DEFAULT_BLURHASH}
              style={[props.imageStyle, props.style]}
              contentFit="cover"
            />
          )}
        </View>
      );
    }

    return <LazyImage {...props} />;
  }
);

LazyImageListItem.displayName = 'LazyImageListItem';

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 30,
  },
});

// ============================================================================
// Exports
// ============================================================================

export default LazyImage;
