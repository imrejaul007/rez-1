// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Coupons List Page
 *
 * Full list of available coupon codes with search, category filters, and copy functionality.
 * Data source: couponService.getAvailableCoupons() and couponService.searchCoupons()
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  RefreshControl,
  Clipboard,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import couponService, { Coupon } from '@/services/couponApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'food', label: 'Food' },
  { key: 'travel', label: 'Travel' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'electronics', label: 'Electronics' },
];

interface DisplayCoupon {
  _id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap: number;
  validUntil: string;
  isVerified: boolean;
  isExclusive: boolean;
  successRate: number;
  tags: string[];
}

function transformCoupon(coupon: Coupon): DisplayCoupon {
  return {
    _id: coupon._id,
    code: coupon.couponCode,
    brandName: coupon.title.split(' - ')[0] || coupon.title,
    brandLogo: coupon.imageUrl,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    maxDiscountCap: coupon.maxDiscountCap,
    validUntil: coupon.validTo,
    isVerified: true,
    isExclusive: coupon.tags?.includes('rez-exclusive') || false,
    successRate: 95,
    tags: coupon.tags || [],
  };
}

function CouponsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [coupons, setCoupons] = useState<DisplayCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRef = useRef(true);

  const fetchCoupons = useCallback(async (query?: string, category?: string) => {
    try {
      setError(null);
      let response;

      if (query && query.length >= 2) {
        response = await couponService.searchCoupons({
          q: query,
          ...(category && category !== 'all' ? { category } : {}),
        });
      } else {
        response = await couponService.getAvailableCoupons({
          ...(category && category !== 'all' ? { category } : {}),
        });
      }

      if (response.success && response.data) {
        const rawCoupons = response.data.coupons || [];
        if (!isMounted()) return;
        setCoupons(rawCoupons.map(transformCoupon));
      }
    } catch (err) {
      if (coupons.length === 0) {
        if (!isMounted()) return;
        setError('Unable to load coupons. Pull down to retry.');
      }
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [coupons.length]);

  // Initial fetch
  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Search with debounce
  useEffect(() => {
    if (isInitialRef.current) {
      isInitialRef.current = false;
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsLoading(true);
      fetchCoupons(searchQuery, selectedCategory);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedCategory, fetchCoupons]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCoupons(searchQuery, selectedCategory);
  }, [fetchCoupons, searchQuery, selectedCategory]);

  const handleCopyCoupon = useCallback(async (code: string) => {
    try {
      await Clipboard.setString(code);
      if (!isMounted()) return;
      setCopiedCode(code);
      platformAlertSimple('Copied!', `Coupon code "${code}" copied to clipboard`);
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (err) {
      // silently handle
    }
  }, []);

  const renderCouponCard = useCallback(({ item }: { item: DisplayCoupon }) => {
    const isCopied = copiedCode === item.code;
    const discountDisplay = item.discountType === 'PERCENTAGE'
      ? `${item.discountValue}% OFF`
      : `${currencySymbol}${item.discountValue} OFF`;

    return (
      <View style={styles.couponCard}>
        {/* Badges Row */}
        <View style={styles.badgesRow}>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color={Colors.background.primary} />
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          )}
          {item.isExclusive && (
            <View style={styles.exclusiveBadge}>
              <Ionicons name="diamond" size={10} color={Colors.gold} />
              <Text style={[styles.badgeText, { color: Colors.gold }]}>Exclusive</Text>
            </View>
          )}
        </View>

        <View style={styles.couponCardContent}>
          {/* Brand Logo */}
          <View style={styles.logoSection}>
            {item.brandLogo ? (
              <CachedImage source={item.brandLogo} style={styles.brandLogo} contentFit="contain" />
            ) : (
              <LinearGradient colors={[Colors.lightPeach, colors.brand.caramel]} style={styles.logoPlaceholder}>
                <Text style={styles.logoInitial}>{item.brandName.charAt(0)}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.brandName}>{item.brandName}</Text>
            <Text style={styles.discount}>{discountDisplay}</Text>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.minOrderValue > 0 && (
              <Text style={styles.minOrder}>Min. order {currencySymbol}{item.minOrderValue}</Text>
            )}

            {/* Success Rate */}
            <View style={styles.successRateRow}>
              <View style={styles.successBarBg}>
                <View style={[styles.successBarFill, { width: `${item.successRate}%` }]} />
              </View>
              <Text style={styles.successRateText}>{item.successRate}%</Text>
            </View>
          </View>
        </View>

        {/* Code + Copy Section */}
        <View style={styles.codeSection}>
          <View style={styles.dashedBorder}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <Pressable
            style={[styles.copyButton, isCopied && styles.copyButtonCopied]}
            onPress={() => handleCopyCoupon(item.code)}
           
          >
            <LinearGradient
              colors={isCopied ? [Colors.nileBlue, colors.brand.nileBlueLight] : [colors.brand.caramel, colors.brand.caramel]}
              style={styles.copyButtonGradient}
            >
              <Ionicons name={isCopied ? 'checkmark' : 'copy'} size={14} color={Colors.background.primary} />
              <Text style={styles.copyText}>{isCopied ? 'COPIED' : 'COPY'}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Validity */}
        {item.validUntil && (
          <View style={styles.validityRow}>
            <Ionicons name="time-outline" size={12} color={Colors.background.secondary0} />
            <Text style={styles.validityText}>
              Valid till {new Date(item.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    );
  }, [copiedCode, currencySymbol, handleCopyCoupon]);

  const renderCategoryFilterItem = useCallback(({ item }: { item: typeof CATEGORIES[number] }) => {
    const isActive = selectedCategory === item.key;
    return (
      <Pressable
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setSelectedCategory(item.key)}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Coupon Codes</Text>
          {coupons.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{coupons.length}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.background.secondary0} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coupons or brands..."
            placeholderTextColor={Colors.background.secondary0}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.background.secondary0} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlashList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={renderCategoryFilterItem}
          estimatedItemSize={44}
        />
      </View>

      {/* Coupon List */}
      {isLoading && coupons.length === 0 ? (
        <CardGridSkeleton />
      ) : error && coupons.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.brand.caramel} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable
            onPress={handleRefresh}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={coupons}
          renderItem={renderCouponCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.brand.caramel]} />
          }
          estimatedItemSize={100}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color={Colors.background.secondary0} />
              <Text style={styles.emptyTitle}>No Coupons Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Check back later for new coupon codes'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  countBadge: {
    backgroundColor: colors.brand.caramel,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.nileBlue,
  },

  // Filters
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  filterList: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterChipActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.background.secondary0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.sm,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.background.secondary0,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.nileBlue,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.background.secondary0,
    textAlign: 'center',
  },

  // Coupon Card
  couponCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.lightPeach}40`,
    ...Platform.select({
      ios: { shadowColor: Colors.lightPeach, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.lightPeach,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  couponCardContent: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  logoSection: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  brandLogo: {
    width: 56,
    height: 56,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  infoSection: {
    flex: 1,
  },
  brandName: {
    fontSize: 12,
    color: Colors.background.secondary0,
    fontWeight: '500',
    marginBottom: 2,
  },
  discount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.brand.caramel,
    letterSpacing: -0.3,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 13,
    color: Colors.nileBlue,
    lineHeight: 18,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  minOrder: {
    fontSize: 11,
    color: Colors.background.secondary0,
    marginBottom: 6,
  },
  successRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  successBarFill: {
    height: '100%',
    backgroundColor: colors.brand.caramel,
    borderRadius: 2,
  },
  successRateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.caramel,
  },

  // Code Section
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dashedBorder: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.lightPeach,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.nileBlue,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  copyButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  copyButtonCopied: {},
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },

  // Validity
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  validityText: {
    fontSize: 11,
    color: Colors.background.secondary0,
  },
});

export default withErrorBoundary(CouponsPage, 'CashStoreCoupons');
