/**
 * useEventsPage Hook
 * Custom hook for managing Events List Page state and logic
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import eventsApiService, { EventFilters, EventSearchResult } from '@/services/eventsApi';
import { EventItem } from '@/types/homepage.types';

// Sort options
export type EventSortOption = 'date_asc' | 'date_desc' | 'price_asc' | 'price_desc' | 'popularity';

// Hook options
export interface UseEventsPageOptions {
  initialCategory?: string;
  autoFetch?: boolean;
  pageSize?: number;
}

// Hook return type
export interface UseEventsPageReturn {
  // State
  events: EventItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  totalEvents: number;

  // Search & Filters
  searchQuery: string;
  filters: EventFilters;
  sortBy: EventSortOption;
  activeCategory: string;

  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: EventFilters) => void;
  setSortBy: (sortBy: EventSortOption) => void;
  setActiveCategory: (category: string) => void;
  clearFilters: () => void;

  // Data Operations
  fetchEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  loadMoreEvents: () => Promise<void>;

  // Utilities
  clearError: () => void;
  getActiveFiltersCount: () => number;
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function useEventsPage(options: UseEventsPageOptions = {}): UseEventsPageReturn {
  const {
    initialCategory = 'all',
    autoFetch = true,
    pageSize = 20,
  } = options;

  // State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');
  const [filters, setFiltersState] = useState<EventFilters>({
    todayAndFuture: true, // Default: only show upcoming events
  });
  const [sortBy, setSortByState] = useState<EventSortOption>('date_asc');
  const [activeCategory, setActiveCategoryState] = useState(initialCategory);
  const [pagination, setPagination] = useState({
    offset: 0,
    total: 0,
    hasMore: true,
  });

  // Refs for tracking
  const isInitialMount = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build filters with category
  const buildFilters = useCallback((): EventFilters => {
    const combinedFilters: EventFilters = { ...filters };

    // Add category filter if not 'all'
    if (activeCategory && activeCategory !== 'all') {
      combinedFilters.category = activeCategory;
    }

    // Add sort as upcoming filter
    if (sortBy === 'date_asc') {
      combinedFilters.upcoming = true;
    }

    return combinedFilters;
  }, [filters, activeCategory, sortBy]);

  // Fetch events
  const fetchEvents = useCallback(async (refresh = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const combinedFilters = buildFilters();

      let result: EventSearchResult;

      if (searchQuery.trim()) {
        // Search events
        result = await eventsApiService.searchEvents(
          searchQuery,
          combinedFilters,
          pageSize,
          0
        );
      } else {
        // Get all events with filters
        result = await eventsApiService.getEvents(
          combinedFilters,
          pageSize,
          0
        );
      }

      setEvents(result.events);
      setPagination({
        offset: pageSize,
        total: result.total,
        hasMore: result.hasMore,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, buildFilters, pageSize]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    await fetchEvents(true);
  }, [fetchEvents]);

  // Load more events
  const loadMoreEvents = useCallback(async () => {
    if (loading || refreshing || !pagination.hasMore) {
      return;
    }

    try {
      setLoading(true);

      const combinedFilters = buildFilters();

      let result: EventSearchResult;

      if (searchQuery.trim()) {
        result = await eventsApiService.searchEvents(
          searchQuery,
          combinedFilters,
          pageSize,
          pagination.offset
        );
      } else {
        result = await eventsApiService.getEvents(
          combinedFilters,
          pageSize,
          pagination.offset
        );
      }

      setEvents(prev => [...prev, ...result.events]);
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + pageSize,
        hasMore: result.hasMore,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more events');
    } finally {
      setLoading(false);
    }
  }, [loading, refreshing, pagination, searchQuery, buildFilters, pageSize]);

  // Debounced search
  const debouncedFetch = useMemo(
    () => debounce(() => fetchEvents(false), 300),
    [fetchEvents]
  );

  // Set search query with debounced fetch
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    debouncedFetch();
  }, [debouncedFetch]);

  // Set filters and refetch
  const setFilters = useCallback((newFilters: EventFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Set sort and refetch
  const setSortBy = useCallback((newSortBy: EventSortOption) => {
    setSortByState(newSortBy);
  }, []);

  // Set active category and refetch
  const setActiveCategory = useCallback((category: string) => {
    setActiveCategoryState(category);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({ todayAndFuture: true });
    setActiveCategoryState('all');
    setSortByState('date_asc');
    setSearchQueryState('');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get active filters count
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.location) count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.isOnline !== undefined) count++;
    if (filters.date) count++;
    if (activeCategory && activeCategory !== 'all') count++;
    return count;
  }, [filters, activeCategory]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && isInitialMount.current) {
      isInitialMount.current = false;
      fetchEvents(false);
    }
  }, [autoFetch, fetchEvents]);

  // Refetch when filters, sort, or category change
  useEffect(() => {
    if (!isInitialMount.current) {
      fetchEvents(false);
    }
  }, [filters, sortBy, activeCategory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    events,
    loading,
    refreshing,
    error,
    hasMore: pagination.hasMore,
    totalEvents: pagination.total,

    // Search & Filters
    searchQuery,
    filters,
    sortBy,
    activeCategory,

    // Actions
    setSearchQuery,
    setFilters,
    setSortBy,
    setActiveCategory,
    clearFilters,

    // Data Operations
    fetchEvents: () => fetchEvents(false),
    refreshEvents,
    loadMoreEvents,

    // Utilities
    clearError,
    getActiveFiltersCount,
  };
}

export default useEventsPage;
