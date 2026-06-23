// @ts-nocheck
import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import categoriesApi, { Category } from '@/services/categoriesApi';
import CategorySectionCard from './cards/CategorySectionCard';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface BestSellerSectionProps {
  title?: string;
  limit?: number;
}

const BEST_SELLER_CACHE_TTL_MS = 5 * 60 * 1000;
const bestSellerCache = new Map<number, { data: Category[]; at: number }>();
const bestSellerInFlight = new Map<number, Promise<Category[]>>();

function BestSellerSection({
  title = 'Best Seller',
  limit = 10,
}: BestSellerSectionProps) {
  const router = useRouter();
  const now = Date.now();
  const cachedEntry = bestSellerCache.get(limit);
  const hasFreshCache = !!(
    cachedEntry && now - cachedEntry.at < BEST_SELLER_CACHE_TTL_MS
  );
  const isMounted = useIsMounted();
  const [categories, setCategories] = useState<Category[]>(
    hasFreshCache ? cachedEntry!.data : []
  );
  const [loading, setLoading] = useState(!hasFreshCache);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    const existingCache = bestSellerCache.get(limit);
    if (existingCache && Date.now() - existingCache.at < BEST_SELLER_CACHE_TTL_MS) {
      return existingCache.data;
    }

    const inFlight = bestSellerInFlight.get(limit);
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      let data: Category[] = [];

      const response = await categoriesApi.getBestSellerCategories(limit);
      if (response.success && response.data) {
        data = response.data;
      } else {
        throw new Error('Failed to load categories');
      }

      bestSellerCache.set(limit, { data, at: Date.now() });
      return data;
    })();

    bestSellerInFlight.set(limit, request);

    try {
      return await request;
    } finally {
      bestSellerInFlight.delete(limit);
    }
  }, [limit]);

  useEffect(() => {
    setError(null);

    if (
      categories.length === 0 &&
      !bestSellerCache.get(limit) &&
      !bestSellerInFlight.get(limit)
    ) {
      setLoading(true);
    }

    fetchCategories()
      .then((data) => {
        if (!isMounted()) return;
        setCategories(data);
      })
      .catch(() => {
        if (!isMounted()) return;
        setError('Failed to load categories');
      })
      .finally(() => {
        if (!isMounted()) return;
        setLoading(false);
      });
  }, [fetchCategories]);

  const handleViewAll = useCallback(() => {
    router.push('/(tabs)/categories' as any);
  }, [router]);

  const handleCategoryPress = useCallback((category: Category) => {
    router.push(`/category/${category.slug}` as any);
  }, [router]);

  const renderCategory = useCallback(({ item, index }: { item: Category; index: number }) => (
    <View style={[styles.cardWrapper, index === categories.length - 1 && styles.lastCard]}>
      <CategorySectionCard
        category={item}
        onPress={handleCategoryPress}
        width={160}
      />
    </View>
  ), [handleCategoryPress, categories.length]);

  const keyExtractor = useCallback((item: Category) => item._id, []);


  // Don't render if no categories and not loading
  if (!loading && categories.length === 0 && !error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Pressable
          style={styles.viewAllButton}
          onPress={handleViewAll}
          accessibilityLabel="View all best seller categories"
          accessibilityRole="button"
        >
          <ThemedText style={styles.viewAllText}>View all</ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.lightMustard} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={fetchCategories}
            accessibilityLabel="Retry loading categories"
            accessibilityRole="button"
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent as any}
          estimatedItemSize={150}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
        />
      )}
    </View>
  );
}

export default memo(BestSellerSection);

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardWrapper: {
    marginRight: 12,
  },
  lastCard: {
    marginRight: 0,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.nileBlue,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
});
