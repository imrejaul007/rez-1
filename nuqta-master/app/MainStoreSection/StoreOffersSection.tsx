import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreOffersSection.tsx - Offers at this store section
import React, {} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows } from "@/constants/DesignSystem";
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface Offer {
  id: string;
  type: "percentage" | "flat" | "cashback";
  value: number;
  title: string;
  description: string;
  validity: string;
  coinsToEarn: number;
  code?: string;
  minOrder?: number;
}

export interface StoreOffersSectionProps {
  offers?: Offer[];
  onViewAll?: () => void;
  onApplyOffer?: (offer: Offer) => void;
}

// Deprecated: sample data kept for reference only — not used as fallback in production
// const SAMPLE_OFFERS: Offer[] = [
//   { id: "1", type: "percentage", value: 20, title: "Buy 1 Get 1 Free on Beverages", description: "On orders above 300", validity: "Valid till Dec 31", coinsToEarn: 25 },
//   { id: "2", type: "flat", value: 100, title: "Flat 100 off on first order", description: "Use code: FIRST100", validity: "Valid today", coinsToEarn: 50, code: "FIRST100" },
//   { id: "3", type: "cashback", value: 15, title: "Extra 15% Cashback with UPI", description: "Max cashback 150", validity: "Valid for 7 days", coinsToEarn: 30 },
// ];

function StoreOffersSection({
  offers = [],
  onViewAll,
  onApplyOffer }: StoreOffersSectionProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const getOfferBadge = (offer: Offer) => {
    switch (offer.type) {
      case "percentage":
        return `${offer.value}% OFF`;
      case "flat":
        return `${currencySymbol}${offer.value} OFF`;
      case "cashback":
        return `${offer.value}% CASHBACK`;
      default:
        return "OFFER";
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "percentage":
        return "#FF3B30";
      case "flat":
        return colors.lightMustard;
      case "cashback":
        return colors.brand.ios;
      default:
        return colors.lightMustard;
    }
  };

  // Don't render section if no offers are available
  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Offers at this store</ThemedText>
        <Pressable onPress={onViewAll} accessibilityRole="button">
          <ThemedText style={styles.viewAll}>View all</ThemedText>
        </Pressable>
      </View>

      {/* Offers List */}
      <View style={styles.offersList}>
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            badgeText={getOfferBadge(offer)}
            badgeColor={getBadgeColor(offer.type)}
            onApply={() => onApplyOffer?.(offer)}
          />
        ))}
      </View>
    </View>
  );
}

interface OfferCardProps {
  offer: Offer;
  badgeText: string;
  badgeColor: string;
  onApply: () => void;
}

function OfferCard({ offer, badgeText, badgeColor, onApply }: OfferCardProps) {
  const scaleAnim = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animateScale = (toValue: number) => {
    scaleAnim.value = withSpring(toValue, { damping: 8, stiffness: 100 });
  };

  const handleApply = () => {
    triggerImpact('Light');
    onApply();
  };

  return (
    <View style={styles.offerCard}>
      {/* Badge and Validity */}
      <View style={styles.offerHeader}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <ThemedText style={styles.badgeText}>{badgeText}</ThemedText>
        </View>
        <ThemedText style={styles.validity}>{offer.validity}</ThemedText>
      </View>

      {/* Offer Title */}
      <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>

      {/* Offer Description */}
      <ThemedText style={styles.offerDescription}>{offer.description}</ThemedText>

      {/* Coins and Apply Button */}
      <View style={styles.offerFooter}>
        <View style={styles.coinsEarn}>
          <CachedImage
            source={BRAND.COIN_IMAGE}
            style={styles.coinIcon}
            contentFit="contain"
          />
          <ThemedText style={styles.coinsText}>Earn {offer.coinsToEarn} coins</ThemedText>
        </View>
        <Animated.View style={scaleStyle}>
          <Pressable
            style={styles.applyButton}
           
            onPress={handleApply}
            onPressIn={() => animateScale(0.95)}
            onPressOut={() => animateScale(1)}
            accessibilityRole="button"
            accessibilityLabel={`Apply offer: ${offer.title}`}
          >
            <ThemedText style={styles.applyButtonText}>Apply Offer</ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary },
  viewAll: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.lightMustard },
  offersList: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md },
  offerCard: {
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    ...Shadows.subtle },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.background.primary },
  validity: {
    fontSize: 12,
    color: Colors.text.tertiary },
  offerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4 },
  offerDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: Spacing.md },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between" },
  coinsEarn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6 },
  coinIcon: {
    width: 20,
    height: 20 },
  coinsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF9500" },
  applyButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background.primary } });

export default withErrorBoundary(StoreOffersSection, 'MainStoreSectionStoreOffersSection');
