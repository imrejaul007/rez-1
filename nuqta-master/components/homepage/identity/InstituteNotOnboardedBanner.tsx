import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface Props {
  onRefer: () => void;
  onExplore: () => void;
  onDismiss: () => void;
}

function InstituteNotOnboardedBanner({
  onRefer,
  onExplore,
  onDismiss,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onDismiss} style={styles.dismissButton} hitSlop={12}>
        <Ionicons name="close" size={18} color={colors.text.tertiary} />
      </Pressable>

      <View style={styles.content}>
        <ThemedText style={styles.emoji}>🟡</ThemedText>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>
            Your college isn't on REZ yet
          </ThemedText>
          <ThemedText style={styles.body}>
            You can still save on all public deals.{'\n'}
            Refer your college — earn ₹300 when they join REZ.
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onRefer} style={styles.referButton}>
          <ThemedText style={styles.referButtonText}>Refer College →</ThemedText>
        </Pressable>
        <Pressable onPress={onExplore} style={styles.exploreButton}>
          <ThemedText style={styles.exploreButtonText}>Explore Deals</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default React.memo(InstituteNotOnboardedBanner);

const styles = StyleSheet.create({
  container: {
    margin: spacing.base,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.subtle,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingRight: spacing.xl,
  },
  emoji: { fontSize: 28 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  body: { fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  referButton: {
    flex: 1,
    backgroundColor: colors.brand.purple,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  referButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  exploreButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  exploreButtonText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
});
