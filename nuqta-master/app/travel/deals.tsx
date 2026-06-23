import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Hot Deals Page - All featured travel deals
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import travelApi, { TravelService } from '@/services/travelApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  cyan500: colors.brand.cyan,
  amber500: Colors.warning,
};

const HotDealsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deals, setDeals] = useState<TravelService[]>([]);

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await travelApi.getFeatured(20);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setDeals(response.data);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDeals();
  }, [fetchDeals]);

  const handleDealPress = (service: TravelService) => {
    const serviceId = service._id || service.id;
    if (!serviceId) return;

    const category = service.serviceCategory?.slug || 'packages';
    
    // Route to appropriate detail page based on category
    if (category === 'flights') {
      router.push(`/flight/${serviceId}` as any);
    } else if (category === 'hotels') {
      router.push(`/hotel/${serviceId}` as any);
    } else if (category === 'trains') {
      router.push(`/train/${serviceId}` as any);
    } else if (category === 'bus') {
      router.push(`/bus/${serviceId}` as any);
    } else if (category === 'cab') {
      router.push(`/cab/${serviceId}` as any);
    } else if (category === 'packages') {
      router.push(`/package/${serviceId}` as any);
    } else {
      router.push(`/product-page?cardId=${serviceId}&cardType=product` as any);
    }
  };

  if (isLoading) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.cyan, colors.cyanDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Hot Deals</Text>
            <Text style={styles.headerSubtitle}>Best travel offers</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.cyan500]} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {deals.length > 0 ? (
          <View style={styles.dealsGrid}>
            {deals.map((deal) => {
              const dealId = deal._id || deal.id;
              const imageUrl = deal.images?.[0];
              const price = deal.pricing?.selling || 0;
              const cashback = deal.cashback?.percentage || deal.serviceCategory?.cashbackPercentage || 0;
              const rating = deal.ratings?.average || 0;

              return (
                <Pressable
                  key={dealId}
                  style={styles.dealCard}
                  onPress={() => handleDealPress(deal)}
                 
                >
                  <CachedImage source={imageUrl} style={styles.dealImage} />
                  {cashback > 0 && (
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>{cashback}%</Text>
                    </View>
                  )}
                  <View style={styles.dealInfo}>
                    <Text style={styles.dealName} numberOfLines={2}>{deal.name}</Text>
                    <View style={styles.dealMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color={COLORS.amber500} />
                        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.dealCategory}>{deal.serviceCategory?.name || 'Travel'}</Text>
                    </View>
                    <Text style={styles.dealPrice}>
                      {price > 0 ? `From ${currencySymbol}${price.toLocaleString('en-IN')}` : 'Price on request'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="flame-outline" size={64} color={COLORS.gray600} />
            <Text style={styles.emptyTitle}>No Hot Deals Available</Text>
            <Text style={styles.emptySubtitle}>Check back later for exciting offers!</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: COLORS.gray600,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  dealCard: {
    width: '48%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: Spacing.md,
  },
  dealImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.gray100,
  },
  cashbackBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '700',
    color: COLORS.white,
  },
  dealInfo: {
    padding: Spacing.md,
  },
  dealName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
    minHeight: 40,
  },
  dealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
  },
  dealCategory: {
    ...Typography.caption,
    color: COLORS.gray600,
    textTransform: 'uppercase',
  },
  dealPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.green500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});

export default withErrorBoundary(HotDealsPage, 'TravelDeals');
