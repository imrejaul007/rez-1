// @ts-nocheck
// Cart API Service
// Handles shopping cart operations and management
// Enhanced with comprehensive error handling, validation, and logging

import apiClient, { ApiResponse } from './apiClient';
import { withRetry, createErrorResponse, getUserFriendlyErrorMessage, logApiRequest, logApiResponse } from '@/utils/apiUtils';
import {
  CartItem as UnifiedCartItem,
  Cart as UnifiedCart,
  toCartItem,
  validateCartItem as validateUnifiedCartItem,
  isCartItemAvailable
} from '@/types/unified';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Service booking details for cart items
export interface ServiceBookingDetails {
  bookingDate: string | Date;
  timeSlot: {
    start: string;
    end: string;
  };
  duration: number; // in minutes
  serviceType: 'home' | 'store' | 'online';
  customerNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

// Keep the old CartItem interface for backwards compatibility during migration
export interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images?: Array<{
      id: string;
      url: string;
      alt: string;
      isMain: boolean;
    }>;
    pricing: {
      currency: string;
    };
    inventory: {
      stock: number;
      isAvailable: boolean;
    };
    isActive: boolean;
  };
  store: {
    _id: string;
    name: string;
    location?: {
      address: string;
      city: string;
      state: string;
    };
  };
  itemType?: 'product' | 'service' | 'event'; // Type of item
  variant?: {
    type?: string;
    value?: string;
  };
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  addedAt: string;
  serviceBookingDetails?: ServiceBookingDetails; // For service items
}

export interface LockedItem {
  _id?: string;
  product: {
    _id: string;
    name: string;
    images?: Array<{
      id: string;
      url: string;
      alt: string;
      isMain: boolean;
    }>;
    pricing: {
      currency: string;
    };
    inventory: {
      stock: number;
      isAvailable: boolean;
    };
    isActive: boolean;
  };
  store: {
    _id: string;
    name: string;
    location?: {
      address: string;
      city: string;
      state: string;
    };
  };
  variant?: {
    type?: string;
    value?: string;
  };
  quantity: number;
  lockedPrice: number;
  originalPrice?: number;
  lockedAt: string;
  expiresAt: string;
  notes?: string;
  // Paid lock fields (MakeMyTrip style)
  lockFee?: number;
  lockFeePercentage?: number;
  lockDuration?: number;
  paymentMethod?: 'wallet' | 'upi';
  paymentTransactionId?: string;
  lockPaymentStatus?: 'pending' | 'paid' | 'refunded' | 'forfeited' | 'applied';
  isPaidLock?: boolean;
}

// Lock with payment request
export interface LockWithPaymentRequest {
  productId: string;
  quantity?: number;
  variant?: { type: string; value: string };
  duration: 2 | 4 | 8; // Variable lock duration: 2hr=5%, 4hr=10%, 8hr=15%
  paymentMethod: 'wallet' | 'upi';
}

// Lock fee option
export interface LockFeeOption {
  duration: number;
  label: string;
  percentage: number;
  fee: number;
}

// Lock fee options response
export interface LockFeeOptionsResponse {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  lockOptions: LockFeeOption[];
}

// Lock with payment response
export interface LockWithPaymentResponse {
  cart: Cart;
  lockDetails: {
    lockFee: number;
    lockFeePercentage: number;
    duration: number;
    expiresAt: string;
    transactionId: string;
    paymentMethod: 'wallet' | 'upi';
    message: string;
  };
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  lockedItems: LockedItem[];
  totals: {
    subtotal: number;
    tax: number;
    delivery: number;
    discount: number;
    cashback: number;
    total: number;
    savings: number;
  };
  coupon?: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    appliedAmount: number;
    appliedAt: string;
  };
  itemCount: number;
  storeCount: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// Export unified Cart types for new code
export { UnifiedCartItem, UnifiedCart };

export interface AddToCartRequest {
  productId: string;
  quantity: number;
  itemType?: 'product' | 'service' | 'event';
  variant?: {
    type: string;
    value: string;
  };
  serviceBookingDetails?: ServiceBookingDetails;
  metadata?: {
    eventId?: string;
    slotId?: string;
    slotTime?: string;
    eventType?: string;
    location?: string;
    date?: string;
    time?: string;
    [key: string]: any;
  };
}

