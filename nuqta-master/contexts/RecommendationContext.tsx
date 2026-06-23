import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

/**
 * RecommendationContext - Tracks shown products/stores across recommendation sections
 * Implements Amazon/Flipkart style deduplication to prevent showing same items
 * everywhere in the app
 */

interface RecommendationContextType {
  // Track shown products and stores
  shownProducts: Set<string>;
  shownStores: Set<string>;

  // Add items to tracking
  addShownProduct: (productId: string) => void;
  addShownProducts: (productIds: string[]) => void;
  addShownStore: (storeId: string) => void;
  addShownStores: (storeIds: string[]) => void;

  // Check if already shown
  isProductShown: (productId: string) => boolean;
  isStoreShown: (storeId: string) => boolean;

  // Get lists for filtering
  getShownProducts: () => string[];
  getShownStores: () => string[];

  // Reset tracking (new page/session)
  clearShownProducts: () => void;
  clearShownStores: () => void;
  clearAll: () => void;
}

const RecommendationContext = createContext<RecommendationContextType | undefined>(undefined);

interface RecommendationProviderProps {
  children: ReactNode;
}

const MAX_SHOWN_ITEMS = 500;

function capSet(set: Set<string>, maxSize: number): Set<string> {
  if (set.size <= maxSize) return set;
  const arr = Array.from(set);
  return new Set(arr.slice(arr.length - maxSize));
}

export function RecommendationProvider({ children }: RecommendationProviderProps) {
  const [shownProducts, setShownProducts] = useState<Set<string>>(new Set());
  const [shownStores, setShownStores] = useState<Set<string>>(new Set());

  // Add single product
  const addShownProduct = useCallback((productId: string) => {
    if (!productId) return;
    setShownProducts(prev => capSet(new Set(prev).add(productId), MAX_SHOWN_ITEMS));
  }, []);

  // Add multiple products
  const addShownProducts = useCallback((productIds: string[]) => {
    if (!productIds || productIds.length === 0) return;
    setShownProducts(prev => {
      const newSet = new Set(prev);
      productIds.forEach(id => id && newSet.add(id));
      return capSet(newSet, MAX_SHOWN_ITEMS);
    });
  }, []);

  // Add single store
  const addShownStore = useCallback((storeId: string) => {
    if (!storeId) return;
    setShownStores(prev => capSet(new Set(prev).add(storeId), MAX_SHOWN_ITEMS));
  }, []);

  // Add multiple stores
  const addShownStores = useCallback((storeIds: string[]) => {
    if (!storeIds || storeIds.length === 0) return;
    setShownStores(prev => {
      const newSet = new Set(prev);
      storeIds.forEach(id => id && newSet.add(id));
      return capSet(newSet, MAX_SHOWN_ITEMS);
    });
  }, []);

  // Check if product already shown
  const isProductShown = useCallback((productId: string): boolean => {
    return shownProducts.has(productId);
  }, [shownProducts]);

  // Check if store already shown
  const isStoreShown = useCallback((storeId: string): boolean => {
    return shownStores.has(storeId);
  }, [shownStores]);

  // Get array of shown products
  const getShownProducts = useCallback((): string[] => {
    return Array.from(shownProducts);
  }, [shownProducts]);

  // Get array of shown stores
  const getShownStores = useCallback((): string[] => {
    return Array.from(shownStores);
  }, [shownStores]);

  // Clear products
  const clearShownProducts = useCallback(() => {
    setShownProducts(new Set());
  }, []);

  // Clear stores
  const clearShownStores = useCallback(() => {
    setShownStores(new Set());
  }, []);

  // Clear all tracking
  const clearAll = useCallback(() => {
    setShownProducts(new Set());
    setShownStores(new Set());
  }, []);

  const value: RecommendationContextType = useMemo(() => ({
    shownProducts,
    shownStores,
    addShownProduct,
    addShownProducts,
    addShownStore,
    addShownStores,
    isProductShown,
    isStoreShown,
    getShownProducts,
    getShownStores,
    clearShownProducts,
    clearShownStores,
    clearAll,
  }), [shownProducts, shownStores, addShownProduct, addShownProducts, addShownStore, addShownStores, isProductShown, isStoreShown, getShownProducts, getShownStores, clearShownProducts, clearShownStores, clearAll]);

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}

/**
 * Hook to access recommendation tracking
 * Usage:
 *
 * const { addShownProducts, getShownProducts } = useRecommendationTracking();
 *
 * // After fetching products:
 * addShownProducts(products.map(p => p.id));
 *
 * // Before fetching new products:
 * const excludeIds = getShownProducts();
 * fetchProducts({ excludeIds });
 */
export function useRecommendationTracking() {
  const context = useContext(RecommendationContext);
  const store = __useRecommendationStore();
  if (context) return context;
  return store as unknown as RecommendationContextType;
}

// Lazy import to avoid circular deps
let __useRecommendationStore: () => any;
try {
  const { useRecommendationStore } = require('@/stores/recommendationStore');
  __useRecommendationStore = useRecommendationStore;
} catch {
  __useRecommendationStore = () => ({
    shownProducts: new Set<string>(),
    shownStores: new Set<string>(),
    addShownProduct: () => {},
    addShownProducts: () => {},
    addShownStore: () => {},
    addShownStores: () => {},
    isProductShown: () => false,
    isStoreShown: () => false,
    getShownProducts: () => [],
    getShownStores: () => [],
    clearShownProducts: () => {},
    clearShownStores: () => {},
    clearAll: () => {},
  });
}

export default RecommendationContext;
