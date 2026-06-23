/**
 * SalesClearanceSection Component
 *
 * Sales & Clearance offers with up to 70% off
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
import { SaleOffer } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface SalesClearanceSectionProps {
  offers: SaleOffer[];
  onViewAll?: () => void;
}

export const SalesClearanceSection: React.FC<SalesClearanceSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: SaleOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  const getTagStyle = (tag: string) => {
    switch (tag) {
      case 'clearance':
        return { bg: colors.errorScale[100], text: colors.error, label: 'CLEARANCE' };
      case 'last_pieces':
        return { bg: colors.tint.amberLight, text: colors.warningScale[700], label: 'LAST PIECES' };
      default:
        return { bg: colors.tint.blueLight, text: colors.brand.blue, label: 'SALE' };
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: Spacing.lg,
    },
    card: {
      width: 200,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : colors.errorScale[200],
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    imageContainer: {
      height: 110,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    tagBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    discountBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    discountText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.background.primary,
    },
    storeLogoContainer: {
      position: 'absolute',
      bottom: -14,
      left: 10,
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background.primary,
      borderWidth: 2,
      borderColor: colors.background.primary,
      overflow: 'hidden',
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogo: {
      width: 26,
      height: 26,
    },
    storeLogoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoText: {
      color: colors.background.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.sm,
      paddingTop: Spacing.md + 4,
    },
    storeName: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 4,
      letterSpacing: -0.2,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    salePrice: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.error,
    },
    originalPrice: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      textDecorationLine: 'line-through',
      marginLeft: 6,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      marginTop: Spacing.xs,
      alignSelf: 'flex-start',
    },
    cashbackText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.primary[600],
      marginLeft: 3,
    },
  });

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Sales & Clearance"
        subtitle="Up to 70% OFF"
        icon="pricetags"
        iconColor={colors.error}
        showViewAll={offers.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((offer) => {
          const tagStyle = getTagStyle(offer.tag);
          return (
            <Pressable
              key={offer.id}
              style={styles.card}
              onPress={() => handleOfferPress(offer)}
             
            >
              <View style={styles.imageContainer}>
                <CachedImage
                  source={{ uri: offer.image }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg }]}>
                  <Text style={[styles.tagText, { color: tagStyle.text }]}>
                    {tagStyle.label}
                  </Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{offer.discountPercentage}%</Text>
                </View>
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
                <View style={styles.priceRow}>
                  <Text style={styles.salePrice}>{currencySymbol}{(offer.salePrice ?? 0).toFixed(0)}</Text>
                  <Text style={styles.originalPrice}>{currencySymbol}{(offer.originalPrice ?? 0).toFixed(0)}</Text>
                </View>
                {offer.cashbackPercentage > 0 && (
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="wallet-outline" size={10} color={Colors.primary[600]} />
                    <Text style={styles.cashbackText}>+{offer.cashbackPercentage}%</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </HorizontalScrollSection>
    </View>
  );
};

export default React.memo(SalesClearanceSection);
