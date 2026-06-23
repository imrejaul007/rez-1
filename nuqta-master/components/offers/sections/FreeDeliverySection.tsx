/**
 * FreeDeliverySection Component
 *
 * Free delivery offers
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { FreeDeliveryOffer } from '@/types/offers.types';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface FreeDeliverySectionProps {
  offers: FreeDeliveryOffer[];
  onViewAll?: () => void;
}

export const FreeDeliverySection: React.FC<FreeDeliverySectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();
  const { theme, isDark } = useOffersTheme();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: FreeDeliveryOffer) => {
    router.push(`/offers/${offer.id}`);
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
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    freeDeliveryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.lightMustard,
      paddingVertical: 6,
      gap: 6,
    },
    bannerText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.nileBlue,
      letterSpacing: 0.5,
    },
    imageContainer: {
      height: 100,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
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
      backgroundColor: colors.lightMustard,
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
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.xs,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warningScale[700],
      marginLeft: 2,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
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
        title="Free Delivery"
        subtitle="No delivery charges"
        icon="bicycle"
        iconColor={colors.lightMustard}
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
            <View style={styles.freeDeliveryBanner}>
              <Ionicons name="bicycle" size={14} color={colors.background.primary} />
              <Text style={styles.bannerText}>FREE DELIVERY</Text>
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
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color={colors.warningScale[700]} />
                  <Text style={styles.ratingText}>{(offer.rating ?? 0).toFixed(1)}</Text>
                </View>
                {offer.cashbackPercentage > 0 && (
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="wallet-outline" size={10} color={Colors.primary[600]} />
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

export default React.memo(FreeDeliverySection);
