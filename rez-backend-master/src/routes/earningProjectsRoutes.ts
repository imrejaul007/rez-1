import { Router } from 'express';
import {
  getEarningCategories,
  getProjects,
  getProjectById,
  submitProject
} from '../controllers/projectController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Get earning project categories
router.get('/categories',
  optionalAuth,
  getEarningCategories
);

// Get earning projects (alias to regular projects)
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().valid('review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral'),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    status: Joi.string().valid('active', 'completed'),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('newest', 'popular', 'trending', 'difficulty_easy', 'difficulty_hard').default('newest'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getProjects
);

// Get earning project by ID
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getProjectById
);

// Start an earning project (creates a submission)
router.post('/:id/start',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    content: Joi.alternatives().try(
      Joi.string().trim().min(1).max(5000),
      Joi.array().items(Joi.string().uri())
    ).optional(),
    contentType: Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: Joi.string().trim().max(1000).optional(),
    metadata: Joi.object().optional()
  })),
  asyncHandler(async (req, res, next) => {
    // Map to submitProject with projectId from params
    req.body.projectId = req.params.id;
    return submitProject(req, res, next);
  })
);

// Complete an earning project (marks submission as completed)
router.post('/:id/complete',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    submissionId: commonSchemas.objectId().optional(),
    content: Joi.alternatives().try(
      Joi.string().trim().min(1).max(5000),
      Joi.array().items(Joi.string().uri())
    ).optional(),
    contentType: Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: Joi.string().trim().max(1000).optional(),
    metadata: Joi.object().optional()
  })),
  asyncHandler(async (req, res, next) => {
    // For complete, we submit the work if not already submitted
    req.body.projectId = req.params.id;
    return submitProject(req, res, next);
  })
);

export default router;

