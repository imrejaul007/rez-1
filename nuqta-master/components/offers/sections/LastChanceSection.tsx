/**
 * LastChanceSection Component
 *
 * Offers expiring soon (24h)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardLightning } from '../cards';
import { LightningDeal } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface LastChanceSectionProps {
  offers: LightningDeal[];
  onViewAll?: () => void;
}

export const LastChanceSection: React.FC<LastChanceSectionProps> = ({
  offers,
  onViewAll,
}) => {
  const router = useRouter();

  if (offers.length === 0) return null;

  const handleOfferPress = (deal: LightningDeal) => {
    router.push(`/flash-sales/${deal.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Last Chance"
        subtitle="Expiring in 24 hours"
        icon="alarm"
        iconColor={colors.error}
        showViewAll={offers.length > 2}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {offers.map((deal) => (
          <OfferCardLightning
            key={deal.id}
            id={deal.id}
            title={deal.title}
            subtitle={deal.subtitle}
            image={deal.image}
            storeName={deal.store.name}
            storeLogo={deal.store.logo}
            originalPrice={deal.originalPrice}
            discountedPrice={deal.discountedPrice}
            discountPercentage={deal.discountPercentage}
            cashbackPercentage={deal.cashbackPercentage}
            totalQuantity={deal.totalQuantity}
            claimedQuantity={deal.claimedQuantity}
            endTime={deal.endTime}
            promoCode={deal.promoCode}
            onPress={() => handleOfferPress(deal)}
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

export default React.memo(LastChanceSection);
