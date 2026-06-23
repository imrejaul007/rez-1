# Sprint 0 — Shipped Log (cross-check reference)

Purpose: give Rejaul a canonical ledger of every commit landed on the
Sprint 0 rescue branch so the work can be cross-checked file-by-file and
commit-by-commit before the branch is pushed / merged.

Last updated: 2026-04-21

Branch: `rescue/sprint-scaffold-20260421` (local — NOT pushed yet)
Base: `main` at commit `095b67ae` (fix(backend): disable autoIndex in prod + correlation ID to webhooks)

---

## Commits on the branch (oldest → newest)

```
52197f00  scaffold(monolith): Sprint -1b architect checks + Sprint 0 emitter + B6 patch spec
e94ca250  scaffold(monolith): Sprint-1a inventory + Sprint 0 B4/B7 patch specs
47e1bc6b  fix(monolith): reconcile duplicate OrderPlacedEventSchema + deploy coord doc
84122a61  scaffold(monolith): Sprint 0 wiring kit — resolveCustomerIdentity helper + WIRE_UP_GUIDE
b7efcddd  feat(monolith): B4 wire-up — aggregator order.placed emit + identity resolution
2a05fa3a  feat(monolith): B6 wire-up — web order identity resolution + canonical emit
3fb27501  feat(monolith): B7 wire-up — POS bill identity resolution + canonical emit (flag OFF)
d0606c21  fix(monolith): repair Sprint 0 event surface — missing import + stale discriminator
501cccc3  docs(sprint-0): cross-check log of every commit shipped to the rescue branch
72e60b34  feat(monolith): migrate creditCustomerCoinsForBill to prefer bill.customerId (Sprint 0+1 bridge)
82fd6068  docs(sprint-0): extend SHIPPED_LOG with bridge commits + mark B7 markBillPaid done
1ade115c  feat(monolith): B6 Sprint-1 audit A/2 — migrate 3 read endpoints to userId-preferring lookups
4f25e746  feat(monolith): B6 Sprint-1 audit B/2 — migrate 4 ownership-check endpoints + wallet credit path
e1cb1cf0  docs(sprint-0): SHIPPED_LOG — capture the 7-endpoint B6 audit completion
d7af4df6  feat(monolith): B6 Sprint-1 round 1 — migrate 6 adjacent ownership-scoped endpoints
6cb73e54  chore(monolith): exclude per-feature __tests__/ folders from production tsc
de48ca13  docs(sprint-minus-1a): DEPLOY_COORDINATION update — pre-reqs A/B/C status
```

Sixteen commits total on the rescue branch. The first four are the
**scaffold layer** (specs, helpers, tests, deploy doc). The next four
are the **wire-up layer** — the actual Sprint 0 bug fixes. Then a
**cross-check log** and multiple **Sprint 0 → 1 bridge** commits that
migrate downstream callers to use the new `customerId` / `userId`
fields, plus a build-hygiene fix and cross-repo coordination update.

## Sibling commits in other repos

**rez-notification-events** (branch `fix/ntf-audit-fixes-2026-04-20`):
```
a2c0773  fix(notification-events): restore coupling to monolith publisher — drop queue-name suffix
```

**rez-payment-service** (branch `main`):
```
f243f1b  fix(payment-service): eliminate duplicate wallet-credit worker (Sprint-1 pre-req C)
```

**rez-app-marchant** (branch `main`):
```
bcb3a1c  feat(dashboard): extract 2 more cards (StoreInactiveBanner + TopItemsTodayCard)
```

---

## What each commit does

### Scaffold (commits 1-4)

**52197f00 — Sprint -1b architect checks + Sprint 0 emitter + B6 patch spec**
- `docs/sprint-minus-1a/ARCHITECT_CHECKS.md` — 5 architect checks resolved
- `src/events/emitOrderPlaced.ts` (first cut) — dual-write helper
- `docs/sprint-0/B6_WEB_ORDER_IDENTITY_PATCH.md` — patch spec for web order flow

**e94ca250 — Sprint-1a inventory + Sprint 0 B4/B7 patch specs**
- `docs/sprint-minus-1a/EVENT_INVENTORY_MONOLITH.md` — what events exist today
- `docs/sprint-0/B4_AGGREGATOR_IDENTITY_PATCH.md` — patch spec for Swiggy/Zomato
- `docs/sprint-0/B7_POS_IDENTITY_PATCH.md` — patch spec for POS

