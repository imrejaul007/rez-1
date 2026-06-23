import { logger } from '../config/logger';
/**
 * Spin Wheel Coupon Assignment Service
 *
 * Handles smart assignment of coupons to stores/products when user wins from spin wheel
 *
 * Strategy:
 * - 70% store-wide coupons (any product from selected store)
 * - 30% product-specific coupons (specific product only)
 * - Randomly selects active stores/products from database
 */

import { Types } from 'mongoose';

// ==================== INTERFACES ====================

export interface StoreAssignment {
  storeId: string;
  storeName: string;
  storeImage?: string;
}

export interface ProductAssignment {
  productId: string;
  productName: string;
  productImage?: string;
  storeId: string;
  storeName: string;
  originalPrice: number;
}

export interface CouponApplicability {
  isProductSpecific: boolean;
  storeId: string;
  storeName: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  originalPrice?: number;
}

export interface CouponDescriptionParams {
  type: 'cashback' | 'discount' | 'voucher';
  value: number;
  applicability: CouponApplicability;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Decide if coupon should be product-specific or store-wide
 * 30% chance for product-specific, 70% for store-wide
 */
export function shouldBeProductSpecific(): boolean {
  return Math.random() < 0.3; // 30% product-specific
}

/**
 * Get random popular store from database
 * Criteria: Active stores with products
 */
export async function getRandomStore(): Promise<StoreAssignment> {
  try {
    const { Store } = await import('../models/Store');

    // Find active stores with products
    const stores = await Store.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'products', // Collection name
          localField: '_id',
          foreignField: 'store',
          as: 'products'
        }
      },
      {
        $match: {
          'products.0': { $exists: true } // Has at least one product
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          'logo.url': 1,
          productsCount: { $size: '$products' }
        }
      },
      { $sample: { size: 1 } } // Random sample
    ]);

    if (stores.length === 0) {
      // Fallback: Create a generic store assignment
      logger.warn('⚠️ [COUPON_ASSIGNMENT] No active stores found, using fallback');
      return {
        storeId: 'generic',
        storeName: 'All Stores',
        storeImage: undefined
      };
    }

    const store = stores[0] as any; // Aggregation result type

    return {
      storeId: store._id.toString(),
      storeName: store.name,
      storeImage: store.logo?.url
    };
  } catch (error) {
    logger.error('❌ [COUPON_ASSIGNMENT] Error getting random store:', error);
    // Fallback
    return {
      storeId: 'generic',
      storeName: 'All Stores',
      storeImage: undefined
    };
  }
}

/**
 * Get random product from database
 * Optionally from a specific store
 */
export async function getRandomProduct(storeId?: string): Promise<ProductAssignment> {
  try {
    const { Product } = await import('../models/Product');

    // Build match criteria
    const matchCriteria: any = {
      isActive: true,
      stock: { $gt: 0 } // Has stock
    };

    if (storeId && storeId !== 'generic') {
      matchCriteria.store = new Types.ObjectId(storeId);
    }

    // Find random product
    const products = await Product.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      { $unwind: '$storeInfo' },
      {
        $project: {
          _id: 1,
          name: 1,
          'images.0.url': 1,
          price: 1,
          store: 1,
          'storeInfo.name': 1
        }
      },
      { $sample: { size: 1 } }
    ]);

    if (products.length === 0) {
      // Fallback: Use the store's generic product
      logger.warn('⚠️ [COUPON_ASSIGNMENT] No products found, using fallback');
      const store = storeId ? await getStoreById(storeId) : await getRandomStore();

      return {
        productId: 'generic',
        productName: 'Any Product',
        productImage: undefined,
        storeId: store.storeId,
        storeName: store.storeName,
        originalPrice: 0
      };
    }

    const product = products[0] as any; // Aggregation result type

    return {
      productId: product._id.toString(),
      productName: product.name,
      productImage: product.images?.[0]?.url,
      storeId: product.store.toString(),
      storeName: product.storeInfo.name,
      originalPrice: product.price || 0
    };
  } catch (error) {
    logger.error('❌ [COUPON_ASSIGNMENT] Error getting random product:', error);
    // Fallback
    const store = storeId ? await getStoreById(storeId) : await getRandomStore();

    return {
      productId: 'generic',
      productName: 'Any Product',
      productImage: undefined,
      storeId: store.storeId,
      storeName: store.storeName,
      originalPrice: 0
    };
  }
}

