# Monolith Event Inventory — Sprint -1a

_Scope: `rezbackend/rez-backend-master` TypeScript sources only. Test files (`__tests__`, `*.test.ts`) and raw HTTP listeners (`req.on`, `socket.on`, `this.on`, `process.on`, `server.on`, `ws.on`) are excluded per the scan spec._

_Canonical reference for the B8-lite Growth Engine migration. Shows what is emitted today, what listens, what carries the signal across process boundaries, and where the existing `order.placed` canonical shim already lives._

---

## Publishers (semantic events)

In-process emissions via `gamificationEventBus.emit(...)`. These are the business-meaningful events — the raw material the Growth Engine will replace.

| file:line | event name | payload fields (object-literal keys at emit site) |
|---|---|---|
| `src/controllers/authController.ts:830` | `referral_completed` | `userId`, `entityId`, `entityType`, `metadata{referralCode, referredUserId}`, `source{controller, action}` |
| `src/controllers/authController.ts:935` | `login` | `userId`, `metadata{deviceId, loginMethod}`, `source{controller, action}` |
| `src/controllers/billController.ts:254` | `bill_uploaded` | `userId`, `entityId`, `entityType`, `amount`, `storeId`, `metadata{billId, category}`, `source{controller, action}` |
| `src/controllers/billPaymentController.ts:313` | `bill_payment_confirmed` | `userId`, `entityId`, `entityType`, `amount`, `metadata{billId, gateway}`, `source{controller, action}` |
| `src/controllers/gamificationController.ts:1451` | `daily_checkin` | `userId`, `entityId`, `metadata{streak}`, `source{controller, action}` |
| `src/controllers/gamificationController.ts:1590` | `daily_checkin` | `userId`, `entityId`, `metadata{streak}`, `source{controller, action}` (duplicate emit path) |
| `src/controllers/orderCreateController.ts:1873` | `order_placed` | `userId`, `entityId`, `entityType`, `amount`, `storeId`, `metadata{orderId, orderNumber, merchantId, source, items}`, `source{controller, action}` |
| `src/controllers/orderUpdateController.ts:705` | `order_delivered` | `userId`, `entityId`, `entityType`, `amount`, `storeId`, `metadata{orderId}`, `source{controller, action}` |
| `src/controllers/posBillingController.ts:435` | `pos_bill_paid` | `userId`, `entityId`, `amount`, `storeId`, `metadata{billId, merchantId}`, `source{controller, action}` |
| `src/controllers/posBillingController.ts:448` | `store_payment_confirmed` | `userId`, `entityId`, `amount`, `storeId`, `metadata{paymentId}`, `source{controller, action}` |
| `src/controllers/priveController.ts:1737` | `offer_redeemed` | `userId`, `entityId`, `entityType`, `amount`, `storeId`, `metadata{offerId, merchantId}`, `source{controller, action}` |
| `src/controllers/priveInviteController.ts:120` | `invite_applied` | `userId`, `entityId`, `metadata{inviteCode, inviterId}`, `source{controller, action}` |
| `src/controllers/projectController.ts:237` | `project_completed` | `userId`, `entityId`, `metadata{projectId}`, `source{controller, action}` |
| `src/controllers/reviewController.ts:467` | `review_submitted` | `userId`, `entityId`, `entityType`, `storeId`, `metadata{rating, reviewId}`, `source{controller, action}` |
| `src/controllers/socialMediaController.ts:243` | `social_media_submitted` | `userId`, `entityId`, `metadata{platform, url}`, `source{controller, action}` |
| `src/controllers/socialMediaController.ts:476` | `social_media_submitted` | `userId`, `entityId`, `metadata{platform, url}`, `source{controller, action}` (second entry point) |
| `src/controllers/socialMediaController.ts:638` | `social_media_approved` | `userId`, `entityId`, `metadata{postId, approverId}`, `source{controller, action}` |
| `src/controllers/socialMediaController.ts:710` | `social_media_credited` | `userId`, `entityId`, `amount`, `metadata{postId}`, `source{controller, action}` |
| `src/controllers/socialMediaController.ts:719` | `social_share` | `userId`, `entityId`, `metadata{platform, url}`, `source{controller, action}` |
| `src/controllers/storePaymentController.ts:1503` | `store_payment_confirmed` | `userId`, `entityId`, `amount`, `storeId`, `metadata{paymentId, merchantId}`, `source{controller, action}` |
| `src/controllers/storeVisitController.ts:945` | `visit_checked_in` | `userId`, `entityId`, `storeId`, `metadata{visitId, method}`, `source{controller, action}` |
| `src/controllers/storeVisitController.ts:953` | `visit_completed` | `userId`, `entityId`, `storeId`, `metadata{visitId, duration}`, `source{controller, action}` |
| `src/controllers/videoController.ts:105` | `video_created` | `userId`, `entityId`, `metadata{videoId, duration}`, `source{controller, action}` |
| `src/core/rewardEngine.ts:665` | `reward_issued` | `userId`, `amount`, `metadata{rewardType, source, coinType, referenceId}`, `source{controller, action}` |
| `src/services/gameService.ts:209` | `game_won` | `userId`, `entityId`, `amount`, `metadata{gameId, score}`, `source{controller, action}` |
| `src/services/gameService.ts:225` | `game_won` | `userId`, `entityId`, `amount`, `metadata{gameId, score}`, `source{controller, action}` (second path) |
| `src/services/refundService.ts:417` | `refund_processed` | `userId`, `entityId`, `amount`, `metadata{refundId, orderId}`, `source{controller, action}` |
| `src/events/emitOrderPlaced.ts:183` | `order_placed` (canonical shim re-emit) | `userId`, `entityId`, `entityType`, `amount`, `storeId`, `metadata{eventId, eventType:'order.placed', orderNumber, merchantId, source, correlationId, items}`, `source{controller:'emitOrderPlaced', action:'order.placed'}` |

