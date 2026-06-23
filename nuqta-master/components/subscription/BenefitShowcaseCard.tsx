// Benefit Showcase Card Component
// Beautiful card showing trial benefits with status indicator

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

interface BenefitShowcaseCardProps {
  icon: string;
  title: string;
  description: string;
  isActive?: boolean;
  style?: ViewStyle;
}

function BenefitShowcaseCard({
  icon,
  title,
  description,
  isActive = true,
  style,
}: BenefitShowcaseCardProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purpleSoft, '#C4B5FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={icon as any} size={32} color={colors.background.primary} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {isActive && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.successScale[400]} />
              <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.successScale[400],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    minWidth: 56,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.neutral[900],
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  description: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18,
  },
});

export default React.memo(BenefitShowcaseCard);
