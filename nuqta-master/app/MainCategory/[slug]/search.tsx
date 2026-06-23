// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Category Search Page
 * /MainCategory/[slug]/search
 * Searches only within the category for stores, gadgets, and products
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { getCategoryConfig } from '@/config/categoryConfig';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storesApi } from '@/services/storesApi';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const SUBCATEGORY_EMOJIS: Record<string, string> = {
  'cafe': '\u2615', 'cafes': '\u2615', 'restaurant': '\uD83C\uDF7D\uFE0F', 'fast-food': '\uD83C\uDF54',
  'qsr': '\uD83C\uDF54', 'ice-cream': '\uD83C\uDF66', 'bakery': '\uD83C\uDF70', 'cloud': '\u2601\uFE0F',
  'street': '\uD83C\uDF62', 'supermarket': '\uD83D\uDED2', 'kirana': '\uD83C\uDFEA', 'vegetable': '\uD83E\uDD66',
  'meat': '\uD83E\uDD69', 'dairy': '\uD83E\uDD5B', 'salon': '\u2702\uFE0F', 'spa': '\uD83D\uDC86',
  'pharmacy': '\uD83D\uDC8A', 'clinic': '\uD83C\uDFE5', 'dental': '\uD83E\uDDB7', 'gym': '\uD83C\uDFCB\uFE0F',
  'yoga': '\uD83E\uDDD8', 'footwear': '\uD83D\uDC5F', 'jewelry': '\uD83D\uDC8D', 'watch': '\u231A',
  'hotel': '\uD83C\uDFE8', 'taxi': '\uD83D\uDE95', 'movie': '\uD83C\uDFAC', 'gaming': '\uD83C\uDFAE',
  'mobile': '\uD83D\uDCF1', 'laptop': '\uD83D\uDCBB', 'tv': '\uD83D\uDCFA', 'camera': '\uD83D\uDCF7',
  'audio': '\uD83C\uDFA7', 'headphone': '\uD83C\uDFA7', 'default': '\u26A1',
};

function getSubcategoryEmoji(slug: string): string {
  for (const [key, emoji] of Object.entries(SUBCATEGORY_EMOJIS)) {
    if (slug.includes(key)) return emoji;
  }
  return SUBCATEGORY_EMOJIS.default;
}

function buildServiceChips(slug: string): { id: string; label: string; icon: string }[] {
  const config = getCategoryConfig(slug || '');
  const chips: { id: string; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '\u26A1' },
  ];
  if (config?.subcategories) {
    config.subcategories.slice(0, 7).forEach(sub => {
      chips.push({ id: sub.slug, label: sub.name, icon: getSubcategoryEmoji(sub.slug) });
    });
  }
  return chips;
}

function buildQuickSuggestions(slug: string): string[] {
  const config = getCategoryConfig(slug || '');
  if (!config) return [];
  const name = config.name;
  const subs = config.subcategories.slice(0, 3).map(s => s.name);
  const keywords = config.keywords.slice(0, 3);
  const suggestions: string[] = [];
  if (subs[0]) suggestions.push(`Best ${subs[0]} near me`);
  if (keywords[0]) suggestions.push(`Top rated ${keywords[0]} stores`);
  if (subs[1]) suggestions.push(`${subs[1]} with offers`);
  if (keywords[1]) suggestions.push(`${keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1)} deals today`);
  if (subs[2]) suggestions.push(`Popular ${subs[2]}`);
  suggestions.push(`Best ${name} stores nearby`);
  return suggestions;
}

