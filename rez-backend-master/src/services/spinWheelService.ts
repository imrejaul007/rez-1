import { logger } from '../config/logger';
import { MiniGame } from '../models/MiniGame';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

interface SpinResult {
  prize: string;
  type: 'coins' | 'cashback' | 'discount' | 'voucher';
  value: number;
}

interface SpinReward {
  segment: number;
  prize: string;
  type: 'coins' | 'cashback' | 'discount' | 'voucher';
  value: number;
  weight: number;
  color: string;
}

const SPIN_WHEEL_PRIZES: SpinReward[] = [
  { segment: 1, prize: '50 Coins', type: 'coins', value: 50, weight: 20, color: '#10B981' },
  { segment: 2, prize: '100 Coins', type: 'coins', value: 100, weight: 15, color: '#3B82F6' },
  { segment: 3, prize: '5% Cashback', type: 'cashback', value: 5, weight: 15, color: '#F59E0B' },
  { segment: 4, prize: '200 Coins', type: 'coins', value: 200, weight: 10, color: '#10B981' },
  { segment: 5, prize: '10% Discount', type: 'discount', value: 10, weight: 15, color: '#EC4899' },
  { segment: 6, prize: '500 Coins', type: 'coins', value: 500, weight: 5, color: '#8B5CF6' },
  { segment: 7, prize: '₹50 Voucher', type: 'voucher', value: 50, weight: 10, color: '#F59E0B' },
  { segment: 8, prize: '1000 Coins', type: 'coins', value: 1000, weight: 2, color: '#EF4444' }
];

const MAX_DAILY_SPINS = 3;

/**
 * Get spin wheel prize segments (for display only, no session creation)
 */
export function getSpinWheelSegments() {
  return SPIN_WHEEL_PRIZES.map(p => ({
    segment: p.segment,
    prize: p.prize,
    color: p.color,
    type: p.type,
    value: p.value,
    weight: p.weight,
  }));
}

/**
 * Check if user is eligible to spin the wheel
 * Uses daily limit (3 spins per day, resets at midnight UTC)
 */
export async function checkEligibility(userId: string): Promise<{
  canSpin: boolean;
  spinsRemaining: number;
  spinsUsedToday: number;
  maxDailySpins: number;
  totalCoinsEarned: number;
  nextResetAt: string;
  lastSpinAt: string | null;
}> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Count spins completed today (since midnight UTC)
  const spinsToday = await MiniGame.countDocuments({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed',
    completedAt: { $gte: today }
  });

  // Calculate today's coin winnings
  const todaySessions = await MiniGame.find({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed',
    completedAt: { $gte: today }
  }).select('reward').lean();

  let totalCoinsEarned = 0;
  todaySessions.forEach(s => {
    if (s.reward?.coins) totalCoinsEarned += s.reward.coins;
  });

  // Get last spin timestamp
  const lastSpin = await MiniGame.findOne({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed'
  }).sort({ completedAt: -1 }).select('completedAt').lean();

  // Next reset at midnight UTC
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const spinsRemaining = Math.max(0, MAX_DAILY_SPINS - spinsToday);

  return {
    canSpin: spinsRemaining > 0,
    spinsRemaining,
    spinsUsedToday: spinsToday,
    maxDailySpins: MAX_DAILY_SPINS,
    totalCoinsEarned,
    nextResetAt: tomorrow.toISOString(),
    lastSpinAt: lastSpin?.completedAt?.toISOString() || null,
  };
}

/**
 * Create a new spin wheel session
 *
 * ✅ FIX: Removed cooldown check - daily limit is now checked in spinWheel endpoint
 * This function just creates a session record. Eligibility is checked by the caller.
 */
