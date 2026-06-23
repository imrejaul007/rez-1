// StoreInfoHeader.tsx - Store name, rating badge, category tags, feature tags
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface StoreInfoHeaderProps {
  storeName: string;
  rating: number;
  categoryTags: string[];
  /** Horizontal padding from parent layout */
  horizontalPadding: number;
}

const getCategoryIcon = (tag: string): keyof typeof Ionicons.glyphMap => {
  const lowerTag = tag.toLowerCase();
  if (lowerTag.includes('coffee') || lowerTag.includes('cafe')) return 'cafe-outline';
  if (lowerTag.includes('art')) return 'color-palette-outline';
  if (lowerTag.includes('food') || lowerTag.includes('restaurant') || lowerTag.includes('dining')) return 'restaurant-outline';
  if (lowerTag.includes('local')) return 'location-outline';
  if (lowerTag.includes('chain')) return 'link-outline';
  if (lowerTag.includes('premium')) return 'diamond-outline';
  if (lowerTag.includes('fast')) return 'flash-outline';
  if (lowerTag.includes('healthy')) return 'leaf-outline';
  return 'pricetag-outline';
};

function StoreInfoHeader({ storeName, rating, categoryTags, horizontalPadding }: StoreInfoHeaderProps) {
  const styles = React.useMemo(() => createStyles(horizontalPadding), [horizontalPadding]);

  return (
    <View style={styles.storeInfoSection}>
      {/* Store Name */}
      <ThemedText style={styles.storeNameLarge} numberOfLines={1}>
        {storeName}
      </ThemedText>

      {/* Rating + Category Tags Row */}
      <View style={styles.ratingTagsRow}>
        {/* Rating Badge - Green Pill */}
        <View style={styles.ratingBadgePill}>
          <Ionicons name="star" size={14} color="#FFB800" />
          <ThemedText style={styles.ratingBadgeText}>
            {rating > 0 ? rating.toFixed(1) : 'New'}
          </ThemedText>
        </View>

        {/* Category Tags */}
        {categoryTags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.categoryTag}>
            <Ionicons name={getCategoryIcon(tag)} size={12} color={Colors.text.tertiary} />
            <ThemedText style={styles.categoryTagText}>{tag}</ThemedText>
          </View>
        ))}
      </View>

      {/* Feature Tags Row */}
      <View style={styles.featureTagsRow}>
        <View style={styles.tagVerified}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
          <ThemedText style={styles.tagTextVerified}>Verified Partner</ThemedText>
        </View>
        <View style={styles.tagCashback}>
          <Ionicons name="flash" size={14} color="#FF9500" />
          <ThemedText style={styles.tagTextCashback}>Instant Cashback</ThemedText>
        </View>
        <View style={styles.tagCoins}>
          <Ionicons name="gift" size={14} color={Colors.brand.purpleLight} />
          <ThemedText style={styles.tagTextCoins}>Extra Coins</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default React.memo(StoreInfoHeader);

const createStyles = (horizontalPadding: number) =>
  StyleSheet.create({
    storeInfoSection: {
      marginHorizontal: horizontalPadding,
      marginTop: Spacing.base,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.base,
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: "rgba(0, 0, 0, 0.04)",
    },
    storeNameLarge: {
      ...Typography.h3,
      fontWeight: "700",
      color: colors.brand.navyDark,
      letterSpacing: -0.3,
      marginBottom: Spacing.md,
    },
    ratingTagsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    ratingBadgePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: "rgba(0, 192, 106, 0.12)",
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: BorderRadius.xl,
    },
    ratingBadgeText: {
      ...Typography.body,
      fontWeight: "700",
      color: colors.brand.navyDark,
    },
    categoryTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: "rgba(0, 0, 0, 0.04)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.xl,
    },
    categoryTagText: {
      ...Typography.bodySmall,
      fontWeight: "500",
      color: Colors.text.secondary,
    },
    featureTagsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: Spacing.sm,
      marginTop: 10,
    },
    tagVerified: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: "rgba(0, 192, 106, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.xl,
    },
    tagTextVerified: {
      ...Typography.bodySmall,
      fontWeight: "600",
      color: "#00875A",
    },
    tagCashback: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: "rgba(255, 149, 0, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.xl,
    },
    tagTextCashback: {
      ...Typography.bodySmall,
      fontWeight: "600",
      color: "#CC7700",
    },
    tagCoins: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: "rgba(139, 92, 246, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.xl,
    },
    tagTextCoins: {
      ...Typography.bodySmall,
      fontWeight: "600",
      color: Colors.brand.purple,
    },
  });
