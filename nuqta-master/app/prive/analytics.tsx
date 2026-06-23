import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS, PILLAR_CONFIG } from '@/components/prive/priveTheme';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import { TransactionListSkeleton } from '@/components/skeletons';
import usePriveEligibility from '@/hooks/usePriveEligibility';
import priveApi from '@/services/priveApi';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

function AnalyticsScreen() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { tier } = usePriveEligibility();
  const tierRank: Record<string, number> = { none: 0, entry: 1, signature: 2, elite: 3 };

  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await priveApi.getAnalytics(period);
      if (!isMounted()) return;
      if (response.success && response.data) setData(response.data);
    } catch (e) { if (!isMounted()) return; catchAndReport(e, setError, 'Analytics/fetchData'); }
    finally { if (!isMounted()) return; setIsLoading(false); setIsRefreshing(false); }
  }, [period]);

  const isMounted = useIsMounted();
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    setIsLoading(true); fetchData();
  }, [fetchData, isAuthenticated, authLoading]);
  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  const periods = [30, 60, 90];

  if (tierRank[tier] < 2) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <PriveEmptyState
          icon="📊"
          title="Analytics is available for Signature and Elite members"
          subtitle="Upgrade your tier to access detailed analytics"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <TransactionListSkeleton />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <PriveEmptyState icon="📊" title="Analytics unavailable" subtitle="Start earning coins to see your analytics" />
      </View>
    );
  }

  const getTrendArrow = (direction: string) => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (direction: string) => {
    if (direction === 'up') return PRIVE_COLORS.status.success;
    if (direction === 'down') return PRIVE_COLORS.status.error;
    return PRIVE_COLORS.text.tertiary;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {/* Period Toggle */}
        <View style={styles.periodBar}>
          {periods.map(p => (
            <Pressable
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}d</Text>
            </Pressable>
          ))}
        </View>

        {/* Earnings Velocity */}
        {data.earningsVelocity && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Earnings Velocity</Text>
            <View style={styles.velocityRow}>
              <View style={styles.velocityItem}>
                <Text style={styles.velocityValue}>{data.earningsVelocity.current || 0}</Text>
                <Text style={styles.velocityLabel}>This Period</Text>
              </View>
              <View style={styles.velocityDivider} />
              <View style={styles.velocityItem}>
                <Text style={styles.velocityValue}>{data.earningsVelocity.previous || 0}</Text>
                <Text style={styles.velocityLabel}>Previous</Text>
              </View>
              <View style={styles.velocityDivider} />
              <View style={styles.velocityItem}>
                <Text style={[styles.velocityValue, {
                  color: (data.earningsVelocity.changePercent || 0) >= 0
                    ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error
                }]}>
                  {(data.earningsVelocity.changePercent || 0) >= 0 ? '+' : ''}
                  {(data.earningsVelocity.changePercent || 0).toFixed(0)}%
                </Text>
                <Text style={styles.velocityLabel}>Change</Text>
              </View>
            </View>
          </View>
        )}

        {/* Projected Tier */}
        {data.projectedTierDate && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Projected Tier Date</Text>
            <Text style={styles.projectionText}>{data.projectedTierDate}</Text>
          </View>
        )}

        {/* Pillar Momentum */}
        {data.pillarMomentum && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pillar Momentum</Text>
            {Object.entries(data.pillarMomentum).map(([pillarId, info]: [string, any]) => {
              const pillarConfig = Object.values(PILLAR_CONFIG).find(
                (p: any) => p.id === pillarId || p.label?.toLowerCase().includes(pillarId.toLowerCase())
              ) as any;
              const color = pillarConfig?.color || PRIVE_COLORS.text.secondary;
              return (
                <View key={pillarId} style={styles.pillarRow}>
                  <View style={[styles.pillarDot, { backgroundColor: color }]} />
                  <Text style={styles.pillarName}>{pillarId}</Text>
                  <Text style={styles.pillarScore}>{info.current || 0}</Text>
                  <Text style={[styles.pillarDelta, { color: getTrendColor(info.direction) }]}>
                    {getTrendArrow(info.direction)} {info.delta != null ? `${info.delta > 0 ? '+' : ''}${info.delta}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Reputation Trend */}
        {data.reputationTrend && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reputation Trend</Text>
            <Text style={styles.trendDirection}>
              Overall: <Text style={{ color: getTrendColor(data.reputationTrend.direction) }}>
                {getTrendArrow(data.reputationTrend.direction)} {data.reputationTrend.direction}
              </Text>
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.xl },
  periodBar: { flexDirection: 'row', gap: PRIVE_SPACING.sm, paddingVertical: PRIVE_SPACING.lg, justifyContent: 'center' },
  periodTab: {
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.sm,
    borderRadius: PRIVE_RADIUS.full,
    backgroundColor: PRIVE_COLORS.transparent.white05,
  },
  periodTabActive: { backgroundColor: PRIVE_COLORS.transparent.gold15, borderWidth: 1, borderColor: PRIVE_COLORS.gold.primary },
  periodText: { fontSize: 13, color: PRIVE_COLORS.text.tertiary, fontWeight: '500' },
  periodTextActive: { color: PRIVE_COLORS.gold.primary, fontWeight: '600' },
  card: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.text.primary, marginBottom: PRIVE_SPACING.lg },
  velocityRow: { flexDirection: 'row', alignItems: 'center' },
  velocityItem: { flex: 1, alignItems: 'center' },
  velocityValue: { fontSize: 22, fontWeight: '300', color: PRIVE_COLORS.gold.primary },
  velocityLabel: { fontSize: 11, color: PRIVE_COLORS.text.tertiary, marginTop: 4 },
  velocityDivider: { width: 1, height: 30, backgroundColor: PRIVE_COLORS.transparent.white10 },
  projectionText: { fontSize: 15, color: PRIVE_COLORS.gold.primary, fontWeight: '500' },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.md, paddingVertical: PRIVE_SPACING.sm },
  pillarDot: { width: 8, height: 8, borderRadius: 4 },
  pillarName: { flex: 1, fontSize: 13, color: PRIVE_COLORS.text.secondary, textTransform: 'capitalize' },
  pillarScore: { fontSize: 13, fontWeight: '600', color: PRIVE_COLORS.text.primary, width: 30, textAlign: 'right' },
  pillarDelta: { fontSize: 12, fontWeight: '500', width: 50, textAlign: 'right' },
  trendDirection: { fontSize: 14, color: PRIVE_COLORS.text.secondary },
});

export default withErrorBoundary(AnalyticsScreen, 'PriveAnalytics');
