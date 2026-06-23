// @ts-nocheck
/**
 * Homepage Data Transformers
 * Efficient, reusable data transformation utilities
 */

import {
  ProductItem,
  StoreItem,
  EventItem,
  RecommendationItem,
} from '@/types/homepage.types';
import {
  RawProductData,
  RawStoreData,
  RawEventData,
  RawOfferData,
} from '@/types/homepageDataService.types';

// ============================================================================
// PRODUCT TRANSFORMERS
// ============================================================================

/**
 * Transform raw product data from API to ProductItem
 * @param raw - Raw product data from API
 * @param currencySymbol - Currency symbol to use (default: ₹)
 */
export function transformProduct(raw: RawProductData, currencySymbol: string = '₹'): ProductItem {
  return {
    id: raw._id,
    type: 'product',
    title: raw.name,
    name: raw.name,
    brand: raw.brand || 'Unknown Brand',
    image: raw.image || raw.images?.[0] || '',
    description: '',
    price: {
      current: raw.price,
      original: raw.originalPrice || raw.price,
      currency: currencySymbol,
      discount: raw.discount || calculateDiscount(raw.price, raw.originalPrice),
    },
    category: raw.category,
    subcategory: raw.subcategory,
    rating: raw.rating
      ? {
          value: typeof raw.rating === 'string' ? parseFloat(raw.rating) : raw.rating,
          count: raw.reviewCount || 0,
        }
      : undefined,
    availabilityStatus: determineAvailabilityStatus(raw.stock),
    inventory: raw.stock !== undefined
      ? {
          stock: raw.stock,
          lowStockThreshold: 10,
        }
      : undefined,
    tags: raw.tags || [],
    arrivalDate: raw.createdAt,
  };
}

/**
 * Transform raw product data to RecommendationItem
 */
export function transformRecommendation(
  raw: RawProductData,
  reason?: string,
  score?: number
): RecommendationItem {
  const product = transformProduct(raw);
  return {
    ...product,
    recommendationReason: reason || 'Based on your preferences',
    recommendationScore: score || 0.8,
    personalizedFor: raw.category,
    isRecommended: true,
  };
}

/**
 * Batch transform products
 */
export function transformProducts(rawProducts: RawProductData[]): ProductItem[] {
  return rawProducts.map(transformProduct);
}

/**
 * Batch transform recommendations
 */
export function transformRecommendations(rawProducts: RawProductData[]): RecommendationItem[] {
  return rawProducts.map((raw, index) =>
    transformRecommendation(
      raw,
      'Personalized for you',
      0.9 - index * 0.05 // Descending score
    )
  );
}

// ============================================================================
// STORE TRANSFORMERS
// ============================================================================

/**
 * Transform raw store data from API to StoreItem
 */
export function transformStore(raw: RawStoreData): StoreItem {
  return {
    id: raw._id,
    type: 'store',
    title: raw.name,
    name: raw.name,
    logo: raw.logo || raw.image,
    image: raw.image || raw.logo || '',
    description: '',
    rating: {
      value: raw.rating || 0,
      count: raw.reviewCount || 0,
      maxValue: 5,
    },
    cashback: {
      percentage: raw.cashbackPercentage || 0,
      maxAmount: undefined,
    },
    category: raw.category,
    location: raw.address
      ? {
          address: raw.address,
          city: raw.city || '',
          distance: undefined,
        }
      : undefined,
    isNew: raw.isNew || false,
    isTrending: raw.isFeatured || false,
    isTopRated: (raw.rating || 0) >= 4.5,
  };
}

/**
 * Batch transform stores
 */
export function transformStores(rawStores: RawStoreData[]): StoreItem[] {
  return rawStores.map(transformStore);
}

// ============================================================================
// EVENT TRANSFORMERS
// ============================================================================

/**
 * Transform raw event data from API to EventItem
 * @param raw - Raw event data from API
 * @param currencySymbol - Currency symbol to use (default: ₹)
 */
export function transformEvent(raw: RawEventData, currencySymbol: string = '₹'): EventItem {
  return {
    id: raw._id,
    type: 'event',
    title: raw.title,
    subtitle: raw.description || '',
    image: raw.image,
    description: raw.description,
    price: {
      amount: raw.price || 0,
      currency: currencySymbol,
      isFree: !raw.price || raw.price === 0,
    },
    location: raw.location,
    date: raw.date,
    time: raw.time,
    category: raw.category,
    organizer: raw.organizer || 'Unknown Organizer',
    isOnline: raw.isOnline || false,
    registrationRequired: true,
  };
}

