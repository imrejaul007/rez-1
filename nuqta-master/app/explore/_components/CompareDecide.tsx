import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import exploreApi, { FeaturedComparison } from '@/services/exploreApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

interface CompareOption {
  id: string;
  platform: string;
  rating: number | null;
  delivery: string;
  cashback: string;
  cashbackRate: number;
  isBest: boolean;
}

const CompareDecide = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [comparison, setComparison] = useState<FeaturedComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedComparison();
  }, []);

  const fetchFeaturedComparison = async () => {
    try {
      const response = await exploreApi.getFeaturedComparison();
      if (response.success && response.data) {
        setComparison(response.data?.comparison || null);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Build options from comparison stores
  const buildOptions = (): CompareOption[] => {
    if (!comparison || !comparison.stores) return [];

    // Map stores to options with their cashback rates
    const options = comparison.stores.map((store: any) => ({
      id: store.id,
      platform: store.name,
      rating: store.ratings?.average || null,
      delivery: store.operationalInfo?.deliveryTime
        ? `${store.operationalInfo.deliveryTime} min`
        : 'In-store',
      cashback: store.cashbackRate ? `${store.cashbackRate}% back` : 'No cashback',
      cashbackRate: store.cashbackRate || 0,
      isBest: false,
    }));

    // Sort by cashback rate (highest first) and mark the best one
    options.sort((a, b) => b.cashbackRate - a.cashbackRate);
    if (options.length > 0) {
      options[0].isBest = true;
    }

    return options;
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Empty state - show placeholder comparison
  if (!comparison || !comparison.stores || comparison.stores.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Compare & Decide</Text>
            <Text style={styles.sectionSubtitle}>Same product, best deal</Text>
          </View>
          <Pressable onPress={() => navigateTo('/explore/compare')}>
            <Text style={styles.compareMoreText}>Compare More</Text>
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="git-compare-outline" size={32} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>No comparisons available</Text>
          <Text style={styles.emptySubtext}>Start comparing products to find the best deals</Text>
        </View>
      </View>
    );
  }

  const options = buildOptions();

  return (
    <FeatureErrorBoundary featureName="Compare & Decide" compact={true}>
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Compare & Decide</Text>
            <Text style={styles.sectionSubtitle}>Same product, best deal</Text>
          </View>
          <Pressable onPress={() => navigateTo('/explore/compare')}>
            <Text style={styles.compareMoreText}>Compare More</Text>
          </Pressable>
        </View>

        {/* Compare Card */}
        <View style={styles.compareCard}>
          {/* Product Info */}
          <View style={styles.productRow}>
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="layers-outline" size={32} color={Colors.text.tertiary} />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{comparison.name}</Text>
              <Text style={styles.optionsCount}>{comparison.stores.length} options available</Text>
            </View>
          </View>

          {/* Options Table */}
          <View style={styles.optionsTable}>
            {options.map((option, index) => (
              <Pressable
                key={option.id}
                style={[
                  styles.optionRow,
                  option.isBest && styles.optionRowBest,
                ]}
                onPress={() => navigateTo(`/MainStorePage?storeId=${option.id}`)}
              >
                {/* Platform Icon & Name */}
                <View style={styles.platformCell}>
                  <View style={[
                    styles.platformIcon,
                    option.isBest && styles.platformIconBest,
                  ]}>
                    <Ionicons name="storefront" size={16} color={option.isBest ? Colors.background.primary : Colors.text.tertiary} />
                  </View>
                  <View style={styles.platformDetails}>
                    <View style={styles.platformNameRow}>
                      <Text style={[
                        styles.platformName,
                        option.isBest && styles.platformNameBest,
                      ]}>
                        {option.platform}
                      </Text>
                      {option.rating && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={10} color={Colors.warning} />
                          <Text style={styles.ratingText}>{option.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.deliveryText}>{option.delivery}</Text>
                  </View>
                </View>

                {/* Cashback */}
                <View style={[
                  styles.cashbackCell,
                  option.isBest && styles.cashbackCellBest,
                  option.cashback === 'No cashback' && styles.cashbackCellNone,
                ]}>
                  <Text style={[
                    styles.cashbackText,
                    option.isBest && styles.cashbackTextBest,
                    option.cashback === 'No cashback' && styles.cashbackTextNone,
                  ]}>
                    {option.cashback}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* View All Options Button */}
          <Pressable
            style={styles.viewAllButton}
            onPress={() => navigateTo('/explore/compare')}
          >
            <Text style={styles.viewAllText}>View All Options</Text>
          </Pressable>
        </View>
      </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    marginHorizontal: Spacing.base,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  compareMoreText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '600',
  },
  compareCard: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    marginLeft: 14,
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  optionsCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  optionsTable: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  optionRowBest: {
    backgroundColor: colors.successScale[50],
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  platformCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformIconBest: {
    backgroundColor: Colors.gold,
  },
  platformDetails: {
    flex: 1,
  },
  platformNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  platformNameBest: {
    color: Colors.nileBlue,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.warning,
  },
  deliveryText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  cashbackCell: {
    backgroundColor: Colors.border.default,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    minWidth: 75,
    alignItems: 'center',
  },
  cashbackCellBest: {
    backgroundColor: Colors.gold,
  },
  cashbackCellNone: {
    backgroundColor: Colors.background.secondary,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  cashbackTextBest: {
    color: Colors.text.inverse,
  },
  cashbackTextNone: {
    color: Colors.text.tertiary,
  },
  viewAllButton: {
    marginTop: Spacing.base,
    paddingVertical: 14,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.error,
  },
});

export default React.memo(CompareDecide);
