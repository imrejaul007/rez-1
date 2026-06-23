// @ts-nocheck
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  Platform,
  Dimensions,
  Share,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { SearchResult, GroupedProductResult, SearchResultsSummary as SearchSummaryType } from '@/types/search.types';
import { BRAND } from '@/constants/brand';
import { apiClient } from '@/utils/apiClient';
import SearchResultsSummary from './SearchResultsSummary';
import FilterBar, { SortOption } from './FilterBar';
import SearchSortChips from './SearchSortChips';
import ProductGroupHeader from './ProductGroupHeader';
import SellerComparisonCard from './SellerComparisonCard';
import { NUQTA } from './searchTheme';

const { width } = Dimensions.get('window');

interface SearchResultsViewProps {
  query: string;
  loading: boolean;
  results: SearchResult[];
  groupedProducts: GroupedProductResult[];
  matchingStores: any[];
  searchSummary: SearchSummaryType | null;
  currentSort: SortOption;
  activeFilters: string[];
  onResultPress: (result: SearchResult, position: number) => void;
  onSellerPress: (seller: any) => void;
  onFilterPress: (filter: string) => void;
  onSortChange: (sort: SortOption) => void;
}

function StoreCard({ store }: { store: any }) {
  return (
    <Pressable
      style={styles.storeResultCard}
      onPress={() => router.push(`/MainStorePage?storeId=${store.storeId}`)}
    >
      <View style={styles.storeResultContent}>
        {store.logo ? (
          <CachedImage source={store.logo} style={styles.storeResultLogo} />
        ) : (
          <LinearGradient
            colors={[NUQTA.lavenderMist, NUQTA.lavenderDark]}
            style={[styles.storeResultLogo, styles.storeResultLogoPlaceholder]}
          >
            <Ionicons name="storefront" size={24} color={NUQTA.nileBlue} />
          </LinearGradient>
        )}
        <View style={styles.storeResultInfo}>
          <View style={styles.storeResultNameRow}>
            <Text style={styles.storeResultName} numberOfLines={1}>{store.name}</Text>
            {store.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={NUQTA.lightMustard} />
              </View>
            )}
          </View>
          {store.description ? (
            <Text style={styles.storeResultDescription} numberOfLines={2}>{store.description}</Text>
          ) : null}
          <View style={styles.storeResultMeta}>
            {store.rating > 0 && (
              <View style={styles.storeResultRating}>
                <Ionicons name="star" size={12} color={NUQTA.lightMustard} />
                <Text style={styles.storeResultRatingText}>{store.rating.toFixed(1)}</Text>
                {store.reviewCount > 0 && (
                  <Text style={styles.storeResultReviewCount}>({store.reviewCount})</Text>
                )}
              </View>
            )}
            {store.location ? (
              <View style={styles.storeResultLocation}>
                <Ionicons name="location-outline" size={12} color={NUQTA.text.muted} />
                <Text style={styles.storeResultLocationText}>{store.location}</Text>
              </View>
            ) : null}
            {store.distance !== undefined && (
              <View style={styles.distanceBadge}>
                <Text style={styles.storeResultDistance}>{store.distance} km</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.storeArrowContainer}>
          <Ionicons name="chevron-forward" size={20} color={NUQTA.nileBlue} />
        </View>
      </View>
    </Pressable>
  );
}

