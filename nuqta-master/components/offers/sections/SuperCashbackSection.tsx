/**
 * SuperCashbackSection Component
 *
 * Stores with high cashback offers
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SectionHeader, HorizontalScrollSection } from '../common';
import { OfferCardCashback } from '../cards';
import { CashbackStore } from '@/types/offers.types';
import { Spacing } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface SuperCashbackSectionProps {
  stores: CashbackStore[];
  onViewAll?: () => void;
}

export const SuperCashbackSection: React.FC<SuperCashbackSectionProps> = ({
  stores,
  onViewAll,
}) => {
  const router = useRouter();

  if (stores.length === 0) return null;

  const handleStorePress = (store: CashbackStore) => {
    // Navigate to store page or filter by store
    router.push(`/MainStorePage?storeId=${store.id}`);
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Super Cashback"
        subtitle="Earn big on these stores"
        icon="cash"
        iconColor={colors.lightMustard}
        showViewAll={stores.length > 3}
        onViewAll={onViewAll}
      />
      <HorizontalScrollSection>
        {stores.map((store) => (
          <OfferCardCashback
            key={store.id}
            id={store.id}
            name={store.name}
            logo={store.logo}
            cashbackPercentage={store.cashbackPercentage}
            category={store.category}
            isSuper={store.isSuper}
            maxCashback={store.maxCashback}
            onPress={() => handleStorePress(store)}
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

export default React.memo(SuperCashbackSection);
