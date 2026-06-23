// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/utils/apiClient';

// Types
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  pagination?: SearchPagination;
}

export interface SearchFilters {
  category?: string[];
  priceRange?: { min: number; max: number };
  location?: { latitude: number; longitude: number; radius: number };
  availability?: boolean;
  rating?: number;
  discount?: number;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
}

export interface SearchSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  took: number; // Search time in milliseconds
  suggestions?: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'category' | 'product' | 'store';
  count?: number;
  highlighted?: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  filters?: SearchFilters;
}

export interface PopularSearch {
  query: string;
  count: number;
  trending: boolean;
}

// Search types
export type SearchType = 'products' | 'stores' | 'offers' | 'all';

// Storage keys
const STORAGE_KEYS = {
  SEARCH_HISTORY: 'search_history',
  SEARCH_PREFERENCES: 'search_preferences',
  POPULAR_SEARCHES: 'popular_searches',
  SEARCH_CACHE: 'search_cache',
};

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 100,
};

class SearchService {
  private searchHistory: SearchHistory[] = [];
  private popularSearches: PopularSearch[] = [];
  private searchCache: Map<string, { result: SearchResult; timestamp: number }> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;

  // Initialize search service
  async initialize(): Promise<void> {
    try {
      await this.loadSearchHistory();
      await this.loadPopularSearches();
    } catch (_error) {
      // silently handle
    }
  }

  // Perform search with caching and debouncing
  async search<T>(
    type: SearchType,
    query: SearchQuery,
    useCache: boolean = true
  ): Promise<SearchResult<T>> {
    try {
      const cacheKey = this.generateCacheKey(type, query);
      
      // Check cache first
      if (useCache && this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey)!;
        const isExpired = Date.now() - cached.timestamp > CACHE_CONFIG.TTL;
        
        if (!isExpired) {
          return cached.result as SearchResult<T>;
        } else {
          this.searchCache.delete(cacheKey);
        }
      }

      const startTime = Date.now();

      // Make API call
      const response = await apiClient.post<SearchResult<T>>(`/search/${type}`, {
        query: query.query,
        filters: query.filters,
        sort: query.sort,
        pagination: query.pagination,
      });

      const result: SearchResult<T> = {
        ...response.data,
        took: Date.now() - startTime,
      };

      // Cache the result
      if (useCache) {
        this.cacheResult(cacheKey, result);
      }

      // Save to history if it's a user query
      if (query.query.trim()) {
        await this.addToHistory({
          id: this.generateHistoryId(),
          query: query.query,
          timestamp: Date.now(),
          resultCount: result.total,
          filters: query.filters,
        });
      }

      return result;
    } catch (error) {
      throw new Error('Search failed. Please try again.');
    }
  }

  // Debounced search for real-time suggestions
  searchDebounced<T>(
    type: SearchType,
    query: SearchQuery,
    callback: (result: SearchResult<T>) => void,
    delay: number = 300
  ): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const result = await this.search<T>(type, query);
        callback(result);
      } catch (_error) {
        // silently handle
      }
    }, delay) as any;
  }

  // Get search suggestions
  async getSuggestions(
    query: string,
    type?: SearchType,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    try {
      if (!query.trim()) {
        return this.getPopularSuggestions(limit);
      }

      const response = await apiClient.get<SearchSuggestion[]>('/search/suggestions', {
        q: query,
        type,
        limit,
      });

      return response.data;
    } catch (error) {
      
      // Fallback to local suggestions
      return this.getLocalSuggestions(query, limit);
    }
  }

  // Get autocomplete suggestions
  async getAutocomplete(query: string, limit: number = 5): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>('/search/autocomplete', {
        q: query,
        limit,
      });

      return response.data;
    } catch (error) {
      return [];
    }
  }

  // Search by image (if supported)
  async searchByImage(imageUri: string): Promise<SearchResult> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'search_image.jpg',
      } as any);

      const response = await apiClient.upload<SearchResult>(
        '/search/image',
        formData
      );
      return response.data;
    } catch (error) {
      throw new Error('Image search failed. Please try again.');
    }
  }

  // Voice search (not yet available — returns empty result gracefully)
  async searchByVoice(_audioUri: string): Promise<SearchResult> {
    return {
      results: [],
      total: 0,
      message: 'Voice search will be available soon. Please type your search.',
    };
  }

  // Search history management
  async getSearchHistory(limit?: number): Promise<SearchHistory[]> {
    const history = limit ? this.searchHistory.slice(0, limit) : this.searchHistory;
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  async addToHistory(entry: SearchHistory): Promise<void> {
    // Remove duplicate queries
    this.searchHistory = this.searchHistory.filter(
      item => item.query.toLowerCase() !== entry.query.toLowerCase()
    );
    // Add new entry at the beginning
    this.searchHistory.unshift(entry);

    // Limit history size
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(0, 50);
    }

    await this.saveSearchHistory();
  }

  async removeFromHistory(id: string): Promise<void> {
    this.searchHistory = this.searchHistory.filter(item => item.id !== id);
    await this.saveSearchHistory();
  }

  async clearSearchHistory(): Promise<void> {
    this.searchHistory = [];
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  }

  // Popular searches
  async getPopularSearches(limit: number = 10): Promise<PopularSearch[]> {
    return this.popularSearches.slice(0, limit);
  }

  async getTrendingSearches(limit: number = 5): Promise<PopularSearch[]> {
    return this.popularSearches
      .filter(search => search.trending)
      .slice(0, limit);
  }

  // Filters and sorting
  createFilters(options: Partial<SearchFilters>): SearchFilters {
    return {
      category: options.category || [],
      priceRange: options.priceRange,
      location: options.location,
      availability: options.availability,
      rating: options.rating,
      discount: options.discount,
      tags: options.tags || [],
      dateRange: options.dateRange,
    };
  }

  createSort(field: string, direction: 'asc' | 'desc' = 'asc'): SearchSort {
    return { field, direction };
  }

  createPagination(page: number = 1, limit: number = 20): SearchPagination {
    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  // Cache management
  clearCache(): void {
    this.searchCache.clear();
  }

  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.searchCache.size,
      entries: this.searchCache.size,
    };
  }

  // Private methods
  private generateCacheKey(type: SearchType, query: SearchQuery): string {
    const key = {
      type,
      query: query.query,
      filters: query.filters,
      sort: query.sort,
      pagination: query.pagination,
    };
    return btoa(JSON.stringify(key));
  }

  private generateHistoryId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cacheResult(key: string, result: SearchResult): void {
    // Clean old entries if cache is full
    if (this.searchCache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      const oldestKey = Array.from(this.searchCache.keys())[0];
      this.searchCache.delete(oldestKey);
    }

    this.searchCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  private getPopularSuggestions(limit: number): SearchSuggestion[] {
    return this.popularSearches.slice(0, limit).map(search => ({
      text: search.query,
      type: 'query' as const,
      count: search.count,
    }));
  }

  private getLocalSuggestions(query: string, limit: number): SearchSuggestion[] {
    const lowerQuery = query.toLowerCase();
    
    // Search in history
    const historySuggestions = this.searchHistory
      .filter(item => item.query.toLowerCase().includes(lowerQuery))
      .slice(0, limit)
      .map(item => ({
        text: item.query,
        type: 'query' as const,
        highlighted: this.highlightQuery(item.query, query),
      }));

    return historySuggestions;
  }

  private highlightQuery(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private async loadSearchHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (_error) {
      // silently handle
    }
  }

  private async saveSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(this.searchHistory)
      );
    } catch (_error) {
      // silently handle
    }
  }

  private async loadPopularSearches(): Promise<void> {
    try {
      // Try to load from API first
      const response = await apiClient.get<PopularSearch[]>('/search/popular');
      this.popularSearches = response.data;
    } catch (error) {
      
      // Fallback to stored data
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.POPULAR_SEARCHES);
        if (stored) {
          this.popularSearches = JSON.parse(stored);
        }
      } catch (_storageError) {
        // silently handle
      }
    }
  }
}

