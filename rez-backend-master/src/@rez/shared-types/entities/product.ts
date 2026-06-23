// @ts-nocheck
/**
 * Product entity — canonical shape for the `products` collection.
 *
 * Mirrors rezbackend/src/models/Product.ts. Covers both `productType: 'product'`
 * (physical SKU) and `productType: 'service'` (appointment-based).
 *
 * Historical drift fixed here:
 *   - Pricing uses `selling` + `original` (matching the backend schema), NOT
 *     the older `price.current / price.original` shape some legacy callers
 *     wrote. Consumers should migrate to read `pricing.selling`.
 *   - Images are canonical objects `{url, alt, isPrimary}`. Stored as JSON
 *     strings in the DB — use the backend's `Product.parseImage()` helper.
 */

import type { ProductId, CategoryId, StoreId, MerchantId } from '../branded/ids';

export type ProductType = 'product' | 'service';
export type ProductVisibility = 'public' | 'hidden' | 'featured';
export type ProductTaxSlab = '0' | '5' | '12' | '18' | '28' | 'exempt';
export type ProductMenuPeriod = 'all_day' | 'breakfast' | 'lunch' | 'dinner' | 'custom';
export type ProductServiceLocation = 'home' | 'store' | 'online';
export type ProductCancellationFee = 'none' | 'partial' | 'full';

/**
 * GST tax configuration — applied at the product level for line-item billing.
 */
export interface IProductGST {
  hsnCode?: string;
  sacCode?: string;
  /** Total GST rate as a percentage (e.g. 5, 12, 18, 28). */
  gstRate?: number;
  taxSlab?: ProductTaxSlab;
  /** true for inter-state supply (IGST). false/undefined = CGST+SGST. */
  isIGST?: boolean;
}

export interface IProductPricing {
  /** MRP / list price (before any discount). */
  original: number;
  /** Actual selling price (after permanent discount if any). */
  selling: number;
  /** Percentage discount off the original price, if derivable. */
  discount?: number;
  /** ISO-4217 currency. Defaults to INR. */
  currency: string;
  /** Optional bulk-pricing tiers. */
  bulk?: Array<{ minQuantity: number; price: number }>;
  gst?: IProductGST;
}

export interface IProductVariant {
  variantId: string;
  /** 'size' | 'color' | 'flavor' | any merchant-defined dimension. */
  type: string;
  /** 'XL' | 'Red' | 'Chocolate' | etc. */
  value: string;
  /** Free-form attributes — merchant-defined. */
  attributes?: Record<string, string>;
  /** Override price — falls back to base pricing.selling if unset. */
  price?: number;
  compareAtPrice?: number;
  stock: number;
  sku?: string;
  images?: string[];
  barcode?: string;
  /** Grams. */
  weight?: number;
  isAvailable?: boolean;
}

export interface IProductInventory {
  stock: number;
  isAvailable: boolean;
  lowStockThreshold?: number;
  variants?: IProductVariant[];
  /** Set for digital products that cannot go out of stock. */
  unlimited: boolean;
  estimatedRestockDate?: Date | string;
  allowBackorder?: boolean;
  /** Stock locked by pending orders (subtract from `stock` for availability). */
  reservedStock?: number;
}

/** Per-star rating distribution. */
export interface IProductRatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface IProductRating {
  /** Average score in [0, 5]. */
  average: number;
  /** Total review count. */
  count: number;
  distribution: IProductRatingDistribution;
}

/** Cached review stats. Lags `rating` slightly but survives review soft-deletes. */
export interface IProductReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: IProductRatingDistribution;
  lastUpdated?: Date | string;
}

export interface IProductSpecification {
  key: string;
  value: string;
  group?: string;
}

export interface IProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  metaTags?: Record<string, string>;
}

export interface IProductAnalytics {
  views: number;
  purchases: number;
  conversions: number;
  wishlistAdds: number;
  shareCount: number;
  returnRate: number;
  avgRating: number;
  todayPurchases?: number;
  todayViews?: number;
  lastResetDate?: Date | string;
}

