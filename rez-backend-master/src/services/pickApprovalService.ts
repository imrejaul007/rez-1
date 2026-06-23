import mongoose, { Types } from 'mongoose';
import CreatorPick, { ICreatorPick } from '../models/CreatorPick';
import { CreatorProfile } from '../models/CreatorProfile';
import { Wallet } from '../models/Wallet';
import { Merchant } from '../models/Merchant';
import { Store } from '../models/Store';
import { CoinTransaction } from '../models/CoinTransaction';
import * as coinService from './coinService';
import merchantWalletService from './merchantWalletService';
import earningsSocketService from './earningsSocketService';
import { getCachedWalletConfig } from './walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';

interface RewardOptions {
  type: 'rez_coins' | 'branded_coins' | 'none';
  amount: number;
}

/**
 * Approve a creator pick as a merchant.
 * Validates store ownership, updates pick status, and optionally rewards the creator.
 */
export async function merchantApprovePick(
  pickId: string,
  merchantId: string,
  storeId: string,
  rewardOptions?: RewardOptions
): Promise<ICreatorPick> {
  const pick = await CreatorPick.findById(pickId).lean();
  if (!pick) throw new Error('Pick not found');

  // Validate pick is pending merchant approval
  if (pick.status !== 'pending_merchant' || pick.merchantApproval?.status !== 'pending') {
    throw new Error('Pick is not pending merchant approval');
  }

  // Validate this merchant owns the store
  const store = await Store.findById(storeId).lean();
  if (!store) throw new Error('Store not found');
  if (store.merchantId?.toString() !== merchantId) {
    throw new Error('You do not own this store');
  }

  // Validate pick belongs to this store
  if (pick.merchantApproval?.merchantId?.toString() !== merchantId) {
    throw new Error('This pick is not assigned to your store');
  }

  // Get creator profile to find userId for rewards
  const creatorProfile = await CreatorProfile.findById(pick.creator).lean();
  if (!creatorProfile) throw new Error('Creator profile not found');
  const creatorUserId = creatorProfile.user.toString();

  // Process reward if requested
  let rewardData: any = undefined;
  if (rewardOptions && rewardOptions.type !== 'none' && rewardOptions.amount > 0) {
    const merchant = await Merchant.findById(merchantId).lean();
    const merchantName = (merchant as any)?.businessName || 'Merchant';

    // Debit merchant wallet
    await merchantWalletService.debitForCoinAward(
      merchantId,
      storeId,
      rewardOptions.amount,
      creatorUserId,
      `Creator pick reward for "${pick.title}"`
    );

    if (rewardOptions.type === 'rez_coins') {
      // Award ReZ coins to creator
      const transaction = await coinService.awardCoins(
        creatorUserId,
        rewardOptions.amount,
        'creator_pick_reward',
        `Reward from ${merchantName} for pick "${pick.title}"`,
        { pickId: pick._id, merchantId, storeId }
      );

      rewardData = {
        type: 'rez_coins',
        amount: rewardOptions.amount,
        coinTransactionId: transaction._id,
        awardedAt: new Date(),
      };
    } else if (rewardOptions.type === 'branded_coins') {
      // Award branded coins to creator
      const wallet = await Wallet.findOne({ user: creatorUserId });
      if (!wallet) throw new Error('Creator wallet not found');

      await wallet.addBrandedCoins(
        new Types.ObjectId(merchantId),
        merchantName,
        rewardOptions.amount
      );

      // Calculate expiry for branded coins
      let brandedExpiresAt: Date | undefined;
      try {
        const walletConfig = await getCachedWalletConfig();
        const expiryDays = walletConfig?.coinExpiryConfig?.branded?.expiryDays ?? CURRENCY_RULES.branded.expiryDays;
        if (expiryDays > 0) { brandedExpiresAt = new Date(); brandedExpiresAt.setDate(brandedExpiresAt.getDate() + expiryDays); }
      } catch { /* fallback handled by backfill job */ }

      // Create CoinTransaction for audit trail
      const transaction = await CoinTransaction.createTransaction(
        creatorUserId,
        'branded_award',
        rewardOptions.amount,
        'creator_pick_reward',
        `Branded coins from ${merchantName} for pick "${pick.title}"`,
        { pickId: pick._id, merchantId, storeId, ...(brandedExpiresAt && { expiresAt: brandedExpiresAt }) }
      );

      rewardData = {
        type: 'branded_coins',
        amount: rewardOptions.amount,
        coinTransactionId: transaction._id,
        awardedAt: new Date(),
      };
    }
  }

  // Track merchant liability for creator rewards (fire-and-forget)
  if (rewardData && rewardOptions && rewardOptions.amount > 0) {
    import('./liabilityService').then(({ liabilityService }) => {
      liabilityService.recordIssuance({
        merchantId,
        storeId,
        campaignType: 'creator_reward',
        amount: rewardOptions.amount,
        referenceId: `creator-pick-reward:${pick._id}`,
        referenceModel: 'CreatorPick',
      }).catch((err: any) => {
        const { logger: svcLogger } = require('../config/logger');
        svcLogger.error('Liability tracking failed for creator reward', err);
      });
    }).catch((err: any) => {
      const { logger: svcLogger } = require('../config/logger');
      svcLogger.error('Failed to load liabilityService module', err);
    });
  }

  // Update pick status
  pick.status = 'pending_review';
  pick.merchantApproval = {
    ...pick.merchantApproval!,
    status: 'approved',
    reviewedAt: new Date(),
    ...(rewardData ? { reward: rewardData } : {}),
  } as any;

  await pick.save();

  // Notify creator via socket
  earningsSocketService.emitPickMerchantApproval(creatorUserId, {
    pickTitle: pick.title,
    status: 'approved',
    reward: rewardData ? { type: rewardData.type, amount: rewardData.amount } : undefined,
  });

  return pick as unknown as ICreatorPick;
}

