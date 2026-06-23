import { createServiceLogger } from '../config/logger';
import { rewardEngine } from '../core/rewardEngine';
import redisService from './redisService';
import streakService from './streakService';
import { Wallet } from '../models/Wallet';

const logger = createServiceLogger('instant-reward-service');

// Daily cap for instant reward coins per user (max 200 coins/day)
const DAILY_INSTANT_REWARD_CAP = 200;

// Coin awards per action
const COIN_AMOUNTS = {
  visit_checkin: 10,
  qr_scan: 5,
  bill_upload: 15,
  payment_min_pct: 2,
  payment_max_pct: 5,
} as const;

export interface InstantRewardResult {
  coinsAwarded: number;
  newBalance: number;
  streakUpdated: boolean;
  milestoneReached: any | null;
  cappedOut: boolean;
  message: string;
}

class InstantRewardService {
  /**
   * Check and update the daily instant reward cap for a user.
   * Returns { allowed: boolean, remaining: number } based on Redis counter.
   * Cap key resets after 25 hours to cover full calendar day + buffer.
   */
  private async checkDailyCap(
    userId: string,
    requestedCoins: number,
  ): Promise<{ allowed: boolean; coinsToAward: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const capKey = `instant_reward:daily:${userId}:${today}`;

    try {
      // Get current count
      const currentCount = await redisService.get<number>(capKey);
      const current = typeof currentCount === 'number' ? currentCount : 0;

      if (current >= DAILY_INSTANT_REWARD_CAP) {
        return { allowed: false, coinsToAward: 0 };
      }

      const remaining = DAILY_INSTANT_REWARD_CAP - current;
      const coinsToAward = Math.min(requestedCoins, remaining);

      // Increment counter atomically — use incr which sets TTL on first call
      await redisService.incr(capKey, coinsToAward);
      await redisService.expire(capKey, 25 * 60 * 60); // 25-hour TTL

      return { allowed: true, coinsToAward };
    } catch (err) {
      // Fail-open: if Redis is down, allow the reward but log a warning
      logger.warn('[InstantRewardService] Redis cap check failed — allowing reward (fail-open)', {
        userId,
        error: (err as Error).message,
      });
      return { allowed: true, coinsToAward: requestedCoins };
    }
  }

  /**
   * Issue instant reward coins and update savings streak.
   * Returns a structured result for frontend celebration UI.
   */
  private async issueReward(
    userId: string,
    requestedCoins: number,
    source: string,
    referenceId: string,
    description: string,
  ): Promise<InstantRewardResult> {
    const { allowed, coinsToAward } = await this.checkDailyCap(userId, requestedCoins);

    if (!allowed || coinsToAward <= 0) {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      const balance = wallet ? ((wallet as any).balance?.available ?? 0) : 0;
      return {
        coinsAwarded: 0,
        newBalance: balance,
        streakUpdated: false,
        milestoneReached: null,
        cappedOut: true,
        message: 'Daily instant reward cap reached (200 coins/day)',
      };
    }

    // Issue coins via reward engine
    let coinsAwarded = 0;
    let newBalance = 0;
    try {
      const result = await rewardEngine.issue({
        userId,
        amount: coinsToAward,
        rewardType: 'engagement',
        source,
        description,
        operationType: 'loyalty_credit',
        referenceId,
        referenceModel: 'InstantReward',
        coinType: 'rez',
        skipMultiplier: false,
        skipCap: true, // We handle our own cap above
      });

      coinsAwarded = result.amount;
      newBalance = result.newBalance;
    } catch (err) {
      logger.error('[InstantRewardService] rewardEngine.issue failed', {
        userId,
        source,
        error: (err as Error).message,
      });
      throw err;
    }

    // Update savings streak (non-blocking)
    let streakUpdated = false;
    let milestoneReached: any = null;
    try {
      const { streak, milestoneReached: ms } = await streakService.updateStreak(userId, 'savings');
      streakUpdated = streak.currentStreak > 0;
      milestoneReached = ms || null;
    } catch (err) {
      logger.warn('[InstantRewardService] Streak update failed (non-blocking)', {
        userId,
        error: (err as Error).message,
      });
    }

    return {
      coinsAwarded,
      newBalance,
      streakUpdated,
      milestoneReached,
      cappedOut: false,
      message: `You earned ${coinsAwarded} coins!`,
    };
  }

