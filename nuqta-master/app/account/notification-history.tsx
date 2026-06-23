// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../../services/notificationService';
import { NotificationListSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  type: 'push' | 'email' | 'sms' | 'inapp';
  timestamp: string;
  read: boolean;
  category: string;
}

const PAGE_LIMIT = 20;

function NotificationHistoryScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadNotificationHistory();
  }, [isAuthenticated, authLoading]);

  const loadNotificationHistory = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await notificationService.getNotifications({ limit: PAGE_LIMIT, page: pageNum });

      if (response.success && response.data) {
        const transformedNotifications: NotificationHistoryItem[] = response.data.notifications.map((notification: any) => ({
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: getNotificationTypeFromChannels(notification.deliveryChannels),
          timestamp: notification.createdAt,
          read: notification.isRead,
          category: notification.category
        }));

        if (pageNum === 1) {
          if (!isMounted()) return;
          setNotifications(transformedNotifications);
        } else {
          if (!isMounted()) return;
          setNotifications(prev => [...prev, ...transformedNotifications]);
        }

        if (!isMounted()) return;
        setPage(pageNum);
        if (!isMounted()) return;
        setHasMore(transformedNotifications.length >= PAGE_LIMIT);
      } else {
        if (pageNum === 1) setNotifications([]);
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch (error) {
      if (pageNum === 1) setNotifications([]);
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  };

  const getNotificationTypeFromChannels = (channels: string[]): 'push' | 'email' | 'sms' | 'inapp' => {
    // Determine the primary channel type based on delivery channels
    if (channels.includes('push')) return 'push';
    if (channels.includes('email')) return 'email';
    if (channels.includes('sms')) return 'sms';
    return 'inapp';
  };

  const onRefresh = () => {
    loadNotificationHistory(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNotificationHistory(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'push':
        return 'notifications';
      case 'email':
        return 'mail';
      case 'sms':
        return 'chatbox';
      case 'inapp':
        return 'phone-portrait';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'push':
        return Colors.info;
      case 'email':
        return Colors.success;
      case 'sms':
        return Colors.warning;
      case 'inapp':
        return Colors.brand.purpleLight;
      default:
        return Colors.text.tertiary;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order':
        return Colors.info;
      case 'delivery':
        return Colors.success;
      case 'payment':
        return Colors.warning;
      case 'promotion':
        return Colors.error;
      case 'security':
        return Colors.brand.purpleLight;
      default:
        return Colors.text.tertiary;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead([notificationId]);
      
      // Update local state
      if (!isMounted()) return;
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      // silently handle
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await notificationService.markAsRead();
      
      // Update local state
      if (!isMounted()) return;
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setMarkingAllAsRead(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotificationItem = useCallback(({ item }: { item: NotificationHistoryItem }) => (
    <Pressable
      style={styles.notificationItem}
      onPress={() => !item.read && markNotificationAsRead(item.id)}
      accessibilityLabel={`${item.read ? 'Read' : 'Unread'} notification from ${item.category}: ${item.title}. ${item.message}. ${formatDate(item.timestamp)}`}
      accessibilityRole="button"
      accessibilityHint={!item.read ? "Double tap to mark as read" : "Notification already read"}
      accessibilityState={{ disabled: item.read }}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name={getNotificationIcon(item.type) as any} 
          size={20} 
          color={getNotificationColor(item.type)} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        <View style={styles.notificationFooter}>
          <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
          
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </View>
    </Pressable>
  ), [markNotificationAsRead]);

  if (loading) {
    return <NotificationListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notification History</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllButton}
            onPress={markAllAsRead}
            disabled={markingAllAsRead}
            accessibilityLabel="Mark all notifications as read"
            accessibilityRole="button"
            accessibilityHint="Double tap to mark all notifications as read"
            accessibilityState={{ disabled: markingAllAsRead }}
          >
            {markingAllAsRead ? (
              <ActivityIndicator size="small" color={Colors.info} />
            ) : (
              <Text style={styles.markAllText}>Mark All Read</Text>
            )}
          </Pressable>
        )}
      </View>

      <FlashList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        estimatedItemSize={80}
        ListEmptyComponent={
          <View
            style={styles.emptyContainer}
            accessibilityLabel="No notifications. You haven't received any notifications yet."
            accessibilityRole="text"
          >
            <Ionicons name="notifications-off" size={64} color={Colors.border.default} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You haven't received any notifications yet.
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: Spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.info} />
            </View>
          ) : !hasMore && notifications.length > 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.text.tertiary, ...Typography.bodySmall, paddingVertical: Spacing.base }}>
              No more notifications
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  unreadCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.background.secondary,
    borderRadius: 6,
  },
  markAllText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.info,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  notificationTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  notificationMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  categoryText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.info,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default withErrorBoundary(NotificationHistoryScreen, 'AccountNotificationHistory');
