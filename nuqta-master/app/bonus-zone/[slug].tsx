import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Share,
} from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import bonusZoneApi, {
  BonusZoneCampaignDetail,
  UserCampaignState,
  BonusCampaignType,
} from '@/services/bonusZoneApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useRefreshWallet } from '@/stores/selectors';
import { usePressGuard } from '@/hooks/usePressGuard';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================================================
// TIMER HELPER (same pattern as BonusZoneCard)
// ============================================================================

function getTimeRemaining(endTime: string) {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const ms = end - now;

  if (ms <= 0) {
    return { text: 'Expired', expired: true, urgent: false };
  }

  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  let text: string;
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    text = `${minutes}m ${seconds}s`;
  }

  return { text, expired: false, urgent: hours === 0 && days === 0 };
}

// ============================================================================
// STATE BADGE CONFIG
// ============================================================================

const STATE_BADGE_CONFIG: Record<
  UserCampaignState,
  { label: string; bg: string; color: string; icon: string } | null
> = {
  eligible: { label: 'You\'re Eligible', bg: colors.tint.green, color: colors.successScale[700], icon: 'checkmark-circle' },
  claimed: { label: 'You\'ve Claimed This', bg: colors.tint.blueLight, color: '#1D4ED8', icon: 'checkmark-done-circle' },
  limit_reached: { label: 'Limit Reached', bg: colors.tint.blueLight, color: '#1D4ED8', icon: 'alert-circle' },
  not_eligible: { label: 'Not Eligible', bg: colors.neutral[100], color: colors.neutral[500], icon: 'close-circle' },
  budget_exhausted: { label: 'Sold Out', bg: colors.errorScale[100], color: colors.error, icon: 'ban' },
  expired: { label: 'Expired', bg: colors.neutral[100], color: colors.neutral[500], icon: 'time' },
};

// ============================================================================
// CAMPAIGN TYPE CONFIG
// ============================================================================

const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  cashback_boost: { label: 'Cashback Boost', color: colors.successScale[700], bg: colors.tint.green },
  bank_offer: { label: 'Bank Offer', color: '#1D4ED8', bg: colors.tint.blueLight },
  bill_upload_bonus: { label: 'Bill Upload Bonus', color: colors.error, bg: colors.errorScale[100] },
  category_multiplier: { label: 'Category Multiplier', color: colors.brand.purple, bg: colors.tint.purple },
  first_transaction_bonus: { label: 'First Transaction Bonus', color: colors.successScale[700], bg: colors.tint.green },
  festival_offer: { label: 'Festival Offer', color: colors.warningScale[700], bg: colors.tint.amberLight },
};

// ============================================================================
// HOW IT WORKS DESCRIPTIONS
// ============================================================================

const HOW_IT_WORKS: Record<BonusCampaignType, { title: string; steps: string[] }> = {
  cashback_boost: {
    title: 'How Cashback Boost Works',
    steps: [
      'Make a qualifying purchase at any participating store.',
      'Bonus cashback is applied automatically on top of regular rewards.',
      'Coins are credited to your wallet after the transaction is verified.',
    ],
  },
  bank_offer: {
    title: 'How Bank Offers Work',
    steps: [
      'Pay using a qualifying bank card or payment method.',
      'The bonus is applied automatically when payment is detected.',
      'Extra coins are credited after transaction verification.',
    ],
  },
  bill_upload_bonus: {
    title: 'How Bill Upload Bonus Works',
    steps: [
      'Upload a valid bill or receipt from a qualifying purchase.',
      'Our system verifies the bill details.',
      'Bonus coins are credited once the bill is approved.',
    ],
  },
  category_multiplier: {
    title: 'How Category Multiplier Works',
    steps: [
      'Shop in the qualifying product category.',
      'Your coin earnings are multiplied for every qualifying transaction.',
      'Multiplied coins are credited automatically after purchase.',
    ],
  },
  first_transaction_bonus: {
    title: 'How First Transaction Bonus Works',
    steps: [
      'Complete your very first transaction on the platform.',
      'The bonus reward is applied automatically.',
      'Welcome coins are credited to your wallet instantly.',
    ],
  },
  festival_offer: {
    title: 'How Festival Offers Work',
    steps: [
      'Shop during the festival period at any participating store.',
      'Festival bonus is applied on top of your regular rewards.',
      'Bonus coins are credited after transaction verification.',
    ],
  },
};

