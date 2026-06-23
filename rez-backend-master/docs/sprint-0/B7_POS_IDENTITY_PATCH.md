# B7: POS Bills Must Resolve to `customerId` (Never `customerPhone` Alone)

**Status**: Spec — ready for implementation
**Owner**: POS vertical (backend + merchant app)
**Related**: B6 (Web Order identity patch)
**Fitness**: reinforces ADR-026 (CRM attribution), closes the POS half of the "phone-without-user" gap B6 closed on web.

---

## Current State

### Backend endpoint

- **Live endpoint**: `POST /api/store-payment/create-bill`
- **Mounted at**: `src/config/routes.ts:531` →
  `src/routes/storePaymentRoutes.ts:256` →
  `src/controllers/posBillingController.ts:107` (`createBill`)
- **Secondary (quick)**: `POST /api/store-payment/quick-bill` → `createQuickBill` (line 191).
- **NOT the live path**: `rez-merchant-service/src/routes/pos.ts` mounts under
  `/api/merchant/orders/pos/...` (see `rez-merchant-service/src/routers/orders.ts:15`) and is called
  only as a fire-and-forget supplementary ledger (`createMerchantOrder`,
  `getRecentMerchantOrders`). The product-POS bill lifecycle runs entirely
  through `rezbackend/posBillingController.ts`.

### Current validator shape (what `createBill` accepts today)

No Zod validator. Body fields are destructured ad-hoc from `req.body`
(posBillingController.ts:109-122):

| Field | Required? | Type | Notes |
|---|---|---|---|
| `storeId` | yes (manual check) | string (ObjectId) | 400 "storeId is required" if missing |
| `totalAmount` | yes (manual check) | number ≥ 0 | `min: 0` permits ₹0 bills |
| `items` | no (defaults `[]`) | array | cart shape |
| `lineItems` | no | array | GST shape — merged onto `items` by index |
| `subtotal` | no (defaults `totalAmount`) | number | |
| `taxAmount` | no (defaults `0`) | number | |
| `discountAmount` | no (defaults `0`) | number | |
| `customerName` | **no** | string | |
| `customerPhone` | **no** | string | loosely matched `+91` / spaces later |
| `notes` | no | string | |
| `splitCount` | no | number > 1 | |
| `tableNumber` | no | string | |

**There is no enforcement that either `customerId` or `customerPhone` is
present.** A bill with neither is accepted and persisted.

### PosBill model — customer fields today

From `src/models/PosBill.ts`:

```ts
customerName?:  string     // maxlength 100
customerPhone?: string     // maxlength 15
coinsCreditedUserId?: ObjectId ref:'User'   // set only AFTER mark-paid
```

- **There is no `customerId` field on PosBill.** The only link to a `User`
  document is `coinsCreditedUserId`, which is (a) set at `mark-paid` time,
  not at `create-bill` time, and (b) populated only when the phone happens
  to match an existing User via the tolerant regex in
  `creditCustomerCoinsForBill` (controller line ~611). If no User exists,
  the bill is permanently orphan.

### Frontend flow — "user taps Pay" to "POST /create-bill"

Call chain (all paths in `rez-app-marchant/`):

1. `app/pos/index.tsx:1273` — **Charge button** `onPress={handleCharge}`
2. `app/pos/index.tsx:791` — `handleCharge()` enforces the local "Customer required" gate at line 798 (`customerMode === 'none'` → alert), then calls `proceedToPayment()` at line 825.
3. `app/pos/index.tsx:643` — `proceedToPayment()`:
   - Validates `activeStore._id`, non-empty cart.
   - Builds `items` + `lineItems` arrays (line 662-675).
   - If `isOffline` → `posService.enqueueFullBill(...)` (SQLite queue) and returns.
   - Else allocates/reuses `idempotencyKeyRef.current` (crypto.randomUUID fallback uuidv4).
   - Calls `posService.createBill(items, customerPhoneArg, storeId, ..., idempotencyKey)` at line 729.
   - **Phone arg today** (line 731): `customerMode === 'walk-in' ? 'WALKIN' : customerPhone ?? undefined`.
     → The string `"WALKIN"` is sent as a literal phone when the cashier taps Walk-in. This is a sentinel the backend silently stores as a phone number. **No `customerId` is sent today, ever.**
   - On success → `router.push('/pos/payment', { billId, amount, coinDiscount })`.
