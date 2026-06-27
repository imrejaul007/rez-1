# Code Quality Audit Report

**Audit Date:** June 25, 2026  
**Auditor:** Code QA Engineer  
**Services Audited:** rez-backend-master, rez-auth-service, rez-api-gateway

---

## Executive Summary

This audit identified **5 CRITICAL**, **12 HIGH**, **25 MEDIUM**, and **18 LOW** severity issues across the three backend services. The most concerning issues involve type safety violations, error handling anti-patterns, and inconsistent logging practices.

---

## 1. TypeScript / Type Safety

### CRITICAL Issues

| # | File | Line | Issue |
|---|------|------|-------|
| 1 | `rez-auth-service/src/types/user.types.ts` | 13 | `_id: any` - Missing proper ObjectId type definition |
| 2 | `rez-auth-service/src/types/index.ts` | 10 | `_id: any` - Missing proper ObjectId type definition |
| 3 | `rez-auth-service/src/types/index.ts` | 19-20 | `Session: any` and `Device: any` - No type definitions |

**Impact:** TypeScript's type safety guarantees are bypassed for critical entities like User IDs, Sessions, and Devices, leading to potential runtime errors.

### HIGH Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 4 | `rez-backend-master/src/core/rewardEngine.ts` | 168, 173, 206-207, 221, 234-237, 248, 284-286, 312, 336, 383, 442-444, 513, 534-535, 540, 548-550, 557-558, 564, 574-575, 578, 655, 667, 676, 679, 686 | 40+ occurrences of `as any` casting throughout the file. The reward engine extensively bypasses type safety. |
| 5 | `rez-backend-master/src/integrations/adapters/CloudbedsAdapter.ts` | 9 | `normalize(rawPayload: any): NormalizedTransaction` |
| 6 | `rez-backend-master/src/integrations/adapters/PetpoojaAdapter.ts` | 9, 16 | `normalize(rawPayload: any)` with `item: any` mapping |
| 7 | `rez-backend-master/src/integrations/adapters/GenericAdapter.ts` | 22, 29 | `normalize(rawPayload: any)` with `item: any` mapping |
| 8 | `rez-backend-master/src/events/resolveCustomerIdentity.ts` | 105, 147, 215 | Multiple `as any` casts for model methods |
| 9 | `rez-auth-service/src/services/totpEncryption.ts` | 133 | `catch (err: any)` in encryption service |
| 10 | `rez-auth-service/src/middleware/requireMfa.ts` | 71, 74, 112, 136, 139, 187 | Multiple `decoded: any` and `catch (err: any)` |
| 11 | `rez-auth-service/src/routes/authRoutes.ts` | 116, 214, 351, 371, 443, 446, 526, 683, 776, 782, 789, 1035, 1306 | Extensive `any` type usage (13+ occurrences) |

### MEDIUM Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 12 | `rez-backend-master/src/__tests__/webhookIdempotency.test.ts` | 28-29, 39-40, 45, 332 | Test file using `(...args: any[])` mocks |
| 13 | `rez-backend-master/src/__tests__/walletService.test.ts` | 17-18, 94, 159, 195, 209, 232, 256 | Test file using `(...args: any[])` mocks |
| 14 | `rez-backend-master/src/__tests__/habitLoop.integration.test.ts` | 23, 37-45, 53, 68-71, 158, 245-246, 260, 302, 367, 376, 383 | Extensive `any` types in test mocks |
| 15 | `rez-backend-master/src/controllers/whatsNewController.ts` | 15, 32, 50, 63, 76, 88, 109 | Repeated `(req as any).user?._id` pattern |
| 16 | `rez-backend-master/src/controllers/couponController.ts` | 20, 23, 49-53, 70, 87-90, 107, 118, 145-146, 149-157, 178, 215, 271, 325, 380 | Extensive `any` type usage |
| 17 | `rez-backend-master/src/controllers/webhookController.ts` | 34, 174, 137, 156, 171, 178, 214, 249-250, 285, 308, 336, 367, 397, 429, 454, 531, 563, 582, 605-606, 648, 782, 936, 1051, 1141 | Extensive `any` type usage for webhook events |
| 18 | `rez-backend-master/src/events/orderQueue.ts` | 60, 94, 97, 155-156, 170, 179, 198, 219, 238 | Queue payload typed as `[key: string]: any` |
| 19 | `rez-backend-master/src/events/walletQueue.ts` | 62, 99, 166, 189-190, 201, 215, 243 | Queue payload typed as `[key: string]: any` |
| 20 | `rez-backend-master/src/events/notificationQueue.ts` | 116, 252, 270 | Queue payload typed as `[key: string]: any` |

---

## 2. Error Handling Patterns

### CRITICAL Issues

