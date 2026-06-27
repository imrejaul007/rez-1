// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// StoreListPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  StatusBar,
  Pressable,
  Modal,
  Text,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SearchFilters, StoreResult, ProductItem, SearchResults, SearchError, AvailableFilters } from '@/types/store-search';
import {
  defaultSearchFilters
} from '@/utils/storeTransformers';
import { getSubSubCategories, SubSubCategory } from '@/config/subSubCategoryConfig';
import SearchHeader from '@/components/store-search/SearchHeader';
import FilterChips from '@/components/store-search/FilterChips';
import StoreCard from '@/components/store-search/StoreCard';
import StoreListSkeleton from '@/components/store-search/StoreListSkeleton';
import EmptySearchResults from '@/components/store-search/EmptySearchResults';
import ErrorState from '@/components/store-search/ErrorState';
import { useStoreSearch } from '@/hooks/useStoreSearch';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useDebounce } from '@/hooks/useDebounce';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const StoreListPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Parse sortBy from URL params (for Quick Buttons: Near me, Top rated)
  const sortByFromParams = (params.sortBy as string) as 'rating' | 'distance' | 'name' | 'newest' | undefined;
  const validSortBy = ['rating', 'distance', 'name', 'newest'].includes(sortByFromParams || '')
    ? sortByFromParams
    : 'rating';

  // Local state for search and filters
  const [searchQuery, setSearchQuery] = useState((params.query as string) || (params.search as string) || '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultSearchFilters);
  const [nuqtaPayFilter, setNuqtaPayFilter] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortByLocal] = useState<'rating' | 'distance' | 'name' | 'newest'>(validSortBy!);
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    categories: [],
    genders: [],
    priceRanges: [],
    paymentMethods: [],
  });

  // Use search hook with category from params
  const categoryFromParams = (params.category as string) || 'all';
  const parentCategorySlug = (params.parentCategory as string) || '';

  // Parse subcategories from params
  const subcategoriesParam = params.subcategories as string;
  const subcategories = useMemo(() => {
    try {
      return subcategoriesParam ? JSON.parse(subcategoriesParam) : [];
    } catch {
      return [];
    }
  }, [subcategoriesParam]);

  // Subcategory selection state
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);

  // Sub-sub-category (cuisine/item type) filter state
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string>('all');

  // Get available sub-sub-categories based on current category slug
  const availableSubSubCategories = useMemo((): SubSubCategory[] => {
    // The category param is now the subcategory slug (e.g., 'cafes', 'qsr-fast-food')
    return getSubSubCategories(categoryFromParams);
  }, [categoryFromParams]);

  // Always use parent category for fetching stores
  // Subcategory is used to filter products within stores
  const effectiveCategory = categoryFromParams;

  const {
    stores,
    loading: isLoading,
    refreshing,
    error: errorMessage,
    fetchStores,
    refreshStores,
    loadMoreStores,
    hasMore,
    setSortBy: setSortByInHook,
    clearError
  } = useStoreSearch({
    category: effectiveCategory,
    searchQuery: debouncedSearchQuery,
    autoFetch: true,
    sortBy,
  });

  // Derive available filters from fetched stores
  useEffect(() => {
    if (stores.length > 0) {
      // Extract unique payment methods from stores
      const paymentMethodsSet = new Set<string>();
      stores.forEach(store => {
        if (store.operationalInfo?.paymentMethods) {
          store.operationalInfo.paymentMethods.forEach(method => paymentMethodsSet.add(method));
        }
      });

      const derivedFilters: AvailableFilters = {
        categories: [],
        genders: [
          { id: 'men', label: 'Men', value: 'men', count: 0, icon: 'male-outline' },
          { id: 'women', label: 'Women', value: 'women', count: 0, icon: 'female-outline' },
          { id: 'unisex', label: 'Unisex', value: 'unisex', count: 0, icon: 'people-outline' },
          { id: 'kids', label: 'Kids', value: 'kids', count: 0, icon: 'child-outline' },
        ],
        priceRanges: [
          { id: 'under-500', label: `Under ${currencySymbol}500`, min: 0, max: 500 },
          { id: '500-1000', label: `${currencySymbol}500 - ${currencySymbol}1000`, min: 500, max: 1000 },
          { id: '1000-2000', label: `${currencySymbol}1000 - ${currencySymbol}2000`, min: 1000, max: 2000 },
          { id: '2000-plus', label: `Above ${currencySymbol}2000`, min: 2000, max: 999999 },
        ],
        paymentMethods: Array.from(paymentMethodsSet).map((method, index) => ({
          id: method.toLowerCase().replace(/\s+/g, '-'),
          label: method,
          value: method.toLowerCase().replace(/\s+/g, '-'),
          count: stores.filter(s => s.operationalInfo?.paymentMethods?.includes(method)).length,
          icon: method.toLowerCase().includes('wallet') ? 'wallet-outline' :
                method.toLowerCase().includes('cod') || method.toLowerCase().includes('cash') ? 'cash-outline' :
                'card-outline',
        })),
      };

      setAvailableFilters(derivedFilters);
    }
  }, [stores]);

  // Convert stores to SearchResults format
  // Filter products by selected subcategory and sub-sub-category if chosen
  const searchResults: SearchResults | null = {
    query: searchQuery,
    totalResults: stores.length,
    totalStores: stores.length,
    stores: stores.map((store, storeIndex) => {
      // Filter products by subcategory if selected
      let filteredProducts = store.products || [];
      if (selectedSubcategory !== 'all' && filteredProducts.length > 0) {
        filteredProducts = filteredProducts.filter((product: any) =>
          product.subCategory === selectedSubcategory ||
          product.subCategory?._id === selectedSubcategory ||
          product.subcategory === selectedSubcategory
        );
      }

      // Filter products by sub-sub-category (cuisine/item type) if selected
      if (selectedSubSubCategory !== 'all' && filteredProducts.length > 0) {
        // Get the display name from config for the selected slug
        const selectedSubSubConfig = availableSubSubCategories.find(s => s.slug === selectedSubSubCategory);
        const selectedSubSubName = selectedSubSubConfig?.name || '';

        filteredProducts = filteredProducts.filter((product: any) => {
          const productSubSub = product.subSubCategory || '';

          // Match by exact slug
          if (productSubSub === selectedSubSubCategory) return true;

          // Match by exact name from config
          if (selectedSubSubName && productSubSub === selectedSubSubName) return true;

          // Match by partial name (case-insensitive)
          if (selectedSubSubName && productSubSub.toLowerCase().includes(selectedSubSubName.toLowerCase())) return true;
          if (productSubSub.toLowerCase().includes(selectedSubSubCategory.toLowerCase())) return true;

          // Match slug converted to words (e.g., 'espresso-drinks' -> 'espresso drinks')
          const slugAsWords = selectedSubSubCategory.replace(/-/g, ' ');
          if (productSubSub.toLowerCase().includes(slugAsWords)) return true;

          // Also check product tags for matching sub-sub-category
          if (product.tags && Array.isArray(product.tags)) {
            return product.tags.some((tag: string) =>
              tag.toLowerCase().includes(slugAsWords) ||
              (selectedSubSubName && tag.toLowerCase().includes(selectedSubSubName.toLowerCase()))
            );
          }

          return false;
        });
      }

      return {
      storeId: store._id,
      storeName: store.name || 'Unnamed Store',
      rating: store.ratings?.average || 0,
      reviewCount: store.ratings?.count || 0,
      distance: store.distance !== undefined ? store.distance : null,
      location: store.location?.city || store.location?.address || 'Location not available',
      isOpen: store.isActive !== false, // Default to true if not specified
      hasOnlineDelivery: true, // Assume online delivery is available
      hasFreeShipping: store.operationalInfo?.freeDeliveryAbove ? true : false,
      estimatedDelivery: store.operationalInfo?.deliveryTime || null,
      storeImage: Array.isArray(store.banner) ? store.banner[0] : store.banner || null, // Banner for main display (use first if array)
      logo: store.logo || null, // Logo for overlay
      description: store.description || '',
      deliveryCategories: store.deliveryCategories || {},
      hasNuqtaPay: (store as any).paymentSettings?.acceptRezCoins || store.operationalInfo?.acceptsWalletPayment || false,
      cashbackPercent: (store as any).rewardRules?.baseCashbackPercent || 0,
      products: filteredProducts.map((product: any) => {
        // Handle both old and new product data structures
        // New structure from backend transformation: { price: number, originalPrice: number, rating: number }
        // Old structure: { price: { current, original }, rating: { value, count } }
        const isNewStructure = typeof product.price === 'number';

        // Safe price extraction with fallback
        const getPrice = () => {
          if (isNewStructure) {
            return typeof product.price === 'number' ? product.price : 0;
          }
          return typeof product.price?.current === 'number' ? product.price.current : 0;
        };

        // Safe rating extraction with fallback
        const getRating = () => {
          if (isNewStructure) {
            return typeof product.rating === 'number' ? product.rating : 0;
          }
          if (typeof product.rating?.value === 'number') {
            return product.rating.value;
          }
          if (typeof product.rating?.value === 'string') {
            const parsed = parseFloat(product.rating.value);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        const transformedProduct = {
          productId: product._id || product.productId || '',
          name: product.name || product.title || '',
          description: product.description || '',
          price: getPrice(),
          originalPrice: isNewStructure ? (product.originalPrice || null) : (product.price?.original || null),
          discountPercentage: isNewStructure ? (product.discountPercentage || null) : (product.price?.discount || null),
          imageUrl: product.imageUrl || product.image,
          imageAlt: product.imageAlt || product.name || product.title || 'Product image',
          hasRezPay: product.hasRezPay !== undefined ? product.hasRezPay : false,
          inStock: product.inStock !== undefined ? product.inStock : (product.inventory?.isAvailable !== undefined ? product.inventory.isAvailable : true),
          category: product.category || '',
          subcategory: product.subcategory || '',
          brand: product.brand || '',
          rating: getRating(),
          reviewCount: isNewStructure ? (product.reviewCount || 0) : (product.rating?.count || 0),
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
          tags: Array.isArray(product.tags) ? product.tags : [],
        };

        return transformedProduct;
      }),
      totalProductsFound: filteredProducts.length,
    };
    }),
    filters: availableFilters,
    pagination: {
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
    suggestions: [],
  };

  // Filter stores by nuqtaPay if filter is active
  const storeListData = useMemo(() => {
    const allStores = searchResults?.stores || [];
    if (!nuqtaPayFilter) return allStores;
    return allStores.filter(store => store.hasNuqtaPay);
  }, [searchResults?.stores, nuqtaPayFilter]);

  const error = errorMessage ? {
    code: 'SERVER_ERROR' as const,
    message: errorMessage,
    timestamp: new Date(),
    recoverable: true,
  } : null;

  // Screen dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Handle search query change
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setSearchFilters(newFilters);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshStores();
  }, [refreshStores]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSearchFilters(defaultSearchFilters);
  }, []);

  // Handle retry
  const handleRetry = useCallback(async () => {
    clearError();
    await fetchStores(1);
  }, [clearError, fetchStores]);

  // Check if filters are active
  const hasActiveFilters: boolean =
    searchFilters.categories.length > 0 ||
    searchFilters.gender.length > 0 ||
    !!searchFilters.priceRange ||
    !!searchFilters.distance ||
    (searchFilters.storeStatus && searchFilters.storeStatus.length > 0) ||
    false;

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  // Handle product selection
  const handleProductSelect = useCallback((product: ProductItem, store: StoreResult) => {
    // Navigate to ProductPage (comprehensive product page)
    // ✅ FIX: Use 'id' parameter instead of 'cardId' for consistency
    router.push({
      pathname: '/product-page',
      params: {
        id: product.productId,  // ✅ Changed from cardId to id
        cardType: 'product',
        storeId: store.storeId,
      },
    } as any);
  }, [router]);

  // Handle store selection
  const handleStoreSelect = useCallback((store: StoreResult) => {
    // Navigate to store page
    router.push(`/MainStorePage?storeId=${store.storeId}`);
  }, [router]);

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: 'rating' | 'distance' | 'name' | 'newest') => {
    setSortByLocal(newSortBy);
    setSortByInHook(newSortBy);
    setShowSortModal(false);
  }, [setSortByInHook]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await loadMoreStores();
    }
  }, [isLoading, hasMore, loadMoreStores]);

  // Create styles based on screen dimensions
  const styles = createStyles(screenData);

  const renderStoreListItem = useCallback(({ item: store }: { item: StoreResult }) => (
    <View style={styles.resultCardWrapper}>
      <StoreCard
        store={store}
        onStoreSelect={handleStoreSelect}
        onProductSelect={handleProductSelect}
        showDistance={true}
        maxProducts={4}
      />
    </View>
  ), [handleStoreSelect, handleProductSelect, styles.resultCardWrapper]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.green} />

        {/* Fixed Header with Gradient - DOES NOT SCROLL */}
        <View style={styles.headerContainer}>
          {/* Search Header */}
          <SearchHeader
            query={searchQuery}
            onQueryChange={handleSearchQueryChange}
            onBack={handleBack}
            isLoading={isLoading}
            title={params.title ? decodeURIComponent(params.title as string) : undefined}
            rightElement={
              <Pressable
                style={styles.headerSortButton}
                onPress={() => setShowSortModal(true)}
               
              >
                <Ionicons name="swap-vertical" size={16} color={colors.background.primary} />
                <Text style={styles.headerSortButtonText}>
                  {sortBy === 'rating' ? 'Rating' :
                   sortBy === 'distance' ? 'Distance' :
                   sortBy === 'name' ? 'Name' : 'Newest'}
                </Text>
              </Pressable>
            }
          />

          {/* Results count summary */}
          {!isLoading && storeListData.length > 0 && (
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsSummaryText}>
                {storeListData.length} store{storeListData.length !== 1 ? 's' : ''} found
              </Text>
              {nuqtaPayFilter && (
                <View style={styles.activeFilterIndicator}>
                  <View style={styles.activeFilterDot} />
                  <Text style={styles.activeFilterText}>{BRAND.PAY_NAME}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Sub-Sub-Category Filter Chips + Sort Button Row */}
        {availableSubSubCategories.length > 0 && (
          <View style={styles.subSubCategoryContainer}>
            <View style={styles.subSubCategoryRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subSubCategoryScrollContent}
                style={styles.subSubCategoryScrollView}
              >
                {/* "All" chip */}
                <Pressable
                  style={[
                    styles.subSubCategoryChip,
                    selectedSubSubCategory === 'all' && styles.subSubCategoryChipActive
                  ]}
                  onPress={() => setSelectedSubSubCategory('all')}
                 
                >
                  <Text style={[
                    styles.subSubCategoryChipText,
                    selectedSubSubCategory === 'all' && styles.subSubCategoryChipTextActive
                  ]}>
                    All
                  </Text>
                </Pressable>

                {/* Sub-sub-category chips */}
                {availableSubSubCategories.map((subSub) => (
                  <Pressable
                    key={subSub.slug}
                    style={[
                      styles.subSubCategoryChip,
                      selectedSubSubCategory === subSub.slug && styles.subSubCategoryChipActive
                    ]}
                    onPress={() => setSelectedSubSubCategory(subSub.slug)}
                   
                  >
                    {subSub.icon && (
                      <Ionicons
                        name={(subSub.icon + '-outline') as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={selectedSubSubCategory === subSub.slug ? Colors.text.inverse : Colors.text.tertiary}
                        style={styles.subSubCategoryChipIcon}
                      />
                    )}
                    <Text style={[
                      styles.subSubCategoryChipText,
                      selectedSubSubCategory === subSub.slug && styles.subSubCategoryChipTextActive
                    ]}>
                      {subSub.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Filter Chips - only visible for fashion/beauty/fitness categories */}
        <FilterChips
          filters={searchFilters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          parentCategorySlug={parentCategorySlug}
        />

        {/* Subcategory Filter Dropdown - Only show if subcategories exist */}
        {subcategories.length > 0 && (
          <View style={styles.subcategoryContainer}>
            <Pressable
              style={styles.subcategoryDropdown}
              onPress={() => setShowSubcategoryModal(true)}
             
            >
              <Text style={styles.subcategoryLabel}>
                {selectedSubcategory === 'all'
                  ? 'All Subcategories'
                  : (() => {
                      const found = subcategories.find((s: any) => s._id === selectedSubcategory);
                      if (!found) return 'All';
                      return typeof found.name === 'string' ? found.name : 'Subcategory';
                    })()}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.brand.green} />
            </Pressable>
          </View>
        )}

        {/* Quick Filter Chips Row */}
        <View style={styles.quickFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilterScrollContent}
          >
            {/* Rez Pay filter */}
            <Pressable
              style={[styles.quickFilterChip, nuqtaPayFilter && styles.quickFilterChipActive]}
              onPress={() => setNuqtaPayFilter(prev => !prev)}
             
            >
              <CachedImage
                source={BRAND.COIN_IMAGE}
                style={{ width: 15, height: 15, marginRight: 5 }}
              />
              <Text style={[styles.quickFilterChipText, nuqtaPayFilter && styles.quickFilterChipTextActive]}>
                {BRAND.PAY_NAME}
              </Text>
            </Pressable>

            {/* Nearby filter */}
            <Pressable
              style={[styles.quickFilterChip, sortBy === 'distance' && styles.quickFilterChipActive]}
              onPress={() => handleSortChange('distance')}
             
            >
              <Ionicons name="navigate" size={13} color={sortBy === 'distance' ? colors.background.primary : colors.brand.green} style={{ marginRight: 5 }} />
              <Text style={[styles.quickFilterChipText, sortBy === 'distance' && styles.quickFilterChipTextActive]}>
                Nearby
              </Text>
            </Pressable>

            {/* Top Rated filter */}
            <Pressable
              style={[styles.quickFilterChip, sortBy === 'rating' && styles.quickFilterChipActive]}
              onPress={() => handleSortChange('rating')}
             
            >
              <Ionicons name="star" size={13} color={sortBy === 'rating' ? colors.background.primary : '#FFB800'} style={{ marginRight: 5 }} />
              <Text style={[styles.quickFilterChipText, sortBy === 'rating' && styles.quickFilterChipTextActive]}>
                Top Rated
              </Text>
            </Pressable>

            {/* Newest filter */}
            <Pressable
              style={[styles.quickFilterChip, sortBy === 'newest' && styles.quickFilterChipActive]}
              onPress={() => handleSortChange('newest')}
             
            >
              <Ionicons name="sparkles" size={13} color={sortBy === 'newest' ? colors.background.primary : colors.brand.purpleLight} style={{ marginRight: 5 }} />
              <Text style={[styles.quickFilterChipText, sortBy === 'newest' && styles.quickFilterChipTextActive]}>
                Newest
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* FlashList Content Area */}
        <FlashList
          data={storeListData}
          keyExtractor={(item) => item.storeId}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.green}
              colors={[colors.brand.green]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          estimatedItemSize={280}
          renderItem={renderStoreListItem}
          ListEmptyComponent={
            <>
              {/* Loading State */}
              {isLoading && stores.length === 0 && (
                <View style={styles.section}>
                  <StoreListSkeleton itemCount={3} />
                </View>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <View style={styles.section}>
                  <ErrorState
                    error={error}
                    onRetry={handleRetry}
                    onGoBack={handleBack}
                    showBackButton={false}
                  />
                </View>
              )}

              {/* Empty State */}
              {!isLoading && !error && (
                <View style={styles.section}>
                  <EmptySearchResults
                    searchQuery={searchQuery}
                    categoryName={params.title ? decodeURIComponent(params.title as string) : undefined}
                    hasFilters={hasActiveFilters}
                    onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
                    onTryAgain={handleRetry}
                    suggestions={searchResults?.suggestions}
                    onSuggestionPress={setSearchQuery}
                  />
                </View>
              )}
            </>
          }
          ListFooterComponent={
            hasMore && !isLoading ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.brand.green} />
                <Text style={styles.loadingMoreText}>Loading more stores...</Text>
              </View>
            ) : null
          }
        />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingVertical: Spacing.sm }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border.default }} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <Pressable onPress={() => setShowSortModal(false)}>
                <Ionicons name="close-circle" size={28} color={Colors.border.default} />
              </Pressable>
            </View>

            {([
              { key: 'rating' as const, label: 'Rating (High to Low)', icon: 'star' as const, color: '#FFB800' },
              { key: 'distance' as const, label: 'Distance (Near to Far)', icon: 'navigate' as const, color: colors.brand.green },
              { key: 'name' as const, label: 'Name (A-Z)', icon: 'text' as const, color: colors.brand.indigo },
              { key: 'newest' as const, label: 'Newest First', icon: 'sparkles' as const, color: colors.brand.purpleLight },
            ]).map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.sortOptionActive,
                ]}
                onPress={() => handleSortChange(option.key)}
               
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: sortBy === option.key ? option.color + '15' : Colors.background.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={option.icon} size={16} color={sortBy === option.key ? option.color : Colors.text.tertiary} />
                  </View>
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.sortOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.key && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.brand.green} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Subcategory Modal */}
      <Modal
        visible={showSubcategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubcategoryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
         
          onPress={() => setShowSubcategoryModal(false)}
        >
          <View style={styles.sortModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subcategory</Text>
              <Pressable onPress={() => setShowSubcategoryModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>

            {/* All Subcategories Option */}
            <Pressable
              style={[
                styles.sortOption,
                selectedSubcategory === 'all' && styles.sortOptionActive
              ]}
              onPress={() => {
                setSelectedSubcategory('all');
                setShowSubcategoryModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                selectedSubcategory === 'all' && styles.sortOptionTextActive
              ]}>
                All Subcategories
              </Text>
              {selectedSubcategory === 'all' && (
                <Ionicons name="checkmark" size={20} color={colors.brand.green} />
              )}
            </Pressable>

            {/* Individual Subcategory Options */}
            {subcategories.map((sub: any) => {
              // Safely extract string values
              const subId = typeof sub._id === 'string' ? sub._id : String(sub._id || '');
              const subName = typeof sub.name === 'string' ? sub.name : 'Subcategory';

              return (
                <Pressable
                  key={subId}
                  style={[
                    styles.sortOption,
                    selectedSubcategory === subId && styles.sortOptionActive
                  ]}
                  onPress={() => {
                    setSelectedSubcategory(subId);
                    setShowSubcategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    selectedSubcategory === subId && styles.sortOptionTextActive
                  ]}>
                    {subName}
                  </Text>
                  {selectedSubcategory === subId && (
                    <Ionicons name="checkmark" size={20} color={colors.brand.green} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      </SafeAreaView>
    </View>
  );
};

const createStyles = (screenData: { width: number; height: number }) => {
  const { width } = screenData;
  const isTablet = width > 768;
  const horizontalPadding = isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.secondary,
    },
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    headerContainer: {
      backgroundColor: 'transparent',
      paddingBottom: 0,
      zIndex: 10,
    },
    resultsSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: horizontalPadding,
      paddingVertical: Spacing.sm,
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    },
    resultsSummaryText: {
      ...Typography.bodySmall,
      fontSize: 13,
      fontWeight: '600',
      color: Colors.text.tertiary,
    },
    activeFilterIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    activeFilterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFB800',
    },
    activeFilterText: {
      ...Typography.caption,
      fontWeight: '600',
      color: Colors.warning,
    },
    content: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentContainer: {
      paddingHorizontal: horizontalPadding,
      paddingTop: Spacing.md,
      paddingBottom: 100,
    },
    section: {
      marginTop: Spacing.md,
      backgroundColor: 'transparent',
    },
    resultsContainer: {
      paddingTop: 4,
      paddingBottom: 4,
    },
    resultCardWrapper: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    filtersContainer: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    filterChipsWrapper: {
      flex: 1,
      minWidth: 0,
    },
    sortButton: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.background.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.xl,
      gap: Spacing.xs,
      borderWidth: 1.5,
      borderColor: 'rgba(0, 192, 106, 0.2)',
      shadowColor: colors.brand.green,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    sortButtonText: {
      ...Typography.bodySmall,
      fontSize: 13,
      fontWeight: '700',
      color: colors.brand.green,
      letterSpacing: 0.1,
    },
    headerSortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      borderRadius: 18,
      gap: 5,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    headerSortButtonText: {
      ...Typography.bodySmall,
      fontWeight: '700',
      color: Colors.text.inverse,
    },
    quickFilterContainer: {
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    },
    quickFilterScrollContent: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: Spacing.sm + 2,
      gap: Spacing.sm,
      flexDirection: 'row',
    },
    quickFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md + 2,
      paddingVertical: Spacing.sm,
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius['2xl'] - 2,
      borderWidth: 1.5,
      borderColor: Colors.border.default,
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    quickFilterChipActive: {
      backgroundColor: colors.brand.green,
      borderColor: colors.brand.green,
      shadowColor: colors.brand.green,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    quickFilterChipText: {
      ...Typography.bodySmall,
      fontSize: 12.5,
      fontWeight: '600',
      color: Colors.text.secondary,
    },
    quickFilterChipTextActive: {
      color: Colors.text.inverse,
      fontWeight: '700',
    },
    loadingMoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      gap: Spacing.sm + 2,
    },
    loadingMoreText: {
      ...Typography.bodySmall,
      fontSize: 13,
      fontWeight: '500',
      color: Colors.text.tertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    sortModalContent: {
      backgroundColor: Colors.background.primary,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: Spacing.sm,
      paddingBottom: 36,
      paddingHorizontal: Spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      paddingTop: Spacing.base,
    },
    modalTitle: {
      ...Typography.h3,
      fontWeight: '800',
      color: Colors.text.primary,
      letterSpacing: -0.3,
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.base,
      borderRadius: BorderRadius.md + 2,
      marginBottom: 6,
      backgroundColor: Colors.background.secondary,
    },
    sortOptionActive: {
      backgroundColor: Colors.successScale[50],
      borderWidth: 1,
      borderColor: 'rgba(0, 192, 106, 0.15)',
    },
    sortOptionText: {
      ...Typography.body,
      fontSize: 15,
      fontWeight: '500',
      color: Colors.text.secondary,
    },
    sortOptionTextActive: {
      color: colors.successScale[700],
      fontWeight: '700',
    },
    subcategoryContainer: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: Spacing.sm,
      backgroundColor: Colors.background.secondary,
    },
    subcategoryDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.background.primary,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md + 2,
      borderWidth: 1.5,
      borderColor: 'rgba(0, 192, 106, 0.15)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    subcategoryLabel: {
      ...Typography.body,
      fontWeight: '600',
      color: Colors.text.secondary,
    },
    subSubCategoryContainer: {
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    },
    subSubCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    subSubCategoryScrollView: {
      flex: 1,
    },
    subSubCategoryScrollContent: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: Spacing.sm + 2,
      gap: Spacing.sm,
      flexDirection: 'row',
    },
    subSubCategoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md + 2,
      paddingVertical: Spacing.sm,
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius['2xl'] - 2,
      borderWidth: 1.5,
      borderColor: Colors.border.default,
    },
    subSubCategoryChipActive: {
      backgroundColor: colors.brand.green,
      borderColor: colors.brand.green,
    },
    subSubCategoryChipIcon: {
      marginRight: 6,
    },
    subSubCategoryChipText: {
      ...Typography.bodySmall,
      fontSize: 13,
      fontWeight: '500',
      color: Colors.text.secondary,
    },
    subSubCategoryChipTextActive: {
      color: Colors.text.inverse,
      fontWeight: '600',
    },
  });
};

export default withErrorBoundary(StoreListPage, 'StoreListPage');