export async function createSpinSession(userId: string): Promise<any> {
  // ✅ REMOVED: Cooldown eligibility check (lines 70-73)
  // The spinWheel endpoint now checks daily limit (3 spins per day) before calling this
  // This prevents the conflict between 24h cooldown and daily reset at midnight

  // Expire old active sessions
  await MiniGame.updateMany(
    {
      user: userId,
      gameType: 'spin_wheel',
      status: 'active'
    },
    {
      status: 'expired'
    }
  );

  // Create new session (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const session = await MiniGame.create({
    user: userId,
    gameType: 'spin_wheel',
    status: 'active',
    expiresAt,
    metadata: {
      created: new Date()
    }
  });

  return {
    sessionId: session._id,
    expiresAt,
    prizes: SPIN_WHEEL_PRIZES.map(p => ({
      segment: p.segment,
      prize: p.prize,
      color: p.color
    }))
  };
}

/**
 * Select a prize based on weighted probability
 */
export async function selectPrize(): Promise<SpinResult> {
  const totalWeight = SPIN_WHEEL_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let random = Math.random() * totalWeight;

  for (const prize of SPIN_WHEEL_PRIZES) {
    random -= prize.weight;
    if (random <= 0) {
      return {
        prize: prize.prize,
        type: prize.type,
        value: prize.value
      };
    }
  }

  // Fallback to first prize
  return {
    prize: SPIN_WHEEL_PRIZES[0].prize,
    type: SPIN_WHEEL_PRIZES[0].type,
    value: SPIN_WHEEL_PRIZES[0].value
  };
}

/**
 * Spin the wheel and award prize
 */
export async function spin(sessionId: string): Promise<any> {
  const session = await MiniGame.findById(sessionId);

  if (!session) {
    throw new Error('Spin session not found');
  }

  if (session.status === 'completed') {
    throw new Error('Spin already completed');
  }

  if (session.status === 'expired') {
    throw new Error('Spin session has expired');
  }

  // Check if session expired
  if (new Date() > session.expiresAt) {
    session.status = 'expired';
    await session.save();
    throw new Error('Spin session has expired');
  }

  // Select prize
  const result = await selectPrize();

  // Find segment number
  const prizeConfig = SPIN_WHEEL_PRIZES.find(p => p.prize === result.prize);

  // Award prize and get coupon metadata (if applicable)
  const couponMetadata = await awardSpinPrize(session.user.toString(), result);

  // Update session
  session.status = 'completed';
  session.completedAt = new Date();
  session.reward = {
    [result.type]: result.value
  };
  session.metadata = {
    ...session.metadata,
    segment: prizeConfig?.segment || 1,
    prize: result.prize,
    // ✅ NEW: Store coupon metadata in session for history
    couponMetadata: couponMetadata || null
  };

  await session.save();

  return {
    sessionId: session._id,
    prize: result.prize,
    segment: prizeConfig?.segment || 1,
    type: result.type,
    value: result.value,
    reward: session.reward,
    // ✅ NEW: Include coupon metadata for frontend display
    couponMetadata: couponMetadata || null
  };
}

/**
 * Award the spin prize to user
 * Returns coupon metadata for frontend display (or null for coins)
 */
