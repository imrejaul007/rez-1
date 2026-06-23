import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface Props {
  onVerify: () => void;
  onDismiss: () => void;
}

function VerificationPromptBanner({ onVerify, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      {/* Dismiss X */}
      <Pressable onPress={onDismiss} style={styles.dismissButton} hitSlop={12}>
        <Ionicons name="close" size={18} color={colors.text.tertiary} />
      </Pressable>

      <View style={styles.content}>
        <ThemedText style={styles.emoji}>🎓</ThemedText>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Your college is on REZ</ThemedText>
          <ThemedText style={styles.body}>
            847 students near you unlocked exclusive deals.
            Verify in 30 seconds to see what they save.
          </ThemedText>
        </View>
      </View>

      <Pressable onPress={onVerify} style={styles.verifyButton}>
        <ThemedText style={styles.verifyButtonText}>Verify Now</ThemedText>
      </Pressable>
    </View>
  );
}

export default React.memo(VerificationPromptBanner);

const styles = StyleSheet.create({
  container: {
    margin: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.purple,
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
  emoji: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: colors.brand.purple,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
