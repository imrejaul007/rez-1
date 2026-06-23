/**
 * DoubleCashbackBanner Component
 *
 * Promotional banner for double cashback campaigns
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { CountdownTimer } from '../common/CountdownTimer';
import { DoubleCashbackCampaign } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

// New Color Palette
const PALETTE = {
  nileBlue: colors.nileBlue,
  lightMustard: colors.lightMustard,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,
};

interface DoubleCashbackBannerProps {
  campaign: DoubleCashbackCampaign;
  onPress?: () => void;
}

export const DoubleCashbackBanner: React.FC<DoubleCashbackBannerProps> = ({
  campaign,
  onPress,
}) => {
  const { theme, isDark } = useOffersTheme();

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg + 4,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FCD34D',
      ...(isDark ? {} : Shadows.medium),
    },
    gradient: {
      padding: Spacing.base,
      paddingVertical: Spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FEFCE8',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE047',
    },
    titleContainer: {
      flex: 1,
    },
    multiplierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lightMustard,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 6,
    },
    multiplierText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#78350F',
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text.primary,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.md,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.errorScale[100],
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 6,
    },
    endsIn: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.error,
      marginRight: Spacing.xs,
    },
    storesText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    storesHighlight: {
      color: isDark ? colors.warningScale[400] : colors.warningScale[700],
      fontWeight: '700',
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lightMustard,
      paddingHorizontal: Spacing.md + 4,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      ...Shadows.subtle,
    },
    ctaText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#78350F',
      marginRight: 6,
    },
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
     
    >
      <LinearGradient
        colors={
          isDark
            ? ['rgba(245, 158, 11, 0.15)', 'rgba(251, 191, 36, 0.1)', 'rgba(239, 68, 68, 0.1)']
            : [colors.tint.amberLight, colors.errorScale[100], colors.tint.amberLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="sparkles"
              size={24}
              color={isDark ? colors.warningScale[400] : colors.lightMustard}
            />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.multiplierBadge}>
              <Ionicons
                name="flash"
                size={12}
                color={isDark ? colors.background.primary : '#78350F'}
              />
              <Text style={styles.multiplierText}>
                {campaign.multiplier}X CASHBACK
              </Text>
            </View>
            <Text style={styles.title}>{campaign.title}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{campaign.subtitle}</Text>

        <View style={styles.footer}>
          <View>
            <View style={styles.timerContainer}>
              <Text style={styles.endsIn}>Ends in:</Text>
              <CountdownTimer
                endTime={campaign.endTime}
                size="small"
                format="compact"
              />
            </View>
            <Text style={styles.storesText}>
              Valid at{' '}
              <Text style={styles.storesHighlight}>
                {campaign.eligibleStores.length}+ stores
              </Text>
            </Text>
          </View>

          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>Shop Now</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={isDark ? colors.text.primary : colors.background.primary}
            />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

export default React.memo(DoubleCashbackBanner);
