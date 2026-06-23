/**
 * BirthdayBanner Component
 *
 * Birthday Week Active - Claim free gifts & bonus coins
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface BirthdayBannerProps {
  isActive: boolean;
  daysRemaining?: number;
  onPress?: () => void;
}

export const BirthdayBanner: React.FC<BirthdayBannerProps> = ({
  isActive,
  daysRemaining = 7,
  onPress,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (!isActive) return null;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/offers/zones/birthday');
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg + 4,
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    gradient: {
      padding: Spacing.lg,
    },
    confettiTop: {
      position: 'absolute',
      top: 10,
      left: 20,
    },
    confettiBottom: {
      position: 'absolute',
      bottom: 10,
      right: 20,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    textContainer: {
      flex: 1,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.background.primary,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.background.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.9)',
    },
    ctaButton: {
      backgroundColor: colors.background.primary,
      paddingHorizontal: Spacing.md + 4,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      ...Shadows.subtle,
    },
    ctaText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.brand.pink,
    },
    daysRemaining: {
      marginTop: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    daysText: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
      marginLeft: 4,
    },
  });

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
     
    >
      <LinearGradient
        colors={[colors.brand.pink, '#F472B6', '#F9A8D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons
          name="sparkles"
          size={20}
          color="rgba(255,255,255,0.4)"
          style={styles.confettiTop}
        />
        <Ionicons
          name="sparkles"
          size={16}
          color="rgba(255,255,255,0.3)"
          style={styles.confettiBottom}
        />

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="gift" size={32} color={colors.background.primary} />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.badge}>
              <Ionicons name="balloon" size={12} color={colors.background.primary} />
              <Text style={styles.badgeText}>BIRTHDAY MONTH</Text>
            </View>
            <Text style={styles.title}>It's Your Special Month!</Text>
            <Text style={styles.subtitle}>
              Claim free gifts & bonus coins
            </Text>
            <View style={styles.daysRemaining}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.daysText}>
                {daysRemaining} days remaining
              </Text>
            </View>
          </View>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>Claim</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

export default React.memo(BirthdayBanner);