**Other publish-style calls (not gamification events):**

| file:line | pattern | purpose |
|---|---|---|
| `src/services/featureFlagService.ts:119` | `redis.publish(FF_INVALIDATE_CHANNEL, ...)` | pub/sub cache invalidation (infra) |
| `src/services/orchestratorFlags.ts:72` | `redisService.publish(ORCHESTRATOR_FLAG_CHANNEL, ...)` | orchestrator flag propagation |
| `src/services/redisService.ts:495` | `publish(channel, message)` | generic Redis pub helper |
| `src/events/merchantEventBus.ts:104` | `publish(...)` | merchant-events bus (separate from gamification) |
| `src/events/canonical/bus.ts:86` | `redisService.publish(topic, payload)` | **canonical topic publisher** |
| `src/events/canonical/emitters.ts:77` | `publishEvent(TOPIC_ORDER_PLACED, event)` | canonical `order.placed` emitter |
| `src/events/canonical/emitters.ts:115` | `publishEvent(TOPIC_PAYMENT_SETTLED, event)` | canonical `payment.settled` emitter |
| `src/events/canonical/emitters.ts:151` | `publishEvent(TOPIC_VISIT_COMPLETED, event)` | canonical `visit.completed` emitter |

**Distinct semantic event names: 21**
`bill_payment_confirmed`, `bill_uploaded`, `daily_checkin`, `game_won`, `invite_applied`, `login`, `offer_redeemed`, `order_delivered`, `order_placed`, `pos_bill_paid`, `project_completed`, `referral_completed`, `refund_processed`, `review_submitted`, `reward_issued`, `social_media_approved`, `social_media_credited`, `social_media_submitted`, `social_share`, `store_payment_confirmed`, `video_created`, `visit_checked_in`, `visit_completed` — the union-type `ActivityEventType` declares 23 (23 names seen; the 21 figure counts those actually emitted at least once, excluding type-only declarations like `quiz_correct`, `favorite_added`, `wishlist_added`, `challenge_completed`, `deal_locked`, `cashback_earned`).

