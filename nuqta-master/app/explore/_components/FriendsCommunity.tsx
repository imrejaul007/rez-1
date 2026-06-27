// @ts-nocheck
import { colors } from '@/constants/theme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import exploreApi, { CommunityActivity } from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

// Helper to determine if activity time indicates recent activity (within ~5 minutes)
const isRecentActivity = (timeString?: string): boolean => {
  if (!timeString) return false;
  const lower = timeString.toLowerCase();
  // Check for "just now", "1 min", "2 min", etc. up to 5 minutes
  if (lower.includes('just now') || lower.includes('now')) return true;
  if (lower.includes('sec')) return true;
  // Match patterns like "1 min", "2 mins", "3m ago", etc.
  const minMatch = lower.match(/(\d+)\s*(min|m\b)/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    return minutes <= 5;
  }
  return false;
};

interface FriendShopping {
  id: string;
  name: string;
  avatar: string;
  store: string;
  isLive: boolean;
}

const FriendsCommunity = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [friendsShopping, setFriendsShopping] = useState<FriendShopping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const fetchCommunityData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exploreApi.getCommunityActivity({ limit: 6 });
      if (response.success && response.data) {
        setActivities(response.data.activities);

        // Extract friends from activities who have avatars
        const friends: FriendShopping[] = response.data.activities
          .filter((a: CommunityActivity) => a.user && a.user.avatar)
          .slice(0, 4)
          .map((a: CommunityActivity, index: number) => ({
            id: a.id,
            name: a.user?.name || 'User',
            avatar: a.user?.avatar || `https://i.pravatar.cc/100?img=${index + 1}`,
            store: a.store || 'Store',
            // Show as "live" only if activity was very recent (within ~5 minutes)
            isLive: isRecentActivity(a.time),
          }));

        setFriendsShopping(friends);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load community activity');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'friend_saved':
        return <Ionicons name="wallet" size={16} color={Colors.gold} />;
      case 'trending':
        return <Ionicons name="flame" size={16} color={colors.brand.orange} />;
      case 'review':
      case 'friend_review':
        return <Ionicons name="star" size={16} color={Colors.warning} />;
      case 'popular':
        return <Ionicons name="heart" size={16} color={Colors.error} />;
      default:
        return <Ionicons name="ellipse" size={16} color={Colors.text.tertiary} />;
    }
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>People Shopping Nearby</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchCommunityData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Friends & Community" compact={true}>
    <View style={styles.container}>
      {/* People Shopping Nearby */}
      <View style={styles.friendsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>People Shopping Nearby</Text>
          <Pressable onPress={() => navigateTo('/explore/friends')}>
            <Text style={styles.viewAllText}>See all</Text>
          </Pressable>
        </View>

        {friendsShopping.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsContainer}
          >
            {friendsShopping.map((friend) => (
              <Pressable
                key={friend.id}
                style={styles.friendBubble}
                onPress={() => navigateTo(`/explore/search?q=${encodeURIComponent(friend.store)}`)}
              >
                <View style={styles.avatarContainer}>
                  <CachedImage source={friend.avatar} style={styles.friendAvatar} />
                  {friend.isLive && <View style={styles.liveDot} />}
                </View>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendStore}>{friend.store}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.inviteBubble} onPress={() => navigateTo('/referral')}>
              <View style={styles.inviteIcon}>
                <Ionicons name="person-add" size={20} color={Colors.gold} />
              </View>
              <Text style={styles.inviteText}>Invite</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={styles.emptyFriendsContainer}>
            <Text style={styles.emptyFriendsText}>Invite friends to see their activity</Text>
            <Pressable
              style={styles.inviteButtonSmall}
              onPress={() => navigateTo('/referral')}
            >
              <Ionicons name="person-add" size={16} color={Colors.gold} />
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Community Activity */}
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Activity</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {activities.length > 0 ? (
          <View style={styles.activityList}>
            {activities.slice(0, 4).map((activity) => (
              <Pressable
                key={activity.id}
                style={styles.activityItem}
                onPress={() => {
                  // Navigate based on activity type
                  if (activity.storeId) {
                    navigateTo(`/MainStorePage?storeId=${activity.storeId}`);
                  } else if (activity.store) {
                    navigateTo(`/explore/search?q=${encodeURIComponent(activity.store)}`);
                  }
                }}
              >
                <View style={styles.activityIconContainer}>
                  {activity.user && activity.user.avatar ? (
                    <CachedImage source={activity.user.avatar} style={styles.activityAvatar} />
                  ) : (
                    <View style={styles.activityIconBadge}>
                      {renderActivityIcon(activity.type)}
                    </View>
                  )}
                </View>

                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {activity.user && (
                      <Text style={styles.activityUserName}>{activity.user.name} </Text>
                    )}
                    {activity.message}
                    {activity.store && (
                      <Text style={styles.activityStore}> {activity.store}</Text>
                    )}
                    {activity.amount && activity.amount > 0 && (
                      <Text style={styles.activityAmount}> - {currencySymbol}{activity.amount}</Text>
                    )}
                  </Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>

                <View style={styles.activityAction}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivityContainer}>
            <Ionicons name="people-outline" size={32} color={Colors.text.tertiary} />
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        )}
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  emptyFriendsContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyFriendsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  inviteButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.xl,
  },
  inviteButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  emptyActivityContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  friendsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  viewAllText: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '600',
  },
  friendsContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  friendBubble: {
    alignItems: 'center',
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  liveDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.text.inverse,
  },
  friendName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginTop: 6,
  },
  friendStore: {
    ...Typography.overline,
    color: Colors.text.tertiary,
  },
  inviteBubble: {
    alignItems: 'center',
    width: 70,
  },
  inviteIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
  },
  inviteText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
    marginTop: 6,
  },
  activitySection: {},
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.error,
  },
  activityList: {
    paddingHorizontal: Spacing.base,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  activityIconContainer: {
    marginRight: Spacing.md,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
  },
  activityIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  activityUserName: {
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  activityStore: {
    fontWeight: '600',
    color: Colors.gold,
  },
  activityAmount: {
    fontWeight: '600',
    color: colors.brand.orange,
  },
  activityTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  activityAction: {
    padding: Spacing.xs,
  },
});

export default React.memo(FriendsCommunity);
