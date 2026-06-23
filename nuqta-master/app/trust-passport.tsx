import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Trust Passport Page
// Shows user's trust score, verification status, and benefits of higher trust

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { SectionListSkeleton } from '@/components/skeletons';
import { useIsAuthenticated, useAuthLoading, useAuthUser } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import apiClient from '@/services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';

// Trust tier definitions
const TRUST_TIERS = [
  { name: 'Bronze', min: 0, max: 200, color: '#CD7F32', icon: 'shield-outline' as const },
  { name: 'Silver', min: 201, max: 400, color: '#C0C0C0', icon: 'shield-half-outline' as const },
  { name: 'Gold', min: 401, max: 600, color: '#FFD700', icon: 'shield' as const },
  { name: 'Platinum', min: 601, max: 800, color: '#E5E4E2', icon: 'shield-checkmark-outline' as const },
  { name: 'Diamond', min: 801, max: 1000, color: '#B9F2FF', icon: 'shield-checkmark' as const },
] as const;

type VerificationStatus = 'verified' | 'pending' | 'submitted' | 'not_verified' | 'not_submitted' | 'not_linked';

interface VerificationItem {
  id: string;
  label: string;
  icon: string;
  status: VerificationStatus;
  route?: string;
  comingSoon?: boolean;
}

interface TrustData {
  score: number;
  verifications: {
    phone: boolean;
    email: boolean;
    aadhaar: VerificationStatus;
    pan: VerificationStatus;
    bankAccount: boolean;
    selfie: boolean;
  };
}

const DEFAULT_TRUST_DATA: TrustData = {
  score: 0,
  verifications: {
    phone: true, // Always verified (OTP auth)
    email: false,
    aadhaar: 'not_submitted',
    pan: 'not_submitted',
    bankAccount: false,
    selfie: false,
  },
};

const TRUST_BENEFITS = [
  {
    title: 'Higher Credit Limit',
    description: 'Unlock up to unlimited credit with Diamond tier trust score',
    icon: 'trending-up',
  },
  {
    title: 'Lower Commission',
    description: 'Enjoy reduced commission rates on all marketplace orders',
    icon: 'pricetag',
  },
  {
    title: 'Priority Support',
    description: 'Get faster responses from our dedicated support team',
    icon: 'headset',
  },
  {
    title: 'Exclusive Offers',
    description: 'Access special deals and early access to new features',
    icon: 'gift',
  },
  {
    title: 'Higher Transfer Limits',
    description: 'Send and receive larger amounts with higher trust',
    icon: 'swap-horizontal',
  },
];

function getTierForScore(score: number) {
  for (const tier of TRUST_TIERS) {
    if (score >= tier.min && score <= tier.max) return tier;
  }
  return TRUST_TIERS[0];
}

function getNextTier(score: number) {
  const currentTier = getTierForScore(score);
  const idx = TRUST_TIERS.findIndex(t => t.name === currentTier.name);
  if (idx < TRUST_TIERS.length - 1) return TRUST_TIERS[idx + 1];
  return null;
}

function TrustPassportPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const user = useAuthUser();
  const isMounted = useIsMounted();

  const [trustData, setTrustData] = useState<TrustData>(DEFAULT_TRUST_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [benefitsExpanded, setBenefitsExpanded] = useState(false);

  // Animated score ring
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  const fetchTrustData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Try dedicated trust score endpoint first
      const res = await apiClient.get<{
        score: number;
        trustScore?: number;
        verifications?: TrustData['verifications'];
      }>('/user/trust-score');

      if (!isMounted()) return;

      if (res.success && res.data) {
        const score = res.data.score ?? res.data.trustScore ?? 0;
        setTrustData({
          score,
          verifications: res.data.verifications ?? {
            ...DEFAULT_TRUST_DATA.verifications,
            email: !!user?.email,
          },
        });
        animateScore(score);
      } else {
        // Fallback: try prive eligibility endpoint (has trustScore)
        await fetchFromPrive();
      }
    } catch {
      // Fallback to prive eligibility
      try {
        await fetchFromPrive();
      } catch {
        if (isMounted()) {
          // Use default with email check
          setTrustData({
            ...DEFAULT_TRUST_DATA,
            verifications: {
              ...DEFAULT_TRUST_DATA.verifications,
              email: !!user?.email,
            },
          });
          animateScore(0);
          setError(false); // Don't show error — show Coming Soon note
        }
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted, user]);

  const fetchFromPrive = async () => {
    const priveRes = await apiClient.get<{
      trustScore: number;
      score?: number;
    }>('/prive/eligibility');

    if (!isMounted()) return;

    if (priveRes.success && priveRes.data) {
      // Scale trustScore: prive uses 0-100, passport uses 0-1000
      const rawScore = priveRes.data.trustScore ?? 0;
      const scaledScore = Math.round(rawScore * 10);
      setTrustData({
        score: scaledScore,
        verifications: {
          ...DEFAULT_TRUST_DATA.verifications,
          email: !!user?.email,
        },
      });
      animateScore(scaledScore);
    }
  };

  const animateScore = (targetScore: number) => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, {
      toValue: targetScore / 1000,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    fetchTrustData();
  }, [fetchTrustData]);

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const currentTier = getTierForScore(trustData.score);
  const nextTier = getNextTier(trustData.score);
  const pointsToNext = nextTier ? nextTier.min - trustData.score : 0;

  // Build verification checklist
  const verificationItems: VerificationItem[] = [
    {
      id: 'phone',
      label: 'Phone Number',
      icon: 'call',
      status: 'verified', // Always verified via OTP
    },
    {
      id: 'email',
      label: 'Email Address',
      icon: 'mail',
      status: trustData.verifications.email ? 'verified' : 'not_verified',
      route: '/account/profile',
    },
    {
      id: 'aadhaar',
      label: 'Aadhaar Card',
      icon: 'id-card',
      status: trustData.verifications.aadhaar,
      comingSoon: true,
    },
    {
      id: 'pan',
      label: 'PAN Card',
      icon: 'document-text',
      status: trustData.verifications.pan,
      comingSoon: true,
    },
    {
      id: 'bank',
      label: 'Bank Account',
      icon: 'business',
      status: trustData.verifications.bankAccount ? 'verified' : 'not_linked',
      route: '/account/payment-methods',
    },
    {
      id: 'selfie',
      label: 'Selfie Verification',
      icon: 'camera',
      status: trustData.verifications.selfie ? 'verified' : 'not_verified',
      comingSoon: true,
    },
  ];

  const getStatusConfig = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return { icon: 'checkmark-circle' as const, color: Colors.success, label: 'Verified' };
      case 'pending':
      case 'submitted':
        return { icon: 'time' as const, color: Colors.warning, label: status === 'pending' ? 'Pending' : 'Submitted' };
      default:
        return { icon: 'ellipse-outline' as const, color: Colors.gray[400], label: 'Not Verified' };
    }
  };

  const handleVerificationTap = (item: VerificationItem) => {
    if (item.status === 'verified') return;
    if (item.comingSoon) {
      platformAlertSimple('Coming Soon', `${item.label} verification will be available soon.`);
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={handleBack} />
        <SectionListSkeleton />
      </View>
    );
  }

  // Score ring progress (for the circle visual)
  const scorePercentage = trustData.score / 1000;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <Header onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Trust Score Card */}
        <View style={styles.scoreCard}>
          <LinearGradient
            colors={[Colors.nileBlue, Colors.secondary[500]]}
            style={styles.scoreCardGradient}
          >
            {/* Score Ring */}
            <View style={styles.scoreRingContainer}>
              <View style={styles.scoreRingOuter}>
                {/* Background ring */}
                <View style={styles.scoreRingBg} />
                {/* Progress arc (simplified with border) */}
                <Animated.View
                  style={[
                    styles.scoreRingProgress,
                    {
                      borderColor: currentTier.color,
                      opacity: animatedProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ]}
                />
                {/* Center content */}
                <View style={styles.scoreRingCenter}>
                  <ThemedText style={styles.scoreValue}>{trustData.score}</ThemedText>
                  <ThemedText style={styles.scoreMax}>/ 1000</ThemedText>
                </View>
              </View>
            </View>

            {/* Tier Badge */}
            <View style={[styles.tierBadge, { backgroundColor: currentTier.color + '30' }]}>
              <Ionicons name={currentTier.icon} size={18} color={currentTier.color} />
              <ThemedText style={[styles.tierBadgeText, { color: currentTier.color }]}>
                {currentTier.name} Tier
              </ThemedText>
            </View>

            {/* Next tier progress */}
            {nextTier && (
              <View style={styles.nextTierContainer}>
                <ThemedText style={styles.nextTierText}>
                  {pointsToNext} points to{' '}
                  <ThemedText style={[styles.nextTierName, { color: nextTier.color }]}>
                    {nextTier.name}
                  </ThemedText>
                </ThemedText>
                <View style={styles.nextTierProgressBg}>
                  <Animated.View
                    style={[
                      styles.nextTierProgressFill,
                      {
                        backgroundColor: currentTier.color,
                        width: animatedProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${scorePercentage * 100}%`],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {!nextTier && (
              <ThemedText style={styles.maxTierText}>
                Maximum trust tier achieved!
              </ThemedText>
            )}
          </LinearGradient>
        </View>

        {/* Tier Overview */}
        <View style={styles.tierOverviewCard}>
          <ThemedText style={styles.cardTitle}>Trust Tiers</ThemedText>
          <View style={styles.tierList}>
            {TRUST_TIERS.map(tier => {
              const isCurrentTier = tier.name === currentTier.name;
              return (
                <View
                  key={tier.name}
                  style={[
                    styles.tierRow,
                    isCurrentTier && styles.tierRowActive,
                  ]}
                >
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <ThemedText style={[
                    styles.tierRowName,
                    isCurrentTier && styles.tierRowNameActive,
                  ]}>
                    {tier.name}
                  </ThemedText>
                  <ThemedText style={styles.tierRowRange}>
                    {tier.min} - {tier.max}
                  </ThemedText>
                  {isCurrentTier && (
                    <View style={styles.currentBadge}>
                      <ThemedText style={styles.currentBadgeText}>You</ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Verification Checklist */}
        <View style={styles.verificationCard}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardTitle}>Verification Checklist</ThemedText>
            <ThemedText style={styles.verifiedCount}>
              {verificationItems.filter(v => v.status === 'verified').length}/{verificationItems.length} Verified
            </ThemedText>
          </View>

          <View style={styles.verificationList}>
            {verificationItems.map(item => {
              const statusConfig = getStatusConfig(item.status);
              const isVerified = item.status === 'verified';
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.verificationItem,
                    isVerified && styles.verificationItemVerified,
                  ]}
                  onPress={() => handleVerificationTap(item)}
                  disabled={isVerified}
                >
                  <View style={[
                    styles.verificationIconContainer,
                    { backgroundColor: (isVerified ? Colors.success : Colors.gray[400]) + '15' },
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={isVerified ? Colors.success : Colors.gray[500]}
                    />
                  </View>
                  <View style={styles.verificationInfo}>
                    <ThemedText style={styles.verificationLabel}>{item.label}</ThemedText>
                    <ThemedText style={[styles.verificationStatus, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={statusConfig.icon}
                    size={22}
                    color={statusConfig.color}
                  />
                  {!isVerified && (
                    <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Benefits of Higher Trust */}
        <View style={styles.benefitsCard}>
          <Pressable
            style={styles.benefitsHeader}
            onPress={() => setBenefitsExpanded(!benefitsExpanded)}
          >
            <View style={[styles.benefitsIcon, { backgroundColor: Colors.nileBlue + '15' }]}>
              <Ionicons name="star" size={20} color={Colors.nileBlue} />
            </View>
            <ThemedText style={styles.cardTitle}>Benefits of Higher Trust</ThemedText>
            <Ionicons
              name={benefitsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.text.tertiary}
            />
          </Pressable>

          {benefitsExpanded && (
            <View style={styles.benefitsList}>
              {TRUST_BENEFITS.map((benefit, idx) => (
                <View
                  key={benefit.title}
                  style={[
                    styles.benefitItem,
                    idx < TRUST_BENEFITS.length - 1 && styles.benefitItemBorder,
                  ]}
                >
                  <View style={[styles.benefitIconContainer, { backgroundColor: Colors.nileBlue + '10' }]}>
                    <Ionicons name={benefit.icon as any} size={18} color={Colors.nileBlue} />
                  </View>
                  <View style={styles.benefitInfo}>
                    <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
                    <ThemedText style={styles.benefitDescription}>{benefit.description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Coming Soon Note */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.nileBlue} />
          <ThemedText style={styles.infoText}>
            Trust Passport is being enhanced. Some verification methods and trust score calculations
            are being finalized. Complete available verifications now to boost your score when
            the full system launches.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Trust Passport</ThemedText>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
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
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },

  // Score Card
  scoreCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  scoreCardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  scoreRingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  scoreRingOuter: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingBg: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  scoreRingProgress: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  scoreRingCenter: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.background.primary,
  },
  scoreMax: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },

  // Tier Badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Next tier progress
  nextTierContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  nextTierText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  nextTierName: {
    fontWeight: '700',
  },
  nextTierProgressBg: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextTierProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  maxTierText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },

  // Tier Overview
  tierOverviewCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cardTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    flex: 1,
  },
  tierList: {
    gap: Spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  tierRowActive: {
    backgroundColor: Colors.nileBlue + '08',
    borderWidth: 1,
    borderColor: Colors.nileBlue + '20',
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierRowName: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  tierRowNameActive: {
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  tierRowRange: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },

  // Verification
  verificationCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  verifiedCount: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },
  verificationList: {
    gap: Spacing.sm,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    gap: Spacing.md,
  },
  verificationItemVerified: {
    backgroundColor: Colors.success + '08',
  },
  verificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  verificationStatus: {
    ...Typography.caption,
    marginTop: 1,
  },

  // Benefits
  benefitsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  benefitsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitsList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  benefitItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  benefitDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Info
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.nileBlue + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});

export default withErrorBoundary(TrustPassportPage, 'TrustPassport');