/**
 * Reject a creator pick as a merchant.
 */
export async function merchantRejectPick(
  pickId: string,
  merchantId: string,
  reason: string
): Promise<ICreatorPick> {
  const pick = await CreatorPick.findById(pickId).lean();
  if (!pick) throw new Error('Pick not found');

  if (pick.status !== 'pending_merchant' || pick.merchantApproval?.status !== 'pending') {
    throw new Error('Pick is not pending merchant approval');
  }

  if (pick.merchantApproval?.merchantId?.toString() !== merchantId) {
    throw new Error('This pick is not assigned to your store');
  }

  const creatorProfile = await CreatorProfile.findById(pick.creator).lean();
  const creatorUserId = creatorProfile?.user?.toString();

  pick.status = 'rejected';
  pick.merchantApproval = {
    ...pick.merchantApproval!,
    status: 'rejected',
    reviewedAt: new Date(),
    rejectionReason: reason || 'Rejected by merchant',
  } as any;

  await pick.save();

  // Notify creator via socket
  if (creatorUserId) {
    earningsSocketService.emitPickMerchantApproval(creatorUserId, {
      pickTitle: pick.title,
      status: 'rejected',
      reason,
    });
  }

  return pick as unknown as ICreatorPick;
}

/**
 * Get picks pending merchant approval for a specific store.
 */
export async function getMerchantPendingPicks(
  merchantId: string,
  storeId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ picks: any[]; total: number; page: number; totalPages: number }> {
  const query = {
    'merchantApproval.status': 'pending',
    'merchantApproval.merchantId': new Types.ObjectId(merchantId),
    'merchantApproval.storeId': new Types.ObjectId(storeId),
    status: 'pending_merchant',
  };

  const [picks, total] = await Promise.all([
    CreatorPick.find(query)
      .populate('creator', 'displayName avatar tier user')
      .populate('product', 'name pricing images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CreatorPick.countDocuments(query),
  ]);

  const mappedPicks = picks.map((pick: any) => ({
    id: pick._id,
    title: pick.title,
    description: pick.description,
    image: pick.image,
    videoUrl: pick.videoUrl || undefined,
    tags: pick.tags,
    productName: pick.product?.name || '',
    productPrice: pick.product?.pricing?.selling || pick.product?.pricing?.original || 0,
    productImage: pick.product?.images?.[0] || '',
    creatorName: pick.creator?.displayName || 'Unknown',
    creatorAvatar: pick.creator?.avatar,
    creatorTier: pick.creator?.tier,
    createdAt: pick.createdAt,
  }));

  return { picks: mappedPicks, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get merchant's pick approval history (approved + rejected).
 */
export async function getMerchantPickHistory(
  merchantId: string,
  storeId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ picks: any[]; total: number; page: number; totalPages: number }> {
  const query = {
    'merchantApproval.status': { $in: ['approved', 'rejected'] },
    'merchantApproval.merchantId': new Types.ObjectId(merchantId),
    'merchantApproval.storeId': new Types.ObjectId(storeId),
  };

  const [picks, total] = await Promise.all([
    CreatorPick.find(query)
      .populate('creator', 'displayName avatar tier')
      .populate('product', 'name pricing images')
      .sort({ 'merchantApproval.reviewedAt': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CreatorPick.countDocuments(query),
  ]);

  const mappedPicks = picks.map((pick: any) => ({
    id: pick._id,
    title: pick.title,
    productName: pick.product?.name || '',
    productPrice: pick.product?.pricing?.selling || pick.product?.pricing?.original || 0,
    creatorName: pick.creator?.displayName || 'Unknown',
    creatorAvatar: pick.creator?.avatar,
    merchantApprovalStatus: pick.merchantApproval?.status,
    rejectionReason: pick.merchantApproval?.rejectionReason,
    reviewedAt: pick.merchantApproval?.reviewedAt,
    reward: pick.merchantApproval?.reward
      ? { type: pick.merchantApproval.reward.type, amount: pick.merchantApproval.reward.amount }
      : null,
    status: pick.status,
    createdAt: pick.createdAt,
  }));

  return { picks: mappedPicks, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get count of pending picks for a merchant's store (for badge display).
 */
export async function getMerchantPendingPickCount(
  merchantId: string,
  storeId: string
): Promise<number> {
  return CreatorPick.countDocuments({
    'merchantApproval.status': 'pending',
    'merchantApproval.merchantId': new Types.ObjectId(merchantId),
    'merchantApproval.storeId': new Types.ObjectId(storeId),
    status: 'pending_merchant',
  });
}
