/**
 * /b/wallet/rez-cash — the dedicated "REZ Cash" page (Phase 3.4).
 *
 * REZ Cash is the "lifetime savings" framing of a user's wallet activity:
 * a single hero number ("You've saved ₹X with REZ since you joined") plus
 * three smaller stat tiles and an explainer section.
 *
 * Layout
 * ------
 *   1. Header bar (back button + title).
 *   2. <RezCashDisplay>        — the big hero number.
 *   3. Stat tile row           — this month / this year / projected year-end.
 *   4. "How REZ Cash works"    — three short explainer bullets.
 *   5. "Ways to earn more"     — three short explainer bullets.
 *   6. "Compare to friends"    — comparison vs the average REZ user.
 *
 * Lifecycle
 * ---------
 *   - `useRezCash()` reads from `useWalletStore` directly — no backend
 *     round-trip is required, the wallet store is hydrated on app start.
 *   - Pull-to-refresh calls `useWalletStore.getState().refreshWallet()`
 *     so the page is reactive to any newly-arrived transactions.
 *   - Screen-view telemetry fires on focus via `useFocusEffect`.
 *
 * Wrapped in `withErrorBoundary(RezCashPage, 'REZ Cash')` and gated by
 * `<FeatureFlagGate flag="b.rezCash">` so the whole page disappears when
 * the migration flag is disabled.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { SkeletonLoader } from '@/components/skeletons';
import { useRezCash } from '@/hooks/b/wallet/useRezCash';
import { useWalletStore } from '@/stores/walletStore';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import logger from '@/utils/logger';
import RezCashDisplay from '@/components/b/wallet/RezCashDisplay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort paise → display string. Returns `'—'` when the value is
 * zero so the stat tile shows a clean em-dash instead of `₹0`.
 */
function formatPaise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rupees = value / 100;
  const formatted = formatPrice(rupees, 'INR', false);
  if (formatted === null) return '—';
  if (rupees === 0) return '—';
  return formatted;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
}

