// @ts-nocheck
import { Router } from 'express';
import {
  getRules,
  getRule,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
} from '../controllers/automationRuleController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

// All automation rule routes require merchant authentication
router.use(authenticate);

// GET /api/automation-rules?storeId=... — list all rules for a store
router.get('/', getRules);

// GET /api/automation-rules/:id — get single rule
router.get('/:id', validateParams(Joi.object({ id: commonSchemas.objectId().required() })), getRule);

// POST /api/automation-rules — create rule
router.post(
  '/',
  validate(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
      name: Joi.string().trim().min(1).max(200).required(),
      status: Joi.string().valid('active', 'paused', 'draft').optional(),
      trigger: Joi.object({
        type: Joi.string()
          .valid(
            'rebooking_overdue',
            'birthday',
            'post_visit_review',
            'visit_anniversary',
            'inactive_client',
            'first_visit',
          )
          .required(),
        config: Joi.object({
          daysSinceLastVisit: Joi.number().integer().min(1).optional(),
          daysBeforeBirthday: Joi.number().integer().min(0).optional(),
          hoursAfterVisit: Joi.number().integer().min(0).optional(),
          yearsAnniversary: Joi.number().integer().min(1).optional(),
        }).optional(),
      }).required(),
      action: Joi.object({
        type: Joi.string().valid('send_push', 'send_sms', 'send_email', 'give_coins').required(),
        config: Joi.object({
          title: Joi.string().trim().max(200).optional(),
          message: Joi.string().trim().min(1).max(1000).required(),
          coinAmount: Joi.number().integer().min(1).optional(),
          deepLink: Joi.string().uri().optional(),
        }).required(),
      }).required(),
    }),
  ),
  createRule,
);

// PUT /api/automation-rules/:id — update rule
router.put(
  '/:id',
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  validate(
    Joi.object({
      name: Joi.string().trim().min(1).max(200).optional(),
      status: Joi.string().valid('active', 'paused', 'draft').optional(),
      trigger: Joi.object({
        type: Joi.string()
          .valid(
            'rebooking_overdue',
            'birthday',
            'post_visit_review',
            'visit_anniversary',
            'inactive_client',
            'first_visit',
          )
          .required(),
        config: Joi.object({
          daysSinceLastVisit: Joi.number().integer().min(1).optional(),
          daysBeforeBirthday: Joi.number().integer().min(0).optional(),
          hoursAfterVisit: Joi.number().integer().min(0).optional(),
          yearsAnniversary: Joi.number().integer().min(1).optional(),
        }).optional(),
      }).optional(),
      action: Joi.object({
        type: Joi.string().valid('send_push', 'send_sms', 'send_email', 'give_coins').required(),
        config: Joi.object({
          title: Joi.string().trim().max(200).optional(),
          message: Joi.string().trim().min(1).max(1000).required(),
          coinAmount: Joi.number().integer().min(1).optional(),
          deepLink: Joi.string().uri().optional(),
        }).required(),
      }).optional(),
    }),
  ),
  updateRule,
);

// PATCH /api/automation-rules/:id/toggle — flip active/paused
router.patch('/:id/toggle', validateParams(Joi.object({ id: commonSchemas.objectId().required() })), toggleRule);

// DELETE /api/automation-rules/:id — delete rule
router.delete('/:id', validateParams(Joi.object({ id: commonSchemas.objectId().required() })), deleteRule);

export default router;
