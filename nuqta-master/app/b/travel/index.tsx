/**
 * /b/travel — main Travel search screen.
 *
 * Renders the five-vertical Travel aggregator (flights, hotels,
 * trains, cabs, buses). The page is built from:
 *
 *  - `<TravelCategoryTabs />` — top segmented control.
 *  - A small search form (origin, destination, depart date, passengers).
 *  - `<TravelResultCard />` list with loading / error / empty states.
 *  - Recent searches (clickable to re-run).
 *
 * Lifecycle
 * ---------
 *  - On focus, logs a `screen_view` analytics event.
 *  - Wrapped in `withErrorBoundary(TravelPage, 'Travel')` so a
 *    runtime error here never takes down the rest of the app.
 *  - Wrapped in `<FeatureFlagGate flag="b.travel">` so the operator
 *    can disable the entire screen with a single flag flip.
 *  - Pull-to-refresh re-runs the most-recent successful query via
 *    `useTravelSearch().refresh()`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import TravelCategoryTabs from '@/components/b/travel/TravelCategoryTabs';
import TravelResultCard from '@/components/b/travel/TravelResultCard';
import { useTravelSearch } from '@/hooks/b/travel/useTravelSearch';
import logger from '@/utils/logger';
import type {
  TravelCategory,
  TravelResult,
  TravelSearchQuery,
} from '@/types/travel.types';
import {
  TRAVEL_CATEGORY_LABELS,
} from '@/types/travel.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Build an ISO `YYYY-MM-DD` for `daysFromNow`. */
function defaultDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * MS_PER_DAY);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const renderResultItem: ListRenderItem<TravelResult> = ({ item }) => {
  return (
    <TravelResultCard
      result={item}
      onPress={() => {
        logger.info(
          'travel_result_pressed',
          { resultId: item.id, category: item.category },
          'B Features',
        );
      }}
    />
  );
};

const keyExtractor = (item: TravelResult): string => item.id;

function TravelLoadingState() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="Searching travel options"
      accessibilityRole="progressbar"
    >
      <Text style={styles.stateTitle}>Searching...</Text>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonRating} />
          </View>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonMeta} />
          <View style={styles.skeletonPriceRow}>
            <View style={styles.skeletonPrice} />
            <View style={styles.skeletonCta} />
          </View>
        </View>
      ))}
    </View>
  );
}

function TravelErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel={`Couldn't search right now. ${message}`}
    >
      <Text style={styles.errorTitle}>Couldn't search right now</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry travel search"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function TravelEmptyState({ category }: { category: TravelCategory }) {
  return (
    <View
      style={styles.emptyWrap}
      accessibilityLabel="Search for flights, hotels, trains, cabs, or buses to begin."
    >
      <Text
        style={styles.emptyEmoji}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ✈️
      </Text>
      <Text style={styles.emptyTitle}>Plan your next trip</Text>
      <Text style={styles.emptySubtitle}>
        Search for {TRAVEL_CATEGORY_LABELS[category].toLowerCase()}, hotels,
        trains, cabs, or buses.
      </Text>
    </View>
  );
}

