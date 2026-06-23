/**
 * Privé API Service
 *
 * Handles all API calls for the Privé section
 */

import apiClient, { ApiResponse } from './apiClient';

// Types
export interface PillarScore {
  id: string;
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  trend: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  description?: string;
  improvementTips?: string[];
}

export interface PriveEligibility {
  isEligible: boolean;
  score: number;
  tier: 'none' | 'entry' | 'signature' | 'elite';
  trustScore: number;
  pillars: PillarScore[];
  reason?: string;
  accessState?: 'active' | 'grace_period' | 'paused' | 'suspended' | 'revoked';
  gracePeriodEnds?: string;
}

export interface CoinBalance {
  total: number;
  rez: number;
  prive: number;
  branded: number;
  brandedBreakdown?: Array<{
    brandId: string;
    brandName: string;
    amount: number;
    expiresAt?: string;
  }>;
}

export interface HabitLoop {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  progress: number;
  description?: string;
  deepLink?: string;
}

export interface WeeklyEarningsData {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
  breakdown: Record<string, number>;
}

export interface DailyProgress {
  isCheckedIn: boolean;
  streak: number;
  weeklyEarnings: number | WeeklyEarningsData;
  loops: HabitLoop[];
  allCompleted?: boolean;
}

export interface HighlightItem {
  id: string;
  type: 'offer' | 'store' | 'campaign';
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
}

export interface Highlights {
  curatedOffer: HighlightItem;
  nearbyStore: HighlightItem;
  opportunity: HighlightItem;
}

export interface PriveOffer {
  id: string;
  brand: string;
  brandLogo?: string;
  title: string;
  subtitle: string;
  description?: string;
  reward: string;
  rewardValue?: number;
  rewardType?: 'percentage' | 'fixed' | 'coins';
  coinType?: 'rez' | 'prive' | 'branded';
  expiresIn: string;
  expiresAt?: string;
  isExclusive: boolean;
  tierRequired?: 'none' | 'entry' | 'signature' | 'elite';
  images?: string[];
  coverImage?: string;
  terms?: string[];
  howToRedeem?: string;
  redemptions?: number;
  totalLimit?: number;
}

export interface PriveStats {
  activeCampaigns: number;
  completedCampaigns: number;
  avgRating?: number;
}

export interface PriveDashboard {
  eligibility: PriveEligibility;
  coins: CoinBalance;
  dailyProgress: DailyProgress;
  highlights: Highlights;
  featuredOffers: PriveOffer[];
  stats: PriveStats;
  user: {
    name: string;
    memberId: string;
    memberSince: string;
    validThru: string;
    tierProgress: number;
    pointsToNext: number;
    nextTier: string;
  };
}

export interface CheckInResponse {
  streakUpdated: boolean;
  currentStreak: number;
  longestStreak: number;
  coinsEarned: number;
  totalEarned: number;
  milestoneReached: { day: number; coins: number; badge?: string } | null;
  newBalance: number;
  message: string;
}

export interface ImprovementTip {
  pillar: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PriveHistory {
  history: Array<{
    date: string;
    score: number;
    tier: string;
    pillars: Record<string, number>;
    trigger?: string;
  }>;
  currentScore: number;
  currentTier: string;
}

export interface EarningItem {
  id: string;
  type: string;
  amount: number;
  coinType: 'rez' | 'prive' | 'branded';
  description: string;
  source?: any;
  createdAt: string;
  date: string;
}

export interface EarningsSummary {
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}

export interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  coinType: 'rez' | 'prive' | 'branded';
  description: string;
  source?: any;
  status: string;
  createdAt: string;
  date: string;
  time: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: 'gift_card' | 'bill_pay' | 'experience' | 'charity';
  value: number;
  currency: string;
  coinAmount: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiresAt: string;
  expiresIn: string | null;
  usedAt?: string;
  partnerName?: string;
  partnerLogo?: string;
  category?: string;
  terms?: string[];
  howToUse?: string;
  createdAt: string;
}

export interface RedeemRequest {
  coinAmount: number;
  type: 'gift_card' | 'bill_pay' | 'experience' | 'charity';
  category?: string;
  partnerId?: string;
  partnerName?: string;
  partnerLogo?: string;
  idempotencyKey: string;
  coinType: 'prive';
  offerId?: string;
}

export interface RedeemResponse {
  voucher: Voucher;
  wallet: {
    available: number;
    total: number;
  };
}

