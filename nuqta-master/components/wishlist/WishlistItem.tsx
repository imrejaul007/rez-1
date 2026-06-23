// WishlistItem Component
// Individual wishlist item card with actions

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { WishlistItemProps } from '@/types/wishlist.types';
import { colors } from '@/constants/theme';

function WishlistItem({
  item,
  onRemove,
  onPress,
  onAddToCart,
}: WishlistItemProps) {
  const handleRemove = () => {
    platformAlertDestructive(
      'Remove from Wishlist',
      `Remove "${item.productName}" from your wishlist?`,
      () => onRemove(item.productId),
      'Remove'
    );
  };

  const handleAddToCart = () => {
    if (item.availability === 'OUT_OF_STOCK') {
      platformAlertSimple('Out of Stock', 'This item is currently out of stock.');
      return;
    }
    onAddToCart(item);
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress(item.productId)}
     
    >
      {/* Product Image */}
      <CachedImage source={item.productImage} style={styles.image} />

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Brand and Remove Button */}
        <View style={styles.header}>
          <ThemedText style={styles.brand}>{item.brand}</ThemedText>
          <Pressable
            style={styles.removeButton}
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={20} color={colors.error} />
          </Pressable>
        </View>

        {/* Product Name */}
        <ThemedText style={styles.name} numberOfLines={2}>
          {item.productName}
        </ThemedText>

        {/* Rating and Availability */}
        <View style={styles.detailsRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={colors.brand.goldBright} />
            <ThemedText style={styles.ratingText}>{item.rating}</ThemedText>
            <ThemedText style={styles.reviewText}>
              ({item.reviewCount})
            </ThemedText>
          </View>

          <View
            style={[
              styles.availabilityBadge,
              {
                backgroundColor:
                  item.availability === 'IN_STOCK'
                    ? colors.lightMustard
                    : item.availability === 'LIMITED'
                    ? colors.warningScale[400]
                    : colors.error,
              },
            ]}
          >
            <ThemedText style={styles.availabilityText}>
              {item.availability === 'IN_STOCK'
                ? 'In Stock'
                : item.availability === 'LIMITED'
                ? 'Limited'
                : 'Out of Stock'}
            </ThemedText>
          </View>
        </View>

        {/* Price and Actions */}
        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>
              Rs.{item.price.toLocaleString()}
            </ThemedText>
            {item.originalPrice && item.originalPrice > item.price && (
              <>
                <ThemedText style={styles.originalPrice}>
                  Rs.{item.originalPrice.toLocaleString()}
                </ThemedText>
                {item.discount && (
                  <ThemedText style={styles.discount}>
                    {item.discount}% OFF
                  </ThemedText>
                )}
              </>
            )}
          </View>

          <Pressable
            style={[
              styles.addToCartButton,
              { opacity: item.availability === 'OUT_OF_STOCK' ? 0.5 : 1 },
            ]}
            onPress={handleAddToCart}
            disabled={item.availability === 'OUT_OF_STOCK'}
          >
            <Ionicons name="cart-outline" size={16} color={colors.brand.purpleLight} />
            <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
          </Pressable>
        </View>

        {/* Added Date */}
        <ThemedText style={styles.addedDate}>
          Added {new Date(item.addedAt).toLocaleDateString()}
        </ThemedText>
      </View>
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: {
    fontSize: 12,
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 6,
    lineHeight: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.darkGray,
    fontWeight: '600',
    marginLeft: 2,
  },
  reviewText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 2,
  },
  availabilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkGray,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.midGray,
    textDecorationLine: 'line-through',
  },
  discount: {
    fontSize: 10,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  addToCartText: {
    fontSize: 11,
    color: colors.brand.purpleLight,
    fontWeight: '600',
    marginLeft: 4,
  },
  addedDate: {
    fontSize: 10,
    color: '#999',
  },
});

export default React.memo(WishlistItem);
