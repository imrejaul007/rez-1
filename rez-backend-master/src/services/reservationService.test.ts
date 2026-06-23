/**
 * Reservation Service Tests (ITER21)
 *
 * Tests for src/services/reservationService.ts
 *
 * ITER21 fix: previously used a read-then-write check on inventory that
 * let two concurrent reservations both succeed and oversell the last unit.
 * Now uses an atomic `findOneAndUpdate` with `$expr` filter:
 *   filter:  stock - reservedStock >= quantity
 *   update:  $inc reservedStock: quantity
 * If the filter fails (a concurrent request won the race), the document is
 * unchanged and the reservation is rejected.
 *
 * `releaseStock` now properly decrements `reservedStock` (it used to leave
 * it monotonically growing, eventually blocking all reservations).
 */

import mongoose, { Types } from 'mongoose';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// Mock the heavy Cart model with an in-memory implementation
const cartsStore: Record<string, any> = {};
function buildCartChain(cart: any) {
  const chain: any = {
    lean: async () => cart,
    save: async () => {
      cartsStore[String(cart._id)] = cart;
      return cart;
    },
  };
  return chain;
}

jest.mock('../models/Cart', () => {
  return {
    Cart: {
      findById: jest.fn((id: string) => {
        const c = cartsStore[String(id)];
        if (!c) {
          return { lean: async () => null, save: async () => null };
        }
        return buildCartChain(c);
      }),
      find: jest.fn((query: any) => {
        // For releaseExpiredReservations: find carts with expired reservations
        const now = query?.['reservedItems.expiresAt']?.$lt || new Date();
        const all = Object.values(cartsStore).filter((c: any) =>
          (c.reservedItems || []).some((r: any) => r.expiresAt < now)
        );
        return { lean: async () => all };
      }),
      aggregate: jest.fn().mockResolvedValue([]),
    },
    IReservedItem: {},
  };
});

// In-memory product store with $expr filter simulation
const productsStore: Record<string, any> = {};

jest.mock('../models/Product', () => {
  return {
    Product: {
      findById: jest.fn((id: string) => {
        const p = productsStore[String(id)];
        if (!p) return { lean: async () => null };
        return { lean: async () => ({ ...p }) };
      }),
      findOneAndUpdate: jest.fn((filter: any, update: any, opts: any) => {
        // Implement ITER21 atomic guard
        const id = String(filter._id);
        const p = productsStore[id];
        if (!p) return Promise.resolve(null);
        if (p.isActive !== filter.isActive) return Promise.resolve(null);
        if (p.inventory?.isAvailable !== filter['inventory.isAvailable']) return Promise.resolve(null);
        // Evaluate the $expr filter
        const stock = p.inventory?.stock ?? 0;
        const reserved = p.reservedStock ?? 0;
        const available = stock - reserved;
        if (typeof filter.$expr?.$gte !== 'function' && !Array.isArray(filter.$expr?.$gte)) {
          return Promise.resolve(null);
        }
        // Build a simple comparator: filter.$expr.$gte is [lhs, rhs]
        const [lhsArr, rhs] = filter.$expr.$gte;
        const lhs = lhsArr[0]; // { $subtract: ['$inventory.stock', { $ifNull: ['$reservedStock', 0] }] }
        const compareLhs = (lhs?.$subtract?.[0] === '$inventory.stock')
          ? stock
          : 0;
        // The second arg of $subtract is $ifNull: ['$reservedStock', 0]
        const compareRhs = available;
        if (compareLhs - (p.reservedStock ?? 0) < rhs) {
          // Filter doesn't match — atomic guard rejected
          return Promise.resolve(null);
        }
        if (update?.$inc?.reservedStock !== undefined) {
          p.reservedStock = (p.reservedStock ?? 0) + update.$inc.reservedStock;
        }
        return Promise.resolve({ _id: id, reservedStock: p.reservedStock, inventory: { stock: p.inventory.stock } });
      }),
      updateOne: jest.fn((filter: any, update: any) => {
        const id = String(filter._id);
        const p = productsStore[id];
        if (!p) return Promise.resolve({ modifiedCount: 0 });
        if (update?.$inc?.reservedStock !== undefined) {
          p.reservedStock = Math.max(0, (p.reservedStock ?? 0) + update.$inc.reservedStock);
        }
        return Promise.resolve({ modifiedCount: 1 });
      }),
    },
  };
});

