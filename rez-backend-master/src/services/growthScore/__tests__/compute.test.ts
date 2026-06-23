/**
 * Unit tests for Growth Score — focused on the pure sub-scorers +
 * composite math. The DB-facing orchestrator is NOT end-to-end tested
 * here; its collaborators (sumGmv, sumNewCustomerGMV,
 * countRetentionBuckets, countCampaigns) are effectively mirrors of
 * the same Mongo patterns tested under Phase G.
 */

jest.mock('../../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../models/StorePayment', () => ({ StorePayment: { aggregate: jest.fn() } }));
jest.mock('../../../models/BroadcastCampaign', () => ({
  BroadcastCampaign: { countDocuments: jest.fn() },
}));
jest.mock('../../../models/MerchantCustomerSnapshot', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));

import {
  clamp01_100,
  scoreGmvGrowth,
  scoreNewCustomerPct,
  scoreRetention,
  scoreCampaignCadence,
  composite,
  getGrowthScoreMode,
  WEIGHTS,
  ENGINE_VERSION,
  WINDOW_DAYS,
} from '../compute';

const ORIG_MODE = process.env.GROWTH_SCORE_MODE;

afterAll(() => {
  if (ORIG_MODE === undefined) delete (process.env as any).GROWTH_SCORE_MODE;
  else process.env.GROWTH_SCORE_MODE = ORIG_MODE;
});

describe('constants', () => {
  it('ENGINE_VERSION > 0', () => {
    expect(ENGINE_VERSION).toBeGreaterThan(0);
  });

  it('WINDOW_DAYS is sensible (>=14, <=90)', () => {
    expect(WINDOW_DAYS).toBeGreaterThanOrEqual(14);
    expect(WINDOW_DAYS).toBeLessThanOrEqual(90);
  });

  it('WEIGHTS sum to 1.0', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

describe('clamp01_100', () => {
  it('clamps below 0 → 0 and above 100 → 100', () => {
    expect(clamp01_100(-5)).toBe(0);
    expect(clamp01_100(105)).toBe(100);
    expect(clamp01_100(42)).toBe(42);
  });
  it('rounds fractional values', () => {
    expect(clamp01_100(33.4)).toBe(33);
    expect(clamp01_100(33.6)).toBe(34);
  });
  it('returns 0 for NaN / Infinity', () => {
    expect(clamp01_100(NaN)).toBe(0);
    expect(clamp01_100(Infinity)).toBe(0);
  });
});

describe('scoreGmvGrowth', () => {
  it('returns 0 when both windows are zero', () => {
    expect(scoreGmvGrowth(0, 0)).toBe(0);
  });
  it('returns 100 when previous is 0 and current > 0 (birth-of-a-merchant)', () => {
    expect(scoreGmvGrowth(1000, 0)).toBe(100);
  });
  it('returns 50 for flat growth', () => {
    expect(scoreGmvGrowth(1000, 1000)).toBe(50);
  });
  it('returns 100 at +50% growth', () => {
    expect(scoreGmvGrowth(1500, 1000)).toBe(100);
  });
  it('returns 0 at -50% or worse growth', () => {
    expect(scoreGmvGrowth(500, 1000)).toBe(0);
    expect(scoreGmvGrowth(100, 1000)).toBe(0);
  });
  it('interpolates linearly between -50% and +50%', () => {
    // +25% should be 75
    expect(scoreGmvGrowth(1250, 1000)).toBe(75);
    // -25% should be 25
    expect(scoreGmvGrowth(750, 1000)).toBe(25);
  });
});

describe('scoreNewCustomerPct', () => {
  it('0% → 0', () => {
    expect(scoreNewCustomerPct(0)).toBe(0);
  });
  it('40%+ → 100', () => {
    expect(scoreNewCustomerPct(40)).toBe(100);
    expect(scoreNewCustomerPct(80)).toBe(100);
  });
  it('20% → 50', () => {
    expect(scoreNewCustomerPct(20)).toBe(50);
  });
});

describe('scoreRetention', () => {
  it('returns 0 for empty base', () => {
    expect(scoreRetention(0, 0)).toBe(0);
  });
  it('70% ratio → 100', () => {
    expect(scoreRetention(70, 100)).toBe(100);
  });
  it('35% ratio → 50', () => {
    expect(scoreRetention(35, 100)).toBe(50);
  });
  it('clamps above 100 when ratio > 70%', () => {
    expect(scoreRetention(100, 100)).toBe(100);
  });
});

describe('scoreCampaignCadence', () => {
  it('0 campaigns → 0', () => {
    expect(scoreCampaignCadence(0)).toBe(0);
  });
  it('4+ campaigns → 100', () => {
    expect(scoreCampaignCadence(4)).toBe(100);
    expect(scoreCampaignCadence(10)).toBe(100);
  });
  it('2 campaigns → 50', () => {
    expect(scoreCampaignCadence(2)).toBe(50);
  });
});

describe('composite', () => {
  it('returns 0 for all-zero breakdown', () => {
    expect(
      composite({ gmvGrowth: 0, newCustomerPct: 0, retention: 0, campaignCadence: 0 }),
    ).toBe(0);
  });

  it('returns 100 for perfect breakdown', () => {
    expect(
      composite({ gmvGrowth: 100, newCustomerPct: 100, retention: 100, campaignCadence: 100 }),
    ).toBe(100);
  });

  it('applies weights correctly', () => {
    // Only gmvGrowth=100, everything else=0 → expect 40 (40% weight)
    expect(
      composite({ gmvGrowth: 100, newCustomerPct: 0, retention: 0, campaignCadence: 0 }),
    ).toBe(40);
    // Only retention=100 → expect 30
    expect(
      composite({ gmvGrowth: 0, newCustomerPct: 0, retention: 100, campaignCadence: 0 }),
    ).toBe(30);
  });

  it('clamps out-of-range inputs before weighting', () => {
    // The sub-scorers already clamp, but we defend composite anyway:
    expect(
      composite({ gmvGrowth: -50, newCustomerPct: 200, retention: 50, campaignCadence: 50 }),
    ).toBeGreaterThanOrEqual(0);
    expect(
      composite({ gmvGrowth: -50, newCustomerPct: 200, retention: 50, campaignCadence: 50 }),
    ).toBeLessThanOrEqual(100);
  });
});

describe('getGrowthScoreMode', () => {
  it('defaults to off', () => {
    delete (process.env as any).GROWTH_SCORE_MODE;
    expect(getGrowthScoreMode()).toBe('off');
  });
  it('accepts shadow / primary case-insensitively', () => {
    process.env.GROWTH_SCORE_MODE = 'SHADOW';
    expect(getGrowthScoreMode()).toBe('shadow');
    process.env.GROWTH_SCORE_MODE = 'Primary';
    expect(getGrowthScoreMode()).toBe('primary');
  });
  it('rejects garbage', () => {
    process.env.GROWTH_SCORE_MODE = 'whatever';
    expect(getGrowthScoreMode()).toBe('off');
  });
});