function RecentSearchesList({
  recent,
  onPick,
  onClear,
}: {
  recent: ReadonlyArray<TravelSearchQuery>;
  onPick: (q: TravelSearchQuery) => void;
  onClear: () => void;
}) {
  if (recent.length === 0) return null;
  return (
    <View style={styles.recentWrap}>
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear recent travel searches"
          onPress={onClear}
          style={({ pressed }) => [
            styles.recentClear,
            pressed && styles.recentClearPressed,
          ]}
        >
          <Text style={styles.recentClearText}>Clear</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentScroll}
      >
        {recent.map((q, index) => {
          const key = `${q.category}-${q.from}-${q.to}-${q.departDate}-${index}`;
          const label = `${TRAVEL_CATEGORY_LABELS[q.category]}: ${q.from} → ${q.to} · ${q.departDate}`;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Re-run search: ${label}`}
              onPress={() => onPick(q)}
              style={({ pressed }) => [
                styles.recentChip,
                pressed && styles.recentChipPressed,
              ]}
            >
              <Text style={styles.recentChipText} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SearchForm({
  category,
  from,
  to,
  departDate,
  passengers,
  onChange,
  onSubmit,
  isLoading,
}: {
  category: TravelCategory;
  from: string;
  to: string;
  departDate: string;
  passengers: number;
  onChange: (patch: Partial<{ from: string; to: string; departDate: string; passengers: number }>) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <View style={styles.formWrap}>
      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <Text style={styles.formLabel}>From</Text>
          <TextInput
            accessibilityLabel="Origin city or code"
            value={from}
            onChangeText={(text) => onChange({ from: text })}
            placeholder="e.g. BLR"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>
        <View style={styles.formCol}>
          <Text style={styles.formLabel}>To</Text>
          <TextInput
            accessibilityLabel="Destination city or code"
            value={to}
            onChangeText={(text) => onChange({ to: text })}
            placeholder="e.g. DEL"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={[styles.formCol, styles.formColFlex]}>
          <Text style={styles.formLabel}>Depart</Text>
          <TextInput
            accessibilityLabel="Departure date"
            value={departDate}
            onChangeText={(text) => onChange({ departDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            editable={!isLoading}
          />
        </View>
        <View style={styles.formCol}>
          <Text style={styles.formLabel}>Passengers</Text>
          <TextInput
            accessibilityLabel="Number of passengers"
            value={String(passengers)}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              const safe = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
              onChange({ passengers: safe });
            }}
            keyboardType="number-pad"
            style={styles.input}
            editable={!isLoading}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Search ${TRAVEL_CATEGORY_LABELS[category].toLowerCase()}`}
        onPress={onSubmit}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.submitBtn,
          (pressed || isLoading) && styles.submitBtnPressed,
        ]}
      >
        <Text style={styles.submitText}>
          {isLoading ? 'Searching...' : `Search ${TRAVEL_CATEGORY_LABELS[category]}`}
        </Text>
      </Pressable>
    </View>
  );
}

