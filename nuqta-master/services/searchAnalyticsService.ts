import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SearchEvent {
  id: string;
  type: 'search' | 'result_click' | 'category_click' | 'filter_applied' | 'sort_applied';
  timestamp: number;
  query?: string;
  resultId?: string;
  resultType?: 'product' | 'store';
  categoryId?: string;
  categoryName?: string;
  filters?: any;
  sortBy?: string;
  position?: number;
  metadata?: Record<string, any>;
}

export interface SearchAnalytics {
  totalSearches: number;
  totalClicks: number;
  popularQueries: Array<{ query: string; count: number }>;
  clickThroughRate: number;
  averagePosition: number;
  noResultsQueries: string[];
}

class SearchAnalyticsService {
  private readonly EVENTS_KEY = '@search_events';
  private readonly MAX_EVENTS = 1000;
  private readonly ANALYTICS_KEY = '@search_analytics';

  /**
   * Track a search event
   */
  async trackSearch(query: string, resultsCount: number = 0): Promise<void> {
    const event: SearchEvent = {
      id: `search_${Date.now()}_${Math.random()}`,
      type: 'search',
      timestamp: Date.now(),
      query: query.trim(),
      metadata: {
        resultsCount,
        hasResults: resultsCount > 0,
      },
    };

    await this.saveEvent(event);

    // Track no-results queries separately
    if (resultsCount === 0) {
      await this.trackNoResultsQuery(query);
    }
  }

  /**
   * Track when a user clicks on a search result
   */
  async trackResultClick(
    query: string,
    resultId: string,
    resultType: 'product' | 'store',
    position: number
  ): Promise<void> {
    const event: SearchEvent = {
      id: `click_${Date.now()}_${Math.random()}`,
      type: 'result_click',
      timestamp: Date.now(),
      query: query.trim(),
      resultId,
      resultType,
      position,
    };

    await this.saveEvent(event);
  }

  /**
   * Track when a user clicks on a category
   */
  async trackCategoryClick(categoryId: string, categoryName: string): Promise<void> {
    const event: SearchEvent = {
      id: `category_${Date.now()}_${Math.random()}`,
      type: 'category_click',
      timestamp: Date.now(),
      categoryId,
      categoryName,
    };

    await this.saveEvent(event);
  }

  /**
   * Track when filters are applied
   */
  async trackFilterApplied(filters: any): Promise<void> {
    const event: SearchEvent = {
      id: `filter_${Date.now()}_${Math.random()}`,
      type: 'filter_applied',
      timestamp: Date.now(),
      filters,
    };

    await this.saveEvent(event);
  }

  /**
   * Track when sorting is applied
   */
  async trackSortApplied(sortBy: string): Promise<void> {
    const event: SearchEvent = {
      id: `sort_${Date.now()}_${Math.random()}`,
      type: 'sort_applied',
      timestamp: Date.now(),
      sortBy,
    };

    await this.saveEvent(event);
  }

  /**
   * Save an event to storage
   */
  private async saveEvent(event: SearchEvent): Promise<void> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.EVENTS_KEY);
      const events: SearchEvent[] = eventsJson ? JSON.parse(eventsJson) : [];
      
      events.push(event);

      // Keep only the most recent events
      if (events.length > this.MAX_EVENTS) {
        events.shift();
      }

      await AsyncStorage.setItem(this.EVENTS_KEY, JSON.stringify(events));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Track queries that return no results
   */
  private async trackNoResultsQuery(query: string): Promise<void> {
    try {
      const key = '@search_no_results';
      const dataJson = await AsyncStorage.getItem(key);
      const queries: string[] = dataJson ? JSON.parse(dataJson) : [];
      
      if (!queries.includes(query.toLowerCase())) {
        queries.push(query.toLowerCase());
        
        // Keep only the last 50 no-results queries
        if (queries.length > 50) {
          queries.shift();
        }
        
        await AsyncStorage.setItem(key, JSON.stringify(queries));
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(days: number = 7): Promise<SearchAnalytics> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.EVENTS_KEY);
      const events: SearchEvent[] = eventsJson ? JSON.parse(eventsJson) : [];
      
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      const recentEvents = events.filter(e => e.timestamp >= cutoffTime);

      const searches = recentEvents.filter(e => e.type === 'search');
      const clicks = recentEvents.filter(e => e.type === 'result_click');

      // Calculate popular queries
      const queryCounts: Record<string, number> = {};
      searches.forEach(event => {
        if (event.query) {
          const query = event.query.toLowerCase();
          queryCounts[query] = (queryCounts[query] || 0) + 1;
        }
      });

      const popularQueries = Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate click-through rate
      const totalSearches = searches.length;
      const totalClicks = clicks.length;
      const clickThroughRate = totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0;

      // Calculate average click position
      const positions = clicks.map(c => c.position || 0).filter(p => p > 0);
      const averagePosition = positions.length > 0 
        ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length 
        : 0;

      // Get no-results queries
      const noResultsJson = await AsyncStorage.getItem('@search_no_results');
      const noResultsQueries: string[] = noResultsJson ? JSON.parse(noResultsJson) : [];

      return {
        totalSearches,
        totalClicks,
        popularQueries,
        clickThroughRate,
        averagePosition,
        noResultsQueries: noResultsQueries.slice(-10), // Last 10
      };
    } catch (error) {
      return {
        totalSearches: 0,
        totalClicks: 0,
        popularQueries: [],
        clickThroughRate: 0,
        averagePosition: 0,
        noResultsQueries: [],
      };
    }
  }

  /**
   * Clear all analytics data
   */
  async clearAnalytics(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.EVENTS_KEY,
        '@search_no_results',
        this.ANALYTICS_KEY,
      ]);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Export analytics data for reporting
   */
  async exportAnalytics(): Promise<string> {
    try {
      const analytics = await this.getAnalytics(30); // Last 30 days
      return JSON.stringify(analytics, null, 2);
    } catch (error) {
      return '{}';
    }
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();
export default searchAnalyticsService;

