import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  progress?: number;
}

interface ActivityTimelineProps {
  activities: Activity[];
  currentProgress: number;
  targetProgress: number;
}

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffMs = now.getTime() - activityTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return activityTime.toLocaleDateString();
};

const getActionIcon = (action: string): any => {
  const iconMap: Record<string, any> = {
    visit_stores: 'storefront',
    upload_bills: 'receipt',
    refer_friends: 'people',
    review_count: 'star',
    order_count: 'cart',
    share_deals: 'share-social',
    explore_categories: 'compass',
    add_favorites: 'heart',
    login_streak: 'log-in',
    purchase_amount: 'card',
  };
  return iconMap[action] || 'checkmark-circle';
};

function ActivityTimeline({
  activities,
  currentProgress,
  targetProgress,
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={48} color={colors.neutral[300]} />
        <Text style={styles.emptyText}>No activity yet</Text>
        <Text style={styles.emptySubtext}>Start the challenge to see your progress here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color={colors.brand.purpleLight} />
        <Text style={styles.title}>Activity Timeline</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>
            {currentProgress}/{targetProgress}
          </Text>
        </View>
      </View>
      <ScrollView style={styles.timeline} showsVerticalScrollIndicator={false}>
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          return (
            <View key={activity.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name={getActionIcon(activity.action)} size={16} color={colors.brand.purpleLight} />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>
              <View style={[styles.timelineRight, isLast && styles.timelineRightLast]}>
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    {activity.progress && (
                      <View style={styles.progressIndicator}>
                        <Ionicons name="add-circle" size={16} color={colors.successScale[400]} />
                        <Text style={styles.progressText}>+1</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  progressBadge: {
    backgroundColor: colors.tint.pink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  timeline: {
    maxHeight: 300,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineRightLast: {
    paddingBottom: 0,
  },
  activityCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.purpleLight,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[800],
    lineHeight: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  activityTime: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  emptyContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 4,
    textAlign: 'center',
  },
});

export default React.memo(ActivityTimeline);
