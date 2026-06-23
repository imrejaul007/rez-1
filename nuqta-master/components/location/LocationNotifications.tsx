// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentLocation } from '@/hooks/useLocation';
import { colors } from '@/constants/theme';

interface LocationNotification {
  id: string;
  title: string;
  message: string;
  type: 'offer' | 'store' | 'event' | 'reminder';
  location: {
    name: string;
    distance: number;
  };
  timestamp: Date;
  isRead: boolean;
}

interface LocationNotificationsProps {
  onNotificationPress?: (notification: LocationNotification) => void;
  onSettingsPress?: () => void;
  style?: any;
}

function LocationNotifications({
  onNotificationPress,
  onSettingsPress,
  style,
}: LocationNotificationsProps) {
  const { currentLocation } = useCurrentLocation();
  const [notifications, setNotifications] = useState<LocationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    nearbyOffers: true,
    storeUpdates: true,
    eventReminders: true,
    locationReminders: false,
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Simulate loading notifications
      const mockNotifications: LocationNotification[] = [
        {
          id: '1',
          title: 'Special Offer Nearby',
          message: '20% off at Starbucks - 0.2km away',
          type: 'offer',
          location: { name: 'Starbucks', distance: 0.2 },
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          isRead: false,
        },
        {
          id: '2',
          title: 'New Store Opening',
          message: 'Fresh Grocery Store just opened - 0.5km away',
          type: 'store',
          location: { name: 'Fresh Grocery', distance: 0.5 },
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isRead: true,
        },
        {
          id: '3',
          title: 'Event Reminder',
          message: 'Food Festival starts in 1 hour - 1.2km away',
          type: 'event',
          location: { name: 'Food Festival', distance: 1.2 },
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          isRead: false,
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationPress = (notification: LocationNotification) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );
    onNotificationPress?.(notification);
  };

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'offer':
        return 'pricetag';
      case 'store':
        return 'storefront';
      case 'event':
        return 'calendar';
      case 'reminder':
        return 'alarm';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'offer':
        return '#FF9500';
      case 'store':
        return '#34C759';
      case 'event':
        return colors.brand.ios;
      case 'reminder':
        return '#8E8E93';
      default:
        return colors.brand.ios;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const renderNotificationItem = ({ item }: { item: LocationNotification }) => (
    <Pressable
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
     
    >
      <View style={styles.notificationContent}>
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
          <Ionicons name={getNotificationIcon(item.type) as any} size={20} color="white" />
        </View>
        
        <View style={styles.notificationText}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage}>{item.message}</Text>
          
          <View style={styles.notificationFooter}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={12} color={colors.midGray} />
              <Text style={styles.locationText}>
                {item.location.name} • {formatDistance(item.location.distance)}
              </Text>
            </View>
            <Text style={styles.timestampText}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderSettingItem = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color={colors.brand.ios} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: colors.brand.ios }}
        thumbColor={colors.background.primary}
      />
    </View>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Location Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onSettingsPress}>
          <Ionicons name="settings" size={24} color={colors.brand.ios} />
        </Pressable>
      </View>

      {/* Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        {renderSettingItem(
          'Nearby Offers',
          'Get notified about offers near your location',
          settings.nearbyOffers,
          (value) => handleSettingChange('nearbyOffers', value),
          'pricetag'
        )}
        {renderSettingItem(
          'Store Updates',
          'Notifications about new stores and updates',
          settings.storeUpdates,
          (value) => handleSettingChange('storeUpdates', value),
          'storefront'
        )}
        {renderSettingItem(
          'Event Reminders',
          'Reminders about events happening nearby',
          settings.eventReminders,
          (value) => handleSettingChange('eventReminders', value),
          'calendar'
        )}
        {renderSettingItem(
          'Location Reminders',
          'Reminders based on your location history',
          settings.locationReminders,
          (value) => handleSettingChange('locationReminders', value),
          'alarm'
        )}
      </View>

      {/* Notifications */}
      <View style={styles.notificationsSection}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You'll receive location-based notifications here
            </Text>
          </View>
        ) : (
          <FlashList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            estimatedItemSize={70}
          />
        )}
      </View>

      {/* Location Status */}
      {currentLocation && (
        <View style={styles.locationStatus}>
          <Ionicons name="location" size={16} color="#34C759" />
          <Text style={styles.locationStatusText}>
            Notifications enabled for {currentLocation.address.city}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.tint.warmGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.darkGray,
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    lineHeight: 18,
  },
  notificationsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadNotification: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkGray,
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.ios,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.midGray,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.midGray,
  },
  timestampText: {
    fontSize: 12,
    color: '#999999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F8FF',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0F2FF',
  },
  locationStatusText: {
    fontSize: 14,
    color: colors.brand.ios,
    marginLeft: 8,
  },
});

// Compact version for small spaces
export function CompactLocationNotifications(props: LocationNotificationsProps) {
  return (
    <LocationNotifications
      {...props}
      style={[props.style, { padding: 12 }]}
    />
  );
}

export default React.memo(LocationNotifications);