  /**
   * Reward for visit check-in at a store: 10 coins.
   * Called when user physically checks in at a merchant location.
   */
  async onVisitCheckin(userId: string, storeId: string, visitId?: string): Promise<InstantRewardResult> {
    logger.info('[InstantRewardService] onVisitCheckin', { userId, storeId, visitId });
    // H17: Use visitId when provided for full idempotency; otherwise use a date-stable
    // key (one reward per user per store per calendar day) to prevent duplicate credits
    // from retries while still allowing daily check-ins at the same store.
    const today = new Date().toISOString().slice(0, 10);
    const referenceId = visitId ? `checkin:${visitId}` : `checkin:${storeId}:${userId}:${today}`;
    return this.issueReward(
      userId,
      COIN_AMOUNTS.visit_checkin,
      'visit_checkin',
      referenceId,
      `Visit check-in at store ${storeId}`,
    );
  }

  /**
   * Reward for scanning a merchant QR code: 5 coins.
   * Called when user scans the merchant QR code in the app.
   */
  async onQRScan(userId: string, storeId: string, scanId?: string): Promise<InstantRewardResult> {
    logger.info('[InstantRewardService] onQRScan', { userId, storeId, scanId });
    // H17: Use scanId when provided; otherwise date-stable key (one reward per store per day)
    const today = new Date().toISOString().slice(0, 10);
    const referenceId = scanId ? `qrscan:${scanId}` : `qrscan:${storeId}:${userId}:${today}`;
    return this.issueReward(userId, COIN_AMOUNTS.qr_scan, 'qr_scan', referenceId, `QR scan at store ${storeId}`);
  }

  /**
   * Reward for confirmed payment: percentage-based (2-5% of amount, capped at daily limit).
   * Called immediately after Razorpay or other payment gateway confirms payment.
   * Rate scales with amount: < Rs.500 → 2%, Rs.500-2000 → 3%, Rs.2000-5000 → 4%, > Rs.5000 → 5%.
   */
  async onPaymentConfirmed(userId: string, orderId: string, amount: number): Promise<InstantRewardResult> {
    logger.info('[InstantRewardService] onPaymentConfirmed', { userId, orderId, amount });

    // Scale percentage based on amount
    let pct: number;
    if (amount >= 5000) {
      pct = COIN_AMOUNTS.payment_max_pct;
    } else if (amount >= 2000) {
      pct = 4;
    } else if (amount >= 500) {
      pct = 3;
    } else {
      pct = COIN_AMOUNTS.payment_min_pct;
    }

    // Calculate instant reward coins (floor to avoid fractional coins)
    const rawCoins = Math.floor((amount * pct) / 100);
    // Clamp between 5 and 50 per transaction
    const requestedCoins = Math.max(5, Math.min(50, rawCoins));

    return this.issueReward(
      userId,
      requestedCoins,
      'payment_instant',
      `payment:${orderId}:instant`,
      `Instant reward on payment of ₹${amount} (order ${orderId})`,
    );
  }

  /**
   * Reward for uploading a bill: 15 coins.
   * Called when user uploads a bill/receipt via the bill upload flow.
   */
  async onBillUpload(userId: string, billId?: string, billHash?: string): Promise<InstantRewardResult> {
    logger.info('[InstantRewardService] onBillUpload', { userId, billId });
    // H17: Use billId for full idempotency when available; fall back to a hash-based key
    // so that re-uploads of the same bill (same hash) don't double-credit.
    // Final fallback is a date-stable key (one reward per user per day) which still
    // prevents infinite retries from creating unlimited credits.
    const today = new Date().toISOString().slice(0, 10);
    const referenceId = billId
      ? `billupload:${billId}`
      : billHash
        ? `billupload:${userId}:${billHash}`
        : `billupload:${userId}:${today}`;
    return this.issueReward(userId, COIN_AMOUNTS.bill_upload, 'bill_upload', referenceId, 'Reward for uploading bill');
  }

  /**
   * Get current daily instant reward usage for a user.
   * Used by frontend to show remaining daily reward capacity.
   */
  async getDailyUsage(userId: string): Promise<{ used: number; cap: number; remaining: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const capKey = `instant_reward:daily:${userId}:${today}`;

    try {
      const current = await redisService.get<number>(capKey);
      const used = typeof current === 'number' ? current : 0;
      return {
        used,
        cap: DAILY_INSTANT_REWARD_CAP,
        remaining: Math.max(0, DAILY_INSTANT_REWARD_CAP - used),
      };
    } catch {
      return { used: 0, cap: DAILY_INSTANT_REWARD_CAP, remaining: DAILY_INSTANT_REWARD_CAP };
    }
  }
}

export default new InstantRewardService();
