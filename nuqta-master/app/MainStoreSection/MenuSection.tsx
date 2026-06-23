// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// MenuSection.tsx - Menu list with coin earnings
import React, { useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { triggerImpact } from "@/utils/haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  Colors,
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";
import { useGetCurrencySymbol } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface MenuItem {
  id: string;
  name: string;
  variant?: string;
  price: number;
  image?: string;
  coinsToEarn: number;
}

export interface MenuSectionProps {
  items?: MenuItem[];
  onItemPress?: (item: MenuItem) => void;
}

// Deprecated: sample data kept for reference only — not used as fallback in production
// const SAMPLE_ITEMS: MenuItem[] = [
//   { id: "1", name: "Caramel Macchiato", variant: "Tall", price: 340, coinsToEarn: 17 },
//   { id: "2", name: "Cappuccino", variant: "Grande", price: 290, coinsToEarn: 15 },
//   { id: "3", name: "Chocolate Croissant", variant: "Fresh baked", price: 180, coinsToEarn: 9 },
//   { id: "4", name: "Cold Brew", variant: "Venti", price: 360, coinsToEarn: 18 },
// ];

function MenuSection({
  items = [],
  onItemPress,
}: MenuSectionProps) {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const handleItemPress = useCallback((item: MenuItem) => {
    triggerImpact('Light');
    if (onItemPress) {
      onItemPress(item);
    } else {
      // Navigate to product page
      router.push(`/product-page?productId=${item.id}` as any);
    }
  }, [onItemPress, router]);

  const renderItem = useCallback(({ item }: { item: MenuItem }) => (
    <Pressable
      style={styles.menuItem}
     
      onPress={() => handleItemPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.variant}, ${item.price} rupees, earn ${item.coinsToEarn} coins`}
    >
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {item.image ? (
          <CachedImage source={item.image} style={styles.itemImage} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cafe" size={24} color={Colors.gray[300]} />
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
        {item.variant && (
          <ThemedText style={styles.itemVariant}>{item.variant}</ThemedText>
        )}
        <ThemedText style={styles.itemPrice}>{currencySymbol}{item.price}</ThemedText>
      </View>

      {/* Coins to Earn */}
      <View style={styles.coinsContainer}>
        <CachedImage
          source={BRAND.COIN_IMAGE}
          style={styles.coinIcon}
          contentFit="contain"
        />
        <ThemedText style={styles.coinsText}>+{item.coinsToEarn} coins</ThemedText>
      </View>
    </Pressable>
  ), [handleItemPress, currencySymbol]);

  // Don't render section if no menu items are available
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        estimatedItemSize={60}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  imageContainer: {
    marginRight: Spacing.md,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  coinIcon: {
    width: 20,
    height: 20,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9500",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.gray[100],
    marginLeft: 70 + Spacing.base + Spacing.md, // Align with text start
  },
});

export default withErrorBoundary(MenuSection, 'MainStoreSectionMenuSection');
