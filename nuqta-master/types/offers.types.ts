export interface Offer {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  originalPrice?: number;
  discountedPrice?: number;
  cashBackPercentage: number;
  distance: string;
  category: string;
  isNew?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isSpecial?: boolean;
  description?: string;
  store: {
    name: string;
    rating?: number;
    verified?: boolean;
  };
}

export interface OfferSection {
  id: string;
  title: string;
  subtitle?: string;
  offers: Offer[];
  viewAllEnabled: boolean;
  backgroundColor?: string;
  titleColor?: string;
}

export interface OfferCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  offers: Offer[];
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaAction: string;
  backgroundColor: string;
}

export interface OffersPageData {
  heroBanner: HeroBanner;
  sections: OfferSection[];
  categories: OfferCategory[];
  userPoints: number;
}

export interface OfferFilters {
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  cashBackMin?: number;
  distance?: string;
  sortBy?: 'distance' | 'cashback' | 'price' | 'newest';
}

export interface OfferState {
  offers: OffersPageData | null;
  loading: boolean;
  error: string | null;
  filters: OfferFilters;
  favorites: string[];
}

// ============================================================================
// NEW TYPES FOR REDESIGNED OFFERS PAGE
// ============================================================================

export interface StoreInfo {
  id: string;
  name: string;
  logo: string;
  rating?: number;
  verified?: boolean;
}

// Lightning Deal / Flash Sale
export interface LightningDeal {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  originalPrice: number;
  discountedPrice: number;
  cashbackPercentage: number;
  discountPercentage: number;
  totalQuantity: number;
  claimedQuantity: number;
  endTime: string; // ISO date
  promoCode?: string;
}

// Nearby Offer
export interface NearbyOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  cashbackPercentage: number;
  distance: string;
  deliveryFee: number;
  deliveryTime: string;
  rating: number;
  isFreeDelivery: boolean;
}

// Today's Offer
export interface TodaysOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  discountPercentage: number;
  cashbackPercentage: number;
  expiresAt: string;
  isNew?: boolean;
  isTrending?: boolean;
}

// Discount Bucket
export interface DiscountBucket {
  id: string;
  label: string; // "25% OFF", "50% OFF", "80% OFF", "Free Delivery"
  icon: string;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  count: number;
  filterValue: string;
}

// Trending Offer
export interface TrendingOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  cashbackPercentage: number;
  redemptionCount: number;
  rank?: number;
}

// AI Recommended Offer
export interface AIRecommendedOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  cashbackPercentage: number;
  matchScore: number; // 0-100
  reason: string; // e.g., "Based on your food preferences"
}

// Friend Redeemed Offer
export interface FriendRedeemedOffer {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  offer: {
    id: string;
    title: string;
    image: string;
    store: string;
    savings: number;
    cashbackPercentage: number;
  };
  redeemedAt: string;
}

// Hotspot Deal
export interface HotspotDeal {
  id: string;
  areaName: string;
  areaId: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  deals: Offer[];
  totalDeals: number;
}

// Cashback Store
export interface CashbackStore {
  id: string;
  name: string;
  logo: string;
  cashbackPercentage: number;
  category: string;
  isSuper: boolean;
  maxCashback?: number;
}

// Double Cashback Campaign
export interface DoubleCashbackCampaign {
  id: string;
  title: string;
  subtitle: string;
  multiplier: number; // 2 for double, 3 for triple
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  terms: string[];
  backgroundColor: string;
}

// Exclusive Category
export interface ExclusiveCategory {
  id: string;
  name: string; // "Student", "Corporate", "Women", "Birthday"
  slug: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  offersCount: number;
  description?: string;
}

// Exclusive Zone Offer
export interface ExclusiveZoneOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  cashbackPercentage: number;
  zone: 'student' | 'corporate' | 'women' | 'birthday';
  eligibilityRequirement?: string;
}

// Sales & Clearance Offer
export interface SaleOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  originalPrice: number;
  salePrice: number;
  discountPercentage: number;
  cashbackPercentage: number;
  tag: 'clearance' | 'sale' | 'last_pieces';
}

// Buy 1 Get 1 Offer
export interface BOGOOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  originalPrice: number;
  bogoType: 'buy1get1' | 'buy2get1' | 'buy1get50';
  cashbackPercentage: number;
  validUntil: string;
}

// Free Delivery Offer
export interface FreeDeliveryOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  store: StoreInfo;
  cashbackPercentage: number;
  minOrderValue?: number;
  rating: number;
}

// Big Coin Drop (Cashback)
export interface CoinDrop {
  id: string;
  storeName: string;
  storeLogo: string;
  multiplier: number; // 2x, 3x, 5x
  normalCashback: number;
  boostedCashback: number;
  endTime: string;
  category: string;
}

// Upload Bill Store
export interface UploadBillStore {
  id: string;
  name: string;
  logo: string;
  category: string;
  coinsPerRupee: number;
  maxCoinsPerBill: number;
}

// Bank & Wallet Offer
export interface BankOffer {
  id: string;
  bankName: string;
  bankLogo: string;
  offerTitle: string;
  discountPercentage: number;
  maxDiscount: number;
  minTransactionAmount: number;
  cardType: 'credit' | 'debit' | 'wallet';
  validUntil: string;
  terms: string;
}

// Loyalty Progress
export interface LoyaltyProgress {
  id: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  reward: string;
  rewardCoins: number;
  icon: string;
  color: string;
}

// Special Profile Category
export interface SpecialProfile {
  id: string;
  name: string;
  slug: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  offersCount: number;
  isVerified: boolean;
}

// Tab types
export type OffersTabType = 'offers' | 'cashback' | 'exclusive';

// Section data types
export interface OffersSectionData {
  lightningDeals: LightningDeal[];
  nearbyOffers: NearbyOffer[];
  todaysOffers: TodaysOffer[];
  discountBuckets: DiscountBucket[];
  trendingOffers: TrendingOffer[];
  aiRecommended: AIRecommendedOffer[];
  friendsRedeemed: FriendRedeemedOffer[];
  hotspotDeals: HotspotDeal[];
  lastChanceOffers: LightningDeal[];
  newTodayOffers: TodaysOffer[];
}

export interface CashbackSectionData {
  doubleCashbackCampaign: DoubleCashbackCampaign | null;
  superCashbackStores: CashbackStore[];
  cashbackOffers: Offer[];
}

export interface ExclusiveSectionData {
  categories: ExclusiveCategory[];
  studentOffers: ExclusiveZoneOffer[];
  corporateOffers: ExclusiveZoneOffer[];
  womenOffers: ExclusiveZoneOffer[];
  birthdayOffers: ExclusiveZoneOffer[];
}