4. `services/api/pos.ts:226` — `POSService.createBill(...)` re-computes money fields, builds `CreateBillRequest`, and POSTs to `store-payment/create-bill` with the `Idempotency-Key` header.
5. `services/api/pos.ts:59` — `CreateBillRequest` interface has **no** `customerId` field today.

### The identity toggle (already shipped)

`contexts/PreferencesContext.tsx:434-440` — `useIdentityCaptureMode()` hook
returns `{ mode, setMode }` where `mode: 'required' | 'optional'`. Default is
`'required'` (DEFAULT_PREFERENCES line 107-113). The POS index screen
**does not consume this hook yet** — it unconditionally enforces "select a
customer or Walk-in" (line 798). B7 wires the hook in so this gate becomes
a real feature flag.

### Anonymous bills today?

**Yes, fully persisted.** Because the backend has no validator and
PosBill.customerPhone is optional, a body like `{ storeId, totalAmount: 500 }`
creates a valid `pending` PosBill with `customerName`, `customerPhone`,
`coinsCreditedUserId` all undefined. The frontend's current local gate
masks this at one entry point, but:
- The `/quick-bill` endpoint has the same weakness.
- Any non-merchant-app client (admin tools, tests, cURL, future integrations) can still create anonymous bills.
- Offline-synced bills (`enqueueFullBill`) don't carry identity either.

**Conclusion**: server-side enforcement is required; the client check is an
ergonomic nicety, not a real guarantee.

---

## Backend Patch

### 1. Add `customerId` to PosBill schema

`src/models/PosBill.ts` — add next to `customerPhone`:

```ts
// IPosBill interface
customerId?: Types.ObjectId;

// Schema block
customerId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  index: true,
},
```

Also add the compound index for CRM lookups:

```ts
PosBillSchema.index({ merchantId: 1, customerId: 1, createdAt: -1 });
```

### 2. Add Zod validator on create-bill

New file `src/validators/posBill.validator.ts`:

```ts
import { z } from 'zod';
import { isFeatureEnabled } from '../services/featureFlagService';

const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;

export const createBillSchema = (merchantId: string) => {
  const identityRequired = isFeatureEnabled(
    'POS_REQUIRE_CUSTOMER_IDENTITY',
    { merchantId },
  );

  return z
    .object({
      storeId: z.string().min(1, 'storeId is required'),
      totalAmount: z.number().min(0, 'totalAmount must be ≥ 0'),
      items: z.array(z.any()).optional().default([]),
      lineItems: z.array(z.any()).optional(),
      subtotal: z.number().min(0).optional(),
      taxAmount: z.number().min(0).optional().default(0),
      discountAmount: z.number().min(0).optional().default(0),
      customerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
      customerPhone: z
        .string()
        .trim()
        .transform((s) => s.replace(/\s+/g, ''))
        .refine(
          (s) => s === '' || s === 'WALKIN' || phoneRegex.test(s),
          'customerPhone must be a valid Indian mobile number',
        )
        .optional(),
      customerName: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
      splitCount: z.number().int().min(1).optional(),
      tableNumber: z.string().max(20).optional(),
      walkIn: z.boolean().optional(), // explicit opt-out of identity capture
    })
    .refine(
      (d) => {
        if (!identityRequired) return true;
        // "Walk-in" is an explicit, audited anonymous bill.
        if (d.walkIn === true || d.customerPhone === 'WALKIN') return true;
        return Boolean(d.customerId || (d.customerPhone && d.customerPhone !== 'WALKIN'));
      },
      {
        message:
          'Customer identity required: provide customerId, customerPhone, or set walkIn=true.',
        path: ['customerId'],
      },
    );
};
```

### 3. Resolve phone → User via upsert, attach `customerId`

In `posBillingController.ts::createBill`, **after** `resolveStore` succeeds
and **before** `PosBill.create`:

```ts
// ── B7: Identity resolution ──────────────────────────────────────────────
const parsed = createBillSchema(merchantId).parse(req.body);

let resolvedCustomerId: mongoose.Types.ObjectId | undefined;
const walkInFlag = parsed.walkIn === true || parsed.customerPhone === 'WALKIN';

if (parsed.customerId) {
  // Trust the FE-supplied id when a known customer is selected. Still
  // verify the User exists to avoid dangling refs.
  const user = await User.findById(parsed.customerId).select('_id').lean();
  if (user) resolvedCustomerId = user._id;
}

if (!resolvedCustomerId && parsed.customerPhone && !walkInFlag) {
  const phone = parsed.customerPhone.replace(/\s+/g, '');
  const normalized = phone.startsWith('+91')
    ? phone
    : phone.startsWith('91') && phone.length === 12
    ? `+${phone}`
    : `+91${phone.replace(/^(\+?91)?/, '')}`;

  // Upsert: match by any of the phone shapes we've historically stored.
  const user = await User.findOneAndUpdate(
    { phoneNumber: { $in: [phone, normalized, phone.replace(/^\+91/, '')] } },
    {
      $setOnInsert: {
        phoneNumber: normalized,
        source: 'pos_bill_identity',
        createdVia: 'merchant_pos',
        isProfileComplete: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .select('_id')
    .lean();

  resolvedCustomerId = user?._id;
}
// ─────────────────────────────────────────────────────────────────────────
```

Then in the `PosBill.create({...})` call (line 161), add:

```ts
customerId: resolvedCustomerId,
customerPhone: walkInFlag ? undefined : parsed.customerPhone,
walkIn: walkInFlag,
```

Replace the manual `storeId` / `totalAmount` guards (lines 124-132) with a
single `try/catch (ZodError)` wrapper that returns a 400 with
`error.issues`.

### 4. Before / after diff (condensed)

**Before** (posBillingController.ts:107-178):

```ts
export const createBill = asyncHandler(async (req, res) => {
  const merchantId = req.merchantId!;
  const { storeId, items = [], lineItems, ..., customerPhone, ... } = req.body;

  if (!storeId) return res.status(400)...;
  if (totalAmount == null || ...) return res.status(400)...;

  const store = await resolveStore(storeId, merchantId);
  if (!store) return res.status(404)...;

  const bill = await PosBill.create({
    storeId, merchantId, billNumber: generateBillNumber(storeId),
    items: mergedItems, subtotal, taxAmount, discountAmount, totalAmount,
    customerName, customerPhone, notes, tableNumber,
    isQuickBill: false, status: 'pending',
    splitCount, splitAmount,
  });

  return res.status(201).json({ success: true, data: toPosBillDTO(bill) });
});
```

**After**:

```ts
export const createBill = asyncHandler(async (req, res) => {
  const merchantId = req.merchantId!;

  // B7: strict validation + identity gate (feature-flagged)
  const parsed = createBillSchema(merchantId).parse(req.body);

  const store = await resolveStore(parsed.storeId, merchantId);
  if (!store) return res.status(404)...;

  const { customerId: resolvedCustomerId, walkIn } =
    await resolveCustomerIdentity(parsed);   // the upsert helper above

  const bill = await PosBill.create({
    storeId: parsed.storeId,
    merchantId,
    billNumber: generateBillNumber(parsed.storeId),
    items: mergedItems,
    subtotal: parsed.subtotal ?? parsed.totalAmount,
    taxAmount: parsed.taxAmount,
    discountAmount: parsed.discountAmount,
    totalAmount: parsed.totalAmount,
    customerId: resolvedCustomerId,
    customerName: parsed.customerName,
    customerPhone: walkIn ? undefined : parsed.customerPhone,
    walkIn,
    notes: parsed.notes,
    tableNumber: parsed.tableNumber,
    isQuickBill: false,
    status: 'pending',
    splitCount: parsed.splitCount,
    splitAmount: parsed.splitCount > 1
      ? Math.round((parsed.totalAmount / parsed.splitCount) * 100) / 100
      : undefined,
  });

  return res.status(201).json({ success: true, data: toPosBillDTO(bill) });
});
```

Apply the same pattern to `createQuickBill` (posBillingController.ts:191).

### 5. Refactor `creditCustomerCoinsForBill`

Now that `bill.customerId` is authoritative at creation, the mark-paid coin
credit path (line 602) should prefer `bill.customerId` and fall back to
phone only for legacy bills written before B7 ships:

```ts
const user = bill.customerId
  ? await User.findById(bill.customerId).select('_id').lean()
  : await resolveUserByPhone(bill.customerPhone);
```

---

