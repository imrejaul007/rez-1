import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface LockFeature {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  highlight?: string;
  iconBgColor: string;
  iconColor: string;
}

const lockFeatures: LockFeature[] = [
  {
    icon: 'pricetag-outline',
    text: 'Pay ',
    highlight: 'only 10%',
    iconBgColor: colors.tint.amberLight,
    iconColor: colors.warningScale[700],
  },
  {
    icon: 'time-outline',
    text: 'Lock the price for a few hours',
    iconBgColor: '#FFEDD5',
    iconColor: colors.brand.orangeDark,
  },
  {
    icon: 'car-outline',
    text: 'Visit store or get delivery later',
    iconBgColor: colors.errorScale[100],
    iconColor: colors.error,
  },
];

interface CategoryChip {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const categoryChips: CategoryChip[] = [
  { icon: 'tv-outline', label: 'Electronics' },
  { icon: 'shirt-outline', label: 'Fashion' },
  { icon: 'diamond-outline', label: 'High-value' },
];

const ProductLockSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={28} color={colors.brand.orange} />
        </View>
        <Text style={styles.sectionTitle}>Lock products before you decide</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardSubtitle}>If you like a product:</Text>

        <View style={styles.featuresContainer}>
          {lockFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.iconContainer, { backgroundColor: feature.iconBgColor }]}>
                <Ionicons name={feature.icon} size={18} color={feature.iconColor} />
              </View>
              <Text style={styles.featureText}>
                {feature.text}
                {feature.highlight && (
                  <Text style={styles.highlightText}>{feature.highlight}</Text>
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* Category Chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>Great for:</Text>
          <View style={styles.chipsContainer}>
            {categoryChips.map((chip, index) => (
              <View key={index} style={styles.chip}>
                <Ionicons name={chip.icon} size={16} color={colors.neutral[500]} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background.primary,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFEDD5',
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
  infoCard: {
    backgroundColor: colors.tint.orange,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.orange,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.brand.amberDark,
    marginBottom: 16,
    fontWeight: '500',
  },
  featuresContainer: {
    gap: 14,
    marginBottom: 20,
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
  },
  highlightText: {
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  chipsSection: {
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
    paddingTop: 16,
  },
  chipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[700],
  },
});

export default React.memo(ProductLockSection);
