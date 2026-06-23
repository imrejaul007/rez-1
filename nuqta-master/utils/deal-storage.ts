import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deal } from '@/types/deals';

export interface StoredDealData {
  selectedDeals: string[];
  lastUpdated: string;
  userPreferences: {
    favoriteCategories: string[];
    defaultSortOption: string;
    defaultFilterOption: string;
  };
  dealHistory: {
    dealId: string;
    action: 'ADDED' | 'REMOVED' | 'VIEWED' | 'SHARED';
    timestamp: string;
  }[];
}

class DealStorage {
  private readonly STORAGE_KEY = '@rez_app_deals';
  private readonly MAX_HISTORY_ITEMS = 100;

  /**
   * Save selected deals to storage
   */
  async saveSelectedDeals(dealIds: string[]): Promise<void> {
    try {
      const existingData = await this.getStoredData();
      const updatedData: StoredDealData = {
        ...existingData,
        selectedDeals: dealIds,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get selected deals from storage
   */
  async getSelectedDeals(): Promise<string[]> {
    try {
      const data = await this.getStoredData();
      return data.selectedDeals;
    } catch (error) {
      return [];
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(preferences: Partial<StoredDealData['userPreferences']>): Promise<void> {
    try {
      const existingData = await this.getStoredData();
      const updatedData: StoredDealData = {
        ...existingData,
        userPreferences: {
          ...existingData.userPreferences,
          ...preferences,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get user preferences from storage
   */
  async getUserPreferences(): Promise<StoredDealData['userPreferences']> {
    try {
      const data = await this.getStoredData();
      return data.userPreferences;
    } catch (error) {
      return {
        favoriteCategories: [],
        defaultSortOption: 'priority',
        defaultFilterOption: 'all',
      };
    }
  }

  /**
   * Add deal action to history
   */
  async addDealHistory(dealId: string, action: StoredDealData['dealHistory'][0]['action']): Promise<void> {
    try {
      const existingData = await this.getStoredData();
      const newHistoryItem = {
        dealId,
        action,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [newHistoryItem, ...existingData.dealHistory]
        .slice(0, this.MAX_HISTORY_ITEMS);

      const updatedData: StoredDealData = {
        ...existingData,
        dealHistory: updatedHistory,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get deal history from storage
   */
  async getDealHistory(): Promise<StoredDealData['dealHistory']> {
    try {
      const data = await this.getStoredData();
      return data.dealHistory;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get recently viewed deals
   */
  async getRecentlyViewedDeals(): Promise<string[]> {
    try {
      const history = await this.getDealHistory();
      const viewedDeals = history
        .filter(item => item.action === 'VIEWED')
        .map(item => item.dealId)
        .slice(0, 10);
      
      // Remove duplicates while preserving order
      return [...new Set(viewedDeals)];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get frequently added deals
   */
  async getFrequentlyAddedDeals(): Promise<string[]> {
    try {
      const history = await this.getDealHistory();
      const addedDeals = history
        .filter(item => item.action === 'ADDED')
        .reduce((acc, item) => {
          acc[item.dealId] = (acc[item.dealId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      return Object.entries(addedDeals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([dealId]) => dealId);
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get all stored data
   */
  private async getStoredData(): Promise<StoredDealData> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return this.getDefaultData();
    } catch (error) {
      return this.getDefaultData();
    }
  }

  /**
   * Get default data structure
   */
  private getDefaultData(): StoredDealData {
    return {
      selectedDeals: [],
      lastUpdated: new Date().toISOString(),
      userPreferences: {
        favoriteCategories: [],
        defaultSortOption: 'priority',
        defaultFilterOption: 'all',
      },
      dealHistory: [],
    };
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<string> {
    try {
      const data = await this.getStoredData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return '{}';
    }
  }

  /**
   * Import data from backup
   */
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData) as StoredDealData;
      
      // Validate data structure
      if (this.validateDataStructure(data)) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate data structure before importing
   */
  private validateDataStructure(data: any): data is StoredDealData {
    return (
      data &&
      Array.isArray(data.selectedDeals) &&
      typeof data.lastUpdated === 'string' &&
      data.userPreferences &&
      Array.isArray(data.userPreferences.favoriteCategories) &&
      Array.isArray(data.dealHistory)
    );
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{
    size: number;
    lastUpdated: string;
    itemCount: number;
  }> {
    try {
      const data = await this.getStoredData();
      const jsonString = JSON.stringify(data);
      
      return {
        size: new Blob([jsonString]).size,
        lastUpdated: data.lastUpdated,
        itemCount: data.selectedDeals.length + data.dealHistory.length,
      };
    } catch (error) {
      return {
        size: 0,
        lastUpdated: new Date().toISOString(),
        itemCount: 0,
      };
    }
  }
}

// Singleton instance
export const dealStorage = new DealStorage();

// React hook for deal storage
export const useDealStorage = () => {
  return {
    saveSelectedDeals: dealStorage.saveSelectedDeals.bind(dealStorage),
    getSelectedDeals: dealStorage.getSelectedDeals.bind(dealStorage),
    saveUserPreferences: dealStorage.saveUserPreferences.bind(dealStorage),
    getUserPreferences: dealStorage.getUserPreferences.bind(dealStorage),
    addDealHistory: dealStorage.addDealHistory.bind(dealStorage),
    getDealHistory: dealStorage.getDealHistory.bind(dealStorage),
    getRecentlyViewedDeals: dealStorage.getRecentlyViewedDeals.bind(dealStorage),
    getFrequentlyAddedDeals: dealStorage.getFrequentlyAddedDeals.bind(dealStorage),
    clearAllData: dealStorage.clearAllData.bind(dealStorage),
    exportData: dealStorage.exportData.bind(dealStorage),
    importData: dealStorage.importData.bind(dealStorage),
    getStorageInfo: dealStorage.getStorageInfo.bind(dealStorage),
  };
};
