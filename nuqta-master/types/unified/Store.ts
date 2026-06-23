/**
 * Unified Store Type Definition
 *
 * This is the CANONICAL store interface used throughout the application.
 * All store data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Location structure: Nested object with address, coordinates, city, state
 * - Hours structure: Nested object by day with open/close times
 * - Rating structure: Nested object with value, count
 */

// ============================================================================
// CORE STORE INTERFACE
// ============================================================================

export interface Store {
  // ========== IDENTIFIERS ==========
  /** Primary identifier - ALWAYS use 'id', never '_id' */
  id: string;

  /** URL-friendly slug for SEO */
  slug?: string;

  // ========== BASIC INFORMATION ==========
  /** Store name */
  name: string;

  /** Store description */
  description: string;

  /** Short description for cards/previews */
  shortDescription?: string;

  /** Store category */
  category: StoreCategory | string;

  /** Store subcategory */
  subcategory?: string;

  /** Store tags for filtering/search */
  tags: string[];

  /** Store type */
  storeType: 'physical' | 'online' | 'both';

  // ========== BRANDING ==========
  /** Store logo URL */
  logo?: string;

  /** Store cover image */
  coverImage?: string;

  /** Additional store images */
  images: string[];

  /** Brand color (hex code) */
  brandColor?: string;

  // ========== LOCATION ==========
  /** Store location information */
  location: StoreLocation;

  // ========== CONTACT INFORMATION ==========
  /** Contact information */
  contact: StoreContact;

  // ========== BUSINESS HOURS ==========
  /** Business hours */
  hours: StoreBusinessHours;

  /** Current store status */
  status: StoreStatus;

  // ========== RATINGS & REVIEWS ==========
  /** Store rating */
  rating?: StoreRating;

  // ========== VERIFICATION & TRUST ==========
  /** Is store verified? */
  verified: boolean;

  /** Is store featured? */
  featured: boolean;

  /** Is store a partner? */
  isPartner?: boolean;

  /** Partner level */
  partnerLevel?: 'gold' | 'silver' | 'bronze';

  /** Trust score (0-100) */
  trustScore?: number;

  // ========== SERVICES & FEATURES ==========
  /** Available services */
  services: StoreService[];

  /** Store features/amenities */
  features: StoreFeature[];

  // ========== DELIVERY & PICKUP ==========
  /** Delivery information */
  delivery?: StoreDelivery;

  /** Pickup information */
  pickup?: StorePickup;

  // ========== CASHBACK & OFFERS ==========
  /** Cashback percentage */
  cashbackPercentage?: number;

  /** Active offers count */
  activeOffersCount?: number;

  // ========== PAYMENT METHODS ==========
  /** Accepted payment methods */
  paymentMethods: PaymentMethod[];

  /** Supports RezPay? */
  hasRezPay?: boolean;

  // ========== SOCIAL MEDIA ==========
  /** Social media links */
  socialMedia?: StoreSocialMedia;

  // ========== POLICIES ==========
  /** Store policies */
  policies?: StorePolicies;

  // ========== STATISTICS ==========
  /** Total products */
  productCount?: number;

  /** Total sales */
  salesCount?: number;

  /** View count */
  viewCount?: number;

  /** Follower count */
  followerCount?: number;

  // ========== METADATA ==========
  /** Creation timestamp */
  createdAt?: string | Date;

  /** Last update timestamp */
  updatedAt?: string | Date;

  /** Is store active? */
  isActive?: boolean;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// LOCATION STRUCTURE
// ============================================================================

export interface StoreLocation {
  /** Full address */
  address: string;

  /** Address line 1 */
  addressLine1?: string;

  /** Address line 2 */
  addressLine2?: string;

  /** City */
  city: string;

  /** State/Province */
  state: string;

  /** Country */
  country: string;

  /** Postal/ZIP code */
  postalCode?: string;

  /** Geographic coordinates */
  coordinates: StoreCoordinates;

  /** Distance from user (calculated) */
  distance?: string;

  /** Landmark */
  landmark?: string;
}

export interface StoreCoordinates {
  /** Latitude */
  latitude: number;

  /** Longitude */
  longitude: number;
}

// ============================================================================
// CONTACT STRUCTURE
// ============================================================================

export interface StoreContact {
  /** Primary phone number */
  phone: string;

  /** Alternative phone number */
  alternatePhone?: string;

  /** Primary email */
  email: string;

  /** Alternative email */
  alternateEmail?: string;

  /** Website URL */
  website?: string;

  /** WhatsApp number */
  whatsapp?: string;
}

// ============================================================================
// BUSINESS HOURS STRUCTURE
// ============================================================================

export interface StoreBusinessHours {
  /** Monday hours */
  monday: DayHours;

  /** Tuesday hours */
  tuesday: DayHours;

  /** Wednesday hours */
  wednesday: DayHours;

  /** Thursday hours */
  thursday: DayHours;

  /** Friday hours */
  friday: DayHours;

  /** Saturday hours */
  saturday: DayHours;

  /** Sunday hours */
  sunday: DayHours;

