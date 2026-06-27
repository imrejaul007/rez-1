/**
 * Prive Campaign Detail Page
 *
 * Shows full campaign details, task steps, requirements, and rewards.
 * CTA changes based on userStatus: Join / Submit / View Status / Completed / Upgrade.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { platformAlertSimple } from '@/utils/platformAlert';
import priveCampaignApi, { PriveCampaign } from '@/services/priveCampaignApi';

/** Resolve merchant name from either flat or nested shape */
function getMerchantName(c: PriveCampaign): string {
  return c.merchantName || c.merchantId?.name || 'Merchant';
}

/** Resolve merchant logo from either flat or nested shape */
function getMerchantLogo(c: PriveCampaign): string | undefined {
  return c.merchantLogo || c.merchantId?.logo;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [campaign, setCampaign] = useState<PriveCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await priveCampaignApi.getCampaignById(id);
      if (response.success && response.data?.campaign) {
        setCampaign(response.data.campaign);
      } else {
        setError('Campaign not found');
      }
    } catch {
      setError('Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCampaign();
  }, [isAuthenticated, authLoading, fetchCampaign]);

  const handleJoin = async () => {
    if (!id || isJoining) return;
    setIsJoining(true);
    try {
      const response = await priveCampaignApi.joinCampaign(id);
      if (response.success) {
        platformAlertSimple('Joined!', response.data?.message || 'You have joined the campaign.');
        fetchCampaign();
      } else {
        platformAlertSimple('Error', (response as any)?.message || 'Could not join campaign');
      }
    } catch {
      platformAlertSimple('Error', 'Something went wrong');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCTA = () => {
    if (!campaign) return;
    switch (campaign.userStatus) {
      case 'eligible':
        handleJoin();
        break;
      case 'joined':
        router.push(`/prive/campaigns/submit?campaignId=${id}`);
        break;
      case 'submitted':
      case 'approved':
      case 'rejected':
        router.push(`/prive/campaigns/status?campaignId=${id}`);
        break;
      case 'tier_insufficient':
        router.push('/prive/tier-comparison');
        break;
    }
  };

  const getCTAText = (): string => {
    if (!campaign?.userStatus) return 'Join Campaign';
    switch (campaign.userStatus) {
      case 'eligible': return 'Join Campaign';
      case 'joined': return 'Submit Your Post';
      case 'submitted': return 'View Status';
      case 'approved': return 'Completed';
      case 'rejected': return 'View Status';
      case 'slots_full': return 'Slots Full';
      case 'expired': return 'Campaign Expired';
      case 'tier_insufficient': return 'Upgrade Tier';
      default: return 'View Details';
    }
  };

  const isCTADisabled = campaign?.userStatus === 'slots_full' ||
    campaign?.userStatus === 'expired';

  const isApproved = campaign?.userStatus === 'approved';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={PRIVE_COLORS.gold.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={PRIVE_COLORS.status.error} />
          <Text style={styles.errorText}>{error || 'Campaign not found'}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchCampaign}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const logo = getMerchantLogo(campaign);
  const merchantName = getMerchantName(campaign);
  const cashbackValue = campaign.reward.cashbackPercent ?? 0;
  const cashbackCap = campaign.reward.cashbackMax ?? campaign.reward.cashbackCap ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Approved Banner */}
        {isApproved && (
          <View style={styles.approvedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.approvedText}>Campaign Completed Successfully</Text>
          </View>
        )}

        {/* Merchant Header */}
        <View style={styles.header}>
          {logo ? (
            <CachedImage source={{ uri: logo }} style={styles.logo} contentFit="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Ionicons name="storefront-outline" size={24} color={PRIVE_COLORS.text.tertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.merchantName}>{merchantName}</Text>
            <Text style={styles.tierBadge}>{campaign.minPriveTier} tier required</Text>
          </View>
        </View>

        {/* Title & Description */}
        <View style={styles.section}>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.description}>{campaign.description}</Text>
        </View>

        {/* Task Steps */}
        {campaign.taskSteps?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it Works</Text>
            {campaign.taskSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rewards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.rewardCard}>
            <View style={styles.rewardItem}>
              <Ionicons name="star" size={20} color={PRIVE_COLORS.gold.primary} />
              <Text style={styles.rewardItemText}>{campaign.reward.coinAmount} Coins</Text>
            </View>
            {cashbackValue > 0 && (
              <View style={styles.rewardItem}>
                <Ionicons name="cash-outline" size={20} color={PRIVE_COLORS.status.success} />
                <Text style={styles.rewardItemText}>
                  {cashbackValue}% Cashback{cashbackCap > 0 ? ` (up to ${cashbackCap.toFixed(2)})` : ''}
                </Text>
              </View>
            )}
            {campaign.reward.estimatedEarning ? (
              <Text style={styles.estimatedText}>Est. earning: {campaign.reward.estimatedEarning}</Text>
            ) : null}
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <View style={styles.reqList}>
            {(campaign.requirements.minPurchaseAmount ?? 0) > 0 && (
              <View style={styles.reqRow}>
                <Ionicons name="card-outline" size={14} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.reqItem}>
                  Min. purchase: {campaign.requirements.minPurchaseAmount!.toFixed(2)}
                </Text>
              </View>
            )}
            {campaign.requirements.postTypes?.length > 0 && (
              <View style={styles.reqRow}>
                <Ionicons name="camera-outline" size={14} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.reqItem}>
                  Post type: {campaign.requirements.postTypes.join(', ')}
                </Text>
              </View>
            )}
            {campaign.requirements.mustTagBrand && (
              <View style={styles.reqRow}>
                <Ionicons name="at-outline" size={14} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.reqItem}>Must tag the brand</Text>
              </View>
            )}
            {(campaign.requirements.minimumFollowers ?? 0) > 0 && (
              <View style={styles.reqRow}>
                <Ionicons name="people-outline" size={14} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.reqItem}>
                  Min. {campaign.requirements.minimumFollowers} followers
                </Text>
              </View>
            )}
            {campaign.requirements.hashtagRequired ? (
              <View style={styles.reqRow}>
                <Ionicons name="pricetag-outline" size={14} color={PRIVE_COLORS.gold.muted} />
                <Text style={styles.reqItem}>
                  Use {campaign.requirements.hashtagRequired}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Example Posts */}
        {campaign.examplePosts && campaign.examplePosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Example Posts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {campaign.examplePosts.map((url, i) => (
                <CachedImage
                  key={i}
                  source={{ uri: url }}
                  style={styles.exampleImage}
                  contentFit="cover"
                  borderRadius={PRIVE_RADIUS.md}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{campaign.slotsRemaining}</Text>
            <Text style={styles.statLabel}>Slots Left</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{campaign.endsInHours ?? 0}h</Text>
            <Text style={styles.statLabel}>Time Left</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{campaign.taskType.replace(/_/g, ' ')}</Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={[
            styles.ctaButton,
            isCTADisabled && styles.ctaDisabled,
            isApproved && styles.ctaApproved,
          ]}
          onPress={handleCTA}
          disabled={isCTADisabled || isJoining}
        >
          {isJoining ? (
            <ActivityIndicator color={PRIVE_COLORS.text.inverse} />
          ) : (
            <Text style={styles.ctaText}>{getCTAText()}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: PRIVE_SPACING.md,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.sm,
  },
  retryBtnText: {
    color: PRIVE_COLORS.text.inverse,
    fontWeight: '600',
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIVE_COLORS.status.success,
    paddingVertical: 10,
    paddingHorizontal: PRIVE_SPACING.lg,
  },
  approvedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PRIVE_SPACING.lg,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIVE_COLORS.background.elevated,
  },
  logoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: PRIVE_SPACING.md,
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
  },
  tierBadge: {
    fontSize: 12,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  section: {
    paddingHorizontal: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIVE_COLORS.gold.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 20,
  },
  rewardCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rewardItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  estimatedText: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
  reqList: {
    gap: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqItem: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    flex: 1,
  },
  exampleImage: {
    width: 140,
    height: 180,
    borderRadius: PRIVE_RADIUS.md,
    marginHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: PRIVE_SPACING.lg,
    gap: 10,
    marginBottom: PRIVE_SPACING.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: PRIVE_SPACING.lg,
    paddingBottom: 32,
    backgroundColor: PRIVE_COLORS.background.primary,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.border.primary,
  },
  ctaButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingVertical: 16,
    borderRadius: PRIVE_RADIUS.md,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: PRIVE_COLORS.text.disabled,
  },
  ctaApproved: {
    backgroundColor: PRIVE_COLORS.status.success,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.inverse,
  },
});
