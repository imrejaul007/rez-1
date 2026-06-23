// @ts-nocheck
/**
 * Custom Hook for FashionPage Data
 * Handles all API calls, loading states, and error handling for the Fashion page
 */

import { useState, useEffect, useCallback } from 'react';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import categoriesApi from '@/services/categoriesApi';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

export interface FashionStore {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  category: any;

  // Backend sends address separately from location (GeoJSON)
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };

  // GeoJSON location from backend
  location?: {
    type?: string;
    coordinates?: [number, number];
    // Legacy fields for compatibility
    address?: string;
    city?: string;
    state?: string;
  };

  ratings?: {
    average: number;
    count: number;
  };

  // Offers may not be present in all stores
  offers?: {
    cashback?: number;
    isPartner?: boolean;
    partnerLevel?: string;
  };

  // OperationalInfo may not be present
  operationalInfo?: {
    deliveryTime?: string;
    minimumOrder?: number;
  };

  isFeatured?: boolean;
  isActive?: boolean;

  deliveryCategories?: {
    fastDelivery?: boolean;
    premium?: boolean;
    budgetFriendly?: boolean;
  };

  // Additional fields from backend
  description?: string;
  shortDescription?: string;
  coverImage?: string;
  images?: string[];
  tags?: string[];
  contact?: {
    phone?: string;
    email?: string;
  };
  businessHours?: any;
  subcategory?: string;
  subcategorySlug?: string;
}

export interface FashionProduct {
  // ID fields - API can return either 'id' or '_id'
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  title?: string; // API returns both 'name' and 'title'
  description?: string;
  brand?: string;
  type?: string; // API returns 'product' type
  
  // Image fields - API can return either 'image' (string) or 'images' (array)
  image?: string;
  images?: string[];
  
  // Price fields - API returns 'price' object with current/original
  price?: {
    current: number;
    original: number;
    currency: string;
    discount?: number;
  };
  
  // Fallback to 'pricing' for compatibility with some endpoints
  pricing?: {
    basePrice?: number;
    salePrice?: number;
    original?: number;
    selling?: number;
    discount?: number;
  };
  
  // Rating fields - API returns 'rating' (singular) with value and count
  rating?: {
    value: string | number;
    count: number;
  };
  
  // Fallback to 'ratings' for compatibility
  ratings?: {
    average: number;
    count: number;
  };
  