function SearchResultsView({
  query,
  loading,
  results,
  groupedProducts,
  matchingStores,
  searchSummary,
  currentSort,
  activeFilters,
  onResultPress,
  onSellerPress,
  onFilterPress,
  onSortChange,
}: SearchResultsViewProps) {
  // Use grouped products if available, otherwise fall back to regular results
  if (groupedProducts.length > 0 || matchingStores.length > 0) {
    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Results Summary */}
        {searchSummary && (
          <SearchResultsSummary query={query} summary={searchSummary} />
        )}

        {/* Sort Chips */}
        {groupedProducts.length > 0 && (
          <SearchSortChips
            currentSort={currentSort}
            onSortChange={onSortChange}
            resultCount={groupedProducts.reduce((sum, g) => sum + g.sellers.length, 0) + matchingStores.length}
          />
        )}

        {/* Filter Bar */}
        {groupedProducts.length > 0 && (
          <FilterBar
            onFilterPress={onFilterPress}
            activeFilters={activeFilters}
          />
        )}

        {/* Matching Stores Section */}
        {matchingStores.length > 0 && (
          <View style={styles.matchingStoresSection}>
            <View style={styles.matchingStoresHeader}>
              <View style={styles.matchingStoresIconContainer}>
                <Ionicons name="storefront-outline" size={18} color={NUQTA.nileBlue} />
              </View>
              <Text style={styles.matchingStoresTitle}>Matching Stores</Text>
              <View style={styles.matchingStoresCountBadge}>
                <Text style={styles.matchingStoresCount}>{matchingStores.length}</Text>
              </View>
            </View>
            {matchingStores.map((store) => (
              <StoreCard key={store.storeId} store={store} />
            ))}
          </View>
        )}

        {/* Premium Promotional Banner */}
        {groupedProducts.length > 0 && (
          <LinearGradient
            colors={[NUQTA.linen, NUQTA.lightPeach + '40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoBanner}
          >
            <View style={styles.promoIconContainer}>
              <Ionicons name="wallet-outline" size={20} color={NUQTA.nileBlue} />
            </View>
            <Text style={styles.promoText}>
              Cashback & coins auto-applied at checkout for maximum savings
            </Text>
            <View style={styles.promoSparkle}>
              <Ionicons name="sparkles" size={18} color={NUQTA.lightMustard} />
            </View>
          </LinearGradient>
        )}

        {/* Grouped Products */}
        {groupedProducts.map((productGroup) => (
          <View key={productGroup.productId} style={styles.productGroup}>
            <ProductGroupHeader product={productGroup} />
            <View style={styles.productGroupSectionHeader}>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.productGroupSectionTitle}>Same product • Compare sellers</Text>
                <Text style={styles.productGroupSectionSubtitle}>Find the best deal across sellers</Text>
              </View>
              <View style={styles.brandAccent} />
            </View>
            {productGroup.sellers.map((seller, index) => (
              <SellerComparisonCard
                key={`${seller.storeId}-${index}`}
                seller={seller}
                productId={productGroup.productId}
                onPress={onSellerPress}
                onCompare={() => {
                  router.push(`/compare?productId=${productGroup.productId}`);
                }}
                onFavorite={(seller) => {
                  apiClient.post(`/wishlists/items`, { itemType: 'store', itemId: seller.storeId }).catch(() => {});
                }}
                onShare={(seller) => {
                  Share.share({ message: `Check out ${seller.storeName} on ${BRAND.APP_NAME}!`, url: `${BRAND.WEBSITE}/store/${seller.storeId}` }).catch(() => {});
                }}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  // Fallback to regular results display — uses FlatList for virtualization
  const renderResultItem = useCallback(({ item: result, index }: ListRenderItemInfo<SearchResult>) => (
    <Pressable
      style={styles.resultCard}
      onPress={() => onResultPress(result, index + 1)}
      accessibilityLabel={`${result.title}, ${result.category}, ${result.cashbackPercentage}% cashback`}
      accessibilityRole="button"
      accessibilityHint={`Opens details page for ${result.title}`}
    >
      <View style={styles.resultImageContainer}>
        {result.image ? (
          <CachedImage
            source={result.image}
            style={styles.resultImage}
            contentFit="cover"
            accessibilityLabel={`${result.title} image`}
            accessibilityRole="image"
          />
        ) : (
          <LinearGradient
            colors={[NUQTA.lavenderMist, NUQTA.lavenderDark]}
            style={styles.resultImagePlaceholder}
            accessibilityLabel={`${result.title} placeholder image`}
          >
            <Text style={styles.resultImageText}>{result.title.charAt(0)}</Text>
          </LinearGradient>
        )}
      </View>

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{result.title}</Text>
        <Text style={styles.resultDescription} numberOfLines={2}>
          {result.description}
        </Text>
        {result.cashbackPercentage > 0 && (
          <Text style={styles.resultSaveAmount}>
            SAVE {Math.round((result.cashbackPercentage / 100) * (result.price?.current || 500))}
          </Text>
        )}
        <View style={styles.resultMeta}>
          <LinearGradient
            colors={[NUQTA.nileBlue, NUQTA.nileBlueLight]}
            style={styles.resultCashback}
          >
            <Ionicons name="wallet-outline" size={12} color={NUQTA.lightMustard} />
            <Text style={styles.resultCashbackText}>{result.cashbackPercentage}%</Text>
          </LinearGradient>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{result.category}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  ), [onResultPress]);

  const resultKeyExtractor = useCallback((item: SearchResult) => item.id, []);

  const ResultsHeader = useCallback(() => (
    <View style={styles.searchResultsHeader}>
      <View style={styles.searchResultsTitleContainer}>
        <View style={styles.searchResultsIconContainer}>
          <Ionicons name="search" size={20} color={NUQTA.nileBlue} />
        </View>
        <Text style={styles.searchResultsTitle}>
          Search Results
        </Text>
      </View>
      <Text style={styles.searchResultsCount}>
        {loading ? 'Searching...' : `${results.length} ${results.length === 1 ? 'result' : 'results'} found`}
      </Text>
      <Text style={styles.searchQueryText}>
        for "{query}"
      </Text>
    </View>
  ), [loading, results.length, query]);

  return (
    <FlatList
      data={results}
      renderItem={renderResultItem}
      keyExtractor={resultKeyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.resultsGridRow}
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ResultsHeader}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },

  // Store results
  matchingStoresSection: {
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  matchingStoresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  matchingStoresIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchingStoresTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    flex: 1,
  },
  matchingStoresCountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: NUQTA.nileBlue,
    borderRadius: BorderRadius.md,
  },
  matchingStoresCount: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeResultCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 18,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  storeResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  storeResultLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  storeResultLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeResultInfo: {
    flex: 1,
  },
  storeResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: 6,
  },
  storeResultName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: NUQTA.nileBlue,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: NUQTA.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeResultDescription: {
    ...Typography.bodySmall,
    color: NUQTA.text.secondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  storeResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  storeResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  storeResultRatingText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: NUQTA.nileBlue,
  },
  storeResultReviewCount: {
    ...Typography.bodySmall,
    color: NUQTA.text.muted,
  },
  storeResultLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storeResultLocationText: {
    ...Typography.bodySmall,
    color: NUQTA.text.muted,
  },
  distanceBadge: {
    backgroundColor: NUQTA.lavenderMist,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  storeResultDistance: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: NUQTA.nileBlue,
  },
  storeArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Promo banner
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: 14,
    borderRadius: 18,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: NUQTA.peachDark + '40',
  },
  promoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NUQTA.peachDark,
  },
  promoText: {
    flex: 1,
    ...Typography.bodySmall,
    color: NUQTA.nileBlue,
    fontWeight: '600',
    lineHeight: 19,
  },
  promoSparkle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NUQTA.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Product group
  productGroup: {
    marginTop: Spacing.base,
  },
  productGroupSectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    backgroundColor: Colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: NUQTA.lightMustard,
    marginHorizontal: Spacing.base,
    marginTop: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
  },
  sectionHeaderContent: {
    flex: 1,
  },
  productGroupSectionTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: Spacing.xs,
  },
  productGroupSectionSubtitle: {
    ...Typography.bodySmall,
    color: NUQTA.text.secondary,
  },
  brandAccent: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: NUQTA.lightMustard,
    marginLeft: Spacing.md,
  },

  // Search results header (fallback)
  searchResultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchResultsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchResultsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: NUQTA.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NUQTA.nileBlue,
  },
  searchResultsCount: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: NUQTA.lightMustard,
    marginBottom: Spacing.xs,
  },
  searchQueryText: {
    ...Typography.body,
    color: NUQTA.text.secondary,
    fontStyle: 'italic',
  },
  resultsGridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  resultCard: {
    width: (width - 48) / 2,
    backgroundColor: Colors.background.primary,
    marginBottom: 14,
    marginHorizontal: 2,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: NUQTA.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  resultImageContainer: {
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: 120,
  },
  resultImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImageText: {
    ...Typography.h1,
    fontWeight: '800',
    color: NUQTA.nileBlue,
  },
  resultInfo: {
    padding: 14,
  },
  resultTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: NUQTA.nileBlue,
    marginBottom: 6,
    lineHeight: 20,
  },
  resultDescription: {
    ...Typography.bodySmall,
    color: NUQTA.text.secondary,
    marginBottom: Spacing.md,
    lineHeight: 17,
  },
  resultSaveAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a3a52',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  resultCashbackText: {
    ...Typography.bodySmall,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  categoryTag: {
    backgroundColor: NUQTA.linen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NUQTA.peachDark,
  },
  categoryTagText: {
    color: NUQTA.nileBlue,
    ...Typography.caption,
    fontWeight: '600',
  },
});

export default React.memo(SearchResultsView);
