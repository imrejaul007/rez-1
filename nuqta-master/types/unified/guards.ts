/**
 * Type Guards
 *
 * Runtime type checking functions to validate data structures.
 * These functions help ensure type safety at runtime.
 */

import { Product, ProductAvailabilityStatus } from './Product';
import { Store, StoreStatus } from './Store';
import { CartItem } from './Cart';
import { User } from './User';
import { Order, OrderStatus, PaymentStatus } from './Order';
import { Review } from './Review';

// ============================================================================
// PRODUCT TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid Product
 */
export function isProduct(obj: any): obj is Product {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.storeId === 'string' &&
    obj.price !== null &&
    obj.price !== undefined &&
    typeof obj.price.current === 'number' &&
    Array.isArray(obj.images) &&
    obj.inventory !== null &&
    obj.inventory !== undefined &&
    typeof obj.inventory.stock === 'number' &&
    ['product', 'service'].includes(obj.productType)
  ) === true;
}

/**
 * Check if product is available for purchase
 */
export function isProductAvailable(product: Product): boolean {
  if (product.availabilityStatus) {
    return (
      product.availabilityStatus === 'in_stock' ||
      product.availabilityStatus === 'low_stock'
    );
  }

  if (product.inventory) {
    return product.inventory.isAvailable && product.inventory.stock > 0;
  }

  return true;
}

/**
 * Check if product is low on stock
 */
export function isProductLowStock(product: Product): boolean {
  if (product.availabilityStatus === 'low_stock') {
    return true;
  }

  if (product.inventory) {
    const threshold = product.inventory.lowStockThreshold || 5;
    return (
      product.inventory.stock > 0 && product.inventory.stock <= threshold
    );
  }

  return false;
}

/**
 * Check if product is out of stock
 */
export function isProductOutOfStock(product: Product): boolean {
  return (
    product.availabilityStatus === 'out_of_stock' ||
    (product.inventory && product.inventory.stock <= 0)
  );
}

/**
 * Check if product is on sale
 */
export function isProductOnSale(product: Product): boolean {
  return (
    product.isOnSale === true ||
    (product.price.original !== undefined &&
      product.price.current < product.price.original)
  );
}

// ============================================================================
// STORE TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid Store
 */
export function isStore(obj: any): obj is Store {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    obj.location &&
    typeof obj.location.address === 'string' &&
    obj.hours &&
    obj.status &&
    typeof obj.verified === 'boolean' &&
    ['physical', 'online', 'both'].includes(obj.storeType)
  );
}

/**
 * Check if store is currently open
 */
export function isStoreOpen(store: Store): boolean {
  return store.status.isOpen === true && store.status.status === 'open';
}

/**
 * Check if store is verified
 */
export function isStoreVerified(store: Store): boolean {
  return store.verified === true;
}

/**
 * Check if store supports delivery
 */
export function isDeliveryAvailable(store: Store): boolean {
  return store.delivery?.isAvailable === true;
}

/**
 * Check if store supports pickup
 */
export function isPickupAvailable(store: Store): boolean {
  return store.pickup?.isAvailable === true;
}

// ============================================================================
// CART TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid CartItem
 */
export function isCartItem(obj: any): obj is CartItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.productId === 'string' &&
    typeof obj.storeId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.quantity === 'number' &&
    ['products', 'service'].includes(obj.category)
  );
}

/**
 * Check if cart item is available
 */
export function isCartItemAvailable(item: CartItem): boolean {
  if (item.availabilityStatus === 'out_of_stock') {
    return false;
  }

  if (item.inventory) {
    return item.inventory.stock >= item.quantity;
  }

  return true;
}

/**
 * Check if cart item is locked
 */
export function isCartItemLocked(item: CartItem): boolean {
  if (!item.isLocked) return false;

  if (item.lockExpiresAt) {
    const expiresAt = new Date(item.lockExpiresAt);
    return expiresAt > new Date();
  }

  return false;
}

// ============================================================================
// USER TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid User
 */
export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    obj.profile &&
    typeof obj.profile.name === 'string' &&
    obj.preferences &&
    ['user', 'merchant', 'admin', 'moderator'].includes(obj.role) &&
    typeof obj.isActive === 'boolean'
  );
}

/**
 * Check if user is verified
 */
export function isUserVerified(user: User): boolean {
  return user.emailVerified === true;
}

/**
 * Check if user is admin
 */
export function isUserAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Check if user is merchant
 */
export function isUserMerchant(user: User): boolean {
  return user.role === 'merchant';
}

// ============================================================================
// ORDER TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid Order
 */
export function isOrder(obj: any): obj is Order {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.orderNumber === 'string' &&
    typeof obj.userId === 'string' &&
    Array.isArray(obj.items) &&
    obj.pricing !== null &&
    obj.pricing !== undefined &&
    typeof obj.pricing.total === 'number' &&
    obj.shippingAddress !== null &&
    obj.shippingAddress !== undefined &&
    obj.paymentMethod !== null &&
    obj.paymentMethod !== undefined
  ) === true;
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(order: Order): boolean {
  if (order.canCancel === false) return false;

  const nonCancellableStatuses: OrderStatus[] = [
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded',
    'returned',
  ];

  return !nonCancellableStatuses.includes(order.status);
}

/**
 * Check if order can be returned
 */
export function canReturnOrder(order: Order): boolean {
  if (order.canReturn === false) return false;

  return order.status === 'delivered' && !order.return;
}

/**
 * Check if order is paid
 */
export function isOrderPaid(order: Order): boolean {
  return order.paymentStatus === 'paid';
}

/**
 * Check if order is delivered
 */
export function isOrderDelivered(order: Order): boolean {
  return order.status === 'delivered';
}

// ============================================================================
// REVIEW TYPE GUARDS
// ============================================================================

/**
 * Check if an object is a valid Review
 */
export function isReview(obj: any): obj is Review {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.user &&
    typeof obj.user.id === 'string' &&
    typeof obj.rating === 'number' &&
    obj.rating >= 1 &&
    obj.rating <= 5 &&
    typeof obj.comment === 'string' &&
    ['product', 'store', 'order'].includes(obj.type)
  );
}

/**
 * Check if review is verified purchase
 */
export function isVerifiedReview(review: Review): boolean {
  return review.verified === true;
}

/**
 * Check if review has images
 */
export function hasReviewImages(review: Review): boolean {
  return Array.isArray(review.images) && review.images.length > 0;
}

/**
 * Check if review has merchant reply
 */
export function hasMerchantReply(review: Review): boolean {
  return review.merchantReply !== undefined && review.merchantReply !== null;
}

/**
 * Check if review is recent (within 30 days)
 */
export function isRecentReview(review: Review): boolean {
  const createdAt = new Date(review.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return createdAt >= thirtyDaysAgo;
}

// ============================================================================
// GENERIC TYPE GUARDS
// ============================================================================

/**
 * Check if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: any): value is number {
  return isValidNumber(value) && value > 0;
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if array is non-empty
 */
export function isNonEmptyArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}
