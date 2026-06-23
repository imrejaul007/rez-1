/**
 * Unit tests for the customer-lifecycle classifier.
 *
 * Pure helpers, no mocks needed.
 */

import {
  classify,
  stageOf,
  bucketize,
  isHighValueSpender,
  __testOnly,
} from '../classify';

const {
  NEW_WINDOW_DAYS,
  ACTIVE_WINDOW_DAYS,
  LAPSED_DAYS,
  CHURN_DAYS,
  HIGH_VALUE_RUPEE,
} = __testOnly;

describe('stageOf', () => {
  it('returns unknown when there is no visit data', () => {
    expect(stageOf({ totalVisits: 0, totalSpend: 0 })).toBe('unknown');
    expect(stageOf({ totalVisits: 0, totalSpend: 500, daysSinceLastVisit: 5 })).toBe(
      'unknown',
    );
    expect(
      stageOf({ totalVisits: 3, totalSpend: 500, daysSinceLastVisit: undefined }),
    ).toBe('unknown');
  });

  it('returns "new" for recently-acquired, low-visit customers', () => {
    expect(
      stageOf({
        totalVisits: 1,
        totalSpend: 200,
        daysSinceFirstVisit: 5,
        daysSinceLastVisit: 5,
      }),
    ).toBe('new');
    expect(
      stageOf({
        totalVisits: 2,
        totalSpend: 400,
        daysSinceFirstVisit: NEW_WINDOW_DAYS,
        daysSinceLastVisit: 1,
      }),
    ).toBe('new');
  });

  it('upgrades to "active" when a customer has >2 visits even within the new window', () => {
    expect(
      stageOf({
        totalVisits: 10,
        totalSpend: 2000,
        daysSinceFirstVisit: 5,
        daysSinceLastVisit: 2,
      }),
    ).toBe('active');
  });

  it('returns "active" for a recent visit (within ACTIVE_WINDOW_DAYS)', () => {
    expect(
      stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: ACTIVE_WINDOW_DAYS }),
    ).toBe('active');
    expect(
      stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: ACTIVE_WINDOW_DAYS - 1 }),
    ).toBe('active');
  });

  it('returns "at-risk" past the active window', () => {
    expect(
      stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: ACTIVE_WINDOW_DAYS + 1 }),
    ).toBe('at-risk');
    expect(stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: LAPSED_DAYS })).toBe(
      'at-risk',
    );
  });

  it('returns "lapsed" past the lapsed threshold', () => {
    expect(stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: LAPSED_DAYS + 1 })).toBe(
      'lapsed',
    );
    expect(stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: CHURN_DAYS })).toBe(
      'lapsed',
    );
  });

  it('returns "churned" past the churn threshold', () => {
    expect(stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: CHURN_DAYS + 1 })).toBe(
      'churned',
    );
    expect(stageOf({ totalVisits: 5, totalSpend: 1000, daysSinceLastVisit: 365 })).toBe('churned');
  });
});

describe('isHighValueSpender', () => {
  it('is true at exactly the threshold', () => {
    expect(isHighValueSpender(HIGH_VALUE_RUPEE)).toBe(true);
  });
  it('is false below the threshold', () => {
    expect(isHighValueSpender(HIGH_VALUE_RUPEE - 1)).toBe(false);
  });
  it('handles NaN / Infinity defensively', () => {
    expect(isHighValueSpender(NaN)).toBe(false);
    expect(isHighValueSpender(Infinity)).toBe(false);
  });
});

describe('classify', () => {
  it('combines stage + high-value flag', () => {
    const r = classify({
      totalVisits: 10,
      totalSpend: HIGH_VALUE_RUPEE + 1,
      daysSinceLastVisit: 3,
      daysSinceFirstVisit: 120,
    });
    expect(r.stage).toBe('active');
    expect(r.isHighValue).toBe(true);
  });

  it('flags a high-value lapsed customer', () => {
    const r = classify({
      totalVisits: 20,
      totalSpend: HIGH_VALUE_RUPEE * 2,
      daysSinceLastVisit: 90,
    });
    expect(r.stage).toBe('lapsed');
    expect(r.isHighValue).toBe(true);
  });
});

describe('bucketize', () => {
  it('counts every stage + high-value separately', () => {
    const result = bucketize([
      { totalVisits: 1, totalSpend: 100, daysSinceFirstVisit: 5, daysSinceLastVisit: 5 }, // new
      { totalVisits: 10, totalSpend: 2000, daysSinceLastVisit: 5 },                       // active
      { totalVisits: 4, totalSpend: 500, daysSinceLastVisit: 45 },                         // at-risk
      { totalVisits: 4, totalSpend: 500, daysSinceLastVisit: 90 },                         // lapsed
      { totalVisits: 4, totalSpend: 500, daysSinceLastVisit: 200 },                        // churned
      { totalVisits: 0, totalSpend: 0 },                                                  // unknown
      { totalVisits: 30, totalSpend: HIGH_VALUE_RUPEE + 100, daysSinceLastVisit: 3 },     // active + high-value
    ]);
    expect(result.total).toBe(7);
    expect(result.byStage.new).toBe(1);
    expect(result.byStage.active).toBe(2);
    expect(result.byStage['at-risk']).toBe(1);
    expect(result.byStage.lapsed).toBe(1);
    expect(result.byStage.churned).toBe(1);
    expect(result.byStage.unknown).toBe(1);
    expect(result.highValueCount).toBe(1);
  });

  it('returns zeros on empty input', () => {
    const result = bucketize([]);
    expect(result.total).toBe(0);
    expect(result.highValueCount).toBe(0);
    Object.values(result.byStage).forEach((v) => expect(v).toBe(0));
  });
});
