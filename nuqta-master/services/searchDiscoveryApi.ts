import apiClient from './apiClient';

export interface TrendingSearch {
  _id: string;
  query: string;
  count: number;
  type?: string;
}

export interface StoreItem {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  rating: number;
  distance?: number;
  cashbackPercentage?: number;
  tags?: string[];
  location?: {
    address?: string;
    city?: string;
  };
}

export interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  cashbackPercentage?: number;
  store?: {
    _id: string;
    name: string;
  };
}

class SearchDiscoveryService {
  async getTrendingSearches(limit: number = 10, region?: string): Promise<TrendingSearch[]> {
    try {
      const params: Record<string, any> = { limit };
      if (region) {
        params.region = region;
      }
      const response = await apiClient.get('/search/history/popular', params);
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.searches || [];
        return data.map((item: any, index: number) => ({
          ...item,
          _id: item._id || `trending-${index}`,
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getPopularStores(limit: number = 10): Promise<StoreItem[]> {
    try {
      const response = await apiClient.get('/stores/featured', { limit });
      if (response.success && response.data) {
        const stores = Array.isArray(response.data) ? response.data : response.data.stores || [];
        return stores.map((store: any) => ({
          _id: store._id,
          name: store.name,
          slug: store.slug,
          logo: store.logo || '',
          description: store.description,
          rating: store.ratings?.average || store.rating || 0,
          distance: store.distance,
          cashbackPercentage: store.rewardRules?.baseCashbackPercent || store.cashbackPercentage,
          tags: store.tags,
          location: store.location,
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

const searchDiscoveryApi = new SearchDiscoveryService();
export default searchDiscoveryApi;
