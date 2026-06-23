import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface FeaturePill {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bgColor: string;
  iconColor: string;
}

const features: FeaturePill[] = [
  { icon: 'cash-outline', label: 'Cashback', bgColor: colors.successScale[100], iconColor: colors.successScale[700] },
  { icon: 'gift-outline', label: 'Rewards', bgColor: colors.tint.amberLight, iconColor: colors.warningScale[700] },
  { icon: 'pricetag-outline', label: 'Deals', bgColor: colors.tint.purple, iconColor: colors.brand.purple },
];

const HeroSection: React.FC = () => {
  return (
    <LinearGradient
      colors={[colors.successScale[700], '#047857', '#065F46']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Light Bulb Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="bulb" size={32} color={colors.brand.goldWarm} />
        </View>
      </View>

      {/* Main Title */}
      <Text style={styles.title}>
        ReZ helps you save money on{'\n'}things you already buy.
      </Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Whether you shop <Text style={styles.boldText}>online</Text> or at{' '}
        <Text style={styles.boldText}>nearby stores</Text>, ReZ gives you:
      </Text>

      {/* Feature Pills */}
      <View style={styles.pillsContainer}>
        {features.map((feature, index) => (
          <View
            key={index}
            style={[styles.pill, { backgroundColor: feature.bgColor }]}
          >
            <Ionicons name={feature.icon} size={18} color={feature.iconColor} />
            <Text style={[styles.pillText, { color: feature.iconColor }]}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer Text */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          All stored in{' '}
          <View style={styles.walletBadge}>
            <Text style={styles.walletBadgeText}>one wallet</Text>
          </View>
          {' '}, usable everywhere on ReZ.
        </Text>
      </View>

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background.primary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: '700',
    color: colors.background.primary,
  },
  pillsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  walletBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default React.memo(HeroSection);
