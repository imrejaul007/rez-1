// @ts-nocheck
/**
 * Points Notification Component
 * Animated toast notification for points earned/spent
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

export interface PointsNotificationData {
  amount: number;
  type: 'earned' | 'spent';
  reason: string;
  icon?: string;
  duration?: number;
}

interface PointsNotificationProps {
  data: PointsNotificationData;
  onDismiss: () => void;
}

function PointsNotification({ data, onDismiss }: PointsNotificationProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const { amount, type, reason, icon, duration = 3000 } = data;

  useEffect(() => {
    // Entrance animation
    translateY.value = withSpring(0);
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 5 });

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(0.8, { duration: 300 });
    setTimeout(() => onDismiss(), 300);
  };

  const isEarned = type === 'earned';
  const iconName = icon || (isEarned ? 'add-circle' : 'remove-circle');
  const color = isEarned ? colors.successScale[400] : colors.error;
  const backgroundColor = isEarned ? colors.tint.greenLight : colors.errorScale[50];
  const borderColor = isEarned ? colors.successScale[400] : colors.error;
  const prefix = isEarned ? '+' : '-';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={handleDismiss}
       
      >
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={iconName as any} size={24} color={colors.background.primary} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.pointsRow}>
            <Ionicons name="diamond" size={16} color={color} />
            <Text style={[styles.pointsText, { color }]}>
              {prefix}{amount} Coins
            </Text>
          </View>
          <Text style={styles.reasonText} numberOfLines={1}>
            {reason}
          </Text>
        </View>

        <Pressable onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.neutral[500]} />
        </Pressable>
      </Pressable>

      {/* Animated bar showing time left */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: color,
            width: interpolate(translateY.value, [-100, 0], ['0%', '100%']),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 6,
  },
  reasonText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  progressBar: {
    height: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});

export default React.memo(PointsNotification);
