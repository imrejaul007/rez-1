// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import exploreApi from '../../../services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

// Category configs for organizing products
const categoryConfigs = [
  { id: '1', title: 'Popular with people like you', icon: 'people', color: Colors.info },
  { id: '2', title: 'Best deals in your budget', icon: 'wallet', color: Colors.gold },
  { id: '3', title: 'Based on your recent visits', icon: 'time', color: Colors.brand.purple },
];

const SmartPicks = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [smartPicks, setSmartPicks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSmartPicks();
  }, []);

  const fetchSmartPicks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch products for smart picks
      const response = await exploreApi.getProducts({ limit: 12 });
      const productsData = response.data?.products || (Array.isArray(response.data) ? response.data : []);
      if (response.success && productsData.length > 0) {
        // Group products into categories
        const products = productsData;
        const chunkSize = Math.ceil(products.length / 3);

        const transformed = categoryConfigs.map((config, catIndex) => {
          const startIdx = catIndex * chunkSize;
          const categoryProducts = products.slice(startIdx, startIdx + chunkSize).slice(0, 2);

          return {
            ...config,
            items: categoryProducts.map((product: any) => ({
              id: product.id || product._id,
              name: product.name || 'Product',
              store: product.store || 'Store',
              storeId: product.storeId,
              price: product.price || 0,
              cashback: product.cashbackPercentage ? `${product.cashbackPercentage}%` : (product.offer || null),
              distance: product.distance || null,
              buyers: product.buyers || null,
              trending: product.rating && product.rating >= 4,
            })),
          };
        });

        // Only set if we have at least one category with items
        const validCategories = transformed.filter(cat => cat.items.length > 0);
        if (validCategories.length > 0) {
          setSmartPicks(validCategories);
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load smart picks');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>Smart Picks by ${BRAND.APP_NAME}</Text>
              <View style={styles.aiTag}>
                <Ionicons name="sparkles" size={12} color={Colors.text.inverse} />
                <Text style={styles.aiTagText}>AI</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>Personalized just for you</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchSmartPicks}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state - don't render section if no data
  if (smartPicks.length === 0) {
    return null;
  }

  return (
    <FeatureErrorBoundary featureName="Smart Picks" compact={true}>
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Smart Picks by ${BRAND.APP_NAME}</Text>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={12} color={Colors.text.inverse} />
              <Text style={styles.aiTagText}>AI</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>Personalized just for you</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.picksContainer}
      >
        {smartPicks.map((category) => (
          <View key={category.id} style={styles.pickCard}>
            {/* Category Header */}
            <View style={styles.pickHeader}>
              <View style={[styles.iconBadge, { backgroundColor: category.color + '20' }]}>
                <Ionicons name={category.icon as any} size={20} color={category.color} />
              </View>
              <Text style={styles.pickTitle}>{category.title}</Text>
            </View>

            {/* Items */}
            {category.items.map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.itemRow,
                  index < category.items.length - 1 && styles.itemBorder,
                ]}
                onPress={() => navigateTo(`/MainStorePage?storeId=${item.storeId || item.id}`)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemStore}>{item.store}</Text>
                    {item.distance && (
                      <>
                        <View style={styles.dot} />
                        <Ionicons name="location" size={10} color={Colors.text.tertiary} />
                        <Text style={styles.itemDistance}>{item.distance}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.itemRight}>
                  {item.price > 0 && (
                    <Text style={styles.itemPrice}>{currencySymbol}{item.price}</Text>
                  )}
                  {item.cashback && (
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>{item.cashback}</Text>
                    </View>
                  )}
                  {item.buyers && (
                    <View style={styles.buyersRow}>
                      <Ionicons name="people" size={10} color={Colors.text.tertiary} />
                      <Text style={styles.buyersText}>{item.buyers} bought</Text>
                    </View>
                  )}
                  {item.trending && (
                    <View style={styles.trendingRow}>
                      <Ionicons name="trending-up" size={10} color={Colors.error} />
                      <Text style={styles.trendingText}>Trending</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}

            {/* View More */}
            <Pressable
              style={styles.viewMoreButton}
              onPress={() => navigateTo(`/explore/search?q=${encodeURIComponent(category.title)}`)}
            >
              <Text style={styles.viewMoreText}>See more like this</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.gold} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.successScale[50],
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.purpleMedium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  aiTagText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  picksContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  pickCard: {
    width: width * 0.8,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: Spacing.md,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  itemStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.neutral[400],
  },
  itemDistance: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  cashbackBadge: {
    backgroundColor: colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },
  buyersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 3,
  },
  buyersText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 3,
  },
  trendingText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '500',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 6,
  },
  viewMoreText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
});

export default React.memo(SmartPicks);
