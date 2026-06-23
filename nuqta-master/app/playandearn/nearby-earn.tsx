import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import nearbyEarnApi, { NearbyStore, EarningOpportunity } from '@/services/nearbyEarnApi';
import { MapViewSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const { width, height } = Dimensions.get('window');

// Marker colors for the decorative map
const markerColors = [
  { bg: colors.lightMustard, shadow: 'rgba(255, 205, 87, 0.4)' },
  { bg: colors.infoScale[400], shadow: 'rgba(59, 130, 246, 0.4)' },
  { bg: colors.warningScale[400], shadow: 'rgba(245, 158, 11, 0.4)' },
  { bg: colors.brand.pink, shadow: 'rgba(236, 72, 153, 0.4)' },
  { bg: colors.brand.purpleLight, shadow: 'rgba(139, 92, 246, 0.4)' },
  { bg: colors.error, shadow: 'rgba(239, 68, 68, 0.4)' },
];

// Pre-defined marker positions for the decorative map (percentages)
const markerPositions = [
  { left: 15, top: 18 },
  { left: 72, top: 12 },
  { left: 42, top: 42 },
  { left: 18, top: 65 },
  { left: 75, top: 55 },
  { left: 55, top: 28 },
];

/**
 * Format distance in meters to a human-readable string.
 */
const formatDistance = (meters: number): string => {
  if (meters == null || isNaN(meters)) return 'Nearby';
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km away`;
};

/**
 * Get a color for an earning opportunity chip based on its type.
 */
const getChipColor = (type: EarningOpportunity['type']): { bg: string; text: string } => {
  switch (type) {
    case 'cashback':
      return { bg: colors.tint.greenLight, text: colors.successScale[700] };
    case 'bonus_campaign':
      return { bg: colors.tint.blue, text: colors.brand.blue };
    case 'multiplier':
      return { bg: colors.tint.orange, text: colors.warningScale[700] };
    default:
      return { bg: colors.neutral[100], text: colors.neutral[500] };
  }
};

const NearbyEarnPage = () => {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const PAGE_LIMIT = 20;

  // State
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isMounted = useIsMounted();

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          if (!isMounted()) return;
          setLocationPermission(true);
          const loc = await Location.getCurrentPositionAsync({});
          if (!isMounted()) return;
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else {
          if (!isMounted()) return;
          setLocationPermission(false);
          if (!isMounted()) return;
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted()) return;
        setLocationPermission(false);
        if (!isMounted()) return;
        setLoading(false);
      } finally {
        if (!isMounted()) return;
        setLocationLoading(false);
      }
    })();
  }, []);

  // Fetch stores when location is available
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!location) return;
    fetchStores();
  }, [location, authLoading, isAuthenticated]);

  const fetchStores = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (!location) return;
    try {
      if (isRefresh || pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const res = await nearbyEarnApi.getStores({
        lat: location.lat,
        lng: location.lng,
        radius: 10,
        limit: PAGE_LIMIT,
      });

      if (res.success && res.data) {
        if (!isMounted()) return;
        const newStores = res.data;
        // Client-side pagination since API may not support page param
        const startIdx = (pageNum - 1) * PAGE_LIMIT;
        const paginated = newStores.slice(startIdx, startIdx + PAGE_LIMIT);
        if (pageNum === 1) {
          setStores(paginated);
        } else {
          setStores(prev => [...prev, ...paginated]);
        }
        setPage(pageNum);
        setHasMore(startIdx + PAGE_LIMIT < newStores.length);
      } else {
        if (!isMounted()) return;
        setError(res.error || 'Failed to load nearby stores');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [location]);

  const onRefresh = useCallback(() => {
    fetchStores(true);
  }, [fetchStores]);

  const handleRetryLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        if (!isMounted()) return;
        setLocationPermission(true);
        const loc = await Location.getCurrentPositionAsync({});
        if (!isMounted()) return;
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLocationLoading(false);
    }
  };

  // --- Render: No Location Permission ---
  const renderNoLocation = () => (
    <View style={styles.centeredContainer}>
      <View style={styles.noLocationIconWrap}>
        <Ionicons name="location-outline" size={56} color={colors.brand.amberDeep} />
      </View>
      <Text style={styles.noLocationTitle}>Enable Location to Find Nearby Stores</Text>
      <Text style={styles.noLocationSubtitle}>
        We need your location to show stores with earning opportunities near you
      </Text>
      <Pressable
        style={styles.enableLocationBtn}
        onPress={handleRetryLocation}
       
      >
        <LinearGradient
          colors={[colors.lightMustard, colors.warningScale[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.enableLocationGradient}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.background.primary} />
          ) : (
            <>
              <Ionicons name="navigate" size={18} color={colors.background.primary} />
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  // --- Render: Empty State ---
  const renderEmpty = () => (
    <View style={styles.centeredContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="storefront-outline" size={56} color={colors.neutral[400]} />
      </View>
      <Text style={styles.emptyTitle}>No Stores Nearby</Text>
      <Text style={styles.emptySubtitle}>
        We're expanding! Check back soon for stores in your area.
      </Text>
    </View>
  );

  // --- Render: Error State ---
  const renderError = () => (
    <View style={styles.centeredContainer}>
      <Ionicons name="alert-circle" size={52} color={colors.error} />
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={() => fetchStores()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  // --- Render: Store Card (List View) ---
  const renderStoreCard = (store: NearbyStore, index: number) => {
    const color = markerColors[index % markerColors.length];

    return (
      <Pressable
        key={store._id}
        style={styles.storeCard}
        onPress={() => router.push(`/store/${store._id}` as any)}
       
      >
        {/* Store Logo / Placeholder */}
        <View style={styles.storeCardLeft}>
          {store.logo ? (
            <CachedImage source={store.logo} style={styles.storeLogo} />
          ) : (
            <View style={[styles.storePlaceholder, { backgroundColor: color.bg }]}>
              <Text style={styles.storePlaceholderText}>
                {store.name?.charAt(0)?.toUpperCase() || 'S'}
              </Text>
            </View>
          )}

          {/* Cashback badge overlay */}
          {store.totalCashbackPercent > 0 && (
            <View style={styles.cashbackBadge}>
              <Text style={styles.cashbackBadgeText}>
                {store.totalCashbackPercent}%
              </Text>
            </View>
          )}
        </View>

        {/* Store Info */}
        <View style={styles.storeCardInfo}>
          <Text style={styles.storeCardName} numberOfLines={1}>{store.name}</Text>

          <View style={styles.storeCardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.neutral[500]} />
              <Text style={styles.metaText}>{formatDistance(store.distance)}</Text>
            </View>
            {store.category ? (
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={12} color={colors.neutral[500]} />
                <Text style={styles.metaText}>{store.category}</Text>
              </View>
            ) : null}
          </View>

          {/* Earning Opportunity Chips */}
          {store.earningOpportunities && store.earningOpportunities.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContainer}
            >
              {store.earningOpportunities.map((opp, i) => {
                const chipColor = getChipColor(opp.type);
                return (
                  <View
                    key={`${store._id}-opp-${i}`}
                    style={[styles.chip, { backgroundColor: chipColor.bg }]}
                  >
                    <Text style={[styles.chipText, { color: chipColor.text }]} numberOfLines={1}>
                      {opp.title}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} style={styles.cardArrow} />
      </Pressable>
    );
  };

  // --- Render: Map View (Decorative, since react-native-maps is not installed) ---
  const renderMapView = () => (
    <View style={styles.mapOuterContainer}>
      {/* Decorative Map */}
      <View style={styles.mapContainer}>
        <View style={styles.mapBackground}>
          <LinearGradient
            colors={['#E8F4F8', '#D1E7DD', colors.slateLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Decorative roads */}
          <View style={styles.roadH1} />
          <View style={styles.roadH2} />
          <View style={styles.roadV1} />
          <View style={styles.roadV2} />

          {/* Decorative areas */}
          <View style={styles.parkArea} />
          <View style={styles.waterArea} />

          {/* Building blocks */}
          <View style={styles.block1} />
          <View style={styles.block2} />
          <View style={styles.block3} />

          {/* Store Markers */}
          {stores.slice(0, 6).map((store, index) => {
            const pos = markerPositions[index];
            const color = markerColors[index % markerColors.length];

            return (
              <Pressable
                key={store._id}
                style={[
                  styles.mapMarker,
                  { left: `${pos.left}%` as any, top: `${pos.top}%` as any },
                ]}
                onPress={() => router.push(`/store/${store._id}` as any)}
               
              >
                {/* Pulse */}
                <View style={[styles.markerPulse, { backgroundColor: color.shadow }]} />

                {/* Pin */}
                <View style={[styles.markerPin, { backgroundColor: color.bg }]}>
                  <Text style={styles.markerInitial}>
                    {store.name?.charAt(0)?.toUpperCase() || 'S'}
                  </Text>
                </View>
                <View style={[styles.markerTail, { borderTopColor: color.bg }]} />

                {/* Label with cashback */}
                <View style={styles.markerLabelWrap}>
                  <Text style={styles.markerLabel} numberOfLines={1}>
                    {store.name?.split(' ')[0]}
                  </Text>
                  {store.totalCashbackPercent > 0 && (
                    <Text style={styles.markerCashback}>{store.totalCashbackPercent}%</Text>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Current Location (blue dot) */}
          <View style={styles.currentLocation}>
            <View style={styles.currentLocationOuter} />
            <View style={styles.currentLocationMiddle} />
            <View style={styles.currentLocationInner} />
          </View>

          {/* Floating Info Card */}
          <View style={styles.mapInfoCardContainer}>
            <LinearGradient
              colors={[colors.background.primary, colors.tint.coolGray]}
              style={styles.mapInfoCard}
            >
              <View style={styles.mapInfoLeft}>
                <View style={styles.mapInfoIconWrap}>
                  <Ionicons name="navigate" size={14} color={colors.background.primary} />
                </View>
                <View>
                  <Text style={styles.mapInfoTitle}>Your Location</Text>
                  <Text style={styles.mapInfoSub}>{stores.length} stores nearby</Text>
                </View>
              </View>
              <View style={styles.mapInfoRight}>
                <Text style={styles.mapInfoRadius}>10km</Text>
                <Text style={styles.mapInfoRadiusLabel}>radius</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Compass */}
          <View style={styles.compass}>
            <Text style={styles.compassN}>N</Text>
            <Ionicons
              name="navigate"
              size={14}
              color={colors.error}
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </View>
        </View>
      </View>

      {/* Stores list below map */}
      {stores.length > 0 && (
        <View style={styles.mapStoreListHeader}>
          <Text style={styles.mapStoreListTitle}>
            {stores.length} Store{stores.length !== 1 ? 's' : ''} Found
          </Text>
        </View>
      )}
      <ScrollView
        style={styles.mapStoreList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mapStoreListContent}
      >
        {stores.map((store, index) => {
          const color = markerColors[index % markerColors.length];
          return (
            <Pressable
              key={store._id}
              style={styles.mapStoreItem}
              onPress={() => router.push(`/store/${store._id}` as any)}
             
            >
              <View style={[styles.mapStoreIcon, { backgroundColor: color.bg }]}>
                <Text style={styles.mapStoreIconText}>
                  {store.name?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              </View>
              <View style={styles.mapStoreInfo}>
                <Text style={styles.mapStoreName} numberOfLines={1}>{store.name}</Text>
                <Text style={styles.mapStoreDist}>{formatDistance(store.distance)}</Text>
              </View>
              {store.totalCashbackPercent > 0 && (
                <View style={styles.mapStoreCashback}>
                  <Text style={styles.mapStoreCashbackText}>
                    {store.totalCashbackPercent}%
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  const loadMoreStores = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchStores(false, page + 1);
  }, [loadingMore, hasMore, page, fetchStores]);

  // --- Render: List View ---
  const renderListView = () => {
    if (loading && !refreshing) {
      return <MapViewSkeleton />;
    }
    if (error && !loading) {
      return renderError();
    }
    if (!loading && !error && stores.length === 0) {
      return renderEmpty();
    }

    return (
      <FlatList
        data={stores}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => renderStoreCard(item, index)}
        style={styles.listScrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreStores}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.storeListContainer}>
            <Text style={styles.resultCountText}>
              {stores.length} store{stores.length !== 1 ? 's' : ''} with earning opportunities nearby
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            {loadingMore && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.lightMustard} />
              </View>
            )}
            <View style={{ height: 100 }} />
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.lightMustard]}
            tintColor={colors.lightMustard}
          />
        }
      />
    );
  };

  // --- Main Render ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Earn Near You</Text>
        <View style={styles.headerRight} />
      </View>

      {/* View Mode Toggle */}
      {locationPermission && !locationLoading && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleContainer}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
             
            >
              <Ionicons
                name="list"
                size={16}
                color={viewMode === 'list' ? colors.background.primary : colors.neutral[500]}
              />
              <Text
                style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}
              >
                List
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
             
            >
              <Ionicons
                name="map"
                size={16}
                color={viewMode === 'map' ? colors.background.primary : colors.neutral[500]}
              />
              <Text
                style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}
              >
                Map
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content */}
      {locationLoading ? (
        <MapViewSkeleton />
      ) : !locationPermission ? (
        renderNoLocation()
      ) : viewMode === 'list' ? (
        renderListView()
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.lightMustard]}
              tintColor={colors.lightMustard}
            />
          }
        >
          {loading && !refreshing ? (
            <MapViewSkeleton />
          ) : error && !loading ? (
            renderError()
          ) : !loading && stores.length === 0 ? (
            renderEmpty()
          ) : (
            renderMapView()
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ---- Layout ----
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerRight: {
    width: 40,
  },

  // ---- Toggle ----
  toggleRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.nileBlue,
  },
  toggleText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  toggleTextActive: {
    color: Colors.text.inverse,
  },

  // ---- Centered / State containers ----
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  loadingText: {
    marginTop: 14,
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // ---- No Location ----
  noLocationIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  noLocationTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  noLocationSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  enableLocationBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  enableLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  enableLocationText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // ---- Empty State ----
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // ---- Error State ----
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },

  // ---- List View ----
  listScrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    minHeight: 300,
    paddingBottom: 120,
  },
  storeListContainer: {
    gap: 0,
  },
  resultCountText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 14,
    fontWeight: '500',
  },

  // ---- Store Card ----
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    ...Shadows.subtle,
  },
  storeCardLeft: {
    position: 'relative',
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
  },
  storePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storePlaceholderText: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  cashbackBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.successScale[700],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  cashbackBadgeText: {
    ...Typography.overline,
    fontWeight: '800',
    color: Colors.text.inverse,
    textTransform: 'none',
    letterSpacing: 0,
  },
  storeCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  storeCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 3,
  },
  storeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  chipsScroll: {
    maxHeight: 28,
  },
  chipsContainer: {
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardArrow: {
    marginLeft: Spacing.xs,
  },

  // ---- Map View (Decorative) ----
  mapOuterContainer: {
    flex: 1,
  },
  mapContainer: {
    height: height * 0.38,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.strong,
  },
  mapBackground: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E8F4F8',
  },

  // Decorative roads
  roadH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: Spacing.sm,
    backgroundColor: Colors.background.primary,
    opacity: 0.8,
  },
  roadH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '70%',
    height: 6,
    backgroundColor: Colors.background.primary,
    opacity: 0.6,
  },
  roadV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: 6,
    backgroundColor: Colors.background.primary,
    opacity: 0.7,
  },
  roadV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '65%',
    width: Spacing.sm,
    backgroundColor: Colors.background.primary,
    opacity: 0.8,
  },

  // Decorative areas
  parkArea: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#86EFAC',
    opacity: 0.5,
  },
  waterArea: {
    position: 'absolute',
    top: '50%',
    right: '5%',
    width: 30,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#7DD3FC',
    opacity: 0.4,
  },

  // Building blocks
  block1: {
    position: 'absolute',
    top: '15%',
    left: '42%',
    width: 25,
    height: 20,
    backgroundColor: '#CBD5E1',
    borderRadius: Spacing.xs,
    opacity: 0.6,
  },
  block2: {
    position: 'absolute',
    top: '48%',
    left: '12%',
    width: 30,
    height: 25,
    backgroundColor: '#CBD5E1',
    borderRadius: Spacing.xs,
    opacity: 0.5,
  },
  block3: {
    position: 'absolute',
    bottom: '30%',
    left: '52%',
    width: 22,
    height: 28,
    backgroundColor: '#CBD5E1',
    borderRadius: Spacing.xs,
    opacity: 0.6,
  },

  // Map Markers
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerPulse: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background.primary,
    ...Shadows.medium,
  },
  markerInitial: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  markerLabelWrap: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: Spacing.xs,
    ...Shadows.subtle,
    alignItems: 'center',
  },
  markerLabel: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.primary,
    maxWidth: 60,
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0,
  },
  markerCashback: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.successScale[700],
  },

  // Current Location (blue dot)
  currentLocation: {
    position: 'absolute',
    left: '48%',
    top: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  currentLocationOuter: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  currentLocationMiddle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  currentLocationInner: {
    width: Spacing.base,
    height: Spacing.base,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.infoScale[400],
    borderWidth: 3,
    borderColor: Colors.background.primary,
    shadowColor: colors.infoScale[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },

  // Map Info Card
  mapInfoCardContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  mapInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: Spacing.md,
    ...Shadows.medium,
  },
  mapInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapInfoIconWrap: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapInfoTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  mapInfoSub: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  mapInfoRight: {
    alignItems: 'center',
  },
  mapInfoRadius: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.gold,
  },
  mapInfoRadiusLabel: {
    ...Typography.overline,
    color: Colors.text.tertiary,
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0,
  },

  // Compass
  compass: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  compassN: {
    position: 'absolute',
    top: 3,
    fontSize: 8,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },

  // Map Store List (below the map)
  mapStoreListHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  mapStoreListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  mapStoreList: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  mapStoreListContent: {
    gap: Spacing.sm,
  },
  mapStoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    ...Shadows.subtle,
  },
  mapStoreIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapStoreIconText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  mapStoreInfo: {
    flex: 1,
    marginLeft: 10,
  },
  mapStoreName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  mapStoreDist: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  mapStoreCashback: {
    backgroundColor: colors.tint.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapStoreCashbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.successScale[700],
  },
});

export default withErrorBoundary(NearbyEarnPage, 'PlayandearnNearbyEarn');
