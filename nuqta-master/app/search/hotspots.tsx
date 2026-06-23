// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Nearby Hotspots Page
// Location-based popular areas - connected to real API

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useCurrentLocation } from '@/hooks/useLocation';
import { apiClient } from '@/utils/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Nuqta Design System
const NUQTA = {
  nileBlue: Colors.nileBlue,
  nileBlueLight: '#243f55',
  lightMustard: Colors.gold,
  mustardDark: '#e5b84d',
  linen: colors.linen,
  lavenderMist: colors.lavenderMist,
};

interface HotspotFromAPI {
  _id: string;
  name: string;
  slug: string;
  coordinates: { lat: number; lng: number };
  radius: number;
  city: string;
  state?: string;
  country?: string;
  image?: string;
  isActive: boolean;
  priority: number;
  totalDeals: number;
  distance?: number;
}

type ViewMode = 'list' | 'map';

function HotspotsPage() {
  const router = useRouter();
  const { currentLocation } = useCurrentLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [hotspots, setHotspots] = useState<HotspotFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Fetch hotspots from API
  useEffect(() => {
    const fetchHotspots = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = { limit: 20 };
        if (currentLocation?.coordinates) {
          params.lat = currentLocation.coordinates.latitude;
          params.lng = currentLocation.coordinates.longitude;
        }
        const response = await apiClient.get('/offers/hotspots', params);
        if (response.success && response.data) {
          const data = Array.isArray(response.data) ? response.data : [];
          setHotspots(data);
        } else {
          if (!isMounted()) return;
          setHotspots([]);
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load hotspots. Please try again.');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchHotspots();
  }, [currentLocation?.coordinates?.latitude, currentLocation?.coordinates?.longitude]);

  const filteredHotspots = hotspots;

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)} km`;
  };

  const navigateToDetail = useCallback((hotspot: HotspotFromAPI) => {
    router.push({
      pathname: '/search/hotspot-detail',
      params: {
        slug: hotspot.slug,
        name: hotspot.name,
        image: hotspot.image || '',
        totalDeals: String(hotspot.totalDeals || 0),
        lat: String(hotspot.coordinates?.lat || ''),
        lng: String(hotspot.coordinates?.lng || ''),
        city: hotspot.city || '',
      },
    } as any);
  }, [router]);

  const openDirections = useCallback((hotspot: HotspotFromAPI) => {
    if (!hotspot.coordinates?.lat || !hotspot.coordinates?.lng) return;
    const { lat, lng } = hotspot.coordinates;
    const url = Platform.select({
      ios: `maps:0,0?q=${hotspot.name}@${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${hotspot.name})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  }, []);

  const locationText = currentLocation?.coordinates
    ? (currentLocation as any).city || 'Your Location'
    : 'Location unavailable';

  const renderHotspot = useCallback(({ item }: { item: HotspotFromAPI }) => (
    <Pressable
      style={styles.hotspotCard}
      onPress={() => navigateToDetail(item)}
    >
      {item.priority >= 90 && (
        <View style={styles.trendingBadge}>
          <Ionicons name="flame" size={12} color={Colors.text.inverse} />
          <ThemedText style={styles.trendingText}>Trending</ThemedText>
        </View>
      )}

      <View style={styles.hotspotImage}>
        {item.image ? (
          <CachedImage source={item.image} style={styles.hotspotImg} contentFit="cover" />
        ) : (
          <View style={styles.hotspotImgPlaceholder}>
            <Ionicons name="location" size={28} color={NUQTA.nileBlue} />
          </View>
        )}
      </View>

      <View style={styles.hotspotInfo}>
        <View style={styles.hotspotHeader}>
          <ThemedText style={styles.hotspotName}>{item.name}</ThemedText>
          {item.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={12} color={NUQTA.nileBlue} />
              <ThemedText style={styles.distanceText}>{formatDistance(item.distance)}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.cityBadge}>
          <Ionicons name="location-outline" size={12} color={Colors.text.tertiary} />
          <ThemedText style={styles.cityText}>{item.city}</ThemedText>
        </View>

        <View style={styles.hotspotStats}>
          <View style={styles.statItem}>
            <Ionicons name="pricetag-outline" size={14} color={NUQTA.lightMustard} />
            <ThemedText style={styles.statText}>{item.totalDeals} deals</ThemedText>
          </View>
        </View>
      </View>

      <Pressable style={styles.directionsButton} onPress={(e) => { e.stopPropagation(); openDirections(item); }}>
        <Ionicons name="navigate-circle" size={32} color={NUQTA.nileBlue} />
      </Pressable>
    </Pressable>
  ), [navigateToDetail, openDirections]);

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={64} color={Colors.text.tertiary} />
        <ThemedText style={styles.mapPlaceholderText}>Map View</ThemedText>
        <ThemedText style={styles.mapPlaceholderSubtext}>
          Interactive map with hotspot markers
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mapCardsScroll}
        contentContainerStyle={styles.mapCardsContainer}
      >
        {filteredHotspots.map(hotspot => (
          <Pressable
            key={hotspot._id}
            style={styles.mapCard}
            onPress={() => navigateToDetail(hotspot)}
          >
            <View style={styles.mapCardImage}>
              {hotspot.image ? (
                <CachedImage source={hotspot.image} style={{ width: 48, height: 48, borderRadius: BorderRadius.sm }} contentFit="cover" />
              ) : (
                <Ionicons name="location" size={24} color={NUQTA.nileBlue} />
              )}
            </View>
            <View style={styles.mapCardInfo}>
              <ThemedText style={styles.mapCardName}>{hotspot.name}</ThemedText>
              {hotspot.distance !== undefined && (
                <ThemedText style={styles.mapCardDistance}>{formatDistance(hotspot.distance)}</ThemedText>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NUQTA.nileBlue} />

      <LinearGradient
        colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Nearby Hotspots</ThemedText>
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'list' ? NUQTA.nileBlue : colors.background.primary}
              />
            </Pressable>
            <Pressable
              style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map"
                size={18}
                color={viewMode === 'map' ? NUQTA.nileBlue : colors.background.primary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.locationBar}>
          <Ionicons name="location" size={18} color={NUQTA.lightMustard} />
          <ThemedText style={styles.locationText}>{locationText}</ThemedText>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NUQTA.nileBlue} />
          <ThemedText style={styles.loadingText}>Finding hotspots near you...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={NUQTA.nileBlue} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => {
            setLoading(true);
            setError(null);
            const params: any = { limit: 20 };
            if (currentLocation?.coordinates) {
              params.lat = currentLocation.coordinates.latitude;
              params.lng = currentLocation.coordinates.longitude;
            }
            apiClient.get('/offers/hotspots', params).then(r => {
              setHotspots(Array.isArray(r.data) ? r.data : []);
            }).catch(() => setError('Failed to load hotspots.')).finally(() => setLoading(false));
          }}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : hotspots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color={Colors.text.tertiary} />
          <ThemedText style={styles.emptyText}>No hotspots found in your area yet.</ThemedText>
        </View>
      ) : viewMode === 'list' ? (
        <FlashList
          data={filteredHotspots}
          renderItem={renderHotspot}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={120}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryValue}>{filteredHotspots.length}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Hotspots</ThemedText>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryValue}>
                  {filteredHotspots.reduce((sum, h) => sum + (h.totalDeals || 0), 0)}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Deals</ThemedText>
              </View>
            </View>
          }
        />
      ) : (
        renderMapView()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUQTA.linen,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  toggleButton: {
    padding: Spacing.sm,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: Colors.background.primary,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  locationText: {
    ...Typography.body,
    color: Colors.text.inverse,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['2xl'],
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: NUQTA.nileBlue,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.background.secondary,
  },
  hotspotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    position: 'relative',
    ...Shadows.subtle,
  },
  trendingBadge: {
    position: 'absolute',
    top: 0,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: NUQTA.lightMustard,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  trendingText: {
    ...Typography.overline,
    color: NUQTA.nileBlue,
    fontWeight: '700',
  },
  hotspotImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  hotspotImg: {
    width: 60,
    height: 60,
  },
  hotspotImgPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  hotspotName: {
    ...Typography.body,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  distanceText: {
    ...Typography.bodySmall,
    color: NUQTA.nileBlue,
    fontWeight: '600',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  cityText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  hotspotStats: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  directionsButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: NUQTA.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  mapPlaceholderSubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  mapCardsScroll: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  mapCardsContainer: {
    paddingHorizontal: Spacing.base,
  },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.md,
    width: 200,
    ...Shadows.medium,
  },
  mapCardImage: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  mapCardInfo: {
    flex: 1,
  },
  mapCardName: {
    ...Typography.body,
    fontWeight: '600',
    color: NUQTA.nileBlue,
  },
  mapCardDistance: {
    ...Typography.bodySmall,
    color: NUQTA.nileBlue,
    fontWeight: '500',
  },
});

export default withErrorBoundary(HotspotsPage, 'SearchHotspots');
