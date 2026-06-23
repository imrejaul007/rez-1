import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useRelatedProducts, RelatedProduct } from '@/hooks/useRelatedProducts';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

/**
 * FrequentlyBoughtTogether Component
 *
 * Shows products that are frequently purchased together
 * Allows users to add multiple items to cart at once
 */
interface FrequentlyBoughtTogetherProps {
  productId: string;
  currentProduct: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
  onAddToCart?: (productIds: string[]) => void;
  limit?: number;
}

export const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({
  productId,
  currentProduct,
  onAddToCart,
  limit = 3,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // Track selected products (current product is always selected)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set([productId]));

  // Fetch frequently bought together products
  const { products, isLoading, error, hasProducts } = useRelatedProducts({
    productId,
    type: 'frequently-bought',
    limit,
    autoLoad: true,
  });

  /**
   * Toggle product selection
   */
  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (id === productId) {
        // Current product always selected
        return newSet;
      }
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * Calculate total price
   */
  const getTotalPrice = (): number => {
    let total = selectedProducts.has(productId) ? currentProduct.price : 0;

    products.forEach(product => {
      if (selectedProducts.has(product.id)) {
        total += product.price;
      }
    });

    return total;
  };

  /**
   * Handle add all to cart
   */
  const handleAddToCart = () => {
    const selectedIds = Array.from(selectedProducts);

    if (onAddToCart) {
      onAddToCart(selectedIds);
    }
  };

  // Don't render if no products
  if (!isLoading && !hasProducts) {
    return null;
  }

  // Don't render if error
  if (error) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>Frequently Bought Together</ThemedText>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.purpleLight} />
        </View>
      </View>
    );
  }

  const allProducts = [
    {
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      image: currentProduct.image,
      rating: 0,
      reviewCount: 0,
    },
    ...products,
  ];

  const selectedCount = selectedProducts.size;
  const totalSavings = allProducts
    .filter(p => selectedProducts.has(p.id) && p.originalPrice)
    .reduce((sum, p) => sum + (p.originalPrice! - p.price), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Frequently Bought Together</ThemedText>
        {totalSavings > 0 && (
          <View style={styles.savingsBadge}>
            <ThemedText style={styles.savingsText}>
              Save {currencySymbol}{totalSavings.toLocaleString()}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Products List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
      >
        {allProducts.map((product, index) => (
          <React.Fragment key={product.id}>
            {/* Plus Icon */}
            {index > 0 && (
              <View style={styles.plusIcon}>
                <Ionicons name="add" size={20} color={colors.neutral[400]} />
              </View>
            )}

            {/* Product Item */}
            <Pressable
              style={[
                styles.productItem,
                selectedProducts.has(product.id) && styles.productItemSelected,
                product.id === productId && styles.productItemCurrent,
              ]}
              onPress={() => toggleProduct(product.id)}
             
              disabled={product.id === productId}
            >
              {/* Checkbox */}
              <View style={styles.checkboxContainer}>
                <View
                  style={[
                    styles.checkbox,
                    selectedProducts.has(product.id) && styles.checkboxSelected,
                  ]}
                >
                  {selectedProducts.has(product.id) && (
                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
                  )}
                </View>
              </View>

              {/* Image */}
              <CachedImage source={product.image} style={styles.productImage} contentFit="cover" />

              {/* Info */}
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={2}>
                  {product.name}
                </ThemedText>
                <ThemedText style={styles.productPrice}>{currencySymbol}{product.price.toLocaleString()}</ThemedText>
              </View>

              {/* Current Product Badge */}
              {product.id === productId && (
                <View style={styles.currentBadge}>
                  <ThemedText style={styles.currentBadgeText}>This Item</ThemedText>
                </View>
              )}
            </Pressable>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <ThemedText style={styles.totalLabel}>
            Total ({selectedCount} item{selectedCount > 1 ? 's' : ''}):
          </ThemedText>
          <ThemedText style={styles.totalPrice}>{currencySymbol}{getTotalPrice().toLocaleString()}</ThemedText>
        </View>

        <Pressable
          style={[
            styles.addToCartButton,
            selectedCount === 0 && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={selectedCount === 0}
         
        >
          <Ionicons name="cart" size={20} color={colors.background.primary} />
          <ThemedText style={styles.addToCartText}>
            Add {selectedCount > 1 ? 'All' : ''} to Cart
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  savingsBadge: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Products
  productsContainer: {
    paddingVertical: 8,
  },
  plusIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  productItem: {
    width: 140,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  productItemSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  productItemCurrent: {
    borderColor: colors.neutral[200],
  },

  // Checkbox
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.brand.purpleLight,
    borderColor: colors.brand.purpleLight,
  },

  // Image
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    marginBottom: 8,
  },

  // Info
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[700],
    lineHeight: 16,
    height: 32,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // Current Badge
  currentBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    gap: 12,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  addToCartText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(FrequentlyBoughtTogether);
