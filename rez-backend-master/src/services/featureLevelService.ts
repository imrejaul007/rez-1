import { logger } from '../config/logger';
import { User } from '../models/User';
import { privilegeResolutionService } from './entitlement/privilegeResolutionService';

export class FeatureLevelService {
  /**
   * Check and upgrade user's feature level based on milestones.
   * Level 1: Default (any user)
   * Level 2: Verified or provisional zone access
   * Level 3: 1+ completed orders
   * Level 4: 3+ completed orders
   * Level 5: 10+ completed orders
   */
  async checkAndUpgrade(userId: string): Promise<number> {
    const user = await User.findById(userId)
      .select('featureLevel verificationSegment')
      .lean();

    if (!user) return 1;

    let lvl = (user as any).featureLevel || 1;
    const verificationSegment =
      (user as any).verificationSegment || 'none';

    // Level 2: verified or provisional
    if (
      lvl < 2 &&
      ['verified', 'provisional'].includes(verificationSegment)
    ) {
      lvl = 2;
    }

    // Levels 3-5: based on completed orders
    if (lvl < 5) {
      const { Order } = await import('../models/Order');
      const orderCount = await Order.countDocuments({
        user: userId,
        status: 'completed',
      });

      if (orderCount >= 10) lvl = Math.max(lvl, 5);
      else if (orderCount >= 3) lvl = Math.max(lvl, 4);
      else if (orderCount >= 1) lvl = Math.max(lvl, 3);
    }

    if (lvl !== (user as any).featureLevel) {
      await User.findByIdAndUpdate(userId, { featureLevel: lvl });
      await privilegeResolutionService.invalidate(userId);
      logger.info(
        `[FeatureLevel] User ${userId} upgraded to level ${lvl}`
      );
    }

    return lvl;
  }
}

export const featureLevelService = new FeatureLevelService();