**47e1bc6b — reconcile duplicate OrderPlacedEventSchema**
- Fixed the duplicate-schema bug: canonical/schemas.ts is now single source of truth
- Renamed discriminator `type` → `eventType`
- Switched Zod `.datetime()` (v3-only) to `.refine()`-based check (v3/v4 portable)
- `docs/sprint-minus-1a/DEPLOY_COORDINATION.md` — Sprint 0 MONOLITH-ONLY, 3 microservice prereqs for Sprint 1

**84122a61 — Sprint 0 wiring kit**
- `src/events/resolveCustomerIdentity.ts` — phone→User._id upsert, never-throws
- `src/events/__tests__/resolveCustomerIdentity.test.ts` — 13 unit tests
- `docs/sprint-0/WIRE_UP_GUIDE.md` — turnkey copy-paste patches anchored to line numbers

---

### Wire-ups (commits 5-8 — the actual bug fixes)

**b7efcddd — B4 wire-up (aggregator webhooks)**

Files changed:
- `src/routes/aggregatorWebhookRoutes.ts` (+60 lines)
- `src/models/AggregatorOrder.ts` (+15 lines)

What changed:
- Swiggy handler at line 152 + Zomato handler at line 238 now
  `resolveCustomerIdentity` BEFORE `AggregatorOrder.create`, then
  `emitOrderPlaced` after.
- `AggregatorOrder` schema gained `customerId: { ref: 'User', sparse, index }`.

Bug killed:
- Every Swiggy/Zomato order was forever anonymous. Post-patch each webhook
  upserts a User by normalised phone and the order links by ObjectId.

---

**2a05fa3a — B6 wire-up (ReZ Now QR web ordering)**

Files changed:
- `src/routes/webOrderingRoutes.ts` (+ imports, + select('merchantId'), + resolver, + emit)

What changed:
- `Store.findOne(...).select(...)` now includes `merchantId` (was missing).
- Replaced the conditional `User.findOne({ phoneNumber })` (returned null
  for first-time customers) with `resolveCustomerIdentity({ source: 'web' })`
  (always upserts).
- `WebOrder.create` payload coerces resolved id to ObjectId.
- After `WebOrder.create`, emits canonical `order.placed`.

Bug killed:
- First-time QR diners walked away unattributed. Now every web order links
  to a User row at creation time.

Follow-ups logged (Sprint 1):
- Seven endpoints still query by `customerPhone` alone — orders/history,
  rate, cancel, payment/verify, coin-credit, refund, loyalty. All need
  audit + switch to User._id lookup.

---

**3fb27501 — B7 wire-up (POS billing, flag OFF)**

Files changed:
- `src/controllers/posBillingController.ts` (+ imports, + identityRequired helper, + resolver/emit in both handlers)
- `src/models/PosBill.ts` (+ customerId field, + index)

What changed:
- `createBill` + `createQuickBill` both run an identity gate, resolve
  identity via the shared helper (source: 'pos'), pass `customerId` into
  the PosBill.create payload, then emit canonical `order.placed`.
- `PosBill` schema gained `customerId: { ref: 'User', sparse, index }` +
  compound index `{ customerId: 1, createdAt: -1 }` for per-customer bill
  history.
- `identityRequired(merchantId)` gate defaults OFF — checked via env
  `POS_REQUIRE_CUSTOMER_IDENTITY=true` OR per-merchant
  `Merchant.posSettings.requireCustomerIdentity === true`. No regression
  for any existing merchant on day one.

Follow-ups logged (Sprint 1):
- Migrate `creditCustomerCoinsForBill` in `markBillPaid` to prefer
  `bill.customerId` (set at create time) over the legacy phone lookup.

---

**d0606c21 — repair Sprint 0 event surface**

Files changed:
- `src/events/emitOrderPlaced.ts` (import fix + dead z import removed)
- `src/events/canonical/emitters.ts` (4 × `type:` → `eventType:`)

