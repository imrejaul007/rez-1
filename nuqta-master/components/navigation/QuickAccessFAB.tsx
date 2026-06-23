// Quick Access FAB (Floating Action Button)
// Expandable floating action button with quick access to key features

import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, SharedValue } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface QuickAction {
  icon: string;
  label: string;
  route: string;
  color: string;
}

const actions: QuickAction[] = [
  { icon: '📄', label: 'Upload Bill', route: '/bill-upload', color: colors.nileBlue },
  { icon: '🎁', label: 'Refer', route: '/referral', color: '#FF6B6B' },
  { icon: '👑', label: 'Premium', route: '/subscription/plans', color: colors.brand.goldBright },
  { icon: '🎮', label: 'Games', route: '/games', color: '#9C27B0' },
];

const FABActionItem: React.FC<{
  action: QuickAction;
  index: number;
  totalActions: number;
  animation: SharedValue<number>;
  onPress: (route: string) => void;
}> = ({ action, index, totalActions, animation, onPress }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(animation.value, [0, 1], [0, -(60 * (totalActions - index))]) }],
    opacity: interpolate(animation.value, [0, 0.5, 1], [0, 0.5, 1]),
  }));

  return (
    <Animated.View style={[styles.actionWrapper, animatedStyle]}>
      <Pressable
        style={[styles.actionButton, { backgroundColor: action.color }]}
        onPress={() => onPress(action.route)}
        accessibilityLabel={action.label}
        accessibilityRole="button"
      >
        <ThemedText style={styles.actionIcon}>{action.icon}</ThemedText>
        <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
      </Pressable>
    </Animated.View>
  );
};

function QuickAccessFAB() {
  const [expanded, setExpanded] = useState(false);
  const animation = useSharedValue(0);

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    animation.value = withSpring(toValue, { stiffness: 50, damping: 7 });
    setExpanded(!expanded);
  };

  const handleActionPress = (route: string) => {
    setExpanded(false);
    animation.value = withSpring(0);
    try { router.push(route as any); } catch (_e) { /* silently handle */ }
  };

  const fabRotateStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(animation.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {expanded && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <FABActionItem
              key={index}
              action={action}
              index={index}
              totalActions={actions.length}
              animation={animation}
              onPress={handleActionPress}
            />
          ))}
        </View>
      )}

      <Pressable
        onPress={toggleExpand}
        accessibilityLabel={expanded ? 'Close quick actions' : 'Quick actions menu'}
        accessibilityRole="button"
        style={styles.fabTouchable}
      >
        <LinearGradient
          colors={expanded ? [colors.error, colors.error] : [colors.lightMustard, '#e6b84e']}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={fabRotateStyle}>
            <ThemedText style={styles.fabIcon}>
              {expanded ? '✕' : '⚡'}
            </ThemedText>
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  actionWrapper: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  fabTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(255, 205, 87, 0.4)',
      },
    }),
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 24,
    color: colors.background.primary,
  },
});

export default React.memo(QuickAccessFAB);
