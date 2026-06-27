// @ts-nocheck
import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import { useToastStore } from '@/stores/toastStore';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => Promise<void> | void;
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RatingStars({
  rating,
  maxRating = 5,
  size = 16,
  color = colors.warningScale[400],
  emptyColor = colors.neutral[300],
  showCount = false,
  count = 0,
  interactive = false,
  onRatingChange,
  style
}: RatingStarsProps) {
  const [localRating, setLocalRating] = useState(rating);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const showError = useToastStore((state) => state.showError);

  // Animation value for the star press feedback
  const starScale = useSharedValue(1);

  const renderStars = () => {
    const stars = [];

    for (let i = 1; i <= maxRating; i++) {
      const filled = i <= Math.floor(localRating);
      const half = i === Math.ceil(localRating) && localRating % 1 !== 0;

      const StarComponent = interactive ? AnimatedPressable : View;

      // Animated style for this star
      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: starScale.value }],
      }));

      const handlePress = async () => {
        if (!interactive || !onRatingChange || isLoading) return;

        const newRating = i;
        const currentRequestId = ++requestIdRef.current;
        const previousRating = localRating;

        try {
          setIsLoading(true);

          // Optimistic update - immediate UI feedback
          setLocalRating(newRating);

          // Animate the star
          starScale.value = withSequence(
            withTiming(1.3, { duration: 100 }),
            withSpring(1, { friction: 3, tension: 100 })
          );

          // Call the parent's rating change handler (can be async)
          await onRatingChange(newRating);

          // Check if this request is still valid
          if (currentRequestId !== requestIdRef.current) {
            return;
          }
        } catch (error) {
          // Check if this request is still valid
          if (currentRequestId !== requestIdRef.current) {
            return;
          }

          // Rollback optimistic update
          setLocalRating(previousRating);

          // Show error toast
          showError('Failed to update rating', 3000);
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setIsLoading(false);
          }
        }
      };

      stars.push(
        <StarComponent
          key={i}
          onPress={interactive ? handlePress : undefined}
          disabled={isLoading}
          style={[styles.starWrapper, interactive && styles.starButton]}
        >
          {filled ? (
            <Animated.View style={interactive ? animatedStyle : undefined}>
              <Ionicons name="star" size={size} color={color} />
            </Animated.View>
          ) : half ? (
            <Animated.View style={interactive ? animatedStyle : undefined}>
              <Ionicons name="star-half" size={size} color={color} />
            </Animated.View>
          ) : (
            <Ionicons name="star-outline" size={size} color={emptyColor} />
          )}
        </StarComponent>
      );
    }

    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showCount && count > 0 && (
        <ThemedText style={styles.countText}>
          ({count})
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starWrapper: {
    padding: 0,
  },
  starButton: {
    // Touchable area padding
  },
  countText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});

export default React.memo(RatingStars);
