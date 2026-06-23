// useVoucherRedemption Hook
// Hook for managing voucher redemption flow

import { useState, useCallback } from 'react';
import {
  VoucherRedemption,
  VoucherValidation,
  RedeemVoucherRequest,
} from '@/types/voucher-redemption.types';
import apiClient from '@/services/apiClient';

export function useVoucherRedemption() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate a voucher before redemption
   */
  const validateVoucher = useCallback(
    async (
      voucherId: string,
      orderAmount?: number
    ): Promise<VoucherValidation> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.post('/vouchers/validate', {
          voucherId,
          orderAmount,
        });

        if (!response.success || !response.data) {
          throw new Error('Validation failed');
        }

        return (response.data as any).validation;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to validate voucher';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Redeem a voucher
   */
  const redeemVoucher = useCallback(
    async (
      voucherId: string,
      method: 'online' | 'in_store',
      options?: {
        location?: string;
        orderId?: string;
      }
    ): Promise<VoucherRedemption> => {
      try {
        setIsLoading(true);
        setError(null);

        const request: RedeemVoucherRequest = {
          voucherId,
          method,
          location: options?.location,
          orderId: options?.orderId,
        };

        const response = await apiClient.post('/vouchers/redeem', request);

        if (!response.success || !response.data) {
          throw new Error('Redemption failed');
        }

        return (response.data as any).redemption;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to redeem voucher';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get redemption history
   */
  const getRedemptionHistory = useCallback(
    async (filters?: {
      page?: number;
      limit?: number;
      status?: 'redeemed' | 'expired' | 'cancelled';
      brand?: string;
    }) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.get('/vouchers/redemptions', filters);

        if (!response.success || !response.data) {
          throw new Error('Failed to load history');
        }

        return response.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load redemption history';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get savings statistics
   */
  const getSavingsStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/vouchers/savings-stats');

        if (!response.success || !response.data) {
          throw new Error('Failed to load stats');
        }

        return (response.data as any).stats;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load savings stats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    validateVoucher,
    redeemVoucher,
    getRedemptionHistory,
    getSavingsStats,
  };
}
