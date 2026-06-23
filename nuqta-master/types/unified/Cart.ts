/**
 * Unified Cart Type Definition
 *
 * This is the CANONICAL cart interface used throughout the application.
 * All cart data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Price stored as number (not string)
 * - Variant stored as structured object
 * - Lock mechanism for inventory management
 */

import { Product, ProductVariantSelection } from './Product';
import { Store } from './Store';

// ============================================================================
// CORE CART ITEM INTERFACE
// ============================================================================

export interface CartItem {
  // ========== IDENTIFIERS ==========
  /** Cart item ID (unique per cart entry) */
  id: string;

  /** Product ID */
  productId: string;

  /** Store ID */
  storeId: string;

  // ========== BASIC INFORMATION ==========
  /** Product name */
  name: string;

  /** Product image URL */
  image: string;

  /** Item category */
  category: 'products' | 'service';

  // ========== PRICING ==========
  /** Current price per unit */
  price: number;

  /** Original price (before discount) */
  originalPrice?: number;

  /** Discounted price */
  discountedPrice?: number;

  /** Discount percentage */
  discountPercentage?: number;

  // ========== QUANTITY ==========
  /** Quantity in cart */
  quantity: number;

  /** Maximum allowed quantity */
  maxQuantity?: number;

  /** Minimum allowed quantity */
  minQuantity?: number;

  // ========== VARIANTS ==========
  /** Selected product variant */
  variant?: ProductVariantSelection;

  /** Variant display text (e.g., "Size: M, Color: Red") */
  variantText?: string;

  // ========== CASHBACK ==========
  /** Cashback amount or percentage */
  cashback: string;

  /** Cashback amount (calculated) */
  cashbackAmount?: number;

  // ========== AVAILABILITY ==========
  /** Inventory information */
  inventory?: CartItemInventory;

  /** Availability status */
  availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';

  // ========== SELECTION STATE ==========
  /** Is item selected for checkout? */
  selected?: boolean;

  // ========== STORE INFORMATION ==========
  /** Store name */
  storeName?: string;

  // ========== LOCK MECHANISM ==========
  /** Is this item locked (temporary reservation)? */
  isLocked?: boolean;

  /** Lock expiration time */
  lockExpiresAt?: Date | string;

  /** Lock ID */
  lockId?: string;

  // ========== METADATA ==========
  /** Special instructions */
  instructions?: string;

  /** Item metadata */
  metadata?: CartItemMetadata;

  /** Timestamp when added to cart */
  addedAt?: Date | string;

  /** Last updated timestamp */
  updatedAt?: Date | string;
}

// ============================================================================
// CART ITEM INVENTORY
// ============================================================================

export interface CartItemInventory {
  /** Available stock */
  stock: number;

  /** Low stock threshold */
  lowStockThreshold?: number;

  /** Track quantity? */
  trackQuantity?: boolean;

  /** Allow backorder? */
  allowBackorder?: boolean;

  /** Reserved count (in other carts) */
  reservedCount?: number;
}

// ============================================================================
// CART ITEM METADATA
// ============================================================================

export interface CartItemMetadata {
  /** For event items */
  slotTime?: string;
  location?: string;
  date?: string;

  /** For service items */
  appointmentDate?: string;
  appointmentTime?: string;

  /** Custom fields */
  [key: string]: any;
}

// ============================================================================
// LOCKED PRODUCT (Temporary Reservation)
// ============================================================================

export interface LockedProduct {
  /** Lock entry ID */
  id: string;

  /** Original product ID */
  productId: string;

  // ========== BASIC INFORMATION ==========
  /** Product name */
  name: string;

  /** Product price */
  price: number;

  /** Product image */
  image: string | number;

  /** Cashback */
  cashback: string;

  /** Category */
  category: 'products' | 'service';

  // ========== LOCK INFORMATION ==========
  /** When was the item locked? */
  lockedAt: Date;

  /** When does the lock expire? */
  expiresAt: Date;

  /** Remaining time in milliseconds */
  remainingTime: number;

  /** Lock duration in milliseconds */
  lockDuration: number;

  /** Lock status */
  status: 'active' | 'expiring' | 'expired';
}

// ============================================================================
// CART STATE
// ============================================================================

export interface CartState {
  /** Product items in cart */
  products: CartItem[];

  /** Service items in cart */
  services: CartItem[];

  /** Locked products (temporary reservations) */
  lockedProducts: LockedProduct[];

