import { Types } from 'mongoose';
import { TrialBundle, ITrialBundle } from '../models/TrialBundle';
import { UserBundlePurchase, IUserBundlePurchase } from '../models/UserBundlePurchase';
import { TrialCoinWallet } from '../models/TrialCoinWallet';
import { TrialCoinLedger } from '../models/TrialCoinLedger';
import { logger } from '../config/logger';

class TrialBundleService {
  /**
   * Get all active bundles, optionally filtered by category
   */
  async getBundles(category?: string): Promise<ITrialBundle[]> {
    try {
      const query: any = { isActive: true };
      if (category) {
        query.$or = [
          { category: null }, // Cross-category bundles
          { category }, // Category-specific bundles
        ];
      }

      const bundles = await TrialBundle.find(query).sort({ featured: -1, sortOrder: 1 }).lean();

      return bundles as unknown as ITrialBundle[];
    } catch (error: any) {
      logger.error('[TRIAL BUNDLE SERVICE] Error fetching bundles: ' + error.message);
      throw error;
    }
  }

  /**
   * Purchase a bundle
   * 1. Validate bundle exists and is active
   * 2. Create UserBundlePurchase record
   * 3. Credit trial coins
   * 4. Credit bonus ReZ coins
   * 5. Update bundle.totalPurchases
   */
  async purchaseBundle(
    userId: Types.ObjectId,
    bundleId: Types.ObjectId,
    paymentId: string,
  ): Promise<IUserBundlePurchase> {
    try {
      // Validate bundle
      const bundle = await TrialBundle.findById(bundleId);
      if (!bundle) {
        throw new Error('Bundle not found');
      }

      if (!bundle.isActive) {
        throw new Error('Bundle is not available for purchase');
      }

      const expiresAt = new Date(Date.now() + bundle.validityDays * 24 * 60 * 60 * 1000);

      // Create purchase record
      const purchase = await UserBundlePurchase.create({
        userId,
        bundleId,
        paymentId,
        amountPaid: bundle.price,
        trialSlotsTotal: bundle.trialSlots,
        trialSlotsUsed: 0,
        trialSlotsRemaining: bundle.trialSlots,
        trialCoinsGranted: bundle.trialCoinsIncluded,
        expiresAt,
        usedTrialIds: [],
        status: 'active',
      });

      // Credit trial coins if any
      if (bundle.trialCoinsIncluded > 0) {
        await TrialCoinLedger.create({
          userId,
          amount: bundle.trialCoinsIncluded,
          type: 'bundle_purchase',
          reason: `Bundle purchase: ${bundle.name}`,
          expiresAt: expiresAt,
          reference: (purchase._id as Types.ObjectId).toString(),
        });

        // Update wallet balance
        await TrialCoinWallet.findOneAndUpdate(
          { userId },
          {
            $inc: {
              balance: bundle.trialCoinsIncluded,
              totalEarned: bundle.trialCoinsIncluded,
            },
            lastUpdated: new Date(),
          },
          { upsert: true, new: true },
        );
      }

      // Update bundle purchase count
      await TrialBundle.findByIdAndUpdate(bundleId, {
        $inc: { totalPurchases: 1 },
      });

      logger.info('[TRIAL BUNDLE SERVICE] Bundle purchased', {
        userId: userId.toString(),
        bundleId: bundleId.toString(),
        purchaseId: (purchase._id as Types.ObjectId).toString(),
        paymentId,
      });

      return purchase;
    } catch (error: any) {
      logger.error('[TRIAL BUNDLE SERVICE] Error purchasing bundle: ' + error.message);
      throw error;
    }
  }

  /**
   * Get user's active bundles (not expired, with slots remaining)
   */
  async getUserBundles(userId: Types.ObjectId): Promise<IUserBundlePurchase[]> {
    try {
      const now = new Date();
      const bundles = await UserBundlePurchase.find({
        userId,
        status: { $in: ['active', 'exhausted'] },
        expiresAt: { $gte: now },
      })
        .populate('bundleId')
        .sort({ expiresAt: 1 })
        .lean();

      return bundles as unknown as IUserBundlePurchase[];
    } catch (error: any) {
      logger.error('[TRIAL BUNDLE SERVICE] Error fetching user bundles: ' + error.message);
      throw error;
    }
  }

  /**
   * Use a bundle slot when booking a trial
   * Returns bundlePurchaseId if used, null if no valid bundle found
   */
  async useBundleSlot(userId: Types.ObjectId, trialId: Types.ObjectId, category: string): Promise<string | null> {
    try {
      const now = new Date();

      // Find an active bundle that matches the category and has slots remaining
      const bundle = await UserBundlePurchase.findOneAndUpdate(
        {
          userId,
          status: 'active',
          expiresAt: { $gte: now },
          trialSlotsRemaining: { $gt: 0 },
        },
        {
          $inc: {
            trialSlotsUsed: 1,
            trialSlotsRemaining: -1,
          },
          $push: {
            usedTrialIds: trialId,
          },
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!bundle) {
        return null;
      }

      // If all slots are used, mark as exhausted
      if (bundle.trialSlotsRemaining - 1 === 0) {
        await UserBundlePurchase.findByIdAndUpdate(bundle._id as Types.ObjectId, {
          status: 'exhausted',
        });
      }

      logger.info('[TRIAL BUNDLE SERVICE] Bundle slot used', {
        userId: userId.toString(),
        bundlePurchaseId: (bundle._id as Types.ObjectId as Types.ObjectId).toString(),
        trialId: trialId.toString(),
      });

      return (bundle._id as Types.ObjectId as Types.ObjectId).toString();
    } catch (error: any) {
      logger.error('[TRIAL BUNDLE SERVICE] Error using bundle slot: ' + error.message);
      throw error;
    }
  }

  /**
   * Expire old bundles (called by cron)
   */
  async expireOldBundles(): Promise<{ expired: number }> {
    try {
      const now = new Date();

      const result = await UserBundlePurchase.updateMany(
        {
          status: { $in: ['active', 'exhausted'] },
          expiresAt: { $lt: now },
        },
        {
          status: 'expired',
          updatedAt: new Date(),
        },
      );

      logger.info('[TRIAL BUNDLE SERVICE] Bundles expired', {
        count: result.modifiedCount,
      });

      return { expired: result.modifiedCount };
    } catch (error: any) {
      logger.error('[TRIAL BUNDLE SERVICE] Error expiring bundles: ' + error.message);
      throw error;
    }
  }
}

export default new TrialBundleService();
