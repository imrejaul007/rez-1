import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, typography, zIndex , colors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onDismiss?: () => void;
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

function Toast({
  message,
  type = 'success',
  duration = 4000,
  onDismiss,
  actions,
}: ToastProps) {
  const { colors, shadows } = useTheme();
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(-100);

  const BG_MAP: Record<string, string> = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300 });
    slideAnim.value = withTiming(0, { duration: 300 });

    if (!actions && duration > 0) {
      const timer = setTimeout(() => {
        dismiss();
      }, duration);
      return () => {
        clearTimeout(timer);
      };
    }
  }, []);

  const dismiss = () => {
    fadeAnim.value = withTiming(0, { duration: 200 });
    slideAnim.value = withTiming(-100, { duration: 200 });
    // Call onDismiss after animation completes
    setTimeout(() => {
      onDismiss?.();
    }, 200);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        shadows.strong,
        {
          backgroundColor: BG_MAP[type],
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${type} notification: ${message}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Ionicons
          name={ICON_MAP[type]}
          size={24}
          color={colors.background.primary}
          style={styles.icon}
          accessible={false}
        />
        <Text
          style={styles.message}
          accessible={true}
          accessibilityRole="text"
        >
          {message}
        </Text>
        {!actions && (
          <Pressable
            onPress={dismiss}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
          >
            <Ionicons name="close" size={20} color={colors.background.primary} />
          </Pressable>
        )}
      </View>

      {actions && actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <Pressable
              key={index}
              style={[
                styles.actionButton,
                action.style === 'cancel' && styles.cancelButton,
              ]}
              onPress={() => {
                action.onPress?.();
                dismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel={action.text}
            >
              <Text
                style={[
                  styles.actionText,
                  action.style === 'cancel' && styles.cancelText,
                ]}
              >
                {action.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    right: spacing.base,
    borderRadius: borderRadius.md,
    zIndex: zIndex.toast,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  icon: {
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    color: colors.background.primary,
    ...typography.label,
    lineHeight: 20,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    color: colors.background.primary,
    ...typography.label,
  },
  cancelText: {
    fontWeight: '500',
  },
});

export default React.memo(Toast);
