/**
 * /b/savings — main Savings Dashboard screen.
 *
 * Renders the dashboard with pull-to-refresh handled inside SavingsDashboard.
 * Wrapped in `withErrorBoundary` so a runtime error here never takes down
 * the rest of the app.
 *
 * Screen-view telemetry is logged via `logger.info` on focus.
 */
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import SavingsDashboard from '@/components/b/savings/SavingsDashboard';
import {
  useSavingsDashboard,
  useSavingsActions,
} from '@/stores/selectors';
import logger from '@/utils/logger';

function SavingsIndexScreen() {
  const dashboard = useSavingsDashboard();
  const actions = useSavingsActions();

  const refresh = useCallback(async () => {
    try {
      const {
        fetchDashboard,
        fetchGoals,
        fetchRecommendations,
      } = actions as {
        fetchDashboard?: () => Promise<void>;
        fetchGoals?: () => Promise<void>;
        fetchRecommendations?: () => Promise<void>;
      };
      await Promise.all([
        typeof fetchDashboard === 'function' ? fetchDashboard.call(actions) : undefined,
        typeof fetchGoals === 'function' ? fetchGoals.call(actions) : undefined,
        typeof fetchRecommendations === 'function'
          ? fetchRecommendations.call(actions)
          : undefined,
      ]);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <SavingsDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

export default withErrorBoundary(SavingsIndexScreen, 'Savings Dashboard');
