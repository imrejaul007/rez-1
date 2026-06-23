/**
 * TrendingNowSection Component
 *
 * Most redeemed offers this week
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardDefault } from '../cards';
import { TrendingOffer } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface TrendingNowSectionProps {
  offers: TrendingOffer[];
  onViewAll?: () => void;
}

export const TrendingNowSection: React.FC<TrendingNowSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();

  if (offers.length === 0) return null;

  const handleOfferPress = (offer: TrendingOffer) => {
    router.push(`/offers/${offer.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Trending Now"
        subtitle="Most redeemed this week"
        icon="trending-up"
        iconColor={colors.error}
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
            rating={offer.store.rating}
            isTrending
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

export default React.memo(TrendingNowSection);
