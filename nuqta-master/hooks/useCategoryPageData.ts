// @ts-nocheck
/**
 * Hook for Category Page Data - Production Ready
 * Uses react-query internally via useCategoryPageQuery / useCategoryStoresQuery / useCategoryProductsQuery.
 * Preserves the exact same return shape as the original manual-fetch version.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  useCategoryPageQuery,
  useCategoryStoresQuery,
  useCategoryProductsQuery,
} from '@/hooks/queries/useCategoryData';
import type {
  Category,
  CategoryVibe,
  CategoryOccasion,
  CategoryHashtag,
  CategoryPageConfig,
} from '@/services/categoriesApi';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';

// Import dummy data as fallback
import { fashionCategoryData } from '@/data/category/fashionCategoryData';
import { foodCategoryData } from '@/data/category/foodCategoryData';
import { beautyCategoryData } from '@/data/category/beautyCategoryData';
import { groceryCategoryData } from '@/data/category/groceryCategoryData';
import { healthcareCategoryData } from '@/data/category/healthcareCategoryData';
import { educationCategoryData } from '@/data/category/educationCategoryData';
import { fitnessCategoryData } from '@/data/category/fitnessCategoryData';
import { homeServicesCategoryData } from '@/data/category/homeServicesCategoryData';
import { travelCategoryData } from '@/data/category/travelCategoryData';
import { entertainmentCategoryData } from '@/data/category/entertainmentCategoryData';
import { financialCategoryData } from '@/data/category/financialCategoryData';

// Subcategory interface for grid display
export interface SubcategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  cashback?: number;
  itemCount?: number;
  image?: string;
}

// Store interface for category page
export interface CategoryStoreItem {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  rating: number;
  cashback?: number;
  distance?: string;
  is60Min?: boolean;
  hasPickup?: boolean;
  categories?: string[];
}

// Product interface for category page
export interface CategoryProductItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating?: number;
  cashback?: number;
  storeName?: string;
}

// UGC Post interface
export interface UGCPostItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  image: string;
  hashtag: string;
  likes: number;
  comments: number;
  coinsEarned: number;
  isVerified: boolean;
}

// Exclusive Offer interface
export interface ExclusiveOfferItem {
  id: string;
  title: string;
  icon: string;
  discount: string;
  description: string;
  color: string;
  gradient?: string;
}

interface UseCategoryPageDataResult {
  // Category Info
  category: Category | null;
  categoryName: string;
  categorySlug: string;

  // Dynamic Page Config (admin-driven)
  pageConfig: CategoryPageConfig | null;

  // Subcategories (for Browse Grid)
  subcategories: SubcategoryItem[];

  // Category Page Data
  vibes: CategoryVibe[];
  occasions: CategoryOccasion[];
  hashtags: CategoryHashtag[];

  // Stores & Products
  stores: CategoryStoreItem[];
  products: CategoryProductItem[];

  // UGC Data
  ugcPosts: UGCPostItem[];

  // Exclusive Offers
  exclusiveOffers: ExclusiveOfferItem[];

  // AI Search Data
  aiSuggestions: any[];
  aiFilterChips: any[];
  aiPlaceholders: string[];

  // Loading & Error States
  isLoading: boolean;
  isLoadingCategory: boolean;
  isLoadingStores: boolean;
  isLoadingProducts: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
}

// Map slug to dummy data
const getDummyData = (slug: string): any => {
  const dataMap: Record<string, any> = {
    'fashion': fashionCategoryData,
    'food-dining': foodCategoryData,
    'beauty-wellness': beautyCategoryData,
    'grocery-essentials': groceryCategoryData,
    'healthcare': healthcareCategoryData,
    'education-learning': educationCategoryData,
    'fitness-sports': fitnessCategoryData,
    'home-services': homeServicesCategoryData,
    'travel': travelCategoryData,
    'entertainment': entertainmentCategoryData,
    'financial-services': financialCategoryData,
  };
  return dataMap[slug] || fashionCategoryData;
};

// Cuisine icon/color map for food-dining subcategories
const cuisineIconMap: Record<string, { icon: string; color: string }> = {
  'pizza': { icon: '\uD83C\uDF55', color: colors.error },
  'biryani': { icon: '\uD83C\uDF57', color: '#D946EF' },
  'burgers': { icon: '\uD83C\uDF54', color: colors.brand.orange },
  'chinese': { icon: '\uD83E\uDD61', color: '#3B82F6' },
  'desserts': { icon: '\uD83C\uDF66', color: '#10B981' },
  'healthy': { icon: '\uD83E\uDD57', color: '#22C55E' },
  'indian': { icon: '\uD83C\uDF5B', color: '#F59E0B' },
  'italian': { icon: '\uD83C\uDF5D', color: colors.error },
  'thai': { icon: '\uD83C\uDF5C', color: colors.brand.pink },
  'mexican': { icon: '\uD83C\uDF2E', color: colors.brand.orange },
  'south indian': { icon: '\uD83E\uDD58', color: colors.brand.purpleLight },
  'north indian': { icon: '\uD83C\uDF5B', color: '#F59E0B' },
  'continental': { icon: '\uD83E\uDD69', color: colors.brand.indigo },
  'japanese': { icon: '\uD83C\uDF63', color: '#3B82F6' },
  'street': { icon: '\uD83C\uDF2E', color: '#F59E0B' },
  'chaat': { icon: '\uD83E\uDD58', color: '#F59E0B' },
  'cafe': { icon: '\u2615', color: '#78350F' },
  'thali': { icon: '\uD83C\uDF71', color: '#F59E0B' },
  'ice-cream': { icon: '\uD83C\uDF66', color: colors.brand.pink },
  'healthy-food': { icon: '\uD83E\uDD57', color: '#22C55E' },
};

export const useCategoryPageData = (slug: string, _options?: { storesPerPage?: number }): UseCategoryPageDataResult => {
  const queryClient = useQueryClient();

  // ---- React-Query hooks ----
  const categoryQuery = useCategoryPageQuery(slug);
  const storesQuery = useCategoryStoresQuery(slug);
  const productsQuery = useCategoryProductsQuery(slug);

  // ---- Side-loaded state (not part of the 3 main queries) ----
  const [pageConfig, setPageConfig] = useState<CategoryPageConfig | null>(null);
  const [ugcPosts, setUgcPosts] = useState<UGCPostItem[]>([]);
  const [exclusiveOffers, setExclusiveOffers] = useState<ExclusiveOfferItem[]>([]);
  const [cuisineCounts, setCuisineCounts] = useState<any[]>([]);

  // ---- Fetch page config ----
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const categoriesApi = (await import('@/services/categoriesApi')).default;
        const configResponse = await categoriesApi.getPageConfig(slug);
        if (!cancelled && configResponse?.success && configResponse.data) {
          setPageConfig(configResponse.data);
        }
      } catch {
        // silently handle
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ---- Fetch cuisine counts for food-dining ----
  useEffect(() => {
    if (slug !== 'food-dining') return;
    let cancelled = false;
    (async () => {
      try {
        const { storesApi } = await import('@/services/storesApi');
        const countResponse = await storesApi.getCuisineCounts();
        if (!cancelled && countResponse.success && countResponse.data?.cuisines) {
          setCuisineCounts(countResponse.data.cuisines);
        }
      } catch {
        // silently handle
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ---- Derive category data from query result ----
  const categoryData = categoryQuery.data;
  const categorySuccess = categoryData?.success && categoryData?.data;
  const category: Category | null = categorySuccess ? categoryData!.data! : null;

  // ---- Derive subcategories ----
  const subcategories = useMemo<SubcategoryItem[]>(() => {
    if (!category?.childCategories || !Array.isArray(category.childCategories)) {
      // Fallback to dummy data
      if (categoryQuery.isError || (categoryQuery.isSuccess && !categorySuccess)) {
        const dummyData = getDummyData(slug);
        if (dummyData.categories) {
          return dummyData.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.id,
            icon: cat.icon,
            color: cat.color,
            cashback: cat.cashback,
            itemCount: cat.itemCount,
          }));
        }
      }
      return [];
    }

    return category.childCategories.map((child: any) => {
      const nameLower = (child.name || '').toLowerCase();
      const slugLower = (child.slug || '').toLowerCase();

      let fallbackIcon = '\uD83C\uDF7D\uFE0F';
      let fallbackColor = colors.neutral[500];
      let matchedCount = 0;

      for (const [key, value] of Object.entries(cuisineIconMap)) {
        if (nameLower.includes(key) || slugLower.includes(key)) {
          fallbackIcon = value.icon;
          fallbackColor = value.color;
          break;
        }
      }

      if (cuisineCounts.length > 0) {
        const matchedCuisine = cuisineCounts.find((c: any) =>
          nameLower.includes(c.id) || slugLower.includes(c.id) ||
          c.id.includes(slugLower) || c.name.toLowerCase() === nameLower
        );
        if (matchedCuisine) {
          matchedCount = matchedCuisine.count;
        }
      }

      const finalCount = matchedCount > 0 ? matchedCount : (child.productCount || child.storeCount);

      return {
        id: child._id || child.id,
        name: child.name,
        slug: child.slug,
        icon: child.icon || fallbackIcon || '\uD83C\uDF7D\uFE0F',
        color: child.metadata?.color || fallbackColor,
        cashback: child.maxCashback,
        itemCount: finalCount,
        image: child.image,
      };
    });
  }, [category, categoryQuery.isError, categoryQuery.isSuccess, categorySuccess, cuisineCounts, slug]);

  // ---- Derive vibes, occasions, hashtags ----
  const vibes = useMemo<CategoryVibe[]>(() => {
    if (category) return category.vibes || [];
    if (categoryQuery.isError || (categoryQuery.isSuccess && !categorySuccess)) {
      const dummyData = getDummyData(slug);
      return dummyData.vibes || [];
    }
    return [];
  }, [category, categoryQuery.isError, categoryQuery.isSuccess, categorySuccess, slug]);

  const occasions = useMemo<CategoryOccasion[]>(() => {
    if (category) return category.occasions || [];
    if (categoryQuery.isError || (categoryQuery.isSuccess && !categorySuccess)) {
      const dummyData = getDummyData(slug);
      return dummyData.occasions || [];
    }
    return [];
  }, [category, categoryQuery.isError, categoryQuery.isSuccess, categorySuccess, slug]);

  const hashtags = useMemo<CategoryHashtag[]>(() => {
    if (category) return (category as any).trendingHashtags || [];
    if (categoryQuery.isError || (categoryQuery.isSuccess && !categorySuccess)) {
      const dummyData = getDummyData(slug);
      return dummyData.trendingHashtags || [];
    }
    return [];
  }, [category, categoryQuery.isError, categoryQuery.isSuccess, categorySuccess, slug]);

  // ---- Derive stores from query result ----
  const stores = useMemo<CategoryStoreItem[]>(() => {
    const storesData = storesQuery.data;
    if (!storesData?.success || !storesData?.data) {
      // Fallback to dummy
      if (storesQuery.isError) {
        const dummyData = getDummyData(slug);
        return dummyData.stores || [];
      }
      return [];
    }
    const rawStores = Array.isArray(storesData.data) ? storesData.data : [];
    return rawStores.map((store: any) => ({
      id: store._id || store.id,
      _id: store._id || store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      banner: store.banner,
      rating: store.ratings?.average || store.rating || 0,
      ratings: store.ratings,
      cashback: store.offers?.cashback || store.cashback,
      distance: store.distance || '',
      is60Min: store.deliveryCategories?.fastDelivery || (store.operationalInfo?.deliveryTime ? parseInt(store.operationalInfo.deliveryTime) <= 60 : false),
      hasPickup: store.hasStorePickup || false,
      categories: store.category ? [store.category.name] : [],
      category: store.category,
      tags: store.tags || [],
      rewardRules: store.rewardRules,
      priceForTwo: store.priceForTwo,
      offers: store.offers,
      operationalInfo: store.operationalInfo,
      deliveryCategories: store.deliveryCategories,
      location: store.location,
      isFeatured: store.isFeatured,
      bookingType: store.bookingType,
      bookingConfig: store.bookingConfig,
      storeVisitConfig: store.storeVisitConfig,
      isDineIn: store.bookingType === 'RESTAURANT' || store.bookingConfig?.enabled || store.storeVisitConfig?.enabled || false,
      isOpen: store.isOpen ?? store.operationalInfo?.isCurrentlyOpen,
      type: store.type,
    }));
  }, [storesQuery.data, storesQuery.isError, slug]);

  // ---- Derive products from query result ----
  const products = useMemo<CategoryProductItem[]>(() => {
    const productsData = productsQuery.data;
    if (!productsData?.success || !productsData?.data) return [];
    const productsArr = productsData.data.products || [];
    return productsArr.map((product: any) => ({
      id: product._id || product.id,
      _id: product._id || product.id,
      name: product.name,
      image: product.images?.[0]?.url || product.image,
      images: product.images?.map((img: any) => img?.url || img) || [],
      price: product.pricing?.selling || product.pricing?.original || product.price,
      originalPrice: product.pricing?.original,
      pricing: product.pricing,
      discount: product.pricing?.selling && product.pricing?.original && product.pricing.original > product.pricing.selling
        ? Math.round((1 - product.pricing.selling / product.pricing.original) * 100)
        : undefined,
      rating: product.ratings?.average || product.rating,
      cashback: product.cashback?.percentage,
      cashbackCoins: product.cashback?.coins || product.cashbackCoins || 0,
      storeName: product.store?.name || undefined,
      storeId: product.store?._id || product.store?.id || (typeof product.store === 'string' ? product.store : undefined),
      store: typeof product.store === 'object' ? {
        _id: product.store?._id || product.store?.id,
        id: product.store?._id || product.store?.id,
        name: product.store?.name,
        tags: product.store?.tags || [],
        type: product.store?.type,
        deliveryCategories: product.store?.deliveryCategories,
        operationalInfo: product.store?.operationalInfo,
        logo: product.store?.logo,
      } : product.store,
      tags: product.tags || [],
      brand: product.brand,
      unit: product.unit,
      deliveryCategories: product.deliveryCategories,
    }));
  }, [productsQuery.data]);

  // ---- AI suggestions derived from vibes/occasions/hashtags ----
  const { aiSuggestions, aiFilterChips, aiPlaceholders } = useMemo(() => {
    const suggestions: any[] = [];
    const filterChips: any[] = [];
    const placeholders: string[] = [];

    const hasData = vibes.length > 0 || occasions.length > 0 || hashtags.length > 0;
    if (!hasData) {
      // Fallback: check dummy data for AI fields
      if (categoryQuery.isError || (categoryQuery.isSuccess && !categorySuccess)) {
        const dummyData = getDummyData(slug);
        return {
          aiSuggestions: dummyData.aiSuggestions || [],
          aiFilterChips: dummyData.aiFilterChips || [],
          aiPlaceholders: dummyData.aiPlaceholders || [],
        };
      }
      return { aiSuggestions: [], aiFilterChips: [], aiPlaceholders: [] };
    }

    // Generate suggestions from vibes
    vibes.slice(0, 3).forEach((vibe) => {
      suggestions.push({
        id: `vibe-${vibe.id}`,
        text: `Find ${vibe.name.toLowerCase()} options`,
        icon: vibe.icon,
        color: vibe.color,
        type: 'vibe',
      });
    });

    // Generate suggestions from occasions
    occasions.slice(0, 3).forEach((occasion) => {
      suggestions.push({
        id: `occasion-${occasion.id}`,
        text: `${occasion.name} deals`,
        icon: occasion.icon,
        color: occasion.color,
        type: 'occasion',
        discount: occasion.discount,
      });
    });

    // Generate filter chips from hashtags
    hashtags.slice(0, 4).forEach((hashtag) => {
      filterChips.push({
        id: `hashtag-${hashtag.id}`,
        label: hashtag.tag,
        count: hashtag.count,
        color: hashtag.color,
        trending: hashtag.trending,
      });
    });

    // Generate search placeholders
    const catName = category?.name || slug.replace(/-/g, ' ');
    placeholders.push(
      `Search in ${catName}...`,
      `Find deals on ${catName.toLowerCase()}...`,
      vibes.length > 0 ? `Explore ${vibes[0].name.toLowerCase()} options...` : `Discover popular ${catName.toLowerCase()}...`,
    );

    return { aiSuggestions: suggestions, aiFilterChips: filterChips, aiPlaceholders: placeholders };
  }, [vibes, occasions, hashtags, category, slug, categoryQuery.isError, categoryQuery.isSuccess, categorySuccess]);

  // ---- Load UGC (videos + reviews) and exclusive offers ----
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      try {
        const [videosRes, reviewsRes] = await Promise.all([
          apiClient.get<any>('/videos', { category: slug, limit: 6, status: 'approved' }).catch(() => null),
          apiClient.get<any>('/reviews/featured', { category: slug, limit: 6 }).catch(() => null),
        ]);

        if (cancelled) return;

        const combined: UGCPostItem[] = [];

        if (videosRes?.success && videosRes.data) {
          const videos = Array.isArray(videosRes.data) ? videosRes.data : (videosRes.data?.videos || []);
          videos.forEach((v: any) => {
            const creator = v.creator || v.user;
            combined.push({
              id: v._id,
              userId: creator?._id || '',
              userName: creator?.profile
                ? `${creator.profile.firstName || ''} ${creator.profile.lastName || ''}`.trim() || 'Foodie'
                : 'Foodie',
              userAvatar: creator?.profile?.avatar || '',
              image: v.thumbnail || v.videoUrl || '',
              hashtag: v.tags?.[0] ? `#${v.tags[0]}` : '#FoodieLife',
              likes: v.engagement?.likes?.length || 0,
              comments: v.engagement?.comments || v.comments?.length || 0,
              coinsEarned: v.coinsEarned || 0,
              isVerified: creator?.isVerified || false,
            });
          });
        }

        if (reviewsRes?.success && reviewsRes.data) {
          const reviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : (reviewsRes.data?.reviews || []);
          reviews.forEach((r: any) => {
            if (r.images && r.images.length > 0) {
              combined.push({
                id: r._id,
                userId: r.user?._id || '',
                userName: r.user?.profile
                  ? `${r.user.profile.firstName || ''} ${r.user.profile.lastName || ''}`.trim() || 'Reviewer'
                  : 'Reviewer',
                userAvatar: r.user?.profile?.avatar || '',
                image: r.images[0],
                hashtag: r.store?.name ? `#${r.store.name.replace(/\s+/g, '')}` : '#FoodReview',
                likes: r.helpful || 0,
                comments: 0,
                coinsEarned: r.coinsEarned || 0,
                isVerified: r.user?.isVerified || false,
              });
            }
          });
        }

        if (!cancelled) {
          setUgcPosts(combined);
        }
      } catch {
        if (!cancelled) setUgcPosts([]);
      }

      // Exclusive offers - from dummy for now
      if (!cancelled) {
        const dummyData = getDummyData(slug);
        if (dummyData.exclusiveOffers) {
          setExclusiveOffers(dummyData.exclusiveOffers);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  // ---- Refetch all data ----
  const refetch = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryPage.data(slug) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryPage.stores(slug) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryPage.products(slug) }),
    ]);
  }, [slug, queryClient]);

  // ---- Derive loading states ----
  const isLoadingCategory = categoryQuery.isLoading;
  const isLoadingStores = storesQuery.isLoading;
  const isLoadingProducts = productsQuery.isLoading;
  const isLoading = isLoadingCategory || isLoadingStores || isLoadingProducts;

  // ---- Derive error ----
  const error = useMemo<string | null>(() => {
    if (categoryQuery.error) return (categoryQuery.error as Error).message || 'Failed to load category';
    if (storesQuery.error) return 'Unable to load stores. Pull to refresh.';
    return null;
  }, [categoryQuery.error, storesQuery.error]);

  // ---- Derived category name ----
  const categoryName = category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    // Category Info
    category,
    categoryName,
    categorySlug: slug,

    // Dynamic Page Config (admin-driven)
    pageConfig,

    // Subcategories
    subcategories,

    // Category Page Data
    vibes,
    occasions,
    hashtags,

    // Stores & Products
    stores,
    products,

    // UGC Data
    ugcPosts,

    // Exclusive Offers
    exclusiveOffers,

    // AI Search Data
    aiSuggestions,
    aiFilterChips,
    aiPlaceholders,

    // Loading & Error States
    isLoading,
    isLoadingCategory,
    isLoadingStores,
    isLoadingProducts,
    error,

    // Actions
    refetch,
  };
};

export default useCategoryPageData;
