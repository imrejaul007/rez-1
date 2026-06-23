import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BonusZoneCampaign, UserCampaignState } from '@/services/bonusZoneApi';
import { colors } from '@/constants/theme';

// ============================================
// TIMER HELPER
// ============================================

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
    text = `${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else {
    text = `${minutes}m ${seconds}s`;
  }

  return { text, expired: false, urgent: hours === 0 && days === 0 };
}

// ============================================
// STATE BADGE CONFIG
// ============================================

const STATE_BADGE_CONFIG: Record<UserCampaignState, { label: string; bg: string; color: string } | null> = {
  eligible: null, // No badge for eligible (default state)
  claimed: { label: 'Claimed', bg: colors.tint.blueLight, color: '#1D4ED8' },
  limit_reached: { label: 'Limit Reached', bg: colors.tint.blueLight, color: '#1D4ED8' },
  not_eligible: { label: 'Not Eligible', bg: colors.neutral[100], color: colors.neutral[500] },
  budget_exhausted: { label: 'Sold Out', bg: colors.errorScale[100], color: colors.error },
  expired: { label: 'Expired', bg: colors.neutral[100], color: colors.neutral[500] },
};

// ============================================
// REWARD DISPLAY
// ============================================

function getRewardDisplay(campaign: BonusZoneCampaign): string {
  const { type, value } = campaign.reward;
  const badge = campaign.display.badgeText;
  if (badge) return badge;

  switch (type) {
    case 'percentage':
      return `${value}%`;
    case 'flat':
      return `+${value} Coins`;
    case 'multiplier':
      return `${value}X`;
    default:
      return 'Bonus';
  }
}

// ============================================
// CAMPAIGN TYPE LABEL
// ============================================

const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  cashback_boost: { label: 'CASHBACK', color: colors.successScale[700] },
  bank_offer: { label: 'BANKS', color: '#1D4ED8' },
  bill_upload_bonus: { label: 'BILL BONUS', color: colors.error },
  category_multiplier: { label: 'MULTIPLIER', color: colors.brand.purple },
  first_transaction_bonus: { label: 'NEW USER', color: colors.successScale[700] },
  festival_offer: { label: 'FESTIVAL', color: colors.warningScale[700] },
};

// ============================================
// COMPONENT
// ============================================

interface BonusZoneCardProps {
  campaign: BonusZoneCampaign;
  currencySymbol?: string;
}

function BonusZoneCard({ campaign, currencySymbol = 'د.إ' }: BonusZoneCardProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(campaign.schedule.endTime)
  );
  const urgentRef = useRef(timeRemaining.urgent);
  urgentRef.current = timeRemaining.urgent;

  // Live countdown timer — uses ref for urgency to avoid interval re-creation on every tick
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = getTimeRemaining(campaign.schedule.endTime);
      setTimeRemaining(next);
      if (!next.expired) {
        timerId = setTimeout(tick, next.urgent ? 1000 : 60000);
      }
    };

    // First tick after initial interval
    timerId = setTimeout(tick, urgentRef.current ? 1000 : 60000);

    return () => clearTimeout(timerId);
  }, [campaign.schedule.endTime]);

  const handlePress = useCallback(() => {
    // Navigate to campaign detail page — even for not_eligible (shows reasons)
    router.push({
      pathname: '/bonus-zone/[slug]' as any,
      params: { slug: campaign.slug },
    });
  }, [campaign, router]);

  const isDisabled = ['expired', 'budget_exhausted'].includes(campaign.userState);
  const stateBadge = STATE_BADGE_CONFIG[campaign.userState];
  const typeConfig = CAMPAIGN_TYPE_LABELS[campaign.campaignType] || { label: 'BONUS', color: colors.warningScale[700] };
  const rewardText = getRewardDisplay(campaign);

  // Scarcity: show "X left" when global claims are limited and running low
  const globalRemaining = campaign.globalClaimsRemaining;
  const showScarcity = globalRemaining != null && globalRemaining > 0 && globalRemaining <= 100;

  // Determine icon: emoji or partner logo
  const hasPartnerLogo = campaign.fundingSource?.partnerLogo || campaign.display.partnerLogo;

  return (
    <Pressable
      style={[styles.card, isDisabled && styles.cardDisabled]}
      onPress={handlePress}
     
      accessibilityLabel={`${campaign.title}. ${campaign.subtitle}. ${rewardText}. ${timeRemaining.text}`}
      accessibilityRole="button"
    >
      {/* Icon / Logo */}
      <View style={styles.iconContainer}>
        {hasPartnerLogo ? (
          <CachedImage
            source={{ uri: hasPartnerLogo }}
            style={styles.partnerLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.iconEmoji}>{campaign.display.icon || '🎁'}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
          {stateBadge && (
            <View style={[styles.stateBadge, { backgroundColor: stateBadge.bg }]}>
              <Text style={[styles.stateBadgeText, { color: stateBadge.color }]}>
                {stateBadge.label}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>{campaign.subtitle}</Text>

        <View style={styles.footer}>
          {/* Reward + Type Label */}
          <Text style={[styles.rewardText, { color: typeConfig.color }]}>
            {rewardText}
          </Text>

          <View style={styles.footerRight}>
            {/* Scarcity indicator */}
            {showScarcity && (
              <View style={styles.scarcityBadge}>
                <Ionicons name="flame" size={11} color={colors.error} />
                <Text style={styles.scarcityText}>{globalRemaining} left</Text>
              </View>
            )}

            {/* Timer */}
            <View style={styles.timerContainer}>
              <Ionicons
                name="time"
                size={14}
                color={timeRemaining.urgent ? colors.error : colors.brand.orange}
              />
              <Text
                style={[
                  styles.timerText,
                  timeRemaining.urgent && styles.timerUrgent,
                ]}
              >
                {timeRemaining.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(BonusZoneCard);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
    alignItems: 'center',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 24,
  },
  partnerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
    flex: 1,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  scarcityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.errorScale[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scarcityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.orange,
  },
  timerUrgent: {
    color: colors.error,
  },
});
