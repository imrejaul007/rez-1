// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Pressable, ImageSourcePropType } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Text from './Text';

interface EmptyStateProps {
  title: string;
  message?: string;
  subtitle?: string;
  icon?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackgroundColor?: string;
  imageSource?: ImageSourcePropType;
  actionLabel?: string;
  onAction?: () => void;
  style?: any;
}

function EmptyState({
  title,
  message,
  subtitle,
  icon,
  iconName,
  iconColor,
  iconBackgroundColor,
  actionLabel,
  onAction,
  imageSource,
  style,
}: EmptyStateProps) {
  const { colors, shadows } = useTheme();
  const description = subtitle || message;
  const resolvedIconColor = iconColor ?? colors.secondary[600];
  const resolvedIconBg = iconBackgroundColor ?? colors.background.tertiary;

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={`${title}. ${description || ''}`}
    >
      {imageSource ? (
        <CachedImage
          source={imageSource}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      ) : iconName ? (
        <View style={[styles.iconCircle, { backgroundColor: resolvedIconBg }]}>
          <Ionicons name={iconName} size={32} color={resolvedIconColor} />
        </View>
      ) : icon ? (
        <View style={[styles.iconCircle, { backgroundColor: resolvedIconBg }]}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
      ) : null}

      <Text variant="h3" align="center" style={styles.title}>
        {title}
      </Text>

      {description && (
        <Text variant="body" color="secondary" align="center" style={styles.message}>
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: colors.primary[500],
              ...shadows.subtle,
            },
          ]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text variant="button" style={{ color: colors.secondary[600] }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconEmoji: {
    fontSize: 32,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  button: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
});

export default React.memo(EmptyState);
