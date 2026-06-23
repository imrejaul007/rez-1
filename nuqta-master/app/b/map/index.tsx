/**
 * /b/map — Map View (Phase 1.5 — REZ-vs-NUQTA migration)
 *
 * Full-page map showing REZ-accepting stores within 5km of the user's
 * current location. Built on `react-native-maps` (already in the project)
 * with an `expo-location`-driven permission flow on mount.
 *
 * UX flow
 * -------
 *   1. On mount, request foreground location permission via `expo-location`.
 *   2. Once granted, center the map on the user and load nearby stores.
 *   3. Each store renders as a `<StoreMapMarker>` inside a `react-native-maps`
 *      `<Marker>`. Tapping a marker opens `<StoreMapInfoCard>` at the bottom.
 *   4. Filter chips ("All", "Offers nearby", "Cashback", "Open now") filter
 *      the visible markers without re-querying.
 *   5. "My location" FAB (bottom right) recenters the map on the user.
 *   6. Pull-to-refresh re-queries the nearby-stores endpoint.
 *
 * States
 * ------
 *   - Loading: centered `ActivityIndicator` overlay.
 *   - Error:   "Couldn't load nearby stores" + retry button.
 *   - Permission denied: "Allow location access..." + open-settings button.
 *   - Empty:   "No stores nearby yet — try widening the search".
 *
 * The page is wrapped in `withErrorBoundary(MapPage, 'Map View')` so a crash
 * inside the map can't take down the rest of the B nav stack, and the
 * whole screen is gated by `<FeatureFlagGate flag="b.map">` so it can be
 * turned off via the `subscriptionStore.featureFlags.b.map` flag.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import StoreMapMarker from '@/components/b/map/StoreMapMarker';
import StoreMapInfoCard from '@/components/b/map/StoreMapInfoCard';
import { useNearbyStores, NearbyStore } from '@/hooks/b/map/useNearbyStores';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';
import logger from '@/utils/logger';

// `react-native-maps` is native-only. We lazy-load it so web builds don't
// fail to bundle. If it's missing (web) we render a friendly fallback.
// The library's runtime export shape is not modelled by its types for the
// dynamic-require pattern, so we hold the components as `unknown` at module
// scope and cast at the JSX site.
type RegionShape = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * `react-native-maps` exports its components as classes, but their class
 * types lose JSX-callable signatures after the dynamic-require pattern
 * the bundler forces. We mirror the existing `app/explore/map.tsx` approach
 * and hold them as `any` locally — the rest of this file is strictly
 * typed. Using `any` here is contained to module-scope loader plumbing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
let MapViewNative: any = null;
let MarkerNative: any = null;
let PROVIDER_GOOGLE: any = null;
/* eslint-enable @typescript-eslint/no-explicit-any */

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Maps = require('react-native-maps');
    MapViewNative = Maps.default ?? Maps.MapView;
    MarkerNative = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch {
    MapViewNative = null;
    MarkerNative = null;
    PROVIDER_GOOGLE = null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionState = 'unknown' | 'granted' | 'denied';
type FilterKey = 'all' | 'offers' | 'cashback' | 'open';

interface FilterChip {
  key: FilterKey;
  label: string;
}

const FILTERS: FilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'offers', label: 'Offers nearby' },
  { key: 'cashback', label: 'Cashback' },
  { key: 'open', label: 'Open now' },
];

