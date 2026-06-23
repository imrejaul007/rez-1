// @ts-nocheck
/**
 * SocialProofSection Component
 * Display social proof stats like shoppers today, earnings, etc.
 * Adapted from Rez_v-2-main social proof pattern
 */

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import socialProofApi, { CategorySocialProofStats } from '@/services/socialProofApi';
import { socialProofStats, SocialProofStats } from '@/data/categoryDummyData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SocialProofSectionProps {
  stats?: SocialProofStats;
  categorySlug?: string;
  categoryName?: string;
}

// Helper to convert API stats to component format
const convertApiToStats = (apiStats: CategorySocialProofStats): SocialProofStats => ({
  shoppedToday: apiStats.shoppedToday,
  totalEarned: apiStats.totalEarned,
  topHashtags: apiStats.topHashtags,
  recentBuyers: apiStats.recentBuyers,
});

const SocialProofSection: React.FC<SocialProofSectionProps> = ({
  stats,
  categorySlug,
  categoryName = 'this category',
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [apiStats, setApiStats] = useState<SocialProofStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (stats) {
      setApiStats(stats);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await socialProofApi.getCategoryStats(categorySlug);
        if (response.success && response.data?.stats) {
          const converted = convertApiToStats(response.data.stats);
          if (!isMounted()) return;
          setApiStats(converted);
        } else {
          // Fallback to dummy data
          setApiStats(socialProofStats);
        }
      } catch (err) {
        // Fallback to dummy data on error
        if (!isMounted()) return;
        setApiStats(socialProofStats);
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchStats();
  }, [stats, categorySlug]);

  const displayStats = stats || apiStats || socialProofStats;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.lightMustard} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Avatar Stack */}
      <View style={styles.avatarStack}>
        {displayStats.recentBuyers.slice(0, 4).map((buyer, index) => (
          <View
            key={index}
            style={[
              styles.avatar,
              { marginLeft: index === 0 ? 0 : -10, zIndex: 4 - index },
            ]}
          >
            <Text style={styles.avatarEmoji}>{buyer.avatar}</Text>
          </View>
        ))}
        <View style={[styles.avatar, styles.avatarMore, { marginLeft: -10, zIndex: 0 }]}>
          <Text style={styles.avatarMoreText}>+{displayStats.shoppedToday - 4}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          <Text style={styles.statsHighlight}>{displayStats.shoppedToday.toLocaleString()}</Text>
          {' '}people shopped {categoryName} today
        </Text>
        <Text style={styles.earningsText}>
          Earned <Text style={styles.earningsHighlight}>{currencySymbol}{(displayStats.totalEarned / 1000).toFixed(0)}K+</Text> in cashback this month
        </Text>
      </View>

      {/* Hashtags */}
      <View style={styles.hashtagsRow}>
        {displayStats.topHashtags.map((tag, index) => (
          <View key={index} style={styles.hashtagChip}>
            <Text style={styles.hashtagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        {displayStats.recentBuyers.slice(0, 2).map((buyer, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityText}>
              <Text style={styles.activityName}>{buyer.name}</Text>
              {' bought '}{buyer.item}
              <Text style={styles.activityTime}> • {buyer.timeAgo}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  avatarMore: {
    backgroundColor: colors.lightMustard,
  },
  avatarMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statsText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 4,
  },
  statsHighlight: {
    fontWeight: '700',
    color: colors.neutral[900],
  },
  earningsText: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  earningsHighlight: {
    fontWeight: '700',
    color: colors.lightMustard,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  hashtagChip: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  recentActivity: {
    width: '100%',
    gap: 8,
  },
  activityItem: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activityText: {
    fontSize: 12,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  activityName: {
    fontWeight: '600',
    color: colors.neutral[700],
  },
  activityTime: {
    color: colors.neutral[400],
  },
});

export default memo(SocialProofSection);
