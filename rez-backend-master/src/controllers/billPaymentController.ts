import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { BillProvider, BILL_TYPES, BillType } from '../models/BillProvider';
import { BillPayment } from '../models/BillPayment';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendPaginated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import crypto from 'crypto';
import { bbpsService } from '../services/bbpsService';
import rewardEngine from '../core/rewardEngine';
import gamificationEventBus from '../events/gamificationEventBus';

// ============================================
// BILL TYPE METADATA (icons/labels for frontend)
// ============================================

const BILL_TYPE_META: Record<BillType, { label: string; icon: string; color: string; category: string }> = {
  electricity:     { label: 'Electricity',   icon: 'flash-outline',           color: '#F59E0B', category: 'electricity' },
  water:           { label: 'Water',          icon: 'water-outline',           color: '#3B82F6', category: 'water' },
  gas:             { label: 'Gas',            icon: 'flame-outline',           color: '#EF4444', category: 'gas' },
  internet:        { label: 'Internet',       icon: 'wifi-outline',            color: '#8B5CF6', category: 'broadband' },
  mobile_postpaid: { label: 'Postpaid',       icon: 'phone-portrait-outline',  color: '#D97706', category: 'telecom' },
  mobile_prepaid:  { label: 'Recharge',       icon: 'phone-portrait-outline',  color: '#10B981', category: 'telecom' },
  broadband:       { label: 'Broadband',      icon: 'tv-outline',              color: '#EC4899', category: 'broadband' },
  dth:             { label: 'DTH',            icon: 'radio-outline',           color: '#06B6D4', category: 'dth' },
  landline:        { label: 'Landline',       icon: 'call-outline',            color: '#6366F1', category: 'telecom' },
  insurance:       { label: 'Insurance',      icon: 'shield-checkmark-outline',color: '#6B7280', category: 'insurance' },
  fastag:          { label: 'FASTag',         icon: 'car-outline',             color: '#F97316', category: 'fastag' },
  education_fee:   { label: 'School Fees',    icon: 'school-outline',          color: '#8B5CF6', category: 'education' },
};

// ============================================
// GET /api/bill-payments/types
// Returns distinct bill types with metadata + provider counts
// ============================================

export const getBillTypes = asyncHandler(async (req: Request, res: Response) => {
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();
  const cacheKey = `bill-payments:types:${region || 'all'}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  // Build match filter: region-specific + global (empty region)
  const matchFilter: any = { isActive: true };
  if (region) {
    matchFilter.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  // Aggregate provider counts per type
  const counts = await BillProvider.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) {
    countMap[c._id] = c.count;
  }

  const types = BILL_TYPES.map((type) => ({
    id: type,
    ...BILL_TYPE_META[type],
    providerCount: countMap[type] || 0,
  }));

  await redisService.set(cacheKey, types, 300).catch((err) => logger.warn('[BillPayment] Cache set for bill types failed', { error: err.message }));

  sendSuccess(res, types);
});

// ============================================
// GET /api/bill-payments/providers?type=electricity&page=1&limit=10
// Returns paginated providers for a given bill type
// ============================================

export const getProviders = asyncHandler(async (req: Request, res: Response) => {
  const { type, page = '1', limit = '10' } = req.query;

  if (!type || !BILL_TYPES.includes(type as BillType)) {
    throw new AppError('Valid bill type is required', 400);
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const cacheKey = `bill-payments:providers:${region || 'all'}:${type}:${pageNum}:${limitNum}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const query: any = { type: type as BillType, isActive: true };
  if (region) {
    query.$or = [{ region }, { region: '' }, { region: { $exists: false } }];
  }

  const [providers, total] = await Promise.all([
    BillProvider.find(query)
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    BillProvider.countDocuments(query),
  ]);

  const data = {
    providers,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };

  await redisService.set(cacheKey, data, 300).catch((err) => logger.warn('[BillPayment] Cache set for providers failed', { error: err.message }));

  sendSuccess(res, data);
});

// ============================================
// POST /api/bill-payments/fetch-bill
// Validates provider + customer number, returns bill info
// (Simulated — in production this would call the utility provider API)
// ============================================

