// @ts-nocheck
/**
 * ProductCard Component (Refactored)
 *
 * Main orchestrator component for product cards
 * Extracted from components/homepage/cards/ProductCard.tsx
 *
 * @component
 */

import React, { useMemo, useState, useCallback, memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ProductCardProps } from '@/types/homepage.types';
import { useCartState, useCartActions } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import { useStockStatus } from '@/hooks/useStockStatus';
import { useStockNotifications } from '@/hooks/useStockNotifications';
import { useToast } from '@/hooks/useToast';
import { formatPrice as formatPriceUtil } from '@/utils/priceFormatter';
import ProductImage from './ProductImage';
import ProductInfo from './ProductInfo';
import ProductActions from './ProductActions';
import { styles } from './styles';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * ProductCard Component
 *
 * Displays a product card with:
 * - Product image with badges and wishlist button
 * - Product information (brand, name, price, rating)
 * - Add to cart / quantity controls / notify me button
 */
function ProductCard({
  product,
  onPress,
  onAddToCart,
  width = 180,
  showAddToCart = true,
}: ProductCardProps) {
  const cartState = useCartState();
  const cartActions = useCartActions();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { subscribe, subscribing } = useStockNotifications();
  const { showSuccess, showError } = useToast();
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const isMounted = useIsMounted();

  // Stock status
  const stock = product.inventory?.stock ?? (product.availabilityStatus === 'out_of_stock' ? 0 : 100);
  const lowStockThreshold = product.inventory?.lowStockThreshold ?? 5;
  const { isOutOfStock, isLowStock, canAddToCart: canAddToCartStock } = useStockStatus({
    stock,
    lowStockThreshold,
  });

  // Memoize product ID
  const productId = useMemo(() => product._id || product.id, [product._id, product.id]);

  // Check if product is in cart and get quantity
  const { cartItem, quantityInCart, isInCart } = useMemo(() => {
    const item = cartState.items.find((i) => i.productId === productId);
    const qty = item?.quantity || 0;
    const inCart = qty > 0;

    return {
      cartItem: item,
      quantityInCart: qty,
      isInCart: inCart,
    };
  }, [productId, cartState.items]);

  // Get currency from product data (supports both price.currency and pricing.currency)
  const productCurrency = useMemo(() => {
    return product.price?.currency || product.pricing?.currency || 'INR';
  }, [product.price?.currency, product.pricing?.currency]);

  // Memoize formatPrice function - uses product's currency
  const formatPrice = useCallback((price: number) => {
    return formatPriceUtil(price, productCurrency, false) || `${price}`;
  }, [productCurrency]);

  // Memoize price calculations — guard against missing price object
  const price = product.price || { current: 0, original: null, discount: 0 };
  const priceData = useMemo(() => {
    const savings =
      price.original && price.original > price.current
        ? price.original - price.current
        : 0;

    let discount = 0;
    if (price.discount) {
      discount = price.discount;
    } else if (price.original && price.original > price.current) {
      discount = Math.round(
        ((price.original - price.current) / price.original) * 100
      );
    }

    return { savings, discount };
  }, [price.original, price.current, price.discount]);

  // Event Handlers
  const handleToggleWishlist = useCallback(
    async (e: any) => {
      e.stopPropagation();

      if (isTogglingWishlist) return;

      setIsTogglingWishlist(true);
      try {
        const inWishlist = isInWishlist(productId);

        if (inWishlist) {
          await removeFromWishlist(productId);
        } else {
          await addToWishlist({
            productId,
            productName: product.name,
            productImage: product.image,
            price: price.current,
            originalPrice: price.original,
            discount: priceData.discount,
            rating: product.rating?.value || 0,
            reviewCount: product.rating?.count || 0,
            brand: product.brand,
            category: product.category || 'General',
            availability: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LIMITED' : 'IN_STOCK',
          });
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setIsTogglingWishlist(false);
      }
    },
    [
      isTogglingWishlist,
      isInWishlist,
      productId,
      removeFromWishlist,
      addToWishlist,
      product.name,
      product.image,
      price.current,
      price.original,
      priceData.discount,
      product.rating,
      product.brand,
      product.category,
      isOutOfStock,
      isLowStock,
    ]
  );

  const handlePress = useCallback(() => {
    onPress(product);
  }, [onPress, product]);

  const handleNotifyMe = useCallback(
    (e: any) => {
      e.stopPropagation();
      subscribe(productId, 'push');
    },
    [subscribe, productId]
  );

  const handleDecreaseQuantity = useCallback(
    async (e: any) => {
      e.stopPropagation();
      try {
        if (quantityInCart > 1) {
          await cartActions.updateQuantity(cartItem!.id, quantityInCart - 1);
          showSuccess(`${product.name} quantity decreased`);
        } else {
          await cartActions.removeItem(cartItem!.id);
          showSuccess(`${product.name} removed from cart`);
        }
      } catch (error) {
        showError(`Failed to update ${product.name}`);
      }
    },
    [quantityInCart, cartActions, cartItem, showSuccess, showError, product.name]
  );

  const handleIncreaseQuantity = useCallback(
    async (e: any) => {
      e.stopPropagation();
      try {
        if (quantityInCart < stock) {
          await cartActions.updateQuantity(cartItem!.id, quantityInCart + 1);
          showSuccess(`${product.name} quantity increased`);
        } else {
          showError(`Maximum quantity reached for ${product.name}`);
        }
      } catch (error) {
        showError(`Failed to update ${product.name}`);
      }
    },
    [quantityInCart, stock, cartActions, cartItem, showSuccess, showError, product.name]
  );

  const handleAddToCart = useCallback(
    async (e: any) => {
      e.stopPropagation();
      if (onAddToCart && canAddToCartStock) {
        try {
          await onAddToCart(product);
          showSuccess(`${product.name} added to cart`);
        } catch (error) {
          showError(`Failed to add ${product.name} to cart`);
        }
      }
    },
    [onAddToCart, canAddToCartStock, product, showSuccess, showError]
  );

  // Accessibility label
  const productLabel = useMemo(() => {
    const stockStatus = isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock';
    const wishlistStatus = isInWishlist(productId) ? 'in wishlist' : 'not in wishlist';

    return `${product.brand || 'Brand'} ${product.name || 'Product Name'}. Price ${formatPrice(
      price.current
    )}${
      price.original && price.original > price.current
        ? `. Was ${formatPrice(price.original)}`
        : ''
    }${priceData.discount > 0 ? `. ${priceData.discount}% off` : ''}${
      product.rating ? `. ${product.rating.value} stars, ${product.rating.count} reviews` : ''
    }. ${stockStatus}${
      product.cashback ? `. ${product.cashback.percentage}% cashback` : ''
    }. ${wishlistStatus}`;
  }, [
    product.brand,
    product.name,
    price.current,
    price.original,
    priceData.discount,
    product.rating,
    product.cashback,
    isOutOfStock,
    isLowStock,
    isInWishlist,
    productId,
    formatPrice,
  ]);

  return (
    <Pressable
      style={[containerStyles.container, { width }]}
      onPress={handlePress}
      accessibilityLabel={productLabel}
      accessibilityHint="Double tap to view product details"
    >
      <ThemedView style={styles.card}>
        {/* Product Image */}
        <ProductImage
          product={product}
          isOutOfStock={isOutOfStock}
          isLowStock={isLowStock}
          stock={stock}
          lowStockThreshold={lowStockThreshold}
          discount={priceData.discount}
          isInWishlist={isInWishlist(productId)}
          isTogglingWishlist={isTogglingWishlist}
          onToggleWishlist={handleToggleWishlist}
        />

        {/* Product Information */}
        <ProductInfo
          product={product}
          priceData={priceData}
          formatPrice={formatPrice}
          isOutOfStock={isOutOfStock}
          isLowStock={isLowStock}
        />

        {/* Actions (Add to Cart / Quantity / Notify Me) */}
        {showAddToCart && (
          <ProductActions
            isOutOfStock={isOutOfStock}
            isInCart={isInCart}
            quantityInCart={quantityInCart}
            stock={stock}
            canAddToCart={canAddToCartStock}
            subscribing={subscribing[productId]}
            productName={product.name}
            onNotifyMe={handleNotifyMe}
            onDecreaseQuantity={handleDecreaseQuantity}
            onIncreaseQuantity={handleIncreaseQuantity}
            onAddToCart={handleAddToCart}
          />
        )}
      </ThemedView>
    </Pressable>
  );
}

// Memoize the component
const MemoizedProductCard = memo(ProductCard, (prevProps, nextProps) => {
  if (
    (prevProps.product._id || prevProps.product.id) !==
    (nextProps.product._id || nextProps.product.id)
  ) {
    return false;
  }

  if (
    prevProps.product.price?.current !== nextProps.product.price?.current ||
    prevProps.product.price?.original !== nextProps.product.price?.original ||
    prevProps.product.price?.discount !== nextProps.product.price?.discount ||
    prevProps.product.inventory?.stock !== nextProps.product.inventory?.stock ||
    prevProps.product.availabilityStatus !== nextProps.product.availabilityStatus ||
    prevProps.product.name !== nextProps.product.name ||
    prevProps.product.image !== nextProps.product.image
  ) {
    return false;
  }

  if (
    prevProps.width !== nextProps.width ||
    prevProps.showAddToCart !== nextProps.showAddToCart
  ) {
    return false;
  }

  if (prevProps.onPress !== nextProps.onPress || prevProps.onAddToCart !== nextProps.onAddToCart) {
    return false;
  }

  return true;
});

export default MemoizedProductCard;

const containerStyles = StyleSheet.create({
  container: {
    flex: 0,
    flexShrink: 0,
  },
});
