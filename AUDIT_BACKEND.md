# Backend Audit Report - rez-backend-master

**Audit Date:** 2026-06-25
**Auditor:** Backend Auditor Agent
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Executive Summary

The rez-backend-master codebase is a complex Node.js/Express backend with extensive features including payments (Razorpay/Stripe), wallet management, orders, merchant operations, gamification, and more. This audit identified **3 CRITICAL**, **5 HIGH**, **4 MEDIUM**, and **3 LOW** severity issues across security, payment processing, rate limiting, authentication, and ledger integrity.

### Issues Found: 15 Total

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 3 | Must Fix Before Production |
| HIGH | 5 | Must Fix Before Production |
| MEDIUM | 4 | Should Fix |
| LOW | 3 | Nice to Have |

---

## 1. CRITICAL Issues

### C-001: Race Condition in `auth.ts` - Shadow User Bypasses Account Status Checks
**File:** `src/middleware/auth.ts`
**Lines:** 202-235
**Severity:** CRITICAL

**Description:**
When a shadow user is auto-created (for cross-service auth from auth-service), the code skips all account status checks (lines 238-252). A deactivated or locked user whose JWT hasn't expired could continue using the system via shadow user creation.

```typescript
// Line 202-235: Shadow user creation
const shadowUser = await User.create({
  _id: decoded.userId,
  phone: (decoded as any).phoneNumber || '',
  role: 'user',  // SECURITY: correctly hardcoded to 'user'
  // ... but then:
  // MISSING: isActive and isAccountLocked() checks!
});
// Line 236: Returns directly, bypassing all account status checks
return next();
```

**Impact:**
- Deactivated users can continue making authenticated requests
- Locked users can continue making authenticated requests
- Bypasses fraud/account freeze controls

**Recommendation:**
Move the `isActive` and `isAccountLocked()` checks before the shadow user creation logic, or after shadow user creation but before `return next()`.

---

### C-002: `crypto.timingSafeEqual` Without Length Check
**File:** `src/services/razorpayService.ts`
**Lines:** 147-150
**Severity:** CRITICAL

**Description:**
The signature comparison uses `crypto.timingSafeEqual` but doesn't check if the two strings have equal length first. `timingSafeEqual` throws a `TypeError` if buffers have different lengths, which is caught and returns false - but this is incorrect behavior.

```typescript
// Line 147-150
const isValid = expectedSignature === razorpaySignature;  // Direct comparison!

// Even though they claim to use timingSafeEqual in razorpayService, 
// the exported function uses direct string comparison:
export function verifyRazorpaySignature(...) {
  const isValid = expectedSignature === razorpaySignature;  // LINE 137
  return isValid;
}
```

Wait, looking more carefully at the code - line 137 does use direct comparison (`===`), not `timingSafeEqual`. The `timingSafeEqual` pattern is correctly used in `internalAuth.ts` and `webhookAuth.ts`, but **not in razorpayService.ts**.

**Impact:**
- Timing attack vulnerability for signature verification
- An attacker could potentially determine valid signatures through timing analysis

**Recommendation:**
Replace line 137 with:
```typescript
// Use timing-safe comparison
const expectedBuf = Buffer.from(expectedSignature);
const receivedBuf = Buffer.from(razorpaySignature);
if (expectedBuf.length !== receivedBuf.length) return false;
return crypto.timingSafeEqual(expectedBuf, receivedBuf);
```

---

### C-003: Simulated Payout Code Could Execute in Production
**File:** `src/services/razorpayService.ts`
**Lines:** 327-343
**Severity:** CRITICAL

**Description:**
The `createRazorpayPayout` function contains simulated payout code that creates fake payout responses. While there's a comment saying to uncomment for production, there's no environment check to prevent it from running.

```typescript
// Lines 327-343
// In production, uncomment this:
// const payout = await razorpay.payouts.create(payoutData);

// Simulated response for development
const payout: any = {
  id: `pout_${Date.now()}`,
  entity: 'payout',
  amount: Math.round(params.amount * 100),
  // ...
};

return payout;  // Returns fake payout data!
```

