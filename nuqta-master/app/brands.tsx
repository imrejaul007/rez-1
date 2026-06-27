// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Brands Listing Page
 * Shows all brands for a category with filtering options
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBrandsForCategory, Brand, getAllBrands } from '@/data/categoryDummyData';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const BrandCard = ({
  brand,
  onPress,
}: {
  brand: Brand;
  onPress: () => void;
}) => (
  <Pressable style={styles.brandCard} onPress={onPress}>
    <View style={styles.logoContainer}>
      <Text style={styles.logo}>{brand.logo}</Text>
    </View>
    <Text style={styles.brandName} numberOfLines={1}>{brand.name}</Text>
    <View style={styles.cashbackBadge}>
      <Text style={styles.cashbackText}>{brand.cashback}% cashback</Text>
    </View>
    {brand.tag && (
      <View style={[
        styles.tagBadge,
        brand.tag === 'Premium' && styles.tagPremium,
        brand.tag === 'Trending' && styles.tagTrending,
        brand.tag === 'Popular' && styles.tagPopular,
      ]}>
        <Text style={[
          styles.tagText,
          brand.tag === 'Premium' && styles.tagTextPremium,
          brand.tag === 'Trending' && styles.tagTextTrending,
          brand.tag === 'Popular' && styles.tagTextPopular,
        ]}>{brand.tag}</Text>
      </View>
    )}
    <View style={styles.ratingRow}>
      <Text style={styles.ratingStar}>★</Text>
      <Text style={styles.ratingValue}>{brand.rating.toFixed(1)}</Text>
    </View>
  </Pressable>
);

function BrandsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categorySlug = params.category as string;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'trending' | 'premium' | 'popular'>('all');

  // Load brands
  useEffect(() => {
    loadBrands();
  }, [categorySlug]);

  const loadBrands = async () => {
    setLoading(true);
    try {
      // Get brands for category or all brands
      const brandsList = categorySlug
        ? getBrandsForCategory(categorySlug)
        : getAllBrands();

      setBrands(brandsList);
      setFilteredBrands(brandsList);
    } catch (error) {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter brands based on search and filter
  useEffect(() => {
    let filtered = [...brands];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Tag filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(brand => {
        if (selectedFilter === 'trending') return brand.tag === 'Trending';
        if (selectedFilter === 'premium') return brand.tag === 'Premium';
        if (selectedFilter === 'popular') return brand.tag === 'Popular';
        return true;
      });
    }

    setFilteredBrands(filtered);
  }, [brands, searchQuery, selectedFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBrands();
  };

  const handleBrandPress = useCallback((brand: Brand) => {
    router.push({
      pathname: '/brand/[name]',
      params: { name: brand.id },
    } as any);
  }, [router]);

  const renderBrand = useCallback(({ item }: { item: Brand }) => (
    <BrandCard brand={item} onPress={() => handleBrandPress(item)} />
  ), [handleBrandPress]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brands..."
          placeholderTextColor={Colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(['all', 'popular', 'trending', 'premium'] as const).map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterPill,
              selectedFilter === filter && styles.filterPillActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === filter && styles.filterPillTextActive,
              ]}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.resultCount}>
        {filteredBrands.length} {filteredBrands.length === 1 ? 'brand' : 'brands'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={64} color={Colors.border.default} />
      <Text style={styles.emptyTitle}>No brands found</Text>
      <Text style={styles.emptyText}>
        Try adjusting your search or filters
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, '#e6b94e']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {categorySlug
              ? `${categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Brands`
              : 'All Brands'}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Brands List */}
      {loading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={filteredBrands}
          renderItem={renderBrand}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          estimatedItemSize={200}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    padding: Spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.body.fontSize,
    color: Colors.nileBlue,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  filterPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterPillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterPillText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterPillTextActive: {
    color: Colors.text.inverse,
  },
  resultCount: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.tertiary,
  },
  listContent: {
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  brandCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logo: {
    fontSize: 32,
  },
  brandName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  cashbackText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    color: Colors.gold,
  },
  tagBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  tagPremium: {
    backgroundColor: Colors.warningScale[50],
  },
  tagTrending: {
    backgroundColor: Colors.infoScale[50],
  },
  tagPopular: {
    backgroundColor: colors.pinkMist,
  },
  tagText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  tagTextPremium: {
    color: Colors.warning,
  },
  tagTextTrending: {
    color: Colors.info,
  },
  tagTextPopular: {
    color: colors.deepPink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingStar: {
    fontSize: Typography.body.fontSize,
    color: '#FFB800',
  },
  ratingValue: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(BrandsPage, 'Brands');
