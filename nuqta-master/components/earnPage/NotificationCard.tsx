import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { NotificationCardProps } from '@/types/earnPage.types';
import { NOTIFICATION_COLORS, EARN_COLORS } from '@/constants/EarnPageColors';
import { colors } from '@/constants/theme';

function NotificationCard({ 
  notification, 
  onPress 
}: NotificationCardProps) {
  const colors = NOTIFICATION_COLORS[notification.type];
  
  return (
    <Pressable 
      style={[
        styles.container,
        { 
          backgroundColor: notification.isRead ? EARN_COLORS.backgroundCard : colors.background,
          borderColor: notification.isRead ? EARN_COLORS.border : colors.border,
        }
      ]}
      onPress={onPress}
     
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${colors.icon}15` }]}>
        <Ionicons 
          name="time-outline" 
          size={20} 
          color={notification.isRead ? EARN_COLORS.textSecondary : colors.icon}
        />
      </View>
      
      {/* Text Content */}
      <View style={styles.content}>
        <ThemedText 
          style={[
            styles.title,
            { 
              color: notification.isRead ? EARN_COLORS.textSecondary : colors.text,
              fontWeight: notification.isRead ? '500' : '600',
            }
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </ThemedText>
        
        {notification.description && (
          <ThemedText 
            style={[
              styles.description,
              { color: notification.isRead ? EARN_COLORS.textTertiary : colors.text }
            ]}
            numberOfLines={2}
          >
            {notification.description}
          </ThemedText>
        )}
      </View>
      
      {/* Unread dot */}
      {!notification.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: colors.icon }]} />
      )}
      
      {/* Priority badge */}
      {notification.priority === 'high' && (
        <View style={styles.priorityBadge}>
          <Ionicons name="flame" size={12} color={EARN_COLORS.error} />
        </View>
      )}
    </Pressable>
);
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
    }),
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    marginBottom: 3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  priorityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.errorScale[100],
    borderRadius: 8,
    padding: 3,
  },
});

export default React.memo(NotificationCard);
