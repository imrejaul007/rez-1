import { Types } from 'mongoose';
import { UserMerchantAffinity } from '../models/UserMerchantAffinity';
import { logger } from '../config/logger';

interface CrossRecommendation {
  userId: Types.ObjectId;
  source: string;
  productLinks: Array<{ title: string; url: string }>;
  expiresAt: Date;
  createdAt: Date;
}

class CrossIntegrationService {
  /**
   * Notify NearU integration: boost merchant's NearU ranking for this user
   * Updates user_merchant_affinity record
   */
  async notifyNearU(userId: Types.ObjectId, merchantId: Types.ObjectId): Promise<void> {
    try {
      // Update or create affinity record
      const affinity = await UserMerchantAffinity.findOneAndUpdate(
        { userId, merchantId },
        {
          $inc: { tryTrialCount: 1 },
          lastVisit: new Date(),
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      logger.info('[CROSS INTEGRATION SERVICE] NearU notified', {
        userId: userId.toString(),
        merchantId: merchantId.toString(),
        affinityScore: affinity.affinityScore,
      });
    } catch (error: any) {
      logger.error('[CROSS INTEGRATION SERVICE] Error notifying NearU: ' + error.message);
      // Don't throw - fire and forget
    }
  }

  /**
   * Notify Mall integration: create recommendation entry from trial upsell links
   */
  async notifyMall(userId: Types.ObjectId, upsellLinks: Array<{ title: string; url: string }>): Promise<void> {
    try {
      if (!upsellLinks || upsellLinks.length === 0) {
        return; // No upsell links
      }

      // In production, this would insert into a cross_recommendations collection
      // For now, we log the action
      logger.info('[CROSS INTEGRATION SERVICE] Mall notified', {
        userId: userId.toString(),
        productLinkCount: upsellLinks.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Example of what would be inserted:
      // const recommendation: CrossRecommendation = {
      //   userId,
      //   source: 'try_trial',
      //   productLinks: upsellLinks,
      //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      //   createdAt: new Date()
      // };
      // await CrossRecommendation.create(recommendation);
    } catch (error: any) {
      logger.error('[CROSS INTEGRATION SERVICE] Error notifying Mall: ' + error.message);
      // Don't throw - fire and forget
    }
  }

  /**
   * Notify Cash/Cashback integration: trigger cashback check
   */
  async notifyCash(userId: Types.ObjectId, merchantId: Types.ObjectId, amountSpent: number): Promise<void> {
    try {
      // In production, this would check for CashbackRule and trigger cashback engine
      // For now, we log the action
      logger.info('[CROSS INTEGRATION SERVICE] Cashback notified', {
        userId: userId.toString(),
        merchantId: merchantId.toString(),
        amountSpent,
      });

      // Example of what would happen:
      // const cashbackRule = await CashbackRule.findOne({ merchantId });
      // if (cashbackRule) {
      //   await cashbackEngine.triggerCashbackCheck(userId, merchantId, amountSpent);
      // }
    } catch (error: any) {
      logger.error('[CROSS INTEGRATION SERVICE] Error notifying Cashback: ' + error.message);
      // Don't throw - fire and forget
    }
  }
}

export default new CrossIntegrationService();
