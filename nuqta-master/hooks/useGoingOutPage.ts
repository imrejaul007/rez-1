import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useDebouncedCallback } from 'use-debounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GoingOutPageState,
  GoingOutFilters,
  UseGoingOutPageReturn,
  GoingOutProduct,
  GoingOutCategory,
} from '@/types/going-out.types';
import productsApi from '@/services/productsApi';
import { usePageCategories, usePageProductsQuery } from '@/hooks/queries/usePageProducts';

// Wishlist persistence functions
const WISHLIST_STORAGE_KEY = 'going_out_wishlist';

const saveWishlistToStorage = async (wishlist: string[]) => {
  try {
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  } catch (_error) {
    // silently handle
  }
};

const loadWishlistFromStorage = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      const wishlist = JSON.parse(stored);
      return wishlist;
    }
  } catch (_error) {
    // silently handle
  }
  return [];
};

// Helper function to map backend product to GoingOutProduct
const mapBackendProductToGoingOut = (product: any): GoingOutProduct => {
  // Calculate availability status from backend or inventory
  const stock = product.inventory?.stock || 0;
  let availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';

  // Use backend availabilityStatus if available, otherwise calculate from stock
  if (product.availabilityStatus) {
    availabilityStatus = product.availabilityStatus.replace(/-/g, '_') as 'in_stock' | 'low_stock' | 'out_of_stock';
  } else if (stock > 10) {
    availabilityStatus = 'in_stock';
  } else if (stock > 0) {
    availabilityStatus = 'low_stock';
  }

  // Use real cashback from backend
  const cashbackPercentage = product.cashback?.percentage || 5;
  const cashbackMaxAmount = product.cashback?.maxAmount;

  const mappedProduct = {
    id: product._id || product.id,
    name: product.name || product.title,
    brand: product.brand,
    image: (() => {
      // Try different possible image sources
      if (Array.isArray(product.images) && product.images.length > 0) {
        const imageUrl = product.images[0]?.url || product.images[0];
        return imageUrl;
      }
      if (product.image) {
        return product.image;
      }
      if (product.thumbnail) {
        return product.thumbnail;
      }
      if (product.media && Array.isArray(product.media) && product.media.length > 0) {
        const mediaUrl = product.media[0]?.url || product.media[0];
        return mediaUrl;
      }
      // Return null instead of placeholder to trigger fallback UI
      return null;
    })(),
    price: {
      current: product.price?.current || product.pricing?.selling || 0,
      original: product.price?.original || product.pricing?.compare,
      currency: product.price?.currency || '₹',
      discount: product.price?.discount || (product.price?.original && product.price?.current
        ? Math.round(((product.price.original - product.price.current) / product.price.original) * 100)
        : (product.pricing?.compare && product.pricing?.selling
          ? Math.round(((product.pricing.compare - product.pricing.selling) / product.pricing.compare) * 100)
          : 0)),
    },
    cashback: {
      percentage: cashbackPercentage,
      maxAmount: cashbackMaxAmount,
    },
    category: product.category?.name || product.category || 'Uncategorized',
    categoryId: product.category?._id || product.category?.id || product.categoryId || 'all',
    rating: product.rating ? {
      value: product.rating.value || product.rating.average || 0,
      count: product.rating.count || 0,
    } : (product.ratings ? {
      value: product.ratings.average || 0,
      count: product.ratings.count || 0,
    } : undefined),
    isNew: product.isNew || product.isNewArrival || false,
    isFeatured: product.isFeatured || product.isRecommended || false,
    availabilityStatus,
    tags: product.tags || [],
    description: product.description || '',
    store: {
      id: product.store?._id || product.store?.id || '',
      name: product.store?.name || 'Store',
      logo: product.store?.logo || product.store?.image,
    },
  };

  return mappedProduct;
};

