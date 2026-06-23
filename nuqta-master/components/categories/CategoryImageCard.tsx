import React, { memo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  metadata?: {
    color?: string;
  };
}

interface CategoryImageCardProps {
  category: Category;
  onPress: (slug: string) => void;
  size?: 'small' | 'medium' | 'large';
}

// Get a fallback icon based on category name
const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const normalized = name.toLowerCase();
  if (normalized.includes('fashion') || normalized.includes('clothing')) return 'shirt-outline';
  if (normalized.includes('food') || normalized.includes('restaurant') || normalized.includes('cuisine')) return 'restaurant-outline';
  if (normalized.includes('electronic') || normalized.includes('mobile')) return 'phone-portrait-outline';
  if (normalized.includes('beauty') || normalized.includes('makeup')) return 'sparkles-outline';
  if (normalized.includes('home') || normalized.includes('furniture')) return 'home-outline';
  if (normalized.includes('travel')) return 'airplane-outline';
  if (normalized.includes('health') || normalized.includes('medicine')) return 'medkit-outline';
  if (normalized.includes('sports') || normalized.includes('fitness')) return 'fitness-outline';
  if (normalized.includes('auto') || normalized.includes('vehicle') || normalized.includes('car')) return 'car-outline';
  if (normalized.includes('grocery') || normalized.includes('food')) return 'cart-outline';
  if (normalized.includes('kids') || normalized.includes('baby') || normalized.includes('toy')) return 'happy-outline';
  if (normalized.includes('book') || normalized.includes('stationery')) return 'book-outline';
  if (normalized.includes('gift')) return 'gift-outline';
  if (normalized.includes('pet')) return 'paw-outline';
  if (normalized.includes('shoe') || normalized.includes('footwear')) return 'footsteps-outline';
  if (normalized.includes('watch') || normalized.includes('accessories')) return 'watch-outline';
  if (normalized.includes('bag') || normalized.includes('wallet')) return 'bag-outline';
  if (normalized.includes('jewelry') || normalized.includes('jewellery')) return 'diamond-outline';
  return 'grid-outline';
};

// Get fallback background color
const getCategoryColor = (name: string): string => {
  const normalized = name.toLowerCase();
  if (normalized.includes('fashion') || normalized.includes('clothing')) return '#FCE4EC';
  if (normalized.includes('food') || normalized.includes('restaurant')) return '#FFEBEE';
  if (normalized.includes('electronic')) return '#E8EAF6';
  if (normalized.includes('beauty')) return '#FFF3E0';
  if (normalized.includes('home')) return colors.greenMist;
  if (normalized.includes('travel')) return '#E1F5FE';
  if (normalized.includes('health')) return '#E3F2FD';
  if (normalized.includes('sports')) return '#E0F7FA';
  if (normalized.includes('auto')) return '#ECEFF1';
  if (normalized.includes('grocery')) return '#F1F8E9';
  if (normalized.includes('kids')) return '#FFF8E1';
  return colors.greenMist;
};

const CategoryImageCard: React.FC<CategoryImageCardProps> = memo(({
  category,
  onPress,
  size = 'medium',
}) => {
  const sizeConfig = {
    small: { imageSize: 64, fontSize: 11 },
    medium: { imageSize: 80, fontSize: 12 },
    large: { imageSize: 96, fontSize: 13 },
  };

  const config = sizeConfig[size];
  const fallbackColor = category.metadata?.color || getCategoryColor(category.name);
  const fallbackIcon = getCategoryIcon(category.name);

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress(category.slug)}
     
      accessibilityRole="button"
      accessibilityLabel={`${category.name} category`}
      accessibilityHint={`Navigate to ${category.name} category page`}
    >
      <View
        style={[
          styles.imageWrapper,
          {
            width: config.imageSize,
            height: config.imageSize,
            borderRadius: config.imageSize / 2,
          },
        ]}
      >
        {category.image ? (
          <CachedImage
            source={category.image}
            style={[
              styles.categoryImage,
              {
                width: config.imageSize,
                height: config.imageSize,
                borderRadius: config.imageSize / 2,
              },
            ]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.iconPlaceholder,
              {
                width: config.imageSize,
                height: config.imageSize,
                borderRadius: config.imageSize / 2,
                backgroundColor: fallbackColor,
              },
            ]}
          >
            <Ionicons
              name={fallbackIcon}
              size={config.imageSize * 0.4}
              color={colors.brand.green}
            />
          </View>
        )}
      </View>
      <ThemedText
        style={[styles.categoryName, { fontSize: config.fontSize }]}
        numberOfLines={2}
      >
        {category.name}
      </ThemedText>
    </Pressable>
  );
});

CategoryImageCard.displayName = 'CategoryImageCard';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  imageWrapper: {
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      },
    }),
  },
  categoryImage: {
    backgroundColor: '#F7FAFC',
  },
  iconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    textAlign: 'center',
    color: colors.neutral[800],
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
    maxWidth: 90,
  },
});

export default CategoryImageCard;
