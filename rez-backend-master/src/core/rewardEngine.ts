import crypto from 'crypto';
import { Types, ClientSession } from 'mongoose';
import { Wallet } from '../models/Wallet';
import { CoinTransaction, MainCategorySlug } from '../models/CoinTransaction';
import { UserLoyalty } from '../models/UserLoyalty';
import { LedgerOperationType, LedgerCoinType } from '../models/LedgerEntry';
import { walletService, WalletMutationResult } from '../services/walletService';
import { ledgerService } from '../services/ledgerService';
import specialProgramService from '../services/specialProgramService';
import gamificationEventBus from '../events/gamificationEventBus';
import redisService from '../services/redisService';
import { CURRENCY_RULES } from '../config/currencyRules';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('reward-engine');

// ─── Types ──────────────────────────────────────────────────

export type RewardType =
  | 'cashback' | 'referral' | 'game_prize' | 'achievement'
  | 'bonus_campaign' | 'engagement' | 'creator_earning'
  | 'tournament_prize' | 'leaderboard_prize' | 'event_reward'
  | 'learning_reward' | 'social_impact' | 'survey'
  | 'travel_cashback' | 'mall_affiliate' | 'prive_invite'
  | 'challenge_reward' | 'partner_bonus' | 'spin_wheel'
  | 'scratch_card' | 'quiz_game' | 'admin_adjustment'
  | 'pick_approval' | 'program_task'
  | 'prive_campaign'
  | 'bill_payment';

export interface RewardRequest {
  userId: string;
  amount: number;
  rewardType: RewardType;
  source: string;
  description: string;
  operationType: LedgerOperationType;
  referenceId: string;
  referenceModel: string;
  category?: MainCategorySlug | null;
  coinType?: 'rez' | 'prive' | 'promo' | 'branded';
  metadata?: Record<string, any>;
  skipCap?: boolean;
  skipMultiplier?: boolean;
  session?: ClientSession;
  merchantId?: string;
  merchantLiability?: number;
}

export interface RewardResult {
  success: boolean;
  transactionId: Types.ObjectId | null;
  amount: number;
  newBalance: number;
  source: string;
  description: string;
  category: MainCategorySlug | null;
  ledgerPairId?: string;
  cappedReason?: string;
  multiplierBonus?: number;
  originalAmount?: number;
  idempotencyKey: string;
  duplicate?: boolean;
}

export interface RedemptionStep {
  coinType: 'promo' | 'branded' | 'prive' | 'rez';
  amountDeducted: number;
  merchantId?: string;
}

export interface RedemptionResult {
  success: boolean;
  totalDeducted: number;
  steps: RedemptionStep[];
  newBalance: number;
  transactionIds: Types.ObjectId[];
}

export interface ReversalResult {
  success: boolean;
  reversalTransactionId: Types.ObjectId | null;
  amount: number;
  newBalance: number;
  originalTransactionId: string;
  reason: string;
}

export type RewardErrorCode =
  | 'WALLET_FROZEN' | 'NO_WALLET' | 'INSUFFICIENT_BALANCE'
  | 'TX_NOT_FOUND' | 'INVALID_REVERSAL' | 'AMOUNT_EXCEEDED'
  | 'DUPLICATE_REWARD' | 'CAP_REACHED';

export class RewardError extends Error {
  code: RewardErrorCode;
  constructor(code: RewardErrorCode, message: string) {
    super(message);
    this.name = 'RewardError';
    this.code = code;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function generateIdempotencyKey(userId: string, referenceId: string, rewardType: string, source: string): string {
  return crypto.createHash('sha256')
    .update(`${userId}:${referenceId}:${rewardType}:${source}`)
    .digest('hex');
}

function mapCoinTypeToLedger(coinType: string): LedgerCoinType {
  switch (coinType) {
    case 'promo': return 'promo';
    case 'branded': return 'branded';
    default: return 'nuqta';
  }
}

async function calculateExpiryDate(coinType: 'rez' | 'prive' | 'promo' | 'branded'): Promise<Date | undefined> {
  let expiryDays: number;
  try {
    const config = await getCachedWalletConfig();
    expiryDays = config?.coinExpiryConfig?.[coinType]?.expiryDays
      ?? CURRENCY_RULES[coinType]?.expiryDays
      ?? 0;
  } catch {
    expiryDays = CURRENCY_RULES[coinType]?.expiryDays ?? 0;
  }
  if (expiryDays <= 0) return undefined;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);
  return expiry;
}

// ─── Reward Engine ──────────────────────────────────────────

class RewardEngine {

