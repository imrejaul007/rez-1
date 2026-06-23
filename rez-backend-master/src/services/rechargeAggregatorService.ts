/**
 * Recharge Aggregator Service
 *
 * Stub adapter for mobile recharge aggregators.
 * In production, connect one of: Eko API, PaySprint, Fino Payments Bank, or IRCTC Prepaid API
 */

import { logger } from '../config/logger';

export class RechargeAggregatorService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!process.env.RECHARGE_AGGREGATOR_API_KEY;
    if (!this.isConfigured) {
      logger.warn('[RechargeAggregator] NOT configured. Set RECHARGE_AGGREGATOR_API_KEY.');
    }
  }

  async executeRecharge(params: {
    operatorCode: string;
    mobileNumber: string;
    amount: number;
    transactionId: string;
  }): Promise<{ success: boolean; operatorRef?: string; error?: string }> {
    if (!this.isConfigured) {
      logger.error('[RechargeAggregator] NOT configured — rejecting recharge to prevent silent money loss', {
        mobileNumber: params.mobileNumber,
        amount: params.amount,
      });
      return { success: false, error: 'Recharge service is not configured. Please contact support.' };
    }
    // BL-C4 fix: the real aggregator API is not yet implemented. Previously this unconditionally
    // threw when RECHARGE_AGGREGATOR_API_KEY was set, crashing any caller without a try-catch.
    // Now we return a proper error object so callers can handle it gracefully.
    // TODO: Implement with real aggregator API
    // Example (PaySprint): POST https://api.paysprint.in/api/v1/service/recharge/v2
    // Example (Eko): POST https://staging.eko.in:25004/ekoicici/user/account/verify
    try {
      logger.warn(
        '[RechargeAggregator] RECHARGE_AGGREGATOR_API_KEY is set but real aggregator integration is not yet implemented',
        {
          mobileNumber: params.mobileNumber,
          amount: params.amount,
          transactionId: params.transactionId,
        },
      );
      return { success: false, error: 'Recharge aggregator integration is not yet available. Please try again later.' };
    } catch (err) {
      logger.error('[RechargeAggregator] Unexpected error during recharge attempt', {
        error: err instanceof Error ? err.message : String(err),
        transactionId: params.transactionId,
      });
      return { success: false, error: 'Recharge service encountered an unexpected error.' };
    }
  }
}

export const rechargeAggregatorService = new RechargeAggregatorService();
