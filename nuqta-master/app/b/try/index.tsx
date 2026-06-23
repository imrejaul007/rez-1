/**
 * /b/try — main Try module screen (Phase 4.3).
 *
 * Three tabs:
 *  1. **Products** — filtered catalogue of trial products.
 *  2. **Bundles** — curated trial bundles.
 *  3. **My trials** — the user's booking history.
 *
 * The "Products" tab supports category chips (All / Beauty / Food /
 * Fitness / Electronics) and a hero banner with the savings callout.
 *
 * Lifecycle
 * ---------
 *  - On focus, logs a `screen_view` analytics event.
 *  - Wrapped in `withErrorBoundary(TryPage, 'Try')` so a runtime error
 *    here never takes down the rest of the app.
 *  - Wrapped in `<FeatureFlagGate flag="b.try">` so the operator can
 *    disable the entire screen with a single flag flip.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import TrialProductCard from '@/components/b/try/TrialProductCard';
import { useTryProducts } from '@/hooks/b/try/useTryProducts';
import { useTryBooking } from '@/hooks/b/try/useTryBooking';
import {
  TRIAL_CATEGORIES,
  TRIAL_CATEGORY_LABELS,
  type TrialCategory,
  type TrialProduct,
  type TrialBundle,
  type TrialBooking,
  type TrialBookingStatus,
} from '@/types/try.types';
import { formatPrice } from '@/utils/priceFormatter';
import { useToastStore } from '@/stores/toastStore';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

type Tab = 'products' | 'bundles' | 'history';

const TAB_ORDER: ReadonlyArray<Tab> = ['products', 'bundles', 'history'];

const TAB_LABELS: Record<Tab, string> = {
  products: 'Products',
  bundles: 'Bundles',
  history: 'My trials',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return '—';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(status: TrialBookingStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'converted':
      return 'Converted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function statusColor(status: TrialBookingStatus): string {
  switch (status) {
    case 'active':
      return colors.success ?? '#2ECC71';
    case 'converted':
      return colors.gold ?? '#ffcd57';
    case 'expired':
      return colors.text.tertiary ?? '#9AA7B2';
    case 'cancelled':
      return '#D81B60';
    default:
      return colors.text.tertiary ?? '#9AA7B2';
  }
}

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeroBanner({ savingsRupees }: { savingsRupees: string | null }) {
  return (
    <View style={styles.hero} accessibilityLabel="Try before you buy">
      <Text style={styles.heroEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'✨'}
      </Text>
      <Text style={styles.heroHeading}>Try before you buy</Text>
      <Text style={styles.heroSubheading}>
        Pay a fraction of the price. Love it? Convert to the full product. Don't? Return within the trial window.
      </Text>
      {savingsRupees !== null ? (
        <View
          style={styles.savingsPill}
          accessibilityLabel={`Average savings per trial: ${savingsRupees}`}
        >
          <Text style={styles.savingsPillText}>{`Avg. save ${savingsRupees}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CategoryChips({
  active,
  onChange,
}: {
  active: TrialCategory;
  onChange: (next: TrialCategory) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      accessibilityLabel="Filter by category"
    >
      {TRIAL_CATEGORIES.map((cat) => {
        const isActive = cat === active;
        return (
          <Pressable
            key={cat}
            accessibilityRole="button"
            accessibilityLabel={`${TRIAL_CATEGORY_LABELS[cat]} category${
              isActive ? ', selected' : ''
            }`}
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              onChange(cat);
            }}
            style={({ pressed }) => [
              styles.chip,
              isActive && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
          >
            <Text
              style={[styles.chipText, isActive && styles.chipTextActive]}
              numberOfLines={1}
            >
              {TRIAL_CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (next: Tab) => void }) {
  return (
    <View style={styles.tabBar} accessibilityLabel="Try module sections">
      {TAB_ORDER.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityLabel={`${TAB_LABELS[tab]} tab${isActive ? ', selected' : ''}`}
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              onChange(tab);
            }}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProductListSkeleton() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="Loading trial products"
      accessibilityRole="progressbar"
    >
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
    </View>
  );
}

function ProductsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel={`Couldn't load trials. ${message}`}
    >
      <Text style={styles.errorEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'⚠️'}
      </Text>
      <Text style={styles.errorTitle}>Couldn't load trials</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading trials"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryBtn,
          pressed && styles.retryBtnPressed,
        ]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function ProductsEmptyState({ category }: { category: TrialCategory }) {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel={`No trials in the ${TRIAL_CATEGORY_LABELS[category]} category right now`}
    >
      <Text style={styles.emptyEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'🌿'}
      </Text>
      <Text style={styles.emptyTitle}>No trials in this category right now</Text>
      <Text style={styles.emptySubtitle}>
        Try a different category or check back tomorrow — new trials drop every week.
      </Text>
    </View>
  );
}

function BundleCard({ bundle }: { bundle: TrialBundle }) {
  const bundleRupees = useMemo(
    () => formatPrice(bundle.bundlePricePaise / 100, 'INR', false) ?? '—',
    [bundle.bundlePricePaise],
  );
  const savingsRupees = useMemo(
    () => formatPrice(bundle.savingsPaise / 100, 'INR', false) ?? '—',
    [bundle.savingsPaise],
  );
  const accessibilityLabel = useMemo(() => {
    return (
      `${bundle.name}. ` +
      `${bundle.productIds.length} products bundled. ` +
      `Bundle price ${bundleRupees}. ` +
      `Save ${savingsRupees}.` +
      (bundle.isLimited ? ' Limited offer.' : '')
    );
  }, [bundle, bundleRupees, savingsRupees]);
  return (
    <View
      style={styles.bundleCard}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.bundleHeader}>
        <Text style={styles.bundleName} numberOfLines={2}>
          {bundle.name}
        </Text>
        {bundle.isLimited ? (
          <View
            style={styles.bundleLimitedBadge}
            accessibilityLabel="Limited time offer"
          >
            <Text style={styles.bundleLimitedText}>LIMITED</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.bundleSub}>
        {`${bundle.productIds.length} products`}
      </Text>
      <View style={styles.bundleFooter}>
        <Text style={styles.bundlePrice}>{bundleRupees}</Text>
        <View style={styles.bundleSavingsPill}>
          <Text style={styles.bundleSavingsText}>{`Save ${savingsRupees}`}</Text>
        </View>
      </View>
      {bundle.expiresAt ? (
        <Text style={styles.bundleExpiry}>
          {`Expires ${formatDate(bundle.expiresAt)}`}
        </Text>
      ) : null}
    </View>
  );
}

function HistoryRow({
  booking,
  product,
  onCancel,
  isCancelling,
}: {
  booking: TrialBooking;
  product: TrialProduct | undefined;
  onCancel: (bookingId: string) => void;
  isCancelling: boolean;
}) {
  const accent = statusColor(booking.status);
  const canCancel = booking.status === 'active';
  return (
    <View
      style={[styles.historyCard, { borderColor: accent }]}
      accessibilityLabel={
        `${product?.name ?? 'Unknown product'} by ${product?.brand ?? 'Unknown brand'}. ` +
        `Booked on ${formatDate(booking.bookedAt)}. ` +
        `Status: ${statusLabel(booking.status)}. ` +
        `Trial ends on ${formatDate(booking.trialEndsAt)}. ` +
        `Used ${booking.coinsUsed} coins.`
      }
    >
      <View style={styles.historyHeader}>
        <Text style={styles.historyName} numberOfLines={2}>
          {product?.name ?? 'Unknown product'}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: accent }]}>
          <Text style={styles.statusPillText}>{statusLabel(booking.status)}</Text>
        </View>
      </View>
      <Text style={styles.historyMeta}>
        {`Booked ${formatDate(booking.bookedAt)} · ends ${formatDate(booking.trialEndsAt)}`}
      </Text>
      <Text style={styles.historyCoins}>
        {`${booking.coinsUsed} coins used`}
      </Text>
      {canCancel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isCancelling
              ? `Cancelling trial of ${product?.name ?? 'product'}`
              : `Cancel trial of ${product?.name ?? 'product'}`
          }
          accessibilityState={{ busy: isCancelling, disabled: isCancelling }}
          onPress={() => {
            onCancel(booking.id);
          }}
          disabled={isCancelling}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && styles.cancelBtnPressed,
            isCancelling && styles.cancelBtnDisabled,
          ]}
        >
          <Text style={styles.cancelBtnText}>
            {isCancelling ? 'Cancelling…' : 'Cancel trial'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HistorySkeleton() {
  return (
    <View accessibilityLabel="Loading trial history" accessibilityRole="progressbar">
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, styles.skeletonShort]} />
      <View style={styles.skeleton} />
    </View>
  );
}

function HistoryEmptyState() {
  return (
    <View
      style={styles.stateWrap}
      accessibilityLabel="No trials yet. Book your first trial from the products tab."
    >
      <Text style={styles.emptyEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {'🌱'}
      </Text>
      <Text style={styles.emptyTitle}>No trials yet</Text>
      <Text style={styles.emptySubtitle}>
        Book your first trial from the products tab — most are ₹49 for a 7-day window.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page body
// ---------------------------------------------------------------------------

function TryPageBody() {
  const showErrorToast = useToastStore((s) => s.showError);
  const showSuccessToast = useToastStore((s) => s.showSuccess);

  const {
    products,
    bundles,
    isLoading: productsLoading,
    isRefreshing: productsRefreshing,
    error: productsError,
    category,
    setCategory,
    refresh: refreshProducts,
  } = useTryProducts();

  const {
    history,
    isLoading: historyLoading,
    isBooking: isMutating,
    isRefreshing: historyRefreshing,
    error: historyError,
    book,
    cancel,
    getHistory: refreshHistory,
  } = useTryBooking();

  const [tab, setTab] = useState<Tab>('products');
  const [bookingProductId, setBookingProductId] = useState<string | null>(null);

  // Products keyed by id so the history view can look up names.
  const productIndex = useMemo(() => {
    const map = new Map<string, TrialProduct>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Average savings hero callout — `(full - trial) / 100` averaged over
  // the current product list. Null when no products.
  const savingsRupees = useMemo(() => {
    if (products.length === 0) return null;
    let total = 0;
    for (const p of products) {
      const delta = p.fullPricePaise - p.trialPricePaise;
      if (delta > 0) total += delta;
    }
    if (total === 0) return null;
    const avgPaise = total / products.length;
    return formatPrice(avgPaise / 100, 'INR', false);
  }, [products]);

  // Pull-to-refresh: re-fetch whichever tab is active.
  const onRefresh = useCallback(async (): Promise<void> => {
    try {
      if (tab === 'history') {
        await refreshHistory();
      } else {
        await refreshProducts();
      }
    } catch (err) {
      logger.error(
        'try_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [tab, refreshHistory, refreshProducts]);

  // Wire up "Try now" CTA. Optimistically reflects in the UI by
  // tracking which product is being booked.
  const handleBook = useCallback(
    async (productId: string): Promise<void> => {
      setBookingProductId(productId);
      try {
        const booking = await book(productId);
        logger.info(
          'try_book_succeeded',
          { productId, bookingId: booking.id, coinsUsed: booking.coinsUsed },
          'B Features',
        );
        try {
          showSuccessToast?.('Trial booked! Check My trials to track it.');
        } catch {
          /* toast is a soft dependency */
        }
        // Auto-switch to history so the user can see their new booking.
        setTab('history');
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'try_book_failed_ui',
          { productId, error: message },
          'B Features',
        );
        try {
          showErrorToast?.(`Couldn't book trial: ${message}`);
        } catch {
          /* toast is a soft dependency */
        }
      } finally {
        setBookingProductId(null);
      }
    },
    [book, showErrorToast, showSuccessToast],
  );

  // Wire up "Cancel trial" CTA from history.
  const handleCancel = useCallback(
    async (bookingId: string): Promise<void> => {
      try {
        await cancel(bookingId);
        try {
          showSuccessToast?.('Trial cancelled.');
        } catch {
          /* toast is a soft dependency */
        }
      } catch (err) {
        const message = errorToString(err);
        try {
          showErrorToast?.(`Couldn't cancel: ${message}`);
        } catch {
          /* toast is a soft dependency */
        }
      }
    },
    [cancel, showErrorToast, showSuccessToast],
  );

  // Log a screen view on focus.
  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Try' }, 'B Features');
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  // Resolve the per-tab content. We do this as separate branches so the
  // loading / error / empty states stay local to each tab.
  let content: React.ReactNode;
  if (tab === 'products') {
    if (productsLoading && products.length === 0) {
      content = <ProductListSkeleton />;
    } else if (productsError !== null && products.length === 0) {
      content = (
        <ProductsErrorState
          message={productsError}
          onRetry={() => {
            refreshProducts().catch(() => {
              /* error already captured above */
            });
          }}
        />
      );
    } else if (products.length === 0) {
      content = <ProductsEmptyState category={category} />;
    } else {
      content = (
        <View>
          {products.map((p) => (
            <TrialProductCard
              key={p.id}
              product={p}
              onBook={(id) => {
                handleBook(id).catch(() => {
                  /* error already captured above */
                });
              }}
              isBooking={isMutating && bookingProductId === p.id}
            />
          ))}
        </View>
      );
    }
  } else if (tab === 'bundles') {
    if (bundles.length === 0) {
      content = (
        <View
          style={styles.stateWrap}
          accessibilityLabel="No bundles right now. Check back later."
        >
          <Text style={styles.emptyEmoji} accessibilityElementsHidden importantForAccessibility="no">
            {'🎁'}
          </Text>
          <Text style={styles.emptyTitle}>No bundles right now</Text>
          <Text style={styles.emptySubtitle}>
            We're curating new bundles — check back later.
          </Text>
        </View>
      );
    } else {
      content = (
        <View>
          {bundles.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </View>
      );
    }
  } else {
    if (historyLoading && history.length === 0) {
      content = <HistorySkeleton />;
    } else if (historyError !== null && history.length === 0) {
      content = (
        <ProductsErrorState
          message={historyError}
          onRetry={() => {
            refreshHistory().catch(() => {
              /* error already captured above */
            });
          }}
        />
      );
    } else if (history.length === 0) {
      content = <HistoryEmptyState />;
    } else {
      content = (
        <View>
          {history.map((h) => (
            <HistoryRow
              key={h.id}
              booking={h}
              product={productIndex.get(h.productId)}
              onCancel={handleCancel}
              isCancelling={isMutating}
            />
          ))}
        </View>
      );
    }
  }

  const isRefreshing =
    tab === 'history' ? historyRefreshing : productsRefreshing;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold}
          colors={[colors.gold]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <HeroBanner savingsRupees={savingsRupees} />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'products' ? (
        <CategoryChips active={category} onChange={setCategory} />
      ) : null}
      {content}
      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

