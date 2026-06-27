// @ts-nocheck
/**
 * Generic Experience Detail Page
 * For categories without a custom detail page
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { experiencesApi, StoreExperience } from '@/services/experiencesApi';
import { getCategoryTheme } from '@/config/categoryThemeConfig';
import { getCategoryConfig } from '@/config/categoryConfig';
import { useGetCurrencySymbol } from '@/stores/selectors';
import SectionErrorBanner from '@/components/common/SectionErrorBanner';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function StoreCard({ store, currencySymbol, primaryColor }: { store: any; currencySymbol: string; primaryColor: string }) {
  const router = useRouter();
  const [imgErr, setImgErr] = useState(false);
  const isMounted = useIsMounted();
  const imageUri = (Array.isArray(store.banner) ? store.banner[0] : store.banner) || store.logo || store.image;

  return (
    <Pressable
      style={styles.storeCard}
      onPress={() => router.push(`/MainStorePage?storeId=${store._id || store.id}` as any)}
    >
      <View style={styles.storeImgContainer}>
        {imageUri && !imgErr ? (
          <CachedImage source={imageUri} style={styles.storeImg} contentFit="cover" onError={() => setImgErr(true)} />
        ) : (
          <View style={[styles.storeImg, styles.storeImgPlaceholder]}>
            <Ionicons name="storefront-outline" size={28} color={colors.neutral[500]} />
          </View>
        )}
        <View style={styles.storeRating}>
          <Ionicons name="star" size={12} color={primaryColor} />
          <Text style={styles.storeRatingText}>{store.ratings?.average?.toFixed(1) || 'New'}</Text>
        </View>
      </View>
      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeLocation} numberOfLines={1}>
          {store.location?.city || 'Nearby'}
          {store.distance ? ` \u2022 ${store.distance} km` : ''}
        </Text>
        {store.offers?.cashback > 0 && (
          <View style={styles.cashbackTag}>
            <Text style={styles.cashbackText}>{store.offers.cashback}% cashback</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function GenericExperienceDetail() {
  const router = useRouter();
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const theme = getCategoryTheme(slug || '');
  const categoryConfig = getCategoryConfig(slug || '');
  const categoryName = categoryConfig?.name || theme.name;

  const [experience, setExperience] = useState<StoreExperience | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!id) {
        setError('Invalid experience ID');
        setIsLoading(false);
        return;
      }
      const [expRes, storesRes] = await Promise.all([
        experiencesApi.getExperienceById(id),
        experiencesApi.getStoresByExperience(id, { limit: 30 }),
      ]);

      if (expRes.success && expRes.data) {
        if (!isMounted()) return;
        setExperience(expRes.data);
      }
      if (storesRes.success && storesRes.data?.stores) {
        setStores(storesRes.data.stores);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load experience. Pull down to refresh.');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchData(); }, [fetchData, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const renderStoreCard = useCallback(({ item }: { item: any }) => (
    <StoreCard store={item} currencySymbol={currencySymbol} primaryColor={theme.primaryColor} />
  ), [currencySymbol, theme.primaryColor]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{experience?.title || 'Experience'}</Text>
          <Text style={styles.headerSubtitle}>{stores.length} stores</Text>
        </View>
      </View>

      {error && <SectionErrorBanner message={error} onRetry={() => { setError(null); fetchData(); }} compact />}

      {experience && (
        <LinearGradient
          colors={(experience.backgroundColor
            ? [experience.backgroundColor, experience.backgroundColor + '80']
            : [theme.primaryColorLight + '30', theme.primaryColorLight + '15']) as any}
          style={styles.infoBanner}
        >
          <Text style={styles.infoIcon}>{experience.icon || '\uD83C\uDF1F'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{experience.title}</Text>
            {experience.subtitle && <Text style={styles.infoSubtitle}>{experience.subtitle}</Text>}
            {experience.description && <Text style={styles.infoDesc}>{experience.description}</Text>}
          </View>
        </LinearGradient>
      )}

      {experience?.benefits && experience.benefits.length > 0 && (
        <View style={styles.benefitsSection}>
          {experience.benefits.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      <FlashList
        data={stores}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderStoreCard}
        contentContainerStyle={styles.storeList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.neutral[500]} />
            <Text style={styles.emptyTitle}>No stores found</Text>
            <Text style={styles.emptySubtitle}>Check back later for available options</Text>
          </View>
        }
        estimatedItemSize={110}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.warmGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background.primary, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900] },
  headerSubtitle: { fontSize: 12, color: colors.neutral[500] },
  infoBanner: { margin: 16, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { fontSize: 36 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900], marginBottom: 4 },
  infoSubtitle: { fontSize: 14, color: colors.neutral[500], marginBottom: 4 },
  infoDesc: { fontSize: 13, color: colors.neutral[500], lineHeight: 18 },
  benefitsSection: { marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: colors.background.primary, borderRadius: 12, gap: 8 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontSize: 13, color: colors.neutral[900] },
  storeList: { paddingHorizontal: 16, paddingBottom: 120 },
  storeCard: {
    borderRadius: 16, backgroundColor: colors.background.primary, overflow: 'hidden', marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  storeImgContainer: { height: 140, position: 'relative' },
  storeImg: { width: '100%', height: '100%' },
  storeImgPlaceholder: { backgroundColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' },
  storeRating: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', gap: 4,
  },
  storeRatingText: { fontSize: 12, fontWeight: '600', color: colors.neutral[900] },
  storeContent: { padding: 12 },
  storeName: { fontSize: 15, fontWeight: '600', color: colors.neutral[900], marginBottom: 2 },
  storeLocation: { fontSize: 12, color: colors.neutral[500], marginBottom: 6 },
  cashbackTag: { backgroundColor: colors.tint.pink, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  cashbackText: { fontSize: 11, fontWeight: '600', color: colors.brand.purpleLight },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral[900], marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.neutral[500], marginTop: 4 },
});

export default React.memo(GenericExperienceDetail);
