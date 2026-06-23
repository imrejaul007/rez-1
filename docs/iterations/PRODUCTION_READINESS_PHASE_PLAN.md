# REZ Stack — Phase-by-Phase Plan to 100% Production-Ready

> **Generated:** 2026-06-22
> **Scope:** `C:\Users\user\Downloads\rez-backend-master\`
> **Inputs:** 4 parallel audits on 2026-06-22 + 30+ prior iteration reports (`AUDIT.md`, `ITERATION_1-7_DELTA.md`, `ITERATION_8-26_DELTA.md`, `SECURITY_FIXES_ITER*.md`, `PRODUCTION_READINESS_*.md`, `FIX_PLAN.md`, `RUNBOOK.md`).
> **Goal:** A single phase-ordered execution plan that any future iteration (or human) can pick up and execute end-to-end.

---

## 0. Current State (where we are)

- ✅ All 4 repos build cleanly (`rez-backend-master`, `rez-auth-service`, `rez-api-gateway` is nginx-only, `nuqta-master`).
- ✅ 26 production bugs fixed across iterations 1-26 (5 critical security, 4 high reliability, 3 perf, 14 cleanup).
- ✅ 13/13 smoke tests pass (end-to-end OTP login via gateway).
- ✅ TypeScript clean, 0 hardcoded creds, 0 merge stubs remaining.
- ⚠️ 1 theoretical high CVE remaining (mongoose 8.23 `$nor` — `rez-backend-master` only, not exploited in our code).
- ⚠️ Docker Desktop is not running on the audit machine (services down).
- ⚠️ 78 distinct issues still open, totalling ~12-18 working days of work.

**The structure of this plan:** every phase is independently runnable, has clear "done" criteria, and is sequenced so each phase unblocks the next. Each phase is a discrete, bounded chunk — no phase is larger than 2 days of work.

---

## 1. Phase Order and Dependencies

```
Phase 1  — Secrets & Dev/Prod Hygiene (BLOCKER, 1 day)
Phase 2  — Dead Code Deletion (low risk, 1 day)
Phase 3  — Frontend API Client Consolidation (1-2 days)
Phase 4  — Frontend Production Gaps (2 days)
Phase 5  — Backend Hardening — Performance & Limits (2 days)
Phase 6  — Backend Hardening — Code Quality & File Splits (4-5 days)
Phase 7  — Mongoose 8.23 Migration (the only high CVE left) (2-3 days)
Phase 8  — Test Coverage Cleanup (3-4 days)
Phase 9  — CI/CD & Documentation (2 days)
Phase 10 — Pre-Production Operator Actions (requires business input) (1 day)
Phase 11 — End-to-End Re-Verification (0.5 day)
```

Total: **~18-22 working days** of focused engineering. Phases 1-4 are "make it safe to share / deploy". Phases 5-8 are "make it solid". Phases 9-11 are "make it operationally complete".

---

## 2. Phase 1 — Secrets & Dev/Prod Hygiene (BLOCKER, 1 day)

**Why first:** This is the only phase with security data-exposure risk. Real cloud credentials and API keys are sitting in the working tree.

### Tasks

#### 1.1 Scrub real keys from `nuqta-master/.env` (CRITICAL)
- **File:** `nuqta-master/.env:47, 48, 64`
  - Line 47: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD3iZHeRYgAH2WQNSmhPZqNLqJQ2mdvhUA`
  - Line 48: `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyD3iZHeRYgAH2WQNSmhPZqNLqJQ2mdvhUA`
  - Line 64: `EXPO_PUBLIC_OPENCAGE_API_KEY=41fb7524f9a947cca82488a7294b0c11`
- **Action:** Replace with `your-google-maps-api-key` / `your-opencage-api-key`.
- **Action (separate):** Rotate the keys in Google Cloud Console and OpenCage dashboard (treat them as compromised if the .env was ever pushed).
- **Verify:** `grep -E "AIza|opencage" nuqta-master/.env` returns no real keys.

#### 1.2 Scrub real Atlas creds from `rez-backend-master/.env` and `rez-auth-service/.env` (CRITICAL)
- **Files:**
  - `rez-backend-master/.env:27, 30, 37` — JWT secrets, Mongo Atlas URI
  - `rez-auth-service/.env:18-29, 33, 36, 39, 66` — JWT secrets, Mongo Atlas URI, Sentry DSN