// Helper to map backend categories
const mapBackendCategories = (categories: any[]): GoingOutCategory[] => {
  // Icon mapping based on category name
  const getIconForCategory = (name: string): string => {
    const lowerName = name.toLowerCase();

    // Fashion & Beauty
    if (lowerName.includes('fashion') || lowerName.includes('beauty') || lowerName.includes('clothing') || lowerName.includes('apparel')) {
      return 'shirt-outline';
    }

    // Jewelry & Gold
    if (lowerName.includes('jewelry') || lowerName.includes('gold') || lowerName.includes('diamond') || lowerName.includes('ring')) {
      return 'diamond-outline';
    }

    // Perfume & Fragrance
    if (lowerName.includes('perfume') || lowerName.includes('fragrance') || lowerName.includes('scent')) {
      return 'flower-outline';
    }

    // Gifts
    if (lowerName.includes('gift') || lowerName.includes('present') || lowerName.includes('surprise')) {
      return 'gift-outline';
    }

    // Travel & Experiences
    if (lowerName.includes('travel') || lowerName.includes('experience') || lowerName.includes('adventure')) {
      return 'airplane-outline';
    }

    // Entertainment
    if (lowerName.includes('entertainment') || lowerName.includes('movie') || lowerName.includes('music') || lowerName.includes('game')) {
      return 'play-circle-outline';
    }

    // Default fallback
    return 'cube-outline';
  };

  const mapped = categories.map(cat => {
    const icon = cat.icon || getIconForCategory(cat.name);

    return {
      id: cat._id || cat.id,
      name: cat.name,
      slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      icon: icon,
      isActive: false,
      productCount: cat.productCount || 0,
    };
  });

  // If no categories from backend, add default categories
  if (mapped.length === 0) {
    const defaultCategories = [
      {
        id: 'perfume',
        name: 'Perfume',
        slug: 'perfume',
        icon: 'flower-outline',
        isActive: false,
        productCount: 0,
      },
      {
        id: 'gold',
        name: 'Gold',
        slug: 'gold',
        icon: 'diamond-outline',
        isActive: false,
        productCount: 0,
      },
      {
        id: 'gifts',
        name: 'Gifts',
        slug: 'gifts',
        icon: 'gift-outline',
        isActive: false,
        productCount: 0,
      },
      {
        id: 'travel',
        name: 'Travel',
        slug: 'travel',
        icon: 'airplane-outline',
        isActive: false,
        productCount: 0,
      },
    ];

    return [
      {
        id: 'all',
        name: 'All',
        slug: 'all',
        icon: 'grid-outline',
        isActive: true,
        productCount: 0,
      },
      ...defaultCategories,
    ];
  }

  // Add "All" category at the beginning
  return [
    {
      id: 'all',
      name: 'All',
      slug: 'all',
      icon: 'grid-outline',
      isActive: true,
      productCount: categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0),
    },
    ...mapped,
  ];
};