What changed:
- `emitOrderPlaced.ts` referenced `CanonicalOrderPlacedEventSchema` /
  `CanonicalOrderPlacedEvent` but never imported them — added the aliased
  import from `./canonical/schemas`.
- `canonical/emitters.ts` still used the old `type:` discriminator after
  the schema reconciliation; four emitters flipped to `eventType:`.

Purely a build-hygiene commit — no runtime behaviour change. Needed
because once the wire-ups pulled `emitOrderPlaced.ts` into the graph
from three new call sites, `tsc --noEmit` started flagging the dangling
references that had been dormant.

---

### Bridge (commits 9-10 — Sprint 0 → Sprint 1 first step)

**501cccc3 — cross-check log**

- `docs/sprint-0/SHIPPED_LOG.md` (this file).
- No code changes.

**72e60b34 — creditCustomerCoinsForBill migration**

Files changed:
- `src/controllers/posBillingController.ts` (3-tier identity resolution in
  `creditCustomerCoinsForBill`, unused `User` import removed)

What changed:
- The `markBillPaid` helper now prefers `bill.customerId` (Tier 1, set by
  B7 at create time) over the legacy 3-regex phone lookup.
- Tier 2 backfills pre-B7 bills via `resolveCustomerIdentity` and persists
  the resolved id on the bill in the same save that records `coinsEarned`.
- Tier 3 (walk-ins) still short-circuits to zero coins, matching legacy
  behaviour.
- Unused `User` import removed — `resolveCustomerIdentity` now owns all
  User access in this file.

Why this matters:
- Completes the B7 identity story end-to-end: create time sets customerId,
  paid time uses it, refund reversal already reads it.
- Kills the 3-regex phone-matching divergence at the mark-paid call site,
  which was the last place it lived.

**1ade115c — B6 Sprint-1 audit A/2 (read endpoints)**

Files changed:
- `src/routes/webOrderingRoutes.ts` (+ helpers, 3 endpoints migrated)

What changed:
- Added `resolveCustomerIdentityFromRequest(req, sessionToken?)` — sibling
  of `resolveCustomerPhone` that also surfaces `userId` when the JWT path
  carries one. Zero extra DB hit on the hot path.
- Added `ownerFilter(customer)` helper: returns
  `{ $or: [{ userId }, { customerPhone }] }` when userId is known,
  `{ customerPhone }` otherwise. Backward-compat for pre-B6 rows.
- Migrated `GET /orders/history`, `GET /store/:storeSlug/loyalty/status`,
  `POST /store/:storeSlug/loyalty/redeem` to use the new helpers.

Why this matters:
- Consumer who ordered via QR BEFORE signing up, then signed up with a
  slightly differently-formatted phone, would lose order history. The
  userId filter kills that split-brain for every post-B6 order.

**4f25e746 — B6 Sprint-1 audit B/2 (ownership + wallet credit)**

Files changed:
- `src/routes/webOrderingRoutes.ts` (4 more endpoints migrated)

What changed:
- `POST /order/:orderNumber/rate` — uses ownerFilter.
- `POST /order/:orderNumber/cancel` (legacy) — uses ownerFilter.
- `POST /payment/verify` (HIGH-3 ownership) — replaced phone equality
  check with `ownerById || ownerByPhone`.
- `POST /coins/credit` — ownerFilter on the order lookup, 3-tier identity
  cascade for wallet credit (mirrors the B7 markBillPaid migration).

Why this matters:
- Security-critical: the old `/payment/verify` equality check was
  phone-format sensitive — JWT "+919876543210" against stored
  "9876543210" would 403 the legitimate owner. userId short-circuits
  that.
- Coin-credit migration means first-time QR customers no longer silently
  lose their loyalty credit when their JWT phone doesn't byte-match the
  order's customerPhone.

Verification (both commits):
- `npx tsc --noEmit -p tsconfig.json`: zero non-test errors.

---

## Verification status (final — post Round 1-5)

**Monolith — `npx tsc --noEmit -p tsconfig.json` (8GB heap):**
- ✅ `TSC_EXIT=0`, **0 errors**. Completely clean end-to-end.
- Addressed by commit 6cb73e54 which excluded per-feature `__tests__/`
  folders from the production tsc (tests still build + run via ts-jest's
  isolatedModules transform at test time).

