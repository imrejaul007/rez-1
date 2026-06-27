// Response Validators
// Validates and normalizes API responses to ensure consistent data structures

import { ProductItem } from '@/types/homepage.types';

/**
 * Validates and normalizes product data from API responses
 */
export function validateProduct(rawProduct: any): ProductItem | null {
  try {
    if (!rawProduct || typeof rawProduct !== 'object') {
      return null;
    }

    // Validate required fields
    const id = rawProduct.id || rawProduct._id;
    if (!id) {
      return null;
    }

    const name = rawProduct.name || rawProduct.title;
    if (!name) {
      return null;
    }

    // Normalize price field (pricing → price)
    const price = normalizePrice(rawProduct);
    if (!price) {
      return null;
    }

    // Normalize rating field (ratings → rating)
    const rating = normalizeRating(rawProduct);

    // Normalize images field
    const images = normalizeImages(rawProduct);
    const image = images[0]?.url || rawProduct.image || '';

    // Build validated product object
    const validatedProduct: ProductItem = {
      id,
      type: 'product',
      name,
      title: name,
      brand: rawProduct.brand || rawProduct.store?.name || 'Unknown Brand',
      image,
      images,
      price,
      category: rawProduct.category?.name || rawProduct.category || 'Uncategorized',
      subcategory: rawProduct.subcategory?.name || rawProduct.subcategory,
      rating,
      cashback: normalizeCashback(rawProduct),
      availabilityStatus: normalizeAvailabilityStatus(rawProduct),
      inventory: normalizeInventory(rawProduct),
      tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : [],
      description: rawProduct.description || '',
      isNewArrival: rawProduct.isNewArrival || false,
      isRecommended: rawProduct.isRecommended || false,
      arrivalDate: rawProduct.arrivalDate || rawProduct.createdAt,
    };

    return validatedProduct;
  } catch (error) {
    return null;
  }
}

/**
 * Validates and normalizes store data from API responses
 */
export function validateStore(rawStore: any): any | null {
  try {
    if (!rawStore || typeof rawStore !== 'object') {
      return null;
    }

    // Validate required fields
    const id = rawStore.id || rawStore._id;
    if (!id) {
      return null;
    }

    const name = rawStore.name;
    if (!name) {
      return null;
    }

    // Normalize rating with breakdown preservation
    const rating = normalizeStoreRating(rawStore);

    // Normalize image - handle various formats: image, banner, images array, image.url
    const normalizeStoreImage = () => {
      // Try images array first (most common from backend)
      if (rawStore.images && Array.isArray(rawStore.images) && rawStore.images.length > 0) {
        const firstImage = rawStore.images[0];
        if (typeof firstImage === 'string' && firstImage.trim().length > 0) {
          return firstImage;
        }
        if (firstImage && typeof firstImage === 'object' && firstImage.url) {
          return firstImage.url;
        }
      }
      // Try banner field (can be string, array, or object)
      if (rawStore.banner) {
        if (typeof rawStore.banner === 'string' && rawStore.banner.trim().length > 0) {
          return rawStore.banner;
        }
        if (Array.isArray(rawStore.banner) && rawStore.banner.length > 0) {
          const firstBanner = rawStore.banner[0];
          return typeof firstBanner === 'string' ? firstBanner : (firstBanner?.url || '');
        }
        if (typeof rawStore.banner === 'object' && rawStore.banner.url) {
          return rawStore.banner.url;
        }
      }
      // Try direct image field
      if (rawStore.image) {
        if (typeof rawStore.image === 'string' && rawStore.image.trim().length > 0) {
          return rawStore.image;
        }
        if (typeof rawStore.image === 'object' && rawStore.image.url) {
          return rawStore.image.url;
        }
      }
      return '';
    };

    // Build validated store object
    const validatedImage = normalizeStoreImage();
    const validatedStore = {
      id,
      type: 'store',
      name,
      title: name,
      image: validatedImage,
      logo: rawStore.logo || '',
      description: rawStore.description || '',
      rating,
      cashback: normalizeCashback(rawStore),
      category: rawStore.category?.name || rawStore.category || 'General',
      location: normalizeLocation(rawStore),
      isTrending: rawStore.isTrending || rawStore.featured || false,
      isNew: rawStore.isNew || false,
      isTopRated: rating.value >= 4.5,
      deliveryTime: rawStore.deliveryTime || rawStore.operationalInfo?.deliveryTime || '30-45 mins',
      minimumOrder: rawStore.minimumOrder || rawStore.operationalInfo?.minimumOrder || 0,
      openingHours: rawStore.openingHours || rawStore.hours,
    };

    return validatedStore;
  } catch (error) {
    return null;
  }
}

