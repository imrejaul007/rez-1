// @ts-nocheck
import { Router } from 'express';
import { createBlockedSlot, getBlockedSlots, deleteBlockedSlot } from '../controllers/blockedSlotController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

const timePattern = /^\d{2}:\d{2}$/;

// POST /api/blocked-slots — create a blocked slot
router.post(
  '/',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      date: Joi.date().iso().required(),
      startTime: Joi.string().pattern(timePattern).optional(),
      endTime: Joi.string().pattern(timePattern).optional(),
      reason: Joi.string().trim().max(200).optional(),
      isAllDay: Joi.boolean().default(false),
      staffId: commonSchemas.objectId().optional(),
      recurring: Joi.object({
        type: Joi.string().valid('weekly').required(),
        daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required(),
        until: Joi.date().iso().optional(),
      }).optional(),
    }),
  ),
  createBlockedSlot,
);

// GET /api/blocked-slots/store/:storeId — list blocked slots for a store
router.get(
  '/store/:storeId',
  authenticate,
  validateParams(Joi.object({ storeId: commonSchemas.objectId().required() })),
  validateQuery(
    Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
    }),
  ),
  getBlockedSlots,
);

// DELETE /api/blocked-slots/:id — delete a blocked slot
router.delete(
  '/:id',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  deleteBlockedSlot,
);

export default router;
