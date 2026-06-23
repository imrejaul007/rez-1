/**
 * /b/karma — Karma home (Phase 4.2 of the REZ-vs-NUQTA migration).
 *
 * Three tabs:
 *   - "My Karma"      — profile card + leaderboard preview
 *   - "Missions"      — 3 active missions
 *   - "Communities"   — list of karma communities (mocked locally for now)
 *
 * Wrapped in:
 *   - `FeatureFlagGate flag="b.karma"` — page disappears if the feature
 *     is disabled by `subscriptionStore.featureFlags['b.karma']`.
 *   - `withErrorBoundary(KarmaPage, 'Karma')` — a runtime crash here
 *     never takes down the rest of the B nav stack.
 *
 * Telemetry
 * ---------
 *   - `screen_view` is logged on every focus.
 *   - The hook layer emits its own `karma_*` log lines; the page just
 *     observes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import KarmaProfileCard from '@/components/b/karma/KarmaProfileCard';
import KarmaMissionCard from '@/components/b/karma/KarmaMissionCard';
import { useKarmaProfile } from '@/hooks/b/karma/useKarmaProfile';
import { useKarmaMissions } from '@/hooks/b/karma/useKarmaMissions';
import { useKarmaLeaderboard } from '@/hooks/b/karma/useKarmaLeaderboard';
import type { KarmaCommunity } from '@/types/karma.types';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Local fixtures
// ---------------------------------------------------------------------------

/**
 * Communities are mocked locally for the Phase 4.2 stub. A future
 * iteration will move these behind `GET /api/b/karma/communities` with
 * its own hook (mirroring the missions / leaderboard shape).
 */
const FIXTURE_COMMUNITIES: ReadonlyArray<KarmaCommunity> = [
  {
    id: 'c_green_koramangala',
    name: 'Green Koramangala',
    slug: 'green-koramangala',
    memberCount: 1284,
    karmaThisWeek: 18420,
    iconEmoji: '🌳',
    isJoined: true,
  },
  {
    id: 'c_health_indiranagar',
    name: 'Health Indiranagar',
    slug: 'health-indiranagar',
    memberCount: 612,
    karmaThisWeek: 9320,
    iconEmoji: '💪',
    isJoined: false,
  },
  {
    id: 'c_tutors_btm',
    name: 'BTM Tutors',
    slug: 'btm-tutors',
    memberCount: 432,
    karmaThisWeek: 7140,
    iconEmoji: '📚',
    isJoined: false,
  },
  {
    id: 'c_civic_hsr',
    name: 'HSR Civic Circle',
    slug: 'hsr-civic-circle',
    memberCount: 805,
    karmaThisWeek: 12560,
    iconEmoji: '🏘️',
    isJoined: true,
  },
  {
    id: 'c_mentors_all',
    name: 'Mentors Network',
    slug: 'mentors-network',
    memberCount: 2104,
    karmaThisWeek: 24180,
    iconEmoji: '🧑‍🏫',
    isJoined: false,
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'me' | 'missions' | 'communities';

interface TabDef {
  key: TabKey;
  label: string;
  emoji: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { key: 'me', label: 'My Karma', emoji: '🪷' },
  { key: 'missions', label: 'Missions', emoji: '🎯' },
  { key: 'communities', label: 'Communities', emoji: '🏘️' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  style?: object;
}

function SkeletonBlock({
  width = '100%',
  height = 16,
  style,
}: SkeletonBlockProps): React.ReactElement {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.border.light,
        },
        style,
      ]}
    />
  );
}