/**
 * Validates an array of products and filters out invalid ones
 */
export function validateProductArray(products: any[]): ProductItem[] {
  if (!Array.isArray(products)) {
    return [];
  }

  const validated = products
    .map(validateProduct)
    .filter((p): p is ProductItem => p !== null);

  const invalidCount = products.length - validated.length;
  if (invalidCount > 0) {
  }

  return validated;
}

/**
 * Validates an array of stores and filters out invalid ones
 */
export function validateStoreArray(stores: any[]): any[] {
  if (!Array.isArray(stores)) {
    return [];
  }

  const validated = stores
    .map(validateStore)
    .filter((s): s is any => s !== null);

  const invalidCount = stores.length - validated.length;
  if (invalidCount > 0) {
  }

  return validated;
}

// ===== HELPER FUNCTIONS =====

/**
 * Normalize price field from various API response formats
 * Handles: pricing.basePrice, pricing.salePrice, pricing.selling, pricing.original, price.current, price
 */
function normalizePrice(data: any): ProductItem['price'] | null {
  try {
    // Format 2: price object with current/original (checked first so price takes priority over pricing)
    if (data.price && typeof data.price === 'object') {
      const current = data.price.current || data.price.sale || data.price.value;
      const original = data.price.original || data.price.regular;

      if (typeof current === 'number') {
        return {
          current,
          original,
          currency: data.price.currency || 'INR',
          discount: data.price.discount || (original ? Math.round(((original - current) / original) * 100) : undefined),
        };
      }
    }

    // Format 1: pricing object with various field names
    if (data.pricing) {
      // Support multiple naming conventions: selling/salePrice/basePrice
      const current = data.pricing.selling || data.pricing.salePrice || data.pricing.basePrice;
      // Support multiple naming conventions for original price
      const original = data.pricing.original || (data.pricing.salePrice ? data.pricing.basePrice : undefined);

      if (typeof current === 'number') {
        return {
          current,
          original,
          currency: data.pricing.currency || 'INR',
          discount: data.pricing.discount || (original ? Math.round(((original - current) / original) * 100) : undefined),
        };
      }
    }

    // Format 3: Direct price number
    if (typeof data.price === 'number') {
      return {
        current: data.price,
        currency: 'INR',
      };
    }

    // Format 4: basePrice as fallback
    if (typeof data.basePrice === 'number') {
      return {
        current: data.basePrice,
        original: data.originalPrice,
        currency: 'INR',
        discount: data.discount,
      };
    }

    // Format 5: Try to extract any numeric price value as last resort
    const anyPrice = data.price?.selling || data.price?.current || data.sellingPrice || data.amount;
    if (typeof anyPrice === 'number' && anyPrice > 0) {
      return {
        current: anyPrice,
        currency: data.price?.currency || data.currency || 'INR',
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize rating field from various API response formats
 * Handles: ratings.average, rating.value, rating
 */
function normalizeRating(data: any): ProductItem['rating'] {
  try {
    // Format 1: ratings object with average
    if (data.ratings && typeof data.ratings === 'object') {
      return {
        value: parseFloat(data.ratings.average || data.ratings.value || 0),
        count: parseInt(data.ratings.count || data.ratings.total || 0, 10),
      };
    }

    // Format 2: rating object with value
    if (data.rating && typeof data.rating === 'object') {
      return {
        value: parseFloat(data.rating.value || data.rating.average || 0),
        count: parseInt(data.rating.count || 0, 10),
      };
    }

    // Format 3: Direct rating number
    if (typeof data.rating === 'number') {
      return {
        value: data.rating,
        count: data.ratingCount || 0,
      };
    }

    // Default
    return {
      value: 0,
      count: 0,
    };
  } catch (error) {
    return { value: 0, count: 0 };
  }
}

/**
 * Normalize store rating with breakdown preservation
 */
function normalizeStoreRating(data: any): any {
  try {
    const baseRating = normalizeRating(data);

    // Preserve rating breakdown if available
    const breakdown = data.ratings?.breakdown || data.rating?.breakdown || {};

    return {
      ...baseRating,
      maxValue: 5,
      breakdown,
    };
  } catch (error) {
    return { value: 0, count: 0, maxValue: 5, breakdown: {} };
  }
}

/**
 * Normalize images array
 */
function normalizeImages(data: any): Array<{ id: string; url: string; alt: string; isMain: boolean }> {
  try {
    if (Array.isArray(data.images) && data.images.length > 0) {
      return data.images.map((img: any, index: number) => ({
        id: img.id || img._id || `img-${index}`,
        url: img.url || img.src || img,
        alt: img.alt || data.name || `Product image ${index + 1}`,
        isMain: img.isMain || index === 0,
      }));
    }

    // Fallback: create single image from image field
    if (data.image) {
      return [{
        id: '1',
        url: data.image,
        alt: data.name || 'Product image',
        isMain: true,
      }];
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Normalize cashback field
 */
function normalizeCashback(data: any): { percentage: number; maxAmount?: number } | undefined {
  try {
    // Format 1: Product has cashback
    if (data.cashback && typeof data.cashback === 'object') {
      return {
        percentage: data.cashback.percentage || 0,
        maxAmount: data.cashback.maxAmount || data.cashback.max,
      };
    }

    // Format 2: Store has cashback (fallback for products without cashback)
    if (data.store?.cashback && typeof data.store.cashback === 'object') {
      return {
        percentage: data.store.cashback.percentage || 0,
        maxAmount: data.store.cashback.maxAmount || data.store.cashback.max,
      };
    }

    // Format 3: Offers cashback
    if (data.offers?.cashback) {
      return {
        percentage: data.offers.cashback,
        maxAmount: data.offers.maxCashback,
      };
    }

    // Format 4: Default cashback for new arrivals (if no cashback specified)
    // This ensures new arrivals always show some cashback incentive
    if (data.isNewArrival || data.arrivalDate) {
      return {
        percentage: 5, // Default 5% for new arrivals
        maxAmount: 500
      };
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Normalize availability status
 */
function normalizeAvailabilityStatus(data: any): 'in_stock' | 'low_stock' | 'out_of_stock' {
  try {
    const status = data.availabilityStatus || data.availability || data.status;

    if (status === 'in_stock' || status === 'available') return 'in_stock';
    if (status === 'low_stock') return 'low_stock';
    if (status === 'out_of_stock' || status === 'unavailable') return 'out_of_stock';

    // Check inventory
    if (data.inventory || data.stock) {
      const stock = data.inventory?.quantity || data.inventory?.stock || data.stock;
      const lowThreshold = data.inventory?.lowStockThreshold || 10;

      if (stock === 0) return 'out_of_stock';
      if (stock <= lowThreshold) return 'low_stock';
      return 'in_stock';
    }

    // Default to in_stock
    return 'in_stock';
  } catch (error) {
    return 'in_stock';
  }
}

/**
 * Normalize inventory field
 */
function normalizeInventory(data: any): { stock: number; lowStockThreshold?: number } | undefined {
  try {
    if (data.inventory && typeof data.inventory === 'object') {
      return {
        stock: data.inventory.quantity || data.inventory.stock || 0,
        lowStockThreshold: data.inventory.lowStockThreshold,
      };
    }

    if (typeof data.stock === 'number') {
      return {
        stock: data.stock,
      };
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Normalize location field
 */
function normalizeLocation(data: any): any {
  try {
    if (data.location && typeof data.location === 'object') {
      return {
        address: data.location.address || data.location.street || '',
        city: data.location.city || '',
        distance: data.location.distance || undefined,
      };
    }

    if (data.address && typeof data.address === 'object') {
      return {
        address: data.address.street || '',
        city: data.address.city || '',
        distance: data.distance,
      };
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Validate critical fields exist in response
 */
export function validateCriticalFields(data: any, requiredFields: string[]): boolean {
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Normalize ID field (_id → id)
 */
export function normalizeId(data: any): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  return data.id || data._id || null;
}
