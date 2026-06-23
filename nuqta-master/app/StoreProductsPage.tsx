// StoreProductsPage.tsx
// Displays all products for a specific store in an Amazon-style grid layout.
// Orchestrates SearchHeader, FilterPanel, ActiveFiltersBar, and ProductGrid components.

import React, { useEffect, useCallback, useMemo} from 'react';
import { Stack } from 'expo-router';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Text,
  Pressable
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useCartState } from '@/stores/selectors';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { triggerImpact } from '@/utils/haptics';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import analyticsService from '@/services/analyticsService';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';

// Extracted components and hook
import { useStoreProductsPage } from '@/hooks/useStoreProductsPage';
import { SearchHeader, FilterPanel, ActiveFiltersBar, ProductGrid } from '@/components/store-products';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StoreProductsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const storeId = params.storeId as string;
  const storeName = params.storeName as string | undefined;

  // ─── Data hook ──────────────────────────────────────────────────────────

  const data = useStoreProductsPage(storeId, storeName, pathname);

  // ─── Filter modal state ─────────────────────────────────────────────────

  const [showFilters, setShowFilters] = React.useState(false);

  // ─── Cart state ─────────────────────────────────────────────────────────

  const cartState = useCartState();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const cartItemCount = useMemo(() => {
    return cartState.items.reduce((total, item) => total + item.quantity, 0);
  }, [cartState.items]);

  // ─── Animation refs ─────────────────────────────────────────────────────

  const backButtonScaleAnim = useSharedValue(1);
  const cartButtonScaleAnim = useSharedValue(1);
  const wishlistButtonScaleAnim = useSharedValue(1);
  const coinButtonScaleAnim = useSharedValue(1);
  const backButtonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: backButtonScaleAnim.value }] }));
  const cartButtonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cartButtonScaleAnim.value }] }));
  const wishlistButtonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: wishlistButtonScaleAnim.value }] }));
  const coinButtonScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: coinButtonScaleAnim.value }] }));

  const animateScale = useCallback((animValue: { value: number }, toValue: number) => {
    animValue.value = withSpring(toValue, { damping: 10, stiffness: 300 });
  }, []);

  // ─── Keyboard shortcuts (web) ──────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as any;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        try {
          const searchInput = document.querySelector?.('[data-search-input]') as any;
          searchInput?.focus?.();
        } catch { /* ignore */ }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !event.shiftKey) {
        event.preventDefault();
        setShowFilters(true);
      }

      if (event.key === 'Escape') {
        setShowFilters(false);
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        try {
          const searchInput = document.querySelector?.('[data-search-input]') as any;
          searchInput?.focus?.();
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Header navigation handlers ──────────────────────────────────────────

  const handleBack = useCallback(() => {
    triggerImpact('Medium');
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleCartPress = useCallback(() => {
    triggerImpact('Medium');
    router.push('/cart');
  }, [router]);

  const handleWishlistPress = useCallback(() => {
    triggerImpact('Medium');
    router.push('/wishlist');
  }, [router]);

  const handleCoinPress = useCallback(() => {
    triggerImpact('Medium');
    if (Platform.OS === 'web') {
      setTimeout(() => router.push('/coins'), 50);
    } else {
      router.push('/coins');
    }
  }, [router]);

  // ─── Error boundary handler ───────────────────────────────────────────────

  const handleErrorBoundaryError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    analyticsService.track('error_boundary_caught', {
      storeId,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500),
      componentStack: errorInfo.componentStack?.substring(0, 500),
      timestamp: new Date().toISOString() });
  }, [storeId]);

  // ─── Layout ───────────────────────────────────────────────────────────────

  const { height } = Dimensions.get('window');
  const topPadding = Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight ?? 24;

  // ─── Filter clear handlers ────────────────────────────────────────────────

  const handleClearCategory = useCallback(() => data.setSelectedCategory(null), [data]);
  const handleClearSort = useCallback(() => data.setSortBy('newest'), [data]);
  const handleClearAvailability = useCallback(() => data.setAvailabilityFilter('all'), [data]);
  const handleClearPrice = useCallback(() => { data.setMinPrice(''); data.setMaxPrice(''); }, [data]);
  const handleClearAll = useCallback(() => {
    data.setSelectedCategory(null);
    data.setSortBy('newest');
    data.setAvailabilityFilter('all');
    data.setMinPrice('');
    data.setMaxPrice('');
  }, [data]);

  const handleSearchChange = useCallback((query: string) => {
    data.setSearchQuery(query);
  }, [data]);

  const handleSearchClear = useCallback(() => {
    data.setSearchQuery('');
  }, [data]);

  const handleSearchSubmit = useCallback(() => {
    // Search is debounced in the hook; this is a no-op placeholder for enter key
  }, []);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    data.setSearchQuery(suggestion);
  }, [data]);

  // Deep-link parameter validation guard
  if (!storeId || typeof storeId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorBoundary onError={handleErrorBoundaryError}>
        <ThemedView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

          {/* Network Status Indicator */}
          {data.isOffline && (
            <View style={styles.networkBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={Colors.text.inverse} />
              <ThemedText style={styles.networkBannerText}>
                No internet connection
              </ThemedText>
            </View>
          )}

          {/* Gradient Header */}
          <LinearGradient
            colors={[Colors.nileBlue, Colors.secondary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.headerGradient, { paddingTop: topPadding + 12 }]}
          >
            <View style={styles.headerInner}>
              {/* Back Button */}
              <Animated.View style={backButtonScaleStyle}>
                <Pressable
                  style={styles.iconButton}
                  onPress={handleBack}
                  onPressIn={() => animateScale(backButtonScaleAnim, 0.92)}
                  onPressOut={() => animateScale(backButtonScaleAnim, 1)}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <View style={styles.iconButtonBackground}>
                    <Ionicons name="chevron-back" size={22} color={Colors.text.inverse} />
                  </View>
                </Pressable>
              </Animated.View>

              {/* Title Section */}
              <View style={styles.headerContent}>
                <ThemedText style={styles.headerTitle} numberOfLines={1}>
                  {data.displayStoreName}
                </ThemedText>
                <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
                  {data.products.length} product{data.products.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>

              {/* Action Buttons */}
              <View style={styles.headerActions}>
                <Animated.View style={coinButtonScaleStyle}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={handleCoinPress}
                    onPressIn={() => animateScale(coinButtonScaleAnim, 0.92)}
                    onPressOut={() => animateScale(coinButtonScaleAnim, 1)}
                    accessibilityLabel="View coins"
                    accessibilityRole="button"
                  >
                    <View style={styles.iconButtonBackground}>
                      <Ionicons name="star" size={22} color={Colors.text.inverse} />
                    </View>
                  </Pressable>
                </Animated.View>

                <Animated.View style={wishlistButtonScaleStyle}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={handleWishlistPress}
                    onPressIn={() => animateScale(wishlistButtonScaleAnim, 0.92)}
                    onPressOut={() => animateScale(wishlistButtonScaleAnim, 1)}
                    accessibilityLabel="View wishlist"
                    accessibilityRole="button"
                  >
                    <View style={styles.iconButtonBackground}>
                      <Ionicons name="heart" size={22} color={Colors.text.inverse} />
                    </View>
                  </Pressable>
                </Animated.View>

                <Animated.View style={cartButtonScaleStyle}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={handleCartPress}
                    onPressIn={() => animateScale(cartButtonScaleAnim, 0.92)}
                    onPressOut={() => animateScale(cartButtonScaleAnim, 1)}
                    accessibilityLabel={`Cart. ${cartItemCount} items`}
                    accessibilityRole="button"
                  >
                    <View style={styles.iconButtonBackground}>
                      <Ionicons name="bag" size={22} color={Colors.text.inverse} />
                      {cartItemCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {cartItemCount > 99 ? '99+' : cartItemCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </LinearGradient>

          {/* Search and Filter Bar */}
          <SearchHeader
            storeId={storeId}
            searchQuery={data.filters.searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
            searchHistory={data.searchHistory}
            suggestions={data.searchSuggestions}
            showSuggestions={data.showSearchSuggestions}
            onShowSuggestionsChange={data.setShowSearchSuggestions}
            onSuggestionSelect={handleSuggestionSelect}
            onSaveSearchHistory={data.saveSearchHistory}
            onToggleFilters={() => setShowFilters(true)}
            hasActiveFilters={data.hasActiveFilters}
          />

          {/* Active Filters Display */}
          <ActiveFiltersBar
            selectedCategory={data.filters.selectedCategory}
            categories={data.categories}
            sortBy={data.filters.sortBy}
            availabilityFilter={data.filters.availabilityFilter}
            minPrice={data.filters.minPrice}
            maxPrice={data.filters.maxPrice}
            currencySymbol={currencySymbol}
            onClearCategory={handleClearCategory}
            onClearSort={handleClearSort}
            onClearAvailability={handleClearAvailability}
            onClearPrice={handleClearPrice}
            onClearAll={handleClearAll}
          />

          {/* Product Grid */}
          <ProductGrid
            storeId={storeId}
            products={data.filteredProducts}
            loading={data.loading}
            refreshing={data.refreshing}
            loadingMore={data.loadingMore}
            hasMore={data.hasMore}
            error={data.error}
            errorInfo={data.errorInfo}
            isOnline={data.isOnline}
            isOffline={data.isOffline}
            searchQuery={data.filters.searchQuery}
            selectedCategory={data.filters.selectedCategory}
            sortBy={data.filters.sortBy}
            availabilityFilter={data.filters.availabilityFilter}
            minPrice={data.filters.minPrice}
            maxPrice={data.filters.maxPrice}
            storeData={data.storeData}
            storeName={storeName}
            onLoadMore={data.loadMore}
            onRefresh={data.onRefresh}
            onRetry={data.retryFetch}
            onClearAllFilters={data.clearAllFilters}
            waitForNetwork={data.waitForNetwork}
          />

          {/* Filter Modal */}
          <FilterPanel
            storeId={storeId}
            visible={showFilters}
            onClose={() => setShowFilters(false)}
            categories={data.categories}
            loadingCategories={data.loadingCategories}
            selectedCategory={data.filters.selectedCategory}
            onCategoryChange={data.setSelectedCategory}
            sortBy={data.filters.sortBy}
            onSortChange={data.setSortBy}
            minPrice={data.filters.minPrice}
            maxPrice={data.filters.maxPrice}
            onMinPriceChange={data.setMinPrice}
            onMaxPriceChange={data.setMaxPrice}
            currencySymbol={currencySymbol}
            availabilityFilter={data.filters.availabilityFilter}
            onAvailabilityChange={data.setAvailabilityFilter}
          />
        </ThemedView>
      </ErrorBoundary>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  networkBanner: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm },
  networkBannerText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600' },
  headerGradient: {
    paddingBottom: Spacing.base,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.strong },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center' },
  iconButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' },
  headerContent: {
    flex: 1,
    marginHorizontal: Spacing.md },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2 },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.nileBlue },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse } });

const MemoizedStoreProductsPage = React.memo(StoreProductsPage);
export default withErrorBoundary(MemoizedStoreProductsPage, 'Store Products');