export async function awardSpinPrize(userId: string, prize: SpinResult): Promise<any | null> {
  if (prize.type === 'coins') {
    // Credit via rewardEngine (unified: CoinTransaction + Wallet + LedgerEntry + audit)
    const { rewardEngine } = await import('../core/rewardEngine');
    await rewardEngine.issue({
      userId,
      amount: prize.value,
      rewardType: 'spin_wheel',
      source: 'spin_wheel',
      description: `Won ${prize.value} coins from Spin Wheel`,
      operationType: 'game_prize',
      referenceId: `spin:${userId}:${Date.now()}`,
      referenceModel: 'SpinSession',
      metadata: {
        prizeType: prize.type,
        prizeValue: prize.value,
      },
    });

    logger.info(`[SPIN_WHEEL] Awarded ${prize.value} coins via rewardEngine`, { userId });
    return null;
  } else if (prize.type === 'cashback') {
    // ✅ NEW: Award cashback with smart store assignment (always store-wide for better UX)
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
    const validFrom = new Date();

    // Get random store (always store-wide for cashback)
    const applicability = await getCouponApplicability(true); // Force store-wide

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'cashback',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'cashback',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create cashback coupon with store assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_CB_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'PERCENTAGE',
      discountValue: prize.value,
      minOrderValue: 100, // Minimum ₹100 order
      maxDiscountCap: prize.value === 5 ? 50 : prize.value === 10 ? 100 : 200,
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: [
        `Valid for 30 days from date of winning`,
        applicabilityText,
        'Minimum order value of ₹100',
        'Cashback will be credited to wallet after delivery',
        'Cannot be combined with other offers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'cashback', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: false, // Cashback is always store-wide
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: null,
        productId: null,
        productImage: null
      }
    });

    // Assign coupon to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    logger.info(`✅ [SPIN_WHEEL] Awarded ${prize.value}% cashback coupon to user ${userId}`);
    logger.info(`   📍 ${applicabilityText}`);
    logger.info(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  } else if (prize.type === 'discount') {
    // ✅ NEW: Award discount with smart store/product assignment
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
    const validFrom = new Date();

    // Get random store/product assignment
    const applicability = await getCouponApplicability(false); // Allow product-specific

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'discount',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'discount',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create discount coupon with proper assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_${prize.value}OFF_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'PERCENTAGE',
      discountValue: prize.value,
      minOrderValue: applicability.isProductSpecific ? 0 : 200, // No minimum for product-specific
      maxDiscountCap: prize.value === 10 ? 100 : prize.value === 15 ? 150 : 250,
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: applicability.isProductSpecific && applicability.productId ? [applicability.productId] : [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 0,
      status: 'active',
      termsAndConditions: [
        `Valid for 30 days from date of winning`,
        applicabilityText,
        applicability.isProductSpecific ? 'Valid only on the specified product' : `Minimum order value of ₹200`,
        'Cannot be combined with other offers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'discount', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: false,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: applicability.isProductSpecific,
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: applicability.productName || null,
        productId: applicability.productId || null,
        productImage: applicability.productImage || null
      }
    });

    // Assign coupon to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    logger.info(`✅ [SPIN_WHEEL] Awarded ${prize.value}% discount coupon to user ${userId}`);
    logger.info(`   📍 ${applicabilityText}`);
    logger.info(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  } else if (prize.type === 'voucher') {
    // ✅ NEW: Award voucher with smart store assignment (always store-wide)
    const { Coupon } = await import('../models/Coupon');
    const { UserCoupon } = await import('../models/UserCoupon');
    const {
      getCouponApplicability,
      generateCouponTitle,
      generateCouponDescription,
      generateApplicabilityText
    } = await import('./spinWheelCouponAssignment');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 60); // 60 days validity for vouchers
    const validFrom = new Date();

    // Get random store (always store-wide for vouchers)
    const applicability = await getCouponApplicability(true); // Force store-wide

    // Generate coupon details
    const title = generateCouponTitle({
      type: 'voucher',
      value: prize.value,
      applicability
    });

    const description = generateCouponDescription({
      type: 'voucher',
      value: prize.value,
      applicability
    });

    const applicabilityText = generateApplicabilityText(applicability);

    // Create voucher with store assignment
    const coupon = await Coupon.create({
      couponCode: `SPIN_VCH${prize.value}_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`,
      title,
      description,
      discountType: 'FIXED',
      discountValue: prize.value,
      minOrderValue: prize.value * 2, // Minimum 2x voucher value
      maxDiscountCap: prize.value, // Fixed amount
      validFrom,
      validTo: expiryDate,
      usageLimit: {
        totalUsage: 1,
        perUser: 1,
        usedCount: 0
      },
      applicableTo: {
        categories: [],
        products: [],
        stores: applicability.storeId !== 'generic' ? [applicability.storeId] : [],
        userTiers: ['all']
      },
      autoApply: false,
      autoApplyPriority: 10, // Higher priority for vouchers
      status: 'active',
      termsAndConditions: [
        `Valid for 60 days from date of winning`,
        applicabilityText,
        `Minimum order value of ₹${prize.value * 2}`,
        'Cannot be combined with other vouchers',
        'Single use only'
      ],
      createdBy: userId,
      tags: ['spin-wheel', 'voucher', 'game-reward'],
      isNewlyAdded: true,
      isFeatured: true,
      viewCount: 0,
      claimCount: 1,
      usageCount: 0,
      // ✅ NEW: Store metadata for UI display
      metadata: {
        source: 'spin_wheel',
        isProductSpecific: false, // Vouchers are always store-wide
        storeName: applicability.storeName,
        storeId: applicability.storeId,
        productName: null,
        productId: null,
        productImage: null
      }
    });

    // Assign voucher to user
    await UserCoupon.create({
      user: userId,
      coupon: coupon._id,
      claimedDate: new Date(),
      expiryDate,
      usedDate: null,
      usedInOrder: null,
      status: 'available',
      notifications: {
        expiryReminder: true,
        expiryReminderSent: null
      }
    });

    logger.info(`✅ [SPIN_WHEEL] Awarded ₹${prize.value} voucher to user ${userId}`);
    logger.info(`   📍 ${applicabilityText}`);
    logger.info(`   🎫 Code: ${coupon.couponCode}`);

    // Return coupon metadata for frontend display
    return coupon.metadata;
  }

  // Fallback - should never reach here
  return null;
}

