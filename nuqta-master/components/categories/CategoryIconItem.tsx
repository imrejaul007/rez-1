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

interface CategoryIconItemProps {
  category: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    image?: string;
    metadata?: {
      color?: string;
    };
  };
  onPress: (slug: string) => void;
  size?: 'small' | 'medium' | 'large';
}

// Normalize slug for consistent matching
const normalizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/&/g, '-')           // Replace & with -
    .replace(/[^a-z0-9-]/g, '-')  // Replace special chars with -
    .replace(/-+/g, '-')          // Replace multiple dashes with single
    .replace(/^-|-$/g, '');       // Remove leading/trailing dashes
};

// Map category names/slugs to Ionicons
const getCategoryIcon = (slug: string, name?: string, icon?: string): keyof typeof Ionicons.glyphMap => {
  // If icon is provided from database, use it directly (DB stores valid Ionicons names)
  if (icon) {
    // Check if it's a valid icon name
    const validIcons = ['shirt-outline', 'restaurant-outline', 'film-outline', 'basket-outline',
      'home-outline', 'medical-outline', 'nutrition-outline', 'book-outline', 'man-outline',
      'woman-outline', 'happy-outline', 'footsteps-outline', 'watch-outline', 'rose-outline',
      'car-outline', 'gift-outline', 'leaf-outline', 'phone-portrait-outline', 'fitness-outline',
      'bicycle-outline', 'cart-outline', 'storefront-outline', 'laptop-outline', 'medkit-outline',
      'sparkles-outline', 'game-controller-outline', 'airplane-outline', 'paw-outline',
      'cut-outline', 'diamond-outline', 'fast-food-outline', 'cafe-outline', 'pizza-outline',
      'wine-outline', 'bed-outline', 'bulb-outline', 'build-outline', 'calendar-outline',
      'camera-outline', 'card-outline', 'chatbubble-outline', 'construct-outline',
      'desktop-outline', 'document-outline', 'flash-outline', 'flower-outline', 'glasses-outline',
      'grid-outline', 'hammer-outline', 'headset-outline', 'heart-outline', 'ice-cream-outline',
      'key-outline', 'location-outline', 'mail-outline', 'map-outline', 'megaphone-outline',
      'mic-outline', 'musical-notes-outline', 'newspaper-outline', 'pencil-outline',
      'people-outline', 'person-outline', 'print-outline', 'radio-outline', 'ribbon-outline',
      'rocket-outline', 'school-outline', 'settings-outline', 'shield-outline', 'shirt-outline',
      'star-outline', 'subway-outline', 'sunny-outline', 'tennisball-outline', 'ticket-outline',
      'train-outline', 'trash-outline', 'trophy-outline', 'tv-outline', 'umbrella-outline',
      'videocam-outline', 'wallet-outline', 'water-outline', 'wifi-outline', 'barbell-outline',
      'bus-outline', 'car-sport-outline', 'color-palette-outline', 'flask-outline', 'body-outline',
      'trail-sign-outline', 'bonfire-outline', 'briefcase-outline', 'bag-outline', 'fish-outline',
      'football-outline', 'beer-outline', 'apps-outline', 'analytics-outline'];

    if (validIcons.includes(icon)) {
      return icon as keyof typeof Ionicons.glyphMap;
    }
  }

  // Comprehensive map of category slugs to icons
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    // Food & Dining
    'restaurant': 'restaurant-outline',
    'restaurants': 'restaurant-outline',
    'food': 'fast-food-outline',
    'food-beverage': 'fast-food-outline',
    'chinese-cuisine': 'restaurant-outline',
    'indian-cuisine': 'restaurant-outline',
    'italian-cuisine': 'pizza-outline',
    'cafe': 'cafe-outline',
    'bakery': 'cafe-outline',
    'desserts': 'ice-cream-outline',

    // Shopping
    'grocery': 'cart-outline',
    'groceries': 'cart-outline',
    'supermarket': 'storefront-outline',

    // Health & Medicine
    'medicine': 'medkit-outline',
    'pharmacy': 'medkit-outline',
    'health': 'fitness-outline',
    'wellness': 'heart-outline',

    // Electronics & Tech
    'electronics': 'laptop-outline',
    'computers': 'desktop-outline',
    'mobiles': 'phone-portrait-outline',
    'mobile-phones': 'phone-portrait-outline',
    'appliances': 'tv-outline',
    'home-appliances': 'tv-outline',

    // Fashion & Clothing
    'fashion': 'shirt-outline',
    'clothing': 'shirt-outline',
    'mens-fashion': 'man-outline',
    'womens-fashion': 'woman-outline',
    'boys-clothing': 'shirt-outline',
    'girls-clothing': 'shirt-outline',
    'kids-clothing': 'happy-outline',
    'casual-shoes': 'footsteps-outline',
    'formal-shoes': 'footsteps-outline',
    'sports-shoes': 'footsteps-outline',
    'footwear': 'footsteps-outline',
    'shoes': 'footsteps-outline',

    // Accessories
    'bags-wallets': 'bag-outline',
    'bags': 'bag-outline',
    'wallets': 'wallet-outline',
    'belts': 'ribbon-outline',
    'watches': 'watch-outline',
    'jewelry': 'diamond-outline',
    'jewellery': 'diamond-outline',
    'sunglasses': 'glasses-outline',
    'eyewear': 'glasses-outline',

    // Beauty & Personal Care
    'beauty': 'sparkles-outline',
    'beauty-health': 'sparkles-outline',
    'cosmetics': 'color-palette-outline',
    'skincare': 'water-outline',
    'haircare': 'cut-outline',
    'fragrances': 'flask-outline',
    'personal-care': 'body-outline',

    // Home & Living
    'home-garden': 'home-outline',
    'home-decor': 'home-outline',
    'furniture': 'bed-outline',
    'kitchen': 'restaurant-outline',
    'bedding': 'bed-outline',
    'lighting': 'bulb-outline',

    // Auto & Vehicles
    'auto-services': 'car-sport-outline',
    'automotive': 'car-outline',
    'cars': 'car-outline',
    'bikes': 'bicycle-outline',
    'motorcycles': 'bicycle-outline',
    'commercial-vehicles': 'bus-outline',
    'fleet': 'car-outline',
    'fleet-market': 'car-outline',
    'car-accessories': 'settings-outline',

    // Entertainment & Leisure
    'amusement-parks': 'happy-outline',
    'entertainment': 'game-controller-outline',
    'movies': 'film-outline',
    'gaming': 'game-controller-outline',
    'toys': 'game-controller-outline',
    'toys-games': 'game-controller-outline',

    // Sports & Fitness
    'sports': 'football-outline',
    'sports-outdoors': 'fitness-outline',
    'fitness': 'barbell-outline',
    'gym': 'barbell-outline',
    'outdoor': 'trail-sign-outline',
    'camping': 'bonfire-outline',

    // Books & Stationery
    'books': 'book-outline',
    'books-media': 'book-outline',
    'stationery': 'pencil-outline',
    'office-supplies': 'briefcase-outline',

    // Services
    'services': 'construct-outline',
    'professional-services': 'briefcase-outline',
    'home-services': 'hammer-outline',
    'cleaning': 'sparkles-outline',
    'repairs': 'build-outline',

    // Gifts & Occasions
    'gifts': 'gift-outline',
    'gift': 'gift-outline',
    'flowers': 'flower-outline',
    'occasions': 'calendar-outline',

    // Food Items
    'organic': 'leaf-outline',
    'fruit': 'nutrition-outline',
    'fruits': 'nutrition-outline',
    'vegetables': 'leaf-outline',
    'dairy': 'water-outline',
    'meat': 'fish-outline',
    'seafood': 'fish-outline',
    'beverages': 'wine-outline',
    'snacks': 'pizza-outline',

    // Pet
    'pets': 'paw-outline',
    'pet-supplies': 'paw-outline',

    // Baby & Kids
    'baby': 'happy-outline',
    'baby-kids': 'happy-outline',
    'maternity': 'heart-outline',

    // Travel
    'travel': 'airplane-outline',
    'luggage': 'briefcase-outline',
    'hotels': 'bed-outline',
  };

  // Try both slug and name (normalized)
  const normalizedSlug = normalizeSlug(slug);
  if (iconMap[normalizedSlug]) {
    return iconMap[normalizedSlug];
  }

  // Also try normalizing the name if provided
  if (name) {
    const normalizedName = normalizeSlug(name);
    if (iconMap[normalizedName]) {
      return iconMap[normalizedName];
    }
  }

  return 'grid-outline';
};

