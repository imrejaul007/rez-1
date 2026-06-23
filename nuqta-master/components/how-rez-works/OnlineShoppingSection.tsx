import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface ShoppingOption {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColors: string[];
  cardBgColors: string[];
  borderColor: string;
  features: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }[];
}

const shoppingOptions: ShoppingOption[] = [
  {
    title: `${BRAND.APP_NAME} Mall`,
    subtitle: 'Shop from curated brands',
    icon: 'storefront',
    iconBgColors: [colors.brand.pink, colors.deepPink],
    cardBgColors: ['#FDF2F8', colors.pinkMist],
    borderColor: '#FBCFE8',
    features: [
      { icon: 'star', text: 'Curated brands', color: '#D946EF' },
      { icon: 'pricetag', text: `Special ${BRAND.APP_NAME} offers`, color: colors.brand.pink },
      { icon: 'wallet', text: 'Extra cashback', color: colors.nileBlue },
    ],
  },
  {
    title: 'Cash Store',
    subtitle: 'Shop anywhere, earn rewards',
    icon: 'cash',
    iconBgColors: [colors.brand.orange, colors.brand.orangeDark],
    cardBgColors: [colors.tint.orange, '#FFEDD5'],
    borderColor: '#FED7AA',
    features: [
      { icon: 'globe', text: 'Shop on any major e-commerce site', color: colors.infoScale[400] },
      { icon: 'card', text: 'Earn affiliate cashback', color: colors.brand.orange },
      { icon: 'gift', text: 'Buy brand coupons & vouchers', color: colors.brand.purpleLight },
    ],
  },
];

const OnlineShoppingSection: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="bag-handle" size={28} color={colors.brand.pink} />
        </View>
        <Text style={styles.sectionTitle}>Shopping online with {BRAND.APP_NAME}</Text>
        <Text style={styles.sectionSubtitle}>Two ways:</Text>
      </View>

      {/* Shopping Option Cards */}
      {shoppingOptions.map((option, index) => (
        <LinearGradient
          key={index}
          colors={option.cardBgColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.optionCard, { borderColor: option.borderColor }]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={option.iconBgColors}
              style={styles.cardIconContainer}
            >
              <Ionicons name={option.icon} size={22} color={colors.background.primary} />
            </LinearGradient>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {option.features.map((feature, featureIndex) => (
              <View key={featureIndex} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={16} color={feature.color} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      ))}

      {/* CTA Button */}
      <Pressable style={styles.ctaButton}>
        <LinearGradient
          colors={[colors.nileBlue, '#14303f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Same shopping. Extra savings.</Text>
        </LinearGradient>
      </Pressable>
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
});

export default React.memo(OnlineShoppingSection);
