# REZ Backend Changelog

All notable changes to the REZ backend are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Gold SIP (Systematic Investment Plan) feature with monthly auto-debit
- User product warranty and AMC (Annual Maintenance Contract) tracking
- Enhanced fraud detection with device fingerprinting
- Ledger audit service for transaction reconciliation
- Rate limiting on sensitive financial operations
- Merchant ROI analytics with peak hour detection
- Privé campaign management system
- BBPS (Bharat Bill Payment System) integration

### Fixed
- Contract drift in API response shapes — all endpoints now use standardized response helpers
- Field-level validation errors properly returned in errors array
- Pagination metadata consistent across all list endpoints
- Timestamp format standardized to ISO 8601 UTC

### Security
- Implement input sanitization for PAN, bank account, card numbers
- Rate limiting on referral claims and cashback operations
- Device fingerprint validation on sensitive transactions
- Webhook secret validation for all external integrations

### Performance
- Cache warming on startup for frequently-accessed categories
- Query optimization for leaderboard aggregations
- Connection pooling for external API calls

### Known Issues & TODOs

#### Infrastructure (High Priority)
- **Job Queue:** Currently using synchronous queue in `src/jobs/`. At scale (>10k users/day), migrate to Bee-Queue or Bull with dedicated worker pool
  - Affected: cashback processing, notifications, exports, campaign updates
  - Estimated effort: 2 sprints
- **Merchant Upload Processing:** Sharp image processing blocks request thread. Needs async job queue.
  - Location: `src/merchantroutes/uploads.ts`
  - Estimated effort: 1 sprint

#### Feature Gaps
- **Voucher Integration:** Currently stubbed in `voucherRedemptionService.ts`. Integrate real provider API.
  - Required for: Referral rewards, campaign prizes
  - Estimated effort: 1 sprint
- **Ledger Audit Gaps** (in `ledgerAuditService.ts`):
  - [ ] Balance reconciliation: Compare calculated wallet total vs. DB ledger sum
  - [ ] Exchange rate validation: Verify coin↔rupee conversions use historical rates
  - [ ] Payout verification: Ensure settlement amounts match source transactions
  - Estimated effort: 1.5 sprints
- **Notification Delivery:** Push/SMS/Email send confirmation not yet integrated
  - Location: `services/userProductService.ts`, `campaignProgressJob.ts`
  - Estimated effort: 1 sprint

#### Monitoring & Observability
- [ ] Push notification delivery tracking
- [ ] Voucher redemption success rate monitoring
- [ ] Ledger discrepancy alerts
- [ ] Device fingerprint failure rate tracking

#### Testing Coverage
- [ ] Regression coverage for refresh token security (see `src/__tests__/routes/auth.test.ts`)
- [ ] End-to-end payment flow tests with Razorpay webhooks
- [ ] Order placement → cashback distribution → settlement flow
- [ ] Merchant settlement calculation and payout edge cases

---

## Production-Hardening Iterations (1-26) — 2026-06-22

> Autonomous engineering loop that produced the
> [production-readiness plan](../docs/iterations/PRODUCTION_READINESS_PHASE_PLAN.md).
> See [ITERATION_1-7_DELTA.md](../docs/iterations/ITERATION_1-7_DELTA.md) and
> [ITERATION_8-26_DELTA.md](../docs/iterations/ITERATION_8-26_DELTA.md) for the
> canonical per-iter summaries; per-iter security detail is under
> [docs/iterations/](../docs/iterations/).

### [Iter 1-3] — 2026-06-21 — Initial services & auth audit
- **Added:** services audit, frontend audit, auth audit reports.
- **Added:** first security fix wave (input sanitization, weak-secret
  rotation, rate-limiting baseline).
- **Fixed:** dev-placeholder secrets in `.env` replaced with
  sufficiently-random values; weak JWT secrets flagged.
- **Refs:** [SECURITY_FIXES_ITER2.md](../docs/iterations/SECURITY_FIXES_ITER2.md),
  [SECURITY_FIXES_ITER3.md](../docs/iterations/SECURITY_FIXES_ITER3.md),
  [SECURITY_FIXES_ITER4.md](../docs/iterations/SECURITY_FIXES_ITER4.md).

