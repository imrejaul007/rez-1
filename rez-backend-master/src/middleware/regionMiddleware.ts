/**
 * Region Middleware
 * Validates region access for stores and products
 * Ensures users can only access resources in their selected region
 */

import { Request, Response, NextFunction } from 'express';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import {
  regionService,
  isValidRegion,
  RegionId,
  getRegionConfig,
  DEFAULT_REGION
} from '../services/regionService';
import { sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';

/**
 * Extended Request interface with region info
 */
export interface RegionRequest extends Request {
  region?: RegionId;
  regionConfig?: {
    id: RegionId;
    name: string;
    currency: string;
    currencySymbol: string;
    locale: string;
  };
}

/**
 * Middleware to extract and attach region from request headers
 * Does not enforce region, just attaches it to request for downstream use
 */
export const attachRegion = (req: RegionRequest, res: Response, next: NextFunction) => {
  const regionHeader = req.headers['x-rez-region'] as string;
  const regionQuery = req.query.region as string;

  const region = regionHeader || regionQuery;

  if (region && isValidRegion(region)) {
    req.region = region as RegionId;
    const config = getRegionConfig(region as RegionId);
    req.regionConfig = {
      id: config.id,
      name: config.name,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      locale: config.locale
    };
  } else {
    req.region = DEFAULT_REGION;
    const config = getRegionConfig(DEFAULT_REGION);
    req.regionConfig = {
      id: config.id,
      name: config.name,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      locale: config.locale
    };
  }

  next();
};

/**
 * Middleware to validate store access based on region
 * Use on routes like GET /stores/:storeId
 */
export const validateStoreRegionAccess = asyncHandler(async (
  req: RegionRequest,
  res: Response,
  next: NextFunction
) => {
  const regionHeader = req.headers['x-rez-region'] as string;

  // If no region header, skip validation (allow access)
  if (!regionHeader || !isValidRegion(regionHeader)) {
    return next();
  }

  const storeId = req.params.storeId || req.params.id || req.body.storeId;

  if (!storeId) {
    return next();
  }

  try {
    const store = await Store.findById(storeId).select('location.city name').lean();

    if (!store) {
      // Store not found - let the controller handle this
      return next();
    }

    const storeCity = store.location?.city;

    if (!regionService.validateStoreAccess(storeCity, regionHeader as RegionId)) {
      const suggestedRegion = regionService.getSuggestedRegion(storeCity);
      const suggestedConfig = getRegionConfig(suggestedRegion);

      logger.info('🚫 [REGION MIDDLEWARE] Access denied - Store:', store.name, 'City:', storeCity, 'User region:', regionHeader);

      return sendBadRequest(res, `This store is not available in your region. It's located in ${suggestedConfig.displayName}.`);
    }

    next();
  } catch (error) {
    logger.error('❌ [REGION MIDDLEWARE] Error validating store access:', error);
    next();
  }
});

/**
 * Middleware to validate product access based on region
 * Use on routes like GET /products/:productId
 */
export const validateProductRegionAccess = asyncHandler(async (
  req: RegionRequest,
  res: Response,
  next: NextFunction
) => {
  const regionHeader = req.headers['x-rez-region'] as string;

  // If no region header, skip validation (allow access)
  if (!regionHeader || !isValidRegion(regionHeader)) {
    return next();
  }

  const productId = req.params.productId || req.params.id || req.body.productId;

  if (!productId) {
    return next();
  }

  try {
    const product = await Product.findById(productId)
      .select('store name')
      .populate('store', 'location.city name')
      .lean() as any;

    if (!product || !product.store) {
      // Product not found - let the controller handle this
      return next();
    }

    const store = product.store;
    const storeCity = store.location?.city;

    if (!regionService.validateStoreAccess(storeCity, regionHeader as RegionId)) {
      const suggestedRegion = regionService.getSuggestedRegion(storeCity);
      const suggestedConfig = getRegionConfig(suggestedRegion);

      logger.info('🚫 [REGION MIDDLEWARE] Access denied - Product:', product.name, 'Store:', store.name, 'User region:', regionHeader);

      return sendBadRequest(res, `This product is not available in your region. It belongs to a store in ${suggestedConfig.displayName}.`);
    }

    next();
  } catch (error) {
    logger.error('❌ [REGION MIDDLEWARE] Error validating product access:', error);
    next();
  }
});

/**
 * Middleware to require region header
 * Use on routes that strictly require region context
 */
export const requireRegion = (req: RegionRequest, res: Response, next: NextFunction) => {
  const regionHeader = req.headers['x-rez-region'] as string;

  if (!regionHeader) {
    return sendBadRequest(res, 'X-Rez-Region header is required');
  }

  if (!isValidRegion(regionHeader)) {
    return sendBadRequest(res, 'Invalid region specified in X-Rez-Region header');
  }

  req.region = regionHeader as RegionId;
  const config = getRegionConfig(regionHeader as RegionId);
  req.regionConfig = {
    id: config.id,
    name: config.name,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    locale: config.locale
  };

  next();
};

/**
 * Middleware to log region for analytics
 */
export const logRegion = (req: RegionRequest, res: Response, next: NextFunction) => {
  const regionHeader = req.headers['x-rez-region'] as string;

  if (regionHeader && isValidRegion(regionHeader)) {
    logger.info(`🌍 [REGION] Request from region: ${regionHeader} - ${req.method} ${req.path}`);
  }

  next();
};
