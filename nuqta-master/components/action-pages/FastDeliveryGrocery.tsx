// @ts-nocheck
/**
 * Fast Delivery Grocery Stores Page
 * /MainCategory/grocery-essentials/fast-delivery
 * Shows all 60-min delivery grocery stores
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGold: colors.warningScale[400],
  dark: colors.nileBlue,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

function StoreCard({ store, currencySymbol }: { store: any; currencySymbol: string }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const isMounted = useIsMounted();
  const imageUri = store.banner?.[0] || store.banner || store.logo || store.image;
  const cashbackPercent = store.offers?.cashback || 0;

  const storeTags = (store.tags || [])
    .filter((t: string) => !['grocery', 'essentials'].includes(t?.toLowerCase?.()))
    .slice(0, 3)
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' • ') || store.category?.name || 'Grocery Store';

  return (
    <Pressable
      style={styles.storeCard}
      onPress={() => router.push(`/MainStorePage?storeId=${store._id || store.id}` as any)}
     
    >
      <View style={styles.storeImageContainer}>
        {imageUri && !imageError ? (
          <CachedImage source={imageUri} style={styles.storeImage} contentFit="cover" onError={() => setImageError(true)} />
        ) : (
          <View style={[styles.storeImage, styles.storeImagePlaceholder]}>
            <Ionicons name="flash" size={32} color={COLORS.primaryGold} />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.storeImageGradient} />

        {/* Delivery time badge */}
        <View style={styles.deliveryTimeBadge}>
          <Ionicons name="flash" size={12} color={colors.text.primary} />
          <Text style={styles.deliveryTimeText}>{store.operationalInfo?.deliveryTime || '30-45 min'}</Text>
        </View>

        {store.ratings?.average > 0 && (
          <View style={styles.storeRating}>
            <Ionicons name="star" size={12} color={COLORS.primaryGold} />
            <Text style={styles.storeRatingText}>{store.ratings.average.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeTags} numberOfLines={1}>{storeTags}</Text>
        <View style={styles.storeMeta}>
          <View style={styles.storeMetaItem}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.storeMetaText}>{store.location?.city || 'Nearby'}</Text>
          </View>
          {cashbackPercent > 0 && (
            <View style={styles.cashbackTag}>
              <Text style={styles.cashbackTagText}>{cashbackPercent}% cashback</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function GroceryFastDeliveryPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await storesApi.getStoresBySubcategorySlug('grocery-essentials', 50);

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
      // silently handle
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
    <StoreCard store={item} currencySymbol={currencySymbol} />
  ), [currencySymbol]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryGold} />
          <Text style={styles.loadingText}>Loading fast delivery stores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="flash" size={24} color={COLORS.primaryGold} />
          <View>
            <Text style={styles.headerTitle}>60-Min Delivery</Text>
            <Text style={styles.headerSubtitle}>{stores.length} grocery stores</Text>
          </View>
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']} style={styles.bannerGradient}>
          <Ionicons name="flash" size={20} color={COLORS.primaryGold} />
          <Text style={styles.bannerText}>Get your groceries delivered in under 60 minutes</Text>
        </LinearGradient>
      </View>

      <FlashList
        data={stores}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderStoreCard}
        contentContainerStyle={styles.storeList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryGold]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flash-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No fast delivery stores nearby</Text>
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
  storeCard: {
    borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  storeImageContainer: { height: 150, position: 'relative' },
  storeImage: { width: '100%', height: '100%' },
  storeImagePlaceholder: { backgroundColor: colors.tint.amberLight, justifyContent: 'center', alignItems: 'center' },
  storeImageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  deliveryTimeBadge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: COLORS.primaryGold, gap: 4,
  },
  deliveryTimeText: { fontSize: 11, fontWeight: '700', color: colors.text.primary },
  storeRating: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', gap: 4,
  },
  storeRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  storeContent: { padding: 12 },
  storeName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  storeTags: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeMetaText: { fontSize: 11, color: COLORS.textSecondary },
  cashbackTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.tint.pink },
  cashbackTagText: { fontSize: 11, fontWeight: '600', color: colors.brand.purpleLight },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
