/**
 * Unit tests for the ROI aggregator.
 *
 * Covers:
 *   - Pure math helpers: monthsInWindow, computeNetLift,
 *     computeRoiMultiple, sumSpent.
 *   - Mode env parsing.
 *   - Each aggregate* helper with mocked Mongo responses.
 *   - computeRoiReport orchestration shape + isEstimate flag.
 */

const mockMerchantFindById = jest.fn();
jest.mock('../../../models/Merchant', () => ({
  Merchant: { findById: (...args: unknown[]) => mockMerchantFindById(...args) },
}));

const mockPlanFindOne = jest.fn();
jest.mock('../../../models/MerchantPlan', () => ({
  MerchantPlan: { findOne: (...args: unknown[]) => mockPlanFindOne(...args) },
}));

const mockStorePaymentAggregate = jest.fn();
jest.mock('../../../models/StorePayment', () => ({
  StorePayment: { aggregate: (...args: unknown[]) => mockStorePaymentAggregate(...args) },
}));

const mockBroadcastAggregate = jest.fn();
jest.mock('../../../models/BroadcastCampaign', () => ({
  BroadcastCampaign: { aggregate: (...args: unknown[]) => mockBroadcastAggregate(...args) },
}));

jest.mock('../../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  monthsInWindow,
  computeNetLift,
  computeRoiMultiple,
  sumSpent,
  getRoiMode,
  aggregateSubscriptionFees,
  aggregateCoinRedemptionValue,
  aggregateBroadcastCosts,
  aggregateEarned,
  computeRoiReport,
  PER_MSG_COST,
} from '../computeRoi';

function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

const ORIG_MODE = process.env.MERCHANT_ROI_MODE;

const W = {
  from: new Date('2026-03-24T00:00:00.000Z'),
  to: new Date('2026-04-23T00:00:00.000Z'),
}; // 30 days

beforeEach(() => {
  mockMerchantFindById.mockReset();
  mockPlanFindOne.mockReset();
  mockStorePaymentAggregate.mockReset();
  mockBroadcastAggregate.mockReset();
});

afterAll(() => {
  if (ORIG_MODE === undefined) delete (process.env as any).MERCHANT_ROI_MODE;
  else process.env.MERCHANT_ROI_MODE = ORIG_MODE;
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe('pure helpers', () => {
  it('monthsInWindow rounds to 2 decimals', () => {
    expect(monthsInWindow(W.from, W.to)).toBe(1);
    expect(monthsInWindow(new Date('2026-04-23'), new Date('2026-05-08'))).toBeCloseTo(0.5, 1);
  });

  it('monthsInWindow clamps to 0 when to < from', () => {
    expect(monthsInWindow(W.to, W.from)).toBe(0);
  });

  it('computeNetLift subtracts spent from earned', () => {
    expect(computeNetLift(10000, 2500)).toBe(7500);
    expect(computeNetLift(100, 500)).toBe(-400);
  });

  it('computeRoiMultiple divides earned by spent, floors spent at ₹1', () => {
    expect(computeRoiMultiple(10000, 2500)).toBe(4);
    expect(computeRoiMultiple(1000, 0)).toBe(1000); // spend floored to ₹1
    expect(computeRoiMultiple(0, 100)).toBe(0);
  });

  it('sumSpent adds all 3 categories', () => {
    expect(sumSpent({ subscriptionFees: 1999, coinRedemptionValue: 500, broadcastCosts: 50 })).toBe(
      2549,
    );
  });

  it('getRoiMode defaults to off', () => {
    delete (process.env as any).MERCHANT_ROI_MODE;
    expect(getRoiMode()).toBe('off');
  });

  it('getRoiMode accepts shadow / primary case-insensitively', () => {
    process.env.MERCHANT_ROI_MODE = 'SHADOW';
    expect(getRoiMode()).toBe('shadow');
    process.env.MERCHANT_ROI_MODE = 'Primary';
    expect(getRoiMode()).toBe('primary');
    process.env.MERCHANT_ROI_MODE = 'anything-else';
    expect(getRoiMode()).toBe('off');
  });
});

// ─── aggregateSubscriptionFees ───────────────────────────────────────────────

describe('aggregateSubscriptionFees', () => {
  it('multiplies plan monthlyPrice by months in window', async () => {
    mockMerchantFindById.mockReturnValueOnce(leanResolved({ currentPlan: 'growth' }));
    mockPlanFindOne.mockReturnValueOnce(leanResolved({ monthlyPrice: 1999 }));
    const fee = await aggregateSubscriptionFees('m1', W);
    expect(fee).toBe(1999); // 30 days ≈ 1 month
  });

  it('defaults to starter plan if merchant has no currentPlan', async () => {
    mockMerchantFindById.mockReturnValueOnce(leanResolved({}));
    mockPlanFindOne.mockReturnValueOnce(leanResolved({ monthlyPrice: 0 }));
    const fee = await aggregateSubscriptionFees('m1', W);
    expect(mockPlanFindOne).toHaveBeenCalledWith({ plan: 'starter' });
    expect(fee).toBe(0);
  });

  it('returns 0 when the plan lookup fails', async () => {
    mockMerchantFindById.mockImplementationOnce(() => {
      throw new Error('db down');
    });
    expect(await aggregateSubscriptionFees('m1', W)).toBe(0);
  });
});

// ─── aggregateCoinRedemptionValue ────────────────────────────────────────────

describe('aggregateCoinRedemptionValue', () => {
  it('sums coinRedemption.amount for completed merchant payments', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([{ total: 750 }]);
    expect(await aggregateCoinRedemptionValue('m1', W)).toBe(750);
  });

  it('returns 0 for empty result', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    expect(await aggregateCoinRedemptionValue('m1', W)).toBe(0);
  });

  it('returns 0 on DB error', async () => {
    mockStorePaymentAggregate.mockRejectedValueOnce(new Error('db down'));
    expect(await aggregateCoinRedemptionValue('m1', W)).toBe(0);
  });
});

