// storeFeatures.ts
// Utility functions to determine which features to show based on store type

export type StoreType = 'PRODUCT' | 'SERVICE' | 'RESTAURANT' | 'HYBRID';

export interface StoreFeatureConfig {
  // Product-related features
  showProducts: boolean;
  showCart: boolean;
  showWishlist: boolean;
  showProductReviews: boolean;

  // Service-related features
  showBookings: boolean;
  showAppointments: boolean;
  showServices: boolean;

  // Bill payment features
  showPayBill: boolean;
  showBillHistory: boolean;

  // Vouchers & Offers
  showVouchers: boolean;
  showOffers: boolean;

  // Restaurant-specific features
  showMenu: boolean;
  showTableBooking: boolean;
  showOrderHistory: boolean;

  // Communication
  showMessaging: boolean;
  showCallStore: boolean;

  // Navigation & Location
  showDirections: boolean;
  showStoreHours: boolean;

  // Reviews & Ratings
  showStoreReviews: boolean;
  showShareStore: boolean;
}

/**
 * Get feature configuration based on store type
 */
export function getStoreFeatures(storeType: StoreType): StoreFeatureConfig {
  switch (storeType) {
    case 'PRODUCT':
      return {
        // Products
        showProducts: true,
        showCart: true,
        showWishlist: true,
        showProductReviews: true,

        // Services
        showBookings: false,
        showAppointments: false,
        showServices: false,

        // Bill Payment
        showPayBill: false,
        showBillHistory: false,

        // Vouchers
        showVouchers: true,
        showOffers: true,

        // Restaurant
        showMenu: false,
        showTableBooking: false,
        showOrderHistory: true,

        // Communication
        showMessaging: true,
        showCallStore: true,

        // Navigation
        showDirections: true,
        showStoreHours: true,

        // Reviews
        showStoreReviews: true,
        showShareStore: true,
      };

    case 'SERVICE':
      return {
        // Products
        showProducts: false,
        showCart: false,
        showWishlist: false,
        showProductReviews: false,

        // Services
        showBookings: true,
        showAppointments: true,
        showServices: true,

        // Bill Payment
        showPayBill: true,
        showBillHistory: true,

        // Vouchers
        showVouchers: true,
        showOffers: true,

        // Restaurant
        showMenu: false,
        showTableBooking: false,
        showOrderHistory: false,

        // Communication
        showMessaging: true,
        showCallStore: true,

        // Navigation
        showDirections: true,
        showStoreHours: true,

        // Reviews
        showStoreReviews: true,
        showShareStore: true,
      };

    case 'RESTAURANT':
      return {
        // Products
        showProducts: false,
        showCart: true, // For food items
        showWishlist: true, // Favorite dishes
        showProductReviews: true, // Dish reviews

        // Services
        showBookings: false,
        showAppointments: false,
        showServices: false,

        // Bill Payment
        showPayBill: true,
        showBillHistory: true,

        // Vouchers
        showVouchers: true,
        showOffers: true,

        // Restaurant
        showMenu: true,
        showTableBooking: true,
        showOrderHistory: true,

        // Communication
        showMessaging: true,
        showCallStore: true,

        // Navigation
        showDirections: true,
        showStoreHours: true,

        // Reviews
        showStoreReviews: true,
        showShareStore: true,
      };

    case 'HYBRID':
      return {
        // All features enabled
        showProducts: true,
        showCart: true,
        showWishlist: true,
        showProductReviews: true,

        showBookings: true,
        showAppointments: true,
        showServices: true,

        showPayBill: true,
        showBillHistory: true,

        showVouchers: true,
        showOffers: true,

        showMenu: true,
        showTableBooking: true,
        showOrderHistory: true,

        showMessaging: true,
        showCallStore: true,

        showDirections: true,
        showStoreHours: true,

        showStoreReviews: true,
        showShareStore: true,
      };

    default:
      // Default to PRODUCT features
      return getStoreFeatures('PRODUCT');
  }
}

/**
 * Determine store type from category or tags
 */