  // Additional API fields
  availabilityStatus?: string; // 'in_stock', 'out_of_stock', etc.
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

export interface FashionCategory {
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

interface UseFashionDataResult {
  // Data
  featuredStores: FashionStore[];
  fashionStores: FashionStore[];
  featuredProducts: FashionProduct[];
  categories: FashionCategory[];
  
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

export const useFashionData = (): UseFashionDataResult => {
  // Data states
  const [featuredStores, setFeaturedStores] = useState<FashionStore[]>([]);
  const [fashionStores, setFashionStores] = useState<FashionStore[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FashionProduct[]>([]);
  const [categories, setCategories] = useState<FashionCategory[]>([]);

  // Loading states
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Error states
  const [storesError, setStoresError] = useState<Error | null>(null);
  const [productsError, setProductsError] = useState<Error | null>(null);
  const [categoriesError, setCategoriesError] = useState<Error | null>(null);

  // Fetch Featured Stores (FASHION ONLY)
  const fetchFeaturedStores = useCallback(async () => {
    try {
      setIsLoadingStores(true);
      setStoresError(null);

      const response = await storesApi.getFeaturedStores(10);
      
      if (response.success && response.data) {
        // STRICT: Only show fashion stores
        const fashionStoresData = Array.isArray(response.data) 
          ? response.data.filter((store: any) => {
              const categoryName = store.category?.name?.toLowerCase() || '';
              const storeTags = store.tags || [];
              
              const isFashion = categoryName.includes('fashion') || 
                     categoryName.includes('clothing') || 
                     categoryName.includes('apparel') ||
                     categoryName.includes('beauty') ||
                     storeTags.some((tag: string) => {
                       const tagLower = tag.toLowerCase();
                       return tagLower.includes('fashion') || 
                              tagLower.includes('clothing') ||
                              tagLower.includes('apparel');
                     });
              
              if (isFashion) {
                devLog.log('✅ Fashion Store:', store.name);
              }
              
              return isFashion;
            })
          : [];
        
        devLog.log(`📦 Found ${fashionStoresData.length} fashion stores`);
        setFeaturedStores(fashionStoresData);
      }
    } catch (error) {
      devLog.error('[FASHION DATA] Error fetching featured stores:', error);
      setStoresError(error as Error);
    } finally {
      setIsLoadingStores(false);
    }
  }, []);

  // Fetch Fashion Stores (FASHION ONLY)
  const fetchFashionStores = useCallback(async () => {
    try {
      setIsLoadingStores(true);
      setStoresError(null);

      const response = await storesApi.getStores({
        limit: 20,
        sortBy: 'rating'
      });
      
      if (response.success && response.data) {
        const storesData = response.data.stores || [];
        
        // STRICT: Only show fashion-related stores
        const fashionStoresData = storesData.filter((store: any) => {
          const categoryName = store.category?.name?.toLowerCase() || '';
          const tags = store.tags || [];
          
          const isFashion = categoryName.includes('fashion') || 
                 categoryName.includes('clothing') || 
                 categoryName.includes('apparel') ||
                 categoryName.includes('beauty') ||
                 tags.some((tag: string) => {
                   const tagLower = tag.toLowerCase();
                   return tagLower.includes('fashion') || 
                          tagLower.includes('clothing') ||
                          tagLower.includes('apparel');
                 });
          
          return isFashion;
        });
        
        devLog.log(`📦 Found ${fashionStoresData.length} fashion brands`);
        setFashionStores(fashionStoresData);
      }
    } catch (error) {
      devLog.error('[FASHION DATA] Error fetching fashion stores:', error);
      setStoresError(error as Error);
    } finally {
      setIsLoadingStores(false);
    }
  }, []);

  // Fetch Featured Products (FASHION ONLY)
  const fetchFeaturedProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      setProductsError(null);

      devLog.log('🔍 [FASHION DATA] Fetching featured products...');
      const response = await productsApi.getFeaturedProducts(20);
      
      devLog.log('📡 [FASHION DATA] API Response:', response);
      
      if (response.success && response.data) {
        devLog.log(`📦 [FASHION DATA] Total products received: ${response.data.length}`);
        
        // Log first product to see structure
        if (response.data.length > 0) {
          devLog.log('🔍 [FASHION DATA] Sample product:', {
            name: response.data[0].name,
            category: response.data[0].category,
            tags: response.data[0].tags,
          });
        }
        
        // STRICT: Only show fashion products
        // Fashion & Beauty category ID from database
        const FASHION_CATEGORY_ID = '68ecdb9f55f086b04de299ef';
        
        const fashionProductsData = Array.isArray(response.data)
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
              
              devLog.log(`🔍 Checking product: ${product.name}`, {
                categoryId,
                categoryName,
                tags: productTags,
              });
              
              // Check if product is fashion-related
              const isFashion = 
                categoryId === FASHION_CATEGORY_ID || // Match Fashion & Beauty category ID
                categoryName.includes('fashion') || 
                categoryName.includes('clothing') || 
                categoryName.includes('apparel') ||
                categoryName.includes('beauty') ||
                productTags.some((tag: string) => {
                  const tagLower = tag.toLowerCase();
                  return tagLower.includes('fashion') || 
                         tagLower.includes('clothing') ||
                         tagLower.includes('apparel') ||
                         tagLower.includes('beauty') ||
                         tagLower.includes('jacket') ||
                         tagLower.includes('jeans') ||
                         tagLower.includes('dress') ||
                         tagLower.includes('shirt') ||
                         tagLower.includes('shoe') ||
                         tagLower.includes('sneaker') ||
                         tagLower.includes('sunglasses') ||
                         tagLower.includes('handbag') ||
                         tagLower.includes('blazer');
                });
              
              if (isFashion) {
                devLog.log('✅ Fashion Product:', product.name);
              } else {
                devLog.log('❌ NOT Fashion:', product.name);
              }
              
              return isFashion;
            })
          : [];
        
        devLog.log(`📦 [FASHION DATA] Found ${fashionProductsData.length} fashion products out of ${response.data.length} total`);
        setFeaturedProducts(fashionProductsData.slice(0, 10));
      } else {
        devLog.log('⚠️ [FASHION DATA] No products data in response');
      }
    } catch (error) {
      devLog.error('❌ [FASHION DATA] Error fetching featured products:', error);
      setProductsError(error as Error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Fetch Fashion Categories AND Subcategories (FASHION ONLY)
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      setCategoriesError(null);

      devLog.log('🔍 [FASHION DATA] Fetching all categories...');
      const response = await categoriesApi.getCategories();
      
      if (response.success && response.data) {
        devLog.log(`📦 [FASHION DATA] Received ${response.data.length} total categories`);
        
        // First, find the main Fashion & Beauty category
        const mainFashionCategory = Array.isArray(response.data)
          ? response.data.find((cat: any) => cat.slug === 'fashion-beauty')
          : null;
        
        devLog.log('🎨 [FASHION DATA] Main fashion category:', mainFashionCategory?.name, mainFashionCategory?._id);
        
        if (!mainFashionCategory) {
          devLog.log('⚠️ [FASHION DATA] Fashion & Beauty category not found!');
          setCategories([]);
          return;
        }
        
        // STRICT FILTERING: Only show fashion subcategories
        const fashionCategories = Array.isArray(response.data)
          ? response.data.filter((category: any) => {
              // Skip the main fashion category itself
              if (category.slug === 'fashion-beauty' || category._id === mainFashionCategory._id) {
                return false;
              }
              
              const slug = category.slug?.toLowerCase() || '';
              const name = category.name?.toLowerCase() || '';
              const parentId = category.parent?._id || category.parent;
              const categoryId = category._id?.toString() || category.id?.toString();
              const mainFashionId = mainFashionCategory._id?.toString() || mainFashionCategory.id?.toString();
              
              // STRICT: Only show direct subcategories of Fashion & Beauty
              const isSubcategory = parentId?.toString() === mainFashionId || 
                                   categoryId === mainFashionId;
              
              // Fashion-specific slug patterns
              const isFashionSubcategory = [
                'mens-fashion',
                'womens-fashion', 
                'kids-fashion',
                'footwear',
                'accessories',
                'beauty-cosmetics',
                'men',
                'women',
                'kids',
                'children'
              ].some(pattern => slug.includes(pattern));
              
              // Fashion-related keywords in name
              const fashionKeywords = [
                'men', 'women', 'kid', 'child', 'footwear', 'shoe', 'accessory', 
                'beauty', 'cosmetic', 'fashion', 'clothing', 'apparel', 'wear'
              ];
              const hasFashionKeyword = fashionKeywords.some(keyword => 
                name.includes(keyword) || slug.includes(keyword)
              );
              
              // Check tags for fashion-related keywords
              const tags = category.metadata?.tags || category.tags || [];
              const hasFashionTag = tags.some((tag: string) => {
                const lowerTag = tag.toLowerCase();
                return fashionKeywords.some(keyword => lowerTag.includes(keyword));
              });
              
              // STRICT: Must be a subcategory AND have fashion-related content
              const isFashion = isSubcategory && (hasFashionKeyword || hasFashionTag || isFashionSubcategory);
              
              // EXCLUDE non-fashion categories explicitly
              const nonFashionKeywords = [
                'fruit', 'gift', 'grocery', 'meat', 'restaurant', 'food', 'dining',
                'electronic', 'tech', 'gadget', 'organic', 'medicine', 'pharmacy',
                'fleet', 'car', 'vehicle', 'rental'
              ];
              const isNonFashion = nonFashionKeywords.some(keyword => 
                name.includes(keyword) || slug.includes(keyword)
              );
              
              if (isNonFashion) {
                devLog.log(`   ❌ Excluding non-fashion category: ${category.name} (${slug})`);
                return false;
              }
              
              if (isFashion) {
                devLog.log(`   ✅ Fashion Subcategory: ${category.name} (${slug})`);
              }
              
              return isFashion; // Only show fashion subcategories
            })
          : [];
        
        devLog.log(`📦 [FASHION DATA] Found ${fashionCategories.length} fashion subcategories`);
        
        // Show up to 8 subcategories
        setCategories(fashionCategories.slice(0, 8));
      } else {
        devLog.log('⚠️ [FASHION DATA] No categories data in response');
        setCategories([]);
      }
    } catch (error) {
      devLog.error('❌ [FASHION DATA] Error fetching categories:', error);
      setCategoriesError(error as Error);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Refetch actions
  const refetchStores = useCallback(async () => {
    await Promise.all([
      fetchFeaturedStores(),
      fetchFashionStores()
    ]);
  }, [fetchFeaturedStores, fetchFashionStores]);

  const refetchProducts = useCallback(async () => {
    await fetchFeaturedProducts();
  }, [fetchFeaturedProducts]);

  const refetchCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchStores(),
      refetchProducts(),
      refetchCategories()
    ]);
  }, [refetchStores, refetchProducts, refetchCategories]);

  // Initial data fetch
  useEffect(() => {
    fetchFeaturedStores();
    fetchFashionStores();
    fetchFeaturedProducts();
    fetchCategories();
  }, [fetchFeaturedStores, fetchFashionStores, fetchFeaturedProducts, fetchCategories]);

  return {
    // Data
    featuredStores,
    fashionStores,
    featuredProducts,
    categories,
    
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

export default useFashionData;

