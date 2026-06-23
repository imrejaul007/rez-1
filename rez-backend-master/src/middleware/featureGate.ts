import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { sendSuccess, sendError } from '../utils/response';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('feature-gate');

interface FeatureGateOptions {
  /** HTTP status code when blocked (default 403) */
  errorCode?: number;
  /** If set, return 200 with this data instead of an error (graceful degradation) */
  emptyResponse?: Record<string, any>;
}

/**
 * Unified feature gate middleware.
 *
 * Checks the FeatureFlag DB for the given key, evaluating scope
 * (global/city/user) against the current request context.
 *
 * @example
 * // Hard block (403)
 * router.use(featureGate('spinWheel'));
 *
 * // Graceful degradation (200 with empty data)
 * router.use(featureGate('miniGames', { emptyResponse: { games: [] } }));
 */
export function featureGate(flagKey: string, options?: FeatureGateOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = {
        userId: (req as any).userId as string | undefined,
        city: (req as any).user?.profile?.location?.city
          || (req.headers['x-rez-region'] as string | undefined),
      };

      const enabled = await featureFlagService.isEnabled(flagKey, context);

      if (!enabled) {
        logger.info('Feature gate blocked request', {
          flagKey,
          userId: context.userId,
          city: context.city,
          path: req.path,
        });

        if (options?.emptyResponse !== undefined) {
          return sendSuccess(res, options.emptyResponse);
        }
        return sendError(res, 'This feature is not available', options?.errorCode || 403);
      }

      next();
    } catch (error) {
      // Fail-open on errors — don't block requests if flag service is down
      logger.error('Feature gate error, failing open', error as Error, { flagKey });
      next();
    }
  };
}
