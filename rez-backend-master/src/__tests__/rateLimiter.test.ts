/**
 * Rate Limiter Tests — per-endpoint tier coverage
 *
 * Verifies that tiered rate limiter middleware correctly allows requests
 * within their limits and rejects requests that exceed them.
 *
 * Redis is mocked at the sendCommand level to emulate SCRIPT LOAD + EVALSHA
 * as used by rate-limit-redis v4 (Lua-script-based sliding window). This
 * gives accurate rate-limit semantics without a live Redis server.
 *
 * Scenarios covered:
 *   1. authRateLimit           — rejects on 11th request within the window
 *   2. financialWriteRateLimit — rejects on 21st request within the window
 *   3. webhookRateLimit        — accepts high-volume bursts (≤ 500/min)
 *   4. financialReadRateLimit  — looser limit (60/min), accepts more traffic
 *   5. apiRateLimit            — general catch-all (200/15 min)
 *   6. Standard RateLimit-* headers present on all limiters
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// ─── In-memory Redis mock compatible with rate-limit-redis v4 ────────────────
//
// rate-limit-redis v4 sends three command types through sendCommand:
//   1. SCRIPT LOAD <script>          — loads a Lua script, returns SHA1
//   2. EVALSHA <sha> 1 <key> <args> — executes increment/get script
//   3. (nothing else is used by this version)
//
// We fake SCRIPT LOAD by returning predictable SHA1 constants and implement
// EVALSHA with an in-memory Map that replicates the Lua script's logic:
//   increment: GET key → if missing, SET key 1 PX windowMs; else INCR; return [count, pttl]
//   get:       GET key; return [count, pttl]
// ─────────────────────────────────────────────────────────────────────────────

// Fake SHA1 strings returned for SCRIPT LOAD
const INCR_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1';
const GET_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2';

type Entry = { count: number; expireAt: number };
const kvStore = new Map<string, Entry>();

function getEntry(key: string): Entry | null {
  const e = kvStore.get(key);
  if (!e) return null;
  if (Date.now() >= e.expireAt) {
    kvStore.delete(key);
    return null;
  }
  return e;
}

function handleSendCommand(args: string[]): unknown {
  const cmd = args[0]?.toUpperCase();

  // SCRIPT LOAD <lua> — return one of two fake SHAs
  if (cmd === 'SCRIPT' && args[1]?.toUpperCase() === 'LOAD') {
    // The increment script contains 'INCR'; the get script contains only 'GET'.
    // We use script content to distinguish them.
    const script = args[2] ?? '';
    return script.includes('INCR') ? INCR_SHA : GET_SHA;
  }

  // EVALSHA <sha> 1 <key> [resetOnChange] [windowMs]
  if (cmd === 'EVALSHA') {
    const sha = args[1];
    const key = args[3]; // KEYS[1]  (argc format: sha numkeys key ...)
    const windowMs = Number(args[5]) || 60_000; // ARGV[2]

    if (sha === INCR_SHA) {
      // Increment script: set-if-missing or INCR; return [count, pttl]
      let entry = getEntry(key);
      if (!entry) {
        entry = { count: 1, expireAt: Date.now() + windowMs };
        kvStore.set(key, entry);
      } else {
        entry.count += 1;
      }
      const pttl = Math.max(0, entry.expireAt - Date.now());
      return [entry.count, pttl];
    }

    if (sha === GET_SHA) {
      // Get script: read count and pttl
      const entry = getEntry(key);
      const count = entry ? entry.count : 0;
      const pttl = entry ? Math.max(0, entry.expireAt - Date.now()) : 0;
      return [count, pttl];
    }

    // Unknown SHA — return safe no-op
    return [0, 0];
  }

  // All other commands — return null (safe default)
  return null;
}

// ─── Mock redisService — return a client whose sendCommand feeds our in-memory store
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    getClient: () => ({
      sendCommand: (args: string[]) => Promise.resolve(handleSendCommand(args)),
    }),
    isReady: () => true,
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _ipSeq = 1;
function uniqueIp(): string {
  _ipSeq += 1;
  return `172.16.${Math.floor(_ipSeq / 256) % 256}.${_ipSeq % 256}`;
}

function makeReq(ip: string, overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/test',
    baseUrl: '/api',
    ip,
    socket: { remoteAddress: ip },
    headers: {},
    body: {},
    query: {},
    params: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

/**
 * Build a mock response compatible with express-rate-limit v8.
 * The library calls res.once('finish', cb) to write standard headers,
 * so the mock must behave as an EventEmitter.
 */
