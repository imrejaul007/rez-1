# Sprint 0 Wire-Up Guide

Turnkey patch reference for applying B4 / B6 / B7 using the shared helpers
already landed in `src/events/`. Each section below is a copy-paste-ready
insertion — no new logic to write.

Helpers referenced:
- `src/events/resolveCustomerIdentity.ts` — phone → User._id upsert
- `src/events/emitOrderPlaced.ts` — canonical event dispatch (never-throws)

---

## B4 — Aggregator webhook (Swiggy + Zomato)

**File:** `src/routes/aggregatorWebhookRoutes.ts`
**Save points:** line 152 (Swiggy), line 238 (Zomato)

### Top of file — add imports

```ts
import { resolveCustomerIdentity } from '../events/resolveCustomerIdentity';
import { emitOrderPlaced } from '../events/emitOrderPlaced';
```

### Swiggy handler — insert immediately after `AggregatorOrder.create(normalizedData)` at line 152

```ts
// B4: Identity resolution + canonical emit.
const identity = await resolveCustomerIdentity({
  customerPhone: normalizedData.customerPhone,
  customerName: normalizedData.customerName,
  source: 'aggregator-swiggy',
});

// storeId is nullable for aggregator orders (platform doesn't map to a store).
// Merchant "primary store" heuristic gets wired in Sprint 1 — for now, null.
emitOrderPlaced({
  merchantId: String(merchantId),
  storeId: null,
  customerId: identity.customerId,
  orderId: String(order._id),
  orderNumber: `SWIGGY-${order.externalId}`,
  amount: normalizedData.total,
  source: 'aggregator',
  items: normalizedData.items?.map((i: any) => ({
    productId: String(i.productId ?? i._id ?? ''),
    qty: Number(i.quantity ?? i.qty ?? 1),
    price: Number(i.price ?? 0),
  })),
});
```

### Zomato handler — same pattern at line 238

Replace `aggregator-swiggy` with `aggregator-zomato` and `SWIGGY-` with
`ZOMATO-` in the orderNumber.

### Follow-ups

- Add `customerId: { type: ObjectId, ref: 'User', sparse: true, index: true }`
  to `src/models/AggregatorOrder.ts`.
- Before `AggregatorOrder.create(...)`, attach `normalizedData.customerId = identity.customerId`
  so the order row itself links to the resolved user (not just the emitted event).

---

## B6 — Web ordering (ReZ Now QR)

**File:** `src/routes/webOrderingRoutes.ts`
**Save point:** line ~1090 (WebOrder.create)

### Top of file — add imports

Same two imports as B4.

### Just before WebOrder.create

Current code does a `User.findOne({ phoneNumber: customerPhone })` that may
return null, then passes `linkedUser?._id` as nullable userId. Replace with:

```ts
// B6: Always resolve — upsert if missing. Guarantees every web order has a customerId.
const identity = await resolveCustomerIdentity({
  customerPhone,
  source: 'web',
});
const linkedUserId = identity.customerId; // string | null
```

### In the WebOrder.create payload

Replace `userId: linkedUser?._id` with `userId: linkedUserId`.

### Immediately after WebOrder.create

```ts
// Load storeId + merchantId from the store doc we already fetched above.
// If you already have `storeDoc` in scope, use it; otherwise look up.
emitOrderPlaced({
  merchantId: String(storeDoc.merchantId),
  storeId: String(storeDoc._id),
  customerId: linkedUserId,
  orderId: String(webOrder._id),
  orderNumber: webOrder.orderNumber,
  amount: total,
  source: 'web',
  items: validatedItems,
});
```

### Follow-ups (7 downstream endpoints)

The B6 patch spec flagged 7 endpoints that query by `customerPhone` alone.
In Sprint 1 audit each one and replace with `User._id`-based lookups:

- `GET /orders/history`
- `POST /order/:orderNumber/rate`
- `POST /order/:orderNumber/cancel`
- `POST /payment/verify`
- Coin-credit endpoint
- Refund endpoint
- Loyalty endpoint

---

## B7 — POS bill creation

**File:** `src/controllers/posBillingController.ts`
**Save points:** line 161 (createBill) + line 208 (createQuickBill)

### Top of file — add imports

