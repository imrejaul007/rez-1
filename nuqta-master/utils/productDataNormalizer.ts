/**
 * Product Data Normalization Utilities
 *
 * This module provides functions to normalize product and store data from various sources,
 * ensuring consistent data structure across the application.
 */

/**
 * Normalizes product price data by prioritizing price.current over pricing.selling
 *
 * @param product - Product object with potential price/pricing fields
 * @returns Normalized price object with current, original, and discount fields
 *
 * @example
 * const product = { price: { current: 100, original: 150 } };
 * const normalized = normalizeProductPrice(product);
 * // { current: 100, original: 150, discount: 33 }
 */
export function normalizeProductPrice(product: any): {
  current: number | null;
  original: number | null;
  discount: number | null;
} {
  if (!product) {
    return { current: null, original: null, discount: null };
  }

  // Priority 1: price.current and price.original
  if (product.price) {
    const current = typeof product.price.current === 'number' ? product.price.current : null;
    const original = typeof product.price.original === 'number' ? product.price.original : null;

    let discount = null;
    if (current !== null && original !== null && original > current) {
      discount = Math.round(((original - current) / original) * 100);
    }

    return { current, original, discount };
  }

  // Priority 2: pricing.selling and pricing.mrp
  if (product.pricing) {
    const current = typeof product.pricing.selling === 'number' ? product.pricing.selling : null;
    const original = typeof product.pricing.mrp === 'number' ? product.pricing.mrp : null;

    let discount = null;
    if (current !== null && original !== null && original > current) {
      discount = Math.round(((original - current) / original) * 100);
    }

    return { current, original, discount };
  }

  // Priority 3: Direct price field (legacy support)
  if (typeof product.sellingPrice === 'number' || typeof product.mrp === 'number') {
    const current = typeof product.sellingPrice === 'number' ? product.sellingPrice : null;
    const original = typeof product.mrp === 'number' ? product.mrp : null;

    let discount = null;
    if (current !== null && original !== null && original > current) {
      discount = Math.round(((original - current) / original) * 100);
    }

    return { current, original, discount };
  }

  return { current: null, original: null, discount: null };
}

/**
 * Normalizes product rating data by prioritizing rating.value over ratings.average
 *
 * @param product - Product object with potential rating/ratings fields
 * @returns Normalized rating object with value and count fields
 *
 * @example
 * const product = { rating: { value: 4.5, count: 120 } };
 * const normalized = normalizeProductRating(product);
 * // { value: 4.5, count: 120 }
 */
export function normalizeProductRating(product: any): {
  value: number | null;
  count: number | null;
} {
  if (!product) {
    return { value: null, count: null };
  }

  // Priority 1: rating.value and rating.count
  if (product.rating) {
    const value = typeof product.rating.value === 'number' ? product.rating.value : null;
    const count = typeof product.rating.count === 'number' ? product.rating.count : null;
    return { value, count };
  }

  // Priority 2: ratings.average and ratings.total
  if (product.ratings) {
    const value = typeof product.ratings.average === 'number' ? product.ratings.average : null;
    const count = typeof product.ratings.total === 'number' ? product.ratings.total : null;
    return { value, count };
  }

  // Priority 3: Direct rating fields (legacy support)
  const value = typeof product.ratingValue === 'number' ? product.ratingValue : null;
  const count = typeof product.ratingCount === 'number' ? product.ratingCount : null;

  return { value, count };
}

/**
 * Normalizes product ID to a consistent 'id' field
 *
 * @param product - Product object with potential _id or id fields
 * @returns Product ID as a string, or null if not found
 *
 * @example
 * const product = { _id: '12345' };
 * const id = normalizeProductId(product);
 * // '12345'
 */
export function normalizeProductId(product: any): string | null {
  if (!product) {
    return null;
  }

  // Priority 1: id field
  if (product.id) {
    return String(product.id);
  }

  // Priority 2: _id field (MongoDB default)
  if (product._id) {
    return String(product._id);
  }

  // Priority 3: productId field
  if (product.productId) {
    return String(product.productId);
  }

  return null;
}

/**
 * Normalizes product image data, handling both arrays and single image objects
 *
 * @param product - Product object with potential image/images fields
 * @returns Normalized images array with url and alt text
 *
 * @example
 * const product = { images: [{ url: 'image1.jpg' }, { url: 'image2.jpg' }] };
 * const normalized = normalizeProductImage(product);
 * // [{ url: 'image1.jpg', alt: 'Product image' }, { url: 'image2.jpg', alt: 'Product image' }]
 */
