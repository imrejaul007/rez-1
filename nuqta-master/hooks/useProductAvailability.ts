// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import productsApi from '@/services/productsApi';
import {
  IProductVariant,
  IAvailabilityStatus,
  getStockStatus,
  getStockMessage,
} from '@/types/product-variants.types';

/**
 * Hook for checking product/variant availability in real-time
 *
 * Features:
 * - Real-time stock checking
 * - Maximum quantity calculation
 * - Stock status messages
 * - Availability validation
 */
interface UseProductAvailabilityProps {
  productId: string;
  variantId?: string;
  selectedVariant?: IProductVariant | null;
  autoCheck?: boolean;
}

interface UseProductAvailabilityReturn {
  availability: IAvailabilityStatus | null;
  isLoading: boolean;
  error: string | null;
  checkAvailability: (quantity: number) => Promise<boolean>;
  canAddToCart: (quantity: number) => boolean;
  getMaxQuantity: () => number;
  refreshAvailability: () => Promise<void>;
}

export const useProductAvailability = ({
  productId,
  variantId,
  selectedVariant,
  autoCheck = true,
}: UseProductAvailabilityProps): UseProductAvailabilityReturn => {
  const [availability, setAvailability] = useState<IAvailabilityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check availability with backend API
   */
  const checkAvailability = useCallback(
    async (quantity: number = 1): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);


        // If we have variant locally, use it for quick check
        if (selectedVariant) {
          const status = getStockStatus(selectedVariant);
          const available = selectedVariant.inventory.isAvailable &&
                           selectedVariant.inventory.quantity >= quantity;

          const availabilityStatus: IAvailabilityStatus = {
            status,
            quantity: selectedVariant.inventory.quantity,
            message: getStockMessage(status, selectedVariant.inventory.quantity),
            canPurchase: available,
            maxQuantity: Math.min(selectedVariant.inventory.quantity, 10), // Max 10 per order
            estimatedRestock: undefined,
          };

          setAvailability(availabilityStatus);
          setIsLoading(false);
          return available;
        }

        // Call backend API for accurate stock check
        const response = await productsApi.checkAvailability(
          productId,
          variantId,
          quantity
        );


        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to check availability');
        }

        const data = response.data;

        // Transform backend response to availability status
        const availabilityStatus: IAvailabilityStatus = {
          status: data.isAvailable
            ? data.quantity > 5
              ? 'in_stock'
              : 'low_stock'
            : 'out_of_stock',
          quantity: data.quantity || 0,
          message: data.message || getStockMessage(
            data.isAvailable ? 'in_stock' : 'out_of_stock',
            data.quantity || 0
          ),
          canPurchase: data.canPurchase !== undefined ? data.canPurchase : data.isAvailable,
          maxQuantity: data.maxQuantity || Math.min(data.quantity || 0, 10),
          estimatedRestock: data.estimatedRestock
            ? new Date(data.estimatedRestock)
            : undefined,
        };

        setAvailability(availabilityStatus);
        setIsLoading(false);

        return availabilityStatus.canPurchase;
      } catch (err: any) {
        setError(err.message || 'Failed to check availability');
        setIsLoading(false);
        return false;
      }
    },
    [productId, variantId, selectedVariant]
  );

  /**
   * Check if a specific quantity can be added to cart
   */
  const canAddToCart = useCallback(
    (quantity: number): boolean => {
      if (!availability) return false;
      return availability.canPurchase && availability.quantity >= quantity;
    },
    [availability]
  );

  /**
   * Get maximum quantity that can be ordered
   */
  const getMaxQuantity = useCallback((): number => {
    if (!availability) return 0;
    return availability.maxQuantity;
  }, [availability]);

  /**
   * Refresh availability data
   */
  const refreshAvailability = useCallback(async (): Promise<void> => {
    await checkAvailability(1);
  }, [checkAvailability]);

  /**
   * Auto-check availability on mount and when variant changes
   */
  useEffect(() => {
    if (autoCheck && (productId || selectedVariant)) {
      checkAvailability(1);
    }
  }, [productId, variantId, selectedVariant, autoCheck]);

  return {
    availability,
    isLoading,
    error,
    checkAvailability,
    canAddToCart,
    getMaxQuantity,
    refreshAvailability,
  };
};

export default useProductAvailability;