// Get background color based on category
const getCategoryColor = (slug: string, name?: string, metadataColor?: string): string => {
  if (metadataColor) return metadataColor;

  const colorMap: Record<string, string> = {
    // Food & Dining - Red/Orange tones
    'restaurant': '#FFE5E5',
    'restaurants': '#FFE5E5',
    'food': '#FFE5E5',
    'food-beverage': '#FFE5E5',
    'chinese-cuisine': '#FFE8E8',
    'cafe': '#FFF3E0',
    'bakery': '#FFF8E1',
    'desserts': '#FCE4EC',

    // Shopping - Green tones
    'grocery': colors.greenMist,
    'groceries': colors.greenMist,
    'supermarket': '#E0F2F1',

    // Health - Blue tones
    'medicine': '#E3F2FD',
    'pharmacy': '#E3F2FD',
    'health': '#E1F5FE',
    'wellness': '#FCE4EC',

    // Electronics - Purple tones
    'electronics': '#EDE7F6',
    'computers': '#E8EAF6',
    'mobiles': '#F3E5F5',
    'appliances': '#E8EAF6',

    // Fashion - Pink/Rose tones
    'fashion': '#FCE4EC',
    'clothing': '#FCE4EC',
    'boys-clothing': '#E3F2FD',
    'girls-clothing': '#FCE4EC',
    'casual-shoes': '#EFEBE9',
    'footwear': '#EFEBE9',

    // Accessories - Various
    'bags-wallets': '#FFF3E0',
    'bags': '#FFF3E0',
    'wallets': '#FFF8E1',
    'belts': '#EFEBE9',
    'watches': '#F3E5F5',
    'jewelry': '#FFF8E1',
    'sunglasses': '#E0F7FA',

    // Beauty - Coral/Pink tones
    'beauty': '#FFF3E0',
    'beauty-health': '#FFF3E0',
    'cosmetics': '#FCE4EC',
    'skincare': '#E0F7FA',

    // Home - Green/Teal tones
    'home-garden': colors.greenMist,
    'home-decor': '#F1F8E9',
    'furniture': '#EFEBE9',
    'kitchen': '#FFF8E1',

    // Auto - Blue/Gray tones
    'auto-services': '#ECEFF1',
    'automotive': '#ECEFF1',
    'cars': '#E3F2FD',
    'bikes': colors.greenMist,
    'commercial-vehicles': '#CFD8DC',
    'fleet': '#E3F2FD',

    // Entertainment - Yellow/Orange tones
    'amusement-parks': '#FFF9C4',
    'entertainment': '#FFF3E0',
    'movies': '#F3E5F5',
    'gaming': '#E8EAF6',
    'toys': '#FFF8E1',

    // Sports - Cyan/Teal tones
    'sports': '#E0F7FA',
    'sports-outdoors': '#E0F7FA',
    'fitness': colors.greenMist,

    // Books - Purple/Lavender tones
    'books': '#EDE7F6',
    'books-media': '#EDE7F6',
    'stationery': '#FFF8E1',

    // Gifts - Mint/Teal tones
    'gifts': '#E0F2F1',
    'gift': '#E0F2F1',
    'flowers': '#FCE4EC',

    // Food Items
    'organic': colors.greenMist,
    'fruit': '#FFF9C4',
    'fruits': '#FFF9C4',
    'vegetables': '#F1F8E9',
    'beverages': '#E3F2FD',

    // Pet - Warm tones
    'pets': '#FFF3E0',
    'pet-supplies': '#FFF3E0',

    // Baby - Soft tones
    'baby': '#FCE4EC',
    'baby-kids': '#E1F5FE',

    // Travel - Sky blue
    'travel': '#E1F5FE',
    'luggage': '#EFEBE9',
  };

  const normalizedSlug = normalizeSlug(slug);
  if (colorMap[normalizedSlug]) {
    return colorMap[normalizedSlug];
  }
  if (name) {
    const normalizedName = normalizeSlug(name);
    if (colorMap[normalizedName]) {
      return colorMap[normalizedName];
    }
  }
  return colors.greenMist;
};