### [Iter 4-7] — 2026-06-21 — Frontend stability & dead-code purge
- **Added:** Phase 1-3 docs (services audit, frontend audit, build
  errors).
- **Removed:** dead `notificationsApi` push-subscribe methods and
  other unreachable code paths.
- **Fixed:** Nuqta frontend TypeScript build errors
  (`PHASE3_NOTES.md`).
- **Refs:** [SECURITY_FIXES_ITER5.md](../docs/iterations/SECURITY_FIXES_ITER5.md)
  → [SECURITY_FIXES_ITER7.md](../docs/iterations/SECURITY_FIXES_ITER7.md).

### [Iter 8-9] — 2026-06-21 — Memory & leak hardening
- **Fixed:** memory leaks in `useEffect` listeners, redux subscribers,
  and a `setInterval` left running in the booking flow.
- **Fixed:** heap-OOM during CI build by bumping `--max-old-space-size`
  in scripts and slimming the test harness.
- **Refs:** [PHASE_HEAP_FIX.md](../docs/iterations/PHASE_HEAP_FIX.md),
  [PHASE_MEMORY_LEAKS.md](../docs/iterations/PHASE_MEMORY_LEAKS.md),
  [SECURITY_FIXES_ITER8.md](../docs/iterations/SECURITY_FIXES_ITER8.md),
  [SECURITY_FIXES_ITER9.md](../docs/iterations/SECURITY_FIXES_ITER9.md).

### [Iter 10] — 2026-06-21 — Build-error round 2 & 3
- **Fixed:** residual build errors after the heap fix (`PHASE2D_BUILD_ERRORS_ITER10.txt`).
- **Fixed:** a batch of `any`-typed params in service layer.
- **Refs:** [SECURITY_FIXES_ITER10.md](../docs/iterations/SECURITY_FIXES_ITER10.md).

### [Iter 11-12] — 2026-06-21 — Wallet & ledger hardening
- **Added:** rate limits on cashback & referral endpoints.
- **Added:** ledger audit service for transaction reconciliation.
- **Fixed:** coin-↔-rupee rounding edge cases.
- **Refs:** [SECURITY_FIXES_ITER11.md](../docs/iterations/SECURITY_FIXES_ITER11.md),
  [SECURITY_FIXES_ITER12.md](../docs/iterations/SECURITY_FIXES_ITER12.md).

### [Iter 13] — 2026-06-22 — Operator-action prep & final security sweep
- **Added:** documentation of the three operator actions
  (rotate Atlas creds, set `ALLOWED_INTERNAL_IPS`, set webhook
  secrets) — see [PRODUCTION_LAUNCH_CHECKLIST.md](../PRODUCTION_LAUNCH_CHECKLIST.md).
- **Added:** app-check secret config plumbing.
- **Fixed:** mass-assignment and over-posting checks in
  `services/` flagged in the security lint job.
- **Refs:** [SECURITY_FIXES_ITER13.md](../docs/iterations/SECURITY_FIXES_ITER13.md).

### [Iter 14-26] — 2026-06-22 — Production-readiness phases 4-8
- **Added:** Phase 4-6 phase notes (heap, memory, UI, security sweep).
- **Added:** production-readiness reports
  ([PRODUCTION_READINESS_REPORT.md](../docs/iterations/PRODUCTION_READINESS_REPORT.md),
  [PRODUCTION_READINESS_FINAL.md](../docs/iterations/PRODUCTION_READINESS_FINAL.md)).
- **Changed:** API responses standardized to the helper-based
  `sendSuccess()`/`sendError()` shape; pagination meta now consistent.
- **Performance:** cache warming on startup, leaderboard query
  optimization, external-API connection pooling.
- **Fixed:** contract drift in API response shapes; ISO-8601 UTC
  timestamps; field-level validation errors.
- **Refs:** [ITERATION_8-26_DELTA.md](../docs/iterations/ITERATION_8-26_DELTA.md),
  [PHASE4_NOTES.md](../PHASE4_NOTES.md) → [PHASE6_NOTES.md](../PHASE6_NOTES.md).

## Phase 7 — Mongoose 8.24 Migration (2026-06-22)

### Changed
- **Mongoose**: 8.17.2 → 8.24.0 (fixes `$nor` CVE)
- **TypeScript**: `src/services/*` helper signatures updated to use `Lean<T>` type for `.lean()` query results
- **New file**: `src/types/lean.ts` — helper type `Lean<T> = T & { _id: any; __v: number }`

