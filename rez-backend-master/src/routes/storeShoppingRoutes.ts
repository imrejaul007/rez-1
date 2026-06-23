// @ts-nocheck
/**
 * Store Shopping Routes — consumer-facing
 *
 * GET  /api/stores/:storeId/combos           — active combo deals for a store
 * GET  /api/stores/:storeId/loyalty-program  — tier definitions + user's current tier
 * GET  /api/user/store-gift-cards            — authenticated user's store-issued gift cards
 * GET  /api/user/store-gift-cards/:code      — single gift card detail + redemption history
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ComboProduct } from '../models/ComboProduct';
import { MerchantLoyaltyTier } from '../models/MerchantLoyaltyTier';
import { StoreGiftCard } from '../models/StoreGiftCard';
import { MerchantRewardJournal } from '../models/MerchantRewardJournal';
import { Store } from '../models/Store';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function determineTier(tiers: any[], cumulativeSpend: number) {
  // Tiers sorted ascending by minCumulativeSpend — find highest tier user qualifies for
  const sorted = [...tiers].sort((a, b) => a.minCumulativeSpend - b.minCumulativeSpend);
  let currentTier = sorted[0];
  for (const tier of sorted) {
    if (cumulativeSpend >= tier.minCumulativeSpend) {
      currentTier = tier;
    }
  }
  return currentTier;
}

// ─── Combo Deals ─────────────────────────────────────────────────────────────

/**
 * GET /api/stores/:storeId/combos
 * Returns active combo products for a store.
 * Optional auth — logged-in users may see personalised banners in future.
 */
router.get(
  '/stores/:storeId/combos',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;

      const now = new Date();
      const combos = await ComboProduct.find({
        storeId,
        isActive: true,
        $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: now } }],
        $and: [
          {
            $or: [{ validTo: { $exists: false } }, { validTo: { $gte: now } }],
          },
        ],
      })
        .sort({ savings: -1 }) // highest savings first
        .lean();

      return res.json({
        success: true,
        data: {
          combos: combos.map((c) => ({
            id: String(c._id),
            name: c.name,
            image: c.image || null,
            comboPrice: c.comboPrice,
            originalTotal: c.originalTotal,
            savings: c.savings,
            savingsPercentage: c.originalTotal > 0 ? Math.round((c.savings / c.originalTotal) * 100) : 0,
            items: c.items.map((item: any) => ({
              productId: String(item.productId),
              productName: item.productName,
              quantity: item.quantity,
              basePrice: item.basePrice,
            })),
            validFrom: c.validFrom?.toISOString() || null,
            validTo: c.validTo?.toISOString() || null,
          })),
          count: combos.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch combo deals' });
    }
  }),
);

// ─── Loyalty Program ──────────────────────────────────────────────────────────

/**
 * GET /api/stores/:storeId/loyalty-program
 * Returns the store's tier definitions plus the authenticated user's
 * current tier, cumulative spend, and progress to the next tier.
 */
