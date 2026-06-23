/**
 * ROI Routes - Li Wei
 *
 * Merchant ROI optimization endpoints:
 * - Campaign performance metrics
 * - Customer acquisition cost analysis
 * - Visit frequency distribution
 * - Revenue by day-of-week for staffing
 * - Payout month-over-month growth
 * - Subscription value calculation
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { ROIService } from '../merchantservices/ROIService';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper: Get store ID from merchant
 */
async function getStoreId(req: Request, res: Response): Promise<string | null> {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return null;
    }

    const requestedStoreId = req.query.storeId as string | undefined;

    if (requestedStoreId) {
      const store = await Store.findOne({
        _id: requestedStoreId,
        merchantId,
      }).lean();

      if (!store) {
        res.status(403).json({
          success: false,
          message: 'Store not found or access denied',
        });
        return null;
      }

      return store._id.toString();
    }

    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found' });
      return null;
    }

    return store._id.toString();
  } catch (error) {
    logger.error('Error getting store ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get store information' });
    return null;
  }
}

// ==================== CAMPAIGN ROI ====================

/**
 * @route   GET /api/merchant/roi/campaigns
 * @desc    Get campaign performance metrics (impressions, redemptions, ROI)
 * @access  Private
 * @query   campaignId (optional), limit (default 10)
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { campaignId, limit = '10' } = req.query;
    const campaigns = await ROIService.getCampaignROI(storeId, campaignId as string, parseInt(limit as string, 10));

    return res.status(200).json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    logger.error('Error fetching campaign ROI:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign ROI',
    });
  }
});

// ==================== CUSTOMER ACQUISITION COST ====================

/**
 * @route   GET /api/merchant/roi/cac
 * @desc    Get customer acquisition cost by source
 * @access  Private
 * @query   days (default 90)
 */
router.get('/cac', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { days = '90' } = req.query;
    const cacs = await ROIService.getCustomerAcquisitionCost(storeId, parseInt(days as string, 10));

    return res.status(200).json({
      success: true,
      data: cacs,
    });
  } catch (error) {
    logger.error('Error fetching CAC:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer acquisition cost',
    });
  }
});

// ==================== VISIT FREQUENCY ====================

/**
 * @route   GET /api/merchant/roi/visit-frequency
 * @desc    Get visit frequency distribution (how often customers return)
 * @access  Private
 * @query   days (default 90)
 */
router.get('/visit-frequency', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { days = '90' } = req.query;
    const distribution = await ROIService.getVisitFrequencyDistribution(storeId, parseInt(days as string, 10));

    return res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    logger.error('Error fetching visit frequency:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch visit frequency distribution',
    });
  }
});

// ==================== REVENUE BY DAY OF WEEK ====================

/**
 * @route   GET /api/merchant/roi/day-of-week
 * @desc    Get revenue by day of week with staffing recommendations
 * @access  Private
 * @query   days (default 90)
 */
router.get('/day-of-week', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { days = '90' } = req.query;
    const revenue = await ROIService.getDayOfWeekRevenue(storeId, parseInt(days as string, 10));

    return res.status(200).json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    logger.error('Error fetching day-of-week revenue:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by day of week',
    });
  }
});

// ==================== PAYOUT GROWTH ====================

/**
 * @route   GET /api/merchant/roi/payout-growth
 * @desc    Get month-over-month payout growth
 * @access  Private
 * @query   months (default 6)
 */
router.get('/payout-growth', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { months = '6' } = req.query;
    const payoutGrowth = await ROIService.getPayoutGrowth(storeId, parseInt(months as string, 10));

    return res.status(200).json({
      success: true,
      data: payoutGrowth,
    });
  } catch (error) {
    logger.error('Error fetching payout growth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payout growth',
    });
  }
});

// ==================== SUBSCRIPTION VALUE ====================

/**
 * @route   GET /api/merchant/roi/subscription-value
 * @desc    Calculate subscription savings vs pay-per-action
 * @access  Private
 * @query   monthlySubscriptionCost, costPerAction, days (default 30)
 */
router.get('/subscription-value', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { monthlySubscriptionCost, costPerAction, days = '30' } = req.query;

    if (!monthlySubscriptionCost || !costPerAction) {
      return res.status(400).json({
        success: false,
        message: 'monthlySubscriptionCost and costPerAction are required',
      });
    }

    const value = await ROIService.getSubscriptionValue(
      storeId,
      parseFloat(monthlySubscriptionCost as string),
      parseFloat(costPerAction as string),
      parseInt(days as string, 10),
    );

    return res.status(200).json({
      success: true,
      data: value,
    });
  } catch (error) {
    logger.error('Error calculating subscription value:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate subscription value',
    });
  }
});

export default router;
