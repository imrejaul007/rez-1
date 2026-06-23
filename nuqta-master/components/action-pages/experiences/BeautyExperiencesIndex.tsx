// @ts-nocheck
/**
 * Beauty Experiences Page
 * /MainCategory/beauty-wellness/experiences
 * Browse curated beauty & wellness experiences (spa packages, bridal, transformations, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  pink: colors.brand.pink,
  pinkDark: '#BE185D',
  pinkLight: colors.pinkMist,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
  gold: colors.warningScale[400],
};

interface Experience {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  price?: number;
  originalPrice?: number;
  duration?: string;
  rating?: number;
  ratingsCount?: number;
  salonName?: string;
  salonId?: string;
  subcategory?: string;
  tags?: string[];
}

type CategoryFilter = 'all' | 'spa-packages' | 'bridal' | 'wellness' | 'transformations';

const CATEGORY_CHIPS: { key: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'spa-packages', label: 'Spa Packages', icon: 'water-outline' },
  { key: 'bridal', label: 'Bridal', icon: 'heart-outline' },
  { key: 'wellness', label: 'Wellness', icon: 'leaf-outline' },
  { key: 'transformations', label: 'Transformations', icon: 'sparkles-outline' },
];

function ExperienceCard({
  experience,
  currencySymbol,
  onPress,
}: {
  experience: Experience;
  currencySymbol: string;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const isMounted = useIsMounted();
  const imageUri = experience.image || experience.images?.[0];

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
     
    >
      <View style={styles.cardImageContainer}>
        {imageUri && !imageError ? (
          <CachedImage
            source={imageUri}
            style={styles.cardImage}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="sparkles" size={32} color={COLORS.pink} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={styles.cardImageGradient}
        />

        {/* Duration badge */}
        {experience.duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={10} color={COLORS.white} />
            <Text style={styles.durationBadgeText}>{experience.duration}</Text>
          </View>
        )}

        {/* Rating badge */}
        {experience.rating != null && experience.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={COLORS.gold} />
            <Text style={styles.ratingValue}>{experience.rating.toFixed(1)}</Text>
            {experience.ratingsCount != null && experience.ratingsCount > 0 && (
              <Text style={styles.ratingCount}>({experience.ratingsCount})</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{experience.title}</Text>

        {experience.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {experience.description}
          </Text>
        ) : null}

        {experience.salonName ? (
          <View style={styles.salonRow}>
            <Ionicons name="storefront-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.salonName} numberOfLines={1}>{experience.salonName}</Text>
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          {experience.price != null ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>
                {currencySymbol}{experience.price.toLocaleString()}
              </Text>
              {experience.originalPrice != null && experience.originalPrice > experience.price && (
                <Text style={styles.originalPrice}>
                  {currencySymbol}{experience.originalPrice.toLocaleString()}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.priceText}>Price on request</Text>
          )}

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.pink} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function BeautyExperiencesPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  const filterByCategory = useCallback((data: Experience[], category: CategoryFilter) => {
    if (category === 'all') return data;
    return data.filter((exp) => {
      const sub = exp.subcategory?.toLowerCase() || '';
      const tags = (exp.tags || []).map((t) => t.toLowerCase());
      const matchKey = category.replace('-', ' ');
      return (
        sub.includes(matchKey) ||
        sub.includes(category) ||
        tags.some((t) => t.includes(matchKey) || t.includes(category))
      );
    });
  }, []);

  const fetchExperiences = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiClient.get<any>('/experiences', {
        category: 'beauty-wellness',
        limit: 20,
      });

      if (response.success && response.data) {
        const list: Experience[] = Array.isArray(response.data)
          ? response.data
          : response.data.experiences || response.data.items || [];
        if (!isMounted()) return;
        setExperiences(list);
        setFilteredExperiences(filterByCategory(list, selectedCategory));
      } else {
        setExperiences([]);
        setFilteredExperiences([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load experiences');
      setExperiences([]);
      setFilteredExperiences([]);
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [filterByCategory, selectedCategory]);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  useEffect(() => {
    setFilteredExperiences(filterByCategory(experiences, selectedCategory));
  }, [selectedCategory, experiences, filterByCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExperiences();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleCategoryPress = (category: CategoryFilter) => {
    setSelectedCategory(category);
  };

  const handleExperiencePress = (experience: Experience) => {
    const experienceId = experience._id || experience.id;
    router.push(`/MainCategory/beauty-wellness/experiences/${experienceId}` as any);
  };

  const renderCategoryChip = useCallback(({ item }: { item: typeof CATEGORY_CHIPS[number] }) => {
    const isActive = selectedCategory === item.key;
    return (
      <Pressable
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => handleCategoryPress(item.key)}
      >
        <Ionicons
          name={item.icon}
          size={14}
          color={isActive ? COLORS.white : COLORS.textSecondary}
        />
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [selectedCategory]);

  const renderExperienceItem = useCallback(({ item }: { item: Experience }) => (
    <ExperienceCard
      experience={item}
      currencySymbol={currencySymbol}
      onPress={() => handleExperiencePress(item)}
    />
  ), [currencySymbol]);

  // ─────────── Loading State ───────────
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.pink} />
          <Text style={styles.loadingText}>Loading beauty experiences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.brand.pink, '#D946EF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={22} color={COLORS.white} />
          <View>
            <Text style={styles.headerTitle}>Beauty Experiences</Text>
            <Text style={styles.headerSubtitle}>
              {filteredExperiences.length} experience{filteredExperiences.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Category Chips */}
      <View style={styles.chipsContainer}>
        <FlashList
          horizontal
          data={CATEGORY_CHIPS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
          renderItem={renderCategoryChip}
          estimatedItemSize={44}
        />
      </View>

      {/* Error State */}
      {error && !refreshing ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchExperiences}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={filteredExperiences}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderExperienceItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.pink]}
              tintColor={COLORS.pink}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={COLORS.pink} />
              <Text style={styles.emptyTitle}>No beauty experiences available yet</Text>
              <Text style={styles.emptySubtitle}>
                Check back soon for curated spa packages, bridal experiences, and more
              </Text>
            </View>
          }
          estimatedItemSize={220}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },

  // Header
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  // Category Chips
  chipsContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  chipsList: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.pinkLight,
    gap: 6,
  },
  chipActive: {
    backgroundColor: COLORS.pink,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  // Card
  card: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    }),
  },
  cardImageContainer: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    backgroundColor: COLORS.pinkLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  durationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  durationBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.white },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  ratingCount: { fontSize: 11, color: COLORS.textSecondary },

  // Card Content
  cardContent: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  salonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  salonName: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontSize: 16, fontWeight: '700', color: COLORS.pink },
  originalPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },
  viewButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.pink },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  errorSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.pink,
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Empty State
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default React.memo(BeautyExperiencesPage);