### Security
- Fixed theoretical high CVE in mongoose `$nor` query handling (verified our code never used `$nor`)

### Verification
- `npm run build`: 0 errors
- `npm audit --omit=dev`: 0 high/critical CVEs (3 moderate, acceptable)

## Phase 8 — Test Coverage Cleanup (2026-06-22)

### Fixed
- **nuqta-master/__tests__/gamification**: 45 failing tests → 0 failing (181/181 passing)
- **nuqta-master/__tests__/referral**: 52 failing tests → 0 failing (171/171 passing)
- **nuqta-master/__tests__/services/fraudDetectionService.test.ts**: 8 failing tests → 0 failing

### Added
- **8 new backend test files** covering ITER8-26 production-hardening fixes (76 test cases total):
  - `rez-backend-master/src/middleware/exclusiveOfferMiddleware.test.ts`
  - `rez-backend-master/src/services/bbpsService.test.ts`
  - `rez-backend-master/src/services/EmailService.test.ts`
  - `rez-backend-master/src/services/pushNotificationService.test.ts`
  - `rez-backend-master/src/middleware/auth.test.ts`
  - `rez-backend-master/src/services/reservationService.test.ts`
  - `rez-backend-master/src/services/walletService.frozen.test.ts`
  - `rez-auth-service/src/routes/mfaRoutes.test.ts`
- **`nuqta-master/__tests__/helpers/clearTimers.ts`**: Timer teardown helper
- **3 new tests in `smoke-test.sh`**: wallet top-up, order cancel/refund, wallet freeze

---

## [1.0.0] — 2026-03-23

### Initial Release
Complete backend for REZ consumer and merchant platforms with full auth, commerce, payments, and wallet features.

### Major Features
- **Authentication:** JWT tokens with refresh rotation, device fingerprinting
- **Commerce:** Product catalog, wishlists, carts, orders, returns
- **Payments:** Razorpay & Stripe integration with webhook processing
- **Wallet:** Ledger-based cashback, coins, referral rewards
- **Notifications:** Firebase FCM, Twilio SMS, SendGrid email
- **Merchant Tools:** Dashboard, product mgmt, settlement analytics, team management
- **Admin Dashboard:** User management, fraud detection, ROI tracking

### API Response Format
- Standardized: `{ success: boolean, data?, message?: string, errors?: [], meta? }`
- Pagination: `meta.pagination = { page, limit, total, pages }`
- Timestamps: ISO 8601 UTC format

### Database Schema
- Users, Merchants, Products, Orders, Transactions
- Wallet & Ledger entries (coin accounting)
- Campaign, Referral, and Reward management
- Audit logs for compliance

### Testing
- Unit tests for services (jest)
- Integration tests for API routes
- Placeholder E2E tests structure

### Documentation
- This CHANGELOG
- README with setup & API contract
- .env.example with all required variables
- Inline JSDoc for critical functions

---

## Notes for Release Engineering

### Contract Stability
- All 4 apps (Backend, Consumer, Merchant, Admin) use standardized API response format
- Frontend services have TypeScript return types matching backend responses
- Breaking changes require major version bump + deprecation notice (1 sprint min)

### Health Checks Pre-Release
- [ ] `npm run test` passes all suites
- [ ] No unhandled TODO comments in src/ (production code)
- [ ] .env.example documents all required variables
- [ ] Response shapes verified against frontend integration tests
- [ ] Merchant settlement calculations audited
- [ ] Payment webhook processing tested end-to-end

### Rollback Plan
- Git tag for all major releases: `v1.0.0`, etc.
- Database migrations logged in `MIGRATIONS.md` (TODO)
- Consumer app lockout: If backend API contract breaks, set `API_MIN_VERSION` env var
- Monitoring: Sentry alerts on 5xx+ 1% traffic, NewRelic alerts on P99 latency > 500ms

### Metrics to Track
- API response time distribution (P50, P95, P99)
- Error rate by endpoint (5xx, 4xx)
- Payment success/failure rate
- Webhook processing latency
- Ledger discrepancies (via audit service)
- Job queue backlog size

---

See REGRESSION_SAFETY.md for complete release checklist.