export function detectStoreType(
  category?: string,
  tags?: string[],
  deliveryCategories?: any
): StoreType {
  const categoryLower = category?.toLowerCase() || '';
  const tagsLower = tags?.map((t) => t.toLowerCase()) || [];

  // Service-based stores
  const serviceCategories = [
    'salon',
    'spa',
    'beauty',
    'healthcare',
    'clinic',
    'hospital',
    'gym',
    'fitness',
    'repair',
    'maintenance',
    'cleaning',
  ];

  // Restaurant categories
  const restaurantCategories = [
    'restaurant',
    'cafe',
    'food',
    'dining',
    'bakery',
    'fast food',
    'pizza',
    'burger',
    'indian',
    'chinese',
    'italian',
  ];

  // Check if restaurant
  if (
    restaurantCategories.some(
      (cat) => categoryLower.includes(cat) || tagsLower.some((tag) => tag.includes(cat))
    )
  ) {
    return 'RESTAURANT';
  }

  // Check if service
  if (
    serviceCategories.some(
      (cat) => categoryLower.includes(cat) || tagsLower.some((tag) => tag.includes(cat))
    )
  ) {
    return 'SERVICE';
  }

  // Check for hybrid (has both product and service indicators)
  const hasProductIndicators =
    categoryLower.includes('store') ||
    categoryLower.includes('shop') ||
    categoryLower.includes('mart') ||
    categoryLower.includes('retail');

  const hasServiceIndicators = serviceCategories.some(
    (cat) => tagsLower.some((tag) => tag.includes(cat))
  );

  if (hasProductIndicators && hasServiceIndicators) {
    return 'HYBRID';
  }

  // Default to PRODUCT
  return 'PRODUCT';
}

/**
 * Get quick actions for store type
 */
export function getQuickActionsForStore(
  storeType: StoreType,
  contact?: { phone?: string },
  location?: { coordinates?: [number, number] },
  hasMenu?: boolean,
  allowBooking?: boolean
): Array<{
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}> {
  const features = getStoreFeatures(storeType);

  return [
    {
      id: 'book',
      label: 'Book Appointment',
      icon: 'calendar',
      visible: features.showAppointments && (allowBooking ?? true),
    },
    {
      id: 'menu',
      label: 'View Menu',
      icon: 'restaurant',
      visible: features.showMenu && (hasMenu ?? true),
    },
    {
      id: 'table',
      label: 'Book Table',
      icon: 'time',
      visible: features.showTableBooking,
    },
    {
      id: 'services',
      label: 'View Services',
      icon: 'list',
      visible: features.showServices,
    },
    {
      id: 'call',
      label: 'Call Store',
      icon: 'call',
      visible: features.showCallStore && !!contact?.phone,
    },
    {
      id: 'directions',
      label: 'Get Directions',
      icon: 'navigate',
      visible: features.showDirections && !!location?.coordinates,
    },
    {
      id: 'message',
      label: 'Message',
      icon: 'chatbubble',
      visible: features.showMessaging,
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: 'receipt',
      visible: features.showOrderHistory,
    },
  ].filter((action) => action.visible);
}

/**
 * Check if store should show bill payment feature
 */
export function shouldShowPayBill(storeType: StoreType, category?: string): boolean {
  const features = getStoreFeatures(storeType);

  // Always show for SERVICE and RESTAURANT
  if (features.showPayBill) {
    return true;
  }

  // Show for specific product categories that might accept bill payments
  const billPaymentCategories = ['electronics', 'furniture', 'jewelry', 'appliances'];
  const categoryLower = category?.toLowerCase() || '';

  return billPaymentCategories.some((cat) => categoryLower.includes(cat));
}

/**
 * Get section order for store page based on type
 */
export function getStoreSectionOrder(storeType: StoreType): string[] {
  switch (storeType) {
    case 'PRODUCT':
      return [
        'header',
        'images',
        'tabs',
        'details',
        'cashback',
        'products',
        'ugc',
        'vouchers',
        'reviews',
        'footer',
      ];

    case 'SERVICE':
      return [
        'header',
        'images',
        'tabs',
        'details',
        'cashback',
        'payBill',
        'quickActions',
        'services',
        'vouchers',
        'ugc',
        'reviews',
        'footer',
      ];

    case 'RESTAURANT':
      return [
        'header',
        'images',
        'tabs',
        'details',
        'cashback',
        'menu',
        'payBill',
        'quickActions',
        'vouchers',
        'ugc',
        'reviews',
        'footer',
      ];

    case 'HYBRID':
      return [
        'header',
        'images',
        'tabs',
        'details',
        'cashback',
        'quickActions',
        'products',
        'services',
        'payBill',
        'vouchers',
        'ugc',
        'reviews',
        'footer',
      ];

    default:
      return getStoreSectionOrder('PRODUCT');
  }
}

/**
 * Format store type display name
 */
export function formatStoreType(storeType: StoreType): string {
  const names: Record<StoreType, string> = {
    PRODUCT: 'Product Store',
    SERVICE: 'Service Provider',
    RESTAURANT: 'Restaurant',
    HYBRID: 'Store & Services',
  };

  return names[storeType] || 'Store';
}
