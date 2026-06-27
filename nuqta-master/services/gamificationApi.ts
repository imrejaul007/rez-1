// Gamification API Service
// Handles daily check-in, spin wheel, and other gamification features

import apiClient, { ApiResponse } from './apiClient';
import { colors } from '@/constants/theme';
import { devLog } from '@/utils/devLogger';

// ============================================
// TYPES
// ============================================

export interface CheckInReward {
  day: number;
  coins: number;
  claimed: boolean;
  today?: boolean;
  bonus?: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  hasCheckedInToday: boolean;
  lastCheckInDate?: string;
  weeklyEarnings: number;
  totalEarned: number;
  checkInHistory: {
    date: string;
    coinsEarned: number;
    bonusEarned: number;
    streak: number;
  }[];
}

export interface CheckInResult {
  success: boolean;
  streak: number;
  coinsEarned: number;
  bonusEarned: number;
  totalEarned: number;
  message: string;
}

export interface SpinWheelSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'coins' | 'discount' | 'voucher' | 'nothing';
  icon: string;
  probability?: number;
}

export interface SpinWheelData {
  segments: SpinWheelSegment[];
  spinsRemaining: number;
  spinsUsedToday: number;
  maxDailySpins: number;
  nextResetAt: string;
  stats: {
    totalSpins: number;
    todaySpins: number;
    totalCoinsWon: number;
    todayCoinsWon: number;
  };
}

export interface SpinEligibility {
  canSpin: boolean;
  spinsRemaining: number;
  spinsUsedToday: number;
  nextSpinEligibleAt?: string;
  totalCoinsEarned: number;
  lastSpinAt?: string;
}

export interface SpinResult {
  success: boolean;
  segmentId: string;
  segmentLabel: string;
  rewardType: 'coins' | 'discount' | 'voucher' | 'nothing';
  rewardValue: number;
  spinsRemaining: number;
  message: string;
  newBalance?: number;
  coinsAdded?: number;
  tournamentUpdate?: { tournamentName: string; pointsAdded: number; newRank: number } | null;
}

export interface SpinHistoryEntry {
  id: string;
  completedAt: string;
  prize: string;
  segment: number;
  type: 'coins' | 'cashback' | 'discount' | 'voucher';
  reward: Record<string, number>;
  couponMetadata?: {
    storeName?: string;
    storeId?: string;
    productName?: string;
    isProductSpecific?: boolean;
  } | null;
}

export interface GamificationStats {
  coins: {
    balance: number;
    lifetimeEarned: number;
  };
  streak: StreakData;
  spinWheel: SpinEligibility;
  achievements: number;
  level: number;
}

export interface AffiliateStats {
  totalShares: number;
  appDownloads: number;
  purchases: number;
  commissionEarned: number;
}

export interface PromotionalPoster {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  colors: [string, string];
  shareBonus: number;
  isActive?: boolean;
}

export interface ShareSubmission {
  id: string;
  posterTitle: string;
  posterId?: string;
  postUrl: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  shareBonus: number;
  rejectionReason?: string;
}

export interface StreakBonus {
  days: number;
  reward: number;
  achieved: boolean;
}

export interface CheckInConfig {
  dayRewards: number[];
  proTips: string[];
  affiliateTip: string;
  reviewTimeframe: string;
  isEnabled: boolean;
}

export interface ReviewableItem {
  id: string;
  type: 'store' | 'product';
  name: string;
  image: string | null;
  category: string;
  visitDate?: string;
  purchaseDate?: string;
  coins: number;
  hasReceipt?: boolean;
  brand?: string | null;
}

export interface PlayAndEarnData {
  dailySpin: {
    spinsRemaining: number;
    maxSpins: number;
    canSpin: boolean;
    lastSpinAt: string | null;
    nextSpinAt: string | null;
  };
  challenges: {
    active: Array<{
      id: string;
      title: string;
      progress: { current: number; target: number; percentage: number };
      reward: number;
      expiresAt: string;
    }>;
    totalActive: number;
    completedToday: number;
  };
  streak: {
    type: string;
    currentStreak: number;
    longestStreak: number;
    nextMilestone: { day: number; coins: number };
    todayCheckedIn: boolean;
  };
  surpriseDrop: {
    id?: string;
    available: boolean;
    coins: number;
    message: string | null;
    expiresAt: string | null;
    reason?: string;
  } | null;
  coinBalance: number;
}

