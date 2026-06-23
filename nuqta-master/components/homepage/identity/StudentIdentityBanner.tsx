import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface Props {
  institutionName: string;
  monthlySaved: number;
  onSeeLeaderboard: () => void;
  onSeeDeals: () => void;
}

function StudentIdentityBanner({
  institutionName,
  monthlySaved,
  onSeeLeaderboard,
  onSeeDeals,
}: Props) {
  return (
    <LinearGradient
      colors={[colors.secondary[600], colors.secondary[800]]}
      style={styles.container}
    >
      {/* Verified Badge */}
      <View style={styles.badge}>
        <ThemedText style={styles.badgeText}>Student Verified</ThemedText>
      </View>

      {/* Institution */}
      <ThemedText style={styles.institutionName}>{institutionName}</ThemedText>

      {/* Savings */}
      <ThemedText style={styles.savingsLabel}>
        Students saved this month
      </ThemedText>
      <ThemedText style={styles.savingsAmount}>
        {monthlySaved > 0 ? `\u20B9${monthlySaved.toLocaleString()}` : '--'}
      </ThemedText>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable onPress={onSeeLeaderboard} style={styles.ghostButton}>
          <ThemedText style={styles.ghostButtonText}>
            See rankings →
          </ThemedText>
        </Pressable>
        <Pressable onPress={onSeeDeals} style={styles.accentButton}>
          <ThemedText style={styles.accentButtonText}>
            Student deals →
          </ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

export default React.memo(StudentIdentityBanner);

const styles = StyleSheet.create({
  container: {
    margin: spacing.base,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  institutionName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: 4,
  },
  savingsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary[500],
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ghostButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ghostButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  accentButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
  },
  accentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary[800],
  },
});
