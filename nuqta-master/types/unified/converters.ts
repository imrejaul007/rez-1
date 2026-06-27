/**
 * Type Converters
 *
 * Functions to convert between different data formats and the unified types.
 * Handles conversion from backend API responses to frontend unified types.
 */

import {
  Product,
  ProductPrice,
  ProductRating,
  ProductInventory,
  ProductImage,
  ProductAvailabilityStatus,
} from './Product';
import { Store, StoreRating, StoreLocation, StoreBusinessHours } from './Store';
import { CartItem } from './Cart';
import { User, UserProfile, UserPreferences } from './User';
import { Order, OrderPricing, OrderItem } from './Order';
import { Review, ReviewUser, ReviewImage, RatingDistribution } from './Review';

// ============================================================================
// ID MIGRATION
// ============================================================================

/**
 * Convert MongoDB _id to standard id field
 */
export function normalizeId<T extends { _id?: string; id?: string }>(
  obj: T
): T & { id: string } {
  const id = obj.id || obj._id;
  if (!id) {
    throw new Error('Object must have either id or _id field');
  }

  const normalized = { ...obj, id };
  delete (normalized as any)._id;
  return normalized as T & { id: string };
}

/**
 * Convert array of objects from _id to id
 */
export function normalizeIds<T extends { _id?: string; id?: string }>(
  arr: T[]
): Array<T & { id: string }> {
  return arr.map((item) => normalizeId(item));
}

// ============================================================================
// PRODUCT CONVERTERS
// ============================================================================

/**
 * Convert backend product to unified Product type
 */
export function toProduct(data: any): Product {
  // Normalize ID
  const id = data.id || data._id;
  if (!id) throw new Error('Product must have id or _id');

  // Convert price
  const price = toProductPrice(data);

  // Convert rating
  const rating = toProductRating(data);

  // Convert inventory
  const inventory = toProductInventory(data);

  // Convert images
  const images = toProductImages(data);

  // Determine availability status
  const availabilityStatus = getAvailabilityStatus(inventory);

  return {
    id,
    storeId: data.storeId || data.store?._id || data.store?.id || data.store || '',
    sku: data.sku,
    barcode: data.barcode,
    slug: data.slug,
    name: data.name || data.title,
    title: data.title || data.name,
    description: data.description || '',
    shortDescription: data.shortDescription,
    brand: data.brand,
    category: data.category || '',
    subcategory: data.subcategory,
    tags: Array.isArray(data.tags) ? data.tags : [],
    productType: data.productType || data.type || 'product',
    price,
    images,
    primaryImage: images[0]?.url,
    rating,
    inventory,
    availabilityStatus,
    storeName: data.storeName || data.merchant,
    store: data.store
      ? {
          id: data.store.id || data.store._id,
          name: data.store.name,
          slug: data.store.slug,
          logo: data.store.logo,
          image: data.store.image || data.store.banner,
          // Handle both 'rating' and 'ratings' (backend uses 'ratings')
          rating: data.store.ratings?.average || data.store.rating?.average || data.store.rating,
          ratingCount: data.store.ratings?.count || data.store.rating?.count,
          // Preserve full location object for address, city, coordinates
          location: data.store.location && typeof data.store.location === 'object'
            ? {
                address: data.store.location.address,
                city: data.store.location.city,
                state: data.store.location.state,
                pincode: data.store.location.pincode,
                coordinates: data.store.location.coordinates,
                deliveryRadius: data.store.location.deliveryRadius,
                landmark: data.store.location.landmark,
              }
            : data.store.location, // Fallback to string if that's what was passed
          deliveryTime: data.store.deliveryTime || data.store.operationalInfo?.deliveryTime,
          minimumOrder: data.store.minimumOrder || data.store.operationalInfo?.minimumOrder,
          isVerified: data.store.verified || data.store.isVerified,
          isOpen: data.store.status?.isOpen || data.store.isOpen || data.store.isCurrentlyOpen,
          // Preserve additional store data
          contact: data.store.contact,
          operationalInfo: data.store.operationalInfo,
        }
      : undefined,
    cashback: data.cashback
      ? {
          percentage: data.cashback.percentage || data.cashbackPercentage,
          amount: data.cashback.amount,
          maxAmount: data.cashback.maxAmount,
          minPurchase: data.cashback.minPurchase,
          description: data.cashback.description,
        }
      : undefined,
    discount: data.discount || data.discountPercentage,
    variants: data.variants,
    selectedVariant: data.selectedVariant,
    specifications: data.specifications,
    features: data.features,
    dimensions: data.dimensions,
    weight: data.weight,
    isNewArrival: data.isNewArrival,
    isFeatured: data.isFeatured,
    isTrending: data.isTrending,
    isBestseller: data.isBestseller,
    isOnSale: data.isOnSale,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    viewCount: data.viewCount,
    purchaseCount: data.purchaseCount,
    wishlistCount: data.wishlistCount,
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    keywords: data.keywords,
    shipping: data.shipping,
    metadata: data.metadata,
    // Preserve raw backend fields for components that need them
    pricing: data.pricing,
    ratings: data.ratings,
    analytics: data.analytics,
    computedCashback: data.computedCashback,
    computedDelivery: data.computedDelivery,
    todayPurchases: data.todayPurchases,
    todayViews: data.todayViews || data.analytics?.todayViews,
    deliveryInfo: data.deliveryInfo,
    // Preserve service-specific fields for travel/booking verticals
    serviceCategory: data.serviceCategory,
    serviceDetails: data.serviceDetails,
  };
}