function SharedCategoryPage() {
  const isMounted = useIsMounted();
  const { q, slug } = useLocalSearchParams<{ q?: string; slug: string }>();
  const theme = getCategoryTheme(slug || '');
  const categoryConfig = getCategoryConfig(slug || '');
  const SERVICE_CHIPS = useMemo(() => buildServiceChips(slug || ''), [slug]);
  const QUICK_SUGGESTIONS = useMemo(() => buildQuickSuggestions(slug || ''), [slug]);
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(q || '');
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeService, setActiveService] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus search input
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Search if query param provided
  useEffect(() => {
    if (q) {
      performSearch(q);
    }
  }, [q]);

  // Fetch recent searches
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const response = await apiClient.get<any>('/search/history/recent', { limit: 5 });
        if (response.success && response.data) {
          const searches = Array.isArray(response.data) ? response.data : (response.data.searches || []);
          setRecentSearches(searches.map((s: any) => s.query || s).filter(Boolean));
        }
      } catch (err) {
        // Silent fail for recent searches
      }
    };
    fetchRecent();
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);

      // Search stores within electronics category
      const [storesRes, productsRes] = await Promise.all([
        storesApi.getStoresBySubcategorySlug(slug || 'electronics', 20),
        apiClient.get<any>('/products', {
          category: slug,
          search: searchQuery,
          limit: 20,
        }),
      ]);

      // Filter stores by search query (client-side for better matching)
      if (storesRes.success && storesRes.data) {
        const allStores = Array.isArray(storesRes.data) ? storesRes.data : (storesRes.data.stores || []);
        const queryLower = searchQuery.toLowerCase();
        const matched = allStores.filter((s: any) => {
          const nameMatch = s.name?.toLowerCase().includes(queryLower);
          const tagMatch = s.tags?.some((t: string) => t.toLowerCase().includes(queryLower));
          const categoryMatch = s.category?.name?.toLowerCase().includes(queryLower);
          return nameMatch || tagMatch || categoryMatch;
        });
        if (!isMounted()) return;
        setStores(matched);
      }

      // Get products from electronics search
      if (productsRes.success && productsRes.data) {
        const searchProducts = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.products || []);
        if (!isMounted()) return;
        setProducts(searchProducts);
      }

      // Log search
      try {
        await apiClient.post('/search/history', {
          query: searchQuery,
          type: 'store',
          resultCount: stores.length + products.length,
          filters: { category: slug },
        });
      } catch (err) {
        // Silent fail for history logging
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => performSearch(text), 350);
    }
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    if (query.trim()) performSearch(query);
  };

  const handleServicePress = (serviceId: string) => {
    setActiveService(serviceId);
    if (serviceId !== 'all') {
      const label = SERVICE_CHIPS.find(c => c.id === serviceId)?.label || serviceId;
      performSearch(label);
      setQuery(label);
    }
  };

  const renderStoreSearchItem = useCallback(({ item }: { item: any }) => (
    <Pressable
      style={styles.resultCard}
      onPress={() => router.push(`/MainStorePage?storeId=${item._id || item.id}` as any)}
    >
      <CachedImage
        source={item.banner?.[0] || item.logo || undefined}
        style={styles.resultImage}
        contentFit="cover"
        defaultSource={undefined}
      />
      {!item.banner?.[0] && !item.logo && (
        <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
          <Ionicons name={(theme.defaultMissionIcon || 'storefront-outline') as any} size={24} color={theme.primaryColor} />
        </View>
      )}
      <View style={styles.resultContent}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultTags} numberOfLines={1}>
          {(item.tags || []).slice(0, 3).join(' \u2022 ') || item.category?.name || categoryConfig?.name || 'Store'}
        </Text>
        <View style={styles.resultMeta}>
          <Ionicons name="star" size={12} color={Colors.warning} />
          <Text style={styles.resultRating}>{(item.ratings?.average || 4.5).toFixed(1)}</Text>
          <Text style={styles.resultMetaText}>{item.operationalInfo?.deliveryTime || 'Visit store'}</Text>
          {item.offers?.cashback > 0 && (
            <Text style={styles.resultCashback}>{item.offers.cashback}% cashback</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={SHARED_COLORS.textSecondary} />
    </Pressable>
  ), [router, theme.defaultMissionIcon, theme.primaryColor, categoryConfig?.name]);

  const renderProductSearchItem = useCallback(({ item }: { item: any }) => (
    <Pressable
      style={styles.resultCard}
      onPress={() => router.push(`/product-page?id=${item._id || item.id}` as any)}
    >
      <CachedImage
        source={item.images?.[0]?.url || item.image}
        style={styles.resultImage}
        contentFit="cover"
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultTags} numberOfLines={1}>{item.store?.name || 'Store'}</Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultPrice}>
            {currencySymbol}{item.pricing?.salePrice || item.pricing?.basePrice || item.price}
          </Text>
          {item.cashback?.percentage > 0 && (
            <Text style={styles.resultCashback}>{item.cashback.percentage}% cashback</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={SHARED_COLORS.textSecondary} />
    </Pressable>
  ), [router, currencySymbol]);

  // Filter stores by active service tag (if filter active and no explicit search)
  const displayedStores = activeService === 'all' ? stores : stores.filter((s: any) => {
    const tags = s.tags?.map((t: string) => t.toLowerCase()) || [];
    return tags.some((t: string) => t.includes(activeService));
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={SHARED_COLORS.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={handleSubmit}
            placeholder="Search stores, products, brands..."
            placeholderTextColor={SHARED_COLORS.textSecondary}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setStores([]); setProducts([]); setHasSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={SHARED_COLORS.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Service Filter Chips */}
      <View style={styles.serviceBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceList}>
          {SERVICE_CHIPS.map(chip => (
            <Pressable
              key={chip.id}
              style={[styles.serviceChip, activeService === chip.id && styles.serviceChipActive]}
              onPress={() => handleServicePress(chip.id)}
            >
              <Text style={styles.serviceChipIcon}>{chip.icon}</Text>
              <Text style={[styles.serviceChipText, activeService === chip.id && styles.serviceChipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Pre-search: Suggestions */}
      {!hasSearched && (
        <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              {recentSearches.map((search, i) => (
                <Pressable
                  key={i}
                  style={styles.recentItem}
                  onPress={() => { setQuery(search); performSearch(search); }}
                >
                  <Ionicons name="time-outline" size={16} color={SHARED_COLORS.textSecondary} />
                  <Text style={styles.recentText}>{search}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Quick Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Try Searching</Text>
            <View style={styles.suggestionsGrid}>
              {QUICK_SUGGESTIONS.map((suggestion, i) => (
                <Pressable
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => { setQuery(suggestion); performSearch(suggestion); }}
                >
                  <Ionicons name="flash-outline" size={14} color={theme.primaryColor} />
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Loading */}
      {isSearching && (
        <CardGridSkeleton />
      )}

      {/* Search Results */}
      {hasSearched && !isSearching && (
        <View style={styles.resultsContainer}>
          {/* Result Tabs */}
          <View style={styles.resultTabs}>
            <Pressable
              style={[styles.resultTab, activeTab === 'services' && styles.resultTabActive]}
              onPress={() => setActiveTab('services')}
            >
              <Text style={[styles.resultTabText, activeTab === 'services' && styles.resultTabTextActive]}>
                Stores ({displayedStores.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.resultTab, activeTab === 'products' && styles.resultTabActive]}
              onPress={() => setActiveTab('products')}
            >
              <Text style={[styles.resultTabText, activeTab === 'products' && styles.resultTabTextActive]}>
                Products ({products.length})
              </Text>
            </Pressable>
          </View>

          {activeTab === 'services' ? (
            <FlashList
              data={displayedStores}
              keyExtractor={(item) => item._id || item.id}
              renderItem={renderStoreSearchItem}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={80}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Ionicons name="search-outline" size={40} color={SHARED_COLORS.textSecondary} />
                  <Text style={styles.emptyResultsText}>No stores found for "{query}"</Text>
                  <Text style={styles.emptyResultsHint}>Try a different search term or category</Text>
                </View>
              }
            />
          ) : (
            <FlashList
              data={products}
              keyExtractor={(item) => item._id || item.id || String(Math.random())}
              renderItem={renderProductSearchItem}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={80}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Ionicons name="search-outline" size={40} color={SHARED_COLORS.textSecondary} />
                  <Text style={styles.emptyResultsText}>No products found for "{query}"</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  searchHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  searchInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  searchInput: { flex: 1, ...Typography.body, color: Colors.text.primary, padding: 0 },
  serviceBar: { backgroundColor: Colors.background.primary, paddingVertical: Spacing.sm },
  serviceList: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  serviceChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary, gap: Spacing.xs,
  },
  serviceChipActive: { backgroundColor: Colors.info },
  serviceChipIcon: { fontSize: 14 },
  serviceChipText: { ...Typography.bodySmall, color: Colors.text.tertiary, fontWeight: '500' },
  serviceChipTextActive: { color: Colors.text.inverse },
  suggestionsContainer: { flex: 1, padding: Spacing.base },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.md },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.background.secondary,
  },
  recentText: { ...Typography.body, color: Colors.text.primary },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BorderRadius.md, backgroundColor: colors.tint.blue, gap: 6,
  },
  suggestionText: { ...Typography.bodySmall, color: Colors.info, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  resultsContainer: { flex: 1 },
  resultTabs: {
    flexDirection: 'row', backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default,
  },
  resultTab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  resultTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.info },
  resultTabText: { ...Typography.body, color: Colors.text.tertiary, fontWeight: '500' },
  resultTabTextActive: { color: Colors.info, fontWeight: '600' },
  resultsList: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: 120 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md,
  },
  resultImage: { width: 56, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.border.default },
  resultImagePlaceholder: {
    position: 'absolute', left: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.tint.blue,
  },
  resultContent: { flex: 1 },
  resultName: { ...Typography.body, fontWeight: '600', color: Colors.text.primary },
  resultTags: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 2 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 6 },
  resultRating: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.primary },
  resultMetaText: { ...Typography.caption, color: Colors.text.tertiary },
  resultPrice: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.primary },
  resultCashback: { ...Typography.caption, fontWeight: '600', color: Colors.info },
  emptyResults: { alignItems: 'center', paddingVertical: 60 },
  emptyResultsText: { ...Typography.body, fontWeight: '500', color: Colors.text.primary, marginTop: Spacing.base },
  emptyResultsHint: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs },
});

export default withErrorBoundary(SharedCategoryPage, 'MainCategorySlugSearch');
