import { CoinTransaction, MainCategorySlug } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { UserLoyalty } from '../models/UserLoyalty';
import mongoose from 'mongoose';
import specialProgramService from './specialProgramService';
import { walletService } from './walletService';
import { createServiceLogger } from '../config/logger';
import { getCachedWalletConfig } from './walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';
import { rewardEngine, RewardType } from '../core/rewardEngine';

const logger = createServiceLogger('coin-service');

/**
 * Calculate expiresAt date for a given coin type based on WalletConfig or fallback defaults.
 * Returns undefined if the coin type has no expiry (expiryDays = 0).
 */
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

/**
 * Get user's current coin balance (global or category-specific)
 */
export async function getCoinBalance(userId: string, category?: MainCategorySlug): Promise<number> {
  if (category) {
    return getCategoryBalance(userId, category);
  }
  return await CoinTransaction.getUserBalance(userId);
}

/**
 * Get user's category-specific coin balance
 */
export async function getCategoryBalance(userId: string, category: MainCategorySlug): Promise<number> {
  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet) return 0;
  // .lean() returns plain object — use bracket notation, not instance method
  const catBal = (wallet as any).categoryBalances?.[category];
  return catBal?.available || 0;
}

/**
 * Get all category balances for a user
 */
export async function getAllCategoryBalances(userId: string): Promise<Record<string, { available: number; earned: number; spent: number }>> {
  const wallet = await Wallet.findOne({ user: userId }).lean();
  const result: Record<string, { available: number; earned: number; spent: number }> = {};
  const categories: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

  for (const cat of categories) {
    const catBal = (wallet?.categoryBalances as any)?.[cat];
    result[cat] = {
      available: catBal?.available || 0,
      earned: catBal?.earned || 0,
      spent: catBal?.spent || 0
    };
  }

  return result;
}

/**
 * Get user's coin transaction history
 */
export async function getCoinTransactions(
  userId: string,
  options: {
    type?: string;
    source?: string;
    category?: MainCategorySlug | null;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: any[]; total: number; balance: number }> {
  const { type, source, category, limit = 20, offset = 0 } = options;

  const query: any = { user: userId };

  if (category) {
    query.category = category;
  }

  if (type) {
    query.type = type;
  }

  if (source) {
    query.source = source;
  }

  const [transactions, total, balance] = await Promise.all([
    CoinTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(query),
    getCoinBalance(userId)
  ]);

  return {
    transactions: transactions.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      source: t.source,
      description: t.description,
      metadata: t.metadata,
      createdAt: t.createdAt,
      displayAmount: t.type === 'spent' || t.type === 'expired' ? -t.amount : t.amount
    })),
    total,
    balance
  };
}

/**
 * Award coins to user (optionally to a specific MainCategory balance).
 * Delegates to the central rewardEngine for unified eligibility, caps, multipliers,
 * wallet mutation, ledger, and event emission.
 */
export async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: MainCategorySlug | null,
  coinType?: 'rez' | 'prive' | 'promo' | 'branded'
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const result = await rewardEngine.issue({
    userId,
    amount,
    rewardType: mapSourceToRewardType(source),
    source,
    description,
    operationType: 'loyalty_credit',
    referenceId: metadata?.referenceId || `coin-award:${userId}:${Date.now()}`,
    referenceModel: metadata?.referenceModel || 'CoinTransaction',
    category,
    coinType: coinType || (metadata?.coinType as 'rez' | 'prive' | 'promo' | 'branded') || 'rez',
    metadata,
  });

  logger.info(`Wallet credited via rewardEngine: +${result.amount} coins${category ? ` (${category})` : ''}`, { userId, source });

  // Return backward-compatible shape
  return {
    transactionId: result.transactionId,
    amount: result.amount,
    newBalance: result.newBalance,
    source: result.source,
    description: result.description,
    category: category || null,
    ...(result.cappedReason && { cappedReason: result.cappedReason }),
    ...(result.multiplierBonus && { multiplierBonus: result.multiplierBonus }),
  };
}