export interface BonusOpportunity {
  id: string;
  title: string;
  description: string;
  reward: string;
  timeLeft: string;
  icon: string;
  type: 'challenge' | 'coin_drop' | 'campaign' | 'event';
  path?: string;
  urgent?: boolean;
}

// ============================================
// GAMIFICATION API SERVICE
// ============================================

class GamificationApiService {
  // In-memory config cache
  private _configCache: CheckInConfig | null = null;
  private _configCachedAt = 0;
  private _configCacheTTL = 5 * 60 * 1000; // 5 minutes

  // ========================================
  // DAILY CHECK-IN CONFIG
  // ========================================

  /**
   * Get daily check-in configuration (day rewards, pro tips, etc.)
   * Cached for 5 minutes to avoid repeated API calls.
   */
  async getCheckinConfig(): Promise<ApiResponse<CheckInConfig>> {
    // Return cache if fresh
    if (this._configCache && (Date.now() - this._configCachedAt) < this._configCacheTTL) {
      return { success: true, data: this._configCache };
    }

    try {
      const response = await apiClient.get<any>('/gamification/checkin-config');
      if (response.success && response.data) {
        this._configCache = response.data;
        this._configCachedAt = Date.now();
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Failed to load config' };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching checkin config:', error);
      // Return defaults on failure
      return {
        success: true,
        data: {
          dayRewards: [10, 15, 20, 25, 30, 40, 100],
          proTips: [
            'Check in at the same time daily to build a habit',
            'Share posters daily to maximize your affiliate earnings',
            'Track your affiliate performance to see which posters work best',
            'Missing even one day resets your streak to zero',
          ],
          affiliateTip: 'Share posters → Friends download the app → Earn 100 coins/download + 5% commission on their first 3 purchases!',
          reviewTimeframe: 'within 24 hours',
          isEnabled: true,
        },
      };
    }
  }

  // ========================================
  // DAILY CHECK-IN / STREAK ENDPOINTS
  // ========================================

