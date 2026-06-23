/**
 * PersonalizedSections — Recently Viewed + Favorite Stores + Nearby Stores
 * Shows personalized restaurant data from local storage + location API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from './constants';
import asyncStorageService from '@/services/asyncStorageService';
import { storesApi } from '@/services/storesApi';
import { useLocation } from '@/contexts/LocationContext';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface StoreItem {
  _id?: string;
  id?: string;
  name: string;
  logo?: string;
  image?: string;
  banner?: string | string[];
  ratings?: { average?: number; count?: number };
  rating?: { value?: number; count?: number };
  operationalInfo?: { deliveryTime?: string };
  deliveryTime?: string;
  offers?: { cashback?: number };
  cashbackPercentage?: number;
  distance?: string | number;
  address?: string;
  tags?: string[];
  visitCount?: number;
  isFavorited?: boolean;
}

function getStoreId(s: StoreItem): string {
  return s._id || s.id || '';
}

function getStoreImage(s: StoreItem): string | undefined {
  if (s.logo) return s.logo;
  if (s.image) return s.image;
  if (typeof s.banner === 'string') return s.banner;
  if (Array.isArray(s.banner) && s.banner.length > 0) return s.banner[0];
  return undefined;
}

function getRating(s: StoreItem): number {
  return s.ratings?.average || s.rating?.value || 0;
}

function getDeliveryTime(s: StoreItem): string {
  return s.operationalInfo?.deliveryTime || s.deliveryTime || '';
}

function getCashback(s: StoreItem): number {
  return s.offers?.cashback || s.cashbackPercentage || 0;
}

const StoreChip: React.FC<{ store: StoreItem; onPress: () => void }> = ({ store, onPress }) => {
  const img = getStoreImage(store);
  const rating = getRating(store);
  const delivery = getDeliveryTime(store);
  const cashback = getCashback(store);

  return (
    <Pressable
      style={styles.storeChip}
      onPress={onPress}
     
      accessibilityLabel={`${store.name}${rating > 0 ? `, rated ${rating.toFixed(1)}` : ''}${delivery ? `, ${delivery} delivery` : ''}`}
      accessibilityRole="button"
    >
      {img ? (
        <CachedImage source={img} style={styles.storeImage} contentFit="cover" />
      ) : (
        <View style={[styles.storeImage, styles.storeImageFallback]}>
          <Ionicons name="restaurant-outline" size={20} color={COLORS.textSecondary} />
        </View>
      )}
      <View style={styles.storeInfo}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <View style={styles.metaRow}>
          {rating > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={10} color={COLORS.primaryGold} />
              <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {delivery ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={10} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{delivery}</Text>
            </View>
          ) : null}
          {cashback > 0 && (
            <View style={styles.metaItem}>
              <Text style={styles.cashbackText}>{cashback}% back</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const PersonalizedSections: React.FC = () => {
  const router = useRouter();
  const { state: locationState } = useLocation();
  const latitude = locationState.currentLocation?.coordinates?.latitude;
  const longitude = locationState.currentLocation?.coordinates?.longitude;
  const [recentlyViewed, setRecentlyViewed] = useState<StoreItem[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<StoreItem[]>([]);
  const [nearbyStores, setNearbyStores] = useState<StoreItem[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const isMounted = useIsMounted();

  const fetchLocalData = useCallback(async () => {
    try {
      const [recent, favorites] = await Promise.all([
        asyncStorageService.getRecentlyViewedUnified().catch(() => []),
        asyncStorageService.getFavoriteStores().catch(() => []),
      ]);

      // Filter recently viewed to only store types
      const recentStores = recent
        .filter((item: any) => item.type === 'store' || item.storeId || item._id)
        .slice(0, 8);
      if (!isMounted()) return;
      setRecentlyViewed(recentStores);

      // Favorites already sorted by asyncStorageService
      setFavoriteStores(favorites.filter((f: any) => f.isFavorited).slice(0, 8));
    } catch {
      // Silent fail
    }
  }, []);

  const fetchNearby = useCallback(async () => {
    if (!latitude || !longitude) return;
    try {
      setIsLoadingNearby(true);
      const response = await storesApi.getNearbyStores(latitude, longitude, 5, 8);
      if (response.success && response.data) {
        const stores = Array.isArray(response.data) ? response.data : (response.data as any)?.stores || [];
        if (!isMounted()) return;
        setNearbyStores(stores);
      }
    } catch {
      // Silent fail
    } finally {
      if (!isMounted()) return;
      setIsLoadingNearby(false);
    }
  }, [latitude, longitude]);

  useEffect(() => { fetchLocalData(); }, [fetchLocalData]);
  useEffect(() => { fetchNearby(); }, [fetchNearby]);

  const navigateToStore = useCallback((storeId: string) => {
    if (storeId) router.push(`/MainStorePage?storeId=${storeId}` as any);
  }, [router]);

  const hasRecentlyViewed = recentlyViewed.length > 0;
  const hasFavorites = favoriteStores.length > 0;
  const hasNearby = nearbyStores.length > 0;

  // Don't render if nothing to show
  if (!hasRecentlyViewed && !hasFavorites && !hasNearby && !isLoadingNearby) return null;

  return (
    <View>
      {/* Recently Viewed */}
      {hasRecentlyViewed && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={COLORS.primaryGold} />
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {recentlyViewed.map((store) => (
              <StoreChip
                key={getStoreId(store)}
                store={store}
                onPress={() => navigateToStore(getStoreId(store))}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Favorite Stores */}
      {hasFavorites && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={18} color={colors.error} />
            <Text style={styles.sectionTitle}>Your Favorites</Text>
            <Pressable
              onPress={() => router.push('/wishlist' as any)}
              accessibilityLabel="See all favorites" accessibilityRole="button"
            >
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {favoriteStores.map((store) => (
              <StoreChip
                key={getStoreId(store)}
                store={store}
                onPress={() => navigateToStore(getStoreId(store))}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Nearby Stores */}
      {isLoadingNearby ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.primaryGold} />
          <Text style={styles.loadingText}>Finding restaurants near you...</Text>
        </View>
      ) : hasNearby ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>Nearby Restaurants</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {nearbyStores.map((store) => (
              <StoreChip
                key={getStoreId(store)}
                store={store}
                onPress={() => navigateToStore(getStoreId(store))}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryGold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  storeChip: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 6px rgba(11,34,64,0.06)' },
    }),
  },
  storeImage: {
    width: '100%',
    height: 80,
  },
  storeImageFallback: {
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    padding: 8,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default React.memo(PersonalizedSections);