/** Map CoinTransaction source strings to RewardType enum values */
function mapSourceToRewardType(source: string): RewardType {
  const map: Record<string, RewardType> = {
    spin_wheel: 'spin_wheel',
    scratch_card: 'scratch_card',
    quiz_game: 'quiz_game',
    memory_match: 'game_prize',
    coin_hunt: 'game_prize',
    guess_price: 'game_prize',
    achievement: 'achievement',
    referral: 'referral',
    survey: 'survey',
    review: 'engagement',
    bill_upload: 'engagement',
    daily_login: 'engagement',
    social_share_reward: 'engagement',
    poll_vote: 'engagement',
    photo_upload: 'engagement',
    offer_comment: 'engagement',
    ugc_reel: 'engagement',
    creator_pick_reward: 'creator_earning',
    bonus_campaign: 'bonus_campaign',
    leaderboard_prize: 'leaderboard_prize',
    tournament_prize: 'tournament_prize',
    learning_reward: 'learning_reward',
    social_impact_reward: 'social_impact',
    challenge_reward: 'challenge_reward',
    prive_invite_reward: 'prive_invite',
    event_booking: 'event_reward',
    event_checkin: 'event_reward',
    event_participation: 'event_reward',
    event_sharing: 'event_reward',
    event_entry: 'event_reward',
    merchant_award: 'pick_approval',
    admin: 'admin_adjustment',
    cashback: 'cashback',
    purchase_reward: 'cashback',
  };
  return map[source] || 'engagement';
}

/**
 * Deduct coins from user (optionally from a specific MainCategory balance)
 * If category is provided, deducts from category balance first, then falls back to global.
 */
export async function deductCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: MainCategorySlug | null
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (category) {
    // Check category-specific balance first
    const catBalance = await getCategoryBalance(userId, category);
    if (catBalance < amount) {
      // Fall back to global balance check
      const globalBalance = await getCoinBalance(userId);
      if (globalBalance < amount) {
        throw new Error(`Insufficient coin balance. Required: ${amount}, Category (${category}): ${catBalance}, Global: ${globalBalance}`);
      }
      // Use global balance instead
      category = null;
    }
  } else {
    const currentBalance = await getCoinBalance(userId);
    if (currentBalance < amount) {
      throw new Error(`Insufficient coin balance. Required: ${amount}, Available: ${currentBalance}`);
    }
  }

  // Use walletService for atomic CoinTransaction + Wallet $inc + LedgerEntry
  const result = await walletService.debit({
    userId,
    amount,
    source,
    description,
    operationType: 'payment',
    referenceId: metadata?.referenceId || `coin-deduct:${userId}:${Date.now()}`,
    referenceModel: metadata?.referenceModel || 'CoinTransaction',
    metadata,
    category,
  });
  logger.info(`Wallet debited: -${amount} coins${category ? ` (${category})` : ''}`, { userId, source });

  // Also update UserLoyalty categoryCoins if category is provided
  if (category) {
    try {
      const loyalty = await UserLoyalty.findOne({ userId });
      if (loyalty) {
        const catCoins = loyalty.categoryCoins?.get(category);
        if (catCoins) {
          catCoins.available = Math.max(0, catCoins.available - amount);
          loyalty.categoryCoins!.set(category, catCoins);
          loyalty.markModified('categoryCoins');
          await loyalty.save();
        }
      }
    } catch (loyaltyError) {
      logger.error('Failed to update UserLoyalty categoryCoins', loyaltyError, { userId, category });
    }
  }

  return {
    transactionId: result.transactionId,
    amount: result.amount,
    newBalance: result.newBalance,
    source: result.source,
    description: result.description,
    category: category || null
  };
}

/**
 * Transfer coins between users (e.g., for gifting)
 *
 * Uses MongoDB session + atomic $inc with $gte guard to prevent race conditions.
 * The balance check + debit + credit are all-or-nothing within a transaction.
 */
