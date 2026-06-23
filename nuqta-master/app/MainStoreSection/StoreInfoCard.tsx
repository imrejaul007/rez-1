import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreInfoCard.tsx - Store info section with image, name, rating, tags, and status
import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { colors } from '@/constants/theme';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
} from "@/constants/DesignSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface StoreInfoCardProps {
  storeImage?: string;
  storeName: string;
  rating?: number;
  ratingCount?: number;
  distance?: string;
  isVerified?: boolean;
  hasInstantCashback?: boolean;
  hasExtraCoins?: boolean;
  isOpen?: boolean;
  closingTime?: string;
  acceptsCoins?: boolean;
}

function StoreInfoCard({
  storeImage,
  storeName,
  rating = 0,
  ratingCount = 0,
  distance = "",
  isVerified = false,
  hasInstantCashback = false,
  hasExtraCoins = false,
  isOpen = true,
  closingTime = "10pm",
  acceptsCoins = true,
}: StoreInfoCardProps) {
  // Format rating count
  const formatRatingCount = (count: number): string => {
    if (count >= 1000) {
      return `(${(count / 1000).toFixed(1)}k)`;
    }
    return `(${count})`;
  };

  return (
    <View style={styles.container}>
      {/* Store Image */}
      <View style={styles.imageContainer}>
        {storeImage ? (
          <CachedImage
            source={storeImage}
            style={styles.storeImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="storefront-outline" size={60} color={Colors.gray[300]} />
          </View>
        )}
      </View>

      {/* Store Info */}
      <View style={styles.infoContainer}>
        {/* Name, Rating, Distance */}
        <View style={styles.nameRow}>
          <ThemedText style={styles.storeName}>{storeName}</ThemedText>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFB800" />
            <ThemedText style={styles.ratingText}>
              {rating.toFixed(1)} {formatRatingCount(ratingCount)}
            </ThemedText>
          </View>
          {distance && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
              <ThemedText style={styles.distanceText}>{distance}</ThemedText>
            </View>
          )}
        </View>

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {isVerified && (
            <View style={[styles.tag, styles.tagGreen]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.lightMustard} />
              <ThemedText style={[styles.tagText, styles.tagTextGreen]}>Verified Partner</ThemedText>
            </View>
          )}
          {hasInstantCashback && (
            <View style={[styles.tag, styles.tagOrange]}>
              <Ionicons name="flash" size={14} color={colors.lightMustard} />
              <ThemedText style={[styles.tagText, styles.tagTextOrange]}>Instant Cashback</ThemedText>
            </View>
          )}
          {hasExtraCoins && (
            <View style={[styles.tag, styles.tagGreen]}>
              <Ionicons name="server" size={14} color={colors.lightMustard} />
              <ThemedText style={[styles.tagText, styles.tagTextGreen]}>Extra Coins</ThemedText>
            </View>
          )}
        </View>

        {/* Status Pills */}
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, isOpen ? styles.statusOpen : styles.statusClosed]}>
            <View style={[styles.statusDot, isOpen ? styles.dotOpen : styles.dotClosed]} />
            <ThemedText style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
              {isOpen ? `Open now · Closes ${closingTime}` : "Closed"}
            </ThemedText>
          </View>
          {acceptsCoins && (
            <View style={[styles.statusPill, styles.statusCoins]}>
              <Ionicons name="server" size={14} color={colors.lightMustard} />
              <ThemedText style={styles.statusTextCoins}>Coins accepted</ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingBottom: Spacing.md,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 200,
    overflow: "hidden",
  },
  storeImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  storeName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  tagGreen: {
    backgroundColor: "rgba(255, 205, 87, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 205, 87, 0.3)",
  },
  tagOrange: {
    backgroundColor: "rgba(255, 205, 87, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 205, 87, 0.3)",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagTextGreen: {
    color: colors.lightMustard,
  },
  tagTextOrange: {
    color: colors.lightMustard,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  statusOpen: {
    backgroundColor: "rgba(255, 205, 87, 0.1)",
  },
  statusClosed: {
    backgroundColor: "rgba(26, 58, 82, 0.1)",
  },
  statusCoins: {
    backgroundColor: "rgba(255, 205, 87, 0.1)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: colors.lightMustard,
  },
  dotClosed: {
    backgroundColor: colors.nileBlue,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusTextOpen: {
    color: colors.lightMustard,
  },
  statusTextClosed: {
    color: colors.nileBlue,
  },
  statusTextCoins: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.lightMustard,
  },
});

export default withErrorBoundary(StoreInfoCard, 'MainStoreSectionStoreInfoCard');
