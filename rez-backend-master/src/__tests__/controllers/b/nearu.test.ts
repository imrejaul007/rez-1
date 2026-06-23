/**
 * Smoke tests for the Near-U Discovery namespace.
 *
 * Verifies that:
 *   - GET /api/b/nearu/food returns 200 with `{ success: true, data: { stores } }`.
 *   - GET /api/b/nearu/express returns 200 and the stores are the
 *     express-tagged fixtures (sorted by ascending ETA on the server).
 *   - GET /api/b/nearu/all returns a mixed list drawn from every vertical.
 *   - All endpoints require authentication (401 without a token).
 *
 * Mounts the nearu router on a fresh Express app so the rate limiter and
 * authentication middleware don't bleed in from `src/app.ts`. We mock the
 * real `authenticate` middleware BEFORE importing the router because
 * `routes/b/nearu.ts` calls `router.use(authenticate)` at module load time.
 */
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import type { IUser } from '../../../models/User';

jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    // The real middleware attaches a full IUser document; for the smoke
    // test we only care that `req.user` is non-null, so a partial stub
    // (cast through `unknown`) is fine here.
    req.user = { id: 'test-user-id' } as unknown as unknown as IUser;
    next();
  },
}));

jest.mock('../../../middleware/rateLimiter', () => ({
  generalLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import nearuRoutes from '../../../routes/b/nearu';

// Bangalore-ish coords used by the fixture distance computation.
const BANGALORE_LAT = 12.9716;
const BANGALORE_LNG = 77.5946;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('B-feature namespace — /api/b/nearu/:vertical', () => {
  let authedApp: express.Express;

  beforeAll(() => {
    authedApp = express();
    authedApp.use(express.json());
    authedApp.use('/api/b/nearu', nearuRoutes);
  });

  it('GET /food returns 200 with stores payload', async () => {
    const res = await request(authedApp).get(
      `/api/b/nearu/food?lat=${BANGALORE_LAT}&lng=${BANGALORE_LNG}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          vertical: 'food',
          stores: expect.any(Array),
        }),
      }),
    );
    expect(res.body.data.stores.length).toBeGreaterThan(0);
    for (const store of res.body.data.stores) {
      expect(store).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          category: expect.any(String),
          distanceKm: expect.any(Number),
          etaMinutes: expect.any(Number),
          currentOffersCount: expect.any(Number),
          isStudentDiscount: expect.any(Boolean),
          isOpen: expect.any(Boolean),
          rating: expect.any(Number),
        }),
      );
    }
  });

  it('GET /express returns 200 with express-tagged stores sorted by ETA', async () => {
    const res = await request(authedApp).get(
      `/api/b/nearu/express?lat=${BANGALORE_LAT}&lng=${BANGALORE_LNG}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stores = res.body.data.stores as Array<{
      id: string;
      etaMinutes: number;
    }>;
    expect(stores.length).toBeGreaterThan(0);
    // Server sorts express by ascending ETA.
    for (let i = 1; i < stores.length; i += 1) {
      expect(stores[i].etaMinutes).toBeGreaterThanOrEqual(stores[i - 1].etaMinutes);
    }
    // The "Zepo Quickstop" fixture is in the express vertical with the
    // smallest ETA, so it should be first.
    expect(stores[0].id).toBe('nearu-zepto-koramangala');
  });

  it('GET /all returns mixed stores from every vertical', async () => {
    const res = await request(authedApp).get(
      `/api/b/nearu/all?lat=${BANGALORE_LAT}&lng=${BANGALORE_LNG}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stores = res.body.data.stores as Array<{ id: string; category: string }>;
    expect(stores.length).toBeGreaterThan(0);
    // Mixed feed should include stores from more than one category.
    const categories = new Set(stores.map((s) => s.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it('rejects unknown verticals with 400', async () => {
    const res = await request(authedApp).get(
      `/api/b/nearu/not-a-vertical?lat=${BANGALORE_LAT}&lng=${BANGALORE_LNG}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('requires authentication (401 without token)', async () => {
    // Build a tiny app using the REAL auth middleware so we exercise
    // the unauthenticated path.
    const realApp = express();
    const { authenticate } = jest.requireActual('../../../middleware/auth');
    realApp.get(
      '/api/b/nearu/food',
      authenticate,
      (_req: Request, res: Response) => res.json({ ok: true }),
    );

    const res = await request(realApp).get('/api/b/nearu/food');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