  /**
   * Single entry point for ALL reward issuance.
   *
   * Flow:
   * 1. Generate deterministic idempotency key
   * 2. Fast duplicate check (Redis)
   * 3. Validate eligibility (wallet not frozen)
   * 4. Apply earning cap (unless skipCap)
   * 5. Calculate expiry for non-rez coins
   * 6. Atomic wallet mutation via walletService.credit()
   * 7. Apply multiplier bonus (unless skipMultiplier)
   * 8. Record merchant liability (if applicable)
   * 9. Update UserLoyalty categoryCoins (if category)
   * 10. Emit REWARD_ISSUED event
   * 11. Cache result for fast dedup
   */
  async issue(request: RewardRequest): Promise<RewardResult> {
    const {
      userId, amount, rewardType, source, description,
      operationType, referenceId, referenceModel,
      category, coinType = 'rez', metadata = {},
      skipCap = false, skipMultiplier = false, session,
      merchantId, merchantLiability,
    } = request;

    // Step 0: Global reward kill-switch (checked via cached WalletConfig)
    try {
      const config = await getCachedWalletConfig();
      if (config && (config as any).rewardIssuanceEnabled === false) {
        logger.warn('Reward issuance DISABLED via kill-switch', { userId, amount, source });
        return this.emptyResult(source, description, category || null, `killswitch:${userId}:${Date.now()}`);
      }
      // Step 0b: Per-coin-type kill switch
      const killSwitch = (config as any)?.coinManagement?.globalKillSwitch;
      if (killSwitch?.active && killSwitch?.pausedTypes?.length) {
        if (killSwitch.pausedTypes.includes(coinType)) {
          logger.warn(`[KILL_SWITCH] Coin issuance blocked for type: ${coinType}`, { reason: killSwitch.reason, userId, amount });
          return this.emptyResult(source, description, category || null, `killswitch-type:${coinType}:${userId}:${Date.now()}`);
        }
      }
    } catch {
      // Config fetch failure — proceed (fail-open on config, fail-closed on cap)
    }

    // Step 1: Deterministic idempotency key
    const idempotencyKey = metadata?.idempotencyKey
      || generateIdempotencyKey(userId, referenceId, rewardType, source);

    // Step 2: Fast duplicate check (Redis)
    const dupeKey = `reward:issued:${idempotencyKey}`;
    try {
      const cached = await redisService.get(dupeKey);
      if (cached) {
        const existing = JSON.parse(cached as string) as RewardResult;
        return { ...existing, duplicate: true };
      }
    } catch {
      // Redis failure — fall through to DB-level idempotency
    }

    // Step 3: Validate eligibility
    if (amount <= 0) {
      return this.emptyResult(source, description, category, idempotencyKey);
    }

    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (wallet && (wallet as any).isFrozen) {
      throw new RewardError('WALLET_FROZEN', `Wallet is frozen: ${(wallet as any).frozenReason || 'unknown'}`);
    }

    // Step 4a: Savings Streak Multiplier (non-blocking, fail-open)
    let streakMultiplier = 1.0;
    let streakTierName: string | undefined;
    if (!skipMultiplier && (source === 'cashback' || source === 'order' || source === 'review')) {
      try {
        const { default: UserStreak } = await import('../models/UserStreak');
        const savingsStreak = await UserStreak.findOne({
          user: userId,
          type: 'savings',
        }).select('currentStreak').lean();

        const days = (savingsStreak as any)?.currentStreak ?? 0;
        if (days >= 60) { streakMultiplier = 1.20; streakTierName = 'Smart Saver Elite'; }
        else if (days >= 21) { streakMultiplier = 1.15; streakTierName = 'Gold Saver'; }
        else if (days >= 7) { streakMultiplier = 1.10; streakTierName = 'Silver Saver'; }
        else if (days >= 1) { streakMultiplier = 1.05; streakTierName = 'Bronze Saver'; }
      } catch {
        // Non-blocking — use 1.0 on any error
      }
    }

    // Step 4b: Apply earning cap (fail-open)
    let adjustedAmount = streakMultiplier > 1 ? Math.floor(amount * streakMultiplier) : amount;
    if (streakMultiplier > 1) {
      (metadata as any).streakMultiplier = streakMultiplier;
      (metadata as any).streakTierName = streakTierName;
      (metadata as any).baseAmount = amount;
      (metadata as any).bonusCoins = adjustedAmount - amount;
    }
    let cappedReason: string | undefined;
    if (!skipCap) {
      try {
        const capCheck = await specialProgramService.checkEarningCap(userId, amount, source);
        if (!capCheck.allowed && capCheck.adjustedAmount === 0) {
          return {
            success: true,
            transactionId: null,
            amount: 0,
            newBalance: wallet ? (wallet as any).balance?.available ?? 0 : 0,
            source, description,
            category: category || null,
            cappedReason: capCheck.reason,
            originalAmount: amount,
            idempotencyKey,
          };
        }
        adjustedAmount = capCheck.adjustedAmount;
        if (adjustedAmount < amount) {
          cappedReason = capCheck.reason;
        }
      } catch (capError) {
        // FAIL-CLOSED: If cap check service is down, block reward issuance to prevent runaway inflation
        logger.error('Program cap check failed — BLOCKING reward issuance (fail-closed)', capError as Error, { userId, amount, source });
        return this.emptyResult(source, description, category || null, idempotencyKey);
      }
    }

    // Step 5: Calculate expiry for non-rez coins
    const enrichedMetadata: Record<string, any> = { ...metadata, idempotencyKey, rewardType };
    if (coinType !== 'rez') {
      const expiresAt = await calculateExpiryDate(coinType);
      if (expiresAt) {
        enrichedMetadata.expiresAt = expiresAt;
      }
    }

    // Step 6a: DB-level duplicate check (fallback if Redis missed)
    const existingTx = await CoinTransaction.findOne({
      user: userId,
      'metadata.idempotencyKey': idempotencyKey,
    }).lean();
    if (existingTx) {
      const dupeResult: RewardResult = {
        success: true,
        transactionId: (existingTx as any)._id,
        amount: (existingTx as any).amount,
        newBalance: (existingTx as any).balance,
        source, description,
        category: category || null,
        idempotencyKey,
        duplicate: true,
      };
      redisService.set(dupeKey, JSON.stringify(dupeResult), 300).catch((err) => logger.warn('[RewardEngine] Redis cache set failed for duplicate result', { error: err.message, idempotencyKey }));
      return dupeResult;
    }

    // Step 6b: Atomic wallet mutation
    let result: WalletMutationResult;
    try {
      result = await walletService.credit({
        userId,
        amount: adjustedAmount,
        source,
        description,
        operationType,
        referenceId,
        referenceModel,
        metadata: enrichedMetadata,
        category,
        coinType: mapCoinTypeToLedger(coinType),
        session,
      });
    } catch (error: any) {
      // Check if this is a duplicate key error (idempotency guard in CoinTransaction)
      if (error?.code === 11000 || error?.message?.includes('duplicate')) {
        logger.info('Duplicate reward detected via DB index', { userId, referenceId, rewardType });
        return {
          success: true,
          transactionId: null,
          amount: adjustedAmount,
          newBalance: wallet ? (wallet as any).balance?.available ?? 0 : 0,
          source, description,
          category: category || null,
          idempotencyKey,
          duplicate: true,
        };
      }
      throw error;
    }

    // Step 7: Multiplier bonus (fail-open, non-blocking for error)
    let multiplierBonus = 0;
    if (!skipMultiplier) {
      try {
        const { bonus, programBonuses } = await specialProgramService.calculateMultiplierBonus(userId, adjustedAmount, source);
        if (bonus > 0) {
          const slugLabel = programBonuses.map((pb: any) => pb.slug).join('+');
          await walletService.credit({
            userId,
            amount: bonus,
            source: 'program_multiplier_bonus',
            description: `${slugLabel} multiplier bonus on ${source}`,
            operationType: 'loyalty_credit',
            referenceId: `multiplier-bonus:${result.transactionId}`,
            referenceModel: 'CoinTransaction',
            metadata: {
              originalTransactionId: result.transactionId,
              programSlug: slugLabel,
              programBonuses,
              idempotencyKey: `${idempotencyKey}:multiplier`,
            },
            category,
          });
          multiplierBonus = bonus;

          for (const pb of programBonuses) {
            await specialProgramService.incrementMultiplierBonus(userId, pb.slug, pb.bonus).catch((err) => logger.error('[RewardEngine] Increment multiplier bonus failed', { error: err.message, userId, slug: pb.slug }));
          }
        }
        await specialProgramService.incrementMonthlyEarnings(userId, adjustedAmount + multiplierBonus).catch((err) => logger.error('[RewardEngine] Increment monthly earnings failed', { error: err.message, userId }));
      } catch (err) {
        logger.error('Multiplier bonus failed (non-blocking)', err as Error, { userId, source });
      }
    }

    // Step 8: Merchant liability ledger entry (fire-and-forget)
    if (merchantId && merchantLiability && merchantLiability > 0) {
      this.recordMerchantLiability(
        merchantId, merchantLiability, coinType,
        operationType, referenceId, referenceModel, rewardType,
      ).catch((err) => {
        logger.error('Merchant liability ledger failed (non-blocking)', err as Error, { merchantId, merchantLiability });
      });
    }

    // Step 9: Update UserLoyalty categoryCoins (non-blocking)
    if (category) {
      this.updateUserLoyaltyCategory(userId, category, adjustedAmount).catch((err) => logger.error('[RewardEngine] UserLoyalty category update failed', { error: err.message, userId, category }));
    }

    // Step 10: Emit REWARD_ISSUED event
    setImmediate(() => {
      try {
        gamificationEventBus.emit('reward_issued' as any, {
          userId,
          entityId: referenceId,
          entityType: rewardType,
          amount: adjustedAmount,
          metadata: {
            source,
            rewardType,
            category,
            coinType,
            multiplierBonus: multiplierBonus > 0 ? multiplierBonus : undefined,
            transactionId: result.transactionId?.toString(),
          },
          source: { controller: 'rewardEngine', action: 'issue' },
        });
      } catch (err) {
        logger.error('Failed to emit reward_issued event', err as Error);
      }
    });

    // Step 11: Cache result for fast dedup
    const rewardResult: RewardResult = {
      success: true,
      transactionId: result.transactionId,
      amount: result.amount,
      newBalance: result.newBalance,
      source: result.source,
      description: result.description,
      category: category || null,
      ledgerPairId: result.ledgerPairId,
      cappedReason,
      multiplierBonus: multiplierBonus > 0 ? multiplierBonus : undefined,
      originalAmount: adjustedAmount < amount ? amount : undefined,
      idempotencyKey,
    };

    redisService.set(dupeKey, JSON.stringify(rewardResult), 300).catch((err) => logger.warn('[RewardEngine] Redis cache set failed for reward result', { error: err.message, idempotencyKey }));

    return rewardResult;
  }

