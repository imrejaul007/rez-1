import { Types } from 'mongoose';
import { createServiceLogger } from '../config/logger';
import { walletService } from '../services/walletService';
import { MerchantRewardJournal } from '../models/MerchantRewardJournal';
import { Store } from '../models/Store';
import { Wallet } from '../models/Wallet';
import merchantEventBus from '../events/merchantEventBus';
import redisService from '../services/redisService';

const logger = createServiceLogger('merchant-reward-service');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MerchantRewardInput {
  sessionId: string; // idempotency key — POS bill ID, appointment ID, etc.
  merchantId: string;
  storeId: string;
  userId: string;
  eventType: 'payment' | 'visit' | 'appointment' | 'table_pay';
  amount: number; // transaction amount in ₹
  paymentMethod?: string;
  metadata?: {
    selfReported?: boolean; // true when amount is user-entered at QR check-in (not POS-verified)
    [key: string]: unknown;
  };
}

export interface MerchantRewardResult {
  coinsIssued: number;
  skippedReasons: string[];
  journalId?: Types.ObjectId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified Merchant Reward Engine
 *
 * Single entry point for all merchant-triggered reward decisions.
 * Every call creates a MerchantRewardJournal entry for audit + dispute resolution.
 *
 * Call after payment confirmed (outside transaction, non-blocking is fine).
 *
 * v3 Architecture: Part 1.5 + Part 2 — reward engine with journal integration.
 *
 * Usage:
 *   await merchantRewardService.processReward({
 *     sessionId: storePayment._id.toString(),
 *     merchantId, storeId, userId,
 *     eventType: 'payment',
 *     amount: storePayment.billAmount,
 *   });
 */
export const merchantRewardService = {
  /**
   * Process a reward for a completed merchant event.
   * Idempotent: duplicate sessionId is rejected by MerchantRewardJournal unique index.
   */
  async processReward(input: MerchantRewardInput): Promise<MerchantRewardResult> {
    const skippedReasons: string[] = [];

    // ── 0. Idempotency guard — check if already processed ─────────────────
    const existing = await MerchantRewardJournal.findOne({ sessionId: input.sessionId }).lean();
    if (existing) {
      logger.info('[MerchantRewardService] Duplicate sessionId — skipping (idempotent)', {
        sessionId: input.sessionId,
      });
      return {
        coinsIssued: existing.decision.coinsIssued,
        skippedReasons: ['duplicate_session'],
      };
    }

    // ── 1. Fetch store reward rules ────────────────────────────────────────
    const store = await Store.findById(input.storeId).select('rewardRules merchantId name').lean();

    if (!store) {
      logger.warn('[MerchantRewardService] Store not found', { storeId: input.storeId });
      skippedReasons.push('store_not_found');
      return { coinsIssued: 0, skippedReasons };
    }

    const rules = store.rewardRules;

    // ── 2. Check minimum amount ────────────────────────────────────────────
    if (rules && rules.minimumAmountForReward && input.amount < rules.minimumAmountForReward) {
      skippedReasons.push('below_minimum_amount');
    }

    // ── 3. Compute coins ──────────────────────────────────────────────────
    let coinsIssued = 0;

    if (skippedReasons.length === 0 && rules) {
      // Base cashback (% of amount)
      const cashbackPercent = rules.baseCashbackPercent ?? 0;
      coinsIssued = Math.round((input.amount * cashbackPercent) / 100);

      // Per-rupee coins (e.g., 1 coin per ₹10 = coinsPerRupee: 0.1)
      if (rules.coinsPerRupee && rules.coinsPerRupee > 0) {
        coinsIssued += Math.floor(input.amount * rules.coinsPerRupee);
      }

      // Extra reward threshold (e.g., spend ₹400+ → bonus coins)
      if (rules.extraRewardThreshold && rules.extraRewardCoins && input.amount >= rules.extraRewardThreshold) {
        coinsIssued += rules.extraRewardCoins;
      }
    }

    // ── 3a. Self-reported amount cap ──────────────────────────────────────
    // QR check-in amounts are user-entered and not verified by the merchant POS.
    // Cap the effective bill amount to SELF_REPORTED_AMOUNT_CAP (default ₹2,000)
    // so a user claiming ₹49,999 earns coins on at most ₹2,000.
    const isSelfReported = input.metadata?.selfReported === true;
    if (isSelfReported && coinsIssued > 0 && input.amount > 0) {
      const SELF_REPORTED_AMOUNT_CAP = parseInt(process.env.SELF_REPORTED_AMOUNT_CAP || '2000', 10);
      const cappedAmount = Math.min(input.amount, SELF_REPORTED_AMOUNT_CAP);
      if (input.amount > cappedAmount && input.amount > 0) {
        const cappingRatio = cappedAmount / input.amount;
        const originalCoins = coinsIssued;
        coinsIssued = Math.floor(coinsIssued * cappingRatio);
        logger.info('[MERCHANT_REWARD] Self-reported amount capped', {
          originalAmount: input.amount,
          cappedAmount,
          originalCoins,
          coinsAfterCap: coinsIssued,
          userId: input.userId,
          storeId: input.storeId,
        });
      }
    }

    // ── 3b. Daily QR coin cap per user ───────────────────────────────────
    // Prevents sustained coin farming: even within the per-visit cap, a user
    // cannot earn more than DAILY_QR_COIN_CAP (default 500) coins per day
    // from self-reported QR check-ins.
    if (isSelfReported) {
      const DAILY_QR_COIN_CAP = parseInt(process.env.DAILY_QR_COIN_CAP || '500', 10);
      const dailyCoinKey = `qr:daily:coins:${input.userId}`;
      const todayCoinsRaw = await redisService.get<string>(dailyCoinKey).catch(() => null);
      const todayCoins = parseInt(todayCoinsRaw ?? '0', 10);

      if (todayCoins >= DAILY_QR_COIN_CAP) {
        logger.info('[MERCHANT_REWARD] Daily QR coin cap reached — awarding 0 coins', {
          userId: input.userId,
          todayCoins,
          DAILY_QR_COIN_CAP,
        });
        coinsIssued = 0;
        skippedReasons.push('daily_qr_coin_cap_reached');
      } else if (coinsIssued > 0) {
        // Clamp so the user doesn't exceed the daily cap in a single visit
        const allowable = DAILY_QR_COIN_CAP - todayCoins;
        if (coinsIssued > allowable) {
          logger.info('[MERCHANT_REWARD] Clamping coins to daily QR cap remainder', {
            userId: input.userId,
            coinsIssued,
            allowable,
          });
          coinsIssued = allowable;
        }
        // Update the running daily total (TTL = 24 h)
        const newTotal = todayCoins + coinsIssued;
        await redisService.set<string>(dailyCoinKey, String(newTotal), 86400).catch(() => {});
      }
    }

    if (coinsIssued <= 0 && skippedReasons.length === 0) {
      skippedReasons.push('no_active_reward_program');
    }

    // ── 4. Read wallet balance before credit ──────────────────────────────
    let balanceBefore = { rezCoins: 0, promoCoins: 0 };
    try {
      const wallet = await Wallet.findOne({ user: input.userId }).select('coins').lean();
      if (wallet) {
        const rezEntry = (wallet as any).coins?.find((c: any) => c.type === 'rez');
        const promoEntry = (wallet as any).coins?.find((c: any) => c.type === 'promo');
        balanceBefore = {
          rezCoins: rezEntry?.amount ?? 0,
          promoCoins: promoEntry?.amount ?? 0,
        };
      }
    } catch (e) {
      logger.warn('[MerchantRewardService] Could not read wallet balance before', { err: e });
    }

    // ── 5. Credit coins ────────────────────────────────────────────────────
    let ledgerPairId: string | undefined;
    if (coinsIssued > 0) {
      try {
        const result = await walletService.credit({
          userId: input.userId,
          amount: coinsIssued,
          source: 'merchant_reward',
          description: `Reward for ${input.eventType} at ${(store as any).name || 'store'}`,
          operationType: 'store_payment_reward',
          referenceId: `merchant-reward:${input.sessionId}`,
          referenceModel: 'StorePayment',
          metadata: {
            sessionId: input.sessionId,
            merchantId: input.merchantId,
            storeId: input.storeId,
            eventType: input.eventType,
            amount: input.amount,
          },
        });
        ledgerPairId = result.ledgerPairId;
      } catch (creditErr) {
        logger.error('[MerchantRewardService] Coin credit failed', {
          sessionId: input.sessionId,
          err: (creditErr as Error)?.message,
        });
        skippedReasons.push('credit_failed');
        coinsIssued = 0;
      }
    }

    // ── 6. Write immutable journal entry ──────────────────────────────────
    const balanceAfter = {
      rezCoins: balanceBefore.rezCoins + coinsIssued,
      promoCoins: balanceBefore.promoCoins,
    };

    let journal: any;
    try {
      journal = await MerchantRewardJournal.create({
        sessionId: input.sessionId,
        merchantId: new Types.ObjectId(input.merchantId),
        storeId: new Types.ObjectId(input.storeId),
        userId: new Types.ObjectId(input.userId),
        eventType: input.eventType,
        transactionAmount: input.amount,
        decision: {
          coinsIssued,
          coinType: 'rez',
          stampAdded: false,
          tierUpgraded: false,
          skippedReasons,
        },
        balanceBefore,
        balanceAfter,
        ledgerPairId,
      });
    } catch (journalErr: any) {
      // Duplicate key (11000) = already processed — safe to ignore
      if (journalErr?.code === 11000) {
        logger.info('[MerchantRewardService] Journal entry already exists (duplicate)', {
          sessionId: input.sessionId,
        });
      } else {
        logger.error('[MerchantRewardService] Journal write failed (coins already credited)', {
          sessionId: input.sessionId,
          err: journalErr?.message,
        });
      }
    }

    // ── 7. Publish durable event for downstream handlers ─────────────────
    if (coinsIssued > 0) {
      merchantEventBus
        .publish({
          type: 'ORDER_PAID',
          merchantId: input.merchantId,
          storeId: input.storeId,
          payload: {
            sessionId: input.sessionId,
            userId: input.userId,
            amount: input.amount,
            coinsIssued,
            eventType: input.eventType,
          },
        })
        .catch((e) => logger.warn('[MerchantRewardService] Event publish failed', e));
    }

    logger.info('[MerchantRewardService] Reward processed', {
      sessionId: input.sessionId,
      coinsIssued,
      skippedReasons,
    });

    return {
      coinsIssued,
      skippedReasons,
      journalId: journal?._id,
    };
  },
};

export default merchantRewardService;