/**
 * Get user's spin wheel history
 */
export async function getSpinHistory(userId: string, limit: number = 10, page: number = 1): Promise<{ history: any[]; total: number; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    MiniGame.find({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed'
    })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MiniGame.countDocuments({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed'
    })
  ]);

  const history = sessions.map((s: any) => ({
    id: s._id,
    completedAt: s.completedAt,
    prize: s.metadata?.prize,
    segment: s.metadata?.segment,
    type: s.metadata?.couponMetadata ? (s.reward?.cashback ? 'cashback' : s.reward?.discount ? 'discount' : s.reward?.voucher ? 'voucher' : 'coins') : 'coins',
    reward: s.reward,
    couponMetadata: s.metadata?.couponMetadata || null,
  }));

  return {
    history,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  };
}

/**
 * Get spin wheel statistics for user
 */
export async function getSpinStats(userId: string): Promise<any> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [allSessions, todaySessions] = await Promise.all([
    MiniGame.find({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed'
    }).select('reward').lean(),
    MiniGame.find({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed',
      completedAt: { $gte: today }
    }).select('reward').lean(),
  ]);

  let totalCoinsWon = 0;
  let totalCashbackWon = 0;
  let totalDiscountsWon = 0;
  let totalVouchersWon = 0;

  allSessions.forEach((session: any) => {
    if (session.reward?.coins) totalCoinsWon += session.reward.coins;
    if (session.reward?.cashback) totalCashbackWon += session.reward.cashback;
    if (session.reward?.discount) totalDiscountsWon += session.reward.discount;
    if (session.reward?.voucher) totalVouchersWon += 1;
  });

  let todayCoinsWon = 0;
  todaySessions.forEach((session: any) => {
    if (session.reward?.coins) todayCoinsWon += session.reward.coins;
  });

  return {
    totalSpins: allSessions.length,
    todaySpins: todaySessions.length,
    totalCoinsWon,
    todayCoinsWon,
    totalCashbackWon,
    totalDiscountsWon,
    totalVouchersWon,
  };
}

export default {
  checkEligibility,
  createSpinSession,
  getSpinWheelSegments,
  selectPrize,
  spin,
  awardSpinPrize,
  getSpinHistory,
  getSpinStats
};