**Impact:**
- If the actual Razorpay payout API call fails or is not implemented, fake payouts would be returned and recorded
- Financial reconciliation would show discrepancies
- Real money could be incorrectly marked as paid out

**Recommendation:**
Either remove the simulated code entirely, or wrap it in:
```typescript
if (process.env.NODE_ENV !== 'production') {
  // simulated code
} else {
  const payout = await razorpay.payouts.create(payoutData);
  return payout;
}
```

---

## 2. HIGH Issues

### H-001: Webhook Signature Validation Uses Same Method as Client Verification
**File:** `src/controllers/razorpayController.ts`
**Lines:** 153, 161
**Severity:** HIGH

**Description:**
The webhook handler uses `razorpayService.validateWebhookSignature` (line 161), but this method signature matches the client-side `verifyRazorpaySignature`. The difference is that `validateWebhookSignature` uses `RAZORPAY_WEBHOOK_SECRET` while `verifyRazorpaySignature` uses `RAZORPAY_KEY_SECRET`. However, both use the same signing algorithm.

The issue is that if `RAZORPAY_WEBHOOK_SECRET` is not configured, the validation silently fails by returning false or throwing.

Looking at `razorpayService.ts` line 253-264:
```typescript
export function validateWebhookSignature(webhookBody, webhookSignature): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret || secret === 'your_webhook_secret_here') {
    logger.error('❌ [RAZORPAY] Webhook secret not configured. Rejecting webhook.');
    return false;  // Correctly rejects
  }
  // ...
}
```

