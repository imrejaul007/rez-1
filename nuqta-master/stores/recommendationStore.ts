import { create } from 'zustand';

const MAX_SHOWN_ITEMS = 500;

function capSet(set: Set<string>, maxSize: number): Set<string> {
  if (set.size <= maxSize) return set;
  const arr = Array.from(set);
  return new Set(arr.slice(arr.length - maxSize));
}

interface RecommendationStoreState {
  shownProducts: Set<string>;
  shownStores: Set<string>;

  addShownProduct: (productId: string) => void;
  addShownProducts: (productIds: string[]) => void;
  addShownStore: (storeId: string) => void;
  addShownStores: (storeIds: string[]) => void;

  isProductShown: (productId: string) => boolean;
  isStoreShown: (storeId: string) => boolean;

  getShownProducts: () => string[];
  getShownStores: () => string[];

  clearShownProducts: () => void;
  clearShownStores: () => void;
  clearAll: () => void;
}

export const useRecommendationStore = create<RecommendationStoreState>((set, get) => ({
  shownProducts: new Set<string>(),
  shownStores: new Set<string>(),

  addShownProduct: (productId: string) => {
    if (!productId) return;
    set((s) => ({
      shownProducts: capSet(new Set(s.shownProducts).add(productId), MAX_SHOWN_ITEMS),
    }));
  },

  addShownProducts: (productIds: string[]) => {
    if (!productIds || productIds.length === 0) return;
    set((s) => {
      const newSet = new Set(s.shownProducts);
      productIds.forEach((id) => id && newSet.add(id));
      return { shownProducts: capSet(newSet, MAX_SHOWN_ITEMS) };
    });
  },

  addShownStore: (storeId: string) => {
    if (!storeId) return;
    set((s) => ({
      shownStores: capSet(new Set(s.shownStores).add(storeId), MAX_SHOWN_ITEMS),
    }));
  },

  addShownStores: (storeIds: string[]) => {
    if (!storeIds || storeIds.length === 0) return;
    set((s) => {
      const newSet = new Set(s.shownStores);
      storeIds.forEach((id) => id && newSet.add(id));
      return { shownStores: capSet(newSet, MAX_SHOWN_ITEMS) };
    });
  },

  isProductShown: (productId: string): boolean => {
    return get().shownProducts.has(productId);
  },

  isStoreShown: (storeId: string): boolean => {
    return get().shownStores.has(storeId);
  },

  getShownProducts: (): string[] => {
    return Array.from(get().shownProducts);
  },

  getShownStores: (): string[] => {
    return Array.from(get().shownStores);
  },

  clearShownProducts: () => {
    set({ shownProducts: new Set<string>() });
  },

  clearShownStores: () => {
    set({ shownStores: new Set<string>() });
  },

  clearAll: () => {
    set({
      shownProducts: new Set<string>(),
      shownStores: new Set<string>(),
    });
  },
}));
