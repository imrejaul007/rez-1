// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Polls Page
// Vote in polls to earn coins

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import pollApi, { Poll, PollOption, PollVoteHistory } from '@/services/pollApi';
import { platformAlert } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';

type TabType = 'active' | 'history';

function PollsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [dailyPoll, setDailyPoll] = useState<Poll | null>(null);
  const [voteHistory, setVoteHistory] = useState<PollVoteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activePollsRes, dailyPollRes] = await Promise.all([
        pollApi.getActivePolls(1, 50),
        pollApi.getDailyPoll(),
      ]);

      if (activePollsRes.success && activePollsRes.data) {
        if (!isMounted()) return;
        setPolls(activePollsRes.data.polls);
      }
      if (dailyPollRes.success && dailyPollRes.data) {
        if (!isMounted()) return;
        setDailyPoll(dailyPollRes.data.poll);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const result = await pollApi.getMyVotes(1, 50);
      if (result.success && result.data) {
        setVoteHistory(result.data.votes);
      }
    } catch (error) {
      // silently handle
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'history') {
      fetchHistory();
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId);
    try {
      const result = await pollApi.vote(pollId, optionId);
      if (result.success && result.data) {
        const coins = result.data.coinReward?.coinsAwarded;

        // Update local state optimistically
        setPolls(prev => prev.map(p => {
          if (p.id === pollId) {
            return {
              ...p,
              hasVoted: true,
              userVote: optionId,
              totalVotes: result.data!.totalVotes,
              options: result.data!.options,
            };
          }
          return p;
        }));

        if (dailyPoll && dailyPoll.id === pollId) {
          setDailyPoll(prev => prev ? {
            ...prev,
            hasVoted: true,
            userVote: optionId,
            totalVotes: result.data!.totalVotes,
            options: result.data!.options,
          } : null);
        }

        if (coins) {
          platformAlert('Vote Recorded!', `You earned ${coins} coins for voting!`);
        }
      } else {
        platformAlert('Vote Failed', result.error || 'Could not record your vote.');
      }
    } catch (error: any) {
      platformAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setVotingPollId(null);
    }
  };

  const getTimeRemaining = (endsAt: string): string => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    }
    return `${hours}h ${mins}m left`;
  };

  const getVotePercentage = (option: PollOption, totalVotes: number): number => {
    if (totalVotes === 0) return 0;
    return Math.round((option.voteCount / totalVotes) * 100);
  };

  const renderPollCard = (poll: Poll, isDaily: boolean = false) => {
    const isVoting = votingPollId === poll.id;

    return (
      <View key={poll.id} style={[styles.pollCard, isDaily && styles.dailyPollCard]}>
        {/* Header */}
        <View style={styles.pollHeader}>
          <View style={styles.pollHeaderLeft}>
            {isDaily && (
              <View style={styles.dailyBadge}>
                <Ionicons name="star" size={12} color={colors.background.primary} />
                <ThemedText style={styles.dailyBadgeText}>Daily Poll</ThemedText>
              </View>
            )}
            <ThemedText style={styles.pollTitle}>{poll.title}</ThemedText>
            {poll.description ? (
              <ThemedText style={styles.pollDescription}>{poll.description}</ThemedText>
            ) : null}
          </View>
          <View style={styles.coinBadge}>
            <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 14, height: 14 }} />
            <ThemedText style={styles.coinBadgeText}>{poll.coinsPerVote}</ThemedText>
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {poll.options.map((option) => {
            const pct = getVotePercentage(option, poll.totalVotes);
            const isSelected = poll.userVote === option.id;

            return (
              <Pressable
                key={option.id}
                style={[
                  styles.optionButton,
                  poll.hasVoted && styles.optionVoted,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => !poll.hasVoted && !isVoting && handleVote(poll.id, option.id)}
                disabled={poll.hasVoted || isVoting}
               
              >
                {/* Progress bar background */}
                {poll.hasVoted && (
                  <View style={[styles.optionProgress, { width: `${pct}%` }]} />
                )}

                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    {poll.hasVoted ? (
                      isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color={Colors.text.tertiary} />
                      )
                    ) : (
                      <Ionicons name="radio-button-off" size={20} color={Colors.text.tertiary} />
                    )}
                    <ThemedText style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                      {option.text}
                    </ThemedText>
                  </View>

                  {poll.hasVoted && (
                    <ThemedText style={styles.optionPct}>{pct}%</ThemedText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.pollFooter}>
          <ThemedText style={styles.pollVotes}>
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={styles.pollTime}>
            {getTimeRemaining(poll.endsAt)}
          </ThemedText>
        </View>

        {isVoting && (
          <View style={styles.votingOverlay}>
            <ActivityIndicator size="small" color={Colors.primary[600]} />
            <ThemedText style={styles.votingText}>Recording vote...</ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderVoteHistoryItem = useCallback(({ item }: { item: PollVoteHistory }) => {
    if (!item.poll) return null;
    const selectedOption = item.poll.options.find(o => o.id === item.optionId);

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <ThemedText style={styles.historyTitle}>{item.poll.title}</ThemedText>
          {item.coinsAwarded > 0 && (
            <View style={styles.coinBadge}>
              <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 12, height: 12 }} />
              <ThemedText style={styles.coinBadgeText}>+{item.coinsAwarded}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.historyVote}>
          Your vote: {selectedOption?.text || 'Unknown option'}
        </ThemedText>
        <ThemedText style={styles.historyDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Vote in Polls</ThemedText>
          <View style={styles.headerRight}>
            <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 18, height: 18 }} />
            <ThemedText style={styles.headerCoins}>{BRAND.COIN_SHORT}/vote</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['active', 'history'] as TabType[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? 'Active Polls' : 'My Votes'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <CardGridSkeleton />
      ) : activeTab === 'active' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Daily Poll */}
          {dailyPoll && renderPollCard(dailyPoll, true)}

          {/* Regular Polls */}
          {polls.filter(p => !p.isDaily || p.id !== dailyPoll?.id).map(poll => renderPollCard(poll))}

          {/* Empty State */}
          {polls.length === 0 && !dailyPoll && (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={64} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyTitle}>No Active Polls</ThemedText>
              <ThemedText style={styles.emptyText}>
                Check back later for new polls to vote on and earn coins!
              </ThemedText>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlashList
          data={voteHistory}
          renderItem={renderVoteHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.contentContainer}
          estimatedItemSize={80}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="hand-left-outline" size={64} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyTitle}>No Votes Yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                Vote on active polls to see your history here.
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerCoins: {
    ...Typography.label,
    color: Colors.gold,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    ...Shadows.subtle,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary[600],
  },
  tabText: {
    ...Typography.label,
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  pollCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
    position: 'relative',
    overflow: 'hidden',
  },
  dailyPollCard: {
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pollHeaderLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  dailyBadgeText: {
    ...Typography.caption,
    color: colors.background.primary,
    fontWeight: '700',
  },
  pollTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  pollDescription: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  coinBadgeText: {
    ...Typography.label,
    color: Colors.gold,
    fontSize: 12,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  optionVoted: {
    borderColor: Colors.gray[200],
  },
  optionSelected: {
    borderColor: Colors.primary[600],
    borderWidth: 2,
  },
  optionProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.primary[50],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  optionText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: Colors.primary[600],
  },
  optionPct: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollVotes: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  pollTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  votingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  votingText: {
    ...Typography.label,
    color: Colors.primary[600],
  },
  historyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  historyTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
  },
  historyVote: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  historyDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

export default withErrorBoundary(PollsPage, 'EarnPolls');
