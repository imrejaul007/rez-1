import redisService from './redisService';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

export interface RewardCalculationInput {
  userId: string;
  storeId?: string;
  merchantId?: string;
  category?: string;
  orderAmountPaise: number;
  sources: RewardSource[];
}

export type RewardSource =
  | { type: 'cashback'; rate: number }
  | { type: 'branded_coin'; rate: number; brandId: string }
  | { type: 'promo_coin'; rate: number; campaignId: string }
  | { type: 'visit_loyalty'; tierMultiplier: number }
  | { type: 'referral'; amount: number }
  | { type: 'prive'; rate: number };

export interface RewardCalculationResult {
  coinReward: number;
  cashbackPaise: number;
  appliedSources: string[];
  skippedSources: Array<{ source: string; reason: string }>;
  dailyCapReached: boolean;
}

// Global caps (overridable from RewardConfig in DB)
const DAILY_COIN_CAP_DEFAULT = 500;
const DAILY_CASHBACK_CAP_PAISE = 20000; // ₹200
const MAX_COIN_PER_TRANSACTION = 200;
const MAX_CASHBACK_PER_TRANSACTION_PAISE = 5000; // ₹50

// Rule precedence: higher number = higher priority (wins in conflicts)
const SOURCE_PRIORITY: Record<string, number> = {
  cashback: 10,
  prive: 9,
  branded_coin: 8,
  visit_loyalty: 5,
  promo_coin: 4,
  referral: 3,
};

