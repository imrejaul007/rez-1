// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Missions Page
 * /MainCategory/[slug]/loyalty/missions
 * Shows active and completed weekly missions with claim functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import userLoyaltyApi, { Mission } from '@/services/userLoyaltyApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type TabKey = 'active' | 'completed';

function ElectronicsMissionsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await userLoyaltyApi.getLoyalty(slug);
      if (res.success && res.data?.loyalty?.missions) {
        setMissions(res.data.loyalty.missions);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissions();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleClaimMission = useCallback(async (missionId: string) => {
    try {
      setClaiming(missionId);
      const res = await userLoyaltyApi.completeMission(missionId);
      if (res.success) {
        platformAlertSimple(
          'Mission Complete!',
          `You earned ${currencySymbol}${res.data?.reward || 0} coins!`
        );
        if (res.data?.loyalty?.missions) {
          setMissions(res.data.loyalty.missions);
        } else {
          await fetchMissions();
        }
      } else {
        platformAlertSimple('Cannot Claim', res.message || 'Mission target not reached yet. Keep going!');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || '';
      if (errorMsg.includes('target not reached')) {
        platformAlertSimple('Not Ready Yet', 'Keep going! You haven\'t reached the target yet.');
        await fetchMissions();
      } else if (errorMsg.includes('already completed')) {
        platformAlertSimple('Already Claimed', 'You\'ve already claimed this mission reward.');
        await fetchMissions();
      } else {
        platformAlertSimple('Error', errorMsg || 'Could not complete mission');
      }
    } finally {
      if (!isMounted()) return;
      setClaiming(null);
    }
  }, [currencySymbol, fetchMissions]);

  const activeMissions = missions.filter(m => !m.completedAt);
  const completedMissions = missions.filter(m => m.completedAt);
  const currentData = activeTab === 'active' ? activeMissions : completedMissions;

  const renderMission = useCallback(({ item }: { item: Mission }) => {
    const isCompleted = !!item.completedAt;
    const progressPercent = Math.min((item.progress / item.target) * 100, 100);
    const canClaim = !isCompleted && item.progress >= item.target;

    return (
      <View style={[styles.missionCard, isCompleted && styles.missionCardCompleted]}>
        <View style={styles.missionHeader}>
          <Text style={styles.missionIcon}>{item.icon || '\uD83D\uDCF1'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.missionTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.missionDesc} numberOfLines={2}>{item.description}</Text>
            )}
          </View>
          <View style={styles.rewardBadge}>
            <Ionicons name="star" size={14} color={theme.primaryColor} />
            <Text style={styles.rewardText}>{currencySymbol}{item.reward}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${progressPercent}%`,
              backgroundColor: isCompleted ? SHARED_COLORS.green : theme.primaryColor,
            }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{item.progress}/{item.target}</Text>
            <Text style={[styles.progressPercent, isCompleted && { color: SHARED_COLORS.green }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        </View>

        {/* Action */}
        {isCompleted ? (
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={16} color={SHARED_COLORS.green} />
            <Text style={styles.completedText}>
              Completed {new Date(item.completedAt!).toLocaleDateString()}
            </Text>
          </View>
        ) : canClaim ? (
          <Pressable
            style={styles.claimBtn}
            onPress={() => handleClaimMission(item.missionId)}
            disabled={claiming === item.missionId}
          >
            {claiming === item.missionId ? (
              <ActivityIndicator size="small" color={SHARED_COLORS.white} />
            ) : (
              <>
                <Ionicons name="gift" size={16} color={SHARED_COLORS.white} />
                <Text style={styles.claimBtnText}>Claim Reward</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={styles.inProgressRow}>
            <Ionicons name="hourglass-outline" size={14} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.inProgressText}>
              {item.target - item.progress} more to complete
            </Text>
          </View>
        )}
      </View>
    );
  }, [theme.primaryColor, currencySymbol, claiming, handleClaimMission]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Electronics Missions</Text>
          <Text style={styles.headerSubtitle}>
            {activeMissions.length} active, {completedMissions.length} completed
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['active', 'completed'] as TabKey[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? `Active (${activeMissions.length})` : `Completed (${completedMissions.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList
        data={currentData}
        keyExtractor={(item) => item.missionId}
        renderItem={renderMission}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
        estimatedItemSize={100}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'active' ? 'flag-outline' : 'trophy-outline'}
              size={48}
              color={SHARED_COLORS.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active' ? 'No active missions' : 'No completed missions yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'New missions will appear here. Keep exploring tech!'
                : 'Complete missions to earn coin rewards'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.background.primary,
    borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.info },
  tabText: { ...Typography.body, fontWeight: '500', color: Colors.text.tertiary },
  tabTextActive: { color: Colors.info, fontWeight: '600' },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: 120 },
  missionCard: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.md,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  missionCardCompleted: { opacity: 0.8 },
  missionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  missionIcon: { fontSize: 32 },
  missionTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  missionDesc: { ...Typography.bodySmall, color: Colors.text.tertiary, lineHeight: 18 },
  rewardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md,
    backgroundColor: colors.tint.blue,
  },
  rewardText: { ...Typography.body, fontWeight: '700', color: Colors.info },
  progressSection: { marginBottom: Spacing.md },
  progressBar: { height: 8, backgroundColor: Colors.border.default, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { ...Typography.bodySmall, color: Colors.text.tertiary },
  progressPercent: { ...Typography.bodySmall, fontWeight: '600', color: Colors.info },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.default },
  completedText: { ...Typography.bodySmall, color: Colors.success, fontWeight: '500' },
  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.info,
  },
  claimBtnText: { ...Typography.body, fontWeight: '700', color: Colors.text.inverse },
  inProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border.default },
  inProgressText: { ...Typography.bodySmall, color: Colors.text.tertiary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.base },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs, textAlign: 'center' },
});

export default withErrorBoundary(ElectronicsMissionsPage, 'MainCategorySlugLoyaltyMissions');
