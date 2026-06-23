# B4 — Aggregator Identity Patch Spec

**Sprint:** 0
**Domain:** Aggregator (Swiggy / Zomato)
**Owner:** TBD (Architect-on-Call, week of 2026-04-21)
**Status:** Ready for implementation

## Goal

Every inbound aggregator order currently lands in `AggregatorOrder` as a free-floating row keyed only by `customerPhone` (optional string, no validation, no FK). This patch attaches a real `User._id` to every aggregator order by upserting on `phoneNumber`, so downstream flows (loyalty, CRM, last-seen store) have a stable customer identity instead of an unvalidated string.

---

## Current State

### Paths that reach `AggregatorOrder.create()`

| # | File | Line | Entry | Fields populated on create() | Merchant source | User lookup? |
|---|------|------|-------|------------------------------|-----------------|--------------|
| 1 | `src/routes/aggregatorWebhookRoutes.ts` | **152** | `POST /api/webhook/swiggy` | `externalId`, `platform='swiggy'`, `merchantId` (ObjectId), `customerName`, `customerPhone`, `items[]`, `total`, `deliveryAddress`, `status`, `rawPayload` (built by `normalizeSwiggyOrder` L14–40) | `raw.merchant_id \|\| raw.restaurantId` (webhook body, line 118) | **No** |
| 2 | `src/routes/aggregatorWebhookRoutes.ts` | **238** | `POST /api/webhook/zomato` | Same field set as (1) but `platform='zomato'`, built by `normalizeZomatoOrder` L45–71 | `raw.merchant_id \|\| raw.restaurantId` (line 207) | **No** |
| 3 | `src/merchantroutes/integrations.ts` | **418** | `POST /api/merchant/integrations/batch-upload` (CSV backfill) | `externalId`, `platform=(record.platform \|\| 'ondc')`, `merchantId`, `storeId`, `customerName`, `total`, `status='delivered'`, `items=[]`, `rawPayload=record`. **NOTE: no `customerPhone` captured today.** | `getMerchantId(req)` (authenticated merchant JWT, line 383) | **No** |

### Model state (`src/models/AggregatorOrder.ts`)

- `customerPhone: String` — no validation, no index (line 87).
- `customerName: String` — no validation (line 86).
- No `customerId` field exists. No FK to `User`.
- Unique compound index on `{ platform, externalId }` (line 111) — handles order-level idempotency; does **not** dedupe customer identity.

### User model (`src/models/User.ts`)

- **Confirmed:** `phoneNumber` is declared `unique: true` at the field level (line 283) and required (line 282).
- Phone is validated by a permissive regex `/^\+?[\d\s\-\(\)]{10,}$/` (line 285) — this is NOT strict E.164; it accepts spaces, dashes, parens. The new patch enforces stricter E.164 at the webhook boundary before the upsert.
- Compound index `{ phoneNumber: 1, 'auth.isVerified': 1 }` exists at line 897.
- The unique index on `phoneNumber` itself is implicit (via `unique: true` on the schema path) and is what makes the upsert-on-phone strategy safe.

---

## Proposed Diff

### 1. Schema change — `src/models/AggregatorOrder.ts`

**Before:**

```ts
export interface IAggregatorOrder extends Document {
  _id: Types.ObjectId;
  externalId: string;
  platform: 'swiggy' | 'zomato' | 'dunzo' | 'ondc';
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  items: IAggregatorOrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  // ...
}

const AggregatorOrderSchema = new Schema<IAggregatorOrder>(
  {
    // ...
    customerName: String,
    customerPhone: String,
    // ...
  },
  { timestamps: true }
);
```

**After:**

```ts
export interface IAggregatorOrder extends Document {
  _id: Types.ObjectId;
  externalId: string;
  platform: 'swiggy' | 'zomato' | 'dunzo' | 'ondc';
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  customerId?: Types.ObjectId; // NEW — FK to User, upserted on phoneNumber
  items: IAggregatorOrderItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  // ...
}

const AggregatorOrderSchema = new Schema<IAggregatorOrder>(
  {
    // ...
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    customerName: String,
    customerPhone: String,
    // ...
  },
  { timestamps: true }
);

// Index to answer "all aggregator orders for this customer"
AggregatorOrderSchema.index({ customerId: 1, createdAt: -1 });
```

### 2. Webhook handler change — `src/routes/aggregatorWebhookRoutes.ts`

