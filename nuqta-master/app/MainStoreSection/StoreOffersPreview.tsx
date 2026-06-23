import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreOffersPreview.tsx - Store offers section with offer cards
import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

export interface StoreOffer {
  id: string;
  type: 'percentage' | 'flat' | 'cashback' | 'bogo';
  value: number;
  title: string;
  description?: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  code?: string;
  validTill?: string;
  coinsToEarn?: number;
}

interface StoreOffersPreviewProps {
  offers: StoreOffer[];
  onViewAll?: () => void;
  onApplyOffer?: (offer: StoreOffer) => void;
}

function StoreOffersPreview({
  offers = [],
  onViewAll,
  onApplyOffer,
}: StoreOffersPreviewProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (offers.length === 0) return null;

  // Get badge text and color based on offer type
  const getOfferBadge = (offer: StoreOffer) => {
    switch (offer.type) {
      case 'percentage':
        return { text: `${offer.value}% OFF`, bgColor: '#FF6B35' };
      case 'flat':
        return { text: `${currencySymbol}${offer.value} OFF`, bgColor: '#E53935' };
      case 'cashback':
        return { text: `${offer.value}% CASHBACK`, bgColor: '#7B1FA2' };
      case 'bogo':
        return { text: `${offer.value}% OFF`, bgColor: '#FF6B35' };
      default:
        return { text: `${offer.value}% OFF`, bgColor: '#FF6B35' };
    }
  };

  // Format validity text
  const getValidityText = (validTill?: string) => {
    if (!validTill) return null;

    const date = new Date(validTill);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Valid today';
    if (diffDays === 1) return 'Valid till tomorrow';
    if (diffDays <= 7) return `Valid for ${diffDays} days`;

    return `Valid till ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Offers at this store</ThemedText>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <ThemedText style={styles.viewAllText}>View all</ThemedText>
          </Pressable>
        )}
      </View>

      {/* Offers List */}
      <View style={styles.offersList}>
        {offers.slice(0, 3).map((offer, index) => {
          const badge = getOfferBadge(offer);
          const validity = getValidityText(offer.validTill);

          return (
            <View key={offer.id || index} style={styles.offerCard}>
              {/* Top Row - Badge & Validity */}
              <View style={styles.offerTopRow}>
                <View style={[styles.offerBadge, { backgroundColor: badge.bgColor }]}>
                  <ThemedText style={styles.offerBadgeText}>{badge.text}</ThemedText>
                </View>
                {validity && (
                  <ThemedText style={styles.validityText}>{validity}</ThemedText>
                )}
              </View>

              {/* Title */}
              <ThemedText style={styles.offerTitle} numberOfLines={2}>
                {offer.title}
              </ThemedText>

              {/* Description/Condition */}
              {offer.description && (
                <ThemedText style={styles.offerDescription} numberOfLines={1}>
                  {offer.description}
                </ThemedText>
              )}
              {offer.minOrderAmount && !offer.description && (
                <ThemedText style={styles.offerDescription}>
                  On orders above {currencySymbol}{offer.minOrderAmount}
                </ThemedText>
              )}
              {offer.code && (
                <ThemedText style={styles.offerDescription}>
                  Use code: {offer.code}
                </ThemedText>
              )}

              {/* Bottom Row - Coins & Apply Button */}
              <View style={styles.offerBottomRow}>
                {offer.coinsToEarn && offer.coinsToEarn > 0 ? (
                  <View style={styles.coinsContainer}>
                    <ThemedText style={styles.coinEmoji}>🪙</ThemedText>
                    <ThemedText style={styles.coinsText}>
                      Earn {offer.coinsToEarn} coins
                    </ThemedText>
                  </View>
                ) : (
                  <View />
                )}
                <Pressable
                  style={styles.applyButton}
                  onPress={() => onApplyOffer?.(offer)}
                 
                >
                  <ThemedText style={styles.applyButtonText}>Apply Offer</ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.base,
  },
  headerTitle: {
    ...Typography.bodyLarge,
    fontWeight: "700",
    color: Colors.nileBlue,
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.gold,
  },
  offersList: {
    gap: Spacing.md,
  },
  offerCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  offerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  offerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offerBadgeText: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.text.inverse,
    textTransform: "uppercase",
  },
  validityText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  offerTitle: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
  },
  offerDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  offerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coinEmoji: {
    fontSize: 16,
  },
  coinsText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.brand.amberDeep,
  },
  applyButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  applyButtonText: {
    ...Typography.bodySmall,
    fontWeight: "700",
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(StoreOffersPreview, 'MainStoreSectionStoreOffersPreview');
