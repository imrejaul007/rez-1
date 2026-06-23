import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

interface LevelWarningBannerProps {
  daysRemaining: number;
  ordersNeeded: number;
  currentLevel: string;
  onDismiss?: () => void;
  onShopNow?: () => void;
}

const COLORS = {
  warning: colors.warningScale[400],
  warningLight: colors.tint.amberLight,
  warningDark: colors.warningScale[700],
  danger: colors.error,
  dangerLight: colors.errorScale[100],
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
};

function LevelWarningBanner({
  daysRemaining,
  ordersNeeded,
  currentLevel,
  onDismiss,
  onShopNow,
}: LevelWarningBannerProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  // Determine severity
  const isCritical = daysRemaining <= 3;

  useEffect(() => {
    // Slide in animation
    slideAnim.value = withTiming(1, { duration: 500 });

    // Pulse animation for critical warnings
    if (isCritical) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1
      );
    }

    return () => {
      pulseAnim.value = 1;
    };
  }, [isCritical]);

  const handleDismiss = () => {
    slideAnim.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  const handleShopNow = () => {
    if (onShopNow) {
      onShopNow();
    } else {
      router.push('/(tabs)');
    }
  };

  if (!isVisible || ordersNeeded <= 0) {
    return null;
  }

  const backgroundColor = isCritical ? COLORS.dangerLight : COLORS.warningLight;
  const accentColor = isCritical ? COLORS.danger : COLORS.warning;
  const iconName = isCritical ? 'warning' : 'alert-circle';

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 1], [-100, 0]) },
      { scale: pulseAnim.value },
    ],
    opacity: slideAnim.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor },
        animatedContainerStyle,
      ]}
    >
      {/* Close Button */}
      <Pressable
        style={styles.closeButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
      </Pressable>

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={accentColor} />
        </View>

        {/* Warning Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: accentColor }]}>
            {isCritical ? '⚠️ Level at Risk!' : '⏰ Action Required'}
          </Text>
          <Text style={styles.message}>
            Complete <Text style={styles.highlight}>{ordersNeeded} more order{ordersNeeded > 1 ? 's' : ''}</Text> in{' '}
            <Text style={styles.highlight}>{daysRemaining} day{daysRemaining > 1 ? 's' : ''}</Text> to keep your{' '}
            <Text style={styles.highlight}>{currentLevel}</Text> status
          </Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(0, 100 - (daysRemaining / 44) * 100)}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {daysRemaining} days left
            </Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <Pressable style={styles.actionButton} onPress={handleShopNow}>
        <LinearGradient
          colors={isCritical ? [COLORS.danger, colors.error] : [COLORS.warning, COLORS.warningDark]}
          style={styles.actionButtonGradient}
        >
          <Text style={styles.actionButtonText}>Shop Now</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </LinearGradient>
      </Pressable>

      {/* Benefits Reminder */}
      <View style={styles.benefitsReminder}>
        <Ionicons name="gift-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.benefitsText}>
          Don't lose your {currentLevel} benefits: cashback, free delivery & more!
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  actionButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  benefitsReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  benefitsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default React.memo(LevelWarningBanner);
