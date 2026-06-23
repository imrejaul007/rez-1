# Sprint -1b Architect Verification Checks

Scope: ReZ monolith (`rezbackend/rez-backend-master`). Five checks performed against HEAD.

---

## Check 1 — `getCurrentCorrelationId` exists?

- File: `src/utils/correlationContext.ts` (lines 42–44) — EXISTS.
- Exports `getCurrentCorrelationId(): string` (not `string | undefined`). When no async context is present it synthesises a `gen-<ts>-<rand>` fallback rather than returning undefined.
- Also exports `runWithCorrelation`, `correlationStorage`, and the `CorrelationStore` interface.
- Consumers already wired: `sentry.ts`, `serviceClient.ts`, `CrossAppSyncService.ts`, `events/canonical/emitters.ts`.

**Decision: EXISTS. Emitter should call it as `const correlationId = getCurrentCorrelationId();` and treat the result as a non-null `string` (no `?? fallback` needed).**

---

## Check 2 — Zod version & datetime syntax

- `package.json` line 194: `"zod": "^4.3.6"`.
- Zod v4 removed `z.string().datetime({ offset: true })` in favour of the `z.iso` namespace.

**Decision: Zod v4.3.6 installed. Emit schemas using `z.iso.datetime({ offset: true })` (v4-native). Avoid `z.string().datetime(...)` — it will not type-check under v4.**

---

## Check 3 — Field availability at the 3 order-creation save points

### 3.1 `src/routes/webOrderingRoutes.ts` — `WebOrder.create` (line 1090)

| Field | In scope? | Notes |
|---|---|---|
| merchantId | Indirect | Available as `storeDoc.merchantId` (Store model exposes it, line 221/729). Need to read it explicitly — not currently passed into `.create`. |
| storeId | Yes | `storeDoc._id` already used. |
| customerId | Nullable | `linkedUser?._id` (line 1079 User lookup by `customerPhone`). May be null for guest orders. |
| orderId | Yes | `orderNumber` (line 1028) + generated `_id` post-create. |
| amount | Yes | `total` / `totalPaise` (lines 1026–1027). |

### 3.2 `src/controllers/posBillingController.ts` — `PosBill.create` (lines 161, 208)

| Field | In scope? | Notes |
|---|---|---|
| merchantId | Yes | `req.merchantId!` (line 108/192). |
| storeId | Yes | `req.body.storeId`, validated via `resolveStore`. |
| customerId | No | Only `customerName` / `customerPhone` collected — no userId lookup performed. Would require a `User.findOne({ phoneNumber })` lookup (same pattern as webOrdering). |
| orderId | Yes | `generateBillNumber(storeId)` + bill `_id`. |
| amount | Yes | `totalAmount` from body. |

### 3.3 `src/routes/aggregatorWebhookRoutes.ts` — `AggregatorOrder.create` (lines 152, 238)

| Field | In scope? | Notes |
|---|---|---|
| merchantId | Yes | External id parsed from payload (line 118/207) and mapped to internal merchant via `MerchantAggregator` lookup (line 140/226). |
| storeId | No | Not resolved here; aggregator orders are keyed per merchant, not per store. Would need `Store.findOne({ merchantId, ... })` — not currently deterministic. |
| customerId | No | Only `customerName` / `customerPhone` normalised from the aggregator payload. |
| orderId | Yes | `externalId` + created `_id`. |
| amount | Yes | `total` (on normalised doc). |

**Decision: Recommend Path B (nullable) — OR the hybrid "mandatory merchantId+orderId+amount; nullable storeId and customerId". Strict Path A would break aggregator webhooks (no storeId/customerId) and guest web orders (no customerId). Hybrid is preferred: make `merchantId`, `orderId`, `amount` required; allow `storeId` and `customerId` null. Emitters at each save point should resolve `merchantId` deterministically (webOrdering: `storeDoc.merchantId`; pos: `req.merchantId`; aggregator: `approvedAgg.merchantId`).**

---

## Check 4 — `redisService.publish` semantics

- File: `src/services/redisService.ts`, lines 495–506.
- Signature: `public async publish(channel: string, message: string): Promise<boolean>`.
- Behaviour:
  - If Redis is not ready (`!this.isReady()`) — returns `false`, does NOT throw.
  - If the underlying `client.publish` throws — catches, `logger.error`s, returns `false`.
  - Success path returns `true`.
- Never throws; silently no-ops with a boolean signal.

**Decision: `bus.ts` `subscribeEvent` fallback: inspect the `Promise<boolean>` return. On `false`, (a) emit a `canonical_event.publish_failed` metric, (b) write the payload to a local `PendingEventOutbox` collection for a worker to retry, (c) continue the request — do NOT throw to the caller. Wrap the call in `try/catch` defensively in case future Redis clients surface exceptions, but the primary branch is the boolean check.**

---

## Check 5 — `ProcessedEvent` naming collision

- `src/models/ProcessedEvent.ts` ALREADY EXISTS (Sprint 0 scaffold — canonical event idempotency ledger, `eventId` + `processorKey`, 7-day TTL).
- Also present: `ProcessedWebhookEvent.ts` (separate, for inbound webhook dedup).

**Decision: CLEAR for the Sprint-1b canonical event bus — the existing `ProcessedEvent` model IS the intended idempotency ledger (its own header comment points at `events/canonical/bus.ts`). Reuse it; do NOT introduce a new name. If a second, semantically distinct ledger is needed, name it `CanonicalEventDelivery` (matches `eventId` + `subscriberKey` + `deliveredAt` shape) to avoid both `ProcessedEvent` and `ProcessedWebhookEvent`.**
