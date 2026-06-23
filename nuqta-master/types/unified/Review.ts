/**
 * Unified Review Type Definition
 *
 * This is the CANONICAL review interface used throughout the application.
 * All review data should be normalized to this structure.
 *
 * KEY DECISIONS:
 * - Standard ID field: 'id' (string)
 * - Rating as number (1-5)
 * - Support for both product and store reviews
 * - Image attachments and helpfulness tracking
 */

import { UserRef } from './User';

// ============================================================================
// CORE REVIEW INTERFACE
// ============================================================================

export interface Review {
  // ========== IDENTIFIERS ==========
  /** Primary identifier */
  id: string;

  /** Review type */
  type: 'product' | 'store' | 'order';

  // ========== REFERENCES ==========
  /** Product ID (for product reviews) */
  productId?: string;

  /** Store ID (for store/product reviews) */
  storeId?: string;

  /** Order ID (for order reviews) */
  orderId?: string;

  // ========== USER INFORMATION ==========
  /** User who wrote the review */
  user: ReviewUser;

  // ========== RATING ==========
  /** Rating value (1-5) */
  rating: number;

  /** Maximum rating value (default: 5) */
  maxRating?: number;

  // ========== REVIEW CONTENT ==========
  /** Review title */
  title?: string;

  /** Review comment/text */
  comment: string;

  /** Review summary (short version) */
  summary?: string;

  // ========== MEDIA ==========
  /** Attached images */
  images: ReviewImage[];

  /** Attached videos */
  videos?: ReviewVideo[];

  // ========== HELPFULNESS ==========
  /** Number of helpful votes */
  helpful: number;

  /** Number of not helpful votes */
  notHelpful?: number;

  /** Has current user marked this helpful? */
  isHelpful?: boolean;

  // ========== VERIFICATION ==========
  /** Is this a verified purchase review? */
  verified: boolean;

  /** Verification badge text */
  verificationBadge?: string;

  // ========== RESPONSES ==========
  /** Store/merchant response */
  merchantReply?: ReviewReply;

  /** User replies */
  replies?: ReviewReply[];

  // ========== STATUS ==========
  /** Is review active/visible? */
  isActive: boolean;

  /** Review status */
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';

  /** Moderation notes */
  moderationNotes?: string;

  // ========== REWARDS ==========
  /** Cashback earned for this review */
  cashbackEarned?: number;

  /** Points earned for this review */
  pointsEarned?: number;

  // ========== TIMESTAMPS ==========
  /** Created at */
  createdAt: string | Date;

  /** Updated at */
  updatedAt: string | Date;

  /** Edited at (if different from updatedAt) */
  editedAt?: string | Date;

  // ========== METADATA ==========
  /** Purchase verified on */
  purchaseVerifiedOn?: string | Date;

  /** Reported count */
  reportCount?: number;

  /** Is review featured? */
  isFeatured?: boolean;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// REVIEW USER
// ============================================================================

export interface ReviewUser {
  /** User ID */
  id: string;

  /** User name */
  name: string;

  /** User avatar */
  avatar?: string;

  /** Reviewer level */
  reviewerLevel?: ReviewerLevel;

  /** Total reviews by this user */
  totalReviews?: number;

  /** Is top reviewer? */
  isTopReviewer?: boolean;

  /** Location */
  location?: string;
}

export type ReviewerLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

// ============================================================================
// REVIEW IMAGE
// ============================================================================

export interface ReviewImage {
  /** Image ID */
  id: string;

  /** Image URL */
  url: string;

  /** Thumbnail URL */
  thumbnail?: string;

  /** Image caption */
  caption?: string;

  /** Alt text */
  alt?: string;

  /** Display order */
  order?: number;
}

// ============================================================================
// REVIEW VIDEO
// ============================================================================

export interface ReviewVideo {
  /** Video ID */
  id: string;

  /** Video URL */
  url: string;

  /** Thumbnail URL */
  thumbnail?: string;

  /** Video duration (seconds) */
  duration?: number;

  /** Video caption */
  caption?: string;

  /** Display order */
  order?: number;
}

// ============================================================================
// REVIEW REPLY
// ============================================================================

export interface ReviewReply {
  /** Reply ID */
  id: string;

  /** User who replied */
  user: ReviewReplyUser;

  /** Reply text */
  text: string;

  /** Created at */
  createdAt: string | Date;

  /** Updated at */
  updatedAt?: string | Date;

  /** Is this reply from store owner? */
  isStoreOwner?: boolean;

  /** Is this reply from admin? */
  isAdmin?: boolean;
}

export interface ReviewReplyUser {
  /** User ID */
  id: string;

  /** User name */
  name: string;

  /** User avatar */
  avatar?: string;

  /** User role */
  role?: 'user' | 'merchant' | 'admin';
}

// ============================================================================
// REVIEW STATISTICS
// ============================================================================

export interface ReviewStats {
  /** Average rating */
  averageRating: number;