export function useGoingOutPage(): UseGoingOutPageReturn {
  const router = useRouter();

  // --- CLIENT-ONLY UI STATE ---
  const [activeCategory, setActiveCategoryState] = useState('all');
  const [searchQuery, setSearchQueryState] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [filters, setFiltersState] = useState<GoingOutFilters>({
    priceRange: { min: 0, max: Infinity },
    cashbackRange: { min: 0, max: 100 },
    brands: [],
    ratings: [],
    availability: [],
  });
  const [sortBy, setSortByState] = useState<GoingOutPageState['sortBy']>('default');
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // For accumulated products across pages
  const [accumulatedProducts, setAccumulatedProducts] = useState<GoingOutProduct[]>([]);

  // For search results overlay
  const [searchResults, setSearchResults] = useState<GoingOutProduct[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- SERVER DATA via react-query ---
  const categoriesQuery = usePageCategories('going_out');
  const productsQuery = usePageProductsQuery(
    'going_out',
    page,
    activeCategory !== 'all' ? activeCategory : undefined,
  );

  // --- DERIVE mapped data from query results ---
  const mappedCategories = useMemo(() => {
    const rawCategories = categoriesQuery.data?.success && categoriesQuery.data?.data
      ? categoriesQuery.data.data
      : [];
    return mapBackendCategories(rawCategories);
  }, [categoriesQuery.data]);

  const currentPageProducts = useMemo(() => {
    if (!productsQuery.data?.success || !productsQuery.data?.data) return [];
    const rawProducts = Array.isArray(productsQuery.data.data)
      ? productsQuery.data.data
      : (productsQuery.data.data as any).products || [];
    return rawProducts.map(mapBackendProductToGoingOut);
  }, [productsQuery.data]);

  const hasMore = useMemo(() => {
    if (!productsQuery.data?.data) return false;
    const pagination = (productsQuery.data.data as any)?.pagination;
    return pagination ? pagination.current < pagination.pages : false;
  }, [productsQuery.data]);

  // Accumulate products across pages
  useEffect(() => {
    if (currentPageProducts.length > 0) {
      if (page === 1) {
        setAccumulatedProducts(currentPageProducts);
      } else {
        setAccumulatedProducts(prev => {
          // Deduplicate by id
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = currentPageProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [currentPageProducts, page]);

  // Reset accumulated products when category changes
  useEffect(() => {
    setPage(1);
    setAccumulatedProducts([]);
    setSearchResults(null);
  }, [activeCategory]);

  // Update categories with product counts based on actual products
  const categoriesWithCounts = useMemo(() => {
    const products = accumulatedProducts;
    return mappedCategories.map(cat => {
      if (cat.id === 'all') {
        return { ...cat, productCount: products.length };
      }
      const categoryProducts = products.filter((p: any) =>
        p.categoryId === cat.id ||
        p.category.toLowerCase().includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(p.category.toLowerCase())
      );
      return { ...cat, productCount: categoryProducts.length };
    });
  }, [mappedCategories, accumulatedProducts]);

  // Derive cashbackHubSections from products
  const cashbackHubSections = useMemo(() => {
    const products = accumulatedProducts;
    const featuredProducts = products.filter((p: any) => p.isFeatured);
    const newProducts = products.filter((p: any) => p.isNew);

    return [
      {
        id: 'cashback_hub_featured',
        title: 'Cashback Hub',
        subtitle: 'Best deals with maximum cashback',
        products: featuredProducts.slice(0, 10),
        showViewAll: false,
      },
      {
        id: 'new_arrivals',
        title: 'New Arrivals',
        subtitle: 'Latest products just for you',
        products: newProducts.slice(0, 10),
        showViewAll: false,
      },
      {
        id: 'trending',
        title: 'Trending',
        subtitle: 'Most popular items right now',
        products: products.filter((p: any) => p.rating && p.rating.value >= 4.5).slice(0, 10),
        showViewAll: false,
      },
    ];
  }, [accumulatedProducts]);

  // Derive filteredProducts from accumulated products + local filters/search/sort
  const filteredProducts = useMemo(() => {
    // If there are search results from API, use those
    if (searchResults !== null) return searchResults;

    let result = accumulatedProducts;

    // Apply category filter (already handled by query key, but for local filtering of cached data)
    if (activeCategory !== 'all') {
      const categoryNameMap: { [key: string]: string } = {
        'perfume': 'perfume',
        'gold': 'gold',
        'gifts': 'gifts',
        'travel': 'travel',
      };
      const selectedCategoryName = categoryNameMap[activeCategory] || activeCategory.toLowerCase();

      result = result.filter(product => {
        const productCategoryName = product.category?.toLowerCase() || '';
        const productCategoryId = product.categoryId || '';
        return (
          productCategoryName.includes(selectedCategoryName) ||
          productCategoryId === activeCategory ||
          productCategoryName === selectedCategoryName
        );
      });
    }

    // Apply search filter locally for instant feedback
    if (searchQuery.trim().length > 0) {
      const searchTerm = searchQuery.toLowerCase().trim();
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
      result = result.filter(product =>
        product.price.current >= filters.priceRange.min &&
        product.price.current <= filters.priceRange.max
      );
    }
    if (filters.cashbackRange.min > 0 || filters.cashbackRange.max < 100) {
      result = result.filter(product =>
        product.cashback.percentage >= filters.cashbackRange.min &&
        product.cashback.percentage <= filters.cashbackRange.max
      );
    }
    if (filters.brands.length > 0) {
      result = result.filter(product =>
        product.brand && filters.brands.includes(product.brand)
      );
    }
    if (filters.ratings.length > 0) {
      result = result.filter(product =>
        product.rating && filters.ratings.some(rating => product.rating!.value >= rating)
      );
    }
    if (filters.availability.length > 0) {
      result = result.filter(product =>
        filters.availability.includes(product.availabilityStatus)
      );
    }

    // Apply sort
    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case 'price_low':
            return a.price.current - b.price.current;
          case 'price_high':
            return b.price.current - a.price.current;
          case 'cashback_high':
            return b.cashback.percentage - a.cashback.percentage;
          case 'rating':
            return (b.rating?.value || 0) - (a.rating?.value || 0);
          case 'newest':
            return a.isNew ? -1 : 1;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [accumulatedProducts, activeCategory, searchQuery, filters, sortBy, searchResults]);

  // Load wishlist from storage on mount
  useEffect(() => {
    const loadWishlist = async () => {
      const storedWishlist = await loadWishlistFromStorage();
      if (storedWishlist.length > 0) {
        setWishlist(storedWishlist);
      }
    };
    loadWishlist();
  }, []);

  // Compose state object to match original shape
  const loading = (categoriesQuery.isLoading && !categoriesQuery.data) ||
    (productsQuery.isLoading && !productsQuery.data) ||
    searchLoading;
  const error = categoriesQuery.error
    ? 'Failed to load categories. Please try again.'
    : productsQuery.error
      ? 'Failed to load products. Please try again.'
      : null;

  const state: GoingOutPageState = {
    categories: categoriesWithCounts,
    products: accumulatedProducts,
    filteredProducts,
    cashbackHubSections,
    activeCategory,
    searchQuery,
    showSearchBar,
    filters,
    loading,
    error,
    hasMore,
    page,
    sortBy,
    wishlist,
  };

  // --- ACTIONS ---

  const setActiveCategory = useCallback((categoryId: string) => {
    setActiveCategoryState(categoryId);
  }, []);

  // Debounced API search (300ms delay)
  const debouncedApiSearch = useDebouncedCallback(
    async (query: string, activeCat: string) => {
      if (!query.trim() || query.trim().length < 2) {
        setSearchLoading(false);
        return;
      }

      try {
        const searchQueryParams = {
          q: query,
          ...(activeCat !== 'all' && { category: activeCat }),
          page: 1,
          limit: 20,
        };

        const response = await productsApi.searchProducts(searchQueryParams);

        if (response.success && response.data?.products) {
          const products = response.data.products.map(mapBackendProductToGoingOut);
          setSearchResults(products);
        }
      } catch (_error) {
        // Keep showing current products on error
      } finally {
        setSearchLoading(false);
      }
    },
    300
  );

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);

    if (query.trim().length >= 2) {
      setSearchLoading(true);
      debouncedApiSearch(query, activeCategory);
    } else if (query.trim().length === 0) {
      setSearchResults(null);
      setSearchLoading(false);
    }
  }, [debouncedApiSearch, activeCategory]);

  const setSortBy = useCallback((newSortBy: GoingOutPageState['sortBy']) => {
    setSortByState(newSortBy);
  }, []);

  const loadProducts = useCallback(async () => {
    setPage(1);
    setAccumulatedProducts([]);
    setSearchResults(null);
    // react-query will refetch automatically since page changed
    await productsQuery.refetch();
  }, [productsQuery]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return;
    setPage(prev => prev + 1);
  }, [loading, hasMore]);

  const searchProductsAction = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);

    try {
      const searchQueryParams = {
        q: query,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        page: 1,
        limit: 20,
      };

      const response = await productsApi.searchProducts(searchQueryParams);

      if (response.success && response.data?.products) {
        const products = response.data.products.map(mapBackendProductToGoingOut);
        setSearchResults(products);
      }
    } catch (_error) {
      // Keep current products on error
    } finally {
      setSearchLoading(false);
    }
  }, [activeCategory]);

  const refreshProducts = useCallback(async () => {
    setPage(1);
    setAccumulatedProducts([]);
    setSearchResults(null);
    await Promise.all([
      categoriesQuery.refetch(),
      productsQuery.refetch(),
    ]);
  }, [categoriesQuery, productsQuery]);

  const applyFilters = useCallback(async (newFilters: GoingOutFilters) => {
    setFiltersState(newFilters);
    // Filtering is handled reactively via the filteredProducts memo
  }, []);

  const resetFilters = useCallback(async () => {
    setFiltersState({
      priceRange: { min: 0, max: Infinity },
      cashbackRange: { min: 0, max: 100 },
      brands: [],
      ratings: [],
      availability: [],
    });
  }, []);

  const clearWishlist = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);
      setWishlist([]);
    } catch (_error) {
      // silently handle
    }
  }, []);

  // --- HANDLERS ---

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, [setActiveCategory]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

  const handleSearchSubmit = useCallback((query: string) => {
    searchProductsAction(query);
  }, [searchProductsAction]);

  const handleProductPress = useCallback((product: GoingOutProduct) => {
    router.push(`/product-page?cardId=${product.id}&cardType=just_for_you&category=${product.categoryId}` as any);
  }, [router]);

  const handleSortChange = useCallback((newSortBy: GoingOutPageState['sortBy']) => {
    setSortBy(newSortBy);
  }, [setSortBy]);

  const handleLoadMore = useCallback(() => {
    loadMoreProducts();
  }, [loadMoreProducts]);

  const handleRefresh = useCallback(() => {
    refreshProducts();
  }, [refreshProducts]);

  const handleHideSearch = useCallback(() => {
    setShowSearchBar(false);
  }, []);

  const handleShowSearch = useCallback(() => {
    setShowSearchBar(true);
  }, []);

  const handleFilterChange = useCallback((newFilters: GoingOutFilters) => {
    setFiltersState(newFilters);
    applyFilters(newFilters);
  }, [applyFilters]);

  const handleToggleWishlist = useCallback((product: GoingOutProduct) => {
    setWishlist(prev => {
      const isInWishlist = prev.includes(product.id);
      const newWishlist = isInWishlist
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id];

      // Save to storage
      saveWishlistToStorage(newWishlist);

      return newWishlist;
    });
  }, []);

  return {
    state,
    actions: {
      setActiveCategory,
      setSearchQuery,
      setSortBy,
      loadProducts,
      loadMoreProducts,
      searchProducts: async (query: string) => { debouncedApiSearch(query, activeCategory); },
      refreshProducts,
      applyFilters,
      resetFilters,
      clearWishlist,
    },
    handlers: {
      handleCategoryChange,
      handleSearchChange,
      handleSearchSubmit,
      handleProductPress,
      handleSortChange,
      handleFilterChange,
      handleLoadMore,
      handleRefresh,
      handleHideSearch,
      handleShowSearch,
      handleToggleWishlist,
    },
  };
}