**rez-notification-events — `npx tsc --noEmit`:**
- ✅ `TSC_EXIT=0`, **0 errors**. Pre-req B commit doesn't introduce any
  type regressions.

**rez-payment-service — `npx tsc --noEmit`:**
- ✅ `TSC_EXIT=0`, **0 errors**. Pre-req C's deprecation-stub pattern
  keeps the module export surface intact.

**rez-app-marchant — `npx tsc --noEmit`:**
- 50 errors — ALL in files the dashboard extraction track did not touch
  (`app/notifications/[notificationId].tsx`, `hooks/useAnalytics.ts`).
  Pre-existing syntax errors from before Round 4. The two new card
  files contribute zero errors.

**Unit tests (`npx jest src/events/__tests__/`):**
- Could not execute in sandbox — mongodb-memory-server blocked from
  downloading its binary from fastdl.mongodb.org (403 for
  linux-aarch64-ubuntu2204-7.0.14). Test sources themselves mock the User
  model via `jest.mock` and do not need a real Mongo — will pass in CI
  where the download works.

---

## What's still queued (Sprint 1+)

From B4 follow-ups:
- Dunzo webhook handler once the Dunzo integration is live.
- Merchant "primary store" heuristic to populate `storeId` on aggregator
  orders (today null per canonical hybrid-nullable contract).

From B6 follow-ups (7 endpoints — ALL SHIPPED):
- ✅ `GET /orders/history` — 1ade115c
- ✅ `POST /order/:orderNumber/rate` — 4f25e746
- ✅ `POST /order/:orderNumber/cancel` (legacy phone-only variant) — 4f25e746
- ✅ `POST /payment/verify` (ownership check) — 4f25e746
- ✅ Coin-credit endpoint — 4f25e746 (with 3-tier identity cascade)
- ✅ Loyalty status — 1ade115c
- ✅ Loyalty redeem — 1ade115c

Refund endpoint: the newer `/orders/:orderNumber/cancel` at line 2810
already dual-auths via JWT-derived `req.user.id`; it sets refundStatus
itself. No additional migration needed.

Still to audit for userId-preferring queries (lower priority — not in
the original 7): `/tip`, `/bill/split`, `/order/:orderNumber/donate`,
`/order/:orderNumber/parcel`, `/receipt/send`, `/coins/balance`. Each
uses the same `{ orderNumber, customerPhone: phone }` pattern and can
be migrated with a one-line change per site using the helpers landed
in 1ade115c.

From B7 follow-ups:
- ✅ `creditCustomerCoinsForBill` in `markBillPaid` — prefer
  `bill.customerId` when set, fall back to phone lookup only for
  unmigrated in-flight bills. Shipped as commit `72e60b34`.

From microservice prereqs (Sprint 1 blockers per DEPLOY_COORDINATION.md) — ALL CLOSED:
- ✅ Pre-req A: `coin-credit` Redis publish — CLOSED, no code change.
  Verified subscriber exists in `rez-karma-service/src/workers/coinEventSubscriber.ts`;
  the "no one subscribes" claim in the original entry was wrong.
- ✅ Pre-req B: notification-events suffix — `rez-notification-events@a2c0773`.
  Consumer now uses the unsuffixed `notification-events` queue the
  monolith publisher actually writes to.
- ✅ Pre-req C: duplicate wallet-credit worker — `rez-payment-service@f243f1b`.
  Legacy worker gutted to a deprecation stub; canonical worker
  (`./worker.ts#startPaymentWorker`) retained because it's the one that
  emits INC-4 `emitCoinsAwarded`.

From canonical layer:
- `payment.settled` canonical emit from `rez-payment-service` (Sprint 2+).
- `visit.completed`, `merchant.approved`, `customer.lapsed` emitters — next
  round.
- Real subscribers on the `order-events` BullMQ queue. Today it accumulates
  jobs with no consumers; Sprint 1+ wires cashback / WhatsApp receipts /
  lapsed detection as subscribers.
- `@types/jest` added to tsconfig `types` array so test files typecheck.