// Create and export singleton instance
export const searchService = new SearchService();

// Utility functions
export const SearchUtils = {
  // Highlight search terms in text
  highlightTerms: (text: string, terms: string[]): string => {
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
  },

  // Extract search terms from query
  extractTerms: (query: string): string[] => {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter((term, index, array) => array.indexOf(term) === index);
  },

  // Build query string for URL
  buildQueryString: (query: SearchQuery): string => {
    const params = new URLSearchParams();
    
    if (query.query) params.append('q', query.query);
    if (query.filters?.category?.length) {
      params.append('category', query.filters.category.join(','));
    }
    if (query.filters?.priceRange) {
      params.append('min_price', query.filters.priceRange.min.toString());
      params.append('max_price', query.filters.priceRange.max.toString());
    }
    if (query.sort) {
      params.append('sort', `${query.sort.field}:${query.sort.direction}`);
    }
    if (query.pagination) {
      params.append('page', query.pagination.page.toString());
      params.append('limit', query.pagination.limit.toString());
    }

    return params.toString();
  },

  // Parse query string to SearchQuery
  parseQueryString: (queryString: string): Partial<SearchQuery> => {
    const params = new URLSearchParams(queryString);
    const query: Partial<SearchQuery> = {};

    const q = params.get('q');
    if (q) query.query = q;

    const category = params.get('category');
    if (category) {
      query.filters = { ...query.filters, category: category.split(',') };
    }

    const minPrice = params.get('min_price');
    const maxPrice = params.get('max_price');
    if (minPrice && maxPrice) {
      query.filters = {
        ...query.filters,
        priceRange: { min: parseInt(minPrice), max: parseInt(maxPrice) },
      };
    }

    const sort = params.get('sort');
    if (sort) {
      const [field, direction] = sort.split(':');
      query.sort = { field, direction: direction as 'asc' | 'desc' };
    }

    const page = params.get('page');
    const limit = params.get('limit');
    if (page && limit) {
      query.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
      };
    }

    return query;
  },

  // Validate search query
  validateQuery: (query: string): { valid: boolean; error?: string } => {
    if (!query.trim()) {
      return { valid: false, error: 'Search query cannot be empty' };
    }
    
    if (query.length < 2) {
      return { valid: false, error: 'Search query must be at least 2 characters' };
    }
    
    if (query.length > 100) {
      return { valid: false, error: 'Search query cannot exceed 100 characters' };
    }
    
    return { valid: true };
  },
};

export default searchService;
