// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import productsApi from '@/services/productsApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
interface SectionProduct {
  _id: string;
  name: string;
  images?: string[];
  pricing?: { selling?: number; original?: number; currency?: string; discount?: number };
  price?: number | { current?: number; original?: number; currency?: string };
  store?: { name: string; logo?: string };
  ratings?: { average: number; count: number };
  cashbackPercentage?: number;
}

function GoingOutSectionPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const [products, setProducts] = useState<SectionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await productsApi.getProducts({
        page: pageNum,
        limit: 20,
        category: sectionId,
      });

      if (response.success && response.data) {
        const newProducts = response.data.products || response.data || [];
        if (!isMounted()) return;
        setProducts(prev => append ? [...prev, ...newProducts] : newProducts);
        if (!isMounted()) return;
        setHasMore(newProducts.length >= 20);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [sectionId]);

  useEffect(() => {
    if (sectionId) fetchProducts(1);
  }, [sectionId, fetchProducts]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
  };

  const getPrice = (item: SectionProduct): string => {
    const price = item.pricing?.selling || (typeof item.price === 'number' ? item.price : item.price?.current) || 0;
    const currency = item.pricing?.currency || (typeof item.price === 'object' ? item.price?.currency : undefined) || 'AED';
    return `${currency} ${price.toFixed(2)}`;
  };

  const handleProductPress = useCallback((item: SectionProduct) => {
    router.push(`/product-page?cardId=${item._id}` as any);
  }, [router]);

  const renderProduct = useCallback(({ item }: { item: SectionProduct }) => (
    <Pressable style={styles.productCard} onPress={() => handleProductPress(item)}>
      <CachedImage
        source={item.images?.[0] || undefined}
        style={styles.productImage}
      />
      {item.cashbackPercentage ? (
        <View style={styles.cashbackBadge}>
          <ThemedText style={styles.cashbackText}>{item.cashbackPercentage}% Cashback</ThemedText>
        </View>
      ) : null}
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>
        {item.store?.name ? (
          <ThemedText style={styles.storeName}>{item.store.name}</ThemedText>
        ) : null}
        <ThemedText style={styles.productPrice}>{getPrice(item)}</ThemedText>
        {item.ratings?.average ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.warningScale[400]} />
            <ThemedText style={styles.ratingText}>{item.ratings.average.toFixed(1)} ({item.ratings.count})</ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  ), [handleProductPress]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <CardGridSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => goBack('/going-out' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.nileBlue} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {(sectionId || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <FlashList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
          estimatedItemSize={220}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-outline" size={48} color="#94A3B8" />
            <ThemedText style={styles.emptyText}>No products in this section yet</ThemedText>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.nileBlue} style={{ padding: 16 }} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.border.default,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  storeName: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(GoingOutSectionPage, 'GoingOutSectionSectionId');
