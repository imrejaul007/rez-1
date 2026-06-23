/**
 * BBPSService — Razorpay BillPay API integration
 *
 * Docs: https://razorpay.com/docs/payments/payment-gateway/bb-payments/
 * All methods throw AppError on failure.
 * Backend calls Razorpay, Razorpay calls NPCI BBPS network.
 *
 * Error classification (per AUDIT_REPORT.md finding #7):
 *   - TIMEOUT: network/axios timeout — operator MAY still process, caller
 *     should retry later + check operator status
 *   - PROVIDER_ERROR: 4xx response — operator rejected (invalid account,
 *     customer not found, etc.) — will never succeed, mark failed
 *   - UPSTREAM_ERROR: 5xx response — Razorpay / NPCI issue, may be transient
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { createServiceLogger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

const logger = createServiceLogger('bbps-service');

// ─── Error classification ──────────────────────────────────

/**
 * Distinguish between a network timeout (operator may still process),
 * a 4xx provider error (will never succeed), and a 5xx upstream
 * error (Razorpay / NPCI may be transient).
 */
function classifyAxiosError(err: any): {
  code: 'TIMEOUT' | 'PROVIDER_ERROR' | 'UPSTREAM_ERROR' | 'NETWORK_ERROR';
  message: string;
  httpStatus: number;
  retryable: boolean;
  operatorMayHaveProcessed: boolean;
} {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    // Axios timeout (ECONNABORTED with code 'ECONNABORTED' or 'ETIMEDOUT')
    if (ax.code === 'ECONNABORTED' || ax.code === 'ETIMEDOUT' || err.message?.toLowerCase().includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: `Razorpay BBPS call timed out: ${ax.message}`,
        httpStatus: 504,
        retryable: true,
        operatorMayHaveProcessed: true,
      };
    }
    // No response at all (network unreachable, DNS, etc.)
    if (!ax.response) {
      return {
        code: 'NETWORK_ERROR',
        message: `Razorpay BBPS network error: ${ax.message}`,
        httpStatus: 502,
        retryable: true,
        operatorMayHaveProcessed: false,
      };
    }
    const status = ax.response.status;
    if (status >= 400 && status < 500) {
      // 4xx — provider rejected (invalid account, customer not found, etc.)
      const providerMsg = (ax.response.data as any)?.error?.description || (ax.response.data as any)?.message || ax.message;
      return {
        code: 'PROVIDER_ERROR',
        message: `Razorpay BBPS rejected request: ${providerMsg}`,
        httpStatus: 502,
        retryable: false,
        operatorMayHaveProcessed: false,
      };
    }
    // 5xx — upstream issue, may be transient
    return {
      code: 'UPSTREAM_ERROR',
      message: `Razorpay BBPS upstream error (${status}): ${ax.message}`,
      httpStatus: 502,
      retryable: true,
      operatorMayHaveProcessed: false,
    };
  }
  // Non-axios error
  return {
    code: 'UPSTREAM_ERROR',
    message: err?.message || String(err),
    httpStatus: 502,
    retryable: false,
    operatorMayHaveProcessed: false,
  };
}

// ─── Types ──────────────────────────────────────────────────

export interface BBPSOperator {
  id: string;
  name: string;
  category: string;
  logo_url?: string;
}

export interface BBPSPlan {
  id: string;
  name: string;
  price: number;
  validity: string;
  data?: string;
  calls?: string;
  sms?: string;
  isPopular: boolean;
}

export interface BBPSBillInfo {
  billAmount: number;
  billDate?: string;
  dueDate?: string;
  consumerName?: string;
  billNumber?: string;
  additionalInfo?: Record<string, string>;
}

export interface BBPSPaymentResult {
  transactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  receiptNumber?: string;
  timestamp: string;
}

// ─── Service ────────────────────────────────────────────────

