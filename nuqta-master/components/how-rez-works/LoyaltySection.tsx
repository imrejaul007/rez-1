import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface LoyaltyFeature {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconBgColor: string;
  iconColor: string;
}

const loyaltyFeatures: LoyaltyFeature[] = [
  {
    icon: 'trophy-outline',
    text: 'Visit-based rewards',
    iconBgColor: colors.tint.purple,
    iconColor: colors.brand.purpleLight,
  },
  {
    icon: 'layers-outline',
    text: 'Tier benefits',
    iconBgColor: colors.tint.blueLight,
    iconColor: colors.infoScale[400],
  },
  {
    icon: 'gift-outline',
    text: 'Exclusive offers',
    iconBgColor: colors.tint.green,
    iconColor: colors.successScale[700],
  },
];

interface Example {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

const examples: Example[] = [
  { icon: 'checkmark-circle', text: 'Free service on 5th visit' },
  { icon: 'checkmark-circle', text: 'Higher cashback for Gold users' },
  { icon: 'checkmark-circle', text: 'Birthday / special rewards' },
];

const LoyaltySection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="ribbon" size={28} color={colors.brand.indigo} />
        </View>
        <Text style={styles.sectionTitle}>Loyalty that actually matters</Text>
      </View>

      {/* Features Card */}
      <View style={styles.featuresCard}>
        <Text style={styles.cardSubtitle}>Each brand on ReZ has:</Text>

        <View style={styles.featuresContainer}>
          {loyaltyFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.iconContainer, { backgroundColor: feature.iconBgColor }]}>
                <Ionicons name={feature.icon} size={18} color={feature.iconColor} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Examples Card */}
      <View style={styles.examplesCard}>
        <Text style={styles.examplesTitle}>Examples:</Text>

        <View style={styles.examplesContainer}>
          {examples.map((example, index) => (
            <View key={index} style={styles.exampleRow}>
              <Ionicons name={example.icon} size={18} color={colors.successScale[700]} />
              <Text style={styles.exampleText}>{example.text}</Text>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            No punch cards. Everything is tracked automatically.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.neutral[50],
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
  },
  featuresCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 14,
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
    fontWeight: '500',
  },
  examplesCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 14,
  },
  examplesContainer: {
    gap: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exampleText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
  },
  quoteContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  quoteText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default React.memo(LoyaltySection);
