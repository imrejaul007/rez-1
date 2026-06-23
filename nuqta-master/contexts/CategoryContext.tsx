// @ts-nocheck
import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from 'react';
import {
  CategoryState,
  CategoryContextType,
  Category,
  CategoryItem,
  SortOption
} from '@/types/category.types';

// Region currency getter - will be set by RegionContext
let getCurrencySymbolFn: (() => string) | null = null;

export function setCategoryCurrencyGetter(fn: (() => string) | null) {
  getCurrencySymbolFn = fn;
}

// Helper to get current currency symbol
function getCurrentCurrencySymbol(): string {
  return getCurrencySymbolFn ? getCurrencySymbolFn() : 'AED'; // Default to AED if not set
}

// Initial State
const initialState: CategoryState = {
  currentCategory: null,
  categories: [],
  filters: {},
  searchQuery: '',
  sortBy: 'featured',
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

// Action Types
type CategoryAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_CURRENT_CATEGORY'; payload: Category | null }
  | { type: 'UPDATE_FILTERS'; payload: Record<string, any> }
  | { type: 'UPDATE_SEARCH'; payload: string }
  | { type: 'UPDATE_SORT'; payload: string }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_PAGINATION'; payload: Partial<CategoryState['pagination']> }
  | { type: 'APPEND_ITEMS'; payload: CategoryItem[] };

// Reducer
function categoryReducer(state: CategoryState, action: CategoryAction): CategoryState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload, loading: false, error: null };
    
    case 'SET_CURRENT_CATEGORY':
      return { 
        ...state, 
        currentCategory: action.payload, 
        loading: false, 
        error: null,
        // Reset pagination when category changes
        pagination: { ...initialState.pagination }
      };
    
    case 'UPDATE_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload },
        // Reset pagination when filters change
        pagination: { ...initialState.pagination }
      };
    
    case 'UPDATE_SEARCH':
      return { 
        ...state, 
        searchQuery: action.payload,
        // Reset pagination when search changes
        pagination: { ...initialState.pagination }
      };
    
    case 'UPDATE_SORT':
      return { 
        ...state, 
        sortBy: action.payload,
        // Reset pagination when sort changes
        pagination: { ...initialState.pagination }
      };
    
    case 'RESET_FILTERS':
      return { 
        ...state, 
        filters: {}, 
        searchQuery: '',
        sortBy: 'featured',
        pagination: { ...initialState.pagination }
      };
    
    case 'SET_PAGINATION':
      return { 
        ...state, 
        pagination: { ...state.pagination, ...action.payload }
      };
    
    case 'APPEND_ITEMS':
      if (!state.currentCategory) return state;
      
      return {
        ...state,
        currentCategory: {
          ...state.currentCategory,
          items: [...state.currentCategory.items, ...action.payload]
        }
      };
    
    default:
      return state;
  }
}

// Context
const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

// Provider Props
interface CategoryProviderProps {
  children: ReactNode;
}