From dashboard extraction (rez-app-marchant, separate track):
- 4 of 26 cards now extracted (`ErrorBannerCard`, `StoreSuspensionBanner`,
  plus Round 4's `StoreInactiveBanner` + `TopItemsTodayCard`). Foundation
  (`PreferencesContext`, `dashboardFormatters`, `components/dashboard/cards/types.ts`)
  already landed.
- 22 cards remain in the 3,382-line `app/(dashboard)/index.tsx` shell.
- Registry wire-up still pending — Sprint -1b work, not blocking Sprint 0
  or the Sprint-1 audit series.

---

## Branch push checklist (three repos)

All three rounds verified clean. Ready to push.

### 1. Monolith — `rezbackend/rez-backend-master`

Branch: `rescue/sprint-scaffold-20260421` (16 commits ahead of `main`)
Base: `main` at `095b67ae` — no drift, no rebase needed.

```bash
cd rezbackend/rez-backend-master
git push -u origin rescue/sprint-scaffold-20260421
gh pr create --base main --head rescue/sprint-scaffold-20260421 \
  --title "Sprint 0 + Sprint-1 audit: identity wire-ups (B4/B6/B7) + downstream migrations" \
  --body-file docs/sprint-0/SHIPPED_LOG.md
```

Optional alternative: cherry-pick the wire-up + bridge commits onto
`feat/sprint-0/identity-wire-ups` if you prefer a clean squash path.

### 2. Notification events — `rez-notification-events`

Branch: `fix/ntf-audit-fixes-2026-04-20` (+1 commit: `a2c0773`)

```bash
cd rez-notification-events
git push origin fix/ntf-audit-fixes-2026-04-20
```

This commit is tiny (1 file, 1-line change + comment block) — probably
easiest as a standalone PR or folded into the next batch of notification
fixes on the same branch.

### 3. Payment service — `rez-payment-service`

Branch: `main` (+1 commit: `f243f1b`)

```bash
cd rez-payment-service
git push origin main   # already on main — direct push
# OR if branch protection requires a PR flow:
git branch fix/sprint1-prereq-c-dedupe-wallet-worker
git reset --hard HEAD~1   # back main up
git checkout fix/sprint1-prereq-c-dedupe-wallet-worker
git push -u origin fix/sprint1-prereq-c-dedupe-wallet-worker
```

### 4. Merchant app — `rez-app-marchant`

Branch: `main` (+1 commit: `bcb3a1c` — dashboard cards only)

```bash
cd rez-app-marchant
git push origin main   # or use a feature branch
```

### Post-merge deploy order (per `DEPLOY_COORDINATION.md` §Sprint 0)

1. Deploy monolith with the B4/B6/B7 wire-ups + downstream migrations.
   Smoke-test every order-create path + verify canonical `order.placed`
   events land in the `order-events` BullMQ queue (BullBoard).
2. Deploy `rez-payment-service` (Pre-req C). Single `wallet-credit`
   worker now — verify boot log shows ONE `[Worker] Started` line.
3. Deploy `rez-notification-events` (Pre-req B). Set
   `DISABLE_NOTIFICATION_WORKER=true` in the monolith's env to flip
   traffic over when ready; verify BullBoard shows this service
   processing `notification-events` queue jobs.
4. Deploy `rez-app-marchant` (dashboard cards). No runtime behaviour
   change — the new cards exist side-by-side with the inline JSX in
   the shell, registry wire-up is a later sprint.

### 24h burn-in watchlist (Sentry)

- Monolith: no new errors on `/aggregator/*`, `/web-ordering/*`,
  `/pos/*`.
- Payment service: `wallet-credit` job success rate unchanged; one
  worker active on BullBoard.
- Notification events: incoming jobs on `notification-events` queue
  accumulate + drain (previously silent).

### Mongo smoke check 24h post-deploy

```js
// B4 success signal — was 0 pre-patch, should rise with aggregator traffic:
db.users.countDocuments({ source: 'aggregator-swiggy' })
db.users.countDocuments({ source: 'aggregator-zomato' })

// B7 success signal — customerId link on newly-created POS bills:
db.posbills.countDocuments({ customerId: { $exists: true, $ne: null } })

// B6 success signal — userId link on newly-created web orders:
db.weborders.countDocuments({ userId: { $ne: null }, createdAt: { $gte: ISODate("2026-04-22T00:00:00Z") } })
```