export function normalizeProductImage(product: any): Array<{ url: string; alt: string }> {
  if (!product) {
    return [];
  }

  // Priority 1: images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map((img: any, index: number) => ({
      url: typeof img === 'string' ? img : img.url || img.src || '',
      alt: img.alt || `${product.name || 'Product'} image ${index + 1}`,
    })).filter((img: any) => img.url);
  }

  // Priority 2: image array (singular)
  if (Array.isArray(product.image) && product.image.length > 0) {
    return product.image.map((img: any, index: number) => ({
      url: typeof img === 'string' ? img : img.url || img.src || '',
      alt: img.alt || `${product.name || 'Product'} image ${index + 1}`,
    })).filter((img: any) => img.url);
  }

  // Priority 3: Single image object
  if (product.image && typeof product.image === 'object') {
    const url = product.image.url || product.image.src || '';
    if (url) {
      return [{ url, alt: product.image.alt || `${product.name || 'Product'} image` }];
    }
  }

  // Priority 4: Single image string
  if (typeof product.image === 'string' && product.image) {
    return [{ url: product.image, alt: `${product.name || 'Product'} image` }];
  }

  // Priority 5: imageUrl field
  if (typeof product.imageUrl === 'string' && product.imageUrl) {
    return [{ url: product.imageUrl, alt: `${product.name || 'Product'} image` }];
  }

  // Priority 6: thumbnail field
  if (typeof product.thumbnail === 'string' && product.thumbnail) {
    return [{ url: product.thumbnail, alt: `${product.name || 'Product'} thumbnail` }];
  }

  return [];
}

/**
 * Normalizes store ID fields to a consistent format
 *
 * @param store - Store object with potential _id or storeId fields
 * @returns Store ID as a string, or null if not found
 *
 * @example
 * const store = { _id: '67890' };
 * const id = normalizeStoreId(store);
 * // '67890'
 */
export function normalizeStoreId(store: any): string | null {
  if (!store) {
    return null;
  }

  // Priority 1: id field
  if (store.id) {
    return String(store.id);
  }

  // Priority 2: _id field (MongoDB default)
  if (store._id) {
    return String(store._id);
  }

  // Priority 3: storeId field
  if (store.storeId) {
    return String(store.storeId);
  }

  return null;
}

/**
 * Normalizes store name fields to a consistent format
 *
 * @param store - Store object with potential name/storeName fields
 * @returns Store name as a string, or null if not found
 */
export function normalizeStoreName(store: any): string | null {
  if (!store) {
    return null;
  }

  return store.name || store.storeName || store.title || null;
}

/**
 * Normalizes an entire product object with all fields
 *
 * @param product - Raw product object from API
 * @returns Fully normalized product object
 *
 * @example
 * const rawProduct = { _id: '123', price: { current: 100 }, rating: { value: 4.5 } };
 * const normalized = normalizeProduct(rawProduct);
 * // { id: '123', price: { current: 100, ... }, rating: { value: 4.5, ... }, ... }
 */
export function normalizeProduct(product: any): any {
  if (!product) {
    return null;
  }

  const id = normalizeProductId(product);
  const price = normalizeProductPrice(product);
  const rating = normalizeProductRating(product);
  const images = normalizeProductImage(product);
  const storeId = product.store ? normalizeStoreId(product.store) : (product.storeId || null);

  return {
    ...product,
    id,
    price,
    rating,
    images,
    storeId,
    // Keep original fields for backward compatibility
    _id: product._id,
  };
}

/**
 * Normalizes an array of products
 *
 * @param products - Array of raw product objects
 * @returns Array of normalized product objects
 */
export function normalizeProducts(products: any[]): any[] {
  if (!Array.isArray(products)) {
    return [];
  }

  return products.map(normalizeProduct).filter(Boolean);
}

/**
 * Normalizes an entire store object with all fields
 *
 * @param store - Raw store object from API
 * @returns Fully normalized store object
 */
export function normalizeStore(store: any): any {
  if (!store) {
    return null;
  }

  const id = normalizeStoreId(store);
  const name = normalizeStoreName(store);
  const rating = normalizeProductRating(store); // Stores can have ratings too

  return {
    ...store,
    id,
    name,
    rating,
    // Keep original fields for backward compatibility
    _id: store._id,
  };
}

/**
 * Normalizes an array of stores
 *
 * @param stores - Array of raw store objects
 * @returns Array of normalized store objects
 */
export function normalizeStores(stores: any[]): any[] {
  if (!Array.isArray(stores)) {
    return [];
  }

  return stores.map(normalizeStore).filter(Boolean);
}