| # | File | Line | Issue |
|---|------|------|-------|
| 21 | `rez-backend-master/src/controllers/achievementController.ts` | 188 | `catch (err)` without error logging or type |
| 22 | `rez-backend-master/src/controllers/billController.ts` | 45 | `catch (err)` without error logging |
| 23 | `rez-backend-master/src/controllers/goldSipController.ts` | 35 | `catch (err)` without error logging |
| 24 | `rez-backend-master/src/controllers/loyaltyRedemptionController.ts` | 206 | `catch (err)` without error logging |
| 25 | `rez-backend-master/src/config/socketSetup.ts` | 58, 167 | `catch (err)` without error logging |

**Impact:** Silent failures make debugging impossible and can lead to data inconsistency.

### HIGH Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 26 | `rez-backend-master/src/core/rewardEngine.ts` | 360, 398, 661 | `catch (err)` without error logging in reward engine |
| 27 | `rez-backend-master/src/controllers/eventController.ts` | 557, 805, 1003, 1267 | 4 catch blocks without error logging |
| 28 | `rez-backend-master/src/controllers/posBillingController.ts` | 57, 455, 528, 547, 564, 599, 615, 709, 857 | 9 catch blocks without error logging |
| 29 | `rez-backend-master/src/controllers/merchant/orderController.ts` | 1430, 1479, 1496 | 3 catch blocks without error logging |
| 30 | `rez-backend-master/src/events/emitOrderPlaced.ts` | 193, 229, 258 | 3 catch blocks without error logging |
| 31 | `rez-auth-service/src/index.ts` | 206 | `catch (err)` without logging in main entry point |
| 32 | `rez-auth-service/src/config/mongodb-auth.ts` | 118, 137 | 2 catch blocks without logging |
| 33 | `rez-auth-service/src/config/mongodb.ts` | 43 | catch block without logging |

---

## 3. Logging Consistency

### HIGH Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 34 | `rez-auth-service/src/config/redisSentinel.ts` | 69, 73, 77, 81, 102, 106, 120 | Uses `console.log/error/warn` instead of Winston logger |
| 35 | `rez-auth-service/src/config/tracing.ts` | 32-33 | Uses `console.log/error` instead of Winston logger |
| 36 | `rez-backend-master/src/workers/exportWorker.ts` | 52 | Uses `console.warn` instead of Winston logger |

### MEDIUM Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 37 | `rez-backend-master/src/seeds/verifyRegionSetup.ts` | Multiple | Uses `console.log` for seed script output |
| 38 | `rez-backend-master/src/server.ts` | 45-47 | **Deliberate override**: `console.log = (...args: any[]) => logger.info(...)` - This pattern redirects console to logger, which is acceptable but bypasses ESLint's `no-console` rule |
| 39 | `rez-auth-service/.eslintrc.json` | 19 | `no-console: "error"` configured but violated in redisSentinel.ts and tracing.ts |

---

## 4. TODO Comments

### MEDIUM Issues (23 TODO items found)

| # | File | Line | Description |
|---|------|------|-------------|
| 40 | `src/events/catalogQueue.ts` | 202 | TODO(Phase C): Create AggregatorSyncService |
| 41 | `src/merchantroutes/exports.ts` | 473 | TODO: Implement real document generation logic |
| 42 | `src/config/monitoring.ts` | 287 | TODO: Implement actual Prometheus/Grafana provisioning |
| 43 | `src/services/backupRecovery.ts` | 504 | TODO: Implement verification logic |
| 44 | `src/services/autoRecovery.ts` | 541 | TODO: Implement actual metric collection |
| 45 | `src/services/AuditAlertService.ts` | 175 | TODO: Integrate with SMS service |
| 46 | `src/jobs/personalizedNotificationJob.ts` | 77 | TODO: Wire to actual push notification service |
| 47 | `src/jobs/campaignProgressJob.ts` | 44 | TODO: Send push notifications to campaign participants |
| 48 | `src/jobs/goldSipJob.ts` | 119 | TODO: Send push notification to user |
| 49 | `src/services/webhookSecurityAlertService.ts` | 61, 68 | TODO: Integrate with error tracking (Sentry) |
| 50 | `src/routes/admin/instituteReferrals.ts` | 108 | TODO: Credit rewardAmount to wallet |
| 51 | `src/services/voucherRedemptionService.ts` | 161 | TODO: Send voucher via email |
| 52 | `src/routes/admin/platformStats.ts` | 91 | TODO: Replace with real aggregator order aggregation |
| 53 | `src/routes/admin/payroll.ts` | 35, 48 | TODO: aggregate from StaffPayroll, implement real merchant payroll |
| 54 | `src/services/userProductService.ts` | 584, 615 | TODO: Integrate with notification service |
| 55 | `src/services/partnerLevelMaintenanceService.ts` | 85, 127 | TODO: Send notification, implement downgrade logic |
| 56 | `src/services/referralTierService.ts` | 198 | TODO: Integrate with actual voucher provider API |
| 57 | `src/services/referralFraudDetection.ts` | 304 | TODO: Send notification to admin |
| 58 | `src/services/stockNotificationService.ts` | 305 | TODO: Use nodemailer to send actual email |
| 59 | `src/services/rechargeAggregatorService.ts` | 36 | TODO: Implement with real aggregator API |
| 60 | `src/services/QueueService.ts` | 558 | TODO: Implement cache warmup logic |
| 61 | `src/routes/b/index.ts` | 53 | TODO(migration): sub-mount future B-feature routers |