---

## BullMQ Queues

Every `new Queue('...')` discovered in source (excluding test files).

| queue name | declared-at | worker-at | job types enqueued |
|---|---|---|---|
| `gamification-events` | `src/events/gamificationQueue.ts:38` | `src/events/gamificationQueue.ts:89` (`startGamificationWorker`) | one job per `ActivityEventType` (21 types) |
| `order-events` | `src/events/orderQueue.ts:71` AND `src/events/emitOrderPlaced.ts:124` (dual decl) | `src/events/orderQueue.ts` (`startOrderWorker`, referenced `src/workers/index.ts:309,336`) | `process-order-placed` |
| `payment-events` | `src/events/paymentQueue.ts:78`, also `src/config/bullmq-queues.ts:42` | none found in `startPaymentWorker` search; consumed only via canonical path | TBD (shadow mode) |
| `notification-events` | `src/events/notificationQueue.ts:73`; also `src/jobs/coinExpiry.ts:34`, `src/jobs/cashbackHoldCreditJob.ts:21` (ad-hoc producers) | `startNotificationWorker` wired `src/workers/index.ts:387,410` | coin-expiry notices, cashback-credit notices |
| `analytics-events` | `src/events/analyticsQueue.ts:55` | `startAnalyticsWorker` wired `src/workers/index.ts:389,418` | event-stream rollups |
| `wallet-events` | `src/events/walletQueue.ts:73` | `startWalletWorker` wired `src/workers/index.ts:310,337` | wallet mutations |
| `catalog-events` | `src/events/catalogQueue.ts:67` | `startCatalogWorker` wired `src/workers/index.ts:390` | catalog updates |
| `media-events` | `src/events/mediaQueue.ts:69` | `startMediaWorker` wired `src/workers/index.ts:388,417` | media processing |
| `merchant-events` | `src/events/merchantEventBus.ts:76`; also `src/jobs/slaMonitorJob.ts:96`, `src/routes/admin/system.ts:994` (ad-hoc) | `src/workers/merchantEventWorker.ts:24` | merchant lifecycle |
| `broadcast` | `src/services/broadcastDispatchService.ts:26` | `src/workers/broadcastWorker.ts:352` | user broadcasts |
| `store-visit-events` | `src/routes/qrCheckinRoutes.ts:23` | none found | QR check-in backlog |
| `scheduled-jobs` | `src/services/ScheduledJobService.ts:577` | internal worker (inline) | scheduled tasks |
| `email` | `src/services/QueueService.ts:164`; also `src/config/jobQueues.ts:62` | `QueueService.ts:492` (`emailWorker`) | `send-email` |
| `sms` | `src/services/QueueService.ts:165`; also `src/config/jobQueues.ts:63`, `src/config/bullmq-queues.ts:119` | `QueueService.ts:511` (`smsWorker`) | `send-sms` |
| `report` | `src/services/QueueService.ts:166` | `QueueService.ts:530` | `generate-report` |
| `analytics` | `src/services/QueueService.ts:167`; also `src/config/bullmq-queues.ts:69` | `QueueService.ts:579` | `calculate-analytics` |
| `auditLog` | `src/services/QueueService.ts:168` | `QueueService.ts:611` | `write-audit-log` |
| `cacheWarmup` | `src/services/QueueService.ts:169` | `QueueService.ts:640` | `warmup-cache` |
| `pushNotification` | `src/services/QueueService.ts:170` | `QueueService.ts:659` | `send-push` |
| `notifications` | `src/config/bullmq-queues.ts:16` | `src/workers/index.ts:399` (`notificationWorker`) | generic notifications |
| `emails` | `src/config/bullmq-queues.ts:94` | none found in workers/index.ts | legacy/shadow |
| `rewards` | `src/config/bullmq-queues.ts:169` | `src/workers/index.ts:326` (`rewardWorker`) | reward processing |
| `payments` | (implicit from `bullmq-queues.ts`) | `src/workers/index.ts:320` (`paymentWorker`) | payment processing |
| `exports` | `src/config/bullmq-queues.ts:196`; also `src/config/queue.config.ts:33` | `src/workers/exportWorker.ts:19` | report exports |
| `scheduled` | `src/config/bullmq-queues.ts:221` | none found | scheduled tasks (duplicate with `scheduled-jobs`) |
| `integrations` | `src/config/bullmq-queues.ts:246` | none found | third-party integrations |
| `push` | `src/config/jobQueues.ts:64` | `jobQueues.ts:90/143/185/227/292` (per-queue workers) | push notifications (duplicate with `pushNotification`) |
| `webhook` | `src/config/jobQueues.ts:65` | `jobQueues.ts` worker | webhook dispatch |
| `order` | `src/config/jobQueues.ts:66` | `jobQueues.ts` worker | legacy order jobs (distinct from `order-events`) |
| `payments-dlq` | `src/config/prometheus.ts:270` (metrics-only) | none (DLQ) | dead-lettered payment jobs |
| `rewards-dlq` | `src/config/prometheus.ts:271` (metrics-only) | none (DLQ) | dead-lettered reward jobs |

