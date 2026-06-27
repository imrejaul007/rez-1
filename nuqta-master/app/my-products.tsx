// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Products Page
// Shows all products the user has purchased from their order history

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import ordersService from '@/services/ordersApi';
import { useIsAuthenticated, useAuthLoading, useRefreshCart, useGetCurrencySymbol } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import { useReorder } from '@/hooks/useReorder';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type ProductStatus = 'all' | 'delivered' | 'in_transit' | 'cancelled';

interface PurchasedProduct {
  id: string;
  _id?: string;
  productId: string;
  storeId?: string;
  store?: { _id?: string; id?: string };
  orderId: string;
  name: string;
  image: string;
  variant?: {
    type: string;
    value: string;
  };
  price: number;
  quantity: number;
  orderDate: string;
  deliveryStatus: 'delivered' | 'in_transit' | 'cancelled' | 'pending';
  canReorder: boolean;
  canReview: boolean;
}

const MyProductsPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const navigation = useNavigation();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { goBack } = useSafeNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductStatus>('all');
  const [reorderingProductId, setReorderingProductId] = useState<string | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reorderModalData, setReorderModalData] = useState<{
    addedCount: number;
    skippedCount: number;
    skippedItems: Array<{ productId: string; reason: string }>;
  } | null>(null);

  const { reorderFull, reordering, validation, error: reorderError } = useReorder();
  const refreshCart = useRefreshCart();

  const handleBackPress = useCallback(() => {
    goBack('/profile' as any);
  }, [goBack]);

  const mapOrderStatusToDelivery = (status: string): 'delivered' | 'in_transit' | 'cancelled' | 'pending' => {
    const statusMap: Record<string, 'delivered' | 'in_transit' | 'cancelled' | 'pending'> = {
      'delivered': 'delivered',
      'shipped': 'in_transit',
      'dispatched': 'in_transit',
      'processing': 'in_transit',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'pending': 'pending',
      'confirmed': 'pending',
    };
    return statusMap[status] || 'pending';
  };

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const params: any = {
        page: pageNum,
        limit: 20
      };

      // Map frontend tab statuses to backend order statuses
      if (activeTab === 'delivered') {
        params.status = 'delivered';
      } else if (activeTab === 'in_transit') {
        // Backend uses shipped/dispatched/processing — use statusGroup or fetch all
        // Fetch all and let client-side filter handle it
      } else if (activeTab === 'cancelled') {
        params.status = 'cancelled';
      }

      const response = await ordersService.getOrders(params);

      if (response.data?.orders) {
        const mappedProducts: PurchasedProduct[] = response.data.orders.flatMap(order =>
          order.items.map((item: any) => {
            // Use populated product data with snapshot fallbacks
            const product = typeof item.product === 'object' && item.product ? item.product : null;
            const productImage = product?.images?.[0]?.url || item.image || '';
            const productName = product?.name || item.name || 'Product';
            const productId = product?._id || product?.id || item.product || '';

            return {
              id: item._id || item.id || `${order._id}-${productId}`,
              _id: item._id || item.id,
              productId: String(productId),
              storeId: typeof item.store === 'object' ? (item.store?._id || item.store?.id) : item.store,
              store: typeof item.store === 'object' ? item.store : undefined,
              orderId: order.orderNumber,
              name: productName,
              image: productImage,
              variant: item.variant ? {
                type: item.variant.type || Object.keys(item.variant.attributes || {})[0] || 'Variant',
                value: item.variant.value || Object.values(item.variant.attributes || {})[0]?.toString() || item.variant.name || ''
              } : undefined,
              price: item.price || item.unitPrice || 0,
              quantity: item.quantity,
              orderDate: order.createdAt,
              deliveryStatus: mapOrderStatusToDelivery(order.status),
              canReorder: order.status === 'delivered',
              canReview: order.status === 'delivered'
            };
          })
        );
        if (append) {
          if (!isMounted()) return;
          setProducts(prev => [...prev, ...mappedProducts]);
        } else {
          if (!isMounted()) return;
          setProducts(mappedProducts);
        }
        if (!isMounted()) return;
        setPage(pageNum);
        if (!isMounted()) return;
        setHasMore((response.data.orders?.length || 0) >= 20);
      } else {
        if (!isMounted()) return;
        if (!append) setProducts([]);
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch (error: any) {
      if (!isMounted()) return;
      if (!append) setProducts([]);
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [activeTab, authLoading, isAuthenticated]);

  useEffect(() => {
    // Only fetch when auth is ready
    if (!authLoading && isAuthenticated) {
      fetchProducts();
    }
  }, [fetchProducts, authLoading, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchProducts(page + 1, true);
    }
  }, [loadingMore, hasMore, loading, page, fetchProducts]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    if (activeTab === 'all') return true;
    return product.deliveryStatus === activeTab;
  }), [products, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return Colors.success;
      case 'in_transit':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      case 'pending':
        return Colors.text.tertiary;
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'in_transit':
        return 'In Transit';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const handleReorder = useCallback(async (product: PurchasedProduct) => {
    if (reordering) {

      return;
    }

    try {
      setReorderingProductId(product.orderId);

      // Show confirmation dialog
      platformAlertConfirm(
        'Reorder Confirmation',
        `Would you like to reorder all items from order #${product.orderId}?`,
        async () => {
          try {

            const success = await reorderFull(product.orderId);

            if (success && validation) {
              // Refresh cart to show new items
              await refreshCart();

              // Show result modal with details
              if (!isMounted()) return;
              setReorderModalData({
                addedCount: validation.items.filter(item => item.isAvailable).length,
                skippedCount: validation.unavailableItems.length,
                skippedItems: validation.unavailableItems.map(item => ({
                  productId: item.productId,
                  reason: item.reason
                }))
              });
              if (!isMounted()) return;
              setShowReorderModal(true);

              // If all items were added, navigate to cart
              if (validation.unavailableItems.length === 0) {
                if (!isMounted()) return;
                setTimeout(() => {
                  if (!isMounted()) return;
                  setShowReorderModal(false);
                  router.push('/cart' as any);
                }, 2000);
              }
            } else {
              // Show error
              platformAlertSimple(
                'Reorder Failed',
                reorderError || 'Unable to reorder this order. Please try again.'
              );
            }
          } catch (error) {
            platformAlertSimple(
              'Error',
              'An unexpected error occurred while reordering.'
            );
          } finally {
            if (!isMounted()) return;
            setReorderingProductId(null);
          }
        },
        'Reorder'
      );
    } catch (error) {
      if (!isMounted()) return;
      setReorderingProductId(null);
    }
  }, [reordering, reorderFull, validation, reorderError, refreshCart, router]);

  const handleReview = useCallback((product: PurchasedProduct) => {
    const storeId = product.storeId || product.store?._id || product.store?.id;
    if (storeId) {
      router.push(`/reviews/${storeId}?productId=${product._id || product.id}` as any);
    } else {
      router.push('/ReviewPage' as any);
    }
  }, [router]);

  const renderProduct = useCallback(({ item }: { item: PurchasedProduct }) => {
    const productLabel = `${item.name}${item.variant ? `, ${item.variant.type}: ${item.variant.value}` : ''}. Price: ${item.price} rupees. Quantity: ${item.quantity}. Order number ${item.orderId}, placed on ${new Date(item.orderDate).toLocaleDateString()}. Status: ${getStatusText(item.deliveryStatus)}`;

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => router.push(`/product-page?cardId=${item.productId}&cardType=product` as any)}
       
        accessibilityLabel={productLabel}
        accessibilityRole="button"
        accessibilityHint="Double tap to view product details"
      >
        {item.image ? (
          <CachedImage
            source={{ uri: item.image }}
            style={styles.productImage}
            accessibilityLabel={`Product image for ${item.name}`}
            accessible={true}
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="cube-outline" size={28} color={Colors.text.tertiary} />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {item.variant && (
            <Text style={styles.productVariant}>
              {item.variant.type}: {item.variant.value}
            </Text>
          )}

          <View
            style={styles.productDetails}
            accessibilityLabel={`Price: ${item.price} rupees. Quantity: ${item.quantity}`}
            accessibilityRole="text"
          >
            <Text style={styles.productPrice}>{currencySymbol}{(item.price || 0).toFixed(2)}</Text>
            <Text style={styles.productQuantity}>Qty: {item.quantity}</Text>
          </View>

          <Text
            style={styles.orderInfo}
            accessibilityLabel={`Order number ${item.orderId}, placed on ${new Date(item.orderDate).toLocaleDateString()}`}
          >
            Order #{item.orderId} • {new Date(item.orderDate).toLocaleDateString()}
          </Text>

          <View
            style={styles.statusBadge}
            accessibilityLabel={`Delivery status: ${getStatusText(item.deliveryStatus)}`}
            accessibilityRole="text"
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.deliveryStatus) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.deliveryStatus) },
              ]}
            >
              {getStatusText(item.deliveryStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {item.canReorder && (
            <Pressable
              style={[
                styles.actionButton,
                reorderingProductId === item.orderId && styles.actionButtonDisabled
              ]}
              onPress={() => handleReorder(item)}
              disabled={reorderingProductId === item.orderId}
              accessibilityLabel={reorderingProductId === item.orderId ? 'Reordering product' : 'Reorder this product'}
              accessibilityRole="button"
              accessibilityHint="Double tap to add all items from this order to your cart"
              accessibilityState={{ disabled: reorderingProductId === item.orderId }}
            >
              {reorderingProductId === item.orderId ? (
                <ActivityIndicator size="small" color={colors.brand.green} />
              ) : (
                <>
                  <Ionicons name="repeat-outline" size={20} color={colors.brand.green} />
                  <Text style={styles.actionText}>Reorder</Text>
                </>
              )}
            </Pressable>
          )}

          {item.canReview && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleReview(item)}
              accessibilityLabel="Write a review for this product"
              accessibilityRole="button"
              accessibilityHint="Double tap to submit a product review"
            >
              <Ionicons name="star-outline" size={20} color={Colors.warning} />
              <Text style={styles.actionText}>Review</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  }, [router, currencySymbol, reorderingProductId, handleReorder, handleReview]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={80} color={Colors.border.default} />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyText}>
        Products you purchase will appear here
      </Text>
      <Pressable
        style={styles.shopButton}
        onPress={() => router.push('/(tabs)/explore' as any)}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </Pressable>
    </View>
  );

  const tabs: { key: ProductStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (loading && !refreshing) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.teal} />

      {/* Header */}
      <LinearGradient colors={[colors.brand.teal, colors.brand.green]} style={styles.header}>
        <View style={styles.headerContent}>
          <HeaderBackButton
            onPress={handleBackPress}
            iconColor={colors.background.primary}
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>My Products</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Products List */}
      <FlashList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.brand.green} />
            </View>
          ) : null
        }
        estimatedItemSize={100}
      />

      {/* Reorder Result Modal */}
      <Modal
        visible={showReorderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReorderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {reorderModalData?.skippedCount === 0 ? (
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              ) : (
                <Ionicons name="alert-circle" size={48} color={Colors.warning} />
              )}
              <Text style={styles.modalTitle}>
                {reorderModalData?.skippedCount === 0
                  ? 'Reorder Successful!'
                  : 'Reorder Completed'}
              </Text>
            </View>

            <View style={styles.modalBody}>
              {reorderModalData && reorderModalData.addedCount > 0 && (
                <View style={styles.modalRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
                  <Text style={styles.modalSuccessText}>
                    {reorderModalData.addedCount} item(s) added to cart
                  </Text>
                </View>
              )}

              {reorderModalData && reorderModalData.skippedCount > 0 && (
                <>
                  <View style={styles.modalRow}>
                    <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                    <Text style={styles.modalErrorText}>
                      {reorderModalData.skippedCount} item(s) unavailable
                    </Text>
                  </View>

                  <View style={styles.skippedItemsList}>
                    {reorderModalData.skippedItems.map((item, index) => (
                      <Text key={index} style={styles.skippedItemText}>
                        {item.reason}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              {reorderModalData?.addedCount && reorderModalData.addedCount > 0 ? (
                <>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setShowReorderModal(false)}
                  >
                    <Text style={styles.modalButtonTextSecondary}>Continue Shopping</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => {
                      setShowReorderModal(false);
                      router.push('/cart' as any);
                    }}
                  >
                    <Text style={styles.modalButtonTextPrimary}>View Cart</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setShowReorderModal(false)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Close</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTab: {
    backgroundColor: Colors.background.primary,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabText: {
    color: colors.brand.green,
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  productCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    ...Shadows.medium,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  productName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  productVariant: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  productPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: colors.brand.green,
    marginRight: Spacing.md,
  },
  productQuantity: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  orderInfo: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  actionsContainer: {
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.background.secondary,
    minWidth: 70,
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  shopButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.strong,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: Spacing.xl,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalSuccessText: {
    ...Typography.bodyLarge,
    color: Colors.success,
    fontWeight: '600',
  },
  modalErrorText: {
    ...Typography.bodyLarge,
    color: Colors.error,
    fontWeight: '600',
  },
  skippedItemsList: {
    marginTop: Spacing.sm,
    paddingLeft: 28,
  },
  skippedItemText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.brand.green,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  modalButtonTextPrimary: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  modalButtonTextSecondary: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(MyProductsPage, 'MyProducts');