  /**
   * Consume coins in priority order: promo (1) → branded (2) → prive (3) → rez (4).
   * Each deduction is an atomic walletService.debit() call.
   */
  async applyRedemptionPipeline(
    userId: string,
    totalAmount: number,
    options?: {
      session?: ClientSession;
      referenceId?: string;
      referenceModel?: string;
      description?: string;
      maxPromoPct?: number;
      allowedMerchantIds?: string[];
    }
  ): Promise<RedemptionResult> {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) throw new RewardError('NO_WALLET', 'Wallet not found');
    if ((wallet as any).isFrozen) throw new RewardError('WALLET_FROZEN', 'Wallet is frozen');

    const coinOrder = (wallet as any).getCoinUsageOrder() as Array<{ type: string; amount: number; merchantId?: string }>;
    let remaining = totalAmount;
    const steps: RedemptionStep[] = [];
    const transactionIds: Types.ObjectId[] = [];
    const refId = options?.referenceId || `redeem:${userId}:${Date.now()}`;

    for (const coin of coinOrder) {
      if (remaining <= 0) break;

      // Apply maxUsagePct constraint (promo coins default to 20% of bill)
      let maxForThisType = remaining;
      const rule = CURRENCY_RULES[coin.type];
      if (rule && rule.maxUsagePct < 100) {
        const pctLimit = options?.maxPromoPct ?? rule.maxUsagePct;
        maxForThisType = Math.min(remaining, Math.round(totalAmount * pctLimit / 100));
      }

      // For branded coins, filter by allowedMerchantIds if specified
      if (coin.type === 'branded' && options?.allowedMerchantIds) {
        if (!coin.merchantId || !options.allowedMerchantIds.includes(coin.merchantId)) {
          continue;
        }
      }

      const toDeduct = Math.min(coin.amount, maxForThisType, remaining);
      if (toDeduct <= 0) continue;

      const debitResult = await walletService.debit({
        userId,
        amount: toDeduct,
        source: 'redemption',
        description: options?.description || `Redeemed ${toDeduct} ${coin.type} coins`,
        operationType: 'payment',
        referenceId: `${refId}:${coin.type}:${coin.merchantId || 'none'}`,
        referenceModel: options?.referenceModel || 'Redemption',
        metadata: {
          coinType: coin.type,
          merchantId: coin.merchantId,
          pipelineStep: steps.length + 1,
          idempotencyKey: `${refId}:${coin.type}:${coin.merchantId || 'none'}`,
        },
        category: null,
        coinType: mapCoinTypeToLedger(coin.type),
        session: options?.session,
      });

      steps.push({
        coinType: coin.type as RedemptionStep['coinType'],
        amountDeducted: toDeduct,
        merchantId: coin.merchantId,
      });
      if (debitResult.transactionId) {
        transactionIds.push(debitResult.transactionId);
      }
      remaining -= toDeduct;
    }