// ─── aggregateBroadcastCosts ─────────────────────────────────────────────────

describe('aggregateBroadcastCosts', () => {
  it('multiplies messages sent × PER_MSG_COST', async () => {
    mockBroadcastAggregate.mockResolvedValueOnce([{ totalSent: 100 }]);
    expect(await aggregateBroadcastCosts('m1', W)).toBe(100 * PER_MSG_COST);
  });

  it('returns 0 when no campaigns in window', async () => {
    mockBroadcastAggregate.mockResolvedValueOnce([]);
    expect(await aggregateBroadcastCosts('m1', W)).toBe(0);
  });
});

// ─── aggregateEarned ─────────────────────────────────────────────────────────

describe('aggregateEarned', () => {
  it('returns all zeros when no payments in window', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    const earned = await aggregateEarned('m1', W);
    expect(earned).toEqual({
      totalGMV: 0,
      uniqueCustomers: 0,
      newCustomerGMV: 0,
      returningCustomerGMV: 0,
    });
  });

  it('computes new vs returning GMV split', async () => {
    mockStorePaymentAggregate
      .mockResolvedValueOnce([
        { total: 10000, uniqueCustomers: 2, users: ['u-new', 'u-old'] },
      ])
      // second call inside aggregateEarned = first-payment-per-user lookup
      .mockResolvedValueOnce([
        { _id: 'u-new', firstAt: new Date('2026-04-10T00:00:00.000Z') }, // inside window
        { _id: 'u-old', firstAt: new Date('2026-01-01T00:00:00.000Z') }, // outside
      ])
      // third call = sum billAmount for the new-user subset
      .mockResolvedValueOnce([{ total: 4000 }]);

    const earned = await aggregateEarned('m1', W);
    expect(earned.totalGMV).toBe(10000);
    expect(earned.uniqueCustomers).toBe(2);
    expect(earned.newCustomerGMV).toBe(4000);
    expect(earned.returningCustomerGMV).toBe(6000);
  });

  it('returns zeros on DB error', async () => {
    mockStorePaymentAggregate.mockRejectedValueOnce(new Error('db down'));
    expect(await aggregateEarned('m1', W)).toEqual({
      totalGMV: 0,
      uniqueCustomers: 0,
      newCustomerGMV: 0,
      returningCustomerGMV: 0,
    });
  });
});

// ─── computeRoiReport orchestration ──────────────────────────────────────────

describe('computeRoiReport', () => {
  it('produces a well-formed report with all sections', async () => {
    // Subscription fees: starter = 0
    mockMerchantFindById.mockReturnValueOnce(leanResolved({ currentPlan: 'starter' }));
    mockPlanFindOne.mockReturnValueOnce(leanResolved({ monthlyPrice: 0 }));

    // Coin redemption aggregate
    mockStorePaymentAggregate
      .mockResolvedValueOnce([{ total: 120 }]) // coinRedemption
      .mockResolvedValueOnce([
        { total: 8000, uniqueCustomers: 3, users: ['u1', 'u2', 'u3'] },
      ]) // earned window
      .mockResolvedValueOnce([
        { _id: 'u1', firstAt: new Date('2026-04-05') },
        { _id: 'u2', firstAt: new Date('2025-12-01') },
        { _id: 'u3', firstAt: new Date('2026-04-10') },
      ])
      .mockResolvedValueOnce([{ total: 3000 }]); // new-customer GMV

    mockBroadcastAggregate.mockResolvedValueOnce([{ totalSent: 40 }]);

    const report = await computeRoiReport('m1', W);

    expect(report.spent.total).toBe(120 + 40 * PER_MSG_COST); // 126
    expect(report.spent.breakdown.subscriptionFees).toBe(0);
    expect(report.spent.breakdown.coinRedemptionValue).toBe(120);
    expect(report.spent.breakdown.broadcastCosts).toBe(40 * PER_MSG_COST);

    expect(report.earned.total).toBe(8000);
    expect(report.earned.breakdown.newCustomerGMV).toBe(3000);
    expect(report.earned.breakdown.returningCustomerGMV).toBe(5000);
    expect(report.earned.breakdown.uniqueCustomers).toBe(3);

    expect(report.netLift).toBe(8000 - 126);
    expect(report.roiMultiple).toBeCloseTo(8000 / 126, 1);
    expect(report.isEstimate).toBe(true); // broadcastCosts > 0
    expect(report.window.from).toBe(W.from.toISOString());
    expect(report.window.to).toBe(W.to.toISOString());
  });

  it('isEstimate=false when neither subscriptionFees nor broadcastCosts contribute', async () => {
    mockMerchantFindById.mockReturnValueOnce(leanResolved({ currentPlan: 'starter' }));
    mockPlanFindOne.mockReturnValueOnce(leanResolved({ monthlyPrice: 0 }));
    mockStorePaymentAggregate
      .mockResolvedValueOnce([{ total: 50 }]) // coin redemption
      .mockResolvedValueOnce([]); // no earned payments
    mockBroadcastAggregate.mockResolvedValueOnce([{ totalSent: 0 }]);
    const report = await computeRoiReport('m1', W);
    expect(report.isEstimate).toBe(false);
  });
});