export interface RedeemConfig {
  conversionRates: Record<string, number>;
  minCoinsPerCategory: Record<string, number>;
  maxCoinsPerRedemption: number;
  dailyRedemptionLimit: number;
  enabledCategories: string[];
  expiryDays: Record<string, number>;
  currency: string;
}

export interface CatalogGiftCard {
  id: string;
  name: string;
  logo: string;
  minCoins: number;
  denominations: number[];
}

export interface CatalogExperience {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinCost: number;
  value: number;
  highlights: string[];
}

export interface CatalogCharity {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface RedemptionCatalog {
  giftCards: CatalogGiftCard[];
  experiences: CatalogExperience[];
  charities: CatalogCharity[];
  donationAmounts: number[];
  enabledCategories: string[];
}

// Smart Spend types
export interface SmartSpendItem {
  _id: string;
  itemType: 'store' | 'product';
  store?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
    rating: { average: number; count: number };
    location: { city: string };
    tags: string[];
    isVerified?: boolean;
  };
  product?: {
    _id: string;
    name: string;
    images: string[];
    pricing: { original: number; selling: number; discount?: number };
    store: { _id: string; name: string; slug?: string; logo?: string };
    cashback?: { percentage: number };
  };
  displayTitle?: string;
  displayDescription?: string;
  bannerImage?: string;
  badgeText?: string;
  coinRewardRate: number;
  coinRewardType: 'percentage' | 'fixed';
  coinDisplayText: string;
  tierRequired: string;
  sectionLabel?: string;
  isFeatured: boolean;
  isActive: boolean;
}

export interface SmartSpendSection {
  label: string;
  count: number;
}

// Privé Review Dashboard types
export interface PriveReviewableItem {
  id: string;
  type: 'store' | 'product';
  name: string;
  image: string | null;
  category: string;
  storeId: string;
  visitDate?: string;
  purchaseDate?: string;
  coins: number;
  isPriveEligible: boolean;
  hasReceipt?: boolean;
  brand?: string | null;
}

export interface PriveReviewDashboard {
  items: PriveReviewableItem[];
  totalPending: number;
  potentialEarnings: number;
  metrics: {
    pendingRewards: number;
    lifetimeEarned: number;
    pendingCount: number;
  };
  config: {
    minCharCount: number;
    requireMedia: boolean;
    maxImages: number;
  };
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// API Endpoints
const ENDPOINTS = {
  ELIGIBILITY: '/prive/eligibility',
  PILLARS: '/prive/pillars',
  REFRESH: '/prive/refresh',
  HISTORY: '/prive/history',
  TIPS: '/prive/tips',
  CHECK_IN: '/prive/check-in',
  HABIT_LOOPS: '/prive/habit-loops',
  DASHBOARD: '/prive/dashboard',
  OFFERS: '/prive/offers',
  HIGHLIGHTS: '/prive/highlights',
  EARNINGS: '/prive/earnings',
  TRANSACTIONS: '/prive/transactions',
  REDEEM: '/prive/redeem',
  REDEEM_CONFIG: '/prive/redeem-config',
  CATALOG: '/prive/catalog',
  VOUCHERS: '/prive/vouchers',
  SMART_SPEND: '/prive/smart-spend',
  REVIEW_DASHBOARD: '/prive/review-dashboard',
  NEXT_ACTIONS: '/prive/next-actions',
  MISSIONS: '/prive/missions',
  TIER_COMPARISON: '/prive/tier-comparison',
  ANALYTICS: '/prive/analytics',
  NOTIFICATIONS: '/prive/notifications',
  PROGRAM_CONFIG: '/prive/program-config/public',
  CONCIERGE: '/prive/concierge/tickets',
  CAMPAIGNS: '/prive/campaigns',
};

class PriveApi {
  /**
   * Get user's Privé eligibility status
   */
  async getEligibility(): Promise<ApiResponse<PriveEligibility>> {
    return apiClient.get<PriveEligibility>(ENDPOINTS.ELIGIBILITY);
  }

  /**
   * Get detailed pillar breakdown
   */
  async getPillars(): Promise<ApiResponse<{ pillars: PillarScore[]; factors: any }>> {
    return apiClient.get(ENDPOINTS.PILLARS);
  }

  /**
   * Force recalculation of reputation score
   */
  async refreshScore(): Promise<ApiResponse<PriveEligibility>> {
    return apiClient.post<PriveEligibility>(ENDPOINTS.REFRESH);
  }

