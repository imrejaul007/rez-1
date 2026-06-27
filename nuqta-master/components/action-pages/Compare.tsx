// @ts-nocheck
/**
 * Product Comparison Page (Grocery-Unique Feature)
 * /MainCategory/grocery-essentials/compare
 * Compare different products side-by-side (price, brand, rating, specs, etc.)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import productComparisonApi, { ProductComparison, ComparisonProduct } from '@/services/productComparisonApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { errorReporter } from '@/utils/errorReporter';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGold: colors.warningScale[400],
  dark: colors.nileBlue,
  green: colors.success,
  red: colors.error,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
  winnerBg: colors.successScale[50],
};

interface SelectedProduct {
  _id: string;
  name: string;
  brand?: string;
  images: string[];
  pricing?: { original?: number; selling?: number; currency?: string };
  ratings?: { average?: number; count?: number };
  inventory?: { isAvailable?: boolean; stock?: number };
  cashback?: { percentage?: number; maxAmount?: number };
  weight?: number;
  specifications?: Array<{ key: string; value: string; group?: string }>;
  deliveryInfo?: { estimatedDays?: string; expressAvailable?: boolean };
  store?: { _id?: string; name?: string; logo?: string };
}

const getPrice = (p: any): number => {
  if (p.pricing?.selling) return p.pricing.selling;
  if (p.pricing?.original) return p.pricing.original;
  if (typeof p.price === 'number') return p.price;
  if (typeof p.price === 'object' && p.price?.current) return p.price.current;
  return 0;
};

const transformToSelectedProduct = (p: any): SelectedProduct => ({
  _id: p._id || p.id,
  name: p.name || 'Product',
  brand: p.brand,
  images: p.images || [],
  pricing: p.pricing || (typeof p.price === 'object' ? { selling: p.price?.current, original: p.price?.original } : { selling: p.price }),
  ratings: p.ratings,
  inventory: p.inventory,
  cashback: p.cashback,
  weight: p.weight,
  specifications: p.specifications || [],
  deliveryInfo: p.deliveryInfo,
  store: typeof p.store === 'object' ? p.store : undefined,
});

const POPULAR_SEARCHES = [
  'Basmati Rice', 'Cooking Oil', 'Toor Dal', 'Atta',
  'Milk', 'Paneer', 'Sugar', 'Butter',
];

const HOW_STEPS = [
  { icon: 'add-circle-outline' as const, text: 'Add 2-5 products to compare' },
  { icon: 'swap-horizontal' as const, text: 'See attributes side by side' },
  { icon: 'trophy-outline' as const, text: 'Best values highlighted automatically' },
  { icon: 'bookmark-outline' as const, text: 'Save comparisons for later' },
];

function ComparePage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Selected products
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [viewPhase, setViewPhase] = useState<'landing' | 'comparing'>('landing');
  const isMounted = useIsMounted();

  // Search modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Saved comparisons
  const [savedComparisons, setSavedComparisons] = useState<ProductComparison[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);

  // Persistence
  const [currentComparisonId, setCurrentComparisonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved comparisons on mount
  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await productComparisonApi.getUserComparisons({ limit: 10 });
        if (res.success && res.data?.comparisons) {
          if (!isMounted()) return;
          setSavedComparisons(res.data.comparisons);
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to fetch saved comparisons'),
          { context: 'ComparePage.fetchSavedComparisons' },
          'warning'
        );
      } finally {
        if (!isMounted()) return;
        setIsLoadingSaved(false);
      }
    };
    fetchSaved();
  }, []);

  // Collect all unique spec keys across selected products
  const allSpecKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedProducts.forEach(p => {
      p.specifications?.forEach(spec => keys.add(spec.key));
    });
    return Array.from(keys);
  }, [selectedProducts]);

  // Winner helpers
  const cheapestId = useMemo(() => {
    if (selectedProducts.length < 2) return null;
    let minPrice = Infinity;
    let id = '';
    selectedProducts.forEach(p => {
      const price = p.pricing?.selling || p.pricing?.original || Infinity;
      if (price < minPrice) { minPrice = price; id = p._id; }
    });
    return id;
  }, [selectedProducts]);

  const bestRatingId = useMemo(() => {
    if (selectedProducts.length < 2) return null;
    let maxRating = -1;
    let id = '';
    selectedProducts.forEach(p => {
      const rating = p.ratings?.average || 0;
      if (rating > maxRating) { maxRating = rating; id = p._id; }
    });
    return maxRating > 0 ? id : null;
  }, [selectedProducts]);

  const bestCashbackId = useMemo(() => {
    if (selectedProducts.length < 2) return null;
    let maxCb = -1;
    let id = '';
    selectedProducts.forEach(p => {
      const cb = p.cashback?.percentage || 0;
      if (cb > maxCb) { maxCb = cb; id = p._id; }
    });
    return maxCb > 0 ? id : null;
  }, [selectedProducts]);

  // Search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) return;
    setIsSearching(true);
    try {
      const res = await apiClient.get<any>('/products/search', { q: query, limit: 20 });
      if (res.success && res.data) {
        const products = Array.isArray(res.data) ? res.data : res.data?.products || [];
        const selectedIds = new Set(selectedProducts.map(p => p._id));
        if (!isMounted()) return;
        setSearchResults(products.filter((p: any) => !selectedIds.has(p._id || p.id)));
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to search products for comparison'),
        { context: 'ComparePage.performSearch' },
        'warning'
      );
      if (!isMounted()) return;
      setSearchResults([]);
    } finally {
      if (!isMounted()) return;
      setIsSearching(false);
    }
  }, [selectedProducts]);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => performSearch(text), 500);
    } else {
      setSearchResults([]);
    }
  };

  const openSearchModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchModalOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 300);
  };

  const handleSelectProduct = (product: any) => {
    if (selectedProducts.length >= 5) {
      platformAlertSimple('Limit Reached', 'You can compare up to 5 products');
      return;
    }
    const normalized = transformToSelectedProduct(product);
    setSelectedProducts(prev => [...prev, normalized]);
    setIsSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== productId));
    if (selectedProducts.length <= 2) {
      setViewPhase('landing');
    }
  };

  const handleCompareNow = () => {
    if (selectedProducts.length >= 2) {
      setViewPhase('comparing');
    }
  };

  const handleClearAll = () => {
    setSelectedProducts([]);
    setViewPhase('landing');
    setCurrentComparisonId(null);
  };

  // Save comparison
  const handleSaveComparison = async () => {
    if (selectedProducts.length < 2) return;
    setIsSaving(true);
    try {
      const productIds = selectedProducts.map(p => p._id);
      const name = selectedProducts.map(p => p.brand || p.name.split(' ')[0]).join(' vs ');

      if (currentComparisonId) {
        const res = await productComparisonApi.updateComparison(currentComparisonId, { productIds, name });
        if (res.success) {
          platformAlertSimple('Updated!', 'Comparison updated');
        }
      } else {
        const res = await productComparisonApi.createComparison(productIds, name);
        if (res.success && res.data?.comparison) {
          if (!isMounted()) return;
          setCurrentComparisonId(res.data.comparison._id);
          platformAlertSimple('Saved!', 'Comparison saved to your list');
        }
      }
      // Refresh saved list
      const saved = await productComparisonApi.getUserComparisons({ limit: 10 });
      if (saved.success && saved.data?.comparisons) {
        if (!isMounted()) return;
        setSavedComparisons(saved.data.comparisons);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to save comparison'),
        { context: 'ComparePage.handleSaveComparison' },
        'warning'
      );
      platformAlertSimple('Error', 'Could not save comparison');
    } finally {
      if (!isMounted()) return;
      setIsSaving(false);
    }
  };

  // Load saved comparison
  const handleLoadSavedComparison = async (comparisonId: string) => {
    try {
      const res = await productComparisonApi.getComparisonById(comparisonId);
      if (res.success && res.data?.comparison) {
        const products = res.data.comparison.products.map(transformToSelectedProduct);
        if (!isMounted()) return;
        setSelectedProducts(products);
        setCurrentComparisonId(comparisonId);
        setViewPhase('comparing');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to load saved comparison'),
        { context: 'ComparePage.handleLoadSavedComparison' },
        'warning'
      );
      platformAlertSimple('Error', 'Could not load comparison');
    }
  };

  const handleDeleteSavedComparison = async (comparisonId: string) => {
    try {
      const res = await productComparisonApi.deleteComparison(comparisonId);
      if (res.success) {
        if (!isMounted()) return;
        setSavedComparisons(prev => prev.filter(c => c._id !== comparisonId));
        if (currentComparisonId === comparisonId) {
          if (!isMounted()) return;
          setCurrentComparisonId(null);
        }
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to delete comparison'),
        { context: 'ComparePage.handleDeleteSavedComparison' },
        'warning'
      );
      platformAlertSimple('Error', 'Could not delete comparison');
    }
  };

  // ========== RENDER ==========

  // Product slot bar
  const renderSlotBar = () => (
    <View style={styles.slotBar}>
      {selectedProducts.map((p) => (
        <Pressable key={p._id} style={styles.slot} onPress={() => handleRemoveProduct(p._id)}>
          <CachedImage
            source={p.images?.[0] || 'https://via.placeholder.com/60'}
            style={styles.slotImage}
          />
          <View style={styles.slotRemove}>
            <Ionicons name="close-circle" size={16} color={COLORS.red} />
          </View>
        </Pressable>
      ))}
      {selectedProducts.length < 5 && (
        <Pressable style={styles.slotEmpty} onPress={openSearchModal}>
          <Ionicons name="add" size={22} color={COLORS.textSecondary} />
        </Pressable>
      )}
    </View>
  );

  // Search result item
  const renderSearchResult = ({ item }: { item: any }) => {
    const price = getPrice(item);
    return (
      <Pressable style={styles.searchResultItem} onPress={() => handleSelectProduct(item)}>
        <CachedImage
          source={item.images?.[0] || 'https://via.placeholder.com/60'}
          style={styles.searchResultImage}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.searchResultName} numberOfLines={2}>{item.name}</Text>
          {item.brand && <Text style={styles.searchResultBrand}>{item.brand}</Text>}
          <View style={styles.searchResultRow}>
            {price > 0 && <Text style={styles.searchResultPrice}>{currencySymbol}{price}</Text>}
            {item.store?.name && (
              <Text style={styles.searchResultStore} numberOfLines={1}>{item.store.name}</Text>
            )}
          </View>
          {item.ratings?.average > 0 && (
            <View style={styles.searchResultRating}>
              <Ionicons name="star" size={12} color={COLORS.primaryGold} />
              <Text style={styles.searchResultRatingText}>{item.ratings.average.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Ionicons name="add-circle" size={28} color={COLORS.dark} />
      </Pressable>
    );
  };

  // Build all comparison rows data (label + cell renderer + winner)
  const comparisonRows: Array<{ label: string; renderCell: (p: SelectedProduct) => React.ReactNode; winnerId?: string | null }> = [
    {
      label: 'Price',
      winnerId: cheapestId,
      renderCell: (p) => {
        const price = p.pricing?.selling || p.pricing?.original || 0;
        const original = p.pricing?.original;
        const selling = p.pricing?.selling;
        return (
          <View>
            <Text style={[styles.priceText, cheapestId === p._id && styles.winnerText]}>
              {currencySymbol}{price}
            </Text>
            {original && selling && original > selling && (
              <Text style={styles.strikePrice}>{currencySymbol}{original}</Text>
            )}
          </View>
        );
      },
    },
    {
      label: 'Brand',
      renderCell: (p) => <Text style={styles.valueText}>{p.brand || '--'}</Text>,
    },
    {
      label: 'Rating',
      winnerId: bestRatingId,
      renderCell: (p) => (
        <View style={styles.ratingContainer}>
          {p.ratings?.average ? (
            <>
              <Ionicons name="star" size={14} color={COLORS.primaryGold} />
              <Text style={[styles.valueText, bestRatingId === p._id && styles.winnerText]}>
                {p.ratings.average.toFixed(1)}
              </Text>
              {p.ratings.count !== undefined && (
                <Text style={styles.ratingCount}>({p.ratings.count})</Text>
              )}
            </>
          ) : (
            <Text style={styles.valueTextMuted}>--</Text>
          )}
        </View>
      ),
    },
    {
      label: 'Weight',
      renderCell: (p) => (
        <Text style={styles.valueText}>
          {p.weight ? `${p.weight >= 1000 ? `${(p.weight / 1000).toFixed(1)} kg` : `${p.weight} g`}` : '--'}
        </Text>
      ),
    },
    {
      label: 'Store',
      renderCell: (p) => <Text style={styles.valueText} numberOfLines={2}>{p.store?.name || '--'}</Text>,
    },
    {
      label: 'Cashback',
      winnerId: bestCashbackId,
      renderCell: (p) => (
        <Text style={[styles.valueText, bestCashbackId === p._id && styles.winnerText]}>
          {p.cashback?.percentage ? `${p.cashback.percentage}%` : '--'}
        </Text>
      ),
    },
    {
      label: 'In Stock',
      renderCell: (p) => {
        const inStock = p.inventory?.isAvailable !== false;
        return (
          <View style={styles.stockRow}>
            <Ionicons
              name={inStock ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={inStock ? COLORS.green : COLORS.red}
            />
            <Text style={[styles.valueText, { color: inStock ? COLORS.green : COLORS.red }]}>
              {inStock ? 'Yes' : 'No'}
            </Text>
          </View>
        );
      },
    },
    {
      label: 'Delivery',
      renderCell: (p) => (
        <View>
          {p.deliveryInfo?.estimatedDays ? (
            <Text style={styles.valueText}>{p.deliveryInfo.estimatedDays}</Text>
          ) : (
            <Text style={styles.valueTextMuted}>--</Text>
          )}
          {p.deliveryInfo?.expressAvailable && (
            <Text style={styles.expressBadge}>Express</Text>
          )}
        </View>
      ),
    },
    // Dynamic spec rows
    ...allSpecKeys.map((key) => ({
      label: key,
      renderCell: (p: SelectedProduct) => {
        const spec = p.specifications?.find(s => s.key === key);
        return <Text style={styles.valueText}>{spec?.value || '--'}</Text>;
      },
    })),
    // Action row
    {
      label: '',
      renderCell: (p) => (
        <Pressable
          style={styles.viewProductBtn}
          onPress={() => router.push(`/product-page?productId=${p._id}` as any)}
        >
          <Text style={styles.viewProductText}>View</Text>
        </Pressable>
      ),
    },
  ];

  // Comparison table — fixed label column + synchronized horizontal scroll for data
  const renderComparisonTable = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Split layout: fixed labels on left, scrollable data on right */}
      <View style={styles.splitContainer}>
        {/* Fixed label column */}
        <View style={styles.fixedLabelColumn}>
          {/* Header spacer (matches product header height) */}
          <View style={[styles.labelCell, styles.headerLabelCell]} />
          {/* Data row labels */}
          {comparisonRows.map((row, idx) => (
            <View key={row.label || `label-${idx}`} style={styles.labelCell}>
              <Text style={styles.labelText}>{row.label}</Text>
            </View>
          ))}
        </View>

        {/* Scrollable product columns */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 1 }}>
          <View>
            {/* Product header row */}
            <View style={styles.tableDataRow}>
              {selectedProducts.map((p) => (
                <View key={p._id} style={styles.productCell}>
                  <Pressable style={styles.removeBtn} onPress={() => handleRemoveProduct(p._id)}>
                    <Ionicons name="close-circle" size={22} color={COLORS.red} />
                  </Pressable>
                  <CachedImage
                    source={p.images?.[0] || 'https://via.placeholder.com/100'}
                    style={styles.productImage}
                  />
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                </View>
              ))}
              {selectedProducts.length < 5 && (
                <Pressable style={styles.addProductCell} onPress={openSearchModal}>
                  <Ionicons name="add-circle-outline" size={32} color={COLORS.textSecondary} />
                  <Text style={styles.addProductText}>Add</Text>
                </Pressable>
              )}
            </View>

            {/* Data rows */}
            {comparisonRows.map((row, idx) => (
              <View key={row.label || `data-${idx}`} style={styles.tableDataRow}>
                {selectedProducts.map((p) => (
                  <View
                    key={p._id}
                    style={[styles.valueCell, row.winnerId === p._id && styles.winnerCell]}
                  >
                    {row.renderCell(p)}
                  </View>
                ))}
                {selectedProducts.length < 5 && <View style={styles.valueCell} />}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Best Value Banner */}
      {selectedProducts.length >= 2 && cheapestId && (
        <View style={styles.bestValueBanner}>
          <Ionicons name="trophy" size={20} color={COLORS.primaryGold} />
          <Text style={styles.bestValueText} numberOfLines={2}>
            Best Price: {selectedProducts.find(p => p._id === cheapestId)?.name}
          </Text>
        </View>
      )}

      {/* Save / Clear buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.saveBtn}
          onPress={handleSaveComparison}
          disabled={isSaving || selectedProducts.length < 2}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="bookmark-outline" size={16} color={COLORS.white} />
              <Text style={styles.saveBtnText}>
                {currentComparisonId ? 'Update' : 'Save'} Comparison
              </Text>
            </>
          )}
        </Pressable>
        <Pressable style={styles.clearBtn} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={16} color={COLORS.red} />
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  // Landing view
  const renderLanding = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.landingContent}>
      {/* Popular searches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Products to Compare</Text>
        <View style={styles.suggestionsGrid}>
          {POPULAR_SEARCHES.map((item, i) => (
            <Pressable
              key={i}
              style={styles.suggestionChip}
              onPress={() => {
                setSearchQuery(item);
                setIsSearchModalOpen(true);
                setTimeout(() => {
                  performSearch(item);
                  searchInputRef.current?.focus();
                }, 300);
              }}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Saved comparisons */}
      {!isLoadingSaved && savedComparisons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Comparisons</Text>
          {savedComparisons.slice(0, 5).map((comp) => (
            <View key={comp._id} style={styles.savedCard}>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                onPress={() => handleLoadSavedComparison(comp._id)}
              >
                <Ionicons name="bookmark" size={16} color={COLORS.primaryGold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedName}>
                    {comp.name || `${comp.products.length} products`}
                  </Text>
                  <Text style={styles.savedMeta}>
                    {comp.products.length} products  {new Date(comp.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </Pressable>
              <Pressable
                style={styles.savedDeleteBtn}
                onPress={() => handleDeleteSavedComparison(comp._id)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.red} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>How Compare Works</Text>
        <View style={styles.howSteps}>
          {HOW_STEPS.map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={styles.howStepIcon}>
                <Ionicons name={step.icon} size={18} color={COLORS.dark} />
              </View>
              <Text style={styles.howStepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Compare Products</Text>
          <Text style={styles.headerSubtitle}>
            {selectedProducts.length === 0
              ? 'Add products to compare'
              : `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected`}
          </Text>
        </View>
        {selectedProducts.length > 0 && viewPhase === 'comparing' && (
          <Pressable onPress={openSearchModal}>
            <Ionicons name="add-circle-outline" size={28} color={COLORS.dark} />
          </Pressable>
        )}
      </View>

      {/* Slot bar */}
      {renderSlotBar()}

      {/* Compare Now button (shown when 2+ selected but not yet comparing) */}
      {selectedProducts.length >= 2 && viewPhase === 'landing' && (
        <Pressable style={styles.compareNowBtn} onPress={handleCompareNow}>
          <Ionicons name="swap-horizontal" size={18} color={COLORS.white} />
          <Text style={styles.compareNowText}>Compare Now ({selectedProducts.length})</Text>
        </Pressable>
      )}

      {/* Main content */}
      {viewPhase === 'comparing' && selectedProducts.length >= 2
        ? renderComparisonTable()
        : renderLanding()
      }

      {/* Search Modal */}
      <Modal visible={isSearchModalOpen} animationType="slide" onRequestClose={() => setIsSearchModalOpen(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIsSearchModalOpen(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>Add Product</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Modal Search Bar */}
          <View style={styles.modalSearchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              ref={searchInputRef}
              style={styles.modalSearchInput}
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={() => { Keyboard.dismiss(); if (searchQuery.trim()) performSearch(searchQuery); }}
              placeholder="Search for a product..."
              placeholderTextColor={COLORS.textSecondary}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Loading */}
          {isSearching && (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="small" color={COLORS.dark} />
              <Text style={styles.modalLoadingText}>Searching...</Text>
            </View>
          )}

          {/* Results */}
          {!isSearching && searchResults.length > 0 && (
            <FlashList
              data={searchResults}
              keyExtractor={(item, i) => item._id || item.id || String(i)}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.searchResultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              estimatedItemSize={70}
            />
          )}

          {/* Empty state */}
          {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.modalEmpty}>
              <Ionicons name="search-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.modalEmptyText}>No products found</Text>
              <Text style={styles.modalEmptySubtext}>Try a different search term</Text>
            </View>
          )}

          {/* Quick suggestions in modal */}
          {searchQuery.length < 2 && (
            <View style={styles.modalSuggestions}>
              <Text style={styles.modalSuggestionsTitle}>Quick Searches</Text>
              <View style={styles.suggestionsGrid}>
                {POPULAR_SEARCHES.map((item, i) => (
                  <Pressable
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => { setSearchQuery(item); performSearch(item); }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },

  // Slot bar
  slotBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  slot: { position: 'relative' },
  slotImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.border },
  slotRemove: { position: 'absolute', top: -4, right: -4 },
  slotEmpty: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed',
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },

  // Compare now
  compareNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.dark,
  },
  compareNowText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Landing
  landingContent: { padding: 16, paddingBottom: 120 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },

  // Saved
  savedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 8,
  },
  savedName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  savedMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  savedDeleteBtn: { padding: 6 },

  // How it works
  howItWorks: { padding: 20, backgroundColor: COLORS.white, borderRadius: 16 },
  howTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' },
  howSteps: { gap: 14 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howStepIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint.amberLight,
    justifyContent: 'center', alignItems: 'center',
  },
  howStepText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },

  // Comparison table — split layout: fixed labels + scrollable data
  splitContainer: { flexDirection: 'row', marginTop: 8 },
  fixedLabelColumn: { width: 80, backgroundColor: COLORS.background, borderRightWidth: 1, borderRightColor: COLORS.border },
  labelCell: {
    minHeight: 48, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLabelCell: { minHeight: 120 },
  labelText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tableDataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  productCell: {
    width: 140, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
    backgroundColor: COLORS.white, position: 'relative', minHeight: 120,
  },
  removeBtn: { position: 'absolute', top: 2, right: 2, zIndex: 1 },
  productImage: { width: 64, height: 64, borderRadius: 10, marginBottom: 6, backgroundColor: COLORS.border },
  productName: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center' },
  addProductCell: {
    width: 100, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border,
    borderStyle: 'dashed', borderRadius: 8, marginLeft: 4, minHeight: 120,
  },
  addProductText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  valueCell: {
    width: 140, minHeight: 48, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white,
  },
  winnerCell: { backgroundColor: COLORS.winnerBg },
  priceText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  strikePrice: { fontSize: 12, color: COLORS.textSecondary, textDecorationLine: 'line-through', marginTop: 2 },
  winnerText: { color: COLORS.green },
  valueText: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center' },
  valueTextMuted: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingCount: { fontSize: 11, color: COLORS.textSecondary },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expressBadge: {
    fontSize: 10, fontWeight: '700', color: COLORS.primaryGold,
    backgroundColor: colors.tint.amberLight, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginTop: 4, textAlign: 'center',
  },
  viewProductBtn: {
    backgroundColor: COLORS.dark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  viewProductText: { color: COLORS.white, fontWeight: '600', fontSize: 12 },

  // Best value banner
  bestValueBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)', padding: 12, margin: 16, borderRadius: 12, gap: 8,
  },
  bestValueText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  // Action row
  actionRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 8, marginBottom: 16,
  },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.dark, paddingVertical: 14, borderRadius: 12,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.red,
  },
  clearBtnText: { color: COLORS.red, fontWeight: '600', fontSize: 13 },

  // Search Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalCloseBtn: { padding: 4, width: 32 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  modalSearchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100],
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16,
    marginTop: 12, gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },
  modalLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 30 },
  modalLoadingText: { fontSize: 14, color: COLORS.textSecondary },
  searchResultsList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 8,
  },
  searchResultImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.border },
  searchResultName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  searchResultBrand: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  searchResultPrice: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  searchResultStore: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  searchResultRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  searchResultRatingText: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  modalEmpty: { alignItems: 'center', marginTop: 60 },
  modalEmptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 },
  modalEmptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  modalSuggestions: { padding: 16 },
  modalSuggestionsTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
});

export default React.memo(ComparePage);
