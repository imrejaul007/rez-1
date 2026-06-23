import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import {
  SearchCategory,
  SearchResult,
  SearchSuggestion,
  SearchViewMode,
} from '@/types/search.types';
import { LandingSkeleton, ResultsSkeleton } from '@/components/search/SearchSkeleton';
import FilterModal from '@/components/search/FilterModal';
import type { FilterState } from '@/components/search/FilterModal';
import type { SortOption } from '@/components/search/FilterBar';
import SearchHeader from '@/components/search/SearchHeader';
import SearchSuggestionsView from '@/components/search/SearchSuggestionsView';
import CategoriesView from '@/components/search/CategoriesView';
import SearchResultsView from '@/components/search/SearchResultsView';
import SearchEmptyState from '@/components/search/SearchEmptyState';
import SearchErrorState from '@/components/search/SearchErrorState';
import SearchHintView from '@/components/search/SearchHintView';
import { NUQTA } from '@/components/search/searchTheme';
import { useSearchPage } from '@/hooks/useSearchPage';
import useDebouncedSearch from '@/hooks/useDebouncedSearch';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { searchHistoryService } from '@/services/searchHistoryService';
import { Spacing } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

function SearchPage() {
  const params = useLocalSearchParams();
  const initialQuery = (params.q as string) || '';

  // Use the search page hook
  const { state: searchState, groupedProducts, matchingStores, searchSummary, trendingSearches, popularStores, popularProducts, didYouMeanSuggestions, actions } = useSearchPage();

  // Get user location for distance calculation
  const { currentLocation } = useCurrentLocation();

  // Get currency symbol for price display
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Use debounced search hook
  const { debouncedValue: debouncedQuery, setValue: setSearchQuery } = useDebouncedSearch(initialQuery, { delay: 350, minLength: 2 });

  const [viewMode, setViewMode] = useState<SearchViewMode>(initialQuery ? 'results' : 'categories');
  const [inputFocused, setInputFocused] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>('cashback_high');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    priceRange: { min: 0, max: 100000 },
    rating: null,
    categories: [],
    inStock: false,
    cashbackMin: 0,
  });
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const isMounted = useIsMounted();

  // Load recent searches
  useEffect(() => {
    searchHistoryService.getRecentSearches().then(setRecentSearches).catch(() => {});
  }, []);

  // Prepare user location for search (memoized to avoid recreation)
  const userLat = currentLocation?.coordinates?.latitude;
  const userLon = currentLocation?.coordinates?.longitude;

  // Store function, location, and filters in refs to avoid dependency issues
  const performGroupedSearchRef = useRef(actions.performGroupedSearch);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const currentFiltersRef = useRef<FilterState>(currentFilters);

  // Update refs (using useLayoutEffect to avoid render issues)
  useLayoutEffect(() => {
    performGroupedSearchRef.current = actions.performGroupedSearch;
    userLocationRef.current = userLat && userLon ? { latitude: userLat, longitude: userLon } : undefined;
    currentFiltersRef.current = currentFilters;
  }, [actions.performGroupedSearch, userLat, userLon, currentFilters]);

  // Track last search to prevent duplicate searches
  const lastSearchedQuery = useRef<string>('');

  // Perform grouped search if initial query exists (only once on mount)
  const hasSearchedInitial = useRef(false);
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2 && !hasSearchedInitial.current) {
      hasSearchedInitial.current = true;
      lastSearchedQuery.current = initialQuery;
      actions.handleSearchChange(initialQuery);
      performGroupedSearchRef.current(initialQuery, userLocationRef.current, currentFiltersRef.current);
      setViewMode('results');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Perform grouped search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.trim().length >= 2) {
      if (lastSearchedQuery.current !== debouncedQuery) {
        lastSearchedQuery.current = debouncedQuery;
        performGroupedSearchRef.current(debouncedQuery, userLocationRef.current, currentFiltersRef.current);
        setViewMode('results');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleQueryChange = (text: string) => {
    actions.handleSearchChange(text);
    setSearchQuery(text);
    if (text.length > 0) {
      setViewMode('suggestions');
    } else {
      setViewMode('categories');
    }
  };

  const handleSearch = useCallback(() => {
    if (searchState.query.trim()) {
      lastSearchedQuery.current = searchState.query;
      performGroupedSearchRef.current(searchState.query, userLocationRef.current, currentFiltersRef.current);
      setViewMode('results');
    }
  }, [searchState.query]);

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    actions.handleSearchChange(suggestion.text);
    setSearchQuery(suggestion.text);
    lastSearchedQuery.current = suggestion.text;
    performGroupedSearchRef.current(suggestion.text, userLocationRef.current, currentFiltersRef.current);
    setViewMode('results');
  };

  const handleCategoryPress = async (category: SearchCategory) => {
    await actions.handleCategoryPress(category);
    router.push({
      pathname: '/category/[slug]' as any,
      params: {
        slug: category.slug,
        name: category.name,
        categoryId: category.id
      }
    });
  };

  const handleResultPress = async (result: SearchResult, position: number) => {
    await actions.handleResultPress(result, position);
    const resultId = result.id || (result as any).productId || (result as any).storeId || '';
    if (!resultId) return;

    if (result.category === 'Store') {
      router.push(`/MainStorePage?storeId=${resultId}`);
    } else {
      router.push({
        pathname: '/product-page' as any,
        params: { cardId: resultId, cardType: 'product' }
      });
    }
  };

  const handleSellerPress = (seller: any) => {
    if (seller.productId) {
      router.push({
        pathname: '/product-page' as any,
        params: { cardId: seller.productId, cardType: 'product', storeId: seller.storeId }
      });
    } else if (seller.storeId) {
      router.push(`/MainStorePage?storeId=${seller.storeId}`);
    }
  };

  const handleFilterPress = (_filter: string) => {
    setShowFilterModal(true);
  };

  const handleSortChange = (sort: SortOption) => {
    setCurrentSort(sort);
  };

  const handleViewAll = (sectionId: string) => {
    actions.handleViewAllSection(sectionId);
    if (sectionId === 'going-out') {
      router.push('/going-out');
    } else if (sectionId === 'home-delivery') {
      router.push('/home-delivery');
    }
  };

  const handleOpenFilters = () => {
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters: FilterState) => {
    setCurrentFilters(filters);
    const filterNames: string[] = [];
    if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) filterNames.push('price');
    if (filters.rating !== null) filterNames.push('rating');
    if (filters.cashbackMin > 0) filterNames.push('cashback');
    if (filters.categories.length > 0) filterNames.push('category');
    setActiveFilters(filterNames);
    setShowFilterModal(false);

    if (searchState.query.trim().length >= 2) {
      lastSearchedQuery.current = '';
      performGroupedSearchRef.current(searchState.query, userLocationRef.current, filters);
      setViewMode('results');
    }
  };

  const handleRecentSearchPress = (query: string) => {
    actions.handleSearchChange(query);
    setSearchQuery(query);
    lastSearchedQuery.current = query;
    performGroupedSearchRef.current(query, userLocationRef.current, currentFiltersRef.current);
    setViewMode('results');
  };

  const handleTrendingSearchPress = (query: string) => {
    actions.handleSearchChange(query);
    setSearchQuery(query);
    lastSearchedQuery.current = query;
    performGroupedSearchRef.current(query, userLocationRef.current, currentFiltersRef.current);
    setViewMode('results');
  };

  const handlePopularStorePress = (store: any) => {
    router.push(`/MainStorePage?storeId=${store._id}`);
  };

  const handleDidYouMeanPress = (suggestion: string) => {
    actions.handleSearchChange(suggestion);
    setSearchQuery(suggestion);
    performGroupedSearchRef.current(suggestion, userLocationRef.current, currentFiltersRef.current);
    setViewMode('results');
  };

  const handleEmptyClearSearch = () => {
    actions.handleClearSearch();
    setViewMode('categories');
  };

  const handleRetry = () => {
    actions.handleClearError();
    if (viewMode === 'results' && searchState.query) {
      performGroupedSearchRef.current(searchState.query, userLocationRef.current, currentFiltersRef.current);
    } else {
      actions.loadCategories();
    }
  };

  // Apply sorting to grouped products based on current sort option
  const sortedGroupedProducts = useMemo(() => {
    if (!groupedProducts || groupedProducts.length === 0) return groupedProducts;

    return groupedProducts.map(productGroup => {
      const sortedSellers = [...productGroup.sellers].sort((a, b) => {
        switch (currentSort) {
          case 'price_low':
            return a.price.current - b.price.current;
          case 'price_high':
            return b.price.current - a.price.current;
          case 'cashback_high':
            return b.cashback.amount - a.cashback.amount;
          case 'distance': {
            const distA = a.distance ?? 999;
            const distB = b.distance ?? 999;
            return distA - distB;
          }
          case 'rating':
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviewCount - a.reviewCount;
          case 'best_value':
          default: {
            const scoreA = (a.price.current * 0.4) - (a.cashback.amount * 0.3) - (a.rating * 100 * 0.2) + ((a.distance || 999) * 0.1);
            const scoreB = (b.price.current * 0.4) - (b.cashback.amount * 0.3) - (b.rating * 100 * 0.2) + ((b.distance || 999) * 0.1);
            return scoreA - scoreB;
          }
        }
      });
      return { ...productGroup, sellers: sortedSellers };
    });
  }, [groupedProducts, currentSort]);

  // ============================================
  // CONTENT RENDERING
  // ============================================

  const renderContent = () => {
    if (searchState.error && !searchState.sections.length) {
      return <SearchErrorState error={searchState.error} onRetry={handleRetry} />;
    }

    if (searchState.loading && !searchState.sections.length) {
      return searchState.isSearching || viewMode === 'results'
        ? <ResultsSkeleton />
        : <LandingSkeleton />;
    }

    switch (viewMode) {
      case 'suggestions':
        return (
          <SearchSuggestionsView
            suggestions={searchState.suggestions}
            query={searchState.query}
            onSuggestionPress={handleSuggestionPress}
          />
        );
      case 'results':
        if (searchState.loading) {
          return <ResultsSkeleton />;
        }
        if (searchState.query.trim().length < 2) {
          return <SearchHintView />;
        }
        if ((sortedGroupedProducts.length === 0 && matchingStores.length === 0 && searchState.results.length === 0) && !searchState.loading) {
          return (
            <SearchEmptyState
              query={searchState.query}
              didYouMeanSuggestions={didYouMeanSuggestions}
              trendingSearches={trendingSearches}
              popularProducts={popularProducts}
              currencySymbol={currencySymbol}
              onDidYouMeanPress={handleDidYouMeanPress}
              onTrendingPress={handleTrendingSearchPress}
              onClearSearch={handleEmptyClearSearch}
            />
          );
        }
        return (
          <SearchResultsView
            query={searchState.query}
            loading={searchState.loading}
            results={searchState.results}
            groupedProducts={sortedGroupedProducts}
            matchingStores={matchingStores}
            searchSummary={searchSummary}
            currentSort={currentSort}
            activeFilters={activeFilters}
            onResultPress={handleResultPress}
            onSellerPress={handleSellerPress}
            onFilterPress={handleFilterPress}
            onSortChange={handleSortChange}
          />
        );
      default:
        return (
          <CategoriesView
            sections={searchState.sections}
            recentSearches={recentSearches}
            trendingSearches={trendingSearches}
            popularStores={popularStores}
            onCategoryPress={handleCategoryPress}
            onViewAll={handleViewAll}
            onRecentSearchPress={handleRecentSearchPress}
            onRemoveSearch={(id) => {
              searchHistoryService.removeSearch(id).then(() => {
                setRecentSearches(prev => prev.filter(s => s.id !== id));
              }).catch(() => {});
            }}
            onClearAllSearches={() => {
              actions.clearSearchHistory();
              setRecentSearches([]);
            }}
            onTrendingSearchPress={handleTrendingSearchPress}
            onPopularStorePress={handlePopularStorePress}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NUQTA.nileBlue} />
      <SearchHeader
        query={searchState.query}
        inputFocused={inputFocused}
        activeFilterCount={Object.keys(searchState.activeFilters).length}
        initialQuery={initialQuery}
        onBack={handleBack}
        onQueryChange={handleQueryChange}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onSubmitEditing={handleSearch}
        onOpenFilters={handleOpenFilters}
      />
      {searchState.error && searchState.sections.length > 0 && (
        <View
          style={styles.errorBanner}
          accessibilityLabel={`Warning: ${searchState.error}`}
          accessibilityRole="alert"
        >
          <Ionicons name="warning-outline" size={16} color={NUQTA.lightMustard} accessibilityLabel="Warning icon" />
          <Text style={styles.errorBannerText}>{searchState.error}</Text>
        </View>
      )}
      {renderContent()}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={currentFilters}
        categories={searchState.sections.length > 0
          ? searchState.sections.flatMap(s => s.categories).map(c => ({ id: c.id, name: c.name }))
          : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUQTA.linen,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUQTA.linen,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: NUQTA.peachDark,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: NUQTA.nileBlue,
    fontWeight: '500',
  },
});

export default withErrorBoundary(SearchPage, 'Search');
