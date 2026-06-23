import { Router } from 'express';
import {
  getStoreVouchers,
  getStoreVoucherById,
  claimStoreVoucher,
  redeemStoreVoucher,
  validateStoreVoucher,
  getMyStoreVouchers,
  getMyStoreVoucherById,
  removeClaimedVoucher,
} from '../controllers/storeVoucherController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required, but can use optionalAuth for personalization)

// Get store vouchers for a specific store
router.get(
  '/store/:storeId',
  optionalAuth,
  validateParams(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
    })
  ),
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getStoreVouchers
);

// Get single store voucher by ID
router.get(
  '/:id',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getStoreVoucherById
);

// Validate store voucher code
router.post(
  '/validate',
  optionalAuth,
  validate(
    Joi.object({
      code: Joi.string().required().trim().uppercase(),
      storeId: commonSchemas.objectId().required(),
      billAmount: Joi.number().required().min(0),
    })
  ),
  validateStoreVoucher
);

// Authenticated Routes (require user login)

// Claim a store voucher (assign to user)
router.post(
  '/:id/claim',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  claimStoreVoucher
);

// Redeem a claimed store voucher
router.post(
  '/:id/redeem',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  validate(
    Joi.object({
      orderId: commonSchemas.objectId().required(),
      billAmount: Joi.number().required().min(0),
    })
  ),
  redeemStoreVoucher
);

// Get user's claimed store vouchers
router.get(
  '/my-vouchers',
  authenticate,
  validateQuery(
    Joi.object({
      status: Joi.string().valid('assigned', 'used', 'expired'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getMyStoreVouchers
);

// Get single user voucher details
router.get(
  '/my-vouchers/:id',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getMyStoreVoucherById
);

// Remove a claimed voucher (only if not used)
router.delete(
  '/my-vouchers/:id',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  removeClaimedVoucher
);

export default router;
