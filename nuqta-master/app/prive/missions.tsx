import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { PriveEmptyState } from '@/components/prive/PriveEmptyState';
import { PriveProgressRing } from '@/components/prive/PriveProgressRing';
import priveApi from '@/services/priveApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

type Tab = 'available' | 'active' | 'completed';

function MissionsScreen() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [available, setAvailable] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [avRes, acRes, coRes] = await Promise.all([
        priveApi.getMissions(),
        priveApi.getActiveMissions(),
        priveApi.getCompletedMissions(),
      ]);
      if (avRes.success) setAvailable(avRes.data?.missions || []);
      if (acRes.success) setActive(acRes.data?.missions || []);
      if (coRes.success) setCompleted(coRes.data?.missions || []);
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load missions');
    }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  const isMounted = useIsMounted();
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchData();
  }, [fetchData, isAuthenticated, authLoading]);

  const onRefresh = () => { setIsRefreshing(true); fetchData(); };

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      const res = await priveApi.claimMission(id);
      if (res.success) await fetchData();
    } catch (e) { catchAndReport(e, setError, 'Missions/claimMission'); }
    finally { setClaiming(null); }
  };

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      const res = await priveApi.completeMission(id);
      if (res.success) await fetchData();
    } catch (e) { catchAndReport(e, setError, 'Missions/completeMission'); }
    finally { setCompleting(null); }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'available', label: 'Available', count: available.length },
    { key: 'active', label: 'Active', count: active.length },
    { key: 'completed', label: 'Completed', count: completed.length },
  ];

  const getMissionData = () => {
    if (activeTab === 'available') return available;
    if (activeTab === 'active') return active;
    return completed;
  };

  const getRemainingTime = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <CardGridSkeleton />
      </View>
    );
  }

  if (error && !available.length && !active.length && !completed.length) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: PRIVE_COLORS.status.error, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <Pressable
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: PRIVE_COLORS.transparent.gold15, borderRadius: PRIVE_RADIUS.lg }}
            onPress={() => { setIsLoading(true); fetchData(); }}
          >
            <Text style={{ color: PRIVE_COLORS.gold.primary, fontSize: 14, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />}
      >
        {getMissionData().length === 0 ? (
          <PriveEmptyState
            icon="🎯"
            title={`No ${activeTab} missions`}
            subtitle={activeTab === 'available' ? 'New missions are added regularly' : undefined}
          />
        ) : (
          getMissionData().map((item: any) => {
            const mission = item.missionId || item; // populated or direct
            const progress = item.progress ?? 0;
            const target = item.targetCount || mission.targetCount || 1;
            const progressPct = Math.min(100, (progress / target) * 100);
            const isActive = activeTab === 'active';
            const isCompleted = activeTab === 'completed';
            const isAvailable = activeTab === 'available';

            return (
              <View key={mission._id || item._id} style={styles.missionCard}>
                <View style={styles.missionHeader}>
                  <Text style={styles.missionIcon}>{mission.icon || '🎯'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionTitle}>{mission.title}</Text>
                    <Text style={styles.missionDesc}>{mission.shortDescription || mission.description}</Text>
                  </View>
                  {isActive && (
                    <PriveProgressRing progress={progressPct} size={44} strokeWidth={4} label={`${progress}`} sublabel={`/${target}`} />
                  )}
                </View>

                {/* Reward + Timer Row */}
                <View style={styles.missionFooter}>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>
                      +{mission.reward?.coins || 0} {mission.reward?.coinType || 'coins'}
                    </Text>
                  </View>
                  {mission.endDate && !isCompleted && (
                    <Text style={styles.timerText}>{getRemainingTime(mission.endDate)}</Text>
                  )}
                  {mission.targetPillar && (
                    <Text style={styles.pillarBadge}>{mission.targetPillar}</Text>
                  )}
                </View>

                {/* CTA */}
                {isAvailable && (
                  <Pressable
                    style={styles.ctaButton}
                    onPress={() => handleClaim(mission._id)}
                    disabled={claiming === mission._id}
                  >
                    <Text style={styles.ctaText}>
                      {claiming === mission._id ? 'Claiming...' : 'Claim Mission'}
                    </Text>
                  </Pressable>
                )}
                {isActive && item.status === 'completed' && !item.rewardDistributed && (
                  <Pressable
                    style={[styles.ctaButton, styles.ctaComplete]}
                    onPress={() => handleComplete(item.missionId?._id || item.missionId)}
                    disabled={completing === (item.missionId?._id || item.missionId)}
                  >
                    <Text style={styles.ctaText}>
                      {completing === (item.missionId?._id || item.missionId) ? 'Claiming...' : 'Claim Reward'}
                    </Text>
                  </Pressable>
                )}
                {isCompleted && item.rewardDistributed && (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Reward Claimed</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    gap: PRIVE_SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: PRIVE_SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PRIVE_COLORS.gold.primary },
  tabText: { fontSize: 13, color: PRIVE_COLORS.text.tertiary, fontWeight: '500' },
  tabTextActive: { color: PRIVE_COLORS.gold.primary, fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: PRIVE_SPACING.xl },
  missionCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md,
  },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.md, marginBottom: PRIVE_SPACING.md },
  missionIcon: { fontSize: 28 },
  missionTitle: { fontSize: 15, fontWeight: '600', color: PRIVE_COLORS.text.primary },
  missionDesc: { fontSize: 12, color: PRIVE_COLORS.text.tertiary, marginTop: 2 },
  missionFooter: { flexDirection: 'row', alignItems: 'center', gap: PRIVE_SPACING.md, flexWrap: 'wrap' },
  rewardBadge: {
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    paddingHorizontal: PRIVE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
  },
  rewardText: { fontSize: 11, fontWeight: '600', color: PRIVE_COLORS.gold.primary },
  timerText: { fontSize: 11, color: PRIVE_COLORS.status.warning },
  pillarBadge: { fontSize: 11, color: PRIVE_COLORS.text.tertiary, textTransform: 'capitalize' },
  ctaButton: {
    marginTop: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderRadius: PRIVE_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  ctaComplete: { backgroundColor: PRIVE_COLORS.transparent.gold20 },
  ctaText: { fontSize: 14, fontWeight: '600', color: PRIVE_COLORS.gold.primary },
  completedBadge: {
    marginTop: PRIVE_SPACING.md,
    paddingVertical: PRIVE_SPACING.sm,
    alignItems: 'center',
  },
  completedText: { fontSize: 12, color: PRIVE_COLORS.status.success, fontWeight: '500' },
});

export default withErrorBoundary(MissionsScreen, 'PriveMissions');