// ─── Import after mocks ──────────────────────────────────────────────────────
import reservationService from './reservationService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function seedProduct(id: string, opts: { stock: number; reserved?: number; isActive?: boolean; isAvailable?: boolean }) {
  productsStore[id] = {
    _id: id,
    isActive: opts.isActive ?? true,
    inventory: { stock: opts.stock, isAvailable: opts.isAvailable ?? true },
    reservedStock: opts.reserved ?? 0,
  };
}

function seedCart(id: string, opts: { reservedItems?: any[]; items?: any[] } = {}) {
  cartsStore[id] = {
    _id: new Types.ObjectId(id),
    reservedItems: opts.reservedItems || [],
    items: opts.items || [],
  };
}

describe('reservationService (ITER21 atomic guard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(productsStore).forEach(k => delete productsStore[k]);
    Object.keys(cartsStore).forEach(k => delete cartsStore[k]);
  });

  // ── 1. Happy path ─────────────────────────────────────────────────────────

  it('successfully reserves stock when inventory is available', async () => {
    const productId = new Types.ObjectId().toString();
    const cartId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 100 });
    seedCart(cartId);

    const result = await reservationService.reserveStock(cartId, productId, 5);

    expect(result.success).toBe(true);
    expect(result.reservedQuantity).toBe(5);
    expect(productsStore[productId].reservedStock).toBe(5);
    expect(cartsStore[cartId].reservedItems).toHaveLength(1);
  });

  // ── 2. Edge case: insufficient stock returns failure (no oversell) ──────

  it('rejects reservation when requested quantity exceeds available stock', async () => {
    const productId = new Types.ObjectId().toString();
    const cartId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 10, reserved: 8 }); // only 2 available
    seedCart(cartId);

    const result = await reservationService.reserveStock(cartId, productId, 5);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/insufficient/i);
    // Stock unchanged — atomic guard rejected
    expect(productsStore[productId].reservedStock).toBe(8);
  });

  // ── 3. ITER21 attack scenario: concurrent reservations cannot oversell ──

  it('concurrent reservations for the last unit are correctly serialized (no oversell)', async () => {
    const productId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 1, reserved: 0 });

    // Two concurrent reservations each asking for 1 unit. With stock=1,
    // only ONE should succeed; the second must be rejected by the atomic guard.
    const cart1 = new Types.ObjectId().toString();
    const cart2 = new Types.ObjectId().toString();
    seedCart(cart1);
    seedCart(cart2);

    const [r1, r2] = await Promise.all([
      reservationService.reserveStock(cart1, productId, 1),
      reservationService.reserveStock(cart2, productId, 1),
    ]);

    const successes = [r1, r2].filter(r => r.success).length;
    const failures = [r1, r2].filter(r => !r.success).length;

    // Exactly one must succeed
    expect(successes).toBe(1);
    expect(failures).toBe(1);
    // reservedStock must be exactly 1 (the winner), never 2
    expect(productsStore[productId].reservedStock).toBe(1);
  });

  // ── 4. releaseStock properly decrements reservedStock (ITER21 second part)

  it('releaseStock decrements Product.reservedStock (no monotonic growth)', async () => {
    const productId = new Types.ObjectId().toString();
    const cartId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 100, reserved: 0 });
    seedCart(cartId);

    await reservationService.reserveStock(cartId, productId, 5);
    expect(productsStore[productId].reservedStock).toBe(5);

    await reservationService.releaseStock(cartId, productId);
    // After release, reservedStock should drop back to 0
    expect(productsStore[productId].reservedStock).toBe(0);
  });

  // ── 5. Edge case: reservation fails when product is inactive ─────────────

  it('rejects reservation when product is inactive', async () => {
    const productId = new Types.ObjectId().toString();
    const cartId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 100, isActive: false });
    seedCart(cartId);

    const result = await reservationService.reserveStock(cartId, productId, 1);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not available/i);
  });

  // ── 6. Edge case: reservation fails when cart does not exist ─────────────

  it('rejects reservation when cart does not exist', async () => {
    const productId = new Types.ObjectId().toString();
    const cartId = new Types.ObjectId().toString();
    seedProduct(productId, { stock: 100 });
    // No cart seeded

    const result = await reservationService.reserveStock(cartId, productId, 1);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/cart not found/i);
  });
});