  /**
   * Get reputation score history
   */
  async getHistory(): Promise<ApiResponse<PriveHistory>> {
    return apiClient.get<PriveHistory>(ENDPOINTS.HISTORY);
  }

  /**
   * Get personalized improvement tips
   */
  async getTips(): Promise<ApiResponse<{
    tips: ImprovementTip[];
    lowestPillar: PillarScore;
    highestPillar: PillarScore;
  }>> {
    return apiClient.get(ENDPOINTS.TIPS);
  }

  /**
   * Daily check-in
   */
  async checkIn(): Promise<ApiResponse<CheckInResponse>> {
    return apiClient.post<CheckInResponse>(ENDPOINTS.CHECK_IN);
  }

  /**
   * Get daily habit loops with progress
   */
  async getHabitLoops(): Promise<ApiResponse<{ loops: HabitLoop[]; weeklyEarnings: number }>> {
    return apiClient.get(ENDPOINTS.HABIT_LOOPS);
  }

  /**
   * Get combined dashboard data (recommended for initial load)
   */
  async getDashboard(): Promise<ApiResponse<PriveDashboard>> {
    return apiClient.get<PriveDashboard>(ENDPOINTS.DASHBOARD);
  }

  /**
   * Get Privé exclusive offers
   */
  async getOffers(params?: {
    page?: number;
    limit?: number;
    category?: string;
    tier?: string;
  }): Promise<ApiResponse<{
    offers: PriveOffer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    return apiClient.get(ENDPOINTS.OFFERS, params);
  }

  /**
   * Get single offer by ID
   */
  async getOfferById(id: string): Promise<ApiResponse<PriveOffer>> {
    return apiClient.get(`${ENDPOINTS.OFFERS}/${id}`);
  }

  /**
   * Get today's personalized highlights
   */
  async getHighlights(): Promise<ApiResponse<Highlights>> {
    return apiClient.get<Highlights>(ENDPOINTS.HIGHLIGHTS);
  }

  /**
   * Track offer click for analytics
   */
  async trackOfferClick(offerId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`${ENDPOINTS.OFFERS}/${offerId}/click`);
  }

