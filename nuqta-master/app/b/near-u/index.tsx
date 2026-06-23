/**
 * /b/near-u — main Near-U Discovery screen (Phase 2.3).
 *
 * Renders:
 *   - A header with the screen title + subtitle.
 *   - A row of filter chips (Open now, Free delivery, Student discount).
 *   - `<NearUVerticalTabs />` for switching between the five verticals.
 *   - A vertical list of `<NearUStoreCard />` tiles.
 *
 * State machine
 * -------------
 *   - `isLoading && stores.length === 0` → skeleton list.
 *   - `error !== null && stores.length === 0` → error UI with retry.
 *   - otherwise empty (no stores) → empty-state copy.
 *   - happy path → list of cards.
 *
 * Telemetry
 * ---------
 *   - Logs `screen_view` on focus via `logger.info`.
 *   - Pull-to-refresh triggers `refresh()` from the underlying hook.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(NearUPage, 'Near-U')` so a render-time
 *     crash inside the tabs or cards cannot take down the rest of the
 *     B nav stack.
 *   - Wrapped in `<FeatureFlagGate flag="b.nearU">` so operators can
 *     disable the whole feature at runtime without a rebuild.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import NearUVerticalTabs from '@/components/b/nearU/NearUVerticalTabs';
import NearUStoreCard from '@/components/b/nearU/NearUStoreCard';
import { SkeletonLoader } from '@/components/skeletons';
import {
  useNearUStores,
  type NearUVertical,
  type NearUStore,
} from '@/hooks/b/nearU/useNearUStores';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type FilterId = 'openNow' | 'freeDelivery' | 'studentDiscount';

interface FilterDef {
  id: FilterId;
  label: string;
  /** Optional predicate applied to the server-side store list. */
  predicate: (store: NearUStore) => boolean;
}

const FILTERS: ReadonlyArray<FilterDef> = [
  {
    id: 'openNow',
    label: 'Open now',
    predicate: (store) => store.isOpen,
  },
  {
    id: 'freeDelivery',
    label: 'Free delivery',
    // Server doesn't yet model a `freeDelivery` flag, so we treat low-ETA
    // express-tagged stores as "fast" and use ETA < 25 minutes as a proxy.
    predicate: (store) => store.etaMinutes > 0 && store.etaMinutes <= 25,
  },
  {
    id: 'studentDiscount',
    label: 'Student discount',
    predicate: (store) => store.isStudentDiscount,
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

function NearUPageBase(): React.ReactElement {
  const router = useRouter();
  const [vertical, setVertical] = useState<NearUVertical>('all');
  const [activeFilters, setActiveFilters] = useState<ReadonlySet<FilterId>>(
    () => new Set<FilterId>(),
  );

  const { stores, isLoading, error, refresh } = useNearUStores(vertical);

  useFocusEffect(
    useCallback(() => {
      logger.info(
        'screen_view',
        { screen: 'Near-U', vertical },
        'B Features',
      );
      return () => {
        /* nothing to clean up */
      };
    }, [vertical]),
  );

  const filteredStores = useMemo<NearUStore[]>(() => {
    if (activeFilters.size === 0) return stores;
    return stores.filter((store) => {
      for (const filter of FILTERS) {
        if (activeFilters.has(filter.id) && !filter.predicate(store)) {
          return false;
        }
      }
      return true;
    });
  }, [stores, activeFilters]);

  const toggleFilter = useCallback((id: FilterId): void => {
    setActiveFilters((prev) => {
      const next = new Set<FilterId>(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    logger.info(
      'b_nearu_filter_toggle',
      { id },
      'B Features',
    );
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      logger.warn(
        'b_nearu_refresh_failed',
        { error: err instanceof Error ? err.message : String(err) },
        'B Features',
      );
    }
  }, [refresh]);

  const handleStorePress = useCallback(
    (store: NearUStore): void => {
      logger.info(
        'b_nearu_store_press',
        { id: store.id, vertical },
        'B Features',
      );
      // Detail screen intentionally out of scope for the stub — the parent
      // B nav stack can decide where to push from here. We just log for now.
    },
    [vertical],
  );

  const showSkeleton = isLoading && stores.length === 0;
  const showError = error !== null && stores.length === 0;
  const showEmpty =
    !showSkeleton && !showError && filteredStores.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
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
        <Text style={styles.title}>Near-U</Text>
        <Text style={styles.subtitle}>
          Hyperlocal stores near you, sorted by what you need
        </Text>
      </View>

      <View style={styles.chipsRow}>
        {FILTERS.map((filter) => {
          const isActive = activeFilters.has(filter.id);
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${filter.label}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => toggleFilter(filter.id)}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <NearUVerticalTabs active={vertical} onChange={setVertical} />

      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NearUStoreCard store={item} onPress={() => handleStorePress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && stores.length > 0}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        ListHeaderComponent={null}
        ListEmptyComponent={
          showSkeleton ? <NearUListSkeleton /> : null
        }
        showsVerticalScrollIndicator={false}
      />

      {showError ? (
        <View style={styles.errorBlock} accessibilityRole="alert">
          <Text style={styles.errorTitle}>Couldn&apos;t load nearby stores</Text>
          <Text style={styles.errorMessage}>
            {error ?? 'Something went wrong while loading the list.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading nearby stores"
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
          >
            <Text style={styles.retryBtnText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyBlock} accessibilityRole="text">
          <Text style={styles.emptyTitle}>No stores in this category nearby</Text>
          <Text style={styles.emptyMessage}>
            Try a different category or pull to refresh.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function NearUListSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityLabel="Loading nearby stores"
      accessibilityRole="progressbar"
    >
      {[0, 1, 2].map((i) => (
        <View key={`skel-${i}`} style={styles.skeletonCard}>
          <SkeletonLoader
            width={56}
            height={56}
            borderRadius={borderRadius.md}
            style={styles.skeletonLogo}
          />
          <View style={styles.skeletonText}>
            <SkeletonLoader
              width="60%"
              height={14}
              borderRadius={4}
              style={styles.skeletonLine}
            />
            <SkeletonLoader
              width="40%"
              height={12}
              borderRadius={4}
              style={styles.skeletonLine}
            />
            <SkeletonLoader
              width="80%"
              height={12}
              borderRadius={4}
              style={styles.skeletonLine}
            />
          </View>
        </View>
      ))}
    </View>
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
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  title: {
    ...typography.h1,
    color: colors.nileBlue,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
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
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.nileBlue,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  skeletonWrap: {
    paddingTop: spacing.xs,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  skeletonLogo: {
    marginRight: spacing.sm,
  },
  skeletonText: {
    flex: 1,
  },
  skeletonLine: {
    marginTop: 6,
  },
  errorBlock: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.xl,
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  errorTitle: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryBtnText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '800',
  },
  emptyBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

const NearUPage = withErrorBoundary(NearUPageBase, 'Near-U');

export default function NearUPageGated(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.nearU">
      <NearUPage />
    </FeatureFlagGate>
  );
}
