// ZoomableImage.tsx
// Image component with pinch-to-zoom and double-tap zoom functionality

import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface ZoomableImageProps {
  source: { uri: string };
  style?: any;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

function ZoomableImage({
  source,
  style,
  onLoadStart,
  onLoadEnd,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageSize, setImageSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Handle image load to get actual dimensions
  const handleImageLoad = (event: any) => {
    try {
      // expo-image onLoad event structure varies by platform
      // On native: event.source or event.nativeEvent?.source
      // On web: event.source or event.nativeEvent?.source
      const source = event?.source || event?.nativeEvent?.source;
      
      if (!source) {
        // Fallback: use screen dimensions if source is not available
        setImageSize({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        onLoadEnd?.();
        return;
      }
      
      const { width, height } = source;
      if (!width || !height || isNaN(width) || isNaN(height)) {
        // Fallback: use screen dimensions if dimensions are invalid
        setImageSize({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        onLoadEnd?.();
        return;
      }

      const imageAspectRatio = width / height;
      const screenAspectRatio = SCREEN_WIDTH / SCREEN_HEIGHT;

      let displayWidth = SCREEN_WIDTH;
      let displayHeight = SCREEN_HEIGHT;

      if (imageAspectRatio > screenAspectRatio) {
        // Image is wider
        displayHeight = SCREEN_WIDTH / imageAspectRatio;
      } else {
        // Image is taller
        displayWidth = SCREEN_HEIGHT * imageAspectRatio;
      }

      setImageSize({ width: displayWidth, height: displayHeight });
      onLoadEnd?.();
    } catch (error) {
      // Error handling: fallback to screen dimensions
      setImageSize({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
      onLoadEnd?.();
    }
  };

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Pan gesture for dragging when zoomed
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > MIN_SCALE) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap gesture for zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > MIN_SCALE) {
        // Zoom out
        scale.value = withSpring(MIN_SCALE);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in
        const newScale = 2;
        scale.value = withSpring(newScale);
        savedScale.value = newScale;
      }
    });

  // Compose gestures - pan and pinch simultaneously, but double tap separately
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageContainer, animatedStyle]}>
          <Image
            source={source}
            style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
            contentFit="contain"
            cachePolicy="memory-disk"
            onLoadStart={onLoadStart}
            onLoad={handleImageLoad}
            transition={200}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxWidth: SCREEN_WIDTH * MAX_SCALE,
    maxHeight: SCREEN_HEIGHT * MAX_SCALE,
  },
});

export default React.memo(ZoomableImage);
