/**
 * Unit tests for CPA pure pricing math.
 */

import {
  computeCharge,
  dayKey,
  startOfUtcMonth,
  exceedsMonthlyCap,
  type AttributionOutcome,
} from '../computeCharge';
import { DEFAULT_RATES } from '../../../models/CpaPricingPlan';

describe('computeCharge', () => {
  it('returns the rate card amount for new-customer-conversion', () => {
    const r = computeCharge({ kind: 'new-customer-conversion' }, DEFAULT_RATES);
    expect(r.amount).toBe(DEFAULT_RATES.newCustomerConversion);
    expect(r.kind).toBe('new-customer-conversion');
  });

  it('returns the rate card amount for lapsed-reactivation', () => {
    const r = computeCharge(
      { kind: 'lapsed-reactivation', daysSinceLastVisit: 72 },
      DEFAULT_RATES,
    );
    expect(r.amount).toBe(DEFAULT_RATES.lapsedReactivation);
    expect(r.kind).toBe('lapsed-reactivation');
  });

  it('returns the rate card amount for scan-conversion', () => {
    const r = computeCharge(
      { kind: 'scan-conversion', scannedAt: new Date('2026-04-23T10:00:00Z') },
      DEFAULT_RATES,
    );
    expect(r.amount).toBe(DEFAULT_RATES.scanConversion);
    expect(r.kind).toBe('scan-conversion');
  });

  it('honours merchant-specific rate overrides', () => {
    const custom = { newCustomerConversion: 77, lapsedReactivation: 22, scanConversion: 3 };
    expect(computeCharge({ kind: 'new-customer-conversion' }, custom).amount).toBe(77);
    expect(
      computeCharge({ kind: 'lapsed-reactivation', daysSinceLastVisit: 90 }, custom).amount,
    ).toBe(22);
  });

  it('zero-rates cleanly (returns 0, not undefined)', () => {
    const zero = { newCustomerConversion: 0, lapsedReactivation: 0, scanConversion: 0 };
    const r = computeCharge({ kind: 'new-customer-conversion' }, zero);
    expect(r.amount).toBe(0);
    expect(r.kind).toBe('new-customer-conversion');
  });
});

describe('dayKey', () => {
  it('returns UTC YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-04-23T10:00:00.000Z'))).toBe('2026-04-23');
  });
  it('rolls to next day at UTC midnight', () => {
    expect(dayKey(new Date('2026-04-24T00:00:00.000Z'))).toBe('2026-04-24');
  });
});

describe('startOfUtcMonth', () => {
  it('returns 1st of the month in UTC', () => {
    const m = startOfUtcMonth(new Date('2026-04-23T10:00:00.000Z'));
    expect(m.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });
  it('handles Jan 1 correctly', () => {
    const m = startOfUtcMonth(new Date('2026-01-01T00:00:00.000Z'));
    expect(m.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
  it('handles Dec 31 correctly', () => {
    const m = startOfUtcMonth(new Date('2026-12-31T23:59:59.000Z'));
    expect(m.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('exceedsMonthlyCap', () => {
  const charge = { kind: 'new-customer-conversion' as const, amount: 50 };

  it('always returns false when cap <= 0 (unlimited)', () => {
    expect(exceedsMonthlyCap(9_999_999, 0, charge)).toBe(false);
    expect(exceedsMonthlyCap(0, -1, charge)).toBe(false);
  });

  it('returns false when mtd+candidate <= cap', () => {
    expect(exceedsMonthlyCap(100, 1000, charge)).toBe(false);
    expect(exceedsMonthlyCap(950, 1000, charge)).toBe(false); // 950+50=1000 = cap exactly
  });

  it('returns true when mtd+candidate > cap', () => {
    expect(exceedsMonthlyCap(951, 1000, charge)).toBe(true); // 951+50=1001 > 1000
    expect(exceedsMonthlyCap(2000, 1000, charge)).toBe(true);
  });
});
