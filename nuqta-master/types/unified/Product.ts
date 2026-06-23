/**
 * Unified Product Type Definition
 *
 * This is the CANONICAL product interface used throughout the application.
 * All product data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Price structure: Nested object with current, original, currency, discount
 * - Rating structure: Nested object with value, count, breakdown
 * - Image structure: Array of image objects with url, alt, thumbnail, fullsize
 */

// ============================================================================
// CORE PRODUCT INTERFACE
// ============================================================================

export interface Product {
  // ========== IDENTIFIERS ==========
  /** Primary identifier - ALWAYS use 'id', never '_id' */
  id: string;

  /** Store/Merchant identifier */
  storeId: string;

  /** Product SKU for inventory management */
  sku?: string;

  /** Product barcode (EAN, UPC, etc.) */
  barcode?: string;

  /** URL-friendly slug for SEO */
  slug?: string;

  // ========== BASIC INFORMATION ==========
  /** Product name (primary) */
  name: string;

  /** Alternative title field (for compatibility) */
  title?: string;

  /** Detailed product description */
  description: string;

  /** Short description for cards/previews */
  shortDescription?: string;

  /** Brand name */
  brand?: string;

  // ========== CATEGORIZATION ==========
  /** Product category */
  category: ProductCategory | string;

  /** Product subcategory */
  subcategory?: string;

  /** Product tags for filtering/search */
  tags: string[];

  /** Product type */
  productType: 'product' | 'service';

  /** Service category (for travel/booking services) */
  serviceCategory?: {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
    cashbackPercentage?: number;
    id?: string;
  };

  /** Service details (for service-type products) */
  serviceDetails?: {
    duration?: number;
    serviceType?: string;
    maxBookingsPerSlot?: number;
    requiresAddress?: boolean;
    requiresPaymentUpfront?: boolean;
    serviceCategory?: string;
    serviceArea?: { cities?: string[] };
  };

  // ========== PRICING ==========
  /** Unified price structure */
  price: ProductPrice;

  // ========== IMAGES ==========
  /** Array of product images */
  images: ProductImage[];

  /** Primary image URL (for quick access) */
  primaryImage?: string;

  // ========== RATINGS & REVIEWS ==========
  /** Rating information */
  rating?: ProductRating;

  // ========== INVENTORY & AVAILABILITY ==========
  /** Inventory information */
  inventory: ProductInventory;

  /** Availability status */
  availabilityStatus: ProductAvailabilityStatus;

  // ========== STORE INFORMATION ==========
  /** Store name */
  storeName?: string;

  /** Detailed store information */
  store?: ProductStoreInfo;

  // ========== CASHBACK & DISCOUNTS ==========
  /** Cashback information */
  cashback?: ProductCashback;

  /** Discount percentage (deprecated - use price.discount) */
  discount?: number;

  // ========== PRODUCT VARIANTS ==========
  /** Product variants (size, color, etc.) */
  variants?: ProductVariant[];

  /** Selected variant information */
  selectedVariant?: ProductVariantSelection;

  // ========== SPECIFICATIONS ==========
  /** Product specifications (key-value pairs) */
  specifications?: Record<string, string>;

  /** Product features list */
  features?: string[];

  /** Product dimensions */
  dimensions?: ProductDimensions;

  /** Product weight */
  weight?: ProductWeight;

  // ========== FLAGS & BADGES ==========
  /** Is this a new arrival? */
  isNewArrival?: boolean;

  /** Is this a featured product? */
  isFeatured?: boolean;

  /** Is this a trending product? */
  isTrending?: boolean;

  /** Is this a bestseller? */
  isBestseller?: boolean;

  /** Is this on sale? */
  isOnSale?: boolean;

  // ========== METADATA ==========
  /** Creation timestamp */
  createdAt?: string | Date;

  /** Last update timestamp */
  updatedAt?: string | Date;

  /** View count */
  viewCount?: number;

  /** Purchase count */
  purchaseCount?: number;

  /** Wishlist count */
  wishlistCount?: number;

  // ========== SEO & ANALYTICS ==========
  /** Meta title for SEO */
  metaTitle?: string;

  /** Meta description for SEO */
  metaDescription?: string;

  /** Keywords for SEO */
  keywords?: string[];

  // ========== SHIPPING & DELIVERY ==========
  /** Shipping information */
  shipping?: ProductShipping;

  // ========== ADDITIONAL DATA ==========
  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// PRICE STRUCTURE
// ============================================================================

export interface ProductPrice {
  /** Current selling price (REQUIRED) */
  current: number;

  /** Original/MRP price (for showing discounts) */
  original?: number;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Discount percentage */
  discount?: number;

  /** Amount saved (original - current) */
  savings?: number;

  /** Formatted price string (e.g., "₹2,999") */
  formatted?: string;

  /** Formatted original price string */
  originalFormatted?: string;

  /** Tax information */
  tax?: {
    rate: number;
    amount: number;
    inclusive: boolean;
  };
}

// ============================================================================
// IMAGE STRUCTURE
// ============================================================================

export interface ProductImage {
  /** Image identifier */
  id?: string;

  /** Image URL (REQUIRED) */
  url: string;

  /** Alt text for accessibility */
  alt: string;

  /** Thumbnail URL (optimized for small displays) */
  thumbnail?: string;

  /** Full-size URL (high resolution) */
  fullsize?: string;

  /** Image width in pixels */
  width?: number;

  /** Image height in pixels */
  height?: number;

  /** Display order */
  order?: number;

