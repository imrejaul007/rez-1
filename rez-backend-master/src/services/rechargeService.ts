/**
 * RechargeService — orchestrates the full recharge lifecycle:
 * 1. Verify Razorpay payment
 * 2. Create RechargeTransaction record
 * 3. Call operator API via RechargeGateway
 * 4. Issue promo coins via rewardEngine
 * 5. Handle failures and refunds
 */

import RechargeTransaction from '../models/RechargeTransaction';
import { BillProvider } from '../models/BillProvider';
import rechargeGateway from './rechargeGateway';
import rewardEngine from '../core/rewardEngine';
import { createServiceLogger } from '../config/logger';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/sanitize';

const logger = createServiceLogger('recharge-service');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProcessRechargeParams {
  userId: string;
  mobile: string;
  operator: string;
  circle: string;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

export const processRecharge = async (
  params: ProcessRechargeParams,
): Promise<{
  success: boolean;
  transaction: any;
  message: string;
}> => {
  // Idempotency guard: use findOneAndUpdate to atomically check and create in one operation
  // If a doc with this paymentId already exists in any status, return it
  let txn = await RechargeTransaction.findOne({
    razorpayPaymentId: params.razorpayPaymentId,
  });

  if (txn) {
    logger.info('[RechargeService] Idempotent: already processed', params.razorpayPaymentId);
    return { success: txn.status === 'success', transaction: txn, message: 'Already processed' };
  }

  // Create transaction record with unique constraint on razorpayPaymentId
  // (requires schema to have unique index on razorpayPaymentId)
  try {
    txn = await RechargeTransaction.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      mobile: params.mobile,
      operator: params.operator,
      circle: params.circle,
      amount: params.amount,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      status: 'processing',
    });
  } catch (createErr: any) {
    // Handle duplicate key error if concurrent requests create same paymentId
    if (createErr.code === 11000 && createErr.keyPattern?.razorpayPaymentId) {
      const existing = await RechargeTransaction.findOne({
        razorpayPaymentId: params.razorpayPaymentId,
      });
      if (existing) {
        logger.info('[RechargeService] Race condition handled: idempotent retry', params.razorpayPaymentId);
        return { success: existing.status === 'success', transaction: existing, message: 'Already processed' };
      }
    }
    throw createErr;
  }

  let lastError: string = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await rechargeGateway.rechargeMobile({
        mobile: params.mobile,
        operator: params.operator,
        circle: params.circle,
        amount: params.amount,
        referenceId: (txn._id as any).toString(),
      });

      if (result.status === 'success') {
        // Determine coins to issue based on BillProvider config
        let coinsIssued = 0;
        let coinType = 'promo';
        try {
          const provider = await BillProvider.findOne({
            type: 'mobile_prepaid',
            $or: [{ code: params.operator.toLowerCase() }, { name: new RegExp(escapeRegex(params.operator), 'i') }],
          }).lean();

          if (provider?.promoCoinsFixed) {
            coinsIssued = provider.promoCoinsFixed;
          } else {
            coinsIssued = Math.floor(params.amount * 0.01);
          }
        } catch {
          coinsIssued = Math.floor(params.amount * 0.01);
        }

        // Issue coins
        if (coinsIssued > 0) {
          try {
            await rewardEngine.issue({
              userId: params.userId,
              amount: coinsIssued,
              rewardType: 'bill_payment',
              source: 'recharge',
              description: `${params.amount} ${params.operator} recharge`,
              operationType: 'loyalty_credit',
              referenceId: `recharge:${(txn._id as any).toString()}`,
              referenceModel: 'RechargeTransaction',
              coinType: coinType as any,
            });
          } catch (rewardErr: any) {
            logger.error('[RechargeService] Coin issuance failed (non-fatal):', rewardErr.message);
          }
        }

        // Mark success
        await RechargeTransaction.findByIdAndUpdate(txn._id, {
          status: 'success',
          operatorRefId: result.operatorRefId,
          coinsIssued,
          coinType,
        });

        logger.info('[RechargeService] Recharge successful', {
          txnId: txn._id,
          operatorRefId: result.operatorRefId,
          coinsIssued,
        });

        return {
          success: true,
          transaction: { ...txn.toObject(), status: 'success', operatorRefId: result.operatorRefId, coinsIssued },
          message: `Recharge of ₹${params.amount} successful. ${coinsIssued > 0 ? `${coinsIssued} coins added to wallet.` : ''}`,
        };
      }

      if (result.status === 'pending') {
        await RechargeTransaction.findByIdAndUpdate(txn._id, {
          status: 'pending',
          operatorRefId: result.operatorRefId,
          retryCount: attempt,
        });
        return {
          success: false,
          transaction: txn,
          message: 'Recharge is processing. Your balance will be updated within 30 minutes.',
        };
      }

      lastError = result.message;
      logger.warn(`[RechargeService] Attempt ${attempt} failed:`, result.message);
    } catch (err: any) {
      lastError = err.message;
      if (err.message === 'TRANSIENT_ERROR' && attempt < MAX_RETRIES) {
        logger.warn(`[RechargeService] Transient error, retrying in ${RETRY_DELAY_MS * attempt}ms`);
        await sleep(RETRY_DELAY_MS * attempt);
        await RechargeTransaction.findByIdAndUpdate(txn._id, { retryCount: attempt });
        continue;
      }
      break;
    }
  }

  // All retries exhausted — mark failed
  await RechargeTransaction.findByIdAndUpdate(txn._id, {
    status: 'failed',
    errorMessage: lastError,
    retryCount: MAX_RETRIES,
  });

  logger.error('[RechargeService] All retries exhausted', { txnId: txn._id, lastError });

  return {
    success: false,
    transaction: { ...txn.toObject(), status: 'failed' },
    message: 'Recharge failed. Your payment will be refunded within 3-5 business days.',
  };
};

export const getRechargeHistory = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    RechargeTransaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RechargeTransaction.countDocuments({ userId }),
  ]);
  return { transactions, total, page, limit, pages: Math.ceil(total / limit) };
};

export const rechargeService = { processRecharge, getRechargeHistory };
export default rechargeService;