// Get icon color based on category
const getCategoryIconColor = (slug: string, name?: string): string => {
  const colorMap: Record<string, string> = {
    // Food & Dining
    'restaurant': '#E53935',
    'restaurants': '#E53935',
    'food': '#E53935',
    'food-beverage': '#E53935',
    'chinese-cuisine': '#D32F2F',
    'cafe': '#6D4C41',
    'bakery': '#8D6E63',
    'desserts': '#E91E63',

    // Shopping
    'grocery': '#43A047',
    'groceries': '#43A047',
    'supermarket': '#00897B',

    // Health
    'medicine': '#1E88E5',
    'pharmacy': '#1E88E5',
    'health': '#0288D1',
    'wellness': '#EC407A',

    // Electronics
    'electronics': '#7E57C2',
    'computers': '#5C6BC0',
    'mobiles': '#9C27B0',
    'appliances': '#3F51B5',

    // Fashion
    'fashion': '#EC407A',
    'clothing': '#EC407A',
    'boys-clothing': '#1976D2',
    'girls-clothing': '#E91E63',
    'casual-shoes': '#795548',
    'footwear': '#795548',

    // Accessories
    'bags-wallets': '#FF8F00',
    'bags': '#FF8F00',
    'wallets': '#FFA000',
    'belts': '#6D4C41',
    'watches': '#7B1FA2',
    'jewelry': '#FFD600',
    'sunglasses': '#00ACC1',

    // Beauty
    'beauty': '#FF7043',
    'beauty-health': '#FF7043',
    'cosmetics': '#E91E63',
    'skincare': '#00BCD4',

    // Home
    'home-garden': colors.brand.emerald,
    'home-decor': '#8BC34A',
    'furniture': '#795548',
    'kitchen': '#FF9800',

    // Auto
    'auto-services': '#546E7A',
    'automotive': '#546E7A',
    'cars': '#1976D2',
    'bikes': '#43A047',
    'commercial-vehicles': '#455A64',
    'fleet': '#3F51B5',

    // Entertainment
    'amusement-parks': '#FBC02D',
    'entertainment': '#FF9800',
    'movies': '#9C27B0',
    'gaming': '#5C6BC0',
    'toys': '#FFB300',

    // Sports
    'sports': '#00ACC1',
    'sports-outdoors': '#00ACC1',
    'fitness': colors.brand.emerald,

    // Books
    'books': '#7E57C2',
    'books-media': '#7E57C2',
    'stationery': '#FF9800',

    // Gifts
    'gifts': '#26A69A',
    'gift': '#26A69A',
    'flowers': '#EC407A',

    // Food Items
    'organic': '#66BB6A',
    'fruit': '#FBC02D',
    'fruits': '#FBC02D',
    'vegetables': '#8BC34A',
    'beverages': '#2196F3',

    // Pet
    'pets': '#FF8F00',
    'pet-supplies': '#FF8F00',

    // Baby
    'baby': '#F06292',
    'baby-kids': '#29B6F6',

    // Travel
    'travel': '#03A9F4',
    'luggage': '#795548',
  };

  const normalizedSlug = normalizeSlug(slug);
  if (colorMap[normalizedSlug]) {
    return colorMap[normalizedSlug];
  }
  if (name) {
    const normalizedName = normalizeSlug(name);
    if (colorMap[normalizedName]) {
      return colorMap[normalizedName];
    }
  }
  return colors.brand.green;
};

