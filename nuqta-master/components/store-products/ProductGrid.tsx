// @ts-nocheck
/**
 * ProductGrid Component
 *
 * FlashList-based product grid with product cards, empty states, loading states,
 * quick action overlays, and pagination.
 * Used in the StoreProductsPage as the main product listing area.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Pressable,
  ScrollView,
  Modal,
  Share,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import ProductCard from '@/components/homepage/cards/ProductCard';
import ProductGridSkeleton from '@/components/skeletons/ProductGridSkeleton';
import { RetryButton } from '@/components/common/RetryButton';
import { ProductItem } from '@/types/homepage.types';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCartActions, useIsAuthenticated, useGetCurrencySymbol } from '@/stores/selectors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { triggerImpact } from '@/utils/haptics';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { showToast } from '@/components/common/ToastManager';
import analyticsService from '@/services/analyticsService';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import type { ErrorInfo } from '@/hooks/useStoreProductsPage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getCardWidth = () => {
  const padding = 16 * 2;
  const gap = 12;
  const columns = SCREEN_WIDTH >= 768 ? 3 : 2;
  return (SCREEN_WIDTH - padding - (gap * (columns - 1))) / columns;
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProductGridProps {
  storeId: string;
  products: ProductItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  errorInfo: ErrorInfo | null;
  isOnline: boolean;
  isOffline: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: string;
  availabilityFilter: string;
  minPrice: string;
  maxPrice: string;
  storeData: any;
  storeName?: string;
  onLoadMore: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onClearAllFilters: () => void;
  waitForNetwork: (timeout?: number) => Promise<boolean>;
}

// ─── Quick View Modal ────────────────────────────────────────────────────────

interface QuickViewModalProps {
  visible: boolean;
  product: ProductItem | null;
  currencySymbol: string;
  onClose: () => void;
  onAddToCart: (product: ProductItem) => void;
  onViewDetails: (product: ProductItem) => void;
}

const QuickViewModal = React.memo(function QuickViewModal({
  visible,
  product,
  currencySymbol,
  onClose,
  onAddToCart,
  onViewDetails,
}: QuickViewModalProps) {
  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.quickViewContainer}>
          <View style={styles.quickViewHeader}>
            <ThemedText style={styles.quickViewTitle} numberOfLines={1}>
              {product.name}
            </ThemedText>
            <Pressable onPress={onClose} accessible accessibilityLabel="Close quick view" accessibilityRole="button">
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView style={styles.quickViewContent} showsVerticalScrollIndicator={false}>
            <CachedImage source={product.image} style={styles.quickViewImage} contentFit="cover" />
            <View style={styles.quickViewInfo}>
              <View style={styles.quickViewPriceRow}>
                <ThemedText style={styles.quickViewPrice}>
                  {currencySymbol}{product.price.current.toLocaleString()}
                </ThemedText>
                {product.price.original && product.price.original > product.price.current && (
                  <>
                    <ThemedText style={styles.quickViewOriginalPrice}>
                      {currencySymbol}{product.price.original.toLocaleString()}
                    </ThemedText>
                    <ThemedText style={styles.quickViewDiscount}>
                      {product.price.discount}% OFF
                    </ThemedText>
                  </>
                )}
              </View>
              {product.rating && (
                <View style={styles.quickViewRating}>
                  <Ionicons name="star" size={16} color={Colors.warning} />
                  <ThemedText style={styles.quickViewRatingText}>
                    {product.rating.value} ({product.rating.count} reviews)
                  </ThemedText>
                </View>
              )}
              <ThemedText style={styles.quickViewDescription} numberOfLines={3}>
                {product.description || 'No description available'}
              </ThemedText>
              <View style={styles.quickViewActions}>
                <Pressable
                  style={[styles.quickViewButton, styles.quickViewButtonPrimary]}
                  onPress={() => { onClose(); onAddToCart(product); }}
                  accessible accessibilityLabel="Add to cart" accessibilityRole="button"
                >
                  <Ionicons name="bag-outline" size={20} color={Colors.text.inverse} />
                  <ThemedText style={styles.quickViewButtonText}>Add to Cart</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.quickViewButton}
                  onPress={() => { onClose(); onViewDetails(product); }}
                  accessible accessibilityLabel="View full details" accessibilityRole="button"
                >
                  <ThemedText style={styles.quickViewButtonTextSecondary}>View Details</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ─── Product Details Modal ───────────────────────────────────────────────────

interface ProductDetailsModalProps {
  visible: boolean;
  product: ProductItem | null;
  currencySymbol: string;
  onClose: () => void;
  onAddToCart: (product: ProductItem) => void;
  onViewFullPage: (product: ProductItem) => void;
}

const ProductDetailsModal = React.memo(function ProductDetailsModal({
  visible,
  product,
  currencySymbol,
  onClose,
  onAddToCart,
  onViewFullPage,
}: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.productDetailsContainer}>
          <View style={styles.productDetailsHeader}>
            <ThemedText style={styles.productDetailsTitle}>Product Details</ThemedText>
            <Pressable onPress={onClose} accessible accessibilityLabel="Close product details" accessibilityRole="button">
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView style={styles.productDetailsContent} showsVerticalScrollIndicator={false}>
            <CachedImage source={product.image} style={styles.productDetailsImage} contentFit="cover" />
            <View style={styles.productDetailsInfo}>
              <ThemedText style={styles.productDetailsName}>{product.name}</ThemedText>
              <View style={styles.productDetailsPriceRow}>
                <ThemedText style={styles.productDetailsPrice}>
                  {currencySymbol}{product.price.current.toLocaleString()}
                </ThemedText>
                {product.price.original && product.price.original > product.price.current && (
                  <>
                    <ThemedText style={styles.productDetailsOriginalPrice}>
                      {currencySymbol}{product.price.original.toLocaleString()}
                    </ThemedText>
                    <ThemedText style={styles.productDetailsDiscount}>
                      {product.price.discount}% OFF
                    </ThemedText>
                  </>
                )}
              </View>
              {product.rating && (
                <View style={styles.productDetailsRating}>
                  <Ionicons name="star" size={18} color={Colors.warning} />
                  <ThemedText style={styles.productDetailsRatingText}>
                    {product.rating.value} ({product.rating.count} reviews)
                  </ThemedText>
                </View>
              )}
              <View style={styles.productDetailsSection}>
                <ThemedText style={styles.productDetailsSectionTitle}>Description</ThemedText>
                <ThemedText style={styles.productDetailsSectionText}>
                  {product.description || 'No description available'}
                </ThemedText>
              </View>
              <View style={styles.productDetailsSection}>
                <ThemedText style={styles.productDetailsSectionTitle}>Availability</ThemedText>
                <ThemedText style={styles.productDetailsSectionText}>
                  {product.availabilityStatus === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                </ThemedText>
              </View>
              {product.brand && (
                <View style={styles.productDetailsSection}>
                  <ThemedText style={styles.productDetailsSectionTitle}>Brand</ThemedText>
                  <ThemedText style={styles.productDetailsSectionText}>{product.brand}</ThemedText>
                </View>
              )}
              {product.category && (
                <View style={styles.productDetailsSection}>
                  <ThemedText style={styles.productDetailsSectionTitle}>Category</ThemedText>
                  <ThemedText style={styles.productDetailsSectionText}>{product.category}</ThemedText>
                </View>
              )}
              {product.cashback && (
                <View style={styles.productDetailsSection}>
                  <ThemedText style={styles.productDetailsSectionTitle}>Cashback</ThemedText>
                  <ThemedText style={styles.productDetailsSectionText}>
                    {product.cashback.percentage}% cashback
                  </ThemedText>
                </View>
              )}
              <View style={styles.productDetailsActions}>
                <Pressable
                  style={[styles.productDetailsButton, styles.productDetailsButtonPrimary]}
                  onPress={() => { onClose(); onAddToCart(product); }}
                  accessible accessibilityLabel="Add to cart" accessibilityRole="button"
                >
                  <Ionicons name="bag-outline" size={20} color={Colors.text.inverse} />
                  <ThemedText style={styles.productDetailsButtonText}>Add to Cart</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.productDetailsButton}
                  onPress={() => { onClose(); onViewFullPage(product); }}
                  accessible accessibilityLabel="View full product page" accessibilityRole="button"
                >
                  <ThemedText style={styles.productDetailsButtonTextSecondary}>View Full Page</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ─── Component ──────────────────────────────────────────────────────────────

function ProductGrid({
  storeId,
  products,
  loading,
  refreshing,
  loadingMore,
  hasMore,
  error,
  errorInfo,
  isOnline,
  isOffline,
  searchQuery,
  selectedCategory,
  sortBy,
  availabilityFilter,
  minPrice,
  maxPrice,
  storeData,
  storeName,
  onLoadMore,
  onRefresh,
  onRetry,
  onClearAllFilters,
  waitForNetwork,
}: ProductGridProps) {
  const router = useRouter();
  const cartActions = useCartActions();
  const isAuthenticated = useIsAuthenticated();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const cardWidth = useMemo(() => getCardWidth(), []);
  const productViewTimes = useRef<Map<string, number>>(new Map());

  // Modal states
  const [quickViewProduct, setQuickViewProduct] = React.useState<ProductItem | null>(null);
  const [showQuickView, setShowQuickView] = React.useState(false);
  const [showProductDetails, setShowProductDetails] = React.useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = React.useState<ProductItem | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleProductPress = useCallback((product: ProductItem) => {
    const productId = (product as any)._id || product.id;

    analyticsService.trackProductView({
      productId,
      productName: product.name,
      productPrice: product.price.current,
      category: product.category || 'General',
      brand: product.brand || storeData?.name || 'Store',
    });

    const viewStartTime = productViewTimes.current.get(productId);
    if (viewStartTime) {
      analyticsService.track('product_time_spent', {
        productId,
        timeSpent: Date.now() - viewStartTime,
        storeId,
      });
    }

    router.push({
      pathname: '/product-page',
      params: { cardId: productId, cardType: 'product' },
    } as any);
  }, [router, storeData?.name, storeId]);

  const handleAddToCart = useCallback(async (product: ProductItem) => {
    analyticsService.trackAddToCart({
      productId: product.id,
      productName: product.name,
      price: product.price.current,
      quantity: 1,
      totalValue: product.price.current,
    });

    if (!isAuthenticated) {
      analyticsService.track('add_to_cart_blocked', { reason: 'not_authenticated', productId: product.id, productName: product.name });
      platformAlertConfirm('Sign In Required', 'Please sign in to add items to your cart.', () => router.push('/sign-in'), 'Sign In');
      return;
    }

    if (isOffline) {
      analyticsService.track('add_to_cart_blocked', { reason: 'offline', productId: product.id, productName: product.name });
      platformAlertSimple('No Internet', 'Please check your network connection and try again.');
      return;
    }

    try {
      if (cartActions && typeof cartActions.addItem === 'function') {
        await cartActions.addItem({
          id: product.id,
          name: product.name,
          price: product.price.current,
          image: product.image,
          cashback: product.cashback ? `${product.cashback.percentage}% cashback` : '',
          category: (product.category || 'products') as 'products' | 'service',
          quantity: 1,
        });

        triggerImpact('Medium');
        analyticsService.track('add_to_cart_success', { productId: product.id, productName: product.name, price: product.price.current });
        showToast({ message: `${product.name} added to cart`, type: 'success', duration: 3000 });
      }
    } catch (err) {
      analyticsService.track('add_to_cart_error', { productId: product.id, error: err instanceof Error ? err.message : 'Unknown error' });
      showToast({ message: 'Failed to add item to cart. Please try again.', type: 'error', duration: 3000 });
    }
  }, [isAuthenticated, isOffline, router, cartActions]);

  const handleWishlistToggle = useCallback(async (product: ProductItem) => {
    const productId = (product as any)._id || product.id;
    const isInWishlistNow = isInWishlist(productId);

    try {
      if (isInWishlistNow) {
        await removeFromWishlist(productId);
        analyticsService.trackWishlist('remove', productId, product.name);
        triggerImpact('Light');
        showToast({ message: `${product.name} removed from wishlist`, type: 'info', duration: 2000 });
      } else {
        if (!isAuthenticated) {
          platformAlertConfirm('Sign In Required', 'Please sign in to add items to your wishlist.', () => router.push('/sign-in'), 'Sign In');
          return;
        }

        await addToWishlist({
          productId,
          productName: product.name,
          productImage: product.image,
          price: product.price.current,
          originalPrice: typeof product.price.original === 'number' ? product.price.original : undefined,
          discount: (() => {
            const discount = product.price.discount;
            if (typeof discount === 'number') return discount;
            if (typeof discount === 'string') return isNaN(parseFloat(discount)) ? 0 : parseFloat(discount);
            return 0;
          })(),
          rating: (() => {
            const ratingValue = product.rating?.value;
            if (typeof ratingValue === 'number') return ratingValue;
            if (typeof ratingValue === 'string') return isNaN(parseFloat(ratingValue)) ? 0 : parseFloat(ratingValue);
            return 0;
          })(),
          reviewCount: product.rating?.count || 0,
          brand: product.brand || storeData?.name || 'Store',
          category: product.category || 'General',
          availability: product.availabilityStatus === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
        });
        analyticsService.trackWishlist('add', productId, product.name);
        triggerImpact('Medium');
        showToast({ message: `${product.name} added to wishlist`, type: 'success', duration: 2000 });
      }
    } catch {
      // silently handle
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist, isAuthenticated, router, storeData?.name]);

  const handleShareProduct = useCallback(async (product: ProductItem) => {
    const productId = (product as any)._id || product.id;
    const productUrl = Platform.OS === 'web'
      ? `${window.location.origin}/product-page?cardId=${productId}&cardType=product`
      : `rez://product/${productId}`;

    try {
      const shareMessage = `Check out ${product.name} at ${storeData?.name || storeName || 'this store'} for ${currencySymbol}${product.price.current}${product.price.original ? ` (was ${currencySymbol}${product.price.original})` : ''}`;

      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({ title: product.name, text: shareMessage, url: productUrl });
      } else {
        const result = await Share.share({ message: `${shareMessage}\n\n${productUrl}`, title: product.name });
        if (result.action === Share.sharedAction) {
          analyticsService.track('product_shared', { productId, productName: product.name, platform: result.activityType || 'unknown', storeId });
        }
      }

      analyticsService.track('product_share_attempt', { productId, productName: product.name, storeId });
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.message !== 'User did not share') {
        // silent
      }
    }
  }, [storeData?.name, storeName, storeId, currencySymbol]);

  const handleQuickView = useCallback((product: ProductItem) => {
    setQuickViewProduct(product);
    setShowQuickView(true);
    analyticsService.track('product_quick_view_opened', { productId: (product as any)._id || product.id, productName: product.name, storeId });
  }, [storeId]);

  // ─── Render item ──────────────────────────────────────────────────────────

  const renderProduct = useCallback(({ item, index }: { item: ProductItem; index: number }) => {
    const productId = (item as any)._id || item.id;

    if (!productViewTimes.current.has(productId)) {
      if (productViewTimes.current.size >= 100) {
        const oldest = productViewTimes.current.keys().next();
        if (!oldest.done) productViewTimes.current.delete(oldest.value);
      }
      productViewTimes.current.set(productId, Date.now());
    }

    return (
      <View
        style={[styles.productWrapper, { width: cardWidth }]}
        accessible
        accessibilityLabel={`Product ${index + 1} of ${products.length}. ${item.name}. ${item.price.current} rupees. ${item.availabilityStatus === 'in_stock' ? 'In stock' : 'Out of stock'}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view product details or add to cart"
      >
        <ProductCard
          product={item}
          onPress={handleProductPress}
          onAddToCart={handleAddToCart}
          width={cardWidth}
          showAddToCart={true}
        />
        <View style={styles.quickActionsOverlay}>
          <Pressable style={styles.quickActionButton} onPress={() => handleQuickView(item)} accessible accessibilityLabel="Quick view product" accessibilityRole="button">
            <Ionicons name="eye-outline" size={18} color={Colors.text.inverse} />
          </Pressable>
          <Pressable style={styles.quickActionButton} onPress={() => handleWishlistToggle(item)} accessible accessibilityLabel={isInWishlist(productId) ? "Remove from wishlist" : "Add to wishlist"} accessibilityRole="button">
            <Ionicons name={isInWishlist(productId) ? "heart" : "heart-outline"} size={18} color={isInWishlist(productId) ? Colors.error : Colors.text.inverse} />
          </Pressable>
          <Pressable style={styles.quickActionButton} onPress={() => handleShareProduct(item)} accessible accessibilityLabel="Share product" accessibilityRole="button">
            <Ionicons name="share-outline" size={18} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </View>
    );
  }, [cardWidth, products.length, handleProductPress, handleAddToCart, handleQuickView, handleWishlistToggle, handleShareProduct, isInWishlist]);

  // ─── Empty state ──────────────────────────────────────────────────────────

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ProductGridSkeleton count={6} columns={SCREEN_WIDTH >= 768 ? 3 : 2} />
        </View>
      );
    }

    if (error && errorInfo) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name={isOffline ? "cloud-offline-outline" : "alert-circle-outline"} size={64} color={Colors.error} />
          <ThemedText style={styles.emptyTitle}>
            {isOffline ? 'No Internet Connection' : 'Unable to load products'}
          </ThemedText>
          <ThemedText style={styles.emptyText}>{errorInfo.message}</ThemedText>

          {errorInfo.suggestions && errorInfo.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ThemedText style={styles.suggestionsTitle}>Try:</ThemedText>
              {errorInfo.suggestions.map((suggestion, index) => (
                <ThemedText key={index} style={styles.suggestionText}>
                  {'\u2022'} {suggestion}
                </ThemedText>
              ))}
            </View>
          )}

          {errorInfo.isRetryable && (
            <View style={styles.retryContainer}>
              <RetryButton onRetry={onRetry} label="Try Again" variant="primary" />
            </View>
          )}

          {isOffline && (
            <Pressable
              style={styles.waitForNetworkButton}
              onPress={async () => {
                const connected = await waitForNetwork(10000);
                if (connected) {
                  onRetry();
                }
              }}
            >
              <Ionicons name="refresh" size={20} color={Colors.nileBlue} />
              <ThemedText style={styles.waitForNetworkText}>Wait for Network</ThemedText>
            </Pressable>
          )}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
          <ThemedText style={styles.emptyTitle}>Unable to load products</ThemedText>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
          <RetryButton onRetry={onRetry} label="Try Again" variant="primary" />
        </View>
      );
    }

    const hasFilters = searchQuery || selectedCategory || availabilityFilter !== 'all' || minPrice || maxPrice;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color={Colors.text.tertiary} />
        <ThemedText style={styles.emptyTitle}>No products found</ThemedText>
        <ThemedText style={styles.emptyText}>
          {hasFilters
            ? 'Try adjusting your filters or search terms.'
            : "This store doesn't have any products yet."}
        </ThemedText>
        {hasFilters && (
          <Pressable
            style={styles.clearFiltersButton}
            onPress={onClearAllFilters}
            accessible accessibilityLabel="Clear all filters" accessibilityRole="button"
          >
            <ThemedText style={styles.clearFiltersText}>Clear All Filters</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }, [loading, error, errorInfo, isOffline, searchQuery, selectedCategory, availabilityFilter, minPrice, maxPrice, onRetry, onClearAllFilters, waitForNetwork]);

  // ─── Footer ────────────────────────────────────────────────────────────────

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={Colors.nileBlue} />
        <ThemedText style={styles.footerText}>Loading more products...</ThemedText>
      </View>
    );
  }, [loadingMore]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.content}>
      {loading && products.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <ProductGridSkeleton count={6} columns={SCREEN_WIDTH >= 768 ? 3 : 2} />
        </View>
      ) : products.length === 0 ? (
        renderEmpty()
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item, index) => (item as any)._id || item.id || `product-${index}`}
          numColumns={SCREEN_WIDTH >= 768 ? 3 : 2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.nileBlue]}
              tintColor={Colors.nileBlue}
              enabled={isOnline}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          estimatedItemSize={220}
        />
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        visible={showQuickView}
        product={quickViewProduct}
        currencySymbol={currencySymbol}
        onClose={() => setShowQuickView(false)}
        onAddToCart={handleAddToCart}
        onViewDetails={handleProductPress}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        visible={showProductDetails}
        product={selectedProductForDetails}
        currencySymbol={currencySymbol}
        onClose={() => setShowProductDetails(false)}
        onAddToCart={handleAddToCart}
        onViewFullPage={handleProductPress}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  listContainer: {
    paddingBottom: 120,
    gap: Spacing.base,
  },
  productWrapper: {
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background.primary,
    ...Shadows.medium,
  },
  quickActionsOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'column',
    gap: Spacing.sm,
    zIndex: 10,
  },
  quickActionButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    paddingVertical: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginTop: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    width: '100%',
    maxWidth: 400,
  },
  suggestionsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  retryContainer: {
    marginTop: Spacing.lg,
  },
  waitForNetworkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    backgroundColor: colors.tint.pink,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  waitForNetworkText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  clearFiltersButton: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.sm,
  },
  clearFiltersText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Quick View Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickViewContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  quickViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  quickViewTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.md,
  },
  quickViewContent: {
    maxHeight: '70%',
  },
  quickViewImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.background.secondary,
  },
  quickViewInfo: {
    padding: Spacing.base,
  },
  quickViewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickViewPrice: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  quickViewOriginalPrice: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  quickViewDiscount: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  quickViewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  quickViewRatingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  quickViewDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
  },
  quickViewActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickViewButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickViewButtonPrimary: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickViewButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  quickViewButtonTextSecondary: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Product Details Modal
  productDetailsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  productDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  productDetailsTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productDetailsContent: {
    maxHeight: '80%',
  },
  productDetailsImage: {
    width: '100%',
    height: 350,
    backgroundColor: Colors.background.secondary,
  },
  productDetailsInfo: {
    padding: Spacing.base,
  },
  productDetailsName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  productDetailsPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  productDetailsPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  productDetailsOriginalPrice: {
    ...Typography.h3,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  productDetailsDiscount: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.error,
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  productDetailsRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  productDetailsRatingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  productDetailsSection: {
    marginBottom: Spacing.lg,
  },
  productDetailsSectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  productDetailsSectionText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  productDetailsActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  productDetailsButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetailsButtonPrimary: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  productDetailsButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  productDetailsButtonTextSecondary: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default React.memo(ProductGrid);
