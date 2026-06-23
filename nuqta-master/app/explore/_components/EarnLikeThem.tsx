import { colors } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import exploreApi, { ExploreStatsSummary } from '@/services/exploreApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

const steps = [
  {
    id: 1,
    icon: 'storefront',
    title: 'Visit Store',
    subtitle: 'Choose from nearby stores',
    color: Colors.info,
    bgColor: '#EBF5FF',
  },
  {
    id: 2,
    icon: 'card',
    title: `Pay with ${BRAND.APP_NAME}`,
    subtitle: 'Scan QR or enter amount',
    color: colors.brand.purpleMedium,
    bgColor: Colors.brand.purpleLight + '20',
  },
  {
    id: 3,
    icon: 'share-social',
    title: 'Share / Review',
    subtitle: 'Help others discover',
    color: colors.brand.pink,
    bgColor: colors.pinkMist,
  },
  {
    id: 4,
    icon: 'wallet',
    title: 'Earn More',
    subtitle: 'Get cashback + bonus coins',
    color: Colors.gold,
    bgColor: Colors.successScale[50],
  },
];

const EarnLikeThem = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [stats, setStats] = useState<ExploreStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatsSummary();
  }, []);

  const fetchStatsSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exploreApi.getStatsSummary();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        if (!isMounted()) return;
        setError('Failed to load stats');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load stats');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  // Helper to get stats with fallback for display
  const displayStats = {
    partnerStores: stats?.partnerStores || 0,
    maxCashback: stats?.maxCashback || 0,
    totalUsers: stats?.totalUsers || 0,
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${Math.floor(num / 1000)}k+`;
    }
    return `${num}+`;
  };

  // Update steps subtitle with dynamic store count
  const dynamicSteps = steps.map((step) => {
    if (step.id === 1) {
      return {
        ...step,
        subtitle: isLoading
          ? 'Choose from nearby stores'
          : `Choose from ${formatNumber(displayStats.partnerStores)} nearby stores`,
      };
    }
    return step;
  });

  return (
    <FeatureErrorBoundary featureName="Earn Like Them" compact={true}>
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.successScale[50], colors.tint.greenLight, colors.tint.green]}
        style={styles.card}
      >
        {/* Header */}
        <Text style={styles.title}>Earn Like Them</Text>
        <Text style={styles.subtitle}>Start your rewarding journey in 4 simple steps</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {dynamicSteps.map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepNumberContainer}>
                <LinearGradient
                  colors={[step.color, step.color]}
                  style={styles.stepNumber}
                >
                  <Text style={styles.stepNumberText}>{step.id}</Text>
                </LinearGradient>
              </View>
              <View style={[styles.stepIconContainer, { backgroundColor: step.bgColor }]}>
                <Ionicons name={step.icon as any} size={22} color={step.color} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            {isLoading ? (
              <View style={styles.skeletonContainer}>
                <View style={styles.skeletonValue} />
                <View style={styles.skeletonLabel} />
              </View>
            ) : (
              <>
                <Text style={styles.statValue}>{formatNumber(displayStats.partnerStores)}</Text>
                <Text style={styles.statLabel}>Partner Stores</Text>
              </>
            )}
          </View>
          <View style={[styles.statBox, styles.statBoxHighlight]}>
            {isLoading ? (
              <View style={styles.skeletonContainer}>
                <View style={[styles.skeletonValue, styles.skeletonLight]} />
                <View style={[styles.skeletonLabel, styles.skeletonLight]} />
              </View>
            ) : (
              <>
                <Text style={[styles.statValue, styles.statValueHighlight]}>
                  Up to {displayStats.maxCashback}%
                </Text>
                <Text style={[styles.statLabel, styles.statLabelHighlight]}>Cashback</Text>
              </>
            )}
          </View>
        </View>

        {/* CTA Button */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => navigateTo('/explore/map')}
        >
          <Text style={styles.ctaText}>Start Earning Nearby</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.text.inverse} />
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          {isLoading ? (
            <View style={styles.skeletonFooter} />
          ) : (
            <Text style={styles.footerText}>
              Join {formatNumber(displayStats.totalUsers)} users who are earning while spending
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.tint.green,
  },
  title: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepsContainer: {
    gap: 14,
    marginBottom: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepNumberContainer: {
    position: 'relative',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  stepSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
    minHeight: 70,
  },
  statBoxHighlight: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.nileBlue,
  },
  statValueHighlight: {
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statLabelHighlight: {
    color: 'rgba(255,255,255,0.9)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.base,
    borderRadius: 14,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  ctaText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  footer: {
    alignItems: 'center',
    minHeight: 18,
  },
  footerText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  skeletonContainer: {
    alignItems: 'center',
    gap: 6,
  },
  skeletonValue: {
    width: 60,
    height: 22,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
  },
  skeletonLabel: {
    width: 80,
    height: 12,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
  },
  skeletonLight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  skeletonFooter: {
    width: 200,
    height: 12,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
  },
});

export default React.memo(EarnLikeThem);