/**
 * Batch transform events
 */
export function transformEvents(rawEvents: RawEventData[]): EventItem[] {
  return rawEvents.map(transformEvent);
}

// ============================================================================
// OFFER TRANSFORMERS
// ============================================================================

/**
 * Transform raw offer data to ProductItem (for offers/flash sales)
 * @param raw - Raw offer data from API
 * @param currencySymbol - Currency symbol to use (default: ₹)
 */
export function transformOffer(raw: RawOfferData, currencySymbol: string = '₹'): ProductItem {
  const currentPrice = raw.discountedPrice || raw.originalPrice || 0;
  const originalPrice = raw.originalPrice || currentPrice;

  return {
    id: raw._id,
    type: 'product',
    title: raw.title,
    name: raw.title,
    brand: raw.store?.name || 'Special Offer',
    image: raw.image,
    description: raw.description,
    price: {
      current: currentPrice,
      original: originalPrice,
      currency: currencySymbol,
      discount: calculateDiscount(currentPrice, originalPrice),
    },
    category: raw.category || 'Offers',
    subcategory: undefined,
    cashback: raw.cashbackPercentage
      ? {
          percentage: raw.cashbackPercentage,
          maxAmount: undefined,
        }
      : undefined,
    availabilityStatus: 'in_stock',
    tags: ['offer', 'limited-time'],
  };
}

/**
 * Transform flash sale offer
 * @param raw - Raw offer data from API
 * @param currencySymbol - Currency symbol to use (default: ₹)
 */
export function transformFlashSale(raw: RawOfferData, currencySymbol: string = '₹'): ProductItem {
  const salePrice = raw.metadata?.flashSale?.salePrice || raw.discountedPrice || 0;
  const originalPrice = raw.metadata?.flashSale?.originalPrice || raw.originalPrice || salePrice;

  return {
    id: raw._id,
    type: 'product',
    title: raw.title,
    name: raw.title,
    brand: raw.store?.name || 'Flash Sale',
    image: raw.image,
    description: raw.description,
    price: {
      current: salePrice,
      original: originalPrice,
      currency: currencySymbol,
      discount: calculateDiscount(salePrice, originalPrice),
    },
    category: raw.category || 'Flash Sales',
    subcategory: undefined,
    availabilityStatus: 'in_stock',
    tags: ['flash-sale', 'limited-time', 'hot-deal'],
  };
}

/**
 * Batch transform offers
 */
export function transformOffers(rawOffers: RawOfferData[]): ProductItem[] {
  return rawOffers.map(transformOffer);
}

/**
 * Batch transform flash sales (filter and transform)
 */
export function transformFlashSales(rawOffers: RawOfferData[]): ProductItem[] {
  return rawOffers
    .filter((offer) => offer.metadata?.flashSale?.isActive)
    .map(transformFlashSale);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate discount percentage
 */
function calculateDiscount(current: number, original?: number): number {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

/**
 * Determine availability status from stock level
 */
function determineAvailabilityStatus(
  stock?: number
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (stock === undefined || stock === null) return 'in_stock';
  if (stock === 0) return 'out_of_stock';
  if (stock <= 10) return 'low_stock';
  return 'in_stock';
}

/**
 * Normalize image URL
 */
export function normalizeImageUrl(url: string, size?: 'small' | 'medium' | 'large'): string {
  if (!url) return '';

  // If already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Add size parameter for Cloudinary
  if (url.includes('cloudinary.com')) {
    const sizeMap = {
      small: 'w_300,h_300',
      medium: 'w_600,h_600',
      large: 'w_1200,h_1200',
    };
    const sizeParam = size ? sizeMap[size] : sizeMap.medium;
    return url.replace('/upload/', `/upload/${sizeParam}/`);
  }

  // Otherwise, assume relative path
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.rez-app.com';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format time for display
 */
export function formatTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
}

/**
 * Sanitize data - remove null/undefined values
 */
export function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  const sanitized = {} as T;
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }
  return sanitized;
}

/**
 * Validate required fields
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every((field) => {
    const value = data[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Deep clone object (for transformation)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as unknown as T;

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}
