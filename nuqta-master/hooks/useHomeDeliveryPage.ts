import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useDebouncedCallback } from 'use-debounce';

import {
  HomeDeliveryPageState,
  HomeDeliveryFilters,
  UseHomeDeliveryPageReturn,
  HomeDeliveryProduct,
  HomeDeliveryCategory,
} from '@/types/home-delivery.types';
import productsApi from '@/services/productsApi';
import { usePageCategories, usePageProductsQuery } from '@/hooks/queries/usePageProducts';

// Helper function to map backend product to HomeDeliveryProduct
const mapBackendProductToHomeDelivery = (product: any): HomeDeliveryProduct => {
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

  // Use delivery time from backend deliveryInfo
  let deliveryTime = product.deliveryInfo?.estimatedDays || product.deliveryInfo?.standardDeliveryTime;
  if (!deliveryTime && product.store?.deliveryInfo?.estimatedTime) {
    deliveryTime = product.store.deliveryInfo.estimatedTime;
  }
  if (!deliveryTime) {
    // Fallback based on category and stock
    const categoryName = product.category?.name?.toLowerCase() || '';
    if (categoryName.includes('fashion') || categoryName.includes('book')) {
      deliveryTime = '1-2 days';
    } else if (categoryName.includes('electronics') && stock > 50) {
      deliveryTime = 'Under 30min';
    } else if (stock > 20) {
      deliveryTime = '2-3 days';
    } else {
      deliveryTime = '3-5 days';
    }
  }

  // Use real cashback from backend
  const cashbackPercentage = product.cashback?.percentage || 5;
  const cashbackMaxAmount = product.cashback?.maxAmount;

  const mappedProduct = {
    id: product._id || product.id,
    name: product.name || product.title,
    brand: product.brand,
    image: (() => {
      // Try different image sources
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        // Handle both string URLs and objects with url property
        return typeof firstImage === 'string' ? firstImage : (firstImage?.url || '');
      }
      if (product.image) return product.image;
      if (product.thumbnail) return product.thumbnail;
      // Return null to trigger placeholder in UI
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
    shipping: {
      type: product.shipping?.type ||
        ((product.price?.current || product.pricing?.selling || 0) >
          (product.deliveryInfo?.freeShippingThreshold || 500) ? 'free' : 'paid'),
      cost: product.shipping?.cost ||
        ((product.price?.current || product.pricing?.selling || 0) >
          (product.deliveryInfo?.freeShippingThreshold || 500) ? 0 : 40),
      estimatedDays: deliveryTime,
      freeShippingEligible: (product.price?.current || product.pricing?.selling || 0) >
        (product.deliveryInfo?.freeShippingThreshold || 500),
    },
    rating: product.rating ? {
      value: product.rating.value || product.rating.average || 0,
      count: product.rating.count || 0,
    } : (product.ratings ? {
      value: product.ratings.average || 0,
      count: product.ratings.count || 0,
    } : undefined),
    deliveryTime,
    isNew: product.isNew || product.isNewArrival || false,
    isFeatured: product.isFeatured || product.isRecommended || false,
    isUnderDollarShipping: (product.shipping?.cost || 40) <= 50,
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
const mapBackendCategories = (categories: any[]): HomeDeliveryCategory[] => {
  // Icon mapping based on category name
  const getIconForCategory = (name: string): string => {
    const lowerName = name.toLowerCase();

    // Fashion & Beauty
    if (lowerName.includes('fashion') || lowerName.includes('beauty') || lowerName.includes('clothing') || lowerName.includes('apparel')) {
      return 'shirt-outline';
    }

    // Food & Dining
    if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant') || lowerName.includes('kitchen') || lowerName.includes('grocery')) {
      return 'restaurant-outline';
    }

    // Entertainment
    if (lowerName.includes('entertainment') || lowerName.includes('movie') || lowerName.includes('music') || lowerName.includes('game')) {
      return 'play-circle-outline';
    }

    // Electronics
    if (lowerName.includes('electronic') || lowerName.includes('tech') || lowerName.includes('phone') || lowerName.includes('computer')) {
      return 'phone-portrait-outline';
    }

    // Books
    if (lowerName.includes('book') || lowerName.includes('education') || lowerName.includes('learning')) {
      return 'book-outline';
    }

    // Sports
    if (lowerName.includes('sport') || lowerName.includes('fitness') || lowerName.includes('gym')) {
      return 'basketball-outline';
    }

    // Home & Garden
    if (lowerName.includes('home') || lowerName.includes('garden') || lowerName.includes('furniture')) {
      return 'home-outline';
    }

    // Health & Beauty
    if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('pharmacy')) {
      return 'medical-outline';
    }

    // Automotive
    if (lowerName.includes('auto') || lowerName.includes('car') || lowerName.includes('vehicle')) {
      return 'car-outline';
    }

    // Default fallback
    return 'cube-outline';
  };

  const mapped = categories.map(cat => {
    const icon = cat.icon || getIconForCategory(cat.name);
    const backendId = cat._id || cat.id;

    return {
      id: cat.slug || cat._id || cat.id, // Use slug for frontend ID
      name: cat.name,
      icon: icon,
      productCount: cat.productCount || 0,
      isActive: false,
      backendId: backendId, // Store MongoDB ObjectID for API calls
    };
  });

  // If no categories from backend, add default categories (without backendId)
  if (mapped.length === 0) {
    const defaultCategories = [
      {
        id: 'fashion-beauty',
        name: 'Fashion & Beauty',
        icon: 'shirt-outline',
        productCount: 0,
        isActive: false,
        backendId: undefined,
      },
      {
        id: 'food-dining',
        name: 'Food & Dining',
        icon: 'restaurant-outline',
        productCount: 0,
        isActive: false,
        backendId: undefined,
      },
      {
        id: 'entertainment',
        name: 'Entertainment',
        icon: 'play-circle-outline',
        productCount: 0,
        isActive: false,
        backendId: undefined,
      },
      {
        id: 'grocery-essentials',
        name: 'Grocery & Essentials',
        icon: 'basket-outline',
        productCount: 0,
        isActive: false,
        backendId: undefined,
      },
    ];

    return [
      {
        id: 'all',
        name: 'All',
        icon: 'apps',
        productCount: 0,
        isActive: true,
        backendId: undefined,
      },
      ...defaultCategories,
    ];
  }

  // Add "All" category at the beginning
  return [
    {
      id: 'all',
      name: 'All',
      icon: 'apps',
      productCount: categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0),
      isActive: true,
      backendId: undefined,
    },
    ...mapped,
  ];
};

