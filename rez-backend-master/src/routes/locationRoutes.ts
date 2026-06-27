import { Router } from 'express';
import {
  updateUserLocation,
  getCurrentLocation,
  getLocationHistory,
  reverseGeocode,
  searchAddresses,
  validateAddress,
  getTimezone,
  getNearbyStores,
  getLocationStats,
} from '../controllers/locationController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validate, validateParams, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { regionService, getRegionConfig, getActiveRegions, isValidRegion, RegionId } from '../services/regionService';

const router = Router();
router.use(generalLimiter);

// Update user location
router.post('/update',    authenticate,
  validate(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().trim().max(500).optional(),
    source: Joi.string().valid('manual', 'gps', 'ip').default('manual'),
  })),
  updateUserLocation
);

// Get current user location
router.get('/current',    authenticate,
  getCurrentLocation
);

// Get location history
router.get('/history',    authenticate,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getLocationHistory
);

// Reverse geocoding - Convert coordinates to address
router.post('/geocode',    validate(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  })),
  reverseGeocode
);

// Search addresses
router.post('/search',    validate(Joi.object({
    query: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(10).default(5),
  })),
  searchAddresses
);

// Validate address
router.post('/validate',    validate(Joi.object({
    address: Joi.string().trim().max(500).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }).or('address', 'latitude', 'longitude')),
  validateAddress
);

// Get timezone for coordinates
router.get('/timezone',    validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  })),
  getTimezone
);

// Get nearby stores
router.get('/nearby-stores',    validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0.1).max(50).default(5),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getNearbyStores
);

// Get location statistics
router.get('/stats',    authenticate,
  getLocationStats
);

// ==================== REGION ROUTES ====================

// Get all available regions
router.get('/regions', asyncHandler(async (req, res) => {
  const regions = getActiveRegions().map(config => ({
    id: config.id,
    name: config.name,
    displayName: config.displayName,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    locale: config.locale,
    timezone: config.timezone,
    countryCode: config.countryCode,
    defaultCoordinates: {
      longitude: config.defaultCoordinates[0],
      latitude: config.defaultCoordinates[1]
    }
  }));

  sendSuccess(res, { regions }, 'Available regions retrieved successfully');
}));

// Detect user region from IP/headers/coordinates
router.get('/region/detect',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const detectedRegion = await regionService.detectRegionFromRequest(req);
    const config = getRegionConfig(detectedRegion);

    sendSuccess(res, {
      region: detectedRegion,
      config: {
        id: config.id,
        name: config.name,
        displayName: config.displayName,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        locale: config.locale,
        timezone: config.timezone,
        countryCode: config.countryCode,
        defaultCoordinates: {
          longitude: config.defaultCoordinates[0],
          latitude: config.defaultCoordinates[1]
        }
      }
    }, 'Region detected successfully');
  })
);

// Get region config by ID
router.get('/region/:regionId',
  validateParams(Joi.object({
    regionId: Joi.string().required()
  })),
  asyncHandler(async (req, res) => {
    const { regionId } = req.params;

    if (!isValidRegion(regionId)) {
      return sendSuccess(res, null, 'Invalid region ID', 400);
    }

    const config = getRegionConfig(regionId as RegionId);

    sendSuccess(res, {
      region: {
        id: config.id,
        name: config.name,
        displayName: config.displayName,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        locale: config.locale,
        timezone: config.timezone,
        countryCode: config.countryCode,
        defaultCoordinates: {
          longitude: config.defaultCoordinates[0],
          latitude: config.defaultCoordinates[1]
        },
        deliveryRadius: config.deliveryRadius
      }
    }, 'Region config retrieved successfully');
  })
);

export default router;