/**
 * Convert price data to ProductPrice
 */
export function toProductPrice(data: any): ProductPrice {
  // Handle price as direct number OR as object with various structures
  // Also check pricing object (backend may return pricing.selling, pricing.basePrice, etc.)
  const priceField = data.price;
  const pricingField = data.pricing;

  const current =
    (typeof priceField === 'number' ? priceField : null) ||
    priceField?.current ||
    priceField?.selling ||
    priceField?.salePrice ||
    pricingField?.selling ||
    pricingField?.salePrice ||
    pricingField?.basePrice ||
    data.sellingPrice ||
    0;

  const original =
    (typeof data.originalPrice === 'number' ? data.originalPrice : null) ||
    priceField?.original ||
    priceField?.compare ||
    priceField?.basePrice ||
    pricingField?.original ||
    pricingField?.compare ||
    pricingField?.mrp ||
    pricingField?.basePrice ||
    data.originalPrice?.original ||
    data.mrp;

  const discount =
    data.price?.discount ||
    data.pricing?.discount ||
    data.discount ||
    (original && current < original
      ? Math.round(((original - current) / original) * 100)
      : undefined);

  return {
    current,
    original,
    currency: data.price?.currency || data.currency || 'INR',
    discount,
    savings: original ? original - current : undefined,
    formatted: data.price?.formatted,
    originalFormatted: data.price?.originalFormatted,
    tax: data.price?.tax,
  };
}

/**
 * Convert rating data to ProductRating
 */
export function toProductRating(data: any): ProductRating | undefined {
  const value =
    data.rating?.value ||
    data.rating?.average ||
    (typeof data.rating === 'number' ? data.rating : undefined) ||
    data.averageRating;

  const count =
    data.rating?.count ||
    data.reviewCount ||
    data.totalReviews ||
    0;

  if (value === undefined) return undefined;

  return {
    value: typeof value === 'string' ? parseFloat(value) : value,
    count,
    maxValue: data.rating?.maxValue || 5,
    breakdown: data.rating?.breakdown || data.ratingDistribution,
  };
}

/**
 * Convert inventory data to ProductInventory
 */
export function toProductInventory(data: any): ProductInventory {
  const stock = data.inventory?.stock ?? data.stock ?? 0;

  return {
    stock,
    isAvailable:
      data.inventory?.isAvailable ??
      (data.availabilityStatus === 'in_stock' ||
        data.availabilityStatus === 'low_stock') ??
      stock > 0,
    lowStockThreshold: data.inventory?.lowStockThreshold || 5,
    trackQuantity: data.inventory?.trackQuantity ?? true,
    allowBackorder: data.inventory?.allowBackorder ?? false,
    reservedCount: data.inventory?.reservedCount || 0,
    estimatedRestockDate: data.inventory?.estimatedRestockDate,
    maxOrderQuantity: data.inventory?.maxOrderQuantity,
    minOrderQuantity: data.inventory?.minOrderQuantity || 1,
  };
}