function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <View
      style={styles.tile}
      accessibilityLabel={`${label}: ${value}${hint ? '. ' + hint : ''}`}
    >
      <Text style={styles.tileLabel} allowFontScaling={false}>
        {label}
      </Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.tileHint} allowFontScaling={false}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function ExplainCard({
  title,
  bullets,
}: {
  title: string;
  bullets: string[];
}) {
  return (
    <View
      style={styles.explainCard}
      accessibilityLabel={`${title}. ${bullets.join('. ')}`}
    >
      <Text style={styles.explainTitle} allowFontScaling={false}>
        {title}
      </Text>
      {bullets.map((bullet) => (
        <View key={bullet} style={styles.bulletRow}>
          <Text style={styles.bulletDot} allowFontScaling={false}>
            •
          </Text>
          <Text style={styles.bulletText} allowFontScaling>
            {bullet}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RezCashSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeleton}
      accessibilityLabel="Loading REZ Cash"
      accessibilityRole="progressbar"
    >
      <SkeletonLoader
        width={'100%'}
        height={180}
        borderRadius={borderRadius.xl}
        style={styles.skelHero}
      />
      <View style={styles.skelTileRow}>
        <SkeletonLoader
          width={'31%'}
          height={80}
          borderRadius={borderRadius.md}
        />
        <SkeletonLoader
          width={'31%'}
          height={80}
          borderRadius={borderRadius.md}
        />
        <SkeletonLoader
          width={'31%'}
          height={80}
          borderRadius={borderRadius.md}
        />
      </View>
      <SkeletonLoader
        width={'100%'}
        height={120}
        borderRadius={borderRadius.md}
        style={styles.skelExplain}
      />
      <SkeletonLoader
        width={'100%'}
        height={120}
        borderRadius={borderRadius.md}
        style={styles.skelExplain}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function RezCashPage(): React.ReactElement {
  const router = useRouter();
  const rezCash = useRezCash();
  const isRefreshing = useWalletStore((s) => s.isRefreshing);
  const isLoading = useWalletStore((s) => s.isLoading);

  // Screen-view telemetry on focus.
  useFocusEffect(
    useCallback(() => {
      try {
        logger.info('screen_view', { screen: 'REZ Cash' }, 'B Features');
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    try {
      const refresh = useWalletStore.getState().refreshWallet;
      if (typeof refresh === 'function') {
        await refresh.call(useWalletStore.getState());
      }
    } catch (err) {
      logger.error(
        'rez_cash_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, []);

  // The wallet store hydrates on app start, so the "loading" state is
  // only true on the very first session — fall back to a skeleton.
  const showSkeleton = isLoading && rezCash.lifetimeSavingsPaise === 0;

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
        <Text style={styles.headerTitle}>REZ Cash</Text>
        <View style={styles.headerSpacer} />
      </View>

      {showSkeleton ? (
        <RezCashSkeleton />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
        >
          <View style={styles.heroWrap}>
            <RezCashDisplay
              lifetimeSavingsPaise={rezCash.lifetimeSavingsPaise}
              memberSinceDate={rezCash.memberSinceDate}
              comparisonToAvgUserPct={rezCash.comparisonToAvgUserPct}
            />
          </View>

          <View style={styles.tileRow}>
            <StatTile
              label="This month"
              value={formatPaise(rezCash.thisMonthSavingsPaise)}
              hint="Cashback earned"
            />
            <StatTile
              label="This year"
              value={formatPaise(rezCash.thisYearSavingsPaise)}
              hint="YTD"
            />
            <StatTile
              label="Projected"
              value={formatPaise(rezCash.projectedYearEndSavingsPaise)}
              hint="By year-end"
            />
          </View>

          {rezCash.topCategory ? (
            <View style={styles.topCategoryPill} accessibilityLabel={`Top category ${rezCash.topCategory}`}>
              <Text style={styles.topCategoryText} allowFontScaling={false}>
                Your biggest saver: {rezCash.topCategory}
              </Text>
            </View>
          ) : null}

          <ExplainCard
            title="How REZ Cash works"
            bullets={[
              'Every rupee you save on a partner purchase is added to your REZ Cash total.',
              'Cashback, loyalty credits, and exclusive offer discounts all count.',
              'Your number never goes down — REZ Cash is a lifetime counter.',
            ]}
          />

          <ExplainCard
            title="Ways to earn more"
            bullets={[
              'Browse the offers tab for boosted cashback at merchants you shop at.',
              'Maintain your daily streak to unlock streak-only bonus cashback.',
              'Refer a friend — you both get a credit when they make their first REZ purchase.',
            ]}
          />

          <Text style={styles.footnote} allowFontScaling={false}>
            REZ Cash is informational only — it's a celebration of your savings,
            not a redeemable balance. Earned coins are visible in your wallet.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Gated + error-bounded export
// ---------------------------------------------------------------------------

function RezCashPageGated(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.rezCash">
      <RezCashPage />
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
    width: 64,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  heroWrap: {
    marginBottom: spacing.base,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tileLabel: {
    ...typography.overline,
    color: colors.text.secondary,
  },
  tileValue: {
    ...typography.h3,
    color: colors.nileBlue,
    marginTop: spacing.xs,
  },
  tileHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  topCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.lavender,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.base,
  },
  topCategoryText: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  explainCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.base,
  },
  explainTitle: {
    ...typography.h4,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  bulletDot: {
    ...typography.body,
    color: colors.gold,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  bulletText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  footnote: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Skeleton styles
  skeleton: {
    flex: 1,
    padding: spacing.base,
  },
  skelHero: {
    marginBottom: spacing.base,
  },
  skelTileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  skelExplain: {
    marginBottom: spacing.base,
  },
});

export default withErrorBoundary(RezCashPageGated, 'REZ Cash');