/**
 * MallPageHeader Component
 *
 * Reusable header for mall pages with optional search and title
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface MallPageHeaderProps {
  title: string;
  subtitle?: string;
  brandCount?: number;
  maxCashback?: number;
  icon?: string;
  color?: string;
}

const MallPageHeader: React.FC<MallPageHeaderProps> = ({
  title,
  subtitle,
  brandCount,
  maxCashback,
  icon,
  color = colors.nileBlue,
}) => {
  return (
    <LinearGradient
      colors={[color, `${color}DD`, `${color}99`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {icon && (
          <Text style={styles.icon}>{icon}</Text>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
        <View style={styles.statsRow}>
          {brandCount !== undefined && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{brandCount}</Text>
              <Text style={styles.statLabel}>Brands</Text>
            </View>
          )}
          {maxCashback !== undefined && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>Up to {maxCashback}%</Text>
              <Text style={styles.statLabel}>Cashback</Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default memo(MallPageHeader);
