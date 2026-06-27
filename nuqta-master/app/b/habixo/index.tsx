/**
 * /b/habixo — Habixo home (Phase 4.5 of the REZ-vs-NUQTA migration).
 *
 * Habixo is a rental marketplace that bundles five vertical surfaces:
 * stays, hourly, property, rent, and match. The page presents a unified
 * catalogue with a filter bar on top and a 2-column grid of
 * `<PropertyCard />` cards below.
 *
 * Layout
 * ------
 *   1. Header bar (back button + title + "List a property" CTA)
 *   2. <PropertyFilterBar /> — type chips, city input, price slider
 *   3. Grid of <PropertyCard /> cards (2 per row)
 *
 * Lifecycle
 * ---------
 *   - `useHabixoProperties()` does the HTTP fetches; the page just
 *     observes `isLoading`, `error`, `properties`.
 *   - Each filter change funnels through `onFiltersChange` which calls
 *     `search(filters)`.
 *   - Pull-to-refresh re-runs the most recent query via `refresh()`.
 *
 * Wrapped in:
 *   - `FeatureFlagGate flag="b.habixo"` — page disappears when the
 *     feature is disabled via `subscriptionStore.featureFlags['b.habixo']`.
 *   - `withErrorBoundary(HabixoPage, 'Habixo')` — runtime crash isolated
 *     to this screen.
 *
 * Telemetry
 * ---------
 *   - `screen_view` is logged on every focus.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import PropertyCard from '@/components/b/habixo/PropertyCard';
import PropertyFilterBar from '@/components/b/habixo/PropertyFilterBar';
import { useHabixoProperties } from '@/hooks/b/habixo/useHabixoProperties';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import logger from '@/utils/logger';
import type { HabixoPropertyFilters } from '@/types/habixo.types';

// ---------------------------------------------------------------------------
// Local constants
// ---------------------------------------------------------------------------

/** Initial filter set used by the page on first mount. */
const INITIAL_FILTERS: HabixoPropertyFilters = {
  city: '',
  type: null,
  minRentPaise: null,
  maxRentPaise: null,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  style?: object;
}

function SkeletonBlock({
  width = '100%',
  height = 16,
  style,
}: SkeletonBlockProps): React.ReactElement {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.border.light,
        },
        style,
      ]}
    />
  );
}

function HabixoSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityLabel="Loading properties"
      accessibilityRole="progressbar"
    >
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map((index) => (
          <View key={`skeleton-${index}`} style={styles.skeletonCard}>
            <SkeletonBlock height={140} style={styles.skeletonSpace} />
            <SkeletonBlock height={18} width="80%" style={styles.skeletonSpace} />
            <SkeletonBlock height={14} width="50%" style={styles.skeletonSpace} />
            <SkeletonBlock height={22} width="60%" style={styles.skeletonSpace} />
            <SkeletonBlock height={14} width="40%" />
          </View>
        ))}
      </View>
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <View
      style={styles.errorWrap}
      accessibilityLabel="Couldn't load properties"
    >
      <Text style={styles.errorEmoji}>😕</Text>
      <Text style={styles.errorTitle}>Couldn't load properties</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading properties"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  onReset,
}: {
  onReset: () => void;
}): React.ReactElement {
  return (
    <View style={styles.emptyWrap} accessibilityLabel="No properties match your filters">
      <Text style={styles.emptyEmoji}>🔎</Text>
      <Text style={styles.emptyTitle}>No properties match your filters</Text>
      <Text style={styles.emptySub}>
        Try widening the price range or clearing the city filter.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset filters"
        onPress={onReset}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
      >
        <Text style={styles.retryText}>Reset filters</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function HabixoPageBase(): React.ReactElement {
  const router = useRouter();
  const [filters, setFilters] = useState<HabixoPropertyFilters>(INITIAL_FILTERS);

  const { properties, isLoading, error, search, refresh } = useHabixoProperties();

  // Re-search whenever the filters change. Debounced implicitly via the
  // hook's cancellation-safe fetch — rapid changes still produce a
  // consistent final state.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      await search(filters);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [filters, search]);

  // Screen-view telemetry on focus.
  useFocusEffect(
    useCallback(() => {
      try {
        logger.info('screen_view', { screen: 'Habixo' }, 'B Features');
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* no cleanup needed */
      };
    }, []),
  );

  const onRefresh = useCallback(async (): Promise<void> => {
    try {
      await refresh();
    } catch {
      /* errors are surfaced via the `error` state */
    }
  }, [refresh]);

  const onFiltersChange = useCallback((next: HabixoPropertyFilters): void => {
    setFilters(next);
  }, []);

  const onResetFilters = useCallback((): void => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const onListProperty = useCallback((): void => {
    try {
      logger.info(
        'habixo_list_property_cta_pressed',
        {},
        'B Features',
      );
    } catch {
      /* logger is a soft dependency */
    }
    // The "List a property" flow isn't part of Phase 4.5 yet; we deep-link
    // to a placeholder route so the CTA isn't dead. A future phase will
    // wire this to the property-creation form.
    router.push('/b/habixo/list' as never);
  }, [router]);

  const onPropertyPress = useCallback(
    (id: string): void => {
      try {
        logger.info(
          'habixo_property_tapped',
          { propertyId: id },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      router.push(`/b/habixo/${id}` as never);
    },
    [router],
  );

  // Initial loading: only block when nothing has been populated yet.
  const showSkeleton = isLoading && properties.length === 0;

  // Top-level error: only block when we have nothing to show.
  const topError = error !== null && properties.length === 0 ? error : null;

  let body: React.ReactElement;
  if (showSkeleton) {
    body = <HabixoSkeleton />;
  } else if (topError !== null) {
    body = (
      <ErrorState message={topError.message} onRetry={onRefresh} />
    );
  } else if (properties.length === 0) {
    body = <EmptyState onReset={onResetFilters} />;
  } else {
    body = (
      <View style={styles.grid}>
        {properties.map((property) => (
          <View key={property.id} style={styles.gridCell}>
            <PropertyCard
              property={property}
              onPress={() => onPropertyPress(property.id)}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Habixo</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="List a property"
          onPress={onListProperty}
          style={({ pressed }) => [styles.ctaHeader, pressed && styles.btnPressed]}
        >
          <Text style={styles.ctaHeaderText}>List a property</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && properties.length > 0}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={styles.heroTitle}>Find your next place</Text>
          <Text style={styles.heroSubtitle}>
            Stays, hourly spaces, flats, rentals, and matches — all in one marketplace.
          </Text>
        </View>

        <View style={styles.filterWrap}>
          <PropertyFilterBar
            filters={filters}
            onChange={onFiltersChange}
          />
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {properties.length === 0
              ? 'No results'
              : `${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`}
          </Text>
        </View>

        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Feature-flagged, error-bounded entry point
// ---------------------------------------------------------------------------

/**
 * The exported screen is wrapped in:
 *   - `FeatureFlagGate` so the whole page disappears when the B
 *     habixo flag is off;
 *   - `withErrorBoundary` so a runtime error here never crashes the
 *     rest of the app.
 */
function GatedHabixoPage(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.habixo">
      <HabixoPageBase />
    </FeatureFlagGate>
  );
}

const HabixoPage = withErrorBoundary(GatedHabixoPage, 'Habixo');
export default HabixoPage;

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
  ctaHeader: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  ctaHeaderText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
  },
  headerBlock: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  filterWrap: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  resultsHeader: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  resultsTitle: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base - spacing.xs,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  // Skeleton
  skeletonWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  skeletonCard: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.base,
  },
  skeletonSpace: {
    marginBottom: spacing.sm,
  },
  // Error
  errorWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // Empty
  emptyWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  retryText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
});