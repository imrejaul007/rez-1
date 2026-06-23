// @ts-nocheck
import * as crypto from 'crypto';
import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import BbpsTransaction from '../../models/BbpsTransaction';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

interface BillerHealth {
  billerId: string;
  name: string;
  category: string;
  successRate: number;
  avgLatencyMs: number;
  totalTx24h: number;
  pendingTx: number;
  lastSuccess: string | null;
  status: 'healthy' | 'degraded' | 'down';
}

/**
 * @route   GET /api/admin/bbps/health
 * @desc    Get BBPS biller health status for last 24 hours
 * @access  Admin
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Fetch all BBPS transactions from the last 24 hours
      const transactions = await BbpsTransaction.find({
        createdAt: { $gte: twentyFourHoursAgo },
      });

      // Group transactions by biller
      const billerMap = new Map<string, any[]>();
      transactions.forEach((tx) => {
        if (!billerMap.has(tx.billerId)) {
          billerMap.set(tx.billerId, []);
        }
        billerMap.get(tx.billerId)!.push(tx);
      });

      const billers: BillerHealth[] = [];
      let overallTotalTx = 0;
      let overallSuccessful = 0;

      for (const [billerId, txs] of billerMap.entries()) {
        const successful = txs.filter((t) => t.status === 'success').length;
        const failed = txs.filter((t) => t.status === 'failed').length;
        const processing = txs.filter((t) => t.status === 'processing').length;
        const pending = txs.filter((t) => t.status === 'pending').length;

        const successRate = txs.length > 0 ? Math.round((successful / txs.length) * 10000) / 100 : 0;
        const avgLatencyMs = txs.length > 0 ? Math.round(txs.reduce((sum, t) => sum + t.latencyMs, 0) / txs.length) : 0;

        // Get the last successful transaction
        const lastSuccessfulTx = txs
          .filter((t) => t.status === 'success')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        // Determine status
        let status: 'healthy' | 'degraded' | 'down' = 'healthy';
        if (successRate >= 90) {
          status = 'healthy';
        } else if (successRate >= 70) {
          status = 'degraded';
        } else {
          status = 'down';
        }

        // Determine biller name and category from first transaction
        const firstTx = txs[0];
        const billerName = firstTx.billerName || billerId;
        const billerCategory = firstTx.billerCategory || 'unknown';

        billers.push({
          billerId,
          name: billerName,
          category: billerCategory,
          successRate,
          avgLatencyMs,
          totalTx24h: txs.length,
          pendingTx: pending + processing,
          lastSuccess: lastSuccessfulTx ? lastSuccessfulTx.createdAt.toISOString() : null,
          status,
        });

        overallTotalTx += txs.length;
        overallSuccessful += successful;
      }

      // Calculate overall metrics
      const overallSuccessRate =
        overallTotalTx > 0 ? Math.round((overallSuccessful / overallTotalTx) * 10000) / 100 : 0;

      const overallPending = transactions.filter((t) => t.status === 'pending' || t.status === 'processing').length;

      // Sort billers by success rate (descending)
      billers.sort((a, b) => b.successRate - a.successRate);

      return sendSuccess(
        res,
        {
          billers,
          overall: {
            successRate: overallSuccessRate,
            totalTx24h: overallTotalTx,
            pendingTx: overallPending,
          },
        },
        'BBPS health status retrieved',
      );
    } catch (error) {
      logger.error('[ADMIN] Error fetching BBPS health:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve BBPS health status',
      });
    }
  }),
);

/**
 * Seed some sample BBPS transactions if collection is empty
 */
async function initializeBbpsTransactions() {
  try {
    const count = await BbpsTransaction.countDocuments();
    if (count === 0) {
      const sampleBillers = [
        { id: 'MSEDCL', name: 'Maharashtra State Electricity', category: 'electricity' },
        { id: 'BESCOM', name: 'Bangalore Electricity Supply', category: 'electricity' },
        { id: 'AIRTEL', name: 'Airtel Broadband', category: 'broadband' },
        { id: 'JIOFIBER', name: 'Jio Fiber', category: 'broadband' },
        { id: 'BSNL', name: 'BSNL Postpaid', category: 'telecom' },
        { id: 'VODAFONE', name: 'Vodafone Postpaid', category: 'telecom' },
      ];

      const sampleTransactions = [];
      const now = new Date();

      for (const biller of sampleBillers) {
        for (let i = 0; i < 25; i++) {
          const timestamp = new Date(
            now.getTime() - (parseInt(crypto.randomUUID().replace('-', '').substring(0, 8), 16) % 86400000),
          );
          const statusRand = parseInt(crypto.randomUUID().replace('-', '')[0], 16);
          const status = statusRand < 3 ? 'failed' : statusRand < 5 ? 'processing' : 'success';

          sampleTransactions.push({
            userId: new (require('mongoose').Types.ObjectId)(),
            billerId: biller.id,
            billerName: biller.name,
            billerCategory: biller.category,
            amount: 100 + (parseInt(crypto.randomUUID().replace('-', '').substring(0, 5), 16) % 5000),
            status,
            latencyMs: 500 + (parseInt(crypto.randomUUID().replace('-', '').substring(0, 5), 16) % 2000),
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }

      await BbpsTransaction.insertMany(sampleTransactions);
      logger.info('[ADMIN] Sample BBPS transactions initialized');
    }
  } catch (error) {
    logger.error('[ADMIN] Failed to initialize BBPS transactions:', error);
  }
}

// Only callable manually by admin, not on module load
router.post(
  '/seed-test-data',
  asyncHandler(async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Not allowed in production' });
    }
    await initializeBbpsTransactions();
    res.json({ success: true });
  }),
);

export default router;
