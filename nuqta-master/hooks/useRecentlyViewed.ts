/**
 * Custom Hook for Recently Viewed functionality
 * Manages recently viewed stores and products using local AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import asyncStorageService from '@/services/asyncStorageService';
import {
  RecentlyViewedItem,
  RecentlyViewedStore,
  RecentlyViewedProduct
} from '@/types/recentlyViewed.types';

interface UseRecentlyViewedResult {
  items: RecentlyViewedItem[];
  isLoading: boolean;
  error: Error | null;
  addStore: (store: RecentlyViewedStore) => Promise<void>;
  addProduct: (product: RecentlyViewedProduct) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useRecentlyViewed = (): UseRecentlyViewedResult => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch items from storage
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await asyncStorageService.getRecentlyViewedUnified();
      // Sort by viewedAt descending (most recent first)
      const sorted = [...data].sort((a, b) => b.viewedAt - a.viewedAt);
      setItems(sorted);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a store to recently viewed
  const addStore = useCallback(async (store: RecentlyViewedStore) => {
    try {
      await asyncStorageService.addRecentlyViewedStore(store);
      // Optionally refresh the list (not strictly needed since this is usually called from a different page)
      // await fetchItems();
    } catch (_err) {
      // silently handle
    }
  }, []);

  // Add a product to recently viewed
  const addProduct = useCallback(async (product: RecentlyViewedProduct) => {
    try {
      await asyncStorageService.addRecentlyViewedProduct(product);
      // Optionally refresh the list
      // await fetchItems();
    } catch (_err) {
      // silently handle
    }
  }, []);

  // Clear all recently viewed items
  const clearAll = useCallback(async () => {
    try {
      await asyncStorageService.clearRecentlyViewedUnified();
      setItems([]);
    } catch (_err) {
      // silently handle
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    addStore,
    addProduct,
    clearAll,
    refresh: fetchItems,
  };
};

export default useRecentlyViewed;
