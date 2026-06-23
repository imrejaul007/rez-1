// @ts-nocheck
/**
 * Custom Hook for Dynamic Category Page Data
 * Generic version of useFashionData that accepts category slug
 * Handles all API calls, loading states, and error handling
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import categoriesApi from '@/services/categoriesApi';
import { getCategoryConfig, CategoryConfig } from '@/config/categoryConfig';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Store interface (same as FashionStore)
export interface CategoryStore {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  category: any;
  location: {
    address: string;
    city: string;
    state?: string;
    coordinates?: [number, number];
  };
  ratings: {
    average: number;
    count: number;
  };
  offers: {
    cashback?: number;
    isPartner: boolean;
    partnerLevel?: string;
  };
  operationalInfo: {
    deliveryTime?: string;
    minimumOrder?: number;
  };
  isFeatured: boolean;
  isActive: boolean;
  deliveryCategories?: {
    fastDelivery?: boolean;
    premium?: boolean;
    budgetFriendly?: boolean;
  };
}

// Product interface (same as FashionProduct)
export interface CategoryProduct {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  title?: string;
  description?: string;
  brand?: string;
  type?: string;
  image?: string;
  images?: string[];
  price?: {
    current: number;
    original: number;
    currency: string;
    discount?: number;
  };
  pricing?: {
    basePrice?: number;
    salePrice?: number;
    original?: number;
    selling?: number;
    discount?: number;
  };
  rating?: {
    value: string | number;
    count: number;
  };
  ratings?: {
    average: number;
    count: number;
  };
  availabilityStatus?: string;
  isRecommended?: boolean;
  tags?: string[];
  cashback?: {
    percentage: number;
  };
  store?: any;
  category?: any;
  isFeatured?: boolean;
  isActive?: boolean;
}

// Subcategory interface (same as FashionCategory)
export interface CategorySubcategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  image?: string;
  parent?: any;
  metadata?: {
    color?: string;
    tags?: string[];
    featured?: boolean;
  };
}

interface UseCategoryDataResult {
  // Category config
  categoryConfig: CategoryConfig | null;

  // Data
  featuredStores: CategoryStore[];
  categoryStores: CategoryStore[];
  featuredProducts: CategoryProduct[];
  subcategories: CategorySubcategory[];

  // Loading states
  isLoadingStores: boolean;
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;
  isLoading: boolean;

  // Error states
  storesError: Error | null;
  productsError: Error | null;
  categoriesError: Error | null;
  hasError: boolean;

  // Actions
  refetchStores: () => Promise<void>;
  refetchProducts: () => Promise<void>;
  refetchCategories: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

export const useCategoryData = (slug: string): UseCategoryDataResult => {
  // Get category configuration
  const categoryConfig = useMemo(() => getCategoryConfig(slug), [slug]);

  // Data states
  const [featuredStores, setFeaturedStores] = useState<CategoryStore[]>([]);
  const [categoryStores, setCategoryStores] = useState<CategoryStore[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<CategoryProduct[]>([]);
  const [subcategories, setSubcategories] = useState<CategorySubcategory[]>([]);

  // Loading states
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Error states
  const [storesError, setStoresError] = useState<Error | null>(null);
  const [productsError, setProductsError] = useState<Error | null>(null);
  const [categoriesError, setCategoriesError] = useState<Error | null>(null);

  /**
   * Helper function to check if content matches category keywords
   */
  const matchesCategory = useCallback((
    text: string,
    tags: string[] = []
  ): boolean => {
    if (!categoryConfig) return false;

    const searchText = text.toLowerCase();
    const lowerTags = tags.map(t => t.toLowerCase());

    return categoryConfig.keywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      return searchText.includes(lowerKeyword) ||
             lowerTags.some(tag => tag.includes(lowerKeyword));
    });
  }, [categoryConfig]);

  /**
   * Fetch Featured Stores (filtered by category)
   */
  const fetchFeaturedStores = useCallback(async () => {
    if (!categoryConfig) return;

    try {
      setIsLoadingStores(true);
      setStoresError(null);

      const response = await storesApi.getFeaturedStores(10);

      if (response.success && response.data) {
        const filteredStores = Array.isArray(response.data)
          ? response.data.filter((store: any) => {
              const categoryName = store.category?.name?.toLowerCase() || '';
              const storeTags = store.tags || [];

              // Check if store matches category keywords
              const matches = matchesCategory(categoryName, storeTags);

              if (matches) {
                devLog.log(`[${slug.toUpperCase()}] Featured Store:`, store.name);
              }

              return matches;
            })
          : [];

        devLog.log(`[${slug.toUpperCase()}] Found ${filteredStores.length} featured stores`);
        setFeaturedStores(filteredStores);
      }
    } catch (error) {
      devLog.error(`[${slug.toUpperCase()}] Error fetching featured stores:`, error);
      setStoresError(error as Error);
    } finally {
      setIsLoadingStores(false);
    }
  }, [categoryConfig, slug, matchesCategory]);

  /**
   * Fetch Category Stores (all stores in category)
   */
  const fetchCategoryStores = useCallback(async () => {
    if (!categoryConfig) return;

    try {
      setIsLoadingStores(true);
      setStoresError(null);

      const response = await storesApi.getStores({
        limit: 20,
        sortBy: 'rating'
      });

      if (response.success && response.data) {
        const storesData = response.data.stores || [];

        const filteredStores = storesData.filter((store: any) => {
          const categoryName = store.category?.name?.toLowerCase() || '';
          const tags = store.tags || [];

          return matchesCategory(categoryName, tags);
        });

        devLog.log(`[${slug.toUpperCase()}] Found ${filteredStores.length} category stores`);
        setCategoryStores(filteredStores);
      }
    } catch (error) {
      devLog.error(`[${slug.toUpperCase()}] Error fetching category stores:`, error);
      setStoresError(error as Error);
    } finally {
      setIsLoadingStores(false);
    }
  }, [categoryConfig, slug, matchesCategory]);

  /**
   * Fetch Featured Products (filtered by category)
   */
  const fetchFeaturedProducts = useCallback(async () => {
    if (!categoryConfig) return;

    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      devLog.log(`[${slug.toUpperCase()}] Fetching featured products...`);
      const response = await productsApi.getFeaturedProducts(20);

      if (response.success && response.data) {
        devLog.log(`[${slug.toUpperCase()}] Total products received: ${response.data.length}`);

        const filteredProducts = Array.isArray(response.data)
          ? response.data.filter((product: any) => {
              // Handle both category object and category ID string
              let categoryId = '';
              let categoryName = '';

              if (typeof product.category === 'string') {
                categoryId = product.category;
              } else if (product.category && typeof product.category === 'object') {
                categoryId = product.category._id || product.category.id || '';
                categoryName = product.category.name?.toLowerCase() || '';
              }

              const productTags = product.tags || [];

              // Check if product matches by category ID (if known)
              if (categoryConfig.categoryId && categoryId === categoryConfig.categoryId) {
                devLog.log(`[${slug.toUpperCase()}] Product (ID match):`, product.name);
                return true;
              }

              // Check if product matches by keywords
              const matches = matchesCategory(
                `${categoryName} ${product.name || ''} ${product.description || ''}`,
                productTags
              );

              if (matches) {
                devLog.log(`[${slug.toUpperCase()}] Product (keyword match):`, product.name);
              }

              return matches;
            })
          : [];

        devLog.log(`[${slug.toUpperCase()}] Found ${filteredProducts.length} products`);
        setFeaturedProducts(filteredProducts.slice(0, 10));
      } else {
        devLog.log(`[${slug.toUpperCase()}] No products data in response`);
      }
    } catch (error) {
      devLog.error(`[${slug.toUpperCase()}] Error fetching featured products:`, error);
      setProductsError(error as Error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [categoryConfig, slug, matchesCategory]);

  /**
   * Fetch Subcategories
   */
  const fetchSubcategories = useCallback(async () => {
    if (!categoryConfig) return;

    try {
      setIsLoadingCategories(true);
      setCategoriesError(null);

      devLog.log(`[${slug.toUpperCase()}] Fetching categories...`);
      const response = await categoriesApi.getCategories();

      if (response.success && response.data) {
        devLog.log(`[${slug.toUpperCase()}] Received ${response.data.length} total categories`);

        // Filter for subcategories that match our category
        const filteredCategories = Array.isArray(response.data)
          ? response.data.filter((category: any) => {
              const catSlug = category.slug?.toLowerCase() || '';
              const catName = category.name?.toLowerCase() || '';
              const tags = category.metadata?.tags || category.tags || [];

              // Check if this is a subcategory of our main category
              const subcategorySlugs = categoryConfig.subcategories.map(s => s.slug.toLowerCase());
              const isDirectSubcategory = subcategorySlugs.some(subSlug =>
                catSlug.includes(subSlug) || subSlug.includes(catSlug)
              );

              // Or matches by keywords
              const matchesByKeyword = matchesCategory(catName, tags);

              // Exclude the main category itself
              const isMainCategory = catSlug === categoryConfig.slug || catName === categoryConfig.name.toLowerCase();

              if (!isMainCategory && (isDirectSubcategory || matchesByKeyword)) {
                devLog.log(`[${slug.toUpperCase()}] Subcategory:`, category.name);
                return true;
              }

              return false;
            })
          : [];

        devLog.log(`[${slug.toUpperCase()}] Found ${filteredCategories.length} subcategories`);
        setSubcategories(filteredCategories.slice(0, 8));
      } else {
        devLog.log(`[${slug.toUpperCase()}] No categories data in response`);
        setSubcategories([]);
      }
    } catch (error) {
      devLog.error(`[${slug.toUpperCase()}] Error fetching categories:`, error);
      setCategoriesError(error as Error);
      setSubcategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [categoryConfig, slug, matchesCategory]);

  // Refetch actions
  const refetchStores = useCallback(async () => {
    await Promise.all([
      fetchFeaturedStores(),
      fetchCategoryStores()
    ]);
  }, [fetchFeaturedStores, fetchCategoryStores]);

  const refetchProducts = useCallback(async () => {
    await fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  const refetchCategories = useCallback(async () => {
    await fetchSubcategories();
  }, [fetchSubcategories]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchStores(),
      refetchProducts(),
      refetchCategories()
    ]);
  }, [refetchStores, refetchProducts, refetchCategories]);

  // Initial data fetch when slug changes
  useEffect(() => {
    if (categoryConfig) {
      devLog.log(`[CATEGORY DATA] Loading data for: ${categoryConfig.name}`);
      fetchFeaturedStores();
      fetchCategoryStores();
      fetchFeaturedProducts();
      fetchSubcategories();
    }
  }, [categoryConfig, fetchFeaturedStores, fetchCategoryStores, fetchFeaturedProducts, fetchSubcategories]);

  return {
    // Category config
    categoryConfig,

    // Data
    featuredStores,
    categoryStores,
    featuredProducts,
    subcategories,

    // Loading states
    isLoadingStores,
    isLoadingProducts,
    isLoadingCategories,
    isLoading: isLoadingStores || isLoadingProducts || isLoadingCategories,

    // Error states
    storesError,
    productsError,
    categoriesError,
    hasError: !!(storesError || productsError || categoriesError),

    // Actions
    refetchStores,
    refetchProducts,
    refetchCategories,
    refetchAll,
  };
};

export default useCategoryData;
