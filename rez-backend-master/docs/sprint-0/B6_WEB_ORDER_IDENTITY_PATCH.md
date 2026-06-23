# B6: Web Orders Must Resolve to `customerId` (Never `customerPhone` Alone)

## Current Flow

1. **OTP Send** (line 687-770): Client POST `/otp/send` with `phone`. Redis/in-memory stores hashed OTP for 5 min.

2. **OTP Verify** (line 794-823): Client POST `/otp/verify` with `phone` + `otp`. `verifyOTP()` compares hashed OTP via bcrypt. On success:
   - Generates random `sessionToken` (32-byte hex)
   - Stores mapping in Redis: `sessionId → phoneNumber`
   - Returns `{ sessionToken }` to client

3. **Order Creation** (line 826-1138): Client POST `/razorpay/create-order` with `sessionToken` + items:
   - **Line 859**: `resolveCustomerPhone(req, sessionToken)` retrieves phone from JWT OR session token
   - **Line 1078-1079**: Looks up User by `phoneNumber` (may be null if no user exists)
   - **Line 1090-1115**: Creates WebOrder with `customerPhone`, `userId` (nullable), `channel: 'web_qr'`
   - **Line 1062**: Razorpay order notes include `customerPhone` but NOT `customerId`

4. **Order Retrieval** (line 1458-1510): `GET /orders/history` queries by `customerPhone`

5. **Payment Verification** (line 1144-1200): `POST /payment/verify` retrieves order by `customerPhone`, validates ownership by phone match alone

6. **Coin Credits & Refunds**: All operations (cancellation, refund, analytics) query WebOrder by `customerPhone`, never by `customerId`

## Gap

**B6 Risk**: A phone number is **not a stable identity**. If an attacker:
- Spams OTP requests across multiple accounts (DDoS)
- Reuses a deactivated phone number
- Compromises a session token

…they can query, modify, or claim orders tied to any historical `customerPhone` without proof of actual User ownership. **WebOrder.customerPhone alone is insufficient to prove identity.**

The code already maintains `userId` (line 1114) but it remains **optional** (`nullable`). If a User record doesn't exist, `userId` is `null` and the order floats with only a phone string as identity.

## Proposed Patch

### Step 1: Upsert User After OTP Verification Succeeds (BEFORE order creation)

**Location**: Line 1077 (right before User lookup, after Razorpay succeeds)

**Before:**
```typescript
// Only create the WebOrder after Razorpay has confirmed successfully
const User = require('../models/User').default || require('../models/User').User;
const linkedUser = await User.findOne({ phoneNumber: customerPhone }).select('_id').lean();
```

**After:**
```typescript
// Only create the WebOrder after Razorpay has confirmed successfully
const User = require('../models/User').default || require('../models/User').User;
// Ensure User record exists (upsert on phone); extract the _id for WebOrder.userId
const linkedUser = await User.findOneAndUpdate(
  { phoneNumber: customerPhone },
  { $setOnInsert: { phoneNumber: customerPhone, source: 'web-qr' } },
  { upsert: true, new: true }
).select('_id').lean();
// linkedUser._id is guaranteed non-null after upsert
const customerId = linkedUser._id;
```

### Step 2: Attach `customerId` to WebOrder.create() (REQUIRED, not nullable)

**Location**: Line 1090-1115 (WebOrder.create call)

**Before:**
```typescript
const webOrder = await WebOrder.create({
  orderNumber,
  // ...
  customerPhone,
  // ...
  userId: linkedUser?._id || null,  // OPTIONAL ← BUG: falls back to null
  // ...
});
```

**After:**
```typescript
const webOrder = await WebOrder.create({
  orderNumber,
  // ...
  customerPhone,
  // ...
  userId: customerId,  // NOW REQUIRED, guaranteed from upsert above
  customerId,  // NEW: explicit field (if schema adds it), or rely on userId
  // ...
});
```

## Edge Cases

