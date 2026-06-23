/**
 * Favorite Store Types
 * For "Shop at your Favorite" section - tracks bookmarked and most visited stores
 */

export interface FavoriteStore {
  id: string;
  name: string;
  image: string;           // Tall lifestyle/banner image
  rating: {
    value: number;
    count: number;
  };
  address: string;         // Full formatted address
  description?: string;    // Store description/tagline
  deliveryTime?: string;   // e.g., "30-45 mins"
  cashbackPercentage?: number;
  slug?: string;
  isFavorited: boolean;    // Explicitly bookmarked by user
  visitCount: number;      // Auto-tracked visit count
  lastVisited: number;     // Timestamp of last visit
  addedAt?: number;        // Timestamp when bookmarked
}

export interface FavoriteStoreInput {
  _id: string;
  name: string;
  banner?: string | string[];
  logo?: string;
  coverImage?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  ratings?: {
    average: number;
    count: number;
  };
  offers?: {
    cashback?: number;
  };
  operationalInfo?: {
    deliveryTime?: string;
  };
  slug?: string;
}

// Maximum number of favorite stores to keep in storage
export const MAX_FAVORITE_STORES = 20;

// Minimum visit count to show in "most visited" (must visit at least twice)
export const MIN_VISITS_TO_SHOW = 1;
