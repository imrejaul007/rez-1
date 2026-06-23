/**
 * /b/savings — main Savings Dashboard screen.
 *
 * Renders the dashboard inside a `<ScrollView>` with pull-to-refresh.
 * Wrapped in `withErrorBoundary` so a runtime error here never takes down
 * the rest of the app.
 *
 * Screen-view telemetry is logged via `logger.info` on focus.
 */
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import SavingsDashboard from '@/components/b/savings/SavingsDashboard';
import {
  useSavingsDashboard,
  useSavingsLoading,
  useSavingsActions,
} from '@/stores/selectors';
import logger from '@/utils/logger';

function SavingsIndexScreen() {
  const dashboard = useSavingsDashboard();
  const isLoading = useSavingsLoading();
  const actions = useSavingsActions();

  const refresh = useCallback(async () => {
    try {
      const fetcher = (actions as { fetchDashboard?: () => Promise<void> })
        .fetchDashboard;
      if (typeof fetcher === 'function') {
        await fetcher.call(actions);
      }
    } catch (err) {
      logger.error(
        'savings_index_refresh_failed',
        err instanceof Error ? err : new Error(String(err)),
        'B Features',
      );
    }
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Savings' }, 'B Features');
      // Lazy-load on focus if dashboard is missing
      if (dashboard === null) {
        refresh().catch(() => {
          /* logged above */
        });
      }
      return () => {
        /* nothing to clean up */
      };
    }, [dashboard, refresh]),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SavingsDashboard />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default withErrorBoundary(SavingsIndexScreen, 'Savings Dashboard');
