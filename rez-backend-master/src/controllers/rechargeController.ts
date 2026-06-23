import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { sendSuccess, sendError, sendBadRequest, sendNotFound, sendPaginated } from '../utils/response';
import RechargeOperator from '../models/RechargeOperator';
import { Transaction } from '../models/Transaction';
import redisService from '../services/redisService';

// ============================================
// CONSTANTS
// ============================================

const CACHE_KEY_OPERATORS = 'recharge:operators';
const CACHE_TTL_OPERATORS = 300; // 5 minutes

// ============================================
// HELPERS
// ============================================

function safeParseInt(value: any, fallback: number): number {
  const parsed = parseInt(value as string, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/recharge/operators?type=mobile&page=1&limit=10
 * List active operators, paginated, cached
 */
export const getOperators = asyncHandler(async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'mobile';
  const page = safeParseInt(req.query.page, 1);
  const limit = safeParseInt(req.query.limit, 10);
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const cacheKey = `${CACHE_KEY_OPERATORS}:${region || 'all'}:${type}:${page}:${limit}`;

  // Try cache first
  interface OperatorsCacheData {
    operators: any[];
    page: number;
    limit: number;
    total: number;
  }
  const cached = await redisService.get<OperatorsCacheData>(cacheKey);
  if (cached) {
    logger.debug(`[RECHARGE] Cache hit for operators: ${cacheKey}`);
    return sendPaginated(
      res,
      cached.operators,
      cached.page,
      cached.limit,
      cached.total,
      'Operators fetched successfully'
    );
  }

  const filter: any = { type, isActive: true };
  if (region) {
    filter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }
  const [operators, total] = await Promise.all([
    RechargeOperator.find(filter)
      .select('name code type logo color region countryCode currency')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RechargeOperator.countDocuments(filter),
  ]);

  // Cache the result
  await redisService.set<OperatorsCacheData>(
    cacheKey,
    { operators, page, limit, total },
    CACHE_TTL_OPERATORS
  );

  logger.info(`[RECHARGE] Fetched ${operators.length} operators (type=${type}, page=${page})`);

  return sendPaginated(res, operators, page, limit, total, 'Operators fetched successfully');
});

/**
 * GET /api/recharge/operators/:code/plans?sort=amount&page=1&limit=10
 * Get plans for a specific operator, paginated
 */
export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const sortField = (req.query.sort as string) || 'amount';
  const page = safeParseInt(req.query.page, 1);
  const limit = safeParseInt(req.query.limit, 10);

  const cacheKey = `recharge:plans:${code}:${sortField}:${page}:${limit}`;

  // Try cache first
  interface PlansCacheData {
    plans: any[];
    page: number;
    limit: number;
    total: number;
  }
  const cached = await redisService.get<PlansCacheData>(cacheKey);
  if (cached) {
    logger.debug(`[RECHARGE] Cache hit for plans: ${cacheKey}`);
    return sendPaginated(
      res,
      cached.plans,
      cached.page,
      cached.limit,
      cached.total,
      'Plans fetched successfully'
    );
  }

  const operator = await RechargeOperator.findOne({ code: code.toLowerCase(), isActive: true }).lean();
  if (!operator) {
    return sendNotFound(res, 'Operator not found');
  }

  // Sort plans
  const plans = [...operator.plans];
  const sortDir = sortField.startsWith('-') ? -1 : 1;
  const sortKey = sortField.replace(/^-/, '');
  plans.sort((a, b) => {
    const aVal = (a as any)[sortKey] ?? 0;
    const bVal = (b as any)[sortKey] ?? 0;
    return sortDir * (aVal > bVal ? 1 : aVal < bVal ? -1 : 0);
  });

  const total = plans.length;
  const paginatedPlans = plans.slice((page - 1) * limit, page * limit);

  // Cache the result
  await redisService.set<PlansCacheData>(
    cacheKey,
    { plans: paginatedPlans, page, limit, total },
    CACHE_TTL_OPERATORS
  );

  logger.info(`[RECHARGE] Fetched ${paginatedPlans.length} plans for operator=${code} (page=${page})`);

  return sendPaginated(res, paginatedPlans, page, limit, total, 'Plans fetched successfully');
});

/**
 * POST /api/recharge
 * Initiate a recharge: validate operator + amount + phone, create pending Transaction
 */
export const initiateRecharge = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { operatorCode, amount, phoneNumber, planId } = req.body;

  // Validate operator exists and is active
  const operator = await RechargeOperator.findOne({ code: operatorCode.toLowerCase(), isActive: true }).lean();
  if (!operator) {
    return sendBadRequest(res, 'Invalid or inactive operator');
  }

  // If planId provided, validate it exists
  let selectedPlan = null;
  if (planId) {
    selectedPlan = operator.plans.find((p: any) => p._id?.toString() === planId);
    if (!selectedPlan) {
      return sendBadRequest(res, 'Selected plan not found for this operator');
    }
  }

  // Generate unique transaction ID
  const transactionId = `RCH-${Date.now()}-${crypto.randomInt(100000, 999999)}`;

  // Create a pending transaction
  const transaction = await Transaction.create({
    transactionId,
    user: userId,
    type: 'debit',
    category: 'paybill',
    amount: Number(amount),
    currency: operator.currency || 'INR',
    description: `Mobile recharge for ${phoneNumber} via ${operator.name}`,
    source: {
      type: 'paybill',
      reference: operator._id,
      description: `Recharge - ${operator.name}`,
      metadata: {
        bonusInfo: {
          reason: 'recharge',
          campaign: operatorCode,
        },
      },
    },
    status: {
      current: 'pending',
      history: [{ status: 'pending', timestamp: new Date(), reason: 'Recharge initiated' }],
    },
    balanceBefore: 0,
    balanceAfter: 0,
  });

  logger.info(`[RECHARGE] Initiated recharge: txn=${transactionId}, user=${userId}, operator=${operatorCode}, amount=${amount}`);

  return sendSuccess(
    res,
    {
      transactionId: transaction.transactionId,
      operatorName: operator.name,
      operatorCode: operator.code,
      phoneNumber,
      amount: Number(amount),
      cashbackPercent: selectedPlan?.cashbackPercent || 0,
      status: 'pending',
    },
    'Recharge initiated successfully',
    201
  );
});
