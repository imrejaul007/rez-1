// CardOffersSection.tsx
// Reusable component to display card offers in Cart and Checkout pages

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import discountsApi, { Discount } from '@/services/discountsApi';
import { useCartState, useGetCurrencySymbol } from '@/stores/selectors';
import { triggerImpact } from '@/utils/haptics';
import {
  Colors,
  Spacing,
  Shadows,
  BorderRadius,
  Typography,
} from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CardOffersSectionProps {
  storeId?: string;
  orderValue: number;
  onOfferApplied?: (offer: Discount) => void;
  compact?: boolean; // Compact mode for checkout
}

function CardOffersSection({
  storeId,
  orderValue,
  onOfferApplied,
  compact = false,
}: CardOffersSectionProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const router = useRouter();
  const cartState = useCartState();
  const [cardOffers, setCardOffers] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedOffer, setAppliedOffer] = useState<Discount | null>(null);
  const isMounted = useIsMounted();

  // Get applied offer from cart context
  useEffect(() => {
    if (cartState.appliedCardOffer) {
      setAppliedOffer(cartState.appliedCardOffer as any);
    }
  }, [cartState.appliedCardOffer]);

  // Fetch card offers
  useEffect(() => {
    if (!storeId || orderValue <= 0) {
      setCardOffers([]);
      setLoading(false);
      return;
    }

    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await discountsApi.getCardOffers({
          storeId,
          orderValue,
          page: 1,
          limit: 5, // Show top 5 offers
        });

        if (response.success && response.data?.discounts) {
          // Filter eligible offers
          const eligibleOffers = response.data.discounts.filter(
            offer => orderValue >= offer.minOrderValue
          );
          if (!isMounted()) return;
          setCardOffers(eligibleOffers);
        } else {
          setCardOffers([]);
        }
      } catch (error) {
        if (!isMounted()) return;
        setCardOffers([]);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchOffers();
  }, [storeId, orderValue]);

  const handleViewAllOffers = useCallback(() => {
    if (!storeId) return;
    
    triggerImpact('Light');
    router.push({
      pathname: '/CardOffersPage',
      params: {
        storeId,
        orderValue: orderValue.toString(),
      },
    } as any);
  }, [router, storeId, orderValue]);

  const handleApplyOffer = useCallback(async (offer: Discount) => {
    triggerImpact('Medium');

    try {
      // Set applied offer locally
      setAppliedOffer(offer);

      // Notify parent component
      if (onOfferApplied) {
        onOfferApplied(offer);
      }
    } catch (error) {
      // silently handle
    }
  }, [onOfferApplied]);

  // Don't show if no offers or no store
  if (!storeId || (!loading && cardOffers.length === 0 && !appliedOffer)) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary[600]} />
          <ThemedText style={styles.loadingText}>Loading card offers...</ThemedText>
        </View>
      </View>
    );
  }

  // Show applied offer
  if (appliedOffer) {
    const discountAmount = appliedOffer.type === 'percentage'
      ? `${appliedOffer.value}%`
      : `${currencySymbol}${appliedOffer.value}`;

    return (
      <View style={styles.container}>
        <Pressable
          style={styles.appliedOfferCard}
          onPress={handleViewAllOffers}
          accessible={true}
          accessibilityLabel={`Applied card offer: ${appliedOffer.name}`}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.successScale[400], colors.successScale[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.appliedOfferGradient}
          >
            <View style={styles.appliedOfferContent}>
              <View style={styles.appliedOfferIcon}>
                <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
              </View>
              <View style={styles.appliedOfferText}>
                <ThemedText style={styles.appliedOfferTitle}>
                  Card Offer Applied
                </ThemedText>
                <ThemedText style={styles.appliedOfferSubtitle}>
                  {appliedOffer.name} - Save {discountAmount}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.background.primary} />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // Show available offers
  const bestOffer = cardOffers[0];
  if (!bestOffer) return null;

  const discountAmount = bestOffer.type === 'percentage'
    ? `${bestOffer.value}%`
    : `${currencySymbol}${bestOffer.value}`;

  const bankNames = bestOffer.bankNames && bestOffer.bankNames.length > 0
    ? bestOffer.bankNames.join(', ')
    : 'All Cards';

  if (compact) {
    // Compact view for checkout
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.compactCard}
          onPress={handleViewAllOffers}
          accessible={true}
          accessibilityLabel={`Card offers available: Save up to ${discountAmount}`}
          accessibilityRole="button"
        >
          <View style={styles.compactContent}>
            <Ionicons name="card" size={20} color={Colors.primary[600]} />
            <View style={styles.compactText}>
              <ThemedText style={styles.compactTitle}>
                Card Offers Available
              </ThemedText>
              <ThemedText style={styles.compactSubtitle}>
                Save up to {discountAmount} on card payment
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
          </View>
        </Pressable>
      </View>
    );
  }

  // Full view for cart
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="card" size={24} color={Colors.primary[600]} />
          <ThemedText style={styles.headerTitle}>Card Offers</ThemedText>
        </View>
        {cardOffers.length > 1 && (
          <Pressable
            onPress={handleViewAllOffers}
            accessible={true}
            accessibilityLabel="View all card offers"
            accessibilityRole="button"
          >
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
          </Pressable>
        )}
      </View>

      <Pressable
        style={styles.offerCard}
        onPress={handleViewAllOffers}
        accessible={true}
        accessibilityLabel={`Best card offer: ${bestOffer.name}, Save ${discountAmount}`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[colors.tint.pink, colors.background.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.offerGradient}
        >
          <View style={styles.offerContent}>
            <View style={styles.offerHeader}>
              <View style={styles.offerBadge}>
                <ThemedText style={styles.offerBadgeText}>{discountAmount} OFF</ThemedText>
              </View>
              {bestOffer.cardType && bestOffer.cardType !== 'all' && (
                <View style={styles.cardTypeBadge}>
                  <ThemedText style={styles.cardTypeText}>
                    {bestOffer.cardType === 'credit' ? 'Credit' : 'Debit'} Card
                  </ThemedText>
                </View>
              )}
            </View>

            <ThemedText style={styles.offerTitle} numberOfLines={1}>
              {bestOffer.name}
            </ThemedText>

            <View style={styles.offerFooter}>
              <View style={styles.offerInfo}>
                <Ionicons name="card-outline" size={14} color={Colors.gray[600]} />
                <ThemedText style={styles.offerInfoText}>{bankNames}</ThemedText>
              </View>
              <View style={styles.offerInfo}>
                <Ionicons name="cash-outline" size={14} color={Colors.gray[600]} />
                <ThemedText style={styles.offerInfoText}>
                  Min: {currencySymbol}{bestOffer.minOrderValue.toLocaleString()}
                </ThemedText>
              </View>
            </View>

            <View style={styles.viewOfferButton}>
              <ThemedText style={styles.viewOfferText}>
                {cardOffers.length > 1 ? `View ${cardOffers.length} Offers` : 'View Offer'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary[600]} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.gray[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  offerCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    ...Shadows.medium,
  },
  offerGradient: {
    padding: Spacing.lg,
  },
  offerContent: {
    gap: Spacing.sm,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  offerBadge: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  offerBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.white,
  },
  cardTypeBadge: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cardTypeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  offerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing.xs,
  },
  offerFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  offerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  offerInfoText: {
    ...Typography.caption,
    color: Colors.gray[600],
  },
  viewOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  viewOfferText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  appliedOfferCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    ...Shadows.medium,
  },
  appliedOfferGradient: {
    padding: Spacing.md,
  },
  appliedOfferContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appliedOfferIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedOfferText: {
    flex: 1,
  },
  appliedOfferTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.white,
    marginBottom: 2,
  },
  appliedOfferSubtitle: {
    ...Typography.caption,
    color: Colors.text.white,
    opacity: 0.9,
  },
  compactCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    ...Shadows.subtle,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  compactSubtitle: {
    ...Typography.caption,
    color: Colors.gray[600],
  },
});

export default React.memo(CardOffersSection);