// ============================================================================
// REWARD DISPLAY HELPERS
// ============================================================================

function getRewardLabel(type: string, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}% Bonus`;
    case 'flat':
      return `+${value} Coins`;
    case 'multiplier':
      return `${value}X Multiplier`;
    default:
      return 'Bonus Reward';
  }
}

function getRewardDescription(type: string, value: number): string {
  switch (type) {
    case 'percentage':
      return `Earn ${value}% extra coins on qualifying transactions`;
    case 'flat':
      return `Get ${value} bonus coins per qualifying action`;
    case 'multiplier':
      return `Your coin earnings are multiplied by ${value}X`;
    default:
      return 'Earn bonus coins';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

function CampaignDetailPage() {
  const isMounted = useIsMounted();
  const { slug, claimSuccess } = useLocalSearchParams<{ slug: string; claimSuccess?: string }>();
  const router = useRouter();
  const refreshWallet = useRefreshWallet();
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);

  const [campaign, setCampaign] = useState<BonusZoneCampaignDetail | null>(null);
  const [userState, setUserState] = useState<{
    eligible: boolean;
    reasons: string[];
    claimCount: number;
    totalReward: number;
    maxClaimsPerUser: number;
    maxClaimsPerUserPerDay?: number;
    dailyClaimCount?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    text: string;
    expired: boolean;
    urgent: boolean;
  } | null>(null);

  const urgentRef = useRef(false);

  // ---- Fetch campaign detail ----
  const fetchDetail = useCallback(async () => {
    if (!slug) return;
    try {
      setError(null);
      const response = await bonusZoneApi.getCampaignDetail(slug);
      if (response.success && response.data) {
        setCampaign(response.data.campaign);
        setUserState(response.data.userState);
        const timer = getTimeRemaining(response.data.campaign.schedule.endTime);
        setTimeRemaining(timer);
        urgentRef.current = timer.urgent;
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load campaign details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Show claim success banner when returning from a successful claim
  useEffect(() => {
    if (claimSuccess === 'true') {
      setShowClaimSuccess(true);
      fetchDetail(); // Refresh to get updated claim count
      refreshWallet(); // Refresh wallet to reflect earned coins
      const timer = setTimeout(() => setShowClaimSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [claimSuccess]);

  // ---- Live countdown timer ----
  useEffect(() => {
    if (!campaign) return;

    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = getTimeRemaining(campaign.schedule.endTime);
      setTimeRemaining(next);
      urgentRef.current = next.urgent;
      if (!next.expired) {
        timerId = setTimeout(tick, next.urgent ? 1000 : 60000);
      }
    };

    timerId = setTimeout(tick, urgentRef.current ? 1000 : 60000);

    return () => clearTimeout(timerId);
  }, [campaign?.schedule.endTime]);

  // ---- Pull to refresh ----
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetail();
  }, [fetchDetail]);

  // ---- CTA handler ----
  const handleCTA = useCallback(() => {
    if (!campaign) return;

    if (campaign.userState === 'claimed' || campaign.userState === 'limit_reached') {
      router.push('/bonus-zone-history' as any);
      return;
    }

    if (campaign.userState === 'eligible') {
      const { screen, params } = campaign.deepLink;
      if (screen) {
        router.push({
          pathname: screen as any,
          params: {
            ...params,
            bonusCampaignSlug: campaign.slug,
          },
        });
      }
    }
  }, [campaign, router]);

  // ---- Share handler ----
  const handleShare = useCallback(async () => {
    if (!campaign) return;
    try {
      await Share.share({
        message: `Check out "${campaign.title}" on ${BRAND.APP_NAME}! ${campaign.subtitle || ''}`,
        title: campaign.title,
      });
    } catch (err) {
      // silently handle
    }
  }, [campaign]);

  // ---- Determine CTA ----
  const getCTAConfig = () => {
    if (!campaign) return { text: '', disabled: true };

    switch (campaign.userState) {
      case 'eligible': {
        const screenName = campaign.deepLink.screen
          ?.split('/')
          .pop()
          ?.replace(/-/g, ' ')
          ?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'App';
        return { text: `Go to ${screenName}`, disabled: false };
      }
      case 'claimed':
        return { text: 'View Claim History', disabled: false };
      case 'limit_reached':
        return { text: 'View Claim History', disabled: false };
      case 'not_eligible':
        return { text: 'Not Eligible', disabled: true };
      case 'budget_exhausted':
        return { text: 'Sold Out', disabled: true };
      case 'expired':
        return { text: 'Campaign Ended', disabled: true };
      default:
        return { text: 'Unavailable', disabled: true };
    }
  };

  // ==== RENDER ====

  const typeConfig = campaign
    ? CAMPAIGN_TYPE_LABELS[campaign.campaignType] || { label: 'Bonus', color: colors.warningScale[700], bg: colors.tint.amberLight }
    : null;

  const stateBadge = campaign ? STATE_BADGE_CONFIG[campaign.userState] : null;
  const ctaConfig = getCTAConfig();
  const hasPartnerLogo = campaign?.fundingSource?.partnerLogo || campaign?.display.partnerLogo;
  const howItWorks = campaign ? HOW_IT_WORKS[campaign.campaignType] : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: campaign?.title || 'Campaign Details',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerTintColor: Colors.nileBlue,
        }}
      />

      {loading ? (
        <DetailPageSkeleton />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : campaign ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.orange} />
          }
        >
          {/* ===== BANNER IMAGE ===== */}
          {campaign.display.bannerImage && (
            <CachedImage
              source={campaign.display.bannerImage}
              style={styles.bannerImage}
              contentFit="cover"
            />
          )}

          {/* ===== HEADER SECTION ===== */}
          <View style={styles.headerSection}>
            {/* Share Button */}
            <Pressable
              style={styles.shareButton}
              onPress={handleShare}
             
              accessibilityLabel="Share campaign"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={20} color={colors.neutral[500]} />
            </Pressable>

            {/* Icon / Partner Logo */}
            <View style={[styles.heroIcon, campaign.display.backgroundColor ? { backgroundColor: campaign.display.backgroundColor } : null]}>
              {hasPartnerLogo ? (
                <CachedImage
                  source={hasPartnerLogo}
                  style={styles.heroPartnerLogo}
                  contentFit="contain"
                />
              ) : (
                <Text style={styles.heroEmoji}>{campaign.display.icon || '🎁'}</Text>
              )}
            </View>

            {/* Title + Subtitle */}
            <Text style={styles.headerTitle}>{campaign.title}</Text>
            <Text style={styles.headerSubtitle}>{campaign.subtitle}</Text>

            {/* Campaign Type Badge */}
            {typeConfig && (
              <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
                <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                  {typeConfig.label}
                </Text>
              </View>
            )}

            {/* Partner attribution */}
            {campaign.fundingSource?.partnerName && (
              <View style={styles.partnerRow}>
                {campaign.fundingSource.partnerLogo && (
                  <CachedImage
                    source={campaign.fundingSource.partnerLogo}
                    style={styles.partnerSmallLogo}
                    contentFit="contain"
                  />
                )}
                <Text style={styles.partnerText}>
                  Powered by {campaign.fundingSource.partnerName}
                </Text>
              </View>
            )}
          </View>

          {/* ===== COUNTDOWN TIMER ===== */}
          {timeRemaining && !timeRemaining.expired && (
            <View style={styles.timerCard}>
              <Ionicons
                name="time-outline"
                size={20}
                color={timeRemaining.urgent ? colors.error : colors.brand.orange}
              />
              <View style={styles.timerContent}>
                <Text style={styles.timerLabel}>Ends in</Text>
                <Text
                  style={[
                    styles.timerValue,
                    timeRemaining.urgent && styles.timerUrgent,
                  ]}
                >
                  {timeRemaining.text}
                </Text>
              </View>
            </View>
          )}

          {/* ===== USER STATE BADGE ===== */}
          {stateBadge && (
            <View style={[styles.stateBadgeCard, { backgroundColor: stateBadge.bg }]}>
              <Ionicons name={stateBadge.icon as any} size={20} color={stateBadge.color} />
              <Text style={[styles.stateBadgeLabel, { color: stateBadge.color }]}>
                {stateBadge.label}
              </Text>
            </View>
          )}

          {/* ===== CLAIM SUCCESS BANNER ===== */}
          {showClaimSuccess && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={22} color={colors.successScale[700]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successBannerTitle}>Reward Claimed!</Text>
                <Text style={styles.successBannerText}>Coins have been credited to your wallet.</Text>
              </View>
              <Pressable onPress={() => setShowClaimSuccess(false)}>
                <Ionicons name="close" size={18} color={colors.successScale[700]} />
              </Pressable>
            </View>
          )}

          {/* ===== ELIGIBILITY REASONS (if not eligible) ===== */}
          {campaign.userState === 'not_eligible' && userState?.reasons && userState.reasons.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.cardTitle}>Why You're Not Eligible</Text>
              </View>
              {userState.reasons.map((reason, index) => (
                <View key={index} style={styles.reasonRow}>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ===== REWARD SECTION ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="gift-outline" size={20} color={colors.brand.orange} />
              <Text style={styles.cardTitle}>What You Earn</Text>
            </View>

            {/* Main reward value */}
            <View style={styles.rewardHighlight}>
              <Text style={styles.rewardValue}>
                {getRewardLabel(campaign.reward.type, campaign.reward.value)}
              </Text>
              <Text style={styles.rewardDescription}>
                {getRewardDescription(campaign.reward.type, campaign.reward.value)}
              </Text>
            </View>

            {/* Reward details */}
            <View style={styles.rewardDetails}>
              <View style={styles.rewardDetailRow}>
                <Text style={styles.rewardDetailLabel}>Coin Type</Text>
                <Text style={styles.rewardDetailValue}>
                  {campaign.reward.coinType === 'rez' ? BRAND.COIN_NAME : 'Branded Coins'}
                </Text>
              </View>
              {campaign.reward.coinType === 'branded' && (
                <View style={styles.brandedCoinNote}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.brand.purple} />
                  <Text style={styles.brandedCoinNoteText}>
                    Branded coins are partner-sponsored rewards that can only be redeemed at{' '}
                    {campaign.fundingSource?.partnerName || 'the sponsoring brand'}. They are separate from your regular {BRAND.APP_NAME} coin balance.
                  </Text>
                </View>
              )}
              {campaign.reward.capPerUser > 0 && (
                <View style={styles.rewardDetailRow}>
                  <Text style={styles.rewardDetailLabel}>Max per User</Text>
                  <Text style={styles.rewardDetailValue}>
                    {campaign.reward.capPerUser} coins
                  </Text>
                </View>
              )}
              {campaign.reward.capPerTransaction > 0 && (
                <View style={styles.rewardDetailRow}>
                  <Text style={styles.rewardDetailLabel}>Max per Transaction</Text>
                  <Text style={styles.rewardDetailValue}>
                    {campaign.reward.capPerTransaction} coins
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ===== CLAIM PROGRESS ===== */}
          {campaign.maxClaimsPerUser > 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart-outline" size={20} color="#1D4ED8" />
                <Text style={styles.cardTitle}>Claim Progress</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          (campaign.userClaimCount / campaign.maxClaimsPerUser) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {campaign.userClaimCount} of {campaign.maxClaimsPerUser} claims used
                </Text>
                {campaign.userTotalReward > 0 && (
                  <Text style={styles.progressSubtext}>
                    Total earned: {campaign.userTotalReward} coins
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ===== DAILY LIMIT INFO ===== */}
          {userState?.maxClaimsPerUserPerDay != null && userState.maxClaimsPerUserPerDay > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="today-outline" size={20} color={colors.warningScale[700]} />
                <Text style={styles.cardTitle}>Daily Limit</Text>
              </View>
              <View style={styles.dailyLimitRow}>
                <Text style={styles.dailyLimitText}>
                  {userState.dailyClaimCount || 0} of {userState.maxClaimsPerUserPerDay} daily claims used
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          ((userState.dailyClaimCount || 0) / userState.maxClaimsPerUserPerDay) * 100,
                          100
                        )}%`,
                        backgroundColor: (userState.dailyClaimCount || 0) >= userState.maxClaimsPerUserPerDay ? colors.error : colors.brand.orange,
                      },
                    ]}
                  />
                </View>
                {(userState.dailyClaimCount || 0) >= userState.maxClaimsPerUserPerDay && (
                  <Text style={styles.dailyLimitWarning}>Daily limit reached. Come back tomorrow!</Text>
                )}
              </View>
            </View>
          )}

          {/* ===== SCARCITY INDICATOR ===== */}
          {campaign.globalClaimsRemaining != null && campaign.globalClaimsRemaining > 0 && (
            <View style={[styles.stateBadgeCard, { backgroundColor: campaign.globalClaimsRemaining <= 50 ? colors.errorScale[50] : colors.tint.orange }]}>
              <Ionicons
                name="flame"
                size={20}
                color={campaign.globalClaimsRemaining <= 50 ? colors.error : colors.brand.orange}
              />
              <Text style={[styles.stateBadgeLabel, { color: campaign.globalClaimsRemaining <= 50 ? colors.error : colors.brand.orange }]}>
                Only {campaign.globalClaimsRemaining} claims remaining!
              </Text>
            </View>
          )}

          {/* Single claim badge */}
          {campaign.maxClaimsPerUser === 1 && campaign.userState === 'claimed' && (
            <View style={styles.card}>
              <View style={styles.claimedBadge}>
                <Ionicons name="checkmark-done-circle" size={24} color="#1D4ED8" />
                <View style={styles.claimedBadgeContent}>
                  <Text style={styles.claimedBadgeTitle}>Claimed</Text>
                  {campaign.userTotalReward > 0 && (
                    <Text style={styles.claimedBadgeSubtext}>
                      You earned {campaign.userTotalReward} coins from this campaign
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ===== HOW IT WORKS ===== */}
          {howItWorks && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb-outline" size={20} color={colors.warningScale[700]} />
                <Text style={styles.cardTitle}>{howItWorks.title}</Text>
              </View>
              {howItWorks.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ===== ELIGIBILITY DETAILS ===== */}
          {campaign.eligibility && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.successScale[700]} />
                <Text style={styles.cardTitle}>Eligibility Requirements</Text>
              </View>

              {campaign.eligibility.minSpend != null && campaign.eligibility.minSpend > 0 && (
                <View style={styles.eligibilityRow}>
                  <Ionicons name="wallet-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.eligibilityText}>
                    Minimum spend: {campaign.eligibility.minSpend} per transaction
                  </Text>
                </View>
              )}

              {campaign.eligibility.firstTransactionOnly && (
                <View style={styles.eligibilityRow}>
                  <Ionicons name="star-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.eligibilityText}>
                    First transaction only
                  </Text>
                </View>
              )}

              {campaign.eligibility.paymentMethods && campaign.eligibility.paymentMethods.length > 0 && (
                <View style={styles.eligibilityRow}>
                  <Ionicons name="card-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.eligibilityText}>
                    Payment methods: {campaign.eligibility.paymentMethods.join(', ')}
                  </Text>
                </View>
              )}

              {campaign.eligibility.bankCodes && campaign.eligibility.bankCodes.length > 0 && (
                <View style={styles.eligibilityRow}>
                  <Ionicons name="business-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.eligibilityText}>
                    Participating banks: {campaign.eligibility.bankCodes.join(', ')}
                  </Text>
                </View>
              )}

              {campaign.eligibility.merchantCategories && campaign.eligibility.merchantCategories.length > 0 && (
                <View style={styles.eligibilityRow}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.eligibilityText}>
                    Categories: {campaign.eligibility.merchantCategories.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ===== DESCRIPTION ===== */}
          {campaign.description && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={20} color={colors.nileBlue} />
                <Text style={styles.cardTitle}>About This Campaign</Text>
              </View>
              <Text style={styles.descriptionText}>{campaign.description}</Text>
            </View>
          )}

          {/* ===== TERMS & CONDITIONS ===== */}
          {campaign.terms && campaign.terms.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="reader-outline" size={20} color={colors.neutral[500]} />
                <Text style={styles.cardTitle}>Terms & Conditions</Text>
              </View>
              {campaign.terms.map((term, index) => (
                <View key={index} style={styles.termRow}>
                  <Text style={styles.termBullet}>{'\u2022'}</Text>
                  <Text style={styles.termText}>{term}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ===== CTA BUTTON ===== */}
          <View style={styles.ctaContainer}>
            <Pressable
              style={[styles.ctaButton, ctaConfig.disabled && styles.ctaButtonDisabled]}
              onPress={handleCTA}
             
              disabled={ctaConfig.disabled}
            >
              <Text style={[styles.ctaButtonText, ctaConfig.disabled && styles.ctaButtonTextDisabled]}>
                {ctaConfig.text}
              </Text>
              {!ctaConfig.disabled && (
                <Ionicons name="arrow-forward" size={18} color={colors.background.primary} />
              )}
            </Pressable>
          </View>
        </ScrollView>
      ) : null}
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  contentContainer: {
    paddingBottom: 120,
  },

  // ---- Center / Loading / Error ----
  centerContainer: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.neutral[400],
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.brand.orange,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // ---- Banner Image ----
  bannerImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.neutral[100],
  },

  // ---- Header Section ----
  headerSection: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    position: 'relative',
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 36,
  },
  heroPartnerLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  typeBadge: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  partnerSmallLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  partnerText: {
    fontSize: 12,
    color: colors.neutral[400],
  },

  // ---- Timer Card ----
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 12,
  },
  timerContent: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.orange,
    marginTop: 2,
  },
  timerUrgent: {
    color: colors.error,
  },

  // ---- State Badge Card ----
  stateBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  stateBadgeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ---- Success Banner ----
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.tint.green,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.successScale[700],
  },
  successBannerText: {
    fontSize: 12,
    color: colors.successScale[700],
    marginTop: 1,
  },

  // ---- Generic Card ----
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
  },

  // ---- Eligibility Reasons ----
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },

  // ---- Reward Section ----
  rewardHighlight: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  rewardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brand.orange,
  },
  rewardDescription: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  rewardDetails: {
    gap: 0,
  },
  brandedCoinNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.tint.purpleLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  brandedCoinNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.brand.purpleDeep,
    lineHeight: 16,
  },
  rewardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  rewardDetailLabel: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  rewardDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },

  // ---- Claim Progress ----
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: colors.brand.orange,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  // ---- Daily Limit ----
  dailyLimitRow: {
    gap: 8,
  },
  dailyLimitText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  dailyLimitWarning: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },

  // ---- Claimed Badge ----
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  claimedBadgeContent: {
    flex: 1,
  },
  claimedBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  claimedBadgeSubtext: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },

  // ---- How It Works ----
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tint.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.orange,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },

  // ---- Eligibility Details ----
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  eligibilityText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[700],
    lineHeight: 18,
  },

  // ---- Description ----
  descriptionText: {
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 22,
  },

  // ---- Terms ----
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  termBullet: {
    fontSize: 14,
    color: colors.neutral[400],
    lineHeight: 18,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },

  // ---- CTA ----
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.brand.orange,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  ctaButtonTextDisabled: {
    color: colors.neutral[400],
  },
});

export default withErrorBoundary(CampaignDetailPage, 'BonusZoneSlug');
