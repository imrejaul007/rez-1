/**
 * Unit tests for campaignTemplates route helpers.
 *
 * Covers the pure helpers (interpolate, dayKey, launchIdempotencyKey,
 * mapAudience) and resolveMerchantVertical with a mocked Store model.
 * The HTTP handlers themselves are intentionally not end-to-end tested
 * here — that's covered by the upcoming integration suite once the
 * in-memory Mongo harness lands. What we DO test is that every pure
 * helper does the right thing for its inputs, because those are the
 * pieces that affect idempotency correctness + template interpolation
 * at runtime.
 */

// Mock Store model so resolveMerchantVertical can be exercised without DB.
const mockStoreFindOne = jest.fn();
jest.mock('../../models/Store', () => ({
  Store: {
    findOne: (...args: unknown[]) => mockStoreFindOne(...args),
  },
}));

// Mock the other models the route imports so the module can load.
jest.mock('../../models/CampaignTemplate', () => ({
  __esModule: true,
  default: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock('../../models/Coupon', () => ({
  Coupon: { create: jest.fn() },
}));
jest.mock('../../models/BroadcastCampaign', () => ({
  BroadcastCampaign: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('../../middleware/merchantauth', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { __testOnly } from '../campaignTemplates';
const { interpolate, dayKey, launchIdempotencyKey, resolveMerchantVertical, mapAudience } = __testOnly;

// Helper: build the chained select().lean() that Mongoose returns.
function leanResolved<T>(value: T) {
  return { select: () => ({ lean: async () => value }) };
}

describe('campaignTemplates helpers', () => {
  beforeEach(() => {
    mockStoreFindOne.mockReset();
  });

  // ─── interpolate ────────────────────────────────────────────────────────────
  describe('interpolate', () => {
    it('replaces a single {{var}} placeholder', () => {
      expect(interpolate('Hello {{name}}!', { name: 'Rez' })).toBe('Hello Rez!');
    });

    it('replaces multiple placeholders in one string', () => {
      expect(
        interpolate('{{storeName}} — {{discount}}% off today', {
          storeName: 'The Salon',
          discount: '15',
        }),
      ).toBe('The Salon — 15% off today');
    });

    it('tolerates whitespace inside the placeholder', () => {
      expect(interpolate('Hi {{   name   }}', { name: 'A' })).toBe('Hi A');
    });

    it('leaves missing variables literal (no crash, no empty)', () => {
      expect(interpolate('Code: {{couponCode}}, {{missing}}', { couponCode: 'ABC123' })).toBe(
        'Code: ABC123, {{missing}}',
      );
    });

    it('returns the string unchanged when there are no placeholders', () => {
      expect(interpolate('no variables here', { foo: 'bar' })).toBe('no variables here');
    });

    it('handles the same placeholder appearing twice', () => {
      expect(interpolate('{{n}}+{{n}}={{sum}}', { n: '2', sum: '4' })).toBe('2+2=4');
    });

    it('is safe against a blank vars object', () => {
      expect(interpolate('untouched {{x}}', {})).toBe('untouched {{x}}');
    });
  });

  // ─── dayKey ─────────────────────────────────────────────────────────────────
  describe('dayKey', () => {
    it('returns YYYY-MM-DD UTC for a known timestamp', () => {
      expect(dayKey(new Date('2026-04-23T10:00:00.000Z'))).toBe('2026-04-23');
    });

    it('uses UTC, not local time (dates never shift with TZ)', () => {
      // 23:59 UTC is still today in UTC even if local tz is +5:30.
      expect(dayKey(new Date('2026-04-23T23:59:59.999Z'))).toBe('2026-04-23');
    });

    it('rolls to the next day at UTC midnight', () => {
      expect(dayKey(new Date('2026-04-24T00:00:00.000Z'))).toBe('2026-04-24');
    });
  });

  // ─── launchIdempotencyKey ───────────────────────────────────────────────────
  describe('launchIdempotencyKey', () => {
    it('produces a stable key format', () => {
      expect(launchIdempotencyKey('m1', 's1', 'lunch-hour-boost', '2026-04-23')).toBe(
        'campaign-template-launch:m1:s1:lunch-hour-boost:2026-04-23',
      );
    });

    it('differs per merchant', () => {
      const a = launchIdempotencyKey('m1', 's1', 't', 'd');
      const b = launchIdempotencyKey('m2', 's1', 't', 'd');
      expect(a).not.toBe(b);
    });

    it('differs per store', () => {
      const a = launchIdempotencyKey('m', 's1', 't', 'd');
      const b = launchIdempotencyKey('m', 's2', 't', 'd');
      expect(a).not.toBe(b);
    });

    it('differs per template', () => {
      const a = launchIdempotencyKey('m', 's', 'lunch', 'd');
      const b = launchIdempotencyKey('m', 's', 'weekend', 'd');
      expect(a).not.toBe(b);
    });

    it('differs per day — double-tap tomorrow must create a new campaign', () => {
      const a = launchIdempotencyKey('m', 's', 't', '2026-04-23');
      const b = launchIdempotencyKey('m', 's', 't', '2026-04-24');
      expect(a).not.toBe(b);
    });
  });

  // ─── mapAudience ────────────────────────────────────────────────────────────
  describe('mapAudience', () => {
    it('maps all-customers → segment=all', () => {
      expect(mapAudience('all-customers')).toEqual({ segment: 'all' });
    });

    it('maps new-customers → segment=recent', () => {
      expect(mapAudience('new-customers')).toEqual({ segment: 'recent' });
    });

    it('maps lapsed-30d → segment=lapsed with daysInactive=30', () => {
      expect(mapAudience('lapsed-30d')).toEqual({ segment: 'lapsed', daysInactive: 30 });
    });

    it('maps lapsed-60d → segment=lapsed with daysInactive=60', () => {
      expect(mapAudience('lapsed-60d')).toEqual({ segment: 'lapsed', daysInactive: 60 });
    });

    it('maps high-spenders → segment=high_value', () => {
      expect(mapAudience('high-spenders')).toEqual({ segment: 'high_value' });
    });

    it('falls back to segment=all for unknown rule strings', () => {
      expect(mapAudience('whatever-future-segment')).toEqual({ segment: 'all' });
    });
  });

  // ─── resolveMerchantVertical ────────────────────────────────────────────────
  describe('resolveMerchantVertical', () => {
    it('returns restaurant for a food category slug', async () => {
      mockStoreFindOne.mockReturnValueOnce(
        leanResolved({ category: { slug: 'restaurant-fine-dining' } }),
      );
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('restaurant');
    });

    it('returns salon for a beauty category slug', async () => {
      mockStoreFindOne.mockReturnValueOnce(
        leanResolved({ category: { name: 'Beauty & Salon' } }),
      );
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('salon');
    });

    it('returns hotel for a hotel slug', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved({ category: { slug: 'hotel' } }));
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('hotel');
    });

    it('returns grocery for a kirana slug', async () => {
      mockStoreFindOne.mockReturnValueOnce(
        leanResolved({ businessCategory: 'kirana-shop' }),
      );
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('grocery');
    });

    it('returns general when no category matches', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved({ category: { slug: 'misc' } }));
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('general');
    });

    it('returns general when the store has no category at all', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved({}));
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('general');
    });

    it('returns general when the store lookup fails', async () => {
      mockStoreFindOne.mockImplementationOnce(() => {
        throw new Error('db down');
      });
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('general');
    });

    it('returns general when no store doc is found', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved(null));
      await expect(resolveMerchantVertical('m1', 's1')).resolves.toBe('general');
    });

    it('scopes the query by merchantId + storeId when storeId is provided', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved({ category: { slug: 'cafe-downtown' } }));
      await resolveMerchantVertical('m42', 'store-7');
      expect(mockStoreFindOne).toHaveBeenCalledWith({ _id: 'store-7', merchantId: 'm42' });
    });

    it('scopes the query by merchantId only when storeId is omitted', async () => {
      mockStoreFindOne.mockReturnValueOnce(leanResolved({ category: { slug: 'cafe' } }));
      await resolveMerchantVertical('m42');
      expect(mockStoreFindOne).toHaveBeenCalledWith({ merchantId: 'm42' });
    });
  });
});
