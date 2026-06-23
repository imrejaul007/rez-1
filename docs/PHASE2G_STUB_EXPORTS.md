# Phase 2G — Stub Exports for TS2305 Errors

## Summary

Added stub exports for all 7 TS2305 errors in rez-backend-master to satisfy the TypeScript type system during the Phase 2G merge. No real implementation was added — each stub is a no-op or safe default that lets the build pass.

## Initial TS2305 count: 7
## Final TS2305 count: 0

## Stubs added

| File | Export | Signature | Return default |
|------|--------|-----------|----------------|
| `src/config/cronJobs.ts` | `scheduleCronJob` | `(schedule: string, callback: () => Promise<void>, description?: string) => void` | `void` — logs a warning and does nothing |
| `src/config/prometheus.ts` | `aggregatorSyncConflicts` | `any` (used as a Prometheus counter) | `{ inc: () => void }` — no-op counter |
| `src/utils/circuitBreaker.ts` | `getCircuit` | `(name: string) => CircuitBreaker` | new `CircuitBreaker({ name })` |
| `src/middleware/uploadSecurity.ts` | `fromBuffer` (import alias) | imported from `file-type` | Re-export of `fileTypeFromBuffer` from `file-type` v21 |

## Stub details

### 1. `cronJobs.scheduleCronJob`
```ts
// STUB: added during Phase 2G merge — implement before production
export const scheduleCronJob = (
  schedule: string,
  callback: () => Promise<void>,
  description?: string
): void => {
  console.warn(
    `[STUB] scheduleCronJob called (schedule="${schedule}", desc="${description ?? ''}") but not implemented`
  );
};
```
Called by 4 files:
- `src/jobs/cashbackHoldCreditJob.ts`
- `src/jobs/failedRefundRetryJob.ts`
- `src/jobs/runOfferAutomation.ts`
- `src/jobs/stuckOrderCancelJob.ts`

### 2. `prometheus.aggregatorSyncConflicts`
```ts
// STUB: added during Phase 2G merge — implement before production
export const aggregatorSyncConflicts: any = {
  inc: (_labels?: Record<string, string>) => {
    /* no-op stub */
  },
};
```
Called by `src/services/aggregatorSyncService.ts:91` as `aggregatorSyncConflicts.inc({ platform, field })`.

### 3. `circuitBreaker.getCircuit`
```ts
// STUB: added during Phase 2G merge — implement before production
export const getCircuit = (name: string): CircuitBreaker => {
  return new CircuitBreaker({ name });
};
```
Called by `src/utils/serviceClient.ts` (3 sites: GET, POST, PUT, PATCH) as `circuit.exec(fn)`.

### 4. `file-type.fromBuffer` (special case)
The third-party `file-type` package v21.3.4 (installed) no longer exports `fromBuffer`. It now exports `fileTypeFromBuffer` and `fileTypeFromFile`.

Since we cannot edit the package, the practical stub is to import the renamed symbol locally. The calling file `src/middleware/uploadSecurity.ts` was changed from:
```ts
import { fromBuffer } from 'file-type';
```
to:
```ts
// STUB: file-type v21 no longer exports `fromBuffer` — use `fileTypeFromBuffer` instead
import { fileTypeFromBuffer as fromBuffer } from 'file-type';
```
This keeps the call site `await fromBuffer(file.buffer)` unchanged and the rest of the file untouched.

## Skipped (not TS2305)

The following related errors exist but are TS2339 (handled by other agents), not TS2305:
- `NotificationService.notifyOpportunity` — TS2339 in `src/jobs/opportunityNotificationJob.ts:212`
- `NotificationService.notifyProgress` — TS2339 in `src/jobs/progressNudgeJob.ts:89`
- `MerchantNotificationService.notify` — TS2339 in multiple files (handled by model-fields agent)

## Verification

`npm run build` post-stubs:
- TS2305 errors: **0** (down from 7)
- Other error types (TS2339, TS2345, TS2551, etc.) remain as expected — other agents own them.