Add a shared helper at the top of the file (after the `normalize*` functions):

```ts
import User from '../models/User';

// Strict E.164: + followed by 8–15 digits, no spaces/dashes/parens.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalize a raw phone string to E.164 (strip whitespace, dashes, parens).
 * Returns null if the cleaned value does not match E.164.
 */
function toE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s\-\(\)]/g, '');
  return E164_REGEX.test(cleaned) ? cleaned : null;
}

/**
 * Resolve (or create) a User for this phone. Returns the User._id.
 * Uses atomic upsert so concurrent webhooks for the same phone collapse
 * onto the single unique-indexed phoneNumber row.
 */
async function resolveCustomerId(
  phone: string,
  platform: 'swiggy' | 'zomato'
): Promise<Types.ObjectId> {
  const user = await User.findOneAndUpdate(
    { phoneNumber: phone },
    {
      $setOnInsert: {
        phoneNumber: phone,
        source: `aggregator-${platform}`,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return user._id;
}
```

**Swiggy handler — before (lines 150–154):**

```ts
    // Normalize and save
    const normalizedData = normalizeSwiggyOrder(raw, merchantId);
    const order = await AggregatorOrder.create(normalizedData);
```

**Swiggy handler — after:**

```ts
    // Normalize and save
    const normalizedData = normalizeSwiggyOrder(raw, merchantId);

    // B4: Validate phone and resolve a stable customer identity.
    const phone = toE164(normalizedData.customerPhone);
    if (!phone) {
      logger.warn('[SWIGGY WEBHOOK] Missing or malformed customer phone', {
        externalId,
        rawPhone: normalizedData.customerPhone,
      });
      return res.status(400).json({ error: 'Missing or malformed customer phone' });
    }
    const customerId = await resolveCustomerId(phone, 'swiggy');

    const order = await AggregatorOrder.create({
      ...normalizedData,
      customerPhone: phone, // persist the normalized E.164 form
      customerId,
    });
```

Apply the same diff to the Zomato handler at line 236–238, substituting `'zomato'` in the `resolveCustomerId` call and the log prefix.

### 3. `integrations.ts` batch-upload (line 418)

The CSV path has no phone today. Leave `customerId` unset (the `sparse: true` index tolerates this) and flag for Sprint 1 backfill. No code change this sprint — out of scope for B4 beyond the schema addition.

---

## Edge Cases

| Scenario | Current behavior | After patch | Status |
|----------|------------------|-------------|--------|
| Phone missing from payload (`customerPhone` undefined) | Order saved with `customerPhone: undefined`; no User linkage | `toE164()` returns `null` → **400 Missing or malformed customer phone** | Hard reject |
| Phone malformed (e.g., `"91xxxxxxxxxx"`, `"call me"`, `"+91 98 (x) 7-6"`) | Saved as-is to `customerPhone` | `toE164()` strips whitespace/dashes/parens; if result fails `^\+[1-9]\d{7,14}$` → **400** | Hard reject |
| Phone valid but has whitespace/dashes | Saved verbatim with inconsistent formatting | Normalized to `+<digits>` before upsert AND before save | Normalized |
| Two concurrent webhooks arrive for the same phone (same user, different orders) | Two independent rows, no user linkage | `findOneAndUpdate({phoneNumber}, …, {upsert:true})` is atomic against the unique index on `User.phoneNumber`; one upsert wins, the other reads the existing doc. Both orders attach the same `customerId` | Safe |
| Same phone appears on Swiggy AND Zomato (same human, two platforms) | Two orders, no cross-platform linkage | Both webhook handlers upsert the same `User._id`; both `AggregatorOrder` rows share `customerId`. `source` field records whichever platform created the User first. | Unified identity |
| Phone collides with an existing REZ app user's `phoneNumber` | No linkage (the field was just a string) | Upsert finds the existing REZ user and attaches the aggregator order to their real account — this is desired behavior (same human) | Desired merge |
| Phone passes regex but is a known fake/test number (e.g., `+10000000000`) | Saved | User created; flagged for Sprint 1 anti-abuse filter | Accepted (low risk) |

---

## Tests Required