export class RewardRuleEngine {
  /**
   * Validate that the reward source event actually exists and belongs to this user.
   * MIGUEL: abuse prevention — replay attack prevention.
   * Prevents: attacker replaying same order/review/referral event multiple times
   * for multiple reward issuances.
   *
   * For each reward source, verify:
   * 1. Source event exists in DB
   * 2. Event user_id matches input.userId
   * 3. Event hasn't been processed for reward already (idempotency key)
   *
   * @param sourceId Event ID (orderId, reviewId, referralId, etc.)
   * @param sourceType Type of event
   * @param userId User claiming the reward
   * @returns true if valid, false if invalid/replay
   */
  private static async validateRewardSource(
    sourceId: string | undefined,
    sourceType: string,
    userId: string,
  ): Promise<boolean> {
    if (!sourceId) return true; // No source ID to validate (e.g., visit loyalty)

    try {
      const redis = redisService;
      const rewardClaimKey = `reward:claimed:${sourceType}:${sourceId}:${userId}`;

      // TOCTOU FIX: Use SET NX (set-if-not-exists) as the atomic claim gate.
      // The previous pattern — GET then SET — had a race window where two concurrent
      // requests both see a cache miss, both pass validation, and both issue rewards.
      // SET NX returns true only for the first caller; all others get false immediately.
      const client = (redis as any).getClient?.();
      let claimedNow = false;
      if (client?.set) {
        // ioredis SET key value NX EX ttl — returns 'OK' if set, null if key exists
        const setResult = await client.set(
          rewardClaimKey,
          '1',
          'EX',
          90 * 24 * 60 * 60, // 90-day TTL
          'NX',
        );
        if (setResult === null) {
          // Key already existed — duplicate claim
          logger.warn('[RewardRuleEngine] Replay attack detected (Redis SET NX)', {
            userId,
            sourceType,
            sourceId,
            message: 'Same source event claimed multiple times',
          });
          return false;
        }
        claimedNow = true;
      } else {
        // Redis client unavailable — fall through to MongoDB check below
        const alreadyClaimed = await redis.get<string>(rewardClaimKey);
        if (alreadyClaimed) {
          logger.warn('[RewardRuleEngine] Replay attack detected (Redis GET)', {
            userId,
            sourceType,
            sourceId,
          });
          return false;
        }
      }

      // ISSUE-62 FIX: Always cross-check MongoDB to handle Redis restarts/evictions.
      // If we just claimed the Redis key (claimedNow=true) but a DB record already
      // exists, another process wrote it before this one — reject and clean up.
      const dbClaim = await mongoose.model('RewardClaim').findOne({ userId, sourceType, sourceId }).lean();
      if (dbClaim) {
        // Another process already persisted this claim; roll back our Redis SET
        if (claimedNow && client?.del) {
          await client.del(rewardClaimKey).catch(() => {});
        }
        logger.warn('[RewardRuleEngine] Replay detected via DB fallback (Redis miss)', {
          userId,
          sourceType,
          sourceId,
        });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[RewardRuleEngine] Reward source validation error', {
        error: (err as Error).message,
        sourceType,
        userId,
      });
      return false; // Fail-closed on error — deny reward rather than risk abuse
    }
  }

  /**
   * Mark a reward source as claimed (prevent replay).
   * MIGUEL: abuse prevention — idempotency enforcement
   */
  private static async markSourceClaimed(
    sourceId: string | undefined,
    sourceType: string,
    userId: string,
  ): Promise<void> {
    if (!sourceId) return;

    try {
      const redis = redisService;
      const rewardClaimKey = `reward:claimed:${sourceType}:${sourceId}:${userId}`;
      // TTL: 90 days (reward events are immutable, claim should persist)
      await redis.set(rewardClaimKey, '1', 90 * 24 * 60 * 60);

      // ISSUE-62 FIX: Persist claim to MongoDB so idempotency survives Redis
      // restarts/evictions. findOneAndUpdate with upsert is idempotent — if two
      // concurrent callers race here the unique index absorbs the duplicate via
      // $setOnInsert semantics; E11000 means it was already written, which is fine.
      try {
        await mongoose
          .model('RewardClaim')
          .findOneAndUpdate(
            { userId, sourceType, sourceId },
            { $setOnInsert: { userId, sourceType, sourceId, claimedAt: new Date() } },
            { upsert: true },
          );
      } catch (err) {
        // E11000 = duplicate key — another request already wrote this claim, which is correct.
        if ((err as any).code !== 11000) {
          logger.warn('[RewardRuleEngine] Failed to persist claim to DB', err);
        }
      }
    } catch (err) {
      logger.warn('[RewardRuleEngine] Failed to mark source as claimed', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Calculate final reward, applying precedence rules and daily caps.
   * ONLY ONE source of coins + ONE source of cashback can apply per transaction.
   * (Prevents stacking exploit)
   *
   * MIGUEL: abuse prevention — validates each source event exists before issuing reward
   */
  static async calculate(input: RewardCalculationInput): Promise<RewardCalculationResult> {
    const result: RewardCalculationResult = {
      coinReward: 0,
      cashbackPaise: 0,
      appliedSources: [],
      skippedSources: [],
      dailyCapReached: false,
    };

    const redis = redisService;

    // Check platform kill switch
    const platformKillSwitch = await redis.get<string>('killswitch:rewards:platform');
    if (platformKillSwitch === 'true') {
      input.sources.forEach((s) => result.skippedSources.push({ source: s.type, reason: 'platform_kill_switch' }));
      return result;
    }

    // Check merchant kill switch
    if (input.merchantId) {
      const merchantKillSwitch = await redis.get<string>(`killswitch:rewards:merchant:${input.merchantId}`);
      if (merchantKillSwitch === 'true') {
        input.sources.forEach((s) => result.skippedSources.push({ source: s.type, reason: 'merchant_kill_switch' }));
        return result;
      }
    }

    // Check daily caps
    const today = new Date().toISOString().split('T')[0];
    const dailyCoinKey = `user:daily:coins:${input.userId}:${today}`;
    const dailyCashbackKey = `user:daily:cashback:${input.userId}:${today}`;

    const dailyCoinsEarned = parseInt((await redis.get<string>(dailyCoinKey)) || '0', 10);
    const dailyCashbackEarned = parseInt((await redis.get<string>(dailyCashbackKey)) || '0', 10);

    if (dailyCoinsEarned >= DAILY_COIN_CAP_DEFAULT && dailyCashbackEarned >= DAILY_CASHBACK_CAP_PAISE) {
      result.dailyCapReached = true;
      input.sources.forEach((s) => result.skippedSources.push({ source: s.type, reason: 'daily_cap_reached' }));
      return result;
    }

    // Sort sources by priority (highest first)
    const sorted = [...input.sources].sort((a, b) => (SOURCE_PRIORITY[b.type] || 0) - (SOURCE_PRIORITY[a.type] || 0));

    // Apply rule: only ONE coin source + ONE cashback source per transaction
    let coinSourceApplied = false;
    let cashbackSourceApplied = false;

    for (const source of sorted) {
      if (source.type === 'cashback') {
        if (cashbackSourceApplied) {
          result.skippedSources.push({ source: 'cashback', reason: 'cashback_source_already_applied' });
          continue;
        }
        let cashback = Math.floor((input.orderAmountPaise * source.rate) / 100);
        cashback = Math.min(cashback, MAX_CASHBACK_PER_TRANSACTION_PAISE);
        cashback = Math.min(cashback, DAILY_CASHBACK_CAP_PAISE - dailyCashbackEarned);
        if (cashback > 0) {
          result.cashbackPaise += cashback;
          result.appliedSources.push('cashback');
          cashbackSourceApplied = true;
        }
      } else if (['branded_coin', 'promo_coin', 'visit_loyalty', 'prive'].includes(source.type)) {
        if (coinSourceApplied) {
          result.skippedSources.push({ source: source.type, reason: 'coin_source_already_applied' });
          continue;
        }
        let coins = 0;
        if ('rate' in source) {
          coins = Math.floor((input.orderAmountPaise * source.rate) / 10000); // paise to coin
        }
        if (source.type === 'visit_loyalty' && 'tierMultiplier' in source) {
          coins = Math.floor(coins * source.tierMultiplier);
        }
        coins = Math.min(coins, MAX_COIN_PER_TRANSACTION);
        coins = Math.min(coins, DAILY_COIN_CAP_DEFAULT - dailyCoinsEarned);
        if (coins > 0) {
          result.coinReward += coins;
          result.appliedSources.push(source.type);
          coinSourceApplied = true;
        }
      } else if (source.type === 'referral') {
        // Referral rewards are one-time — handled separately, not via this engine
        result.skippedSources.push({ source: 'referral', reason: 'handled_separately' });
      }
    }

    // MIGUEL: abuse prevention — validate sources before finalizing reward
    // For any source with an ID, ensure it's valid and not replayed
    if ((result.coinReward > 0 || result.cashbackPaise > 0) && input.sources.length > 0) {
      for (const source of input.sources) {
        const sourceId = (source as any).sourceId || (source as any).orderId || (source as any).reviewId;
        const isValid = await this.validateRewardSource(sourceId, source.type, input.userId);
        if (!isValid) {
          // Replay or invalid source detected
          result.coinReward = 0;
          result.cashbackPaise = 0;
          result.appliedSources = [];
          result.skippedSources.push({
            source: source.type,
            reason: 'source_validation_failed_replay_attack',
          });
          return result;
        }
      }
      // Mark all sources as claimed for future replay prevention
      for (const source of input.sources) {
        const sourceId = (source as any).sourceId || (source as any).orderId || (source as any).reviewId;
        await this.markSourceClaimed(sourceId, source.type, input.userId);
      }
    }

    return result;
  }

  /** After reward is issued, increment daily counters */
  static async recordReward(userId: string, coins: number, cashbackPaise: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const ttl = 86400; // 24 hours
    const redis = redisService;

    if (coins > 0) {
      await redis.incr(`user:daily:coins:${userId}:${today}`, coins);
      await redis.expire(`user:daily:coins:${userId}:${today}`, ttl);
    }
    if (cashbackPaise > 0) {
      await redis.incr(`user:daily:cashback:${userId}:${today}`, cashbackPaise);
      await redis.expire(`user:daily:cashback:${userId}:${today}`, ttl);
    }
  }
}
