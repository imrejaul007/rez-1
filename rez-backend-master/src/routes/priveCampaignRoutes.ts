/**
 * Privé Campaign Routes (User-facing)
 *
 * P3-01  GET    /                → List active campaigns
 * P3-02  GET    /:id             → Campaign detail
 * P3-03  POST   /:id/join        → Join campaign
 * P3-04  POST   /:id/submit      → Submit social post
 * P3-05  GET    /:id/status      → Submission status
 *        GET    /earnings        → Campaign earnings
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { generalLimiter, strictLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { uploadSocialMediaProof } from '../middleware/upload';
import priveCampaignService from '../services/priveCampaignService';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { logger } from '../config/logger';

const router = Router();

// Feature flag middleware — gates all campaign routes
const requireFeatureFlag = (flagName: string) => async (req: any, res: any, next: any) => {
  try {
    const config = await getCachedWalletConfig();
    const flags = config?.priveProgramConfig?.featureFlags as Record<string, boolean> | undefined;
    if (flags && flags[flagName] === false) {
      return res.status(403).json({ success: false, error: 'This feature is currently disabled' });
    }
    next();
  } catch { next(); }
};

// All routes require authentication + feature flag
router.use(authenticate);
router.use(requireFeatureFlag('priveCampaignsEnabled'));

// ── P3-06: GET /earnings ──
// (Must be defined BEFORE /:id to avoid "earnings" matching as :id)
router.get('/earnings', generalLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const month = req.query.month as string | undefined;

  const result = await priveCampaignService.getCampaignEarnings(userId, page, limit, month);
  return sendSuccess(res, result, 'Campaign earnings fetched');
}));

// ── P3-01: GET / ──
router.get('/', generalLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const filters = {
    status: req.query.status as string,
    tier: req.query.tier as string,
    type: req.query.type as string,
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
  };

  const result = await priveCampaignService.getActiveCampaigns(userId, filters);
  return sendSuccess(res, result, 'Campaigns fetched');
}));

// ── P3-02: GET /:id ──
router.get('/:id', generalLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const campaign = await priveCampaignService.getCampaignById(req.params.id, userId);

  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }

  return sendSuccess(res, { campaign }, 'Campaign details fetched');
}));

// ── P3-03: POST /:id/join ──
router.post('/:id/join', strictLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await priveCampaignService.joinCampaign(req.params.id, userId);

  if (result.error) {
    return sendError(res, result.message!, result.status!);
  }

  return sendSuccess(res, result.data, result.data?.message || 'Joined campaign');
}));

// ── P3-04: POST /:id/submit ──
router.post(
  '/:id/submit',
  strictLimiter,
  uploadSocialMediaProof.single('postScreenshot'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const file = req.file as any;

    const data = {
      postUrl: req.body.postUrl,
      postScreenshotUrl: file?.path || file?.secure_url || req.body.postScreenshotUrl || '',
      orderId: req.body.orderId,
      notes: req.body.notes,
    };

    if (!data.postUrl) {
      return sendError(res, 'postUrl is required', 400);
    }

    const result = await priveCampaignService.submitPost(req.params.id, userId, data);

    if (result.error) {
      return sendError(res, result.message!, result.status!);
    }

    return sendSuccess(res, result.data, result.message || 'Submission created', 201);
  })
);

// ── P3-05: GET /:id/status ──
router.get('/:id/status', generalLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await priveCampaignService.getSubmissionStatus(req.params.id, userId);

  if (!result) {
    return sendError(res, 'No submission found for this campaign', 404);
  }

  return sendSuccess(res, result, 'Submission status fetched');
}));

export default router;