// Category Provider Component
export function CategoryProvider({ children }: CategoryProviderProps) {
  const [state, dispatch] = useReducer(categoryReducer, initialState);

  // Load single category by slug
  const loadCategory = useCallback(async (slug: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Try to load from local category data first as fallback
      let localCategory: Category | null = null;
      try {
        const categoryData = await import('@/data/categoryData');
        // Use the default export which contains categories

        localCategory = categoryData.default.categories.find((cat: any) => cat.slug === slug) || null;

        if (localCategory) {

        }
      } catch (e) {

      }
      
      // Try backend API
      try {
        const categoriesApi = (await import('@/services/categoriesApi')).default;
        const response = await categoriesApi.getCategoryBySlug(slug);
        
        if (response.data) {
          // Get items from local data if available, otherwise fetch from backend
          let items: CategoryItem[] = [];
          let filters: any[] = [];
          let carouselItems: any[] = [];
          
          if (localCategory) {
            filters = localCategory.filters || [];
          }
          
          // Fetch products for this category from backend
          try {
            const productsApi = (await import('@/services/productsApi')).default;
            const productsResponse = await productsApi.getProducts({
              category: response.data._id,
              page: 1,
              limit: 20
            });

            if (productsResponse.success && productsResponse.data) {
              const products = Array.isArray(productsResponse.data) 
                ? productsResponse.data 
                : (productsResponse.data.products || []);
              
              // Map backend products to CategoryItem format
              items = products.map((product: any) => ({
                id: product._id || product.id,
                name: product.name || product.title,
                description: product.description || product.shortDescription || '',
                image: Array.isArray(product.images) && product.images.length > 0 
                  ? product.images[0] 
                  : product.image,
                price: {
                  current: product.pricing?.selling || product.price?.current || 0,
                  original: product.pricing?.compare || product.price?.original || 0,
                  currency: getCurrentCurrencySymbol(),
                  discount: product.pricing?.discount || product.price?.discount || 0
                },
                cashback: {
                  percentage: product.cashback?.percentage || 5,
                  maxAmount: product.cashback?.maxAmount
                },
                rating: {
                  value: product.ratings?.average || product.rating?.value || 0,
                  count: product.ratings?.count || product.rating?.count || 0,
                  maxValue: 5
                },
                stock: product.inventory?.stock || 0,
                isInStock: product.inventory?.isAvailable || product.availabilityStatus === 'in_stock',
                tags: product.tags || [],
                metadata: {
                  brand: product.brand,
                  category: product.category?.name || '',
                  isFeatured: product.isFeatured || false,
                  isNew: product.isNewArrival || false
                }
              }));

              // Create carousel items - special handling for Fleet Market
              if (slug === 'fleet') {
                // For Fleet Market, create category-based carousel items
                try {
                  const storesApi = (await import('@/services/storesApi')).default;
                  const storesResponse = await storesApi.getStores({
                    tags: 'fleet',
                    isFeatured: true,
                    limit: 10
                  });

                  if (storesResponse.success && storesResponse.data && Array.isArray(storesResponse.data)) {
                    const featuredStores = storesResponse.data.slice(0, 5);
                    
                    // Group products by vehicle type for Fleet Market
                    const vehicleTypes: { [key: string]: any[] } = {};
                    products.forEach((product: any) => {
                      const name = (product.name || '').toLowerCase();
                      let type = 'Premium Cars';
                      let subtitle = 'Comfort & Style';
                      
                      if (name.includes('suv') || name.includes('fortuner') || name.includes('xuv') || name.includes('adventure')) {
                        type = 'Adventure';
                        subtitle = 'Family Trips';
                      } else if (name.includes('sedan') || name.includes('city') || name.includes('camry')) {
                        type = 'Premium Cars';
                        subtitle = 'Sedan Rentals';
                      } else if (name.includes('hatchback') || name.includes('swift')) {
                        type = 'Compact';
                        subtitle = 'City Commute';
                      }
                      
                      if (!vehicleTypes[type]) {
                        vehicleTypes[type] = [];
                      }
                      vehicleTypes[type].push(product);
                    });

                    // Create carousel items from vehicle types
                    carouselItems = Object.entries(vehicleTypes).slice(0, 5).map(([type, typeProducts], idx) => {
                      const firstProduct = typeProducts[0];
                      const store = featuredStores[idx] || featuredStores[0];
                      const subtitle = type === 'Premium Cars' ? 'Sedan Rentals' : 
                                     type === 'Adventure' ? 'Family Trips' : 
                                     type === 'Compact' ? 'City Commute' : 'Comfort & Style';
                      
                      return {
                        id: `fleet-${type.toLowerCase().replace(/\s+/g, '-')}`,
                        title: type,
                        subtitle: subtitle,
                        image: firstProduct?.images?.[0] || store?.banner || 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500',
                        brand: store?.name || 'Fleet Market',
                        cashback: store?.offers?.cashback || 8,
                        action: {
                          type: 'filter',
                          target: 'vehicleType',
                          params: { vehicleType: type }
                        }
                      };
                    });

                    // If no vehicle types, use stores
                    if (carouselItems.length === 0 && featuredStores.length > 0) {
                      carouselItems = featuredStores.map((store: any) => ({
                        id: store._id || store.id,
                        title: store.name || 'Store',
                        subtitle: store.description?.substring(0, 50) || 'Premium Rentals',
                        image: store.banner || store.logo || 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500',
                        brand: store.name || 'Brand',
                        cashback: store.offers?.cashback || 8,
                        action: {
                          type: 'navigate',
                          target: `/MainStorePage?storeId=${store._id || store.id}`
                        }
                      }));
                    }
                  }
                } catch (storeError) {
                  // silently handle
                }
              }

              // For other categories, use featured products or stores
              if (carouselItems.length === 0) {
                // Try to get featured stores for carousel first (better UX)
                try {
                  const storesApi = (await import('@/services/storesApi')).default;
                  
                  // Try multiple tag queries to find stores
                  const tagQueries = [
                    response.data.metadata?.tags?.[0],
                    slug,
                    ...(response.data.metadata?.tags || []).slice(0, 3)
                  ].filter(Boolean);

                  let storesFound = false;
                  for (const tag of tagQueries) {
                    const storesResponse = await storesApi.getStores({
                      tags: tag,
                      isFeatured: true,
                      limit: 10
                    });

                    if (storesResponse.success && storesResponse.data && Array.isArray(storesResponse.data) && storesResponse.data.length > 0) {
                      const featuredStores = storesResponse.data.slice(0, 5);
                      carouselItems = featuredStores.map((store: any) => ({
                        id: store._id || store.id,
                        title: store.name || 'Store',
                        subtitle: store.description?.substring(0, 50) || store.location?.address || '',
                        image: store.banner || store.logo || 'https://via.placeholder.com/300x200?text=No+Image',
                        brand: store.name || 'Brand',
                        cashback: store.offers?.cashback || 8,
                        action: {
                          type: 'navigate',
                          target: `/MainStorePage?storeId=${store._id || store.id}`
                        }
                      }));
                      storesFound = true;
                      break;
                    }
                  }
                  
                  if (!storesFound) {
                    // Try without featured filter
                    for (const tag of tagQueries) {
                      const storesResponse = await storesApi.getStores({
                        tags: tag,
                        limit: 10
                      });

                      if (storesResponse.success && storesResponse.data && Array.isArray(storesResponse.data) && storesResponse.data.length > 0) {
                        const allStores = storesResponse.data.slice(0, 5);
                        carouselItems = allStores.map((store: any) => ({
                          id: store._id || store.id,
                          title: store.name || 'Store',
                          subtitle: store.description?.substring(0, 50) || store.location?.address || '',
                          image: store.banner || store.logo || 'https://via.placeholder.com/300x200?text=No+Image',
                          brand: store.name || 'Brand',
                          cashback: store.offers?.cashback || 8,
                          action: {
                            type: 'navigate',
                            target: `/MainStorePage?storeId=${store._id || store.id}`
                          }
                        }));
                        break;
                      }
                    }
                  }
                } catch (storeError) {
                  // silently handle
                }

                // Fallback to ALL products (not just featured) to ensure multiple items
                if (carouselItems.length === 0 && products.length > 0) {
                  // Use first 5 products (or all if less than 5)
                  const productsToShow = products.slice(0, 5);
                  carouselItems = productsToShow.map((product: any) => ({
                    id: product._id || product.id,
                    title: product.name || product.title,
                    subtitle: product.description?.substring(0, 50) || '',
                    image: Array.isArray(product.images) && product.images.length > 0 
                      ? product.images[0] 
                      : product.image || 'https://via.placeholder.com/300x200?text=No+Image',
                    brand: product.brand || product.store?.name || 'Brand',
                    cashback: product.offers?.cashback || product.cashback?.percentage || 8,
                    action: {
                      type: 'navigate',
                      target: `/product-page?cardId=${product._id || product.id}&cardType=category&category=${response.data._id}`
                    }
                  }));
                }
              }

            }
          } catch (productError) {
            // If products API fails, try to use local data as fallback
            if (localCategory) {
              items = localCategory.items || [];
              carouselItems = localCategory.carouselItems || [];
            }
          }
          
          // Map backend category to frontend format
          const category = {
            id: response.data._id,
            _id: response.data._id, // Also include _id for compatibility
            name: response.data.name,
            slug: response.data.slug,
            description: response.data.description,
            type: response.data.type,
            image: response.data.image,
            bannerImage: response.data.bannerImage,
            color: response.data.metadata?.color,
            icon: response.data.icon,
            childCategories: response.data.childCategories || [], // Include child categories for subcategory dropdown
            parentCategory: response.data.parentCategory || null,
            items: items as CategoryItem[], // Use fetched products
            carouselItems: carouselItems as any[],
            totalCount: Math.max(response.data.productCount || 0, items.length),
            headerConfig: {
              title: response.data.name,
              backgroundColor: ['#ffcd57', '#00996B'], // Always use ReZ green for consistent branding
              textColor: '#FFFFFF',
              showSearch: true,
              showCart: true,
              showCoinBalance: true,
              searchPlaceholder: `Search ${response.data.name.toLowerCase()}...`
            },
            layoutConfig: { displayStyle: 'grid', type: 'grid' },
            seo: { title: response.data.name, description: response.data.description, keywords: [] },
            filters: filters as any[],
            features: [],
            analytics: { totalViews: 0, conversionRate: 0 },
            banners: [],
            isActive: true,
            sortOrder: 0,
            lastUpdated: new Date().toISOString()
          } as Category;
          
          dispatch({ type: 'SET_CURRENT_CATEGORY', payload: category });
          
          // Set initial pagination based on actual items count
          const actualTotal = Math.max(response.data.productCount || 0, items.length);
          dispatch({ 
            type: 'SET_PAGINATION', 
            payload: { 
              total: actualTotal,
              hasMore: actualTotal > initialState.pagination.limit
            }
          });
          return;
        }
      } catch (apiError) {

      }
      
      // Use local category if available
      if (localCategory) {

        dispatch({ type: 'SET_CURRENT_CATEGORY', payload: localCategory });
        dispatch({ 
          type: 'SET_PAGINATION', 
          payload: { 
            total: localCategory.items?.length || 0,
            hasMore: false
          }
        });
        return;
      }
      
      // Final fallback: Create a basic mock category
      const mockCategory = {
        id: `mock-${slug}`,
        name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' '),
        slug: slug,
        description: `Browse ${slug.replace(/[-_]/g, ' ')} category`,
        type: 'general' as const,
        image: '',
        bannerImage: '',
        color: '#ffcd57',
        icon: '',
        items: [
          {
            id: `${slug}-item-1`,
            name: `${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ')} Item 1`,
            metadata: {
              description: `Sample ${slug.replace(/[-_]/g, ' ')} item`,
              tags: [slug],
              brand: '',
              category: '',
              isFeatured: false,
              isNew: false
            },
            price: { current: 29.99, original: 35.99, currency: getCurrentCurrencySymbol(), discount: 0 },
            cashback: { percentage: 5, maxAmount: undefined },
            image: '',
            rating: { value: 4.5, count: 12, maxValue: 5 },
            stock: 10,
            isInStock: true,
            tags: [slug],
            type: 'product',
            timing: { availability: 'always' },
            isFeatured: false
          },
          {
            id: `${slug}-item-2`,
            name: `${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ')} Item 2`,
            metadata: {
              description: `Another sample ${slug.replace(/[-_]/g, ' ')} item`,
              tags: [slug],
              brand: '',
              category: '',
              isFeatured: false,
              isNew: false
            },
            price: { current: 39.99, original: 45.99, currency: getCurrentCurrencySymbol(), discount: 0 },
            cashback: { percentage: 5, maxAmount: undefined },
            image: '',
            rating: { value: 4.2, count: 8, maxValue: 5 },
            stock: 10,
            isInStock: true,
            tags: [slug],
            type: 'product',
            timing: { availability: 'always' },
            isFeatured: false
          }
        ] as unknown as CategoryItem[],
        totalCount: 2,
        headerConfig: {
          title: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' '),
          backgroundColor: ['#ffcd57', '#00996B'],
          textColor: '#FFFFFF',
          showSearch: true,
          showCart: true,
          showCoinBalance: true,
          searchPlaceholder: `Search ${slug.replace(/[-_]/g, ' ')}...`
        },
        layoutConfig: { displayStyle: 'grid' as const, type: 'grid' },
        seo: { title: slug, description: `${slug.replace(/[-_]/g, ' ')} category`, keywords: [] },
        filters: [],
        features: [],
        analytics: { totalViews: 0, conversionRate: 0 },
        banners: [],
        isActive: true,
        sortOrder: 0,
        lastUpdated: new Date().toISOString()
      } as Category;

      dispatch({ type: 'SET_CURRENT_CATEGORY', payload: mockCategory });
      dispatch({ 
        type: 'SET_PAGINATION', 
        payload: { 
          total: 2,
          hasMore: false
        }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load category';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load all categories
  const loadCategories = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Use real backend API
      const categoriesApi = (await import('@/services/categoriesApi')).default;
      const response = await categoriesApi.getCategories({ isActive: true });
      
      if (!response.data) {
        throw new Error('Failed to fetch categories');
      }
      
      // Map backend categories to frontend format
      const categories = response.data.map(cat => ({
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        type: cat.type,
        image: cat.image,
        bannerImage: cat.bannerImage,
        color: cat.metadata?.color,
        icon: cat.icon,
        featured: cat.metadata?.featured || false,
        items: [],
        totalCount: cat.productCount || 0,
        headerConfig: {
          title: cat.name,
          backgroundColor: ['#ffcd57', '#00996B'], // Always use ReZ green for consistent branding
          textColor: '#FFFFFF',
          showSearch: true,
          showCart: true,
          showCoinBalance: true,
          searchPlaceholder: `Search ${cat.name.toLowerCase()}...`
        },
        layoutConfig: { displayStyle: 'grid', type: 'grid' },
        seo: { title: cat.name, description: cat.description, keywords: [] },
        filters: [],
        features: [],
        analytics: { totalViews: 0, conversionRate: 0 },
        banners: [],
        isActive: cat.isActive !== undefined ? cat.isActive : true,
        sortOrder: cat.sortOrder || 0,
        lastUpdated: cat.updatedAt || new Date().toISOString()
      } as Category));
      
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load categories';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((filters: Record<string, any>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  // Update search query
  const updateSearch = useCallback((query: string) => {
    dispatch({ type: 'UPDATE_SEARCH', payload: query });
  }, []);

  // Update sort option
  const updateSort = useCallback((sortBy: string) => {
    dispatch({ type: 'UPDATE_SORT', payload: sortBy });
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (!state.currentCategory || !state.pagination.hasMore || state.loading) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const nextPage = state.pagination.page + 1;
      const startIndex = (nextPage - 1) * state.pagination.limit;
      const endIndex = startIndex + state.pagination.limit;
      
      // Get more items from current category
      const allItems = state.currentCategory.items;
      const newItems = allItems.slice(startIndex, endIndex);
      
      if (newItems.length > 0) {
        dispatch({ type: 'APPEND_ITEMS', payload: newItems });
        dispatch({ 
          type: 'SET_PAGINATION', 
          payload: { 
            page: nextPage,
            hasMore: endIndex < allItems.length
          }
        });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more items';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.currentCategory, state.pagination, state.loading]);

  // Add to cart - Now handled by CartContext in the component
  const addToCart = useCallback(async (item: CategoryItem) => {

    // This function is kept for compatibility but the actual implementation
    // is now in the component using CartContext directly
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (item: CategoryItem) => {
    try {
      // This would integrate with user favorites functionality

      // You could dispatch a favorites action here
      // Example: favoritesContext.toggleItem(item);
      
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Memoize actions object (all functions are already useCallback-wrapped)
  const actions = useMemo(() => ({
    loadCategory,
    loadCategories,
    updateFilters,
    updateSearch,
    updateSort,
    loadMore,
    resetFilters,
    addToCart,
    toggleFavorite,
  }), [loadCategory, loadCategories, updateFilters, updateSearch, updateSort, loadMore, resetFilters, addToCart, toggleFavorite]);

  // Context value
  const contextValue: CategoryContextType = useMemo(() => ({
    state,
    actions,
  }), [state, actions]);

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

// Hook to use category context
// Now backed by Zustand store — works with or without CategoryProvider in tree.
export function useCategory(): CategoryContextType {
  const context = useContext(CategoryContext);
  const store = __useCategoryStore();
  if (context) return context;
  return store as unknown as CategoryContextType;
}

// Lazy import to avoid circular deps
let __useCategoryStore: () => any;
try {
  const { useCategoryStore } = require('@/stores/categoryStore');
  __useCategoryStore = useCategoryStore;
} catch {
  __useCategoryStore = () => ({});
}

// Utility hook for filtered and sorted items
export function useCategoryItems() {
  const { state } = useCategory();
  
  const filteredAndSortedItems = React.useMemo(() => {
    if (!state.currentCategory) return [];
    
    let items = [...state.currentCategory.items];
    
    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.metadata.description?.toLowerCase().includes(query) ||
        item.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply category-specific filters
    Object.entries(state.filters).forEach(([filterKey, filterValue]) => {
      if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
        return;
      }
      
      items = items.filter(item => {
        const metadata = item.metadata;
        
        switch (filterKey) {
          case 'mealType':
            return metadata.mealType === filterValue;
          case 'occasion':
            return metadata.occasion === filterValue;
          case 'brand':
            return metadata.brand === filterValue;
          case 'priceRange':
            if (item.price && filterValue.min !== undefined && filterValue.max !== undefined) {
              return item.price.current >= filterValue.min && item.price.current <= filterValue.max;
            }
            return true;
          case 'rating':
            if (item.rating && filterValue.min !== undefined) {
              return item.rating.value >= filterValue.min;
            }
            return true;
          case 'isVeg':
            return metadata.isVeg === filterValue;
          case 'prescription':
            return metadata.prescription === filterValue;
          case 'availability':
            return item.timing?.availability === filterValue;
          default:
            return true;
        }
      });
    });
    
    // Apply sorting
    items.sort((a, b) => {
      switch (state.sortBy) {
        case 'price_low':
          return (a.price?.current || 0) - (b.price?.current || 0);
        case 'price_high':
          return (b.price?.current || 0) - (a.price?.current || 0);
        case 'rating':
          return (b.rating?.value || 0) - (a.rating?.value || 0);
        case 'newest':
          // Assuming newer items have higher IDs
          return b.id.localeCompare(a.id);
        case 'popular':
          return (b.rating?.count || 0) - (a.rating?.count || 0);
        case 'featured':
        default:
          // Featured items first, then by rating
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return (b.rating?.value || 0) - (a.rating?.value || 0);
      }
    });
    
    // Apply pagination for displayed items
    const limit = state.pagination.limit;
    const currentPage = state.pagination.page;
    const endIndex = currentPage * limit;
    
    return items.slice(0, endIndex);
  }, [
    state.currentCategory,
    state.filters,
    state.searchQuery,
    state.sortBy,
    state.pagination.page,
    state.pagination.limit
  ]);
  
  return {
    items: filteredAndSortedItems,
    totalCount: state.currentCategory?.items.length || 0,
    filteredCount: filteredAndSortedItems.length,
    hasMore: state.pagination.hasMore,
    loading: state.loading,
  };
}

export default CategoryContext;