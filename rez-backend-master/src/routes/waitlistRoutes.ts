// @ts-nocheck
import { Router } from 'express';
import {
  addToWaitlist,
  getStoreWaitlist,
  getUserWaitlist,
  cancelWaitlistEntry,
  notifyWaitlistEntry,
} from '../controllers/waitlistController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

const timePattern = /^\d{2}:\d{2}$/;

// POST /api/waitlist — add to waitlist
router.post(
  '/',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      customerName: Joi.string().trim().min(2).max(100).required(),
      customerPhone: Joi.string().trim().min(7).max(20).required(),
      customerEmail: Joi.string().trim().email().optional(),
      serviceType: Joi.string().trim().min(2).max(200).required(),
      preferredDate: Joi.date().iso().required(),
      preferredTimeRange: Joi.object({
        from: Joi.string().pattern(timePattern).required(),
        to: Joi.string().pattern(timePattern).required(),
      }).optional(),
      duration: Joi.number().integer().min(15).max(480).optional(),
      staffId: commonSchemas.objectId().optional(),
    }),
  ),
  addToWaitlist,
);

// GET /api/waitlist/user — current user's waitlist entries
// Must come before /store/:storeId to avoid param shadowing
router.get('/user', authenticate, getUserWaitlist);

// GET /api/waitlist/store/:storeId — merchant gets their store waitlist
router.get(
  '/store/:storeId',
  authenticate,
  validateParams(Joi.object({ storeId: commonSchemas.objectId().required() })),
  validateQuery(
    Joi.object({
      status: Joi.string().valid('waiting', 'notified', 'booked', 'expired', 'cancelled').optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  ),
  getStoreWaitlist,
);

// DELETE /api/waitlist/:id — customer cancels their entry
router.delete(
  '/:id',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  cancelWaitlistEntry,
);

// PUT /api/waitlist/:id/notify — merchant marks entry as notified
router.put(
  '/:id/notify',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  notifyWaitlistEntry,
);

export default router;
