// @ts-nocheck
import { Router } from 'express';
import { getDepositPolicy, upsertDepositPolicy } from '../controllers/depositPolicyController';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

// GET /api/deposit-policy — retrieve policy for merchant's store
router.get(
  '/',
  authenticate,
  validateQuery(
    Joi.object({
      storeId: commonSchemas.objectId().optional(),
    }),
  ),
  getDepositPolicy,
);

// PUT /api/deposit-policy — create or update policy
router.put(
  '/',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      enabled: Joi.boolean().optional(),
      depositType: Joi.string().valid('fixed', 'percentage').optional(),
      depositValue: Joi.number().min(0).max(100000).optional(),
      requireForNewClients: Joi.boolean().optional(),
      requireForAll: Joi.boolean().optional(),
      cancellationPolicy: Joi.object({
        hoursNotice: Joi.number().integer().min(0).max(168).optional(),
        lateFee: Joi.number().min(0).optional(),
        lateFeeType: Joi.string().valid('fixed', 'percentage').optional(),
        message: Joi.string().trim().max(500).optional(),
      }).optional(),
    }),
  ),
  upsertDepositPolicy,
);

export default router;