  /** Is this the primary image? */
  isPrimary?: boolean;
}

// ============================================================================
// RATING STRUCTURE
// ============================================================================

export interface ProductRating {
  /** Average rating value (0-5) */
  value: number;

  /** Total number of ratings */
  count: number;

  /** Maximum possible rating (default: 5) */
  maxValue?: number;

  /** Rating distribution by stars */
  breakdown?: ProductRatingBreakdown;
}

export interface ProductRatingBreakdown {
  /** Number of 5-star ratings */
  5: number;

  /** Number of 4-star ratings */
  4: number;

  /** Number of 3-star ratings */
  3: number;

  /** Number of 2-star ratings */
  2: number;

  /** Number of 1-star ratings */
  1: number;
}

// ============================================================================
// INVENTORY STRUCTURE
// ============================================================================

export interface ProductInventory {
  /** Current stock quantity */
  stock: number;

  /** Is product available? */
  isAvailable: boolean;

  /** Low stock threshold */
  lowStockThreshold?: number;

  /** Should quantity be tracked? */
  trackQuantity?: boolean;

  /** Allow backorders? */
  allowBackorder?: boolean;

  /** Reserved quantity (in other carts) */
  reservedCount?: number;

  /** Estimated restock date */
  estimatedRestockDate?: string | Date;

  /** Maximum order quantity */
  maxOrderQuantity?: number;

  /** Minimum order quantity */
  minOrderQuantity?: number;
}

export type ProductAvailabilityStatus =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'pre_order'
  | 'discontinued'
  | 'coming_soon';

// ============================================================================
// CATEGORY STRUCTURE
// ============================================================================

export interface ProductCategory {
  /** Category identifier */
  id: string;

  /** Category name */
  name: string;

  /** URL-friendly slug */
  slug: string;

  /** Category description */
  description?: string;

  /** Category icon */
  icon?: string;

  /** Category image */
  image?: string;

  /** Parent category ID */
  parentId?: string;

  /** Category level (0 = root) */
  level: number;

  /** Display order */
  order?: number;
}

// ============================================================================
// STORE INFORMATION
// ============================================================================

export interface ProductStoreInfo {
  /** Store identifier */
  id: string;

  /** Store name */
  name: string;

  /** Store logo */
  logo?: string;

  /** Store image */
  image?: string;

  /** Store rating */
  rating?: number;

  /** Number of ratings */
  ratingCount?: number;

  /** Store location */
  location?: string;

  /** Estimated delivery time */
  deliveryTime?: string;

  /** Minimum order amount */
  minimumOrder?: number;

  /** Is store verified? */
  isVerified?: boolean;

  /** Is store open? */
  isOpen?: boolean;
}

// ============================================================================
// CASHBACK STRUCTURE
// ============================================================================

export interface ProductCashback {
  /** Cashback percentage */
  percentage?: number;

  /** Fixed cashback amount */
  amount?: number;

  /** Maximum cashback limit */
  maxAmount?: number;

  /** Minimum purchase required */
  minPurchase?: number;

  /** Cashback description */
  description?: string;
}

// ============================================================================
// VARIANT STRUCTURE
// ============================================================================

export interface ProductVariant {
  /** Variant identifier */
  id: string;

  /** Variant name */
  name: string;

  /** Variant type (size, color, material, etc.) */
  type: 'size' | 'color' | 'material' | 'style' | 'custom';

  /** Available options */
  options: ProductVariantOption[];

  /** Is this variant required? */
  required?: boolean;
}

export interface ProductVariantOption {
  /** Option identifier */
  id: string;

  /** Option value */
  value: string;

  /** Option label */
  label?: string;

  /** Is this option available? */
  isAvailable?: boolean;

  /** Price adjustment for this option */
  priceAdjustment?: number;

  /** Stock for this option */
  stock?: number;

  /** Image for this option (e.g., color swatch) */
  image?: string;
}

export interface ProductVariantSelection {
  [variantType: string]: string;
}

// ============================================================================
// DIMENSIONS & WEIGHT
// ============================================================================

export interface ProductDimensions {
  /** Length */
  length: number;

  /** Width */
  width: number;

  /** Height */
  height: number;

  /** Unit (cm, in, etc.) */
  unit: 'cm' | 'in' | 'm';
}

export interface ProductWeight {
  /** Weight value */
  value: number;

  /** Weight unit */
  unit: 'kg' | 'g' | 'lb' | 'oz';
}

// ============================================================================
// SHIPPING STRUCTURE
// ============================================================================

export interface ProductShipping {
  /** Is free shipping available? */
  freeShipping?: boolean;

  /** Shipping cost */
  cost?: number;

  /** Estimated delivery time */
  estimatedDelivery?: string;

  /** Shipping methods available */
  methods?: string[];

  /** Is express delivery available? */
  expressDeliveryAvailable?: boolean;

  /** Express delivery cost */
  expressDeliveryCost?: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Product with required fields for cart */
export type CartProduct = Pick<Product, 'id' | 'name' | 'price' | 'images' | 'storeId' | 'storeName'>;

/** Product with required fields for wishlist */
export type WishlistProduct = Pick<Product, 'id' | 'name' | 'price' | 'images' | 'storeId' | 'availabilityStatus'>;

/** Minimal product for cards/previews */
export type ProductPreview = Pick<Product, 'id' | 'name' | 'price' | 'images' | 'rating' | 'availabilityStatus'>;

/** Product for search results */
export type SearchProduct = Pick<Product, 'id' | 'name' | 'description' | 'price' | 'images' | 'rating' | 'category' | 'tags'>;