export interface AddServiceToCartRequest {
  productId: string; // Service ID
  storeId: string;
  serviceBookingDetails: ServiceBookingDetails;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface ApplyCouponRequest {
  couponCode: string;
}

/**
 * Validates cart data structure
 */
function validateCart(cart: any): boolean {
  if (!cart || typeof cart !== 'object') {
    devLog.warn('[CART API] Invalid cart data: not an object');
    return false;
  }

  if (!cart._id) {
    devLog.warn('[CART API] Cart missing _id field');
    return false;
  }

  if (!Array.isArray(cart.items)) {
    devLog.warn('[CART API] Cart items is not an array');
    return false;
  }

  if (!cart.totals || typeof cart.totals !== 'object') {
    devLog.warn('[CART API] Cart missing totals object');
    return false;
  }

  return true;
}

/**
 * Validates cart item data structure
 */
function validateCartItem(item: any): boolean {
  if (!item || typeof item !== 'object') {
    return false;
  }

  if (!item.product || !item.product._id) {
    devLog.warn('[CART API] Cart item missing product information');
    return false;
  }

  if (typeof item.quantity !== 'number' || item.quantity < 1) {
    devLog.warn('[CART API] Cart item has invalid quantity');
    return false;
  }

  return true;
}

class CartService {
  /**
   * Get current user's cart
   */
  async getCart(): Promise<any> {
    try {
      const response = await apiClient.get<Cart>('/cart');
      return response.success ? response.data : response;
    } catch (error: any) {
      if (error?.response) throw error;
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(data: AddToCartRequest): Promise<any> {
    try {
      const response = await apiClient.post<Cart>('/cart/add', data);
      return response.success ? response.data : response;
    } catch (error: any) {
      if (error?.response) throw error;
      throw error;
    }
  }

  /**
   * Add service item to cart with booking details
   */
  async addServiceToCart(data: AddServiceToCartRequest): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.productId) {
        return {
          success: false,
          error: 'Service ID is required',
          message: 'Service ID is required',
        };
      }

      if (!data.storeId) {
        return {
          success: false,
          error: 'Store ID is required',
          message: 'Store ID is required',
        };
      }

      if (!data.serviceBookingDetails) {
        return {
          success: false,
          error: 'Booking details are required',
          message: 'Please provide booking date and time',
        };
      }

      if (!data.serviceBookingDetails.bookingDate) {
        return {
          success: false,
          error: 'Booking date is required',
          message: 'Please select a booking date',
        };
      }

      if (!data.serviceBookingDetails.timeSlot?.start) {
        return {
          success: false,
          error: 'Time slot is required',
          message: 'Please select a time slot',
        };
      }

      const requestData: AddToCartRequest = {
        productId: data.productId,
        quantity: 1, // Services always have quantity 1
        itemType: 'service',
        serviceBookingDetails: data.serviceBookingDetails,
        metadata: {
          storeId: data.storeId,
        },
      };

      logApiRequest('POST', '/cart/add (service)', requestData);

      const response = await withRetry(
        () => apiClient.post<Cart>('/cart/add', requestData),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/cart/add (service)', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart validation failed after adding service');
          return {
            success: false,
            error: 'Invalid cart data received after adding service',
            message: 'Failed to add service to cart',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error adding service to cart:', error);
      return createErrorResponse(
        error,
        'Failed to add service to cart. Please try again.'
      );
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    productId: string,
    data: UpdateCartItemRequest,
    variant?: { type: string; value: string }
  ): Promise<any> {
    try {
      // SECURITY/F-17: previously URL-encoded JSON.stringify(variant) into
      // the path. The backend treats the variant param as an opaque string,
      // so the variant blob is never decoded back into a structured value —
      // every update loses variant context. Use a query param instead and
      // base64-encode so URL parsing stays unambiguous.
      const url = variant
        ? `/cart/item/${productId}?variant=${encodeURIComponent(Buffer.from(JSON.stringify(variant)).toString('base64'))}`
        : `/cart/item/${productId}`;
      const response = await apiClient.put<Cart>(url, data);
      return response.success ? response.data : response;
    } catch (error: any) {
      if (error?.response) throw error;
      throw error;
    }
  }

  /**
   * Remove item from cart (alias)
   */
  async removeFromCart(
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<any> {
    return this.removeCartItem(productId, variant);
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<any> {
    try {
      const url = variant
        ? `/cart/item/${productId}/${encodeURIComponent(JSON.stringify(variant))}`
        : `/cart/item/${productId}`;
      const response = await apiClient.delete<Cart>(url);
      return response.success ? response.data : response;
    } catch (error: any) {
      if (error?.response) throw error;
      throw error;
    }
  }

  /**
   * Clear entire cart
   *
   * Uses POST /cart/clear (per the checkout integration contract).
   * Some legacy callers still issue DELETE /cart/clear — we keep both
   * shapes supported but POST is the canonical one.
   */
  async clearCart(): Promise<any> {
    try {
      const response = await apiClient.post<{ message: string }>('/cart/clear');
      return response && response.success ? response.data : response;
    } catch (error: any) {
      if (error?.response) throw error;
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(data: ApplyCouponRequest): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.couponCode || data.couponCode.trim() === '') {
        return {
          success: false,
          error: 'Coupon code is required',
          message: 'Please enter a coupon code',
        };
      }

      logApiRequest('POST', '/cart/coupon', data);

      const response = await withRetry(
        () => apiClient.post<Cart>('/cart/coupon', data),
        { maxRetries: 1 } // Don't retry coupon applications
      );

      logApiResponse('POST', '/cart/coupon', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart validation failed after applying coupon');
          return {
            success: false,
            error: 'Invalid cart data received after applying coupon',
            message: 'Failed to apply coupon',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error applying coupon:', error);
      return createErrorResponse(error, 'Failed to apply coupon. Please try again.');
    }
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      logApiRequest('DELETE', '/cart/coupon');

      const response = await withRetry(
        () => apiClient.delete<Cart>('/cart/coupon'),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', '/cart/coupon', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart validation failed after removing coupon');
          return {
            success: false,
            error: 'Invalid cart data received after removing coupon',
            message: 'Failed to remove coupon',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error removing coupon:', error);
      return createErrorResponse(error, 'Failed to remove coupon. Please try again.');
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/cart/summary');

      const response = await withRetry(
        () => apiClient.get<Cart>('/cart/summary'),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/cart/summary', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart summary validation failed');
          return {
            success: false,
            error: 'Invalid cart summary data',
            message: 'Failed to load cart summary',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error fetching cart summary:', error);
      return createErrorResponse(error, 'Failed to load cart summary. Please try again.');
    }
  }

  /**
   * Validate cart items (check availability, prices)
   *
   * Returns the validation payload directly (unwrapping the API
   * envelope). The checkout integration tests use a relaxed validation
   * shape (`{ available, items }`) so we keep the return type flexible.
   */
  async validateCart(): Promise<{
    valid?: boolean;
    available?: boolean;
    issues?: Array<{
      itemId: string;
      type: 'out_of_stock' | 'price_change' | 'unavailable';
      message: string;
      currentPrice?: number;
      availableQuantity?: number;
    }>;
    items?: Array<{ productId: string; available: boolean; stockQuantity?: number }>;
  }> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/cart/validate');

      const response = await withRetry(
        () => apiClient.post('/cart/validate', {}),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/cart/validate', response, Date.now() - startTime);

      if (response && response.success && response.data) {
        return response.data;
      }

      // If the API returned the validation payload directly (e.g. mocked), pass through
      if (response && (response as any).available !== undefined) {
        return response as any;
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[CART API] Error validating cart:', error);
      return createErrorResponse(error, 'Failed to validate cart. Please try again.') as any;
    }
  }

  /**
   * Get cart summary for checkout
   */
  async getCheckoutSummary(): Promise<ApiResponse<{
    items: CartItem[];
    summary: Cart['totals'];
    shippingRequired: boolean;
    taxCalculated: boolean;
  }>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/cart/summary (checkout)');

      // Use cart summary endpoint
      const response = await this.getCartSummary();

      logApiResponse('GET', '/cart/summary (checkout)', response, Date.now() - startTime);

      if (response.success && response.data) {
        // Transform to checkout summary format
        return {
          success: true,
          data: {
            items: response.data.items,
            summary: response.data.totals,
            shippingRequired: true,
            taxCalculated: response.data.totals.tax > 0,
          },
        };
      }

      return response as any;
    } catch (error: any) {
      devLog.error('[CART API] Error getting checkout summary:', error);
      return createErrorResponse(error, 'Failed to load checkout summary');
    }
  }

  /**
   * Lock item at current price
   */
  async lockItem(data: {
    productId: string;
    quantity?: number;
    variant?: { type: string; value: string };
    lockDurationHours?: number;
  }): Promise<ApiResponse<{ cart: Cart; message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.productId) {
        return {
          success: false,
          error: 'Product ID is required',
          message: 'Product ID is required',
        };
      }

      logApiRequest('POST', '/cart/lock', data);

      const response = await withRetry(
        () => apiClient.post<{ cart: Cart; message: string }>('/cart/lock', data),
        { maxRetries: 2 }
      );

      logApiResponse('POST', '/cart/lock', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data?.cart) {
        if (!validateCart(response.data.cart)) {
          devLog.error('[CART API] Cart validation failed after locking item');
          return {
            success: false,
            error: 'Invalid cart data after locking item',
            message: 'Failed to lock item',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error locking item:', error);
      return createErrorResponse(error, 'Failed to lock item. Please try again.');
    }
  }

  /**
   * Get locked items
   */
  async getLockedItems(): Promise<ApiResponse<{ lockedItems: LockedItem[] }>> {
    const startTime = Date.now();

    try {
      logApiRequest('GET', '/cart/locked');

      const response = await withRetry(
        () => apiClient.get<{ lockedItems: LockedItem[] }>('/cart/locked'),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/cart/locked', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error fetching locked items:', error);
      return createErrorResponse(error, 'Failed to load locked items');
    }
  }

  /**
   * Unlock item
   */
  async unlockItem(
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!productId) {
        return {
          success: false,
          error: 'Product ID is required',
          message: 'Product ID is required',
        };
      }

      logApiRequest('DELETE', `/cart/lock/${productId}`);

      const response = await withRetry(
        () => apiClient.delete<Cart>(
          `/cart/lock/${productId}`,
          variant ? { variant } : undefined
        ),
        { maxRetries: 2 }
      );

      logApiResponse('DELETE', `/cart/lock/${productId}`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart validation failed after unlocking item');
          return {
            success: false,
            error: 'Invalid cart data after unlocking item',
            message: 'Failed to unlock item',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error unlocking item:', error);
      return createErrorResponse(error, 'Failed to unlock item');
    }
  }

  /**
   * Move locked item to cart
   */
  async moveLockedToCart(
    productId: string,
    variant?: { type: string; value: string }
  ): Promise<ApiResponse<Cart>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!productId) {
        return {
          success: false,
          error: 'Product ID is required',
          message: 'Product ID is required',
        };
      }

      logApiRequest('POST', `/cart/lock/${productId}/move-to-cart`);

      const response = await withRetry(
        () => apiClient.post<Cart>(
          `/cart/lock/${productId}/move-to-cart`,
          variant ? { variant } : {}
        ),
        { maxRetries: 2 }
      );

      logApiResponse('POST', `/cart/lock/${productId}/move-to-cart`, response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data) {
        if (!validateCart(response.data)) {
          devLog.error('[CART API] Cart validation failed after moving locked item');
          return {
            success: false,
            error: 'Invalid cart data after moving locked item',
            message: 'Failed to move locked item to cart',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error moving locked item to cart:', error);
      return createErrorResponse(error, 'Failed to move locked item to cart');
    }
  }

  /**
   * Get lock fee options for a product (MakeMyTrip style)
   */
  async getLockFeeOptions(
    productId: string,
    quantity: number = 1
  ): Promise<ApiResponse<LockFeeOptionsResponse>> {
    const startTime = Date.now();

    try {
      if (!productId) {
        return {
          success: false,
          error: 'Product ID is required',
          message: 'Product ID is required',
        };
      }

      logApiRequest('GET', `/cart/lock-fee-options?productId=${productId}&quantity=${quantity}`);

      const response = await withRetry(
        () => apiClient.get<LockFeeOptionsResponse>(
          `/cart/lock-fee-options?productId=${productId}&quantity=${quantity}`
        ),
        { maxRetries: 2 }
      );

      logApiResponse('GET', '/cart/lock-fee-options', response, Date.now() - startTime);

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error getting lock fee options:', error);
      return createErrorResponse(error, 'Failed to get lock fee options');
    }
  }

  /**
   * Lock item with payment (MakeMyTrip style)
   * User pays a percentage of product price to lock it for a duration
   */
  async lockItemWithPayment(
    data: LockWithPaymentRequest
  ): Promise<ApiResponse<LockWithPaymentResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!data.productId) {
        return {
          success: false,
          error: 'Product ID is required',
          message: 'Product ID is required',
        };
      }

      if (![2, 4, 8].includes(data.duration)) {
        return {
          success: false,
          error: 'Invalid duration',
          message: 'Please select a valid lock duration (2, 4, or 8 hours)',
        };
      }

      if (!['wallet', 'upi'].includes(data.paymentMethod)) {
        return {
          success: false,
          error: 'Invalid payment method',
          message: 'Please select a valid payment method',
        };
      }

      logApiRequest('POST', '/cart/lock-with-payment', data);

      const response = await withRetry(
        () => apiClient.post<LockWithPaymentResponse>('/cart/lock-with-payment', data),
        { maxRetries: 1 } // Don't retry payment operations
      );

      logApiResponse('POST', '/cart/lock-with-payment', response, Date.now() - startTime);

      // Validate response
      if (response.success && response.data?.cart) {
        if (!validateCart(response.data.cart)) {
          devLog.error('[CART API] Cart validation failed after lock with payment');
          return {
            success: false,
            error: 'Invalid cart data after locking item',
            message: 'Failed to lock item',
          };
        }
      }

      return response;
    } catch (error: any) {
      devLog.error('[CART API] Error locking item with payment:', error);
      return createErrorResponse(error, 'Failed to lock item. Please try again.');
    }
  }
}

// Create singleton instance
const cartService = new CartService();

// Named export for compatibility
export { cartService as cartApi };

export default cartService;
