// @ts-nocheck
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
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

const COMPARISON_ROWS = [
  { label: 'Coin Multiplier', key: 'coinMultiplier', format: (v: number) => `${v}x` },
  { label: 'Concierge Access', key: 'conciergeAccess', format: (v: boolean) => v ? '✓' : '✗' },
  { label: 'Concierge SLA', key: 'conciergeResponseSLA', format: (v: number) => `${v}h` },
  { label: 'Invite Codes', key: 'inviteCodesLimit', format: (v: number) => `${v}` },
  { label: 'Min Score', key: 'threshold', format: (v: number) => `${v}+` },
];

function TierComparisonScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await priveApi.getTierComparison();
      if (!isMounted()) return;
      if (response.success && response.data) setData(response.data);
    } catch (e) { if (!isMounted()) return; catchAndReport(e, setError, 'TierComparison/fetchData'); }
    finally { if (!isMounted()) return; setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <CardGridSkeleton />
      </View>
    );
  }

  if (!data?.tiers?.length) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <PriveEmptyState icon="◈" title="Comparison unavailable" />
      </View>
    );
  }

  const tiers = data.tiers;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {/* Score indicator */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Your Score:</Text>
          <Text style={styles.scoreValue}>{data.score}</Text>
          <Text style={styles.scoreTier}>({data.currentTier})</Text>
        </View>

        {/* Column Headers */}
        <View style={styles.headerRow}>
          <View style={styles.labelCol} />
          {tiers.map((t: any) => (
            <View key={t.tier} style={[styles.tierCol, t.isCurrent && { backgroundColor: `${t.color}15` }]}>
              <View style={[styles.tierDot, { backgroundColor: t.color }]} />
              <Text style={[styles.colHeader, { color: t.color }]}>{t.displayName}</Text>
              {t.isCurrent && <Text style={styles.youBadge}>YOU</Text>}
            </View>
          ))}
        </View>

        {/* Comparison Rows */}
        {COMPARISON_ROWS.map((row) => (
          <View key={row.key} style={styles.compRow}>
            <View style={styles.labelCol}>
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            {tiers.map((t: any) => {
              const val = t[row.key];
              const formatted = row.format(val);
              const isCheck = formatted === '✓';
              const isCross = formatted === '✗';
              return (
                <View key={t.tier} style={[styles.tierCol, t.isCurrent && { backgroundColor: `${t.color}08` }]}>
                  <Text style={[
                    styles.cellText,
                    isCheck && styles.checkText,
                    isCross && styles.crossText,
                    t.isCurrent && { color: t.color },
                  ]}>
                    {formatted}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* Benefits rows */}
        <Text style={styles.benefitsHeader}>Benefits</Text>
        {tiers.map((t: any) => (
          <View key={t.tier} style={[styles.benefitTierBlock, { borderLeftColor: t.color }]}>
            <Text style={[styles.benefitTierName, { color: t.color }]}>{t.displayName}</Text>
            {(t.benefits || []).map((b: string, i: number) => (
              <Text key={i} style={styles.benefitItem}>• {b}</Text>
            ))}
          </View>
        ))}

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
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.lg },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PRIVE_SPACING.sm,
    paddingVertical: PRIVE_SPACING.lg,
    justifyContent: 'center',
  },
  scoreLabel: { fontSize: 14, color: PRIVE_COLORS.text.secondary },
  scoreValue: { fontSize: 24, fontWeight: '700', color: PRIVE_COLORS.gold.primary },
  scoreTier: { fontSize: 14, color: PRIVE_COLORS.text.tertiary, textTransform: 'capitalize' },
  headerRow: {
    flexDirection: 'row',
    marginBottom: PRIVE_SPACING.sm,
  },
  labelCol: { flex: 1.2, justifyContent: 'center' },
  tierCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.sm,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  colHeader: { fontSize: 12, fontWeight: '700' },
  youBadge: { fontSize: 9, fontWeight: '700', color: PRIVE_COLORS.gold.primary, marginTop: 2 },
  compRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.transparent.white05,
    paddingVertical: PRIVE_SPACING.md,
  },
  rowLabel: { fontSize: 12, color: PRIVE_COLORS.text.secondary },
  cellText: { fontSize: 13, fontWeight: '600', color: PRIVE_COLORS.text.primary },
  checkText: { color: PRIVE_COLORS.status.success },
  crossText: { color: PRIVE_COLORS.text.tertiary },
  benefitsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.xxl,
    marginBottom: PRIVE_SPACING.lg,
  },
  benefitTierBlock: {
    borderLeftWidth: 3,
    paddingLeft: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
  },
  benefitTierName: { fontSize: 14, fontWeight: '600', marginBottom: PRIVE_SPACING.sm },
  benefitItem: { fontSize: 12, color: PRIVE_COLORS.text.secondary, marginBottom: 4 },
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

export default withErrorBoundary(TierComparisonScreen, 'PriveTierComparison');
