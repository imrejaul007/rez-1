/**
 * ProductImage Component
 *
 * Handles product image display with badges and wishlist button
 *
 * @component
 */

import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import StockBadge from '@/components/common/StockBadge';
import FastImage from '@/components/common/FastImage';
import { colors } from '@/constants/theme';

export interface ProductImageProps {
  product: any;
  isOutOfStock: boolean;
  isLowStock: boolean;
  stock: number;
  lowStockThreshold: number;
  discount: number;
  isInWishlist: boolean;
  isTogglingWishlist: boolean;
  onToggleWishlist: (e: any) => void;
}

const ProductImage: React.FC<ProductImageProps> = ({
  product,
  isOutOfStock,
  isLowStock,
  stock,
  lowStockThreshold,
  discount,
  isInWishlist,
  isTogglingWishlist,
  onToggleWishlist,
}) => {
  // Memoize badge rendering
  const badges = useMemo(() => {
    const badgeElements = [];

    if (product.isNewArrival) {
      badgeElements.push(
        <View key="new" style={[styles.badge, styles.newBadge]}>
          <ThemedText style={styles.newBadgeText}>New</ThemedText>
        </View>
      );
    }

    if (discount > 0) {
      badgeElements.push(
        <View key="discount" style={[styles.badge, styles.discountBadge]}>
          <ThemedText style={styles.discountBadgeText}>{discount}% OFF</ThemedText>
        </View>
      );
    }

    return badgeElements.length > 0 ? (
      <View style={styles.badgesContainer}>{badgeElements}</View>
    ) : null;
  }, [product.isNewArrival, discount]);

  // Memoize stock badge rendering
  const stockBadge = useMemo(() => {
    if (product.inventory || isOutOfStock || isLowStock) {
      return (
        <View style={styles.stockBadgeContainer}>
          <StockBadge stock={stock} lowStockThreshold={lowStockThreshold} variant="compact" />
        </View>
      );
    }
    return null;
  }, [product.inventory, isOutOfStock, isLowStock, stock, lowStockThreshold]);

  return (
    <View
      style={styles.imageContainer}
      accessibilityLabel={`Product image for ${product.name}`}
      accessibilityRole="image"
    >
      <FastImage
        source={product.image || 'https://via.placeholder.com/200x200?text=No+Image'}
        style={styles.image}
        resizeMode="cover"
        showLoader={true}
      />
      {badges}
      {stockBadge}

      {/* Wishlist Heart Button */}
      <Pressable
        style={styles.wishlistButton}
        onPress={onToggleWishlist}
        disabled={isTogglingWishlist}
       
        accessibilityLabel={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        accessibilityRole="button"
        accessibilityHint={
          isInWishlist
            ? 'Double tap to remove from wishlist'
            : 'Double tap to add to wishlist'
        }
        accessibilityState={{ disabled: isTogglingWishlist }}
      >
        <Ionicons
          name={isInWishlist ? 'heart' : 'heart-outline'}
          size={20}
          color={isInWishlist ? colors.error : colors.background.primary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
  },
  stockBadgeContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  newBadge: {
    backgroundColor: colors.nileBlue,
  },
  newBadgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: colors.lightPeach,
  },
  discountBadgeText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default React.memo(ProductImage);