router.get(
  '/stores/:storeId/loyalty-program',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const userId = (req as any).user?.id || (req as any).user?._id;

      // Fetch the store's loyalty program
      const program = await MerchantLoyaltyTier.findOne({
        storeId,
        isActive: true,
      }).lean();

      const tiers =
        (program?.tiers ?? MerchantLoyaltyTier.schema.statics)
          ? ((await (MerchantLoyaltyTier as any).getDefaultTiers?.()) ?? [])
          : [];

      // Compute user's cumulative spend at this store from reward journal
      let cumulativeSpend = 0;
      let currentTier = tiers[0] || null;
      let nextTier = null;
      let spendToNextTier = 0;
      let progressPercent = 0;

      if (userId && tiers.length > 0) {
        const agg = await MerchantRewardJournal.aggregate([
          {
            $match: {
              userId: userId,
              storeId: storeId,
              eventType: 'payment',
            },
          },
          { $group: { _id: null, total: { $sum: '$transactionAmount' } } },
        ]);
        cumulativeSpend = agg[0]?.total || 0;

        const sorted = [...tiers].sort((a, b) => a.minCumulativeSpend - b.minCumulativeSpend);
        currentTier = determineTier(sorted, cumulativeSpend);

        const currentIndex = sorted.findIndex((t) => t.name === currentTier.name);
        nextTier = sorted[currentIndex + 1] || null;

        if (nextTier) {
          const spendInCurrentTier = cumulativeSpend - currentTier.minCumulativeSpend;
          const tierRange = nextTier.minCumulativeSpend - currentTier.minCumulativeSpend;
          spendToNextTier = Math.max(0, nextTier.minCumulativeSpend - cumulativeSpend);
          progressPercent = Math.min(100, Math.round((spendInCurrentTier / tierRange) * 100));
        } else {
          progressPercent = 100; // Top tier
        }
      }

      // Fetch store name
      const store = await Store.findById(storeId).select('name').lean();

      return res.json({
        success: true,
        data: {
          program: {
            programName: program?.programName || 'Rewards Program',
            storeId,
            storeName: (store as any)?.name || '',
            tiers: tiers.map((t: any) => ({
              name: t.name,
              minCumulativeSpend: t.minCumulativeSpend,
              coinMultiplier: t.coinMultiplier,
              perks: t.perks || [],
              color: t.color,
              icon: t.icon,
            })),
          },
          userProgress: userId
            ? {
                cumulativeSpend,
                currentTier: currentTier
                  ? {
                      name: currentTier.name,
                      coinMultiplier: currentTier.coinMultiplier,
                      perks: currentTier.perks || [],
                      color: currentTier.color,
                      icon: currentTier.icon,
                    }
                  : null,
                nextTier: nextTier
                  ? {
                      name: nextTier.name,
                      minCumulativeSpend: nextTier.minCumulativeSpend,
                      coinMultiplier: nextTier.coinMultiplier,
                      color: nextTier.color,
                      icon: nextTier.icon,
                    }
                  : null,
                spendToNextTier,
                progressPercent,
              }
            : null,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch loyalty program' });
    }
  }),
);

// ─── Store Gift Cards ─────────────────────────────────────────────────────────

/**
 * GET /api/user/store-gift-cards
 * Lists all store-issued gift cards belonging to the authenticated user.
 * Query: status=active|used|expired|all (default: active)
 */
router.get(
  '/user/store-gift-cards',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      const { status = 'active' } = req.query as { status?: string };

      // Auto-expire cards past their expiry date
      await StoreGiftCard.updateMany(
        { $or: [{ purchasedBy: userId }, { purchasedFor: userId }], status: 'active', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } },
      );

      const filter: Record<string, any> = {
        $or: [{ purchasedBy: userId }, { purchasedFor: userId }],
      };
      if (status !== 'all') {
        filter.status = status;
      }

      const cards = await StoreGiftCard.find(filter)
        .populate('storeId', 'name logo address')
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        success: true,
        data: {
          giftCards: cards.map((c) => ({
            id: String(c._id),
            code: c.code,
            amount: c.amount,
            balance: c.balance,
            status: c.status,
            expiresAt: (c.expiresAt as Date).toISOString(),
            store: c.storeId
              ? {
                  id: String((c.storeId as any)._id),
                  name: (c.storeId as any).name,
                  logo: (c.storeId as any).logo || null,
                }
              : null,
            redemptionCount: c.redemptions?.length || 0,
            isGiftedToMe: c.purchasedFor && String(c.purchasedFor) === String(userId),
          })),
          count: cards.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch gift cards' });
    }
  }),
);

/**
 * GET /api/user/store-gift-cards/:code
 * Returns details for a specific gift card by code.
 * User must own or be the recipient of the card.
 */
router.get(
  '/user/store-gift-cards/:code',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?._id;
      const { code } = req.params;

      const card = await StoreGiftCard.findOne({
        code: code.toUpperCase(),
        $or: [{ purchasedBy: userId }, { purchasedFor: userId }],
      })
        .populate('storeId', 'name logo address')
        .lean();

      if (!card) {
        return res.status(404).json({ success: false, message: 'Gift card not found' });
      }

      return res.json({
        success: true,
        data: {
          giftCard: {
            id: String(card._id),
            code: card.code,
            amount: card.amount,
            balance: card.balance,
            status: card.status,
            expiresAt: (card.expiresAt as Date).toISOString(),
            store: card.storeId
              ? {
                  id: String((card.storeId as any)._id),
                  name: (card.storeId as any).name,
                  logo: (card.storeId as any).logo || null,
                  address: (card.storeId as any).address || null,
                }
              : null,
            redemptions: (card.redemptions || []).map((r: any) => ({
              amount: r.amount,
              usedAt: (r.usedAt as Date).toISOString(),
              orderId: r.orderId ? String(r.orderId) : null,
            })),
          },
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch gift card' });
    }
  }),
);

export default router;
