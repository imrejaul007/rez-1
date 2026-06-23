import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validate, validateQuery, Joi } from '../middleware/validation';
import {
  getMerchantCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignSubmissions,
  approveSubmission,
  rejectSubmission,
  getCampaignStats,
} from '../controllers/merchant/priveCampaignMerchantController';

const router = Router();

// ─── All routes require merchant auth ────────────────────────────────────

router.use(authMiddleware);

// ─── Validation Schemas ────────────────────────────────────────────────────

const createCampaignSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().required(),
  shortDescription: Joi.string().max(500).optional(),
  type: Joi.string()
    .valid('photo_contest', 'video_contest', 'review_challenge', 'social_story', 'referral_drive', 'content_creation')
    .required(),
  image: Joi.string().uri().required(),
  bannerImage: Joi.string().uri().optional(),
  icon: Joi.string().optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  submissionDeadline: Joi.date().required(),
  rewards: Joi.array()
    .items(
      Joi.object({
        tier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum').required(),
        coins: Joi.number().min(0).required(),
        coinType: Joi.string().valid('rez', 'prive').default('prive'),
        badge: Joi.string().optional(),
        description: Joi.string().optional(),
      })
    )
    .optional(),
  totalRewardPool: Joi.number().min(0).required(),
  participationBonus: Joi.number().min(0).optional(),
  allowedFormats: Joi.array().items(Joi.string()).optional(),
  requiredTier: Joi.string().valid('none', 'entry', 'signature', 'elite').optional(),
  maxSubmissions: Joi.number().min(1).optional(),
});

const updateCampaignSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().optional(),
  shortDescription: Joi.string().max(500).optional(),
  status: Joi.string().valid('draft', 'active', 'paused', 'closed', 'archived').optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  priority: Joi.number().optional(),
}).min(1);

const campaignQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const submissionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const approveSubmissionSchema = Joi.object({
  awardTier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum').optional(),
  coinReward: Joi.number().min(0).optional(),
});

const rejectSubmissionSchema = Joi.object({
  rejectionReason: Joi.string().required(),
});

// ─── Campaign Management Routes ─────────────────────────────────────────────

/**
 * GET /api/merchant/prive/campaigns
 * List merchant's campaigns
 */
router.get(
  '/campaigns',
  validateQuery(campaignQuerySchema),
  getMerchantCampaigns
);

/**
 * POST /api/merchant/prive/campaigns
 * Create a new campaign
 */
router.post(
  '/campaigns',
  validate(createCampaignSchema),
  createCampaign
);

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId
 * Update campaign
 */
router.patch(
  '/campaigns/:campaignId',
  validate(updateCampaignSchema),
  updateCampaign
);

/**
 * DELETE /api/merchant/prive/campaigns/:campaignId
 * Delete campaign (soft delete)
 */
router.delete(
  '/campaigns/:campaignId',
  deleteCampaign
);

// ─── Submission Management Routes ───────────────────────────────────────────

/**
 * GET /api/merchant/prive/campaigns/:campaignId/submissions
 * Get submissions for a campaign
 */
router.get(
  '/campaigns/:campaignId/submissions',
  validateQuery(submissionQuerySchema),
  getCampaignSubmissions
);

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId/submissions/:submissionId/approve
 * Approve a submission
 */
router.patch(
  '/campaigns/:campaignId/submissions/:submissionId/approve',
  validate(approveSubmissionSchema),
  approveSubmission
);

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId/submissions/:submissionId/reject
 * Reject a submission
 */
router.patch(
  '/campaigns/:campaignId/submissions/:submissionId/reject',
  validate(rejectSubmissionSchema),
  rejectSubmission
);

/**
 * GET /api/merchant/prive/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get(
  '/campaigns/:campaignId/stats',
  getCampaignStats
);

export default router;