const initialFilters: HomeDeliveryFilters = {
  shipping: [],
  ratings: [],
  deliveryTime: [],
  priceRange: { min: 0, max: Infinity },
  brands: [],
  availability: [],
};

export function useHomeDeliveryPage(): UseHomeDeliveryPageReturn {
  const router = useRouter();

  // --- CLIENT-ONLY UI STATE ---
  const [activeCategory, setActiveCategoryState] = useState('all');
  const [searchQuery, setSearchQueryState] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [filters, setFiltersState] = useState<HomeDeliveryFilters>(initialFilters);
  const [sortBy, setSortByState] = useState<HomeDeliveryPageState['sortBy']>('default');
  const [page, setPage] = useState(1);

  // For accumulated products across pages
  const [accumulatedProducts, setAccumulatedProducts] = useState<HomeDeliveryProduct[]>([]);

  // For search results overlay
  const [searchResults, setSearchResults] = useState<HomeDeliveryProduct[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- SERVER DATA via react-query ---
  const categoriesQuery = usePageCategories('home_delivery');
  const productsQuery = usePageProductsQuery(
    'home_delivery',
    page,
    activeCategory !== 'all' ? activeCategory : undefined,
  );

  // --- DERIVE mapped data from query results ---
  const mappedCategories = useMemo(() => {
    const backendCategories = categoriesQuery.data?.success && categoriesQuery.data?.data
      ? (Array.isArray(categoriesQuery.data.data) ? categoriesQuery.data.data : [])
      : [];
    return mapBackendCategories(backendCategories);
  }, [categoriesQuery.data]);

  const currentPageProducts = useMemo(() => {
    if (!productsQuery.data?.success || !productsQuery.data?.data) return [];
    const rawProducts = Array.isArray(productsQuery.data.data)
      ? productsQuery.data.data
      : (productsQuery.data.data as any).products || [];
    return rawProducts.map(mapBackendProductToHomeDelivery);
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

  // Derive sections from products
  const sections = useMemo(() => {
    const products = accumulatedProducts;
    const featuredProducts = products.filter(p => p.isFeatured);
    const newProducts = products.filter(p => p.isNew);

    return [
      {
        id: 'featured',
        title: 'Featured Products',
        subtitle: 'Handpicked for you',
        products: featuredProducts.slice(0, 10),
        showViewAll: true,
        maxProducts: 10,
      },
      {
        id: 'new-arrivals',
        title: 'New Arrivals',
        subtitle: 'Latest additions',
        products: newProducts.slice(0, 10),
        showViewAll: true,
        maxProducts: 10,
      },
    ];
  }, [accumulatedProducts]);

  // Derive filteredProducts from accumulated products + local filters/search/sort
  const filteredProducts = useMemo(() => {
    // If there are search results from API, use those
    if (searchResults !== null) return searchResults;

    let result = accumulatedProducts;

    // Apply category filter locally
    if (activeCategory !== 'all') {
      const categoryNameMap: { [key: string]: string } = {
        'fashion-beauty': 'fashion & beauty',
        'food-dining': 'food & dining',
        'entertainment': 'entertainment',
        'grocery-essentials': 'grocery & essentials',
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
    if (filters.shipping.length > 0) {
      result = result.filter(product =>
        filters.shipping.includes(product.shipping.type)
      );
    }
    if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
      result = result.filter(product =>
        product.price.current >= filters.priceRange.min &&
        product.price.current <= filters.priceRange.max
      );
    }
    if (filters.ratings.length > 0) {
      result = result.filter(product =>
        product.rating && filters.ratings.some(rating => product.rating!.value >= rating)
      );
    }
    if (filters.deliveryTime.length > 0) {
      result = result.filter(product =>
        filters.deliveryTime.includes(product.deliveryTime)
      );
    }
    if (filters.brands.length > 0) {
      result = result.filter(product =>
        product.brand && filters.brands.includes(product.brand)
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
          case 'delivery_time': {
            const timeOrder = { 'Under 30min': 0, '1-2 days': 1, '2-3 days': 2, '3-5 days': 3 };
            const aTime = timeOrder[a.deliveryTime as keyof typeof timeOrder] ?? 999;
            const bTime = timeOrder[b.deliveryTime as keyof typeof timeOrder] ?? 999;
            return aTime - bTime;
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [accumulatedProducts, activeCategory, searchQuery, filters, sortBy, searchResults]);

  // Compose state object to match original shape
  const loading = (categoriesQuery.isLoading && !categoriesQuery.data) ||
    (productsQuery.isLoading && !productsQuery.data) ||
    searchLoading;
  const error = categoriesQuery.error
    ? 'Failed to load categories. Please try again.'
    : productsQuery.error
      ? 'Failed to load products. Please try again.'
      : null;

  const state: HomeDeliveryPageState = {
    categories: mappedCategories,
    products: accumulatedProducts,
    filteredProducts,
    sections,
    activeCategory,
    searchQuery,
    showSearchBar,
    filters,
    loading,
    error,
    hasMore,
    page,
    sortBy,
  };

  // --- ACTIONS ---

  const setActiveCategory = useCallback((categoryId: string) => {
    setActiveCategoryState(categoryId);
  }, []);

  // Debounced API search (300ms delay)
  const debouncedApiSearch = useDebouncedCallback(
    async (query: string, activeCat: string, categories: HomeDeliveryCategory[]) => {
      if (!query.trim() || query.trim().length < 2) {
        setSearchLoading(false);
        return;
      }

      try {
        // Find the actual category ID (MongoDB ObjectID) if a category is selected
        let categoryId: string | undefined = undefined;
        if (activeCat !== 'all') {
          const selectedCategory = categories.find(cat => cat.id === activeCat);
          // Only include category if we have a valid MongoDB ObjectID (24 hex characters)
          if (selectedCategory?.backendId && /^[0-9a-fA-F]{24}$/.test(selectedCategory.backendId)) {
            categoryId = selectedCategory.backendId;
          }
        }

        const searchQueryParams = {
          q: query,
          ...(categoryId && { category: categoryId }),
          page: 1,
          limit: 20,
        };

        const response = await productsApi.searchProducts(searchQueryParams);

        if (response.success && response.data?.products) {
          const products = response.data.products.map(mapBackendProductToHomeDelivery);
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
      debouncedApiSearch(query, activeCategory, mappedCategories);
    } else if (query.trim().length === 0) {
      setSearchResults(null);
      setSearchLoading(false);
    }
  }, [debouncedApiSearch, activeCategory, mappedCategories]);

  const setSortBy = useCallback((newSortBy: HomeDeliveryPageState['sortBy']) => {
    setSortByState(newSortBy);
  }, []);

  const setFilters = useCallback((newFilters: HomeDeliveryFilters) => {
    setFiltersState(newFilters);
  }, []);

  const loadProducts = useCallback(async () => {
    setPage(1);
    setAccumulatedProducts([]);
    setSearchResults(null);
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
        const products = response.data.products.map(mapBackendProductToHomeDelivery);
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

  const applyFilters = useCallback(async (newFilters: HomeDeliveryFilters) => {
    setFiltersState(newFilters);
    // Filtering is handled reactively via the filteredProducts memo
  }, []);

  const resetFilters = useCallback(async () => {
    setFiltersState(initialFilters);
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

  const handleProductPress = useCallback((product: HomeDeliveryProduct) => {
    router.push({
      pathname: '/product-page',
      params: {
        cardId: product.id,
        cardType: 'product',
        cardData: JSON.stringify(product)
      }
    } as any);
  }, [router]);

  const handleSortChange = useCallback((newSortBy: HomeDeliveryPageState['sortBy']) => {
    setSortBy(newSortBy);
  }, [setSortBy]);

  const handleFilterChange = useCallback((newFilters: HomeDeliveryFilters) => {
    applyFilters(newFilters);
  }, [applyFilters]);

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

  return {
    state,
    actions: {
      setActiveCategory,
      setSearchQuery,
      setSortBy,
      setFilters,
      loadProducts,
      loadMoreProducts,
      searchProducts: searchProductsAction,
      refreshProducts,
      applyFilters,
      resetFilters,
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
    },
  };
}
