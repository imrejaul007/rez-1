import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { GroupedProductResult } from '@/types/search.types';
import { colors } from '@/constants/theme';

interface ProductGroupHeaderProps {
  product: GroupedProductResult;
}

function ProductGroupHeader({ product }: ProductGroupHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {product.productImage && (
          <CachedImage
            source={product.productImage}
            style={styles.productImage}
            contentFit="cover"
          />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.productName}>{product.productName}</Text>
          <Text style={styles.sellerCount}>
            {product.sellerCount} {product.sellerCount === 1 ? 'seller' : 'sellers'} available
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Compare sellers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.neutral[100],
  },
  textContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  sellerCount: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 4,
  },
});


export default React.memo(ProductGroupHeader);
