import React, { useState, useEffect, useCallback } from 'react';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useAuthUser } from '@/stores';
import * as identityApi from '@/services/identityApi';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';
import { useIsMounted } from '@/hooks/useIsMounted';

function CampusLeaderboardPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const user = useAuthUser();
  const { instituteName } = useUserIdentityStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteName) return;
    analyticsService.track(IdentityAnalyticsEvents.LEADERBOARD_OPENED, { institutionName: instituteName });

    identityApi.getCampusLeaderboard(instituteName)
      .then(setData)
      .catch(() => {})
      .finally(() => { if (isMounted()) setLoading(false); });
  }, [instituteName]);

  const handleShare = async () => {
    analyticsService.track(IdentityAnalyticsEvents.LEADERBOARD_SHARED, { institutionName: instituteName });
    try {
      await Share.share({
        message: `Students at ${instituteName} saved \u20B9${data?.totalSaved?.toLocaleString() || 0} this month on REZ!`,
      });
    } catch {}
  };

  const userId = (user as any)?._id || (user as any)?.id;

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isCurrentUser = userId && item.userId === userId;
    return (
      <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
        <View style={[styles.rankCircle, item.rank <= 3 && styles.topRankCircle]}>
          <ThemedText style={[styles.rankText, item.rank <= 3 && styles.topRankText]}>
            {item.rank}
          </ThemedText>
        </View>
        <ThemedText style={[styles.name, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
          {item.name}{isCurrentUser ? ' (You)' : ''}
        </ThemedText>
        <ThemedText style={styles.amount}>
          {'\u20B9'}{item.totalEarned.toLocaleString()}
        </ThemedText>
      </View>
    );
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Campus Rankings</ThemedText>
        <Pressable onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={22} color={colors.brand.purple} />
        </Pressable>
      </View>

      <FlatList
        data={data?.leaderboard || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
        ListHeaderComponent={
          <View style={styles.statsCard}>
            <ThemedText style={styles.institutionName}>{instituteName}</ThemedText>
            <ThemedText style={styles.totalSaved}>
              {'\u20B9'}{data?.totalSaved?.toLocaleString() || 0}
            </ThemedText>
            <ThemedText style={styles.statsLabel}>
              saved by {data?.studentCount || 0} students this month
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No leaderboard data yet</ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56,
    paddingHorizontal: spacing.base, paddingBottom: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary, marginLeft: spacing.sm },
  shareButton: { padding: spacing.sm },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: 120 },
  statsCard: {
    backgroundColor: colors.secondary[700], borderRadius: borderRadius.xl,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl,
  },
  institutionName: { fontSize: 16, fontWeight: '700', color: colors.primary[500], marginBottom: 4 },
  totalSaved: { fontSize: 36, fontWeight: '800', color: colors.primary[500], marginBottom: 4 },
  statsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    paddingHorizontal: spacing.md, borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  currentUserRow: { backgroundColor: colors.primary[50] },
  rankCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gray[100],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  topRankCircle: { backgroundColor: colors.primary[500] },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.text.secondary },
  topRankText: { color: colors.secondary[800] },
  name: { flex: 1, fontSize: 15, color: colors.text.primary },
  currentUserName: { fontWeight: '700', color: colors.brand.purple },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: colors.text.tertiary },
});

export default withErrorBoundary(CampusLeaderboardPage, 'CampusLeaderboard');
