// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useLocationFeatures, useCurrentLocation } from '@/hooks/useLocation';
import { locationService } from '@/services/locationService';
import { LocationCoordinates } from '@/types/location.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface NearbyStore {
  id: string;
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  distance: number;
  rating: number;
  isOpen: boolean;
  categories: string[];
  image?: string;
  phone?: string;
  hours?: string;
}

interface NearbyStoresProps {
  radius?: number;
  limit?: number;
  showDistance?: boolean;
  showRating?: boolean;
  showStatus?: boolean;
  onStorePress?: (store: NearbyStore) => void;
  onRefresh?: () => void;
  style?: any;
  itemStyle?: any;
}

function NearbyStores({
  radius = 5,
  limit = 20,
  showDistance = true,
  showRating = true,
  showStatus = true,
  onStorePress,
  onRefresh,
  style,
  itemStyle,
}: NearbyStoresProps) {
  const { currentLocation, isLoading: locationLoading } = useCurrentLocation();
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const loadNearbyStores = async (isRefresh = false) => {
    if (!currentLocation) {
      setError('Location not available');
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const nearbyStores = await locationService.getNearbyStores(
        currentLocation.coordinates,
        radius,
        limit
      );
      
      // Transform the data to match our interface
      const transformedStores: NearbyStore[] = nearbyStores.map((store: any) => ({
        id: store._id || store.id,
        name: store.name,
        address: store.location?.address || store.address || 'Address not available',
        coordinates: {
          latitude: store.location?.coordinates?.[1] || store.coordinates?.latitude || 0,
          longitude: store.location?.coordinates?.[0] || store.coordinates?.longitude || 0,
        },
        distance: store.distance || 0,
        rating: store.rating || 0,
        isOpen: store.isOpen !== undefined ? store.isOpen : true,
        categories: store.categories || [],
        image: store.image,
        phone: store.phone,
        hours: store.hours,
      }));

      if (!isMounted()) return;
      setStores(transformedStores);
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load nearby stores');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentLocation) {
      loadNearbyStores();
    }
  }, [currentLocation, radius, limit]);

  const handleRefresh = async () => {
    await loadNearbyStores(true);
    onRefresh?.();
  };

  const handleStorePress = (store: NearbyStore) => {
    onStorePress?.(store);
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getStatusColor = (isOpen: boolean) => {
    return isOpen ? '#34C759' : '#FF3B30';
  };

  const getStatusText = (isOpen: boolean) => {
    return isOpen ? 'Open' : 'Closed';
  };

  const renderStoreItem = ({ item }: { item: NearbyStore }) => (
    <Pressable
      style={[styles.storeItem, itemStyle]}
      onPress={() => handleStorePress(item)}
     
    >
      <View style={styles.storeContent}>
        {/* Store Image */}
        <View style={styles.storeImageContainer}>
          {item.image ? (
            <Text style={styles.storeImagePlaceholder}>🏪</Text>
          ) : (
            <Text style={styles.storeImagePlaceholder}>🏪</Text>
          )}
        </View>

        {/* Store Info */}
        <View style={styles.storeInfo}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName} numberOfLines={1}>
              {item.name}
            </Text>
            {showStatus && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.isOpen) }]}>
                <Text style={styles.statusText}>{getStatusText(item.isOpen)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.storeAddress} numberOfLines={2}>
            {item.address}
          </Text>

          <View style={styles.storeDetails}>
            {showDistance && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={14} color={colors.midGray} />
                <Text style={styles.detailText}>{formatDistance(item.distance)}</Text>
              </View>
            )}

            {showRating && item.rating > 0 && (
              <View style={styles.detailItem}>
                <Ionicons name="star" size={14} color={colors.brand.goldBright} />
                <Text style={styles.detailText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}

            {item.categories.length > 0 && (
              <View style={styles.detailItem}>
                <Ionicons name="pricetag-outline" size={14} color={colors.midGray} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.categories[0]}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </View>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={48} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No stores found</Text>
      <Text style={styles.emptySubtitle}>
        Try increasing the search radius or check your location
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
      <Text style={styles.errorTitle}>Unable to load stores</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={() => loadNearbyStores()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  if (locationLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={colors.brand.ios} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="location-outline" size={48} color="#C7C7CC" />
        <Text style={styles.noLocationTitle}>Location required</Text>
        <Text style={styles.noLocationSubtitle}>
          Please enable location access to find nearby stores
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Stores</Text>
        <Text style={styles.subtitle}>
          Within {radius}km of your location
        </Text>
      </View>

      {/* Stores List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.ios} />
          <Text style={styles.loadingText}>Finding stores...</Text>
        </View>
      ) : error ? (
        renderErrorState()
      ) : (
        <FlashList
          data={stores}
          renderItem={renderStoreItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.ios}
              colors={[colors.brand.ios]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={stores.length === 0 ? styles.emptyContainer : undefined}
          estimatedItemSize={100}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.midGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.midGray,
    marginTop: 12,
  },
  storeItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  storeImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.tint.warmGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeImagePlaceholder: {
    fontSize: 24,
  },
  storeInfo: {
    flex: 1,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  storeAddress: {
    fontSize: 14,
    color: colors.midGray,
    marginBottom: 8,
    lineHeight: 18,
  },
  storeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.midGray,
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.brand.ios,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Compact version for small spaces
export function CompactNearbyStores(props: NearbyStoresProps) {
  return (
    <NearbyStores
      {...props}
      limit={5}
      showRating={false}
      showStatus={false}
    />
  );
}

// Full version with all features
export function FullNearbyStores(props: NearbyStoresProps) {
  return (
    <NearbyStores
      {...props}
      showDistance={true}
      showRating={true}
      showStatus={true}
    />
  );
}

export default React.memo(NearbyStores);