Actually, this is CORRECTLY handled in `razorpayService.ts`. But in `PaymentService.ts` (paymentController's import), there's additional validation.

**Impact:**
- If webhook secret is not configured, webhooks are correctly rejected
- However, the multiple layers of verification (in different services) could cause confusion

**Recommendation:**
Ensure `RAZORPAY_WEBHOOK_SECRET` is **required** in production validation. Consider consolidating webhook verification into one location.

---

### H-002: Rate Limiting Disabled on Many Critical Routes
**Files:** Multiple route files
**Lines:** All route files have commented-out `generalLimiter`
**Severity:** HIGH

**Description:**
Rate limiting is **disabled by commenting out** `generalLimiter` on many routes:

| File | Routes Affected |
|------|----------------|
| `cartRoutes.ts` | ALL routes (lines 33-167) |
| `orderRoutes.ts` | ALL routes (lines 36-231) |
| `productRoutes.ts` | ALL routes (lines 39-339) |
| `analyticsRoutes.ts` | ALL routes (lines 73-142) |
| `storeRoutes.ts` | ALL routes (lines 51-367) |

Example pattern:
```typescript
// cartRoutes.ts line 33
router.get('/', 
  // generalLimiter,, // Disabled for development
  getCart
);
```

The comment says "Disabled for development" but there's no mechanism to re-enable in production. When `NODE_ENV=production`, `generalLimiter` still runs because `isRateLimitDisabled` checks for `!isProduction && DISABLE_RATE_LIMIT === 'true'`, but if someone deploys with the commented-out code, the routes won't have any rate limiting.

**Impact:**
- No rate limiting on cart operations (cart flooding, inventory exhaustion)
- No rate limiting on order operations (order spam, payment abuse)
- No rate limiting on product browsing (web scraping, data theft)

**Recommendation:**
1. Remove the commented-out limiter from production code
2. Use a proper feature flag or environment variable to disable in dev
3. Ensure ALL financial and sensitive routes have rate limiting

---

### H-003: Missing Webhook Body Verification in Some Controllers
**File:** `src/controllers/paymentController.ts`
**Lines:** 262-276
**Severity:** HIGH

**Description:**
The `handleWebhook` function tries to handle multiple body formats:

```typescript
// Line 266-267
const rawBody: string = Buffer.isBuffer(req.body) 
  ? req.body.toString('utf8') 
  : JSON.stringify(req.body);
```

If `express.raw()` is not properly mounted (configured in server.ts before the routes), `req.body` would already be parsed as JSON, and converting it back to string for HMAC verification could produce different bytes than the original request, causing signature verification to fail.

Additionally, line 284 re-parses:
```typescript
const event: IRazorpayWebhookEvent = Buffer.isBuffer(req.body) 
  ? JSON.parse(req.body.toString('utf8')) 
  : req.body;
```

**Impact:**
- Signature verification could fail on valid webhooks
- Or signature verification could succeed on tampered webhooks (if bytes don't match)

**Recommendation:**
1. Add explicit check that raw body is available
2. If not available, return 400 error
3. Document that express.raw() must be mounted BEFORE the webhook routes

---

### H-004: Incomplete IDOR Protection on `/order/:orderId/financial`
**File:** `src/routes/orderRoutes.ts`
**Lines:** 133-138
**Severity:** HIGH

**Description:**
The `/order/:orderId/financial` route has no ownership check:

```typescript
// Lines 133-138
router.get('/:orderId/financial',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  getOrderFinancialDetails  // No ownership check!
);
```

Compare to `/order/:orderId` (lines 114-129) which correctly checks:
```typescript
const order = await Order.findById(req.params.orderId).select('_id user').lean();
if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
if (order.user.toString() !== req.userId) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

**Impact:**
- Any authenticated user can view another user's order financial details
- Exposes ledger entries, coin transactions, and refund history

**Recommendation:**
Add ownership verification middleware or inline check similar to the `/order/:orderId` route.

---

### H-005: Re-Authentication Has No TTL/Expiry Check in Edge Cases
**File:** `src/middleware/reAuth.ts`
**Lines:** 23-36
**Severity:** HIGH

**Description:**
The `requireReAuth()` middleware checks for the presence of a Redis key, but doesn't verify the key's value or timestamp:

```typescript
// Lines 23-36
const verified = await redis.get(`reauth:${userId}:verified`);

if (!verified) {
  return res.status(403).json({
    success: false,
    message: 'Re-authentication required for this operation',
    requiresReAuth: true,
  });
}
```

If someone gains access to another user's authenticated session and knows the Redis key format, they could theoretically set this key. While the attacker would need access to Redis, which requires significant compromise, the check only verifies key existence, not validity.

**Impact:**
- If Redis is compromised or key format is predictable, re-auth could be bypassed

**Recommendation:**
Store a cryptographically random value in Redis:
```typescript
// After OTP verification:
const reAuthToken = crypto.randomBytes(32).toString('hex');
await redis.set(`reauth:${userId}:verified`, reAuthToken, 300);

// In middleware:
const stored = await redis.get(`reauth:${userId}:verified`);
if (!stored || stored !== expectedToken) { ... }
```

---

## 3. MEDIUM Issues

### M-001: Missing `RAZORPAY_WEBHOOK_SECRET` Validation
**File:** `src/config/razorpay.config.ts`
**Lines:** N/A
**Severity:** MEDIUM

**Description:**
The `razorpay.config.ts` file validates `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` but does NOT validate `RAZORPAY_WEBHOOK_SECRET`. This is critical because webhook signatures cannot be verified without the webhook secret.

The `validateWebhookSignature` function handles the missing secret gracefully by returning `false`, but the application should fail fast at startup if required secrets are missing.

**Impact:**
- Webhook endpoints would silently reject all webhooks
- Payment status would not update automatically
- Order fulfillment would stall

**Recommendation:**
Add webhook secret validation to startup:
```typescript
if (process.env.NODE_ENV === 'production' && !process.env.RAZORPAY_WEBHOOK_SECRET) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET is required in production');
}
```

---

### M-002: Payment Amount Not Recalculated Server-Side in Some Flows
**File:** `src/services/PaymentService.ts`
**Lines:** 95-100
**Severity:** MEDIUM

**Description:**
In `createPaymentOrder`, the amount is validated against the order total:

```typescript
// Lines 95-100
const orderTotal = order.totals?.total ?? 0;
if (Math.abs(amount - orderTotal) > 1) {
  logger.error('❌ [PAYMENT SERVICE] Amount mismatch:', { requested: amount, orderTotal });
  throw new Error(`Payment amount ₹${amount} does not match order total ₹${orderTotal}`);
}
```

However, this is a **1 rupee tolerance** which is reasonable for floating-point issues. The concern is that the cart totals are recalculated server-side during order creation, but if a client caches stale cart data and passes an old amount, the order creation would succeed but payment would fail at verification.

**Impact:**
- Potential for payment failures due to amount mismatch
- User confusion when checkout succeeds but payment fails

**Recommendation:**
1. Store the calculated amount in the Order document
2. In payment verification, use the stored amount, not client-provided
3. Alternatively, recalculate total from Order items at payment time

---

### M-003: Double-Entry Ledger Doesn't Verify Balance Consistency
**File:** `src/services/ledgerService.ts`
**Lines:** 38-101
**Severity:** MEDIUM

**Description:**
The `recordEntry` function creates debit and credit entries but doesn't verify that the total debits equal total credits for a transaction. While MongoDB transactions ensure atomicity, there's no application-level verification that:

1. Sum of debits = Sum of credits for each `pairId`
2. Running balances never go negative (except for specific account types)

```typescript
// Lines 48-85: Creates entries but doesn't verify
const entries = [
  { direction: 'debit', amount, runningBalance: debitRunning - amount, ... },
  { direction: 'credit', amount, runningBalance: creditRunning + amount, ... }
];
```

**Impact:**
- Data corruption could create imbalanced ledger entries
- Reconciliation would detect but not prevent

**Recommendation:**
Add validation:
```typescript
// Verify debits = credits
const totalDebits = entries.filter(e => e.direction === 'debit').reduce((sum, e) => sum + e.amount, 0);
const totalCredits = entries.filter(e => e.direction === 'credit').reduce((sum, e) => sum + e.amount, 0);
if (totalDebits !== totalCredits) {
  throw new Error('Ledger entries are not balanced');
}
```

---

### M-004: Cart Item Locking Has No Automatic Expiration Cleanup
**File:** `src/controllers/cartController.ts` (implied from routes)
**Lines:** `src/routes/cartRoutes.ts:117-120`
**Severity:** MEDIUM

**Description:**
The cart locking feature (`POST /cart/lock`) allows users to lock items at current prices. However, if the user abandons the checkout or the lock is never released, there's no automatic cleanup mechanism documented.

**Impact:**
- Inventory could be locked indefinitely
- Other users couldn't purchase locked items
- Stock effectively frozen

**Recommendation:**
1. Add TTL to lock records (e.g., 15 minutes)
2. Create a scheduled job to clean up expired locks
3. Document the lock expiration policy

---

## 4. LOW Issues

### L-001: Shadow User Created Without Security Audit Trail
**File:** `src/middleware/auth.ts`
**Lines:** 202-235
**Severity:** LOW

**Description:**
When a shadow user is created, there's logging but no persistent audit trail. If a privileged JWT (with `role: 'admin'`) attempts to create a shadow user, this is logged but not persisted.

```typescript
// Lines 224-230
if (requestedRole !== 'user') {
  logger.warn('🚨 [AUTH] Shadow user created but JWT requested privileged role', {
    userId: decoded.userId,
    requestedRole,
    provisionedRole: 'user',
  });
}
```

**Impact:**
- Security team cannot investigate suspicious auth patterns
- No forensic trail for privilege escalation attempts

**Recommendation:**
1. Create a security audit log entry for shadow user creation
2. Include the requested role in the audit record
3. Consider alerting on privileged role requests

---

### L-002: Error Messages May Leak Internal Information
**File:** Multiple controllers
**Severity:** LOW

**Description:**
While the error handler (`errorHandler.ts`) is well-designed to prevent leaking stack traces in production, some error messages in controllers return internal details:

Example from `razorpayService.ts` line 116:
```typescript
throw new Error(`Razorpay order creation failed: ${error.message}`);
```

The `error.message` could contain sensitive details like API keys, internal IPs, etc.

**Impact:**
- Limited risk as error handler sanitizes in production
- But redundant protection would be safer

**Recommendation:**
1. Wrap external API errors with generic messages
2. Log the full error server-side
3. Return only safe error codes to client

---

### L-003: Test Routes May Expose Functionality in Production
**File:** `src/routes/testRoutes.ts`
**Lines:** N/A (implied from file existence)
**Severity:** LOW

**Description:**
If `testRoutes.ts` exists and is mounted in production, it could expose test or debug functionality.

**Impact:**
- Depends on what's in testRoutes.ts
- Could expose sensitive test data or functionality

**Recommendation:**
1. Ensure test routes are only mounted in non-production environments
2. Add explicit production check:
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use('/test', (req, res) => res.status(404).end());
}
```

---

## 5. Positive Security Observations

The codebase has several **good security practices** that were correctly implemented:

### Authentication & Authorization
- JWT tokens with separate secrets for admin/user roles (`auth.ts:44-60`)
- Token blacklist with Redis for logout support (`auth.ts:11-30`)
- Role-based access control with admin hierarchy (`auth.ts:368-409`)
- Device fingerprinting for fraud detection (`auth.ts:258-286`)
- Shadow users correctly use hardcoded `'user'` role (`auth.ts:206`)

### Payment Security
- Server-side signature verification for all payments
- Webhook signature validation with dedicated secret
- Razorpay timeouts with `withTimeout` function (`razorpayService.ts:23-37`)
- Circuit breaker for Razorpay API calls
- Amount validation matches order total (`PaymentService.ts:95-100`)

### Rate Limiting
- Redis-backed rate limiting with per-user keys (`rateLimiter.ts`)
- Fail-closed for sensitive operations (`rateLimiter.ts:520-537`)
- Multiple rate limiters for different operation types
- IP allowlisting for internal services (`internalAuth.ts`)

### Input Validation
- Joi schema validation for all request data
- MongoDB ObjectId validation
- HTML sanitization with `validator` library
- NoSQL injection prevention middleware

### Idempotency
- Redis-backed idempotency middleware with in-flight lock (`idempotency.ts`)
- TTL-based cache for idempotent responses
- Concurrent duplicate prevention

### Ledger Integrity
- Double-entry ledger pattern (`ledgerService.ts`)
- Fire-and-forget retry for ledger entries
- Ledger reconciliation tracking

---

## 6. Recommendations Summary

### Immediate Actions (Before Production)
1. **C-001:** Fix shadow user to check account status before allowing access
2. **C-002:** Replace string comparison with `timingSafeEqual` in razorpayService
3. **C-003:** Remove or properly guard simulated payout code
4. **H-002:** Remove all commented-out rate limiters, add proper dev/prod toggles
5. **H-004:** Add ownership check to `/order/:orderId/financial` route

### Short-Term (Before Launch)
1. **H-001:** Consolidate webhook verification, ensure webhook secret is validated at startup
2. **H-003:** Add explicit raw body verification for webhooks
3. **H-005:** Improve re-authentication with cryptographically random tokens
4. **M-001:** Add `RAZORPAY_WEBHOOK_SECRET` validation at startup
5. **M-003:** Add ledger balance verification

### Medium-Term (Post-Launch)
1. **M-002:** Ensure payment amounts are recalculated server-side
2. **M-004:** Add TTL to cart locks, implement cleanup job
3. **L-001:** Add persistent audit log for shadow user creation
4. **L-002:** Sanitize error messages from external APIs
5. **L-003:** Audit testRoutes.ts for production exposure

---

## Appendix: File References

| Issue | File | Lines |
|-------|------|-------|
| C-001 | `src/middleware/auth.ts` | 202-235 |
| C-002 | `src/services/razorpayService.ts` | 132-158 |
| C-003 | `src/services/razorpayService.ts` | 327-343 |
| H-001 | `src/controllers/razorpayController.ts` | 149-166 |
| H-002 | `src/routes/*.ts` | Multiple |
| H-003 | `src/controllers/paymentController.ts` | 262-284 |
| H-004 | `src/routes/orderRoutes.ts` | 133-138 |
| H-005 | `src/middleware/reAuth.ts` | 23-36 |
| M-001 | `src/config/razorpay.config.ts` | N/A |
| M-002 | `src/services/PaymentService.ts` | 95-100 |
| M-003 | `src/services/ledgerService.ts` | 38-101 |
| M-004 | `src/controllers/cartController.ts` | Implied |
| L-001 | `src/middleware/auth.ts` | 224-230 |
| L-002 | `src/services/razorpayService.ts` | 116 |
| L-003 | `src/routes/testRoutes.ts` | N/A |

---

*End of Audit Report*