export const fetchBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { providerId, customerNumber } = req.body;

  if (!providerId || !customerNumber) {
    throw new AppError('Provider ID and customer number are required', 400);
  }

  const provider = await BillProvider.findOne({
    _id: providerId,
    isActive: true,
  }).lean();

  if (!provider) {
    return sendNotFound(res, 'Provider not found');
  }

  // For mobile_prepaid — skip fetchBill (user selects plan instead)
  if (provider.type === 'mobile_prepaid') {
    return sendSuccess(res, {
      provider: { _id: provider._id, name: provider.name, code: provider.code, logo: provider.logo, type: provider.type },
      customerNumber,
      billType: 'mobile_prepaid',
      requiresPlanSelection: true,
      promoCoins: (provider as any).promoCoinsFixed || 0,
      promoExpiryDays: (provider as any).promoExpiryDays || 7,
    }, 'Select a recharge plan');
  }

  // For all other types — call real BBPS API
  const billInfo = await bbpsService.fetchBill(
    (provider as any).aggregatorCode || provider.code,
    customerNumber
  );

  const response = {
    provider: { _id: provider._id, name: provider.name, code: provider.code, logo: provider.logo, type: provider.type },
    customerNumber,
    amount: billInfo.billAmount,
    dueDate: billInfo.dueDate,
    billDate: billInfo.billDate,
    consumerName: billInfo.consumerName,
    billNumber: billInfo.billNumber,
    cashbackPercent: provider.cashbackPercent,
    cashbackAmount: Math.round((billInfo.billAmount * provider.cashbackPercent) / 100),
    promoCoins: (provider as any).promoCoinsFixed || 0,
    promoExpiryDays: (provider as any).promoExpiryDays || 7,
    maxRedemptionPercent: (provider as any).maxRedemptionPercent || 15,
    additionalInfo: billInfo.additionalInfo,
  };

  sendSuccess(res, response, 'Bill fetched successfully');
});

// ============================================
// POST /api/bill-payments/pay
// Creates a BillPayment record, calculates cashback
// ============================================

export const payBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { providerId, customerNumber, amount, razorpayPaymentId, planId } = req.body;

  if (!providerId || !customerNumber || !amount) {
    throw new AppError('Provider ID, customer number, and amount are required', 400);
  }
  if (amount <= 0) throw new AppError('Amount must be greater than 0', 400);

  const provider = await BillProvider.findOne({ _id: providerId, isActive: true }).lean();
  if (!provider) return sendNotFound(res, 'Provider not found');

  const cashbackAmount = Math.round((amount * provider.cashbackPercent) / 100);
  const promoCoins = (provider as any).promoCoinsFixed || 0;
  const promoExpiryDays = (provider as any).promoExpiryDays || 7;
  const maxRedemptionPct = (provider as any).maxRedemptionPercent || 15;
  const transactionRef = `BP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // 1. Create BillPayment record as 'processing'
  const payment = await BillPayment.create({
    userId: req.user._id,
    provider: provider._id,
    billType: provider.type,
    customerNumber,
    amount,
    cashbackAmount,
    promoCoinsIssued: promoCoins,
    promoExpiryDays,
    maxRedemptionPercent: maxRedemptionPct,
    status: 'processing',
    transactionRef,
    aggregatorName: (provider as any).aggregatorName || 'razorpay',
    razorpayPaymentId: razorpayPaymentId || undefined,
    walletDebited: false,
    walletDebitedAmount: 0,
  });

  try {
    // 2. Call BBPS API to pay the bill
    const bbpsResult = await bbpsService.payBill({
      operatorCode: (provider as any).aggregatorCode || provider.code,
      customerNumber,
      amount,
      razorpayPaymentId: razorpayPaymentId || transactionRef,
      internalRef: transactionRef,
      planId,
    });

    // 3. Update payment record
    await BillPayment.findByIdAndUpdate(payment._id, {
      status: bbpsResult.status === 'SUCCESS' ? 'completed' : 'processing',
      aggregatorRef: bbpsResult.transactionId,
      webhookVerified: false,
      paidAt: bbpsResult.status === 'SUCCESS' ? new Date() : undefined,
    });

    // 4. Issue promo coins if payment succeeded
    if (bbpsResult.status === 'SUCCESS' && promoCoins > 0) {
      const userId = (req as any).user?._id?.toString() || (req as any).user?.id;
      const paymentId = (payment as any)._id?.toString();
      await rewardEngine.issue({
        userId,
        amount: promoCoins,
        rewardType: 'bill_payment',
        coinType: 'promo',
        source: `bill_payment:${paymentId}`,
        description: `${promoCoins} promo coins for ${provider.name} payment`,
        operationType: 'loyalty_credit',
        referenceId: paymentId,
        referenceModel: 'BillPayment',
        metadata: { billType: provider.type, providerName: provider.name, promoExpiryDays, maxRedemptionPercent: maxRedemptionPct },
      });
    }

    // 5. Fire gamification event
    if (bbpsResult.status === 'SUCCESS') {
      const userId = (req as any).user?._id?.toString() || (req as any).user?.id;
      gamificationEventBus.emit('bill_payment_confirmed', {
        userId,
        metadata: { billType: provider.type, amount, providerName: provider.name },
        source: { controller: 'billPayment', action: 'payBill' },
      });
    }

    // 6. Invalidate history cache
    await redisService.delPattern(`bill-payments:history:${req.user._id}:*`).catch(() => {});

    const populated = await BillPayment.findById(payment._id)
      .populate('provider', 'name code logo type')
      .lean();

    sendSuccess(res, {
      payment: populated,
      promoCoinsEarned: bbpsResult.status === 'SUCCESS' ? promoCoins : 0,
      promoExpiryDays: bbpsResult.status === 'SUCCESS' ? promoExpiryDays : 0,
      status: bbpsResult.status,
      message: bbpsResult.status === 'SUCCESS'
        ? `${provider.name} payment of ₹${amount} successful!${promoCoins > 0 ? ` You earned ${promoCoins} coins.` : ''}`
        : 'Payment is being processed. We\'ll notify you when confirmed.',
    }, 'Payment processed', 201);

  } catch (err) {
    await BillPayment.findByIdAndUpdate(payment._id, { status: 'failed' });
    throw err;
  }
});

// ============================================
// GET /api/bill-payments/history?page=1&limit=10&billType=electricity
// Returns user's past payments, paginated
// ============================================

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { page = '1', limit = '10', billType } = req.query;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

  const cacheKey = `bill-payments:history:${req.user._id}:${billType || 'all'}:${pageNum}:${limitNum}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const query: any = { userId: req.user._id };
  if (billType && BILL_TYPES.includes(billType as BillType)) {
    query.billType = billType;
  }

  const [payments, total] = await Promise.all([
    BillPayment.find(query)
      .populate('provider', 'name code logo type')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    BillPayment.countDocuments(query),
  ]);

  const data = {
    payments,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };

  await redisService.set(cacheKey, data, 60).catch((err) => logger.warn('[BillPayment] Cache set for payment history failed', { error: err.message }));

  sendSuccess(res, data);
});