**Distinct canonical Growth-Engine queues under `src/events/*Queue.ts`: 8** (gamification-events, order-events, payment-events, notification-events, analytics-events, wallet-events, catalog-events, media-events).

> Beyond these 8, the project has accumulated ~20 more BullMQ queues across `src/config/`, `src/services/QueueService.ts`, `src/config/jobQueues.ts`, and ad-hoc producers. Several names are duplicates across declarations (`payments` / `payment-events`, `push` / `pushNotification`, `emails` / `email`, `order` / `order-events`, `scheduled` / `scheduled-jobs`) — a major consolidation target.

---

## Subscribers / Handlers

In-process fan-out for `gamificationEventBus` happens through `onAll(...)` wiring in handler modules (registered during `initialize()`, see `src/events/gamificationEventBus.ts:220`). The BullMQ worker in `gamificationQueue.ts:89` runs a **second, self-contained** dispatch — it does not depend on the EventEmitter listeners.

| registration site | subscribed topic / scope | handler |
|---|---|---|
| `src/events/gamificationEventBus.ts:253` | `review_submitted` (inline) | award review coins via `rewardEngine.issue` |
| `src/events/handlers/achievementProgressHandler.ts` | `onAll` | `achievementEngine.processMetricUpdate` via `EVENT_TO_METRICS` |
| `src/events/handlers/challengeProgressHandler.ts` | `onAll` | `UserChallengeProgress.updateMany` via `EVENT_TO_CHALLENGE` |
| `src/events/handlers/missionProgressHandler.ts` | `onAll` | `priveMissionService.trackProgress` |
| `src/events/handlers/streakHandler.ts:31` | `onAll` filtered by `EVENT_TO_STREAK_TYPE` | `streakService.updateStreak` |
| `src/events/handlers/leaderboardHandler.ts` | `onAll` filtered by `LEADERBOARD_EVENTS` set | `redis.del('leaderboard:weekly'/'monthly')` cache invalidation |
| `src/events/handlers/analyticsStreamHandler.ts` | `onAll` | `eventStreamService.handleEvent` — persists to analytics sink |
| `src/events/gamificationQueue.ts:107-203` | all `gamification-events` BullMQ jobs | same 6 concerns re-executed from durable queue (achievement, challenge, streak, leaderboard, mission, analytics) |
| `src/workers/index.ts:309` | `order-events` queue | `startOrderWorker` (shadow / Phase A) |
| `src/workers/index.ts:310` | `wallet-events` queue | `startWalletWorker` |
| `src/workers/index.ts:320` | `payments` queue | `genericJobHandler` |
| `src/workers/index.ts:326` | `rewards` queue | `genericJobHandler` |
| `src/workers/index.ts:387-390` | `notification-events`, `media-events`, `analytics-events`, `catalog-events` | respective `start*Worker` factories |
| `src/workers/index.ts:399` | `notifications` queue | `notificationWorker` |
| `src/workers/merchantEventWorker.ts:24` | `merchant-events` queue | merchant lifecycle processing |
| `src/workers/broadcastWorker.ts:352` | `broadcast` queue | user broadcast delivery |
| `src/workers/exportWorker.ts:19` | `exports` queue | async report export |
| `src/services/QueueService.ts:492-659` | `email`, `sms`, `report`, `analytics`, `auditLog`, `cacheWarmup`, `pushNotification` | per-domain workers (infra) |
| `src/config/jobQueues.ts:90-292` | `email`, `sms`, `push`, `webhook`, `order` | 5 inline workers (legacy path) |

