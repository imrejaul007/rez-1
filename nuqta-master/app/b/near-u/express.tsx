/**
 * /b/near-u/express — express delivery sub-page (Phase 2.3).
 *
 * Pre-locked to the `express` vertical. The server already sorts the
 * express feed by ascending ETA, so the page also exposes a client-side
 * "Under 15 min" filter to let users dial it tighter without forcing a
 * new request.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(NearUExpress, 'Near-U Express')` so
 *     a render-time crash cannot take down the rest of the B nav stack.
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
import NearUStoreCard from '@/components/b/nearU/NearUStoreCard';
import { SkeletonLoader } from '@/components/skeletons';
import {
  useNearUStores,
  type NearUStore,
} from '@/hooks/b/nearU/useNearUStores';
import logger from '@/utils/logger';

function NearUExpressBase(): React.ReactElement {
  const router = useRouter();
  const { stores, isLoading, error, refresh } = useNearUStores('express');
  const [underFifteen, setUnderFifteen] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      logger.info(
        'screen_view',
        { screen: 'Near-U Express', underFifteen },
        'B Features',
      );
      return () => {
        /* no cleanup */
      };
    }, [underFifteen]),
  );

  const filteredStores = useMemo<NearUStore[]>(() => {
    if (!underFifteen) return stores;
    return stores.filter((s) => s.etaMinutes > 0 && s.etaMinutes <= 15);
  }, [stores, underFifteen]);

  const onRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      logger.warn(
        'b_nearu_express_refresh_failed',
        { error: err instanceof Error ? err.message : String(err) },
        'B Features',
      );
    }
  }, [refresh]);

  const handleStorePress = useCallback((store: NearUStore): void => {
    logger.info(
      'b_nearu_express_store_press',
      { id: store.id },
      'B Features',
    );
  }, []);

  const showSkeleton = isLoading && stores.length === 0;
  const showError = error !== null && stores.length === 0;
  const showEmpty = !showSkeleton && !showError && filteredStores.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.push('/b/near-u' as const);
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{'‹ Near-U'}</Text>
        </Pressable>
        <Text style={styles.title}>Express delivery</Text>
        <Text style={styles.subtitle}>
          Quick handoffs from nearby stores — fastest ETA first
        </Text>
      </View>

      <View style={styles.chipsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter: Under 15 minutes ETA"
          accessibilityState={{ selected: underFifteen }}
          onPress={() => setUnderFifteen((v) => !v)}
          style={({ pressed }) => [
            styles.chip,
            underFifteen && styles.chipActive,
            pressed && styles.chipPressed,
          ]}
        >
          <Text
            style={[styles.chipText, underFifteen && styles.chipTextActive]}
          >
            Under 15 min
          </Text>
        </Pressable>
      </View>

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
        ListEmptyComponent={showSkeleton ? <NearUExpressSkeleton /> : null}
        showsVerticalScrollIndicator={false}
      />

      {showError ? (
        <View style={styles.errorBlock} accessibilityRole="alert">
          <Text style={styles.errorTitle}>
            Couldn&apos;t load express delivery
          </Text>
          <Text style={styles.errorMessage}>
            {error ?? 'Something went wrong while loading the list.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading express delivery"
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
          <Text style={styles.emptyTitle}>
            No express delivery available nearby
          </Text>
          <Text style={styles.emptyMessage}>
            Try clearing the ETA filter or pull to refresh.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function NearUExpressSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeletonWrap}
      accessibilityLabel="Loading express delivery"
      accessibilityRole="progressbar"
    >
      {[0, 1, 2].map((i) => (
        <View key={`express-skel-${i}`} style={styles.skeletonCard}>
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

const NearUExpress = withErrorBoundary(NearUExpressBase, 'Near-U Express');
export default NearUExpress;