/**
 * Convert image data to ProductImage array
 */
export function toProductImages(data: any): ProductImage[] {
  let imageData: any[] = [];

  if (Array.isArray(data.images)) {
    imageData = data.images;
  } else if (data.image) {
    imageData = [data.image];
  } else if (data.imageUrl) {
    imageData = [data.imageUrl];
  }

  return imageData.map((img, index) => {
    if (typeof img === 'string') {
      return {
        id: `img-${index}`,
        url: img,
        alt: data.name || data.title || '',
        thumbnail: img,
        fullsize: img,
        order: index,
        isPrimary: index === 0,
      };
    }

    return {
      id: img.id || `img-${index}`,
      url: img.url || img.uri || img,
      alt: img.alt || data.name || data.title || '',
      thumbnail: img.thumbnail || img.url || img.uri,
      fullsize: img.fullsize || img.url || img.uri,
      width: img.width,
      height: img.height,
      order: img.order ?? index,
      isPrimary: img.isPrimary ?? index === 0,
    };
  });
}

/**
 * Get availability status from inventory
 */
export function getAvailabilityStatus(
  inventory: ProductInventory
): ProductAvailabilityStatus {
  if (!inventory.isAvailable || inventory.stock <= 0) {
    return 'out_of_stock';
  }

  const threshold = inventory.lowStockThreshold || 5;
  if (inventory.stock <= threshold) {
    return 'low_stock';
  }

  return 'in_stock';
}

// ============================================================================
// STORE CONVERTERS
// ============================================================================

/**
 * Convert backend store to unified Store type
 */
export function toStore(data: any): Store {
  const id = data.id || data._id;
  if (!id) throw new Error('Store must have id or _id');

  return {
    id,
    slug: data.slug,
    name: data.name,
    description: data.description || '',
    shortDescription: data.shortDescription,
    category: data.category || '',
    subcategory: data.subcategory,
    tags: Array.isArray(data.tags) ? data.tags : [],
    storeType: data.storeType || data.type || 'both',
    logo: data.logo,
    coverImage: data.coverImage || data.image,
    images: Array.isArray(data.images) ? data.images : [],
    brandColor: data.brandColor,
    location: toStoreLocation(data.location),
    contact: {
      phone: data.contact?.phone || data.phone || '',
      alternatePhone: data.contact?.alternatePhone,
      email: data.contact?.email || data.email || '',
      alternateEmail: data.contact?.alternateEmail,
      website: data.contact?.website || data.website,
      whatsapp: data.contact?.whatsapp,
    },
    hours: toStoreBusinessHours(data.hours || data.businessHours),
    status: {
      isOpen: data.status?.isOpen ?? data.isOpen ?? true,
      status: data.status?.status || 'open',
      message: data.status?.message,
      nextChange: data.status?.nextChange,
      minutesUntilChange: data.status?.minutesUntilChange,
    },
    rating: toStoreRating(data),
    verified: data.verified ?? false,
    featured: data.featured ?? false,
    isPartner: data.isPartner,
    partnerLevel: data.partnerLevel,
    trustScore: data.trustScore,
    services: Array.isArray(data.services) ? data.services : [],
    features: Array.isArray(data.features) ? data.features : [],
    delivery: data.delivery,
    pickup: data.pickup,
    cashbackPercentage: data.cashbackPercentage,
    activeOffersCount: data.activeOffersCount,
    paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
    hasRezPay: data.hasRezPay,
    socialMedia: data.socialMedia,
    policies: data.policies,
    productCount: data.productCount,
    salesCount: data.salesCount,
    viewCount: data.viewCount,
    followerCount: data.followerCount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isActive: data.isActive ?? true,
    metadata: data.metadata,
  };
}

/**
 * Convert location data to StoreLocation
 */
