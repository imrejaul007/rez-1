// ========================================
// Store Review Types (Backend Integration)
// ========================================

export interface Review {
  _id?: string;
  id?: string;
  store: string;
  user: {
    _id?: string;
    id?: string;
    profile?: {
      name: string;
      avatar?: string;
    };
    name?: string;
    avatar?: string;
  };
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  ratingStats: ReviewStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReviews: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreateReviewData {
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

export interface UserReview {
  _id?: string;
  id?: string;
  store: {
    _id?: string;
    id?: string;
    name: string;
    logo?: string;
    location?: {
      address: string;
    };
  } | string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  merchantReply?: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanReviewResponse {
  canReview: boolean;
  hasReviewed: boolean;
}

export interface ReviewFormData {
  rating: number;
  title: string;
  comment: string;
  images: string[];
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

// ========================================
// Legacy Product Review Types (Keep for backward compatibility)
// ========================================

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  cashbackEarned: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CashbackEarning {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  productId: string;
  reviewId: string;
  createdAt: Date;
  status: 'pending' | 'credited' | 'failed';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  averageRating: number;
  totalReviews: number;
  cashbackPercentage: number;
}

export interface ReviewSubmissionResponse {
  success: boolean;
  reviewId?: string;
  cashbackAmount?: number;
  message?: string;
  error?: string;
}

export interface RecentCashbackResponse {
  earnings: CashbackEarning[];
  totalCount: number;
}

// Mock data interfaces
export interface MockReviewData {
  recentEarnings: CashbackEarning[];
  productInfo: Product;
}