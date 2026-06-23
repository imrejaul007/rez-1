/**
 * Compare Devices Page
 * /MainCategory/electronics/compare-devices
 * Device comparison flow: select category, pick devices, view side-by-side comparison
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  blue: colors.infoScale[400],
  blueDark: colors.brand.blue,
  blueLight: colors.tint.blue,
  blueLighter: colors.tint.blueLight,
  dark: colors.nileBlue,
  darkDeep: '#0f2638',
  gold: colors.warningScale[400],
  goldDark: colors.warningScale[400],
  green: colors.success,
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.offWhite,
  border: colors.neutral[200],
};

const DEVICE_CATEGORIES = [
  { id: 'mobile-phones', label: 'Mobiles', icon: '\uD83D\uDCF1', description: 'Smartphones & feature phones' },
  { id: 'laptops', label: 'Laptops', icon: '\uD83D\uDCBB', description: 'Notebooks & workstations' },
  { id: 'televisions', label: 'TVs', icon: '\uD83D\uDCFA', description: 'Smart TVs, OLED & QLED' },
  { id: 'cameras', label: 'Cameras', icon: '\uD83D\uDCF7', description: 'DSLR & mirrorless' },
  { id: 'audio-headphones', label: 'Audio', icon: '\uD83C\uDFA7', description: 'Headphones & speakers' },
  { id: 'gaming', label: 'Gaming', icon: '\uD83C\uDFAE', description: 'Consoles & accessories' },
  { id: 'smartwatches', label: 'Watches', icon: '\u231A', description: 'Smartwatches & trackers' },
  { id: 'accessories', label: 'Accessories', icon: '\uD83D\uDD0C', description: 'Chargers, cases & more' },
];

const COMPARISON_SPECS = [
  { key: 'price', label: 'Price', icon: 'pricetag-outline' },
  { key: 'rating', label: 'Rating', icon: 'star-outline' },
  { key: 'brand', label: 'Brand', icon: 'business-outline' },
  { key: 'warranty', label: 'Warranty', icon: 'shield-checkmark-outline' },
  { key: 'delivery', label: 'Delivery', icon: 'car-outline' },
  { key: 'cashback', label: 'Cashback', icon: 'wallet-outline' },
];

function CompareDevicesPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const isMounted = useIsMounted();
  const [step, setStep] = useState<'category' | 'select' | 'compare'>(
    params.categoryId ? 'select' : 'category'
  );
  const [selectedCategory, setSelectedCategory] = useState(params.categoryId || '');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.store?.name?.toLowerCase().includes(q) ||
      p.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const fetchProducts = useCallback(async (categorySlug: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<any>('/products', {
        category: 'electronics',
        subcategory: categorySlug,
        limit: 50,
      });
      if (res.success && res.data) {
        const prods = Array.isArray(res.data) ? res.data : (res.data.products || []);
        if (!isMounted()) return;
        setProducts(prods);
      }
    } catch (err) {
      // Fallback: try fetching stores if products endpoint fails
      try {
        const storeRes = await storesApi.getStoresBySubcategorySlug(categorySlug, 30);
        if (storeRes.success && storeRes.data) {
          const stores = Array.isArray(storeRes.data) ? storeRes.data : (storeRes.data.stores || []);
          // Convert stores to product-like items for comparison
          const storeItems = stores.map((s: any) => ({
            _id: s._id || s.id,
            name: s.name,
            image: s.banner?.[0] || s.logo,
            pricing: { basePrice: s.priceForTwo || 0 },
            ratings: s.ratings,
            store: { name: s.location?.city || 'N/A' },
            tags: s.tags || [],
            cashback: { percentage: s.offers?.cashback || 0 },
            warranty: s.tags?.find((t: string) => t.toLowerCase().includes('warranty')) || 'Standard',
            deliveryTime: s.operationalInfo?.deliveryTime || 'Standard delivery',
          }));
          if (!isMounted()) return;
          setProducts(storeItems);
        }
      } catch (err2) {
        // silently handle
      }
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedDevices([]);
    setStep('select');
    fetchProducts(categoryId);
  };

  const handleToggleDevice = (device: any) => {
    if (device.inventory?.inStock === false) {
      platformAlertSimple('Out of Stock', 'This device is currently out of stock and cannot be selected for comparison.');
      return;
    }
    const isSelected = selectedDevices.some(d => (d._id || d.id) === (device._id || device.id));
    if (isSelected) {
      setSelectedDevices(prev => prev.filter(d => (d._id || d.id) !== (device._id || device.id)));
    } else {
      if (selectedDevices.length >= 3) {
        platformAlertSimple('Limit Reached', 'You can compare up to 3 devices at a time.');
        return;
      }
      setSelectedDevices(prev => [...prev, device]);
    }
  };

  const handleCompare = () => {
    if (selectedDevices.length < 2) {
      platformAlertSimple('Select Devices', 'Please select at least 2 devices to compare.');
      return;
    }
    setStep('compare');
  };

  const getDeviceSpec = (device: any, specKey: string): string => {
    switch (specKey) {
      case 'price':
        const price = device.pricing?.salePrice || device.pricing?.basePrice || device.price || 0;
        return price > 0 ? `${currencySymbol}${price}` : 'N/A';
      case 'rating':
        return `${(device.ratings?.average || 4.5).toFixed(1)} (${device.ratings?.count || 0})`;
      case 'brand':
        return device.store?.name || device.brand || 'N/A';
      case 'warranty':
        return device.warranty || 'Standard';
      case 'delivery':
        return device.deliveryTime || device.operationalInfo?.deliveryTime || 'Standard';
      case 'cashback':
        const cb = device.cashback?.percentage || device.offers?.cashback || 0;
        return cb > 0 ? `${cb}%` : 'None';
      default:
        return 'N/A';
    }
  };

  const getCategoryLabel = (id: string) => {
    return DEVICE_CATEGORIES.find(c => c.id === id)?.label || 'Devices';
  };

  // ─────────── STEP 1: Category Selection ───────────
  if (step === 'category') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Compare Devices</Text>
            <Text style={styles.headerSubtitle}>Select a category to start comparing</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.categoryGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotTextActive}>1</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>2</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <Text style={styles.stepDotText}>3</Text>
            </View>
          </View>
          <Text style={styles.stepLabel}>Step 1: Choose Category</Text>

          {DEVICE_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => handleSelectCategory(cat.id)}
             
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryDesc}>{cat.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────── STEP 3: Compare ───────────
  if (step === 'compare') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('select')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Comparison</Text>
            <Text style={styles.headerSubtitle}>{selectedDevices.length} {getCategoryLabel(selectedCategory)}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.compareContent}>
          {/* Device headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compareHeaderScroll}>
            <View style={styles.compareHeaderRow}>
              <View style={styles.specLabelCol}>
                <Text style={styles.specLabelHeader}>Specs</Text>
              </View>
              {selectedDevices.map((device, i) => {
                const imageUri = device.images?.[0]?.url || device.image;
                return (
                  <View key={device._id || device.id || i} style={styles.deviceCol}>
                    {imageUri ? (
                      <CachedImage source={imageUri} style={styles.compareDeviceImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.compareDeviceImg, styles.compareDevicePlaceholder]}>
                        <Ionicons name="hardware-chip-outline" size={24} color={COLORS.blue} />
                      </View>
                    )}
                    <Text style={styles.compareDeviceName} numberOfLines={2}>{device.name}</Text>
                    <Pressable
                      style={styles.compareViewBtn}
                      onPress={() => router.push(`/product-page?id=${device._id || device.id}` as any)}
                    >
                      <Text style={styles.compareViewBtnText}>View Details</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Spec rows */}
          {COMPARISON_SPECS.map(spec => (
            <ScrollView key={spec.key} horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.specRow}>
                <View style={styles.specLabelCol}>
                  <View style={styles.specLabelInner}>
                    <Ionicons name={spec.icon as any} size={16} color={COLORS.blue} />
                    <Text style={styles.specLabel}>{spec.label}</Text>
                  </View>
                </View>
                {selectedDevices.map((device, i) => {
                  const value = getDeviceSpec(device, spec.key);
                  // Highlight the best value
                  const isBest = spec.key === 'rating'
                    ? selectedDevices.every(d => (d.ratings?.average || 0) <= (device.ratings?.average || 0))
                    : spec.key === 'cashback'
                    ? selectedDevices.every(d => (d.cashback?.percentage || 0) <= (device.cashback?.percentage || 0))
                    : false;

                  return (
                    <View key={device._id || device.id || i} style={[styles.specValueCol, isBest && styles.specValueBest]}>
                      <Text style={[styles.specValue, isBest && styles.specValueTextBest]}>{value}</Text>
                      {isBest && spec.key === 'rating' && (
                        <View style={styles.bestBadge}>
                          <Text style={styles.bestBadgeText}>Best</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ))}

          {/* Quick Verdict */}
          <View style={styles.verdictCard}>
            <LinearGradient colors={[COLORS.blueLight, COLORS.blueLighter]} style={styles.verdictGradient}>
              <Ionicons name="bulb-outline" size={24} color={COLORS.blue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verdictTitle}>Quick Verdict</Text>
                <Text style={styles.verdictText}>
                  {selectedDevices.length >= 2
                    ? `Based on ratings, ${selectedDevices.reduce((best, d) =>
                        (d.ratings?.average || 0) > (best.ratings?.average || 0) ? d : best
                      ).name || 'the top-rated device'} leads the comparison. Check individual product pages for detailed specifications.`
                    : 'Select more devices to get a detailed comparison verdict.'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────── STEP 2: Device Selection ───────────
  const renderProductCard = ({ item: product }: { item: any }) => {
    const imageUri = product.images?.[0]?.url || product.image;
    const isSelected = selectedDevices.some(d => (d._id || d.id) === (product._id || product.id));
    const price = product.pricing?.salePrice || product.pricing?.basePrice || product.price || 0;
    const rating = product.ratings?.average?.toFixed(1) || '4.5';
    const cashback = product.cashback?.percentage || product.offers?.cashback;

    return (
      <Pressable
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => handleToggleDevice(product)}
       
      >
        <View style={styles.productImgWrap}>
          {imageUri ? (
            <CachedImage source={imageUri} style={styles.productImg} contentFit="cover" />
          ) : (
            <View style={[styles.productImg, styles.productImgPlaceholder]}>
              <Ionicons name="hardware-chip" size={28} color={COLORS.textSecondary} />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.blue} />
            </View>
          )}
          {cashback ? (
            <View style={styles.productCashbackBadge}>
              <Text style={styles.productCashbackText}>{cashback}%</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productStore} numberOfLines={1}>{product.store?.name || 'Store'}</Text>
          <View style={styles.productMetaRow}>
            <View style={styles.productRating}>
              <Ionicons name="star" size={12} color={COLORS.goldDark} />
              <Text style={styles.productRatingText}>{rating}</Text>
            </View>
            {price > 0 && (
              <Text style={styles.productPrice}>{currencySymbol}{price}</Text>
            )}
          </View>
          {product.inventory?.inStock === false && (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '600' }}>Out of Stock</Text>
            </View>
          )}
        </View>
        <View style={[
          styles.selectIndicator,
          isSelected && styles.selectIndicatorActive,
          product.inventory?.inStock === false && { borderColor: colors.neutral[300], opacity: 0.5 },
        ]}>
          <Ionicons
            name={isSelected ? 'checkmark' : 'add'}
            size={18}
            color={product.inventory?.inStock === false ? colors.neutral[400] : (isSelected ? COLORS.white : COLORS.blue)}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => { setStep('category'); setSelectedDevices([]); }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Select Devices</Text>
          <Text style={styles.headerSubtitle}>
            {getCategoryLabel(selectedCategory)} - Pick 2-3 to compare
          </Text>
        </View>
      </View>

      {/* Step indicator */}
      <View style={styles.stepBarWrap}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotDone]}>
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          </View>
          <View style={[styles.stepLine, styles.stepLineDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepDotTextActive}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}>
            <Text style={styles.stepDotText}>3</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${getCategoryLabel(selectedCategory).toLowerCase()}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Selected count badge */}
      {selectedDevices.length > 0 && (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedBarText}>
            {selectedDevices.length} device{selectedDevices.length > 1 ? 's' : ''} selected
          </Text>
          <View style={styles.selectedAvatars}>
            {selectedDevices.map((d, i) => (
              <Pressable
                key={d._id || d.id || i}
                style={styles.selectedAvatar}
                onPress={() => handleToggleDevice(d)}
              >
                <Text style={styles.selectedAvatarText}>{d.name?.charAt(0) || '?'}</Text>
                <View style={styles.selectedRemove}>
                  <Ionicons name="close" size={10} color={COLORS.white} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.loadingText}>Loading {getCategoryLabel(selectedCategory).toLowerCase()}...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="hardware-chip-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matches found' : 'No devices available'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term' : 'Check back later for devices in this category'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredProducts}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderProductCard}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Compare button */}
      {selectedDevices.length >= 2 && step === 'select' && (
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.compareBtn}
            onPress={handleCompare}
           
          >
            <LinearGradient
              colors={[COLORS.blue, COLORS.blueDark]}
              style={styles.compareBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="git-compare-outline" size={18} color={COLORS.white} />
              <Text style={styles.compareBtnText}>
                Compare {selectedDevices.length} Devices
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary },

  // Step indicator
  stepBarWrap: { paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, paddingHorizontal: 40 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutral[200],
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.blue },
  stepDotDone: { backgroundColor: COLORS.green },
  stepDotText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  stepDotTextActive: { fontSize: 12, fontWeight: '600', color: COLORS.white },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.neutral[200], marginHorizontal: 8 },
  stepLineDone: { backgroundColor: COLORS.green },
  stepLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', marginTop: 12, marginBottom: 16 },

  // Category grid
  categoryGrid: { padding: 16, paddingBottom: 100 },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  categoryIcon: { fontSize: 32 },
  categoryLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  categoryDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  // Selected bar
  selectedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.blueLight,
    borderBottomWidth: 1, borderBottomColor: COLORS.blueLighter,
  },
  selectedBarText: { fontSize: 13, fontWeight: '600', color: COLORS.blue },
  selectedAvatars: { flexDirection: 'row', gap: 6 },
  selectedAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.blue,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  selectedAvatarText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  selectedRemove: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
  },

  // Loading/Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

  // Product list
  productList: { padding: 16, paddingBottom: 120 },
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    }),
  },
  productCardSelected: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  productImgWrap: { position: 'relative' },
  productImg: { width: 64, height: 64, borderRadius: 14 },
  productImgPlaceholder: { backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
  selectedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14, backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  productCashbackBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: COLORS.blue, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  productCashbackText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  productStore: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  productMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  productRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  productRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  productPrice: { fontSize: 13, fontWeight: '700', color: COLORS.blue },
  selectIndicator: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.blue,
    justifyContent: 'center', alignItems: 'center',
  },
  selectIndicatorActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },

  // Compare
  compareContent: { paddingBottom: 100 },
  compareHeaderScroll: { backgroundColor: COLORS.white },
  compareHeaderRow: { flexDirection: 'row', padding: 16, gap: 12 },
  specLabelCol: { width: 100, justifyContent: 'center' },
  specLabelHeader: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  deviceCol: { width: 140, alignItems: 'center', gap: 8 },
  compareDeviceImg: { width: 80, height: 80, borderRadius: 12 },
  compareDevicePlaceholder: { backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center' },
  compareDeviceName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  compareViewBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.blueLight },
  compareViewBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.blue },

  specRow: {
    flexDirection: 'row', padding: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  specLabelInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  specValueCol: { width: 140, alignItems: 'center', justifyContent: 'center' },
  specValueBest: { backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 4 },
  specValue: { fontSize: 13, color: COLORS.textPrimary, textAlign: 'center' },
  specValueTextBest: { fontWeight: '600', color: COLORS.blue },
  bestBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.blue, marginTop: 2 },
  bestBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.white },

  // Verdict
  verdictCard: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  verdictGradient: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  verdictTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  verdictText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  compareBtn: { borderRadius: 16, overflow: 'hidden' },
  compareBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  compareBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});

export default React.memo(CompareDevicesPage);
