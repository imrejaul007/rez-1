/**
 * /b/salon — Salon discovery + booking (Phase 4.6).
 *
 * Layout
 * ------
 *   1. Header bar with the "Salons" title and a back button.
 *   2. Search bar (free-text area filter) and a "Search" button.
 *   3. Vertical list of salon cards (name, area, rating, price range,
 *      "View services" CTA).
 *   4. Bottom-anchored "My bookings" link, driven by `useSalonBooking`.
 *
 * State machine
 * -------------
 *   - `isLoading && salons.length === 0` → skeleton grid.
 *   - `error && salons.length === 0`   → error UI with retry button.
 *   - otherwise empty (no salons)      → "No salons in this area".
 *   - happy path                       → list of cards.
 *
 * Telemetry
 * ---------
 *   - `screen_view` is logged on focus via `logger.info`.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(SalonPage, 'Salon')`.
 *   - Wrapped in `<FeatureFlagGate flag="b.salon">`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useSalonSearch } from '@/hooks/b/salon/useSalonSearch';
import { useSalonBooking } from '@/hooks/b/salon/useSalonBooking';
import type { Salon } from '@/types/salon.types';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SalonCardProps {
  salon: Salon;
  onPress: (salon: Salon) => void;
}

function SalonCard({ salon, onPress }: SalonCardProps): React.ReactElement {
  const handlePress = useCallback(() => {
    onPress(salon);
  }, [onPress, salon]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${salon.name} in ${salon.area}. Rating ${salon.rating}.`}
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {salon.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {salon.area} · {salon.city}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            salon.isOpen ? styles.statusPillOpen : styles.statusPillClosed,
          ]}
          accessibilityLabel={salon.isOpen ? 'Open' : 'Closed'}
        >
          <Text style={styles.statusPillText}>
            {salon.isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.rating} accessibilityLabel={`Rating ${salon.rating} stars`}>
          ★ {salon.rating.toFixed(1)}
        </Text>
        <Text style={styles.reviewCount}>
          ({salon.reviewCount.toLocaleString('en-IN')})
        </Text>
        <Text style={styles.priceRange} accessibilityLabel={`Price tier ${salon.priceRange}`}>
          {salon.priceRange}
        </Text>
      </View>

      {salon.specialties.length > 0 ? (
        <View style={styles.chipsRow}>
          {salon.specialties.slice(0, 3).map((specialty) => (
            <View key={specialty} style={styles.chip}>
              <Text style={styles.chipText}>{specialty}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.viewServices} allowFontScaling={false}>
          View services →
        </Text>
      </View>
    </Pressable>
  );
}

function SalonSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeletonCard}
      accessible
      accessibilityLabel="Loading salons"
      accessibilityRole="progressbar"
    >
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLine} />
    </View>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry: () => void;
}

function ErrorBlock({ message, onRetry }: ErrorBlockProps): React.ReactElement {
  return (
    <View style={styles.errorBlock} accessibilityRole="alert" accessibilityLabel="Couldn't load salons">
      <Text style={styles.errorTitle}>Couldn't load salons</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading salons"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
      >
        <Text style={styles.retryButtonText}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyBlock(): React.ReactElement {
  return (
    <View style={styles.emptyBlock} accessibilityRole="text">
      <Text style={styles.emptyTitle}>No salons in this area</Text>
      <Text style={styles.emptyMessage}>
        Try a different area or clear your search.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function SalonPage(): React.ReactElement {
  const router = useRouter();
  const { salons, isLoading, error, search, refresh } = useSalonSearch();
  const { bookings, isBooking: isMutatingBooking, refresh: refreshBookings } =
    useSalonBooking();

  const [searchInput, setSearchInput] = useState<string>('');
  const [activeArea, setActiveArea] = useState<string>('');

  // Screen-view telemetry on focus.
  useFocusEffect(
    useCallback(() => {
      try {
        logger.info('screen_view', { screen: 'Salon' }, 'B Features');
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  const onSubmitSearch = useCallback(async () => {
    const trimmed = searchInput.trim();
    setActiveArea(trimmed);
    try {
      await search({ area: trimmed.length > 0 ? trimmed : undefined });
    } catch {
      /* error already captured inside the hook */
    }
  }, [search, searchInput]);

  const onRetry = useCallback(() => {
    refresh().catch(() => {
      /* captured inside the hook */
    });
  }, [refresh]);

  const onSalonPress = useCallback(
    (salon: Salon) => {
      try {
        logger.info(
          'salon_card_tap',
          { salonId: salon.id, name: salon.name },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      // Stay on the index page for now — the per-salon detail screen
      // will be added in a follow-up phase. We log the tap so the
      // analytics funnel is in place.
    },
    [],
  );

  const upcomingBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === 'confirmed' || b.status === 'pending',
      ),
    [bookings],
  );

  const onShowBookings = useCallback(() => {
    void refreshBookings();
  }, [refreshBookings]);

  const showSkeleton = isLoading && salons.length === 0;
  const showError = error !== null && salons.length === 0;
  const showEmpty = !showSkeleton && !showError && salons.length === 0;

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
        <Text style={styles.headerTitle}>Salons</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search by area"
          placeholder="Search by area — e.g. Koramangala"
          placeholderTextColor={colors.text.tertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={onSubmitSearch}
          style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {activeArea.length > 0 ? (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterLabel} allowFontScaling={false}>
            Showing salons in "{activeArea}"
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
            onPress={() => {
              setSearchInput('');
              setActiveArea('');
              search({ area: undefined }).catch(() => {
                /* captured */
              });
            }}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showSkeleton ? (
          <>
            <SalonSkeleton />
            <SalonSkeleton />
            <SalonSkeleton />
          </>
        ) : null}

        {showError ? (
          <ErrorBlock message={error ?? 'Unknown error'} onRetry={onRetry} />
        ) : null}

        {showEmpty ? <EmptyBlock /> : null}

        {!showSkeleton && !showError && !showEmpty
          ? salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} onPress={onSalonPress} />
            ))
          : null}

        {isMutatingBooking ? (
          <View style={styles.mutationHint} accessibilityLabel="Saving booking">
            <Text style={styles.mutationHintText}>Saving booking…</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`My bookings. ${upcomingBookings.length} upcoming.`}
        onPress={onShowBookings}
        style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
      >
        <Text style={styles.footerText} allowFontScaling={false}>
          My bookings · {upcomingBookings.length} upcoming
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Gated export
// ---------------------------------------------------------------------------

function SalonPageGated(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.salon">
      <SalonPage />
    </FeatureFlagGate>
  );
}

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
    width: 56,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
    ...typography.body,
  },
  searchButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.base,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonPressed: {
    opacity: 0.85,
  },
  searchButtonText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  activeFilterLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  clearBtnPressed: {
    opacity: 0.7,
  },
  clearBtnText: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.nileBlue,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusPillOpen: {
    backgroundColor: '#dcfce7',
  },
  statusPillClosed: {
    backgroundColor: '#fee2e2',
  },
  statusPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  rating: {
    ...typography.label,
    color: colors.gold,
    fontWeight: '800',
  },
  reviewCount: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  priceRange: {
    ...typography.label,
    color: colors.nileBlue,
    marginLeft: spacing.base,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  cardFooter: {
    marginTop: spacing.sm,
    alignItems: 'flex-end',
  },
  viewServices: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  skeletonCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  skeletonLineShort: {
    height: 14,
    width: '60%',
    borderRadius: 4,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  errorBlock: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale?.[200] ?? '#FECACA',
    padding: spacing.base,
    marginTop: spacing.base,
  },
  errorTitle: {
    ...typography.label,
    color: colors.error ?? '#EF4444',
    fontWeight: '800',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
    alignSelf: 'flex-start',
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  emptyBlock: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  mutationHint: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  mutationHintText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  footerPressed: {
    opacity: 0.85,
  },
  footerText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
});

export default withErrorBoundary(SalonPageGated, 'Salon');
