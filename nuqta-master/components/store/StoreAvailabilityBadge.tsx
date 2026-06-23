// Store Availability Badge Component
// Shows store online/offline status and business hours

import { colors } from '@/constants/theme';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';

interface StoreAvailabilityBadgeProps {
  isOnline: boolean;
  isOpen?: boolean;
  responseTime?: string;
  opensAt?: string;
  closesAt?: string;
  size?: 'small' | 'medium' | 'large';
  showResponseTime?: boolean;
}

function StoreAvailabilityBadge({
  isOnline,
  isOpen = true,
  responseTime = 'Usually replies in a few hours',
  opensAt,
  closesAt,
  size = 'medium',
  showResponseTime = true,
}: StoreAvailabilityBadgeProps) {
  const getStatusColor = () => {
    if (isOnline && isOpen) return PROFILE_COLORS.success;
    if (!isOpen && opensAt) return PROFILE_COLORS.warning;
    return '#999';
  };

  const getStatusText = () => {
    if (isOnline && isOpen) return 'Online';
    if (!isOpen && opensAt) return `Opens at ${opensAt}`;
    if (!isOpen && closesAt) return `Closed • Opens tomorrow`;
    return 'Offline';
  };

  const getStatusIcon = () => {
    if (isOnline && isOpen) return 'checkmark-circle';
    if (!isOpen) return 'time-outline';
    return 'radio-button-off-outline';
  };

  const sizes = {
    small: {
      container: styles.containerSmall,
      text: styles.textSmall,
      icon: 12,
      dot: 6,
    },
    medium: {
      container: styles.containerMedium,
      text: styles.textMedium,
      icon: 14,
      dot: 8,
    },
    large: {
      container: styles.containerLarge,
      text: styles.textLarge,
      icon: 16,
      dot: 10,
    },
  };

  const sizeConfig = sizes[size];
  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      <View
        style={[styles.badge, sizeConfig.container, { backgroundColor: statusColor + '15' }]}
        accessibilityRole="text"
        accessibilityLabel={`Store status: ${getStatusText()}`}
      >
        <View
          style={[styles.statusDot, { backgroundColor: statusColor, width: sizeConfig.dot, height: sizeConfig.dot, borderRadius: sizeConfig.dot / 2 }]}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        <ThemedText style={[sizeConfig.text, { color: statusColor }]}>
          {getStatusText()}
        </ThemedText>
        {isOnline && isOpen && (
          <Ionicons name={getStatusIcon() as any} size={sizeConfig.icon} color={statusColor} />
        )}
      </View>

      {showResponseTime && responseTime && (
        <ThemedText style={styles.responseTime}>{responseTime}</ThemedText>
      )}
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    // Dynamic size based on size prop
  },
  textSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMedium: {
    fontSize: 12,
    fontWeight: '600',
  },
  textLarge: {
    fontSize: 13,
    fontWeight: '600',
  },
  responseTime: {
    fontSize: 11,
    color: colors.midGray,
    marginTop: 4,
  },
});

export default React.memo(StoreAvailabilityBadge);
