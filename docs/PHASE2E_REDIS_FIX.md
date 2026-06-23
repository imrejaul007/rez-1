# Phase 2E: Redis Method Rename Fixes (TS2551)

## Initial TS2551 Error Count
**20 errors** in 5 files, all `RedisClientType` (from `redis` library v5 camelCase renames).

## Files Modified (5)
1. `src/jobs/anomalyDetectionJob.ts`
2. `src/middleware/eventLogger.ts`
3. `src/services/anomalyDetection.ts`
4. `src/services/autoRecovery.ts`
5. `src/services/backupRecovery.ts`
6. `src/services/secretsRotation.ts`

## Method Renames Applied

| Old | New | Count |
|---|---|---|
| hget | hGet | 7 |
| hincrby | hIncrBy | 1 |
| zadd | zAdd | 1 |
| lpush | lPush | 5 |
| lrange | lRange | 4 |
| ltrim | lTrim | 3 |
| flushdb | flushDb | 2 |
| hset | hSet | 1 |
| **Total** | | **24** |

(Some renames appear at 2 sites each — the custom  literal in `anomalyDetection.ts`, `autoRecovery.ts`, `backupRecovery.ts` had the old method name both as a key and inside the function body. The  key in `anomalyDetection.ts` was kept as lowercase (e.g. `lpush`) but the inner Redis call uses `lPush`. The  object acts as a thin wrapper; only the inner Redis call site is what TypeScript reports as TS2551.)

## Final TS2551 Count
**0**

## Notes / Skipped Lines (arg-shape issues — left for other agents)
- `src/middleware/eventLogger.ts(49,11): error TS2345: Argument of type 'number' is not assignable to parameter of type 'SortedSetMember | SortedSetMember[]'`
  - This is a `zAdd` signature change in `redis` v5 (the new API takes a `SortedSetMember | SortedSetMember[]` object, not positional `(key, score, member)`). It's a TS2345, not TS2551, and is flagged here per the brief.
- `src/services/redisService.ts(237,48): error TS2345: Argument of type 'number' is not assignable to parameter of type 'RedisArgument'`
- `src/services/redisService.ts(241,9): error TS2322: Type 'string' is not assignable to parameter of type 'number'`
  - These appear to be `dbSize()` / `flushAll()` return-type mismatches caused by the `redis` v5 typing changes. Not TS2551 — flagged.

## Other Redis-touching files left untouched (no TS2551 errors):
- `src/services/apiKeyRotation.ts` — uses `Redis` from `ioredis` (lowercase methods still valid).
- `src/workers/broadcastWorker.ts` — uses `getRedis()` from `ioredis` (`src/config/redis-pool.ts`).
- `src/middleware/financialRateLimiter.ts` — uses `(client as any).pipeline()`, type bypassed.
- `src/services/ReferralAbuseDetector.ts` — uses `(client as any).zadd`, type bypassed.
- `src/__tests__/mocks/ioredis.ts` — mock for ioredis, not `redis` library.
