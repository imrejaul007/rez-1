/**
 * CountdownTimer Component
 *
 * Display component for countdown timers
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCountdown, getUrgencyColor } from '@/hooks/useCountdown';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface CountdownTimerProps {
  endTime: string | Date;
  format?: 'compact' | 'full' | 'badge';
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  format = 'compact',
  showIcon = true,
  size = 'medium',
  onExpire,
}) => {
  const { theme } = useOffersTheme();
  const countdown = useCountdown(endTime, onExpire);
  const urgencyColor = getUrgencyColor(countdown.urgencyLevel);

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 10;
      case 'large':
        return 14;
      default:
        return 12;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 10;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        countdown.urgencyLevel === 'critical'
          ? colors.errorScale[100]
          : countdown.urgencyLevel === 'warning'
          ? colors.tint.amberLight
          : theme.colors.border.light,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    icon: {
      marginRight: 4,
    },
    text: {
      fontSize: getFontSize(),
      fontWeight: '600',
      color: urgencyColor,
    },
    expiredText: {
      color: theme.colors.text.tertiary,
    },
  });

  if (countdown.isExpired) {
    return (
      <View style={format === 'badge' ? styles.badgeContainer : styles.container}>
        <Text style={[styles.text, styles.expiredText]}>Expired</Text>
      </View>
    );
  }

  const displayTime =
    format === 'full'
      ? `${countdown.hours.toString().padStart(2, '0')}:${countdown.minutes
          .toString()
          .padStart(2, '0')}:${countdown.seconds.toString().padStart(2, '0')}`
      : countdown.formattedTime;

  return (
    <View style={format === 'badge' ? styles.badgeContainer : styles.container}>
      {showIcon && (
        <Ionicons
          name="time-outline"
          size={getIconSize()}
          color={urgencyColor}
          style={styles.icon}
        />
      )}
      <Text style={styles.text}>{displayTime}</Text>
    </View>
  );
};

export default React.memo(CountdownTimer);
