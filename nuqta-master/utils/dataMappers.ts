/**
 * Data Mappers
 * Transform data between backend API responses and frontend component types
 */

import { Cart as BackendCart, CartItem as BackendCartItem } from '@/services/cartApi';
import { Order as BackendOrder, CreateOrderRequest } from '@/services/ordersApi';

// ============================================
// CART MAPPERS
// ============================================

/**
 * Map backend cart item to frontend cart item format
 */
export function mapBackendCartItemToFrontend(backendItem: BackendCartItem): any | null {
  // Skip items with null product (data integrity issue)
  if (!backendItem.product) {
    return null;
  }

  // Handle both string array and object array for images

  const imageUrl = backendItem.product.images?.[0]
    ? (typeof backendItem.product.images[0] === 'string'
        ? backendItem.product.images[0]
        : (backendItem.product.images[0] as any)?.url || '')
    : '';

  return {
    id: backendItem._id,
    productId: backendItem.product._id,
    name: backendItem.product.name,
    image: imageUrl,
    price: backendItem.price,
    originalPrice: backendItem.originalPrice || backendItem.price,
    discount: backendItem.discount || 0, // Lock fee discount (only applies to lockedQuantity items)
    lockedQuantity: (backendItem as any).lockedQuantity || 0, // How many items have lock fee applied
    quantity: backendItem.quantity,
    store: backendItem.store ? {
      id: backendItem.store._id,
      name: backendItem.store.name,
      location: backendItem.store.location,
    } : null,
    variant: backendItem.variant,
    addedAt: backendItem.addedAt,
    notes: (backendItem as any).notes, // For lock fee notes
    // Item type: 'product', 'service', or 'event'
    itemType: (backendItem as any).itemType || 'product',
    // Service booking details (for services)
    serviceBookingDetails: (backendItem as any).serviceBookingDetails || null,
    // Event/other metadata
    metadata: (backendItem as any).metadata || null,
    // Calculated fields - subtract lock fee discount from subtotal
    subtotal: (backendItem.price * backendItem.quantity) - (backendItem.discount || 0),
    savings: backendItem.originalPrice
      ? (backendItem.originalPrice - backendItem.price) * backendItem.quantity
      : 0,
  };
}

/**
 * Map backend cart to frontend cart format
 */
export function mapBackendCartToFrontend(backendCart: BackendCart): any {
  // Map and filter out null items (corrupted data)
  const mappedItems = backendCart.items
    .map(mapBackendCartItemToFrontend)
    .filter((item): item is any => item !== null);

  return {
    id: backendCart._id,
    userId: backendCart.user,
    items: mappedItems,
    totals: {
      subtotal: backendCart.totals.subtotal,
      tax: backendCart.totals.tax,
      shipping: backendCart.totals.delivery, // Map delivery -> shipping
      discount: backendCart.totals.discount,
      cashback: backendCart.totals.cashback,
      total: backendCart.totals.total,
      savings: backendCart.totals.savings,
    },
    coupon: backendCart.coupon ? {
      code: backendCart.coupon.code,
      discountType: backendCart.coupon.discountType,
      discountValue: backendCart.coupon.discountValue,
      appliedAmount: backendCart.coupon.appliedAmount,
      appliedAt: backendCart.coupon.appliedAt,
    } : null,
    itemCount: backendCart.itemCount,
    storeCount: backendCart.storeCount,
    isActive: backendCart.isActive,
    expiresAt: backendCart.expiresAt,
    createdAt: backendCart.createdAt,
    updatedAt: backendCart.updatedAt,
  };
}

// ============================================
// ORDER MAPPERS
// ============================================

/**
 * Map frontend checkout data to backend order request
 */
