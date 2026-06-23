// useAddresses Hook
// Manages user delivery addresses with full CRUD operations

import { useState, useEffect, useCallback } from 'react';
import addressApi, { Address, AddressCreate, AddressUpdate } from '@/services/addressApi';

interface UseAddressesReturn {
  addresses: Address[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addAddress: (data: AddressCreate) => Promise<Address | null>;
  updateAddress: (id: string, data: AddressUpdate) => Promise<Address | null>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<Address | null>;
  getAddressById: (id: string) => Promise<Address | null>;
  defaultAddress: Address | null;
  clearError: () => void;
}

export const useAddresses = (autoFetch: boolean = true): UseAddressesReturn => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await addressApi.getUserAddresses();

      if (response.success && response.data) {
        setAddresses(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch addresses');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch addresses';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAddress = useCallback(async (data: AddressCreate): Promise<Address | null> => {
    setError(null);

    try {
      const response = await addressApi.createAddress(data);

      if (response.success && response.data) {
        await fetchAddresses(); // Refresh list
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create address');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create address';
      setError(errorMessage);
      return null;
    }
  }, [fetchAddresses]);

  const updateAddress = useCallback(async (id: string, data: AddressUpdate): Promise<Address | null> => {
    setError(null);

    try {
      const response = await addressApi.updateAddress(id, data);

      if (response.success && response.data) {
        await fetchAddresses(); // Refresh list
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update address');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update address';
      setError(errorMessage);
      return null;
    }
  }, [fetchAddresses]);

  const deleteAddress = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await addressApi.deleteAddress(id);

      if (response.success) {
        await fetchAddresses(); // Refresh list
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete address');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete address';
      setError(errorMessage);
      return false;
    }
  }, [fetchAddresses]);

  const setDefaultAddress = useCallback(async (id: string): Promise<Address | null> => {
    setError(null);

    try {
      const response = await addressApi.setDefaultAddress(id);

      if (response.success && response.data) {
        await fetchAddresses(); // Refresh list
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to set default address');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to set default address';
      setError(errorMessage);
      return null;
    }
  }, [fetchAddresses]);

  const getAddressById = useCallback(async (id: string): Promise<Address | null> => {
    setError(null);

    try {
      const response = await addressApi.getAddressById(id);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch address');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch address';
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get default address
  const defaultAddress = addresses.find(addr => addr.isDefault) || null;

  useEffect(() => {
    if (autoFetch) {
      fetchAddresses();
    }
  }, [autoFetch, fetchAddresses]);

  return {
    addresses,
    isLoading,
    error,
    refetch: fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getAddressById,
    defaultAddress,
    clearError,
  };
};

export default useAddresses;