const CategoryIconItem: React.FC<CategoryIconItemProps> = memo(({
  category,
  onPress,
  size = 'medium',
}) => {
  // Safely extract string values to prevent rendering objects
  const categoryName = typeof category.name === 'string' ? category.name : 'Category';
  const categorySlug = typeof category.slug === 'string' ? category.slug : '';
  const categoryIcon = typeof category.icon === 'string' ? category.icon : undefined;
  const categoryImage = typeof category.image === 'string' ? category.image : undefined;
  const metadataColor = category.metadata?.color && typeof category.metadata.color === 'string'
    ? category.metadata.color
    : undefined;

  const sizeConfig = {
    small: { circle: 52, icon: 24, label: 10 },
    medium: { circle: 64, icon: 28, label: 12 },
    large: { circle: 76, icon: 32, label: 14 },
  };

  const config = sizeConfig[size];
  const backgroundColor = getCategoryColor(categorySlug, categoryName, metadataColor);
  const iconColor = getCategoryIconColor(categorySlug, categoryName);
  const iconName = getCategoryIcon(categorySlug, categoryName, categoryIcon);

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress(categorySlug)}
     
      accessibilityRole="button"
      accessibilityLabel={`${categoryName} category`}
      accessibilityHint={`Navigate to ${categoryName} category page`}
    >
      <View
        style={[
          styles.iconCircle,
          {
            width: config.circle,
            height: config.circle,
            borderRadius: config.circle / 2,
            backgroundColor,
          },
        ]}
      >
        {categoryImage ? (
          <CachedImage
            source={categoryImage}
            style={[
              styles.iconImage,
              { width: config.icon, height: config.icon },
            ]}
            contentFit="contain"
          />
        ) : (
          <Ionicons
            name={iconName}
            size={config.icon}
            color={iconColor}
          />
        )}
      </View>
      <ThemedText
        style={[styles.label, { fontSize: config.label }]}
        numberOfLines={2}
      >
        {categoryName}
      </ThemedText>
    </Pressable>
  );
});

CategoryIconItem.displayName = 'CategoryIconItem';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  iconImage: {
    borderRadius: 8,
  },
  label: {
    textAlign: 'center',
    color: colors.neutral[700],
    fontWeight: '500',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});

export default CategoryIconItem;
