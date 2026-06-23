/**
 * OfferCardLightning Component (200px width)
 *
 * Flash deal card with timer and progress bar
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
import { platformAlertSimple } from '@/utils/platformAlert';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { CountdownTimer } from '../common/CountdownTimer';
import { ProgressBar } from '../common/ProgressBar';
import { Typography, Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface OfferCardLightningProps {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  storeName: string;
  storeLogo?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  cashbackPercentage: number;
  totalQuantity: number;
  claimedQuantity: number;
  endTime: string;
  promoCode?: string;
  onPress: () => void;
}

export const OfferCardLightning: React.FC<OfferCardLightningProps> = ({
  id,
  title,
  subtitle,
  image,
  storeName,
  storeLogo,
  originalPrice,
  discountedPrice,
  discountPercentage,
  cashbackPercentage,
  totalQuantity,
  claimedQuantity,
  endTime,
  promoCode,
  onPress,
}) => {
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const claimedPercentage = Math.round((claimedQuantity / totalQuantity) * 100);
  const remaining = totalQuantity - claimedQuantity;

  // Handle copy promo code
  const handleCopyCode = async () => {
    if (!promoCode) return;
    try {
      await Clipboard.setStringAsync(promoCode);
      platformAlertSimple('Copied!', `Promo code "${promoCode}" copied to clipboard`);
    } catch (error) {
      // silently handle
    }
  };

  // Determine urgency color based on remaining stock
  const getUrgencyColor = () => {
    if (claimedPercentage >= 80) return colors.error;
    if (claimedPercentage >= 60) return colors.warningScale[400];
    return Colors.primary[600];
  };

  const styles = StyleSheet.create({
    container: {
      width: 200,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FCD34D',
      ...(isDark ? {} : Shadows.medium),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    flashBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    flashIcon: {
      marginRight: 4,
    },
    flashText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.warningScale[700],
      letterSpacing: 0.5,
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.errorScale[100],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    timerIcon: {
      marginRight: 3,
    },
    timerText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.error,
    },
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    storeLogoContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: '#F7FAFC',
      borderWidth: 1,
      borderColor: colors.neutral[200],
      overflow: 'hidden',
      marginRight: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogo: {
      width: 32,
      height: 32,
    },
    storeLogoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoText: {
      color: colors.background.primary,
      fontSize: 16,
      fontWeight: '700',
    },
    storeInfo: {
      flex: 1,
    },
    storeName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 1,
    },
    offerTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    priceSection: {
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    currency: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    discountedPrice: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.text.primary,
    },
    originalPrice: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      textDecorationLine: 'line-through',
      marginLeft: 8,
    },
    discountBadge: {
      backgroundColor: colors.errorScale[100],
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginLeft: 'auto',
    },
    discountText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.error,
    },
    progressSection: {
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    stockText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    stockHighlight: {
      color: getUrgencyColor(),
      fontWeight: '700',
    },
    promoCodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      padding: Spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0, 192, 106, 0.3)' : '#A7F3D0',
      borderStyle: 'dashed',
    },
    promoIcon: {
      marginRight: 6,
    },
    promoCode: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.primary[600],
      letterSpacing: 0.5,
      flex: 1,
    },
    copyButton: {
      padding: 4,
    },
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
     
    >
      {/* Header with flash badge and timer */}
      <View style={styles.header}>
        <View style={styles.flashBadge}>
          <Ionicons name="flash" size={12} color={colors.warningScale[700]} style={styles.flashIcon} />
          <Text style={styles.flashText}>FLASH</Text>
        </View>
        <View style={styles.timerBadge}>
          <Ionicons name="time" size={12} color={colors.error} style={styles.timerIcon} />
          <CountdownTimer endTime={endTime} size="small" showIcon={false} />
        </View>
      </View>

      {/* Store info */}
      <View style={styles.storeRow}>
        <View style={styles.storeLogoContainer}>
          {storeLogo ? (
            <CachedImage
              source={storeLogo}
              style={styles.storeLogo}
              contentFit="contain"
            />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Text style={styles.storeLogoText}>
                {storeName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName} numberOfLines={1}>
            {storeName}
          </Text>
          <Text style={styles.offerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {/* Price section */}
      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.currency}>{currencySymbol}</Text>
          <Text style={styles.discountedPrice}>{discountedPrice.toFixed(0)}</Text>
          <Text style={styles.originalPrice}>{currencySymbol}{originalPrice.toFixed(0)}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}%</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.stockText}>
            <Text style={styles.stockHighlight}>{remaining} left</Text> of {totalQuantity}
          </Text>
        </View>
        <ProgressBar
          progress={claimedPercentage}
          height={8}
          fillColor={getUrgencyColor()}
          backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : '#F0F4F8'}
        />
      </View>

      {/* Promo code */}
      {promoCode && (
        <View style={styles.promoCodeContainer}>
          <Ionicons
            name="ticket-outline"
            size={14}
            color={Colors.primary[600]}
            style={styles.promoIcon}
          />
          <Text style={styles.promoCode}>{promoCode}</Text>
          <Pressable style={styles.copyButton} onPress={handleCopyCode}>
            <Ionicons
              name="copy-outline"
              size={14}
              color={theme.colors.text.tertiary}
            />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

export default React.memo(OfferCardLightning);
