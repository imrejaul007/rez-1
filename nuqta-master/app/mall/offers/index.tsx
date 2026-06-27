// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * All Offers Page
 *
 * Displays all mall offers with countdown timers
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Text,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mallApi } from '../../../services/mallApi';
import { MallOffer, getDaysRemaining, formatValueDisplay } from '../../../types/mall.types';
import MallEmptyState from '../../../components/mall/pages/MallEmptyState';
import MallLoadingSkeleton from '../../../components/mall/pages/MallLoadingSkeleton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OFFER_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'limited-time': { bg: Colors.error, text: Colors.background.primary },
  'mall-exclusive': { bg: Colors.warning, text: Colors.background.primary },
  'flash-sale': { bg: Colors.warning, text: Colors.background.primary },
  'best-deal': { bg: Colors.brand.purpleLight, text: Colors.background.primary },
};

interface OfferCardProps {
  offer: MallOffer;
  onPress: (offer: MallOffer) => void;
  currencySymbol: string;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onPress, currencySymbol }) => {
  const daysRemaining = getDaysRemaining(offer.validUntil);
  const valueDisplay = formatValueDisplay(offer.value, offer.valueType);
  const badgeStyle = offer.badge ? OFFER_BADGE_COLORS[offer.badge] : null;

  return (
    <Pressable
      style={styles.offerCard}
      onPress={() => onPress(offer)}
     
    >
      <View style={styles.offerImageContainer}>
        {offer.image ? (
          <CachedImage
            source={offer.image}
            style={styles.offerImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.offerImage, { backgroundColor: Colors.background.secondary }]} />
        )}
        {offer.badge && badgeStyle && (
          <View style={[styles.offerBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.offerBadgeText, { color: badgeStyle.text }]}>
              {offer.badge.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.valueTag}>
          <Text style={styles.valueTagText}>{valueDisplay}</Text>
        </View>
      </View>

      <View style={styles.offerContent}>
        <View style={styles.brandRow}>
          {(offer.brand?.logo || offer.store?.logo) && (
            <CachedImage
              source={offer.brand?.logo || offer.store?.logo}
              style={styles.brandLogo}
              contentFit="contain"
            />
          )}
          <Text style={styles.brandName}>{offer.brand?.name || offer.store?.name || ''}</Text>
        </View>

        <Text style={styles.offerTitle} numberOfLines={2}>
          {offer.title}
        </Text>

        {offer.subtitle && (
          <Text style={styles.offerSubtitle} numberOfLines={1}>
            {offer.subtitle}
          </Text>
        )}

        <View style={styles.offerFooter}>
          <View style={styles.validityRow}>
            <Ionicons
              name={daysRemaining <= 3 ? 'time-outline' : 'calendar-outline'}
              size={14}
              color={daysRemaining <= 3 ? Colors.error : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.validityText,
                daysRemaining <= 3 && styles.validityTextUrgent,
              ]}
            >
              {daysRemaining === 0
                ? 'Ends today!'
                : daysRemaining === 1
                ? '1 day left'
                : `${daysRemaining} days left`}
            </Text>
          </View>

          {(offer.minPurchase ?? 0) > 0 && (
            <Text style={styles.minPurchase}>Min. {currencySymbol}{offer.minPurchase}</Text>
          )}
        </View>

        {offer.isMallExclusive && (
          <View style={styles.exclusiveTag}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.exclusiveText}>Mall Exclusive</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

function AllOffersPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [offers, setOffers] = useState<MallOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchOffers = useCallback(async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    try {
      setError(null);
      const result = await mallApi.getOffers(pageNum, LIMIT);

      if (!isMounted()) return;
      setTotal(result.total);

      if (append) {
        if (!isMounted()) return;
        setOffers(prev => [...prev, ...result.offers]);
      } else {
        if (!isMounted()) return;
        setOffers(result.offers);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load offers');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers(1, false);
  }, [fetchOffers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchOffers(1, false);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    const totalPages = Math.ceil(total / LIMIT);
    if (isLoadingMore || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOffers(nextPage, true);
  }, [page, total, isLoadingMore, fetchOffers]);

  const handleOfferPress = useCallback((offer: MallOffer) => {
    if (offer.store) {
      router.push(`/MainStorePage?storeId=${offer.store._id}` as any);
    } else if (offer.brand) {
      router.push(`/mall/brand/${offer.brand.id || offer.brand._id}` as any);
    } else {
      // No specific target - stay on offers page (already here)
    }
  }, [router]);

  const renderItem = useCallback(({ item }: { item: MallOffer }) => (
    <OfferCard offer={item} onPress={handleOfferPress} currencySymbol={currencySymbol} />
  ), [handleOfferPress, currencySymbol]);

  const keyExtractor = useCallback((item: MallOffer) =>
    item.id || item._id, []);

  const ListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <LinearGradient
        colors={[Colors.warning, colors.warningScale[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Ionicons name="gift-outline" size={32} color={Colors.text.inverse} />
        <Text style={styles.headerTitle}>Exclusive Offers</Text>
        <Text style={styles.headerSubtitle}>
          Limited-time deals with extra cashback
        </Text>
      </LinearGradient>
      <View style={styles.countRow}>
        <Text style={styles.resultCount}>
          {offers.length} of {total} offers
        </Text>
      </View>
    </View>
  ), [offers.length, total]);

  const ListFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={Colors.warning} />
        </View>
      );
    }
    return null;
  }, [isLoadingMore]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Exclusive Offers' }} />
        <View style={styles.container}>
          <MallLoadingSkeleton count={4} type="list" />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Exclusive Offers' }} />
        <View style={styles.container}>
          <MallEmptyState
            title="Something went wrong"
            message={error}
            icon="alert-circle-outline"
            actionLabel="Try Again"
            onAction={handleRefresh}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Exclusive Offers' }} />

      <View style={styles.container}>
        <FlashList
          data={offers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          estimatedItemSize={120}
          ListEmptyComponent={
            <MallEmptyState
              title="No offers available"
              message="Check back later for exclusive deals"
              icon="gift-outline"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.warning}
              colors={[Colors.warning]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  listContent: {
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: Spacing.sm,
  },
  headerGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  countRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  resultCount: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  offerCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  offerImageContainer: {
    height: 140,
    position: 'relative',
    backgroundColor: Colors.background.secondary,
  },
  offerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  offerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  offerBadgeText: {
    ...Typography.overline,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valueTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  valueTagText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  offerContent: {
    padding: Spacing.base,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  brandName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  offerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  offerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  offerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  validityText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  validityTextUrgent: {
    color: Colors.error,
  },
  minPurchase: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  exclusiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: colors.linen,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  exclusiveText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(AllOffersPage, 'MallOffersIndex');