function TryPage() {
  return (
    <FeatureFlagGate flag="b.try">
      <View style={styles.container}>
        <TryPageBody />
      </View>
    </FeatureFlagGate>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'] ?? spacing.xl,
    flexGrow: 1,
  },
  hero: {
    borderRadius: borderRadius.lg ?? 16,
    backgroundColor: colors.background.secondary,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default ?? '#E8DCC4',
  },
  heroEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  heroHeading: {
    ...typography.h2,
    color: colors.nileBlue,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroSubheading: {
    ...typography.body,
    color: colors.text.secondary,
  },
  savingsPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.gold,
  },
  savingsPillText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md ?? 12,
    padding: 4,
    marginBottom: spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm ?? 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.nileBlue,
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabText: {
    ...typography.label,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  chipRow: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.base,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default ?? '#E8DCC4',
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...typography.label,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.nileBlue,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  skeleton: {
    width: '100%',
    height: 96,
    borderRadius: borderRadius.md ?? 12,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.base,
  },
  skeletonShort: {
    height: 72,
    width: '85%',
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: spacing.base,
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
    borderRadius: borderRadius.md ?? 12,
  },
  retryBtnPressed: {
    opacity: 0.8,
  },
  retryText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '700',
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
  bundleCard: {
    borderRadius: borderRadius.lg ?? 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  bundleName: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '800',
    flex: 1,
    marginRight: spacing.sm,
  },
  bundleLimitedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.gold,
  },
  bundleLimitedText: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bundleSub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  bundleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bundlePrice: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  bundleSavingsPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.success ?? '#2ECC71',
  },
  bundleSavingsText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bundleExpiry: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  historyCard: {
    borderRadius: borderRadius.lg ?? 16,
    borderWidth: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyName: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 999,
  },
  statusPillText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  historyMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  historyCoins: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md ?? 12,
    borderWidth: 1,
    borderColor: '#D81B60',
    alignItems: 'center',
  },
  cancelBtnPressed: {
    opacity: 0.85,
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    ...typography.label,
    color: '#D81B60',
    fontWeight: '800',
  },
  footerSpacer: {
    height: spacing.lg,
  },
});

export default withErrorBoundary(TryPage, 'Try');
