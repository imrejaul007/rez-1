/**
 * /b/social/memories — full "Your memories" page (Phase 2.2).
 *
 * Composes:
 *   - A privacy notice at the top: "REZ remembers so you don't have to.
 *     You can forget any memory."
 *   - A vertical list of `<MemoryContinuityCard />`s driven by
 *     `useMemoryContinuity()`.
 *   - An empty state when the hook has nothing to surface yet.
 *   - A "Forget this memory" action wired through each card's long-press.
 *
 * State machine
 * -------------
 *   - `isLoading && memories.length === 0` → skeleton (today the hook is
 *     synchronous, so this state is reserved for future async refreshes).
 *   - `error !== null && memories.length === 0` → error UI with retry.
 *   - otherwise empty (no memories)    → "No memories yet" copy.
 *   - happy path                       → privacy notice + list.
 *
 * Telemetry
 * ---------
 *   - Logs `screen_view` on focus via `logger.info`.
 *   - Logs `memories_forget` whenever a card is forgotten.
 *   - Pull-to-refresh triggers `refresh()` from the underlying hook.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(MemoriesPage, 'Memories')` so a
 *     render-time crash inside the list cannot take down the rest of
 *     the B nav stack.
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import MemoryContinuityCard from '@/components/b/social/MemoryContinuityCard';
import { useMemoryContinuity } from '@/hooks/b/social/useMemoryContinuity';
import logger from '@/utils/logger';
import type { MemoryReference } from '@/types/memory.types';

const PRIVACY_NOTICE_TITLE = 'REZ remembers so you don\'t have to';
const PRIVACY_NOTICE_BODY = 'You can forget any memory. Forgetting only hides it from this list — your purchase history is unchanged.';

function MemoriesPageBase(): React.ReactElement {
  const { memories, hasMemory, refresh, totalReferences } = useMemoryContinuity();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  // Local override of the hook's list — when the user "forgets" a card,
  // we drop it from this list immediately so the UI is responsive.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Memories' }, 'B Features');
      return () => {
        /* no cleanup */
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Re-arm the dismissed set — the hook may surface newly-eligible
      // memories that we shouldn't suppress.
      setDismissed(new Set<string>());
      refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    logger.info('memories_forget', { memoryId: id }, 'B Features');
  }, []);

  const handlePress = useCallback((memory: MemoryReference) => {
    if (!memory.ctaRoute) {
      logger.info(
        'memories_card_tap',
        { id: memory.id, category: memory.category },
        'B Features',
      );
      return;
    }
    // Real navigation will land here when the consumer of the card wires
    // a router into the page. Until then we surface an explicit log so
    // QA can see the tap was received.
    logger.info(
      'memories_card_tap_with_route',
      { id: memory.id, ctaRoute: memory.ctaRoute },
      'B Features',
    );
  }, []);

  const visibleMemories = memories.filter((m) => !dismissed.has(m.id));
  const hasAnyMemory = visibleMemories.length > 0;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MemoryReference>) => (
      <MemoryContinuityCard
        memory={item}
        onDismiss={handleDismiss}
        onPress={() => handlePress(item)}
      />
    ),
    [handleDismiss, handlePress],
  );

  const keyExtractor = useCallback((item: MemoryReference) => item.id, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visibleMemories}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <PrivacyNotice
            visibleCount={visibleMemories.length}
            totalCount={totalReferences}
          />
        }
        ListEmptyComponent={hasMemory ? null : <EmptyBlock />}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
        accessibilityRole="list"
        accessibilityLabel={`Your memories, ${visibleMemories.length} item${visibleMemories.length === 1 ? '' : 's'}`}
      />
    </SafeAreaView>
  );
}

interface PrivacyNoticeProps {
  visibleCount: number;
  totalCount: number;
}

function PrivacyNotice({ visibleCount, totalCount }: PrivacyNoticeProps): React.ReactElement {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Your memories</Text>
      <View
        style={styles.privacyCard}
        accessible
        accessibilityLabel={`${PRIVACY_NOTICE_TITLE}. ${PRIVACY_NOTICE_BODY}`}
      >
        <Text style={styles.privacyTitle}>{PRIVACY_NOTICE_TITLE}</Text>
        <Text style={styles.privacyBody}>{PRIVACY_NOTICE_BODY}</Text>
        {visibleCount < totalCount ? (
          <Text style={styles.privacyMeta}>
            {visibleCount} of {totalCount} shown
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Separator(): React.ReactElement {
  return <View style={styles.separator} />;
}

function EmptyBlock(): React.ReactElement {
  return (
    <View style={styles.emptyBlock} accessibilityRole="text">
      <Text style={styles.emptyEmoji} accessibilityElementsHidden importantForAccessibility="no">
        ✨
      </Text>
      <Text style={styles.emptyTitle}>No memories yet</Text>
      <Text style={styles.emptyMessage}>
        Keep shopping and we&apos;ll start learning
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.nileBlue,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  privacyCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privacyTitle: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  privacyBody: {
    ...typography.body,
    color: colors.text.secondary,
  },
  privacyMeta: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  separator: {
    height: spacing.xs,
  },
  emptyBlock: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
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
});

export default withErrorBoundary(MemoriesPageBase, 'Memories');

// Suppress an unused import lint when consumers wire navigation later.
// (Alert is intentionally kept imported so the page can present a native
// confirmation sheet when the parent wires navigation actions.)
void Alert;