/**
 * Helper: Get store by ID
 */
async function getStoreById(storeId: string): Promise<StoreAssignment> {
  try {
    const { Store } = await import('../models/Store');
    const store = await Store.findById(storeId).lean() as any;

    if (!store) {
      return {
        storeId: 'generic',
        storeName: 'All Stores',
        storeImage: undefined
      };
    }

    return {
      storeId: store._id.toString(),
      storeName: store.name,
      storeImage: store.logo?.url
    };
  } catch (error) {
    return {
      storeId: 'generic',
      storeName: 'All Stores',
      storeImage: undefined
    };
  }
}

/**
 * Get coupon applicability (store-wide or product-specific)
 */
export async function getCouponApplicability(forceStoreWide: boolean = false): Promise<CouponApplicability> {
  const isProductSpecific = forceStoreWide ? false : shouldBeProductSpecific();

  if (isProductSpecific) {
    // Product-specific coupon
    const product = await getRandomProduct();

    return {
      isProductSpecific: true,
      storeId: product.storeId,
      storeName: product.storeName,
      productId: product.productId,
      productName: product.productName,
      productImage: product.productImage,
      originalPrice: product.originalPrice
    };
  } else {
    // Store-wide coupon
    const store = await getRandomStore();

    return {
      isProductSpecific: false,
      storeId: store.storeId,
      storeName: store.storeName
    };
  }
}

/**
 * Generate user-friendly coupon description with store/product details
 */
export function generateCouponDescription(params: CouponDescriptionParams): string {
  const { type, value, applicability } = params;

  if (type === 'cashback') {
    // Cashback description
    return applicability.isProductSpecific
      ? `You won ${value}% cashback on ${applicability.productName} from ${applicability.storeName}! ` +
        `Purchase this product and get ${value}% of the price back as wallet credit.`
      : `You won ${value}% cashback at ${applicability.storeName}! ` +
        `Shop any product from this store and get ${value}% back as wallet credit.`;

  } else if (type === 'discount') {
    // Discount description
    return applicability.isProductSpecific
      ? `You won ${value}% discount on ${applicability.productName} from ${applicability.storeName}! ` +
        `Add this product to cart and apply the code to save ${value}%.`
      : `You won ${value}% discount at ${applicability.storeName}! ` +
        `Shop any product from this store and save ${value}% on your order.`;

  } else if (type === 'voucher') {
    // Voucher description
    return applicability.isProductSpecific
      ? `You won ₹${value} voucher for ${applicability.productName} from ${applicability.storeName}! ` +
        `Purchase this product and get instant ₹${value} off.`
      : `You won ₹${value} voucher at ${applicability.storeName}! ` +
        `Shop any product from this store and get instant ₹${value} off.`;
  }

  return `You won ${type} worth ${value}!`;
}

/**
 * Generate user-friendly coupon title
 */
export function generateCouponTitle(params: CouponDescriptionParams): string {
  const { type, value, applicability } = params;

  if (type === 'cashback') {
    return applicability.isProductSpecific
      ? `${value}% Cashback on ${applicability.productName}`
      : `${value}% Cashback at ${applicability.storeName}`;

  } else if (type === 'discount') {
    return applicability.isProductSpecific
      ? `${value}% OFF on ${applicability.productName}`
      : `${value}% OFF at ${applicability.storeName}`;

  } else if (type === 'voucher') {
    return applicability.isProductSpecific
      ? `₹${value} Voucher for ${applicability.productName}`
      : `₹${value} Voucher at ${applicability.storeName}`;
  }

  return `${value}% ${type}`;
}

/**
 * Generate applicability text for UI display
 */
export function generateApplicabilityText(applicability: CouponApplicability): string {
  if (applicability.isProductSpecific) {
    return `Valid on ${applicability.productName} from ${applicability.storeName}`;
  } else {
    return `Valid on any product from ${applicability.storeName}`;
  }
}

// ==================== EXPORTS ====================

export default {
  shouldBeProductSpecific,
  getRandomStore,
  getRandomProduct,
  getCouponApplicability,
  generateCouponDescription,
  generateCouponTitle,
  generateApplicabilityText
};
