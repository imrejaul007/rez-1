// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Product/Store Comparison Page
 * Allows users to compare products or stores side by side
 * Now integrated with backend API for persistence
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import productComparisonApi from '@/services/productComparisonApi';
import { ComparisonProduct } from '@/services/productComparisonApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGreen: Colors.gold,
  primaryGold: Colors.warning,
  textPrimary: Colors.text.primary,
  textSecondary: Colors.text.tertiary,
  white: Colors.background.primary,
  background: Colors.background.secondary,
  border: Colors.border.default,
};

interface CompareItem {
  id: string;
  name: string;
  image: string;
  price: number;
  cashback: number;
  rating: number;
  features: string[];
  productId: string;
}

// Transform API product to CompareItem format
const transformProductToCompareItem = (product: ComparisonProduct): CompareItem => {
  const productId = product._id || product.id || '';
  const firstImage = product.images?.[0];
  const price = product.pricing?.selling || product.pricing?.original || 0;
  const cashback = product.cashback?.percentage || 0;
  const rating = product.ratings?.average || 0;
  
  // Extract features from description or specifications if available
  const features: string[] = [];
  if (product.description) {
    // Simple feature extraction - split by sentences or bullet points
    const sentences = product.description.split(/[.!?]/).filter(s => s.trim().length > 10);
    features.push(...sentences.slice(0, 3).map(s => s.trim()));
  }
  if (features.length === 0) {
    features.push('High quality product', 'Verified seller', 'Fast delivery');
  }

  return {
    id: productId,
    name: product.name,
    image: firstImage,
    price,
    cashback,
    rating,
    features,
    productId,
  };
};

