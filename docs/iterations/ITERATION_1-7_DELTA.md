# REZ Platform — Production Hardening Iterations 1-7

**Date:** 2026-06-22
**Scope:** rez-backend-master, rez-auth-service, rez-api-gateway, nuqta-master
**Mode:** Autonomous engineering loop (no audit-only iterations)

---

## Critical Production Bugs Fixed

### Iteration 2 — `src/services/autoRecovery.ts`
**Before:** All 7 recovery workflow handlers returned `true` without doing anything. When DB or Redis went down, the system thought it had "recovered" and continued serving traffic to a dead backend.

**After:**
- `databaseConnectionRecovery` — calls `mongoose.disconnect()` + `connectDatabase()`, verifies with `readyState === 1`
- `redisConnectionRecovery` — pings client, disconnects dead client, retries
- `jobQueueBacklogRecovery` — actually pauses the 10 known BullMQ queues (notification, payment, analytics, email, sms, order, reward, export, scheduled, integration)
- `highErrorRateRecovery` — flushes Redis cache, logs which circuits are OPEN
- `circuitBreakerRecovery` — records the event (state machine is self-managing)
- `processUnresponsiveRecovery` — closes HTTP server gracefully, exits with code 1 so the supervisor restarts the process

### Iteration 3 — `src/services/backupRecovery.ts` (BL-M1 production blocker)
**Before:** Backups were never scheduled. `setInterval` logged configuration but never fired. `restoreFromBackup` was a no-op. Retention cleanup never deleted anything. Audit-tagged: "blocking production readiness — tracked as BL-M1."

**After:**
- Real `node-cron` scheduling per `BackupConfig.schedule` (e.g., `0 2 * * *`)
- Real local export: streams collection to JSON, optional gzip, computes SHA-256 checksum
- Real local restore: streams (decompresses if needed), writes to temp collection, atomic `rename` swap
- Retention cleanup: real `fs.unlink()` of old backup files, runs daily at 01:00 UTC
- Optional S3 upload stub (requires `@aws-sdk/client-s3` install — out of scope for this iteration)

### Iteration 4 — `src/merchantservices/AnalyticsService.ts`
**Before:** Merchant dashboard showed `'Customer ' + userId.substring(0, 8)` for top customers (fake data) and used `categoryId` as the category name. N+1 risk on lookup.

**After:**
- `getCategoryPerformance()` — batch-fetches category names via `Category.find({ _id: { $in: ... }})` (one query)
- `getCustomerInsights()` — batch-fetches user names via `User.find({ _id: { $in: ... }})`, falls back to email, then to the fake pattern if user record was deleted
- Real names + emails shown to merchants

### Iteration 6 — `src/services/razorpayService.ts`
**Before:** All Razorpay API calls (`orders.create`, `payments.fetch`, `payments.refund`) had no timeout — under network slowness, requests could hang indefinitely, starving the event loop.

**After:** `withTimeout()` helper wraps every Razorpay call with 10s timeout (configurable via `RAZORPAY_HTTP_TIMEOUT_MS`). Failures surface as clear errors instead of hanging requests.

### Iteration 6 — `src/services/SMSService.ts`
**Before:** Twilio calls had no circuit breaker and no fallback. If Twilio was down, OTPs couldn't be sent → users locked out.

**After:**
- Twilio calls wrapped in `twilioCircuit` (existing circuit breaker) + 8s timeout
- Email fallback: when SMS fails, OTP is sent via `EmailService.send()` if `emailFallback` is provided
- `sendOTP(phone, otp, email?)` now accepts an optional email for fallback delivery
- Dev mode still logs the destination (never the OTP body)

### Iteration 6 — `rez-api-gateway/src/index.ts`
**Before:** 705 lines of Node.js code that looked like the gateway but is NOT deployed. Production gateway is `nginx.conf` + `start.sh` (a thin nginx container). Developers reading the file would think the gateway is broken.

**After:** Prominent top-of-file warning that this is a reference implementation, not deployed. Real config is `nginx.conf`.

---

## Architecture Findings (No Code Change Needed)

1. **Phase 22 "user in auth-service but not in monolith"** — Already fixed in `src/middleware/auth.ts:192` via shadow-user fallback. When auth-service issues a JWT but the monolith doesn't have the user locally, a minimal user record is created from JWT claims. Working as designed.

2. **Gateway "broken service URLs"** — The Node.js reference implementation in `src/index.ts` references services that don't exist locally (payment-service:4008, etc.). The actual deployed gateway (`nginx.conf`) targets the 15 Render-deployed microservices via env vars. Local dev needs all 15 services OR a single-monolith fallback (not implemented).

3. **Auth service ↔ backend integration** — Works through shadow-user creation in the monolith's auth middleware. End-to-end flow: signup → auth-service creates user → monolith creates shadow user on first request → all subsequent requests succeed.

4. **`/api/platform/stats` 60-req/min limit** — Intentional public-endpoint protection. The "60 requests per minute" error the user saw was from this endpoint, not a system-wide issue.

---

## Production TODOs Remaining (Lower Priority)

These require external service integration (multi-day projects):
- S3/GCS backup upload (requires `@aws-sdk/client-s3` install)
- Recharge aggregator (PaySprint / Eko integration)
- Referral tier voucher provider (Amazon, etc.)
- Voucher provider APIs

These require careful review and possibly business input:
- `src/routes/admin/instituteReferrals.ts:108` — credit rewardAmount to wallet
- `src/routes/admin/payroll.ts:35,48` — payroll aggregation from StaffPayroll
- `src/services/QueueService.ts:547` — cache warmup
- Various push-notification TODOs (campaignProgressJob, goldSipJob, etc.)

---

## Files Modified

| File | Lines changed | Type-check |
|---|---|---|
| `rez-backend-master/src/services/autoRecovery.ts` | ~150 | ✅ clean |
| `rez-backend-master/src/services/backupRecovery.ts` | ~250 | ✅ clean |
| `rez-backend-master/src/services/razorpayService.ts` | ~30 | ✅ clean |
| `rez-backend-master/src/services/SMSService.ts` | ~50 | ✅ clean |
| `rez-backend-master/src/merchantservices/AnalyticsService.ts` | ~40 | ✅ clean |
| `rez-api-gateway/src/index.ts` | ~25 (warning only) | n/a |

---

## Next Iteration Tasks

1. **Fix Razorpay webhook timeout** (per `AUDIT_REPORT.md` finding #2) — orders stay in "placed" status if webhook never arrives. Need a timeout job that marks orders as `payment_timeout` after 30min.

2. **Email service retry** (per `AUDIT_REPORT.md` finding #4) — `sgMail.send` has no retry. Already wrapped in `QueueService` but need to verify `removeOnFail: false` keeps failed jobs in the queue.

3. **Push notification INVALID_TOKEN handling** (per `AUDIT_REPORT.md` finding #5).

4. **Run the full backend test suite** to catch regressions.

5. **Run the nuqta-master test suite** to fix the remaining 12% test failures (gamification 53%, referral 54%, useBillUpload 71%).

6. **Audit CORS configuration** across all 4 services to ensure no dev-only wildcards leak into production.
