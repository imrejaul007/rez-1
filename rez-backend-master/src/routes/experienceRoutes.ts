import { Router } from 'express';
import {
  getExperiences,
  getExperienceById,
  getStoresByExperience,
  getHomepageExperiences,
  getUniqueFinds,
} from '../controllers/experienceController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, Joi } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/experiences
 * @desc    Get all active store experiences
 * @access  Public
 */
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    featured: Joi.string().valid('true', 'false'),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getExperiences
);

/**
 * @route   GET /api/experiences/homepage
 * @desc    Get experiences for homepage section
 * @access  Public
 */
router.get('/homepage',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4),
  })),
  getHomepageExperiences
);

/**
 * @route   GET /api/experiences/unique-finds
 * @desc    Get unique finds for Think Outside the Box
 * @access  Public
 */
router.get('/unique-finds',
  optionalAuth, // Public access
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10),
    experience: Joi.string().optional(),
    q: Joi.string().optional(),
  })),
  getUniqueFinds
);

/**
 * @route   GET /api/experiences/:experienceId
 * @desc    Get single experience by ID or slug
 * @access  Public
 */
router.get('/:experienceId',
  optionalAuth,
  validateParams(Joi.object({
    experienceId: Joi.string().required(),
  })),
  getExperienceById
);

/**
 * @route   GET /api/experiences/:experienceId/stores
 * @desc    Get stores matching an experience
 * @access  Public
 */
router.get('/:experienceId/stores',
  optionalAuth,
  validateParams(Joi.object({
    experienceId: Joi.string().required(),
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
    q: Joi.string().optional(),
  })),
  getStoresByExperience
);

export default router;
