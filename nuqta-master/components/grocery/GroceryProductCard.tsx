/**
 * Grocery Product Card Component
 * Reusable card for displaying grocery products with Add to Cart functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: colors.neutral[50],
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  gray400: colors.neutral[400],
  gray600: colors.neutral[500],
  green500: colors.success,
  green600: colors.brand.greenDark,
  amber500: colors.warningScale[400],
  red500: colors.error,
};

export interface GroceryProduct {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  // images can be array of strings or array of objects with url
  images?: Array<string | { url: string; alt?: string }>;
  image?: string;
  // pricing supports both API format (original/selling) and legacy (basePrice/salePrice)
  pricing?: {
    original?: number;
    selling?: number;
    basePrice?: number;
    salePrice?: number;
    discount?: number;
    currency?: string;
  };
  price?: number;
  originalPrice?: number;
  unit?: string;
  // Support both rating and ratings
  rating?: {
    average?: number;
    count?: number;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  cashback?: {
    percentage?: number;
    isActive?: boolean;
  };
  cashbackPercentage?: number;
  store?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  storeName?: string;
  inStock?: boolean;
  inventory?: {
    stock?: number;
    isAvailable?: boolean;
  };
  tags?: string[];
}

interface GroceryProductCardProps {
  product: GroceryProduct;
  onAddToCart?: (product: GroceryProduct) => void;
  onQuantityChange?: (product: GroceryProduct, quantity: number) => void;
  variant?: 'default' | 'compact' | 'horizontal';
  showStore?: boolean;
}

const GroceryProductCard: React.FC<GroceryProductCardProps> = ({
  product,
  onAddToCart,
  onQuantityChange,
  variant = 'default',
  showStore = false,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [quantity, setQuantity] = useState(0);

  // Normalize product data - handle both API formats
  const productId = product.id || product._id || '';
  // Handle images as array of strings or array of objects with url
  const firstImage = product.images?.[0];
  const productImage = (typeof firstImage === 'string' ? firstImage : firstImage?.url) || product.image || 'https://via.placeholder.com/200';
  // Handle pricing - API uses original/selling, legacy uses basePrice/salePrice
  const basePrice = product.pricing?.original || product.pricing?.basePrice || product.price || 0;
  const salePrice = product.pricing?.selling || product.pricing?.salePrice || product.originalPrice || basePrice;
  const displayPrice = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const originalPrice = salePrice > 0 && salePrice < basePrice ? basePrice : undefined;
  // Handle ratings - API uses ratings, some use rating
  const rating = product.ratings?.average || product.rating?.average || 0;
  const ratingCount = product.ratings?.count || product.rating?.count || 0;
  const cashbackPercent = product.cashback?.percentage || product.cashbackPercentage || 0;
  const storeName = product.store?.name || product.storeName || '';
  const inStock = product.inStock !== false && product.inventory?.isAvailable !== false;

  const handlePress = () => {
    router.push(`/product-page?cardId=${productId}&cardType=product` as any);
  };

  const handleAddToCart = () => {
    setQuantity(1);
    onAddToCart?.(product);
  };

  const handleIncrement = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onQuantityChange?.(product, newQty);
  };

  const handleDecrement = () => {
    const newQty = quantity > 0 ? quantity - 1 : 0;
    setQuantity(newQty);
    onQuantityChange?.(product, newQty);
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  if (variant === 'horizontal') {
    return (
      <Pressable
        style={styles.horizontalCard}
        onPress={handlePress}
       
      >
        <CachedImage source={productImage} style={styles.horizontalImage} />
        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          {product.unit && <Text style={styles.unit}>{product.unit}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{currencySymbol}{displayPrice}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>{currencySymbol}{originalPrice}</Text>
            )}
          </View>
          {cashbackPercent > 0 && (
            <View style={styles.cashbackBadgeSmall}>
              <Text style={styles.cashbackTextSmall}>{cashbackPercent}% cashback</Text>
            </View>
          )}
        </View>
        <View style={styles.horizontalActions}>
          {quantity === 0 ? (
            <Pressable
              style={styles.addButtonSmall}
              onPress={handleAddToCart}
              disabled={!inStock}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </Pressable>
          ) : (
            <View style={styles.quantityControlSmall}>
              <Pressable onPress={handleDecrement} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color={COLORS.green600} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable onPress={handleIncrement} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color={COLORS.green600} />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        style={styles.compactCard}
        onPress={handlePress}
       
      >
        <CachedImage source={productImage} style={styles.compactImage} />
        {cashbackPercent > 0 && (
          <View style={styles.cashbackBadgeCompact}>
            <Text style={styles.cashbackTextCompact}>{cashbackPercent}%</Text>
          </View>
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={2}>{product.name}</Text>
          {product.unit && <Text style={styles.compactUnit}>{product.unit}</Text>}
          <Text style={styles.compactPrice}>{currencySymbol}{displayPrice}</Text>
        </View>
        <Pressable
          style={styles.addButtonCompact}
          onPress={quantity === 0 ? handleAddToCart : undefined}
          disabled={!inStock}
        >
          {quantity === 0 ? (
            <Ionicons name="add" size={18} color={COLORS.white} />
          ) : (
            <Text style={styles.qtyTextCompact}>{quantity}</Text>
          )}
        </Pressable>
      </Pressable>
    );
  }

  // Default variant
  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
     
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <CachedImage source={productImage} style={styles.image} />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
        {cashbackPercent > 0 && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{cashbackPercent}% cashback</Text>
          </View>
        )}
        {!inStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.unit && <Text style={styles.unit}>{product.unit}</Text>}

        {/* Rating */}
        {rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.amber500} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({ratingCount})</Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{currencySymbol}{displayPrice}</Text>
          {originalPrice && (
            <Text style={styles.originalPrice}>{currencySymbol}{originalPrice}</Text>
          )}
        </View>

        {/* Store */}
        {showStore && storeName && (
          <Text style={styles.storeName} numberOfLines={1}>
            <Ionicons name="storefront-outline" size={10} color={COLORS.gray400} /> {storeName}
          </Text>
        )}

        {/* Add to Cart */}
        <View style={styles.cartSection}>
          {quantity === 0 ? (
            <Pressable
              style={[styles.addButton, !inStock && styles.addButtonDisabled]}
              onPress={handleAddToCart}
              disabled={!inStock}
            >
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>ADD</Text>
            </Pressable>
          ) : (
            <View style={styles.quantityControl}>
              <Pressable onPress={handleDecrement} style={styles.qtyBtn}>
                <Ionicons name="remove" size={18} color={COLORS.green600} />
              </Pressable>
              <Text style={styles.qtyText}>{quantity}</Text>
              <Pressable onPress={handleIncrement} style={styles.qtyBtn}>
                <Ionicons name="add" size={18} color={COLORS.green600} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Default Card
  card: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.red500,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
    lineHeight: 18,
  },
  unit: {
    fontSize: 11,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.navy,
    marginLeft: 2,
  },
  ratingCount: {
    fontSize: 10,
    color: COLORS.gray400,
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  storeName: {
    fontSize: 10,
    color: COLORS.gray400,
    marginBottom: 8,
  },
  cartSection: {
    alignItems: 'flex-end',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green500,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.green500,
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green600,
    minWidth: 24,
    textAlign: 'center',
  },

  // Compact Card
  compactCard: {
    width: 130,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
    marginRight: 12,
  },
  compactImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  cashbackBadgeCompact: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.green500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cashbackTextCompact: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  compactContent: {
    padding: 8,
  },
  compactName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
  },
  compactUnit: {
    fontSize: 10,
    color: COLORS.gray600,
    marginBottom: 2,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  addButtonCompact: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.green500,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyTextCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 12,
    marginBottom: 12,
  },
  horizontalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  horizontalContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  horizontalActions: {
    justifyContent: 'center',
  },
  addButtonSmall: {
    backgroundColor: COLORS.green500,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  quantityControlSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.green500,
  },
  cashbackBadgeSmall: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  cashbackTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green600,
  },
});

export default React.memo(GroceryProductCard);
