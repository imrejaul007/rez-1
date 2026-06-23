import React from 'react';
import { BRAND } from '@/constants/brand';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface Step {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

const steps: Step[] = [
  { id: 1, icon: 'wallet-outline', label: 'Spend', color: colors.lightMustard },
  { id: 2, icon: 'scan-outline', label: 'Scan', color: colors.brand.goldRich },
  { id: 3, icon: 'layers-outline', label: 'Earn', color: colors.lightMustard },
  { id: 4, icon: 'swap-horizontal-outline', label: 'Redeem', color: colors.brand.goldRich },
];

const HowNuqtaWorksCard: React.FC = () => {
  const router = useRouter();

  const handleNavigateToPage = () => {
    router.push(BRAND.HOW_IT_WORKS_ROUTE);
  };

  return (
    <View style={styles.cardWrapper}>
      {/* Outer glow effect */}
      <View style={styles.glowEffect} />

      {/* Main Card Container */}
      <View style={styles.cardContainer}>
        {/* Glass background */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassBackground}
        >
          {/* Subtle gradient overlay for depth */}
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.03)', 'rgba(230, 184, 78, 0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Header Section */}
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>How {BRAND.APP_NAME} Works</Text>
              <Text style={styles.subtitle}>Save money on everything you spend</Text>
            </View>

            {/* Info Button */}
            <Pressable style={styles.infoButton} onPress={handleNavigateToPage}>
              <LinearGradient
                colors={[colors.lightMustard, colors.brand.goldRich]}
                style={styles.infoButtonGradient}
              >
                <Ionicons name="information" size={14} color={colors.background.primary} />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Steps Row */}
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <View style={styles.stepItem}>
                  {/* Icon Circle with gradient border */}
                  <View style={styles.iconOuterRing}>
                    <LinearGradient
                      colors={[colors.lightMustard, colors.brand.goldRich]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradientBorder}
                    >
                      <View style={styles.iconInnerCircle}>
                        <Ionicons
                          name={step.icon}
                          size={22}
                          color={step.color}
                        />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Step Label */}
                  <Text style={styles.stepLabel}>{step.label}</Text>
                </View>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <View style={styles.arrowContainer}>
                    <LinearGradient
                      colors={[colors.lightMustard, colors.brand.goldRich]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.arrowGradient}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={colors.background.primary}
                      />
                    </LinearGradient>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* CTA Button */}
          <Pressable style={styles.ctaButton} onPress={handleNavigateToPage}>
            <LinearGradient
              colors={[colors.lightMustard, colors.brand.goldRich, colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>See how it works</Text>
              <View style={styles.ctaIconWrapper}>
                <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Decorative Elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 0,
    marginVertical: 12,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: -4,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  glassBackground: {
    padding: 20,
    paddingBottom: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.deepNavy,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  infoButton: {
    marginLeft: 12,
  },
  infoButtonGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconOuterRing: {
    marginBottom: 8,
  },
  iconGradientBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerCircle: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
    letterSpacing: 0.3,
  },
  arrowContainer: {
    marginHorizontal: -4,
    marginBottom: 20,
  },
  arrowGradient: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    letterSpacing: 0.4,
    marginRight: 8,
  },
  ctaIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Decorative elements for glass effect
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 205, 87, 0.06)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 205, 87, 0.06)',
  },
});

export default React.memo(HowNuqtaWorksCard);
