import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import CachedImage, { prefetchImages } from '@/components/ui/CachedImage';
import { GestureHandlerRootView, PinchGestureHandler, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/**
 * ImageZoomModal Component
 *
 * Full-screen modal with pinch-to-zoom functionality
 * Allows users to view product images in detail
 */
interface ImageZoomModalProps {
  visible: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  visible,
  onClose,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Prefetch next images for smoother gallery navigation
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const urlsToPrefetch = images.slice(currentIndex + 1, currentIndex + 3).filter(Boolean);
    if (urlsToPrefetch.length > 0) {
      prefetchImages(urlsToPrefetch);
    }
  }, [currentIndex, images]);

  // Zoom animation values
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  /**
   * Pinch gesture handler for zoom
   */
  const pinchGestureHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onActive: (event) => {
      scale.value = Math.max(1, Math.min(event.scale, 4)); // Limit zoom between 1x and 4x
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    },
    onEnd: () => {
      // Reset zoom when gesture ends
      scale.value = withSpring(1);
    },
  });

  /**
   * Animated style for zoom
   */
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: focalX.value },
        { translateY: focalY.value },
        { scale: scale.value },
        { translateX: -focalX.value },
        { translateY: -focalY.value },
      ],
    };
  });

  /**
   * Handle horizontal scroll to change images
   */
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  /**
   * Navigate to specific image
   */
  const navigateToImage = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
  };

  /**
   * Navigate to previous/next image
   */
  const navigatePrevious = () => {
    if (currentIndex > 0) {
      navigateToImage(currentIndex - 1);
    }
  };

  const navigateNext = () => {
    if (currentIndex < images.length - 1) {
      navigateToImage(currentIndex + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.text.primary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={colors.background.primary} />
          </Pressable>

          <ThemedText style={styles.imageCounter}>
            {currentIndex + 1} / {images.length}
          </ThemedText>

          <View style={{ width: 40 }} />
        </View>

        {/* Image Gallery with Pinch Zoom */}
        <GestureHandlerRootView style={styles.galleryContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
          >
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
                  <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    <CachedImage
                      source={{ uri: image }}
                      style={styles.image}
                      contentFit="contain"
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </View>
            ))}
          </ScrollView>
        </GestureHandlerRootView>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={navigatePrevious}
               
              >
                <Ionicons name="chevron-back" size={32} color={colors.background.primary} />
              </Pressable>
            )}

            {currentIndex < images.length - 1 && (
              <Pressable
                style={[styles.navButton, styles.navButtonRight]}
                onPress={navigateNext}
               
              >
                <Ionicons name="chevron-forward" size={32} color={colors.background.primary} />
              </Pressable>
            )}
          </>
        )}

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <View style={styles.thumbnailStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContainer}
            >
              {images.map((image, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.thumbnail,
                    index === currentIndex && styles.thumbnailActive,
                  ]}
                  onPress={() => navigateToImage(index)}
                 
                >
                  <CachedImage
                    source={{ uri: image }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                  />
                  {index === currentIndex && <View style={styles.thumbnailOverlay} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Zoom Hint */}
        <View style={styles.hintContainer}>
          <Ionicons name="expand-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
          <ThemedText style={styles.hintText}>Pinch to zoom</ThemedText>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Gallery
  galleryContainer: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Navigation Buttons
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },

  // Thumbnail Strip
  thumbnailStrip: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.brand.purpleLight,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },

  // Zoom Hint
  hintContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default React.memo(ImageZoomModal);
