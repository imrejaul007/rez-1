import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveProgressRing } from '@/components/prive/PriveProgressRing';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import { CardGridSkeleton } from '@/components/skeletons';
import priveApi from '@/services/priveApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function NextActionsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await priveApi.getNextActions();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load actions');
    }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  const getEffortBadge = (effort: string) => {
    const colors: Record<string, string> = { low: Colors.success, medium: Colors.warning, high: Colors.error };
    return { color: colors[effort] || PRIVE_COLORS.text.tertiary, label: effort.charAt(0).toUpperCase() + effort.slice(1) };
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === 'high') return PRIVE_COLORS.status.error;
    if (urgency === 'medium') return PRIVE_COLORS.status.warning;
    return PRIVE_COLORS.text.tertiary;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <CardGridSkeleton />
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
          <PriveEmptyState icon="◇" title="No actions available" subtitle="Check back later for personalized actions" />
        )}
      </View>
    );
  }

  const scoreProgress = data.currentTier === 'elite' ? 100 :
    Math.min(100, ((data.pointsToNextTier > 0 ? (100 - data.pointsToNextTier) : 100) / 100) * 100);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {/* Tier Distance Card */}
        <View style={styles.tierCard}>
          <View style={styles.tierCardRow}>
            <PriveProgressRing
              progress={scoreProgress}
              size={80}
              strokeWidth={6}
              label={`${Math.round(100 - (data.pointsToNextTier || 0))}`}
              sublabel="Score"
            />
            <View style={styles.tierInfo}>
              <Text style={styles.tierLabel}>Current: <Text style={styles.tierValue}>{data.currentTier}</Text></Text>
              <Text style={styles.tierLabel}>Next: <Text style={styles.tierValue}>{data.nextTier}</Text></Text>
              <Text style={styles.pointsGap}>
                {data.pointsToNextTier > 0
                  ? `${data.pointsToNextTier.toFixed(1)} points to ${data.nextTier}`
                  : 'You\'re at the top!'}
              </Text>
            </View>
          </View>
          {data.weakestPillar && (
            <View style={styles.weakestPillar}>
              <Text style={styles.weakestLabel}>Focus Area:</Text>
              <Text style={styles.weakestValue}>{data.weakestPillar.id} (score: {data.weakestPillar.score})</Text>
            </View>
          )}
        </View>

        {/* Actions List */}
        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        {(data.actions || []).map((action: any, index: number) => {
          const effort = getEffortBadge(action.effort);
          return (
            <Pressable
              key={action.id || index}
              style={styles.actionCard}
              onPress={() => router.push(action.deepLink as any)}
             
            >
              <View style={styles.actionHeader}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <View style={[styles.effortBadge, { backgroundColor: `${effort.color}20` }]}>
                  <Text style={[styles.effortText, { color: effort.color }]}>{effort.label}</Text>
                </View>
              </View>
              <Text style={styles.actionDesc}>{action.description}</Text>
              <View style={styles.actionFooter}>
                <Text style={styles.actionPillar}>Pillar: {action.pillarAffected}</Text>
                <Text style={styles.actionGain}>+{action.estimatedPointGain} pts</Text>
                {action.urgency !== 'low' && (
                  <Text style={[styles.urgencyText, { color: getUrgencyColor(action.urgency) }]}>
                    {action.urgencyReason}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.xl },
  tierCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.xl,
  },
  tierCardRow: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.xl },
  tierInfo: { flex: 1 },
  tierLabel: { fontSize: 13, color: PRIVE_COLORS.text.secondary, marginBottom: 4 },
  tierValue: { color: PRIVE_COLORS.gold.primary, fontWeight: '600', textTransform: 'capitalize' },
  pointsGap: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.gold.primary, marginTop: PRIVE_SPACING.sm },
  weakestPillar: {
    marginTop: PRIVE_SPACING.lg,
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white10,
    flexDirection: 'row',
    gap: PRIVE_SPACING.sm,
  },
  weakestLabel: { fontSize: 12, color: PRIVE_COLORS.text.tertiary },
  weakestValue: { fontSize: 12, color: PRIVE_COLORS.status.warning, fontWeight: '500', textTransform: 'capitalize' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  actionCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: PRIVE_SPACING.sm },
  actionTitle: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.text.primary, flex: 1 },
  effortBadge: { paddingHorizontal: PRIVE_SPACING.sm, paddingVertical: 2, borderRadius: PRIVE_RADIUS.sm },
  effortText: { fontSize: 11, fontWeight: '600' },
  actionDesc: { fontSize: 13, color: PRIVE_COLORS.text.tertiary, marginBottom: PRIVE_SPACING.md },
  actionFooter: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.md, flexWrap: 'wrap' },
  actionPillar: { fontSize: 11, color: PRIVE_COLORS.text.tertiary, textTransform: 'capitalize' },
  actionGain: { fontSize: 12, fontWeight: '600', color: PRIVE_COLORS.status.success },
  urgencyText: { fontSize: 11, fontWeight: '500' },
});

export default withErrorBoundary(NextActionsScreen, 'PriveNextActions');
