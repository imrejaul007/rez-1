/**
 * CategoryCashbackGrid Component
 * 2-column grid of category cards showing cashback percentages
 * Static grid layout - no slider
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import cashbackService, { CashbackCampaign } from '@/services/cashbackApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category images - reused from CategoryTabBar
const CATEGORY_IMAGES = {
  dining: require('../../assets/category-icons/FOOD-DINING/Family-restaurants.png'),
  events: require('../../assets/category-icons/ENTERTAINMENT/Live-events.png'),
  stores: require('../../assets/images/stores/shopping-bags.png'),
  grocery: require('../../assets/category-icons/GROCERY-ESSENTIALS/Supermarkets.png'),
  beauty: require('../../assets/category-icons/BEAUTY-WELLNESS/Beauty-services.png'),
  health: require('../../assets/category-icons/HEALTHCARE/Pharmacy.png'),
  fashion: require('../../assets/category-icons/Shopping/Fashion.png'),
  fitness: require('../../assets/category-icons/FITNESS-SPORTS/Gyms.png'),
  education: require('../../assets/category-icons/EDUCATION-LEARNING/Coaching-center.png'),
  travel: require('../../assets/category-icons/TRAVEL-EXPERIENCES/Hotels.png'),
};

// Category configuration with routes and default cashback rates - Nuqta palette
const CATEGORIES = [
  { id: 'dining', label: 'Dining', image: CATEGORY_IMAGES.dining, route: '/MainCategory/food-dining', defaultCashback: 20, iconBg: colors.linen },
  { id: 'grocery', label: 'Grocery', image: CATEGORY_IMAGES.grocery, route: '/MainCategory/grocery-essentials', defaultCashback: 20, iconBg: colors.linen },
  { id: 'fashion', label: 'Fashion', image: CATEGORY_IMAGES.fashion, route: '/MainCategory/fashion', defaultCashback: 20, iconBg: colors.lightPeach },
  { id: 'beauty', label: 'Beauty', image: CATEGORY_IMAGES.beauty, route: '/MainCategory/beauty-wellness', defaultCashback: 20, iconBg: colors.lightPeach },
  { id: 'health', label: 'Health', image: CATEGORY_IMAGES.health, route: '/MainCategory/healthcare', defaultCashback: 20, iconBg: colors.lavenderMist },
  { id: 'fitness', label: 'Fitness', image: CATEGORY_IMAGES.fitness, route: '/MainCategory/fitness-sports', defaultCashback: 20, iconBg: colors.linen },
  { id: 'events', label: 'Events', image: CATEGORY_IMAGES.events, route: '/events', defaultCashback: 20, iconBg: colors.linen },
  { id: 'stores', label: 'Stores', image: CATEGORY_IMAGES.stores, route: '/StoreListPage', defaultCashback: 20, iconBg: colors.lavenderMist },
  { id: 'education', label: 'Education', image: CATEGORY_IMAGES.education, route: '/MainCategory/education-learning', defaultCashback: 20, iconBg: colors.lavenderMist },
  { id: 'travel', label: 'Travel', image: CATEGORY_IMAGES.travel, route: '/MainCategory/travel-experiences', defaultCashback: 20, iconBg: colors.lavenderMist },
] as const;

// Category ID to campaign category name mappings for API matching
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  dining: ['dining', 'food', 'restaurant', 'food-dining', 'food & dining', 'restaurants'],
  events: ['events', 'entertainment', 'live events', 'shows'],
  stores: ['stores', 'shopping', 'retail', 'shop'],
  grocery: ['grocery', 'essentials', 'grocery-essentials', 'supermarket', 'groceries'],
  beauty: ['beauty', 'wellness', 'beauty-wellness', 'spa', 'salon'],
  health: ['health', 'healthcare', 'medical', 'pharmacy', 'medicine'],
  fashion: ['fashion', 'clothing', 'apparel', 'clothes'],
  fitness: ['fitness', 'sports', 'fitness-sports', 'gym', 'workout'],
  education: ['education', 'learning', 'education-learning', 'courses', 'training'],
  travel: ['travel', 'experiences', 'travel-experiences', 'hotels', 'tourism'],
};

// Map campaigns to category cashback rates (get max rate per category)
// Extracted outside component to avoid recreation on every render
function mapCampaignsToCategories(campaigns: CashbackCampaign[]): Record<string, number> {
  const rates: Record<string, number> = {};

  campaigns.forEach(campaign => {
    if (!campaign.isActive) return;

    campaign.categories.forEach(campaignCategory => {
      const normalizedCampaignCat = campaignCategory.toLowerCase().trim();

      // Find matching category ID
      for (const [categoryId, aliases] of Object.entries(CATEGORY_MAPPINGS)) {
        if (aliases.some(alias =>
          normalizedCampaignCat.includes(alias) || alias.includes(normalizedCampaignCat)
        )) {
          rates[categoryId] = Math.max(rates[categoryId] || 0, campaign.cashbackRate);
        }
      }
    });
  });

  return rates;
}

interface CategoryCashbackGridProps {
  onCategoryPress?: (categoryId: string) => void;
  style?: any;
}

const CASHBACK_RATES_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedCashbackRates: Record<string, number> | null = null;
let cachedCashbackRatesAt = 0;
let cashbackRatesInFlight: Promise<Record<string, number>> | null = null;

const CategoryCashbackGrid: React.FC<CategoryCashbackGridProps> = memo(({ onCategoryPress, style }) => {
  const router = useRouter();
  const now = Date.now();
  const hasFreshCache =
    cachedCashbackRates &&
    now - cachedCashbackRatesAt < CASHBACK_RATES_CACHE_TTL_MS;
  const isMounted = useIsMounted();
  const [cashbackRates, setCashbackRates] = useState<Record<string, number>>(
    hasFreshCache ? (cachedCashbackRates as Record<string, number>) : {}
  );

  const fetchCashbackRates = useCallback(async (): Promise<Record<string, number>> => {
    const cacheStillFresh =
      cachedCashbackRates &&
      Date.now() - cachedCashbackRatesAt < CASHBACK_RATES_CACHE_TTL_MS;

    if (cacheStillFresh) {
      return cachedCashbackRates as Record<string, number>;
    }

    if (cashbackRatesInFlight) {
      return cashbackRatesInFlight;
    }

    cashbackRatesInFlight = (async () => {
      let rates: Record<string, number> = {};

      try {
        const response = await cashbackService.getActiveCampaigns();
        if (response.success && response.data?.campaigns) {
          rates = mapCampaignsToCategories(response.data.campaigns);
        }
      } catch (_err) {
        // Silently fail - category defaults are used.
      }

      cachedCashbackRates = rates;
      cachedCashbackRatesAt = Date.now();
      return rates;
    })();

    try {
      return await cashbackRatesInFlight;
    } finally {
      cashbackRatesInFlight = null;
    }
  }, []);

  useEffect(() => {
    fetchCashbackRates()
      .then((rates) => {
        if (!isMounted()) return;
        setCashbackRates(rates);
      })
      .catch(() => {});
  }, [fetchCashbackRates]);

  // Get cashback rate for a category (API rate or default)
  const getCashbackRate = useCallback((categoryId: string): number => {
    if (cashbackRates[categoryId]) {
      return cashbackRates[categoryId];
    }
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.defaultCashback || 10;
  }, [cashbackRates]);

  const handleCategoryPress = useCallback((category: typeof CATEGORIES[number]) => {
    if (onCategoryPress) {
      onCategoryPress(category.id);
    }
    if (category.route) {
      router.push(category.route as any);
    }
  }, [router, onCategoryPress]);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="gift" size={18} color={colors.lightMustard} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Earn rewards in every category</Text>
        </View>
      </View>
      <Text style={styles.headerSubtitle}>Shop smarter across all your needs</Text>

      {/* Horizontal Scrollable Grid - 2 rows */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
        nestedScrollEnabled
      >
        <View>
          {/* First Row */}
          <View style={styles.gridRow}>
            {CATEGORIES.slice(0, Math.ceil(CATEGORIES.length / 2)).map((category) => (
              <Pressable
                key={category.id}
                style={styles.card}
                onPress={() => handleCategoryPress(category)}
               
                accessibilityRole="button"
                accessibilityLabel={`${category.label} category with ${getCashbackRate(category.id)}% cashback`}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.iconBg }]}>
                  <CachedImage
                    source={category.image}
                    width={40}
                    height={40}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.categoryName}>{category.label}</Text>
                <View style={styles.cashbackContainer}>
                  <Ionicons name="logo-bitcoin" size={10} color={colors.lightMustard} />
                  <Text style={styles.cashbackText}>
                    Up to {getCashbackRate(category.id)}%
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          {/* Second Row */}
          <View style={styles.gridRow}>
            {CATEGORIES.slice(Math.ceil(CATEGORIES.length / 2)).map((category) => (
              <Pressable
                key={category.id}
                style={styles.card}
                onPress={() => handleCategoryPress(category)}
               
                accessibilityRole="button"
                accessibilityLabel={`${category.label} category with ${getCashbackRate(category.id)}% cashback`}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.iconBg }]}>
                  <CachedImage
                    source={category.image}
                    width={40}
                    height={40}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.categoryName}>{category.label}</Text>
                <View style={styles.cashbackContainer}>
                  <Ionicons name="logo-bitcoin" size={10} color={colors.lightMustard} />
                  <Text style={styles.cashbackText}>
                    Up to {getCashbackRate(category.id)}%
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Pay in Store Promo Card */}
      <Pressable onPress={() => router.push('/pay-in-store' as any)}>
        <LinearGradient
          colors={[colors.nileBlue, colors.brand.nileBlueLight, '#2d5c7e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.promoCard}
        >
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Pay in Store</Text>
            <Text style={styles.promoSubtitle}>
              Scan & pay at nearby stores.{'\n'}Earn cashback instantly.
            </Text>

            <View style={styles.promoButton}>
              <Ionicons name="qr-code-outline" size={20} color={colors.lightMustard} />
              <Text style={styles.promoButtonText}>Scan QR & Pay</Text>
            </View>
          </View>

          <View style={styles.promoFooter}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.promoFooterText}>Works just like UPI — but rewards you</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
});

CategoryCashbackGrid.displayName = 'CategoryCashbackGrid';

const CARD_WIDTH = 100; // Fixed width for horizontal scroll
const CARD_HEIGHT = 120; // Height for 2-row layout

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: colors.lavenderMist,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  scrollView: {
    marginHorizontal: -16, // Offset container padding for full-width scroll
  },
  scrollContainer: {
    paddingHorizontal: 16, // Restore padding inside scroll
    paddingBottom: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
    textAlign: 'center',
    marginTop: 2,
  },
  cashbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cashbackText: {
    fontSize: 10,
    color: colors.lightMustard,
    fontWeight: '600',
  },
  // Promo Card styles
  promoCard: {
    marginTop: 6,
    marginBottom: 4,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 16px rgba(26, 58, 82, 0.25)',
      },
    }),
  },
  promoContent: {
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  promoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 200,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  promoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  promoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    gap: 6,
  },
  promoFooterText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
});

export default CategoryCashbackGrid;
