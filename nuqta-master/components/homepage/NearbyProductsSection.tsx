// @ts-nocheck
import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { productApi, HomepageProduct } from '@/services/productApi';
import HomepageProductCard from './cards/HomepageProductCard';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface NearbyProductsSectionProps {
  title?: string;
  limit?: number;
  radius?: number;
}

function NearbyProductsSection({
  title = 'In Your Area',
  limit = 10,
  radius = 10,
}: NearbyProductsSectionProps) {
  const router = useRouter();
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const [userLocation, setUserLocation] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);

  // Get user's location
  const getUserLocation = useCallback(async () => {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (!isMounted()) return;
        setLocationError('Location permission denied');
        setLoading(false);
        return null;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        longitude: location.coords.longitude,
        latitude: location.coords.latitude,
      };

      if (!isMounted()) return;
      setUserLocation(coords);
      return coords;
    } catch (err) {
      if (!isMounted()) return;
      setLocationError('Could not get your location');
      setLoading(false);
      return null;
    }
  }, []);

  // Fetch nearby products
  const fetchNearbyProducts = useCallback(async (coords: { longitude: number; latitude: number }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await productApi.getNearbyProducts({
        longitude: coords.longitude,
        latitude: coords.latitude,
        radius,
        limit,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setProducts(response.data);
      } else {
        setError('Failed to load nearby products');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load nearby products');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [radius, limit]);

  // Initialize: get location then fetch products
  useEffect(() => {
    const init = async () => {
      const coords = await getUserLocation();
      if (coords) {
        await fetchNearbyProducts(coords);
      }
    };

    init();
  }, [getUserLocation, fetchNearbyProducts]);

  const handleViewAll = () => {
    if (userLocation) {
      router.push(`/search?lat=${userLocation.latitude}&lng=${userLocation.longitude}&nearby=true`);
    } else {
      router.push('/search');
    }
  };

  const handleRetry = async () => {
    setLocationError(null);
    setError(null);
    const coords = await getUserLocation();
    if (coords) {
      await fetchNearbyProducts(coords);
    }
  };

  const handleEnableLocation = async () => {
    setLocationError(null);
    const coords = await getUserLocation();
    if (coords) {
      await fetchNearbyProducts(coords);
    }
  };

  const renderProduct = useCallback(({ item }: { item: HomepageProduct }) => (
    <HomepageProductCard product={item} showDistance={true} />
  ), []);

  const keyExtractor = useCallback((item: HomepageProduct) => item._id || item.id, []);

  // Show location permission request UI
  if (locationError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={32} color={colors.neutral[500]} />
          <ThemedText style={styles.permissionText}>
            Enable location to see products near you
          </ThemedText>
          <Pressable style={styles.enableButton} onPress={handleEnableLocation}>
            <ThemedText style={styles.enableButtonText}>Enable Location</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Don't render if no products and not loading
  if (!loading && products.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
          <ThemedText style={styles.loadingText}>Finding products near you...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent as any}
          estimatedItemSize={220}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  viewAllButton: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  listContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.neutral[500],
  },
  errorContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  permissionContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  permissionText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  enableButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(NearbyProductsSection);
