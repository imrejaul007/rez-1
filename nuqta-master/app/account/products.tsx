// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import userProductService, { UserProduct } from '../../services/userProductApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

function ProductsScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'warranty_expired'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  useEffect(() => {
    loadProducts(1);
  }, [selectedFilter]);

  const loadProducts = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      const filters: any = selectedFilter !== 'all' ? { status: selectedFilter as any } : {};
      filters.page = pageNum;
      filters.limit = PAGE_LIMIT;
      const response = await userProductService.getUserProducts(filters);

      if (response.success && response.data) {
        if (!isMounted()) return;
        const newProducts = response.data;
        if (pageNum === 1) {
          setProducts(Array.isArray(newProducts) ? newProducts : []);
        } else {
          setProducts(prev => [...prev, ...(Array.isArray(newProducts) ? newProducts : [])]);
        }
        setPage(pageNum);
        setHasMore(Array.isArray(newProducts) && newProducts.length >= PAGE_LIMIT);
      } else {
        if (!isMounted()) return;
        setError('Failed to load products. Please try again.');
        if (pageNum === 1) {
          if (!isMounted()) return;
          setProducts([]);
        }
      }
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load products. Please check your connection and try again.');
      if (pageNum === 1) {
        if (!isMounted()) return;
        setProducts([]);
      }
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadProducts(1);
    if (!isMounted()) return;
    setRefreshing(false);
  }, [loadProducts]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadProducts(page + 1);
  }, [loadingMore, hasMore, page, loadProducts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'warranty_expired':
        return Colors.warning;
      case 'returned':
        return Colors.error;
      case 'replaced':
        return Colors.info;
      default:
        return Colors.text.tertiary;
    }
  };

  const getWarrantyStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'expiring_soon':
        return Colors.warning;
      case 'expired':
        return Colors.error;
      case 'no_warranty':
        return Colors.text.tertiary;
      default:
        return Colors.text.tertiary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderFilterButton = (
    filter: 'all' | 'active' | 'warranty_expired',
    label: string
  ) => (
    <Pressable
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
      accessibilityLabel={`${label} products${selectedFilter === filter ? ', selected' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: selectedFilter === filter }}
      accessibilityHint="Double tap to filter products by this category"
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderProductCard = useCallback(({ item }: { item: UserProduct }) => {
    // Safely access nested properties
    const productName = item.product?.name || 'Unknown Product';
    const productImages = item.product?.images || [];
    const productImage = productImages.length > 0 ? productImages[0] : undefined;

    const warrantyInfo = item.warranty?.hasWarranty && item.warrantyStatus
      ? `Warranty: ${item.warrantyStatus === 'active' ? `${item.warrantyDaysRemaining || 0} days left` : item.warrantyStatus.replace('_', ' ')}`
      : '';
    const amcInfo = item.amc?.hasAMC ? `AMC: ${item.amcDaysRemaining || 0} days remaining` : '';
    const statusInfo = `Status: ${item.status?.replace('_', ' ') || 'unknown'}`;

    return (
      <Pressable
        style={styles.productCard}
        onPress={() => router.push(`/account/product-detail?id=${item._id}`)}
        accessibilityLabel={`${productName}. Purchased ${formatDate(item.purchaseDate)}. ${warrantyInfo ? warrantyInfo + '. ' : ''}${amcInfo ? amcInfo + '. ' : ''}${statusInfo}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view full product details, warranty, and service options"
      >
        {/* Product Image */}
        <CachedImage
          source={productImage}
          style={styles.productImage}
          accessibilityLabel={`${productName} image`}
        />

        <View style={styles.productInfo}>
          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>

          {/* Purchase Date */}
          <Text style={styles.productDate}>
            Purchased: {formatDate(item.purchaseDate)}
          </Text>

          {/* Warranty Info */}
          {item.warranty?.hasWarranty && (
            <View style={styles.warrantyInfo}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={getWarrantyStatusColor(item.warrantyStatus)}
              />
              <Text
                style={[
                  styles.warrantyText,
                  { color: getWarrantyStatusColor(item.warrantyStatus) },
                ]}
              >
                {item.warrantyStatus === 'active' &&
                  `Warranty: ${item.warrantyDaysRemaining || 0} days left`}
                {item.warrantyStatus === 'expiring_soon' &&
                  `Expiring soon: ${item.warrantyDaysRemaining || 0} days`}
                {item.warrantyStatus === 'expired' && 'Warranty expired'}
                {item.warrantyStatus === 'no_warranty' && 'No warranty'}
              </Text>
            </View>
          )}

          {/* AMC Info */}
          {item.amc?.hasAMC && (
            <View style={styles.amcInfo}>
              <Ionicons
                name="construct"
                size={16}
                color={item.isAMCExpiringSoon ? Colors.warning : Colors.success}
              />
              <Text
                style={[
                  styles.amcText,
                  { color: item.isAMCExpiringSoon ? Colors.warning : Colors.success },
                ]}
              >
                {item.isAMCExpiringSoon
                  ? `AMC expiring: ${item.amcDaysRemaining || 0} days`
                  : `AMC active: ${item.amcDaysRemaining || 0} days`}
              </Text>
            </View>
          )}

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        {/* Arrow Icon */}
        <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
      </Pressable>
    );
  }, [router]);

  const renderEmptyState = () => (
    <View
      style={styles.emptyState}
      accessibilityLabel={`No products found. ${selectedFilter === 'all' ? 'You haven\'t purchased any products yet' : `No ${selectedFilter.replace('_', ' ')} products found`}`}
      accessibilityRole="text"
    >
      <Ionicons name="cube-outline" size={64} color={Colors.border.default} />
      <Text style={styles.emptyStateTitle}>No Products Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all'
          ? 'You haven\'t purchased any products yet. Start shopping to see your products here!'
          : `No ${selectedFilter.replace('_', ' ')} products found.`}
      </Text>
      {selectedFilter === 'all' && (
        <Pressable
          style={styles.shopButton}
          onPress={() => router.push('/MainStorePage')}
          accessibilityLabel="Start Shopping"
          accessibilityRole="button"
          accessibilityHint="Double tap to browse store and purchase products"
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </Pressable>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View
      style={styles.errorState}
      accessibilityLabel={`Error loading products. ${error}`}
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle" size={64} color={Colors.error} />
      <Text style={styles.errorStateTitle}>Error Loading Products</Text>
      <Text style={styles.errorStateText}>{error}</Text>
      <Pressable
        style={styles.retryButton}
        onPress={loadProducts}
        accessibilityLabel="Try again"
        accessibilityRole="button"
        accessibilityHint="Double tap to reload products"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Navigate to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
        >
          My Products
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('active', 'Active')}
          {renderFilterButton('warranty_expired', 'Warranty Expired')}
        </ScrollView>
      </View>

      {/* Products List */}
      {error ? (
        renderErrorState()
      ) : (
        <FlashList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.info} />
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          estimatedItemSize={100}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  filterContainer: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  filterButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.info,
  },
  filterButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterButtonTextActive: {
    color: Colors.text.inverse,
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
  },
  productName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  productDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 6,
  },
  warrantyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  warrantyText: {
    ...Typography.bodySmall,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  amcInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  amcText: {
    ...Typography.bodySmall,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    marginTop: Spacing.xs,
  },
  statusText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  shopButton: {
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.base,
  },
  shopButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  errorStateTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default withErrorBoundary(ProductsScreen, 'AccountProducts');
