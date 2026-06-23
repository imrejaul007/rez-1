import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Brand Detail Page
 *
 * Displays detailed information about a mall brand
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
  Linking,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { mallApi } from '../../../services/mallApi';
import { MallBrand, BrandBadge, BrandTier } from '../../../types/mall.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.35;

const BADGE_COLORS: Record<BrandBadge, { bg: string; text: string }> = {
  exclusive: { bg: Colors.warning, text: Colors.text.inverse },
  premium: { bg: Colors.brand.purple, text: Colors.text.inverse },
  new: { bg: Colors.warning, text: Colors.text.inverse },
  trending: { bg: colors.brand.pink, text: Colors.text.inverse },
  'top-rated': { bg: Colors.info, text: Colors.text.inverse },
  verified: { bg: Colors.warning, text: Colors.text.inverse },
};

const TIER_COLORS: Record<BrandTier, { gradient: string[]; badge: string }> = {
  standard: { gradient: [Colors.text.tertiary, Colors.text.secondary], badge: Colors.text.tertiary },
  premium: { gradient: [Colors.brand.purple, Colors.brand.purple], badge: Colors.brand.purple },
  exclusive: { gradient: [Colors.warning, Colors.nileBlue], badge: Colors.nileBlue },
  luxury: { gradient: [Colors.warning, colors.warningScale[700]], badge: colors.brand.amberDeep },
};

function BrandDetailPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [brand, setBrand] = useState<MallBrand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchBrand = useCallback(async () => {
    if (!id) {
      setError('No brand ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await mallApi.getBrandById(id);

      if (!data) {
        // Try as a store ID — redirect to store page
        try {
          const storeData = await mallApi.getMallStoreById(id);
          if (storeData) {
            router.replace(`/MainStorePage?storeId=${id}` as any);
            return;
          }
        } catch {}
      }

      if (!isMounted()) return;
      setBrand(data);
    } catch (err: any) {
      // Try as store ID before showing error
      try {
        const storeData = await mallApi.getMallStoreById(id);
        if (storeData) {
          router.replace(`/MainStorePage?storeId=${id}` as any);
          return;
        }
      } catch {}
      if (!isMounted()) return;
      setError(err.message || 'Failed to load brand');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBrand();
  }, [fetchBrand]);

  const handleShopNow = useCallback(async () => {
    if (!brand?.externalUrl) return;

    const brandId = brand.id || brand._id;

    // Track click with affiliate system and get tracking URL
    const trackingResult = await mallApi.trackAffiliateClick(brandId);

    // Use tracking URL if available, otherwise fallback to direct URL
    const urlToOpen = trackingResult?.trackingUrl || brand.externalUrl;

    // Open in browser (works on both web and mobile)
    if (Platform.OS === 'web') {
      // On web, open in new tab
      window.open(urlToOpen, '_blank');
    } else {
      // On mobile, use expo-web-browser for in-app browser
      await WebBrowser.openBrowserAsync(urlToOpen);
    }
  }, [brand]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <DetailPageSkeleton />
      </View>
    );
  }

  // Error state
  if (error || !brand) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Unable to load brand</Text>
        <Text style={styles.errorText}>{error || 'Brand not found'}</Text>
        <Pressable style={styles.retryButton} onPress={fetchBrand}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const tierColors = TIER_COLORS[brand.tier as BrandTier] ?? TIER_COLORS.standard;
  const cashbackPercentage = brand.cashback?.percentage ?? 0;
  const cashbackDisplay = brand.cashback?.maxAmount
    ? `Up to ${currencySymbol}${brand.cashback.maxAmount}`
    : `${cashbackPercentage}%`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.background.primary}
            />
          }
        >
          {/* Hero Section */}
          <LinearGradient
            colors={tierColors.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroSection, { paddingTop: insets.top }]}
          >
            {/* Banner Image Background */}
            {brand.banner && brand.banner[0] && (
              <CachedImage
                source={brand.banner[0]}
                style={styles.heroBannerImage}
                contentFit="cover"
              />
            )}
            <View style={styles.heroOverlay} />

            {/* Back Button */}
            <Pressable
              style={[styles.backButton, { marginTop: 12 }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>

            {/* Logo & Brand Name */}
            <View style={styles.heroContent}>
              <View style={styles.logoContainer}>
                {!logoError && brand.logo ? (
                  <CachedImage
                    source={brand.logo}
                    style={styles.logo}
                    contentFit="contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoFallbackText}>{getInitials(brand.name)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.brandName}>{brand.name}</Text>

              {/* Tier Badge */}
              <View style={[styles.tierBadge, { backgroundColor: tierColors.badge }]}>
                <Ionicons name="diamond-outline" size={14} color={Colors.text.inverse} />
                <Text style={styles.tierBadgeText}>
                  {(brand.tier || 'standard').charAt(0).toUpperCase() + (brand.tier || 'standard').slice(1)}
                </Text>
              </View>

              {/* Rating */}
              {(brand.ratings?.average ?? 0) > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={18} color="#FFC107" />
                  <Text style={styles.ratingText}>
                    {(brand.ratings?.average ?? 0).toFixed(1)}
                  </Text>
                  <Text style={styles.ratingCount}>
                    ({brand.ratings?.count ?? 0} reviews)
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Cashback Card */}
          <View style={styles.cashbackCard}>
            <View style={styles.cashbackMain}>
              <Text style={styles.cashbackLabel}>Earn Cashback</Text>
              <Text style={styles.cashbackValue}>{cashbackDisplay}</Text>
              {(brand.cashback?.minPurchase ?? 0) > 0 && (
                <Text style={styles.cashbackCondition}>
                  Min. purchase {currencySymbol}{brand.cashback?.minPurchase}
                </Text>
              )}
            </View>
            {(brand.cashback?.earlyBirdBonus ?? 0) > 0 && (
              <View style={styles.bonusBadge}>
                <Ionicons name="flash" size={16} color={Colors.warning} />
                <Text style={styles.bonusText}>
                  +{brand.cashback?.earlyBirdBonus ?? 0}% Early Bird
                </Text>
              </View>
            )}
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color={colors.warningScale[700]} />
              <Text style={styles.statValue}>{brand.ratings?.successRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={24} color={colors.brand.indigo} />
              <Text style={styles.statValue}>{brand.analytics?.views || 0}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="cart-outline" size={24} color={colors.warningScale[700]} />
              <Text style={styles.statValue}>{brand.analytics?.purchases || 0}</Text>
              <Text style={styles.statLabel}>Purchases</Text>
            </View>
          </View>

          {/* Description */}
          {brand.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{brand.description}</Text>
            </View>
          )}

          {/* Badges */}
          {(brand.badges?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <View style={styles.badgesContainer}>
                {brand.badges?.map((badge) => (
                  <View
                    key={badge}
                    style={[
                      styles.badge,
                      { backgroundColor: BADGE_COLORS[badge]?.bg || colors.neutral[500] },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {badge.charAt(0).toUpperCase() + badge.slice(1).replace('-', ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Category */}
          {brand.mallCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <Pressable
                style={styles.categoryItem}
                onPress={() => brand.mallCategory?.slug && router.push(`/mall/category/${brand.mallCategory.slug}` as any)}
              >
                <Text style={styles.categoryIcon}>{brand.mallCategory.icon}</Text>
                <Text style={styles.categoryName}>{brand.mallCategory.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
              </Pressable>
            </View>
          )}

          {/* Collections */}
          {brand.collections && brand.collections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collections</Text>
              {brand.collections.map((collection) => (
                <Pressable
                  key={collection.id || collection._id}
                  style={styles.collectionItem}
                  onPress={() => router.push(`/mall/collection/${collection.slug}` as any)}
                >
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Tags */}
          {brand.tags && brand.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {brand.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Shop Now CTA Button */}
          {brand.externalUrl && (
            <View style={styles.ctaContainer}>
              <Pressable
                style={styles.ctaButton}
                onPress={handleShopNow}
               
              >
                <LinearGradient
                  colors={[colors.warningScale[400], colors.warningScale[700]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Ionicons name="cart-outline" size={22} color={Colors.text.inverse} />
                  <Text style={styles.ctaText}>Shop Now</Text>
                  <View style={styles.ctaCashback}>
                    <Text style={styles.ctaCashbackText}>
                      Earn {brand.cashback.percentage}%
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Bottom Spacer for tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing['2xl'],
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.warningScale[700],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  backLink: {
    padding: Spacing.sm,
  },
  backLinkText: {
    ...Typography.body,
    color: colors.warningScale[700],
    fontWeight: '500',
  },
  // Hero Section
  heroSection: {
    height: HERO_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBannerImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logo: {
    width: '70%',
    height: '70%',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  brandName: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: 6,
    marginBottom: Spacing.md,
  },
  tierBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  ratingCount: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Cashback Card
  cashbackCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: -30,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cashbackMain: {
    alignItems: 'center',
  },
  cashbackLabel: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  cashbackValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.warningScale[700],
  },
  cashbackCondition: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    gap: 6,
  },
  bonusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.brand.amberDeep,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.sm,
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  // Sections
  section: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 22,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  categoryIcon: {
    ...Typography.h2,
    marginRight: Spacing.md,
  },
  categoryName: {
    flex: 1,
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  collectionName: {
    flex: 1,
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  tagText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  bottomSpacer: {
    height: 100,
  },
  // CTA Button
  ctaContainer: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  ctaButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  ctaText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  ctaCashback: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  ctaCashbackText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(BrandDetailPage, 'MallBrandId');
