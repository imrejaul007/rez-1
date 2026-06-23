/**
 * ZeroEMICard Component
 * Promotional card displaying 0% EMI payment option
 * Styled with Nuqta brand colors (nile blue + mustard accents)
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Nuqta Brand Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.goldRich,
  primaryLight: colors.lightMustard,
  nileBlue: colors.nileBlue,
  nileBlueLight: colors.brand.nileBlueLight,
  gold: colors.brand.goldWarm,
  goldDark: '#F5A623',
  goldLight: '#FFD87A',
  orange: colors.lightMustard,
  orangeDark: colors.brand.goldRich,
  amber: colors.warningScale[400],
  amberDark: colors.brand.amberDeep,
  white: colors.background.primary,
  textDark: colors.nileBlue,
  textMuted: colors.neutral[500],
};

// Decorative Star Component
const Star: React.FC<{ size: number; color: string; opacity?: number; style?: any }> = ({
  size,
  color,
  opacity = 1,
  style,
}) => (
  <Text
    style={[
      {
        fontSize: size,
        color,
        opacity,
        position: 'absolute',
      },
      style,
    ]}
  >
    ✦
  </Text>
);

interface ZeroEMICardProps {
  onPress?: () => void;
}

const ZeroEMICard: React.FC<ZeroEMICardProps> = memo(({ onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default navigation - can be updated to actual EMI info page
      router.push('/offers' as any);
    }
  };

  return (
    <View style={styles.cardWrapper}>
      {/* Outer glow effect */}
      <View style={styles.glowEffect} />

      {/* Main Card */}
      <Pressable
       
        onPress={handlePress}
        style={styles.cardContainer}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.nileBlue, COLORS.nileBlueLight]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientBackground}
        >
          {/* Decorative elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          {/* Decorative stars */}
          <Star size={16} color={COLORS.goldLight} opacity={0.6} style={styles.star1} />
          <Star size={12} color={COLORS.white} opacity={0.4} style={styles.star2} />
          <Star size={10} color={COLORS.goldLight} opacity={0.5} style={styles.star3} />

          {/* Glass overlay */}
          <View style={styles.glassOverlay}>
            {/* Content */}
            <View style={styles.contentContainer}>
              {/* Left side - 0% Display */}
              <View style={styles.percentageContainer}>
                <View style={styles.percentageRow}>
                  <Text style={styles.zeroText}>0</Text>
                  <Text style={styles.percentText}>%</Text>
                </View>
                {/* Glow under the number */}
                <View style={styles.numberGlow} />
              </View>

              {/* Right side - Text content */}
              <View style={styles.textContainer}>
                <Text style={styles.subtitleText}>Split your payments easily with</Text>
                <View style={styles.titleRow}>
                  <Text style={styles.starIcon}>✦</Text>
                  <Text style={styles.titleText}>No Cost EMI</Text>
                  <Text style={styles.starIcon}>✦</Text>
                </View>
              </View>
            </View>

            {/* CTA Button */}
            <Pressable
              style={styles.ctaButton}
             
              onPress={handlePress}
            >
              <LinearGradient
                colors={[COLORS.amber, COLORS.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Know more</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.3)']}
            style={[styles.bottomOverlay, { pointerEvents: 'none' }]}
          />
        </LinearGradient>
      </Pressable>
    </View>
  );
});

ZeroEMICard.displayName = 'ZeroEMICard';

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
    backgroundColor: 'rgba(255, 205, 87, 0.2)',
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.lightMustard,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  cardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  gradientBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 180,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  star1: {
    top: 20,
    left: 24,
  },
  star2: {
    top: 12,
    right: 60,
  },
  star3: {
    bottom: 60,
    right: 20,
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'space-between',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  percentageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  zeroText: {
    fontSize: 72,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.gold,
    letterSpacing: -4,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(180, 83, 9, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 8,
      },
      android: {
        textShadowColor: 'rgba(180, 83, 9, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 8,
      },
      web: {
        textShadow: '0 4px 8px rgba(180, 83, 9, 0.5)',
      },
    }),
  },
  percentText: {
    fontSize: 36,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.gold,
    marginTop: 12,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(180, 83, 9, 0.5)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
      },
      android: {
        textShadowColor: 'rgba(180, 83, 9, 0.5)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
      },
      web: {
        textShadow: '0 3px 6px rgba(180, 83, 9, 0.5)',
      },
    }),
  },
  numberGlow: {
    position: 'absolute',
    bottom: -8,
    width: 80,
    height: 16,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
    }),
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starIcon: {
    fontSize: 12,
    color: COLORS.gold,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  ctaButton: {
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});

export default ZeroEMICard;