  /**
   * Get user's coin earning history
   */
  async getEarnings(params?: {
    page?: number;
    limit?: number;
    type?: string;
    cursor?: string;
    timeRange?: number;
  }): Promise<ApiResponse<{
    earnings: EarningItem[];
    summary: EarningsSummary;
    bySource?: Record<string, number>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore?: boolean;
      nextCursor?: string;
    };
  }>> {
    return apiClient.get(ENDPOINTS.EARNINGS, params);
  }

  /**
   * Get user's coin transaction history
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    coinType?: string;
    cursor?: string;
  }): Promise<ApiResponse<{
    transactions: TransactionItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasMore?: boolean;
      nextCursor?: string;
    };
  }>> {
    return apiClient.get(ENDPOINTS.TRANSACTIONS, params);
  }

  /**
   * Get server-side redemption configuration (conversion rates, min coins, etc.)
   */
  async getRedeemConfig(): Promise<ApiResponse<RedeemConfig>> {
    return apiClient.get<RedeemConfig>(ENDPOINTS.REDEEM_CONFIG);
  }

  /**
   * Get server-side redemption catalog (gift cards, experiences, charities)
   */
  async getCatalog(): Promise<ApiResponse<RedemptionCatalog>> {
    return apiClient.get<RedemptionCatalog>(ENDPOINTS.CATALOG);
  }

  /**
   * Redeem coins for a voucher
   */
  async redeemCoins(request: RedeemRequest): Promise<ApiResponse<RedeemResponse>> {
    return apiClient.post<RedeemResponse>(ENDPOINTS.REDEEM, { ...request, coinType: 'prive' });
  }

  /**
   * Get user's voucher history
   */
  async getVouchers(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    vouchers: Voucher[];
    stats: {
      active: number;
      total: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    return apiClient.get(ENDPOINTS.VOUCHERS, params);
  }

  /**
   * Get single voucher details
   */
  async getVoucherById(id: string): Promise<ApiResponse<Voucher>> {
    return apiClient.get(`${ENDPOINTS.VOUCHERS}/${id}`);
  }

  /**
   * Mark a voucher as used
   */
  async markVoucherUsed(id: string): Promise<ApiResponse<{
    id: string;
    code: string;
    status: string;
    usedAt: string;
  }>> {
    return apiClient.post(`${ENDPOINTS.VOUCHERS}/${id}/use`);
  }

  // ─── Smart Spend ──────────────────────────────────────────────────────────

  /**
   * Get curated Smart Spend catalog
   */
  async getSmartSpendCatalog(params?: {
    page?: number;
    limit?: number;
    section?: string;
    itemType?: 'store' | 'product';
  }): Promise<ApiResponse<{
    items: SmartSpendItem[];
    sections: SmartSpendSection[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return apiClient.get(ENDPOINTS.SMART_SPEND, params);
  }

  /**
   * Get single Smart Spend item detail
   */
  async getSmartSpendItem(id: string): Promise<ApiResponse<SmartSpendItem>> {
    return apiClient.get(`${ENDPOINTS.SMART_SPEND}/${id}`);
  }

  /**
   * Track Smart Spend item click (fire-and-forget)
   */
  async trackSmartSpendClick(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`${ENDPOINTS.SMART_SPEND}/${id}/click`);
  }

  // ─── Review Dashboard ──────────────────────────────────────────────────────

  /**
   * Get aggregated review dashboard data for Privé Review & Earn page
   */
  async getReviewDashboard(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PriveReviewDashboard>> {
    return apiClient.get<PriveReviewDashboard>(ENDPOINTS.REVIEW_DASHBOARD, params);
  }

  // ─── Next Best Actions ──────────────────────────────────────────────────

  async getNextActions(): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.NEXT_ACTIONS);
  }

  // ─── Missions ──────────────────────────────────────────────────────────

  async getMissions(): Promise<ApiResponse<{ missions: any[] }>> {
    return apiClient.get(ENDPOINTS.MISSIONS);
  }

  async getActiveMissions(): Promise<ApiResponse<{ missions: any[] }>> {
    return apiClient.get(`${ENDPOINTS.MISSIONS}/active`);
  }

  async getCompletedMissions(): Promise<ApiResponse<{ missions: any[] }>> {
    return apiClient.get(`${ENDPOINTS.MISSIONS}/completed`);
  }

  async claimMission(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`${ENDPOINTS.MISSIONS}/${id}/claim`);
  }

  async completeMission(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`${ENDPOINTS.MISSIONS}/${id}/complete`);
  }

  // ─── Tier Comparison ──────────────────────────────────────────────────

  async getTierComparison(): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.TIER_COMPARISON);
  }

  // ─── Analytics ────────────────────────────────────────────────────────

  async getAnalytics(period?: number): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.ANALYTICS, period ? { period } : undefined);
  }

  // ─── Notifications ────────────────────────────────────────────────────

  async getNotifications(): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS);
  }

  // ─── Program Config ───────────────────────────────────────────────────

  async getProgramConfig(): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.PROGRAM_CONFIG);
  }

  // ─── Concierge ────────────────────────────────────────────────────────

  async createConciergeTicket(data: {
    subject: string;
    category?: string;
    message: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(ENDPOINTS.CONCIERGE, data);
  }

  async getConciergeTickets(): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.CONCIERGE);
  }

  async addConciergeMessage(ticketId: string, message: string): Promise<ApiResponse<any>> {
    return apiClient.post(`${ENDPOINTS.CONCIERGE}/${ticketId}/message`, { message });
  }

  // ─── Campaigns ────────────────────────────────────────────────────────

  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    taskType?: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.get(ENDPOINTS.CAMPAIGNS, params);
  }

  async getCampaignById(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`${ENDPOINTS.CAMPAIGNS}/${id}`);
  }

  async joinCampaign(id: string): Promise<ApiResponse<any>> {
    return apiClient.post(`${ENDPOINTS.CAMPAIGNS}/${id}/join`);
  }

  async submitCampaignPost(id: string, data: {
    postUrl: string;
    postScreenshotUrl: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(`${ENDPOINTS.CAMPAIGNS}/${id}/submit`, data);
  }

  async getCampaignStatus(id: string): Promise<ApiResponse<any>> {
    return apiClient.get(`${ENDPOINTS.CAMPAIGNS}/${id}/status`);
  }

  async getCampaignEarnings(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.get(`${ENDPOINTS.CAMPAIGNS}/earnings`, params);
  }
}

// Export singleton instance
const priveApi = new PriveApi();
export default priveApi;
