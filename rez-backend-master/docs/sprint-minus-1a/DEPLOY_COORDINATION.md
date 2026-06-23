# Deploy Coordination — Sprint -1a / Sprint 0

Third required Sprint -1a output (alongside `DASHBOARD_SPLIT_PLAN.md` and
`EVENT_INVENTORY_MONOLITH.md`). This doc answers: **which services need to
deploy together, in what order, with what rollback plan?**

---

## TL;DR

Sprint 0 is intentionally **monolith-only** (see cross-service inventory at
`SOURCE-OF-TRUTH/EVENT_INVENTORY_MICROSERVICES.md`). Every canonical-event
code change in Sprint 0 ships in a single monolith deploy.

Microservice involvement is **deferred to Sprint 1+** after three pre-reqs
complete; those pre-reqs have no schema dependency on Sprint 0.

---

## Sprint 0 — single-service scope

### What ships

1. `src/events/canonical/schemas.ts` — reconciled OrderPlaced / PaymentSettled
   / VisitCompleted / CustomerLapsed / MerchantApproved with **hybrid**
   nullability (mandatory merchantId + orderId + amount; nullable storeId +
   customerId).
2. `src/events/emitOrderPlaced.ts` — re-exports canonical schema; dual-writes
   to `gamificationEventBus` + BullMQ `order-events` queue (best-effort).
3. `src/models/ProcessedEvent.ts` — subscriber-side idempotency ledger
   (already committed in an earlier scaffold).
4. Three callers wired to `emitOrderPlaced(ctx)`:
   - `src/routes/webOrderingRoutes.ts` (after WebOrder.create)
   - `src/controllers/posBillingController.ts` (after PosBill.create)
   - `src/routes/aggregatorWebhookRoutes.ts` (after AggregatorOrder.create)
5. B4/B6/B7 identity-hygiene patches applied per their respective spec
   docs in `docs/sprint-0/`.

### What does NOT ship in Sprint 0

- Redis pub/sub transport for canonical events (`canonical/bus.ts` stays
  unused; `canonical/emitters.ts` not wired to any caller). Keep the files
  so the shape is available; do not delete until Sprint 1 decides whether
  to adopt pub/sub or delete the scaffold.
- Any microservice code. Gamification / payment / wallet services consume
  their existing BullMQ queues unchanged.
- Cross-service `payment.settled` unification — remains as separate
  payment-service → monolith HTTP call until Sprint 2+.

### Deploy order (single monolith)

```
1. Merge PR: schema reconciliation + emitOrderPlaced re-export + 3 caller wires
2. Staging: smoke-test every order-create path + verify canonical event
   lands in `order-events` BullMQ queue (BullBoard dashboard)
3. Production: rolling restart (one pod at a time)
4. Post-deploy watch for 24h: `order-events` queue depth, gamification
   handler success rate, no new 5xx in Sentry for the 3 routes
```

### Rollback

- Feature-flag-free: revert the merge commit, redeploy. No schema migrations
  to undo (ProcessedEvent collection is additive; leaving it populated is fine).
- Caller wires are isolated per-route; partial revert is possible by
  reverting individual callers if only one breaks.

---

## Sprint 1 — microservice pre-reqs

Three items, each independent + independently deployable. None of them
block each other.

### Pre-req A — `coin-credit` Redis publish (CLOSED — no code change)

**Status:** ~~delete blind publish~~ — **LEAVE AS-IS**. Verified 2026-04-21
during Sprint-1 round 3 that the `coin-credit` channel IS consumed by
`rez-karma-service/src/workers/coinEventSubscriber.ts` (boot-registered
from `rez-karma-service/src/index.ts:153`). The subscriber verifies the
transaction against the EarnRecord ledger and updates KarmaProfile
conversion history. Deleting the publish would silently break karma
conversion tracking.

The "no one subscribes" claim in the original pre-req entry predated the
`SOURCE-OF-TRUTH/EVENT_INVENTORY_MICROSERVICES.md` inventory which lists
the subscriber. Pre-req A is closed without code change.

### Pre-req B — notification-events suffix (SHIPPED)

**Status:** ✅ fixed in `rez-notification-events` branch
`fix/ntf-audit-fixes-2026-04-20`, commit **a2c0773**.

