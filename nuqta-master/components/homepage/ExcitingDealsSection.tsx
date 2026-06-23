/**
 * Exciting Deals Section - Connected to /api/campaigns/exciting-deals
 * Premium UI with modern design, smooth animations, and proper data handling
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { campaignsApi, DealCategory, CampaignDeal } from '@/services/campaignsApi';
import { useCurrentRegionId, useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import OfferTile from '@/components/offers/OfferTile';
import { calculateSaveAmount } from '@/utils/savingsCalculator';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2.3;

const COLORS = {
  white: colors.background.primary,
  navy: colors.nileBlue,
  gray50: colors.neutral[50],
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  gray300: colors.neutral[300],
  gray600: colors.neutral[500],
  nileBlue: colors.nileBlue,
  nileBlueLight: colors.brand.nileBlueLight,
  linen: colors.linen,
};

// Default gradient colors for different campaign types
const TYPE_GRADIENTS: Record<string, string[]> = {
  cashback: ['#FFE4B5', '#FFD699'],
  coins: ['#FFF3CD', '#FFE066'],
  bank: ['#E8F4FD', '#D1E9F9'],
  bill: ['#FFE8E0', '#FFDDD0'],
  drop: ['#FFF0F0', '#FFE0E0'],
  flash: ['#FFF8DC', '#FFE4B5'],
  'new-user': [colors.greenMist, '#C8E6C9'],
  general: [colors.tint.warmGray, '#EEEEEE'],
};

// Parse cashback percentage from a string like "10% Cashback" or "10"
const parseCashbackPercent = (cashback?: string): number => {
  if (!cashback) return 0;
  const match = cashback.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

// Skeleton loader with shimmer animation
const SkeletonLoader: React.FC = () => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [shimmerAnim]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.skeletonIcon, shimmerStyle]} />
          <View>
            <Animated.View style={[styles.skeletonTitle, shimmerStyle]} />
            <Animated.View style={[styles.skeletonSubtitle, shimmerStyle]} />
          </View>
        </View>
        <Animated.View style={[styles.skeletonButton, shimmerStyle]} />
      </View>

      {/* Category Skeleton */}
      <View style={styles.categoriesContainer}>
        {[1, 2].map((key) => (
          <View key={key} style={styles.categoryWrapper}>
            <Animated.View style={[styles.skeletonCategoryHeader, shimmerStyle]} />
            <View style={styles.dealsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.dealsScroll}
              >
                {[1, 2, 3].map((cardKey) => (
                  <View key={cardKey} style={styles.dealCard}>
                    <Animated.View style={[styles.skeletonDealImage, shimmerStyle]} />
                    <View style={styles.dealInfo}>
                      <Animated.View style={[styles.skeletonDealStore, shimmerStyle]} />
                      <Animated.View style={[styles.skeletonDealValue, shimmerStyle]} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const ExcitingDealsSection: React.FC = () => {
  const router = useRouter();
  const currentRegion = useCurrentRegionId();
  const getCurrencySymbol = useGetCurrencySymbol();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealCategories, setDealCategories] = useState<DealCategory[]>([]);
  const isMounted = useIsMounted();
  const currencySymbol = getCurrencySymbol();

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await campaignsApi.getExcitingDeals(6);

      if (response.success && response.data && response.data.dealCategories.length > 0) {
        // Remove duplicates by ID
        const uniqueCategories = response.data.dealCategories.filter((cat, index, self) =>
          index === self.findIndex((c) => c.id === cat.id)
        );

        // Ensure proper gradient colors and transform storeId
        const processedCategories = uniqueCategories.map((cat) => ({
          ...cat,
          gradientColors: cat.gradientColors?.length >= 2
            ? cat.gradientColors
            : TYPE_GRADIENTS[cat.id?.split('-')[0] || 'general'] || TYPE_GRADIENTS.general,
          badgeBg: cat.badgeBg || COLORS.white,
          badgeColor: cat.badgeColor || COLORS.navy,
          deals: cat.deals?.map((deal: CampaignDeal) => ({
            ...deal,
            storeId: deal.storeId ? String(deal.storeId) : undefined,
          })) || [],
        }));

        if (!isMounted()) return;
        setDealCategories(processedCategories);
      } else {
        setDealCategories([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load deals');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals, currentRegion]);

  const handleRetry = () => {
    fetchDeals();
  };

  const handleViewAll = () => {
    router.push('/campaigns' as any);
  };

  const handleDealPress = (deal: CampaignDeal, categoryId: string, dealIndex: number) => {
    // Always go to deal detail page first for full info and redemption flow
    // User can then navigate to store with redemption code after redeeming
    router.push(`/deals/${categoryId}/${dealIndex}` as any);
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/deals/${categoryId}` as any);
  };

  // Currency formatting helper
  const formatValue = (value: string): string => {
    if (!value) return value;
    return value
      .replace(/₹/g, currencySymbol)
      .replace(/AED\s*/g, currencySymbol)
      .replace(/د\.إ\s*/g, currencySymbol);
  };

  // Loading state with skeleton
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Error state with retry
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerEmoji}>🔥</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Exciting Deals</Text>
              <Text style={styles.headerSubtitle}>Limited time offers</Text>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={handleRetry}
           
            style={styles.retryButton}
          >
            <Ionicons name="refresh" size={16} color={colors.background.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state - don't show section
  if (dealCategories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerEmoji}>🔥</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Exciting Deals</Text>
            <Text style={styles.headerSubtitle}>Limited time offers</Text>
          </View>
        </View>
        <Pressable onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.nileBlue} />
        </Pressable>
      </View>

      {/* Campaign Categories */}
      <View style={styles.categoriesContainer}>
        {dealCategories.map((category) => (
          <View key={category.id} style={styles.categoryWrapper}>
            {/* Category Header Card */}
            <Pressable
              onPress={() => handleCategoryPress(category.id)}
             
            >
              <LinearGradient
                colors={category.gradientColors as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryHeader}
              >
                <View style={styles.categoryHeaderContent}>
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.categorySubtitle}>{formatValue(category.subtitle)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: category.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: category.badgeColor }]}>
                      {formatValue(category.badge)}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryArrow}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.navy} />
                </View>
              </LinearGradient>
            </Pressable>

            {/* Deals Horizontal Scroll */}
            <View style={styles.dealsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.dealsScroll}
              >
                {category.deals && category.deals.length > 0 ? (
                  <>
                    {category.deals.map((deal, idx) => (
                      <View key={`${category.id}-${idx}`} style={{ width: CARD_WIDTH }}>
                        <OfferTile
                          storeName={deal.store || 'Featured Store'}
                          saveAmount={calculateSaveAmount({ cashbackPercent: parseCashbackPercent(deal.cashback) })}
                          cashbackPercent={parseCashbackPercent(deal.cashback)}
                          badges={[
                            deal.bonus && { label: `+${deal.bonus}`, color: '#059669' },
                          ].filter(Boolean) as any}
                          onPress={() => handleDealPress(deal, category.id, idx)}
                          currencySymbol={currencySymbol}
                        />
                      </View>
                    ))}

                    {/* View More Card */}
                    <Pressable
                      style={styles.viewMoreCard}
                      onPress={() => handleCategoryPress(category.id)}
                     
                    >
                      <View style={styles.viewMoreContent}>
                        <View style={styles.viewMoreIconCircle}>
                          <Ionicons name="arrow-forward" size={20} color={COLORS.nileBlue} />
                        </View>
                        <Text style={styles.viewMoreText}>View All</Text>
                        <Text style={styles.viewMoreSubtext}>
                          {category.deals.length}+ deals
                        </Text>
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.noDealsCard}>
                    <Ionicons name="pricetag-outline" size={24} color={COLORS.gray300} />
                    <Text style={styles.noDealsText}>No deals available</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom CTA Banner */}
      <Pressable style={styles.ctaBanner} onPress={handleViewAll}>
        <LinearGradient
          colors={[COLORS.nileBlue, COLORS.nileBlueLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Don't Miss Out!</Text>
              <Text style={styles.ctaSubtitle}>
                New campaigns added regularly
              </Text>
            </View>
            <View style={styles.ctaButtonContainer}>
              <Text style={styles.ctaButtonText}>Explore</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.nileBlue} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  // Skeleton styles
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gray200,
  },
  skeletonTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    width: 100,
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
  },
  skeletonButton: {
    width: 80,
    height: 28,
    borderRadius: 16,
    backgroundColor: COLORS.gray200,
  },
  skeletonCategoryHeader: {
    height: 60,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: COLORS.gray200,
  },
  skeletonDealImage: {
    width: '100%',
    height: 90,
    backgroundColor: COLORS.gray200,
  },
  skeletonDealStore: {
    width: '70%',
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
    marginBottom: 8,
  },
  skeletonDealValue: {
    width: '50%',
    height: 14,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
  },

  // Error styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.nileBlue,
  },

  // Categories
  categoriesContainer: {
    gap: 16,
  },
  categoryWrapper: {
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  categoryHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryArrow: {
    marginLeft: 8,
    opacity: 0.6,
  },

  // Deals Container
  dealsContainer: {
    backgroundColor: COLORS.gray50,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 12,
  },
  dealsScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  dealCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dealInfo: {
    padding: 10,
  },

  // View More Card
  viewMoreCard: {
    width: 90,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.gray200,
  },
  viewMoreContent: {
    alignItems: 'center',
    padding: 12,
  },
  viewMoreIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
  },
  viewMoreSubtext: {
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 2,
  },

  // No Deals
  noDealsCard: {
    width: CARD_WIDTH * 2,
    height: 120,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noDealsText: {
    fontSize: 13,
    color: COLORS.gray600,
  },

  // CTA Banner
  ctaBanner: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 16,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  ctaButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.nileBlue,
  },
});

export default React.memo(ExcitingDealsSection);