export interface IProductCashback {
  /** Percentage, 0-100. */
  percentage: number;
  maxAmount?: number;
  minPurchase?: number;
  validUntil?: Date | string;
  terms?: string;
  isActive?: boolean;
  conditions?: string[];
}

export interface IProductDeliveryInfo {
  estimatedDays?: string;
  freeShippingThreshold?: number;
  expressAvailable?: boolean;
  standardDeliveryTime?: string;
  expressDeliveryTime?: string;
  deliveryPartner?: string;
}

export interface IFrequentlyBoughtWith {
  productId: string;
  purchaseCount: number;
  lastUpdated?: Date | string;
}

export interface IServiceDetails {
  /** Minutes. */
  duration: number;
  serviceType: ProductServiceLocation;
  maxBookingsPerSlot: number;
  /** Home services must collect a delivery address. */
  requiresAddress: boolean;
  /** Merchant choice: pay now vs. pay-at-visit. */
  requiresPaymentUpfront: boolean;
  serviceArea?: { radius: number; cities?: string[] };
  serviceCategory?: string;
  /** Hours before appointment that a free cancellation is permitted. */
  freeCancellationHours?: number;
  lateCancellationFee?: ProductCancellationFee;
  /** Used when lateCancellationFee is 'partial' or 'full'. */
  cancellationFeeAmount?: number;
}

export interface IModifierOption {
  label: string;
  /** Additional price for this option (can be 0). */
  price: number;
  isDefault?: boolean;
}

export interface IModifier {
  _id?: string;
  name: string;
  required?: boolean;
  multiSelect?: boolean;
  options: IModifierOption[];
}

/**
 * Canonical image shape. Stored as JSON strings in the DB; use the backend
 * `Product.parseImage()` / `parseImages()` helpers to deserialize.
 */
export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface IProduct {
  _id?: string | ProductId;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  productType: ProductType;
  category: string | CategoryId;
  subCategory?: string | CategoryId;
  subSubCategory?: string;
  store: string | StoreId;
  merchantId?: string | MerchantId;
  brand?: string;
  model?: string;
  sku: string;
  barcode?: string;
  /** Image URLs OR serialized IProductImage JSON strings. */
  images: string[];
  videos?: string[];
  pricing: IProductPricing;
  inventory: IProductInventory;
  ratings: IProductRating;
  reviewStats?: IProductReviewStats;
  specifications: IProductSpecification[];
  tags: string[];
  seo: IProductSEO;
  analytics: IProductAnalytics;
  cashback?: IProductCashback;
  deliveryInfo?: IProductDeliveryInfo;
  serviceDetails?: IServiceDetails;
  serviceCategory?: string;
  bundleProducts?: string[];
  frequentlyBoughtWith?: IFrequentlyBoughtWith[];
  modifiers?: IModifier[];
  /** HH:mm. Default '00:00'. */
  availableFrom?: string;
  /** HH:mm. Default '23:59'. */
  availableTo?: string;
  menuPeriod?: ProductMenuPeriod;
  /** 86'd ("eighty-sixed") — temporarily unavailable mid-service. */
  is86d?: boolean;
  /** Auto-restore time when `is86d` is true. */
  restores86At?: Date | string;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  visibility?: ProductVisibility;
  /** Grams. */
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'inch';
  };
  shippingInfo?: {
    weight: number;
    freeShipping: boolean;
    shippingCost?: number;
    /** e.g. "1-2 days". */
    processingTime?: string;
  };
  relatedProducts?: string[];
  occasion?: string;
  createdAt: Date | string;
  updatedAt: Date | string;

  isDeleted: boolean;
  deletedAt?: Date | string;
  deletedBy?: string;
  deletedByModel?: 'User' | 'Merchant';

  adminApproved?: boolean;
  adminNotes?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  deactivatedReason?: string;
  lowStockAlert?: number;

  isPriveReviewEligible?: boolean;
  priveReviewRewardCoins?: number;
}