export async function transferCoins(
  fromUserId: string,
  toUserId: string,
  amount: number,
  description?: string
): Promise<{ fromTransaction: any; toTransaction: any }> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (fromUserId === toUserId) {
    throw new Error('Cannot transfer coins to yourself');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomic debit: $inc with $gte guard ensures balance can't go negative
    const debitResult = await Wallet.findOneAndUpdate(
      {
        user: new mongoose.Types.ObjectId(fromUserId),
        'balance.available': { $gte: amount },
        isFrozen: false,
      },
      {
        $inc: { 'balance.available': -amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    if (!debitResult) {
      await session.abortTransaction();
      throw new Error(`Insufficient coin balance or wallet is frozen`);
    }

    // Credit recipient
    const creditResult = await Wallet.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(toUserId) },
      {
        $inc: { 'balance.available': amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    if (!creditResult) {
      await session.abortTransaction();
      throw new Error('Recipient wallet not found');
    }

    // Create CoinTransaction records within the session
    const fromTransaction = await CoinTransaction.createTransaction(
      fromUserId,
      'spent',
      amount,
      'purchase',
      description || `Transferred ${amount} coins`,
      { recipientUserId: toUserId },
      null,
      session
    );

    const toTransaction = await CoinTransaction.createTransaction(
      toUserId,
      'earned',
      amount,
      'admin',
      description || `Received ${amount} coins`,
      { senderUserId: fromUserId },
      null,
      session
    );

    await session.commitTransaction();

    // Fire-and-forget: ledger entries for transfer (after commit, non-blocking)
    try {
      const { ledgerService } = await import('./ledgerService');
      const { Types } = await import('mongoose');
      await ledgerService.recordEntry({
        debitAccount: { type: 'user_wallet', id: new Types.ObjectId(fromUserId) },
        creditAccount: { type: 'user_wallet', id: new Types.ObjectId(toUserId) },
        amount,
        operationType: 'transfer',
        referenceId: `transfer:${fromTransaction._id}`,
        referenceModel: 'CoinTransaction',
        metadata: { description: description || `Transferred ${amount} coins` },
      });
    } catch (ledgerErr) {
      logger.error('Failed to record transfer ledger entry (non-blocking)', ledgerErr, { fromUserId, toUserId, amount });
    }

    return {
      fromTransaction: {
        id: fromTransaction._id,
        newBalance: fromTransaction.balance
      },
      toTransaction: {
        id: toTransaction._id,
        newBalance: toTransaction.balance
      }
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Get coin statistics for user
 */
export async function getCoinStats(userId: string): Promise<any> {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // Use aggregation pipeline instead of loading all transactions into memory
  const [totalsResult, sourceBreakdown, monthlyEarnings, txCount] = await Promise.all([
    // 1. Totals by type
    CoinTransaction.aggregate([
      { $match: { user: userObjId } },
      { $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      }},
    ]),
    // 2. Source breakdown (earned/bonus/refunded only)
    CoinTransaction.aggregate([
      { $match: { user: userObjId, type: { $in: ['earned', 'bonus', 'refunded'] } } },
      { $group: { _id: '$source', total: { $sum: '$amount' } } },
    ]),
    // 3. Monthly earnings (last 12 months)
    CoinTransaction.aggregate([
      { $match: {
        user: userObjId,
        type: { $in: ['earned', 'bonus'] },
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: '$amount' },
      }},
      { $sort: { _id: 1 } },
    ]),
    // 4. Transaction count
    CoinTransaction.countDocuments({ user: userObjId }),
  ]);

  const stats: any = {
    totalEarned: 0, totalSpent: 0, totalExpired: 0, totalRefunded: 0, totalBonus: 0,
    currentBalance: 0, transactionCount: txCount,
    sourceBreakdown: {} as Record<string, number>,
    monthlyEarnings: {} as Record<string, number>,
  };

  for (const row of totalsResult) {
    if (row._id === 'earned') stats.totalEarned = row.total;
    else if (row._id === 'spent') stats.totalSpent = row.total;
    else if (row._id === 'expired') stats.totalExpired = row.total;
    else if (row._id === 'refunded') stats.totalRefunded = row.total;
    else if (row._id === 'bonus') stats.totalBonus = row.total;
  }
  for (const row of sourceBreakdown) {
    stats.sourceBreakdown[row._id] = row.total;
  }
  for (const row of monthlyEarnings) {
    stats.monthlyEarnings[row._id] = row.total;
  }

  stats.currentBalance = await getCoinBalance(userId);
  return stats;
}

/**
 * Get leaderboard of top coin earners
 */
export async function getCoinLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
  limit: number = 10
): Promise<any[]> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const weekStart = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(0); // Beginning of time
  }

  const leaderboard = await CoinTransaction.aggregate([
    {
      $match: {
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalCoins: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        userName: '$user.name',
        userAvatar: '$user.avatar',
        totalCoins: 1,
        transactionCount: 1
      }
    }
  ]);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    userName: entry.userName,
    userAvatar: entry.userAvatar,
    totalCoins: entry.totalCoins,
    transactionCount: entry.transactionCount
  }));
}

/**
 * Expire old coins (FIFO basis)
 */
export async function expireOldCoins(userId: string, daysToExpire: number = 365): Promise<number> {
  return await CoinTransaction.expireOldCoins(userId, daysToExpire);
}

/**
 * Get user's rank in coin leaderboard
 */
export async function getUserCoinRank(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<any> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const weekStart = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(0);
  }

  const userStats = await CoinTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' }
      }
    }
  ]);

  const userTotalCoins = userStats[0]?.totalCoins || 0;

  const higherRankedCount = await CoinTransaction.aggregate([
    {
      $match: {
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' }
      }
    },
    {
      $match: {
        totalCoins: { $gt: userTotalCoins }
      }
    },
    {
      $count: 'count'
    }
  ]);

  const rank = (higherRankedCount[0]?.count || 0) + 1;

  return {
    userId,
    rank,
    totalCoins: userTotalCoins,
    period
  };
}

export default {
  getCoinBalance,
  getCategoryBalance,
  getAllCategoryBalances,
  getCoinTransactions,
  awardCoins,
  deductCoins,
  transferCoins,
  getCoinStats,
  getCoinLeaderboard,
  getUserCoinRank,
  expireOldCoins
};