function KarmaSkeleton(): React.ReactElement {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading karma data">
      <SkeletonBlock height={170} style={styles.skeletonSpace} />
      <SkeletonBlock height={120} style={styles.skeletonSpace} />
      <SkeletonBlock height={80} style={styles.skeletonSpace} />
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <View style={styles.errorWrap} accessibilityLabel="Karma data error">
      <Text style={styles.errorEmoji}>😕</Text>
      <Text style={styles.errorTitle}>Couldn't load karma</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading karma"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

interface TabBarProps {
  active: TabKey;
  onSelect: (key: TabKey) => void;
}

function TabBar({ active, onSelect }: TabBarProps): React.ReactElement {
  return (
    <View style={styles.tabBar} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab`}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface CommunityRowProps {
  community: KarmaCommunity;
  onPress: (slug: string) => void;
}

function CommunityRow({ community, onPress }: CommunityRowProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${community.name} community, ${community.memberCount} members, ${community.karmaThisWeek} karma this week`}
      onPress={() => onPress(community.slug)}
      style={({ pressed }) => [
        styles.communityRow,
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={styles.communityEmoji}>{community.iconEmoji}</Text>
      <View style={styles.communityBody}>
        <View style={styles.communityHeaderRow}>
          <Text style={styles.communityName}>{community.name}</Text>
          {community.isJoined ? (
            <View style={styles.joinedPill}>
              <Text style={styles.joinedPillText}>Joined</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.communityMeta}>
          {community.memberCount.toLocaleString()} members · {community.karmaThisWeek.toLocaleString()} karma this week
        </Text>
      </View>
      <Text style={styles.communityChevron}>›</Text>
    </Pressable>
  );
}

interface LeaderboardRowProps {
  rank: number;
  userName: string;
  totalKarma: number;
  level: string;
  isCurrentUser: boolean;
}

function LeaderboardRow({
  rank,
  userName,
  totalKarma,
  level,
  isCurrentUser,
}: LeaderboardRowProps): React.ReactElement {
  return (
    <View
      style={[styles.lbRow, isCurrentUser && styles.lbRowCurrent]}
      accessible
      accessibilityLabel={`Rank ${rank}, ${userName}, ${totalKarma} karma, level ${level}${isCurrentUser ? ', this is you' : ''}`}
    >
      <Text style={[styles.lbRank, isCurrentUser && styles.lbRankCurrent]}>
        {rank}
      </Text>
      <View style={styles.lbBody}>
        <Text
          style={[styles.lbName, isCurrentUser && styles.lbNameCurrent]}
          numberOfLines={1}
        >
          {userName}
        </Text>
        <Text style={styles.lbLevel}>Level {level}</Text>
      </View>
      <Text
        style={[styles.lbKarma, isCurrentUser && styles.lbKarmaCurrent]}
      >
        {totalKarma.toLocaleString()}
      </Text>
    </View>
  );
}

interface LeaderboardPreviewProps {
  entries: ReadonlyArray<{
    rank: number;
    userId: string;
    userName: string;
    totalKarma: number;
    level: string;
    isCurrentUser: boolean;
  }>;
  userRank: number | null;
}

/** Top-3 leaderboard preview shown under the profile on the "My Karma" tab. */
function LeaderboardPreview({
  entries,
  userRank,
}: LeaderboardPreviewProps): React.ReactElement {
  const top = entries.slice(0, 3);
  if (top.length === 0) {
    return (
      <View
        style={styles.section}
        accessibilityLabel="No leaderboard data"
      >
        <Text style={styles.sectionHeading}>This week's leaderboard</Text>
        <Text style={styles.emptyText}>No leaderboard data yet.</Text>
      </View>
    );
  }
  return (
    <View style={styles.section} accessibilityLabel="Top 3 leaderboard">
      <View style={styles.lbHeaderRow}>
        <Text style={styles.sectionHeading}>This week's leaderboard</Text>
        {userRank !== null ? (
          <Text style={styles.lbYourRank}>Your rank: #{userRank}</Text>
        ) : null}
      </View>
      {top.map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          rank={entry.rank}
          userName={entry.userName}
          totalKarma={entry.totalKarma}
          level={entry.level}
          isCurrentUser={entry.isCurrentUser}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * The actual screen body. The exported default is the gated + error-bounded
 * wrapper.
 */
function KarmaPageBase(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabKey>('me');

  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useKarmaProfile();

  const {
    missions,
    isLoading: missionsLoading,
    error: missionsError,
    complete,
    isCompleting,
    refresh: refreshMissions,
  } = useKarmaMissions();

  const {
    entries: leaderboardEntries,
    isLoading: leaderboardLoading,
    error: leaderboardError,
    refresh: refreshLeaderboard,
    userRank,
  } = useKarmaLeaderboard('week');

  // Top-level loading: only block when nothing has been populated.
  const isInitialLoading =
    (profileLoading && profile === null) ||
    (missionsLoading && missions.length === 0) ||
    (leaderboardLoading && leaderboardEntries.length === 0);

  const topError =
    (profileError && profile === null
      ? profileError
      : null) ??
    (missionsError && missions.length === 0 ? missionsError : null) ??
    (leaderboardError && leaderboardEntries.length === 0
      ? leaderboardError
      : null);

  useFocusEffect(
    useCallback(() => {
      logger.info('screen_view', { screen: 'Karma' }, 'B Features');
      return () => {
        /* no cleanup needed */
      };
    }, []),
  );

  // Refresh on mount in case the user navigates back to the page after
  // completing a mission from another tab.
  useEffect(() => {
    refreshProfile().catch(() => {
      /* errors are surfaced via the `error` state */
    });
  }, [refreshProfile]);

  const onRefreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      refreshProfile(),
      refreshMissions(),
      refreshLeaderboard(),
    ]);
  }, [refreshProfile, refreshMissions, refreshLeaderboard]);

  const onCommunityPress = useCallback((slug: string): void => {
    logger.info(
      'karma_community_tapped',
      { slug },
      'B Features',
    );
  }, []);

  const onMissionComplete = useCallback(
    async (id: string): Promise<void> => {
      const result = await complete(id);
      if (result !== null) {
        logger.info(
          'karma_mission_completed_in_page',
          { missionId: id, delta: result.karmaDelta },
          'B Features',
        );
        // Refresh profile in the background so the "total karma" number
        // reflects the new delta without a hard reload.
        refreshProfile().catch(() => {
          /* errors are surfaced via the `error` state */
        });
      }
    },
    [complete, refreshProfile],
  );

  // Render body based on lifecycle state.
  let body: React.ReactElement;
  if (isInitialLoading) {
    body = <KarmaSkeleton />;
  } else if (topError !== null) {
    body = (
      <ErrorState
        message={topError.message}
        onRetry={onRefreshAll}
      />
    );
  } else {
    body = (
      <View>
        {activeTab === 'me' ? (
          <View>
            {profile !== null ? <KarmaProfileCard profile={profile} /> : null}
            <LeaderboardPreview
              entries={leaderboardEntries}
              userRank={userRank}
            />
          </View>
        ) : null}

        {activeTab === 'missions' ? (
          <View>
            {missions.length === 0 ? (
              <View
                style={styles.emptySection}
                accessibilityLabel="No active missions"
              >
                <Text style={styles.emptyEmoji}>🎯</Text>
                <Text style={styles.emptyTitle}>No active missions</Text>
                <Text style={styles.emptySub}>
                  Check back soon — new missions drop every week.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionHeading}>Active missions</Text>
                {missions.slice(0, 3).map((mission) => (
                  <KarmaMissionCard
                    key={mission.id}
                    mission={mission}
                    onComplete={onMissionComplete}
                    isSubmitting={isCompleting}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {activeTab === 'communities' ? (
          <View>
            <Text style={styles.sectionHeading}>Communities</Text>
            {FIXTURE_COMMUNITIES.map((community) => (
              <CommunityRow
                key={community.id}
                community={community}
                onPress={onCommunityPress}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileLoading || missionsLoading || leaderboardLoading}
            onRefresh={onRefreshAll}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Karma</Text>
          <Text style={styles.headerSubtitle}>
            Earn karma by doing good in your community.
          </Text>
        </View>

        <TabBar active={activeTab} onSelect={setActiveTab} />

        <View style={styles.bodyWrap}>{body}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Feature-flagged, error-bounded entry point
// ---------------------------------------------------------------------------

/**
 * The exported screen is wrapped in:
 *   - `FeatureFlagGate` so the whole page disappears when the B
 *     karma flag is off;
 *   - `withErrorBoundary` so a runtime error here never crashes the
 *     rest of the app.
 */
function GatedKarmaPage(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.karma">
      <KarmaPageBase />
    </FeatureFlagGate>
  );
}

const KarmaPage = withErrorBoundary(GatedKarmaPage, 'Karma');
export default KarmaPage;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: colors.gold,
  },
  tabEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  tabLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.nileBlue,
    fontWeight: '800',
  },
  bodyWrap: {
    paddingHorizontal: spacing.base,
  },
  section: {
    marginTop: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionHeading: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  communityEmoji: {
    fontSize: 24,
    marginRight: spacing.base,
  },
  communityBody: {
    flex: 1,
  },
  communityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  communityName: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  communityMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  communityChevron: {
    fontSize: 24,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  joinedPill: {
    backgroundColor: colors.gold,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  joinedPillText: {
    color: colors.nileBlue,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lbYourRank: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  lbRowCurrent: {
    backgroundColor: colors.background.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    marginVertical: 2,
    borderBottomWidth: 0,
  },
  lbRank: {
    width: 32,
    fontSize: 16,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  lbRankCurrent: {
    color: colors.brand.goldRich,
  },
  lbBody: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  lbName: {
    ...typography.body,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  lbNameCurrent: {
    fontWeight: '800',
  },
  lbLevel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  lbKarma: {
    ...typography.body,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  lbKarmaCurrent: {
    color: colors.brand.goldRich,
  },
  // Skeleton
  skeletonWrap: {
    paddingTop: spacing.base,
  },
  skeletonSpace: {
    marginBottom: spacing.base,
  },
  // Error
  errorWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.nileBlue,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  retryText: {
    ...typography.h3,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
  },
});