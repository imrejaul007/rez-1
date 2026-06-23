/**
 * CategoryChips Component
 *
 * Horizontal scrollable category filter chips with animated selection.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import {
  CategoryChipsProps,
  PaymentSearchCategory,
  PAYMENT_SEARCH_COLORS,
} from '@/types/paymentStoreSearch.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChipProps {
  category: PaymentSearchCategory;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const CategoryChip: React.FC<ChipProps> = ({
  category,
  isSelected,
  onPress,
  index,
}) => {
  const scale = useSharedValue(1);
  const selected = useSharedValue(isSelected ? 1 : 0);

  // Update selected state when prop changes
  React.useEffect(() => {
    selected.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, selected]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, [scale]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      selected.value,
      [0, 1],
      [PAYMENT_SEARCH_COLORS.surface, PAYMENT_SEARCH_COLORS.primary]
    );

    const borderColor = interpolateColor(
      selected.value,
      [0, 1],
      [PAYMENT_SEARCH_COLORS.border, PAYMENT_SEARCH_COLORS.primary]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      selected.value,
      [0, 1],
      [PAYMENT_SEARCH_COLORS.textSecondary, PAYMENT_SEARCH_COLORS.textInverse]
    );

    return { color };
  });

  const animatedEmojiStyle = useAnimatedStyle(() => ({
    opacity: interpolateColor(
      selected.value,
      [0, 1],
      [0.7, 1]
    ) as unknown as number,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={FadeIn.delay(index * 50).springify()}
      style={[styles.chip, animatedContainerStyle]}
    >
      <Animated.Text style={[styles.chipEmoji, animatedEmojiStyle]}>
        {category.emoji}
      </Animated.Text>
      <Animated.Text style={[styles.chipText, animatedTextStyle]}>
        {category.name}
      </Animated.Text>
    </AnimatedPressable>
  );
};

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const handleCategoryPress = useCallback((categoryId: string) => {
    if (selectedCategory === categoryId) {
      // Clicking same category deselects it (go back to default view)
      onSelectCategory(null);
    } else {
      // Select the category (including 'all')
      onSelectCategory(categoryId);
    }
  }, [selectedCategory, onSelectCategory]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonChip} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {categories.map((category, index) => (
          <CategoryChip
            key={category.id}
            category={category}
            isSelected={
              category.id === 'all'
                ? selectedCategory === null || selectedCategory === 'all'
                : selectedCategory === category.id
            }
            onPress={() => handleCategoryPress(category.id)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 2,
    paddingBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonChip: {
    width: 90,
    height: 36,
    borderRadius: 20,
    backgroundColor: colors.neutral[200],
    marginRight: 8,
  },
});

export default React.memo(CategoryChips);
