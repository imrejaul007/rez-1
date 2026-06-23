import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import priveApi from '@/services/priveApi';
import { SectionListSkeleton } from '@/components/skeletons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function BenefitsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await priveApi.getTierComparison();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load benefits');
    }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <SectionListSkeleton />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        {error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ color: PRIVE_COLORS.status.error, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <Pressable
              style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIVE_COLORS.transparent.gold15, borderRadius: PRIVE_RADIUS.lg }}
              onPress={() => { setIsLoading(true); fetchData(); }}
            >
              <Text style={{ color: PRIVE_COLORS.gold.primary, fontSize: 14, fontWeight: '600' }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <PriveEmptyState icon="◈" title="Benefits unavailable" subtitle="Please try again later" />
        )}
      </View>
    );
  }

  const currentTier = data.currentTier || 'none';
  const tiers = data.tiers || [];
  const currentTierData = tiers.find((t: any) => t.isCurrent);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {/* Current Tier Card */}
        {currentTierData && (
          <View style={[styles.currentCard, { borderColor: currentTierData.color }]}>
            <View style={styles.currentHeader}>
              <View style={[styles.tierDot, { backgroundColor: currentTierData.color }]} />
              <Text style={styles.currentTitle}>{currentTierData.displayName} Tier</Text>
              <Text style={[styles.multiplierBadge, { color: currentTierData.color }]}>
                {currentTierData.coinMultiplier}x
              </Text>
            </View>
            <View style={styles.benefitsList}>
              {(currentTierData.benefits || []).map((b: string, i: number) => (
                <View key={i} style={styles.benefitRow}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
            {currentTierData.conciergeAccess && (
              <View style={styles.slaRow}>
                <Text style={styles.slaLabel}>Concierge SLA:</Text>
                <Text style={styles.slaValue}>{currentTierData.conciergeResponseSLA}h response</Text>
              </View>
            )}
          </View>
        )}

        {/* All Tiers Benefits */}
        <Text style={styles.sectionTitle}>All Tier Benefits</Text>
        {tiers.map((tier: any) => {
          const isCurrent = tier.isCurrent;
          const isLocked = !isCurrent && (
            (tier.tier === 'signature' && currentTier === 'entry') ||
            (tier.tier === 'elite' && currentTier !== 'elite')
          );

          return (
            <View
              key={tier.tier}
              style={[
                styles.tierCard,
                isCurrent && { borderColor: tier.color },
                isLocked && styles.tierLocked,
              ]}
            >
              <View style={styles.tierHeader}>
                <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                <Text style={[styles.tierName, isLocked && styles.lockedText]}>
                  {tier.displayName}
                </Text>
                <Text style={[styles.tierMultiplier, { color: tier.color }]}>
                  {tier.coinMultiplier}x coins
                </Text>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: `${tier.color}30` }]}>
                    <Text style={[styles.currentBadgeText, { color: tier.color }]}>Current</Text>
                  </View>
                )}
                {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
              </View>
              <View style={styles.benefitsList}>
                {(tier.benefits || []).map((b: string, i: number) => (
                  <View key={i} style={styles.benefitRow}>
                    <Text style={[styles.checkIcon, isLocked && styles.lockedText]}>
                      {isLocked ? '○' : '✓'}
                    </Text>
                    <Text style={[styles.benefitText, isLocked && styles.lockedText]}>{b}</Text>
                  </View>
                ))}
              </View>
              {tier.threshold && (
                <Text style={[styles.thresholdText, isLocked && styles.lockedText]}>
                  Requires score: {tier.threshold}+
                </Text>
              )}
            </View>
          );
        })}

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/prive/next-actions' as any)}
         
        >
          <Text style={styles.ctaText}>See How to Level Up</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.xl },
  currentCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 2,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
  },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.md, marginBottom: PRIVE_SPACING.lg },
  tierDot: { width: 12, height: 12, borderRadius: 6 },
  currentTitle: { fontSize: 18, fontWeight: '700', color: PRIVE_COLORS.text.primary, flex: 1 },
  multiplierBadge: { fontSize: 16, fontWeight: '700' },
  benefitsList: { gap: PRIVE_SPACING.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: PRIVE_SPACING.sm },
  checkIcon: { fontSize: 14, color: PRIVE_COLORS.status.success, marginTop: 1 },
  benefitText: { fontSize: 13, color: PRIVE_COLORS.text.secondary, flex: 1 },
  slaRow: {
    marginTop: PRIVE_SPACING.lg,
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slaLabel: { fontSize: 12, color: PRIVE_COLORS.text.tertiary },
  slaValue: { fontSize: 12, fontWeight: '600', color: PRIVE_COLORS.gold.primary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.text.primary, marginBottom: PRIVE_SPACING.lg },
  tierCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  tierLocked: { opacity: 0.6 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.sm, marginBottom: PRIVE_SPACING.md },
  tierName: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.text.primary, flex: 1 },
  tierMultiplier: { fontSize: 13, fontWeight: '600' },
  lockedText: { color: PRIVE_COLORS.text.tertiary },
  lockIcon: { fontSize: 14 },
  currentBadge: { paddingHorizontal: PRIVE_SPACING.sm, paddingVertical: 2, borderRadius: PRIVE_RADIUS.sm },
  currentBadgeText: { fontSize: 10, fontWeight: '700' },
  thresholdText: { fontSize: 11, color: PRIVE_COLORS.text.tertiary, marginTop: PRIVE_SPACING.md },
  ctaButton: {
    marginTop: PRIVE_SPACING.lg,
    paddingVertical: PRIVE_SPACING.lg,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderRadius: PRIVE_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  ctaText: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.gold.primary },
});

export default withErrorBoundary(BenefitsScreen, 'PriveBenefits');
