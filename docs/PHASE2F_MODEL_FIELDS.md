# Phase 2F: Model Interface Field Additions

## Initial TS2339 count: 41

## Per-model field additions

| Model | Field added | Type | File | Line in interface |
|---|---|---|---|---|
| IStorePayment | `merchantId` | `Types.ObjectId` | `src/models/StorePayment.ts` | 82 |
| IStorePayment | `gstDetails` | sub-interface `{ isGstBill?, gstin?, gstNumber?, cgst?, sgst?, igst?, totalGst?, gstRate?, taxAmount? }` | `src/models/StorePayment.ts` | 83–93 |
| IStorePayment | `invoiceNumber` | `string` | `src/models/StorePayment.ts` | 94 |
| IStorePayment | `invoiceDate` | `Date` | `src/models/StorePayment.ts` | 95 |
| IStorePayment | `billNumber` | `string` | `src/models/StorePayment.ts` | 96 |
| IStorePayment | `totalAmount` | `number` | `src/models/StorePayment.ts` | 97 |
| IPrivePostSubmission | `user` | `mongoose.Types.ObjectId` (optional alias for `userId`) | `src/models/PrivePostSubmission.ts` | 6 |
| IPriveCampaign | `maxSubmissions` | `number` | `src/models/PriveCampaign.ts` | 54 |
| ICoinConversion | `rezToInr` | `number` | `src/models/WalletConfig.ts` | 56 |
| IStore | `tableConfig` | `Array<{ tableNumber, capacity?, x?, y?, status?, shape? }>` | `src/models/Store.ts` | 341 |
| IStore | `totalTables` | `number` | `src/models/Store.ts` | 353 |
| IStore | `storeType` | `string` | `src/models/Store.ts` | 352 |
| IMerchant | `currentPlan` | `string` | `src/models/Merchant.ts` | 170 |
| IMerchant | `planExpiresAt` | `Date` | `src/models/Merchant.ts` | 171 |
| IFeatureFlag | `rolloutPercentage` | `number` | `src/models/FeatureFlag.ts` | 14 |
| IPayment | `refundedAmount` | `number` | `src/models/Payment.ts` | 38 |

## Stub methods added

| Class | Method | File | Line |
|---|---|---|---|
| MerchantNotificationService | `notify(...args: any[]): Promise<any>` | `src/services/merchantNotificationService.ts` | 927 |

## Final TS2339 count: 6 (down from 41)

## Errors not fixed (out of scope per task description)

The remaining 6 TS2339 errors are method-missing errors on service classes (not interface field errors) and were not listed in the task scope:

| Error | Reason out of scope |
|---|---|
| `StreakService.recordActivity` (×2) — `src/events/gamificationQueue.ts:149,160` | Missing method on service class. Task description only specified `MerchantNotificationService.notify` as a stub method case. Not in the field-addition table. |
| `NotificationService.notifyOpportunity` — `src/jobs/opportunityNotificationJob.ts:212` | Missing static method on a different service class (`NotificationService`, not `MerchantNotificationService`). Out of scope. |
| `NotificationService.notifyProgress` — `src/jobs/progressNudgeJob.ts:89` | Missing static method on `NotificationService`. Out of scope. |
| `prometheus.readModelStaleness` — `src/jobs/slaMonitorJob.ts:68` | Missing config export (TS2305-style issue masquerading as TS2339 — `typeof import(...)` union). Task says TS2305 is handled by another agent. |
| `prometheus.merchantEventQueueBacklog` — `src/jobs/slaMonitorJob.ts:102` | Missing config export. Out of scope. |

These 6 errors would require either (a) adding stub methods to multiple service classes (same pattern as `MerchantNotificationService.notify`), or (b) adding missing exports to `src/config/prometheus.ts`. Both are class/config changes, not interface field additions, and were not specified in the task's table of fields-to-add.

## Summary

Added 16 fields to 8 interfaces. Added 1 stub method to 1 class. TS2339 count: 41 → 6.
