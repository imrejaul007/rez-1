import { Router } from 'express';
import {
  submitProject,
  getProjects,
  getProjectById,
  getProjectsByCategory,
  getFeaturedProjects,
  toggleProjectLike,
  addProjectComment,
  getMySubmissions,
  getEarningCategories
} from '../controllers/projectController';
import { uploadProjectFile, uploadMultipleProjectFiles } from '../controllers/uploadController';
import { uploadProjectFile as uploadMiddleware } from '../middleware/upload';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Upload project file (image or video) to Cloudinary
router.post('/upload',
  authenticate,
  uploadMiddleware.single('file'),
  uploadProjectFile
);

// Upload multiple project files (images/videos) to Cloudinary
router.post('/upload-multiple',
  authenticate,
  uploadMiddleware.array('files', 10), // Max 10 files
  uploadMultipleProjectFiles
);

// Submit a project (requires authentication)
router.post('/submit',
  authenticate,
  validate(Joi.object({
    projectId: commonSchemas.objectId().required(),
    content: Joi.alternatives().try(
      Joi.string().trim().min(1).max(5000),
      Joi.array().items(Joi.string().uri())
    ).required(),
    contentType: Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: Joi.string().trim().max(1000).optional(),
    metadata: Joi.object().optional()
  })),
  submitProject
);

// Get all projects with filtering
router.get('/', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().valid('review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral'),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    creator: commonSchemas.objectId(),
    status: Joi.string().valid('active', 'completed'),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('newest', 'popular', 'trending', 'difficulty_easy', 'difficulty_hard').default('newest'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    excludeUserSubmissions: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    ).optional()
  })),
  getProjects
);

// Get featured projects
router.get('/featured', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedProjects
);

// Get projects by category
router.get('/category/:category',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral').required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getProjectsByCategory
);

// Get earning project categories (public endpoint)
router.get('/categories',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  getEarningCategories
);

// Get user's project submissions (requires authentication)
router.get('/my-submissions',
  // generalLimiter,, // Disabled for development
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    sortBy: Joi.string().valid('newest', 'oldest', 'status').default('newest'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getMySubmissions
);

// Get single project by ID
router.get('/:projectId', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  getProjectById
);

// Like/Unlike project (requires authentication)
router.post('/:projectId/like', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  toggleProjectLike
);

// Add comment to project (requires authentication)
router.post('/:projectId/comments', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    projectId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    comment: Joi.string().trim().min(1).max(500).required()
  })),
  addProjectComment
);

export default router;