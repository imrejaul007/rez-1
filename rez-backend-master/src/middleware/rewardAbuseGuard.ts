/**
 * src/middleware/rewardAbuseGuard.ts
 *
 * Express middleware for abuse prevention on reward endpoints.
 * Integrates with rewardAbuseDetector to block exploits before they reach reward logic.
 *
 * Attach to routes that issue coins:
 * - /api/challenges/:id/claim
 * - /api/bills/upload
 * - /api/referrals/complete
 * - /api/games/:gameType/claim
 */

import { Request, Response, NextFunction } from 'express';
import { createServiceLogger } from '../config/logger';
import rewardAbuseDetector from '../services/rewardAbuseDetector';

const logger = createServiceLogger('reward-abuse-guard');

export interface AbuseGuardRequest extends Request {
  abuseCheckPassed?: boolean;
  abuseReason?: string;
}

/**
 * Middleware: Check coin velocity before allowing reward issuance.
 */
export async function checkCoinVelocity(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;
  const amount = req.body?.amount || 1;

  if (!userId) {
    return next(); // Skip if no user context
  }

  try {
    const result = await rewardAbuseDetector.checkCoinVelocity(userId, amount);

    if (!result.allowed) {
      logger.warn('[RewardAbuseGuard] Coin velocity exceeded', {
        userId,
        amount,
        reason: result.reason,
      });

      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: result.reason || 'You are earning coins too quickly. Please try again later.',
        retryAfterSeconds: result.timeWindowSeconds,
      });
    }

    req.abuseCheckPassed = true;
    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Velocity check error', { error: (error as Error).message, userId });
    // Fail open — allow request to proceed
    next();
  }
}

/**
 * Middleware: Check event velocity before allowing reward action.
 */
export async function checkEventVelocity(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;
  const action = req.path.split('/')[1] || 'unknown';

  if (!userId) {
    return next();
  }

  try {
    const result = await rewardAbuseDetector.checkEarningEventVelocity(userId, action);

    if (!result.allowed) {
      logger.warn('[RewardAbuseGuard] Event velocity exceeded', {
        userId,
        action,
        reason: result.reason,
      });

      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: result.reason || 'You are performing this action too frequently. Please wait.',
        retryAfterSeconds: result.timeWindowSeconds,
      });
    }

    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Event velocity check error', { error: (error as Error).message, userId });
    next();
  }
}

/**
 * Middleware: Check device clustering before processing sensitive rewards.
 * Blocks requests from flagged device clusters (multi-account farming).
 */
export async function checkDeviceClustering(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;

  if (!userId) {
    return next();
  }

  try {
    const result = await rewardAbuseDetector.checkDeviceCluster(userId);

    if (result.flagged) {
      logger.error('[RewardAbuseGuard] Device clustering detected', {
        userId,
        accountsOnDevice: result.accountsOnDevice,
      });

      return res.status(403).json({
        error: 'DEVICE_CLUSTERING_DETECTED',
        message: 'Multiple accounts detected on this device. Please contact support.',
        metadata: { accountsOnDevice: result.accountsOnDevice },
      });
    }

    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Device clustering check error', {
      error: (error as Error).message,
      userId,
    });
    next();
  }
}

/**
 * Middleware: Check for bill upload farming before allowing bill rewards.
 */
export async function checkBillUploadFarming(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;
  const merchantId = req.body?.merchantId;
  const amount = req.body?.amount;

  if (!userId || !merchantId || !amount) {
    return next();
  }

  try {
    const result = await rewardAbuseDetector.checkBillDuplication(userId, merchantId, amount);

    if (!result.allowed) {
      logger.warn('[RewardAbuseGuard] Bill upload farming detected', {
        userId,
        merchantId,
        amount,
        reason: result.reason,
      });

      return res.status(429).json({
        error: 'BILL_UPLOAD_BLOCKED',
        message: result.reason || 'Bill upload blocked temporarily.',
        metadata: {
          lastUploadDate: result.lastUploadDate,
          minimumWaitHours: 72,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Bill upload farming check error', {
      error: (error as Error).message,
      userId,
    });
    next();
  }
}

/**
 * Middleware: Check for challenge farming before allowing challenge rewards.
 */
export async function checkChallengeFarming(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;
  const challengeId = req.params?.challengeId || req.body?.challengeId;

  if (!userId || !challengeId) {
    return next();
  }

  try {
    const result = await rewardAbuseDetector.checkChallengeFarming(userId, challengeId);

    if (!result.allowed) {
      logger.warn('[RewardAbuseGuard] Challenge farming detected', {
        userId,
        challengeId,
        reason: result.reason,
      });

      return res.status(429).json({
        error: 'CHALLENGE_BLOCKED',
        message: result.reason || 'Challenge reward blocked temporarily.',
        metadata: {
          completionCount: result.completionCount,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Challenge farming check error', {
      error: (error as Error).message,
      userId,
      challengeId,
    });
    next();
  }
}

/**
 * Middleware: Collect abuse signals and flag account if multiple patterns detected.
 */
export async function collectAbuseSignals(req: AbuseGuardRequest, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || req.body?.userId;

  if (!userId) {
    return next();
  }

  try {
    const signals = await rewardAbuseDetector.collectAbuseSignals(userId);

    if (signals.length > 2) {
      // Multiple signals = probable multi-vector attack
      logger.error('[RewardAbuseGuard] Multiple abuse signals detected on account', {
        userId,
        signalCount: signals.length,
        signals: signals.map((s) => ({ type: s.type, severity: s.severity })),
      });

      // Flag for manual review (don't block yet, let support investigate)
      (req as any).abuseSignals = signals;
    }

    next();
  } catch (error) {
    logger.error('[RewardAbuseGuard] Abuse signal collection error', {
      error: (error as Error).message,
      userId,
    });
    next();
  }
}

/**
 * Combined middleware: Run all abuse checks for sensitive reward endpoints.
 */
export const rewardAbuseGuardChain = [
  checkCoinVelocity,
  checkEventVelocity,
  checkDeviceClustering,
  collectAbuseSignals,
];

/**
 * Specialized middleware: For bill uploads.
 */
export const billUploadGuardChain = [checkCoinVelocity, checkEventVelocity, checkBillUploadFarming];

/**
 * Specialized middleware: For challenge completion.
 */
export const challengeGuardChain = [checkCoinVelocity, checkChallengeFarming];

export default {
  checkCoinVelocity,
  checkEventVelocity,
  checkDeviceClustering,
  checkBillUploadFarming,
  checkChallengeFarming,
  collectAbuseSignals,
  rewardAbuseGuardChain,
  billUploadGuardChain,
  challengeGuardChain,
};
