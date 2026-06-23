/**
 * Expert Reviews Type Definitions
 *
 * Type definitions for the Expert Reviews feature components and API responses.
 */

/**
 * Expert Review Author Information
 */
export interface ExpertAuthor {
  /** Author's full name */
  name: string;
  /** Professional title (e.g., "Senior Tech Reviewer") */
  title: string;
  /** Company or publication name (e.g., "TechRadar") */
  company: string;
  /** Avatar image URL */
  avatar: string;
  /** Whether the expert is verified */
  verified: boolean;
}

/**
 * Complete Expert Review
 */
export interface ExpertReview {
  /** Unique review identifier */
  id: string;
  /** Expert author information */
  author: ExpertAuthor;
  /** Star rating (0-5, can include decimals like 4.5) */
  rating: number;
  /** Review headline/title */
  headline: string;
  /** Full review content */
  content: string;
  /** List of pros/advantages */
  pros: string[];
  /** List of cons/disadvantages */
  cons: string[];
  /** Expert's final verdict/summary */
  verdict: string;
  /** Date the review was published */
  publishedAt: Date;
  /** Number of users who found this review helpful */
  helpful: number;
  /** Optional array of review image URLs */
  images?: string[];
}

/**
 * Expert Reviews Summary Statistics
 */
export interface ExpertReviewsSummary {
  /** Average rating across all expert reviews */
  averageRating: number;
  /** Total number of expert reviews */
  totalReviews: number;
  /** Distribution of ratings [5-star count, 4-star count, 3-star count, 2-star count, 1-star count] */
  ratingDistribution: [number, number, number, number, number];
}

/**
 * API Response: List of Expert Reviews
 */
export interface ExpertReviewsResponse {
  /** Array of expert reviews */
  reviews: ExpertReview[];
  /** Summary statistics */
  summary: ExpertReviewsSummary;
  /** Pagination info (if applicable) */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * API Request: Mark Review as Helpful
 */
export interface MarkHelpfulRequest {
  /** Product ID */
  productId: string;
  /** Review ID */
  reviewId: string;
}

/**
 * API Response: Mark Review as Helpful
 */
export interface MarkHelpfulResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Updated helpful count */
  helpfulCount: number;
}

/**
 * Expert Reviews Filter Options
 */
export interface ExpertReviewsFilters {
  /** Minimum rating to include */
  minRating?: number;
  /** Maximum rating to include */
  maxRating?: number;
  /** Filter by company/publication */
  company?: string;
  /** Sort order */
  sortBy?: 'date' | 'rating' | 'helpful';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Expert Reviews Component Props
 */
export interface ExpertReviewsProps {
  /** Product identifier */
  productId: string;
  /** Array of expert reviews to display */
  reviews?: ExpertReview[];
  /** Callback when user marks a review as helpful */
  onMarkHelpful?: (reviewId: string) => void;
}

/**
 * Expert Reviews Summary Component Props
 */
export interface ExpertReviewsSummaryProps {
  /** Average rating to display */
  averageRating: number;
  /** Total number of reviews */
  totalReviews: number;
  /** Rating distribution array [5★, 4★, 3★, 2★, 1★] */
  ratingDistribution: number[];
  /** Callback when "View All" is clicked */
  onViewAll?: () => void;
}

/**
 * Hook: useExpertReviews Return Type
 */
export interface UseExpertReviewsReturn {
  /** Array of expert reviews */
  reviews: ExpertReview[];
  /** Summary statistics */
  summary: ExpertReviewsSummary | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Function to mark a review as helpful */
  markHelpful: (reviewId: string) => Promise<void>;
  /** Function to refresh the reviews */
  refresh: () => Promise<void>;
}

/**
 * Expert Review Draft (for admin/editor interfaces)
 */
export interface ExpertReviewDraft {
  /** Product ID being reviewed */
  productId: string;
  /** Expert author ID */
  authorId: string;
  /** Star rating */
  rating: number;
  /** Review headline */
  headline: string;
  /** Review content */
  content: string;
  /** List of pros */
  pros: string[];
  /** List of cons */
  cons: string[];
  /** Expert verdict */
  verdict: string;
  /** Review images to upload */
  images?: File[] | string[];
  /** Draft status */
  status: 'draft' | 'pending' | 'published';
}

/**
 * Expert Profile (for linking to expert pages)
 */
export interface ExpertProfile {
  /** Expert ID */
  id: string;
  /** Full name */
  name: string;
  /** Professional title */
  title: string;
  /** Company/publication */
  company: string;
  /** Avatar URL */
  avatar: string;
  /** Bio/description */
  bio?: string;
  /** Verification status */
  verified: boolean;
  /** Total number of reviews written */
  totalReviews: number;
  /** Average rating given */
  averageRating: number;
  /** Areas of expertise */
  expertise: string[];
  /** Social media links */
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}