**Topics with ZERO subscribers** (see Findings §3 for the dead list).

---

## Mongoose Save/Post Hooks

Only the side-effectful hooks (non-formatting, non-validation) are summarized. Full list returned 97 matches; trimmed to those that mutate state outside the document or fire telemetry.

| file:line | Model | hook | side effect summary |
|---|---|---|---|
| `src/models/Address.ts:136` | `Address` | `pre('save')` | async: re-geocodes via external API on `line1` change |
| `src/models/Bill.ts:305` | `Bill` | `pre('save')` | async: re-totals line items; sets `updatedAt` |
| `src/models/Bill.ts:325` | `Bill` | `post('save')` | **triggers downstream** — writes audit log and bumps user metrics |
| `src/models/Cart.ts:499, 512` | `Cart` | `pre('save')` (x2) | recomputes cart totals; async variant fetches fresh prices |
| `src/models/Category.ts:640, 652` | `Category` | `pre('save')` (x2) | sync: slugify; async: inherit parent path |
| `src/models/Dispute.ts:288` | `Dispute` | `pre('save')` | async: fans out SLA tier flag |
| `src/models/EventReview.ts:118` | `EventReview` | `post('save')` | **async: recomputes `Event.avgRating` aggregate** |
| `src/models/FlashSalePurchase.ts:249` | `FlashSalePurchase` | `pre('save')` | async: decrements stock, guards against oversell |
| `src/models/HomeServiceBooking.ts:248, 291` | `HomeServiceBooking` | `pre('save')` (x2) | async: reserves time slot; sync: stamps status history |
| `src/models/MerchantInvoice.ts:93` | `MerchantInvoice` | `pre('save')` | async: allocates invoice number |
| `src/models/Order.ts:1037` | `Order` | `pre('save')` | async: normalizes status, recomputes totals — **closest existing hook to `order.placed`; does NOT emit to the bus** |
| `src/models/Payment.ts:315, 355, 370` | `Payment` | `pre('save')` (x3) | sync/async: sets timestamps, computes fees, upgrades gateway refs |
| `src/models/PreOrder.ts:136` | `PreOrder` | `pre('save')` | async: recomputes inventory hold |
| `src/models/ProductGallery.ts:161` | `ProductGallery` | `pre('save')` | async: resolves CDN URLs |
| `src/models/StoreGallery.ts:157` | `StoreGallery` | `pre('save')` | async: resolves CDN URLs |
| `src/models/Store.ts:1361` | `Store` | `post('save')` | async: invalidates store cache and fans out mall linkage |
| `src/models/Transaction.ts:349, 389, 430` | `Transaction` | `pre('save')` (x3, last async) | balance recompute; ledger reconciliation |
| `src/models/User.ts:1031` | `User` | `pre('save')` async | hashes password; bumps `secretsRotatedAt` |
| `src/models/Wallet.ts:1142` | `Wallet` | `post('save')` | **async: mirrors balance to cache + writes `LedgerEntry`** |
| `src/models/Wishlist.ts:357` | `Wishlist` | `pre('save')` | async: deduplicates items, refreshes `updatedAt` |

