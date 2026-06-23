import { RequestHandler } from 'express';
import { logger } from '../config/logger';

/**
 * SEC-07: Multi-tenancy middleware
 *
 * Injects res.locals.merchantFilter so all merchant queries
 * are automatically scoped to the authenticated merchant.
 *
 * This prevents a merchant from accessing another merchant's data
 * through query manipulation or authorization bypass.
 *
 * Usage: router.use(requireMerchant, scopeToMerchant);
 * In controller: Model.find({ ...res.locals.merchantFilter, ...otherQuery })
 */
export const scopeToMerchant: RequestHandler = (req, res, next) => {
  try {
    // Extract merchantId from req (set by merchant auth middleware)
    const merchantId = (req as any).merchantId || (req as any).merchant?._id;

    if (!merchantId) {
      logger.warn('[Merchant Scope] Merchant context missing', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Merchant context required',
        code: 'MERCHANT_CONTEXT_REQUIRED'
      });
    }

    // Store merchant filter and ID in response locals
    // All DB queries should include this filter to scope data to the merchant
    res.locals.merchantFilter = { merchantId };
    res.locals.merchantId = merchantId.toString();

    logger.debug('[Merchant Scope] Merchant context set', {
      merchantId: res.locals.merchantId,
      path: req.path,
    });

    next();
  } catch (error: any) {
    logger.error('[Merchant Scope] Error setting merchant context', {
      error: error.message,
      path: req.path,
    });

    return res.status(500).json({
      success: false,
      message: 'Error validating merchant context',
      code: 'MERCHANT_CONTEXT_ERROR'
    });
  }
};

/**
 * Helper to use in controllers:
 * const filter = getMerchantFilter(res);
 *
 * Usage:
 * const filter = getMerchantFilter(res);
 * const orders = await Order.find({ ...filter, status: 'pending' });
 */
export const getMerchantFilter = (res: any): { merchantId: string } => {
  if (!res.locals.merchantFilter || !res.locals.merchantId) {
    throw new Error('Merchant filter not found in request context');
  }

  return {
    merchantId: res.locals.merchantId,
  };
};

/**
 * Alternative: Get merchant ID string from response locals
 */
export const getMerchantId = (res: any): string => {
  if (!res.locals.merchantId) {
    throw new Error('Merchant ID not found in request context');
  }

  return res.locals.merchantId;
};

/**
 * Verify that a resource belongs to the authenticated merchant
 * before allowing access.
 *
 * Usage in controller:
 * const order = await Order.findById(orderId);
 * verifyResourceOwnership(res, order.merchantId);
 */
export const verifyResourceOwnership = (res: any, resourceMerchantId: any): void => {
  const authenticatedMerchantId = res.locals.merchantId;
  const resourceId = resourceMerchantId?.toString();
  const authId = authenticatedMerchantId?.toString();

  if (resourceId !== authId) {
    logger.warn('[Merchant Scope] Unauthorized resource access attempt', {
      authenticatedMerchantId: authId,
      resourceMerchantId: resourceId,
      path: res.req?.path,
    });

    throw new Error('Unauthorized: Resource does not belong to this merchant');
  }
};