function ComparePage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isRemovingProduct, setIsRemovingProduct] = useState<string | null>(null);
  const [comparisonsLoaded, setComparisonsLoaded] = useState(false);

  const loadComparisons = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await productComparisonApi.getUserComparisons({ page: 1, limit: 1 });
      
      if (response.success && response.data?.comparisons && response.data.comparisons.length > 0) {
        // Load the most recent comparison
        const comparison = response.data.comparisons[0];
        if (!isMounted()) return;
        setCurrentComparisonId(comparison._id || comparison.id || null);
        
        const items = comparison.products.map(transformProductToCompareItem);
        if (!isMounted()) return;
        setCompareItems(items);
      } else {
        // No comparisons yet - start fresh
        if (!isMounted()) return;
        setCompareItems([]);
        if (!isMounted()) return;
        setCurrentComparisonId(null);
      }
    } catch (error) {
      if (!isMounted()) return;
      setCompareItems([]);
      platformAlertSimple('Error', 'Failed to load comparisons. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setComparisonsLoaded(true);
    }
  }, [isAuthenticated]);

  // Load user's comparisons on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadComparisons();
    } else {
      setIsLoading(false);
      setComparisonsLoaded(true);
    }
  }, [isAuthenticated, loadComparisons]);

  const handleAddProductFromParams = useCallback(async (productId: string) => {
    if (!isAuthenticated) {
      platformAlertSimple('Login Required', 'Please login to compare products');
      router.push('/sign-in' as any);
      return;
    }

    setIsAddingProduct(true);
    try {
      if (currentComparisonId) {
        // Check if comparison is full (by checking current items length)
        if (compareItems.length >= 5) {
          platformAlertSimple('Limit Reached', 'You can compare up to 5 products at once');
          setIsAddingProduct(false);
          return;
        }

        // Add to existing comparison
        const response = await productComparisonApi.addProductToComparison(currentComparisonId, productId);
        if (response.success && response.data?.comparison) {
          const items = response.data.comparison.products.map(transformProductToCompareItem);
          setCompareItems(items);
          platformAlertSimple('Success', 'Product added to comparison');
        } else {
          platformAlertSimple('Error', response.error || 'Failed to add product to comparison');
        }
      } else {
        // Create new comparison (need at least 2 products, so navigate to search for now)
        router.push('/search?mode=compare');
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to add product to comparison');
    } finally {
      if (!isMounted()) return;
      setIsAddingProduct(false);
    }
  }, [isAuthenticated, currentComparisonId, compareItems.length, router]);

  // Check if productId is passed from search (when adding product to compare)
  // Wait for comparisons to load first to avoid race condition
  useEffect(() => {
    if (comparisonsLoaded && params.productId && typeof params.productId === 'string') {
      handleAddProductFromParams(params.productId);
    }
  }, [params.productId, comparisonsLoaded, handleAddProductFromParams]);

  const handleAddItem = () => {
    if (compareItems.length >= 5) {
      platformAlertSimple('Limit Reached', 'You can compare up to 5 products at once');
      return;
    }
    router.push('/search?mode=compare');
  };

  const handleDeleteComparison = useCallback(async () => {
    if (!isAuthenticated || !currentComparisonId) {
      return;
    }

    try {
      const response = await productComparisonApi.deleteComparison(currentComparisonId);
      if (response.success) {
        setCompareItems([]);
        setCurrentComparisonId(null);
        platformAlertSimple('Success', 'Comparison deleted');
      } else {
        platformAlertSimple('Error', response.error || 'Failed to delete comparison');
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to delete comparison');
    }
  }, [isAuthenticated, currentComparisonId]);

  const handleRemoveItem = useCallback(async (id: string) => {
    if (!isAuthenticated || !currentComparisonId) {
      // If not authenticated, just remove from local state
      setCompareItems(compareItems.filter((item) => item.id !== id));
      return;
    }

    // Check if this would leave only 1 product (backend requires minimum 2)
    if (compareItems.length <= 2) {
      platformAlertDestructive(
        'Cannot Remove',
        'A comparison must have at least 2 products. Delete the comparison instead.',
        'Delete Comparison',
        handleDeleteComparison
      );
      return;
    }

    setIsRemovingProduct(id);
    try {
      const response = await productComparisonApi.removeProductFromComparison(currentComparisonId, id);
      if (response.success && response.data?.comparison) {
        const items = response.data.comparison.products.map(transformProductToCompareItem);
        setCompareItems(items);
        
        // If comparison is empty now, clear it
        if (items.length === 0) {
          setCurrentComparisonId(null);
        }
        platformAlertSimple('Success', 'Product removed from comparison');
      } else {
        // Handle backend error properly
        platformAlertSimple('Error', response.error || 'Failed to remove product. Comparison must have at least 2 products.');
        // Don't update local state - keep sync with backend
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to remove product from comparison');
      // Don't update local state on error - keep sync with backend
    } finally {
      if (!isMounted()) return;
      setIsRemovingProduct(null);
    }
  }, [isAuthenticated, currentComparisonId, compareItems.length, handleDeleteComparison]);

  const handleBuy = (item: CompareItem) => {
    router.push(`/product-page?productId=${item.productId}` as any);
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Compare Products</Text>
          <View style={styles.backButton} />
        </View>
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Compare Products</Text>
        <Pressable onPress={handleAddItem}>
          <Ionicons name="add-circle-outline" size={28} color={COLORS.primaryGreen} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {compareItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-compare-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No items to compare</Text>
            <Text style={styles.emptySubtitle}>
              Add products to compare their features, prices, and cashback
            </Text>
            <Pressable style={styles.addButton} onPress={handleAddItem}>
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Add Products</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Comparison Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.comparisonTable}>
                {/* Product Images & Names */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell} />
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.productCell}>
                      <Pressable
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(item.id)}
                        disabled={isRemovingProduct === item.id}
                      >
                        {isRemovingProduct === item.id ? (
                          <ActivityIndicator size="small" color={Colors.error} />
                        ) : (
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        )}
                      </Pressable>
                      <CachedImage
                        source={item.image || undefined}
                        style={styles.productImage}
                        onError={() => {}}
                      />
                      <Text style={styles.productName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </View>
                  ))}
                  {compareItems.length < 5 && (
                    <Pressable 
                      style={styles.addProductCell} 
                      onPress={handleAddItem}
                      disabled={isAddingProduct}
                    >
                      {isAddingProduct ? (
                        <ActivityIndicator size="small" color={COLORS.primaryGreen} />
                      ) : (
                        <>
                          <Ionicons name="add-circle-outline" size={40} color={COLORS.textSecondary} />
                          <Text style={styles.addProductText}>Add Product</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                {/* Price Row */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell}>
                    <Text style={styles.labelText}>Price</Text>
                  </View>
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.valueCell}>
                      <Text style={styles.priceText}>{currencySymbol}{item.price.toLocaleString()}</Text>
                    </View>
                  ))}
                  {compareItems.length < 5 && <View style={styles.valueCell} />}
                </View>

                {/* Cashback Row */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell}>
                    <Text style={styles.labelText}>Cashback</Text>
                  </View>
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.valueCell}>
                      <Text style={styles.cashbackText}>{item.cashback}%</Text>
                      <Text style={styles.cashbackAmount}>
                        Save {currencySymbol}{Math.round(item.price * item.cashback / 100)}
                      </Text>
                    </View>
                  ))}
                  {compareItems.length < 5 && <View style={styles.valueCell} />}
                </View>

                {/* Rating Row */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell}>
                    <Text style={styles.labelText}>Rating</Text>
                  </View>
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.valueCell}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color={COLORS.primaryGold} />
                        <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                  ))}
                  {compareItems.length < 5 && <View style={styles.valueCell} />}
                </View>

                {/* Features Row */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell}>
                    <Text style={styles.labelText}>Features</Text>
                  </View>
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.valueCell}>
                      {item.features.map((feature, index) => (
                        <View key={`feature-${index}`} style={styles.featureItem}>
                          <Ionicons name="checkmark" size={14} color={COLORS.primaryGreen} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {compareItems.length < 5 && <View style={styles.valueCell} />}
                </View>

                {/* Buy Button Row */}
                <View style={styles.tableRow}>
                  <View style={styles.labelCell} />
                  {compareItems.map((item) => (
                    <View key={item.id} style={styles.valueCell}>
                      <Pressable
                        style={styles.buyButton}
                        onPress={() => handleBuy(item)}
                      >
                        <Text style={styles.buyButtonText}>Buy Now</Text>
                      </Pressable>
                    </View>
                  ))}
                  {compareItems.length < 5 && <View style={styles.valueCell} />}
                </View>
              </View>
            </ScrollView>

            {/* Best Value Indicator */}
            {compareItems.length >= 2 && (
              <View style={styles.bestValue}>
                <Ionicons name="trophy" size={20} color={COLORS.primaryGold} />
                <Text style={styles.bestValueText}>
                  Best Value: {compareItems.reduce((best, item) =>
                    item.cashback > best.cashback ? item : best
                  ).name}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  comparisonTable: {
    padding: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  labelCell: {
    width: 100,
    padding: 12,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  productCell: {
    width: 150,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.border,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  addProductCell: {
    width: 150,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginLeft: 8,
  },
  addProductText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  valueCell: {
    width: 150,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cashbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  cashbackAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  buyButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  bestValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    padding: 12,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  bestValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default withErrorBoundary(ComparePage, 'Compare');
