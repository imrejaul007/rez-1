/**
 * NewTodaySection Component
 *
 * New offers added today
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardCompact } from '../cards';
import { TodaysOffer } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface NewTodaySectionProps {
  offers: TodaysOffer[];
  onViewAll?: () => void;
}

export const NewTodaySection: React.FC<NewTodaySectionProps> = ({
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
        title="New Today"
        subtitle="Just added"
        icon="sparkles"
        iconColor={colors.successScale[400]}
        showViewAll={offers.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((offer) => (
          <OfferCardCompact
            key={offer.id}
            id={offer.id}
            title={offer.title}
            subtitle={offer.subtitle}
            image={offer.image}
            storeName={offer.store.name}
            cashbackPercentage={offer.cashbackPercentage}
            discountPercentage={offer.discountPercentage}
            isNew
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

export default React.memo(NewTodaySection);