  /** Timezone */
  timezone?: string;

  /** Special hours (holidays, etc.) */
  specialHours?: SpecialHours[];
}

export interface DayHours {
  /** Is store open on this day? */
  isOpen: boolean;

  /** Opening time (24-hour format: "09:00") */
  open?: string;

  /** Closing time (24-hour format: "21:00") */
  close?: string;

  /** Is this a 24-hour day? */
  is24Hours?: boolean;

  /** Break times (if any) */
  breaks?: TimeBreak[];
}

export interface TimeBreak {
  /** Break start time */
  start: string;

  /** Break end time */
  end: string;
}

export interface SpecialHours {
  /** Special date */
  date: string | Date;

  /** Reason (holiday name, event, etc.) */
  reason: string;

  /** Hours for this special day */
  hours: DayHours;
}

// ============================================================================
// STORE STATUS
// ============================================================================

export interface StoreStatus {
  /** Is store currently open? */
  isOpen: boolean;

  /** Current status */
  status: 'open' | 'closed' | 'closing_soon' | 'opening_soon' | 'temporarily_closed';

  /** Status message */
  message?: string;

  /** Next status change time */
  nextChange?: string;

  /** Minutes until next change */
  minutesUntilChange?: number;
}

// ============================================================================
// RATING STRUCTURE
// ============================================================================

export interface StoreRating {
  /** Average rating value (0-5) */
  value: number;

  /** Total number of ratings */
  count: number;

  /** Maximum possible rating (default: 5) */
  maxValue?: number;

  /** Rating distribution by stars */
  breakdown?: StoreRatingBreakdown;
}

export interface StoreRatingBreakdown {
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
// CATEGORY STRUCTURE
// ============================================================================

export interface StoreCategory {
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
}

// ============================================================================
// SERVICES & FEATURES
// ============================================================================

export interface StoreService {
  /** Service identifier */
  id: string;

  /** Service name */
  name: string;

  /** Service description */
  description?: string;

  /** Service icon */
  icon?: string;

  /** Is service available? */
  isAvailable: boolean;

  /** Service price (if applicable) */
  price?: number;
}

export interface StoreFeature {
  /** Feature identifier */
  id: string;

  /** Feature name */
  name: string;

  /** Feature icon */
  icon?: string;

  /** Is feature available? */
  isAvailable: boolean;
}

// ============================================================================
// DELIVERY STRUCTURE
// ============================================================================

export interface StoreDelivery {
  /** Is delivery available? */
  isAvailable: boolean;

  /** Free delivery available? */
  freeDelivery?: boolean;

  /** Minimum order for delivery */
  minimumOrder?: number;

  /** Delivery fee */
  deliveryFee?: number;

  /** Estimated delivery time */
  estimatedTime?: string;

  /** Delivery radius (in km) */
  radius?: number;

  /** Delivery zones */
  zones?: DeliveryZone[];
}

export interface DeliveryZone {
  /** Zone name */
  name: string;

  /** Delivery fee for this zone */
  fee: number;

  /** Estimated delivery time */
  estimatedTime: string;

  /** Postal codes in this zone */
  postalCodes?: string[];
}

// ============================================================================
// PICKUP STRUCTURE
// ============================================================================

export interface StorePickup {
  /** Is pickup available? */
  isAvailable: boolean;

  /** Pickup instructions */
  instructions?: string;

  /** Estimated preparation time */
  estimatedTime?: string;

  /** Pickup locations (if different from main store) */
  locations?: StoreLocation[];
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'upi'
  | 'wallet'
  | 'net_banking'
  | 'emi'
  | 'cod'
  | 'rezpay';

// ============================================================================
// SOCIAL MEDIA
// ============================================================================

export interface StoreSocialMedia {
  /** Facebook URL */
  facebook?: string;

  /** Instagram URL */
  instagram?: string;

  /** Twitter URL */
  twitter?: string;

  /** YouTube URL */
  youtube?: string;

  /** LinkedIn URL */
  linkedin?: string;

  /** TikTok URL */
  tiktok?: string;
}

// ============================================================================
// POLICIES
// ============================================================================

export interface StorePolicies {
  /** Return policy */
  returnPolicy?: string;

  /** Refund policy */
  refundPolicy?: string;

  /** Privacy policy */
  privacyPolicy?: string;

  /** Terms and conditions */
  termsAndConditions?: string;

  /** Shipping policy */
  shippingPolicy?: string;

  /** Cancellation policy */
  cancellationPolicy?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Store with required fields for cards/previews */
export type StorePreview = Pick<
  Store,
  'id' | 'name' | 'logo' | 'rating' | 'location' | 'cashbackPercentage' | 'category'
>;

/** Store with required fields for search results */
export type SearchStore = Pick<
  Store,
  'id' | 'name' | 'description' | 'logo' | 'rating' | 'location' | 'category' | 'tags'
>;

/** Minimal store information for product references */
export type ProductStoreRef = Pick<
  Store,
  'id' | 'name' | 'logo' | 'rating' | 'location'
>;
