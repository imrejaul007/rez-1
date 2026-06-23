/**
 * /b/influencer — Creator discovery + campaigns (Phase 4.7).
 *
 * Layout
 * ------
 *   1. Header bar with the "Discover creators" title and a back button.
 *   2. Tab strip: Featured | Following | Campaigns.
 *      - Featured: full grid of all creators with a "Follow" toggle.
 *      - Following: filtered to creators the user follows.
 *      - Campaigns: list of all brand campaigns with a "Join" CTA.
 *   3. Vertical list of influencer cards (avatar, name, handle,
 *      followers, "Follow" button).
 *
 * State machine
 * -------------
 *   - `isLoading && influencers.length === 0` → skeleton list.
 *   - `error && influencers.length === 0`   → error UI with retry.
 *   - otherwise empty (no creators)         → "No creators to discover".
 *   - happy path                            → list of cards.
 *
 * Telemetry
 * ---------
 *   - `screen_view` is logged on focus via `logger.info`.
 *
 * Safety
 * ------
 *   - Wrapped in `withErrorBoundary(InfluencerPage, 'Influencer')`.
 *   - Wrapped in `<FeatureFlagGate flag="b.influencer">`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { useInfluencers } from '@/hooks/b/influencer/useInfluencers';
import {
  INFLUENCER_CATEGORY_LABELS,
  type Influencer,
  type InfluencerCampaign,
} from '@/types/influencer.types';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = 'featured' | 'following' | 'campaigns';

const TAB_LABELS: Record<TabKey, string> = {
  featured: 'Featured',
  following: 'Following',
  campaigns: 'Campaigns',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface InfluencerCardProps {
  influencer: Influencer;
  isFollowingPending: boolean;
  onFollowToggle: (influencer: Influencer) => void;
  onSelect: (influencer: Influencer) => void;
}

function InfluencerCard({
  influencer,
  isFollowingPending,
  onFollowToggle,
  onSelect,
}: InfluencerCardProps): React.ReactElement {
  const initials = influencer.name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleFollow = useCallback(() => {
    onFollowToggle(influencer);
  }, [influencer, onFollowToggle]);

  const handleSelect = useCallback(() => {
    onSelect(influencer);
  }, [influencer, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${influencer.name} ${influencer.handle}. ${influencer.followerCount} followers.`}
      onPress={handleSelect}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardRow}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.avatarText} allowFontScaling={false}>
            {initials}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {influencer.name}
          </Text>
          <Text style={styles.cardHandle} numberOfLines={1}>
            {influencer.handle}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {formatFollowerCount(influencer.followerCount)} followers ·{' '}
            {INFLUENCER_CATEGORY_LABELS[influencer.category]} ·{' '}
            {influencer.campaignCount} campaigns
          </Text>
          <Text style={styles.cardBio} numberOfLines={2}>
            {influencer.bio}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          influencer.isFollowing
            ? `Unfollow ${influencer.name}`
            : `Follow ${influencer.name}`
        }
        onPress={handleFollow}
        disabled={isFollowingPending}
        style={({ pressed }) => [
          styles.followButton,
          influencer.isFollowing && styles.followButtonActive,
          pressed && styles.followButtonPressed,
          isFollowingPending && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.followButtonText,
            influencer.isFollowing && styles.followButtonTextActive,
          ]}
          allowFontScaling={false}
        >
          {influencer.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

interface CampaignCardProps {
  campaign: InfluencerCampaign;
  influencerName: string;
  isJoiningPending: boolean;
  onJoin: (campaign: InfluencerCampaign) => void;
}

function CampaignCard({
  campaign,
  influencerName,
  isJoiningPending,
  onJoin,
}: CampaignCardProps): React.ReactElement {
  const handleJoin = useCallback(() => {
    onJoin(campaign);
  }, [campaign, onJoin]);

  const rewardRupees = (campaign.rewardPaise / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  return (
    <View
      style={styles.campaignCard}
      accessibilityLabel={`${campaign.brand} campaign: ${campaign.title}. Reward rupees ${rewardRupees}.`}
    >
      <View style={styles.campaignHeader}>
        <Text style={styles.campaignBrand} numberOfLines={1}>
          {campaign.brand}
        </Text>
        <Text style={styles.campaignReward} accessibilityLabel={`Reward ${rewardRupees} rupees`}>
          ₹{rewardRupees}
        </Text>
      </View>
      <Text style={styles.campaignTitle} numberOfLines={2}>
        {campaign.title}
      </Text>
      <Text style={styles.campaignMeta} numberOfLines={1}>
        By {influencerName} ·{' '}
        {campaign.participantsCount.toLocaleString('en-IN')} joined
      </Text>
      <Text style={styles.campaignDescription} numberOfLines={3}>
        {campaign.description}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          campaign.isJoined ? `Leave ${campaign.brand} campaign` : `Join ${campaign.brand} campaign`
        }
        onPress={handleJoin}
        disabled={isJoiningPending}
        style={({ pressed }) => [
          styles.joinButton,
          campaign.isJoined && styles.joinButtonActive,
          pressed && styles.joinButtonPressed,
          isJoiningPending && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.joinButtonText,
            campaign.isJoined && styles.joinButtonTextActive,
          ]}
          allowFontScaling={false}
        >
          {campaign.isJoined ? 'Joined' : 'Join campaign'}
        </Text>
      </Pressable>
    </View>
  );
}

function CardSkeleton(): React.ReactElement {
  return (
    <View
      style={styles.skeletonCard}
      accessible
      accessibilityLabel="Loading creators"
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
    <View style={styles.errorBlock} accessibilityRole="alert" accessibilityLabel="Couldn't load creators">
      <Text style={styles.errorTitle}>Couldn't load creators</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading creators"
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
      <Text style={styles.emptyTitle}>No creators to discover right now</Text>
      <Text style={styles.emptyMessage}>
        Check back later — new creators are added every week.
      </Text>
    </View>
  );
}

function EmptyFollowingBlock(): React.ReactElement {
  return (
    <View style={styles.emptyBlock} accessibilityRole="text">
      <Text style={styles.emptyTitle}>You're not following anyone yet</Text>
      <Text style={styles.emptyMessage}>
        Tap "Follow" on a creator in the Featured tab to see their updates here.
      </Text>
    </View>
  );
}

function EmptyCampaignsBlock(): React.ReactElement {
  return (
    <View style={styles.emptyBlock} accessibilityRole="text">
      <Text style={styles.emptyTitle}>No active campaigns</Text>
      <Text style={styles.emptyMessage}>
        New brand campaigns drop every week — check back soon.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a follower count with K / M suffix. */
function formatFollowerCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K`;
  }
  return count.toString();
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function InfluencerPage(): React.ReactElement {
  const router = useRouter();
  const {
    influencers,
    campaigns,
    isLoading,
    isJoining,
    isFollowing,
    error,
    list,
    getCampaigns,
    join,
    followToggle,
  } = useInfluencers();

  const [activeTab, setActiveTab] = useState<TabKey>('featured');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);

  // Screen-view telemetry on focus.
  useFocusEffect(
    useCallback(() => {
      try {
        logger.info('screen_view', { screen: 'Influencer' }, 'B Features');
      } catch {
        /* logger is a soft dependency */
      }
      return () => {
        /* nothing to clean up */
      };
    }, []),
  );

  // Initial fetch — the Featured list.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        await list({});
        if (!cancelled && influencers[0] !== undefined) {
          // Pre-load campaigns for the first influencer so the
          // campaigns tab has something to show without an extra
          // tap. The user can still pick a different creator.
          setSelectedInfluencerId(influencers[0].id);
        }
      } catch {
        /* error captured in hook */
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only
  }, []);

  // When the campaigns tab is opened, ensure campaigns for the
  // currently selected influencer are loaded.
  useEffect(() => {
    if (activeTab !== 'campaigns') return;
    if (selectedInfluencerId === null) return;
    if (campaigns.length > 0) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        await getCampaigns(selectedInfluencerId);
      } catch {
        /* error captured in hook */
      }
      void cancelled;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedInfluencerId, campaigns.length, getCampaigns]);

  const onRetry = useCallback(() => {
    list({}).catch(() => {
      /* captured inside the hook */
    });
  }, [list]);

  const onFollowToggle = useCallback(
    (influencer: Influencer) => {
      try {
        logger.info(
          'influencer_follow_tap',
          { influencerId: influencer.id, following: !influencer.isFollowing },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      followToggle(influencer.id).catch(() => {
        /* captured in hook */
      });
    },
    [followToggle],
  );

  const onSelect = useCallback(
    (influencer: Influencer) => {
      setSelectedInfluencerId(influencer.id);
      if (activeTab !== 'campaigns') {
        setActiveTab('campaigns');
      }
      getCampaigns(influencer.id).catch(() => {
        /* captured in hook */
      });
    },
    [activeTab, getCampaigns],
  );

  const onJoin = useCallback(
    (campaign: InfluencerCampaign) => {
      try {
        logger.info(
          'influencer_join_tap',
          { campaignId: campaign.id, joined: !campaign.isJoined },
          'B Features',
        );
      } catch {
        /* logger is a soft dependency */
      }
      join(campaign.id).catch(() => {
        /* captured in hook */
      });
    },
    [join],
  );

  const visibleInfluencers = useMemo(() => {
    if (activeTab === 'following') {
      return influencers.filter((i) => i.isFollowing);
    }
    return influencers;
  }, [activeTab, influencers]);

  const selectedInfluencer = useMemo(
    () => influencers.find((i) => i.id === selectedInfluencerId) ?? null,
    [influencers, selectedInfluencerId],
  );

  const showSkeleton = isLoading && influencers.length === 0;
  const showError = error !== null && influencers.length === 0;
  const showEmpty =
    !showSkeleton && !showError && influencers.length === 0;

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
        <Text style={styles.headerTitle}>Discover creators</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabRow} accessibilityRole="tablist">
        {(Object.keys(TAB_LABELS) as ReadonlyArray<TabKey>).map((key) => {
          const isActive = activeTab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={TAB_LABELS[key]}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                setActiveTab(key);
              }}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.tabButtonActive,
                pressed && styles.tabButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  isActive && styles.tabButtonTextActive,
                ]}
                allowFontScaling={false}
              >
                {TAB_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'campaigns' ? (
          <>
            {selectedInfluencer !== null ? (
              <View style={styles.subhead}>
                <Text style={styles.subheadText} allowFontScaling={false}>
                  Campaigns by {selectedInfluencer.name}
                </Text>
              </View>
            ) : null}
            {campaigns.length === 0 && !isLoading ? (
              <EmptyCampaignsBlock />
            ) : null}
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                influencerName={
                  selectedInfluencer?.name ?? 'Creator'
                }
                isJoiningPending={isJoining}
                onJoin={onJoin}
              />
            ))}
          </>
        ) : null}

        {activeTab !== 'campaigns' ? (
          <>
            {showSkeleton ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : null}

            {showError ? (
              <ErrorBlock message={error ?? 'Unknown error'} onRetry={onRetry} />
            ) : null}

            {showEmpty ? <EmptyBlock /> : null}

            {activeTab === 'following' &&
            !showSkeleton &&
            !showError &&
            visibleInfluencers.length === 0 ? (
              <EmptyFollowingBlock />
            ) : null}

            {!showSkeleton && !showError && !showEmpty
              ? visibleInfluencers.map((influencer) => (
                  <InfluencerCard
                    key={influencer.id}
                    influencer={influencer}
                    isFollowingPending={isFollowing}
                    onFollowToggle={onFollowToggle}
                    onSelect={onSelect}
                  />
                ))
              : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Gated export
// ---------------------------------------------------------------------------

function InfluencerPageGated(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.influencer">
      <InfluencerPage />
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  tabButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  tabButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tabButtonPressed: {
    opacity: 0.8,
  },
  tabButtonText: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: colors.nileBlue,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  subhead: {
    marginBottom: spacing.sm,
  },
  subheadText: {
    ...typography.label,
    color: colors.text.secondary,
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
    opacity: 0.9,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    ...typography.h4,
    color: colors.nileBlue,
  },
  cardHandle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  cardBio: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  followButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.nileBlue,
  },
  followButtonActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  followButtonPressed: {
    opacity: 0.8,
  },
  followButtonText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  followButtonTextActive: {
    color: colors.text.white ?? '#FFFFFF',
  },
  campaignCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignBrand: {
    ...typography.label,
    color: colors.text.secondary,
    flex: 1,
  },
  campaignReward: {
    ...typography.label,
    color: colors.gold,
    fontWeight: '800',
  },
  campaignTitle: {
    ...typography.h4,
    color: colors.nileBlue,
    marginTop: spacing.xs,
  },
  campaignMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  campaignDescription: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  joinButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
  },
  joinButtonActive: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.nileBlue,
  },
  joinButtonPressed: {
    opacity: 0.85,
  },
  joinButtonText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  joinButtonTextActive: {
    color: colors.nileBlue,
  },
  disabled: {
    opacity: 0.5,
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
});

export default withErrorBoundary(InfluencerPageGated, 'Influencer');