function TravelPageBody() {
  const {
    results,
    isLoading,
    error,
    search,
    recentSearches,
    clearRecent,
    refresh,
  } = useTravelSearch();

  // -- form state ---------------------------------------------------------
  const [category, setCategory] = useState<TravelCategory>('flight');
  const [from, setFrom] = useState<string>('BLR');
  const [to, setTo] = useState<string>('DEL');
  const [departDate, setDepartDate] = useState<string>(defaultDate(7));
  const [passengers, setPassengers] = useState<number>(1);

  // Track whether the user has issued at least one search in this
  // session — used to decide between "empty" and "loading" copy.
  const hasSearchedRef = React.useRef<boolean>(false);

  /**
   * Build a `TravelSearchQuery` from the current form state. Trims
   * whitespace defensively.
   */
  const buildQuery = useCallback(
    (cat: TravelCategory = category): TravelSearchQuery => ({
      from: from.trim(),
      to: to.trim(),
      departDate: departDate.trim(),
      passengers,
      category: cat,
    }),
    [from, to, departDate, passengers, category],
  );

  /**
   * Issue a search using the current form values.
   */
  const onSubmit = useCallback(async (): Promise<void> => {
    if (from.trim().length === 0 || to.trim().length === 0) {
      logger.warn(
        'travel_search_invalid_form',
        { from, to },
        'B Features',
      );
      return;
    }
    hasSearchedRef.current = true;
    try {
      await search(buildQuery());
    } catch (err) {
      logger.error(
        'travel_search_submit_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [buildQuery, from, search, to]);

  /**
   * Re-run the most-recent successful query. Bound to pull-to-refresh.
   */
  const onRefresh = useCallback(async (): Promise<void> => {
    try {
      await refresh();
    } catch (err) {
      logger.error(
        'travel_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [refresh]);

  /**
   * Re-run a recent search verbatim, also restoring the form values
   * so the user sees what they're searching for.
   */
  const onPickRecent = useCallback(
    async (q: TravelSearchQuery): Promise<void> => {
      setCategory(q.category);
      setFrom(q.from);
      setTo(q.to);
      setDepartDate(q.departDate);
      setPassengers(q.passengers);
      hasSearchedRef.current = true;
      try {
        await search(q);
      } catch (err) {
        logger.error(
          'travel_recent_research_failed',
          err instanceof Error ? err : new Error(String(err)),
          'B Features',
        );
      }
    },
    [search],
  );

  // Log a screen view on focus.
  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Travel' }, 'B Features');
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  const hasResults = results.length > 0;
  const showInitialLoading = isLoading && !hasResults;

  /**
   * Wrap the result list with its header (recent searches + the
   * form, so the user can refine without scrolling back to the top).
   */
  const listHeader = useMemo(
    () => (
      <View>
        <RecentSearchesList
          recent={recentSearches}
          onPick={(q) => {
            void onPickRecent(q);
          }}
          onClear={() => {
            void clearRecent();
          }}
        />
        <SearchForm
          category={category}
          from={from}
          to={to}
          departDate={departDate}
          passengers={passengers}
          onChange={(patch) => {
            if (patch.from !== undefined) setFrom(patch.from);
            if (patch.to !== undefined) setTo(patch.to);
            if (patch.departDate !== undefined) setDepartDate(patch.departDate);
            if (patch.passengers !== undefined) setPassengers(patch.passengers);
          }}
          onSubmit={() => {
            void onSubmit();
          }}
          isLoading={isLoading}
        />
        {hasResults ? (
          <Text style={styles.resultsHeader}>
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>
        ) : null}
      </View>
    ),
    [
      recentSearches,
      onPickRecent,
      clearRecent,
      category,
      from,
      to,
      departDate,
      passengers,
      isLoading,
      onSubmit,
      hasResults,
      results.length,
    ],
  );

  return (
    <View style={styles.container}>
      <TravelCategoryTabs
        active={category}
        onChange={(next) => {
          setCategory(next);
        }}
      />
      {showInitialLoading ? (
        <TravelLoadingState />
      ) : error !== null && !hasResults ? (
        <TravelErrorState
          message={error.message}
          onRetry={() => {
            void onRefresh();
          }}
        />
      ) : !hasResults && !hasSearchedRef.current ? (
        <View style={styles.emptyWrap}>
          <Text
            style={styles.emptyEmoji}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ✈️
          </Text>
          <Text style={styles.emptyTitle}>Plan your next trip</Text>
          <Text style={styles.emptySubtitle}>
            Search for {TRAVEL_CATEGORY_LABELS[category].toLowerCase()}, hotels,
            trains, cabs, or buses.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderResultItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<TravelEmptyState category={category} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function TravelPage() {
  return (
    <FeatureFlagGate flag="b.travel">
      <View style={styles.container}>
        <TravelPageBody />
      </View>
    </FeatureFlagGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  resultsHeader: {
    ...typography.label,
    color: colors.text.secondary,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  stateWrap: {
    flex: 1,
    padding: spacing.base,
    backgroundColor: colors.background.primary,
  },
  stateTitle: {
    ...typography.h4,
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  skeletonCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  skeletonBadge: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
  },
  skeletonRating: {
    width: 40,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
  },
  skeletonMeta: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
  },
  skeletonPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  skeletonPrice: {
    width: 80,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.background.primary,
  },
  skeletonCta: {
    width: 60,
    height: 28,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryText: {
    ...typography.label,
    color: colors.nileBlue,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  recentWrap: {
    marginBottom: spacing.base,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  recentTitle: {
    ...typography.h4,
    color: colors.nileBlue,
  },
  recentClear: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  recentClearPressed: {
    opacity: 0.7,
  },
  recentClearText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  recentScroll: {
    paddingVertical: spacing.xs,
  },
  recentChip: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
    maxWidth: 280,
  },
  recentChipPressed: {
    opacity: 0.7,
  },
  recentChipText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  formWrap: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  formCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  formColFlex: {
    flex: 2,
  },
  formLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
    color: colors.text.primary,
    minHeight: 40,
  },
  submitBtn: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnPressed: {
    opacity: 0.8,
  },
  submitText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '700',
  },
});

export default withErrorBoundary(TravelPage, 'Travel');