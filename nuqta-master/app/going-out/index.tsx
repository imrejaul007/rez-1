import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';

import { GoingOutHeader } from '@/components/going-out/GoingOutHeader';
import { CategoryTabs } from '@/components/going-out/CategoryTabs';
import { FilterChips } from '@/components/going-out/FilterChips';
import { ProductGrid } from '@/components/going-out/ProductGrid';
import { CashbackHubSection } from '@/components/going-out/CashbackHubSection';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGoingOutPage } from '@/hooks/useGoingOutPage';
import { GoingOutProduct } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

function GoingOutPage() {
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const { state, actions, handlers } = useGoingOutPage();

  const handleBack = () => {
    goBack('/' as any); // Fallback to home page
  };

   const handleProductPress = (product:GoingOutProduct) => {
     router.push(`/product-page?cardId=${product.id}&cardType=just_for_you&category=${product.categoryId}` as any);
   };
   

  const handleViewAllSection = (sectionId: string) => {
    router.push(`/going-out/section/${sectionId}` as any);
  };

  const handleHideSearch = () => {
    if (handlers.handleHideSearch) {
      handlers.handleHideSearch();
    }
  };

  const handleShowSearch = () => {
    if (handlers.handleShowSearch) {
      handlers.handleShowSearch();
    }
  };

  // Get active filters for FilterChips
  const activeFilters = [
    ...(state.filters?.cashbackRange.min >= 10 ? ['high_cashback'] : []),
    ...(state.filters?.ratings.includes(4) ? ['ratings'] : []),
    ...(state.filters?.availability.includes('in_stock') ? ['in_stock'] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
      
      {/* Header */}
      <GoingOutHeader
        searchQuery={state.searchQuery}
        onSearchChange={handlers.handleSearchChange}
        onSearchSubmit={handlers.handleSearchSubmit}
        onBack={handleBack}
        onHideSearch={handleHideSearch}
        onShowSearch={handleShowSearch}
        showSearchBar={true}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        accessibilityRole="list"
        accessibilityLabel="Going out products list"
      >
          {/* Category Tabs */}
          <CategoryTabs
            categories={state.categories}
            activeCategory={state.activeCategory}
            onCategoryChange={handlers.handleCategoryChange}
          />

          {/* Filter Chips */}
          <FilterChips
            filters={state.filters}
            onFilterChange={handlers.handleFilterChange}
            activeFilters={activeFilters}
          />

          {/* Cashback Hub Sections - Only show when no search query and "All" category is selected */}
          {!state.searchQuery.trim() && state.activeCategory === 'all' && (
            <>
              {state.cashbackHubSections.map((section) => (
                <CashbackHubSection
                  key={section.id}
                  section={section}
                  onProductPress={handleProductPress}
                  onToggleWishlist={handlers.handleToggleWishlist}
                  onViewAll={() => handleViewAllSection(section.id)}
                  wishlist={state.wishlist}
                />
              ))}
              
              {/* Empty state when no sections have products */}
              {state.cashbackHubSections.every(section => !section.products || section.products.length === 0) && (
                <View
                  style={styles.emptyState}
                  accessibilityRole="text"
                  accessibilityLabel="No products available. We're working on adding amazing products for you. Check back soon for the latest deals!"
                >
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="storefront-outline" size={64} color={Colors.border.default} />
                  </View>
                  <ThemedText style={styles.emptyTitle}>No products available</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    We're working on adding amazing products for you.{'\n'}Check back soon for the latest deals!
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* Category Filtered Products - Show when a specific category is selected */}
          {!state.searchQuery.trim() && state.activeCategory !== 'all' && (
            <View style={styles.categoryResults}>
              <View
                style={styles.categoryHeader}
                accessibilityRole="header"
                accessibilityLabel={`${state.categories.find(cat => cat.id === state.activeCategory)?.name || 'Products'}. ${state.filteredProducts.length === 1 ? '1 product found' : `${state.filteredProducts.length} products found`}`}
              >
                <View style={styles.categoryTitleContainer}>
                  <ThemedText style={styles.categoryTitle}>
                    {state.categories.find(cat => cat.id === state.activeCategory)?.name || 'Products'}
                  </ThemedText>
                  <View
                    style={styles.categoryBadge}
                    accessibilityLabel={`${state.filteredProducts.length} items`}
                  >
                    <ThemedText style={styles.categoryBadgeText}>
                      {state.filteredProducts.length}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.categoryCount}>
                  {state.filteredProducts.length === 1 ? '1 product found' : `${state.filteredProducts.length} products found`}
                </ThemedText>
              </View>
              
              {state.filteredProducts.length > 0 ? (
                <View style={styles.productsContainer}>
                  <ProductGrid
                    products={state.filteredProducts}
                    onProductPress={handleProductPress}
                    onToggleWishlist={handlers.handleToggleWishlist}
                    loading={state.loading}
                    onLoadMore={handlers.handleLoadMore}
                    hasMore={state.hasMore}
                    numColumns={2}
                    wishlist={state.wishlist}
                  />
                </View>
              ) : (
                <View
                  style={styles.emptyState}
                  accessibilityRole="text"
                  accessibilityLabel="No products found in this category. Try selecting a different category or browse all products."
                >
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="search-outline" size={64} color={Colors.border.default} />
                  </View>
                  <ThemedText style={styles.emptyTitle}>No products found</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    We couldn't find any products in this category.{'\n'}Try selecting a different category or browse all products.
                  </ThemedText>
                  <View style={styles.emptyActionContainer}>
                    <Pressable
                      style={styles.emptyActionButton}
                      onPress={() => handlers.handleCategoryChange('all')}
                      accessibilityLabel="Browse all products"
                      accessibilityRole="button"
                      accessibilityHint="Double tap to view all available products"
                    >
                      <ThemedText style={styles.emptyActionText}>Browse All Products</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Search Results - Show when there's a search query */}
          {state.searchQuery.trim() && (
            <>
              <View
                style={styles.searchResultsHeader}
                accessibilityRole="header"
                accessibilityLabel={
                  state.searchQuery.trim().length < 2
                    ? "Search Results. Type at least 2 characters to search"
                    : state.loading
                    ? "Search Results. Searching"
                    : `Search Results. ${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? 'product' : 'products'} found for ${state.searchQuery}`
                }
              >
                <View style={styles.searchResultsTitleContainer}>
                  <Ionicons name="search" size={20} color={Colors.brand.purpleLight} />
                  <ThemedText style={styles.searchResultsTitle}>
                    Search Results
                  </ThemedText>
                </View>
                {state.searchQuery.trim().length < 2 ? (
                  <ThemedText style={styles.searchHint}>
                    Type at least 2 characters to search...
                  </ThemedText>
                ) : (
                  <>
                    <ThemedText style={styles.searchResultsCount}>
                      {state.loading ? 'Searching...' : `${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? 'product' : 'products'} found`}
                    </ThemedText>
                    <ThemedText style={styles.searchQueryText}>
                      for "{state.searchQuery}"
                    </ThemedText>
                  </>
                )}
              </View>

              {state.searchQuery.trim().length < 2 ? (
                <View
                  style={styles.searchHintContainer}
                  accessibilityRole="text"
                  accessibilityLabel="Keep typing. Enter at least 2 characters to start searching"
                >
                  <Ionicons name="information-circle-outline" size={48} color={Colors.border.default} />
                  <ThemedText style={styles.searchHintTitle}>Keep typing...</ThemedText>
                  <ThemedText style={styles.searchHintText}>
                    Enter at least 2 characters to start searching
                  </ThemedText>
                </View>
              ) : state.loading ? (
                <View
                  style={styles.loadingContainer}
                  accessibilityRole="progressbar"
                  accessibilityLabel="Searching products"
                  accessibilityValue={{ text: "Loading" }}
                >
                  <ActivityIndicator size="large" color={Colors.brand.purpleLight} />
                  <ThemedText style={styles.loadingText}>Searching products...</ThemedText>
                </View>
              ) : state.filteredProducts.length > 0 ? (
                <View style={styles.searchResultsContainer}>
                  <ProductGrid
                    products={state.filteredProducts}
                    loading={false}
                    onProductPress={handleProductPress}
                    onToggleWishlist={handlers.handleToggleWishlist}
                    onLoadMore={handlers.handleLoadMore}
                    hasMore={state.hasMore}
                    numColumns={2}
                    wishlist={state.wishlist}
                    showHeader={false}
                  />
                </View>
              ) : (
                <View
                  style={styles.searchEmptyState}
                  accessibilityRole="text"
                  accessibilityLabel={`No results found for ${state.searchQuery}. Try different keywords or browse our categories`}
                >
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="search-outline" size={80} color={Colors.border.default} />
                  </View>
                  <ThemedText style={styles.emptyTitle}>No results found</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    We couldn't find any products matching "{state.searchQuery}"
                  </ThemedText>
                  <ThemedText style={styles.emptySuggestion}>
                    Try different keywords or browse our categories
                  </ThemedText>
                  <View style={styles.emptyActionContainer}>
                    <Pressable
                      style={styles.emptyActionButton}
                      onPress={() => handlers.handleSearchChange('')}
                      accessibilityLabel="Clear search"
                      accessibilityRole="button"
                      accessibilityHint="Double tap to clear search and view all products"
                    >
                      <ThemedText style={styles.emptyActionText}>Clear Search</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}

          {/* All Products Grid - Show when no search query and there are products */}
          {!state.searchQuery.trim() && state.filteredProducts.length > 0 && (
            <View style={styles.allProductsContainer}>
              <ProductGrid
                products={state.filteredProducts}
                loading={state.loading}
                onProductPress={handleProductPress}
                onToggleWishlist={handlers.handleToggleWishlist}
                onLoadMore={handlers.handleLoadMore}
                hasMore={state.hasMore}
                numColumns={2}
                wishlist={state.wishlist}
              />
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    marginTop: Spacing.lg,
    borderRadius: 28,
    marginHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  allProductsContainer: {
    backgroundColor: Colors.background.primary,
    marginTop: 28,
    paddingTop: Spacing.xl,
    borderRadius: 28,
    marginHorizontal: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  categoryResults: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 28,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    borderRadius: 28,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  categoryHeader: {
    marginBottom: 28,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.8,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginLeft: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  categoryBadgeText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryCount: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  productsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['3xl'],
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  emptyActionContainer: {
    width: '100%',
  },
  emptyActionButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purpleLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  emptyActionText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  searchResultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  searchResultsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  searchHint: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  searchResultsCount: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
    marginBottom: 4,
  },
  searchQueryText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  searchEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing['3xl'],
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    marginHorizontal: Spacing.base,
  },
  emptySuggestion: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  searchHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['3xl'],
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    marginHorizontal: Spacing.base,
  },
  searchHintTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  searchHintText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
export default withErrorBoundary(GoingOutPage, 'GoingOutIndex');
