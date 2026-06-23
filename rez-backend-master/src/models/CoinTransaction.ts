import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

export type MainCategorySlug = 'food-dining' | 'beauty-wellness' | 'grocery-essentials' | 'fitness-sports' | 'healthcare' | 'fashion' | 'education-learning' | 'home-services' | 'travel-experiences' | 'entertainment' | 'financial-lifestyle' | 'electronics';

export interface ICoinTransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
  amount: number;
  balance: number; // Balance after transaction
  source: 'spin_wheel' | 'scratch_card' | 'quiz_game' | 'challenge' | 'achievement' | 'referral' | 'order' | 'review' | 'bill_upload' | 'daily_login' | 'admin' | 'purchase' | 'redemption' | 'expiry' | 'survey' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'purchase_reward' | 'social_share_reward' | 'merchant_award' | 'cashback' | 'creator_pick_reward' | 'poll_vote' | 'photo_upload' | 'offer_comment' | 'event_rating' | 'ugc_reel' | 'social_impact_reward' | 'program_task_reward' | 'program_multiplier_bonus' | 'event_booking' | 'event_checkin' | 'event_participation' | 'event_sharing' | 'event_entry' | 'bonus_campaign' | 'tournament_prize' | 'tournament_entry' | 'tournament_refund' | 'challenge_reward' | 'learning_reward' | 'leaderboard_prize' | 'smart_spend_reward' | 'prive_invite_reward';
  description: string;
  category?: MainCategorySlug | null; // MainCategory this transaction belongs to
  metadata?: {
    gameId?: mongoose.Types.ObjectId;
    achievementId?: mongoose.Types.ObjectId;
    challengeId?: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    referralId?: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    voucherId?: mongoose.Types.ObjectId;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface ICoinTransactionModel extends Model<ICoinTransaction> {
  getUserBalance(userId: string, category?: MainCategorySlug | null): Promise<number>;
  getUserCategoryBalance(userId: string, category: MainCategorySlug): Promise<number>;
  createTransaction(
    userId: string,
    type: string,
    amount: number,
    source: string,
    description: string,
    metadata?: any,
    category?: MainCategorySlug | null,
    session?: any
  ): Promise<ICoinTransaction>;
  expireOldCoins(userId: string, daysToExpire?: number): Promise<number>;
}

const CoinTransactionSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['earned', 'spent', 'expired', 'refunded', 'bonus', 'branded_award'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    balance: {
      type: Number,
      required: true,
      min: 0
    },
    source: {
      type: String,
      enum: [
        'spin_wheel',
        'scratch_card',
        'quiz_game',
        'challenge',
        'achievement',
        'referral',
        'order',
        'review',
        'bill_upload',
        'daily_login',
        'admin',
        'purchase',
        'redemption',
        'expiry',
        'survey',
        'memory_match',
        'coin_hunt',
        'guess_price',
        'purchase_reward',      // 5% auto coin after purchase
        'social_share_reward',  // 5% coin on social sharing
        'merchant_award',       // merchant gives coins to customer
        'cashback',             // cashback from orders or affiliate purchases
        'creator_pick_reward',  // merchant rewards creator for pick approval
        'poll_vote',            // voting in polls
        'photo_upload',         // uploading store/product photos
        'offer_comment',        // commenting on offers
        'event_rating',         // rating events after attendance
        'ugc_reel',             // creating UGC reel content
        'social_impact_reward', // earned from social impact event participation
        'program_task_reward',      // coins from special program task completion
        'program_multiplier_bonus', // bonus coins from program multiplier
        'event_booking',        // coins earned on successful event booking
        'event_checkin',        // coins earned for verified event check-in
        'event_participation',  // coins earned for completing event activities
        'event_sharing',        // coins earned for sharing an event
        'event_entry',          // coins earned on event entry/registration
        'event_review',         // coins earned for reviewing an event (distinct from rating)
        'bonus_campaign',       // coins from bonus zone campaign rewards
        'tournament_prize',     // coins awarded as tournament prize winnings
        'tournament_entry',     // coins spent on tournament entry fee
        'tournament_refund',    // coins refunded from tournament entry fee
        'challenge_reward',     // coins from completing challenges
        'learning_reward',      // coins from completing learning content
        'leaderboard_prize',    // coins awarded as leaderboard prize at cycle end
        'smart_spend_reward',   // enhanced coin reward from Smart Spend purchases
        'prive_invite_reward',  // coins earned from Privé invite system (inviter & invitee)
        'prive_campaign',       // coins earned from Privé social cashback campaigns
        'recharge',             // wallet recharge via payment gateway
        'transfer',             // P2P coin transfer between users
        'withdrawal'            // wallet withdrawal to bank/UPI/PayPal
      ],
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    category: {
      type: String,
      enum: ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics', null],
      default: null,
      index: true
    },
    expiresAt: Date
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
CoinTransactionSchema.index({ user: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
CoinTransactionSchema.index({ user: 1, source: 1, createdAt: -1 });
CoinTransactionSchema.index({ expiresAt: 1 });
CoinTransactionSchema.index({ user: 1, category: 1, createdAt: -1 });

// Partner earnings aggregation index: enables fast per-user partner earnings breakdown
CoinTransactionSchema.index(
  { user: 1, 'metadata.partnerEarning': 1, 'metadata.partnerEarningType': 1, createdAt: -1 },
  {
    partialFilterExpression: { 'metadata.partnerEarning': true },
    name: 'partner_earnings_idx'
  }
);

// Idempotency index: prevents duplicate achievement rewards for the same user+achievement
CoinTransactionSchema.index(
  { user: 1, source: 1, 'metadata.achievementId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      source: 'achievement',
      'metadata.achievementId': { $exists: true, $ne: null }
    },
    name: 'achievement_idempotency_idx'
  }
);

// General idempotency index: prevents duplicate rewards using idempotencyKey
CoinTransactionSchema.index(
  { user: 1, 'metadata.idempotencyKey': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      'metadata.idempotencyKey': { $exists: true, $ne: null }
    },
    name: 'general_idempotency_idx'
  }
);

// Purchase reward idempotency: prevents duplicate purchase rewards per user+orderId
CoinTransactionSchema.index(
  { user: 1, source: 1, 'metadata.orderId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      source: { $in: ['purchase_reward', 'smart_spend_reward'] },
      'metadata.orderId': { $exists: true, $ne: null }
    },
    name: 'purchase_reward_idempotency_idx'
  }
);

// Campaign reporting: find all transactions for a specific Privé campaign
CoinTransactionSchema.index({ 'metadata.campaignId': 1 });

// Privé invite reward idempotency: prevents duplicate invite rewards per user+code+role
CoinTransactionSchema.index(
  { user: 1, source: 1, 'metadata.priveInviteCodeId': 1, 'metadata.priveInviteRole': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      source: 'prive_invite_reward',
      'metadata.priveInviteCodeId': { $exists: true, $ne: null }
    },
    name: 'prive_invite_reward_idempotency_idx'
  }
);

// Virtual for display amount (positive/negative)
CoinTransactionSchema.virtual('displayAmount').get(function(this: ICoinTransaction) {
  if (this.type === 'spent' || this.type === 'expired') {
    return -this.amount;
  }
  return this.amount;
});

// Static method to get user's coin balance (optionally filtered by category)
CoinTransactionSchema.statics.getUserBalance = async function(userId: string, category?: string | null) {
  const filter: any = { user: userId };
  if (category) {
    filter.category = category;
  }

  const latestTransaction = await this.findOne(filter)
    .sort({ createdAt: -1 })
    .select('balance');

  return latestTransaction?.balance || 0;
};

// Static method to get user's category-specific coin balance
CoinTransactionSchema.statics.getUserCategoryBalance = async function(userId: string, category: string) {
  // Sum all earned/bonus/refunded minus spent/expired for this category
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), category } },
    {
      $group: {
        _id: null,
        earned: {
          $sum: {
            $cond: [{ $in: ['$type', ['earned', 'refunded', 'bonus']] }, '$amount', 0]
          }
        },
        spent: {
          $sum: {
            $cond: [{ $in: ['$type', ['spent', 'expired']] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  if (!result.length) return 0;
  return Math.max(0, result[0].earned - result[0].spent);
};

// Static method to create transaction and update balance
// Uses Redis distributed lock to prevent race conditions on balance read-then-write
CoinTransactionSchema.statics.createTransaction = async function(
  userId: string,
  type: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: string | null,
  session?: any
) {
  const lockKey = `coin-tx:${userId}`;
  let lockToken: string | null = null;

  // Require explicit idempotencyKey for high-value sources to ensure true deduplication on retries
  const HIGH_VALUE_SOURCES = ['spin_wheel', 'scratch_card', 'quiz_game', 'memory_match', 'achievement', 'admin', 'bonus_campaign'];
  if (!metadata?.idempotencyKey) {
    if (HIGH_VALUE_SOURCES.includes(source)) {
      throw new Error(`idempotencyKey is required for source: ${source}. Generate a deterministic key from the event context.`);
    }
    // For low-risk auto-tracked sources, generate a deterministic key so retries
    // produce the same key and are deduplicated by the unique index.
    const referenceId = metadata?.referenceId || metadata?.orderId || metadata?.transactionId || '';
    const deterministicSeed = `${source}:${userId}:${referenceId}`;
    metadata = {
      ...metadata,
      idempotencyKey: crypto.createHash('sha256').update(deterministicSeed).digest('hex'),
    };
  }

  try {
    // Skip Redis lock when inside a MongoDB transaction (session provides atomicity)
    if (!session) {
      // Acquire per-user lock (5s TTL) to prevent concurrent balance modifications
      lockToken = await redisService.acquireLock(lockKey, 5);
      if (!lockToken) {
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        lockToken = await redisService.acquireLock(lockKey, 5);
        if (!lockToken) {
          throw new Error('Transaction temporarily unavailable. Please try again.');
        }
      }
    }

    // Get current balance (global, not category-specific for the balance field)
    const currentBalance = await (this as unknown as ICoinTransactionModel).getUserBalance(userId);

    // Calculate new balance
    let newBalance = currentBalance;
    if (type === 'earned' || type === 'refunded' || type === 'bonus') {
      newBalance += amount;
    } else if (type === 'spent' || type === 'expired') {
      if (currentBalance < amount) {
        throw new Error('Insufficient coin balance');
      }
      newBalance -= amount;
    }

    // Create transaction — use array form with options when session is provided
    // Extract expiresAt from metadata if provided (set by coinService for promo/branded coins)
    const expiresAt = metadata?.expiresAt;
    if (metadata && expiresAt) {
      delete (metadata as any).expiresAt; // Don't store duplicate in metadata
    }

    const txData: any = {
      user: userId,
      type,
      amount,
      balance: newBalance,
      source,
      description,
      metadata,
      category: category || null,
    };
    if (expiresAt) {
      txData.expiresAt = expiresAt;
    }
    const transaction = session
      ? (await this.create([txData], { session }))[0]
      : await this.create(txData);

    // Invalidate consolidated earnings cache for this user
    try {
      await redisService.delPattern(`earnings:consolidated:${userId}:*`);
    } catch (e) {
      // Cache invalidation is best-effort; don't fail the transaction
    }

    return transaction;
  } finally {
    // Always release lock (only if we acquired one)
    if (lockToken) {
      try {
        await redisService.releaseLock(lockKey, lockToken);
      } catch (e) {
        // Lock will auto-expire after TTL
      }
    }
  }
};

// Static method to expire old coins (FIFO) — category-aware
CoinTransactionSchema.statics.expireOldCoins = async function(userId: string, daysToExpire: number = 365) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - daysToExpire);

  const expiredTransactions = await this.find({
    user: userId,
    type: 'earned',
    createdAt: { $lt: expiryDate },
    expiresAt: null
  });

  let totalExpired = 0;
  const categoryExpired: Record<string, number> = {};

  for (const transaction of expiredTransactions) {
    // Mark as expired
    transaction.expiresAt = new Date();
    await transaction.save();

    // Create expiry transaction (preserve category from original)
    await (this as unknown as ICoinTransactionModel).createTransaction(
      userId,
      'expired',
      transaction.amount,
      'expiry',
      `Coins expired from ${transaction.source}`,
      { originalTransactionId: transaction._id },
      transaction.category || null
    );

    totalExpired += transaction.amount;

    // Track per-category expired amounts
    if (transaction.category) {
      categoryExpired[transaction.category] = (categoryExpired[transaction.category] || 0) + transaction.amount;
    }
  }

  // Update Wallet category balances for expired category coins
  if (Object.keys(categoryExpired).length > 0) {
    try {
      const Wallet = mongoose.model('Wallet');
      const wallet = await Wallet.findOne({ user: userId });
      if (wallet) {
        for (const [cat, amount] of Object.entries(categoryExpired)) {
          try {
            await (wallet as any).deductCategoryCoins(cat, amount);
          } catch {
            // Category balance might already be 0
          }
        }
        // No .save() needed — deductCategoryCoins is now atomic
      }
    } catch (err) {
      logger.error('[CoinTransaction] Failed to update wallet category balances on expiry:', err);
    }
  }

  return totalExpired;
};

export const CoinTransaction = mongoose.model<ICoinTransaction, ICoinTransactionModel>('CoinTransaction', CoinTransactionSchema);
