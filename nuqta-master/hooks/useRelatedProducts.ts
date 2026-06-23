import { useState, useEffect, useCallback } from 'react';
import productsApi from '@/services/productsApi';

/**
 * Hook for fetching and managing related products
 *
 * Features:
 * - Fetch similar products
 * - Fetch frequently bought together
 * - Fetch bundle products
 * - Automatic loading and error handling
 */

export interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  rating: number;
  reviewCount: number;
  brand?: string;
  cashback?: string;
  category?: string;  // ✅ ADDED
}

interface UseRelatedProductsProps {
  productId: string;
  type: 'similar' | 'frequently-bought' | 'bundles';
  limit?: number;
  autoLoad?: boolean;
}

interface UseRelatedProductsReturn {
  products: RelatedProduct[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasProducts: boolean;
}

export const useRelatedProducts = ({
  productId,
  type,
  limit = 6,
  autoLoad = true,
}: UseRelatedProductsProps): UseRelatedProductsReturn => {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch related products based on type
   */
  const fetchProducts = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);


      let response;

      switch (type) {
        case 'similar':
          response = await productsApi.getRelatedProducts(productId, limit);
          break;
        case 'frequently-bought':
          response = await productsApi.getFrequentlyBoughtTogether(productId, limit);
          break;
        case 'bundles':
          response = await productsApi.getBundleProducts?.(productId);
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }


      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch related products');
      }

      // Transform backend data to frontend format
      const transformedProducts: RelatedProduct[] = (response.data.products || response.data || []).map((product: any) => {
        // ✅ FIXED: Handle both old, new, and normalized price formats
        // Normalized format (from validator): price.current
        // New format from backend: pricing.selling
        // Old format: pricing.basePrice
        let sellingPrice = 0;
        if (typeof product.price === 'object' && product.price !== null) {
          sellingPrice = product.price.current || 0;
        } else {
          sellingPrice = product.price || product.pricing?.selling || product.pricing?.salePrice || product.pricing?.basePrice || 0;
        }

        let originalPrice = 0;
        if (typeof product.originalPrice === 'object' && product.originalPrice !== null) {
          originalPrice = product.originalPrice.current || 0;
        } else {
          originalPrice = product.originalPrice || product.pricing?.original || product.pricing?.basePrice || sellingPrice;
        }

        const discountPercent = product.discount ||
          (originalPrice > sellingPrice ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);


        return {
          id: product.id || product._id,
          name: product.name,
          price: sellingPrice,  // ✅ FIXED: Now correctly extracts selling price
          originalPrice: originalPrice !== sellingPrice ? originalPrice : undefined,
          discount: discountPercent > 0 ? discountPercent : undefined,
          image: product.images?.[0]?.url || product.images?.[0] || product.image || '',
          rating: product.ratings?.average || product.rating || 0,
          reviewCount: product.ratings?.count || product.reviewCount || 0,
          brand: product.store?.name || product.brand || '',
          cashback: product.cashback?.percentage ? `${product.cashback.percentage}% cashback` : undefined,
          category: product.category || '',  // ✅ ADDED: Include category
        };
      });

      setProducts(transformedProducts);
      setIsLoading(false);

    } catch (err: any) {
      setError(err.message || `Failed to load ${type} products`);
      setIsLoading(false);
      // Set empty array on error
      setProducts([]);
    }
  }, [productId, type, limit]);

  /**
   * Refresh products
   */
  const refresh = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  /**
   * Auto-load on mount and when dependencies change
   */
  useEffect(() => {
    if (autoLoad) {
      fetchProducts();
    }
  }, [autoLoad, fetchProducts]);

  return {
    products,
    isLoading,
    error,
    refresh,
    hasProducts: products.length > 0,
  };
};

export default useRelatedProducts;
