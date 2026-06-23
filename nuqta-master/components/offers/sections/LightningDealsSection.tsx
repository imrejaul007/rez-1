/**
 * LightningDealsSection Component
 *
 * Flash deals with timers and progress bars
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardLightning } from '../cards';
import { LightningDeal } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface LightningDealsSectionProps {
  deals: LightningDeal[];
  onViewAll?: () => void;
}

export const LightningDealsSection: React.FC<LightningDealsSectionProps> = ({
  deals,
  onViewAll,
}) => {
  const router = useRouter();

  if (deals.length === 0) return null;

  const handleOfferPress = (deal: LightningDeal) => {
    router.push(`/flash-sales/${deal.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Lightning Deals"
        subtitle="Limited time offers"
        icon="flash"
        iconColor={colors.lightMustard}
        showViewAll={deals.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {deals.map((deal) => (
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

export default React.memo(LightningDealsSection);
