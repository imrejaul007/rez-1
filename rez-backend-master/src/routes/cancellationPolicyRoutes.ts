// @ts-nocheck
import { Router } from 'express';
import { getPolicy, upsertPolicy } from '../controllers/cancellationPolicyController';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

// GET /api/cancellation-policy?storeId=...
router.get(
  '/',
  authenticate,
  validateQuery(
    Joi.object({
      storeId: commonSchemas.objectId().optional(),
    }),
  ),
  getPolicy,
);

// POST /api/cancellation-policy
router.post(
  '/',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      enabled: Joi.boolean().optional(),
      freeCancelHours: Joi.number().integer().min(0).max(720).optional(),
      lateFeeType: Joi.string().valid('percentage', 'fixed', 'none').optional(),
      lateFeeValue: Joi.number().min(0).max(100000).optional(),
      noShowFeeType: Joi.string().valid('percentage', 'fixed', 'none').optional(),
      noShowFeeValue: Joi.number().min(0).max(100000).optional(),
    }),
  ),
  upsertPolicy,
);

export default router;
