// @ts-nocheck
/**
 * useStorePromotions Hook
 *
 * Custom hook for fetching and managing store promotions and offers
 * Handles loading states, error handling, and data refetching
 *
 * @module hooks/useStorePromotions
 */

import { useState, useEffect } from 'react';
import { offersApi } from '@/services/offersApi';
import { errorReporter } from '@/utils/errorReporter';

interface UseStorePromotionsResult {
  promotions: any[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching store promotions and special offers
 *
 * @param storeId - The ID of the store
 * @returns Object containing promotions array, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * const { promotions, loading, error, refetch } = useStorePromotions('store-123');
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return (
 *   <View>
 *     {promotions.map(promo => (
 *       <PromotionCard key={promo.id} promotion={promo} />
 *     ))}
 *   </View>
 * );
 * ```
 */
export function useStorePromotions(storeId: string): UseStorePromotionsResult {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPromotions = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await offersApi.getStoreOffers(storeId, { active: true, limit: 20 });

      // Handle response from real API
      if (response.success && response.data) {
        const deals = (response.data as any)?.deals || [];
        setPromotions(Array.isArray(deals) ? deals : []);
      } else {
        setPromotions([]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load promotions');
      setError(error);

      // Report error to monitoring service
      errorReporter.captureError(error, {
        context: 'useStorePromotions',
        storeId,
        severity: 'warning', // Promotions are not critical
        category: 'network'
      });

      // Set empty array on error so UI can still render
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [storeId]);

  return {
    promotions,
    loading,
    error,
    refetch: fetchPromotions
  };
}
