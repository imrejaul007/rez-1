// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/ui/Button';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  brand: string;
  specs?: Record<string, string>;
  features?: string[];
  discount?: number;
  cashback?: number;
}

interface ProductComparisonProps {
  products: Product[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}

/**
 * ProductComparison Component
 *
 * Side-by-side comparison of multiple products with:
 * - Product images and basic info
 * - Price comparison with discounts
 * - Specifications comparison
 * - Features comparison with checkmarks
 * - Quick actions (Add to Cart, View Details)
 */
function ProductComparison({
  products,
  onRemoveProduct,
  onAddToCart,
  onViewProduct,
}: ProductComparisonProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (products.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="scale-outline" size={64} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>No products to compare</Text>
        <Text style={styles.emptyMessage}>
          Add products to compare their features side-by-side
        </Text>
      </View>
    );
  }

  // Get all unique spec keys
  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs || {})))
  );

  // Get all unique features
  const allFeatures = Array.from(
    new Set(products.flatMap((p) => p.features || []))
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
      <View style={styles.container}>
        {/* Product Cards Header */}
        <View style={styles.headerRow}>
          <View style={styles.labelColumn}>
            <Text style={styles.headerLabel}>Compare Products</Text>
            <Text style={styles.headerSubtext}>{products.length} items</Text>
          </View>
          {products.map((product) => (
            <View key={product.id} style={styles.productColumn}>
              <Pressable
                style={styles.removeButton}
                onPress={() => onRemoveProduct(product.id)}
                accessibilityLabel={`Remove ${product.name} from comparison`}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={colors.errorScale[500]} />
              </Pressable>

              <CachedImage
                source={{ uri: product.image }}
                style={styles.productImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />

              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.warningScale[500]} />
                <Text style={styles.rating}>{product.rating}</Text>
                <Text style={styles.reviews}>({product.reviews})</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>{currencySymbol}{product.price.toLocaleString()}</Text>
                {product.originalPrice && (
                  <Text style={styles.originalPrice}>
                    {currencySymbol}{product.originalPrice.toLocaleString()}
                  </Text>
                )}
              </View>

              {product.discount && product.discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Price Comparison */}
        <ComparisonRow label="Price" backgroundColor={colors.background.secondary}>
          {products.map((product) => (
            <View key={product.id} style={styles.valueCell}>
              <Text style={styles.priceValue}>{currencySymbol}{product.price.toLocaleString()}</Text>
              {product.originalPrice && (
                <Text style={styles.savings}>
                  Save {currencySymbol}{(product.originalPrice - product.price).toLocaleString()}
                </Text>
              )}
            </View>
          ))}
        </ComparisonRow>

        {/* Cashback Row */}
        {products.some(p => p.cashback) && (
          <ComparisonRow label="Cashback">
            {products.map((product) => (
              <View key={product.id} style={styles.valueCell}>
                {product.cashback ? (
                  <View style={styles.cashbackBadge}>
                    <Ionicons name="cash-outline" size={14} color={colors.successScale[700]} />
                    <Text style={styles.cashbackText}>{currencySymbol}{product.cashback}</Text>
                  </View>
                ) : (
                  <Text style={styles.valueMissing}>-</Text>
                )}
              </View>
            ))}
          </ComparisonRow>
        )}

        {/* Brand Comparison */}
        <ComparisonRow label="Brand" backgroundColor={colors.background.secondary}>
          {products.map((product) => (
            <Text key={product.id} style={styles.value}>
              {product.brand}
            </Text>
          ))}
        </ComparisonRow>

        {/* Rating Comparison */}
        <ComparisonRow label="Customer Rating">
          {products.map((product) => (
            <View key={product.id} style={styles.valueCell}>
              <View style={styles.ratingStars}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < Math.floor(product.rating) ? "star" : "star-outline"}
                    size={12}
                    color={colors.warningScale[500]}
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>{product.rating}/5</Text>
              <Text style={styles.reviewsSmall}>({product.reviews} reviews)</Text>
            </View>
          ))}
        </ComparisonRow>

        {/* Specifications Comparison */}
        {allSpecKeys.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary[700]} />
              <Text style={styles.sectionTitle}>Specifications</Text>
            </View>
            {allSpecKeys.map((key, index) => (
              <ComparisonRow
                key={key}
                label={key}
                backgroundColor={index % 2 === 0 ? colors.background.secondary : undefined}
              >
                {products.map((product) => (
                  <Text
                    key={product.id}
                    style={[
                      styles.value,
                      !product.specs?.[key] && styles.valueMissing,
                    ]}
                  >
                    {product.specs?.[key] || '-'}
                  </Text>
                ))}
              </ComparisonRow>
            ))}
          </>
        )}

        {/* Features Comparison */}
        {allFeatures.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary[700]} />
              <Text style={styles.sectionTitle}>Features</Text>
            </View>
            {allFeatures.map((feature, index) => (
              <ComparisonRow
                key={feature}
                label={feature}
                backgroundColor={index % 2 === 0 ? colors.background.secondary : undefined}
              >
                {products.map((product) => {
                  const hasFeature = product.features?.includes(feature);
                  return (
                    <View key={product.id} style={styles.featureCell}>
                      <Ionicons
                        name={hasFeature ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={hasFeature ? colors.successScale[500] : colors.neutral[300]}
                      />
                    </View>
                  );
                })}
              </ComparisonRow>
            ))}
          </>
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <View style={styles.labelColumn}>
            <Text style={styles.actionsLabel}>Actions</Text>
          </View>
          {products.map((product) => (
            <View key={product.id} style={styles.productColumn}>
              <Button
                title="Add to Cart"
                onPress={() => onAddToCart(product.id)}
                variant="primary"
                size="small"
                fullWidth
                icon={<Ionicons name="cart-outline" size={16} color={colors.text.inverse} />}
              />
              <Button
                title="View Details"
                onPress={() => onViewProduct(product.id)}
                variant="outline"
                size="small"
                fullWidth
                style={{ marginTop: spacing.sm }}
                icon={<Ionicons name="eye-outline" size={16} color={colors.primary[500]} />}
              />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// Helper Component for Comparison Rows
function ComparisonRow({
  label,
  children,
  backgroundColor,
}: {
  label: string;
  children: React.ReactNode;
  backgroundColor?: string;
}) {
  const childArray = React.Children.toArray(children);

  return (
    <View style={[styles.row, backgroundColor && { backgroundColor }]}>
      <View style={styles.labelColumn}>
        <Text style={styles.label}>{label}</Text>
      </View>
      {childArray.map((child, index) => (
        <View key={index} style={styles.productColumn}>
          {child}
        </View>
      ))}
    </View>
  );
}

const COLUMN_WIDTH = 160;
const LABEL_WIDTH = 140;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border.default,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
  },
  labelColumn: {
    width: LABEL_WIDTH,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  headerLabel: {
    ...typography.h4,
    color: colors.text.primary,
  },
  headerSubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Product Column
  productColumn: {
    width: COLUMN_WIDTH,
    padding: spacing.sm,
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 10,
    padding: spacing.xs,
  },
  productImage: {
    width: 120,
    height: 120,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  productName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.xs,
    height: 40,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  rating: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  reviews: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  priceRow: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '700',
  },
  originalPrice: {
    ...typography.caption,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: colors.errorScale[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.caption,
    color: colors.errorScale[700],
    fontWeight: '700',
  },

  // Comparison Rows
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 50,
    alignItems: 'center',
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  value: {
    ...typography.bodySmall,
    color: colors.text.primary,
    textAlign: 'center',
  },
  valueMissing: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  valueCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Price Value
  priceValue: {
    ...typography.button,
    color: colors.primary[600],
    fontWeight: '700',
  },
  savings: {
    ...typography.caption,
    color: colors.successScale[700],
    marginTop: 2,
  },

  // Cashback
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successScale[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  cashbackText: {
    ...typography.caption,
    color: colors.successScale[700],
    fontWeight: '600',
  },

  // Rating
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing.xs / 2,
  },
  ratingValue: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  reviewsSmall: {
    ...typography.caption,
    color: colors.text.tertiary,
  },

  // Features
  featureCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
  },
  sectionTitle: {
    ...typography.button,
    color: colors.primary[700],
  },

  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  actionsLabel: {
    ...typography.button,
    color: colors.text.primary,
  },

  // Empty State
  emptyState: {
    flex: 1,
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default React.memo(ProductComparison);
