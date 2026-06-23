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

import { HomeDeliveryHeader } from '@/components/home-delivery/HomeDeliveryHeader';
import { CategoryTabs } from '@/components/home-delivery/CategoryTabs';
import { FilterChips } from '@/components/home-delivery/FilterChips';
import { ProductSection } from '@/components/home-delivery/ProductSection';
import { ProductGrid } from '@/components/home-delivery/ProductGrid';
import { ThemedText } from '@/components/ThemedText';
import { useHomeDeliveryPage } from '@/hooks/useHomeDeliveryPage';
import { HomeDeliveryProduct } from '@/types/home-delivery.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

function HomeDeliveryPage() {
  const router = useRouter();
  const { state, actions, handlers } = useHomeDeliveryPage();

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleProductPress = (product: HomeDeliveryProduct) => {
    router.push(`/product-page?cardId=${product.id}&cardType=just_for_you&category=${product.categoryId}` as any);
  };

  const handleViewAllSection = (sectionId: string) => {
    router.push(`/home-delivery/section/${sectionId}` as any);
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
    ...state.filters.shipping.map(s => `shipping_${s}`),
    ...state.filters.ratings.map(r => `rating_${r}`),
    ...state.filters.deliveryTime.map(d => `delivery_${d}`),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
      
      {/* Header */}
      <HomeDeliveryHeader
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
        accessibilityLabel="Home delivery products list"
        accessibilityRole="scrollbar"
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

          {/* Product Sections - Only show when no search query and "All" category is selected */}
          {!state.searchQuery.trim() && state.activeCategory === 'all' && (
            <>
              {state.sections.map((section) => (
                <ProductSection
                  key={section.id}
                  section={section}
                  onProductPress={handleProductPress}
                  onViewAll={() => handleViewAllSection(section.id)}
                />
              ))}
            </>
          )}

          {/* Category Filtered Products - Show when a specific category is selected */}
          {!state.searchQuery.trim() && state.activeCategory !== 'all' && (
            <>
              {/* Simple Category Heading */}
              <View
                style={styles.simpleCategoryHeader}
                accessibilityRole="header"
                accessibilityLabel={`${state.categories.find(cat => cat.id === state.activeCategory)?.name || 'Products'} category`}
              >
                <ThemedText style={styles.simpleCategoryTitle}>
                  {state.categories.find(cat => cat.id === state.activeCategory)?.name || 'Products'}
                </ThemedText>
              </View>

              {state.filteredProducts.length > 0 ? (
                <View style={styles.productsContainer}>
                  <ProductGrid
                    products={state.filteredProducts}
                    onProductPress={handleProductPress}
                    loading={state.loading}
                    onLoadMore={handlers.handleLoadMore}
                    hasMore={state.hasMore}
                    numColumns={2}
                    showHeader={false}
                  />
                </View>
              ) : (
                <View
                  style={styles.emptyState}
                  accessibilityRole="alert"
                  accessibilityLabel="No products found in this category"
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
            </>
          )}

          {/* Search Results - Show when there's a search query */}
          {state.searchQuery.trim() && (
            <>
              {/* Search Results Header */}
              <View
                style={styles.searchResultsHeader}
                accessibilityRole="header"
                accessibilityLabel={state.searchQuery.trim().length < 2
                  ? "Search results. Type at least 2 characters to search"
                  : state.loading
                    ? "Searching for products"
                    : `Search results for ${state.searchQuery}. ${state.filteredProducts.length} ${state.filteredProducts.length === 1 ? 'product' : 'products'} found`}
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

              {/* Search Results Grid */}
              {state.searchQuery.trim().length < 2 ? (
                // Show hint message for short queries
                <View
                  style={styles.searchHintContainer}
                  accessibilityRole="alert"
                  accessibilityLabel="Search hint. Enter at least 2 characters to start searching"
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
                  accessibilityLabel="Searching for products"
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
                    onLoadMore={handlers.handleLoadMore}
                    hasMore={state.hasMore}
                    numColumns={2}
                    showHeader={false}
                  />
                </View>
              ) : (
                <View
                  style={styles.searchEmptyState}
                  accessibilityRole="alert"
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
    marginTop: Spacing.base,
    borderRadius: BorderRadius['2xl'],
    marginHorizontal: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  allProductsContainer: {
    backgroundColor: Colors.background.primary,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  simpleCategoryHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
  },
  simpleCategoryTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  categoryResults: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  categoryHeader: {
    marginBottom: Spacing.xl,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    marginLeft: Spacing.md,
  },
  categoryBadgeText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '700',
  },
  categoryCount: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '500',
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
    paddingHorizontal: 40,
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
        shadowColor: Colors.brand.purpleLight,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    marginTop: Spacing.xs,
  },
  searchResultsCount: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
    marginBottom: Spacing.xs,
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    paddingHorizontal: 40,
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    paddingHorizontal: 40,
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
export default withErrorBoundary(HomeDeliveryPage, 'HomeDelivery');