  /** Total number of reviews */
  totalReviews: number;

  /** Rating distribution */
  ratingDistribution: RatingDistribution;

  /** Verified purchases count */
  verifiedPurchases?: number;

  /** Reviews with photos */
  withPhotos?: number;

  /** Reviews with videos */
  withVideos?: number;

  /** Recent trend */
  trend?: {
    direction: 'up' | 'down' | 'stable';
    change: number;
  };
}

export interface RatingDistribution {
  /** 5-star ratings */
  5: number;

  /** 4-star ratings */
  4: number;

  /** 3-star ratings */
  3: number;

  /** 2-star ratings */
  2: number;

  /** 1-star ratings */
  1: number;
}

// ============================================================================
// REVIEW FILTERS
// ============================================================================

export interface ReviewFilters {
  /** Filter by rating */
  rating?: number;

  /** Filter by verified purchases only */
  verifiedOnly?: boolean;

  /** Filter by reviews with images */
  withImages?: boolean;

  /** Filter by reviews with videos */
  withVideos?: boolean;

  /** Filter by store response */
  withStoreResponse?: boolean;

  /** Sort option */
  sortBy?: ReviewSortOption;

  /** Date range */
  dateRange?: {
    start: string | Date;
    end: string | Date;
  };

  /** Minimum helpfulness */
  minHelpful?: number;

  /** Page number */
  page?: number;

  /** Items per page */
  limit?: number;
}

export type ReviewSortOption =
  | 'newest'
  | 'oldest'
  | 'highest'
  | 'lowest'
  | 'helpful'
  | 'verified';

// ============================================================================
// REVIEW SUBMISSION
// ============================================================================

export interface ReviewSubmission {
  /** Review type */
  type: 'product' | 'store' | 'order';

  /** Product ID */
  productId?: string;

  /** Store ID */
  storeId?: string;

  /** Order ID */
  orderId?: string;

  /** Rating (1-5) */
  rating: number;

  /** Review title */
  title?: string;

  /** Review comment */
  comment: string;

  /** Attached images */
  images?: string[];

  /** Attached videos */
  videos?: string[];

  /** Is anonymous? */
  isAnonymous?: boolean;

  /** Metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// REVIEW RESPONSES
// ============================================================================

export interface ReviewsResponse {
  /** Reviews list */
  reviews: Review[];

  /** Statistics */
  stats: ReviewStats;

  /** Pagination */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ReviewActionResponse {
  /** Success status */
  success: boolean;

  /** Response message */
  message?: string;

  /** New count (for helpful/unhelpful) */
  newCount?: number;

  /** Error */
  error?: string;
}

// ============================================================================
// REVIEW PERMISSIONS
// ============================================================================

export interface ReviewPermissions {
  /** Can user write review? */
  canWrite: boolean;

  /** Can user edit review? */
  canEdit: boolean;

  /** Can user delete review? */
  canDelete: boolean;

  /** Can user reply? */
  canReply: boolean;

  /** Can user mark helpful? */
  canMarkHelpful: boolean;

  /** Can user report? */
  canReport: boolean;

  /** Reasons if can't write */
  reasons?: string[];
}

// ============================================================================
// HELPFUL TYPES
// ============================================================================

/** Review for cards/previews */
export type ReviewPreview = Pick<
  Review,
  | 'id'
  | 'user'
  | 'rating'
  | 'comment'
  | 'images'
  | 'helpful'
  | 'verified'
  | 'createdAt'
>;

/** Review summary */
export type ReviewSummary = Pick<
  Review,
  'id' | 'rating' | 'comment' | 'user' | 'createdAt'
>;

/** Rating only */
export type RatingOnly = Pick<Review, 'id' | 'rating' | 'createdAt'>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Calculate rating percentage */
export function getRatingPercentage(
  rating: number,
  maxRating: number = 5
): number {
  return (rating / maxRating) * 100;
}

/** Get rating distribution percentages */
export function getRatingDistributionPercentages(
  distribution: RatingDistribution,
  total: number
): Record<number, number> {
  return {
    5: total > 0 ? (distribution[5] / total) * 100 : 0,
    4: total > 0 ? (distribution[4] / total) * 100 : 0,
    3: total > 0 ? (distribution[3] / total) * 100 : 0,
    2: total > 0 ? (distribution[2] / total) * 100 : 0,
    1: total > 0 ? (distribution[1] / total) * 100 : 0,
  };
}

/** Check if review is recent (within last 30 days) - moved to guards.ts to avoid duplication */
// export function isRecentReview(review: Review): boolean {
//   const createdAt = new Date(review.createdAt);
//   const thirtyDaysAgo = new Date();
//   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//   return createdAt >= thirtyDaysAgo;
// }

/** Format review date */
export function formatReviewDate(date: string | Date): string {
  const reviewDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - reviewDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