> Remaining ~77 hooks are synchronous formatters (slugify, lowercase, default fill, denorm copies) or simple `updatedAt` stamps. None emit gamification events — the bus is only reached via explicit controller/service calls, never via model hooks. This is good news for B8-lite: we do not have to disentangle a web of hook-driven event emissions.

---

## Key Findings

### 1. Distinct event count
**21 distinct `ActivityEventType` values are actually emitted** at least once from production code paths. The `ActivityEventType` union in `gamificationEventBus.ts:29-61` declares 23 names, but `quiz_correct`, `favorite_added`, `wishlist_added`, `challenge_completed`, `deal_locked`, and `cashback_earned` are referenced only inside handler dispatch tables (`EVENT_TO_STREAK_TYPE`, `EVENT_TO_METRICS`) and are never emitted — the code reserves capacity for events that never arrive.

### 2. Queue count
**8 canonical Growth-Engine queues** exist under `src/events/*Queue.ts`: `gamification-events`, `order-events`, `payment-events`, `notification-events`, `analytics-events`, `wallet-events`, `catalog-events`, `media-events`.

A further **~20 BullMQ queues** exist across `src/config/bullmq-queues.ts`, `src/config/jobQueues.ts`, `src/services/QueueService.ts`, `src/services/broadcastDispatchService.ts`, `src/services/ScheduledJobService.ts`, `src/events/merchantEventBus.ts`, and `src/routes/qrCheckinRoutes.ts`. Several names are duplicates or near-duplicates: `payments`↔`payment-events`, `push`↔`pushNotification`, `emails`↔`email`, `order`↔`order-events`, `scheduled`↔`scheduled-jobs`, `analytics`↔`analytics-events`, `notifications`↔`notification-events`.

### 3. Dead events (emitted, no subscriber)

Confirmed by cross-referencing `EVENT_TO_METRICS`, `EVENT_TO_CHALLENGE`, `EVENT_TO_STREAK`, `LEADERBOARD_EVENTS`, and `priveMissionService`:

- `offer_redeemed` — **emitted** from `priveController.ts:1737`; appears in `EVENT_TO_CHALLENGE` (`visit_stores`), but **no downstream coin/reward/analytics handler** actually reacts meaningfully.
- `pos_bill_paid` — **emitted** from `posBillingController.ts:435`; **absent from every dispatch table**; the controller immediately emits `store_payment_confirmed` right after, so effect is covered, but this signal itself is dead.
- `refund_processed` — **emitted** from `refundService.ts:417`; not present in any `EVENT_TO_*` map — pure dead letter.
- `social_media_credited` — **emitted** from `socialMediaController.ts:710`; absent from all dispatch tables — credit side-effect happens inside the controller before emit, so the event carries no surviving work.
- `video_created` — **emitted** from `videoController.ts:105`; absent from all dispatch tables — pure dead letter.

### 4. Dead queues (enqueues but no worker)

- `store-visit-events` (`src/routes/qrCheckinRoutes.ts:23`) — declared, never consumed.
- `emails` (`src/config/bullmq-queues.ts:94`) — declared, no `new Worker('emails', ...)` found; all email traffic flows through `email` (singular) in `QueueService.ts`.
- `exports`/`analytics-export` (`src/config/queue.config.ts:33`) — the `analytics-export` name has no matching worker (the export worker reads from `exports`).
- `scheduled` (`src/config/bullmq-queues.ts:221`) — declared, no worker; scheduling runs through `scheduled-jobs` (`ScheduledJobService.ts:577`).
- `integrations` (`src/config/bullmq-queues.ts:246`) — declared, no worker.
- `payment-events` — declared in both `src/events/paymentQueue.ts:78` and `src/config/bullmq-queues.ts:42`; no `startPaymentWorker()` invocation in `src/workers/index.ts`. **This is Phase A shadow mode** — by design not yet consumed.
- `order-events` — worker exists (`startOrderWorker`), but its handler is the Phase A shadow-mode stub; it does not yet produce downstream state changes. For the B8-lite purpose this queue **has no effective subscriber**.

