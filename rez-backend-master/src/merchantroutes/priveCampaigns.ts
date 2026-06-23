/**
 * Merchant Privé Campaign Routes
 *
 * P3-08a  GET    /campaigns              → List merchant's campaigns
 * P3-08b  POST   /campaigns              → Create campaign
 * P3-08c  GET    /submissions            → List submissions for merchant's campaigns
 * P3-08d  PUT    /submissions/:id/approve → Approve submission
 * P3-08e  PUT    /submissions/:id/reject  → Reject submission
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { Store } from '../models/Store';
import { PriveSubmission } from '../models/PriveSubmission';
import priveCampaignService from '../services/priveCampaignService';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { logger } from '../config/logger';

const router = Router();

// Feature flag middleware
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

// All routes require merchant authentication + feature flag
router.use(authMiddleware);
router.use(requireFeatureFlag('priveCampaignsEnabled'));

/**
 * Helper: Get all store IDs owned by this merchant
 */
async function getMerchantStoreIds(merchantId: string): Promise<string[]> {
  const stores = await Store.find({
    $or: [{ merchantId }, { merchant: merchantId }],
  })
    .select('_id name logo')
    .lean();
  return stores.map((s) => s._id.toString());
}

async function getMerchantStoreDetails(merchantId: string): Promise<any[]> {
  return Store.find({
    $or: [{ merchantId }, { merchant: merchantId }],
  })
    .select('_id name logo')
    .lean();
}

// ── P3-08a: GET /campaigns ──
router.get('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  if (!merchantId) {
    return sendError(res, 'Merchant authentication required', 401);
  }

  const storeIds = await getMerchantStoreIds(merchantId);
  if (!storeIds.length) {
    return sendSuccess(res, { campaigns: [], pagination: { page: 1, limit: 20, total: 0, hasMore: false } }, 'No stores found');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const result = await priveCampaignService.getMerchantCampaigns(merchantId, storeIds, page, limit);
  return sendSuccess(res, result, 'Merchant campaigns fetched');
}));

// ── P3-08b: POST /campaigns ──
router.post('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  if (!merchantId) {
    return sendError(res, 'Merchant authentication required', 401);
  }

  const { storeId, title, description, taskType, reward, totalSlots, budget, validFrom, validTo } = req.body;

  if (!storeId || !title || !description || !taskType || !reward || !totalSlots || !budget || !validFrom || !validTo) {
    return sendError(res, 'Missing required fields: storeId, title, description, taskType, reward, totalSlots, budget, validFrom, validTo', 400);
  }

  // Verify store ownership
  const stores = await getMerchantStoreDetails(merchantId);
  const store = stores.find((s) => s._id.toString() === storeId);
  if (!store) {
    return sendError(res, 'Store not found or access denied', 404);
  }

  const result = await priveCampaignService.createMerchantCampaign(
    merchantId,
    storeId,
    store.name,
    store.logo || '',
    { ...req.body, totalSlots }
  );

  return sendSuccess(res, result, 'Campaign submitted for approval', 201);
}));

// ── P3-08c: GET /submissions ──
router.get('/submissions', asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  if (!merchantId) {
    return sendError(res, 'Merchant authentication required', 401);
  }

  const storeIds = await getMerchantStoreIds(merchantId);
  if (!storeIds.length) {
    return sendSuccess(res, { submissions: [], stats: {}, pagination: { page: 1, limit: 20, total: 0, hasMore: false } }, 'No stores');
  }

  const result = await priveCampaignService.getSubmissions({
    merchantStoreIds: storeIds,
    status: req.query.status as string,
    campaignId: req.query.campaignId as string,
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
  });

  return sendSuccess(res, result, 'Submissions fetched');
}));

// ── P3-08d: PUT /submissions/:id/approve ──
router.put('/submissions/:id/approve', asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  if (!merchantId) {
    return sendError(res, 'Merchant authentication required', 401);
  }

  // Verify the submission belongs to a campaign owned by this merchant
  const submission = await PriveSubmission.findById(req.params.id).populate('campaignId', 'merchantId').lean();
  if (!submission) {
    return sendError(res, 'Submission not found', 404);
  }

  const campaign = submission.campaignId as any;
  const storeIds = await getMerchantStoreIds(merchantId);
  if (!storeIds.includes(campaign?.merchantId?.toString())) {
    return sendError(res, 'Access denied — this submission does not belong to your store', 403);
  }

  const result = await priveCampaignService.approveSubmission(
    req.params.id,
    merchantId,
    req.body.note
  );

  if (result.error) {
    return sendError(res, result.message!, result.status!);
  }

  return sendSuccess(res, result.data, 'Submission approved');
}));

// ── P3-08e: PUT /submissions/:id/reject ──
router.put('/submissions/:id/reject', asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  if (!merchantId) {
    return sendError(res, 'Merchant authentication required', 401);
  }

  // Verify ownership
  const submission = await PriveSubmission.findById(req.params.id).populate('campaignId', 'merchantId').lean();
  if (!submission) {
    return sendError(res, 'Submission not found', 404);
  }

  const campaign = submission.campaignId as any;
  const storeIds = await getMerchantStoreIds(merchantId);
  if (!storeIds.includes(campaign?.merchantId?.toString())) {
    return sendError(res, 'Access denied', 403);
  }

  if (!req.body.reason) {
    return sendError(res, 'reason is required', 400);
  }

  const result = await priveCampaignService.rejectSubmission(
    req.params.id,
    merchantId,
    req.body.reason,
    req.body.note
  );

  if (result.error) {
    return sendError(res, result.message!, result.status!);
  }

  return sendSuccess(res, result.data, 'Submission rejected');
}));

export default router;
