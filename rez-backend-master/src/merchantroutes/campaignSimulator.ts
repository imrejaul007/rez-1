import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { campaignForecastService, CampaignType } from '../merchantservices/campaignForecastService';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

const router = Router();

router.use(authMiddleware);

const VALID_CAMPAIGN_TYPES: CampaignType[] = ['cashback_percentage', 'flat_bonus', 'multiplier'];

/**
 * @route   POST /api/merchant/campaign-simulator/simulate
 * @desc    Run a campaign simulation to project ROI, liability, and uplift
 * @access  Merchant (authenticated)
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      storeId,
      campaignType,
      rewardValue,
      budgetCap,
      durationDays,
      estimatedDailyFootfall,
      estimatedAvgBill,
    } = req.body;

    // Validation
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }
    if (!campaignType || !VALID_CAMPAIGN_TYPES.includes(campaignType)) {
      return res.status(400).json({ success: false, message: `campaignType must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}` });
    }
    const parsedReward = Number(rewardValue);
    if (!Number.isFinite(parsedReward) || parsedReward <= 0) {
      return res.status(400).json({ success: false, message: 'rewardValue must be a positive number' });
    }
    const parsedBudget = Number(budgetCap);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return res.status(400).json({ success: false, message: 'budgetCap must be a positive number' });
    }
    const parsedDuration = Number(durationDays);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 1 || parsedDuration > 365) {
      return res.status(400).json({ success: false, message: 'durationDays must be between 1 and 365' });
    }

    // Verify merchant owns this store
    const store = await Store.findOne({ _id: storeId, merchantId }).select('_id').lean();
    if (!store) {
      return res.status(403).json({ success: false, message: 'Store not found or you do not have access' });
    }

    const result = await campaignForecastService.simulate({
      storeId,
      campaignType,
      rewardValue: parsedReward,
      budgetCap: parsedBudget,
      durationDays: parsedDuration,
      estimatedDailyFootfall: estimatedDailyFootfall ? Number(estimatedDailyFootfall) : undefined,
      estimatedAvgBill: estimatedAvgBill ? Number(estimatedAvgBill) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Campaign simulation failed', error);
    res.status(500).json({ success: false, message: error.message || 'Simulation failed' });
  }
});

export default router;
