/**
 * Achievement Metrics Registry
 *
 * Central registry mapping metric names to their data source and aggregation strategy.
 * Used by:
 * - AchievementEngine: to compute metric values for progress evaluation
 * - Admin UI: condition builder shows available metrics with labels
 * - Event routing: to map events to affected metrics
 */

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  source: string;          // Mongoose model name
  aggregation: 'count' | 'sum' | 'distinctCount' | 'max' | 'field';
  field?: string;          // Field to aggregate (for sum/distinctCount)
  filter?: Record<string, any>;  // Additional query filter
  computed?: boolean;      // Whether this is derived from other metrics
}

export const ACHIEVEMENT_METRICS: Record<string, MetricDefinition> = {
  // ===== Order Metrics =====
  totalOrders: {
    key: 'totalOrders',
    label: 'Total Orders',
    description: 'Number of delivered orders',
    source: 'Order',
    aggregation: 'count',
    filter: { status: 'delivered' }
  },
  totalSpent: {
    key: 'totalSpent',
    label: 'Total Spent (INR)',
    description: 'Total amount spent on delivered orders',
    source: 'Order',
    aggregation: 'sum',
    field: 'totalPrice',
    filter: { status: 'delivered' }
  },
  uniqueStoresOrdered: {
    key: 'uniqueStoresOrdered',
    label: 'Unique Stores Ordered From',
    description: 'Number of different stores ordered from',
    source: 'Order',
    aggregation: 'distinctCount',
    field: 'store',
    filter: { status: 'delivered' }
  },

  // ===== Review Metrics =====
  totalReviews: {
    key: 'totalReviews',
    label: 'Total Reviews',
    description: 'Number of reviews submitted',
    source: 'Review',
    aggregation: 'count'
  },
  totalHelpfulVotes: {
    key: 'totalHelpfulVotes',
    label: 'Total Helpful Votes',
    description: 'Total helpful votes received on reviews',
    source: 'Review',
    aggregation: 'sum',
    field: 'helpfulCount'
  },

  // ===== Video Metrics =====
  totalVideos: {
    key: 'totalVideos',
    label: 'Total Videos',
    description: 'Number of videos created',
    source: 'Video',
    aggregation: 'count'
  },
  totalVideoViews: {
    key: 'totalVideoViews',
    label: 'Total Video Views',
    description: 'Combined view count across all videos',
    source: 'Video',
    aggregation: 'sum',
    field: 'engagement.views'
  },

  // ===== Project Metrics =====
  totalProjects: {
    key: 'totalProjects',
    label: 'Total Projects',
    description: 'Number of project submissions',
    source: 'Project',
    aggregation: 'count'
  },
  projectEarnings: {
    key: 'projectEarnings',
    label: 'Project Earnings (INR)',
    description: 'Total earnings from project submissions',
    source: 'Project',
    aggregation: 'sum',
    field: 'submissions.paidAmount'
  },

  // ===== Referral Metrics =====
  totalReferrals: {
    key: 'totalReferrals',
    label: 'Total Referrals',
    description: 'Number of successful referrals',
    source: 'User',
    aggregation: 'field',
    field: 'referral.totalReferrals'
  },

  // ===== Bill Metrics =====
  billsUploaded: {
    key: 'billsUploaded',
    label: 'Bills Uploaded',
    description: 'Number of bills uploaded',
    source: 'BillUpload',
    aggregation: 'count'
  },

  // ===== Social Metrics =====
  socialSharesApproved: {
    key: 'socialSharesApproved',
    label: 'Approved Social Shares',
    description: 'Number of social media posts approved',
    source: 'SocialMediaPost',
    aggregation: 'count',
    filter: { status: 'approved' }
  },

  // ===== Streak Metrics =====
  loginStreak: {
    key: 'loginStreak',
    label: 'Current Login Streak',
    description: 'Consecutive days logged in',
    source: 'UserStreak',
    aggregation: 'field',
    field: 'currentStreak',
    filter: { type: 'login' }
  },
  longestLoginStreak: {
    key: 'longestLoginStreak',
    label: 'Longest Login Streak',
    description: 'Best consecutive login streak',
    source: 'UserStreak',
    aggregation: 'field',
    field: 'longestStreak',
    filter: { type: 'login' }
  },

  // ===== Coin Metrics =====
  totalCoinsEarned: {
    key: 'totalCoinsEarned',
    label: 'Total Coins Earned',
    description: 'Lifetime coins earned from all sources',
    source: 'CoinTransaction',
    aggregation: 'sum',
    field: 'amount',
    filter: { type: { $in: ['earned', 'bonus'] } }
  },

  // ===== Offer Metrics =====
  offersRedeemed: {
    key: 'offersRedeemed',
    label: 'Offers Redeemed',
    description: 'Number of offers/vouchers redeemed',
    source: 'OfferRedemption',
    aggregation: 'count'
  },

  // ===== Computed Metrics =====
  totalActivity: {
    key: 'totalActivity',
    label: 'Total Activities',
    description: 'Combined count of orders, reviews, videos, and projects',
    source: 'computed',
    aggregation: 'sum',
    computed: true
  },
  daysActive: {
    key: 'daysActive',
    label: 'Days Since Registration',
    description: 'Number of days since the user registered',
    source: 'computed',
    aggregation: 'count',
    computed: true
  }
};

/**
 * Maps event types to the metrics they affect.
 * Used by the event bus to determine which achievements to re-evaluate.
 */
export const EVENT_TO_METRICS: Record<string, string[]> = {
  order_placed: ['totalOrders', 'totalSpent', 'uniqueStoresOrdered', 'totalActivity'],
  order_delivered: ['totalOrders', 'totalSpent', 'uniqueStoresOrdered', 'totalActivity'],
  review_submitted: ['totalReviews', 'totalActivity'],
  video_created: ['totalVideos', 'totalActivity'],
  project_completed: ['totalProjects', 'projectEarnings', 'totalActivity'],
  referral_completed: ['totalReferrals'],
  bill_uploaded: ['billsUploaded', 'totalActivity'],
  login: ['loginStreak', 'daysActive'],
  daily_checkin: ['loginStreak'],
  social_share: ['socialSharesApproved', 'totalActivity'],
  social_media_submitted: ['socialSharesApproved', 'totalActivity'],
  social_media_approved: ['socialSharesApproved', 'totalActivity'],
  social_media_credited: ['socialSharesApproved', 'totalCoinsEarned', 'totalActivity'],
  offer_redeemed: ['offersRedeemed', 'totalActivity'],
  game_won: ['totalCoinsEarned'],
};

/**
 * Returns the list of all metric keys (for admin dropdown).
 */
export function getAvailableMetrics(): Array<{ key: string; label: string; description: string }> {
  return Object.values(ACHIEVEMENT_METRICS).map(m => ({
    key: m.key,
    label: m.label,
    description: m.description
  }));
}
