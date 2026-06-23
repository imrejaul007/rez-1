import { Router } from 'express';
import {
  getOutlets,
  getOutletById,
  getOutletsByStore,
  getNearbyOutlets,
  getOutletOpeningHours,
  getOutletOffers,
  searchOutlets,
  getStoreOutletCount,
} from '../controllers/outletController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required)

// Get all outlets with filters
router.get(
  '/',
  optionalAuth,
  validateQuery(
    Joi.object({
      store: commonSchemas.objectId(),
      isActive: Joi.boolean(),
      sortBy: Joi.string().valid('name', 'createdAt').default('name'),
      order: Joi.string().valid('asc', 'desc').default('asc'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getOutlets
);

// Get nearby outlets based on location
router.get(
  '/nearby',
  optionalAuth,
  validateQuery(
    Joi.object({
      lng: Joi.number().required().min(-180).max(180),
      lat: Joi.number().required().min(-90).max(90),
      radius: Joi.number().min(0).max(100).default(10), // km
      limit: Joi.number().integer().min(1).max(50).default(20),
      store: commonSchemas.objectId(),
    })
  ),
  getNearbyOutlets
);

// Search outlets by name or address
router.post(
  '/search',
  optionalAuth,
  validate(
    Joi.object({
      query: Joi.string().required().trim().min(1).max(100),
      store: commonSchemas.objectId(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  searchOutlets
);

// Get outlets for a specific store
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
      isActive: Joi.boolean(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getOutletsByStore
);

// Get outlet count for a store
router.get(
  '/store/:storeId/count',
  optionalAuth,
  validateParams(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
    })
  ),
  getStoreOutletCount
);

// Get single outlet by ID
router.get(
  '/:id',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getOutletById
);

// Get opening hours for a specific outlet
router.get(
  '/:id/opening-hours',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getOutletOpeningHours
);

// Get offers available at a specific outlet
router.get(
  '/:id/offers',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getOutletOffers
);

export default router;
