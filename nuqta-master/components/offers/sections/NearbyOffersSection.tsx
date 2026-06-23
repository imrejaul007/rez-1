/**
 * NearbyOffersSection Component
 *
 * Location-based offers
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardDefault } from '../cards';
import { NearbyOffer } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface NearbyOffersSectionProps {
  offers: NearbyOffer[];
  onViewAll?: () => void;
}

export const NearbyOffersSection: React.FC<NearbyOffersSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: NearbyOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Nearby Offers"
        subtitle="Deals close to you"
        icon="location"
        iconColor={colors.infoScale[400]}
        showViewAll={offers.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((offer) => (
          <OfferCardDefault
            key={offer.id}
            id={offer.id}
            title={offer.title}
            subtitle={offer.subtitle}
            image={offer.image}
            storeName={offer.store.name}
            storeLogo={offer.store.logo}
            cashbackPercentage={offer.cashbackPercentage}
            rating={offer.rating}
            distance={offer.distance}
            deliveryTime={offer.deliveryTime}
            deliveryFee={offer.deliveryFee}
            isFreeDelivery={offer.isFreeDelivery}
            onPress={() => handleOfferPress(offer)}
          />
        ))}
      </HorizontalScrollSection>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
});

export default React.memo(NearbyOffersSection);