    if (remaining > 0) {
      throw new RewardError(
        'INSUFFICIENT_BALANCE',
        `Insufficient balance. Needed ${totalAmount}, could only deduct ${totalAmount - remaining}`,
      );
    }

    const updatedWallet = await Wallet.findOne({ user: userId }).lean();
    return {
      success: true,
      totalDeducted: totalAmount,
      steps,
      newBalance: updatedWallet ? (updatedWallet as any).balance?.available ?? 0 : 0,
      transactionIds,
    };
  }

  /**
   * Reverse a previously issued reward.
   * Creates a 'spent' CoinTransaction linked to the original, debits wallet.
   */
  async reverseReward(
    originalTransactionId: string,
    reason: string,
    options?: { session?: ClientSession; partialAmount?: number }
  ): Promise<ReversalResult> {
    // 1. Find the original transaction
    const original = await CoinTransaction.findById(originalTransactionId).lean();
    if (!original) {
      throw new RewardError('TX_NOT_FOUND', `Transaction ${originalTransactionId} not found`);
    }

    // 2. Only earned/bonus/refunded can be reversed
    if (!['earned', 'bonus', 'refunded'].includes((original as any).type)) {
      throw new RewardError('INVALID_REVERSAL', `Cannot reverse transaction of type: ${(original as any).type}`);
    }

    // 3. Check idempotency (prevent double reversal)
    const alreadyReversed = await CoinTransaction.findOne({
      user: (original as any).user,
      'metadata.reversedTransactionId': originalTransactionId,
      type: 'spent',
    }).lean();

    if (alreadyReversed) {
      return {
        success: true,
        reversalTransactionId: (alreadyReversed as any)._id as Types.ObjectId,
        amount: (alreadyReversed as any).amount,
        newBalance: (alreadyReversed as any).balance,
        originalTransactionId,
        reason,
      };
    }

    // 4. Determine reversal amount
    const reversalAmount = options?.partialAmount ?? (original as any).amount;
    if (reversalAmount > (original as any).amount) {
      throw new RewardError('AMOUNT_EXCEEDED', `Reversal amount ${reversalAmount} exceeds original ${(original as any).amount}`);
    }

    // 5. Debit the wallet
    const debitResult = await walletService.debit({
      userId: (original as any).user.toString(),
      amount: reversalAmount,
      source: (original as any).source,
      description: `Reversed: ${reason}`,
      operationType: 'cashback_reversal',
      referenceId: `reversal:${originalTransactionId}`,
      referenceModel: 'CoinTransaction',
      metadata: {
        reversedTransactionId: originalTransactionId,
        reversalReason: reason,
        originalSource: (original as any).source,
        originalAmount: (original as any).amount,
        idempotencyKey: `reversal:${originalTransactionId}`,
      },
      category: (original as any).category || null,
      session: options?.session,
    });

    // 6. Reverse associated multiplier bonus (non-blocking)
    this.reverseMultiplierBonus(original, originalTransactionId, reason, options?.session).catch((err) => {
      logger.error('Multiplier bonus reversal failed (non-blocking)', err as Error, { originalTransactionId });
    });

    return {
      success: true,
      reversalTransactionId: debitResult.transactionId,
      amount: reversalAmount,
      newBalance: debitResult.newBalance,
      originalTransactionId,
      reason,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private emptyResult(
    source: string, description: string,
    category: MainCategorySlug | null | undefined, idempotencyKey: string,
  ): RewardResult {
    return {
      success: true,
      transactionId: null,
      amount: 0,
      newBalance: 0,
      source, description,
      category: category || null,
      idempotencyKey,
    };
  }

  private async recordMerchantLiability(
    merchantId: string, amount: number, coinType: string,
    operationType: LedgerOperationType, referenceId: string,
    referenceModel: string, rewardType: string,
  ): Promise<void> {
    await ledgerService.recordEntry({
      debitAccount: { type: 'merchant_wallet', id: new Types.ObjectId(merchantId) },
      creditAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
      amount,
      coinType: mapCoinTypeToLedger(coinType),
      operationType,
      referenceId,
      referenceModel,
      metadata: { description: `Merchant liability for ${rewardType}` },
    });

    // Also track in MerchantLiability aggregate (fire-and-forget)
    import('../services/liabilityService').then(({ liabilityService }) => {
      const campaignType = rewardType === 'creator_pick_reward' ? 'creator_reward' as const
        : rewardType === 'bonus_campaign' ? 'bonus_campaign' as const
        : 'branded_coin_award' as const;
      liabilityService.recordIssuance({
        merchantId,
        storeId: merchantId, // Merchant is the store owner
        campaignType,
        amount,
        referenceId,
        referenceModel,
      }).catch((err) => logger.error('[RewardEngine] Merchant liability recording failed', { error: err.message, merchantId }));
    });
  }

  private async updateUserLoyaltyCategory(
    userId: string, category: MainCategorySlug, amount: number,
  ): Promise<void> {
    try {
      const loyalty = await UserLoyalty.findOne({ userId });
      if (loyalty) {
        const catCoins = loyalty.categoryCoins?.get(category) || { available: 0, expiring: 0 };
        catCoins.available += amount;
        if (!loyalty.categoryCoins) {
          (loyalty as any).categoryCoins = new Map();
        }
        loyalty.categoryCoins!.set(category, catCoins);
        loyalty.markModified('categoryCoins');
        await loyalty.save();
      }
    } catch (err) {
      logger.error('Failed to update UserLoyalty categoryCoins', err as Error, { userId, category });
    }
  }

  private async reverseMultiplierBonus(
    original: any, originalTransactionId: string,
    reason: string, session?: ClientSession,
  ): Promise<void> {
    const bonusTx = await CoinTransaction.findOne({
      user: original.user,
      source: 'program_multiplier_bonus',
      'metadata.originalTransactionId': original._id,
    }).lean();

    if (bonusTx && (bonusTx as any).amount > 0) {
      await walletService.debit({
        userId: original.user.toString(),
        amount: (bonusTx as any).amount,
        source: 'program_multiplier_bonus',
        description: `Multiplier bonus reversed: ${reason}`,
        operationType: 'cashback_reversal',
        referenceId: `reversal-bonus:${originalTransactionId}`,
        referenceModel: 'CoinTransaction',
        metadata: {
          reversedTransactionId: (bonusTx as any)._id,
          reversalReason: reason,
          idempotencyKey: `reversal-bonus:${originalTransactionId}`,
        },
        category: original.category || null,
        session,
      });
    }
  }
}

export const rewardEngine = new RewardEngine();
export default rewardEngine;
