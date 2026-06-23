import React, { useMemo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Category } from '@/services/categoriesApi';
import FastImage from '@/components/common/FastImage';
import { colors } from '@/constants/theme';

interface CategorySectionCardProps {
  category: Category;
  onPress: (category: Category) => void;
  width?: number;
}

// Custom comparison function for React.memo
const arePropsEqual = (
  prevProps: CategorySectionCardProps,
  nextProps: CategorySectionCardProps
) => {
  return (
    prevProps.category._id === nextProps.category._id &&
    prevProps.width === nextProps.width &&
    prevProps.category.name === nextProps.category.name &&
    prevProps.category.image === nextProps.category.image &&
    prevProps.category.maxCashback === nextProps.category.maxCashback
  );
};

function CategorySectionCard({
  category,
  onPress,
  width = 160,
}: CategorySectionCardProps) {
  // Memoize cashback text
  const cashbackText = useMemo(() => {
    if (category.maxCashback && category.maxCashback > 0) {
      return `Up to ${category.maxCashback}% cashback`;
    }
    if (category.metadata?.tags?.includes('cashback')) {
      return 'Cashback available';
    }
    return null;
  }, [category.maxCashback, category.metadata?.tags]);

  // Memoize accessibility label
  const accessibilityLabel = useMemo(() => {
    let label = `${category.name} category`;
    if (cashbackText) {
      label += `. ${cashbackText}`;
    }
    return label;
  }, [category.name, cashbackText]);

  // Memoize onPress callback
  const handlePress = useCallback(() => {
    try {
      onPress(category);
    } catch (error) {
      // silently handle
    }
  }, [onPress, category]);

  // Check if a string is a valid image URL (not an emoji)
  const isValidImageUrl = (str: string | undefined): boolean => {
    if (!str) return false;
    // Check if it's a URL (starts with http/https or is a relative path)
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
  };

  // Get image source - only use valid URLs, not emojis
  const imageSource = isValidImageUrl(category.image) ? category.image
    : isValidImageUrl(category.bannerImage) ? category.bannerImage
    : null;

  // Get emoji icon for fallback display
  const emojiIcon = category.icon || category.name.charAt(0).toUpperCase();

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={handlePress}
     
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to view category"
    >
      <ThemedView style={styles.card}>
        {/* Category Image */}
        <View style={styles.imageContainer}>
          {imageSource ? (
            <FastImage
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
              showLoader={true}
            />
          ) : (
            <View style={styles.emojiContainer}>
              <ThemedText style={styles.emojiText}>
                {emojiIcon}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Category Info */}
        <View style={styles.content}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {category.name}
          </ThemedText>
          {cashbackText && (
            <ThemedText style={styles.cashback} numberOfLines={1}>
              {cashbackText}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default React.memo(CategorySectionCard, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(11, 34, 64, 0.08)',
      } as any,
    }),
  },
  imageContainer: {
    height: 100,
    backgroundColor: colors.tint.coolGray,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neutral[400],
  },
  emojiContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 48,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    marginBottom: 4,
  },
  cashback: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.nileBlue,
  },
});