## Frontend Patch

### 1. Read the identity-capture mode

`app/pos/index.tsx` (top of `POSIndexScreen`):

```ts
import { useIdentityCaptureMode } from '@/contexts/PreferencesContext';
// ...
const { mode: identityCaptureMode } = useIdentityCaptureMode();
```

### 2. Gate the Pay button

**Before** (app/pos/index.tsx:1273-1290):

```tsx
<TouchableOpacity
  style={[styles.chargeButton, charging && styles.chargeButtonDisabled]}
  onPress={handleCharge}
  disabled={charging}
  ...
>
```

**After**:

```tsx
const payDisabled =
  charging ||
  (identityCaptureMode === 'required' && customerMode === 'none');

<TouchableOpacity
  style={[styles.chargeButton, payDisabled && styles.chargeButtonDisabled]}
  onPress={handleCharge}
  disabled={payDisabled}
  ...
>
```

And in `handleCharge` (line 791), replace the unconditional gate:

**Before** (line 798):

```ts
if (customerMode === 'none') {
  platformAlertSimple('Customer required', '...');
  return;
}
```

**After**:

```ts
if (identityCaptureMode === 'required' && customerMode === 'none') {
  platformAlertSimple(
    'Customer required',
    'Please select a customer or tap "Walk-in" before charging.',
  );
  return;
}
// When mode === 'optional', 'none' flows through as anonymous (walkIn: true).
```

### 3. Walk-in button — already present, keep as-is

`app/pos/index.tsx:1211-1232` already renders a dedicated Walk-in
`TouchableOpacity` next to "Select Customer". No UI change needed here;
only semantics: Walk-in now sets an explicit `walkIn: true` flag on the
payload instead of sending the literal string `"WALKIN"` as a phone.

### 4. Pass `customerId` (not just phone) to `posService.createBill`

Add a new positional arg (or better — refactor to an options object).
Minimal-diff approach: append `customerId?: string` at the end of the
signature.

`services/api/pos.ts:226` — **After** (signature + payload):

```ts
async createBill(
  items: POSBillItem[],
  customerPhone?: string,
  storeId?: string,
  discount?: number,
  discountPercent?: number,
  splitCount?: number,
  tableNumber?: string,
  lineItems?: CreateBillLineItem[],
  coinRedemption?: CoinRedemption,
  clientTxnId?: string,
  // B7 additions:
  customerId?: string,
  walkIn?: boolean,
): Promise<POSBill> {
  // ...
  const payload: CreateBillRequest = {
    items, customerPhone, customerId, walkIn,   // ← new
    storeId, discount, discountPercent, splitCount, tableNumber, lineItems,
    coinRedemption, subtotal: ..., taxAmount: ..., discountAmount: ..., totalAmount,
  };
  // ...
}
```

### 5. Update `CreateBillRequest` interface

`services/api/pos.ts:59` — **After**:

```ts
export interface CreateBillRequest {
  items: POSBillItem[];
  customerId?: string;          // NEW: Mongo ObjectId string of the User
  customerPhone?: string;       // kept for legacy / unknown-customer flows
  walkIn?: boolean;             // NEW: explicit anonymous opt-in
  description?: string;
  storeId?: string;
  discount?: number;
  discountPercent?: number;
  splitCount?: number;
  tableNumber?: string;
  lineItems?: CreateBillLineItem[];
  coinRedemption?: CoinRedemption;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
}
```

### 6. Fix `proceedToPayment` call-site

`app/pos/index.tsx:729-742` — **Before**:

```ts
const bill = await posService.createBill(
  items,
  customerMode === 'walk-in' ? 'WALKIN' : customerPhone ?? undefined,
  activeStore?._id,
  undefined, undefined,
  confirmedSplitCount > 1 ? confirmedSplitCount : undefined,
  tableNumber || undefined,
  lineItems,
  coinDiscountApplied > 0 ? { amount: ..., discountApplied: ... } : undefined,
  idempotencyKeyRef.current,
);
```

**After**:

```ts
const bill = await posService.createBill(
  items,
  customerMode === 'selected' ? customerPhone ?? undefined : undefined,
  activeStore?._id,
  undefined, undefined,
  confirmedSplitCount > 1 ? confirmedSplitCount : undefined,
  tableNumber || undefined,
  lineItems,
  coinDiscountApplied > 0 ? { amount: ..., discountApplied: ... } : undefined,
  idempotencyKeyRef.current,
  customerMode === 'selected' ? customerId ?? undefined : undefined,
  customerMode === 'walk-in',
);
```

