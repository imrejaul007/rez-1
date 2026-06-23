/**
 * StarRating Component - Reusable star rating display and input
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_COLORS } from '@/constants/EventColors';

interface StarRatingProps {
  rating: number; // Current rating value (0-5)
  maxRating?: number; // Maximum rating (default: 5)
  size?: number; // Star size (default: 20)
  editable?: boolean; // Whether user can tap to change rating
  onRatingChange?: (rating: number) => void; // Callback when rating changes
  showEmpty?: boolean; // Show empty stars (default: true)
  starColor?: string; // Filled star color
  emptyColor?: string; // Empty star color
  spacing?: number; // Space between stars
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 20,
  editable = false,
  onRatingChange,
  showEmpty = true,
  starColor = EVENT_COLORS.star,
  emptyColor = EVENT_COLORS.starEmpty,
  spacing = 2,
}) => {
  const handlePress = (index: number) => {
    if (editable && onRatingChange) {
      // If tapping same star, allow clearing (set to previous value)
      const newRating = index + 1;
      onRatingChange(newRating);
    }
  };

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating && rating % 1 !== 0;

    let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
    let color = emptyColor;

    if (filled) {
      iconName = 'star';
      color = starColor;
    } else if (halfFilled) {
      iconName = 'star-half';
      color = starColor;
    } else if (!showEmpty) {
      return null;
    }

    const StarElement = (
      <Ionicons
        name={iconName}
        size={size}
        color={color}
        style={{ marginHorizontal: spacing / 2 }}
      />
    );

    if (editable) {
      return (
        <Pressable
          key={index}
          onPress={() => handlePress(index)}
         
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          {StarElement}
        </Pressable>
      );
    }

    return <View key={index}>{StarElement}</View>;
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default React.memo(StarRating);