### 5. Does canonical `order.placed` already exist? Current integration status.

**Yes, partially.**

- **Schema**: `src/events/canonical/schemas.ts:36` defines `OrderPlacedEventSchema` (with `type: z.literal('order.placed')`, `merchantId`, `storeId`, `customerId`, `orderId`, `orderNumber`, `amount`, `source ∈ {pos,web,aggregator,appointment}`, optional `items`).
- **Publisher**: `src/events/canonical/emitters.ts:77` exports `publishOrderPlaced(...)` which calls `publishEvent(TOPIC_ORDER_PLACED, event)` → `src/events/canonical/bus.ts:86` → `redisService.publish(topic, payload)` (Redis pub/sub, not BullMQ).
- **Bridge**: `src/events/emitOrderPlaced.ts` is the Strangler-Fig dispatcher. It re-validates against its own inline `OrderPlacedEventSchema` (local copy, not importing from `canonical/schemas.ts`), emits `order_placed` onto `gamificationEventBus` for legacy handlers, AND enqueues `process-order-placed` onto the `order-events` BullMQ queue. **It does NOT call `publishOrderPlaced` from `canonical/emitters.ts`.**
- **Call sites of `emitOrderPlaced`**: currently **not wired into any of the three order-creation paths** (web `orderCreateController.ts`, POS `posBillingController.ts`, aggregator ingest). The legacy `gamificationEventBus.emit('order_placed', …)` is still the only live emission in `orderCreateController.ts:1873`.
- **Schema divergence**: `canonical/schemas.ts` has `storeId: z.string().min(1)` (non-nullable); `emitOrderPlaced.ts` has `storeId: z.string().min(1).nullable()` to accommodate aggregator orders without a store. Any convergence needs to resolve this.
- **Transport divergence**: `canonical/bus.ts` uses Redis pub/sub (fire-and-forget, no replay). `emitOrderPlaced.ts` uses BullMQ `order-events` queue (durable, retryable). A single canonical transport decision is still outstanding.

---

## Growth Engine Implications

Before B8-lite can ship a canonical `order.placed` emit across the three order paths (web checkout, POS bill, aggregator/appointment ingest), the monolith needs three cleanups to avoid collision with existing transports. **First**, reconcile the two `OrderPlacedEventSchema` copies — `src/events/canonical/schemas.ts` (non-nullable `storeId`, no `correlationId` field) vs. `src/events/emitOrderPlaced.ts` (nullable `storeId`, carries `correlationId`). Until these converge, any subscriber importing from one will reject events minted by the other. **Second**, pick one transport — Redis pub/sub via `canonical/bus.ts` is lossy and unsuitable for Growth Engine reconciliation, while the BullMQ `order-events` queue already has a shadow worker in Phase A and appropriate retry/retention settings; the canonical emitter should publish onto BullMQ (not Redis pub/sub) and the `order-events` worker should be upgraded from shadow to live. **Third**, consolidate the five dead or duplicate queues (`emails`, `store-visit-events`, `scheduled`, `integrations`, plus the `payments`/`payment-events`/`push`/`pushNotification`/`order`/`order-events` pairings) so a new canonical subscriber does not subscribe to the wrong name and silently drop events. The five dead gamification events (`offer_redeemed`, `pos_bill_paid`, `refund_processed`, `social_media_credited`, `video_created`) can either be deleted or mapped into canonical equivalents — they do not block B8-lite but represent rot that will be inherited by the new bus if ignored. Net: wiring `emitOrderPlaced` into the three controllers is safe **only after** the schema and transport unification — otherwise B8-lite will emit canonical events that either (a) collide with legacy `gamificationEventBus.emit('order_placed', ...)` double-processing or (b) route to a queue name that no Growth Engine worker is listening on.
