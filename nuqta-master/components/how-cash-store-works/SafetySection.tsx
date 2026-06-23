/**
 * SafetySection Component
 *
 * Shows safety and security features of Cash Store
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const SAFETY_FEATURES = [
  {
    id: 1,
    icon: 'shield-checkmark',
    title: 'Secure Tracking',
    description: 'Your purchases are tracked securely without storing any payment details',
  },
  {
    id: 2,
    icon: 'lock-closed',
    title: 'Data Privacy',
    description: 'We never share your personal or shopping data with third parties',
  },
  {
    id: 3,
    icon: 'eye-off',
    title: 'No Hidden Fees',
    description: 'What you see is what you get - no hidden charges or deductions',
  },
  {
    id: 4,
    icon: 'card',
    title: 'Official Partners',
    description: 'All brands are official partners with verified cashback programs',
  },
];

const SafetySection: React.FC = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.green, colors.brand.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Section Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield" size={28} color={colors.brand.green} />
          </View>
          <Text style={styles.headerTitle}>Shop with Confidence</Text>
          <Text style={styles.headerSubtitle}>
            Your safety is our priority
          </Text>
        </View>

        {/* Safety Features Grid */}
        <View style={styles.featuresGrid}>
          {SAFETY_FEATURES.map((feature) => (
            <View key={feature.id} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon as any} size={24} color={colors.brand.green} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>

        {/* Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="checkmark-done-circle" size={20} color={colors.brand.green} />
          <Text style={styles.trustText}>Trusted by 50,000+ Users</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral[50],
  },
  gradient: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    width: '48%',
    minWidth: 140,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tint.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default memo(SafetySection);
