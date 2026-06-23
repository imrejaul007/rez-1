/**
 * Unit tests for the three MVP rules:
 *   - reengageLapsedRule
 *   - weekendRushRule
 *   - launchFirstVisitRule
 */

const mockLapsedCount = jest.fn();
jest.mock('../../../models/MerchantCustomerSnapshot', () => ({
  __esModule: true,
  default: {
    countDocuments: (...args: unknown[]) => mockLapsedCount(...args),
  },
}));

const mockCampaignFindOne = jest.fn();
jest.mock('../../../models/BroadcastCampaign', () => ({
  BroadcastCampaign: {
    findOne: (...args: unknown[]) => mockCampaignFindOne(...args),
  },
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { reengageLapsedRule, __testOnly as lapsedTestOnly } from '../rules/reengageLapsedRule';
import { weekendRushRule, __testOnly as weekendTestOnly } from '../rules/weekendRushRule';
import { launchFirstVisitRule, __testOnly as firstVisitTestOnly } from '../rules/launchFirstVisitRule';
import type { RuleContext } from '../types';

function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

const BASE_CTX = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  merchantId: 'm1',
  storeId: 's1',
  vertical: 'restaurant',
  now: new Date('2026-04-23T10:00:00.000Z'), // 2026-04-23 Thursday UTC
  ...overrides,
});

beforeEach(() => {
  mockLapsedCount.mockReset();
  mockCampaignFindOne.mockReset();
});

// ─── reengageLapsedRule ──────────────────────────────────────────────────────

describe('reengageLapsedRule', () => {
  it('returns empty when lapsed count is below threshold', async () => {
    mockLapsedCount.mockResolvedValueOnce(lapsedTestOnly.MIN_LAPSED_COUNT - 1);
    const result = await reengageLapsedRule.run(BASE_CTX());
    expect(result).toEqual([]);
  });

  it('returns empty when lapsed count is exactly threshold minus one', async () => {
    mockLapsedCount.mockResolvedValueOnce(lapsedTestOnly.MIN_LAPSED_COUNT - 1);
    expect(await reengageLapsedRule.run(BASE_CTX())).toEqual([]);
  });

  it('fires when lapsed count is ≥ threshold', async () => {
    mockLapsedCount.mockResolvedValueOnce(lapsedTestOnly.MIN_LAPSED_COUNT);
    const result = await reengageLapsedRule.run(BASE_CTX());
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('reengage-lapsed');
    expect(result[0].priority).toBeGreaterThan(50);
  });

  it('includes lapsed count in title + data', async () => {
    mockLapsedCount.mockResolvedValueOnce(42);
    const result = await reengageLapsedRule.run(BASE_CTX());
    expect(result[0].title).toContain('42');
    expect(result[0].data?.lapsedCount).toBe(42);
  });

  it('uses the bring-back-60d-lapsed template as CTA target', async () => {
    mockLapsedCount.mockResolvedValueOnce(50);
    const result = await reengageLapsedRule.run(BASE_CTX());
    expect(result[0].cta.kind).toBe('launch-template');
    expect(result[0].cta.target).toBe('bring-back-60d-lapsed');
  });

  it('includes storeId in CTA params when present', async () => {
    mockLapsedCount.mockResolvedValueOnce(50);
    const result = await reengageLapsedRule.run(BASE_CTX({ storeId: 'store-xyz' }));
    expect(result[0].cta.params).toEqual({ storeId: 'store-xyz' });
  });

  it('omits storeId from CTA params when absent', async () => {
    mockLapsedCount.mockResolvedValueOnce(50);
    const result = await reengageLapsedRule.run(BASE_CTX({ storeId: undefined }));
    expect(result[0].cta.params).toEqual({});
  });

  it('returns empty (never throws) on DB error', async () => {
    mockLapsedCount.mockRejectedValueOnce(new Error('db down'));
    await expect(reengageLapsedRule.run(BASE_CTX())).resolves.toEqual([]);
  });
});

// ─── weekendRushRule ─────────────────────────────────────────────────────────

describe('weekendRushRule', () => {
  const thu = new Date('2026-04-23T10:00:00.000Z'); // UTC day=4 Thu
  const fri = new Date('2026-04-24T10:00:00.000Z'); // UTC day=5 Fri
  const sat = new Date('2026-04-25T10:00:00.000Z'); // UTC day=6 Sat
  const sun = new Date('2026-04-26T10:00:00.000Z'); // UTC day=0 Sun
  const mon = new Date('2026-04-27T10:00:00.000Z'); // UTC day=1 Mon

  it('does NOT fire on Sun', async () => {
    expect(await weekendRushRule.run(BASE_CTX({ now: sun }))).toEqual([]);
  });

  it('does NOT fire on Mon', async () => {
    expect(await weekendRushRule.run(BASE_CTX({ now: mon }))).toEqual([]);
  });

  it('fires on Thu', async () => {
    const result = await weekendRushRule.run(BASE_CTX({ now: thu }));
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('launch-weekend-rush');
  });

  it('fires on Fri', async () => {
    const result = await weekendRushRule.run(BASE_CTX({ now: fri }));
    expect(result).toHaveLength(1);
    expect(result[0].data?.proximity).toBe('tomorrow');
  });

  it('fires on Sat', async () => {
    const result = await weekendRushRule.run(BASE_CTX({ now: sat }));
    expect(result).toHaveLength(1);
    expect(result[0].data?.proximity).toBe('today');
  });

  it('uses weekend-rush as CTA target', async () => {
    const result = await weekendRushRule.run(BASE_CTX({ now: thu }));
    expect(result[0].cta.target).toBe('weekend-rush');
  });

  it('elevates Fri priority over Thu (closer to the weekend)', async () => {
    const thuResult = await weekendRushRule.run(BASE_CTX({ now: thu }));
    const friResult = await weekendRushRule.run(BASE_CTX({ now: fri }));
    expect(friResult[0].priority).toBeGreaterThan(thuResult[0].priority);
  });

  it('exposes ELIGIBLE_DOW containing 4, 5, 6', () => {
    expect(weekendTestOnly.ELIGIBLE_DOW.has(4)).toBe(true);
    expect(weekendTestOnly.ELIGIBLE_DOW.has(5)).toBe(true);
    expect(weekendTestOnly.ELIGIBLE_DOW.has(6)).toBe(true);
    expect(weekendTestOnly.ELIGIBLE_DOW.size).toBe(3);
  });
});

// ─── launchFirstVisitRule ────────────────────────────────────────────────────

describe('launchFirstVisitRule', () => {
  it('fires when no recent first-visit campaign exists', async () => {
    mockCampaignFindOne.mockReturnValueOnce(leanResolved(null));
    const result = await launchFirstVisitRule.run(BASE_CTX());
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('launch-first-visit');
    expect(result[0].cta.target).toBe('first-visit-offer');
  });

  it('stays silent when a recent first-visit campaign exists', async () => {
    mockCampaignFindOne.mockReturnValueOnce(leanResolved({ _id: 'campaign-1' }));
    const result = await launchFirstVisitRule.run(BASE_CTX());
    expect(result).toEqual([]);
  });

  it('queries with cutoff=LOOKBACK_DAYS days ago and the active statuses', async () => {
    mockCampaignFindOne.mockReturnValueOnce(leanResolved(null));
    const now = new Date('2026-04-23T10:00:00.000Z');
    await launchFirstVisitRule.run(BASE_CTX({ now }));
    const filter = mockCampaignFindOne.mock.calls[0][0];
    expect(filter.merchantId).toBe('m1');
    expect(filter['templateLaunch.templateId']).toBe('first-visit-offer');
    expect(filter.status).toEqual({ $in: ['queued', 'sending', 'sent'] });
    const expectedCutoff = new Date(now.getTime() - firstVisitTestOnly.LOOKBACK_DAYS * 24 * 3600 * 1000);
    expect(filter.createdAt.$gte.getTime()).toBe(expectedCutoff.getTime());
  });

  it('returns empty (never throws) on DB error', async () => {
    mockCampaignFindOne.mockImplementationOnce(() => {
      throw new Error('db down');
    });
    await expect(launchFirstVisitRule.run(BASE_CTX())).resolves.toEqual([]);
  });

  it('includes storeId in CTA params when present', async () => {
    mockCampaignFindOne.mockReturnValueOnce(leanResolved(null));
    const result = await launchFirstVisitRule.run(BASE_CTX({ storeId: 'store-xyz' }));
    expect(result[0].cta.params).toEqual({ storeId: 'store-xyz' });
  });
});
