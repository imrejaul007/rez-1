/**
 * Unit tests for generateForMerchant + its helpers.
 *
 * Covers:
 *   - resolveVertical maps category slug/name/businessCategory to correct verticals
 *   - getDailyActionsMode parses env correctly
 *   - mode=off short-circuits without querying
 *   - Upserts with the correct shadow flag for mode=shadow vs primary
 *   - Filters actions tagged with a vertical the merchant doesn't match
 */

const mockStoreFindOne = jest.fn();
jest.mock('../../../models/Store', () => ({
  Store: { findOne: (...args: unknown[]) => mockStoreFindOne(...args) },
}));

const mockUpsertForDay = jest.fn();
const mockDayKey = jest.fn();
jest.mock('../../../models/MerchantDailyAction', () => ({
  __esModule: true,
  default: {
    upsertForDay: (...args: unknown[]) => mockUpsertForDay(...args),
    dayKey: (...args: unknown[]) => mockDayKey(...args),
  },
}));

const mockRunEngine = jest.fn();
jest.mock('../engine', () => ({
  runEngine: (...args: unknown[]) => mockRunEngine(...args),
  ENGINE_VERSION: 1,
  MAX_ACTIONS_PER_DAY: 5,
}));

jest.mock('../../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { generateForMerchant, getDailyActionsMode, resolveVertical } from '../generate';

function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

const ORIG_MODE = process.env.DAILY_ACTIONS_MODE;

beforeEach(() => {
  mockStoreFindOne.mockReset();
  mockUpsertForDay.mockReset();
  mockDayKey.mockReset();
  mockRunEngine.mockReset();
  mockDayKey.mockReturnValue('2026-04-23');
  mockUpsertForDay.mockResolvedValue({});
  mockRunEngine.mockResolvedValue([]);
});

afterAll(() => {
  if (ORIG_MODE === undefined) delete (process.env as any).DAILY_ACTIONS_MODE;
  else process.env.DAILY_ACTIONS_MODE = ORIG_MODE;
});

describe('resolveVertical', () => {
  it('maps restaurant slug', () => {
    expect(resolveVertical({ category: { slug: 'restaurant-fine-dining' } })).toBe('restaurant');
  });

  it('maps food slug', () => {
    expect(resolveVertical({ category: { slug: 'street-food' } })).toBe('restaurant');
  });

  it('maps cafe name', () => {
    expect(resolveVertical({ category: { name: 'Coffee Cafe' } })).toBe('restaurant');
  });

  it('maps salon / spa / beauty', () => {
    expect(resolveVertical({ category: { slug: 'unisex-salon' } })).toBe('salon');
    expect(resolveVertical({ category: { slug: 'day-spa' } })).toBe('salon');
    expect(resolveVertical({ category: { slug: 'beauty-parlour' } })).toBe('salon');
  });

  it('maps hotel', () => {
    expect(resolveVertical({ category: { slug: 'boutique-hotel' } })).toBe('hotel');
  });

  it('maps grocery / kirana / supermarket', () => {
    expect(resolveVertical({ category: { slug: 'grocery' } })).toBe('grocery');
    expect(resolveVertical({ businessCategory: 'kirana' })).toBe('grocery');
    expect(resolveVertical({ category: { slug: 'supermarket' } })).toBe('grocery');
  });

  it('defaults to general', () => {
    expect(resolveVertical({ category: { slug: 'misc' } })).toBe('general');
    expect(resolveVertical({})).toBe('general');
    expect(resolveVertical(null)).toBe('general');
    expect(resolveVertical(undefined)).toBe('general');
  });
});

describe('getDailyActionsMode', () => {
  it('returns off when unset', () => {
    delete (process.env as any).DAILY_ACTIONS_MODE;
    expect(getDailyActionsMode()).toBe('off');
  });
  it('returns off for bogus values', () => {
    process.env.DAILY_ACTIONS_MODE = 'bogus';
    expect(getDailyActionsMode()).toBe('off');
  });
  it('returns shadow / primary when set', () => {
    process.env.DAILY_ACTIONS_MODE = 'shadow';
    expect(getDailyActionsMode()).toBe('shadow');
    process.env.DAILY_ACTIONS_MODE = 'primary';
    expect(getDailyActionsMode()).toBe('primary');
  });
  it('is case-insensitive', () => {
    process.env.DAILY_ACTIONS_MODE = 'SHADOW';
    expect(getDailyActionsMode()).toBe('shadow');
  });
});

describe('generateForMerchant', () => {
  it('mode=off short-circuits before any DB work', async () => {
    process.env.DAILY_ACTIONS_MODE = 'off';
    const count = await generateForMerchant('m1');
    expect(count).toBe(0);
    expect(mockStoreFindOne).not.toHaveBeenCalled();
    expect(mockRunEngine).not.toHaveBeenCalled();
    expect(mockUpsertForDay).not.toHaveBeenCalled();
  });

  it('mode=primary: resolves store, runs engine, upserts with shadow=false', async () => {
    process.env.DAILY_ACTIONS_MODE = 'primary';
    mockStoreFindOne.mockReturnValueOnce(
      leanResolved({ _id: 'store-1', category: { slug: 'restaurant' } }),
    );
    mockRunEngine.mockResolvedValueOnce([
      {
        actionId: 'a1',
        kind: 'generic',
        title: 't',
        description: 'd',
        priority: 50,
        cta: { kind: 'deep-link', target: '/' },
      },
    ]);
    const count = await generateForMerchant('m1');
    expect(count).toBe(1);
    expect(mockUpsertForDay).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'm1', shadow: false, engineVersion: 1 }),
    );
  });

  it('mode=shadow writes rows with shadow=true', async () => {
    process.env.DAILY_ACTIONS_MODE = 'shadow';
    mockStoreFindOne.mockReturnValueOnce(leanResolved(null));
    mockRunEngine.mockResolvedValueOnce([]);
    await generateForMerchant('m1');
    expect(mockUpsertForDay).toHaveBeenCalledWith(
      expect.objectContaining({ shadow: true }),
    );
  });

  it('tolerates store lookup throwing — proceeds with vertical=general', async () => {
    process.env.DAILY_ACTIONS_MODE = 'primary';
    mockStoreFindOne.mockImplementationOnce(() => {
      throw new Error('db down');
    });
    mockRunEngine.mockResolvedValueOnce([]);
    await generateForMerchant('m1');
    const ctx = mockRunEngine.mock.calls[0][0];
    expect(ctx.vertical).toBe('general');
  });

  it('filters out actions tagged with a non-matching vertical', async () => {
    process.env.DAILY_ACTIONS_MODE = 'primary';
    mockStoreFindOne.mockReturnValueOnce(
      leanResolved({ _id: 'store-1', category: { slug: 'salon' } }),
    );
    mockRunEngine.mockResolvedValueOnce([
      {
        actionId: 'salon-only',
        kind: 'generic',
        title: 't',
        description: 'd',
        priority: 50,
        verticals: ['salon'],
        cta: { kind: 'deep-link', target: '/' },
      },
      {
        actionId: 'restaurant-only',
        kind: 'generic',
        title: 't',
        description: 'd',
        priority: 50,
        verticals: ['restaurant'],
        cta: { kind: 'deep-link', target: '/' },
      },
      {
        actionId: 'everyone',
        kind: 'generic',
        title: 't',
        description: 'd',
        priority: 50,
        cta: { kind: 'deep-link', target: '/' },
      },
    ]);
    const count = await generateForMerchant('m1');
    expect(count).toBe(2);
    const upsertArgs = mockUpsertForDay.mock.calls[0][0];
    expect(upsertArgs.actions.map((a: any) => a.actionId)).toEqual(['salon-only', 'everyone']);
  });
});
