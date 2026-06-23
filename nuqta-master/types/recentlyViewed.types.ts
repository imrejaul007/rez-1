/**
 * Types for Recently Viewed functionality
 * Supports both stores and products in a unified data structure
 */

export type RecentlyViewedItemType = 'store' | 'product';

/**
 * Unified interface for recently viewed items (both stores and products)
 * This is what gets stored in AsyncStorage and rendered in the UI
 */
export interface RecentlyViewedItem {
  id: string;                          // _id from backend
  type: RecentlyViewedItemType;        // 'store' or 'product'
  name: string;
  image: string;                       // banner/logo for stores, first image for products
  rating: {
    value: number;
    count: number;
  };
  address?: string;                    // For stores: "street, city"
  price?: {                            // For products only
    current: number;
    original?: number;
  };
  cashbackPercentage?: number;
  slug?: string;
  viewedAt: number;                    // Timestamp for sorting (Date.now())
}

/**
 * Input interface for tracking store views
 * Accepts the raw store data structure from the backend
 */
export interface RecentlyViewedStore {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string | string[];
  coverImage?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
  };
  ratings?: {
    average: number;
    count: number;
  };
  offers?: {
    cashback?: number;
  };
}

/**
 * Input interface for tracking product views
 * Accepts the raw product data structure from the backend
 */
export interface RecentlyViewedProduct {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  image?: string;
  images?: string[];
  price?: {
    current: number;
    original?: number;
  };
  rating?: {
    value: number | string;
    count: number;
  };
  ratings?: {
    average: number;
    count: number;
  };
  cashback?: {
    percentage: number;
  };
  slug?: string;
}
