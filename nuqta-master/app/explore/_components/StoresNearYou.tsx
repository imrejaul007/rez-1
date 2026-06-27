// @ts-nocheck
import { colors } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import exploreApi from '../../../services/exploreApi';
import apiClient from '@/services/apiClient';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
const { width } = Dimensions.get('window');

const StoresNearYou = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { currentLocation, isLoading: isLocationLoading } = useCurrentLocation();
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyStores = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let response;

        // Use actual location if available
        if (currentLocation?.coordinates?.latitude && currentLocation?.coordinates?.longitude) {
          response = await exploreApi.getNearbyStores({
            latitude: currentLocation.coordinates.latitude,
            longitude: currentLocation.coordinates.longitude,
            radius: 5,
            limit: 8,
          });
        } else {
          // Fallback to trending stores if no location
          response = await exploreApi.getTrendingStores({ limit: 8 });
        }

        if (response.success && response.data) {
          // Handle both direct array and stores property
          const storesData = Array.isArray(response.data) ? response.data : response.data.stores || [];

          if (storesData.length > 0) {
            const transformed = storesData.map((item: any) => ({
              id: item.id || item._id,
              name: item.name || 'Store',
              image: item.image || item.logo || null,
              tags: item.tags || [],
              tagColors: item.tagColors || [],
              rating: item.rating || item.ratings?.average || null,
              distance: item.distance
                ? (typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : String(item.distance))
                : null,
              deliveryTime: item.deliveryTime || item.operationalInfo?.deliveryTime || null,
              cashback: item.cashback || (item.offers?.cashback ? `${item.offers.cashback}%` : null),
              hasQuickDelivery: item.deliveryTime && parseInt(item.deliveryTime) <= 60,
              isFavorite: false,
            }));
            if (!isMounted()) return;
            setStores(transformed);
          }
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load nearby stores');
      } finally {
        if (!isMounted()) return;
        setIsLoading(false);
      }
    };

    // Only fetch when location loading is complete
    if (!isLocationLoading) {
      fetchNearbyStores();
    }
  }, [currentLocation, isLocationLoading]);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Retry function
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Re-trigger the effect by forcing a re-render
    setStores([]);
  };

  // Toggle store favorite
  const handleToggleFavorite = async (storeId: string) => {
    // Optimistic update
    setStores(prev => prev.map(s =>
      s.id === storeId ? { ...s, isFavorite: !s.isFavorite } : s
    ));

    try {
      await apiClient.post(`/favorites/store/${storeId}/toggle`);
    } catch (err) {
      // Revert on error
      if (!isMounted()) return;
      setStores(prev => prev.map(s =>
        s.id === storeId ? { ...s, isFavorite: !s.isFavorite } : s
      ));
    }
  };

  // Loading state
  if (isLoading || isLocationLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stores Near You</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={16} color={Colors.background.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state - don't render section if no data
  if (stores.length === 0) {
    return null;
  }

  return (
    <FeatureErrorBoundary featureName="Stores Near You" compact={true}>
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stores Near You</Text>
        <Text style={styles.storeCount}>{stores.length} stores</Text>
      </View>

      {/* Store List */}
      <View style={styles.storeList}>
        {stores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeCard}
            onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
          >
            {/* Store Image */}
            <CachedImage source={store.image} style={styles.storeImage} />

            {/* Store Info */}
            <View style={styles.storeInfo}>
              <View style={styles.storeNameRow}>
                <Text style={styles.storeName}>{store.name}</Text>
              </View>

              {/* Tags Row */}
              <View style={styles.tagsRow}>
                {store.tags.map((tag, index) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: store.tagColors[index] + '20' }]}
                  >
                    <Text style={[styles.tagText, { color: store.tagColors[index] }]}>{tag}</Text>
                  </View>
                ))}
                {store.hasQuickDelivery && (
                  <View style={styles.quickDeliveryTag}>
                    <Ionicons name="flash" size={10} color={colors.brand.orange} />
                    <Text style={styles.quickDeliveryText}>60min</Text>
                  </View>
                )}
              </View>

              {/* Details Row */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="star" size={14} color={Colors.warning} />
                  <Text style={styles.detailText}>{store.rating}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.detailText}>{store.distance}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.detailText}>{store.deliveryTime}</Text>
                </View>
              </View>

              {/* Cashback */}
              <Text style={styles.cashbackText}>{store.cashback} cashback</Text>
            </View>

            {/* Favorite Button */}
            <Pressable
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleFavorite(store.id);
              }}
            >
              <Ionicons
                name={store.isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={store.isFavorite ? Colors.error : Colors.text.tertiary}
              />
            </Pressable>
          </Pressable>
        ))}
      </View>

      {/* View All Button */}
      <Pressable
        style={styles.viewAllButton}
        onPress={() => navigateTo('/explore/stores')}
      >
        <Text style={styles.viewAllText}>View All Stores</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
      </Pressable>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.errorScale[50],
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginTop: Spacing.xs,
  },
  retryText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  storeCount: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  storeList: {
    paddingHorizontal: Spacing.base,
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeImage: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeName: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },
  quickDeliveryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  quickDeliveryText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '600',
    color: colors.brand.orange,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  cashbackText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  favoriteButton: {
    padding: Spacing.sm,
    justifyContent: 'flex-start',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xs,
    gap: 6,
  },
  viewAllText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
});

export default React.memo(StoresNearYou);
