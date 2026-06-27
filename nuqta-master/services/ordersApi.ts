// Orders API Service
// Handles order creation, management, and tracking

import apiClient, { ApiResponse } from './apiClient';
import {
  Order as UnifiedOrder,
  OrderItem as UnifiedOrderItem,
  toOrder,
  validateOrder,
  canCancelOrder
} from '@/types/unified';

// Keep the old OrderItem interface for backwards compatibility during migration
export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  product: {
    id: string;
    name: string;
    description: string;
    images: Array<{
      url: string;
      alt: string;
    }>;
    store: {
      id: string;
      name: string;
      logo?: string;
    };
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    attributes: Record<string, any>;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  _id: string; // MongoDB ID from backend
  id: string;
  orderNumber: string;
  userId: string;
  store?: {  // Primary store for the order (populated)
    _id: string;
    id?: string;
    name: string;
    logo?: string;
    location?: any;
  } | string; // Can be populated object or just ID string
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' | 'pending' | 'processing' | 'shipped';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  items: OrderItem[];
  createdAt: string; // Order creation timestamp
  updatedAt: string; // Last update timestamp
  totals: {
    subtotal: number;
    tax: number;
    delivery: number;
    discount: number;
    lockFeeDiscount?: number;
    cashback: number;
    total: number;
    paidAmount: number;
    refundAmount: number;
  };
  summary?: { // Deprecated - use totals instead
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  };
  payment: {
    method: 'cod' | 'wallet' | 'card' | 'upi' | 'netbanking';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
    coinsUsed?: {
      rezCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  };
  delivery: {
    method: 'standard' | 'express' | 'pickup';
    status: 'pending' | 'confirmed' | 'dispatched' | 'delivered';
    address: {
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
      landmark?: string;
      addressType?: 'home' | 'work' | 'other';
    };
    deliveryFee: number;
    attempts: any[];
  };
  timeline: Array<{
    status: string;
    message: string;
    timestamp: string;
    _id?: string;
    details?: Record<string, any>;
  }>;
  couponCode?: string;
  specialInstructions?: string;
  cancellation?: {
    reason: string;
    cancelledAt: string;
  };
  cancelReason?: string;
  cancelledAt?: string;
  shippingAddress?: { // Deprecated - use delivery.address instead
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  coupon?: {
    code: string;
    discountAmount: number;
  };
  tracking?: {
    number: string;
    carrier: string;
    url: string;
    status: string;
    estimatedDelivery?: string;
  };
  notes?: string;
  redemption?: {
    code: string;
    discount: number;
    dealTitle?: string;
  };
}

// Export unified Order types for new code
export { UnifiedOrder, UnifiedOrderItem };

export interface CreateOrderRequest {
  fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
  fulfillmentDetails?: {
    tableNumber?: string;
    vehicleInfo?: string;
    pickupInstructions?: string;
  };
  /**
   * Frontend-friendly delivery address (object). The service layer maps
   * this to the backend's `shippingAddress` ObjectId before submitting.
   */
  deliveryAddress?: {
    name: string;
    phone: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    landmark?: string;
    addressType?: 'home' | 'work' | 'other';
  };
  /**
   * Pre-resolved shipping address ObjectId. If the caller already knows
   * the saved address `_id`, they can pass it directly and skip mapping.
   */
  shippingAddress?: string;
  paymentMethod: 'wallet' | 'razorpay' | 'stripe' | 'cod' | 'paypal' | 'online';
  specialInstructions?: string;
  couponCode?: string;
  redemptionCode?: string;
  lockFeeDiscount?: number;
  coinsUsed?: {
    rezCoins: number;
    promoCoins: number;
    storePromoCoins: number;
    totalCoinsValue?: number;
    wasilCoins?: number;
  };
  storeId?: string;
  items?: Array<{
    product: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
  pickId?: string;
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: Order['status'];
  statusGroup?: 'active' | 'past';
  cursor?: string;
  paymentStatus?: Order['paymentStatus'];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'total_asc' | 'total_desc';
}

export interface OrderCounts {
  active: number;
  past: number;
}

export interface OrdersResponse {
  orders: Order[];
  nextCursor?: string | null;
  hasMore?: boolean;
  counts?: OrderCounts;
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary?: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  };
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RefundRequest {
  orderId: string;
  amount?: number;
  reason: string;
  items?: Array<{
    itemId: string;
    quantity?: number;
  }>;
}

class OrdersService {
  // Create new order from cart
  //
  // Returns the order payload directly (unwrapping the API envelope) so
  // callers (and integration tests) can use `order.id`, `order.status`,
  // `order.items`, etc. without going through `.data`.
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    // Backend (orderValidators.ts / createOrderSchema) requires:
    //   - items: Array<{ product: ObjectId, quantity, price }>
    //   - shippingAddress: ObjectId string (NOT a delivery address object)
    //   - paymentMethod: 'cod' | 'online' | 'wallet' | 'razorpay' | 'stripe' | 'paypal'
    // The frontend historically populated `deliveryAddress` (object); we now
    // accept either and emit the canonical wire format here.
    const shippingAddressId: string | undefined =
      (data as any).shippingAddress ||
      (data.deliveryAddress as any)?._id ||
      (data.deliveryAddress as any)?.id;

    const body: Record<string, any> = { ...(data as any) };

    if (shippingAddressId) {
      body.shippingAddress = shippingAddressId;
    }
    // Always strip the legacy frontend-only `deliveryAddress` object so the
    // validator doesn't see a stray field. We preserve it under the new
    // `billingAddress` slot only when the caller supplied a real ObjectId
    // (rare); otherwise the backend will reject with a clear error if the
    // caller forgot to wire up the address id.
    delete body.deliveryAddress;

    // Items: backend requires at least one. If the caller didn't supply
    // them, surface a clear error instead of letting Joi reject with a
    // generic 400.
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw {
        response: {
          status: 400,
          data: { error: 'items_required', message: 'Order must contain at least one item' },
        },
        message: 'Order must contain at least one item',
      };
    }
    // Normalize item shape: backend expects `product` (ObjectId), `quantity`, `price`.
    body.items = body.items.map((it: any) => ({
      product: it.product ?? it.productId ?? it.id,
      variant: it.variant,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
    }));

    const response = await apiClient.post<Order>('/orders', body);
    if (response && response.success && response.data) {
      return response.data as Order;
    }
    if (response && (response as any).id) {
      return response as any;
    }
    return response as any;
  }

  /**
   * Validate a coupon code for a given cart subtotal.
   *
   * On `success: true` the validated coupon is returned (with discount
   * breakdown). On `success: false` (invalid / expired coupon) the
   * promise rejects with the raw error so callers can react accordingly.
   */
  async validateCoupon(
    couponCode: string,
    subtotal: number
  ): Promise<{
    valid: boolean;
    code?: string;
    discountType?: string;
    discountValue?: number;
    discountAmount?: number;
  }> {
    const response = await apiClient.post<{
      valid: boolean;
      code: string;
      discountType: string;
      discountValue: number;
      discountAmount: number;
    }>('/coupons/validate', { couponCode, subtotal });

    if (response && response.success === false) {
      // Re-throw the original error shape so callers/tests can detect
      // invalid coupons via promise rejection.
      throw response;
    }

    if (response && response.data) {
      return response.data;
    }

    // The mock may return the validated object directly
    return response as any;
  }

  /**
   * Refund a payment (used by checkout integration tests for the
   * "order creation failure rollback" flow).
   */
  async refundPayment(paymentIntentId: string): Promise<{
    status: string;
    paymentIntentId: string;
  }> {
    const response = await apiClient.post<{
      status: string;
      paymentIntentId: string;
    }>('/payments/refund', { paymentIntentId });
    if (response && response.data) {
      return response.data;
    }
    return response as any;
  }

  // Get user orders with filtering
  async getOrders(query: OrdersQuery = {}): Promise<ApiResponse<OrdersResponse>> {
    try {
      const response = await apiClient.get<OrdersResponse>('/orders', query);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch orders',
        message: error?.message || 'Failed to fetch orders',
      };
    }
  }

  // Get order counts (lightweight, for header display)
  async getOrderCounts(): Promise<ApiResponse<OrderCounts>> {
    try {
      const response = await apiClient.get<OrderCounts>('/orders/counts');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch order counts',
        message: error?.message || 'Failed to fetch order counts',
      };
    }
  }

  // Get single order by ID
  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch order',
        message: error?.message || 'Failed to fetch order',
      };
    }
  }

  // Get order tracking
  async getOrderTracking(orderId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/orders/${orderId}/tracking`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch order tracking',
        message: error?.message || 'Failed to fetch order tracking',
      };
    }
  }

  // Cancel order
  async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<ApiResponse<Order>> {
    try {
      // Backend (orderValidators.cancelOrderSchema) requires:
      //   reason: string().trim().min(10).max(500).required()
      // Defend against callers (tests, legacy screens) that pass short
      // strings — we throw a clear error here instead of letting the
      // server respond with an opaque 400.
      const trimmed = (reason || '').trim();
      if (!trimmed) {
        return {
          success: false,
          error: 'Cancellation reason is required',
          message: 'Cancellation reason is required',
        };
      }
      if (trimmed.length < 10) {
        return {
          success: false,
          error: 'Cancellation reason must be at least 10 characters',
          message: 'Cancellation reason must be at least 10 characters',
        };
      }
      if (trimmed.length > 500) {
        return {
          success: false,
          error: 'Cancellation reason must be 500 characters or fewer',
          message: 'Cancellation reason must be 500 characters or fewer',
        };
      }
      const response = await apiClient.patch<Order>(`/orders/${orderId}/cancel`, { reason: trimmed });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to cancel order',
        message: error?.message || 'Failed to cancel order',
      };
    }
  }

  // Rate order
  async rateOrder(
    orderId: string,
    rating: number,
    review?: string
  ): Promise<ApiResponse<Order>> {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        return {
          success: false,
          error: 'Invalid rating',
          message: 'Rating must be between 1 and 5',
        };
      }

      const response = await apiClient.post<Order>(`/orders/${orderId}/rate`, { rating, review });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to rate order',
        message: error?.message || 'Failed to rate order',
      };
    }
  }

  // Get order statistics
  async getOrderStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/orders/stats');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch order statistics',
        message: error?.message || 'Failed to fetch order statistics',
      };
    }
  }

  // Get order analytics
  // Backend exposes /orders/stats (not /orders/analytics). The previous path
  // 404'd; this is a thin alias to the existing endpoint.
  async getOrderAnalytics(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/orders/stats');
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to fetch order analytics',
        message: error?.message || 'Failed to fetch order analytics',
      };
    }
  }

  // Request order return/refund
  async requestReturn(
    orderId: string,
    reason: string,
    items: string[]
  ): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.post<Order>(`/orders/${orderId}/refund-request`, {
        reason,
        refundItems: items.map(itemId => ({ itemId, quantity: 1 })),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to request return',
        message: error?.message || 'Failed to request return',
      };
    }
  }

  // Update order status (admin/store owner)
  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    estimatedDeliveryTime?: string,
    trackingInfo?: any
  ): Promise<ApiResponse<Order>> {
    try {
      const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, {
        status,
        estimatedDeliveryTime,
        trackingInfo
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to update order status',
        message: error?.message || 'Failed to update order status',
      };
    }
  }

}

// Create singleton instance
const ordersService = new OrdersService();

export default ordersService;
