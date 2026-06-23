import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarRatingProps } from '@/types/reviews';
import { colors } from '@/constants/theme';

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 'medium',
  interactive = false,
  onRatingChange,
  showHalf = true,
}) => {
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
  const fullStars = Math.floor(rating);
  const hasHalfStar = showHalf && rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const handleStarPress = (starIndex: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starIndex + 1);
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

    const StarComponent = interactive ? Pressable : View;
    const starProps = interactive
      ? {
          onPress: () => handleStarPress(index),
        }
      : {};

    return (
      <StarComponent key={`${type}-${index}`} {...starProps}>
        <Ionicons name={iconName} size={starSize} color={color} />
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
});

export default React.memo(StarRating);