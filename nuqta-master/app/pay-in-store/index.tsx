// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Pay In Store - Entry Screen (Find Store)
 *
 * Entry point for store payment flow with ReZ brand design.
 * Includes QR scanning and manual store search capabilities.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRScanner from '@/components/store-payment/QRScanner';
import { ScannerPlaceholder } from '@/components/store-payment';
import { FilterChips, StoreTabs, PaymentStoreCard } from '@/components/pay-store-search';
import { StorePaymentInfo, PayInStoreParams } from '@/types/storePayment.types';
import { usePaymentStoreSearch } from '@/hooks/usePaymentStoreSearch';
import apiClient from '@/services/apiClient';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import BonusCampaignBanner from '@/components/earn/BonusCampaignBanner';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
function PayInStoreScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<PayInStoreParams & { bonusCampaignSlug?: string }>();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const searchInputRef = useRef<TextInput>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use payment store search hook
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    filters,
    handleFilterChange,
    activeTab,
    handleTabChange,
    nearbyStores,
    popularStores,
    getFilteredStores,
    isInitialLoading,
    hasMore,
    loadMore,
    isLoadingMore,
  } = usePaymentStoreSearch();

  // Handle QR code or storeId from params
  useEffect(() => {
    if (params.qrCode) {
      handleQRScan(params.qrCode);
    }
    if (params.storeId) {
      navigateToEnterAmount(params.storeId, params.storeName || 'Store');
    }
  }, [params.qrCode, params.storeId, params.storeName]);

  const handleQRScan = async (qrCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowScanner(false);

      const response = await apiClient.get(`/store-payment/lookup/${qrCode}`);

      if (response.success && response.data) {
        const store = response.data as StorePaymentInfo;
        navigateToEnterAmount(store._id, store.name, store.logo);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Store not found. Please try again.');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to find store. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateToEnterAmount = (storeId: string, storeName: string, storeLogo?: string) => {
    router.push({
      pathname: '/pay-in-store/enter-amount',
      params: { storeId, storeName, storeLogo: storeLogo || '' },
    });
  };

  const handleManualEntry = () => {
    setShowScanner(false);
    router.push('/pay-in-store/store-search');
  };

  const handleStorePress = (store: any) => {
    navigateToEnterAmount(store._id, store.name, store.logo);
  };

  const handleStoreView = (store: any) => {
    // Navigate to store details page
    router.push({
      pathname: '/store/[id]',
      params: { id: store._id },
    });
  };

  const scrollToSearch = () => {
    searchInputRef.current?.focus();
  };

  // Get filtered stores to display from backend data
  // When there's a search query or "all" tab, use paginated searchResults; otherwise use nearbyStores or popularStores
  const hasSearchQuery = searchQuery.trim().length > 0;
  const baseStores = hasSearchQuery
    ? searchResults
    : activeTab === 'all' && searchResults.length > 0
      ? searchResults
      : (nearbyStores.length > 0 ? nearbyStores : popularStores);
  const displayStores = getFilteredStores(baseStores);

  // Show loading while auth state is being loaded
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.authIconContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.gold} />
          </View>
          <Text style={styles.authTitle}>Sign in Required</Text>
          <Text style={styles.authSubtitle}>
            Please sign in to pay at stores and earn rewards
          </Text>
          <Pressable
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (showScanner) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
        onManualEntry={handleManualEntry}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Find Store</Text>
          <Text style={styles.headerSubtitle}>Scan QR or select store to pay & earn rewards</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bonus Campaign Banner */}
        <BonusCampaignBanner campaignSlug={params.bonusCampaignSlug as string} />

        {/* Scanner Placeholder */}
        <ScannerPlaceholder onPress={() => setShowScanner(true)} />

        {/* Can't scan? Find store manually button */}
        <Pressable
          style={styles.manualSearchButton}
          onPress={scrollToSearch}
        >
          <Ionicons name="search-outline" size={20} color={Colors.gold} />
          <Text style={styles.manualSearchText}>Can't scan? Find store manually</Text>
        </Pressable>

        {/* OR Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <Ionicons name="close-circle" size={20} color={Colors.error} />
            </Pressable>
          </View>
        )}

        {/* Store Discovery Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{`Choose from nearby ${BRAND.APP_NAME} partner stores`}</Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.text.tertiary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search store name, brand, or area"
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

          {/* Filter Chips */}
          <View style={styles.filterChipsContainer}>
            <FilterChips
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </View>

          {/* Store Tabs */}
          <StoreTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Store List */}
          {isInitialLoading || isSearching ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.loadingText}>
                {isSearching ? 'Searching stores...' : 'Finding stores...'}
              </Text>
            </View>
          ) : displayStores.length > 0 ? (
            <View style={styles.storeList}>
              {displayStores.map((store, index) => (
                <PaymentStoreCard
                  key={store._id}
                  store={store}
                  onPress={handleStorePress}
                  onView={handleStoreView}
                  index={index}
                  variant="full"
                  showCTA={true}
                />
              ))}
              {hasMore && (
                <Pressable
                  style={[styles.loadMoreButton, isLoadingMore && { opacity: 0.5 }]}
                  onPress={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More Stores</Text>
                  )}
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="storefront-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No stores found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'No partner stores available in your area'}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.nileBlue,  // Nile Blue for contrast on Mustard
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  manualSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: Colors.background.secondary,
    gap: Spacing.sm,
  },
  manualSearchText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.default,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginHorizontal: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.nileBlue,
  },
  loadingCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginHorizontal: Spacing.base,
  },
  emptyCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginHorizontal: Spacing.base,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  filterChipsContainer: {
    marginBottom: Spacing.sm,
  },
  storeList: {
    marginTop: Spacing.base,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.background.secondary,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
});

export default withErrorBoundary(PayInStoreScreen, 'PayInStoreIndex');
