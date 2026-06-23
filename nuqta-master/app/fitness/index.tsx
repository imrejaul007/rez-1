// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Fitness & Sports Hub Page
 * Connected to real API data
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Static categories for navigation (icons and colors)
const categoryConfig: Record<string, { icon: string; color: string }> = {
  gyms: { icon: '🏋️', color: colors.brand.orange },
  studios: { icon: '🧘', color: Colors.brand.purple },
  trainers: { icon: '💪', color: Colors.success },
  store: { icon: '🛒', color: Colors.info },
  challenges: { icon: '🏆', color: colors.brand.amber },
  nutrition: { icon: '🥗', color: Colors.success },
};

interface Category {
  _id: string;
  name: string;
  slug: string;
  storeCount?: number;
}

interface FeaturedGym {
  _id: string;
  name: string;
  slug: string;
  ratings: { average: number };
  location: { address: string; city: string };
  offers: { cashback: number };
  logo: string;
  banner: string[];
}

interface Stats {
  totalGyms: number;
  maxCashback: number;
  coinsMultiplier: string;
}

const FitnessPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredGyms, setFeaturedGyms] = useState<FeaturedGym[]>([]);
  const [stats, setStats] = useState<Stats>({ totalGyms: 0, maxCashback: 0, coinsMultiplier: '3X' });

  const fetchData = useCallback(async () => {
    try {
      // Fetch subcategories and featured gyms in parallel
      const [gymsRes, studiosRes, trainersRes, storesRes] = await Promise.allSettled([
        apiClient.get('/stores/by-category-slug/gyms?limit=5&sortBy=rating'),
        apiClient.get('/stores/by-category-slug/studios?limit=5'),
        apiClient.get('/stores/by-category-slug/trainers?limit=5'),
        apiClient.get('/stores/by-category-slug/store?limit=5'),
      ]);

      // Extract data from responses
      const gymsData = gymsRes.status === 'fulfilled' ? ((gymsRes.value.data as any)?.stores || []) : [];
      const studiosData = studiosRes.status === 'fulfilled' ? ((studiosRes.value.data as any)?.stores || []) : [];
      const trainersData = trainersRes.status === 'fulfilled' ? ((trainersRes.value.data as any)?.stores || []) : [];
      const storesData = storesRes.status === 'fulfilled' ? ((storesRes.value.data as any)?.stores || []) : [];

      // Build categories with real counts
      const builtCategories: Category[] = [
        { _id: 'gyms', name: 'Gyms', slug: 'gyms', storeCount: gymsRes.status === 'fulfilled' ? ((gymsRes.value.data as any)?.total || gymsData.length) : 0 },
        { _id: 'studios', name: 'Fitness Studios', slug: 'studios', storeCount: studiosRes.status === 'fulfilled' ? ((studiosRes.value.data as any)?.total || studiosData.length) : 0 },
        { _id: 'trainers', name: 'Personal Trainers', slug: 'trainers', storeCount: trainersRes.status === 'fulfilled' ? ((trainersRes.value.data as any)?.total || trainersData.length) : 0 },
        { _id: 'store', name: 'Sports Store', slug: 'store', storeCount: storesRes.status === 'fulfilled' ? ((storesRes.value.data as any)?.total || storesData.length) : 0 },
        { _id: 'challenges', name: 'Challenges', slug: 'challenges', storeCount: 50 },
        { _id: 'nutrition', name: 'Nutrition', slug: 'nutrition', storeCount: 100 },
      ];

      if (!isMounted()) return;
      setCategories(builtCategories);
      if (!isMounted()) return;
      setFeaturedGyms(gymsData.slice(0, 5));

      // Calculate stats
      const allStores = [...gymsData, ...studiosData, ...trainersData, ...storesData];
      const maxCashback = Math.max(...allStores.map((s: any) => s.offers?.cashback || 0), 0);

      if (!isMounted()) return;
      setStats({
        totalGyms: gymsData.length + studiosData.length,
        maxCashback: maxCashback || 35,
        coinsMultiplier: '3X',
      });

    } catch (error) {
      // Set fallback data
      if (!isMounted()) return;
      setCategories([
        { _id: 'gyms', name: 'Gyms', slug: 'gyms', storeCount: 0 },
        { _id: 'studios', name: 'Fitness Studios', slug: 'studios', storeCount: 0 },
        { _id: 'trainers', name: 'Personal Trainers', slug: 'trainers', storeCount: 0 },
        { _id: 'store', name: 'Sports Store', slug: 'store', storeCount: 0 },
        { _id: 'challenges', name: 'Challenges', slug: 'challenges', storeCount: 50 },
        { _id: 'nutrition', name: 'Nutrition', slug: 'nutrition', storeCount: 100 },
      ]);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCategoryPress = (categorySlug: string) => {
    if (categorySlug === 'challenges') {
      router.push('/challenges' as any);
    } else {
      router.push(`/fitness/${categorySlug}` as any);
    }
  };

  const handleGymPress = (gym: FeaturedGym) => {
    router.push(`/MainStorePage?storeId=${gym._id}` as any);
  };

  const getCategoryIcon = (slug: string) => categoryConfig[slug]?.icon || '🏋️';
  const getCategoryColor = (slug: string) => categoryConfig[slug]?.color || colors.brand.orange;

  const formatCount = (count: number | undefined) => {
    if (!count) return '0';
    if (count >= 100) return `${Math.floor(count / 10) * 10}+`;
    return String(count);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.orange, colors.brand.orangeDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Fitness & Sports</Text>
            <Text style={styles.headerSubtitle}>Stay fit, earn rewards</Text>
          </View>
          <Pressable style={styles.searchButton}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalGyms || '10'}+</Text>
            <Text style={styles.statLabel}>Gyms</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.maxCashback}%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.coinsMultiplier}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.orange}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat._id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat.slug)}
               
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${getCategoryColor(cat.slug)}20` }]}>
                  <Text style={styles.categoryEmoji}>{getCategoryIcon(cat.slug)}</Text>
                </View>
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{formatCount(cat.storeCount)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Gyms</Text>
            <Pressable onPress={() => handleCategoryPress('gyms')}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {featuredGyms.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {featuredGyms.map((gym) => (
                <Pressable
                  key={gym._id}
                  style={styles.gymCard}
                  onPress={() => handleGymPress(gym)}
                 
                >
                  <CachedImage
                    source={gym.banner?.[0] || gym.logo || undefined}
                    style={styles.gymImage}
                  />
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{gym.offers?.cashback || 15}%</Text>
                  </View>
                  <View style={styles.gymInfo}>
                    <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                    <View style={styles.gymMeta}>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={styles.ratingText}>{gym.ratings?.average?.toFixed(1) || '4.5'}</Text>
                      </View>
                      <Text style={styles.distanceText} numberOfLines={1}>{gym.location?.city || 'Bangalore'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color={Colors.border.default} />
              <Text style={styles.emptyStateText}>No featured gyms yet</Text>
            </View>
          )}
        </View>

        <View style={styles.promoBanner}>
          <LinearGradient
            colors={[Colors.success, Colors.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <Text style={styles.promoEmoji}>💪</Text>
            <Text style={styles.promoTitle}>New Year Fitness Challenge</Text>
            <Text style={styles.promoSubtitle}>Join now & win up to 10,000 coins</Text>
            <Pressable
              style={styles.promoButton}
              onPress={() => router.push('/challenges' as any)}
            >
              <Text style={styles.promoButtonText}>Join Challenge</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.primary },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.8)' },
  searchButton: { padding: Spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.base },
  statItem: { alignItems: 'center', paddingHorizontal: Spacing.lg },
  statValue: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.text.inverse },
  statLabel: { fontSize: Typography.caption.fontSize, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { padding: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.md },
  viewAllText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: colors.brand.orange },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  categoryCard: { width: (SCREEN_WIDTH - 56) / 3, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg },
  categoryIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  categoryEmoji: { fontSize: Typography.h2.fontSize },
  categoryTitle: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.nileBlue, marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: Typography.overline.fontSize, color: Colors.text.tertiary },
  gymCard: { width: 200, marginRight: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.default },
  gymImage: { width: '100%', height: 120 },
  cashbackBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  cashbackText: { fontSize: Typography.caption.fontSize, fontWeight: '700', color: Colors.text.inverse },
  gymInfo: { padding: Spacing.md },
  gymName: { fontSize: Typography.body.fontSize, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.xs },
  gymMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.nileBlue },
  distanceText: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, maxWidth: 80 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  emptyStateText: { marginTop: Spacing.sm, fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  promoBanner: { marginHorizontal: Spacing.base },
  promoGradient: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center' },
  promoEmoji: { fontSize: 40, marginBottom: Spacing.md },
  promoTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.xs },
  promoSubtitle: { fontSize: Typography.bodySmall.fontSize, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: Spacing.base },
  promoButton: { backgroundColor: Colors.background.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius['2xl'] },
  promoButtonText: { fontSize: Typography.body.fontSize, fontWeight: '700', color: Colors.success },
});

export default withErrorBoundary(FitnessPage, 'FitnessIndex');
