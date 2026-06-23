/**
 * BBPS Service Tests (ITER12)
 *
 * Tests for src/services/bbpsService.ts
 *
 * ITER12 fix: `payBill` failures now classify the underlying axios error into
 * one of four codes (TIMEOUT, PROVIDER_ERROR, UPSTREAM_ERROR, NETWORK_ERROR)
 * and surface the code to the caller via `errorClassification` on the thrown
 * AppError. Callers can branch on this to decide retry-vs-fail.
 *
 * We test through the public `payBill` method (the only path that exposes
 * `classifyAxiosError`'s output). The internal classifier is non-exported,
 * so we drive it through axios-level errors and assert on the AppError's
 * `errorClassification` payload.
 */

import axios, { AxiosError, AxiosInstance } from 'axios';

// ─── Mock axios.create so the service has a stub client we can drive ────────
// The constructor captures the returned client on `bbpsService.client` —
// we keep a reference via this mock and replace its post method per test.
const mockClientPost = jest.fn();
const mockClientGet = jest.fn();

jest.mock('axios', () => {
  // Re-export everything axios exports so `axios.isAxiosError` still works
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    default: {
      ...actualAxios,
      create: jest.fn(() => ({
        post: (...args: any[]) => mockClientPost(...args),
        get: (...args: any[]) => mockClientGet(...args),
      })),
      isAxiosError: actualAxios.isAxiosError,
    },
    isAxiosError: actualAxios.isAxiosError,
  };
});

jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// Set required env vars before importing the service
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

// ─── Import after mocks ──────────────────────────────────────────────────────
import { bbpsService } from './bbpsService';
import { AppError } from '../middleware/errorHandler';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build an AxiosError-like object with just the fields the classifier reads.
 */
function makeAxiosError(opts: {
  code?: string;
  message?: string;
  status?: number;
  data?: any;
  hasResponse?: boolean;
}): AxiosError {
  const message = opts.message ?? 'axios error';
  // Cast through unknown to bypass AxiosError's strict constructor signature
  const err: any = new Error(message);
  err.isAxiosError = true;
  err.code = opts.code;
  err.message = message;
  if (opts.hasResponse || opts.status !== undefined) {
    err.response = {
      status: opts.status ?? 500,
      data: opts.data ?? {},
    };
  } else {
    err.response = undefined;
  }
  // axios.isAxiosError uses duck-typing on `isAxiosError` + `config` field
  err.config = {};
  return err as AxiosError;
}

const validPayParams = {
  operatorCode: 'OP001',
  customerNumber: '9876543210',
  amount: 100,
  razorpayPaymentId: 'pay_123',
  internalRef: 'ref_456',
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('bbpsService (ITER12 error classification)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('payBill happy path', () => {
    it('returns parsed payment result on success', async () => {
      mockClientPost.mockResolvedValueOnce({
        data: {
          transaction_id: 'txn_abc',
          status: 'SUCCESS',
          receipt_number: 'rcpt_001',
          created_at: '2026-06-22T00:00:00Z',
        },
      });

      const result = await bbpsService.payBill(validPayParams);
      expect(result.transactionId).toBe('txn_abc');
      expect(result.status).toBe('SUCCESS');
      expect(result.receiptNumber).toBe('rcpt_001');
    });
  });

  // ── ITER12: TIMEOUT ────────────────────────────────────────────────────────

  it('classifies ECONNABORTED timeout and marks operatorMayHaveProcessed=true', async () => {
    const timeoutErr = makeAxiosError({
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });
    mockClientPost.mockRejectedValueOnce(timeoutErr);

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect(caught.code).toBe('TIMEOUT');
    expect(caught.statusCode).toBe(504);
    expect(caught.errorClassification.code).toBe('TIMEOUT');
    expect(caught.errorClassification.retryable).toBe(true);
    expect(caught.errorClassification.operatorMayHaveProcessed).toBe(true);
  });

  // ── ITER12: PROVIDER_ERROR (4xx) ───────────────────────────────────────────

  it('classifies 4xx response as PROVIDER_ERROR (won\'t ever succeed)', async () => {
    const providerErr = makeAxiosError({
      message: 'Request failed with status code 422',
      status: 422,
      data: { error: { description: 'Invalid consumer number' } },
    });
    mockClientPost.mockRejectedValueOnce(providerErr);

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect(caught.code).toBe('PROVIDER_ERROR');
    expect(caught.errorClassification.code).toBe('PROVIDER_ERROR');
    expect(caught.errorClassification.retryable).toBe(false);
    expect(caught.errorClassification.operatorMayHaveProcessed).toBe(false);
  });

  // ── ITER12: UPSTREAM_ERROR (5xx) ───────────────────────────────────────────

  it('classifies 5xx response as UPSTREAM_ERROR (Razorpay / NPCI issue)', async () => {
    const upstreamErr = makeAxiosError({
      message: 'Request failed with status code 503',
      status: 503,
    });
    mockClientPost.mockRejectedValueOnce(upstreamErr);

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught.code).toBe('UPSTREAM_ERROR');
    expect(caught.statusCode).toBe(502);
    expect(caught.errorClassification.code).toBe('UPSTREAM_ERROR');
    expect(caught.errorClassification.retryable).toBe(true);
    expect(caught.errorClassification.operatorMayHaveProcessed).toBe(false);
  });

  // ── ITER12: NETWORK_ERROR (no response) ────────────────────────────────────

  it('classifies network unreachable (no response) as NETWORK_ERROR', async () => {
    const netErr = makeAxiosError({
      code: 'ENETUNREACH',
      message: 'Network Error',
    });
    mockClientPost.mockRejectedValueOnce(netErr);

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught.code).toBe('NETWORK_ERROR');
    expect(caught.statusCode).toBe(502);
    expect(caught.errorClassification.code).toBe('NETWORK_ERROR');
    expect(caught.errorClassification.retryable).toBe(true);
  });

  // ── ITER12: non-axios error → UPSTREAM_ERROR ──────────────────────────────

  it('classifies non-axios errors as UPSTREAM_ERROR (attack: malformed error)', async () => {
    // Attack scenario: a weird error object that doesn't look like an AxiosError
    // (e.g. produced by a buggy proxy) should still surface as UPSTREAM_ERROR
    // so the caller can decide what to do.
    mockClientPost.mockRejectedValueOnce(new Error('weird non-axios error'));

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught.code).toBe('UPSTREAM_ERROR');
    expect(caught.errorClassification.code).toBe('UPSTREAM_ERROR');
  });

  // ── ITER12: errorClassification carries context for monitoring ─────────────

  it('attaches operator and reference IDs to errorClassification for monitoring', async () => {
    const err = makeAxiosError({
      code: 'ECONNABORTED',
      message: 'timeout',
    });
    mockClientPost.mockRejectedValueOnce(err);

    let caught: any;
    try {
      await bbpsService.payBill(validPayParams);
    } catch (e) {
      caught = e;
    }
    expect(caught.errorClassification.operatorCode).toBe('OP001');
    expect(caught.errorClassification.customerNumber).toBe('9876543210');
    expect(caught.errorClassification.razorpayPaymentId).toBe('pay_123');
    expect(caught.errorClassification.internalRef).toBe('ref_456');
  });
});
