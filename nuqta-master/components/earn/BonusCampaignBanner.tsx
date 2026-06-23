/**
 * BonusCampaignBanner
 *
 * A compact, dismissible banner rendered at the top of target pages
 * when the user navigates from a BonusZoneCard deep-link.
 * Fetches campaign info via slug and shows a reward summary.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import bonusZoneApi, { BonusZoneCampaignDetail } from '@/services/bonusZoneApi';
import { colors } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRewardSummary(campaign: BonusZoneCampaignDetail): string {
  const { type, value } = campaign.reward;
  const badge = campaign.display?.badgeText;
  if (badge) return badge;

  switch (type) {
    case 'percentage':
      return `Earn ${value}% bonus coins!`;
    case 'flat':
      return `Get ${value} bonus coins!`;
    case 'multiplier':
      return `Earn ${value}x coins!`;
    default:
      return 'Bonus reward available!';
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BonusCampaignBannerProps {
  /** Campaign slug passed via route params. If undefined the banner renders nothing. */
  campaignSlug?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function BonusCampaignBanner({ campaignSlug }: BonusCampaignBannerProps) {
  const [campaign, setCampaign] = useState<BonusZoneCampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!campaignSlug) return;

    let cancelled = false;
    setLoading(true);

    bonusZoneApi
      .getCampaignDetail(campaignSlug)
      .then((res) => {
        if (!cancelled && res.success && res.data?.campaign) {
          setCampaign(res.data.campaign);
        }
      })
      .catch(() => {
        // Silently fail — banner simply won't appear
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignSlug]);

  // Render nothing when there is no slug, fetch failed, or user dismissed
  if (!campaignSlug || dismissed) return null;

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="small" color={colors.warningScale[700]} />
      </View>
    );
  }

  if (!campaign) return null;

  const rewardText = getRewardSummary(campaign);

  return (
    <LinearGradient
      colors={[colors.tint.orange, '#FFEDD5', colors.tint.orange]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Coin icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="gift" size={20} color={colors.warningScale[700]} />
      </View>

      {/* Text content */}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {campaign.title}
        </Text>
        <Text style={styles.reward} numberOfLines={1}>
          {rewardText}
        </Text>
      </View>

      {/* Dismiss button */}
      <Pressable
        style={styles.dismissButton}
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss bonus campaign banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={16} color={colors.brand.amberDark} />
      </Pressable>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    maxHeight: 60,
    ...Platform.select({
      ios: {
        shadowColor: colors.warningScale[700],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(217, 119, 6, 0.12)',
      },
    }),
  },
  loadingWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warningScale[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.amberDark,
    lineHeight: 18,
  },
  reward: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[700],
    lineHeight: 16,
    marginTop: 1,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(254, 215, 170, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default React.memo(BonusCampaignBanner);
