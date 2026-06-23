// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Collection Brands Page
 *
 * Displays brands within a specific collection
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { mallApi } from '../../../services/mallApi';
import { MallBrand, MallCollection } from '../../../types/mall.types';
import BrandFullWidthCard from '../../../components/mall/pages/BrandFullWidthCard';
import MallEmptyState from '../../../components/mall/pages/MallEmptyState';
import MallLoadingSkeleton from '../../../components/mall/pages/MallLoadingSkeleton';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

function CollectionBrandsPage() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const isMounted = useIsMounted();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [collection, setCollection] = useState<MallCollection | null>(null);
  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchCollectionBrands = useCallback(async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!slug) return;

    try {
      setError(null);
      const result = await mallApi.getBrandsByCollection(slug, pageNum, LIMIT);

      if (!isMounted()) return;
      setCollection(result.collection);
      if (!isMounted()) return;
      setTotal(result.total);

      if (append) {
        if (!isMounted()) return;
        setBrands(prev => [...prev, ...result.brands]);
      } else {
        if (!isMounted()) return;
        setBrands(result.brands);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load collection');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, [slug]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchCollectionBrands(1, false);
  }, [slug]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchCollectionBrands(1, false);
  }, [fetchCollectionBrands]);

  const handleLoadMore = useCallback(() => {
    const totalPages = Math.ceil(total / LIMIT);
    if (isLoadingMore || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCollectionBrands(nextPage, true);
  }, [page, total, isLoadingMore, fetchCollectionBrands]);

  const handleBrandPress = useCallback((brand: MallBrand) => {
    router.push(`/mall/brand/${brand.id || brand._id}` as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: MallBrand }) => (
    <BrandFullWidthCard brand={item} onPress={handleBrandPress} />
  ), [handleBrandPress]);

  const keyExtractor = useCallback((item: MallBrand) =>
    item.id || item._id, []);

  const getCollectionTypeLabel = (type: string) => {
    switch (type) {
      case 'curated':
        return 'Curated Collection';
      case 'seasonal':
        return 'Seasonal Collection';
      case 'trending':
        return 'Trending Now';
      case 'personalized':
        return 'Picked for You';
      default:
        return 'Collection';
    }
  };

  const ListHeader = useCallback(() => (
    <View>
      {collection && (
        <View style={styles.header}>
          {collection.image && (
            <CachedImage
              source={collection.image}
              style={styles.headerImage}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.headerOverlay}
          />
          <View style={styles.headerContent}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {getCollectionTypeLabel(collection.type)}
              </Text>
            </View>
            <Text style={styles.headerTitle}>{collection.name}</Text>
            {collection.description && (
              <Text style={styles.headerDescription}>{collection.description}</Text>
            )}
            <Text style={styles.brandCount}>{brands.length} brands</Text>
          </View>
        </View>
      )}
      <View style={styles.listHeader}>
        <Text style={styles.resultCount}>
          {brands.length} of {total} brands
        </Text>
      </View>
    </View>
  ), [collection, brands.length, total]);

  const ListFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={Colors.warning} />
        </View>
      );
    }
    return null;
  }, [isLoadingMore]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <MallEmptyState
        title="No brands in this collection"
        message="Check back later for new additions"
        icon="sparkles-outline"
        actionLabel="Browse All Brands"
        onAction={() => router.push('/mall/brands' as any)}
      />
    );
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Collection' }} />
        <View style={styles.container}>
          <MallLoadingSkeleton count={6} type="list" />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerTitle: 'Collection' }} />
        <View style={styles.container}>
          <MallEmptyState
            title="Something went wrong"
            message={error}
            icon="alert-circle-outline"
            actionLabel="Try Again"
            onAction={handleRefresh}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: collection?.name || 'Collection',
          headerTransparent: true,
          headerTintColor: Colors.text.inverse,
        }}
      />

      <View style={styles.container}>
        <FlashList
          data={brands}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.text.inverse}
              colors={[Colors.warning]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          estimatedItemSize={100}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    height: 240,
    position: 'relative',
    backgroundColor: Colors.text.secondary,
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    lineHeight: 20,
  },
  brandCount: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  paddingBottom: 120, },
  listHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  resultCount: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(CollectionBrandsPage, 'MallCollectionSlug');