Also wire up the real customer-search API to populate `customerId` at
line 1244 (currently hardcoded `'placeholder'`). That is a follow-up PR,
not part of B7 core, but must land before flipping the global default.

---

## Backward Compat Strategy

### Flag layers (most specific wins)

1. **Global env flag** — `POS_REQUIRE_CUSTOMER_IDENTITY` in `.env`.
   - **Default: `false`** on ship day. Validator still runs but the
     `.refine` check is skipped; violations are logged (structured) for
     dashboards.
2. **Per-merchant override** — new field:
   ```ts
   // src/models/Merchant.ts
   posSettings: {
     requireCustomerIdentity?: boolean;
   }
   ```
   Admin UI (`rez-admin` → Merchant Detail → POS tab) exposes a toggle.
   When set, this supersedes the global env flag for that merchant.
3. **Grandfathering rule** —
   - Merchants created **before** the B7 release date: default to
     `requireCustomerIdentity: false` ("optional"). They keep the current
     behaviour until they opt in.
   - Merchants created **on or after** the B7 release date: default to
     `requireCustomerIdentity: true`. Fresh onboarding = CRM-first.
   - Implemented via migration that sets explicit
     `posSettings.requireCustomerIdentity = false` on every existing
     Merchant doc; the schema default stays `true` so new inserts inherit
     the strict behaviour automatically.

### Feature-flag service contract

`src/services/featureFlagService.ts::isFeatureEnabled(key, context)`
resolution order:
1. If `context.merchantId` is set and
   `Merchant.posSettings.requireCustomerIdentity` is a boolean, return it.
2. Else fall back to `process.env[key] === 'true'`.

### Mid-shift safety

**Document** (do NOT enforce in code for v1): flag flips should happen at
start-of-day (before first bill). Mid-shift flips are legal but may cause
cashier confusion if they were in the middle of an anonymous bill.
Operational guidance goes in `docs/ops/POS_IDENTITY_ROLLOUT.md` (separate
doc). We deliberately avoid a "flag-is-effective-at" timestamp now — it
doubles the flag surface area for a marginal benefit.

### Client compatibility

- Old merchant-app clients (pre-B7) keep sending `customerPhone: 'WALKIN'`
  as a literal. The validator accepts `'WALKIN'` as a sentinel and treats
  it identically to `walkIn: true`. No forced upgrade.
- New clients send `walkIn: true` directly. Both shapes resolve to the
  same backend state.

---

## Migration / Rollout Plan

### Phase 0 — Week 1: Ship code, flag OFF, observation mode

- Deploy backend with schema change (`customerId` field, index) and
  validator wired in.
- `POS_REQUIRE_CUSTOMER_IDENTITY=false` globally.
- Validator runs; when it would have failed (identity missing & flag
  logically-on), emit a structured log:
  ```json
  { "event": "pos.bill.identity_missing", "merchantId": "...", "storeId": "...", "wouldReject": true }
  ```
- Ship frontend changes too; `useIdentityCaptureMode()` default is
  `'required'` so **new app installs** enforce locally. Existing installs
  inherit whatever was persisted in AsyncStorage (likely the default on
  first run anyway, since the hook just shipped).
- **Exit criterion**: log volume stable, no crashes, telemetry shows
  what % of bills would be blocked per merchant.

### Phase 1 — Week 2-3: Pilot 5% merchants (allowlist)

- Hand-pick 5% of merchants with the cleanest telemetry (low anonymous
  bill rate) into an allowlist.
- Set `Merchant.posSettings.requireCustomerIdentity = true` for them via
  admin UI.
- Monitor: bill-creation 400 rate, support tickets, cashier complaints.
- Success criteria: <1% 400-rate after day 3, no P1 support tickets.

### Phase 2 — Week 4: 50% opt-in via merchant dashboard

- Expose the toggle in the **merchant-facing** dashboard (not just
  rez-admin): "Require customer capture at checkout" under Store
  Settings → POS.
- Email all grandfathered merchants with a one-paragraph pitch and a
  link to toggle.
