// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { ProductItem } from '@/types/homepage.types';
import { useCartActions, useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/hooks/useToast';
import productsApi from '@/services/productsApi';
import { VariantSelection } from '@/components/cart/ProductVariantModal';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductQuickViewProps {
  visible: boolean;
  productId: string;
  onClose: () => void;
  onViewFullDetails?: () => void;
  onAddToCart?: (product: ProductItem, variant?: VariantSelection) => void;
}

interface ProductDetails extends ProductItem {
  images?: Array<{ url: string; alt?: string }>;
  fullDescription?: string;
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    colorHex?: string;
    sku: string;
    price: number;
    stock: number;
    available: boolean;
  }>;
}

function ProductQuickView({
  visible,
  productId,
  onClose,
  onViewFullDetails,
  onAddToCart,
}: ProductQuickViewProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const currencySymbol = getCurrencySymbol();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<VariantSelection | undefined>();
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const isMounted = useIsMounted();

  const slideAnim = useSharedValue(SCREEN_WIDTH);
  const fadeAnim = useSharedValue(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const cartActions = useCartActions();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showSuccess, showError } = useToast();

  const slideAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const fadeAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  // Load product details
  useEffect(() => {
    if (visible && productId) {
      loadProductDetails();
      // Animate in
      slideAnim.value = withTiming(0, { duration: 300 });
      fadeAnim.value = withTiming(1, { duration: 300 });
    } else {
      // Reset state when modal closes
      setProduct(null);
      setCurrentImageIndex(0);
      setQuantity(1);
      setSelectedVariant(undefined);
      setExpandedDescription(false);
      setError(null);
    }
  }, [visible, productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await productsApi.getProductById(productId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setProduct(response.data as ProductDetails);
      } else {
        setError('Failed to load product details');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load product. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleClose = () => {
    slideAnim.value = withTiming(SCREEN_WIDTH, { duration: 250 });
    fadeAnim.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      const mainImage = product.images?.[0]?.url || product.image;
      const basePrice = product.price.current || (product.price as any);

      const cartItem = {
        id: product.id,
        productId: product.id,
        name: product.name,
        brand: product.brand,
        image: mainImage,
        originalPrice: product.price.original || basePrice,
        discountedPrice: basePrice,
        quantity: quantity,
        selected: true,
        addedAt: new Date().toISOString(),
        category: product.category,
        ...(selectedVariant && { variant: selectedVariant }),
      };

      if (onAddToCart) {
        onAddToCart(product, selectedVariant);
      } else {
        await cartActions.addItem(cartItem);
      }

      showSuccess(`Added ${quantity} ${quantity > 1 ? 'items' : 'item'} to cart!`);
      handleClose();
    } catch (error) {
      showError('Failed to add to cart. Please try again.');
    } finally {
      if (!isMounted()) return;
      setAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;

    try {
      const inWishlist = isInWishlist(product.id);

      if (inWishlist) {
        await removeFromWishlist(product.id);
        showSuccess('Removed from wishlist');
      } else {
        const mainImage = product.images?.[0]?.url || product.image;
        await addToWishlist({
          productId: product.id,
          productName: product.name,
          productImage: mainImage,
          price: product.price.current,
          originalPrice: product.price.original,
          discount: product.price.discount,
          rating: typeof product.rating?.value === 'string'
            ? parseFloat(product.rating.value)
            : product.rating?.value || 0,
          reviewCount: product.rating?.count || 0,
          brand: product.brand,
          category: product.category,
          availability: product.availabilityStatus || 'IN_STOCK',
        });
        showSuccess('Added to wishlist');
      }
    } catch (error) {
      showError('Failed to update wishlist');
    }
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      const message = `Check out ${product.name} from ${product.brand}!\nPrice: ${currencySymbol}${product.price.current.toLocaleString(locale)}`;

      await Share.share({
        message,
        title: product.name,
      });
    } catch (error) {
      // silently handle
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleVariantSelect = (type: 'size' | 'color', value: string) => {
    setSelectedVariant(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const renderImageCarousel = () => {
    if (!product) return null;

    const images = product.images?.map(img => img.url) || [product.image];

    return (
      <View style={styles.imageCarousel}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {images.map((imageUrl, index) => (
            <CachedImage
              key={index}
              source={imageUrl}
              style={styles.productImage}
              contentFit="cover"
            />
          ))}
        </ScrollView>

        {/* Image indicators */}
        {images.length > 1 && (
          <View style={styles.imageIndicators}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}

        {/* Wishlist and Share buttons */}
        <View style={styles.imageActions}>
          <Pressable
            style={styles.iconButton}
            onPress={handleWishlistToggle}
           
          >
            <Ionicons
              name={isInWishlist(product.id) ? 'heart' : 'heart-outline'}
              size={24}
              color={isInWishlist(product.id) ? colors.error : colors.neutral[800]}
            />
          </Pressable>

          <Pressable
            style={styles.iconButton}
            onPress={handleShare}
           
          >
            <Ionicons name="share-social-outline" size={24} color={colors.neutral[800]} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderVariantSelector = () => {
    if (!product?.variants || product.variants.length === 0) return null;

    const sizes = Array.from(new Set(product.variants.filter(v => v.size).map(v => v.size)));
    const colors = Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));

    return (
      <View style={styles.variantSection}>
        {sizes.length > 0 && (
          <View style={styles.variantGroup}>
            <Text style={styles.variantLabel}>Size</Text>
            <View style={styles.variantOptions}>
              {sizes.map((size) => (
                <Pressable
                  key={size}
                  style={[
                    styles.sizeOption,
                    selectedVariant?.size === size && styles.selectedSizeOption,
                  ]}
                  onPress={() => handleVariantSelect('size', size!)}
                 
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selectedVariant?.size === size && styles.selectedSizeText,
                    ]}
                  >
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {colors.length > 0 && (
          <View style={styles.variantGroup}>
            <Text style={styles.variantLabel}>Color</Text>
            <View style={styles.variantOptions}>
              {colors.map((color) => {
                const variant = product.variants?.find(v => v.color === color);
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      selectedVariant?.color === color && styles.selectedColorOption,
                    ]}
                    onPress={() => handleVariantSelect('color', color!)}
                   
                  >
                    {variant?.colorHex ? (
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: variant.colorHex },
                        ]}
                      />
                    ) : (
                      <Text style={styles.colorText}>{color}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderStockBadge = () => {
    if (!product) return null;

    const status = product.availabilityStatus;
    const stock = product.inventory?.stock;

    if (status === 'out_of_stock') {
      return (
        <View style={[styles.stockBadge, styles.outOfStock]}>
          <Text style={styles.stockBadgeText}>Out of Stock</Text>
        </View>
      );
    }

    if (status === 'low_stock' && stock) {
      return (
        <View style={[styles.stockBadge, styles.lowStock]}>
          <Text style={styles.stockBadgeText}>Only {stock} left!</Text>
        </View>
      );
    }

    return (
      <View style={[styles.stockBadge, styles.inStock]}>
        <Text style={styles.stockBadgeText}>In Stock</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      );
    }

    if (error || !product) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <Pressable style={styles.retryButton} onPress={loadProductDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    const description = product.fullDescription || product.description || '';
    const truncatedDescription = expandedDescription
      ? description
      : description.split('\n').slice(0, 3).join('\n');
    const shouldShowReadMore = description.split('\n').length > 3;

    return (
      <>
        {renderImageCarousel()}

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Info */}
          <View style={styles.infoSection}>
            <Text style={styles.brandName}>{product.brand}</Text>
            <Text style={styles.productName}>{product.name}</Text>

            {/* Rating */}
            {product.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={colors.warningScale[400]} />
                <Text style={styles.ratingText}>
                  {typeof product.rating.value === 'string'
                    ? product.rating.value
                    : product.rating.value.toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>({product.rating.count})</Text>
              </View>
            )}

            {/* Price */}
            <View style={styles.priceSection}>
              <Text style={styles.currentPrice}>
                {currencySymbol}{product.price.current.toLocaleString(locale)}
              </Text>
              {product.price.original && product.price.original > product.price.current && (
                <>
                  <Text style={styles.originalPrice}>
                    {currencySymbol}{product.price.original.toLocaleString(locale)}
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {Math.round(
                        ((product.price.original - product.price.current) /
                          product.price.original) *
                          100
                      )}% OFF
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Stock Badge */}
            {renderStockBadge()}

            {/* Variant Selector */}
            {renderVariantSelector()}

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityControls}>
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={quantity <= 1 ? colors.neutral[300] : colors.neutral[800]}
                  />
                </Pressable>
                <Text style={styles.quantityText}>{quantity}</Text>
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                  disabled={quantity >= 10}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={quantity >= 10 ? colors.neutral[300] : colors.neutral[800]}
                  />
                </Pressable>
              </View>
            </View>

            {/* Description */}
            {description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText} numberOfLines={expandedDescription ? undefined : 3}>
                  {truncatedDescription}
                </Text>
                {shouldShowReadMore && (
                  <Pressable
                    onPress={() => setExpandedDescription(!expandedDescription)}
                   
                  >
                    <Text style={styles.readMoreText}>
                      {expandedDescription ? 'Read Less' : 'Read More'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* View Full Details Link */}
            {onViewFullDetails && (
              <Pressable
                style={styles.viewDetailsButton}
                onPress={() => {
                  onViewFullDetails();
                  handleClose();
                }}
               
              >
                <Text style={styles.viewDetailsText}>View Full Details</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.brand.purple} />
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[
              styles.addToCartButton,
              (addingToCart || product.availabilityStatus === 'out_of_stock') &&
                styles.addToCartButtonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={addingToCart || product.availabilityStatus === 'out_of_stock'}
           
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color={colors.background.primary} />
                <Text style={styles.addToCartText}>
                  {product.availabilityStatus === 'out_of_stock'
                    ? 'Out of Stock'
                    : 'Add to Cart'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            fadeAnimStyle,
          ]}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark">
            <Pressable
              style={StyleSheet.absoluteFill}
             
              onPress={handleClose}
            />
          </BlurView>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            slideAnimStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
             
            >
              <Ionicons name="close" size={28} color={colors.neutral[800]} />
            </Pressable>
          </View>

          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: colors.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.brand.purple,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  imageCarousel: {
    height: 300,
    backgroundColor: colors.neutral[50],
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: colors.background.primary,
    width: 20,
  },
  imageActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  contentScroll: {
    flex: 1,
  },
  infoSection: {
    padding: 20,
  },
  brandName: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
    lineHeight: 28,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.neutral[500],
    marginLeft: 4,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.brand.purple,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 20,
  },
  inStock: {
    backgroundColor: colors.tint.green,
  },
  lowStock: {
    backgroundColor: colors.tint.amberLight,
  },
  outOfStock: {
    backgroundColor: colors.errorScale[100],
  },
  stockBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  variantSection: {
    marginBottom: 20,
  },
  variantGroup: {
    marginBottom: 16,
  },
  variantLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 10,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    minWidth: 50,
    alignItems: 'center',
  },
  selectedSizeOption: {
    borderColor: colors.brand.purple,
    backgroundColor: colors.tint.pink,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  selectedSizeText: {
    color: colors.brand.purple,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderColor: colors.brand.purple,
    borderWidth: 3,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[100],
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[500],
  },
  readMoreText: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '600',
    marginTop: 8,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.brand.purple,
    marginTop: 12,
    marginBottom: 100,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.purple,
    marginRight: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purple,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.neutral[400],
    opacity: 0.6,
  },
  addToCartText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default React.memo(ProductQuickView);
