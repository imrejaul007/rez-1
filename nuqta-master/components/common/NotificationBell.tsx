import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import notificationService from '@/services/notificationService';
import { useIsAuthenticated } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationBellProps {
  iconSize?: number;
  iconColor?: string;
}

const { width } = Dimensions.get('window');

function NotificationBell({
  iconSize = 24,
  iconColor = colors.neutral[800]
}: NotificationBellProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Load notifications when authenticated
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        limit: 10,
      });

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead([notification._id]);
        setNotifications(prev =>
          prev.map(n =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        // silently handle
      }
    }

    // Close dropdown
    setShowDropdown(false);

    // Handle navigation based on notification data
    if (notification.data?.deepLink) {
      router.push(notification.data.deepLink as any);
    } else if (notification.data?.orderId) {
      router.push(`/tracking/${notification.data.orderId}` as any);
    } else if (notification.data?.storeId) {
      router.push(`/MainStorePage?storeId=${notification.data.storeId}` as any);
    } else if (notification.data?.productId) {
      // Navigate to ProductPage (comprehensive product page)
      router.push({
        pathname: '/product-page',
        params: {
          cardId: notification.data.productId,
          cardType: 'product',
        }
      } as any);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarking(true);
      await notificationService.markAsRead();

      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      // silently handle
    } finally {
      setMarking(false);
    }
  };

  const viewAllNotifications = () => {
    setShowDropdown(false);
    router.push('/account/notification-history');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      order: colors.info,
      earning: colors.success,
      promotional: colors.warning,
      social: colors.brand.purpleLight,
      security: colors.error,
      system: colors.neutral[500],
      reminder: colors.brand.pink,
    };
    return categoryColors[category] || colors.neutral[500];
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      order: 'bag-handle',
      earning: 'cash',
      promotional: 'pricetag',
      social: 'people',
      security: 'shield-checkmark',
      system: 'information-circle',
      reminder: 'alarm',
    };
    return icons[category] || 'notifications';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Pressable
        style={styles.bellContainer}
        onPress={() => setShowDropdown(true)}
       
        accessibilityLabel={`Notifications${unreadCount > 0 ? `. ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}` : '. No unread notifications'}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view notifications"
        accessibilityState={{ disabled: false }}
      >
        <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
        {unreadCount > 0 && (
          <View
            style={styles.badge}
            accessible={false}
            importantForAccessibility="no"
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.overlay}
         
          onPress={() => setShowDropdown(false)}
          accessible={false}
        >
          <View
            style={styles.dropdown}
            accessible={true}
            accessibilityLabel="Notifications dropdown"
            accessibilityRole="menu"
            accessibilityViewIsModal={true}
          >
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable
                  onPress={markAllAsRead}
                  disabled={marking}
                  style={styles.markAllButton}
                  accessibilityLabel="Mark all notifications as read"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to mark all notifications as read"
                  accessibilityState={{ disabled: marking, busy: marking }}
                >
                  {marking ? (
                    <ActivityIndicator size="small" color={colors.infoScale[400]} />
                  ) : (
                    <Text style={styles.markAllText}>Mark all read</Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
              {loading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.infoScale[400]} />
                </View>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <Pressable
                    key={notification._id}
                    style={[
                      styles.notificationItem,
                      !notification.isRead && styles.unreadNotification,
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                   
                    accessibilityLabel={`${notification.isRead ? '' : 'Unread. '}${notification.title}. ${notification.message}. ${formatTimestamp(notification.createdAt)}`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to view notification details"
                    accessibilityState={{ selected: !notification.isRead }}
                  >
                    <View
                      style={[
                        styles.notificationIconContainer,
                        { backgroundColor: `${getCategoryColor(notification.category)}20` },
                      ]}
                      accessible={false}
                      importantForAccessibility="no"
                    >
                      <Ionicons
                        name={getCategoryIcon(notification.category)}
                        size={20}
                        color={getCategoryColor(notification.category)}
                      />
                    </View>

                    <View
                      style={styles.notificationContent}
                      accessible={false}
                      importantForAccessibility="no"
                    >
                      <View style={styles.notificationHeader}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            !notification.isRead && styles.unreadTitle,
                          ]}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTimestamp(notification.createdAt)}
                        </Text>
                      </View>

                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>

                      {!notification.isRead && <View style={styles.unreadDot} />}
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.neutral[300]} />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <Pressable
              style={styles.viewAllButton}
              onPress={viewAllNotifications}
              accessibilityLabel="View all notifications"
              accessibilityRole="button"
              accessibilityHint="Double tap to view complete notification history"
            >
              <Text style={styles.viewAllText}>View All Notifications</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.infoScale[400]} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.text.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdown: {
    width: Math.min(width - 32, 400),
    maxHeight: '70%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.gray[100],
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
  },
  notificationsList: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationTime: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  notificationMessage: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    marginRight: 4,
  },
});

export default React.memo(NotificationBell);
