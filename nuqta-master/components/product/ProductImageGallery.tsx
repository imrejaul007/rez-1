import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import VideoPlayer from './VideoPlayer';
import ImageZoomModal from './ImageZoomModal';
import { colors } from '@/constants/theme';

/**
 * ProductImageGallery Component
 *
 * Enhanced image gallery with:
 * - Horizontal scrolling main images
 * - Thumbnail navigation strip
 * - Video support
 * - Full-screen zoom capability
 * - Indicators and badges
 */

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
}

interface ProductImageGalleryProps {
  images: string[];
  videos?: string[];
  onImagePress?: (index: number) => void;
  showThumbnails?: boolean;
  autoPlayVideo?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  videos = [],
  onImagePress,
  showThumbnails = true,
  autoPlayVideo = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);
  const thumbnailScrollRef = useRef<ScrollView>(null);

  // Combine images and videos into media items
  const mediaItems: MediaItem[] = [
    ...images.map(uri => ({ type: 'image' as const, uri })),
    ...videos.map(uri => ({ type: 'video' as const, uri })),
  ];

  // Get only image URIs for zoom modal
  const imageUris = mediaItems
    .filter(item => item.type === 'image')
    .map(item => item.uri);

  /**
   * Handle main scroll to update current index
   */
  const handleMainScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    if (index !== currentIndex) {
      setCurrentIndex(index);

      // Auto-scroll thumbnails to keep selected one visible
      if (thumbnailScrollRef.current && showThumbnails) {
        thumbnailScrollRef.current.scrollTo({
          x: Math.max(0, index * 80 - SCREEN_WIDTH / 2 + 40),
          animated: true,
        });
      }
    }
  };

  /**
   * Navigate to specific media item
   */
  const navigateToMedia = (index: number) => {
    mainScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  };

  /**
   * Handle image tap
   */
  const handleImagePress = (index: number) => {
    const currentItem = mediaItems[index];

    if (currentItem.type === 'image') {
      // Open zoom modal for images
      const imageIndex = imageUris.findIndex(uri => uri === currentItem.uri);
      setShowZoomModal(true);

      if (onImagePress) {
        onImagePress(imageIndex);
      }
    }
    // Videos have their own controls, no action on tap
  };

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="image-outline" size={64} color={colors.neutral[300]} />
        <ThemedText style={styles.emptyText}>No media available</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Media Gallery */}
      <ScrollView
        ref={mainScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMainScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {mediaItems.map((item, index) => (
          <View key={index} style={styles.mediaContainer}>
            {item.type === 'image' ? (
              <Pressable
               
                onPress={() => handleImagePress(index)}
                style={styles.imageTouchable}
              >
                <CachedImage
                  source={item.uri}
                  style={styles.image}
                  contentFit="cover"
                />

                {/* Zoom Hint Overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.4)']}
                  style={styles.zoomHintOverlay}
                >
                  <View style={styles.zoomHint}>
                    <Ionicons name="expand-outline" size={16} color={colors.background.primary} />
                    <ThemedText style={styles.zoomHintText}>Tap to zoom</ThemedText>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.videoContainer}>
                <VideoPlayer
                  uri={item.uri}
                  width={SCREEN_WIDTH}
                  height={400}
                  autoPlay={autoPlayVideo && index === currentIndex}
                  loop={true}
                  muted={false}
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Media Indicators */}
      <View style={styles.indicatorsContainer}>
        {mediaItems.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
          />
        ))}
      </View>

      {/* Counter Badge */}
      <View style={styles.counterBadge}>
        <ThemedText style={styles.counterText}>
          {currentIndex + 1}/{mediaItems.length}
        </ThemedText>
      </View>

      {/* Thumbnail Strip */}
      {showThumbnails && mediaItems.length > 1 && (
        <View style={styles.thumbnailStrip}>
          <ScrollView
            ref={thumbnailScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {mediaItems.map((item, index) => (
              <Pressable
                key={index}
                style={[
                  styles.thumbnail,
                  index === currentIndex && styles.thumbnailActive,
                ]}
                onPress={() => navigateToMedia(index)}
               
              >
                <CachedImage
                  source={item.uri}
                  style={styles.thumbnailImage}
                  contentFit="cover"
                />

                {/* Type Badge */}
                {item.type === 'video' && (
                  <View style={styles.thumbnailVideoBadge}>
                    <Ionicons name="play" size={12} color={colors.background.primary} />
                  </View>
                )}

                {/* Active Border */}
                {index === currentIndex && (
                  <View style={styles.thumbnailActiveBorder} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Image Zoom Modal */}
      {imageUris.length > 0 && (
        <ImageZoomModal
          visible={showZoomModal}
          onClose={() => setShowZoomModal(false)}
          images={imageUris}
          initialIndex={Math.max(0, imageUris.findIndex(uri => uri === mediaItems[currentIndex]?.uri))}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    position: 'relative',
  },

  // Empty State
  emptyContainer: {
    width: SCREEN_WIDTH,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.neutral[400],
    fontWeight: '500',
  },

  // Main Gallery
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: 400,
    backgroundColor: colors.neutral[100],
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.text.primary,
  },

  // Zoom Hint
  zoomHintOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  zoomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  zoomHintText: {
    fontSize: 12,
    color: colors.background.primary,
    fontWeight: '500',
  },

  // Indicators
  indicatorsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: colors.brand.purpleLight,
    width: 24,
  },

  // Counter Badge
  counterBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Thumbnails
  thumbnailStrip: {
    backgroundColor: colors.background.primary,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailActive: {
    borderColor: colors.brand.purpleLight,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailVideoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailActiveBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
    borderRadius: 6,
  },
});

export default React.memo(ProductImageGallery);
