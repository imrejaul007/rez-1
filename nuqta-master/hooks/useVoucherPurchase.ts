// @ts-nocheck
// hooks/useVoucherPurchase.ts - Hook for managing voucher purchase flow

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import realVouchersApi from '@/services/realVouchersApi';
import logger from '@/utils/logger';

interface PurchaseResult {
  success: boolean;
  voucherId?: string;
  error?: string;
}

/**
 * Custom hook for voucher purchase management
 *
 * Handles the complete purchase flow:
 * - Wallet balance checking
 * - API call to purchase voucher
 * - Success/error handling
 * - Navigation to My Vouchers on success
 *
 * @returns {object} - Purchase state and handlers
 *
 * @example
 * const { purchaseVoucher, purchasing, error } = useVoucherPurchase();
 *
 * const handlePurchase = async () => {
 *   const result = await purchaseVoucher('brandId', 500);
 *   if (result.success) {
 *     // Handle success
 *   }
 * };
 */
export const useVoucherPurchase = () => {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Purchase a voucher
   *
   * @param brandId - ID of the voucher brand
   * @param denomination - Denomination amount (e.g., 500, 1000)
   * @returns Promise<PurchaseResult>
   */
  const purchaseVoucher = useCallback(
    async (brandId: string, denomination: number): Promise<PurchaseResult> => {
      logger.log('🛒 [Purchase] Starting voucher purchase:', { brandId, denomination });

      setPurchasing(true);
      setError(null);

      try {
        const result = await realVouchersApi.purchaseVoucher({
          brandId,
          denomination,
          paymentMethod: 'wallet',
        });

        logger.log('🛒 [Purchase] API Response:', result);

        if (result.success && result.data) {
          logger.log('✅ [Purchase] Success! Voucher:', result.data.voucher._id);

          setPurchasing(false);
          return {
            success: true,
            voucherId: result.data.voucher._id,
          };
        } else {
          // API returned error
          const errorMsg = result.error || 'Failed to purchase voucher';
          logger.error('❌ [Purchase] API Error:', errorMsg);

          setError(errorMsg);

          // Show error using window.alert for web compatibility
          if (typeof window !== 'undefined') {
            window.alert(`Purchase Failed\n\n${errorMsg}`);
          }

          setPurchasing(false);
          return {
            success: false,
            error: errorMsg,
          };
        }
      } catch (err: any) {
        // Exception occurred
        logger.error('❌ [Purchase] Exception:', err);

        let errorMsg = 'Failed to purchase voucher';

        // Handle specific error types
        if (err.response) {
          // HTTP error
          if (err.response.status === 400) {
            errorMsg = err.response.data?.message || 'Invalid purchase request';
          } else if (err.response.status === 401) {
            errorMsg = 'Please sign in to purchase vouchers';
          } else if (err.response.status === 404) {
            errorMsg = 'Voucher brand not found';
          } else if (err.response.status >= 500) {
            errorMsg = 'Server error. Please try again later.';
          } else {
            errorMsg = err.response.data?.message || err.message || errorMsg;
          }
        } else {
          // Check network connectivity in platform-specific way
          if (Platform.OS === 'web') {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              errorMsg = 'No internet connection. Please check your network.';
            } else {
              errorMsg = err.message || errorMsg;
            }
          } else {
            // For React Native, check NetInfo asynchronously
            try {
              const netState = await NetInfo.fetch();
              if (!netState.isConnected) {
                errorMsg = 'No internet connection. Please check your network.';
              } else {
                errorMsg = err.message || errorMsg;
              }
            } catch {
              errorMsg = err.message || errorMsg;
            }
          }
        }

        setError(errorMsg);

        // Show error using window.alert for web compatibility
        if (typeof window !== 'undefined') {
          window.alert(`Error\n\n${errorMsg}`);
        }

        setPurchasing(false);
        return {
          success: false,
          error: errorMsg,
        };
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    purchaseVoucher,
    purchasing,
    error,
    clearError,
  };
};

export default useVoucherPurchase;
