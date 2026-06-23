// Review Types and Interfaces

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number; // 1-5 stars
  reviewText: string;
  date: Date;
  likes: number;
  isLiked: boolean;
  isVerified?: boolean;
  images?: ReviewImage[];
  helpfulCount?: number;
  isHelpful?: boolean;
  storeResponse?: StoreResponse;
  moderationStatus?: 'pending' | 'approved' | 'rejected'; // For pending reviews
}

export interface ReviewImage {
  id: string;
  uri: string;
  caption?: string;
}

export interface StoreResponse {
  id: string;
  responseText: string;
  date: Date;
  responderName: string;
  responderRole: string;
}

export interface RatingBreakdown {
  fiveStars: number; // percentage
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStar: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: RatingBreakdown;
  monthlyTrend?: MonthlyRating[];
}

export interface MonthlyRating {
  month: string;
  year: number;
  averageRating: number;
  reviewCount: number;
}

export interface ReviewFilter {
  rating?: number; // Filter by specific rating
  hasImages?: boolean;
  hasStoreResponse?: boolean;
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UserReviewProfile {
  userId: string;
  userName: string;
  userAvatar: string;
  totalReviews: number;
  averageGiven: number;
  isVerifiedReviewer: boolean;
  reviewerLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  joinedDate: Date;
}

export interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  storeName: string;
  storeId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: RatingBreakdown;
  reviews: Review[];
  onWriteReview?: () => void;
  onLikeReview?: (reviewId: string) => void;
  onReportReview?: (reviewId: string) => void;
  onHelpfulReview?: (reviewId: string) => void;
  ugcContent?: UGCContent[];
  ugcLoading?: boolean;
}

export interface ReviewCardProps {
  review: Review;
  onLike?: (reviewId: string) => void;
  onReport?: (reviewId: string) => void;
  onHelpful?: (reviewId: string) => void;
  showStoreResponse?: boolean;
}

export interface RatingBreakdownProps {
  ratingBreakdown: RatingBreakdown;
  totalReviews: number;
}

export interface StarRatingProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showHalf?: boolean;
}

export interface ReviewTabsProps {
  activeTab: 'reviews' | 'ugc';
  onTabChange: (tab: 'reviews' | 'ugc') => void;
  reviewCount: number;
  ugcCount?: number;
}

export interface UGCContent {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  contentType: 'image' | 'video';
  uri: string;
  caption?: string;
  likes: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  date: Date;
  productTags?: string[];
}

// Enums for better type safety
export enum ReviewSortOption {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
  HELPFUL = 'helpful'
}

export enum ReviewerLevel {
  BRONZE = 'Bronze',
  SILVER = 'Silver', 
  GOLD = 'Gold',
  PLATINUM = 'Platinum'
}

export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video'
}

// Helper types
export type ReviewAction = 'like' | 'report' | 'helpful' | 'share';
export type TabType = 'reviews' | 'ugc';
export type RatingStars = 1 | 2 | 3 | 4 | 5;

// API Response types
export interface ReviewsApiResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  stats: ReviewStats;
}

export interface WriteReviewRequest {
  storeId: string;
  rating: number;
  reviewText: string;
  images?: string[];
  isAnonymous?: boolean;
}

export interface ReviewActionResponse {
  success: boolean;
  message?: string;
  newCount?: number;
}