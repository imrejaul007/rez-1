/**
 * TodaysOffersSection Component
 *
 * Grid of today's offers
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader } from '../common';
import { OfferCardCompact } from '../cards';
import { TodaysOffer } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface TodaysOffersSectionProps {
  offers: TodaysOffer[];
  onViewAll?: () => void;
}

export const TodaysOffersSection: React.FC<TodaysOffersSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: TodaysOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Today's Offers"
        subtitle="Fresh deals for you"
        icon="today"
        iconColor={colors.successScale[400]}
        showViewAll={offers.length > 4}
        onViewAll={onViewAll}
      />
      <View style={styles.gridContainer}>
        {offers.slice(0, 4).map((offer) => (
          <View key={offer.id} style={styles.gridItem}>
            <OfferCardCompact
              id={offer.id}
              title={offer.title}
              subtitle={offer.subtitle}
              image={offer.image}
              storeName={offer.store.name}
              cashbackPercentage={offer.cashbackPercentage}
              discountPercentage={offer.discountPercentage}
              isNew={offer.isNew}
              isTrending={offer.isTrending}
              onPress={() => handleOfferPress(offer)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
});

export default React.memo(TodaysOffersSection);
