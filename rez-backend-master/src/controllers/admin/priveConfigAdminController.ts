/**
 * Prive Config Admin Controller
 *
 * Admin handlers for managing Prive program configuration:
 * tier thresholds, pillar weights, feature flags, and tier definitions.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { WalletConfig, IPriveProgramConfig, IPriveTierConfig } from '../../models/WalletConfig';
import { PriveAuditLog } from '../../models/PriveAuditLog';
import { getCachedWalletConfig, invalidateWalletConfigCache } from '../../services/walletCacheService';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TIERS: Array<'entry' | 'signature' | 'elite'> = ['entry', 'signature', 'elite'];

const VALID_PILLARS = ['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'] as const;

/**
 * Validate that tier thresholds are ascending and within 0-100.
 */
function validateTierThresholds(thresholds: IPriveProgramConfig['tierThresholds']): string | null {
  const { entryTier, signatureTier, eliteTier, trustMinimum } = thresholds;

  for (const [key, value] of Object.entries({ entryTier, signatureTier, eliteTier, trustMinimum })) {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${key} must be a number`;
    }
    if (value < 0 || value > 100) {
      return `${key} must be between 0 and 100`;
    }
  }

  if (entryTier >= signatureTier) {
    return 'entryTier must be less than signatureTier';
  }
  if (signatureTier >= eliteTier) {
    return 'signatureTier must be less than eliteTier';
  }

  return null;
}

/**
 * Validate that pillar weights sum to 1.0 (within 0.01 tolerance).
 */
function validatePillarWeights(weights: IPriveProgramConfig['pillarWeights']): string | null {
  for (const pillar of VALID_PILLARS) {
    const value = weights[pillar];
    if (typeof value !== 'number' || isNaN(value)) {
      return `pillarWeights.${pillar} must be a number`;
    }
    if (value < 0 || value > 1) {
      return `pillarWeights.${pillar} must be between 0 and 1`;
    }
  }

  const sum = VALID_PILLARS.reduce((acc, key) => acc + weights[key], 0);
  if (Math.abs(sum - 1.0) > 0.01) {
    return `Pillar weights must sum to 1.0 (current sum: ${sum.toFixed(4)})`;
  }

  return null;
}

/**
 * Validate that all required tiers are present.
 */
function validateTiers(tiers: IPriveTierConfig[]): string | null {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 'tiers must be a non-empty array';
  }

  const tierNames = tiers.map((t) => t.tier);
  for (const required of VALID_TIERS) {
    if (!tierNames.includes(required)) {
      return `Missing required tier: ${required}`;
    }
  }

  for (const tier of tiers) {
    if (!tier.displayName || typeof tier.displayName !== 'string') {
      return `Tier "${tier.tier}" must have a displayName`;
    }
    if (!tier.color || typeof tier.color !== 'string') {
      return `Tier "${tier.tier}" must have a color`;
    }
    if (typeof tier.coinMultiplier !== 'number' || tier.coinMultiplier <= 0) {
      return `Tier "${tier.tier}" must have a positive coinMultiplier`;
    }
  }

  return null;
}

/**
 * Create a PriveAuditLog entry for config changes.
 */
async function createAuditEntry(
  adminId: string | undefined,
  details: Record<string, any>,
  previousState?: Record<string, any>,
  newState?: Record<string, any>,
): Promise<void> {
  await PriveAuditLog.create({
    action: 'config_change',
    details,
    previousState,
    newState,
    performedBy: adminId ? new Types.ObjectId(adminId) : undefined,
    performerType: 'admin',
  });
}

// ─── GET Program Config ─────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/config
 * Returns the current priveProgramConfig from WalletConfig.
 */
export const getProgramConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await getCachedWalletConfig();

  if (!config) {
    throw new AppError('WalletConfig not found', 500, 'CONFIG_NOT_FOUND');
  }

  return sendSuccess(res, {
    priveProgramConfig: config.priveProgramConfig,
  }, 'Prive program config fetched');
});

// ─── UPDATE Full Program Config ─────────────────────────────────────────────

/**
 * PUT /api/admin/prive/config
 * Validates and updates the full priveProgramConfig.
 */
export const updateProgramConfig = asyncHandler(async (req: Request, res: Response) => {
  const { priveProgramConfig } = req.body;
  const adminId = req.userId;

  if (!priveProgramConfig || typeof priveProgramConfig !== 'object') {
    throw new AppError('priveProgramConfig object is required', 400, 'VALIDATION_ERROR');
  }

  const {
    tierThresholds,
    pillarWeights,
    tiers,
    featureFlags,
    dashboardCacheTtlSeconds,
    notificationConfig,
  } = priveProgramConfig;

  // Validate tier thresholds
  if (tierThresholds) {
    const thresholdError = validateTierThresholds(tierThresholds);
    if (thresholdError) {
      throw new AppError(thresholdError, 400, 'VALIDATION_ERROR');
    }
  }

  // Validate pillar weights
  if (pillarWeights) {
    const weightsError = validatePillarWeights(pillarWeights);
    if (weightsError) {
      throw new AppError(weightsError, 400, 'VALIDATION_ERROR');
    }
  }

  // Validate tiers
  if (tiers) {
    const tiersError = validateTiers(tiers);
    if (tiersError) {
      throw new AppError(tiersError, 400, 'VALIDATION_ERROR');
    }
  }

  const walletConfig = await WalletConfig.getOrCreate();
  const previousState = walletConfig.priveProgramConfig
    ? JSON.parse(JSON.stringify(walletConfig.priveProgramConfig))
    : {};

  // Apply all provided fields
  if (tierThresholds) {
    walletConfig.priveProgramConfig.tierThresholds = tierThresholds;
  }
  if (pillarWeights) {
    walletConfig.priveProgramConfig.pillarWeights = pillarWeights;
  }
  if (tiers) {
    walletConfig.priveProgramConfig.tiers = tiers;
  }
  if (featureFlags) {
    walletConfig.priveProgramConfig.featureFlags = {
      ...walletConfig.priveProgramConfig.featureFlags,
      ...featureFlags,
    };
  }
  if (typeof dashboardCacheTtlSeconds === 'number') {
    walletConfig.priveProgramConfig.dashboardCacheTtlSeconds = dashboardCacheTtlSeconds;
  }
  if (notificationConfig) {
    walletConfig.priveProgramConfig.notificationConfig = {
      ...walletConfig.priveProgramConfig.notificationConfig,
      ...notificationConfig,
    };
  }

  walletConfig.markModified('priveProgramConfig');
  await walletConfig.save();
  await invalidateWalletConfigCache();

  // Audit log
  await createAuditEntry(
    adminId,
    { section: 'priveProgramConfig', operation: 'full_update' },
    previousState,
    JSON.parse(JSON.stringify(walletConfig.priveProgramConfig)),
  );

  return sendSuccess(res, {
    priveProgramConfig: walletConfig.priveProgramConfig,
  }, 'Prive program config updated');
});

// ─── UPDATE Tier Thresholds ─────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/config/tier-thresholds
 * Updates only priveProgramConfig.tierThresholds.
 */
export const updateTierThresholds = asyncHandler(async (req: Request, res: Response) => {
  const { tierThresholds } = req.body;
  const adminId = req.userId;

  if (!tierThresholds || typeof tierThresholds !== 'object') {
    throw new AppError('tierThresholds object is required', 400, 'VALIDATION_ERROR');
  }

  const validationError = validateTierThresholds(tierThresholds);
  if (validationError) {
    throw new AppError(validationError, 400, 'VALIDATION_ERROR');
  }

  const walletConfig = await WalletConfig.getOrCreate();
  const previousState = JSON.parse(JSON.stringify(walletConfig.priveProgramConfig.tierThresholds));

  walletConfig.priveProgramConfig.tierThresholds = tierThresholds;
  walletConfig.markModified('priveProgramConfig');
  await walletConfig.save();
  await invalidateWalletConfigCache();

  await createAuditEntry(
    adminId,
    { section: 'priveProgramConfig.tierThresholds', operation: 'update' },
    { tierThresholds: previousState },
    { tierThresholds },
  );

  return sendSuccess(res, {
    tierThresholds: walletConfig.priveProgramConfig.tierThresholds,
  }, 'Tier thresholds updated');
});

// ─── UPDATE Pillar Weights ──────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/config/pillar-weights
 * Updates only priveProgramConfig.pillarWeights.
 */
export const updatePillarWeights = asyncHandler(async (req: Request, res: Response) => {
  const { pillarWeights } = req.body;
  const adminId = req.userId;

  if (!pillarWeights || typeof pillarWeights !== 'object') {
    throw new AppError('pillarWeights object is required', 400, 'VALIDATION_ERROR');
  }

  const validationError = validatePillarWeights(pillarWeights);
  if (validationError) {
    throw new AppError(validationError, 400, 'VALIDATION_ERROR');
  }

  const walletConfig = await WalletConfig.getOrCreate();
  const previousState = JSON.parse(JSON.stringify(walletConfig.priveProgramConfig.pillarWeights));

  walletConfig.priveProgramConfig.pillarWeights = pillarWeights;
  walletConfig.markModified('priveProgramConfig');
  await walletConfig.save();
  await invalidateWalletConfigCache();

  await createAuditEntry(
    adminId,
    { section: 'priveProgramConfig.pillarWeights', operation: 'update' },
    { pillarWeights: previousState },
    { pillarWeights },
  );

  return sendSuccess(res, {
    pillarWeights: walletConfig.priveProgramConfig.pillarWeights,
  }, 'Pillar weights updated');
});

// ─── UPDATE Feature Flags ───────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/config/feature-flags
 * Updates only priveProgramConfig.featureFlags.
 */
export const updateFeatureFlags = asyncHandler(async (req: Request, res: Response) => {
  const { featureFlags } = req.body;
  const adminId = req.userId;

  if (!featureFlags || typeof featureFlags !== 'object') {
    throw new AppError('featureFlags object is required', 400, 'VALIDATION_ERROR');
  }

  const walletConfig = await WalletConfig.getOrCreate();
  const previousState = JSON.parse(JSON.stringify(walletConfig.priveProgramConfig.featureFlags));

  walletConfig.priveProgramConfig.featureFlags = {
    ...walletConfig.priveProgramConfig.featureFlags,
    ...featureFlags,
  };
  walletConfig.markModified('priveProgramConfig');
  await walletConfig.save();
  await invalidateWalletConfigCache();

  await createAuditEntry(
    adminId,
    { section: 'priveProgramConfig.featureFlags', operation: 'update' },
    { featureFlags: previousState },
    { featureFlags: walletConfig.priveProgramConfig.featureFlags },
  );

  return sendSuccess(res, {
    featureFlags: walletConfig.priveProgramConfig.featureFlags,
  }, 'Feature flags updated');
});

// ─── UPDATE Tiers ───────────────────────────────────────────────────────────

/**
 * PUT /api/admin/prive/config/tiers
 * Updates only priveProgramConfig.tiers.
 */
export const updateTiers = asyncHandler(async (req: Request, res: Response) => {
  const { tiers } = req.body;
  const adminId = req.userId;

  if (!tiers || !Array.isArray(tiers)) {
    throw new AppError('tiers array is required', 400, 'VALIDATION_ERROR');
  }

  const validationError = validateTiers(tiers);
  if (validationError) {
    throw new AppError(validationError, 400, 'VALIDATION_ERROR');
  }

  const walletConfig = await WalletConfig.getOrCreate();
  const previousState = JSON.parse(JSON.stringify(walletConfig.priveProgramConfig.tiers));

  walletConfig.priveProgramConfig.tiers = tiers;
  walletConfig.markModified('priveProgramConfig');
  await walletConfig.save();
  await invalidateWalletConfigCache();

  await createAuditEntry(
    adminId,
    { section: 'priveProgramConfig.tiers', operation: 'update' },
    { tiers: previousState },
    { tiers },
  );

  return sendSuccess(res, {
    tiers: walletConfig.priveProgramConfig.tiers,
  }, 'Tier definitions updated');
});

// ─── GET Audit Log ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/prive/config/audit-log
 * Paginated list of PriveAuditLog entries with optional action and userId filters.
 */
export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (req.query.action) {
    filter.action = req.query.action;
  }

  if (req.query.userId) {
    const userId = req.query.userId as string;
    if (!Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid userId filter', 400, 'VALIDATION_ERROR');
    }
    filter.userId = new Types.ObjectId(userId);
  }

  const [logs, total] = await Promise.all([
    PriveAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'fullName phoneNumber')
      .lean(),
    PriveAuditLog.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Prive audit log fetched');
});
