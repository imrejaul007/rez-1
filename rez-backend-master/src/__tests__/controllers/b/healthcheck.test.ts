/**
 * Smoke test for the B-feature namespace healthcheck endpoint.
 *
 * Verifies that:
 *   - GET /api/b/healthcheck returns HTTP 200
 *   - the body matches the canonical Nuqta envelope { success, data }
 *   - `data.ok` is true and `data.namespace === 'b'`
 *
 * Mounts the namespaced router directly so the test stays independent of
 * `src/config/routes.ts` (which only registers the router as part of the
 * full app boot).
 */
import express from 'express';
import request from 'supertest';
import bRoutes from '../../../routes/b';

describe('B-feature namespace — /api/b/healthcheck', () => {
  const app = express();
  app.use('/api/b', bRoutes);

  it('returns 200 with the canonical Nuqta envelope', async () => {
    const res = await request(app).get('/api/b/healthcheck');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          ok: true,
          namespace: 'b',
          version: '0.1.0',
        }),
      })
    );
    // timestamp must be a parseable ISO date
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.data.timestamp))).toBe(false);
  });
});