- Target 50% opt-in by end of week. Admins may also batch-enable for
  any segment that hit the Phase 1 success criteria.

### Phase 3 — Month 2: Flip global default to required

- **One-week notice** email to every merchant still on "optional",
  listing the exact date + link to opt out per-merchant if they really
  need to stay anonymous.
- Flip `POS_REQUIRE_CUSTOMER_IDENTITY=true` globally.
- Per-merchant override remains — merchants with a business reason (e.g.
  anonymous bulk counter sales) can still set `false`.
- Burn-down dashboard tracks opt-out count week-over-week; anything still
  on "optional" after 4 more weeks gets a human follow-up.

---

## Tests Required

All in `tests/integration/posBillingController.test.ts` unless noted.

1. **Validator — happy path with customerId**
   POST `/create-bill` with `{ storeId, totalAmount, customerId: <validObjectId> }` → 201, bill doc has `customerId` set, `customerPhone` undefined.

2. **Validator — happy path with phone, upsert creates User**
   POST with `{ ..., customerPhone: '9876543210' }`, no existing User → 201. Assert a User was created with `phoneNumber: '+919876543210'` and `bill.customerId === user._id`.

3. **Validator — happy path with phone, upsert finds existing User**
   Pre-seed a User with `phoneNumber: '+919876543210'`. POST with `{ ..., customerPhone: '9876543210' }` → 201. Assert `bill.customerId === existingUser._id` AND `User.countDocuments()` unchanged.

4. **Validator — flag ON, no identity, no walkIn → 400**
   With `POS_REQUIRE_CUSTOMER_IDENTITY=true`, POST `{ storeId, totalAmount }` → 400 with message matching `/customer identity required/i`. Assert zero PosBills written.

5. **Validator — flag ON, explicit walk-in → 201 anonymous**
   POST `{ storeId, totalAmount, walkIn: true }` → 201. Assert `bill.customerId` undefined, `bill.walkIn === true`, `bill.customerPhone` undefined.

6. **Validator — flag OFF, no identity → 201 (legacy behaviour)**
   With flag `false`, POST `{ storeId, totalAmount }` → 201. Assert structured log was emitted with `event: 'pos.bill.identity_missing'`.

7. **Per-merchant override supersedes env**
   Env `POS_REQUIRE_CUSTOMER_IDENTITY=false`, Merchant.posSettings.requireCustomerIdentity=true → POST with no identity → 400.

8. **Phone normalization — all variants resolve to one User**
   Seed User with `'+919876543210'`. POST three bills with `'9876543210'`, `'+919876543210'`, `'91 98765 43210'` → all three bills have `customerId === user._id`. No duplicate users created.

9. **Concurrent upsert does not create duplicate Users**
   Fire 10 parallel POSTs with the same `customerPhone` (unknown number). After settle, exactly one User exists for that phone, all 10 bills share the same `customerId`. (Relies on `findOneAndUpdate({...}, {$setOnInsert}, {upsert:true})` + unique index on `User.phoneNumber` — add the index in the same PR if missing.)

10. **Legacy `"WALKIN"` sentinel still accepted**
    POST `{ storeId, totalAmount, customerPhone: 'WALKIN' }` (old-client shape) with flag ON → 201, bill has `walkIn === true`, `customerPhone` undefined, `customerId` undefined. No User created. Ensures rolling client upgrade doesn't break cashiers on old app builds.

### Frontend tests (app/pos/__tests__/posScreen.test.tsx)

- `identityCaptureMode === 'required'` + `customerMode === 'none'` → Pay
  button is disabled AND `handleCharge()` no-ops with alert.
- `identityCaptureMode === 'optional'` + `customerMode === 'none'` →
  Pay button enabled, `posService.createBill` called with
  `customerId: undefined, walkIn: undefined, customerPhone: undefined`.
- Tap "Walk-in" → `customerMode === 'walk-in'`, Pay enabled,
  `posService.createBill` called with `walkIn: true`.

### Schema migration test (scripts/migrations/2026-04-b7-posbill-customerid.test.ts)

- Seed 100 PosBills without `customerId`. Run migration. Assert no
  documents modified (migration is additive only; backfill is handled by
  mark-paid's coin-credit resolver). Assert new index `{ merchantId: 1,
  customerId: 1, createdAt: -1 }` exists.