- **Action:** Replace with placeholders. Move real values to a password manager (1Password, Bitwarden, etc.).
- **Verify:** `grep -E "mongodb\+srv|cluster0" rez-backend-master/.env rez-auth-service/.env` returns no hits.
- **Verify:** `_scrub_creds.mjs` returns "Found credentials in 0 files."

#### 1.3 Fix `CORS_ORIGIN=*` in `rez-backend-master/.env:8`
- **Action:** Change to `CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:10000`
- **Source fix (parallel):** wire `validateCorsConfiguration` body into `rez-backend-master/src/server.ts:217-235` (it's currently in dead code at `src/middleware/corsConfig.ts`). This ensures prod refuses `CORS_ORIGIN=*` at boot.

#### 1.4 Add `EXPO_PUBLIC_VAPID_KEY` to `nuqta-master/.env.example` (CRITICAL for build)
- **File:** `nuqta-master/app.config.js:27` references `process.env.EXPO_PUBLIC_VAPID_KEY` but it's not in `.env` or `.env.example`.
- **Action:** Add `EXPO_PUBLIC_VAPID_KEY=your-vapid-public-key-here` to `.env.example` with a comment explaining the value to obtain.

### Done Criteria
- `grep -rE "AIza|opencage|mongodb\+srv" .` (excluding `node_modules`, `.git`) returns 0 hits in `.env` files.
- `bash smoke-test.sh` still passes (sanity check that we didn't break dev env).
- `.env.example` files are complete and contain placeholders only.

---

## 3. Phase 2 — Dead Code Deletion (low risk, 1 day)

**Why now:** Removes confusion for subsequent phases. Low risk, high clarity benefit.

### Tasks

#### 2.1 Delete dormant `rez-backend/` directory (76 MB, 1,965 files)
- **Action:** `rm -rf rez-backend`
- **Verify:** `docker compose -f docker-compose.dev.yml config | grep context` — the build context is `./rez-backend-master` (correct), not `./rez-backend`.

#### 2.2 Delete `rez-api-gateway/src/` (3,843 lines, 143 KB) and `rez-api-gateway/test/`
- **Action:** `rm -rf rez-api-gateway/src rez-api-gateway/test`
- **Verify:** `cat rez-api-gateway/Dockerfile` — it only copies `nginx.conf` + `start.sh`, so this deletion is safe.

#### 2.3 Delete `nuqta-master/tests.bak/` (16 files, 272 KB)
- **Action:** `rm -rf nuqta-master/tests.bak`

#### 2.4 Delete `nuqta-master/errors-*.txt` (10 files, 2.1 MB)
- **Action:** `rm nuqta-master/errors*.txt`
- **Add to `.gitignore`:** `nuqta-master/.gitignore` — append `errors*.txt` and `tests.bak`

#### 2.5 Delete `rez-backend-master/src/middleware/corsConfig.ts` (242 lines, zero importers)
- **Action:** `rm rez-backend-master/src/middleware/corsConfig.ts`
- **Source fix:** wire `validateCorsConfiguration` body into `rez-backend-master/src/server.ts:217-235` (see Phase 1.3).

#### 2.6 Delete frontend duplicate config files
- **Files:**
  - `nuqta-master/config/api.ts` (its own axios instance, redundant with `services/apiClient.ts`)
  - `nuqta-master/config/api.config.js` (duplicate `API_CONFIG` in plain JS, only tests.bak/ referenced it)
  - `nuqta-master/config/index.ts` (re-exports from `config/api.ts` — dead once that's gone)
- **Action:** `rm nuqta-master/config/{api.ts,api.config.js,index.ts}`
- **Verify:** `grep -rn "from.*config/api" nuqta-master/src nuqta-master/app` returns 0 hits.

#### 2.7 Delete `nuqta-master/utils/enhancedApiClient.ts` (no production importers)
- **Verify:** `grep -rn "enhancedApiClient" nuqta-master/app nuqta-master/components nuqta-master/services nuqta-master/hooks` returns 0 hits outside the file itself.
- **Action:** `rm nuqta-master/utils/enhancedApiClient.ts`

#### 2.8 Delete 6 empty `tmpclaude-*-cwd` files in `rez-backend-master/src/`
- **Action:** `rm rez-backend-master/src/tmpclaude-*-cwd`

#### 2.9 Implement or delete 3 remaining `STUB:` comments
- **Files:**
  - `rez-backend-master/src/config/queue.config.ts:1` (bull→bullmq migration note — delete the comment, no code change)
  - `rez-backend-master/src/controllers/travelWebhookController.ts:140` ("Product pricing update not implemented" — implement the TODO or remove the dead code path)
  - `rez-backend-master/src/middleware/uploadSecurity.ts:2` (file-type v21 migration note — verify the import path works, delete the comment)

#### 2.10 Delete `rez-backend-master;C` directory (cp-mishap duplicate)
- **Action:** `rm -rf "rez-backend-master;C"`

### Done Criteria
- Total disk freed: ~80 MB.
- `find . -name "*.bak" -o -name "tests.bak" -o -name "tmpclaude-*" -o -name "errors*.txt" 2>/dev/null` returns 0 hits outside `node_modules`.
- All 4 repos still build clean.
- Smoke test still passes.

---

## 4. Phase 3 — Frontend API Client Consolidation (1-2 days)

**Why now:** With dead code gone, consolidate the 13 places that bypass `services/apiClient.ts` so all HTTP traffic goes through the singleton.

### Tasks

#### 3.1 Add `getBaseURL()` public method to `services/apiClient.ts`
- **File:** `nuqta-master/services/apiClient.ts:695` (private getter; make public)
- **Action:** export the existing `getBaseURL()` so other files can use it.

#### 3.2 Replace 13 hardcoded `localhost:5001/api` / `localhost:10000/api` fallbacks
- **Files:**
  - `nuqta-master/contexts/SocketContext.tsx:49`
  - `nuqta-master/hooks/useAppServices.ts:89`
  - `nuqta-master/services/analytics/AnalyticsService.ts:98`
  - `nuqta-master/services/eventAnalytics.ts:31`
  - `nuqta-master/services/eventReviewApi.ts:8`
  - `nuqta-master/services/eventsApi.ts:117`
  - `nuqta-master/services/imageUploadService.ts:8`
  - `nuqta-master/services/locationService.ts:27-29`
  - `nuqta-master/services/offersApi.ts:33`
  - `nuqta-master/services/realTimeService.ts:55`
  - `nuqta-master/services/surveysApi.ts:109`
  - `nuqta-master/utils/analyticsQueue.ts:137`
- **Pattern:** Replace `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api'` with `apiClient.getBaseURL()`.
- **Verify:** `grep -rn "localhost:5001" nuqta-master --include="*.ts" --include="*.tsx"` returns 0 hits in `services/`, `hooks/`, `contexts/`, `components/`, `app/` (only allowed in `config/env.ts` as the last-resort fallback).

#### 3.3 Fix `components/homepage/DealsThatSaveMoney.tsx:374, 389` to use `apiClient`
- **File:** `nuqta-master/components/homepage/DealsThatSaveMoney.tsx:374, 389`
- **Action:** Replace the two raw `fetch(...)` calls with `apiClient.post('/offers/homepage-deals-section/track-impression', …)` and `…/track-click', …)`.
- **Benefit:** Automatic dedup, idempotency-key, Sentry capture, consistent error handling.

#### 3.4 Remove dead `EXPO_PUBLIC_JWT_STORAGE_KEY` / `EXPO_PUBLIC_REFRESH_TOKEN_KEY` / `EXPO_PUBLIC_USER_DATA_KEY` env vars
- **Files:** `nuqta-master/config/env.ts:38-40`, `nuqta-master/.env:53, 72, 84`
- **Action:** Either remove the dead env vars OR wire `utils/authStorage.ts:24-28` to read them. Recommended: **remove from env** (storage keys are intentionally hardcoded for security — they shouldn't be env-tunable).

### Done Criteria
- `grep -rn "localhost:5001" nuqta-master --include="*.ts" --include="*.tsx" | grep -v "config/env" | grep -v "node_modules"` returns 0 hits.
- `grep -rn "raw.fetch\|fetch(\`http" nuqta-master --include="*.ts" --include="*.tsx" | grep -v "node_modules"` returns 0 hits.
- Frontend builds clean.

---

## 5. Phase 4 — Frontend Production Gaps (2 days)

**Why now:** Before we touch backend performance, make sure the frontend can actually run on a real device.

### Tasks

#### 4.1 Re-generate `nuqta-master/google-services.json` for `com.rez.app`
- **File:** `nuqta-master/google-services.json:8` says `package_name: com.nuqta.app` but `app.config.js:50` and `android/app/build.gradle:114` say `com.rez.app`.
- **Action:** In Firebase Console → Project Settings → Android app → re-download the `google-services.json` with package name `com.rez.app`. Replace the file.
- **Verify:** `grep "package_name" nuqta-master/google-services.json` returns `"package_name": "com.rez.app"`.

#### 4.2 Generate `ios/` via prebuild (or remove `ios:` block)
- **Option A (recommended if iOS is a real target):** `cd nuqta-master && npx expo prebuild --platform ios`
- **Option B (if iOS is genuinely out of scope):** remove the `ios:` block from `app.config.js:30-42`.
- **Decision needed:** Ask the user which option to take.

#### 4.3 Fix `npm run lint` in `nuqta-master`
- **Issue:** `npm run lint` → `expo lint` → crashes with `ERR_PACKAGE_PATH_NOT_EXPORTED` for `eslint/config` subpath.
- **Fix Option A:** Upgrade to flat config — `npx expo lint --fix` to migrate, or manually rewrite `eslint.config.js`.
- **Fix Option B:** Pin `eslint` to `8.56.0` in `package.json` (last version before the `./config` subpath was required).
- **Recommendation:** Option A (flat config is the future).
- **Verify:** `npm run lint` exits 0.

#### 4.4 Replace `http://localhost:8081` hardcoded for Stripe redirect
- **File:** `nuqta-master/app/flash-sales/[id].tsx:189`
- **Action:** Use a configurable `EXPO_PUBLIC_DEEP_LINK_SCHEME` from `.env` (already defined as `rezapp` in `.env:16`) instead of `http://localhost:8081`.

#### 4.5 Add `.env` gitignore audit
- **File:** `nuqta-master/.gitignore:34-38`
- **Verify:** `.env` and `.env.*` are gitignored; `.env.example` and `.env.production.example` are exempted.
- **Verify:** `git check-ignore nuqta-master/.env rez-backend-master/.env rez-auth-service/.env` returns 0 (each is ignored).

#### 4.6 Run TypeScript check + full test suite
- `cd nuqta-master && npx tsc --noEmit` → 0 errors
- `cd nuqta-master && npm test` → confirm baseline pass count
- This gives us a known-good starting point before phase 8.

### Done Criteria
- `npm run web` starts cleanly in browser.
- `npm run android` builds APK successfully (if Android SDK installed).
- `npm run lint` passes.
- All test suites pass (or known-baseline of failures).

---

## 6. Phase 5 — Backend Hardening — Performance & Limits (2 days)

**Why now:** Some current code has unbounded queries (DoS risk) and unbounded cache (perf risk). Easy to fix.

### Tasks

#### 5.1 Add `.limit()` to 5 unbounded `Model.find()` calls
- **Files:**
  - `rez-backend-master/src/models/Cashback.ts:164` → add `.limit(100)`
  - `rez-backend-master/src/models/MerchantOrder.ts:173, 571` → add `.limit(100)`
  - `rez-backend-master/src/services/tierConfigService.ts:96` → add `.limit(100)` (low risk, small dataset)
  - `rez-backend-master/src/services/flashSaleService.ts:484` → add `.limit(1000)` AND verify the caller actually wants the full user base (this is the critical one)
- **Verify:** `grep -rn "\.find({" rez-backend-master/src --include="*.ts" | grep -v ".limit" | grep -v ".lean"` — review each result; some are bounded by surrounding code (e.g., inside `.map()` of a smaller list), some are not.

#### 5.2 Cache `/health` response in `rez-backend-master/src/server.ts:69-105`
- **Action:** Add a 5-second TTL cache around the `database.healthCheck()` and `redisService.isReady()` calls in the `/health` and `/health/ready` endpoints.
- **Pattern:**
  ```ts
  let healthCache: { result: any; expiresAt: number } | null = null;
  app.get('/health', async (req, res) => {
    const now = Date.now();
    if (healthCache && healthCache.expiresAt > now) {
      return res.status(healthCache.result.ok ? 200 : 503).json(healthCache.result);
    }
    const result = await checkHealth();
    healthCache = { result, expiresAt: now + 5000 };
    res.status(result.ok ? 200 : 503).json(result);
  });
  ```
- **Benefit:** Under 10k req/min on /health (Render's healthcheck hammer), this avoids 10k Mongo/Redis roundtrips per minute.

#### 5.3 Audit pagination on list endpoints
- **Action:** Go through every controller method that returns a list (e.g., `GET /api/orders`, `GET /api/products`, `GET /api/merchants`). Confirm each one accepts `?page=N&limit=M` (or cursor) and applies it.
- **Files to start with:** `rez-backend-master/src/controllers/` and `rez-backend-master/src/merchantroutes/` — every `get*` method.
- **Verify:** write a quick script `find-repos-without-pagination.sh` that greps for `\.find\({[^}]*\}\)\.sort` (find+sorted+no-limit) and report.

### Done Criteria
- All 5 unbounded finds have `.limit()`.
- `/health` response is cached.
- List endpoints have pagination (audit complete; missing ones have tickets).

---

## 7. Phase 6 — Backend Hardening — Code Quality & File Splits (4-5 days)

**Why now:** Largest file is 4,876 lines. Maintainability is suffering. This is the bulk of the cleanup.

### Tasks

#### 6.1 Split `rez-backend-master/src/routes/webOrderingRoutes.ts` (4,876 lines) into 3-4 files
- **Action:** Identify natural sub-domains (e.g., `web-orders`, `web-cart`, `web-checkout`, `web-payments`).
- **Pattern:** Each new file exports a `Router`; `server.ts` mounts each at its existing prefix.
- **Verify:** No new bugs introduced (`npm test` + smoke-test.sh both still pass).

#### 6.2 Split `rez-backend-master/src/controllers/storePaymentController.ts` (2,556 lines)
- Likely split candidates: `payment-orchestration`, `payment-reconciliation`, `refund-handling`, `webhook-handlers`.

#### 6.3 Split `rez-backend-master/src/merchantroutes/products.ts` (2,447 lines) and `merchantroutes/analytics.ts` (2,366 lines)
- Split by sub-resource.

#### 6.4 Move non-essential scripts from `rez-backend-master/src/scripts/` to `archives/scripts/`
- 166 ad-hoc scripts. Keep the ones that are referenced by `package.json` or runbook (`addIndexes.ts`, `ensureIndexes.ts`, `seedDemoData.ts`, `seedAllData.ts`).
- Move the rest to `archives/scripts/`.
- **Verify:** `grep -rn "scripts/" rez-backend-master/src` — every reference still resolves.

#### 6.5 Implement or remove the `voucherRedemptionService.ts` and `xlsxCompat.ts` "not implemented" throws
- **Files:**
  - `rez-backend-master/src/services/voucherRedemptionService.ts:56, 102` — `throw new Error('API not implemented')`
  - `rez-backend-master/src/utils/xlsxCompat.ts` — `throw new Error('writeExcelBufferSync not implemented')`
- **Action:** Either implement (if real user-facing) or replace with 501/410 response.

### Done Criteria
- No `.ts` file in `rez-backend-master/src/` is over 2,500 lines (except generated `.d.ts` schemas).
- `npm run build` clean.
- `npm test` still passes.

---

## 8. Phase 7 — Mongoose 8.23 Migration (the only high CVE left) (2-3 days)

**Why now:** The only remaining high CVE. The mechanical work is well-documented from the failed ITER11-13 attempts.

### Tasks

#### 7.1 Run a precise inventory of helper signatures that need updating
- **Command:**
  ```bash
  cd rez-backend-master
  grep -rn "\.lean()" src/ | wc -l  # expect ~150
  grep -rn "I\(User\|Order\|Product\|Store\|…\)\[\]" src/ | head -30  # shows the patterns
  ```
- Document each call site that returns an array and the type it expects.

#### 7.2 Create a `Lean<T>` helper type
- **File:** new `rez-backend-master/src/types/lean.ts`
- **Content:**
  ```ts
  import type { ObjectId } from 'mongodb';
  export type Lean<T> = T & { _id: ObjectId; __v: number };
  ```
- **Alternative:** Use `HydratedDocument<T>['toObject']()`-style.

#### 7.3 Update ~60 helper signatures
- **Pattern:** `function foo(): Promise<IFoo[]>` → `function foo(): Promise<Lean<IFoo>[]>` (or just `Array<IFoo & {_id: ObjectId; __v: number}>`).
- **Files:** `rez-backend-master/src/services/*` — start with the ones called by hot-path controllers (cart, order, payment, wallet, auth).

#### 7.4 Bump mongoose
- **File:** `rez-backend-master/package.json`
- **Action:** `mongoose: 8.17.2` → `mongoose: 8.23.0` (or latest 8.x).

#### 7.5 Verify
- `npm run build` → 0 errors
- `npm audit --omit=dev` → 0 high CVEs (or 1 moderate, not 1 high)
- `bash smoke-test.sh` → 10/10 pass

### Done Criteria
- Mongoose 8.23+ installed.
- `npm audit` reports 0 high vulnerabilities.
- All 4 repos still build clean.
- Smoke test still passes.

---

## 9. Phase 8 — Test Coverage Cleanup (3-4 days)

**Why now:** With code stable, fix the remaining test failures. Many are mock-target mismatches from the ITER2 era.

### Tasks

#### 8.1 Fix the 45 failing tests in `__tests__/gamification/`
- **Per ITER2 report:**
  - `QuizGame.test.tsx` (23 failing) — alert modal interaction; either refactor component to use in-app modal, or update tests to press the alert button
  - `ScratchCard.test.tsx` (23 failing) — pre-reveal UI needed in component
  - `Leaderboard.test.tsx` (1 failing) — pre-existing test pollution

#### 8.2 Fix the 52 failing tests in `__tests__/referral/`
- **Per ITER2 report:**
  - `dashboard.test.tsx` (52 failing) — re-point at real `app/referral/dashboard.tsx`
  - `referral.test.tsx` (9 failing) — re-point mocks

#### 8.3 Fix the 8 failing tests in `__tests__/services/fraudDetectionService.test.ts`
- Per ITER2: pre-existing, related to specific `reason` strings the service doesn't return. Either implement those reasons in the service, or update test assertions.

#### 8.4 Add a teardown helper to clear timers between tests
- **File:** new `nuqta-master/__tests__/helpers/clearTimers.ts`
- **Pattern:** In `afterEach`, clear all `setTimeout`/`setInterval` handles from `useEffect`s.
- **Benefit:** Eliminates "Jest did not exit one second after the test run has completed" warnings.

#### 8.5 Add backend unit tests for files fixed in ITER8-26
- **Files needing tests:**
  - `rez-backend-master/src/middleware/exclusiveOfferMiddleware.ts` (ITER8)
  - `rez-backend-master/src/services/bbpsService.ts` (ITER12)
  - `rez-backend-master/src/services/EmailService.ts` (ITER14)
  - `rez-backend-master/src/services/pushNotificationService.ts` (ITER15)
  - `rez-backend-master/src/middleware/auth.ts` (ITER18 — privilege escalation)
  - `rez-backend-master/src/services/reservationService.ts` (ITER21 — race condition)
  - `rez-backend-master/src/services/walletService.ts` (ITER24 — frozen wallet)
  - `rez-auth-service/src/routes/mfaRoutes.ts` (ITER25 — brute-force)
- **Pattern:** Each test: 1 happy path + 1 edge case + 1 attack scenario (where applicable).

#### 8.6 Add wallet/payment flows to `smoke-test.sh`
- **New test 11:** Add money to wallet via Razorpay mock → confirm balance update
- **New test 12:** Create order → confirm in DB → cancel order → confirm refund
- **Test 13:** Wallet freeze → attempt credit → confirm rejection

### Done Criteria
- `cd nuqta-master && npm test` → 95%+ pass rate (currently 83%)
- `cd rez-backend-master && npm test` → 95%+ pass rate
- `cd rez-auth-service && npm test` → 95%+ pass rate
- `bash smoke-test.sh` → 13/13 pass

---

## 10. Phase 9 — CI/CD & Documentation (2 days)

**Why now:** Make all the cleanup work sustainable by automation and discoverable by humans.

### Tasks

#### 9.1 Add `nuqta-master/.github/workflows/frontend-testing.yml`
- **Trigger:** every PR
- **Steps:** `npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test`

#### 9.2 Add `nuqta-master/.github/workflows/frontend-build.yml`
- **Trigger:** every push to main
- **Steps:** `npx expo export --platform web` → upload `dist/` as artifact

#### 9.3 Add a weekly `npm audit` scheduled workflow
- **File:** `rez-backend-master/.github/workflows/audit.yml`
- **Trigger:** cron, Mondays at 9am
- **Steps:** `npm audit --omit=dev` → fail the job if any high+ CVE

#### 9.4 Create `INDEX.md` at repo root
- **File:** new `C:\Users\user\Downloads\rez-backend-master\INDEX.md`
- **Content:** Table of all 30+ phase/iteration/security docs, with 1-line purpose each. Categorized by topic.
- **Audience:** New developers and on-call engineers.

#### 9.5 Create `PRODUCTION_LAUNCH_CHECKLIST.md` at repo root
- **File:** new `C:\Users\user\Downloads\rez-backend-master\PRODUCTION_LAUNCH_CHECKLIST.md`
- **Content:** The 3 ITER13 operator actions (rotate Atlas creds, set `ALLOWED_INTERNAL_IPS`, set webhook secrets), plus the pre-launch checklist (run smoke-test, run migrations, verify backups, etc.).

#### 9.6 Create `rez-backend-master/CHANGELOG.md`
- **File:** new `rez-backend-master/CHANGELOG.md`
- **Content:** Summary of iter 1-26 changes (one section per phase, with date and impact).

#### 9.7 Move old iteration docs to `docs/iterations/`
- **Action:** `mkdir docs/iterations && mv PHASE_*.md ITERATION_*.md SECURITY_FIXES_*.md PRODUCTION_READINESS_*.md FIX_*.md docs/iterations/`
- **Update INDEX.md** to point to new locations.

#### 9.8 Document branch protection in a `CONTRIBUTING.md` (or update existing)
- **Content:** Required status checks before merge, review process, commit message convention.

### Done Criteria
- New `frontend-testing.yml` runs on the next PR.
- `INDEX.md` exists and links all 30+ docs.
- `PRODUCTION_LAUNCH_CHECKLIST.md` exists with the 3 operator actions.
- `CHANGELOG.md` exists.

---

## 11. Phase 10 — Pre-Production Operator Actions (requires business input) (1 day)

**Why separate:** These can't be done by an autonomous agent — they require access to MongoDB Atlas, Render dashboard, webhook providers, etc.

### Tasks

#### 10.1 Rotate Atlas credentials
- **Action:** Log into MongoDB Atlas → Database Access → rotate the `mukulraj756` and `work_db_user` passwords.
- **Update:** `.env.dev` and Render env group with new values.
- **Verify:** Both backends can connect to Atlas.

#### 10.2 Set `ALLOWED_INTERNAL_IPS` and `APP_CHECK_SECRET_KEY` in production
- **Files:** `rez-auth-service/render.yaml` declares both as `sync: false`.
- **Action:** In Render dashboard → auth-service → Environment → set both values. Get the IPs from Render's documentation.

#### 10.3 Set webhook secrets in production
- **Webhooks:** `MAKCORPS_WEBHOOK_SECRET`, `NEXTABIZZ_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `TRAVEL_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ADBAZAAR_WEBHOOK_SECRET`.
- **Action:** In Render dashboard → backend → Environment → set each from the provider's dashboard.
- **Verify:** Test each webhook end-to-end with a sample event.

#### 10.4 Replace placeholder env values in production
- **Vars:** `EXPO_PUBLIC_RAZORPAY_KEY_ID`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_GA_TRACKING_ID`, `EXPO_PUBLIC_MIXPANEL_TOKEN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `CLOUDINARY_*`.
- **Action:** Replace all `your-*-here` placeholders with real production values.

#### 10.5 Update `nginx.conf` resolver for Render
- **File:** `rez-api-gateway/nginx.conf:240`
- **Action:** Change `resolver 127.0.0.11 valid=3600s ipv6=off;` to `resolver 8.8.8.8 1.1.1.1 valid=3600s ipv6=off;` (or use Render's internal DNS).
- **Verify:** All upstream URLs resolve on Render.

### Done Criteria
- All 3 ITER13 operator actions completed.
- All placeholder env values replaced.
- Production `nginx.conf` has working resolver.

---

## 12. Phase 11 — End-to-End Re-Verification (0.5 day)

**Why last:** Confirm everything still works after 18 days of changes.

### Tasks

#### 11.1 Run the full smoke test suite
- `bash start.sh` → wait for "All services are healthy"
- `bash smoke-test.sh` → expect 13/13 pass
- `cd nuqta-master && npm run web` → log in with a phone number → confirm dashboard loads

#### 11.2 Run all test suites
- `cd rez-backend-master && npm test` → expect 95%+ pass
- `cd rez-auth-service && npm test` → expect 95%+ pass
- `cd nuqta-master && npm test` → expect 95%+ pass

#### 11.3 Run all linters
- `cd rez-backend-master && npm run lint` → expect 0 errors
- `cd rez-auth-service && npm run lint` → expect 0 errors
- `cd nuqta-master && npm run lint` → expect 0 errors (after Phase 4.3)

#### 11.4 Run all builds
- `cd rez-backend-master && npm run build` → expect 0 errors
- `cd rez-auth-service && npm run build` → expect 0 errors
- `cd nuqta-master && npx tsc --noEmit` → expect 0 errors

#### 11.5 Run security audits
- `cd rez-backend-master && npm audit --omit=dev` → expect 0 high CVEs (Phase 7 must be done)
- `cd rez-auth-service && npm audit --omit=dev` → expect 0 vulnerabilities

#### 11.6 Final docs check
- Verify `INDEX.md` is up to date.
- Verify `PRODUCTION_LAUNCH_CHECKLIST.md` is complete.
- Verify `CHANGELOG.md` includes all 11 phases.

### Done Criteria
- All checks pass.
- Documentation is complete.
- Stack is "100% production-ready" (modulo the Phase 10 operator actions that require business input).

---

## 13. Cross-Cutting Concerns (apply across all phases)

### 13.1 Use the existing 5 CI workflows as the contract
Don't introduce new lint/format rules that the existing CI doesn't enforce. Stay consistent with the current style:
- backend uses Prettier defaults
- auth-service uses Prettier defaults
- gateway has no lint (nginx only)
- nuqta-master uses Expo's ESLint config

### 13.2 Don't break the smoke test
After every change, run `bash smoke-test.sh`. It's the canary. If it breaks, the change is wrong.

### 13.3 Don't introduce new secrets
Every new feature should read from env, never hardcode. Every new env var should be added to `.env.example`.

### 13.4 Don't introduce new TODOs
If you can't finish a task in the phase, leave it documented in `PRODUCTION_LAUNCH_CHECKLIST.md` or open a ticket. Don't leave `// TODO` in code.

### 13.5 Don't bypass `apiClient`
Every HTTP call from the frontend goes through `services/apiClient.ts`. Raw `fetch()` is only allowed in `apiClient.ts` itself.

---

## 14. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Mongoose 8.23 migration breaks runtime | High | Phase 7 has explicit smoke-test verification at the end. Revert path is git revert. |
| Frontend prebuild changes native config | Medium | Phase 4.2 should be run on a feature branch, not main. Verify Android still builds. |
| Dead code deletion breaks a hidden importer | Medium | Each phase 2 deletion is preceded by a `grep` to confirm zero importers. |
| Phase 10 operator actions leak secrets | Low | The PRODUCTION_LAUNCH_CHECKLIST.md should explicitly say "rotate X" not "set X to Y". |
| `smoke-test.sh` was running against stale `.env` | Low | Phase 11 includes a fresh `bash start.sh` from cold. |

---

## 15. Final Word

This plan covers **78 distinct issues** identified across 4 parallel audits on 2026-06-22. The work totals **~18-22 working days** of focused engineering, broken into 11 independently-runnable phases. After Phase 11, the stack will be:

- ✅ All secrets scrubbed and dev/prod separated
- ✅ Dead code removed (~80 MB freed)
- ✅ Frontend API client consolidated
- ✅ Frontend builds and runs on iOS + Android + web
- ✅ Backend performance optimized (caching, limits, pagination)
- ✅ Backend code organized (no 4,876-line files)
- ✅ 0 high CVEs (Mongoose 8.23)
- ✅ 95%+ test coverage across all repos
- ✅ CI/CD complete
- ✅ Documentation complete
- ✅ All operator actions completed (with business input)
- ✅ End-to-end verified

**To execute:** Each phase can be handed to a single autonomous agent (or one engineer-day). Phases 1-4 should be done in the first week (secrets + dead code + frontend). Phases 5-8 in weeks 2-3 (backend hardening + mongoose + tests). Phases 9-11 in week 4 (CI + docs + verification).