  /**
   * Get current user's streak and check-in status
   */
  async getStreakStatus(): Promise<ApiResponse<StreakData>> {
    try {
      const response = await apiClient.get<any>('/gamification/streaks');

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            currentStreak: data.currentStreak || data.streak || 0,
            longestStreak: data.longestStreak || data.bestStreak || 0,
            hasCheckedInToday: data.hasCheckedInToday ?? data.checkedInToday ?? false,
            lastCheckInDate: data.lastCheckInDate || data.lastCheckIn,
            weeklyEarnings: data.weeklyEarnings || 0,
            totalEarned: data.totalEarned || 0,
            checkInHistory: data.checkInHistory || data.history || [],
          },
        };
      }

      return response;
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching streak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform daily check-in
   */
  async performCheckIn(): Promise<ApiResponse<CheckInResult>> {
    try {
      const response = await apiClient.post<any>('/gamification/streak/checkin');

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            success: true,
            streak: data.streak || data.currentStreak || 1,
            coinsEarned: data.coinsEarned || data.coins || 10,
            bonusEarned: data.bonusEarned || data.bonus || 0,
            totalEarned: data.totalEarned || (data.coinsEarned + data.bonusEarned) || 10,
            message: data.message || 'Check-in successful!',
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Check-in failed',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error performing check-in:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get weekly check-in calendar data
   * Accepts optional pre-fetched streak data to avoid duplicate API calls.
   */
  async getWeeklyCalendar(preloadedStreak?: StreakData): Promise<ApiResponse<CheckInReward[]>> {
    try {
      const [streakResponse, configResponse] = await Promise.all([
        preloadedStreak
          ? Promise.resolve({ success: true, data: preloadedStreak } as ApiResponse<StreakData>)
          : this.getStreakStatus(),
        this.getCheckinConfig(),
      ]);

      if (streakResponse.success && streakResponse.data) {
        const { currentStreak, hasCheckedInToday } = streakResponse.data;

        // Build 7-day calendar with weekly cycle support
        const calendar: CheckInReward[] = [];
        const baseCoins = configResponse.data?.dayRewards || [10, 15, 20, 25, 30, 40, 100];

        // Calculate day position within the 7-day week cycle
        // Streak 1 = Day 1, Streak 7 = Day 7, Streak 8 = Day 1 (new week), Streak 22 = Day 1, etc.
        const dayInWeek = currentStreak === 0 ? 0 : ((currentStreak - 1) % 7) + 1;

        // Handle new week: if dayInWeek is 7 and not checked in today, next check-in starts new week
        const isNewWeekStart = dayInWeek === 7 && !hasCheckedInToday;

        for (let day = 1; day <= 7; day++) {
          let isClaimed: boolean;
          let isToday: boolean;

          if (isNewWeekStart) {
            // New week - no days claimed yet, day 1 is today
            isClaimed = false;
            isToday = day === 1;
          } else if (hasCheckedInToday) {
            // Already checked in today — mark days up to dayInWeek as claimed
            // and mark dayInWeek as today (so button shows "Checked In Today")
            isClaimed = day <= dayInWeek;
            isToday = day === dayInWeek;
          } else {
            // Haven't checked in yet — mark previous days as claimed
            // and next day as today (the one they'll check in for)
            isClaimed = day < dayInWeek + 1;
            isToday = day === dayInWeek + 1;
          }

          calendar.push({
            day,
            coins: baseCoins[day - 1],
            claimed: isClaimed,
            today: isToday,
            bonus: day === 7,
          });
        }

        return { success: true, data: calendar };
      }

      // Return error if streak data unavailable - no fallback data
      return {
        success: false,
        error: streakResponse.error || 'Unable to load check-in calendar',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching calendar:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // SPIN WHEEL ENDPOINTS
  // ========================================

  /**
   * Get spin wheel configuration (prizes/segments)
   */
  async getSpinWheelData(): Promise<ApiResponse<SpinWheelData>> {
    try {
      const response = await apiClient.get<any>('/gamification/spin-wheel/data');

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            segments: data.segments || [],
            spinsRemaining: data.spinsRemaining ?? 0,
            spinsUsedToday: data.spinsUsedToday ?? 0,
            maxDailySpins: data.maxDailySpins ?? 3,
            nextResetAt: data.nextResetAt || '',
            stats: {
              totalSpins: data.stats?.totalSpins ?? 0,
              todaySpins: data.stats?.todaySpins ?? 0,
              totalCoinsWon: data.stats?.totalCoinsWon ?? 0,
              todayCoinsWon: data.stats?.todayCoinsWon ?? 0,
            },
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Unable to load spin wheel data',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching spin wheel data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get spin wheel eligibility (can spin, spins remaining)
   */
  async getSpinEligibility(): Promise<ApiResponse<SpinEligibility>> {
    try {
      const response = await apiClient.get<any>('/gamification/spin-wheel/eligibility');

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            canSpin: data.canSpin ?? (data.spinsRemaining > 0),
            spinsRemaining: data.spinsRemaining ?? 0,
            spinsUsedToday: data.spinsUsedToday ?? 0,
            nextSpinEligibleAt: data.nextResetAt || data.nextSpinEligibleAt,
            totalCoinsEarned: data.totalCoinsEarned ?? 0,
            lastSpinAt: data.lastSpinAt,
          },
        };
      }

      return { success: false, error: response.error || 'Unable to check eligibility' };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching spin eligibility:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a spin
   */
  async executeSpin(): Promise<ApiResponse<SpinResult>> {
    try {
      const response = await apiClient.post<any>('/gamification/spin-wheel/spin');

      if (response.success && response.data) {
        const data = response.data;
        const result = data.result || {};
        const segment = result.segment || {};
        const prize = result.prize || {};

        return {
          success: true,
          data: {
            success: true,
            segmentId: segment.id || data.segmentId || '1',
            segmentLabel: segment.label || prize.label || '',
            rewardType: prize.type || segment.type || 'coins',
            rewardValue: prize.value || segment.value || 0,
            spinsRemaining: data.spinsRemaining ?? 0,
            message: `You won ${prize.label || segment.label}!`,
            newBalance: data.newBalance,
            coinsAdded: data.coinsAdded || 0,
            tournamentUpdate: data.tournamentUpdate || null,
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Spin failed',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error executing spin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get spin history with pagination
   */
  async getSpinHistory(params?: { limit?: number; page?: number }): Promise<ApiResponse<{
    history: SpinHistoryEntry[];
    total: number;
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> {
    try {
      const response = await apiClient.get<any>('/gamification/spin-wheel/history', params);

      if (response.success && response.data) {
        const raw = response.data;
        const history = (raw.history || []).map((spin: any) => ({
          id: spin.id || spin._id,
          completedAt: spin.completedAt,
          prize: spin.prize,
          segment: spin.segment,
          type: spin.type || 'coins',
          reward: spin.reward || {},
          couponMetadata: spin.couponMetadata || null,
        }));

        return {
          success: true,
          data: {
            history,
            total: raw.total || raw.pagination?.total || history.length,
            pagination: raw.pagination || { page: 1, limit: 20, total: history.length, pages: 1 },
          },
        };
      }

      return { success: false, error: response.error || 'Unable to fetch spin history' };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching spin history:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // LEADERBOARD ENDPOINTS
  // ========================================

  /**
   * Get leaderboard data
   * @param period - 'daily' | 'weekly' | 'monthly' | 'all-time'
   * @param limit - Number of entries to return
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly',
    limit: number = 50
  ): Promise<ApiResponse<{
    entries: Array<{
      rank: number;
      userId: string;
      username: string;
      fullName: string;
      coins: number;
      level: number;
      tier: 'free' | 'plus' | 'premium' | 'elite';
      achievements: number;
      avatar?: string;
      isCurrentUser: boolean;
    }>;
    userRank?: {
      rank: number;
      userId: string;
      username: string;
      fullName: string;
      coins: number;
      level: number;
      tier: 'free' | 'plus' | 'premium' | 'elite';
      achievements: number;
      isCurrentUser: boolean;
    };
  }>> {
    try {
      const response = await apiClient.get<any>('/gamification/leaderboard', {
        type: 'spending',
        period,
        limit,
      });

      if (response.success && response.data) {
        const data = response.data;
        const entries = (Array.isArray(data) ? data : data.entries || data.leaderboard || [])
          .map((entry: any, index: number) => ({
            rank: entry.rank || index + 1,
            userId: entry.user?.id || entry.user?._id || entry.userId || entry._id || '',
            username: entry.user?.name || entry.userName || entry.name || 'Anonymous',
            fullName: entry.user?.name || entry.userName || entry.name || 'Anonymous',
            coins: entry.value || entry.coins || entry.amount || 0,
            level: entry.level || 1,
            tier: (entry.tier || 'free') as 'free' | 'plus' | 'premium' | 'elite',
            achievements: entry.achievements || 0,
            avatar: entry.user?.avatar || entry.avatar,
            isCurrentUser: entry.isCurrentUser || false,
          }));

        return {
          success: true,
          data: {
            entries,
            userRank: data.myRank ? {
              rank: data.myRank.rank || 0,
              userId: data.myRank.userId || '',
              username: data.myRank.name || 'You',
              fullName: data.myRank.name || 'You',
              coins: data.myRank.value || data.myRank.coins || 0,
              level: data.myRank.level || 1,
              tier: (data.myRank.tier || 'free') as 'free' | 'plus' | 'premium' | 'elite',
              achievements: data.myRank.achievements || 0,
              isCurrentUser: true,
            } : undefined,
          },
        };
      }

      return {
        success: true,
        data: { entries: [] },
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // GAMIFICATION STATS
  // ========================================

  /**
   * Get overall gamification stats
   */
  async getGamificationStats(): Promise<ApiResponse<GamificationStats>> {
    try {
      const response = await apiClient.get<any>('/gamification/stats');

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return response;
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get coin balance
   */
  async getCoinBalance(): Promise<ApiResponse<{ balance: number; lifetimeEarned: number }>> {
    try {
      const response = await apiClient.get<any>('/gamification/coins/balance');

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            balance: response.data.balance || response.data.coins || 0,
            lifetimeEarned: response.data.lifetimeEarned || response.data.total || 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching coin balance:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // AFFILIATE / SHARE ENDPOINTS
  // ========================================

  /**
   * Get affiliate performance stats
   */
  async getAffiliateStats(): Promise<ApiResponse<AffiliateStats>> {
    try {
      const response = await apiClient.get<any>('/gamification/affiliate/stats');

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            totalShares: response.data.totalShares || 0,
            appDownloads: response.data.appDownloads || response.data.downloads || 0,
            purchases: response.data.purchases || 0,
            commissionEarned: response.data.commissionEarned || response.data.commission || 0,
          },
        };
      }

      // Return error if affiliate stats unavailable - no fallback data
      return {
        success: false,
        error: response.error || 'Unable to load affiliate stats',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching affiliate stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get promotional posters for sharing
   */
  async getPromotionalPosters(): Promise<ApiResponse<PromotionalPoster[]>> {
    try {
      const response = await apiClient.get<any>('/gamification/promotional-posters');

      if (response.success && response.data) {
        // Backend returns { posters: [...] }
        const postersArray = response.data.posters || response.data || [];
        const posters = postersArray.map((poster: any) => ({
          id: poster._id || poster.id,
          title: poster.title,
          subtitle: poster.subtitle || poster.description,
          image: poster.image || poster.imageUrl,
          colors: Array.isArray(poster.colors) ? poster.colors : ['#F97316', colors.error],
          shareBonus: poster.shareBonus || poster.bonus || 50,
          isActive: poster.isActive ?? true,
        }));

        return { success: true, data: posters };
      }

      // Return empty array if no posters available - no fallback data
      return {
        success: true,
        data: [],
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching promotional posters:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's share submissions history
   */
  async getShareSubmissions(): Promise<ApiResponse<ShareSubmission[]>> {
    try {
      const response = await apiClient.get<any>('/gamification/affiliate/submissions');

      if (response.success && response.data) {
        // Backend returns { submissions: [...] }
        const submissionsArray = response.data.submissions || response.data || [];
        const submissions = submissionsArray.map((sub: any) => ({
          id: sub._id || sub.id,
          posterTitle: sub.posterTitle || sub.poster?.title || 'Promotional Poster',
          posterId: sub.posterId || sub.poster?._id,
          postUrl: sub.postUrl || sub.url,
          platform: sub.platform,
          status: sub.status || 'pending',
          submittedAt: sub.submittedAt || sub.createdAt,
          approvedAt: sub.approvedAt,
          shareBonus: sub.shareBonus || sub.bonus || 0,
          rejectionReason: sub.rejectionReason,
        }));

        return { success: true, data: submissions };
      }

      return { success: true, data: [] };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching submissions:', error);
      return { success: true, data: [] };
    }
  }

  /**
   * Submit a shared post for review
   */
  async submitSharePost(data: {
    posterId: string;
    posterTitle: string;
    postUrl: string;
    platform: string;
    shareBonus: number;
  }): Promise<ApiResponse<ShareSubmission>> {
    try {
      const response = await apiClient.post<any>('/gamification/affiliate/submit', data);

      if (response.success && response.data) {
        // Backend returns { submission: {...} }
        const sub = response.data.submission || response.data;
        return {
          success: true,
          data: {
            id: sub._id || sub.id || String(Date.now()),
            posterTitle: sub.posterTitle || data.posterTitle,
            posterId: sub.posterId || data.posterId,
            postUrl: sub.postUrl || data.postUrl,
            platform: sub.platform || data.platform,
            status: sub.status || 'pending',
            submittedAt: sub.submittedAt || new Date().toISOString(),
            shareBonus: sub.shareBonus || data.shareBonus,
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to submit post',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error submitting post:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get streak bonus milestones
   */
  async getStreakBonuses(): Promise<ApiResponse<StreakBonus[]>> {
    try {
      const response = await apiClient.get<any>('/gamification/streak/bonuses');

      if (response.success && response.data) {
        // Backend returns { bonuses: [...] }
        const bonusesArray = response.data.bonuses || response.data || [];
        const bonuses = bonusesArray.map((b: any) => ({
          days: b.days || b.day,
          reward: b.reward || b.coinsReward || 0,
          achieved: b.achieved ?? false,
        }));

        return { success: true, data: bonuses };
      }

      // Return error if streak bonuses unavailable - no fallback data
      return {
        success: false,
        error: response.error || 'Unable to load streak bonuses',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching streak bonuses:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reviewable items (stores/products user can review)
   */
  async getReviewableItems(): Promise<ApiResponse<{
    items: ReviewableItem[];
    totalPending: number;
    potentialEarnings: number;
  }>> {
    try {
      const response = await apiClient.get<any>('/gamification/reviewable-items');

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            items: response.data.items || [],
            totalPending: response.data.totalPending || 0,
            potentialEarnings: response.data.potentialEarnings || 0,
          },
        };
      }

      return response;
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching reviewable items:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // BONUS OPPORTUNITIES (for Play & Earn)
  // ========================================

  /**
   * Get time-limited bonus opportunities (challenges, coin drops, campaigns ending soon)
   */
  async getBonusOpportunities(): Promise<ApiResponse<{
    opportunities: BonusOpportunity[];
    total: number;
  }>> {
    try {
      const response = await apiClient.get<any>('/gamification/bonus-opportunities');

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            opportunities: (data.opportunities || []).map((opp: any) => ({
              id: opp.id || opp._id,
              title: opp.title,
              description: opp.description,
              reward: opp.reward,
              timeLeft: opp.timeLeft,
              icon: opp.icon || '🎁',
              type: opp.type || 'challenge',
              path: opp.path,
              urgent: opp.urgent ?? false,
            })) as BonusOpportunity[],
            total: data.total || data.opportunities?.length || 0,
          },
        };
      }

      // Return empty opportunities if API fails - no fallback data
      return {
        success: true,
        data: {
          opportunities: [],
          total: 0,
        },
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching bonus opportunities:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get play and earn hub data (comprehensive data for Play & Earn page)
   */
  async getPlayAndEarnData(): Promise<ApiResponse<PlayAndEarnData>> {
    try {
      const response = await apiClient.get<PlayAndEarnData>('/gamification/play-and-earn');

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return response;
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error fetching play and earn data:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // SPIN WHEEL CONVENIENCE METHOD
  // ========================================

  // ========================================
  // SURPRISE COIN DROP ENDPOINTS
  // ========================================

  /**
   * Claim a surprise coin drop
   * POST /api/gamification/surprise-drop/claim
   */
  async claimSurpriseDrop(dropId: string): Promise<ApiResponse<{
    coins: number;
    newBalance: number;
    message: string;
  }>> {
    try {
      const response = await apiClient.post<any>('/gamification/surprise-drop/claim', { dropId });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            coins: response.data.coins || 0,
            newBalance: response.data.newBalance || 0,
            message: response.data.message || 'Surprise drop claimed!',
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to claim surprise drop',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error claiming surprise drop:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // STREAK CONVENIENCE ALIASES
  // ========================================

  /**
   * Streak check-in (alias for performCheckIn)
   * Used by PlayAndEarnSection component
   */
  async streakCheckin(): Promise<ApiResponse<CheckInResult>> {
    return this.performCheckIn();
  }

  /**
   * Execute spin wheel (alias for executeSpin)
   * Used by SpinWheelGame component
   */
  async spinWheel(): Promise<ApiResponse<{
    result: SpinResult;
    coinsAdded: number;
    newBalance: number;
  }>> {
    try {
      const response = await this.executeSpin();

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            result: response.data,
            coinsAdded: response.data.coinsAdded || response.data.rewardValue || 0,
            newBalance: response.data.newBalance || 0,
            tournamentUpdate: response.data.tournamentUpdate || null,
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Spin failed',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error in spinWheel:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // QUIZ GAME ENDPOINTS
  // ========================================

  /**
   * Start a new quiz game
   */
  async startQuiz(
    difficulty?: 'easy' | 'medium' | 'hard',
    category?: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/gamification/quiz/start', {
        difficulty,
        category,
      });

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            id: response.data.quizId || response.data.id || response.data._id,
            questions: (response.data.questions || []).map((q: any) => ({
              id: q._id || q.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              timeLimit: q.timeLimit || 30,
              coins: q.coins || 10,
            })),
            totalQuestions: response.data.totalQuestions || response.data.questions?.length || 0,
            totalCoins: response.data.totalCoins || 0,
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to start quiz',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error starting quiz:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit answer for a quiz question
   */
  async submitQuizAnswer(
    quizId: string,
    questionId: string,
    answerIndex: number
  ): Promise<ApiResponse<{
    isCorrect: boolean;
    coinsEarned: number;
    currentScore: number;
    nextQuestion: any | null;
    gameCompleted: boolean;
    totalCoins?: number;
  }>> {
    try {
      const response = await apiClient.post<any>(`/gamification/quiz/${quizId}/answer`, {
        questionId,
        selectedAnswer: answerIndex,
      });

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            isCorrect: data.isCorrect ?? data.correct ?? false,
            coinsEarned: data.coinsEarned || data.coins || 0,
            currentScore: data.currentScore || data.score || 0,
            nextQuestion: data.nextQuestion || null,
            gameCompleted: data.gameCompleted ?? data.completed ?? false,
            totalCoins: data.totalCoins || 0,
            tournamentUpdate: data.tournamentUpdate || null,
          },
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to submit answer',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] Error submitting quiz answer:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ALIASES / CONVENIENCE METHODS
  // (used by integration tests & screens)
  // ========================================

  /**
   * Check whether the user is currently eligible to spin the wheel.
   */
  async canSpinWheel(): Promise<ApiResponse<{ canSpin: boolean; nextSpinAt: string | null; remainingCooldown: number }>> {
    try {
      const response = await apiClient.get<{ canSpin: boolean; nextSpinAt: string | null; remainingCooldown: number }>(
        '/gamification/spin/eligibility'
      );
      if (response.success && response.data) {
        return response;
      }
      return {
        success: true,
        data: { canSpin: true, nextSpinAt: null, remainingCooldown: 0 },
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] canSpinWheel error:', error);
      throw error;
    }
  }

  /**
   * Check whether the user can currently create a scratch card.
   */
  async canCreateScratchCard(): Promise<ApiResponse<{ canCreate: boolean; reason: string | null; nextAvailableAt: string | null }>> {
    try {
      const response = await apiClient.get<{ canCreate: boolean; reason: string | null; nextAvailableAt: string | null }>(
        '/gamification/scratch-card/eligibility'
      );
      if (response.success && response.data) {
        return response;
      }
      return {
        success: true,
        data: { canCreate: true, reason: null, nextAvailableAt: null },
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] canCreateScratchCard error:', error);
      throw error;
    }
  }

  /**
   * Create a new scratch card for the current user.
   */
  async createScratchCard(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/gamification/scratch-card/create');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: response.error || 'Failed to create scratch card',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] createScratchCard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reveal / scratch a card by ID. Awards coins to the user's balance.
   */
  async scratchCard(cardId: string): Promise<ApiResponse<{ card: any; prize: any; coinsAdded: number }>> {
    try {
      const response = await apiClient.post<{ card: any; prize: any; coinsAdded: number }>(
        `/gamification/scratch-card/${cardId}/scratch`
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: response.error || 'Failed to scratch card',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] scratchCard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Claim the reward of a completed challenge.
   */
  async claimChallengeReward(challengeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>(`/gamification/challenges/${challengeId}/claim`);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: response.error || 'Failed to claim challenge reward',
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] claimChallengeReward error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the current in-progress quiz for the user, if any.
   */
  async getCurrentQuiz(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/gamification/quiz/current');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: true,
        data: null,
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] getCurrentQuiz error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the coin transaction history (paginated).
   */
  async getCoinTransactions(params?: { page?: number; limit?: number }): Promise<ApiResponse<{ transactions: any[]; pagination: any }>> {
    try {
      const response = await apiClient.get<{ transactions: any[]; pagination: any }>(
        '/gamification/coin-transactions',
        params || {}
      );
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: true,
        data: { transactions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      };
    } catch (error: any) {
      devLog.error('[GAMIFICATION API] getCoinTransactions error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const gamificationApi = new GamificationApiService();

export default gamificationApi;
export { gamificationApi };
