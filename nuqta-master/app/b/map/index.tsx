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
 *
 * Performance
 * ----------
 * The actual map content (`MapPageContent`) is code-split using `React.lazy()`
 * so the native `react-native-maps` module is only loaded when the user
 * navigates here. This keeps the initial bundle lean.
 */

import React, { lazy, Suspense } from 'react';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import MapLoadingPlaceholder from './MapLoadingPlaceholder';

// Lazy-load the map content so react-native-maps native module is code-split
// and only downloaded when the user navigates to this screen.
const MapPageContent = lazy(() =>
  import('./MapPageContent').then((m) => ({
    default: m.default ?? m.MapPageContent,
  })),
);

// ---------------------------------------------------------------------------
// Page body (extracted so the gate + boundary are at the bottom)
// ---------------------------------------------------------------------------

function MapPage(): React.ReactElement {
  return (
    <Suspense fallback={<MapLoadingPlaceholder />}>
      <MapPageContent />
    </Suspense>
  );
}

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