### 1. **Missing `customerPhone` at Order Creation** (Bug Guard)
If `resolveCustomerPhone()` returns null despite passing the auth check, reject the request at line 860 with `401 PHONE_VERIFICATION_REQUIRED`. **Current code already does this.** No change needed.

### 2. **User Upsert Fails (E.g., DB Unavailable)**
If `findOneAndUpdate(...upsert)` throws an error, the entire request fails. This is **correct behavior**—orders must not be created orphaned. No fallback to `null userId`.

### 3. **Duplicate Upsert Requests (Race Condition)**
Two concurrent OTP-verify-then-order requests on the same phone:
- Both call `findOneAndUpdate({ phoneNumber }, { $setOnInsert })` atomically
- First wins, creates User; second retrieves the same User
- Both get the same `_id`
- Both orders link to the same `customerId`
- **Correct behavior**; no fix needed. MongoDB's upsert is atomic.

### 4. **Session Token Flow & Existing Sessions**
Current code: `resolveCustomerPhone()` extracts phone from **either** JWT (line 299-310) **or** session token (line 321-325). 

After patch:
- JWT path: extracts phone from JWT payload → upserts User → attaches `customerId`
- Session token path: same phone → same upsert → same `customerId`

**No breaking change** to session management.

### 5. **Rate Limiting on User Upsert (Attacker Spam)**
**Current risk**: Attacker spams OTP requests → each OTP verify generates session tokens → if each order creation also upserts a new User, attacker could spam-create fake User records.

**Current mitigation**: Line 827 applies `orderLimiter` (rate limit on POST /razorpay/create-order). This already prevents spam.

**Additional mitigation** (out of scope here): Add rate limit on POST /otp/verify per IP or phone.

## WebOrder Schema Changes (OPTIONAL, for explicit customerId field)

Current schema has `userId` (ObjectId, ref 'User') but no `customerId` alias. The patch can either:
1. **Reuse `userId`** (recommended, minimal diff): Ensure it is **NOT nullable** in WebOrder schema
2. **Add `customerId` field**: Duplicate of `userId` for explicit naming

**Recommendation**: Modify WebOrder schema to make `userId` **required, non-nullable**, and update all `.create()` calls to always provide it.

## Related Endpoints Requiring Same Treatment

All these endpoints query orders **by `customerPhone` alone** and should be updated to query **by `customerId` (userId)** for full security:

1. **GET /orders/history** (line 1458): Queries `{ customerPhone: phone }`
   - Should add: `{ userId: user._id, customerPhone: phone }` (belt-and-suspenders)

2. **POST /order/:orderNumber/rate** (line 1521): Queries `{ orderNumber, customerPhone: phone }`
   - Should query `{ orderNumber, userId: user._id }`

3. **POST /order/:orderNumber/cancel** (line 1553): Queries `{ orderNumber, customerPhone: phone }`
   - Should query `{ orderNumber, userId: user._id }`

4. **GET /order/:orderNumber/detail** (line 1591+): Likely queries by phone

5. **POST /payment/verify** (line 1144): Validates ownership by `callerPhone === order.customerPhone` (line 1169)
   - Should validate by `callerUserId === order.userId`

6. **All coin-credit / refund / loyalty endpoints**: Rewrite identity checks from phone to `customerId`

## Tests Required

- [ ] **OTP → Order Creation**: Verify User is upserted (check User.phoneNumber in DB)
- [ ] **Order Ownership**: Confirm WebOrder.userId is populated (never null)
- [ ] **Duplicate Phone Upsert**: Two concurrent orders on same phone → same User._id
- [ ] **Rate Limit**: Hammer POST /razorpay/create-order → 429 TooManyRequests
- [ ] **Order Retrieval**: GET /orders/history filters by userId, not just phone
- [ ] **Cross-Phone Attack**: Order created with phone A, then attempt retrieve with phone B (different session) → 401 Forbidden
- [ ] **DB Failure**: If User upsert fails, entire order creation fails (no orphaned orders)

**Word Count**: 479
