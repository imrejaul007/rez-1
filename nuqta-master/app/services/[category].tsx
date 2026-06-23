import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import serviceCategoriesApi, {
  ServiceCategory,
  ServiceInCategory,
  ServiceCategoryQueryParams
} from '@/services/serviceCategoriesApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const PARENT_PADDING = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (PARENT_PADDING * 2);
const CARD_WIDTH = Math.floor((AVAILABLE_WIDTH - CARD_GAP) / 2);

// ReZ Design System Colors from TASK.md
// Service Card Component - ReZ Premium Design
const ServiceCard = memo(({
  service,
  onPress
}: {
  service: ServiceInCategory;
  onPress: () => void;
}) => {
  const imageUrl = service.images?.[0];
  const price = service.pricing?.selling || service.pricing?.original || 0;
  const originalPrice = service.pricing?.original || price;
  const hasDiscount = originalPrice > price;
  const cashbackPercentage = service.cashback?.percentage || service.serviceCategory?.cashbackPercentage || 0;
  const rating = service.ratings?.average || 0;
  const ratingCount = service.ratings?.count || 0;

  return (
    <Pressable
      style={styles.serviceCard}
      onPress={onPress}
     
    >
      {/* Service Image */}
      <View style={styles.imageContainer}>
        <CachedImage
          source={imageUrl}
          style={styles.serviceImage}
          contentFit="cover"
        />
        {cashbackPercentage > 0 && (
          <View style={styles.cashbackBadge}>
            <ThemedText style={styles.cashbackBadgeText}>
              {cashbackPercentage}% back
            </ThemedText>
          </View>
        )}
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfo}>
        <ThemedText style={styles.serviceName} numberOfLines={2}>
          {service.name}
        </ThemedText>

        {/* Store Name */}
        {service.store?.name && (
          <ThemedText style={styles.storeName} numberOfLines={1}>
            {service.store.name}
          </ThemedText>
        )}

        {/* Rating */}
        {rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={colors.brand.goldWarm} />
            <ThemedText style={styles.ratingText}>
              {rating.toFixed(1)} ({ratingCount})
            </ThemedText>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceContainer}>
          <ThemedText style={styles.price}>
            {service.pricing?.currency || 'INR'} {price.toLocaleString()}
          </ThemedText>
          {hasDiscount && (
            <ThemedText style={styles.originalPrice}>
              {service.pricing?.currency || 'INR'} {originalPrice.toLocaleString()}
            </ThemedText>
          )}
        </View>

        {/* Get Service Button */}
        <Pressable
          style={styles.getServiceButton}
          onPress={onPress}
         
        >
          <ThemedText style={styles.getServiceButtonText}>Get service</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
});

