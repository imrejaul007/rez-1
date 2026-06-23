import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface IdentityCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accentColor: string;
  backgroundColor: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function IdentityCard({
  icon,
  title,
  subtitle,
  accentColor,
  backgroundColor,
  onPress,
  disabled,
  badge,
}: IdentityCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.97, { damping: 15 });
      }}
      onPressOut={() => {
        if (!disabled) scale.value = withSpring(1, { damping: 15 });
      }}
      onPress={disabled ? undefined : onPress}
      style={[animatedStyle, styles.card, { backgroundColor, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: accentColor }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {badge && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.warningScale[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
});
