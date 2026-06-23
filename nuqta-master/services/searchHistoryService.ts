import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

class SearchHistoryService {
  /**
   * Get search history from AsyncStorage
   */
  async getHistory(): Promise<SearchHistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (data) {
        const history: SearchHistoryItem[] = JSON.parse(data);
        // Sort by timestamp, most recent first
        return history.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Save a search query to history
   */
  async saveSearch(query: string, resultCount: number): Promise<void> {
    try {
      const history = await this.getHistory();
      
      // Remove existing entry with same query (case-insensitive)
      const filtered = history.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );
      // Add new entry at the beginning
      const newHistory: SearchHistoryItem[] = [
        {
          id: Date.now().toString(),
          query,
          timestamp: new Date().toISOString(),
          resultCount,
        },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS); // Limit to max items

      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Remove a specific search from history
   */
  async removeSearch(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all search history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get recent searches (last N items)
   */
  async getRecentSearches(limit: number = 5): Promise<SearchHistoryItem[]> {
    try {
      const history = await this.getHistory();
      return history.slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  /**
   * Add a search to history (alias for saveSearch)
   */
  async addSearch(query: string, resultCount: number): Promise<void> {
    return this.saveSearch(query, resultCount);
  }
}

export const searchHistoryService = new SearchHistoryService();
export default searchHistoryService;

