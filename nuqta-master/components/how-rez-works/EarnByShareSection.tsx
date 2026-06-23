import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface EarnOption {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconBgColor: string;
  iconColor: string;
}

const earnOptions: EarnOption[] = [
  {
    icon: 'star',
    text: 'Posting reviews',
    iconBgColor: colors.tint.amberLight,
    iconColor: colors.warningScale[700],
  },
  {
    icon: 'camera',
    text: 'Uploading photos/videos',
    iconBgColor: colors.pinkMist,
    iconColor: colors.brand.pink,
  },
  {
    icon: 'people',
    text: 'Sharing deals with friends',
    iconBgColor: colors.tint.blueLight,
    iconColor: colors.infoScale[400],
  },
];

const EarnByShareSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="share-social" size={28} color={colors.brand.pink} />
        </View>
        <Text style={styles.sectionTitle}>Earn more by sharing</Text>
        <Text style={styles.sectionSubtitle}>Share your experience</Text>
      </View>

      {/* Earn Options Card */}
      <View style={styles.optionsCard}>
        <Text style={styles.cardSubtitle}>You can earn extra coins by:</Text>

        <View style={styles.optionsContainer}>
          {earnOptions.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <View style={[styles.iconContainer, { backgroundColor: option.iconBgColor }]}>
                <Ionicons name={option.icon} size={18} color={option.iconColor} />
              </View>
              <Text style={styles.optionText}>{option.text}</Text>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            Merchants decide bonus rewards.
          </Text>
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
    backgroundColor: colors.pinkMist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  optionsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
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
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 14,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    fontSize: 15,
    color: colors.neutral[700],
    flex: 1,
    fontWeight: '500',
  },
  quoteContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 13,
    color: colors.brand.pink,
    fontStyle: 'italic',
  },
});

export default React.memo(EarnByShareSection);
