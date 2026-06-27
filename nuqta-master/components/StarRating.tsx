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
import { StarRatingProps } from '@/types/reviews';
import { colors } from '@/constants/theme';
import { useToastStore } from '@/stores/toastStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 'medium',
  interactive = false,
  onRatingChange,
  showHalf = true,
}) => {
  const [localRating, setLocalRating] = useState(rating);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const showError = useToastStore((state) => state.showError);

  // Animation value for the rating change
  const ratingScale = useSharedValue(1);

  const getStarSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 18;
      case 'large':
        return 24;
      default:
        return 18;
    }
  };

  const starSize = getStarSize();
  const fullStars = Math.floor(localRating);
  const hasHalfStar = showHalf && localRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  // Animated style for rating change feedback
  const animatedStarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ratingScale.value }],
  }));

  const handleStarPress = async (starIndex: number) => {
    if (!interactive || !onRatingChange) return;

    const newRating = starIndex + 1;
    const currentRequestId = ++requestIdRef.current;
    const previousRating = localRating;

    try {
      setIsLoading(true);

      // Optimistic update - immediate UI feedback
      setLocalRating(newRating);

      // Animate the star
      ratingScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { friction: 3, tension: 100 })
      );

      // Call the parent's rating change handler
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

  const renderStar = (type: 'full' | 'half' | 'empty', index: number) => {
    let iconName: any;
    let color: string;

    switch (type) {
      case 'full':
        iconName = 'star';
        color = '#FFB800';
        break;
      case 'half':
        iconName = 'star-half';
        color = '#FFB800';
        break;
      case 'empty':
        iconName = 'star-outline';
        color = colors.neutral[300];
        break;
    }

    const StarComponent = interactive ? AnimatedPressable : View;
    const starProps = interactive
      ? {
          onPress: () => handleStarPress(index),
          disabled: isLoading,
          style: styles.starButton,
        }
      : {};

    const starIcon = (
      <Ionicons name={iconName} size={starSize} color={color} />
    );

    return (
      <StarComponent key={`${type}-${index}`} {...starProps}>
        {type === 'full' && interactive ? (
          <Animated.View style={animatedStarStyle}>{starIcon}</Animated.View>
        ) : (
          starIcon
        )}
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      {/* Render full stars */}
      {Array(fullStars)
        .fill(0)
        .map((_, index) => renderStar('full', index))}

      {/* Render half star if applicable */}
      {hasHalfStar && renderStar('half', fullStars)}

      {/* Render empty stars */}
      {Array(emptyStars)
        .fill(0)
        .map((_, index) => renderStar('empty', fullStars + (hasHalfStar ? 1 : 0) + index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 0,
  },
});

export default React.memo(StarRating);