**What shipped:** `src/worker.ts` line 35 changed from
`notification-events-${INTERNAL_SERVICE_NAME}` to the unsuffixed
`notification-events`, restoring coupling with the monolith's publisher.
Added an in-file explanatory block documenting why the BAK-CROSS-020
suffix was incomplete (no publisher ever adopted it) and the correct
path if future cross-service notification isolation becomes necessary.

Cross-service isolation is now enforced by the monolith's
`DISABLE_NOTIFICATION_WORKER=true` flag (only one of monolith-worker OR
standalone-service consumes at a time), not by queue-name variance.

### Pre-req C — duplicate wallet-credit worker (SHIPPED)

**Status:** ✅ fixed in `rez-payment-service` branch `main`, commit
**f243f1b**.

**What shipped:**
 - `src/index.ts` — removed `startWalletCreditWorker`/`stopWalletCreditWorker`
   imports + boot/shutdown calls. Uses `stopPaymentWorker()` in the
   shutdown path.
 - `src/worker/walletCreditWorker.ts` — gutted to a deprecation stub.
   Both exports are now no-ops; file retained so any stale external
   import doesn't hard-fail. Delete in next cleanup pass once the
   branch is merged.

The canonical worker (`./worker.ts#startPaymentWorker`) performs the
HTTP credit call PLUS the INC-4 `emitCoinsAwarded` Socket.IO emit. The
legacy worker only did the HTTP call; keeping it would have silently
regressed INC-4 for half the queue traffic.

**Service boot now logs exactly one** `[Worker] Started` line for the
`wallet-credit` queue (previously two). The BAK-CROSS-021 concurrency=1
race-safety guarantee is restored.

---

## Sprint 2+ — cross-service event unification

Only after all three Sprint 1 pre-reqs complete. At that point:

- Introduce explicit `canonical.order.placed` subscriber in
  rez-gamification-service (currently blind to payment/order lifecycle).
- Emit `canonical.payment.settled` from rez-payment-service; consume in
  rez-order-service for settlement reconciliation.
- Decide Redis pub/sub vs BullMQ for cross-service: recommend BullMQ for
  durability (financial events), pub/sub for best-effort growth signals.

**Coordinated deploy required.** All three services change together:
1. Deploy canonical publisher (payment-service)
2. Deploy canonical subscriber (gamification) with feature flag OFF
3. Flip flag ON in staging, verify, flip in production
4. Monitor 48h, then remove legacy inline path

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `order-events` BullMQ queue backfills faster than workers can drain | Low | Medium | Queue depth alert at 1000 pending. Workers horizontally scale. |
| gamificationEventBus.emit throws on a new event shape | Very low | Low | In-process emit is wrapped in try/catch; emit still returns the envelope. |
| Caller passes wrong ctx shape (e.g. stringified amount) | Medium (during rollout) | Zod parse throws at emit | Callers catch + log; order creation still succeeds. Sentry visibility confirms wiring correctness during staging burn-in. |
| Processed-event ledger grows unbounded | Low | Low | TTL index 7 days; auto-expiry. Reviewed pre-Sprint 0 (already set). |
| Duplicate `OrderPlacedEventSchema` re-emerges | Medium | High | This doc + schema reconciliation commit are the guard. Any future PR that reintroduces an inline schema fails code review. |

---

## Monitoring during Sprint 0 burn-in

- **Sentry error rate** on `/webOrdering/*`, `/pos/*`, `/aggregator/*` routes — must not increase post-deploy.
- **BullMQ `order-events` queue** — jobs enqueued should match order creation rate within ±5% over a 1-hour window.
- **gamification handler success rate** — streaks + achievements + challenges must maintain pre-deploy success %.
- **ProcessedEvent collection size** — grows within expected rate (# of orders + retries), should not balloon.

---

## Sprint -1a exit criteria

Before Sprint 0 wiring can start:

- [ ] Dashboard split PR merged (card registry in place, smoke tests green)
- [ ] Event inventory doc merged (EVENT_INVENTORY_MONOLITH.md)
- [ ] This deploy coordination doc merged
- [ ] Architect-checks doc reviewed (ARCHITECT_CHECKS.md)
- [ ] Schema reconciliation merged (canonical/schemas.ts hybrid + emitOrderPlaced re-export)
- [ ] 3 sprint-0 patch specs reviewed (B4, B6, B7)

Once all six are merged, Sprint 0 wiring can proceed with the caller
changes in parallel.