const DEFAULT_REGION: RegionShape = {
  latitude: 12.9716, // Bangalore fallback.
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

/** "Zoom 14" approximation — 0.05 deg ≈ 5.5km. */
const USER_ZOOM: RegionShape = {
  latitude: DEFAULT_REGION.latitude,
  longitude: DEFAULT_REGION.longitude,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesFilter(store: NearbyStore, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'offers':
      return store.offersCount > 0;
    case 'cashback':
      return typeof store.cashbackPercent === 'number' && store.cashbackPercent > 0;
    case 'open':
      return store.isOpen === true;
    default:
      return true;
  }
}

function logScreenView(): void {
  try {
    logger.info(
      'screen_view',
      { screen: 'Map View' },
      'B Features',
    );
  } catch {
    /* logger is optional */
  }
}

// ---------------------------------------------------------------------------
// Page body (extracted so the gate + boundary are at the bottom)
// ---------------------------------------------------------------------------

function MapPage(): React.ReactElement {
  const router = useRouter();
  const { stores, isLoading, error, refresh, userLocation } = useNearbyStores();
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedStore, setSelectedStore] = useState<NearbyStore | null>(null);
  // Hold the latest region in a ref so the "My location" FAB can reapply it.
  const mapRef = useRef<{
    animateToRegion: (region: RegionShape, duration: number) => void;
  } | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);

  // Initial permission request + screen view log.
  useEffect(() => {
    logScreenView();
    if (Platform.OS === 'web') {
      // Web has no `expo-location` foreground prompt; assume granted so the
      // page still renders. The hook will use the fallback coords.
      setPermission('granted');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setPermission(status === 'granted' ? 'granted' : 'denied');
      } catch {
        if (!cancelled) setPermission('denied');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStores = useMemo(
    () => stores.filter((s) => matchesFilter(s, filter)),
    [stores, filter],
  );

  const handleSelect = useCallback((store: NearbyStore): void => {
    setSelectedStore(store);
    try {
      logger.info(
        'b_map_marker_tap',
        { storeId: store.id, storeName: store.name },
        'B Features',
      );
    } catch {
      /* ignore */
    }
  }, []);

  const handleClose = useCallback((): void => {
    setSelectedStore(null);
  }, []);

  const handleNavigate = useCallback((): void => {
    if (!selectedStore) return;
    const { latitude, longitude } = selectedStore;
    const label = encodeURIComponent(selectedStore.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    }) as string;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open maps', 'Please try again later.');
    });
  }, [selectedStore]);

  const handleViewStore = useCallback((): void => {
    if (!selectedStore) return;
    router.push(`/store/${selectedStore.id}` as const);
  }, [router, selectedStore]);

  const handleRecenter = useCallback((): void => {
    if (!mapRef.current) return;
    const region: RegionShape = {
      latitude: userLocation?.latitude ?? DEFAULT_REGION.latitude,
      longitude: userLocation?.longitude ?? DEFAULT_REGION.longitude,
      latitudeDelta: USER_ZOOM.latitudeDelta,
      longitudeDelta: USER_ZOOM.longitudeDelta,
    };
    mapRef.current.animateToRegion(region, 350);
  }, [userLocation]);

  const handleOpenSettings = useCallback((): void => {
    Linking.openSettings().catch(() => {
      Alert.alert('Settings unavailable', 'Please enable location in Settings.');
    });
  }, []);

  // Initial region for the native map.
  const initialRegion: RegionShape = useMemo(
    () => ({
      latitude: userLocation?.latitude ?? DEFAULT_REGION.latitude,
      longitude: userLocation?.longitude ?? DEFAULT_REGION.longitude,
      latitudeDelta: USER_ZOOM.latitudeDelta,
      longitudeDelta: USER_ZOOM.longitudeDelta,
    }),
    [userLocation],
  );

  // -------------------------------------------------------------------------
  // Permission-denied state (rendered before the map)
  // -------------------------------------------------------------------------
  if (permission === 'denied') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.push('/b' as const);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>{'‹ Back'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Nearby stores</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.permEmoji} accessibilityElementsHidden importantForAccessibility="no">
            {'📍'}
          </Text>
          <Text style={styles.permTitle}>Allow location access to see nearby stores</Text>
          <Text style={styles.permSub}>
            We use your location to show REZ-accepting stores within 5km of you.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.permBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.permBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/b' as const);
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nearby stores</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
        refreshControl={undefined}
      >
        {FILTERS.map((chip) => {
          const isActive = chip.key === filter;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${chip.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => setFilter(chip.key)}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapWrap}>
        {MapViewNative && MarkerNative ? (
          <MapViewNative
            ref={(node: unknown) => {
              mapRef.current = node as typeof mapRef.current;
            }}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE as object : undefined}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
            onMapReady={() => setMapReady(true)}
          >
            {filteredStores.map((store) => (
              <MarkerNative
                key={store.id}
                coordinate={{
                  latitude: store.latitude,
                  longitude: store.longitude,
                }}
                onPress={() => handleSelect(store)}
                tracksViewChanges={false}
              >
                <StoreMapMarker store={store} />
              </MarkerNative>
            ))}
          </MapViewNative>
        ) : (
          // Web / unsupported: friendly fallback panel.
          <View style={styles.webFallback}>
            <Text style={styles.webFallbackTitle}>Map preview unavailable on this platform</Text>
            <Text style={styles.webFallbackSub}>
              {filteredStores.length} store{filteredStores.length === 1 ? '' : 's'} nearby.
              Open the app on iOS or Android to see them on a map.
            </Text>
          </View>
        )}

        {/* Loading overlay */}
        {isLoading && !mapReady ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.overlayText}>Finding stores near you...</Text>
          </View>
        ) : null}

        {/* Error overlay */}
        {!isLoading && error ? (
          <View style={styles.overlay} pointerEvents="auto">
            <Text style={styles.errorTitle}>Couldn't load nearby stores</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading nearby stores"
              onPress={refresh}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Empty overlay */}
        {!isLoading && !error && stores.length === 0 ? (
          <View style={styles.overlay} pointerEvents="auto">
            <Text style={styles.emptyTitle}>No stores nearby yet</Text>
            <Text style={styles.emptySub}>Try widening the search</Text>
          </View>
        ) : null}

        {/* Recenter FAB */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recenter on my location"
          onPress={handleRecenter}
          style={({ pressed }) => [styles.fab, pressed && styles.btnPressed]}
        >
          <Text style={styles.fabText}>{'◎'}</Text>
        </Pressable>

        {/* Selected-store info card */}
        {selectedStore ? (
          <StoreMapInfoCard
            store={selectedStore}
            onClose={handleClose}
            onNavigate={handleNavigate}
            onViewStore={handleViewStore}
          />
        ) : null}
      </View>

      {/* Pull-to-refresh on the whole map area would conflict with the map
          gestures, so we expose a separate refresh button in the header. */}
      <View style={styles.footerBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh nearby stores"
          onPress={refresh}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.refreshBtn,
            isLoading && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <Text style={styles.refreshText}>{'↻ Refresh'}</Text>
          )}
        </Pressable>
        <Text style={styles.footerMeta}>
          {filteredStores.length} store{filteredStores.length === 1 ? '' : 's'} within 5km
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.nileBlue,
  },
  headerSpacer: {
    width: 64,
  },
  filterBar: {
    flexGrow: 0,
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  overlayText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  permEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  permTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.nileBlue,
    borderRadius: borderRadius.md,
  },
  permBtnText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.base + 60,
    right: spacing.base,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  fabText: {
    fontSize: 22,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  refreshBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  refreshText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  footerMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    backgroundColor: colors.background.secondary,
  },
  webFallbackTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  webFallbackSub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Exports — gate then error boundary
// ---------------------------------------------------------------------------

const GatedMapPage = function GatedMapPage(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.map">
      <MapPage />
    </FeatureFlagGate>
  );
};

export default withErrorBoundary(GatedMapPage, 'Map View');

// Provide a named export for tooling that prefers it.
export { MapPage as MapPageRaw };