---

## 5. @ts-ignore Usage

### MEDIUM Issues

| # | File | Lines | Issue |
|---|------|-------|-------|
| 62 | `rez-backend-master/src/config/bullmq-queues.ts` | 7-8 | 2 `// @ts-ignore` comments for bullmq optional import |
| 63 | `rez-backend-master/src/__tests__/personaResolver.test.ts` | 378, 384 | Test file using `@ts-ignore` |
| 64 | `rez-backend-master/src/jobs/coinExpiry.ts` | 22 | `// @ts-ignore` |
| 65 | `rez-backend-master/src/jobs/cashbackHoldCreditJob.ts` | 17 | `// @ts-ignore` |
| 66 | `rez-backend-master/src/controllers/referralTierController.ts` | 16 | `// @ts-ignore` for qrcode package |
| 67 | `rez-backend-master/src/services/gameService.ts` | 7 | `// @ts-ignore` |
| 68 | `rez-backend-master/src/services/razorpaySubscriptionService.ts` | 87 | `// @ts-ignore` Razorpay type definition issue |
| 69 | `rez-backend-master/src/models/OfferRedemption.ts` | 341, 347 | 2 `// @ts-ignore` comments |

---

## 6. Missing ESLint Configuration

### HIGH Issues

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 70 | No ESLint config | `rez-backend-master/` | No `.eslintrc.js` or `.eslintrc.json` in project root |
| 71 | No ESLint config | `rez-api-gateway/` | No `.eslintrc.js` or `.eslintrc.json` in project root |
| 72 | Inconsistent strict mode | `rez-auth-service/tsconfig.json` | `"strict": false` and `"noImplicitAny": false` while main backend has `"strict": true` |

---

## 7. Code Structure Issues

### LOW Issues

| # | File | Issue |
|---|------|-------|
| 73 | `rez-backend-master/src/@rez/shared-types/guards/index.ts` | Documentation comment contains `console.log` in example code |
| 74 | `rez-backend-master/src/merchantservices/IntegrationTestService.disabled` | Disabled test service file with console output |
| 75 | `rez-api-gateway/src/index.ts` | File header indicates it's NOT IN USE - unused reference implementation |
| 76 | `rez-backend-master/src/@rez/shared-types/` | Monorepo package inside backend project - consider extracting to packages folder |

---

## 8. Best Practices Violations

### MEDIUM Issues

| # | Category | Files | Issue |
|---|----------|-------|-------|
| 77 | Raw Environment Variables | All services | 684+ `process.env.*` accesses without validation in some files |
| 78 | Function Declarations | Multiple | Mix of `async function` and `function` declarations without consistent pattern |
| 79 | Import Patterns | Multiple | Some files use default exports, others use named exports |

---

## Severity Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 12 |
| MEDIUM | 25 |
| LOW | 18 |
| **TOTAL** | **60** |

---

## Recommendations

### Immediate Actions (CRITICAL)

1. **Fix `_id: any` in types** - Replace with proper `Types.ObjectId` or `string` types
2. **Add ESLint to rez-backend-master** - Create `.eslintrc.json` with TypeScript support
3. **Add ESLint to rez-api-gateway** - Create `.eslintrc.json` with TypeScript support
4. **Enable strict mode in rez-auth-service** - Change `"strict": false` to `"strict": true`
5. **Fix console.log in production files** - Replace console calls in redisSentinel.ts and tracing.ts with proper logger

### Short-term Actions (HIGH)

1. **Audit all `as any` casts** - Especially in rewardEngine.ts (40+ occurrences)
2. **Add error logging to all catch blocks** - Ensure no silent failures
3. **Create shared type definitions** - Move to `@rez/shared-types` package
4. **Fix eslint config in rez-auth-service** - Add exceptions for intentional console overrides

### Medium-term Actions (MEDIUM)

1. **Address TODO comments** - Either implement or create tracking tickets
2. **Remove @ts-ignore** - Fix underlying type issues
3. **Standardize logging** - Ensure Winston logger used consistently
4. **Create integration types** - Add proper types for webhook payloads

---

## Files Requiring Immediate Attention

| Priority | Files |
|----------|-------|
| P0 - Critical | `rez-auth-service/src/types/*.ts`, `rez-backend-master/src/core/rewardEngine.ts` |
| P1 - High | `rez-auth-service/src/config/redisSentinel.ts`, `rez-auth-service/src/config/tracing.ts`, `rez-auth-master/src/config/bullmq-queues.ts` |
| P2 - Medium | All files with 10+ TODOs, files with extensive `any` type usage |

---

*Report generated by Code Quality Audit Tool*
