// DiscoverAndShopHeader.tsx - Header with category cards for Discover & Shop
// Nuqta Brand Colors: Nile Blue (#1a3a52) and Mustard (#ffcd57) with modern glassy UI
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CategoryCard } from '@/types/discover.types';
import { colors } from '@/constants/theme';

// Category icon images
const CATEGORY_IMAGES = {
  fashion: require('@/assets/category-icons/Shopping/Fashion.png'),
  electronics: require('@/assets/category-icons/Shopping/Mobile-accessories.png'),
  beauty: require('@/assets/category-icons/BEAUTY-WELLNESS/Beauty-services.png'),
  home: require('@/assets/category-icons/HOME-SERVICES/Cleaning.png'),
  food: require('@/assets/category-icons/FOOD-DINING/Cafes.png'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 140;
const CARD_HEIGHT = 165;

// Nuqta Brand Color Palette - Nile Blue/Mustard with different shades
const NUQTA_COLORS = {
  // Primary Nile Blues
  nileBlue: colors.nileBlue,
  nileBlueLight: '#2a4a62',
  nileBlueDeep: '#0f2a3f',
  nileBlueAccent: '#3a5a72',

  // Accent Mustards/Golds
  mustard: colors.lightMustard,
  primaryGold: colors.brand.goldWarm,
  darkGold: '#D4A843',
  lightGold: '#FFD98C',
  amber: colors.warningScale[400],

  // Neutrals
  navy: colors.brand.navyDark,
  gray: colors.neutral[500],
};

// Default category cards with Nuqta Nile Blue/Mustard gradients
const DEFAULT_CATEGORIES: CategoryCard[] = [
  {
    id: 'fashion',
    label: 'Fashion',
    icon: 'shirt-outline',
    productName: 'Summer Collection',
    cashback: '20%',
    gradient: [colors.nileBlue, '#2a4a62'], // Primary nile blue gradient
    categoryId: 'fashion',
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: 'phone-portrait-outline',
    productName: 'Latest Gadgets',
    cashback: '15%',
    gradient: [colors.lightMustard, colors.warningScale[400]], // Mustard gradient
    categoryId: 'electronics',
  },
  {
    id: 'beauty',
    label: 'Beauty',
    icon: 'sparkles-outline',
    productName: 'Skincare Essentials',
    cashback: '18%',
    gradient: ['#0f2a3f', colors.nileBlue], // Deep to light nile blue
    categoryId: 'beauty',
  },
  {
    id: 'home',
    label: 'Home',
    icon: 'home-outline',
    productName: 'Decor & Living',
    cashback: '12%',
    gradient: ['#2a4a62', '#3a5a72'], // Light nile blue gradient
    categoryId: 'home',
  },
  {
    id: 'food',
    label: 'Food',
    icon: 'restaurant-outline',
    productName: 'Gourmet Delights',
    cashback: '25%',
    gradient: ['#D4A843', colors.lightMustard], // Dark gold to mustard
    categoryId: 'food',
  },
];

interface DiscoverAndShopHeaderProps {
  categories?: CategoryCard[];
  onCategoryPress?: (category: CategoryCard) => void;
  showCategories?: boolean;
}

function DiscoverAndShopHeader({
  categories = DEFAULT_CATEGORIES,
  onCategoryPress,
  showCategories = true,
}: DiscoverAndShopHeaderProps) {
  const router = useRouter();

  const handleFullReels = () => {
    router.push('/social/reels' as any);
  };

  return (
    <View style={styles.container}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="bag-handle" size={18} color={colors.background.primary} />
          </View>
          <Text style={styles.title}>Discover & Shop</Text>
        </View>
        <Pressable style={styles.reelsButton} onPress={handleFullReels}>
          <Ionicons name="play-circle" size={16} color={colors.background.primary} />
          <Text style={styles.reelsButtonText}>Reels</Text>
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Tap products to buy & earn rewards</Text>

      {/* Category Cards - Modern Glassy Design */}
      {showCategories && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + 12}
        >
          {categories.map((category, index) => (
            <Pressable
              key={category.id}
             
              onPress={() => onCategoryPress?.(category)}
              accessibilityLabel={`${category.label} category. ${category.productName}. ${category.cashback} cashback`}
              accessibilityRole="button"
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={category.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryCard}
              >
                {/* Glassy overlay effect */}
                <View style={styles.glassOverlay} />

                {/* Decorative circles for depth */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                {/* Icon/Image Container with glass effect */}
                <View style={styles.iconWrapper}>
                  <View style={styles.iconCircle}>
                    {CATEGORY_IMAGES[category.id as keyof typeof CATEGORY_IMAGES] ? (
                      <CachedImage
                        source={CATEGORY_IMAGES[category.id as keyof typeof CATEGORY_IMAGES]}
                        style={styles.categoryImage}
                        contentFit="contain"
                      />
                    ) : (
                      <Ionicons
                        name={category.icon as any}
                        size={28}
                        color={colors.background.primary}
                      />
                    )}
                  </View>
                </View>

                {/* Category Label */}
                <Text style={styles.categoryLabel}>{category.label}</Text>

                {/* Product Name */}
                <Text style={styles.productName} numberOfLines={1}>
                  {category.productName}
                </Text>

                {/* Cashback Badge - Glassy pill */}
                <View style={styles.cashbackBadge}>
                  <Ionicons name="trending-up" size={10} color={colors.background.primary} />
                  <Text style={styles.cashbackText}>{category.cashback} Cashback</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    backgroundColor: colors.background.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA_COLORS.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA_COLORS.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: NUQTA_COLORS.navy,
    letterSpacing: -0.3,
  },
  reelsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: NUQTA_COLORS.nileBlue,
    ...Platform.select({
      ios: {
        shadowColor: NUQTA_COLORS.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reelsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  subtitle: {
    fontSize: 14,
    color: NUQTA_COLORS.gray,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cardWrapper: {
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconWrapper: {
    alignSelf: 'flex-start',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    // Glassmorphism effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 8,
  },
  productName: {
    fontSize: 15,
    color: colors.background.primary,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cashbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(DiscoverAndShopHeader);
