// @ts-nocheck
/**
 * Fast Delivery Restaurants Page
 * /MainCategory/food-dining/fast-delivery
 * Shows all 60-min delivery restaurants in food & dining category
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';
import { FoodStoreCard } from '@/components/food-dining';
import { COLORS } from '@/components/food-dining/constants';
import { useIsMounted } from '@/hooks/useIsMounted';

export default function FastDeliveryPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  const fetchStores = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch food-dining stores and filter by fast delivery
      const response = await storesApi.getStoresBySubcategorySlug('food-dining', 50);

      if (response.success && response.data) {
        const allStores = Array.isArray(response.data) ? response.data : (response.data.stores || []);
        // Filter for fast delivery stores
        const fastStores = allStores.filter((s: any) =>
          s.deliveryCategories?.fastDelivery ||
          (s.operationalInfo?.deliveryTime && parseInt(s.operationalInfo.deliveryTime) <= 60)
        );
        // Sort by delivery time (fastest first)
        fastStores.sort((a: any, b: any) => {
          const timeA = parseInt(a.operationalInfo?.deliveryTime) || 60;
          const timeB = parseInt(b.operationalInfo?.deliveryTime) || 60;
          return timeA - timeB;
        });
        if (!isMounted()) return;
        setStores(fastStores);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const renderStoreCard = useCallback(({ item }: { item: any }) => (
    <FoodStoreCard store={item} currencySymbol={currencySymbol} variant="delivery-focused" />
  ), [currencySymbol]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGold} />
          <Text style={styles.loadingText}>Loading fast delivery restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}
          accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="flash" size={24} color={COLORS.primaryGold} />
          <View>
            <Text style={styles.headerTitle}>60-Min Delivery</Text>
            <Text style={styles.headerSubtitle}>{stores.length} restaurants</Text>
          </View>
        </View>
      </View>

      {error && <SectionErrorBanner message={error} onRetry={onRefresh} compact />}

      {/* Banner */}
      <View style={styles.banner}>
        <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']} style={styles.bannerGradient}>
          <Ionicons name="flash" size={20} color={COLORS.primaryGold} />
          <Text style={styles.bannerText}>Get your food delivered in under 60 minutes</Text>
        </LinearGradient>
      </View>

      <FlashList
        data={stores}
        keyExtractor={(item, i) => item._id || item.id || `store-${i}`}
        renderItem={renderStoreCard}
        contentContainerStyle={styles.storeList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGold]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flash-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No fast delivery restaurants nearby</Text>
            <Text style={styles.emptySubtitle}>Check back later for available options</Text>
          </View>
        }
        estimatedItemSize={110}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  backButton: { padding: 4 },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  banner: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  bannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  bannerText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  storeList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
