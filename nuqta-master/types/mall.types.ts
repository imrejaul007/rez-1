/**
 * Mall Types
 *
 * TypeScript interfaces for Nuqta Mall feature
 */

// Brand tier type
export type BrandTier = 'standard' | 'premium' | 'exclusive' | 'luxury';

// Brand badge type
export type BrandBadge = 'exclusive' | 'premium' | 'new' | 'trending' | 'top-rated' | 'verified';

// Offer badge type
export type OfferBadge = 'limited-time' | 'mall-exclusive' | 'flash-sale' | 'best-deal';

// Banner position type
export type BannerPosition = 'hero' | 'inline' | 'footer';

// Mall Brand Interface
export interface MallBrand {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo: string;
  banner?: string[];
  tier: BrandTier;
  cashback: {
    percentage: number;
    maxAmount?: number;
    minPurchase?: number;
    earlyBirdBonus?: number;
  };
  ratings: {
    average: number;
    count: number;
    successRate: number;
  };
  mallCategory: MallCategory;
  badges: BrandBadge[];
  externalUrl?: string;
  /** The linked Store._id when this brand maps to an in-app store */
  storeId?: string;
  /** true when the brand is backed by an in-app Store (not external/affiliate) */
  isInAppStore?: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isLuxury: boolean;
  isNewArrival: boolean;
  newUntil?: string;
  analytics?: {
    views: number;
    clicks: number;
    purchases: number;
  };
  collections?: MallCollection[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Mall Category Interface
export interface MallCategory {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  image?: string;
  color: string;
  backgroundColor?: string;
  maxCashback: number;
  sortOrder: number;
  brandCount: number;
  isActive: boolean;
  isFeatured: boolean;
}

// Mall Collection Interface
export interface MallCollection {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description?: string;
  image: string;
  type: 'curated' | 'seasonal' | 'trending' | 'personalized';
  sortOrder: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  brandCount: number;
}

// Mall Offer Interface
export interface MallOffer {
  _id: string;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  brand?: MallBrand;
  store?: { _id: string; name: string; logo?: string; tags?: string[] };
  offerType: 'cashback' | 'discount' | 'coins' | 'combo';
  value: number;
  valueType: 'percentage' | 'fixed';
  extraCoins?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  minPurchase?: number;
  maxDiscount?: number;
  isMallExclusive: boolean;
  badge?: OfferBadge;
  priority: number;
  termsAndConditions?: string[];
}

// Mall Banner Interface
export interface MallBanner {
  _id: string;
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  image: string;
  backgroundColor: string;
  gradientColors?: string[];
  textColor: string;
  ctaText: string;
  ctaAction: 'navigate' | 'external' | 'brand' | 'category' | 'collection' | 'store';
  ctaUrl?: string;
  ctaBrand?: MallBrand;
  ctaCategory?: MallCategory;
  ctaCollection?: MallCollection;
  /** Store ID for ctaAction='store' — navigates to MainStorePage */
  ctaStoreId?: string;
  position: BannerPosition;
  priority: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

// Mall Homepage Data Interface (aggregated)
export interface MallHomepageData {
  banners: MallBanner[];
  featuredBrands: MallBrand[];
  collections: MallCollection[];
  categories: MallCategory[];
  exclusiveOffers: MallOffer[];
  newArrivals: MallBrand[];
  topRatedBrands: MallBrand[];
  luxuryBrands: MallBrand[];
}

// API Response types
export interface MallApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp?: string;
  };
}

// Brand filters for API calls
export interface MallBrandFilters {
  category?: string;
  tier?: BrandTier;
  collection?: string;
  minCashback?: number;
  badges?: BrandBadge[];
  search?: string;
  page?: number;
  limit?: number;
}

// Utility types for display
export interface MallBrandCardData {
  id: string;
  name: string;
  logo: string;
  tier: BrandTier;
  cashbackPercentage: number;
  cashbackDisplay: string;
  rating: number;
  ratingCount: number;
  successRate: number;
  badges: BrandBadge[];
  isNewArrival: boolean;
  isLuxury: boolean;
  earlyBirdBonus?: number;
  categoryName?: string;
  categoryColor?: string;
}

export interface MallCategoryCardData {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  backgroundColor?: string;
  maxCashback: number;
  brandCount: number;
}

export interface MallOfferCardData {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  brandName: string;
  brandLogo: string;
  value: number;
  valueType: 'percentage' | 'fixed';
  valueDisplay: string;
  validUntil: string;
  daysRemaining: number;
  badge?: OfferBadge;
  isMallExclusive: boolean;
}

export interface MallBannerData {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  image: string;
  gradientColors: string[];
  textColor: string;
  ctaText: string;
  ctaAction: string;
  ctaTarget?: string;
}

// Helper function types
export function formatCashback(percentage: number, maxAmount?: number, currencySymbol: string = '₹'): string {
  if (maxAmount) {
    return `Up to ${currencySymbol}${maxAmount}`;
  }
  return `${percentage}% cashback`;
}

export function getDaysRemaining(validUntil: string): number {
  const now = new Date();
  const end = new Date(validUntil);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatValueDisplay(value: number, valueType: 'percentage' | 'fixed', currencySymbol: string = '₹'): string {
  if (valueType === 'percentage') {
    return `${value}% off`;
  }
  return `${currencySymbol}${value} off`;
}

// Transform functions
export function transformBrandToCardData(brand: MallBrand): MallBrandCardData {
  return {
    id: brand._id || brand.id,
    name: brand.name,
    logo: brand.logo,
    tier: brand.tier,
    cashbackPercentage: brand.cashback?.percentage || 0,
    cashbackDisplay: formatCashback(brand.cashback?.percentage || 0, brand.cashback?.maxAmount),
    rating: brand.ratings?.average || 0,
    ratingCount: brand.ratings?.count || 0,
    successRate: brand.ratings?.successRate || 0,
    badges: brand.badges || [],
    isNewArrival: brand.isNewArrival,
    isLuxury: brand.isLuxury,
    earlyBirdBonus: brand.cashback?.earlyBirdBonus,
    categoryName: brand.mallCategory?.name,
    categoryColor: brand.mallCategory?.color
  };
}

export function transformCategoryToCardData(category: MallCategory): MallCategoryCardData {
  return {
    id: category._id || category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    color: category.color,
    backgroundColor: category.backgroundColor,
    maxCashback: category.maxCashback,
    brandCount: category.brandCount
  };
}

export function transformOfferToCardData(offer: MallOffer, currencySymbol: string = '₹'): MallOfferCardData {
  return {
    id: offer._id || offer.id,
    title: offer.title,
    subtitle: offer.subtitle,
    image: offer.image,
    brandName: offer.brand?.name || offer.store?.name || '',
    brandLogo: offer.brand?.logo || offer.store?.logo || '',
    value: offer.value,
    valueType: offer.valueType,
    valueDisplay: formatValueDisplay(offer.value, offer.valueType, currencySymbol),
    validUntil: offer.validUntil,
    daysRemaining: getDaysRemaining(offer.validUntil),
    badge: offer.badge,
    isMallExclusive: offer.isMallExclusive
  };
}

export function transformBannerToData(banner: MallBanner): MallBannerData {
  return {
    id: banner._id || banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    badge: banner.badge,
    image: banner.image,
    gradientColors: banner.gradientColors || [banner.backgroundColor],
    textColor: banner.textColor,
    ctaText: banner.ctaText,
    ctaAction: banner.ctaAction,
    ctaTarget: banner.ctaUrl || banner.ctaBrand?._id || banner.ctaCategory?.slug || banner.ctaCollection?.slug
  };
}
