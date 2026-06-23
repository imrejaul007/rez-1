// @ts-nocheck
import { Router } from 'express';
import { clockIn, clockOut, addBreak, getTimesheet, getCurrentStatus } from '../controllers/staffTimeController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

// POST /api/staff-time/clock-in — clock a staff member in
router.post(
  '/clock-in',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      staffId: commonSchemas.objectId().required(),
      staffName: Joi.string().trim().min(1).max(100).required(),
      notes: Joi.string().trim().max(500).optional(),
    }),
  ),
  clockIn,
);

// POST /api/staff-time/clock-out — clock a staff member out
router.post(
  '/clock-out',
  authenticate,
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      staffId: commonSchemas.objectId().required(),
      notes: Joi.string().trim().max(500).optional(),
    }),
  ),
  clockOut,
);

// PATCH /api/staff-time/:id/break — add break minutes to an entry
router.patch(
  '/:id/break',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  validate(
    Joi.object({
      breakMinutes: Joi.number().integer().min(1).max(480).required(),
      storeId: commonSchemas.objectId().optional(),
    }),
  ),
  addBreak,
);

// GET /api/staff-time/timesheet — get timesheet entries
router.get(
  '/timesheet',
  authenticate,
  validateQuery(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      dateFrom: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      dateTo: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      staffId: commonSchemas.objectId().optional(),
    }),
  ),
  getTimesheet,
);

// GET /api/staff-time/status — get current clock status for all staff today
router.get(
  '/status',
  authenticate,
  validateQuery(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
    }),
  ),
  getCurrentStatus,
);

export default router;