class BBPSService {
  private client: AxiosInstance;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    this.client = axios.create({
      baseURL: 'https://api.razorpay.com/v1',
      auth: { username: keyId, password: keySecret },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  }

  /**
   * Fetch all operators for a given category.
   * Categories: telecom | electricity | gas | water | dth | broadband | fastag | insurance | education
   */
  async getOperators(category: string): Promise<BBPSOperator[]> {
    try {
      const { data } = await this.client.get('/bbps/operators', {
        params: { category },
      });
      return data.items || [];
    } catch (err: any) {
      logger.error('[BBPS] getOperators failed', { category, error: err.message });
      throw new AppError(`Failed to fetch operators: ${err.message}`, 502);
    }
  }

  /**
   * Fetch prepaid recharge plans for a mobile operator.
   * Only applicable for mobile_prepaid type.
   */
  async getPlans(operatorCode: string, circle: string = 'KA'): Promise<BBPSPlan[]> {
    try {
      const { data } = await this.client.get(`/bbps/operators/${operatorCode}/plans`, {
        params: { circle },
      });
      return (data.items || []).map((p: any) => ({
        id: p.id,
        name: `₹${p.amount} — ${p.validity}`,
        price: p.amount,
        validity: p.validity,
        data: p.data_benefit,
        calls: p.voice_benefit,
        sms: p.sms_benefit,
        isPopular: p.is_popular || false,
      }));
    } catch (err: any) {
      logger.error('[BBPS] getPlans failed', { operatorCode, error: err.message });
      throw new AppError(`Failed to fetch plans: ${err.message}`, 502);
    }
  }

  /**
   * Fetch bill details for postpaid/utility bills.
   */
  async fetchBill(operatorCode: string, customerNumber: string): Promise<BBPSBillInfo> {
    try {
      const { data } = await this.client.post('/bbps/bills/fetch', {
        operator_id: operatorCode,
        customer_params: { consumer_number: customerNumber },
      });

      return {
        billAmount: data.bill_amount / 100,
        billDate: data.bill_date,
        dueDate: data.due_date,
        consumerName: data.customer_name,
        billNumber: data.bill_number,
        additionalInfo: data.additional_info,
      };
    } catch (err: any) {
      logger.error('[BBPS] fetchBill failed', { operatorCode, customerNumber, error: err.message });
      if (err.response?.status === 404) {
        throw new AppError('Consumer number not found with this provider', 404);
      }
      throw new AppError(`Could not fetch bill: ${err.message}`, 502);
    }
  }

  /**
   * Pay a bill or recharge.
   * For prepaid: amount comes from selected plan.
   * For postpaid/utility: amount comes from fetchBill result.
   */
  async payBill(params: {
    operatorCode: string;
    customerNumber: string;
    amount: number;
    razorpayPaymentId: string;
    internalRef: string;
    planId?: string;
  }): Promise<BBPSPaymentResult> {
    try {
      const { data } = await this.client.post('/bbps/bills/pay', {
        operator_id: params.operatorCode,
        customer_params: { consumer_number: params.customerNumber },
        amount: params.amount * 100,
        payment_id: params.razorpayPaymentId,
        reference_id: params.internalRef,
        plan_id: params.planId,
      });

      return {
        transactionId: data.transaction_id,
        status: data.status === 'SUCCESS' ? 'SUCCESS' : data.status === 'PENDING' ? 'PENDING' : 'FAILED',
        receiptNumber: data.receipt_number,
        timestamp: data.created_at,
      };
    } catch (err: any) {
      const cls = classifyAxiosError(err);
      logger.error('[BBPS] payBill failed', {
        ...params,
        errorCode: cls.code,
        errorMessage: cls.message,
        operatorMayHaveProcessed: cls.operatorMayHaveProcessed,
        retryable: cls.retryable,
      });
      // Use the classifier's code as the AppError code so callers can
      // branch on it (TIMEOUT vs PROVIDER_ERROR vs UPSTREAM_ERROR vs
      // NETWORK_ERROR). The classification metadata is attached to the
      // error instance for callers that want it.
      const appErr = new AppError(cls.message, cls.httpStatus, cls.code);
      // Attach extra context — the AppError class doesn't have a
      // generic metadata field, so we use a non-enumerable property.
      (appErr as any).errorClassification = {
        code: cls.code,
        retryable: cls.retryable,
        operatorMayHaveProcessed: cls.operatorMayHaveProcessed,
        operatorCode: params.operatorCode,
        customerNumber: params.customerNumber,
        razorpayPaymentId: params.razorpayPaymentId,
        internalRef: params.internalRef,
      };
      throw appErr;
    }
  }

  /**
   * Check transaction status (for pending transactions).
   */
  async getTransactionStatus(aggregatorRef: string): Promise<{ status: string; amount: number }> {
    try {
      const { data } = await this.client.get(`/bbps/transactions/${aggregatorRef}`);
      return {
        status: data.status,
        amount: data.amount / 100,
      };
    } catch (err: any) {
      logger.error('[BBPS] getTransactionStatus failed', { aggregatorRef, error: err.message });
      throw new AppError(`Could not check status: ${err.message}`, 502);
    }
  }

  /**
   * Initiate refund for a failed/disputed transaction.
   */
  async initiateRefund(aggregatorRef: string, amount: number, reason: string): Promise<{ refundId: string }> {
    try {
      const { data } = await this.client.post(`/bbps/transactions/${aggregatorRef}/refund`, {
        amount: amount * 100,
        notes: { reason },
      });
      return { refundId: data.id };
    } catch (err: any) {
      logger.error('[BBPS] initiateRefund failed', { aggregatorRef, error: err.message });
      throw new AppError(`Refund initiation failed: ${err.message}`, 502);
    }
  }
}

export const bbpsService = new BBPSService();
