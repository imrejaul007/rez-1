import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HomeDeliveryProductCard } from './HomeDeliveryProductCard';
import { ProductSectionProps } from '@/types/home-delivery.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function _ProductSectionInner({
  section,
  onProductPress,
  onViewAll,
}: ProductSectionProps) {
  const displayProducts = section.maxProducts 
    ? section.products.slice(0, section.maxProducts)
    : section.products;

  if (section.products.length === 0) {
    return null;
  }

  // Create pairs of products for 2-column grid
  const productPairs = [];
  for (let i = 0; i < displayProducts.length; i += 2) {
    productPairs.push(displayProducts.slice(i, i + 2));
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`${section.title} section`}
    >
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleContainer}>
          <ThemedText
            style={styles.sectionTitle}
            accessibilityRole="header"
          >
            {section.title}
          </ThemedText>
          {section.subtitle && (
            <ThemedText style={styles.sectionSubtitle}>
              {section.subtitle}
            </ThemedText>
          )}
        </View>

        {section.showViewAll && (
          <Pressable
            style={styles.viewAllButton}
            onPress={onViewAll}
           
            accessibilityLabel={`View all ${section.title} products`}
            accessibilityRole="button"
            accessibilityHint={`Double tap to see all products in ${section.title}`}
          >
            <ThemedText style={styles.viewAllText}>View all</ThemedText>
          </Pressable>
        )}
      </View>

      {/* Products Grid - 2 Columns */}
      <View style={styles.productsGrid}>
        {productPairs.map((pair, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {pair.map((product) => (
              <View key={product.id} style={styles.cardWrapper}>
                <HomeDeliveryProductCard
                  product={product}
                  onPress={() => onProductPress(product)}
                  showCashback={true}
                  showDeliveryTime={true}
                />
              </View>
            ))}
            {/* Fill empty space if odd number of products */}
            {pair.length === 1 && <View style={styles.cardWrapper} />}
          </View>
        ))}
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  viewAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
  },
  productsGrid: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: (width - 44) / 2, // (total width - padding*2 - gap) / 2
  },
});

export const ProductSection = React.memo(_ProductSectionInner);
