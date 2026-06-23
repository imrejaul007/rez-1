import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCountdown, getUrgencyColor, getUrgencyBadge } from '@/hooks/useCountdown';
import { colors } from '@/constants/theme';

export type CountdownSize = 'small' | 'normal' | 'large';

export interface DealCountdownTimerProps {
  expiryDate: string | Date | undefined;
  size?: CountdownSize;
  showLabel?: boolean;
  showIcon?: boolean;
  onExpire?: () => void;
  containerStyle?: any;
  textStyle?: any;
}

/**
 * DealCountdownTimer Component
 *
 * Displays a dynamic countdown timer for deals with urgency-based colors:
 * - Red when < 1 hour remaining
 * - Yellow/orange when < 24 hours
 * - Green when > 24 hours
 * - Updates every second
 * - Auto-hides when expired
 *
 * @example
 * ```tsx
 * <DealCountdownTimer
 *   expiryDate="2025-12-31T23:59:59"
 *   size="normal"
 *   showLabel={true}
 * />
 * ```
 */
function DealCountdownTimer({
  expiryDate,
  size = 'normal',
  showLabel = true,
  showIcon = true,
  onExpire,
  containerStyle,
  textStyle,
}: DealCountdownTimerProps) {
  const countdown = useCountdown(expiryDate, onExpire);

  // Get styles based on size and urgency
  const styles = useMemo(() => getStyles(size), [size]);
  const urgencyColor = getUrgencyColor(countdown.urgencyLevel);
  const urgencyBadge = getUrgencyBadge(countdown);

  // Auto-hide when expired
  if (countdown.isExpired) {
    return null;
  }

  // Get icon size based on timer size
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  // Get label text based on urgency
  const labelText = showLabel ? (
    countdown.totalSeconds <= 1800 ? 'Ending soon!' :
    countdown.totalSeconds <= 3600 ? 'Hurry up!' :
    countdown.totalSeconds <= 86400 ? 'Limited time' :
    'Ends in'
  ) : null;

  return (
    <View style={[styles.container, containerStyle]}>
      {showIcon && (
        <Ionicons
          name="time-outline"
          size={iconSize}
          color={urgencyColor}
          style={styles.icon}
        />
      )}

      <View style={styles.textContainer}>
        {labelText && (
          <Text
            style={[
              styles.label,
              { color: urgencyColor },
              textStyle
            ]}
            numberOfLines={1}
          >
            {labelText}
          </Text>
        )}

        <Text
          style={[
            styles.time,
            { color: urgencyColor },
            textStyle
          ]}
          numberOfLines={1}
          accessibilityLabel={`Time remaining: ${countdown.formattedTime}`}
          accessibilityRole="text"
        >
          {countdown.formattedTime}
        </Text>
      </View>

      {/* Urgency Badge */}
      {urgencyBadge && countdown.totalSeconds <= 86400 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: urgencyColor + '20', // 20% opacity
              borderColor: urgencyColor
            }
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: urgencyColor }
            ]}
            numberOfLines={1}
          >
            {urgencyBadge}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Compact version without label, useful for inline display
 */
export function CompactCountdownTimer({
  expiryDate,
  size = 'small',
  onExpire,
}: Pick<DealCountdownTimerProps, 'expiryDate' | 'size' | 'onExpire'>) {
  return (
    <DealCountdownTimer
      expiryDate={expiryDate}
      size={size}
      showLabel={false}
      showIcon={true}
      onExpire={onExpire}
    />
  );
}

/**
 * Progress bar variant showing visual countdown
 */
export function CountdownProgressBar({
  expiryDate,
  totalDuration, // in seconds
  size = 'normal',
}: {
  expiryDate: string | Date | undefined;
  totalDuration: number;
  size?: CountdownSize;
}) {
  const countdown = useCountdown(expiryDate);
  const styles = useMemo(() => getStyles(size), [size]);
  const urgencyColor = getUrgencyColor(countdown.urgencyLevel);

  if (countdown.isExpired) {
    return null;
  }

  // Calculate progress percentage
  const progress = Math.max(0, Math.min(100, (countdown.totalSeconds / totalDuration) * 100));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: `${progress}%`,
              backgroundColor: urgencyColor
            }
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: urgencyColor }]}>
        {countdown.formattedTime}
      </Text>
    </View>
  );
}

const getStyles = (size: CountdownSize) => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isSmall ? 4 : isLarge ? 10 : 6,
      paddingHorizontal: isSmall ? 8 : isLarge ? 14 : 10,
      borderRadius: isSmall ? 6 : isLarge ? 10 : 8,
      backgroundColor: colors.neutral[50],
      borderWidth: 1,
      borderColor: colors.gray[200],
    },
    icon: {
      marginRight: isSmall ? 4 : isLarge ? 8 : 6,
    },
    textContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmall ? 4 : isLarge ? 8 : 6,
    },
    label: {
      fontSize: isSmall ? 11 : isLarge ? 15 : 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    time: {
      fontSize: isSmall ? 12 : isLarge ? 16 : 14,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    badge: {
      marginLeft: isSmall ? 6 : isLarge ? 10 : 8,
      paddingVertical: isSmall ? 2 : isLarge ? 5 : 3,
      paddingHorizontal: isSmall ? 6 : isLarge ? 10 : 8,
      borderRadius: isSmall ? 4 : isLarge ? 8 : 6,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: isSmall ? 9 : isLarge ? 12 : 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Progress bar styles
    progressContainer: {
      width: '100%',
      paddingVertical: isSmall ? 6 : isLarge ? 12 : 8,
      gap: isSmall ? 4 : isLarge ? 8 : 6,
    },
    progressBarBg: {
      width: '100%',
      height: isSmall ? 4 : isLarge ? 8 : 6,
      backgroundColor: colors.gray[200],
      borderRadius: isSmall ? 2 : isLarge ? 4 : 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: isSmall ? 2 : isLarge ? 4 : 3,
    },
    progressText: {
      fontSize: isSmall ? 11 : isLarge ? 14 : 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
};

export default React.memo(DealCountdownTimer);
