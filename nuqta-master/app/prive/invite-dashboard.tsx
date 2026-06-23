// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Invite Dashboard
 *
 * Invite management page for existing Privé members.
 * Dark premium theme. Shows stats, active codes, leaderboard.
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIVE_COLORS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import priveInviteApi, { InviteStats, InviteCode, LeaderboardEntry } from '@/services/priveInviteApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import usePriveEligibility from '@/hooks/usePriveEligibility';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const TIER_COLORS: Record<string, string> = {
  entry: colors.brand.goldAccent,
  signature: '#B8860B',
  elite: colors.brand.goldBright,
  none: '#6B6B6B',
};

function PriveInviteDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tier, isWhitelisted } = usePriveEligibility();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; totalInvites: number } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, leaderboardRes] = await Promise.allSettled([
        priveInviteApi.getInviteStats(),
        priveInviteApi.getLeaderboard({ page: 1, limit: 10 }),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        if (!isMounted()) return;
        setStats(statsRes.value.data as InviteStats);
      }
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.success) {
        const data = leaderboardRes.value.data as any;
        if (!isMounted()) return;
        setLeaderboard(data?.leaderboard || []);
        if (!isMounted()) return;
        setMyRank(data?.myRank || null);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await priveInviteApi.generateCode();
      if (response.success && response.data) {
        platformAlertSimple('Code Generated', `Your new invite code: ${response.data.code}`);
        await loadData();
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to generate code');
    } finally {
      if (!isMounted()) return;
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    if (!isMounted()) return;
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Join me on Prive! Use my exclusive invite code: ${code}\n\nDownload ${BRAND.APP_NAME} and enter this code to unlock premium features.`,
      });
    } catch {}
  };

  const tierLabel = (tier || 'entry').charAt(0).toUpperCase() + (tier || 'entry').slice(1);

  if (loading) {
    return (
      <View style={styles.container}>
        <ProfileSkeleton />
      </View>
    );
  }

  const renderLeaderboardItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.leaderboardRow}>
      <Text style={[
        styles.rankText,
        item.rank <= 3 && { color: PRIVE_COLORS.gold.primary }
      ]}>
        #{item.rank}
      </Text>
      <View style={styles.leaderboardInfo}>
        <Text style={styles.leaderboardName}>{item.name}</Text>
        <Text style={styles.leaderboardTier}>{item.tier}</Text>
      </View>
      <Text style={styles.leaderboardCount}>{item.activeInvites} invites</Text>
    </View>
  ), []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlashList
        data={leaderboard}
        keyExtractor={(item) => `${item.rank}-${item.userId}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIVE_COLORS.gold.primary} />
        }
        estimatedItemSize={60}
        ListHeaderComponent={
          <>
            {/* Stats Header */}
            <LinearGradient colors={['#1A1510', colors.midGrayAlt]} style={styles.statsHeader}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>Prive {tierLabel}</Text>
              </View>

              {isWhitelisted && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={PRIVE_COLORS.gold.primary} />
                  <Text style={styles.adminBadgeText}>Admin Granted</Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.activeInvites || 0}</Text>
                  <Text style={styles.statLabel}>Qualified</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.totalCoinsEarned || 0}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats?.successRate || 0}%</Text>
                  <Text style={styles.statLabel}>Success</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Generate Code */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Share & Earn</Text>
              <Pressable
                style={[styles.generateButton, (!stats?.canGenerate || generatingCode) && styles.buttonDisabled]}
                onPress={handleGenerateCode}
                disabled={!stats?.canGenerate || generatingCode}
              >
                <LinearGradient
                  colors={[colors.brand.goldAccent, '#A88B4A']}
                  style={styles.generateGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {generatingCode ? (
                    <ActivityIndicator size="small" color={colors.midGrayAlt} />
                  ) : (
                    <>
                      <Ionicons name="share-social" size={20} color={colors.midGrayAlt} />
                      <Text style={styles.generateText}>Invite Friends</Text>
                      <Text style={styles.generateSubtext}>Earn coins per referral</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              {!stats?.canGenerate && stats?.canGenerateReason && (
                <Text style={styles.disabledReason}>{stats.canGenerateReason}</Text>
              )}
            </View>

            {/* Active Codes */}
            {stats?.activeCodes && stats.activeCodes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Referral Codes</Text>
                {stats.activeCodes.map((codeItem: any) => (
                  <View key={codeItem.code || codeItem.id} style={styles.codeCard}>
                    <View style={styles.codeInfo}>
                      <Text style={styles.codeText}>{codeItem.code}</Text>
                      <Text style={styles.codeUsage}>
                        {codeItem.usageCount}/{codeItem.maxUses} used
                      </Text>
                    </View>
                    <View style={styles.codeActions}>
                      <Pressable
                        style={styles.codeActionBtn}
                        onPress={() => handleCopyCode(codeItem.code)}
                      >
                        <Ionicons
                          name={copiedCode === codeItem.code ? 'checkmark' : 'copy-outline'}
                          size={18}
                          color={copiedCode === codeItem.code ? PRIVE_COLORS.status.success : PRIVE_COLORS.gold.primary}
                        />
                      </Pressable>
                      <Pressable
                        style={styles.codeActionBtn}
                        onPress={() => handleShareCode(codeItem.code)}
                      >
                        <Ionicons name="share-outline" size={18} color={PRIVE_COLORS.gold.primary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Leaderboard Title */}
            <View style={styles.leaderboardHeader}>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              {myRank && (
                <Text style={styles.myRank}>Your rank: #{myRank.rank}</Text>
              )}
            </View>
          </>
        }
        renderItem={renderLeaderboardItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={40} color={PRIVE_COLORS.text.tertiary} />
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
            <Text style={styles.emptySubtext}>Be the first to invite friends!</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  tierBadge: {
    backgroundColor: 'rgba(201, 169, 98, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 98, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 16,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    color: PRIVE_COLORS.gold.muted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: PRIVE_COLORS.border.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 12,
  },
  generateButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  generateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midGrayAlt,
  },
  generateSubtext: {
    fontSize: 12,
    color: 'rgba(10, 10, 10, 0.6)',
  },
  disabledReason: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  codeInfo: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
    letterSpacing: 1,
  },
  codeUsage: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  codeActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIVE_COLORS.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  myRank: {
    fontSize: 13,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.border.secondary,
  },
  rankText: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIVE_COLORS.text.secondary,
    width: 40,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 8,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  leaderboardTier: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },
  leaderboardCount: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: PRIVE_COLORS.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 4,
  },
});

export default withErrorBoundary(PriveInviteDashboard, 'PriveInviteDashboard');
