// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import eventsApiService, { EventFilters } from '@/services/eventsApi';
import { EventItem } from '@/types/homepage.types';

export interface EventSearchState {
  events: EventItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  suggestions: string[];
  searchQuery: string;
  filters: EventFilters;
}

export interface UseEventSearchReturn {
  state: EventSearchState;
  actions: {
    searchEvents: (query: string) => Promise<void>;
    loadMoreEvents: () => Promise<void>;
    setFilters: (filters: EventFilters) => void;
    clearSearch: () => void;
    refreshEvents: () => Promise<void>;
  };
}

export function useEventSearch(): UseEventSearchReturn {
  const [state, setState] = useState<EventSearchState>({
    events: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0,
    suggestions: [],
    searchQuery: '',
    filters: {}
  });

  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchEvents = useCallback(async (query: string) => {
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        searchQuery: query
      }));
      setOffset(0);
      const result = await eventsApiService.searchEvents(query, state.filters, 20, 0);

      setState(prev => ({
        ...prev,
        events: result.events,
        total: result.total,
        hasMore: result.hasMore,
        suggestions: result.suggestions || [],
        loading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search events';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  }, [state.filters]);

  const loadMoreEvents = useCallback(async () => {
    if (isLoadingMore || !state.hasMore || state.loading) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const newOffset = offset + 20;
      let result;
      if (state.searchQuery.trim()) {
        result = await eventsApiService.searchEvents(state.searchQuery, state.filters, 20, newOffset);
      } else {
        result = await eventsApiService.getEvents(state.filters, 20, newOffset);
      }

      setState(prev => ({
        ...prev,
        events: [...prev.events, ...result.events],
        hasMore: result.hasMore,
        total: result.total
      }));

      setOffset(newOffset);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more events';
      
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, state.hasMore, state.loading, state.searchQuery, state.filters, offset]);

  const setFilters = useCallback((filters: EventFilters) => {
    setState(prev => ({
      ...prev,
      filters
    }));
    setOffset(0);
  }, []);

  const clearSearch = useCallback(() => {
    setState({
      events: [],
      loading: false,
      error: null,
      hasMore: false,
      total: 0,
      suggestions: [],
      searchQuery: '',
      filters: {}
    });
    setOffset(0);
  }, []);

  const refreshEvents = useCallback(async () => {
    if (state.searchQuery.trim()) {
      await searchEvents(state.searchQuery);
    } else {
      try {
        setState(prev => ({
          ...prev,
          loading: true,
          error: null
        }));
        setOffset(0);

        const result = await eventsApiService.getEvents(state.filters, 20, 0);

        setState(prev => ({
          ...prev,
          events: result.events,
          total: result.total,
          hasMore: result.hasMore,
          loading: false
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh events';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false
        }));
      }
    }
  }, [state.searchQuery, state.filters, searchEvents]);

  // Auto-search when filters change
  useEffect(() => {
    if (state.searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchEvents(state.searchQuery);
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [state.filters, searchEvents, state.searchQuery]);

  return {
    state,
    actions: {
      searchEvents,
      loadMoreEvents,
      setFilters,
      clearSearch,
      refreshEvents
    }
  };
}

