/**
 * RechargeGateway — abstraction over real operator APIs.
 *
 * Priority integration: Paytm B2B API (most coverage in India)
 * Fallback: Mock mode for development/staging
 *
 * Real operator integration requires:
 * - RECHARGE_GATEWAY_URL (e.g. https://b2b.paytm.com)
 * - RECHARGE_API_KEY
 * - RECHARGE_MERCHANT_ID
 *
 * Until credentials are obtained, RECHARGE_MOCK_MODE=true simulates
 * success responses so the full flow can be tested end-to-end.
 */

import axios from 'axios';
import * as crypto from 'crypto';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('recharge-gateway');

interface RechargeParams {
  mobile: string;
  operator: string;
  circle: string;
  amount: number;
  referenceId: string;
}

interface RechargeResult {
  success: boolean;
  operatorRefId: string;
  status: 'success' | 'pending' | 'failed';
  message: string;
  balance?: number;
}

const MOCK_MODE = process.env.RECHARGE_MOCK_MODE === 'true' || !process.env.RECHARGE_API_KEY;

const operatorCodeMap: Record<string, string> = {
  airtel: 'AT',
  jio: 'JIO',
  vi: 'VI',
  bsnl: 'BN',
  mtnl: 'MTNL',
  idea: 'VI',
};

class RechargeGateway {
  private baseUrl: string;
  private apiKey: string;
  private merchantId: string;

  constructor() {
    this.baseUrl = process.env.RECHARGE_GATEWAY_URL || 'https://api.rechargegateway.in/v1';
    this.apiKey = process.env.RECHARGE_API_KEY || '';
    this.merchantId = process.env.RECHARGE_MERCHANT_ID || '';
  }

  private generateChecksum(params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return crypto.createHmac('sha256', this.apiKey).update(sorted).digest('hex');
  }

  async rechargeMobile(params: RechargeParams): Promise<RechargeResult> {
    if (MOCK_MODE) {
      // In production, reject instead of mocking — user's money would be debited with no actual recharge
      if (process.env.NODE_ENV === 'production') {
        logger.error('[RechargeGateway] NOT configured in production — rejecting to prevent money loss', {
          mobile: `XXXXX${params.mobile.slice(-5)}`,
          amount: params.amount,
        });
        return {
          success: false,
          operatorRefId: '',
          status: 'failed',
          message: 'Recharge service is not configured. Please contact support.',
        };
      }
      return this.mockRecharge(params);
    }

    try {
      const payload = {
        merchantId: this.merchantId,
        mobile: params.mobile,
        operator: operatorCodeMap[params.operator.toLowerCase()] || params.operator.toUpperCase(),
        circle: params.circle.toUpperCase(),
        amount: params.amount.toString(),
        referenceId: params.referenceId,
        type: 'P',
        timestamp: Date.now().toString(),
      };

      const checksum = this.generateChecksum(payload);

      const response = await axios.post(
        `${this.baseUrl}/recharge`,
        { ...payload, checksum },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.status === 'SUCCESS' || data.statusCode === '00') {
        return {
          success: true,
          operatorRefId: data.operatorRefId || data.txnId || data.transactionId,
          status: 'success',
          message: 'Recharge successful',
          balance: data.balance,
        };
      } else if (data.status === 'PENDING') {
        return {
          success: false,
          operatorRefId: data.operatorRefId || params.referenceId,
          status: 'pending',
          message: 'Recharge pending — will be processed shortly',
        };
      } else {
        return {
          success: false,
          operatorRefId: '',
          status: 'failed',
          message: data.message || data.statusMessage || 'Recharge failed',
        };
      }
    } catch (error: any) {
      const isTransient = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || (error.response?.status >= 500);
      logger.error('[RechargeGateway] API call failed', {
        mobile: `XXXXX${params.mobile.slice(-4)}`,
        operator: params.operator,
        amount: params.amount,
        error: error.message,
        isTransient,
      });
      throw new Error(isTransient ? 'TRANSIENT_ERROR' : `Recharge failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkStatus(operatorRefId: string, referenceId: string): Promise<RechargeResult> {
    if (MOCK_MODE) {
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          operatorRefId,
          status: 'failed',
          message: 'Recharge service is not configured.',
        };
      }
      return {
        success: true,
        operatorRefId,
        status: 'success',
        message: 'Mock status check: success',
      };
    }

    const response = await axios.get(
      `${this.baseUrl}/status`,
      {
        params: { merchantId: this.merchantId, referenceId, operatorRefId },
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 10000,
      }
    );

    const data = response.data;
    return {
      success: data.status === 'SUCCESS',
      operatorRefId: data.operatorRefId || operatorRefId,
      status: data.status === 'SUCCESS' ? 'success' : data.status === 'PENDING' ? 'pending' : 'failed',
      message: data.message,
    };
  }

  private mockRecharge(params: RechargeParams): RechargeResult {
    logger.info('[RechargeGateway] MOCK MODE — simulating recharge success', {
      mobile: `XXXXX${params.mobile.slice(-5)}`,
      operator: params.operator,
      amount: params.amount,
    });

    const succeeds = crypto.randomUUID().replace('-', '')[0] > '0';
    return {
      success: succeeds,
      operatorRefId: `MOCK-${Date.now()}-${crypto.randomUUID().replace('-', '').substring(0, 6).toUpperCase()}`,
      status: succeeds ? 'success' : 'failed',
      message: succeeds ? 'Recharge successful (mock)' : 'Recharge failed (mock)',
    };
  }
}

export const rechargeGateway = new RechargeGateway();
export default rechargeGateway;
