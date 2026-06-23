/**
 * OfferCardCashback Component (180px width)
 *
 * Card emphasizing cashback percentage
 * ReZ brand styling
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface OfferCardCashbackProps {
  id: string;
  name: string;
  logo: string;
  cashbackPercentage: number;
  category: string;
  isSuper?: boolean;
  maxCashback?: number;
  onPress: () => void;
}

export const OfferCardCashback: React.FC<OfferCardCashbackProps> = ({
  id,
  name,
  logo,
  cashbackPercentage,
  category,
  isSuper,
  maxCashback,
  onPress,
}) => {
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Determine colors based on super status
  const accentColor = isSuper ? colors.warningScale[400] : Colors.primary[600];
  const accentBg = isSuper
    ? (isDark ? 'rgba(245, 158, 11, 0.15)' : colors.tint.amber)
    : (isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0');

  const styles = StyleSheet.create({
    container: {
      width: 180,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isSuper
        ? (isDark ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D')
        : (isDark ? theme.colors.border.light : colors.neutral[200]),
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    header: {
      height: 90,
      backgroundColor: accentBg,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    superBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warningScale[400],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    superText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.background.primary,
      marginLeft: 3,
      letterSpacing: 0.5,
    },
    logoContainer: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.background.primary,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.background.primary,
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 44,
      height: 44,
    },
    logoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: accentColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: colors.background.primary,
      fontSize: 22,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.md,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    category: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    cashbackContainer: {
      alignItems: 'center',
      backgroundColor: accentBg,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    cashbackRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    cashbackValue: {
      fontSize: 28,
      fontWeight: '800',
      color: accentColor,
      letterSpacing: -1,
    },
    cashbackPercent: {
      fontSize: 16,
      fontWeight: '700',
      color: accentColor,
    },
    cashbackLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    maxCashback: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      marginTop: 4,
    },
    earnBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    earnIcon: {
      marginRight: 4,
    },
    earnText: {
      fontSize: 10,
      fontWeight: '600',
      color: accentColor,
    },
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
     
    >
      <View style={styles.header}>
        {isSuper && (
          <View style={styles.superBadge}>
            <Ionicons name="flash" size={10} color={colors.background.primary} />
            <Text style={styles.superText}>SUPER</Text>
          </View>
        )}
        <View style={styles.logoContainer}>
          {logo ? (
            <CachedImage
              source={logo}
              style={styles.logo}
              contentFit="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {category}
        </Text>

        <View style={styles.cashbackContainer}>
          <View style={styles.cashbackRow}>
            <Text style={styles.cashbackValue}>{cashbackPercentage}</Text>
            <Text style={styles.cashbackPercent}>%</Text>
          </View>
          <Text style={styles.cashbackLabel}>Cashback</Text>
          {maxCashback && (
            <Text style={styles.maxCashback}>
              Up to {currencySymbol}{maxCashback}
            </Text>
          )}
        </View>

        <View style={styles.earnBadge}>
          <Ionicons
            name="wallet-outline"
            size={12}
            color={accentColor}
            style={styles.earnIcon}
          />
          <Text style={styles.earnText}>Earn on every purchase</Text>
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(OfferCardCashback);