1. **`toE164` unit test** — table-driven: valid E.164 passes through; `"+91 98765 43210"` normalizes to `"+919876543210"`; `"abc"`, `""`, `undefined`, `"12345"` all return `null`.
2. **Swiggy webhook — missing phone** — POST a valid-signed Swiggy payload with no `customer_phone` → expect 400, assert `AggregatorOrder.countDocuments()` is unchanged, no `User` created.
3. **Swiggy webhook — malformed phone** — POST with `customer_phone: "not-a-number"` → expect 400, no User, no order.
4. **Swiggy webhook — happy path, new user** — POST with valid new phone → expect 201, assert one `User` created with `source: 'aggregator-swiggy'`, one `AggregatorOrder` with `customerId` equal to that user's `_id`, and `customerPhone` stored in normalized form.
5. **Swiggy webhook — happy path, existing user** — Seed a User with phone `+919876543210`. POST a Swiggy order with same phone → expect 201, assert NO new User is created (`User.countDocuments` unchanged) and the order's `customerId` matches the seeded user.
6. **Concurrent upsert test** — Fire 10 parallel Swiggy webhooks with the same phone and 10 distinct `externalId`s → expect exactly 1 User in DB, 10 AggregatorOrders all pointing to that User's `_id`.
7. **Cross-platform identity test** — Fire a Swiggy webhook with phone P, then a Zomato webhook with the same phone P → expect 1 User total, 2 AggregatorOrders, both sharing `customerId`; User's `source` stays `aggregator-swiggy` (first-writer-wins via `$setOnInsert`).

---

## Deploy Notes

### Data migration for existing rows

Historical `AggregatorOrder` rows predate this patch and have no `customerId`. Two options:

- **Preferred: batched backfill job** — script at `scripts/migrations/sprint-0/b4-backfill-aggregator-customerId.ts`. Iterate existing rows in batches of 500 where `customerId` is null AND `customerPhone` is present; run `toE164` on the stored phone; if valid, upsert a User and set `customerId`. Log rows with unparseable phones for manual review. Runs idempotently.
- **Acceptable fallback** — leave historical nulls alone. The `sparse: true` index tolerates them and Sprint 1 loyalty/CRM logic must treat `customerId == null` as "unknown customer."

### Deploy order

1. **Schema first**: deploy the model change (add `customerId` field + sparse index). Safe — adds a nullable field, no existing writes break.
2. **Code second**: deploy the webhook changes (phone validation + upsert + attach `customerId`). From this point forward, every new aggregator order has a linked User.
3. **Enable backfill third** (optional): run the migration job off-hours to attach `customerId` to historical rows.
4. **Monitor fourth**: watch User-creation rate and 400-rate on `/api/webhook/swiggy` and `/api/webhook/zomato` for 48 hours.

### Monitoring

- **Dashboard panel:** `rate(user_created_total{source=~"aggregator-.*"}[5m])` — expect a small steady stream, not a spike. A spike likely indicates an aggregator rotating test phone numbers or a formatting change on their side.
- **Alert:** page if `rate(aggregator_webhook_400{reason="bad_phone"}[15m]) > 5/min` — probably a Swiggy/Zomato schema change on customer phone field.
- **Log:** every rejected webhook logs `rawPhone` (the original string) for debugging malformed-payload cases.
- **Capacity:** the unique-index upsert adds one additional round-trip to `User` per webhook. Swiggy/Zomato webhook volume is low (single-digit rps per merchant); no connection-pool concern.

---

## Out of Scope — Flagged for Sprint 1

- **Aggregator → merchant store resolution.** Swiggy and Zomato payloads carry merchant context (`merchant_id`, `restaurantId`) but no specific REZ `Store` when a merchant operates multiple outlets. Per the master plan's **"last-seen heuristic"**: `storeId` remains nullable in the aggregator event we emit; the first in-person POS visit for this `customerId` writes a `CustomerStorePreference` doc, and subsequent aggregator orders for the same customer are attributed to that store for reporting purposes. This requires the `CustomerStorePreference` model and the POS visit hook — tracked as Sprint 1 work item **B5**.
- **CSV batch-upload phone capture** (`integrations.ts:418`). Today the CSV importer discards phone; extending the CSV schema + re-running backfill is Sprint 1.
- **Hardening the User-model phone regex** from the permissive current form to strict E.164 at the model layer. For now we validate at the webhook boundary only, to avoid breaking signup/login flows that depend on the looser format.
- **Anti-abuse / test-phone filter** (e.g., reject `+10000000000` and other known-fake patterns). Deferred pending a fraud-rules service.
