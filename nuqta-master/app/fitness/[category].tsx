// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Fitness Category Page - Dynamic route
 * Connected to real API with functional filters, search, and location
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  Keyboard,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';


// Category configuration for UI
const categoryConfig: Record<string, { title: string; icon: string; gradientColors: [string, string] }> = {
  gyms: { title: 'Gyms', icon: '🏋️', gradientColors: [colors.brand.orange, colors.brand.orangeDark] },
  studios: { title: 'Fitness Studios', icon: '🧘', gradientColors: [colors.brand.purpleLight, colors.brand.purple] },
  trainers: { title: 'Personal Trainers', icon: '💪', gradientColors: [colors.successScale[400], colors.successScale[700]] },
  store: { title: 'Sports Store', icon: '🛒', gradientColors: [colors.infoScale[400], colors.brand.blue] },
  challenges: { title: 'Fitness Challenges', icon: '🏆', gradientColors: [colors.brand.amber, '#CA8A04'] },
  nutrition: { title: 'Nutrition Plans', icon: '🥗', gradientColors: [colors.success, colors.brand.greenDark] },
};

interface StoreItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  ratings: { average: number; count: number };
  location: {
    address: string;
    city: string;
    coordinates: number[];
  };
  offers: { cashback: number };
  logo: string;
  banner: string[];
  tags: string[];
  serviceTypes?: string[];
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

type FilterType = 'all' | 'nearby' | 'top-rated' | 'best-cashback';

const FitnessCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StoreItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Search state
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StoreItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const config = categoryConfig[category || 'gyms'] || categoryConfig['gyms'];
  const filters: { id: FilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'nearby', label: 'Nearby', icon: 'location' },
    { id: 'top-rated', label: 'Top Rated', icon: 'star' },
    { id: 'best-cashback', label: 'Best Cashback', icon: 'gift' },
  ];

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user location
  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isMounted()) return;
        setLocationError('Location permission denied');
        if (!isMounted()) return;
        setLocationLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      if (!isMounted()) return;
      setUserLocation(coords);
      if (!isMounted()) return;
      setLocationLoading(false);
      return coords;
    } catch (error) {
      if (!isMounted()) return;
      setLocationError('Failed to get location');
      if (!isMounted()) return;
      setLocationLoading(false);
      return null;
    }
  };

  const fetchStores = useCallback(async () => {
    try {
      const response = await apiClient.get(`/stores/by-category-slug/${category}`, {
        params: {
          page: 1,
          limit: 50,
          sortBy: 'rating',
        },
      });

      let storesData = (response.data as any)?.stores || [];
      const total = (response.data as any)?.total || storesData.length;

      // Add distance calculation if user location is available
      if (userLocation) {
        storesData = storesData.map((store: StoreItem) => {
          if (store.location?.coordinates) {
            const [lng, lat] = store.location.coordinates;
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            );
            return { ...store, distance };
          }
          return store;
        });
      }

      if (!isMounted()) return;
      setItems(storesData);
      if (!isMounted()) return;
      setTotalCount(total);
      applyFilter(storesData, selectedFilter);
    } catch (error) {
      if (!isMounted()) return;
      setItems([]);
      if (!isMounted()) return;
      setFilteredItems([]);
      if (!isMounted()) return;
      setTotalCount(0);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [category, userLocation]);

  const applyFilter = (storesData: StoreItem[], filter: FilterType) => {
    let sorted = [...storesData];

    switch (filter) {
      case 'nearby':
        if (userLocation) {
          sorted = sorted
            .filter(s => s.distance !== undefined)
            .sort((a, b) => (a.distance || 999) - (b.distance || 999));
        }
        break;
      case 'top-rated':
        sorted = sorted.sort((a, b) =>
          (b.ratings?.average || 0) - (a.ratings?.average || 0)
        );
        break;
      case 'best-cashback':
        sorted = sorted.sort((a, b) =>
          (b.offers?.cashback || 0) - (a.offers?.cashback || 0)
        );
        break;
      default:
        // Keep default order (by rating from API)
        break;
    }

    setFilteredItems(sorted);
  };

  useEffect(() => {
    setLoading(true);
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    if (items.length > 0) {
      applyFilter(items, selectedFilter);
    }
  }, [selectedFilter, items]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  const handleFilterChange = async (filterId: FilterType) => {
    // If selecting nearby and no location yet, get it first
    if (filterId === 'nearby' && !userLocation) {
      const location = await getUserLocation();
      if (location) {
        // Re-fetch with location to calculate distances
        setLoading(true);
        fetchStores();
      }
    }
    if (!isMounted()) return;
    setSelectedFilter(filterId);
  };

  const handleItemPress = (item: StoreItem) => {
    router.push(`/MainStorePage?storeId=${item._id}` as any);
  };

  const handleBookPress = (item: StoreItem) => {
    router.push({
      pathname: '/fitness/book/[storeId]',
      params: {
        storeId: item._id,
        storeName: item.name,
        cashback: item.offers?.cashback?.toString() || '15',
      },
    } as any);
  };

  // Search functions
  const handleSearchOpen = () => {
    setSearchModalVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSearchClose = () => {
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.get('/stores/search', {
        params: { q: query, limit: 20 },
      });

      // Filter results to only show fitness-related stores
      const results = ((response.data as any)?.stores || []).filter((store: StoreItem) =>
        store.tags?.some(tag =>
          ['gym', 'fitness', 'yoga', 'studio', 'trainer', 'sports', 'pilates', 'crossfit'].includes(tag.toLowerCase())
        )
      );

      if (!isMounted()) return;
      setSearchResults(results);
    } catch (error) {
      if (!isMounted()) return;
      setSearchResults([]);
    } finally {
      if (!isMounted()) return;
      setIsSearching(false);
    }
  };

  const handleSearchResultPress = (item: StoreItem) => {
    handleSearchClose();
    router.push(`/MainStorePage?storeId=${item._id}` as any);
  };

  const getItemTypeLabel = (item: StoreItem): string => {
    if (item.serviceTypes && item.serviceTypes.length > 0) {
      return item.serviceTypes[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    if (item.tags && item.tags.length > 0) {
      return item.tags[0].charAt(0).toUpperCase() + item.tags[0].slice(1);
    }
    return category === 'gyms' ? 'Gym' :
           category === 'studios' ? 'Studio' :
           category === 'trainers' ? 'Trainer' :
           category === 'store' ? 'Store' : 'Fitness';
  };

  const formatDistance = (distance?: number): string => {
    if (!distance) return '';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)} km`;
  };

  const getPriceLabel = (item: StoreItem): string => {
    if (category === 'gyms') return `${currencySymbol}2,000+/mo`;
    if (category === 'studios') return `${currencySymbol}500+/class`;
    if (category === 'trainers') return `${currencySymbol}1,000+/session`;
    if (category === 'store') return `${currencySymbol}499+`;
    return 'View Details';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{config.icon} {config.title}</Text>
            <Text style={styles.headerSubtitle}>{totalCount} options available</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={handleSearchOpen}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => handleFilterChange(filter.id)}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
              ]}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={selectedFilter === filter.id ? Colors.background.primary : Colors.text.tertiary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {filter.id === 'nearby' && locationLoading && (
                <ActivityIndicator size="small" color={Colors.text.inverse} style={{ marginLeft: Spacing.xs }} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Location status */}
      {selectedFilter === 'nearby' && !userLocation && !locationLoading && (
        <Pressable style={styles.locationBanner} onPress={getUserLocation}>
          <Ionicons name="location-outline" size={20} color={Colors.warning} />
          <Text style={styles.locationBannerText}>
            {locationError || 'Tap to enable location for nearby results'}
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={config.gradientColors[0]}
          />
        }
      >
        <View style={styles.itemsList}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Pressable
                key={item._id}
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
               
              >
                <CachedImage
                  source={item.banner?.[0] || item.logo || undefined}
                  style={styles.itemImage}
                />
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{item.offers?.cashback || 15}%</Text>
                </View>
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{getItemTypeLabel(item)}</Text>
                    </View>
                  </View>
                  <View style={styles.itemMeta}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={Colors.warning} />
                      <Text style={styles.ratingText}>
                        {item.ratings?.average?.toFixed(1) || '4.5'}
                      </Text>
                      <Text style={styles.reviewCount}>
                        ({item.ratings?.count || 0})
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.distance ? formatDistance(item.distance) : item.location?.city || 'Bangalore'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.priceText}>{getPriceLabel(item)}</Text>
                    <Pressable
                      style={[styles.bookButton, { backgroundColor: config.gradientColors[0] }]}
                      onPress={() => category === 'store' ? handleItemPress(item) : handleBookPress(item)}
                    >
                      <Text style={styles.bookButtonText}>
                        {category === 'store' ? 'Shop' : category === 'trainers' ? 'Book' : 'Join'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color={Colors.border.default} />
              <Text style={styles.emptyTitle}>No {config.title.toLowerCase()} found</Text>
              <Text style={styles.emptyDescription}>
                Try a different filter or check back later
              </Text>
              <Pressable
                style={[styles.refreshButton, { backgroundColor: config.gradientColors[0] }]}
                onPress={handleRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleSearchClose}
      >
        <View style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <Pressable onPress={handleSearchClose} style={styles.searchCloseButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
            </Pressable>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.text.tertiary} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                placeholderTextColor={Colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
                </Pressable>
              )}
            </View>
          </View>

          {isSearching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="large" color={config.gradientColors[0]} />
            </View>
          ) : searchResults.length > 0 ? (
            <ScrollView style={styles.searchResults}>
              {searchResults.map((item) => (
                <Pressable
                  key={item._id}
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultPress(item)}
                >
                  <CachedImage
                    source={item.logo || item.banner?.[0]}
                    style={styles.searchResultImage}
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <View style={styles.searchResultMeta}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={styles.searchResultRating}>
                        {item.ratings?.average?.toFixed(1) || '4.5'}
                      </Text>
                      <Text style={styles.searchResultCashback}>
                        {item.offers?.cashback || 15}% Cashback
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
                </Pressable>
              ))}
            </ScrollView>
          ) : searchQuery.length >= 2 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={48} color={Colors.border.default} />
              <Text style={styles.searchEmptyText}>No results found</Text>
            </View>
          ) : (
            <View style={styles.searchHint}>
              <Text style={styles.searchHintText}>
                Start typing to search for {config.title.toLowerCase()}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  searchButton: { padding: Spacing.sm },
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
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  filterChipActive: { backgroundColor: Colors.warning },
  filterChipText: { ...Typography.body, color: Colors.text.tertiary },
  filterChipTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: colors.tint.orange,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  locationBannerText: { ...Typography.bodySmall, color: Colors.warning },
  itemsList: { padding: Spacing.base, gap: Spacing.base },
  itemCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.base,
  },
  itemImage: { width: '100%', height: 160 },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },
  itemInfo: { padding: Spacing.base },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemName: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue, flex: 1, marginRight: Spacing.sm },
  typeBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeText: { ...Typography.caption, fontWeight: '600', color: Colors.text.tertiary },
  itemMeta: { flexDirection: 'row', gap: Spacing.base, marginBottom: Spacing.md },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  reviewCount: { ...Typography.bodySmall, color: Colors.text.tertiary },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  metaText: { ...Typography.bodySmall, color: Colors.text.tertiary },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  bookButton: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  bookButtonText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue, marginTop: Spacing.base },
  emptyDescription: { ...Typography.body, color: Colors.text.tertiary, marginTop: Spacing.sm, textAlign: 'center' },
  refreshButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  refreshButtonText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },

  // Search Modal Styles
  searchModal: { flex: 1, backgroundColor: Colors.background.primary },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  searchCloseButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, ...Typography.bodyLarge, color: Colors.nileBlue },
  searchLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchResults: { flex: 1 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  searchResultImage: { width: 56, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.background.secondary },
  searchResultInfo: { flex: 1, marginLeft: Spacing.md },
  searchResultName: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.nileBlue },
  searchResultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  searchResultRating: { ...Typography.bodySmall, color: Colors.text.tertiary },
  searchResultCashback: { ...Typography.bodySmall, color: Colors.success, fontWeight: '600' },
  searchEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchEmptyText: { ...Typography.bodyLarge, color: Colors.text.tertiary, marginTop: Spacing.md },
  searchHint: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchHintText: { ...Typography.body, color: Colors.text.tertiary },
});

export default withErrorBoundary(FitnessCategoryPage, 'FitnessCategory');
