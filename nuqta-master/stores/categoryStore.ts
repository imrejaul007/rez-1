import { create } from 'zustand';
import {
  CategoryState,
  CategoryContextType,
  Category,
  CategoryItem,
} from '@/types/category.types';

const initialState: CategoryState = {
  currentCategory: null,
  categories: [],
  filters: {},
  searchQuery: '',
  sortBy: 'featured',
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
};

interface CategoryStoreState extends CategoryContextType {}

export const useCategoryStore = create<CategoryStoreState>((set, get) => ({
  state: initialState,

  actions: {
    loadCategory: async (_slug: string) => {
      // Stub — the real implementation lives in CategoryProvider which uses
      // dynamic imports and multiple API calls. The store fallback only
      // prevents crashes when used outside the provider.
      set((s) => ({
        state: { ...s.state, loading: true, error: null },
      }));
    },

    loadCategories: async () => {
      set((s) => ({
        state: { ...s.state, loading: true, error: null },
      }));
    },

    updateFilters: (filters: Record<string, any>) => {
      set((s) => ({
        state: {
          ...s.state,
          filters: { ...s.state.filters, ...filters },
          pagination: { ...initialState.pagination },
        },
      }));
    },

    updateSearch: (query: string) => {
      set((s) => ({
        state: {
          ...s.state,
          searchQuery: query,
          pagination: { ...initialState.pagination },
        },
      }));
    },

    updateSort: (sortBy: string) => {
      set((s) => ({
        state: {
          ...s.state,
          sortBy,
          pagination: { ...initialState.pagination },
        },
      }));
    },

    loadMore: async () => {
      // Stub — real pagination logic is in the provider
    },

    resetFilters: () => {
      set((s) => ({
        state: {
          ...s.state,
          filters: {},
          searchQuery: '',
          sortBy: 'featured',
          pagination: { ...initialState.pagination },
        },
      }));
    },

    addToCart: async (_item: CategoryItem) => {
      // Handled by CartContext in the component
    },

    toggleFavorite: async (_item: CategoryItem) => {
      // Stub
    },
  },
}));
