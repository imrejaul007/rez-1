// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Bank Offers Listing Page
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import realOffersApi from '@/services/realOffersApi';
import logger from '@/utils/logger';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface BankOffer {
  _id?: string;
  id?: string;
  bankName: string;
  bankLogo?: string;
  offerTitle: string;
  offerDescription?: string;
  discountPercentage: number;
  cardType?: string;
  cardNetwork?: string;
  validFrom?: string;
  validUntil?: string;
  maxDiscount?: number;
  minTransactionAmount?: number;
  promoCode?: string;
  isActive?: boolean;
}

function formatCardType(cardType?: string): string {
  if (!cardType || cardType === 'all') return 'All Cards';
  return `${cardType.charAt(0).toUpperCase()}${cardType.slice(1)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function BankOffersListScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();

  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      setError(null);
      const response = await realOffersApi.getBankOffers({ limit: 50 });
      if (response.success && response.data) {
        setOffers(Array.isArray(response.data) ? response.data : []);
      } else {
        if (!isMounted()) return;
        setOffers([]);
      }
    } catch (err: any) {
      logger.error('[BankOffers] Error fetching offers:', err);
      if (!isMounted()) return;
      setError(err.message || 'Failed to load bank offers');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleOfferPress = (offer: BankOffer) => {
    const offerId = offer._id || offer.id;
    if (offerId) {
      router.push(`/bank-offers/${offerId}` as any);
    }
  };

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  // ─── Error State ──────────────────────────────────────────────
  if (error && offers.length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Bank Offers</ThemedText>
          <View style={styles.headerBtnPlaceholder} />
        </View>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchOffers}>
            <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────
  if (offers.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Bank Offers</ThemedText>
          <View style={styles.headerBtnPlaceholder} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="card-outline" size={48} color={Colors.text.tertiary} />
          </View>
          <ThemedText style={styles.emptyTitle}>No Bank Offers Available</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Check back soon for exciting bank and card offers!
          </ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchOffers}>
            <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
            <ThemedText style={styles.retryButtonText}>Refresh</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Bank Offers</ThemedText>
        <View style={styles.headerBtnPlaceholder} />
      </View>

      {/* Offers List */}
      <FlatList
        data={offers}
        keyExtractor={(item) => (item._id || item.id) as string}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.infoScale[400]} />
        }
        renderItem={({ item: offer }) => {
          const isExpired = offer.validUntil && new Date(offer.validUntil) < new Date();
          const daysLeft = offer.validUntil
            ? Math.max(0, Math.ceil((new Date(offer.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;

          return (
            <Pressable
              style={styles.card}
              onPress={() => handleOfferPress(offer)}
            >
              {/* Card Top: Bank Logo + Discount */}
              <LinearGradient
                colors={['#1E40AF', Colors.info]}
                style={styles.cardGradient}
              >
                <View style={styles.cardGradientContent}>
                  {offer.bankLogo ? (
                    <CachedImage
                      source={offer.bankLogo}
                      style={styles.bankLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.bankLogoPlaceholder}>
                      <Ionicons name="card" size={24} color={Colors.text.inverse} />
                    </View>
                  )}
                  <View style={styles.cardGradientInfo}>
                    <ThemedText style={styles.bankName} numberOfLines={1}>
                      {offer.bankName}
                    </ThemedText>
                    {offer.cardNetwork && (
                      <ThemedText style={styles.cardNetwork}>{offer.cardNetwork}</ThemedText>
                    )}
                  </View>
                  <View style={styles.discountBadge}>
                    <ThemedText style={styles.discountText}>
                      {offer.discountPercentage}%
                    </ThemedText>
                    <ThemedText style={styles.discountLabel}>OFF</ThemedText>
                  </View>
                </View>
              </LinearGradient>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <ThemedText style={styles.offerTitle} numberOfLines={2}>
                  {offer.offerTitle}
                </ThemedText>

                {/* Chips Row */}
                <View style={styles.chipRow}>
                  <View style={[styles.chip, { backgroundColor: colors.tint.blue }]}>
                    <Ionicons name="card-outline" size={12} color={Colors.info} />
                    <ThemedText style={[styles.chipText, { color: Colors.info }]}>
                      {formatCardType(offer.cardType)}
                    </ThemedText>
                  </View>
                  {isExpired ? (
                    <View style={[styles.chip, { backgroundColor: Colors.errorScale[100] }]}>
                      <ThemedText style={[styles.chipText, { color: Colors.error }]}>Expired</ThemedText>
                    </View>
                  ) : daysLeft !== null && daysLeft <= 7 ? (
                    <View style={[styles.chip, { backgroundColor: Colors.warningScale[200] }]}>
                      <Ionicons name="time-outline" size={12} color={Colors.warning} />
                      <ThemedText style={[styles.chipText, { color: Colors.warning }]}>
                        {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                {/* Footer: Validity + Arrow */}
                <View style={styles.cardFooter}>
                  {offer.validUntil ? (
                    <View style={styles.validityRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.text.tertiary} />
                      <ThemedText style={styles.validityText}>
                        Valid till {formatDate(offer.validUntil)}
                      </ThemedText>
                    </View>
                  ) : (
                    <View />
                  )}
                  <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    ...Typography.body,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },

  // Card
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
  },
  cardGradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
  },
  bankLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardGradientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bankName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  cardNetwork: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  discountText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: '800',
    lineHeight: 22,
  },
  discountLabel: {
    color: 'rgba(255,255,255,0.8)',
    ...Typography.overline,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Card Body
  cardBody: {
    padding: 14,
  },
  offerTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
    lineHeight: 21,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  validityText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(BankOffersListScreen, 'BankOffersIndex');