export function toStoreLocation(data: any): StoreLocation {
  return {
    address: data?.address || data?.street || '',
    addressLine1: data?.addressLine1,
    addressLine2: data?.addressLine2,
    city: data?.city || '',
    state: data?.state || '',
    country: data?.country || 'India',
    postalCode: data?.postalCode || data?.zip,
    coordinates: {
      latitude: data?.coordinates?.latitude || data?.coordinates?.lat || data?.lat || 0,
      longitude: data?.coordinates?.longitude || data?.coordinates?.lng || data?.lng || 0,
    },
    distance: data?.distance,
    landmark: data?.landmark,
  };
}

/**
 * Convert business hours data
 */
export function toStoreBusinessHours(data: any): StoreBusinessHours {
  const defaultDay = { isOpen: true, open: '09:00', close: '21:00' };

  return {
    monday: data?.monday || defaultDay,
    tuesday: data?.tuesday || defaultDay,
    wednesday: data?.wednesday || defaultDay,
    thursday: data?.thursday || defaultDay,
    friday: data?.friday || defaultDay,
    saturday: data?.saturday || defaultDay,
    sunday: data?.sunday || defaultDay,
    timezone: data?.timezone,
    specialHours: data?.specialHours,
  };
}

/**
 * Convert store rating data
 */
export function toStoreRating(data: any): StoreRating | undefined {
  const value =
    data.rating?.value ||
    data.rating?.average ||
    (typeof data.rating === 'number' ? data.rating : undefined);

  const count = data.rating?.count || data.reviewCount || 0;

  if (value === undefined) return undefined;

  return {
    value,
    count,
    maxValue: 5,
    breakdown: data.rating?.breakdown || data.ratingDistribution,
  };
}

// ============================================================================
// CART CONVERTERS
// ============================================================================

/**
 * Convert cart item data to CartItem
 */
export function toCartItem(data: any): CartItem {
  return {
    id: data.id || data._id,
    productId: data.productId || data.product?._id || data.product?.id,
    storeId: data.storeId || data.store?._id || data.store?.id,
    name: data.name || data.productName,
    image: data.image || data.productImage,
    category: data.category || 'products',
    price: data.price || 0,
    originalPrice: data.originalPrice,
    discountedPrice: data.discountedPrice,
    discountPercentage: data.discountPercentage,
    quantity: data.quantity || 1,
    maxQuantity: data.maxQuantity,
    minQuantity: data.minQuantity,
    variant: data.variant,
    variantText: data.variantText,
    cashback: data.cashback || '0%',
    cashbackAmount: data.cashbackAmount,
    inventory: data.inventory,
    availabilityStatus: data.availabilityStatus,
    selected: data.selected !== false,
    storeName: data.storeName,
    isLocked: data.isLocked,
    lockExpiresAt: data.lockExpiresAt,
    lockId: data.lockId,
    instructions: data.instructions,
    metadata: data.metadata,
    addedAt: data.addedAt,
    updatedAt: data.updatedAt,
  };
}

// ============================================================================
// ORDER CONVERTERS
// ============================================================================

/**
 * Convert order data to Order
 */
export function toOrder(data: any): Order {
  return {
    id: data.id || data._id,
    orderNumber: data.orderNumber,
    userId: data.userId || data.user?._id || data.user?.id,
    items: Array.isArray(data.items) ? data.items.map(toOrderItem) : [],
    pricing: toOrderPricing(data.pricing || data),
    status: data.status,
    paymentStatus: data.paymentStatus,
    deliveryStatus: data.deliveryStatus,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress,
    paymentMethod: data.paymentMethod,
    paymentId: data.paymentId,
    paidAt: data.paidAt,
    deliveryMethod: data.deliveryMethod || 'standard',
    tracking: data.tracking,
    estimatedDeliveryDate: data.estimatedDeliveryDate || data.estimatedDelivery,
    actualDeliveryDate: data.actualDeliveryDate || data.actualDelivery,
    storeId: data.storeId,
    storeName: data.storeName,
    stores: data.stores,
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    customerNotes: data.customerNotes || data.notes,
    deliveryInstructions: data.deliveryInstructions,
    internalNotes: data.internalNotes,
    canCancel: data.canCancel,
    canReturn: data.canReturn,
    cancellation: data.cancellation,
    return: data.return,
    invoiceNumber: data.invoiceNumber,
    invoiceUrl: data.invoiceUrl,
    source: data.source,
    deviceType: data.deviceType,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    metadata: data.metadata,
  };
}

