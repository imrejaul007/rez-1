import { useState, useCallback, useEffect } from 'react';
import { Store, storeSearchService } from '@/services/storeSearchService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPARISON_STORAGE_KEY = 'store_comparison';

interface UseStoreComparisonReturn {
  comparisonStores: Store[];
  addToComparison: (store: Store) => Promise<boolean>;
  removeFromComparison: (storeId: string) => Promise<void>;
  clearComparison: () => Promise<void>;
  isInComparison: (storeId: string) => boolean;
  canAddToComparison: (store: Store) => boolean;
  loadComparisonFromStorage: () => Promise<void>;
  saveComparisonToStorage: () => Promise<void>;
}

export const useStoreComparison = (): UseStoreComparisonReturn => {
  const [comparisonStores, setComparisonStores] = useState<Store[]>([]);

  const MAX_COMPARISON_STORES = 4;

  const addToComparison = useCallback(async (store: Store): Promise<boolean> => {
    // Check if store is already in comparison
    if (comparisonStores.some(s => s._id === store._id)) {
      return false; // Already in comparison
    }

    // Check if we've reached the maximum limit
    if (comparisonStores.length >= MAX_COMPARISON_STORES) {
      return false; // Cannot add more stores
    }

    try {
      // If this is the first store, create a new comparison
      if (comparisonStores.length === 0) {
        const response = await storeSearchService.createComparison({
          storeIds: [store._id],
          name: `Comparison ${new Date().toLocaleDateString()}`
        });
        
        if (response.success) {
          const newComparisonStores = [store];
          setComparisonStores(newComparisonStores);
          await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newComparisonStores));
          return true;
        }
        return false;
      } else {
        // For now, just add locally and sync later
        // TODO: Implement adding to existing comparison via backend
        const newComparisonStores = [...comparisonStores, store];
        setComparisonStores(newComparisonStores);
        await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newComparisonStores));
        return true;
      }
    } catch (error) {
      // Fallback to local storage only
      const newComparisonStores = [...comparisonStores, store];
      setComparisonStores(newComparisonStores);
      await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newComparisonStores));
      return true;
    }
  }, [comparisonStores]);

  const removeFromComparison = useCallback(async (storeId: string): Promise<void> => {
    const newComparisonStores = comparisonStores.filter(store => store._id !== storeId);
    setComparisonStores(newComparisonStores);
    
    // Save to storage
    try {
      await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(newComparisonStores));
    } catch (_error) {
      // silently handle
    }
  }, [comparisonStores]);

  const clearComparison = useCallback(async (): Promise<void> => {
    try {
      // Try to clear from backend if we have a comparison ID
      // For now, just clear locally
      await storeSearchService.clearAllComparisons();
    } catch (_error) {
      // silently handle
    }

    setComparisonStores([]);
    
    // Clear from local storage
    try {
      await AsyncStorage.removeItem(COMPARISON_STORAGE_KEY);
    } catch (_error) {
      // silently handle
    }
  }, []);

  const isInComparison = useCallback((storeId: string): boolean => {
    return comparisonStores.some(store => store._id === storeId);
  }, [comparisonStores]);

  const canAddToComparison = useCallback((store: Store): boolean => {
    // Check if store is already in comparison
    if (isInComparison(store._id)) {
      return false;
    }

    // Check if we've reached the maximum limit
    if (comparisonStores.length >= MAX_COMPARISON_STORES) {
      return false;
    }

    return true;
  }, [comparisonStores, isInComparison]);

  const loadComparisonFromStorage = useCallback(async (): Promise<void> => {
    try {
      // Try to load from backend first
      const response = await storeSearchService.getUserComparisons();
      if (response.success && response.data.comparisons.length > 0) {
        // Use the most recent comparison
        const latestComparison = response.data.comparisons[0];
        setComparisonStores(latestComparison.stores);
        await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(latestComparison.stores));
        return;
      }
    } catch (_error) {
      // silently handle
    }

    // Fallback to local storage
    try {
      const storedComparison = await AsyncStorage.getItem(COMPARISON_STORAGE_KEY);
      if (storedComparison) {
        const parsedStores = JSON.parse(storedComparison);
        setComparisonStores(parsedStores);
      }
    } catch (_error) {
      // silently handle
    }
  }, []);

  const saveComparisonToStorage = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(comparisonStores));
    } catch (_error) {
      // silently handle
    }
  }, [comparisonStores]);

  // Load comparison on mount
  useEffect(() => {
    loadComparisonFromStorage();
  }, [loadComparisonFromStorage]);

  return {
    comparisonStores,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    canAddToComparison,
    loadComparisonFromStorage,
    saveComparisonToStorage,
  };
};

export default useStoreComparison;
