import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { CommunityActivity } from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface FriendItem {
  id: string;
  name: string;
  avatar: string;
  store?: string;
  isLive: boolean;
  lastActive?: string;
  totalSaved?: number;
}

const FriendsActivityPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shopping' | 'activity'>('shopping');

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await exploreApi.getCommunityActivity({ limit: 20 });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setActivities(response.data.activities || []);

        // Extract friends from activities
        const friendsMap = new Map<string, FriendItem>();
        (response.data.activities || []).forEach((activity: CommunityActivity, index: number) => {
          if (activity.user && activity.user.name) {
            const id = activity.id || `friend-${index}`;
            if (!friendsMap.has(activity.user.name)) {
              friendsMap.set(activity.user.name, {
                id,
                name: activity.user.name,
                avatar: activity.user.avatar || `https://i.pravatar.cc/100?img=${index + 1}`,
                store: activity.store,
                isLive: activity.type === 'order' || activity.type === 'friend_saved',
                lastActive: activity.time,
                totalSaved: activity.amount || 0,
              });
            }
          }
        });
        if (!isMounted()) return;
        setFriends(Array.from(friendsMap.values()));
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const navigateToStore = (storeId?: string) => {
    if (storeId) {
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    }
  };

  const navigateToReferral = () => {
    router.push('/referral' as any);
  };

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'friend_saved':
        return <Ionicons name="wallet" size={18} color={Colors.gold} />;
      case 'trending':
        return <Ionicons name="flame" size={18} color={colors.brand.orange} />;
      case 'review':
      case 'friend_review':
        return <Ionicons name="star" size={18} color={colors.warningScale[400]} />;
      case 'popular':
        return <Ionicons name="heart" size={18} color={Colors.error} />;
      default:
        return <Ionicons name="ellipse" size={18} color={Colors.text.tertiary} />;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Friends Activity</Text>
            <Text style={styles.headerSubtitle}>See what your friends are saving</Text>
          </View>
          <Pressable
            style={styles.inviteButton}
            onPress={navigateToReferral}
          >
            <Ionicons name="person-add" size={20} color={Colors.gold} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'shopping' && styles.tabActive]}
            onPress={() => setActiveTab('shopping')}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === 'shopping' ? colors.lightMustard : colors.neutral[500]}
            />
            <Text style={[styles.tabText, activeTab === 'shopping' && styles.tabTextActive]}>
              Shopping Now ({friends.filter(f => f.isLive).length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Ionicons
              name="pulse"
              size={16}
              color={activeTab === 'activity' ? colors.lightMustard : colors.neutral[500]}
            />
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
              Activity ({activities.length})
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.contentList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
          }
        >
          {/* Loading State */}
          {loading && !refreshing && (
            <CardGridSkeleton />
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Shopping Now Tab */}
          {!loading && !error && activeTab === 'shopping' && (
            <>
              {friends.filter(f => f.isLive).length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="people-outline" size={48} color={Colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No Friends Shopping</Text>
                  <Text style={styles.emptySubtext}>
                    Invite friends to see their shopping activity
                  </Text>
                  <Pressable style={styles.inviteMainButton} onPress={navigateToReferral}>
                    <Ionicons name="person-add" size={18} color={Colors.text.inverse} />
                    <Text style={styles.inviteMainText}>Invite Friends</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.friendsGrid}>
                  {friends.filter(f => f.isLive).map((friend) => (
                    <Pressable key={friend.id} style={styles.friendCard}>
                      <View style={styles.friendAvatarContainer}>
                        <CachedImage source={friend.avatar} style={styles.friendAvatar} />
                        <View style={styles.liveDot} />
                      </View>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      {friend.store && (
                        <Text style={styles.friendStore}>at {friend.store}</Text>
                      )}
                      {friend.totalSaved && friend.totalSaved > 0 && (
                        <View style={styles.savedBadge}>
                          <Text style={styles.savedText}>Saved Rs.{friend.totalSaved}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* All Friends Section */}
              {friends.length > 0 && (
                <View style={styles.allFriendsSection}>
                  <Text style={styles.sectionTitle}>All Friends ({friends.length})</Text>
                  {friends.map((friend) => (
                    <View key={friend.id} style={styles.friendListItem}>
                      <CachedImage source={friend.avatar} style={styles.friendListAvatar} />
                      <View style={styles.friendListInfo}>
                        <Text style={styles.friendListName}>{friend.name}</Text>
                        <Text style={styles.friendListMeta}>
                          {friend.isLive ? 'Shopping now' : `Active ${friend.lastActive || 'recently'}`}
                        </Text>
                      </View>
                      {friend.isLive && <View style={styles.liveIndicator} />}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Activity Tab */}
          {!loading && !error && activeTab === 'activity' && (
            <>
              {activities.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="pulse-outline" size={48} color={Colors.text.tertiary} />
                  <Text style={styles.emptyTitle}>No Recent Activity</Text>
                  <Text style={styles.emptySubtext}>
                    Activity from your friends will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.activityList}>
                  {activities.map((activity, index) => (
                    <Pressable
                      key={activity.id || `activity-${index}`}
                      style={styles.activityItem}
                    >
                      <View style={styles.activityIconContainer}>
                        {activity.user?.avatar ? (
                          <CachedImage
                            source={activity.user.avatar}
                            style={styles.activityAvatar}
                          />
                        ) : (
                          <View style={styles.activityIconBadge}>
                            {renderActivityIcon(activity.type)}
                          </View>
                        )}
                      </View>

                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>
                          {activity.user?.name && (
                            <Text style={styles.activityUserName}>{activity.user.name} </Text>
                          )}
                          {activity.message}
                          {activity.store && (
                            <Text style={styles.activityStore}> at {activity.store}</Text>
                          )}
                        </Text>
                        <View style={styles.activityMeta}>
                          <Text style={styles.activityTime}>{activity.time}</Text>
                          {activity.amount && activity.amount > 0 && (
                            <View style={styles.activityAmountBadge}>
                              <Text style={styles.activityAmountText}>Rs.{activity.amount} saved</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={Colors.text.tertiary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Invite Banner */}
          <View style={styles.inviteBanner}>
            <View style={styles.inviteBannerContent}>
              <Text style={styles.inviteBannerTitle}>Invite Friends & Earn</Text>
              <Text style={styles.inviteBannerSubtext}>
                Get {currencySymbol}500 for each friend who joins {BRAND.APP_NAME}
              </Text>
            </View>
            <Pressable style={styles.inviteBannerButton} onPress={navigateToReferral}>
              <Text style={styles.inviteBannerButtonText}>Invite</Text>
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.gold,
    fontWeight: '600',
  },
  contentList: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    minHeight: 300,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inviteMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  inviteMainText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  friendCard: {
    width: (width - 44) / 3,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: 6,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  friendAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  friendName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.nileBlue,
    textAlign: 'center',
  },
  friendStore: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  savedBadge: {
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: 6,
  },
  savedText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },
  allFriendsSection: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.base,
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  friendListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
  },
  friendListInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  friendListName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  friendListMeta: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
  },
  activityList: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  activityIconContainer: {
    marginRight: Spacing.md,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activityIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  activityUserName: {
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  activityStore: {
    fontWeight: '600',
    color: Colors.gold,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  activityTime: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  activityAmountBadge: {
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityAmountText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.lg,
  },
  inviteBannerContent: {
    flex: 1,
  },
  inviteBannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  inviteBannerSubtext: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  inviteBannerButton: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  inviteBannerButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
  },
});

export default withErrorBoundary(FriendsActivityPage, 'ExploreFriends');
