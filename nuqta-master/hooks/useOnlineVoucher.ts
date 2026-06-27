// hooks/useOnlineVoucher.ts - State management hook for Online Voucher system

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import { useRezBalance, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import NetInfo from '@react-native-community/netinfo';
import {
  VoucherState,
  UseVoucherReturn,
  Brand,
  Category,
  FilterOptions
} from '@/types/voucher.types';
import realVouchersApi from '@/services/realVouchersApi';
import logger from '@/utils/logger';
import { colors } from '@/constants/theme';

// Category icon mapping
const CATEGORY_ICONS: { [key: string]: string } = {
  beauty: '💄',
  electronics: '📱',
  entertainment: '🎬',
  fashion: '👗',
  food: '🍔',
  grocery: '🛒',
  groceries: '🛒',
  shopping: '🛍️',
  travel: '✈️',
  sports: '⚽',
};

// Category color mapping
const CATEGORY_COLORS: { [key: string]: { color: string; backgroundColor: string } } = {
  beauty: { color: colors.brand.pink, backgroundColor: colors.pinkMist },
  electronics: { color: '#3B82F6', backgroundColor: colors.tint.blueLight },
  entertainment: { color: colors.brand.purpleLight, backgroundColor: colors.tint.purple },
  fashion: { color: colors.brand.pink, backgroundColor: colors.pinkMist },
  food: { color: colors.lightMustard, backgroundColor: colors.linen },
  grocery: { color: '#F59E0B', backgroundColor: colors.tint.amberLight },
  groceries: { color: '#F59E0B', backgroundColor: colors.tint.amberLight },
  shopping: { color: colors.error, backgroundColor: colors.errorScale[100] },
  travel: { color: colors.brand.cyan, backgroundColor: '#CFFAFE' },
  sports: { color: colors.tealGreen, backgroundColor: '#CCFBF1' },
};

export const useOnlineVoucher = (): UseVoucherReturn => {
  const router = useRouter();
  const rezBalance = useRezBalance();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [state, setState] = useState<VoucherState>({
    currentView: 'main',
    searchQuery: '',
    selectedCategory: null,
    selectedBrand: null,
    brands: [],
    allBrands: [],
    categories: [],
    featuredOffers: [],
    loading: false,
    error: null,
    userCoins: 0,
    filters: {
      cashbackRange: [0, 30],
      minRating: 0,
      sortBy: 'popularity',
      categories: []
    }
  });
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  const [heroCarousel, setHeroCarousel] = useState<any[]>([]);

  // Sync user coins from WalletContext (no extra API call)
  useEffect(() => {
    if (rezBalance > 0) {
      setState(prev => ({ ...prev, userCoins: rezBalance }));
    }
  }, [rezBalance]);

  // Initialize data on mount with mounted guard
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    if (authLoading || !isAuthenticated) return;
    initializeVoucherData();
    initializeHeroCarousel();
    return () => { isMountedRef.current = false; };
  }, [authLoading, isAuthenticated]);

  const initializeHeroCarousel = useCallback(async () => {
    try {
      // PRODUCTION: Always use real API
      const carouselRes = await realVouchersApi.getHeroCarousel(5);
      if (carouselRes.success && carouselRes.data) {
        setHeroCarousel(carouselRes.data);
      } else {
        logger.warn('⚠️ [ONLINE VOUCHER] Hero carousel API returned empty data');
        setHeroCarousel([]);
      }
    } catch (error) {
      logger.error('❌ [ONLINE VOUCHER] Failed to load hero carousel:', error);
      // Production: Don't fall back to mock data - show empty state
      setHeroCarousel([]);
    }
  }, []);

  const initializeVoucherData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // PRODUCTION: Always use real backend API
      const [categoriesRes, brandsRes] = await Promise.all([
        realVouchersApi.getVoucherCategories(),
        realVouchersApi.getVoucherBrands({ page: 1, limit: 50 })
      ]);

      // Validate API responses
      if (!categoriesRes.success || !categoriesRes.data) {
        logger.error('❌ [ONLINE VOUCHER] Failed to load categories:', categoriesRes);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load categories' }));
        return;
      }

      if (!brandsRes.success || !brandsRes.data) {
        logger.error('❌ [ONLINE VOUCHER] Failed to load brands:', brandsRes);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load brands' }));
        return;
      }

        // Transform backend data to match frontend types
        const categoriesMap: { [key: string]: Category } = {};
        
        categoriesRes.data.forEach((cat: string) => {
          const normalizedCat = cat.toLowerCase();
          const categoryColors = CATEGORY_COLORS[normalizedCat] || { color: colors.neutral[500], backgroundColor: '#FFFFFF' };
          
          categoriesMap[normalizedCat] = {
            id: cat,
            name: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '),
            icon: CATEGORY_ICONS[normalizedCat] || '🏷️',
            color: categoryColors.color,
            backgroundColor: categoryColors.backgroundColor,
            brandCount: 0, // Will be updated below
            featuredBrands: [],
            slug: normalizedCat
          };
        });

        // Count brands per category
        brandsRes.data.forEach((brand: any) => {
          const cat = brand.category?.toLowerCase() || 'other';
          if (categoriesMap[cat]) {
            categoriesMap[cat].brandCount = (categoriesMap[cat].brandCount || 0) + 1;
          }
        });

        // Order categories to match image: Beauty, Electronics, Entertainment, Fashion, Food, Groceries
        // Remove duplicates - prefer 'groceries' over 'grocery'
        if (categoriesMap['groceries'] && categoriesMap['grocery']) {
          // Merge grocery into groceries
          categoriesMap['groceries'].brandCount += categoriesMap['grocery'].brandCount || 0;
          delete categoriesMap['grocery'];
        }

        const categoryOrder = ['beauty', 'electronics', 'entertainment', 'fashion', 'food', 'groceries', 'shopping', 'travel', 'sports'];
        const orderedCategories: Category[] = [];
        
        // First add categories in the specified order (matching image)
        categoryOrder.forEach(catKey => {
          if (categoriesMap[catKey]) {
            orderedCategories.push(categoriesMap[catKey]);
            delete categoriesMap[catKey];
          }
        });
        
        // Then add any remaining categories
        Object.values(categoriesMap).forEach(cat => {
          orderedCategories.push(cat);
        });
        
        const categories = orderedCategories;

        const brands: Brand[] = brandsRes.data.map((brand: any) => ({
          id: brand._id,
          name: brand.name,
          logo: brand.logo,
          backgroundColor: brand.backgroundColor || '#F3F4F6',
          logoColor: brand.logoColor,
          cashbackRate: brand.cashbackRate || 0,
          rating: brand.rating || 0,
          reviewCount: brand.ratingCount ? `${(brand.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
          description: brand.description || '',
          categories: [brand.category || ''],
          featured: brand.isFeatured || false,
          newlyAdded: brand.isNewlyAdded || false,
          offers: [],
        }));

        setState(prev => ({
          ...prev,
          loading: false,
          categories,
          brands,
          allBrands: brands, // Store all brands for local filtering
          error: null
        }));
    } catch (error) {
      logger.error('Failed to load voucher data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load voucher data'
      }));
    }
  }, []);

  const searchBrands = useCallback(async (query: string) => {
    // Cancel previous search request if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    // Input validation and sanitization
    let trimmedQuery = query.trim();

    // Validate query length
    if (trimmedQuery.length > 100) {
      logger.warn('Search query too long, truncating to 100 characters');
      trimmedQuery = trimmedQuery.substring(0, 100);
    }

    // Remove potentially dangerous characters
    const sanitizedQuery = trimmedQuery.replace(/[<>\"']/g, '');

    // If query is empty after sanitization, show all brands
    if (!sanitizedQuery) {
      setState(prev => ({
        ...prev,
        searchQuery: query,
        brands: prev.allBrands || [],
        currentView: 'main',
        loading: false,
        error: null
      }));
      return;
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    // Show loading state
    setState(prev => ({
      ...prev,
      searchQuery: query,
      loading: true,
      error: null
    }));

    try {
      // Call backend API for comprehensive search with sanitized query
      const searchRes = await realVouchersApi.getVoucherBrands({
        search: sanitizedQuery,
        page: 1,
        limit: 50
      });

      if (searchRes.success && searchRes.data) {
        // Transform backend data to match frontend types
        const brands: Brand[] = searchRes.data.map((brand: any) => ({
          id: brand._id,
          name: brand.name,
          logo: brand.logo,
          backgroundColor: brand.backgroundColor || '#F3F4F6',
          logoColor: brand.logoColor,
          cashbackRate: brand.cashbackRate || 0,
          rating: brand.rating || 0,
          reviewCount: brand.ratingCount ? `${(brand.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
          description: brand.description || '',
          categories: [brand.category || ''],
          featured: brand.isFeatured || false,
          newlyAdded: brand.isNewlyAdded || false,
          offers: [],
        }));

        setState(prev => ({
          ...prev,
          brands,
          currentView: 'search',
          loading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          brands: [],
          loading: false,
          error: null // Show empty state instead of error
        }));
      }
    } catch (error) {
      // If request was aborted, don't show error
      if ((error as any).name === 'AbortError') {
        logger.log('Search request cancelled');
        return;
      }

      logger.error('❌ [ONLINE VOUCHER] Search error:', error);

      // Get user-friendly error message
      let errorMsg = 'Search failed. Please try again.';

      // Check network connectivity in platform-specific way
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          errorMsg = 'No internet connection. Please check your network.';
        } else if ((error as any)?.response?.status >= 500) {
          errorMsg = 'Server error. Please try again later.';
        }
      } else {
        // For React Native, check NetInfo
        try {
          const netState = await NetInfo.fetch();
          if (!netState.isConnected) {
            errorMsg = 'No internet connection. Please check your network.';
          } else if ((error as any)?.response?.status >= 500) {
            errorMsg = 'Server error. Please try again later.';
          }
        } catch {
          if ((error as any)?.response?.status >= 500) {
            errorMsg = 'Server error. Please try again later.';
          }
        }
      }

      setState(prev => ({
        ...prev,
        brands: [],
        loading: false,
        error: errorMsg
      }));
    }
  }, []);

  const selectCategory = useCallback(async (categoryId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCategory: categoryId,
      loading: true,
      currentView: categoryId ? 'category' : 'main',
      searchQuery: '' // Clear search when selecting category
    }));

    try {
      // PRODUCTION: Always use real API
      const brandsRes = await realVouchersApi.getVoucherBrands({
        category: categoryId || undefined,
        page: 1,
        limit: 50
      });

      if (!brandsRes.success || !brandsRes.data) {
        logger.error('❌ [ONLINE VOUCHER] Failed to load category brands:', brandsRes);
        setState(prev => ({
          ...prev,
          brands: [],
          loading: false,
          error: 'Failed to load category brands'
        }));
        return;
      }

        const brands: Brand[] = brandsRes.data.map((brand: any) => ({
          id: brand._id,
          name: brand.name,
          logo: brand.logo,
          backgroundColor: brand.backgroundColor || '#F3F4F6',
          logoColor: brand.logoColor,
          cashbackRate: brand.cashbackRate || 0,
          rating: brand.rating || 0,
          reviewCount: brand.ratingCount ? `${(brand.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
          description: brand.description || '',
          categories: [brand.category || ''],
          featured: brand.isFeatured || false,
          newlyAdded: brand.isNewlyAdded || false,
          offers: [],
        }));

        setState(prev => ({
          ...prev,
          brands,
          loading: false,
          error: null
        }));
    } catch (error) {
      logger.error('Failed to load category brands:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load category brands'
      }));
    }
  }, []);

  const selectBrand = useCallback((brand: Brand) => {
    setState(prev => ({
      ...prev,
      selectedBrand: brand,
      currentView: 'brand'
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      brands: prev.allBrands || [], // Restore all brands
      currentView: 'main',
      selectedCategory: null
    }));
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      initializeVoucherData(),
      initializeHeroCarousel()
    ]);
  }, [initializeVoucherData, initializeHeroCarousel]);

  const updateFilters = useCallback(async (newFilters: Partial<FilterOptions>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      loading: true
    }));

    try {
      // PRODUCTION: Always use real API
      const brandsRes = await realVouchersApi.getVoucherBrands({
        category: state.selectedCategory || undefined,
        search: state.searchQuery || undefined,
        page: 1,
        limit: 50
      });

      if (!brandsRes.success || !brandsRes.data) {
        logger.error('❌ [ONLINE VOUCHER] Failed to apply filters:', brandsRes);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to apply filters'
        }));
        return;
      }

        let brands: Brand[] = brandsRes.data.map((brand: any) => ({
          id: brand._id,
          name: brand.name,
          logo: brand.logo,
          backgroundColor: brand.backgroundColor || '#F3F4F6',
          logoColor: brand.logoColor,
          cashbackRate: brand.cashbackRate || 0,
          rating: brand.rating || 0,
          reviewCount: brand.ratingCount ? `${(brand.ratingCount / 1000).toFixed(1)}k+ users` : '0 users',
          description: brand.description || '',
          categories: [brand.category || ''],
          featured: brand.isFeatured || false,
          newlyAdded: brand.isNewlyAdded || false,
          offers: [],
        }));

        // Apply client-side sorting based on sortBy filter
        const sortBy = newFilters.sortBy || state.filters.sortBy;
        if (sortBy === 'cashback') {
          brands.sort((a, b) => b.cashbackRate - a.cashbackRate);
        } else if (sortBy === 'rating') {
          brands.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'popularity') {
          brands.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        } else if (sortBy === 'newest') {
          brands.sort((a, b) => (b.newlyAdded ? 1 : 0) - (a.newlyAdded ? 1 : 0));
        }

        setState(prev => ({
          ...prev,
          brands,
          loading: false,
          error: null
        }));
    } catch (error) {
      logger.error('Failed to apply filters:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to apply filters'
      }));
    }
  }, [state.selectedCategory, state.searchQuery, state.filters]);

  // Handler functions for components
  const handleSearch = useCallback((query: string) => {
    searchBrands(query);
  }, [searchBrands]);

  const handleCategorySelect = useCallback((category: Category) => {
    // Navigate to voucher category page instead of filtering in same page
    router.push(`/voucher/category/${category.slug || category.id.toLowerCase()}`);
  }, []);

  const handleBrandSelect = useCallback((brand: Brand) => {

    router.push(`/voucher/${brand.id}`);
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (state.currentView === 'brand') {
      setState(prev => ({ ...prev, currentView: 'main', selectedBrand: null }));
    } else if (state.currentView === 'category') {
      setState(prev => ({ 
        ...prev, 
        currentView: 'main', 
        selectedCategory: null,
        searchQuery: ''
      }));
      initializeVoucherData();
    } else if (state.currentView === 'search') {
      clearSearch();
    } else {
      router.back();
    }
  }, [state.currentView, clearSearch, initializeVoucherData]);

  const handleShare = useCallback(async (brand?: Brand) => {
    const shareText = brand
      ? `Check out ${brand.name} - Get up to ${brand.cashbackRate}% cashback! Download ${BRAND.APP_NAME} app to purchase vouchers.`
      : `Discover amazing cashback offers on your favorite brands! Download ${BRAND.APP_NAME} app.`;

    try {
      // Use platform-specific sharing
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          // Web sharing (if supported)
          await navigator.share({
            title: brand ? brand.name : `${BRAND.APP_NAME} Vouchers`,
            text: shareText,
          });
        } else {
          // Fallback: Copy to clipboard for browsers without share API
          const Clipboard = (await import('expo-clipboard')).default;
          await Clipboard.setStringAsync(shareText);
          alert('Link copied to clipboard! Share it with your friends.');
        }
      } else {
        // Native sharing
        const Share = (await import('react-native')).Share;
        await Share.share({
          message: shareText,
          title: brand ? brand.name : `${BRAND.APP_NAME} Vouchers`
        });
      }
    } catch (error) {
      logger.error('Share error:', error);
    }
  }, []);

  const handleFavorite = useCallback((brand: Brand) => {

    // TODO: Implement favorite functionality
  }, []);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    state,
    heroCarousel,
    actions: {
      searchBrands,
      selectCategory,
      selectBrand,
      clearSearch,
      refreshData,
      updateFilters
    },
    handlers: {
      handleSearch,
      handleCategorySelect,
      handleBrandSelect,
      handleBackNavigation,
      handleShare,
      handleFavorite
    }
  };
};