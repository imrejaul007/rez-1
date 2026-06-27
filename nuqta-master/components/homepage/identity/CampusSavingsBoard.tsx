// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Pressable, Share } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import analyticsService, { IdentityAnalyticsEvents } from '@/services/analyticsService';

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalEarned: number;
  userId: string;
}

interface Props {
  institutionName: string;
  leaderboard: LeaderboardEntry[];
  totalSaved: number;
  studentCount: number;
  currentUserRank: number | null;
  currentUserId?: string;
  onSeeAll: () => void;
}

function CampusSavingsBoard({
  institutionName,
  leaderboard,
  totalSaved,
  studentCount,
  currentUserRank,
  currentUserId,
  onSeeAll,
}: Props) {
  const top3 = leaderboard.slice(0, 3);

  const handleShare = async () => {
    analyticsService.track(IdentityAnalyticsEvents.LEADERBOARD_SHARED, {
      institutionName,
    });
    try {
      await Share.share({
        message: `Students at ${institutionName} saved \u20B9${totalSaved.toLocaleString()} this month on REZ! Join the savings.`,
      });
    } catch {}
  };

  if (leaderboard.length === 0) {
    return (
      <View style={{
        margin: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 0.5,
        borderColor: '#e8e8e8',
      }}>
        <ThemedText style={{
          fontSize: 15, fontWeight: '700', color: '#1a3a52', marginBottom: 4
        }}>
          {institutionName}
        </ThemedText>
        <ThemedText style={{
          fontSize: 13, color: '#6b7280', marginBottom: 12, lineHeight: 18
        }}>
          Be one of the first students to save here.{'\n'}
          The leaderboard starts when 2+ students save.
        </ThemedText>
        <Pressable
          onPress={onSeeAll}
          style={{
            backgroundColor: '#7C3AED',
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
            See Campus Leaderboard
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.headerTitle}>{institutionName}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {studentCount} savers · this month
          </ThemedText>
        </View>
        <Pressable onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={18} color={colors.brand.purple} />
        </Pressable>
      </View>

      {/* Total Saved */}
      <ThemedText style={styles.totalSaved}>
        {'\u20B9'}{totalSaved.toLocaleString()}
      </ThemedText>

      {/* Top 3 */}
      {top3.map((entry) => {
        const isCurrentUser = currentUserId && entry.userId === currentUserId;
        return (
          <View
            key={entry.rank}
            style={[styles.row, isCurrentUser && styles.currentUserRow]}
          >
            <ThemedText style={styles.rank}>#{entry.rank}</ThemedText>
            <ThemedText
              style={[styles.name, isCurrentUser && styles.currentUserName]}
              numberOfLines={1}
            >
              {entry.name}
              {isCurrentUser ? ' (You)' : ''}
            </ThemedText>
            <ThemedText style={styles.amount}>
              {'\u20B9'}{entry.totalEarned.toLocaleString()}
            </ThemedText>
          </View>
        );
      })}

      {/* Current user row if not in top 3 */}
      {currentUserRank && currentUserRank > 3 && (
        <View style={[styles.row, styles.currentUserRow]}>
          <ThemedText style={styles.rank}>#{currentUserRank}</ThemedText>
          <ThemedText style={[styles.name, styles.currentUserName]}>
            You
          </ThemedText>
          <ThemedText style={styles.amount}>--</ThemedText>
        </View>
      )}

      {/* See all link */}
      <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
        <ThemedText style={styles.seeAllText}>
          See all {studentCount} savers →
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default React.memo(CampusSavingsBoard, (prev, next) =>
  prev.institutionName === next.institutionName &&
  prev.totalSaved === next.totalSaved &&
  prev.studentCount === next.studentCount &&
  prev.currentUserRank === next.currentUserRank &&
  prev.currentUserId === next.currentUserId &&
  prev.leaderboard.length === next.leaderboard.length
);

const styles = StyleSheet.create({
  container: {
    margin: spacing.base,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  headerSubtitle: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  shareButton: { padding: spacing.sm },
  totalSaved: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary[600],
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  currentUserRow: {
    backgroundColor: colors.primary[50],
  },
  rank: { fontSize: 14, fontWeight: '700', color: colors.text.tertiary, width: 36 },
  name: { flex: 1, fontSize: 14, color: colors.text.primary },
  currentUserName: { fontWeight: '700', color: colors.brand.purple },
  amount: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  seeAllButton: { alignItems: 'center', marginTop: spacing.md },
  seeAllText: { fontSize: 13, fontWeight: '600', color: colors.brand.purple },
});
