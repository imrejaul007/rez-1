import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { CategoryItem } from '@/types/category.types';
import { useCartState, useCartActions } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { normalizeProductPrice, normalizeProductRating } from '@/utils/productDataNormalizer';
import { formatPrice } from '@/utils/priceFormatter';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CategoryCardProps {
  item: CategoryItem;
  layoutType?: 'compact' | 'detailed' | 'featured';
  onPress: (item: CategoryItem) => void;
  onAddToCart: (item: CategoryItem) => void;
  onToggleFavorite: (item: CategoryItem) => void;
  showQuickActions?: boolean;
  cardStyle?: 'elevated' | 'flat' | 'outlined';
}

function CategoryCard({
  item,
  layoutType = 'compact',
  onPress,
  onAddToCart,
  onToggleFavorite,
  showQuickActions = true,
  cardStyle = 'elevated',
}: CategoryCardProps) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const isMounted = useIsMounted();
  const cartState = useCartState();
  const cartActions = useCartActions();
  const [, forceUpdate] = useState({});

  // Force re-render when cart changes
  useEffect(() => {
    forceUpdate({});
  }, [cartState.items.length, cartState.items]);

  // Check if product is in cart and get quantity - memoized to ensure proper re-renders
  const { productId, cartItem, quantityInCart, isInCart } = useMemo(() => {
    const id = item.id;
    const cartItem = cartState.items.find(i => i.productId === id);
    const qty = cartItem?.quantity || 0;
    const inCart = qty > 0;

    return {
      productId: id,
      cartItem,
      quantityInCart: qty,
      isInCart: inCart
    };
  }, [item.id, cartState.items, cartState.items.length]);
  
  const handlePress = () => {
    onPress(item);
  };

  const handleAddToCart = async (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      // Extract product ID - handle both product._id and product.id formats
      const productId = item.id;

      if (!productId) {
        return;
      }

      // Extract price - handle complex price objects
      let currentPrice = 0;
      let originalPrice = 0;

      if (item.price) {
        currentPrice = item.price.current || 0;
        originalPrice = item.price.original ?? item.price.current ?? 0;
      }

      // Extract image - handle multiple possible formats
      let imageUrl = '';
      if (item.image) {
        imageUrl = item.image;
      } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        imageUrl = item.images[0];
      }

      // Prepare cart item data - match the CartItem type from @/types/cart
      const cartItemData = {
        id: productId,
        name: item.name || 'Product',
        price: currentPrice,
        originalPrice: originalPrice,
        discountedPrice: currentPrice,
        image: imageUrl,
        cashback: item.cashback?.percentage ? `${item.cashback.percentage}%` : '0%',
        category: 'products' as const,
        quantity: 1,
        selected: false,
        
        availabilityStatus: 'in_stock' as const,
      };
      // Add to cart via CartContext
      await cartActions.addItem(cartItemData);

      // Show success toast
      showToast({
        message: `${item.name || 'Item'} added to cart`,
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      
      // Show error toast
      showToast({
        message: 'Failed to add item to cart',
        type: 'error',
        duration: 3000
      });
    } finally {
      if (!isMounted()) return;
      setIsAddingToCart(false);
    }
  };

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    onToggleFavorite(item);
  };

  // Get container style based on card style
  const getContainerStyle = () => {
    const baseStyle = [styles.container];
    
    switch (cardStyle) {
      case 'elevated':
        return [...baseStyle, styles.elevatedCard];
      case 'outlined':
        return [...baseStyle, styles.outlinedCard];
      case 'flat':
      default:
        return [...baseStyle, styles.flatCard];
    }
  };

  // Render price information
  const renderPrice = () => {
    const normalizedPrice = normalizeProductPrice(item);

    if (normalizedPrice.current === null) return null;

    const currency = typeof item.price?.currency === 'string' ? item.price.currency : 'INR';
    const hasDiscount = normalizedPrice.original !== null && normalizedPrice.original > normalizedPrice.current;

    return (
      <View style={styles.priceContainer}>
        <ThemedText style={styles.currentPrice}>
          {formatPrice(normalizedPrice.current, currency, false)}
        </ThemedText>
        {hasDiscount && normalizedPrice.original !== null && (
          <ThemedText style={styles.originalPrice}>
            {formatPrice(normalizedPrice.original, currency, false)}
          </ThemedText>
        )}
      </View>
    );
  };

  // Render rating information
  const renderRating = () => {
    const normalizedRating = normalizeProductRating(item);

    if (normalizedRating.value === null) return null;

    const formattedRating = normalizedRating.value.toFixed(1);
    const maxValue = typeof item.rating?.maxValue === 'number' ? item.rating.maxValue : 5;

    return (
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={12} color={colors.brand.goldBright} />
        <ThemedText style={styles.ratingText}>
          {formattedRating}
        </ThemedText>
        {maxValue && maxValue !== 5 && (
          <ThemedText style={styles.ratingMaxText}>
            /{maxValue}
          </ThemedText>
        )}
        {normalizedRating.count !== null && normalizedRating.count > 0 && (
          <ThemedText style={styles.ratingCount}>
            ({normalizedRating.count})
          </ThemedText>
        )}
      </View>
    );
  };

  // Render timing information (delivery time, etc.)
  const renderTiming = () => {
    if (!item.timing?.deliveryTime) return null;

    // Safely convert delivery time to string
    const deliveryTime = typeof item.timing.deliveryTime === 'string' 
      ? item.timing.deliveryTime 
      : (typeof item.timing.deliveryTime === 'number' 
        ? String(item.timing.deliveryTime) 
        : 'N/A');

    return (
      <View style={styles.timingContainer}>
        <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
        <ThemedText style={styles.timingText}>
          {deliveryTime}
        </ThemedText>
      </View>
    );
  };

  // Render cashback information
  const renderCashback = () => {
    if (!item.cashback) return null;

    // Safely extract cashback percentage
    let cashbackPercentage = 0;
    if (typeof item.cashback === 'number') {
      cashbackPercentage = item.cashback;
    } else if (typeof item.cashback === 'object' && item.cashback !== null) {
      const percentage = item.cashback.percentage;
      cashbackPercentage = typeof percentage === 'number' 
        ? percentage 
        : (typeof percentage === 'string' 
          ? parseFloat(percentage) || 0 
          : 0);
    }

    return (
      <View style={styles.cashbackContainer}>
        <ThemedText style={styles.cashbackText}>
          Upto {cashbackPercentage.toFixed(0)}% cash back
        </ThemedText>
      </View>
    );
  };

  // Render location information (for stores)
  const renderLocation = () => {
    if (!item.location) return null;

    // Safely convert address to string
    const address = typeof item.location.address === 'string' 
      ? item.location.address 
      : (typeof item.location.address === 'number' 
        ? String(item.location.address) 
        : 'Location not available');

    return (
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={12} color={colors.neutral[500]} />
        <ThemedText style={styles.locationText} numberOfLines={1}>
          {address}
        </ThemedText>
      </View>
    );
  };

  // Render badges (featured, popular, new)
  const renderBadges = () => {
    const badges = [];
    
    if (item.isFeatured) {
      badges.push(
        <View key="featured" style={[styles.badge, styles.featuredBadge]}>
          <ThemedText style={styles.badgeText}>Featured</ThemedText>
        </View>
      );
    }
    
    if (item.isPopular) {
      badges.push(
        <View key="popular" style={[styles.badge, styles.popularBadge]}>
          <ThemedText style={styles.badgeText}>Popular</ThemedText>
        </View>
      );
    }
    
    if (item.isNew) {
      badges.push(
        <View key="new" style={[styles.badge, styles.newBadge]}>
          <ThemedText style={styles.badgeText}>New</ThemedText>
        </View>
      );
    }

    if (badges.length === 0) return null;

    return (
      <View style={styles.badgesContainer}>
        {badges}
      </View>
    );
  };

  // Render compact layout (default grid)
  const renderCompactLayout = () => (
    <Pressable style={getContainerStyle()} onPress={handlePress}>
      <View style={styles.imageContainer}>
        <CachedImage 
          source={item.image || 'https://via.placeholder.com/200x200?text=No+Image'} 
          style={styles.image} 
          contentFit="cover" 
        />
        {renderBadges()}
        {showQuickActions && (
          <Pressable 
            style={styles.favoriteButton} 
            onPress={handleToggleFavorite}
          >
            <Ionicons 
              name="heart-outline" 
              size={18} 
              color={colors.neutral[500]} 
            />
          </Pressable>
        )}
      </View>
      
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {item.name || 'Unnamed Item'}
        </ThemedText>
        
        <View style={styles.metaContainer}>
          {renderRating()}
          {renderTiming()}
        </View>
        
        <View style={styles.bottomSection}>
          {renderPrice()}
          {renderCashback()}
          
          {showQuickActions && (
            <>
              {isInCart ? (
                // Quantity Controls (Flipkart style)
                <View style={styles.quantityControls}>
                  <Pressable
                    style={styles.quantityButton}
                    onPress={async (e) => {
                      e.stopPropagation();
                      try {
                        if (quantityInCart > 1) {
                          await cartActions.updateQuantity(cartItem!.id, quantityInCart - 1);
                        } else {
                          await cartActions.removeItem(cartItem!.id);
                        }
                      } catch (error) {
                        showToast({
                          message: 'Failed to update quantity',
                          type: 'error',
                          duration: 3000
                        });
                      }
                    }}
                   
                  >
                    <Ionicons name="remove" size={18} color={colors.background.primary} />
                  </Pressable>

                  <View style={styles.quantityDisplay}>
                    <ThemedText style={styles.quantityText}>{quantityInCart}</ThemedText>
                  </View>

                  <Pressable
                    style={styles.quantityButton}
                    onPress={async (e) => {
                      e.stopPropagation();
                      try {
                        await cartActions.updateQuantity(cartItem!.id, quantityInCart + 1);
                      } catch (error) {
                        showToast({
                          message: 'Failed to update quantity',
                          type: 'error',
                          duration: 3000
                        });
                      }
                    }}
                   
                  >
                    <Ionicons name="add" size={18} color={colors.background.primary} />
                  </Pressable>
                </View>
              ) : (
                // Add to Cart Button
                <Pressable 
                  style={[styles.addToCartButton, isAddingToCart && styles.addToCartButtonDisabled]} 
                  onPress={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <ThemedText style={styles.addToCartText}>Add to cart</ThemedText>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
  // Render detailed layout (list view)
  const renderDetailedLayout = () => (
    <Pressable style={[getContainerStyle(), styles.detailedContainer]} onPress={handlePress}>
      <View style={styles.detailedImageContainer}>
        <CachedImage 
          source={item.image || 'https://via.placeholder.com/200x200?text=No+Image'} 
          style={styles.detailedImage} 
          contentFit="cover" 
        />
        {renderBadges()}
      </View>
      
      <View style={styles.detailedContent}>
        <View style={styles.detailedHeader}>
          <ThemedText style={styles.detailedTitle} numberOfLines={1}>
            {item.name || 'Unnamed Item'}
          </ThemedText>
          {showQuickActions && (
            <Pressable onPress={handleToggleFavorite}>
              <Ionicons name="heart-outline" size={20} color={colors.neutral[500]} />
            </Pressable>
          )}
        </View>
        
          {item.metadata?.description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {item.metadata.description || 'No description available'}
            </ThemedText>
          )}
        
        <View style={styles.detailedMeta}>
          {renderRating()}
          {renderLocation()}
          {renderTiming()}
        </View>
        
        <View style={styles.detailedFooter}>
          {renderPrice()}
          {renderCashback()}
        </View>
      </View>
    </Pressable>
  );
  // Render featured layout (hero style)
  const renderFeaturedLayout = () => (
    <Pressable style={[getContainerStyle(), styles.featuredContainer]} onPress={handlePress}>
      <View style={styles.featuredImageContainer}>
        <CachedImage 
          source={item.image || 'https://via.placeholder.com/200x200?text=No+Image'} 
          style={styles.featuredImage} 
          contentFit="cover" 
        />
        <View style={styles.featuredOverlay} />
        {renderBadges()}
        
        <View style={styles.featuredContent}>
          <ThemedText style={styles.featuredTitle} numberOfLines={2}>
            {item.name || 'Unnamed Item'}
          </ThemedText>
          
          {item.metadata?.description && (
            <ThemedText style={styles.featuredDescription} numberOfLines={3}>
              {item.metadata.description || 'No description available'}
            </ThemedText>
          )}
          
          <View style={styles.featuredMeta}>
            {renderRating()}
            {renderPrice()}
          </View>
        </View>
        
        {showQuickActions && (
          <View style={styles.featuredActions}>
            <Pressable style={styles.featuredFavoriteButton} onPress={handleToggleFavorite}>
              <Ionicons name="heart-outline" size={20} color={colors.background.primary} />
            </Pressable>
            <Pressable style={styles.featuredAddButton} onPress={handleAddToCart}>
              <Ionicons name="add" size={20} color={colors.background.primary} />
            </Pressable>
          </View>
        )}
      </View>
      
      {renderCashback()}
    </Pressable>
  );
  // Render based on layout type
  switch (layoutType) {
    case 'detailed':
      return renderDetailedLayout();
    case 'featured':
      return renderFeaturedLayout();
    case 'compact':
    default:
      return renderCompactLayout();
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    height: 380,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 205, 87, 0.12)',
  },
  elevatedCard: {
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  outlinedCard: {
    borderWidth: 2,
    borderColor: 'rgba(255, 205, 87, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  flatCard: {
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    minHeight: 160,
    maxHeight: 160,
    backgroundColor: colors.linen,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 205, 87, 0.08)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadge: {
    backgroundColor: colors.lightMustard,
  },
  popularBadge: {
    backgroundColor: colors.error,
  },
  newBadge: {
    backgroundColor: colors.lightMustard,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  content: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 200, // Increased minimum height for content to accommodate button
    maxHeight: 200, // Fixed max height for consistency
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 8,
    lineHeight: 20,
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    letterSpacing: 0.2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    height: 20, // Fixed height for consistent alignment
    minHeight: 20,
    maxHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  ratingMaxText: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  ratingCount: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  timingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timingText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    height: 24, // Fixed height for consistent alignment
    minHeight: 24,
    maxHeight: 24,
  },
  currentPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 0.3,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.neutral[500],
    textDecorationLine: 'line-through',
  },
  cashbackContainer: {
    marginBottom: 8,
    height: 24,
    minHeight: 24,
    maxHeight: 24,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  cashbackText: {
    fontSize: 11,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  addToCartButton: {
    backgroundColor: colors.lightMustard,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    height: 44,
    minHeight: 44,
    maxHeight: 44,
    justifyContent: 'center',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  addToCartButtonDisabled: {
    backgroundColor: '#e6b94e',
    opacity: 0.7,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightMustard,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 14,
    height: 44,
    minHeight: 44,
    maxHeight: 44,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  quantityDisplay: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: 'auto', // Push to bottom
    paddingTop: 8,
    height: 100, // Fixed height for consistent alignment
    minHeight: 100,
    maxHeight: 100,
    justifyContent: 'space-between',
  },
  
  // Detailed layout styles
  detailedContainer: {
    flexDirection: 'row',
    padding: 12,
  },
  detailedImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  detailedImage: {
    width: '100%',
    height: '100%',
  },
  detailedContent: {
    flex: 1,
  },
  detailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailedTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginRight: 8,
  },
  description: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
    marginBottom: 8,
  },
  detailedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  detailedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Featured layout styles
  featuredContainer: {
    height: 200,
  },
  featuredImageContainer: {
    position: 'relative',
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 60,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 12,
    color: colors.neutral[200],
    lineHeight: 16,
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  featuredFavoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightMustard,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
export default React.memo(CategoryCard);
