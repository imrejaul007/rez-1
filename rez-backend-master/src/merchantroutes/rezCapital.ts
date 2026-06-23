/**
 * REZ Capital Routes — Working capital pre-approval for merchants.
 *
 * Mounted at /api/merchant/rez-capital
 * Protected by merchant auth middleware.
 *
 * Endpoints:
 *   GET  /eligibility   — pre-approval score + offer (read from MerchantCapitalScore)
 *   POST /apply         — submit application (transitions to 'applied')
 *   GET  /status        — current application state
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { createServiceLogger } from '../config/logger';
import { MerchantCapitalScore } from '../models/MerchantCapitalScore';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authMiddleware);

const logger = createServiceLogger('rez-capital-routes');

// Rate limit: 10 requests/15min per merchant (financial data endpoint)
const capitalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rez-capital',
  message: 'Too many capital requests. Please try again later.',
});

const applySchema = Joi.object({
  requestedAmountPaise: Joi.number().integer().positive().required(),
  purposeNote: Joi.string().max(500).optional().allow(''),
  businessPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Please enter a valid Indian mobile number' }),
});

// ── GET /eligibility ──────────────────────────────────────────────────────────
/**
 * Returns the merchant's current pre-approval status.
 * If no score exists yet (job hasn't run), returns a "not yet scored" response
 * so the UI can show a "check back soon" message.
 */
router.get('/eligibility', capitalLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;

    const score = (await MerchantCapitalScore.findOne({
      merchantId: new mongoose.Types.ObjectId(merchantId),
    }).lean()) as any;

    if (!score) {
      return res.json({
        success: true,
        data: {
          scored: false,
          eligible: false,
          message: 'Your credit profile is being computed. Check back in a few days.',
        },
      });
    }

    const preApprovedRupees = Math.round(score.preApprovedAmountPaise / 100);

    return res.json({
      success: true,
      data: {
        scored: true,
        eligible: score.eligible,
        totalScore: score.totalScore,
        preApprovedAmountRupees: preApprovedRupees,
        monthlyInterestRate: score.monthlyInterestRate,
        applicationStatus: score.applicationStatus,
        // Score breakdown (transparent to merchant)
        breakdown: {
          gmvScore: score.gmvScore,
          repaymentScore: score.repaymentScore,
          consistencyScore: score.consistencyScore,
          cashbackScore: score.cashbackScore,
        },
        // Summary stats
        gmv30dRupees: Math.round(score.gmv30dPaise / 100),
        khataRepaymentRate: Math.round(score.khataRepaymentRate * 100),
        activeDays30d: score.activeDays30d,
        computedAt: score.computedAt,
        // Nudge for ineligible merchants
        improvementTips: score.eligible ? [] : buildImprovementTips(score),
      },
    });
  } catch (err: any) {
    logger.error('[REZCapital] Eligibility fetch failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Unable to fetch eligibility. Please try again.' });
  }
});

// ── POST /apply ───────────────────────────────────────────────────────────────
/**
 * Submits a capital application. Validates:
 *   - Merchant is eligible
 *   - requestedAmount <= preApprovedAmount
 *   - No duplicate active application
 */
router.post('/apply', capitalLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;

    const { error, value } = applySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const score = await MerchantCapitalScore.findOne({
      merchantId: new mongoose.Types.ObjectId(merchantId),
    });

    if (!score || !score.eligible) {
      return res.status(403).json({
        success: false,
        error: 'You are not currently eligible for REZ Capital.',
      });
    }

    if (['applied', 'under_review', 'approved', 'disbursed'].includes(score.applicationStatus)) {
      return res.status(409).json({
        success: false,
        error: `An application is already ${score.applicationStatus}. Please wait for it to be processed.`,
      });
    }

    if (value.requestedAmountPaise > score.preApprovedAmountPaise) {
      return res.status(400).json({
        success: false,
        error: `Requested amount exceeds your pre-approved limit of ₹${Math.round(score.preApprovedAmountPaise / 100).toLocaleString()}.`,
      });
    }

    score.applicationStatus = 'applied';
    score.appliedAt = new Date();
    await score.save();

    logger.info('[REZCapital] Application submitted', {
      merchantId,
      requestedAmountPaise: value.requestedAmountPaise,
      preApprovedAmountPaise: score.preApprovedAmountPaise,
      score: score.totalScore,
    });

    return res.json({
      success: true,
      data: {
        applicationStatus: 'applied',
        requestedAmountRupees: Math.round(value.requestedAmountPaise / 100),
        preApprovedAmountRupees: Math.round(score.preApprovedAmountPaise / 100),
        monthlyInterestRate: score.monthlyInterestRate,
        message: 'Application submitted. Our team will review it within 2-3 business days.',
      },
    });
  } catch (err: any) {
    logger.error('[REZCapital] Application submit failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Unable to submit application. Please try again.' });
  }
});

// ── GET /status ───────────────────────────────────────────────────────────────
router.get('/status', capitalLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;

    const score = (await MerchantCapitalScore.findOne({
      merchantId: new mongoose.Types.ObjectId(merchantId),
    })
      .select('applicationStatus appliedAt reviewNote preApprovedAmountPaise monthlyInterestRate computedAt')
      .lean()) as any;

    if (!score) {
      return res.json({
        success: true,
        data: { applicationStatus: 'none', message: 'No application on record.' },
      });
    }

    return res.json({
      success: true,
      data: {
        applicationStatus: score.applicationStatus,
        appliedAt: score.appliedAt,
        reviewNote: score.reviewNote,
        preApprovedAmountRupees: Math.round(score.preApprovedAmountPaise / 100),
        monthlyInterestRate: score.monthlyInterestRate,
        lastScoredAt: score.computedAt,
      },
    });
  } catch (err: any) {
    logger.error('[REZCapital] Status fetch failed', { error: err.message });
    res.status(500).json({ success: false, error: 'Unable to fetch status.' });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildImprovementTips(score: any): string[] {
  const tips: string[] = [];
  if (score.gmvScore < 20) {
    tips.push('Process more payments through REZ to increase your GMV score.');
  }
  if (score.repaymentScore < 15) {
    tips.push('Collect pending khata payments to improve your repayment score.');
  }
  if (score.consistencyScore < 10) {
    tips.push('Stay active on REZ for more days each month to boost your consistency score.');
  }
  if (score.cashbackScore === 0) {
    tips.push('Run a cashback offer on your store — it signals customer trust and adds 10 points.');
  }
  return tips;
}

export default router;
