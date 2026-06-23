/**
 * useProductFilters Hook
 *
 * Custom hook for managing product filter state
 * Provides clean interface for category, price, sort, and search filtering
 *
 * @module hooks/useProductFilters
 */

import { useState, useCallback } from 'react';

export interface FilterState {
  category: string | null;
  priceRange: { min: number; max: number } | null;
  sortBy: 'price_low' | 'price_high' | 'rating' | 'newest' | null;
  searchQuery: string;
}

export interface UseProductFiltersResult {
  filters: FilterState;
  setCategory: (category: string | null) => void;
  setPriceRange: (range: { min: number; max: number } | null) => void;
  setSortBy: (sortBy: FilterState['sortBy']) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
}

/**
 * Hook for managing product filter state
 *
 * @returns Object containing filter state and setter functions
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setCategory,
 *   setPriceRange,
 *   setSortBy,
 *   setSearchQuery,
 *   clearFilters,
 *   hasActiveFilters
 * } = useProductFilters();
 *
 * // Set individual filters
 * setCategory('electronics');
 * setPriceRange({ min: 100, max: 500 });
 * setSortBy('price_low');
 * setSearchQuery('laptop');
 *
 * // Check if any filters are active
 * if (hasActiveFilters()) {
 * }
 *
 * // Clear all filters
 * clearFilters();
 * ```
 */
export function useProductFilters(): UseProductFiltersResult {
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    priceRange: null,
    sortBy: null,
    searchQuery: '',
  });

  /**
   * Set category filter
   */
  const setCategory = useCallback((category: string | null) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  /**
   * Set price range filter
   */
  const setPriceRange = useCallback((range: { min: number; max: number } | null) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
  }, []);

  /**
   * Set sort order
   */
  const setSortBy = useCallback((sortBy: FilterState['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  /**
   * Set search query
   */
  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      category: null,
      priceRange: null,
      sortBy: null,
      searchQuery: '',
    });
  }, []);

  /**
   * Check if any filters are currently active
   */
  const hasActiveFilters = useCallback(() => {
    return !!(
      filters.category ||
      filters.priceRange ||
      filters.sortBy ||
      filters.searchQuery
    );
  }, [filters]);

  return {
    filters,
    setCategory,
    setPriceRange,
    setSortBy,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  };
}
