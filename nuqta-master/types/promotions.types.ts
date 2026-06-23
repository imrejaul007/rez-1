/**
 * Promotion Banner Types
 * Defines types for store promotions and banners
 */

export type PromotionBannerType =
  | 'flash_sale'
  | 'limited_offer'
  | 'weekend_special'
  | 'clearance'
  | 'new_arrivals'
  | 'seasonal'
  | 'exclusive';

export interface PromotionBanner {
  id: string;
  type: PromotionBannerType;
  title: string;
  subtitle?: string;
  discountText: string; // e.g., "50% OFF", "Buy 1 Get 1"
  backgroundColor?: string[]; // Gradient colors, defaults to purple-pink
  textColor?: string; // Default: white
  expiryDate?: string | Date;
  ctaText?: string; // Default: "Shop Now"
  ctaAction?: () => void;
  image?: string; // Optional banner image URL
  priority: number; // For sorting (higher = more urgent)
  storeId?: string;
  targetUrl?: string; // Navigation URL
  termsAndConditions?: string[];
  isActive?: boolean;
  startDate?: string | Date;
  analytics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
  };
}

export interface PromotionBannerProps {
  banners: PromotionBanner[];
  storeId?: string;
  storeName?: string;
  onBannerPress?: (banner: PromotionBanner) => void;
  onDismiss?: (bannerId: string) => void;
  autoRotate?: boolean;
  rotationInterval?: number; // milliseconds, default: 5000
  showCountdown?: boolean;
  containerStyle?: any;
}

export interface PromotionBannerItemProps {
  banner: PromotionBanner;
  onPress?: (banner: PromotionBanner) => void;
  onDismiss?: (bannerId: string) => void;
  showCountdown?: boolean;
  isActive?: boolean;
}

export interface PromotionsApiResponse {
  success: boolean;
  data: {
    promotions: PromotionBanner[];
    totalCount: number;
    activeCount: number;
  };
  message?: string;
  timestamp: string;
}

export interface GetPromotionsRequest {
  storeId?: string;
  type?: PromotionBannerType;
  isActive?: boolean;
  includeExpired?: boolean;
  limit?: number;
  sortBy?: 'priority' | 'expiry' | 'created';
  order?: 'asc' | 'desc';
}

// Helper type for banner analytics tracking
export interface BannerAnalyticsEvent {
  bannerId: string;
  eventType: 'impression' | 'click' | 'dismiss' | 'conversion';
  timestamp: Date;
  userId?: string;
  storeId?: string;
  metadata?: Record<string, any>;
}
