import { useMemo } from 'react';

export interface StockStatusResult {
  isOutOfStock: boolean;
  isLowStock: boolean;
  stockMessage: string | null;
  canAddToCart: boolean;
  stockLevel: number;
  maxStock: number;
}

interface UseStockStatusParams {
  stock: number;
  lowStockThreshold?: number;
}

/**
 * Hook to determine stock status and availability
 * @param stock - Current stock level
 * @param lowStockThreshold - Threshold for low stock warning (default: 5)
 * @returns Stock status information
 */
export function useStockStatus({
  stock,
  lowStockThreshold = 5,
}: UseStockStatusParams): StockStatusResult {
  return useMemo(() => {
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= lowStockThreshold;
    const canAddToCart = stock > 0;

    let stockMessage: string | null = null;

    if (isOutOfStock) {
      stockMessage = 'Out of Stock';
    } else if (isLowStock) {
      stockMessage = `Only ${stock} left!`;
    } else {
      stockMessage = 'In Stock';
    }

    return {
      isOutOfStock,
      isLowStock,
      stockMessage,
      canAddToCart,
      stockLevel: stock,
      maxStock: stock,
    };
  }, [stock, lowStockThreshold]);
}