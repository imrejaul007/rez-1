/**
 * /b/coin-expiry — standalone "Coins expiring soon" page.
 *
 * Renders the `<CoinExpiryList />` with a hand-rolled header and an
 * explicit empty state ("No coins expiring soon 🎉"). The list itself
 * renders `null` when there's nothing to show — that's why the empty
 * state is duplicated here as a sibling (it carries the celebratory copy).
 *
 * Wrapped in `withErrorBoundary(CoinExpiryIndex, 'Coin Expiry')` so a
 * crash inside the list never takes down the rest of the B nav stack.
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import CoinExpiryList from '@/components/b/wallet/CoinExpiryList';
import { useCoinExpiry } from '@/hooks/b/wallet/useCoinExpiry';
import { colors, spacing, typography } from '@/constants/theme';
import logger from '@/utils/logger';

function CoinExpiryIndex(): React.ReactElement {
  const router = useRouter();
  const { notices, totalExpiringPaise } = useCoinExpiry();

  // Soft-imported logger — keep the screen-view log optional so a missing
  // analytics dep never breaks the page.
  useEffect(() => {
    try {
      logger.info(
        'screen_view',
        { screen: 'Coin Expiry' },
        'B Features',
      );
    } catch {
      /* logger is a soft dependency */
    }
  }, []);

  // Refresh focus logging — fires every time the user lands on this page.
  useFocusEffect(
    React.useCallback(() => {
      try {
        logger.info(
          'coin_expiry_focus',
          { noticesCount: notices.length, totalExpiringPaise },
          'B Features',
        );
      } catch {
        /* noop */
      }
      return () => {
        /* nothing to clean up */
      };
    }, [notices.length, totalExpiringPaise]),
  );

  const isEmpty = notices.length === 0;

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
        <Text style={styles.headerTitle}>Coins expiring soon</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View
            style={styles.emptyWrap}
            accessibilityLabel="No coins expiring soon"
          >
            <Text style={styles.emptyTitle}>No coins expiring soon 🎉</Text>
            <Text style={styles.emptySub}>
              All your coins are safe for the next 30 days.
            </Text>
          </View>
        ) : (
          <CoinExpiryList />
        )}
      </ScrollView>
    </SafeAreaView>
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
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.nileBlue,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(CoinExpiryIndex, 'Coin Expiry');