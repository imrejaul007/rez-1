import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { liabilityService } from '../services/liabilityService';
import { InvoiceService } from '../services/InvoiceService';
import { MerchantLiability } from '../models/MerchantLiability';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('merchant-liability');
const router = Router();

router.use(authMiddleware);

/**
 * GET /api/merchant/liability/summary
 * Aggregated settlement stats for the merchant — used by SettlementHistory header
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [totals, byCycle] = await Promise.all([
      MerchantLiability.aggregate([
        { $match: { merchant: new Types.ObjectId(String(merchantId)) } },
        {
          $group: {
            _id: null,
            totalIssued: { $sum: '$rewardIssued' },
            totalRedeemed: { $sum: '$rewardRedeemed' },
            totalPending: { $sum: '$pendingAmount' },
            totalSettled: { $sum: '$settledAmount' },
            activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending_settlement'] }, 1, 0] } },
            settledCount: { $sum: { $cond: [{ $eq: ['$status', 'settled'] }, 1, 0] } },
            disputedCount: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
          },
        },
      ]),
      MerchantLiability.aggregate([
        { $match: { merchant: new Types.ObjectId(String(merchantId)) } },
        {
          $group: {
            _id: '$cycleId',
            totalSettled: { $sum: '$settledAmount' },
            totalPending: { $sum: '$pendingAmount' },
            status: { $first: '$status' },
            lastSettlementDate: { $max: '$settlementDate' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
    ]);

    const summary = totals[0] || {
      totalIssued: 0, totalRedeemed: 0, totalPending: 0, totalSettled: 0,
      activeCount: 0, pendingCount: 0, settledCount: 0, disputedCount: 0,
    };

    // GST estimation on settled amount (18% on platform fees ≈ 15% of settled)
    const estimatedPlatformFee = summary.totalSettled * 0.15;
    const gstOnFees = estimatedPlatformFee * 0.18;

    return res.json({
      success: true,
      data: {
        ...summary,
        gst: {
          platformFee: parseFloat(estimatedPlatformFee.toFixed(2)),
          cgst: parseFloat((gstOnFees / 2).toFixed(2)),
          sgst: parseFloat((gstOnFees / 2).toFixed(2)),
          totalGst: parseFloat(gstOnFees.toFixed(2)),
        },
        recentCycles: byCycle,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get settlement summary', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to get summary' });
  }
});

/**
 * GET /api/merchant/liability
 * Merchant views own liability records (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { cycleId, campaignId, status, page, limit } = req.query;

    const result = await liabilityService.getStatement(String(merchantId), {
      cycleId: cycleId as string,
      campaignId: campaignId as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Failed to get merchant liability', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to get liability' });
  }
});

/**
 * GET /api/merchant/liability/payout-statement/:cycleId
 * Merchant downloads payout statement PDF with GST split
 */
router.get('/payout-statement/:cycleId', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { cycleId } = req.params;

    const pdfBuffer = await InvoiceService.generatePayoutStatement(String(merchantId), cycleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payout-statement-${cycleId}.pdf`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to generate payout statement', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate payout statement' });
  }
});

/**
 * GET /api/merchant/liability/statement/:cycleId
 * Merchant downloads own liability statement PDF
 */
router.get('/statement/:cycleId', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { cycleId } = req.params;

    const pdfBuffer = await InvoiceService.generateLiabilityStatement(String(merchantId), cycleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=liability-statement-${cycleId}.pdf`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Failed to generate liability statement', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate statement' });
  }
});

export default router;