// ============================================
// GET /api/bill-payments/plans?providerId=xxx&circle=KA
// Returns prepaid recharge plans for a mobile operator
// ============================================

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Authentication required', 401);

  const { providerId, circle = 'KA' } = req.query;
  if (!providerId) throw new AppError('Provider ID required', 400);

  const provider = await BillProvider.findOne({ _id: providerId, isActive: true }).lean();
  if (!provider) return sendNotFound(res, 'Provider not found');

  const cacheKey = `bbps:plans:${(provider as any).aggregatorCode}:${circle}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) return sendSuccess(res, cached);

  const plans = await bbpsService.getPlans((provider as any).aggregatorCode || provider.code, circle as string);

  const grouped = {
    popular: plans.filter(p => p.isPopular),
    allPlans: plans,
  };

  await redisService.set(cacheKey, grouped, 3600);
  sendSuccess(res, grouped, 'Plans fetched');
});

// ============================================
// POST /api/bill-payments/refund
// Request refund for a completed payment
// ============================================

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Authentication required', 401);

  const { paymentId, reason } = req.body;
  const payment = await BillPayment.findOne({ _id: paymentId, userId: req.user._id });

  if (!payment) return sendNotFound(res, 'Payment not found');
  if (payment.status !== 'completed') throw new AppError('Only completed payments can be refunded', 400);
  if (payment.refundStatus !== 'none') throw new AppError('Refund already requested', 400);
  if (!payment.aggregatorRef) throw new AppError('No aggregator reference for refund', 400);

  await BillPayment.findByIdAndUpdate(payment._id, {
    refundStatus: 'pending',
    refundReason: reason || 'User requested',
    refundAmount: payment.amount,
  });

  const { refundId } = await bbpsService.initiateRefund(payment.aggregatorRef, payment.amount, reason || 'User requested');

  await BillPayment.findByIdAndUpdate(payment._id, { refundRef: refundId });

  sendSuccess(res, { refundId, status: 'pending' }, 'Refund initiated. Will credit in 5-7 business days.');
});

// ============================================
// POST /api/bill-payments/webhook/bbps
// Handle BBPS webhooks from Razorpay (no auth)
// ============================================

export const handleBBPSWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Validate Razorpay webhook signature
  const signature = req.headers['x-razorpay-signature'] as string;
  if (signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      // SECURITY: use raw bytes (captured by express.json({verify})), not a
      // re-serialization. Razorpay signs the exact bytes the sender sent.
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update((req as any).rawBody || JSON.stringify(req.body))
        .digest('hex');
      if (signature !== expectedSignature) {
        logger.error('[BBPS WEBHOOK] Invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }
  }

  const event = req.body;
  const eventType = event?.event;

  if (eventType === 'bbps.payment.completed') {
    const { transaction_id, reference_id, status } = event.payload || {};
    await BillPayment.findOneAndUpdate(
      { transactionRef: reference_id },
      {
        status: status === 'SUCCESS' ? 'completed' : 'failed',
        aggregatorRef: transaction_id,
        webhookVerified: true,
        paidAt: status === 'SUCCESS' ? new Date() : undefined,
      }
    );
    logger.info('[BBPS WEBHOOK] Payment updated', { reference_id, status });
  }

  if (eventType === 'bbps.refund.processed') {
    const { reference_id, refund_id } = event.payload || {};
    await BillPayment.findOneAndUpdate(
      { transactionRef: reference_id },
      { refundStatus: 'processed', refundRef: refund_id, refundedAt: new Date() }
    );
    logger.info('[BBPS WEBHOOK] Refund processed', { reference_id, refund_id });
  }

  res.json({ received: true });
});
