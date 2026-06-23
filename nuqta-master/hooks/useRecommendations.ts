// @ts-nocheck
// useRecommendations Hook
// Custom hook for managing product recommendations

import { useState, useEffect, useCallback } from 'react';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import recommendationService, {
  ProductRecommendation,
  BundleItem
} from '@/services/recommendationApi';
import productsApi from '@/services/productsApi';
import { ProductItem } from '@/types/homepage.types';

export interface UseRecommendationsOptions {
  productId: string;
  autoFetch?: boolean;
  trackView?: boolean;
}

export interface UseRecommendationsResult {
  similar: ProductRecommendation[];
  frequentlyBought: BundleItem[];
  bundles: BundleItem[];
  loading: boolean;
  error: string | null;
  fetchSimilar: () => Promise<void>;
  fetchFrequentlyBought: () => Promise<void>;
  fetchBundles: () => Promise<void>;
  fetchAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRecommendations({
  productId,
  autoFetch = true,
  trackView = true
}: UseRecommendationsOptions): UseRecommendationsResult {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [similar, setSimilar] = useState<ProductRecommendation[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<BundleItem[]>([]);
  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch similar products
  const fetchSimilar = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await recommendationService.getSimilarProducts(productId, 6);
      if (response.success && response.data) {
        setSimilar(response.data.similarProducts);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch similar products');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Fetch frequently bought together
  const fetchFrequentlyBought = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await recommendationService.getFrequentlyBoughtTogether(productId, 4);
      if (response.success && response.data) {
        setFrequentlyBought(response.data.bundles);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch frequently bought together');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Fetch bundle deals
  const fetchBundles = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await recommendationService.getBundleDeals(productId, 3);
      if (response.success && response.data) {
        setBundles(response.data.bundles);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bundle deals');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Fetch all recommendations
  const fetchAll = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await recommendationService.getAllRecommendations(productId);
      setSimilar(result.similar);
      setFrequentlyBought(result.frequentlyBought);
      setBundles(result.bundles);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Refresh all recommendations
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Track product view
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (productId && trackView) {
      recommendationService.trackProductView(productId);
    }
  }, [productId, trackView, authLoading, isAuthenticated]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (productId && autoFetch) {
      fetchAll();
    }
  }, [productId, autoFetch, fetchAll, authLoading, isAuthenticated]);

  return {
    similar,
    frequentlyBought,
    bundles,
    loading,
    error,
    fetchSimilar,
    fetchFrequentlyBought,
    fetchBundles,
    fetchAll,
    refresh
  };
}

export interface UsePersonalizedRecommendationsOptions {
  autoFetch?: boolean;
  limit?: number;
  excludeProducts?: string[];
}

export interface UsePersonalizedRecommendationsResult {
  recommendations: ProductRecommendation[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePersonalizedRecommendations({
  autoFetch = true,
  limit = 10,
  excludeProducts = []
}: UsePersonalizedRecommendationsOptions = {}): UsePersonalizedRecommendationsResult {
  const isAuthenticatedP = useIsAuthenticated();
  const authLoadingP = useAuthLoading();
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch personalized recommendations with fallback to featured products
  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let gotProducts = false;

      // Try personalized recommendations first
      try {
        const response = await recommendationService.getPersonalizedRecommendations(limit, excludeProducts);
        if (response.success && response.data?.recommendations?.length > 0) {
          setRecommendations(response.data.recommendations);
          gotProducts = true;
        }
      } catch (personalizedErr) {
        // Personalized API failed, will try fallback
      }

      // If personalized failed or returned empty, fallback to featured products
      if (!gotProducts) {
        try {
          const featuredResponse = await productsApi.getFeaturedProducts(limit);

          if (featuredResponse.success && featuredResponse.data && featuredResponse.data.length > 0) {
            // Convert featured products to recommendation format
            const featuredAsRecommendations = featuredResponse.data.map((product: any) => ({
              id: product.id || product._id,
              product: product,
              score: 0.8,
              reason: 'Featured product',
              storeId: product.storeId || product.store?.id || product.store,
              name: product.name || product.title,
              image: product.image || product.images?.[0]?.url || product.images?.[0],
              price: product.price,
              ...product
            }));
            setRecommendations(featuredAsRecommendations);
            gotProducts = true;
          }
        } catch (featuredErr) {
          // Featured products API failed, will try fallback
        }
      }

      // If still no products, try getting all products
      if (!gotProducts) {
        try {
          const allProductsResponse = await productsApi.getProducts({ limit });

          if (allProductsResponse.success && allProductsResponse.data) {
            const products = Array.isArray(allProductsResponse.data)
              ? allProductsResponse.data
              : (allProductsResponse.data as any).products || [];

            if (products.length > 0) {
              const productsAsRecommendations = products.slice(0, limit).map((product: any) => ({
                id: product.id || product._id,
                product: product,
                score: 0.7,
                reason: 'Popular product',
                storeId: product.storeId || product.store?.id || product.store,
                name: product.name || product.title,
                image: product.image || product.images?.[0]?.url || product.images?.[0],
                price: product.price,
                ...product
              }));
              setRecommendations(productsAsRecommendations);
            }
          }
        } catch (allErr) {
          // All products fallback failed
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Refresh recommendations
  const refresh = useCallback(async () => {
    await fetch();
  }, [fetch]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (authLoadingP || !isAuthenticatedP) return;
    if (autoFetch) {
      fetch();
    }
  }, [autoFetch, fetch, authLoadingP, isAuthenticatedP]);

  return {
    recommendations,
    loading,
    error,
    fetch,
    refresh
  };
}

export default useRecommendations;
