/**
 * Exclusive Offer Middleware Tests (ITER8)
 *
 * Tests for src/middleware/exclusiveOfferMiddleware.ts
 *
 * ITER8 fix: premium user check was a TODO. Both `isPremiumUser` and the
 * `filterExclusiveOffers` async predicate were broken. The new helper
 * checks BOTH `nuqtaPlusTier` ('premium'/'vip') AND `isPremium` + expiry.
 * The async predicate is now awaited via a `for` loop (not `.filter()`).
 */

import { Types } from 'mongoose';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUserFindById = jest.fn();
jest.mock('../models/User', () => ({
  User: {
    findById: (...args: any[]) => ({
      select: () => ({
        lean: () => mockUserFindById(...args),
      }),
    }),
  },
}));

const mockWishlistFindOne = jest.fn();
const mockWishlistFind = jest.fn();
jest.mock('../models/Wishlist', () => ({
  Wishlist: {
    findOne: (...args: any[]) => mockWishlistFindOne(...args),
    find: (...args: any[]) => ({
      select: () => mockWishlistFind(...args),
    }),
  },
}));

jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────
import {
  isPremiumUser,
  isFollowingStore,
  getUserFollowedStores,
  filterExclusiveOffers,
} from './exclusiveOfferMiddleware';

describe('exclusiveOfferMiddleware (ITER8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── isPremiumUser ──────────────────────────────────────────────────────────

  describe('isPremiumUser', () => {
    it('returns true for nuqtaPlusTier=premium (no expiry check needed)', async () => {
      mockUserFindById.mockResolvedValueOnce({
        isPremium: false,
        premiumExpiresAt: null,
        nuqtaPlusTier: 'premium',
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(true);
    });

    it('returns true for nuqtaPlusTier=vip (no expiry check needed)', async () => {
      mockUserFindById.mockResolvedValueOnce({
        isPremium: false,
        premiumExpiresAt: null,
        nuqtaPlusTier: 'vip',
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(true);
    });

    it('returns true for isPremium=true with future expiry', async () => {
      const future = new Date(Date.now() + 86400000);
      mockUserFindById.mockResolvedValueOnce({
        isPremium: true,
        premiumExpiresAt: future,
        nuqtaPlusTier: null,
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(true);
    });

    it('returns true for isPremium=true with no expiry (lifetime)', async () => {
      mockUserFindById.mockResolvedValueOnce({
        isPremium: true,
        premiumExpiresAt: null,
        nuqtaPlusTier: null,
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(true);
    });

    it('returns false for isPremium=true with EXPIRED expiry (edge case)', async () => {
      const past = new Date(Date.now() - 86400000);
      mockUserFindById.mockResolvedValueOnce({
        isPremium: true,
        premiumExpiresAt: past,
        nuqtaPlusTier: null,
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(false);
    });

    it('returns false for non-premium user (basic tier)', async () => {
      mockUserFindById.mockResolvedValueOnce({
        isPremium: false,
        premiumExpiresAt: null,
        nuqtaPlusTier: 'basic',
      });

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(false);
    });

    it('returns false when user is not found', async () => {
      mockUserFindById.mockResolvedValueOnce(null);

      const result = await isPremiumUser(new Types.ObjectId().toString());
      expect(result).toBe(false);
    });
  });

  // ── isFollowingStore ───────────────────────────────────────────────────────

  describe('isFollowingStore', () => {
    it('returns true when wishlist record exists', async () => {
      mockWishlistFindOne.mockResolvedValueOnce({ _id: 'w1' });

      const result = await isFollowingStore('userId', 'storeId');
      expect(result).toBe(true);
    });

    it('returns false when no wishlist record exists (attack: probe store IDs)', async () => {
      mockWishlistFindOne.mockResolvedValueOnce(null);

      const result = await isFollowingStore('userId', 'storeId');
      expect(result).toBe(false);
    });
  });

  // ── getUserFollowedStores ──────────────────────────────────────────────────

  describe('getUserFollowedStores', () => {
    it('returns unique store IDs from all wishlists', async () => {
      mockWishlistFind.mockResolvedValueOnce([
        { items: [{ itemType: 'Store', itemId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') }] },
        { items: [{ itemType: 'Store', itemId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa') }] },
        { items: [{ itemType: 'Store', itemId: new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb') }] },
        { items: [{ itemType: 'Product', itemId: new Types.ObjectId('cccccccccccccccccccccccc') }] },
      ]);

      const result = await getUserFollowedStores('userId');
      expect(result).toHaveLength(2);
      expect(result).toContain('aaaaaaaaaaaaaaaaaaaaaaaa');
      expect(result).toContain('bbbbbbbbbbbbbbbbbbbbbbbb');
    });
  });

  // ── filterExclusiveOffers (async predicate fix) ────────────────────────────

  describe('filterExclusiveOffers (ITER8 async fix)', () => {
    it('returns empty array when offers is empty', async () => {
      const result = await filterExclusiveOffers([]);
      expect(result).toEqual([]);
    });

    it('shows non-exclusive offers to everyone', async () => {
      const offers = [{ id: 'o1', isFollowerExclusive: false, store: { id: 's1' } }];
      const result = await filterExclusiveOffers(offers);
      expect(result).toEqual(offers);
    });

    it('hides exclusive offer when user is not authenticated (edge case)', async () => {
      const offers = [
        { id: 'o1', isFollowerExclusive: true, store: { id: 's1' }, visibleTo: 'premium' },
      ];
      const result = await filterExclusiveOffers(offers, undefined);
      expect(result).toEqual([]);
    });

    it('shows exclusive offer to premium user (regardless of follow status) — async predicate awaits', async () => {
      // ATTACK SCENARIO: attacker who is not a follower of the store tries to
      // access a premium-only offer. The fix: `filterExclusiveOffers` must
      // await `isPremiumUser` inside the loop (the old code used `await`
      // inside `.filter()` which never awaited).
      const userId = new Types.ObjectId().toString();
      const storeId = new Types.ObjectId().toString();
      const offers = [
        { id: 'o1', isFollowerExclusive: true, store: { id: storeId }, visibleTo: 'premium' },
      ];

      // isPremiumUser hits User.findById (mocked above)
      mockUserFindById.mockResolvedValueOnce({
        isPremium: true,
        premiumExpiresAt: new Date(Date.now() + 86400000),
        nuqtaPlusTier: null,
      });

      const result = await filterExclusiveOffers(offers, userId, []);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('o1');
    });

    it('hides premium offer from non-premium user who does not follow the store', async () => {
      const userId = new Types.ObjectId().toString();
      const storeId = new Types.ObjectId().toString();
      const offers = [
        { id: 'o1', isFollowerExclusive: true, store: { id: storeId }, visibleTo: 'premium' },
      ];

      // Not premium
      mockUserFindById.mockResolvedValueOnce({
        isPremium: false,
        premiumExpiresAt: null,
        nuqtaPlusTier: 'basic',
      });

      const result = await filterExclusiveOffers(offers, userId, []); // empty followed stores
      expect(result).toEqual([]);
    });

    it('shows premium offer to non-premium user who follows the store', async () => {
      const userId = new Types.ObjectId().toString();
      const storeId = new Types.ObjectId().toString();
      const offers = [
        { id: 'o1', isFollowerExclusive: true, store: { id: storeId }, visibleTo: 'premium' },
      ];

      // Not premium
      mockUserFindById.mockResolvedValueOnce({
        isPremium: false,
        premiumExpiresAt: null,
        nuqtaPlusTier: 'basic',
      });

      const result = await filterExclusiveOffers(offers, userId, [storeId]);
      expect(result).toHaveLength(1);
    });

    it('shows exclusive offer to everyone after exclusiveUntil expires', async () => {
      const past = new Date(Date.now() - 86400000);
      const offers = [
        {
          id: 'o1',
          isFollowerExclusive: true,
          exclusiveUntil: past,
          store: { id: 's1' },
          visibleTo: 'premium',
        },
      ];
      // No userId at all — offer is now public
      const result = await filterExclusiveOffers(offers, undefined);
      expect(result).toHaveLength(1);
    });
  });
});
