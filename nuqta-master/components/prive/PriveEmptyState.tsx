import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from './priveTheme';

interface PriveEmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export const PriveEmptyState: React.FC<PriveEmptyStateProps> = ({
  icon = '◇',
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {ctaLabel && onCtaPress && (
        <Pressable style={styles.ctaButton} onPress={onCtaPress}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxxl,
    paddingHorizontal: PRIVE_SPACING.xl,
  },
  icon: {
    fontSize: 48,
    color: PRIVE_COLORS.gold.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.sm,
  },
  subtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: PRIVE_SPACING.xl,
    paddingHorizontal: PRIVE_SPACING.xxl,
    paddingVertical: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    borderRadius: PRIVE_RADIUS.full,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
});

export default React.memo(PriveEmptyState);