```ts
import { z } from 'zod';
import { resolveCustomerIdentity } from '../events/resolveCustomerIdentity';
import { emitOrderPlaced } from '../events/emitOrderPlaced';
```

### Zod validator at module scope

```ts
const CreateBillPayloadSchema = z.object({
  storeId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  customerId: z.string().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(z.any()).default([]),
});

// Feature-flag gate — enforce customer identity per merchant.
async function identityRequired(merchantId: string): Promise<boolean> {
  const envFlag = process.env.POS_REQUIRE_CUSTOMER_IDENTITY === 'true';
  if (envFlag) return true;
  // Per-merchant override (checked only when env flag is off).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Merchant = require('../models/Merchant').Merchant ?? require('../models/Merchant').default;
  const m = await Merchant.findById(merchantId).select('posSettings').lean();
  return m?.posSettings?.requireCustomerIdentity === true;
}
```

### createBill — at the top of the handler, after validators

```ts
const payload = CreateBillPayloadSchema.parse(req.body);
const required = await identityRequired(merchantId);
if (required && !payload.customerId && !payload.customerPhone) {
  return res.status(400).json({
    success: false,
    message: 'Customer identity required — select a customer or mark as Walk-in',
  });
}
```

### Before PosBill.create

```ts
const identity = await resolveCustomerIdentity({
  customerId: payload.customerId,
  customerPhone: payload.customerPhone,
  customerName: payload.customerName,
  source: 'pos',
});
// identity.customerId may be null if merchant is in 'optional' mode and
// cashier tapped Walk-in — that's fine, emit with null.
```

### In PosBill.create payload — add `customerId: identity.customerId`

### After PosBill.create

```ts
emitOrderPlaced({
  merchantId,
  storeId,
  customerId: identity.customerId,
  orderId: String(bill._id),
  orderNumber: bill.billNumber,
  amount: totalAmount,
  source: 'pos',
  items: mergedItems?.map((i: any) => ({
    productId: String(i.productId ?? ''),
    qty: Number(i.quantity ?? 1),
    price: Number(i.price ?? 0),
  })),
});
```

### createQuickBill — mirror the same pattern

Same imports, same validator, same `resolveCustomerIdentity` call, same
`emitOrderPlaced` call with `source: 'pos'`.

### PosBill schema addition

In `src/models/PosBill.ts`:

```ts
customerId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  sparse: true,
  index: true,
},
```

---

## Rollout order

1. **Merge helpers first** (already done in this rescue branch).
2. **Deploy monolith with helpers but no caller changes** — code is dormant;
   imports verify TypeScript builds; smoke green.
3. **Apply B4** — lowest risk, aggregator webhooks are low volume.
4. **Apply B6** — medium risk, web ordering is active but self-contained.
5. **Apply B7** — highest risk (POS is core), ship with
   `POS_REQUIRE_CUSTOMER_IDENTITY=false`, enable per-merchant via the 4-phase
   rollout plan in `B7_POS_IDENTITY_PATCH.md`.

Each application is its own commit. Revert individually if Sentry flares.

---

## Verification after each apply

- **Build:** `npm run build` or `tsc --noEmit` — must compile clean.
- **Unit tests:** `npm test src/events/__tests__/` — helper tests stay green.
- **BullBoard:** the `order-events` queue should start accumulating jobs at
  roughly the order-creation rate of whichever path you wired.
- **Sentry:** no new errors on `/aggregator/*`, `/webOrdering/*`, or `/pos/*`
  routes during the 24h burn-in window.
- **Mongo:** `db.users.countDocuments({ source: 'aggregator-swiggy' })`
  should rise at roughly the Swiggy webhook rate after B4 deploy (was 0 before
  the fix, since aggregator orders never created user rows).

---

## What stays out of scope

- `payment.settled` canonical emit from rez-payment-service — Sprint 2+.
- Subscriber-side logic (cashback, WhatsApp receipts, lapsed detection) —
  Sprint 1+. Current subscribers on `gamificationEventBus.on('order_placed')`
  continue to work unchanged, because `emitOrderPlaced` still fires that
  legacy in-process event inside the helper.
- `visit.completed`, `merchant.approved`, `customer.lapsed` emitters — next
  round; not blocking Sprint 0.
