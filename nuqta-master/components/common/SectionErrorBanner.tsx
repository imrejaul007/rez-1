import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface SectionErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

const SectionErrorBanner: React.FC<SectionErrorBannerProps> = ({
  message = 'Failed to load this section',
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <Pressable
        style={styles.compactContainer}
        onPress={onRetry}
       
        disabled={!onRetry}
      >
        <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
        <Text style={styles.compactText}>{message}</Text>
        {onRetry && (
          <Text style={styles.compactRetry}>Tap to retry</Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={24} color={colors.neutral[400]} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={14} color={colors.warningScale[400]} />
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  message: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.tint.amberLight,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.errorScale[50],
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  compactRetry: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
});

export default React.memo(SectionErrorBanner);
