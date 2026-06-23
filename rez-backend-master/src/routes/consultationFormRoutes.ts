// @ts-nocheck
import { Router } from 'express';
import {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  getSubmissions,
  getClientSubmissions,
} from '../controllers/consultationFormController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

const fieldSchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().trim().max(200).required(),
  type: Joi.string().valid('text', 'textarea', 'select', 'multiselect', 'checkbox', 'date', 'phone').required(),
  options: Joi.array().items(Joi.string().trim().max(100)).optional(),
  required: Joi.boolean().default(false),
  placeholder: Joi.string().trim().max(200).optional(),
  order: Joi.number().integer().min(0).default(0),
});

const formBodySchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  description: Joi.string().trim().max(500).optional().allow(''),
  fields: Joi.array().items(fieldSchema).default([]),
  isDefault: Joi.boolean().default(false),
  serviceIds: Joi.array().items(commonSchemas.objectId()).default([]),
  active: Joi.boolean().optional(),
});

const updateBodySchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  fields: Joi.array().items(fieldSchema).optional(),
  isDefault: Joi.boolean().optional(),
  serviceIds: Joi.array().items(commonSchemas.objectId()).optional(),
  active: Joi.boolean().optional(),
});

// GET /api/consultation-forms — list all forms for merchant's store
router.get('/', authenticate, getForms);

// GET /api/consultation-forms/client/:clientId/submissions — must come before /:id routes
router.get(
  '/client/:clientId/submissions',
  authenticate,
  validateParams(Joi.object({ clientId: commonSchemas.objectId().required() })),
  getClientSubmissions,
);

// GET /api/consultation-forms/:id — get single form
router.get('/:id', authenticate, validateParams(Joi.object({ id: commonSchemas.objectId().required() })), getForm);

// POST /api/consultation-forms — create new form
router.post('/', authenticate, validate(formBodySchema), createForm);

// PUT /api/consultation-forms/:id — update form
router.put(
  '/:id',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  validate(updateBodySchema),
  updateForm,
);

// DELETE /api/consultation-forms/:id — soft delete (set active=false)
router.delete(
  '/:id',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  deleteForm,
);

// GET /api/consultation-forms/:id/submissions — submissions for a form
router.get(
  '/:id/submissions',
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  getSubmissions,
);

export default router;