  /** Active tab */
  activeTab: 'products' | 'service' | 'lockedproduct';

  /** User ID (if logged in) */
  userId?: string;

  /** Cart ID (for persistent carts) */
  cartId?: string;

  /** Last sync timestamp */
  lastSyncedAt?: Date | string;
}

// ============================================================================
// CART SUMMARY
// ============================================================================

export interface CartSummary {
  /** Total number of items */
  itemCount: number;

  /** Total number of unique products */
  uniqueItemCount: number;

  /** Subtotal (before discounts) */
  subtotal: number;

  /** Total discount amount */
  discount: number;

  /** Total cashback */
  cashback: number;

  /** Tax amount */
  tax: number;

  /** Shipping fee */
  shipping: number;

  /** Grand total */
  total: number;

  /** Currency */
  currency: string;

  /** Applied coupon codes */
  appliedCoupons?: string[];

  /** Total savings */
  totalSavings: number;
}

// ============================================================================
// CART VALIDATION
// ============================================================================

export interface CartValidation {
  /** Is cart valid? */
  isValid: boolean;

  /** Validation errors */
  errors: CartValidationError[];

  /** Validation warnings */
  warnings: CartValidationWarning[];
}

export interface CartValidationError {
  /** Item ID */
  itemId: string;

  /** Error type */
  type:
    | 'out_of_stock'
    | 'price_changed'
    | 'item_unavailable'
    | 'max_quantity_exceeded'
    | 'min_order_not_met';

  /** Error message */
  message: string;

  /** Suggested action */
  action?: 'remove' | 'update_quantity' | 'update_price';
}

export interface CartValidationWarning {
  /** Item ID */
  itemId: string;

  /** Warning type */
  type: 'low_stock' | 'price_increase' | 'lock_expiring';

  /** Warning message */
  message: string;
}

// ============================================================================
// CART OPERATIONS
// ============================================================================

export interface AddToCartRequest {
  /** Product to add */
  product: Product;

  /** Quantity */
  quantity?: number;

  /** Selected variant */
  variant?: ProductVariantSelection;

  /** Metadata */
  metadata?: CartItemMetadata;
}

export interface UpdateCartItemRequest {
  /** Item ID */
  itemId: string;

  /** New quantity */
  quantity?: number;

  /** New variant */
  variant?: ProductVariantSelection;

  /** Update metadata */
  metadata?: Partial<CartItemMetadata>;
}

export interface RemoveFromCartRequest {
  /** Item ID to remove */
  itemId: string;
}

// ============================================================================
// LOCK CONFIGURATION
// ============================================================================

export const LOCK_CONFIG = {
  /** Default lock duration (15 minutes) */
  DEFAULT_DURATION: 15 * 60 * 1000,

  /** Warning threshold (2 minutes) */
  WARNING_THRESHOLD: 2 * 60 * 1000,

  /** Critical threshold (30 seconds) */
  CRITICAL_THRESHOLD: 30 * 1000,

  /** Update interval (1 second) */
  UPDATE_INTERVAL: 1000,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get lock status based on remaining time */
export function getLockStatus(
  remainingTime: number
): 'active' | 'expiring' | 'expired' {
  if (remainingTime <= 0) return 'expired';
  if (remainingTime <= LOCK_CONFIG.WARNING_THRESHOLD) return 'expiring';
  return 'active';
}

/** Calculate cart item total */
export function calculateItemTotal(item: CartItem): number {
  const price = item.discountedPrice || item.price;
  return price * item.quantity;
}

/** Calculate cart subtotal */
export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + calculateItemTotal(item), 0);
}

/** Get selected items */
export function getSelectedItems(items: CartItem[]): CartItem[] {
  return items.filter((item) => item.selected !== false);
}

/** Check if cart is empty */
export function isCartEmpty(state: CartState): boolean {
  return (
    state.products.length === 0 &&
    state.services.length === 0 &&
    state.lockedProducts.length === 0
  );
}

// ============================================================================
// TAB TYPE
// ============================================================================

export type TabType = 'products' | 'service' | 'lockedproduct';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CartPageProps {
  navigation?: any;
  route?: any;
}

export interface CartHeaderProps {
  onBack: () => void;
  title?: string;
}

export interface CartItemProps {
  item: CartItem;
  onRemove: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  showAnimation?: boolean;
}

export interface PriceSectionProps {
  totalPrice: number;
  onBuyNow: () => void;
  itemCount?: number;
  loading?: boolean;
}
