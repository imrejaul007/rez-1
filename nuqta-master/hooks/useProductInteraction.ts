// useProductInteraction.ts
// Hook for handling product interactions (cart, navigation, analytics)

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import cartService from '@/services/cartApi';
import { ProductItem } from '@/types/homepage.types';

interface ProductInteractionOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  trackAnalytics?: boolean;
}

interface UseProductInteractionReturn {
  addToCart: (product: ProductItem | any, quantity?: number) => Promise<void>;
  navigateToProduct: (productIdOrProduct: string | any, source?: string, product?: any) => void;
  trackProductView: (productId: string, videoId?: string) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for product interactions
 * Handles add to cart, navigation, and analytics tracking
 */
export function useProductInteraction(
  options: ProductInteractionOptions = {}
): UseProductInteractionReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, trackAnalytics = true } = options;

  /**
   * Show success message
   */
  const showSuccess = useCallback((message: string) => {
    if (onSuccess) {
      onSuccess(message);
    } else if (Platform.OS === 'web') {
      // For web, could use a toast library
    } else {
      platformAlertSimple('Success', message);
    }
  }, [onSuccess]);

  /**
   * Show error message
   */
  const showError = useCallback((errorMessage: string) => {
    if (onError) {
      onError(errorMessage);
    } else if (Platform.OS === 'web') {
    } else {
      platformAlertSimple('Error', errorMessage);
    }
  }, [onError]);

  /**
   * Add product to cart
   */
  const addToCart = useCallback(async (
    product: ProductItem | any,
    quantity: number = 1
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Extract product ID from different possible structures
      const productId = product._id || product.id;

      if (!productId) {
        throw new Error('Invalid product: missing ID');
      }

      // Check if product is in stock
      const isInStock = product.availabilityStatus === 'in_stock' ||
                       product.inventory?.stock > 0 ||
                       product.isActive !== false;

      if (!isInStock) {
        throw new Error('Product is out of stock');
      }

      // Add to cart via API
      const response = await cartService.addToCart({
        productId,
        quantity,
        metadata: {
          source: 'ugc_video',
          addedAt: new Date().toISOString(),
        }
      });

      if (response.success) {
        showSuccess(`${product.name || 'Product'} added to cart!`);

        // Track analytics if enabled
        if (trackAnalytics) {
          trackProductView(productId, 'cart_add');
        }
      } else {
        throw new Error(response.error || 'Failed to add to cart');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add product to cart';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, trackAnalytics]);

  /**
   * Navigate to product detail page
   * @param productIdOrProduct - Either a product ID string or full product object
   * @param source - Source of navigation (e.g., 'ugc_video', 'homepage')
   * @param product - Optional product object (deprecated, use first param)
   */
  const navigateToProduct = useCallback((
    productIdOrProduct: string | any,
    source: string = 'ugc_video',
    product?: any
  ) => {
    try {
      // Determine if we received a product object or just an ID
      const isProductObject = typeof productIdOrProduct === 'object' && productIdOrProduct !== null;
      const productData = isProductObject ? productIdOrProduct : (product || null);
      const productId = isProductObject
        ? (productIdOrProduct._id || productIdOrProduct.id)
        : productIdOrProduct;


      // Track analytics before navigation
      if (trackAnalytics && productId) {
        trackProductView(productId, source);
      }

      if (!productId) {
        throw new Error('Invalid product: missing ID');
      }

      // If we have full product data, use ProductPage route with complete params
      if (productData) {
        // Extract category from product
        const category = productData.category || 'general';

        // Create card data structure expected by ProductPage
        const cardData = {
          id: productId,
          _id: productData._id || productId,
          title: productData.title || productData.name || 'Product',
          name: productData.name || productData.title || 'Product',
          description: productData.description || '',
          price: productData.price,
          pricing: productData.pricing,
          image: productData.image || productData.images?.[0] || '',
          images: productData.images || (productData.image ? [productData.image] : []),
          rating: productData.rating,
          category: category,
          inventory: productData.inventory,
          availabilityStatus: productData.availabilityStatus,
          store: productData.store,
          storeId: productData.storeId,
        };


        // Navigate to ProductPage with complete parameters
        router.push({
          pathname: '/product-page',
          params: {
            cardId: productId,
            cardType: 'product',
            category: category,
            cardData: JSON.stringify(cardData),
            source
          }
        });
      } else {
        // Fallback: Navigate with just ID (for backwards compatibility)
        router.push({
          pathname: '/product-page',
          params: {
            cardId: productId,
            cardType: 'product',
            source
          }
        });
      }
    } catch (err: any) {
      showError('Failed to open product details');
    }
  }, [router, trackAnalytics, showError]);

  /**
   * Track product view for analytics
   */
  const trackProductView = useCallback((
    productId: string,
    videoId?: string
  ) => {
    try {
      // Analytics tracking logic
      const analyticsData = {
        event: 'product_view',
        productId,
        videoId,
        source: 'ugc_video',
        timestamp: new Date().toISOString(),
      };

      // TODO: Integrate with analytics service

      // Could integrate with:
      // - Google Analytics
      // - Firebase Analytics
      // - Custom analytics API
    } catch (err) {
      // Don't show error to user for analytics failures
    }
  }, []);

  return {
    addToCart,
    navigateToProduct,
    trackProductView,
    isLoading,
    error,
  };
}

export default useProductInteraction;
