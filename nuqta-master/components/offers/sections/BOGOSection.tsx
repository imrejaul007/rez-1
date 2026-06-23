/**
 * BOGOSection Component
 *
 * Buy 1 Get 1 offers
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { BOGOOffer } from '@/types/offers.types';
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

interface BOGOSectionProps {
  offers: BOGOOffer[];
  onViewAll?: () => void;
}

export const BOGOSection: React.FC<BOGOSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: BOGOOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  const getBogoLabel = (type: string) => {
    switch (type) {
      case 'buy1get1':
        return 'BUY 1 GET 1';
      case 'buy2get1':
        return 'BUY 2 GET 1';
      case 'buy1get50':
        return 'BUY 1 GET 50%';
      default:
        return 'BOGO';
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 170,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(26, 58, 82, 0.3)' : PALETTE.lavenderMist,
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    bogoBanner: {
      backgroundColor: PALETTE.nileBlue,
      paddingVertical: 6,
      alignItems: 'center',
    },
    bogoText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.background.primary,
      letterSpacing: 0.5,
    },
    imageContainer: {
      height: 90,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    storeLogoContainer: {
      position: 'absolute',
      bottom: -12,
      left: 10,
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: colors.background.primary,
      borderWidth: 2,
      borderColor: colors.background.primary,
      overflow: 'hidden',
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogo: {
      width: 22,
      height: 22,
    },
    storeLogoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: PALETTE.nileBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoText: {
      color: colors.background.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.sm,
      paddingTop: Spacing.md,
    },
    storeName: {
      fontSize: 9,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.xs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    priceText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text.primary,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 205, 87, 0.1)' : '#FFF9E6',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    cashbackText: {
      fontSize: 9,
      fontWeight: '700',
      color: PALETTE.nileBlue,
      marginLeft: 2,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Buy 1 Get 1"
        subtitle="Double the joy"
        icon="gift"
        iconColor={PALETTE.lightPeach}
        showViewAll={offers.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((offer) => (
          <Pressable
            key={offer.id}
            style={styles.card}
            onPress={() => handleOfferPress(offer)}
           
          >
            <View style={styles.bogoBanner}>
              <Text style={styles.bogoText}>{getBogoLabel(offer.bogoType)}</Text>
            </View>

            <View style={styles.imageContainer}>
              <CachedImage
                source={{ uri: offer.image }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.storeLogoContainer}>
                {offer.store.logo ? (
                  <CachedImage
                    source={{ uri: offer.store.logo }}
                    style={styles.storeLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.storeLogoPlaceholder}>
                    <Text style={styles.storeLogoText}>
                      {offer.store.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.storeName} numberOfLines={1}>
                {offer.store.name}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {offer.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {offer.subtitle}
              </Text>
              <View style={styles.footer}>
                <Text style={styles.priceText}>{currencySymbol}{(offer.originalPrice ?? 0).toFixed(0)}</Text>
                {offer.cashbackPercentage > 0 && (
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="wallet-outline" size={9} color={PALETTE.lightMustard} />
                    <Text style={styles.cashbackText}>+{offer.cashbackPercentage}%</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(BOGOSection);
