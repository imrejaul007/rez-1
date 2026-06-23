import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Trust Passport Dashboard
// Displays user's trust score, 6 pillar breakdown, credit limit, and verification status

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { apiClient } from '@/utils/apiClient';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PillarData {
  score: number;
  weight: number;
}

interface TrustPassportData {
  score: number;
  tier: 'entry' | 'signature' | 'elite';
  nextTier: string | null;
  pointsToNext: number;
  pillars: {
    engagement: PillarData;
    trust: PillarData;
    influence: PillarData;
    economicValue: PillarData;
    brandAffinity: PillarData;
    network: PillarData;
  };
  creditLimit: number;
  verifications: {
    phone: boolean;
    email: boolean;
    kyc: boolean;
    bank: boolean;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  entry: '#C9A962',
  signature: '#E5C878',
  elite: '#FFD700',
};

const TIER_LABELS: Record<string, string> = {
  entry: 'Entry',
  signature: 'Signature',
  elite: 'Elite',
};

const PILLAR_CONFIG: {
  key: keyof TrustPassportData['pillars'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'engagement', label: 'Engagement', icon: 'flame', color: '#F97316' },
  { key: 'trust', label: 'Trust', icon: 'shield-checkmark', color: '#2563EB' },
  { key: 'influence', label: 'Influence', icon: 'megaphone', color: '#8B5CF6' },
  { key: 'economicValue', label: 'Economic Value', icon: 'cash', color: '#10B981' },
  { key: 'brandAffinity', label: 'Brand Affinity', icon: 'heart', color: '#EC4899' },
  { key: 'network', label: 'Network', icon: 'people', color: '#06B6D4' },
];

const VERIFICATION_ITEMS: {
  key: keyof TrustPassportData['verifications'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}[] = [
  { key: 'phone', label: 'Phone Number', icon: 'call-outline', route: '/account/profile' },
  { key: 'email', label: 'Email Address', icon: 'mail-outline', route: '/account/profile' },
  { key: 'kyc', label: 'KYC Verification', icon: 'document-text-outline', route: '/account/profile' },
  { key: 'bank', label: 'Bank Account', icon: 'card-outline', route: '/account/payment-methods' },
];

const SCORE_RING_SIZE = 140;
const SCORE_RING_BORDER = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.entry;
  const progress = score / 100;
  // Use border-based ring — the filled portion is the colored border,
  // and the remaining is a lighter track.
  return (
    <View style={styles.scoreRingContainer}>
      {/* Track (background ring) */}
      <View
        style={[
          styles.scoreRingTrack,
          {
            width: SCORE_RING_SIZE,
            height: SCORE_RING_SIZE,
            borderRadius: SCORE_RING_SIZE / 2,
            borderWidth: SCORE_RING_BORDER,
            borderColor: 'rgba(255,255,255,0.15)',
          },
        ]}
      />
      {/* Filled ring — we simulate a partial ring by overlaying 4 quarter arcs */}
      {/* Top-right quarter */}
      <View
        style={[
          styles.scoreRingQuarter,
          {
            width: SCORE_RING_SIZE,
            height: SCORE_RING_SIZE,
            borderRadius: SCORE_RING_SIZE / 2,
            borderWidth: SCORE_RING_BORDER,
            borderColor: 'transparent',
            borderTopColor: progress > 0 ? tierColor : 'transparent',
            borderRightColor: progress > 0.25 ? tierColor : 'transparent',
            borderBottomColor: progress > 0.5 ? tierColor : 'transparent',
            borderLeftColor: progress > 0.75 ? tierColor : 'transparent',
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
      {/* Score number in center */}
      <View style={styles.scoreRingCenter}>
        <ThemedText style={styles.scoreNumber}>{score}</ThemedText>
        <ThemedText style={styles.scoreLabel}>/ 100</ThemedText>
      </View>
    </View>
  );
}

function PillarCard({ pillar, data }: { pillar: typeof PILLAR_CONFIG[number]; data: PillarData }) {
  const weightPercent = Math.round(data.weight * 100);
  return (
    <View style={styles.pillarCard}>
      <View style={[styles.pillarIconContainer, { backgroundColor: pillar.color + '18' }]}>
        <Ionicons name={pillar.icon} size={20} color={pillar.color} />
      </View>
      <ThemedText style={styles.pillarName} numberOfLines={1}>
        {pillar.label}
      </ThemedText>
      <ThemedText style={styles.pillarWeight}>{weightPercent}% weight</ThemedText>
      <View style={styles.pillarBarTrack}>
        <View
          style={[
            styles.pillarBarFill,
            {
              width: `${data.score}%`,
              backgroundColor: pillar.color,
            },
          ]}
        />
      </View>
      <ThemedText style={styles.pillarScore}>{data.score}</ThemedText>
    </View>
  );
}

function VerificationItem({
  item,
  verified,
  onPress,
}: {
  item: typeof VERIFICATION_ITEMS[number];
  verified: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.verificationRow}
      onPress={verified ? undefined : onPress}
      disabled={verified}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} ${verified ? 'verified' : 'not verified'}`}
    >
      <View style={styles.verificationLeft}>
        <View style={[styles.verificationIconContainer, verified && styles.verificationIconVerified]}>
          <Ionicons name={item.icon} size={18} color={verified ? '#FFFFFF' : colors.neutral[500]} />
        </View>
        <ThemedText style={styles.verificationLabel}>{item.label}</ThemedText>
      </View>
      {verified ? (
        <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
      ) : (
        <View style={styles.verifyButton}>
          <ThemedText style={styles.verifyButtonText}>Verify</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={colors.secondary[600]} />
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function TrustPassportPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [data, setData] = useState<TrustPassportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPassport = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TrustPassportData>('/user/trust-passport');
      if (!isMounted()) return;
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to load trust passport');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchPassport();
  }, [authLoading, isAuthenticated, fetchPassport]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPassport(true);
  }, [fetchPassport]);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  // Loading state
  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <LinearGradient colors={[colors.nileBlue, colors.secondary[500]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle} accessibilityRole="header">
              Trust Passport
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary[600]} />
          <ThemedText style={styles.loadingText}>Loading your trust passport...</ThemedText>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />
        <LinearGradient colors={[colors.nileBlue, colors.secondary[500]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle} accessibilityRole="header">
              Trust Passport
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          </View>
          <ThemedText style={styles.errorTitle}>Unable to Load</ThemedText>
          <ThemedText style={styles.errorSubtitle}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchPassport()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const tierColor = TIER_COLORS[data.tier] || TIER_COLORS.entry;
  const tierLabel = TIER_LABELS[data.tier] || data.tier;
  const verifiedCount = Object.values(data.verifications).filter(Boolean).length;
  const totalVerifications = Object.keys(data.verifications).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.nileBlue} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary[600]}
            colors={[colors.secondary[600]]}
          />
        }
      >
        {/* ----------------------------------------------------------------- */}
        {/* Header + Score Ring                                                */}
        {/* ----------------------------------------------------------------- */}
        <LinearGradient
          colors={[colors.nileBlue, colors.secondary[500]]}
          style={styles.heroGradient}
        >
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle} accessibilityRole="header">
              Trust Passport
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScoreRing score={data.score} tier={data.tier} />

          {/* Tier badge */}
          <View style={[styles.tierBadge, { backgroundColor: tierColor + '30' }]}>
            <Ionicons name="ribbon" size={16} color={tierColor} />
            <ThemedText style={[styles.tierBadgeText, { color: tierColor }]}>
              {tierLabel} Tier
            </ThemedText>
          </View>

          {/* Points to next tier */}
          {data.nextTier && data.pointsToNext > 0 && (
            <ThemedText style={styles.nextTierText}>
              {data.pointsToNext} points to {TIER_LABELS[data.nextTier] || data.nextTier}
            </ThemedText>
          )}
        </LinearGradient>

        {/* ----------------------------------------------------------------- */}
        {/* Credit Limit Card                                                  */}
        {/* ----------------------------------------------------------------- */}
        <View style={styles.section}>
          <View style={styles.creditCard}>
            <View style={styles.creditCardHeader}>
              <View style={styles.creditIconContainer}>
                <Ionicons name="wallet-outline" size={22} color={colors.secondary[600]} />
              </View>
              <View style={styles.creditCardInfo}>
                <ThemedText style={styles.creditLabel}>Credit Limit</ThemedText>
                <ThemedText style={styles.creditAmount}>
                  AED {formatCurrency(data.creditLimit)}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.creditNote}>
              Based on your {tierLabel} tier trust score
            </ThemedText>
          </View>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* Pillar Breakdown                                                   */}
        {/* ----------------------------------------------------------------- */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Score Breakdown</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Your trust score is calculated across 6 pillars
          </ThemedText>
          <View style={styles.pillarGrid}>
            {PILLAR_CONFIG.map((pillar) => (
              <PillarCard
                key={pillar.key}
                pillar={pillar}
                data={data.pillars[pillar.key]}
              />
            ))}
          </View>
        </View>

        {/* ----------------------------------------------------------------- */}
        {/* Verification Checklist                                             */}
        {/* ----------------------------------------------------------------- */}
        <View style={styles.section}>
          <View style={styles.verificationHeader}>
            <ThemedText style={styles.sectionTitle}>Verification Status</ThemedText>
            <View style={styles.verificationBadge}>
              <ThemedText style={styles.verificationBadgeText}>
                {verifiedCount}/{totalVerifications}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.sectionSubtitle}>
            Complete verifications to boost your trust score
          </ThemedText>
          <View style={styles.verificationCard}>
            {VERIFICATION_ITEMS.map((item, idx) => (
              <React.Fragment key={item.key}>
                <VerificationItem
                  item={item}
                  verified={data.verifications[item.key]}
                  onPress={() => router.push(item.route as any)}
                />
                {idx < VERIFICATION_ITEMS.length - 1 && <View style={styles.verificationDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 44,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 44,
    paddingBottom: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Score Ring
  scoreRingContainer: {
    width: SCORE_RING_SIZE,
    height: SCORE_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreRingTrack: {
    position: 'absolute',
  },
  scoreRingQuarter: {
    position: 'absolute',
  },
  scoreRingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 48,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: -2,
  },

  // Tier Badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextTierText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral[500],
    marginTop: 4,
    marginBottom: 14,
  },

  // Credit Limit Card
  creditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(26,58,82,0.06)' },
    }),
  },
  creditCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  creditIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditCardInfo: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  creditAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: 2,
  },
  creditNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral[400],
  },

  // Pillar Grid
  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pillarCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(26,58,82,0.05)' },
    }),
  },
  pillarIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pillarName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  pillarWeight: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[400],
    marginBottom: 8,
  },
  pillarBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[200],
    marginBottom: 6,
    overflow: 'hidden',
  },
  pillarBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarScore: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },

  // Verification
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationBadge: {
    backgroundColor: colors.secondary[50],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary[600],
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(26,58,82,0.05)' },
    }),
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verificationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationIconVerified: {
    backgroundColor: Colors.success,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verifyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary[600],
  },
  verificationDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: 62,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[500],
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.error + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default withErrorBoundary(TrustPassportPage, 'Trust Passport');