// Sort Options
const SORT_OPTIONS = [
  { label: 'Rating', value: 'rating' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
  { label: 'Newest', value: 'newest' },
  { label: 'Popular', value: 'popular' },
];

function ServiceCategoryPage() {
  const router = useRouter();
  const { category: categorySlug } = useLocalSearchParams();

  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<ServiceInCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<ServiceCategoryQueryParams['sortBy']>('rating');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Fetch category and services
  const fetchData = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await serviceCategoriesApi.getServicesInCategory(
        categorySlug as string,
        { page: pageNum, limit: 20, sortBy }
      );

      if (response.success && response.data) {
        const { services: newServices, category: categoryData, pagination } = response.data;

        if (!isMounted()) return;
        setCategory(categoryData as any);

        // Safely handle services array
        const servicesArray = Array.isArray(newServices) ? newServices : [];

        if (pageNum === 1) {
          if (!isMounted()) return;
          setServices(servicesArray);
        } else {
          if (!isMounted()) return;
          setServices(prev => [...prev, ...servicesArray]);
        }

        // Safely handle pagination
        const totalPages = pagination?.pages || 1;
        const currentPage = pagination?.page || 1;
        if (!isMounted()) return;
        setHasMore(currentPage < totalPages);
        if (!isMounted()) return;
        setPage(pageNum);
      } else {
        if (!isMounted()) return;
        setError('Failed to load services');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load services');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [categorySlug, sortBy]);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (categorySlug) {
      fetchData(1);
    }
  }, [categorySlug, sortBy]);

  const handleRefresh = useCallback(() => {
    fetchData(1, true);
  }, [fetchData]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchData(page + 1);
    }
  }, [fetchData, loadingMore, hasMore, page]);

  const handleServicePress = (service: ServiceInCategory) => {
    router.push(`/product-page?cardId=${service._id}&cardType=product`);
  };

  const handleSortChange = (value: ServiceCategoryQueryParams['sortBy']) => {
    setSortBy(value);
    setShowSortOptions(false);
    setPage(1);
    setServices([]);
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.brand.green, colors.brand.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Loading...</ThemedText>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <CardGridSkeleton />
        </View>
      </View>
    );
  }

  // Error state
  if (error && services.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.brand.green, colors.brand.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
             
            >
              <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Services</ThemedText>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchData(1)}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with ReZ Green Gradient */}
      <LinearGradient
        colors={[colors.brand.green, colors.brand.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
           
          >
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>
              {category?.name || 'Services'}
            </ThemedText>
            {category?.cashbackPercentage && (
              <View style={styles.cashbackPill}>
                <ThemedText style={styles.cashbackPillText}>
                  Up to {category.cashbackPercentage}% cash back
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <ThemedText style={styles.resultsCount}>
          {services.length} services
        </ThemedText>
        <Pressable
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}
        >
          <ThemedText style={styles.sortButtonText}>
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'}
          </ThemedText>
          <Ionicons
            name={showSortOptions ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.brand.green}
          />
        </Pressable>
      </View>

      {/* Sort Options Dropdown */}
      {showSortOptions && (
        <View style={styles.sortOptionsContainer}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && styles.sortOptionActive
              ]}
              onPress={() => handleSortChange(option.value as ServiceCategoryQueryParams['sortBy'])}
            >
              <ThemedText style={[
                styles.sortOptionText,
                sortBy === option.value && styles.sortOptionTextActive
              ]}>
                {option.label}
              </ThemedText>
              {sortBy === option.value && (
                <Ionicons name="checkmark" size={18} color={colors.brand.green} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Services Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.brand.green]}
            tintColor={colors.brand.green}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={colors.gray[400]} />
            <ThemedText style={styles.emptyText}>No services available</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Check back later for new services
            </ThemedText>
          </View>
        ) : (
          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <ServiceCard
                key={service._id || `service-${index}`}
                service={service}
                onPress={() => handleServicePress(service)}
              />
            ))}
            {/* Add empty card if odd number for grid alignment */}
            {services.length % 2 !== 0 && <View style={styles.emptyCard} />}
          </View>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={colors.brand.green} />
            <ThemedText style={styles.loadingMoreText}>Loading more...</ThemedText>
          </View>
        )}

        {/* End of List */}
        {!hasMore && services.length > 0 && (
          <View style={styles.endOfListContainer}>
            <ThemedText style={styles.endOfListText}>
              That's all the services in this category
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  // Header with ReZ gradient
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.base,
  },
  headerTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    letterSpacing: -0.3,
  },
  cashbackPill: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    alignSelf: 'flex-start',
  },
  cashbackPillText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  // Loading & Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.error,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  // Sort Bar
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  resultsCount: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderRadius: BorderRadius.xl,
  },
  sortButtonText: {
    fontSize: Typography.body.fontSize,
    color: colors.brand.green,
    fontWeight: '600',
  },
  sortOptionsContainer: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
  },
  sortOptionText: {
    fontSize: Typography.body.fontSize,
    color: '#1F2D3D',
  },
  sortOptionTextActive: {
    color: colors.brand.green,
    fontWeight: '600',
  },
  // Services Grid
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: PARENT_PADDING,
    paddingBottom: 120,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Service Card - Standard Card from TASK.md
  serviceCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: CARD_GAP,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    // Shadow from Standard Card spec
    shadowColor: Colors.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyCard: {
    width: CARD_WIDTH,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.brand.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  cashbackBadgeText: {
    color: Colors.text.inverse,
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
  },
  serviceInfo: {
    padding: Spacing.md,
  },
  serviceName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  storeName: {
    fontSize: Typography.bodySmall.fontSize,
    color: colors.gray[400],
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  ratingText: {
    fontSize: Typography.bodySmall.fontSize,
    color: '#1F2D3D',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  originalPrice: {
    fontSize: Typography.bodySmall.fontSize,
    color: colors.gray[400],
    textDecorationLine: 'line-through',
  },
  // Primary Button from TASK.md
  getServiceButton: {
    backgroundColor: colors.brand.green,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  getServiceButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: '#1F2D3D',
    marginTop: Spacing.base,
  },
  emptySubtext: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
    marginTop: Spacing.xs,
  },
  // Loading more
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  endOfListText: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
  },
});

export default withErrorBoundary(ServiceCategoryPage, 'ServicesCategory');
