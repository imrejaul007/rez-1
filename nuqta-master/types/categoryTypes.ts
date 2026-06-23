/**
 * Category Types - Shared TypeScript interfaces for all category pages
 * Used with dummy data and future API integration
 */

// ============================================
// Category Grid Types
// ============================================

export interface CategoryGridItem {
  id: string;
  name: string;
  slug?: string;
  icon: string; // emoji fallback
  color: string;
  cashback?: number;
  itemCount?: number;
  image?: any; // local require() image source
}

// ============================================
// Vibe & Occasion Types (Fashion, etc.)
// ============================================

export interface Vibe {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface Occasion {
  id: string;
  name: string;
  icon: string;
  color: string;
  tag?: string | null; // e.g., "Hot", "Trending", "Coming Soon"
  discount: number;
}

// ============================================
// Trending Hashtags
// ============================================

export interface TrendingHashtag {
  id: string;
  tag: string;
  itemCount: number;
  color: string;
}

// ============================================
// AI Suggestions Types
// ============================================

export interface AISuggestion {
  id: string | number;
  title: string;
  icon: string;
  link: string;
}

export interface AIFilterChip {
  id: string;
  label: string;
  icon: string;
}

// ============================================
// UGC (User Generated Content) Types
// ============================================

export interface UGCPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  image: string;
  hashtag: string;
  likes: number;
  comments: number;
  coinsEarned?: number;
  isVerified?: boolean;
}

export interface UGCReel {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  thumbnail: string;
  videoUrl?: string;
  views: string;
  coinsEarned: number;
  isVerified: boolean;
}

export interface UGCPhoto {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  image: string;
  likes: number;
  coinsEarned: number;
  isVerified: boolean;
}

export interface UGCReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  coinsEarned: number;
  isVerified: boolean;
  dealUsed?: string;
}

export interface UGCData {
  reels: UGCReel[];
  photos: UGCPhoto[];
  reviews: UGCReview[];
}

// ============================================
// Product/Store Types (Category-specific)
// ============================================

export interface CategoryProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  cashbackPercent: number;
  coinsEarned: number;
  sizes?: string[];
  colors?: string[];
  is60Min: boolean;
  hasPickup: boolean;
  tag?: string | null;
  vibe?: string[];
  occasion?: string[];
  stores?: string[];
  offers?: string[];
}

export interface CategoryStore {
  id: string;
  name: string;
  logo: string;
  rating: number;
  cashback: number;
  distance: string;
  is60Min: boolean;
  hasPickup: boolean;
  categories?: string[];
}

export interface CategoryBrand {
  id: string;
  name: string;
  logo: string;
  cashback: number;
  tag?: string | null;
}

// ============================================
// Exclusive Offers
// ============================================

export interface ExclusiveOffer {
  id: string;
  title: string;
  icon: string;
  discount: string;
  description: string;
  color: string;
  gradient?: string;
}

// ============================================
// Bank Offers
// ============================================

export interface BankOffer {
  id: string;
  bank: string;
  icon: string;
  offer: string;
  maxDiscount: number;
  minOrder: number;
  cardType: string;
}

// ============================================
// Category Page Data Bundle
// ============================================

export interface CategoryPageData {
  // Core data
  categories: CategoryGridItem[];
  trendingHashtags: TrendingHashtag[];
  aiSuggestions: AISuggestion[];
  aiFilterChips: AIFilterChip[];
  ugcPosts: UGCPost[];

  // Optional category-specific data
  vibes?: Vibe[];
  occasions?: Occasion[];

  // Products/Stores
  products?: CategoryProduct[];
  stores?: CategoryStore[];
  brands?: CategoryBrand[];

  // Offers
  exclusiveOffers?: ExclusiveOffer[];
  bankOffers?: BankOffer[];
}

// ============================================
// Component Props Types
// ============================================

export interface BrowseCategoryGridProps {
  categories: CategoryGridItem[];
  title?: string;
  onCategoryPress?: (category: CategoryGridItem) => void;
  itemCountLabel?: string;
}

export interface EnhancedAISuggestionsSectionProps {
  categorySlug: string;
  categoryName: string;
  suggestions?: AISuggestion[];
  placeholders?: string[];
  onSearch?: (query: string) => void;
  onSuggestionPress?: (suggestion: AISuggestion) => void;
}

export interface EnhancedUGCSocialProofSectionProps {
  categorySlug: string;
  categoryName: string;
  posts: UGCPost[];
  title?: string;
  subtitle?: string;
  onPostPress?: (post: UGCPost) => void;
  onSharePress?: () => void;
  onViewAllPress?: () => void;
}

export interface VibeCardProps {
  vibe: Vibe;
  onPress?: (vibe: Vibe) => void;
}

export interface OccasionCardProps {
  occasion: Occasion;
  onPress?: (occasion: Occasion) => void;
}

export interface TrendingHashtagsSectionProps {
  hashtags: TrendingHashtag[];
  categorySlug: string;
  onHashtagPress?: (hashtag: TrendingHashtag) => void;
}