/**
 * Convert order item data
 */
export function toOrderItem(data: any): OrderItem {
  return {
    id: data.id || data._id,
    productId: data.productId,
    productName: data.productName || data.name,
    productImage: data.productImage || data.image,
    sku: data.sku,
    variant: data.variant,
    variantText: data.variantText,
    quantity: data.quantity,
    price: data.price,
    originalPrice: data.originalPrice,
    discount: data.discount,
    subtotal: data.subtotal || data.totalPrice || data.price * data.quantity,
    cashback: data.cashback,
    status: data.status,
    canCancel: data.canCancel,
    canReturn: data.canReturn,
    storeId: data.storeId,
    storeName: data.storeName,
    instructions: data.instructions,
    metadata: data.metadata,
  };
}

/**
 * Convert order pricing data
 */
export function toOrderPricing(data: any): OrderPricing {
  return {
    subtotal: data.subtotal || 0,
    discount: data.discount || 0,
    discountBreakdown: data.discountBreakdown,
    tax: data.tax || 0,
    taxBreakdown: data.taxBreakdown,
    shipping: data.shipping || 0,
    handlingFee: data.handlingFee,
    packagingFee: data.packagingFee,
    otherFees: data.otherFees,
    total: data.total || 0,
    amountPaid: data.amountPaid,
    amountRefunded: data.amountRefunded,
    currency: data.currency || 'INR',
    totalCashback: data.totalCashback || data.cashback,
    totalSavings: data.totalSavings || data.discount || 0,
  };
}

// ============================================================================
// REVIEW CONVERTERS
// ============================================================================

/**
 * Convert review data to Review
 */
export function toReview(data: any): Review {
  return {
    id: data.id || data._id,
    type: data.type || 'product',
    productId: data.productId || data.product?._id || data.product?.id,
    storeId: data.storeId || data.store?._id || data.store?.id || data.store,
    orderId: data.orderId,
    user: toReviewUser(data.user),
    rating: data.rating,
    maxRating: data.maxRating || 5,
    title: data.title,
    comment: data.comment || data.text || data.reviewText,
    summary: data.summary,
    images: Array.isArray(data.images)
      ? data.images.map((img: any, idx: number) => toReviewImage(img, idx))
      : [],
    videos: data.videos,
    helpful: data.helpful || 0,
    notHelpful: data.notHelpful || 0,
    isHelpful: data.isHelpful,
    verified: data.verified || false,
    verificationBadge: data.verificationBadge,
    merchantReply: data.merchantReply,
    replies: data.replies,
    isActive: data.isActive !== false,
    status: data.status,
    moderationNotes: data.moderationNotes,
    cashbackEarned: data.cashbackEarned,
    pointsEarned: data.pointsEarned,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    editedAt: data.editedAt,
    purchaseVerifiedOn: data.purchaseVerifiedOn,
    reportCount: data.reportCount,
    isFeatured: data.isFeatured,
    metadata: data.metadata,
  };
}

/**
 * Convert review user data
 */
export function toReviewUser(data: any): ReviewUser {
  return {
    id: data?.id || data?._id || '',
    name: data?.name || data?.profile?.name || 'Anonymous',
    avatar: data?.avatar || data?.profile?.avatar,
    reviewerLevel: data?.reviewerLevel,
    totalReviews: data?.totalReviews,
    isTopReviewer: data?.isTopReviewer,
    location: data?.location || data?.profile?.location?.city,
  };
}

/**
 * Convert review image data
 */
export function toReviewImage(data: any, index: number): ReviewImage {
  if (typeof data === 'string') {
    return {
      id: `img-${index}`,
      url: data,
      thumbnail: data,
      alt: '',
      order: index,
    };
  }

  return {
    id: data.id || `img-${index}`,
    url: data.url || data.uri || data,
    thumbnail: data.thumbnail || data.url || data.uri,
    caption: data.caption,
    alt: data.alt || '',
    order: data.order ?? index,
  };
}