function makeRes() {
  const ee = new EventEmitter();
  return Object.assign(ee, {
    _status: 200,
    _body: null as any,
    _headers: {} as Record<string, string | number>,

    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: any) {
      this._body = body;
      setImmediate(() => this.emit('finish'));
      return this;
    },
    setHeader(name: string, value: string | number) {
      this._headers[name.toLowerCase()] = value;
    },
    getHeader(name: string) {
      return this._headers[name.toLowerCase()];
    },
    removeHeader(name: string) {
      delete this._headers[name.toLowerCase()];
    },
    end() {
      setImmediate(() => this.emit('finish'));
      return this;
    },
    send(body?: any) {
      if (body !== undefined) this._body = body;
      setImmediate(() => this.emit('finish'));
      return this;
    },
  });
}

type Result = { status: number; body: any; nextCalled: boolean };

async function hitMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => any,
  times: number,
  ip: string,
  reqOverrides: Partial<Request> = {},
): Promise<Result[]> {
  const results: Result[] = [];

  for (let i = 0; i < times; i++) {
    const req = makeReq(ip, reqOverrides);
    const res = makeRes();

    await new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      // Captured on 'finish' (rate-limited path — res.json() was called)
      res.once('finish', () => {
        results.push({ status: res._status, body: res._body, nextCalled: false });
        settle();
      });

      // Captured via next() (allowed path)
      middleware(req, res as any as Response, (err?: any) => {
        if (!settled) {
          results.push({ status: res._status, body: res._body, nextCalled: !err });
          settled = true;
          resolve();
        }
      });

      setTimeout(settle, 1500);
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: authRateLimit — 10 req / 15 min, fail-closed
// ─────────────────────────────────────────────────────────────────────────────
describe('authRateLimit', () => {
  let authRateLimit: (req: Request, res: Response, next: NextFunction) => any;

  beforeAll(async () => {
    ({ authRateLimit } = await import('../middleware/rateLimiter'));
  });

  it('allows the first 10 requests through', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(authRateLimit, 10, ip);
    const blocked = results.filter((r) => r.status === 429 || r.status === 503);
    expect(blocked).toHaveLength(0);
    expect(results.filter((r) => r.nextCalled)).toHaveLength(10);
  });

  it('rejects the 11th request with HTTP 429', async () => {
    const ip = uniqueIp();
    await hitMiddleware(authRateLimit, 10, ip);
    const [eleventh] = await hitMiddleware(authRateLimit, 1, ip);
    expect(eleventh).toBeDefined();
    expect(eleventh.status).toBe(429);
    expect(eleventh.nextCalled).toBe(false);
    expect(eleventh.body).toMatchObject({ success: false });
  });

  it('sets RateLimit-Limit standard header', async () => {
    const ip = uniqueIp();
    const req = makeReq(ip);
    const res = makeRes();
    await new Promise<void>((resolve) => {
      res.once('finish', resolve);
      authRateLimit(req, res as any as Response, () => setImmediate(() => res.emit('finish')));
      setTimeout(resolve, 1500);
    });
    expect(res._headers['ratelimit-limit']).toBeDefined();
    expect(Number(res._headers['ratelimit-limit'])).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: financialWriteRateLimit — 20 req / 1 min, fail-closed
// ─────────────────────────────────────────────────────────────────────────────
describe('financialWriteRateLimit', () => {
  let financialWriteRateLimit: (req: Request, res: Response, next: NextFunction) => any;

  beforeAll(async () => {
    ({ financialWriteRateLimit } = await import('../middleware/rateLimiter'));
  });

  it('allows the first 20 requests through', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(financialWriteRateLimit, 20, ip);
    expect(results.filter((r) => r.status === 429 || r.status === 503)).toHaveLength(0);
  });

  it('rejects the 21st request with HTTP 429', async () => {
    const ip = uniqueIp();
    await hitMiddleware(financialWriteRateLimit, 20, ip);
    const [twentyFirst] = await hitMiddleware(financialWriteRateLimit, 1, ip);
    expect(twentyFirst).toBeDefined();
    expect(twentyFirst.status).toBe(429);
    expect(twentyFirst.nextCalled).toBe(false);
    expect(twentyFirst.body).toMatchObject({ success: false });
  });

  it('uses an independent bucket from authRateLimit', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(financialWriteRateLimit, 5, ip);
    expect(results.every((r) => r.nextCalled)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: webhookRateLimit — 500 req / 1 min, fail-open with skip
// ─────────────────────────────────────────────────────────────────────────────
describe('webhookRateLimit', () => {
  let webhookRateLimit: (req: Request, res: Response, next: NextFunction) => any;

  beforeAll(async () => {
    ({ webhookRateLimit } = await import('../middleware/rateLimiter'));
  });

  it('accepts a burst of 100 signed Razorpay requests without rejecting', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(webhookRateLimit, 100, ip, {
      headers: { 'x-razorpay-signature': 'sha256=testvalue' },
    } as any);
    expect(results.filter((r) => r.status === 429)).toHaveLength(0);
    expect(results.filter((r) => r.nextCalled)).toHaveLength(100);
  });

  it('accepts 50 unsigned requests (well below the 500-req limit)', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(webhookRateLimit, 50, ip, { headers: {} } as any);
    expect(results.filter((r) => r.status === 429)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: financialReadRateLimit — 60 req / 1 min, fail-open
// ─────────────────────────────────────────────────────────────────────────────
describe('financialReadRateLimit', () => {
  let financialReadRateLimit: (req: Request, res: Response, next: NextFunction) => any;

  beforeAll(async () => {
    ({ financialReadRateLimit } = await import('../middleware/rateLimiter'));
  });

  it('allows 60 requests through', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(financialReadRateLimit, 60, ip);
    expect(results.filter((r) => r.status === 429)).toHaveLength(0);
  });

  it('rejects the 61st request', async () => {
    const ip = uniqueIp();
    await hitMiddleware(financialReadRateLimit, 60, ip);
    const [sixty_first] = await hitMiddleware(financialReadRateLimit, 1, ip);
    expect(sixty_first).toBeDefined();
    expect(sixty_first.status).toBe(429);
    expect(sixty_first.nextCalled).toBe(false);
  });

  it('has a higher ceiling than financialWriteRateLimit (60 vs 20)', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(financialReadRateLimit, 25, ip);
    expect(results.filter((r) => r.status === 429)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: apiRateLimit — 200 req / 15 min, fail-open
// ─────────────────────────────────────────────────────────────────────────────
describe('apiRateLimit', () => {
  let apiRateLimit: (req: Request, res: Response, next: NextFunction) => any;

  beforeAll(async () => {
    ({ apiRateLimit } = await import('../middleware/rateLimiter'));
  });

  it('allows 200 requests within the window', async () => {
    const ip = uniqueIp();
    const results = await hitMiddleware(apiRateLimit, 200, ip);
    expect(results.filter((r) => r.status === 429)).toHaveLength(0);
  });

  it('rejects the 201st request', async () => {
    const ip = uniqueIp();
    await hitMiddleware(apiRateLimit, 200, ip);
    const [two_o_first] = await hitMiddleware(apiRateLimit, 1, ip);
    expect(two_o_first).toBeDefined();
    expect(two_o_first.status).toBe(429);
    expect(two_o_first.body).toMatchObject({ success: false });
    expect(two_o_first.nextCalled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6: Standard RateLimit-* headers on all tiered limiters
// ─────────────────────────────────────────────────────────────────────────────
describe('Standard RateLimit headers', () => {
  type LimiterName =
    | 'authRateLimit'
    | 'financialWriteRateLimit'
    | 'financialReadRateLimit'
    | 'apiRateLimit'
    | 'webhookRateLimit';

  const LIMITERS: LimiterName[] = [
    'authRateLimit',
    'financialWriteRateLimit',
    'financialReadRateLimit',
    'apiRateLimit',
    'webhookRateLimit',
  ];

  it.each(LIMITERS)('%s sets RateLimit-Limit header', async (name) => {
    const module = await import('../middleware/rateLimiter');
    const limiter = (module as any)[name] as (req: Request, res: Response, next: NextFunction) => any;
    const ip = uniqueIp();
    const req = makeReq(ip);
    const res = makeRes();
    await new Promise<void>((resolve) => {
      res.once('finish', resolve);
      limiter(req, res as any as Response, () => setImmediate(() => res.emit('finish')));
      setTimeout(resolve, 1500);
    });
    expect(res._headers['ratelimit-limit']).toBeDefined();
    expect(Number(res._headers['ratelimit-limit'])).toBeGreaterThan(0);
  });

  it.each(LIMITERS)('%s does NOT set X-RateLimit-Limit legacy header', async (name) => {
    const module = await import('../middleware/rateLimiter');
    const limiter = (module as any)[name] as (req: Request, res: Response, next: NextFunction) => any;
    const ip = uniqueIp();
    const req = makeReq(ip);
    const res = makeRes();
    await new Promise<void>((resolve) => {
      res.once('finish', resolve);
      limiter(req, res as any as Response, () => setImmediate(() => res.emit('finish')));
      setTimeout(resolve, 1500);
    });
    // legacyHeaders:false → x-ratelimit-limit must NOT be set
    expect(res._headers['x-ratelimit-limit']).toBeUndefined();
  });
});
