// usePaymentMethods Hook
// Manages user payment methods (cards, UPI, bank accounts, wallets)

import { useState, useEffect, useCallback } from 'react';
import paymentMethodApi, {
  PaymentMethod,
  PaymentMethodCreate,
  PaymentMethodUpdate,
} from '@/services/paymentMethodApi';

interface UsePaymentMethodsReturn {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addPaymentMethod: (data: PaymentMethodCreate) => Promise<PaymentMethod | null>;
  updatePaymentMethod: (id: string, data: PaymentMethodUpdate) => Promise<PaymentMethod | null>;
  deletePaymentMethod: (id: string) => Promise<boolean>;
  setDefaultPaymentMethod: (id: string) => Promise<PaymentMethod | null>;
  getPaymentMethodById: (id: string) => Promise<PaymentMethod | null>;
  defaultPaymentMethod: PaymentMethod | null;
  clearError: () => void;
}

export const usePaymentMethods = (autoFetch: boolean = true): UsePaymentMethodsReturn => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {

    setIsLoading(true);
    setError(null);

    try {
      const response = await paymentMethodApi.getUserPaymentMethods();

      if (response.success && response.data) {

        setPaymentMethods(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch payment methods');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch payment methods';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (data: PaymentMethodCreate): Promise<PaymentMethod | null> => {
    setError(null);

    try {
      const response = await paymentMethodApi.createPaymentMethod(data);

      if (response.success && response.data) {
        await fetchPaymentMethods(); // Refresh list
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add payment method');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add payment method';
      setError(errorMessage);
      return null;
    }
  }, [fetchPaymentMethods]);

  const updatePaymentMethod = useCallback(
    async (id: string, data: PaymentMethodUpdate): Promise<PaymentMethod | null> => {
      setError(null);

      try {
        const response = await paymentMethodApi.updatePaymentMethod(id, data);

        if (response.success && response.data) {
          await fetchPaymentMethods(); // Refresh list
          return response.data;
        } else {
          throw new Error(response.message || 'Failed to update payment method');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to update payment method';
        setError(errorMessage);
        return null;
      }
    },
    [fetchPaymentMethods]
  );

  const deletePaymentMethod = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await paymentMethodApi.deletePaymentMethod(id);

      if (response.success) {

        await fetchPaymentMethods(); // Refresh list

        return true;
      } else {
        throw new Error(response.message || 'Failed to delete payment method');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete payment method';
      setError(errorMessage);
      return false;
    }
  }, [fetchPaymentMethods]);

  const setDefaultPaymentMethod = useCallback(async (id: string): Promise<PaymentMethod | null> => {
    setError(null);

    try {
      const response = await paymentMethodApi.setDefaultPaymentMethod(id);

      if (response.success && response.data) {
        await fetchPaymentMethods(); // Refresh list
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to set default payment method');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to set default payment method';
      setError(errorMessage);
      return null;
    }
  }, [fetchPaymentMethods]);

  const getPaymentMethodById = useCallback(async (id: string): Promise<PaymentMethod | null> => {
    setError(null);

    try {
      const response = await paymentMethodApi.getPaymentMethodById(id);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch payment method');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch payment method';
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get default payment method
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault && pm.isActive) || null;

  useEffect(() => {
    if (autoFetch) {
      fetchPaymentMethods();
    }
  }, [autoFetch, fetchPaymentMethods]);

  return {
    paymentMethods,
    isLoading,
    error,
    refetch: fetchPaymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    getPaymentMethodById,
    defaultPaymentMethod,
    clearError,
  };
};

export default usePaymentMethods;
