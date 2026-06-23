import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Stores Listing Page
 * Shows all stores filtered by category with search and filtering capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import storesApi from '@/services/storesApi';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category configurations
const categoryConfigs: Record<string, {
  title: string;
  color: string;
  tags: string[];
  icon: string;
}> = {
  'beauty-wellness': {
    title: 'Beauty & Wellness',
    color: colors.brand.pink,
    tags: ['beauty', 'salon', 'spa', 'wellness'],
    icon: '💄',
  },
  'food-dining': {
    title: 'Food & Dining',
    color: colors.brand.orange,
    tags: ['food', 'restaurant', 'cafe', 'dining'],
    icon: '🍔',
  },
  'fashion': {
    title: 'Fashion',
    color: Colors.brand.purple,
    tags: ['fashion', 'clothing', 'apparel'],
    icon: '👗',
  },
  'grocery-essentials': {
    title: 'Grocery & Essentials',
    color: Colors.success,
    tags: ['grocery', 'supermarket', 'essentials'],
    icon: '🛒',
  },
  'healthcare': {
    title: 'Healthcare',
    color: Colors.error,
    tags: ['healthcare', 'pharmacy', 'medical', 'clinic'],
    icon: '🏥',
  },
  'default': {
    title: 'All Stores',
    color: Colors.gold,
    tags: [],
    icon: '🏪',
  },
};

interface DisplayStore {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: string;
  cashback: string;
  image: string;
  isVerified: boolean;
  is60Min: boolean;
  tags: string[];
}

const StoresPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();

  const categorySlug = (params.category as string) || 'default';
  const filterParam = params.filter as string;

  const config = categoryConfigs[categorySlug] || categoryConfigs['default'];

  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<DisplayStore[]>([]);
  const [filteredStores, setFilteredStores] = useState<DisplayStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filterParam || 'all');

  const filters = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'verified', label: 'Verified', icon: 'shield-checkmark-outline' },
    { id: 'nearby', label: 'Nearby', icon: 'location-outline' },
    { id: 'top-rated', label: 'Top Rated', icon: 'star-outline' },
    { id: 'try-buy', label: '60 Min', icon: 'time-outline' },
  ];

  // Transform store data
  const transformStore = (store: any): DisplayStore => ({
    id: store._id || store.id,
    name: store.name,
    category: store.category?.name || store.tags?.[0] || 'Store',
    rating: store.ratings?.average || 4.5,
    reviewCount: store.ratings?.count || 0,
    distance: store.distance ? `${store.distance.toFixed(1)} km` : '1.0 km',
    cashback: store.offers?.cashback?.percentage
      ? `${store.offers.cashback.percentage}%`
      : store.cashback?.maxPercentage
        ? `${store.cashback.maxPercentage}%`
        : '15%',
    image: store.logo || store.banner || store.images?.[0],
    isVerified: store.isVerified || store.verification?.isVerified || false,
    is60Min: store.operationalInfo?.deliveryTime ? parseInt(store.operationalInfo.deliveryTime) <= 60 : false,
    tags: store.tags || [],
  });

  // Fetch stores from API
  const fetchStores = useCallback(async () => {
    try {
      setError(null);

      const response = await storesApi.getStores({
        tags: config.tags.length > 0 ? config.tags : undefined,
        limit: 50,
      });

      if (response.success && response.data?.stores) {
        const transformedStores = response.data.stores.map(transformStore);
        if (!isMounted()) return;
        setStores(transformedStores);
        if (!isMounted()) return;
        setFilteredStores(transformedStores);
      } else {
        if (!isMounted()) return;
        setStores([]);
        if (!isMounted()) return;
        setFilteredStores([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load stores');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [config.tags]);

  useEffect(() => {
    setIsLoading(true);
    fetchStores();
  }, [fetchStores]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchStores();
  }, [fetchStores]);

  // Apply filters and search
  useEffect(() => {
    let result = [...stores];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        store =>
          store.name.toLowerCase().includes(query) ||
          store.category.toLowerCase().includes(query) ||
          store.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply filter
    if (selectedFilter === 'verified') {
      result = result.filter(store => store.isVerified);
    } else if (selectedFilter === 'nearby') {
      result = result.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } else if (selectedFilter === 'top-rated') {
      result = result.sort((a, b) => b.rating - a.rating);
    } else if (selectedFilter === 'try-buy') {
      result = result.filter(store => store.is60Min);
    }

    setFilteredStores(result);
  }, [stores, searchQuery, selectedFilter]);

  // Handle store press
  const handleStorePress = (store: DisplayStore) => {
    router.push(`/MainStorePage?storeId=${store.id}` as any);
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[config.color, config.color + 'DD']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{config.icon} {config.title}</Text>
            <Text style={styles.headerSubtitle}>{filteredStores.length} stores near you</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && { backgroundColor: config.color }
              ]}
            >
              <Ionicons
                name={filter.icon as any}
                size={14}
                color={selectedFilter === filter.id ? Colors.background.primary : Colors.text.tertiary}
              />
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[config.color]}
          />
        }
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: config.color }]} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!error && filteredStores.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>No Stores Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'We\'re adding more stores soon!'}
            </Text>
          </View>
        )}

        {/* Stores Grid */}
        {filteredStores.length > 0 && (
          <View style={styles.storesGrid}>
            {filteredStores.map((store) => (
              <Pressable
                key={store.id}
                style={styles.storeCard}
                onPress={() => handleStorePress(store)}
               
              >
                <CachedImage source={store.image} style={styles.storeImage} />

                {/* Badges */}
                <View style={styles.badgesContainer}>
                  {store.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={Colors.text.inverse} />
                    </View>
                  )}
                  {store.is60Min && (
                    <View style={styles.fastBadge}>
                      <Ionicons name="flash" size={10} color={Colors.text.inverse} />
                      <Text style={styles.fastBadgeText}>60m</Text>
                    </View>
                  )}
                </View>

                {/* Cashback Badge */}
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{store.cashback}</Text>
                </View>

                <View style={styles.storeInfo}>
                  <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                  <Text style={styles.storeCategory} numberOfLines={1}>{store.category}</Text>
                  <View style={styles.storeMeta}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.distanceText}>{store.distance}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    color: Colors.nileBlue,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
    gap: 6,
  },
  filterChipText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 60,
  },
  errorText: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  retryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  storesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  storeCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeImage: {
    width: '100%',
    height: 120,
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  verifiedBadge: {
    backgroundColor: Colors.gold,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  fastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  fastBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeInfo: {
    padding: Spacing.md,
  },
  storeName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  storeCategory: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  storeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  distanceText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(StoresPage, 'StoresIndex');