export function mapFrontendCheckoutToBackendOrder(checkoutData: {
  deliveryAddress: any;
  paymentMethod: string;
  specialInstructions?: string;
  couponCode?: string;
  storeId?: string;
  items?: Array<{ product: string; quantity: number; price: number; name?: string }>;
  coinsUsed?: { rezCoins: number; promoCoins: number; storePromoCoins: number; totalCoinsValue?: number; wasilCoins?: number };
  fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
  fulfillmentDetails?: { tableNumber?: string; vehicleInfo?: string; pickupInstructions?: string };
}): CreateOrderRequest {
  const fulfillmentType = checkoutData.fulfillmentType || 'delivery';
  const isDelivery = fulfillmentType === 'delivery';

  // Handle missing or incomplete delivery address
  const address = checkoutData.deliveryAddress || {};
  
  const addressLine1 = address.addressLine1 || 
                       address.address1 || 
                       address.street || 
                       address.address ||
                       (isDelivery ? 'Address not provided' : '');
  
  const city = address.city || (isDelivery ? 'City not provided' : '');
  const state = address.state || (isDelivery ? 'State not provided' : '');
  const pincode = address.pincode || address.zipCode || address.postalCode || (isDelivery ? '000000' : '');
  
  const name = address.name ||
               `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
               'Customer';
  
  const phone = address.phone || address.phoneNumber || '0000000000';
  
  const result: CreateOrderRequest = {
    fulfillmentType,
    paymentMethod: mapPaymentMethod(checkoutData.paymentMethod),
    specialInstructions: checkoutData.specialInstructions,
    couponCode: checkoutData.couponCode,
  };

  // Include delivery address for delivery orders (always), or minimal for others
  if (isDelivery) {
    result.deliveryAddress = {
      name,
      phone,
      addressLine1,
      addressLine2: address.addressLine2 || address.address2 || '',
      city,
      state,
      pincode,
      landmark: address.landmark || '',
      addressType: address.addressType || 'home',
    };
  } else {
    result.deliveryAddress = { name, phone, addressLine1, city, state, pincode };
  }

  // Include fulfillment details for non-delivery types
  if (checkoutData.fulfillmentDetails) {
    result.fulfillmentDetails = checkoutData.fulfillmentDetails;
  }

  if (checkoutData.storeId) {
    result.storeId = checkoutData.storeId;
  }
  if (checkoutData.items) {
    result.items = checkoutData.items;
  }
  if (checkoutData.coinsUsed) {
    result.coinsUsed = checkoutData.coinsUsed;
  }

  // Creator pick attribution
  try {
    if (typeof localStorage !== 'undefined') {
      const pickId = localStorage.getItem('attribution_pick_id');
      if (pickId) {
        result.pickId = pickId;
        localStorage.removeItem('attribution_pick_id');
      }
    }
  } catch {}

  return result;
}

/**
 * Map payment method names
 */
function mapPaymentMethod(method: string): 'cod' | 'card' | 'upi' | 'wallet' | 'netbanking' | 'razorpay' {
  const methodMap: { [key: string]: 'cod' | 'card' | 'upi' | 'wallet' | 'netbanking' | 'razorpay' } = {
    'cash': 'cod',
    'cash_on_delivery': 'cod',
    'cod': 'cod',
    'credit_card': 'card',
    'debit_card': 'card',
    'card': 'card',
    'upi': 'upi',
    'wallet': 'wallet',
    'net_banking': 'netbanking',
    'netbanking': 'netbanking',
    'razorpay': 'razorpay',
    'online': 'razorpay',
    'online_payment': 'razorpay',
  };

  const normalized = method.toLowerCase().replace(/\s+/g, '_');
  return methodMap[normalized] || 'razorpay';
}

/**
 * Map backend order to frontend order format
 */
export function mapBackendOrderToFrontend(backendOrder: BackendOrder): any {
  // Extract delivery address from backend - it can be in delivery.address or shippingAddress
  const deliveryAddressData = (backendOrder as any).delivery?.address || backendOrder.shippingAddress;
  const mappedDeliveryAddress = mapBackendAddressToFrontend(deliveryAddressData);

  // Get delivery fee from multiple possible sources
  const deliveryFee = (backendOrder as any).totals?.delivery ||
                      (backendOrder as any).delivery?.deliveryFee ||
                      backendOrder.summary?.shipping || 0;

  return {
    id: backendOrder.id || (backendOrder as any)._id,
    orderNumber: backendOrder.orderNumber,
    userId: backendOrder.userId || (backendOrder as any).user,
    status: mapOrderStatus(backendOrder.status),
    items: (backendOrder.items || []).map((item: any) => ({
      id: item._id || item.id,
      productId: item.product?._id || item.product,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
      originalPrice: item.originalPrice,
      discount: item.discount,
      subtotal: item.subtotal,
      variant: item.variant,
      store: item.store ? {
        id: item.store._id || item.store,
        name: item.store.name,
      } : null,
    })),
    // Provide BOTH naming conventions for backwards compatibility
    totals: {
      subtotal: backendOrder.summary?.subtotal || (backendOrder as any).totals?.subtotal || 0,
      shipping: deliveryFee, // For legacy code expecting 'shipping'
      delivery: deliveryFee, // For code expecting 'delivery'
      tax: backendOrder.summary?.tax || (backendOrder as any).totals?.tax || 0,
      discount: backendOrder.summary?.discount || (backendOrder as any).totals?.discount || 0,
      lockFeeDiscount: (backendOrder as any).totals?.lockFeeDiscount || 0,
      cashback: (backendOrder as any).totals?.cashback || 0,
      total: backendOrder.summary?.total || (backendOrder as any).totals?.total || 0,
      paidAmount: (backendOrder as any).totals?.paidAmount || 0,
      refundAmount: (backendOrder as any).totals?.refundAmount || 0,
    },
    // Deal redemption info
    redemption: (backendOrder as any).redemption || undefined,
    // Keep at root level for backwards compatibility
    deliveryAddress: mappedDeliveryAddress,
    // Also provide legacy summary field
    summary: {
      subtotal: backendOrder.summary?.subtotal || (backendOrder as any).totals?.subtotal || 0,
      shipping: deliveryFee,
      tax: backendOrder.summary?.tax || (backendOrder as any).totals?.tax || 0,
      discount: backendOrder.summary?.discount || (backendOrder as any).totals?.discount || 0,
      total: backendOrder.summary?.total || (backendOrder as any).totals?.total || 0,
    },
    payment: {
      method: (backendOrder as any).payment?.method || 'cod',
      status: backendOrder.paymentStatus || (backendOrder as any).payment?.status || 'pending',
      coinsUsed: (backendOrder as any).payment?.coinsUsed || null,
    },
    // Include address in delivery object for code expecting order.delivery.address
    delivery: {
      status: (backendOrder as any).delivery?.status || 'pending',
      method: (backendOrder as any).delivery?.method || 'standard',
      estimatedTime: (backendOrder as any).delivery?.estimatedTime,
      deliveredAt: (backendOrder as any).delivery?.deliveredAt,
      deliveryFee: deliveryFee,
      address: mappedDeliveryAddress, // Include address here for code checking order.delivery?.address
    },
    timeline: (backendOrder.timeline || []).map((entry: any) => ({
      status: entry.status,
      message: entry.message,
      timestamp: entry.timestamp,
    })),
    couponCode: (backendOrder as any).couponCode || backendOrder.coupon?.code,
    specialInstructions: (backendOrder as any).specialInstructions || backendOrder.notes,
    cancellation: (backendOrder as any).cancellation,
    rating: (backendOrder as any).rating,
    createdAt: backendOrder.createdAt,
    updatedAt: backendOrder.updatedAt,
  };
}

/**
 * Map order status from backend to frontend
 */
function mapOrderStatus(backendStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'placed': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'processing',
    'ready': 'processing',
    'dispatched': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'returned': 'refunded',
    'refunded': 'refunded',
  };

  return statusMap[backendStatus] || backendStatus;
}

/**
 * Map backend address to frontend address format
 */
function mapBackendAddressToFrontend(backendAddress: any): any {
  if (!backendAddress) return null;

  return {
    name: backendAddress.name,
    firstName: backendAddress.name?.split(' ')[0] || '',
    lastName: backendAddress.name?.split(' ').slice(1).join(' ') || '',
    phone: backendAddress.phone,
    phoneNumber: backendAddress.phone,
    addressLine1: backendAddress.addressLine1 || backendAddress.address1,
    address1: backendAddress.addressLine1 || backendAddress.address1,
    addressLine2: backendAddress.addressLine2 || backendAddress.address2,
    address2: backendAddress.addressLine2 || backendAddress.address2,
    city: backendAddress.city,
    state: backendAddress.state,
    pincode: backendAddress.pincode,
    zipCode: backendAddress.pincode || backendAddress.zipCode,
    country: backendAddress.country || 'India',
    landmark: backendAddress.landmark,
    addressType: backendAddress.addressType || 'home',
  };
}

/**
 * Map orders list response
 */
export function mapBackendOrdersListToFrontend(backendResponse: any): any {
  return {
    orders: (backendResponse.orders || []).map(mapBackendOrderToFrontend),
    pagination: backendResponse.pagination || {
      page: 1,
      limit: 20,
      total: backendResponse.orders?.length || 0,
      totalPages: 1,
    },
    stats: backendResponse.summary || backendResponse.stats,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = '₹'): string {
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercentage(original: number, current: number): number {
  if (original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}
