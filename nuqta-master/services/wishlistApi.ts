// @ts-nocheck
// Wishlist API Service
// Handles user favorites, bookmarks, and wish lists
// Enhanced with comprehensive error handling, validation, retry logic, and logging

import apiClient, { ApiResponse } from './apiClient';
import { withRetry, createErrorResponse, getUserFriendlyErrorMessage, logApiRequest, logApiResponse } from '@/utils/apiUtils';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Discount snapshot interface - stores deal info at save time
export interface DiscountSnapshot {
  discountId: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'flat';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil?: string;
  storeId: string;
  storeName?: string;
  productId?: string;
  productName?: string;
  savedAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  itemType: 'product' | 'video' | 'store' | 'project' | 'discount';
  itemId: string;
  item: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    price?: number;
    rating?: number;
    availability?: 'available' | 'out_of_stock' | 'discontinued';
    type: WishlistItem['itemType'];
  };
  category?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  isPublic: boolean;
  addedAt: string;
  updatedAt: string;
  discountSnapshot?: DiscountSnapshot; // For saved deals
}

export interface Wishlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  items: WishlistItem[];
  itemCount: number;
  totalValue?: number;
  tags: string[];
  sharedWith: Array<{
    userId: string;
    userName: string;
    permissions: 'view' | 'edit';
    sharedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  itemType?: WishlistItem['itemType'];
  category?: string;
  search?: string;
  tags?: string[];
  priority?: WishlistItem['priority'];
  availability?: WishlistItem['item']['availability'];
  sort?: 'newest' | 'oldest' | 'name' | 'price_high' | 'price_low' | 'priority';
  order?: 'asc' | 'desc';
  isPublic?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface WishlistsResponse {
  items: WishlistItem[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary: {
    totalItems: number;
    totalValue: number;
    availableItems: number;
    outOfStockItems: number;
    byType: Record<WishlistItem['itemType'], number>;
    byPriority: Record<WishlistItem['priority'], number>;
  };
  filters: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
  };
}

export interface CreateWishlistRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface AddToWishlistRequest {
  itemType: WishlistItem['itemType'];
  itemId: string;
  wishlistId?: string; // if not provided, adds to default wishlist
  notes?: string;
  priority?: WishlistItem['priority'];
  tags?: string[];
  // For discount items - optional client-side snapshot data
  discountSnapshot?: Partial<DiscountSnapshot>;
}

export interface WishlistAnalytics {
  overview: {
    totalWishlists: number;
    totalItems: number;
    totalValue: number;
    averageItemsPerWishlist: number;
  };
  trends: {
    itemsAddedOverTime: Array<{
      date: string;
      count: number;
    }>;
    popularCategories: Array<{
      category: string;
      count: number;
      growth: number;
    }>;
    priceDistribution: Record<string, number>;
  };
  behavior: {
    addToCartRate: number;
    purchaseRate: number;
    averageTimeToAction: number;
    shareRate: number;
  };
  insights: Array<{
    type: 'trending_item' | 'price_drop' | 'back_in_stock';
    title: string;
    description: string;
    actionable: boolean;
  }>;
}

/**
 * Validates wishlist data structure
 */
function validateWishlist(data: any): boolean {
  if (!data || typeof data !== 'object') {
    devLog.warn('[WISHLIST API] Invalid wishlist data: not an object');
    return false;
  }

  // Accept both _id and id for MongoDB compatibility
  if (!data.id && !data._id) {
    devLog.warn('[WISHLIST API] Wishlist missing id field');
    return false;
  }

  // Accept both user (populated) and userId fields - backend returns 'user'
  if (!data.userId && !data.user) {
    devLog.warn('[WISHLIST API] Wishlist missing user/userId field');
    return false;
  }

  // items can be an array or undefined (empty wishlist)
  if (data.items && !Array.isArray(data.items)) {
    devLog.warn('[WISHLIST API] Wishlist items is not an array');
    return false;
  }

  // itemCount might be a virtual field or not present for new wishlists
  // Don't require it strictly
  return true;
}

/**
 * Validates wishlist item data structure
 */
function validateWishlistItem(item: any): boolean {
  if (!item || typeof item !== 'object') {
    devLog.warn('[WISHLIST API] Invalid wishlist item: not an object');
    return false;
  }

  // Accept both _id and id for MongoDB compatibility
  if (!item.id && !item._id) {
    devLog.warn('[WISHLIST API] Wishlist item missing id field');
    return false;
  }

  // Backend uses capitalized itemType: 'Product', 'Store', 'Video', 'Discount'
  // Frontend uses lowercase: 'product', 'store', 'video', 'project', 'discount'
  const validItemTypes = ['product', 'video', 'store', 'project', 'discount', 'Product', 'Store', 'Video', 'Project', 'Discount'];
  if (!item.itemType || !validItemTypes.includes(item.itemType)) {
    devLog.warn('[WISHLIST API] Wishlist item has invalid itemType:', item.itemType);
    return false;
  }

  if (!item.itemId) {
    devLog.warn('[WISHLIST API] Wishlist item missing itemId field');
    return false;
  }

  // item details might be populated or just an ObjectId reference - don't require it
  // The backend populates this field, but it might not always be present

  // Priority defaults to 'medium' if not provided
  if (item.priority && !['low', 'medium', 'high'].includes(item.priority)) {
    devLog.warn('[WISHLIST API] Wishlist item has invalid priority');
    return false;
  }

  return true;
}

/**
 * Validates wishlist response data
 */
function validateWishlistsResponse(data: any): boolean {
  if (!data || typeof data !== 'object') {
    devLog.warn('[WISHLIST API] Invalid wishlists response: not an object');
    return false;
  }

  if (!Array.isArray(data.items)) {
    devLog.warn('[WISHLIST API] Wishlists response items is not an array');
    return false;
  }

  if (!data.pagination || typeof data.pagination !== 'object') {
    devLog.warn('[WISHLIST API] Wishlists response missing pagination');
    return false;
  }

  return true;
}

/**
 * Capitalizes itemType to match backend schema (e.g., 'product' -> 'Product')
 * Backend expects: 'Product', 'Store', 'Video', 'Project', 'Discount'
 */
function capitalizeItemType(itemType: string): string {
  return itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();
}

class WishlistService {
  // ==================== PHASE 1: CRITICAL CRUD OPERATIONS ====================

  /**
   * Get user's wishlists
   */
  async getWishlists(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    wishlists: Wishlist[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (page < 1) {
        return {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be at least 1',
        };
      }

      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        };
      }

      logApiRequest('GET', '/wishlist', { page, limit });

      const response = await withRetry(
        () => apiClient.get('/wishlist', { page, limit }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!Array.isArray(response.data.wishlists)) {
          devLog.error('[WISHLIST API] Invalid wishlists response');
          return {
            success: false,
            error: 'Invalid wishlists data received from server',
            message: 'Failed to load wishlists',
          };
        }

        // Validate each wishlist
        response.data.wishlists = response.data.wishlists.filter((wishlist: any) => {
          if (!validateWishlist(wishlist)) {
            devLog.warn('[WISHLIST API] Filtered out invalid wishlist:', wishlist?.id);
            return false;
          }
          return true;
        });
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching wishlists:', error);
      return createErrorResponse(error, 'Failed to load wishlists. Please try again.');
    }
  }

  /**
   * Add item to wishlist
   * Supports optimistic updates - returns immediately for UI
   */
  async addToWishlist(data: AddToWishlistRequest): Promise<ApiResponse<WishlistItem>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.itemType) {
        return {
          success: false,
          error: 'Item type is required',
          message: 'Please specify the item type',
        };
      }

      if (!['product', 'video', 'store', 'project', 'discount'].includes(data.itemType)) {
        return {
          success: false,
          error: 'Invalid item type',
          message: 'Item type must be product, video, store, project, or discount',
        };
      }

      if (!data.itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item to add',
        };
      }

      // Validate priority if provided
      if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
        return {
          success: false,
          error: 'Invalid priority',
          message: 'Priority must be low, medium, or high',
        };
      }

      logApiRequest('POST', '/wishlist/add', {
        itemType: data.itemType,
        itemId: data.itemId,
        wishlistId: data.wishlistId
      });

      // If wishlistId is not provided, get or create default wishlist
      let wishlistId = data.wishlistId;

      if (!wishlistId) {
        const defaultWishlistResponse = await this.getDefaultWishlist();

        if (defaultWishlistResponse.success && defaultWishlistResponse.data) {
          // Backend returns _id (MongoDB), handle both _id and id
          wishlistId = defaultWishlistResponse.data.id || (defaultWishlistResponse.data as any)._id;
        } else {
          // Create default wishlist if it doesn't exist
          const createResponse = await this.createWishlist({
            name: 'My Wishlist',
            description: 'My default wishlist',
            isPublic: false
          });

          if (createResponse.success && createResponse.data) {
            // Backend returns _id (MongoDB), handle both _id and id
            wishlistId = createResponse.data.id || (createResponse.data as any)._id;
          } else {
            devLog.error('[WISHLIST API] Failed to create default wishlist');
            return {
              success: false,
              error: 'Failed to create default wishlist',
              message: 'Could not add item to wishlist. Please try again.',
            };
          }
        }
      }

      // Now add item to the wishlist using the correct endpoint
      // Capitalize itemType to match backend schema (e.g., 'product' -> 'Product')
      const requestBody: any = {
        itemType: capitalizeItemType(data.itemType),
        itemId: data.itemId,
        notes: data.notes,
        priority: data.priority || 'medium',
        tags: data.tags || []
      };

      // Include discount snapshot for discount items
      if (data.itemType === 'discount' && data.discountSnapshot) {
        requestBody.discountSnapshot = data.discountSnapshot;
      }

      const response = await withRetry(
        () => apiClient.post<WishlistItem>(`/wishlist/${wishlistId}/items`, requestBody),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/${wishlistId}/items`, response, Date.now() - startTime);

      // Backend returns the full wishlist (not just the added item)
      // Validate the wishlist structure, not as a single item
      if (response.success && response.data) {
        // The response is the full wishlist, validate it as such
        if (!validateWishlist(response.data)) {
          devLog.warn('[WISHLIST API] Wishlist validation warning in add response, but item was added');
          // Don't fail - the item was successfully added, just the response structure is different
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error adding to wishlist:', error);
      return createErrorResponse(error, 'Failed to add item to wishlist. Please try again.');
    }
  }

  /**
   * Remove item from wishlist
   * Supports optimistic updates
   * Can be called with:
   * - removeFromWishlist('store', 'storeId') - using itemType and itemId
   * - removeFromWishlist('wishlistItemId') - using wishlist item ID directly (legacy)
   */
  async removeFromWishlist(
    itemTypeOrItemId: string,
    itemId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // If itemId is provided, we're using itemType + itemId format
      if (itemId) {
        const itemType = itemTypeOrItemId;

        // Validate input
        if (!itemType) {
          return {
            success: false,
            error: 'Item type is required',
            message: 'Please specify the item type',
          };
        }

        if (!itemId) {
          return {
            success: false,
            error: 'Item ID is required',
            message: 'Please specify the item to remove',
          };
        }

        logApiRequest('POST', '/wishlist/remove-item', { itemType, itemId });

        // Use the new convenience endpoint (POST because DELETE with body isn't universally supported)
        // Capitalize itemType to match backend schema (e.g., 'product' -> 'Product')
        const response = await withRetry(
          () => apiClient.post<{ message: string }>('/wishlist/remove-item', {
            itemType: capitalizeItemType(itemType),
            itemId
          }),
          { maxRetries: 2 }
        );

        logApiResponse('POST', '/wishlist/remove-item', response, Date.now() - startTime);

        return response;
      }

      // Legacy: using wishlist item ID directly
      const wishlistItemId = itemTypeOrItemId;

      // Validate input
      if (!wishlistItemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item to remove',
        };
      }

      logApiRequest('DELETE', `/wishlist/items/${wishlistItemId}`);

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>(`/wishlist/items/${wishlistItemId}`),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/wishlist/items/${wishlistItemId}`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error removing from wishlist:', error);
      return createErrorResponse(error, 'Failed to remove item from wishlist. Please try again.');
    }
  }

  /**
   * Clear wishlist
   */
  async clearWishlist(wishlistId: string): Promise<ApiResponse<{ message: string; count: number }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to clear',
        };
      }

      logApiRequest('DELETE', `/wishlist/${wishlistId}/clear`);

      const response = await withRetry(
        () => apiClient.delete<{ message: string; count: number }>(`/wishlist/${wishlistId}/clear`),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/wishlist/${wishlistId}/clear`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error clearing wishlist:', error);
      return createErrorResponse(error, 'Failed to clear wishlist. Please try again.');
    }
  }

  /**
   * Check if item is in wishlist
   */
  async isInWishlist(
    itemType: WishlistItem['itemType'],
    itemId: string
  ): Promise<ApiResponse<{
    inWishlist: boolean;
    wishlistItemId?: string;
    wishlistId?: string;
    addedAt?: string;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemType) {
        return {
          success: false,
          error: 'Item type is required',
          message: 'Please specify the item type',
        };
      }

      if (!['product', 'video', 'store', 'project', 'discount'].includes(itemType)) {
        return {
          success: false,
          error: 'Invalid item type',
          message: 'Item type must be product, video, store, project, or discount',
        };
      }

      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item ID',
        };
      }

      // Capitalize itemType to match backend schema (e.g., 'product' -> 'Product')
      const normalizedItemType = capitalizeItemType(itemType);
      logApiRequest('GET', '/wishlist/check', { itemType: normalizedItemType, itemId });

      const response = await withRetry(
        () => apiClient.get('/wishlist/check', { itemType: normalizedItemType, itemId }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/check', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error checking wishlist status:', error);
      return createErrorResponse(error, 'Failed to check wishlist status. Please try again.');
    }
  }

  /**
   * Get wishlist item count
   */
  async getWishlistCount(wishlistId?: string): Promise<ApiResponse<{ count: number }>> {
    const startTime = Date.now();

    try {
      const endpoint = wishlistId ? `/wishlist/${wishlistId}/count` : '/wishlist/count';

      logApiRequest('GET', endpoint);

      const response = await withRetry(
        () => apiClient.get<{ count: number }>(endpoint),
        { maxRetries: 2 }
      );

      logApiResponse('GET', endpoint, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching wishlist count:', error);
      return createErrorResponse(error, 'Failed to load wishlist count. Please try again.');
    }
  }

  // ==================== PHASE 2: ADVANCED FEATURES ====================

  /**
   * Get specific wishlist
   */
  async getWishlistById(wishlistId: string): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist ID',
        };
      }

      logApiRequest('GET', `/wishlist/${wishlistId}`);

      const response = await withRetry(
        () => apiClient.get<Wishlist>(`/wishlist/${wishlistId}`),
        { maxRetries: 2 }
      );

      logApiResponse('GET', `/wishlist/${wishlistId}`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist data in response');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to load wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching wishlist:', error);
      return createErrorResponse(error, 'Failed to load wishlist. Please try again.');
    }
  }

  /**
   * Get default wishlist
   */
  async getDefaultWishlist(): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/wishlist/default');

      const response = await withRetry(
        () => apiClient.get<Wishlist>('/wishlist/default'),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/default', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid default wishlist data');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to load default wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching default wishlist:', error);
      return createErrorResponse(error, 'Failed to load default wishlist. Please try again.');
    }
  }

  /**
   * Create new wishlist
   */
  async createWishlist(data: CreateWishlistRequest): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.name || data.name.trim() === '') {
        return {
          success: false,
          error: 'Wishlist name is required',
          message: 'Please enter a name for your wishlist',
        };
      }

      if (data.name.length > 100) {
        return {
          success: false,
          error: 'Wishlist name too long',
          message: 'Wishlist name must be 100 characters or less',
        };
      }

      logApiRequest('POST', '/wishlist', { name: data.name });

      const response = await withRetry(
        () => apiClient.post<Wishlist>('/wishlist', data),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/wishlist', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist data in create response');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to create wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error creating wishlist:', error);
      return createErrorResponse(error, 'Failed to create wishlist. Please try again.');
    }
  }

  /**
   * Update wishlist
   */
  async updateWishlist(
    wishlistId: string,
    updates: Partial<CreateWishlistRequest>
  ): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to update',
        };
      }

      if (!updates || Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'No updates provided',
          message: 'Please provide data to update',
        };
      }

      if (updates.name && updates.name.trim() === '') {
        return {
          success: false,
          error: 'Wishlist name cannot be empty',
          message: 'Please enter a valid wishlist name',
        };
      }

      if (updates.name && updates.name.length > 100) {
        return {
          success: false,
          error: 'Wishlist name too long',
          message: 'Wishlist name must be 100 characters or less',
        };
      }

      logApiRequest('PATCH', `/wishlist/${wishlistId}`, updates);

      const response = await withRetry(
        () => apiClient.patch<Wishlist>(`/wishlist/${wishlistId}`, updates),
        { maxRetries: 2 }
      );

      logApiResponse('PATCH', `/wishlist/${wishlistId}`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist data in update response');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to update wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error updating wishlist:', error);
      return createErrorResponse(error, 'Failed to update wishlist. Please try again.');
    }
  }

  /**
   * Delete wishlist
   */
  async deleteWishlist(wishlistId: string): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to delete',
        };
      }

      logApiRequest('DELETE', `/wishlist/${wishlistId}`);

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>(`/wishlist/${wishlistId}`),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/wishlist/${wishlistId}`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error deleting wishlist:', error);
      return createErrorResponse(error, 'Failed to delete wishlist. Please try again.');
    }
  }

  /**
   * Get wishlist items with filtering
   */
  async getWishlistItems(
    wishlistId?: string,
    query: WishlistsQuery = {}
  ): Promise<ApiResponse<WishlistsResponse>> {
    const startTime = Date.now();

    try {
      // Validate pagination
      if (query.page && query.page < 1) {
        return {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be at least 1',
        };
      }

      if (query.limit && (query.limit < 1 || query.limit > 100)) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        };
      }

      const endpoint = wishlistId ? `/wishlist/${wishlistId}/items` : '/wishlist/items';

      logApiRequest('GET', endpoint, query);

      const response = await withRetry(
        () => apiClient.get<WishlistsResponse>(endpoint, query),
        { maxRetries: 2 }
      );

      logApiResponse('GET', endpoint, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlistsResponse(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist items response');
          return {
            success: false,
            error: 'Invalid wishlist items data received from server',
            message: 'Failed to load wishlist items',
          };
        }

        // Filter out invalid items
        response.data.items = response.data.items.filter((item: any) => {
          if (!validateWishlistItem(item)) {
            devLog.warn('[WISHLIST API] Filtered out invalid wishlist item:', item?.id);
            return false;
          }
          return true;
        });
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching wishlist items:', error);
      return createErrorResponse(error, 'Failed to load wishlist items. Please try again.');
    }
  }

  /**
   * Update wishlist item
   */
  async updateWishlistItem(
    itemId: string,
    updates: Partial<{
      notes: string;
      priority: WishlistItem['priority'];
      tags: string[];
      category: string;
    }>
  ): Promise<ApiResponse<WishlistItem>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item to update',
        };
      }

      if (!updates || Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'No updates provided',
          message: 'Please provide data to update',
        };
      }

      if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
        return {
          success: false,
          error: 'Invalid priority',
          message: 'Priority must be low, medium, or high',
        };
      }

      logApiRequest('PATCH', `/wishlist/items/${itemId}`, updates);

      const response = await withRetry(
        () => apiClient.patch<WishlistItem>(`/wishlist/items/${itemId}`, updates),
        { maxRetries: 2 }
      );

      logApiResponse('PATCH', `/wishlist/items/${itemId}`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlistItem(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist item in update response');
          return {
            success: false,
            error: 'Invalid item data received from server',
            message: 'Failed to update wishlist item',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error updating wishlist item:', error);
      return createErrorResponse(error, 'Failed to update wishlist item. Please try again.');
    }
  }

  /**
   * Move item to cart
   */
  async moveToCart(itemId: string): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item to move',
        };
      }

      logApiRequest('POST', `/wishlist/items/${itemId}/move-to-cart`);

      const response = await withRetry(
        () => apiClient.post<{ message: string }>(`/wishlist/items/${itemId}/move-to-cart`),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/items/${itemId}/move-to-cart`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error moving item to cart:', error);
      return createErrorResponse(error, 'Failed to move item to cart. Please try again.');
    }
  }

  /**
   * Share wishlist
   */
  async shareWishlist(
    wishlistId: string,
    shareWith: Array<{
      userId: string;
      permissions: 'view' | 'edit';
    }>
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to share',
        };
      }

      if (!shareWith || shareWith.length === 0) {
        return {
          success: false,
          error: 'Share recipients required',
          message: 'Please specify who to share with',
        };
      }

      // Validate share recipients
      for (const recipient of shareWith) {
        if (!recipient.userId) {
          return {
            success: false,
            error: 'Invalid recipient',
            message: 'Each recipient must have a valid user ID',
          };
        }

        if (!['view', 'edit'].includes(recipient.permissions)) {
          return {
            success: false,
            error: 'Invalid permissions',
            message: 'Permissions must be view or edit',
          };
        }
      }

      logApiRequest('POST', `/wishlist/${wishlistId}/share`, { shareWith: shareWith.length });

      const response = await withRetry(
        () => apiClient.post<{ message: string }>(`/wishlist/${wishlistId}/share`, { shareWith }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/${wishlistId}/share`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error sharing wishlist:', error);
      return createErrorResponse(error, 'Failed to share wishlist. Please try again.');
    }
  }

  /**
   * Sync wishlist (for offline support)
   */
  async syncWishlist(
    wishlistId: string,
    localChanges: Array<{
      action: 'add' | 'remove' | 'update';
      itemId?: string;
      data?: any;
    }>
  ): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to sync',
        };
      }

      if (!localChanges || localChanges.length === 0) {
        return {
          success: false,
          error: 'No changes to sync',
          message: 'No local changes to synchronize',
        };
      }

      logApiRequest('POST', `/wishlist/${wishlistId}/sync`, { changes: localChanges.length });

      const response = await withRetry(
        () => apiClient.post<Wishlist>(`/wishlist/${wishlistId}/sync`, { changes: localChanges }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/${wishlistId}/sync`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist data in sync response');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to sync wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error syncing wishlist:', error);
      return createErrorResponse(error, 'Failed to sync wishlist. Please try again.');
    }
  }

  /**
   * Move item between wishlists
   */
  async moveItem(
    itemId: string,
    targetWishlistId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item to move',
        };
      }

      if (!targetWishlistId) {
        return {
          success: false,
          error: 'Target wishlist ID is required',
          message: 'Please specify the destination wishlist',
        };
      }

      logApiRequest('PATCH', `/wishlist/items/${itemId}/move`, { targetWishlistId });

      const response = await withRetry(
        () => apiClient.patch<{ message: string }>(`/wishlist/items/${itemId}/move`, { targetWishlistId }),
        { maxRetries: 2 }
      );

      logApiResponse('PATCH', `/wishlist/items/${itemId}/move`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error moving item:', error);
      return createErrorResponse(error, 'Failed to move item. Please try again.');
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk add to wishlist
   */
  async bulkAddToWishlist(
    items: AddToWishlistRequest[]
  ): Promise<ApiResponse<{
    added: number;
    failed: number;
    items: WishlistItem[];
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!items || items.length === 0) {
        return {
          success: false,
          error: 'No items provided',
          message: 'Please provide items to add',
        };
      }

      // Validate each item
      for (const item of items) {
        if (!item.itemType || !item.itemId) {
          return {
            success: false,
            error: 'Invalid item data',
            message: 'Each item must have itemType and itemId',
          };
        }
      }

      logApiRequest('POST', '/wishlist/items/bulk', { count: items.length });

      const response = await withRetry(
        () => apiClient.post('/wishlist/items/bulk', { items }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/wishlist/items/bulk', response, Date.now() - startTime);

      // Validate response items
      if (response.success && response.data?.items) {
        response.data.items = response.data.items.filter((item: any) => {
          if (!validateWishlistItem(item)) {
            devLog.warn('[WISHLIST API] Filtered out invalid item in bulk response');
            return false;
          }
          return true;
        });
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error bulk adding to wishlist:', error);
      return createErrorResponse(error, 'Failed to add items to wishlist. Please try again.');
    }
  }

  /**
   * Bulk remove from wishlist
   */
  async bulkRemoveFromWishlist(
    itemIds: string[]
  ): Promise<ApiResponse<{
    removed: number;
    failed: number;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemIds || itemIds.length === 0) {
        return {
          success: false,
          error: 'No item IDs provided',
          message: 'Please provide items to remove',
        };
      }

      logApiRequest('POST', '/wishlist/items/bulk-remove', { count: itemIds.length });

      const response = await withRetry(
        () => apiClient.post('/wishlist/items/bulk-remove', { itemIds }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/wishlist/items/bulk-remove', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error bulk removing from wishlist:', error);
      return createErrorResponse(error, 'Failed to remove items from wishlist. Please try again.');
    }
  }

  /**
   * Bulk move items
   */
  async bulkMoveItems(
    itemIds: string[],
    targetWishlistId: string
  ): Promise<ApiResponse<{
    moved: number;
    failed: number;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemIds || itemIds.length === 0) {
        return {
          success: false,
          error: 'No item IDs provided',
          message: 'Please provide items to move',
        };
      }

      if (!targetWishlistId) {
        return {
          success: false,
          error: 'Target wishlist ID is required',
          message: 'Please specify the destination wishlist',
        };
      }

      logApiRequest('PATCH', '/wishlist/items/bulk-move', { count: itemIds.length, targetWishlistId });

      const response = await withRetry(
        () => apiClient.patch('/wishlist/items/bulk-move', { itemIds, targetWishlistId }),
        { maxRetries: 2 }
      );

      logApiResponse('PATCH', '/wishlist/items/bulk-move', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error bulk moving items:', error);
      return createErrorResponse(error, 'Failed to move items. Please try again.');
    }
  }

  // ==================== SOCIAL & SHARING FEATURES ====================

  /**
   * Check if item is in wishlist (alias for isInWishlist)
   */
  async checkWishlistStatus(
    itemType: WishlistItem['itemType'],
    itemId: string
  ): Promise<ApiResponse<{
    inWishlist: boolean;
    wishlistItemId?: string;
    wishlistId?: string;
    addedAt?: string;
  }>> {
    return this.isInWishlist(itemType, itemId);
  }

  /**
   * Get wishlist recommendations
   */
  async getRecommendations(
    wishlistId?: string,
    limit: number = 10
  ): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    rating: number;
    type: WishlistItem['itemType'];
    reason: string;
    similarity: number;
  }>>> {
    const startTime = Date.now();

    try {
      // Validate limit
      if (limit < 1 || limit > 50) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 50',
        };
      }

      logApiRequest('GET', '/wishlist/recommendations', { wishlistId, limit });

      const response = await withRetry(
        () => apiClient.get('/wishlist/recommendations', { wishlistId, limit }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/recommendations', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching recommendations:', error);
      return createErrorResponse(error, 'Failed to load recommendations. Please try again.');
    }
  }

  /**
   * Get shared wishlists
   */
  async getSharedWishlists(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    wishlists: Array<Wishlist & {
      owner: {
        id: string;
        name: string;
        avatar?: string;
      };
      sharedAt: string;
      permissions: 'view' | 'edit';
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    const startTime = Date.now();

    try {
      // Validate pagination
      if (page < 1) {
        return {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be at least 1',
        };
      }

      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        };
      }

      logApiRequest('GET', '/wishlist/shared', { page, limit });

      const response = await withRetry(
        () => apiClient.get('/wishlist/shared', { page, limit }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/shared', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching shared wishlists:', error);
      return createErrorResponse(error, 'Failed to load shared wishlists. Please try again.');
    }
  }

  /**
   * Remove sharing
   */
  async unshareWishlist(
    wishlistId: string,
    userId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist',
        };
      }

      const endpoint = `/wishlist/${wishlistId}/share${userId ? `/${userId}` : ''}`;

      logApiRequest('DELETE', endpoint);

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>(endpoint),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', endpoint, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error unsharing wishlist:', error);
      return createErrorResponse(error, 'Failed to unshare wishlist. Please try again.');
    }
  }

  /**
   * Get public wishlists
   */
  async getPublicWishlists(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      userId?: string;
      tags?: string[];
      sort?: 'newest' | 'popular' | 'most_items' | 'highest_value';
    } = {}
  ): Promise<ApiResponse<{
    wishlists: Array<Wishlist & {
      owner: {
        id: string;
        name: string;
        avatar?: string;
      };
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    const startTime = Date.now();

    try {
      // Validate pagination
      if (query.page && query.page < 1) {
        return {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be at least 1',
        };
      }

      if (query.limit && (query.limit < 1 || query.limit > 100)) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        };
      }

      logApiRequest('GET', '/wishlist/public', query);

      const response = await withRetry(
        () => apiClient.get('/wishlist/public', query),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/public', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching public wishlists:', error);
      return createErrorResponse(error, 'Failed to load public wishlists. Please try again.');
    }
  }

  /**
   * Follow public wishlist
   */
  async followWishlist(wishlistId: string): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to follow',
        };
      }

      logApiRequest('POST', `/wishlist/${wishlistId}/follow`);

      const response = await withRetry(
        () => apiClient.post<{ message: string }>(`/wishlist/${wishlistId}/follow`),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/${wishlistId}/follow`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error following wishlist:', error);
      return createErrorResponse(error, 'Failed to follow wishlist. Please try again.');
    }
  }

  /**
   * Unfollow wishlist
   */
  async unfollowWishlist(wishlistId: string): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to unfollow',
        };
      }

      logApiRequest('DELETE', `/wishlist/${wishlistId}/follow`);

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>(`/wishlist/${wishlistId}/follow`),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/wishlist/${wishlistId}/follow`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error unfollowing wishlist:', error);
      return createErrorResponse(error, 'Failed to unfollow wishlist. Please try again.');
    }
  }

  /**
   * Get followed wishlists
   */
  async getFollowedWishlists(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    wishlists: Array<Wishlist & {
      owner: {
        id: string;
        name: string;
        avatar?: string;
      };
      followedAt: string;
    }>;
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  }>> {
    const startTime = Date.now();

    try {
      // Validate pagination
      if (page < 1) {
        return {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be at least 1',
        };
      }

      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        };
      }

      logApiRequest('GET', '/wishlist/following', { page, limit });

      const response = await withRetry(
        () => apiClient.get('/wishlist/following', { page, limit }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/wishlist/following', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching followed wishlists:', error);
      return createErrorResponse(error, 'Failed to load followed wishlists. Please try again.');
    }
  }

  // ==================== IMPORT/EXPORT FEATURES ====================

  /**
   * Export wishlist
   */
  async exportWishlist(
    wishlistId: string,
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<ApiResponse<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to export',
        };
      }

      if (!['pdf', 'csv', 'json'].includes(format)) {
        return {
          success: false,
          error: 'Invalid export format',
          message: 'Format must be pdf, csv, or json',
        };
      }

      logApiRequest('GET', `/wishlist/${wishlistId}/export`, { format });

      const response = await withRetry(
        () => apiClient.get(`/wishlist/${wishlistId}/export`, { format }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', `/wishlist/${wishlistId}/export`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error exporting wishlist:', error);
      return createErrorResponse(error, 'Failed to export wishlist. Please try again.');
    }
  }

  /**
   * Import wishlist
   */
  async importWishlist(
    file: File,
    wishlistId?: string
  ): Promise<ApiResponse<{
    imported: number;
    failed: number;
    wishlistId: string;
    errors?: Array<{
      row: number;
      error: string;
    }>;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!file) {
        return {
          success: false,
          error: 'File is required',
          message: 'Please select a file to import',
        };
      }

      const formData = new FormData();
      formData.append('file', file);
      if (wishlistId) {
        formData.append('wishlistId', wishlistId);
      }

      logApiRequest('POST', '/wishlist/import', { filename: file.name });

      const response = await withRetry(
        () => apiClient.uploadFile('/wishlist/import', formData),
        { maxRetries: 1 } // Don't retry file uploads
      );

      logApiResponse('POST', '/wishlist/import', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error importing wishlist:', error);
      return createErrorResponse(error, 'Failed to import wishlist. Please try again.');
    }
  }

  // ==================== PRICE TRACKING FEATURES ====================

  /**
   * Get price alerts for wishlist items
   */
  async getPriceAlerts(
    wishlistId?: string
  ): Promise<ApiResponse<Array<{
    itemId: string;
    item: WishlistItem['item'];
    currentPrice: number;
    alertPrice: number;
    priceDrop: number;
    percentage: number;
    triggeredAt: string;
  }>>> {
    const startTime = Date.now();

    try {
      const endpoint = wishlistId ? `/wishlist/${wishlistId}/price-alerts` : '/wishlist/price-alerts';

      logApiRequest('GET', endpoint);

      const response = await withRetry(
        () => apiClient.get(endpoint),
        { maxRetries: 2 }
      );

      logApiResponse('GET', endpoint, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching price alerts:', error);
      return createErrorResponse(error, 'Failed to load price alerts. Please try again.');
    }
  }

  /**
   * Set price alert
   */
  async setPriceAlert(
    itemId: string,
    alertPrice: number
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item',
        };
      }

      if (typeof alertPrice !== 'number' || alertPrice <= 0) {
        return {
          success: false,
          error: 'Invalid alert price',
          message: 'Please enter a valid price',
        };
      }

      logApiRequest('POST', `/wishlist/items/${itemId}/price-alert`, { alertPrice });

      const response = await withRetry(
        () => apiClient.post<{ message: string }>(`/wishlist/items/${itemId}/price-alert`, { alertPrice }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/items/${itemId}/price-alert`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error setting price alert:', error);
      return createErrorResponse(error, 'Failed to set price alert. Please try again.');
    }
  }

  /**
   * Remove price alert
   */
  async removePriceAlert(itemId: string): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item',
        };
      }

      logApiRequest('DELETE', `/wishlist/items/${itemId}/price-alert`);

      const response = await withRetry(
        () => apiClient.delete<{ message: string }>(`/wishlist/items/${itemId}/price-alert`),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/wishlist/items/${itemId}/price-alert`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error removing price alert:', error);
      return createErrorResponse(error, 'Failed to remove price alert. Please try again.');
    }
  }

  // ==================== ANALYTICS & INSIGHTS ====================

  /**
   * Get wishlist analytics
   */
  async getWishlistAnalytics(
    wishlistId?: string,
    dateRange?: {
      from: string;
      to: string;
    }
  ): Promise<ApiResponse<WishlistAnalytics>> {
    const startTime = Date.now();

    try {
      const endpoint = wishlistId ? `/wishlist/${wishlistId}/analytics` : '/wishlist/analytics';

      logApiRequest('GET', endpoint, dateRange);

      const response = await withRetry(
        () => apiClient.get<WishlistAnalytics>(endpoint, dateRange),
        { maxRetries: 2 }
      );

      logApiResponse('GET', endpoint, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching analytics:', error);
      return createErrorResponse(error, 'Failed to load analytics. Please try again.');
    }
  }

  /**
   * Get similar items
   */
  async getSimilarItems(
    itemId: string,
    limit: number = 5
  ): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    rating: number;
    type: WishlistItem['itemType'];
    similarity: number;
  }>>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!itemId) {
        return {
          success: false,
          error: 'Item ID is required',
          message: 'Please specify the item',
        };
      }

      if (limit < 1 || limit > 20) {
        return {
          success: false,
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 20',
        };
      }

      logApiRequest('GET', `/wishlist/items/${itemId}/similar`, { limit });

      const response = await withRetry(
        () => apiClient.get(`/wishlist/items/${itemId}/similar`, { limit }),
        { maxRetries: 2 }
      );

      logApiResponse('GET', `/wishlist/items/${itemId}/similar`, response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error fetching similar items:', error);
      return createErrorResponse(error, 'Failed to load similar items. Please try again.');
    }
  }

  // ==================== WISHLIST MANAGEMENT ====================

  /**
   * Duplicate wishlist
   */
  async duplicateWishlist(
    wishlistId: string,
    newName: string
  ): Promise<ApiResponse<Wishlist>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!wishlistId) {
        return {
          success: false,
          error: 'Wishlist ID is required',
          message: 'Please specify the wishlist to duplicate',
        };
      }

      if (!newName || newName.trim() === '') {
        return {
          success: false,
          error: 'New name is required',
          message: 'Please enter a name for the new wishlist',
        };
      }

      if (newName.length > 100) {
        return {
          success: false,
          error: 'Name too long',
          message: 'Wishlist name must be 100 characters or less',
        };
      }

      logApiRequest('POST', `/wishlist/${wishlistId}/duplicate`, { name: newName });

      const response = await withRetry(
        () => apiClient.post<Wishlist>(`/wishlist/${wishlistId}/duplicate`, { name: newName }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/wishlist/${wishlistId}/duplicate`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateWishlist(response.data)) {
          devLog.error('[WISHLIST API] Invalid wishlist data in duplicate response');
          return {
            success: false,
            error: 'Invalid wishlist data received from server',
            message: 'Failed to duplicate wishlist',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error duplicating wishlist:', error);
      return createErrorResponse(error, 'Failed to duplicate wishlist. Please try again.');
    }
  }

  /**
   * Merge wishlists
   */
  async mergeWishlists(
    sourceWishlistId: string,
    targetWishlistId: string,
    deleteSource: boolean = false
  ): Promise<ApiResponse<{
    message: string;
    merged: number;
    duplicates: number;
  }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!sourceWishlistId) {
        return {
          success: false,
          error: 'Source wishlist ID is required',
          message: 'Please specify the source wishlist',
        };
      }

      if (!targetWishlistId) {
        return {
          success: false,
          error: 'Target wishlist ID is required',
          message: 'Please specify the target wishlist',
        };
      }

      if (sourceWishlistId === targetWishlistId) {
        return {
          success: false,
          error: 'Cannot merge wishlist with itself',
          message: 'Source and target wishlists must be different',
        };
      }

      logApiRequest('POST', '/wishlist/merge', { sourceWishlistId, targetWishlistId, deleteSource });

      const response = await withRetry(
        () => apiClient.post('/wishlist/merge', {
          sourceWishlistId,
          targetWishlistId,
          deleteSource
        }),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/wishlist/merge', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[WISHLIST API] Error merging wishlists:', error);
      return createErrorResponse(error, 'Failed to merge wishlists. Please try again.');
    }
  }
}

// Create singleton instance
const wishlistService = new WishlistService();

export default wishlistService;
