# Payment Flow Audit Report

**Date:** June 25, 2026  
**Auditor:** Payment Flow Specialist  
**Scope:** Frontend (nuqta-master), Backend (rez-backend-master), Gateway (rez-api-gateway)  
**Severity Scale:** CRITICAL, HIGH, MEDIUM, LOW

---

## Executive Summary

The payment flow has substantial security infrastructure in place including webhook signature verification, idempotency handling, amount validation, and payment logging. However, several critical and high-severity vulnerabilities were identified that require immediate attention before production deployment.

**Overall Risk Assessment: HIGH**

---

## Critical Issues

### [CRITICAL-1] Mock Payment Flow Accepts Any Signature in Development Mode

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 455-482 (openWebRazorpayCheckout function)

**Issue:**
```typescript
const openWebRazorpayCheckout = (orderData: any) => {
  if (__DEV__) {
    // Mock payment flow for development only
    platformAlertConfirm(
      'DEV: Mock Payment',
      'This mock payment only works in development mode.',
      () => {
        const mockData = {
          razorpay_order_id: orderData.razorpayOrderId,
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'mock_signature_' + Date.now()};  // MOCK SIGNATURE
        handlePaymentSuccess(mockData);
      },
      'Continue (Dev Mock)'
    );
  }
  // ...
};
```

**Risk:** The mock signature `mock_signature_<timestamp>` will fail backend verification, but the user experience shows "success" on the frontend while actually failing. This creates confusion and could mask real issues in development testing.

**Recommendation:** Either remove the mock flow entirely and force real Razorpay SDK, or mock the entire backend verification response for development.

---

### [CRITICAL-2] Razorpay Webhook Body Re-serialization Breaks Signature Verification

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/controllers/paymentController.ts`  
**Lines:** 262-267 (handleWebhook function)

**Issue:**
```typescript
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  // Use the raw Buffer from express.raw() (mounted before JSON parser in server.ts)
  const rawBody: string = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  // ...
});
```

**Risk:** The `JSON.stringify(req.body)` path is problematic when body was parsed by `express.json()`. JSON.stringify does not guarantee byte-for-byte equivalence with the original payload - it may change whitespace, key ordering, or number formatting, causing legitimate webhooks to fail signature verification.

**Note:** The code comments correctly identify the requirement for raw body, but the `JSON.stringify` fallback could silently corrupt signatures.

**Recommendation:** Ensure Razorpay webhook route always uses `express.raw({ type: 'application/json' })` and never falls back to parsed body.

---

### [CRITICAL-3] Payment Gateway Service Missing Circuit Breaker for Razorpay Calls

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/paymentGatewayService.ts`  
**Lines:** 100-127, 220-279

**Issue:**
```typescript
// Initialize Razorpay
if (this.config.razorpay.keyId && this.config.razorpay.keySecret) {
  this.razorpay = new Razorpay({
    key_id: this.config.razorpay.keyId,
    key_secret: this.config.razorpay.keySecret
  });
  // Missing: this.verifyRazorpayCredentials(); - only added later
}
```

The `verifyRazorpayCredentials()` is called but Razorpay API calls (lines 234-243, 365-366) do not use circuit breaker protection like the main PaymentService does.

**Risk:** In high-load scenarios, slow Razorpay API responses could cascade and cause system-wide failures.

**Recommendation:** Apply circuit breaker pattern to all Razorpay API calls in paymentGatewayService.ts, similar to how `razorpayCircuit` is used in PaymentService.ts.

---

### [CRITICAL-4] Frontend Amount Passed Directly Without Server Validation

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 66-67

**Issue:**
```typescript
const amount = Number(params.amount) || 5000;
```

**Risk:** The payment amount comes directly from URL parameters (`useLocalSearchParams`), allowing a malicious user to modify the amount in the URL before initiating payment.

**Partial Mitigation:** The backend does validate amount against order total (see HIGH-3), but the frontend still displays the attacker-controlled amount to the user.

**Recommendation:** Fetch the verified amount from the server after creating the order, never trust URL parameters for financial calculations.

---

## High Issues

### [HIGH-1] No Idempotency Key in Razorpay Order Creation

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/PaymentService.ts`  
**Lines:** 72-133 (createPaymentOrder function)

**Issue:**
```typescript
const orderOptions: IRazorpayOrderRequest = {
  amount: amountInPaise,
  currency: currency,
  receipt: order.orderNumber,
  notes: { ... },
  payment_capture: 1
  // Missing: idempotency_key
};
```

**Risk:** Network failures during order creation could cause the frontend to retry, potentially creating duplicate Razorpay orders for the same order ID.

**Recommendation:** Add idempotency_key to all Razorpay API calls:
```typescript
idempotency_key: `order_${orderId}_${Date.now()}`,
```

---

### [HIGH-2] Razorpay Signature Validation Error Not Throwing in razorpayService

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 124-158 (verifyRazorpaySignature function)

**Issue:**
```typescript
export function verifyRazorpaySignature(...): boolean {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(text)
      .digest('hex');
    
    const isValid = expectedSignature === razorpaySignature;  // NOT timing-safe!
    return isValid;
  } catch (error) {
    logger.error('...');
    return false;
  }
}
```

**Risk:** 
1. Uses `===` instead of `crypto.timingSafeEqual()` for signature comparison
2. Could be vulnerable to timing attacks

**Note:** The razorpayUtils.ts correctly uses timing-safe comparison, but this service module does not.

**Recommendation:** Replace `===` with `crypto.timingSafeEqual()`:
```typescript
return crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(razorpaySignature)
);
```

---

### [HIGH-3] Stripe Webhook Partial Refund Logic Issue

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/controllers/paymentController.ts`  
**Lines:** 962-968 (handleStripeRefund function)

**Issue:**
```typescript
const refundAmount = charge.amount_refunded / 100; // Convert from cents

if (refundAmount >= order.totals.paidAmount) {
  order.payment.status = 'refunded';
} else {
  order.payment.status = 'partially_refunded';
}
```

**Risk:** Using `>=` instead of exact comparison could incorrectly mark fully refunded orders as "partially_refunded" due to floating-point precision issues.

**Recommendation:** Use decimal-safe comparison:
```typescript
if (Math.abs(refundAmount - order.totals.paidAmount) < 0.01) {
  order.payment.status = 'refunded';
} else if (refundAmount > order.totals.paidAmount) {
  order.payment.status = 'refunded'; // Edge case: over-refund
} else {
  order.payment.status = 'partially_refunded';
}
```

---

### [HIGH-4] Razorpay Webhook Route Uses JSON Parser Instead of Raw Body

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/routes/webhookRoutes.ts`  
**Lines:** 29-33

**Issue:**
```typescript
router.post(
  '/razorpay',
  express.json(), // Parse JSON body for signature verification
  handleRazorpayWebhook
);
```

**Risk:** Using `express.json()` parses the body, destroying the original raw bytes needed for signature verification. The webhook handler attempts to reconstruct raw body, but this is fragile.

**Recommendation:** Use `express.raw({ type: 'application/json' })` for Razorpay webhooks, similar to Stripe:
```typescript
router.post(
  '/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);
```

---

### [HIGH-5] No Explicit Currency Validation

**Files:**
- `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx` (lines 54, 67)
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/PaymentService.ts` (lines 75-86)
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts` (lines 80-85)

**Issue:**
Currency is accepted as a parameter without explicit validation that it matches Razorpay's supported currencies (INR only).

**Risk:** A user could specify an unsupported currency like "USD" with Razorpay, causing payment failures.

**Recommendation:** Add explicit currency validation at payment initiation:
```typescript
if (paymentMethod === 'razorpay' && currency !== 'INR') {
  throw new Error('Razorpay only supports INR currency');
}
```

---

### [HIGH-6] Webhook IP Whitelist May Be Incomplete

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/middleware/webhookSecurity.ts`  
**Lines:** 10-15

**Issue:**
```typescript
const RAZORPAY_IP_RANGES = [
  '52.66.135.160/27',
  '3.6.119.224/27',
  '13.232.125.192/27',
];
```

**Risk:** Razorpay may use additional IP ranges not listed here. Using an incomplete whitelist could reject legitimate webhooks.

**Recommendation:** 
1. Consider removing IP whitelist as the primary control (signature verification is the primary defense)
2. If keeping IP whitelist, implement "fail-open" behavior for non-matching IPs to avoid blocking legitimate webhooks
3. Periodically verify IP ranges with Razorpay documentation

---

## Medium Issues

### [MEDIUM-1] Payment Timeout Only 5 Minutes Client-Side

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 106-122

**Issue:**
```typescript
// Payment timeout (5 minutes)
useEffect(() => {
  if (!paymentStartedAt) return;
  const timeout = setTimeout(() => {
    // ...
  }, 5 * 60 * 1000);
  // ...
}, [paymentStartedAt, isProcessing]);
```

**Risk:** 
1. 5 minutes may be too short for some payment methods (bank transfers)
2. Server-side order expiration should be implemented as defense-in-depth

**Recommendation:** 
1. Increase timeout to 15-30 minutes for consistency with server-side expiration
2. Implement server-side order expiration with cleanup job

---

### [MEDIUM-2] Missing Test Coverage for Amount Tampering

**Files:**
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/__tests__/routes/payment.test.ts`
- `C:/Users/user/Downloads/rez-backend-master/nuqta-master/tests.bak/payment-integration.test.js`

**Issue:** No explicit tests verify that tampered amounts (different from order total) are rejected.

**Recommendation:** Add tests for:
1. Payment amount less than order total (underpayment attempt)
2. Payment amount greater than order total (overpayment)
3. Payment with modified currency

---

### [MEDIUM-3] Frontend Prefill Uses Hardcoded User Data

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 434-438

**Issue:**
```typescript
prefill: {
  email: 'user@example.com',
  contact: '9876543210',
  name: 'User Name'
}
```

**Risk:** These are placeholder values. The payment form will auto-fill with incorrect user information.

**Recommendation:** Fetch actual user details from authentication state:
```typescript
prefill: {
  email: user?.email || '',
  contact: user?.phoneNumber || '',
  name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
}
```

---

### [MEDIUM-4] Webhook Retry Logic Returns 200 for Application Errors

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/controllers/webhookController.ts`  
**Lines:** 147-153, 572-579

**Issue:**
```typescript
// Return 200 to prevent unnecessary retries for application errors
return res.status(200).json({
  received: true,
  status: 'error',
  message: processingError.message
});
```

**Risk:** Returning 200 for application errors means Razorpay/Stripe will not retry the webhook, potentially leaving payments in an inconsistent state.

**Recommendation:** Return 200 only for successfully processed events. For application errors:
```typescript
if (webhookLog.retryCount >= MAX_RETRIES) {
  return res.status(200); // Give up
}
return res.status(500); // Trigger retry
```

---

### [MEDIUM-5] Payment Logger Missing Transaction ID in Some Methods

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/logging/paymentLogger.ts`  
**Lines:** 15-22 (logPaymentProcessing function)

**Issue:**
```typescript
static logPaymentProcessing(transactionId: string, userId: string, amount: number, correlationId?: string) {
  // TransactionId is logged but not used meaningfully
}
```

**Risk:** Correlation between payment initiation and success logs is difficult to trace.

**Recommendation:** Ensure all log entries include correlation IDs that link payment initiation → processing → success/failure.

---

### [MEDIUM-6] Razorpay Payout Simulated in Production Path

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 323-342

**Issue:**
```typescript
// Simulated response for development
const payout: any = {
  id: `pout_${Date.now()}`,
  entity: 'payout',
  status: 'processing',
  // ...
};
```

**Risk:** This simulated response could accidentally run in production if the real API call is not uncommented.

**Recommendation:** Remove simulation code entirely or add explicit environment check:
```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('Razorpay X Payout API not implemented for production');
}
const payout = /* simulation */;
```

---

## Low Issues

### [LOW-1] Inconsistent Amount Display Formatting

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 629-630

**Issue:**
```typescript
<Text style={styles.stripePayButtonText}>
  Pay {displayCurrencySymbol}{amount.toLocaleString()} with Stripe
</Text>
```

**Risk:** `toLocaleString()` behavior varies by locale. Amount could display incorrectly.

**Recommendation:** Use explicit formatting:
```typescript
{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
```

---

### [LOW-2] Razorpay Checkout Image URL Placeholder

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Line:** 428

**Issue:**
```typescript
image: 'https://your-logo-url.com/logo.png',
```

**Risk:** Displays broken image or incorrect branding.

**Recommendation:** Update to actual logo URL or remove for production.

---

### [LOW-3] Missing Payment Method in Some Order Updates

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/PaymentService.ts`  
**Lines:** 260-261

**Issue:**
```typescript
order.payment.status = 'paid';
order.payment.transactionId = paymentDetails.razorpay_payment_id;
// Missing: order.payment.method = 'razorpay';
```

**Risk:** Payment method tracking is incomplete, making reporting difficult.

**Recommendation:** Always set payment method when recording transactions.

---

### [LOW-4] Razorpay Order Amount Conversion Uses Implicit Rounding

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Line:** 81

**Issue:**
```typescript
amount: Math.round(amount * 100),
```

**Risk:** `Math.round()` may behave unexpectedly with very small amounts (e.g., 0.005 INR rounds to 1 paise vs 0).

**Recommendation:** Use explicit rounding strategy and validate minimum amounts:
```typescript
const paise = Math.round(amount * 100);
if (paise < 100) throw new Error('Minimum amount is 1 INR');
```

---

### [LOW-5] Unhandled Payment Gateway Fallback

**File:** `C:/Users/user/Downloads/rez-backend-master/nuqta-master/app/payment-razorpay.tsx`  
**Lines:** 84-88

**Issue:**
```typescript
const resolveGateway = (): PaymentGateway => {
  if (gatewayParam) return gatewayParam;
  if (STRIPE_ONLY_CURRENCIES.includes(currency)) return 'stripe';
  return 'stripe'; // Default to Stripe (matches DEFAULT_PAYMENT_PROVIDER config)
};
```

**Risk:** Defaulting to Stripe may not match user expectations if only Razorpay is configured.

**Recommendation:** Make default gateway configurable via environment variable.

---

## Positive Findings

The following security measures are correctly implemented:

1. **Signature Verification:** Both Razorpay and Stripe webhook signatures are verified using HMAC-SHA256
2. **Timing-Safe Comparison:** razorpayUtils.ts uses `crypto.timingSafeEqual()` for signature comparison
3. **Idempotency:** WebhookController implements atomic idempotency via unique eventId index
4. **Amount Validation:** PaymentService validates payment amount matches order total (with tolerance)
5. **Atomic Updates:** Uses MongoDB transactions and findOneAndUpdate for payment status changes
6. **Logging:** Comprehensive payment logging via PaymentLogger
7. **Webhook Security Middleware:** Rate limiting and IP whitelist implemented
8. **Circuit Breaker:** PaymentService uses circuit breaker for Razorpay calls
9. **Stock Deduction:** Atomic stock updates within payment transaction
10. **Dual Gateway Support:** Both Stripe and Razorpay supported

---

## Summary Table

| ID | Severity | Category | Location |
|----|----------|----------|----------|
| CRITICAL-1 | CRITICAL | Payment Flow | payment-razorpay.tsx:455-482 |
| CRITICAL-2 | CRITICAL | Webhook | paymentController.ts:262-267 |
| CRITICAL-3 | CRITICAL | Resilience | paymentGatewayService.ts |
| CRITICAL-4 | CRITICAL | Validation | payment-razorpay.tsx:66-67 |
| HIGH-1 | HIGH | Idempotency | PaymentService.ts:72-133 |
| HIGH-2 | HIGH | Security | razorpayService.ts:124-158 |
| HIGH-3 | HIGH | Logic | paymentController.ts:962-968 |
| HIGH-4 | HIGH | Webhook | webhookRoutes.ts:29-33 |
| HIGH-5 | HIGH | Validation | Multiple files |
| HIGH-6 | HIGH | Security | webhookSecurity.ts:10-15 |
| MEDIUM-1 | MEDIUM | UX | payment-razorpay.tsx:106-122 |
| MEDIUM-2 | MEDIUM | Testing | Test files |
| MEDIUM-3 | MEDIUM | UX | payment-razorpay.tsx:434-438 |
| MEDIUM-4 | MEDIUM | Reliability | webhookController.ts:147-153 |
| MEDIUM-5 | MEDIUM | Logging | paymentLogger.ts |
| MEDIUM-6 | MEDIUM | Production | razorpayService.ts:323-342 |
| LOW-1 | LOW | UX | payment-razorpay.tsx:629-630 |
| LOW-2 | LOW | UX | payment-razorpay.tsx:428 |
| LOW-3 | LOW | Data | PaymentService.ts:260-261 |
| LOW-4 | LOW | Edge Case | razorpayService.ts:81 |
| LOW-5 | LOW | Config | payment-razorpay.tsx:84-88 |

---

## Recommendations Priority

### Immediate (Before Production)
1. Fix CRITICAL-4: Server-side amount validation is working but frontend should not trust params.amount
2. Fix CRITICAL-2: Ensure raw body handling for webhooks
3. Fix HIGH-4: Change Razorpay webhook route to use express.raw()
4. Fix HIGH-1: Add idempotency keys to Razorpay API calls
5. Fix HIGH-2: Use timing-safe comparison in razorpayService.ts

### Before Launch
1. Fix CRITICAL-1: Remove or properly mock development payment flow
2. Fix CRITICAL-3: Add circuit breaker to paymentGatewayService
3. Address all HIGH and MEDIUM issues
4. Add payment amount tampering tests

### Post-Launch
1. Address all LOW issues
2. Implement server-side order expiration
3. Add payment analytics dashboard

---

*Report generated by Payment Flow Specialist*

---

## Additional Payment Security Findings

**Date:** June 25, 2026  
**Auditor:** Additional Payment Security Auditor  
**Focus:** Deep security audit of Razorpay integration (webhook security, amount validation, idempotency)

---

### 1. Webhook Security (CRITICAL)

#### [CRITICAL-SEC-1] Webhook Signature Verification Uses Timing-Vulnerable Comparison

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 258-273 (validateWebhookSignature function)

**Issue:**
```typescript
export function validateWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(webhookBody)
      .digest('hex');
    
    return expectedSignature === webhookSignature;  // NOT timing-safe!
  } catch (error) {
    logger.error('❌ [RAZORPAY] Webhook signature validation failed:', error);
    return false;
  }
}
```

**Risk:** Using `===` for signature comparison is vulnerable to timing attacks. An attacker who can measure response times could potentially guess the correct signature byte-by-byte.

**Mitigating Factor:** The `razorpayUtils.ts` utility function correctly uses `crypto.timingSafeEqual()` (lines 181-184), and `PaymentService.ts` uses that utility (line 995). However, the direct service implementation in `razorpayService.ts` does not.

**Recommendation:** Replace `===` with timing-safe comparison:
```typescript
try {
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(webhookSignature)
  );
} catch (e) {
  // Buffers have different lengths
  return false;
}
```

---

#### [CRITICAL-SEC-2] Webhook Handler Falls Back to JSON.stringify for Raw Body

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/controllers/webhookController.ts`  
**Lines:** 28-34

**Issue:**
```typescript
const webhookSignature = req.headers['x-razorpay-signature'] as string;
// SECURITY: use the raw body captured by express.json({ verify }) — not a
// re-serialization. Razorpay signs the exact bytes the sender sent;
const webhookBody = (req as any).rawBody || JSON.stringify(req.body);
```

**Risk:** The `|| JSON.stringify(req.body)` fallback is dangerous:
1. If `express.raw()` middleware is misconfigured, this fallback silently uses parsed body
2. JSON.stringify does not guarantee byte-for-byte equivalence with original payload
3. Key ordering and whitespace differences will cause valid signatures to fail

**Mitigating Factor:** The route in `webhookRoutes.ts:31` correctly uses `express.raw({ type: 'application/json' })`.

**Recommendation:** Fail explicitly if rawBody is missing:
```typescript
const rawBody = (req as any).rawBody;
if (!rawBody) {
  logger.error('❌ [RAZORPAY WEBHOOK] Raw body not available - middleware misconfiguration');
  return sendBadRequest(res, 'Webhook configuration error');
}
const webhookBody = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
```

---

#### [CRITICAL-SEC-3] Missing Webhook Secret Validation in razorpayService.validateWebhookSignature

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 258-273

**Issue:**
```typescript
export function validateWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)  // Uses keySecret, not webhook secret!
      .update(webhookBody)
      .digest('hex');
```

**Risk:** This function uses `razorpayConfig.keySecret` instead of the webhook signing secret. Razorpay webhooks are signed with a **webhook secret** (from dashboard), not the API key secret. Using the wrong secret means all webhook signatures will fail validation.

**Mitigating Factor:** `PaymentService.ts` line 986 correctly uses `RAZORPAY_WEBHOOK_SECRET` environment variable via `validateRazorpayWebhookSignature()`.

**Recommendation:** Use the correct webhook secret:
```typescript
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
if (!webhookSecret) {
  logger.error('❌ Webhook secret not configured');
  return false;
}
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(webhookBody)
  .digest('hex');
```

---

### 2. Amount Validation (CRITICAL)

#### [CRITICAL-AMT-1] Payment Gateway Service Missing Amount Validation on Webhook

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/paymentGatewayService.ts`  
**Lines:** 527-537 (processRazorpayWebhook function)

**Issue:**
```typescript
private async processRazorpayWebhook(payload: any): Promise<void> {
  const event = payload.event;

  switch (event) {
    case 'payment.captured':
      await this.updatePaymentFromWebhook(payload.payload.payment.entity.order_id, 'completed', 'razorpay');
      break;
```

**Risk:** When webhook receives `payment.captured`, it updates payment status **without validating the captured amount** against the expected order total. A malicious actor who gains webhook access could capture payments for incorrect amounts.

**Mitigating Factor:** The dedicated `webhookController.ts` (lines 237-276) correctly validates amounts. The `paymentGatewayService` appears to be a secondary/unified service.

**Recommendation:** Add amount validation to webhook handlers:
```typescript
case 'payment.captured': {
  const payment = payload.payload.payment.entity;
  const capturedAmount = payment.amount / 100;
  // Fetch order and validate amount matches
  const order = await Order.findById(payment.notes?.orderId);
  if (order && Math.abs(capturedAmount - order.totals.total) <= 1) {
    await this.updatePaymentFromWebhook(payment.order_id, 'completed', 'razorpay');
  }
  break;
}
```

---

#### [CRITICAL-AMT-2] Integer Overflow Possible in Amount Conversion

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 80-85 (createRazorpayOrder function)

**Issue:**
```typescript
const options = {
  amount: Math.round(amount * 100), // Convert to paise
  currency: razorpayConfig.currency,
  receipt,
  notes: notes || {},
};
```

**Risk:** 
1. `amount * 100` could overflow for extremely large amounts
2. No validation of maximum amount (Razorpay max is 10 crores = 1,000,000,000 paise)
3. No minimum amount validation (Razorpay min is 100 paise = 1 INR)

**Recommendation:** Add explicit validation:
```typescript
const paise = Math.round(amount * 100);
const MIN_PAISE = 100;  // 1 INR minimum
const MAX_PAISE = 1_000_000_000;  // 10 lakhs maximum

if (paise < MIN_PAISE) {
  throw new Error('Minimum payment amount is 1 INR');
}
if (paise > MAX_PAISE) {
  throw new Error('Maximum payment amount exceeded');
}
```

---

### 3. Idempotency (HIGH)

#### [HIGH-IDEM-1] Razorpay Order Creation Missing Idempotency Key

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`  
**Lines:** 60-118 (createRazorpayOrder function)

**Issue:**
```typescript
const options = {
  amount: Math.round(amount * 100),
  currency: razorpayConfig.currency,
  receipt,
  notes: notes || {},
  payment_capture: 1
  // Missing: idempotency_key
};

// Create Razorpay order
const order = await withTimeout(
  razorpay.orders.create(options),
  ...
);
```

**Risk:** Network failures during order creation could cause frontend retries, creating duplicate Razorpay orders. While MongoDB unique constraints prevent duplicate database orders, multiple Razorpay orders could incur unnecessary API fees and confusion.

**Recommendation:** Add idempotency key:
```typescript
const idempotencyKey = `order_${receipt}_${Date.now()}`;
const options = {
  amount: Math.round(amount * 100),
  currency: razorpayConfig.currency,
  receipt,
  notes: notes || {},
  payment_capture: 1,
  idempotency_key: idempotencyKey
};
```

**Note:** The `razorpayCircuit` in PaymentService.ts (line 118-119) does not add idempotency either. This should be added to `createPaymentOrder` in PaymentService.ts as well.

---

#### [HIGH-IDEM-2] Payment Gateway Service Order Creation Missing Idempotency

**File:** `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/paymentGatewayService.ts`  
**Lines:** 220-243 (initiateRazorpayPayment function)

**Issue:**
```typescript
const order = await this.razorpay.orders.create({
  amount,
  currency: paymentData.currency,
  receipt: orderId,
  notes: {
    userId,
    paymentMethodType: paymentData.paymentMethodType,
    ...paymentData.metadata
  }
});
// Missing: idempotency_key
```

**Risk:** Same as above - duplicate order creation possible on network retries.

**Recommendation:** Add idempotency_key based on paymentId/userId/timestamp.

---

### 4. Positive Security Findings

The following security measures are correctly implemented:

1. **Timing-Safe Comparison:** `razorpayUtils.ts` uses `crypto.timingSafeEqual()` for payment and webhook signature validation (lines 96-99, 181-184)

2. **Raw Body Parser:** `webhookRoutes.ts` correctly uses `express.raw({ type: 'application/json' })` for both Razorpay and Stripe webhooks (lines 31, 50)

3. **Amount Validation in Dedicated Handler:** `webhookController.ts` validates captured amount against order total with ±1 INR tolerance (lines 237-276)

4. **Atomic Idempotency Guards:** 
   - Webhook events use MongoDB unique index on eventId (webhookController.ts lines 86-115)
   - Payment processing uses `findOneAndUpdate` with status condition (PaymentService.ts lines 203-207)

5. **Circuit Breaker:** Razorpay API calls use `razorpayCircuit` for resilience (PaymentService.ts lines 118-119)

6. **Signature Verification Utility:** Centralized `validateRazorpayPaymentSignature` and `validateRazorpayWebhookSignature` in `razorpayUtils.ts` with proper error handling

7. **Webhook Secret Validation:** `PaymentService.ts` validates webhook secret is configured before verification (lines 986-992)

---

### Summary: Additional Findings

| ID | Severity | Category | Location |
|----|----------|----------|----------|
| CRITICAL-SEC-1 | CRITICAL | Webhook Security | razorpayService.ts:268 |
| CRITICAL-SEC-2 | CRITICAL | Webhook Security | webhookController.ts:34 |
| CRITICAL-SEC-3 | CRITICAL | Webhook Security | razorpayService.ts:264 |
| CRITICAL-AMT-1 | CRITICAL | Amount Validation | paymentGatewayService.ts:527-537 |
| CRITICAL-AMT-2 | CRITICAL | Amount Validation | razorpayService.ts:81 |
| HIGH-IDEM-1 | HIGH | Idempotency | razorpayService.ts:80-97 |
| HIGH-IDEM-2 | HIGH | Idempotency | paymentGatewayService.ts:234-243 |

---

### Priority Fixes

**Immediate (Before Production):**
1. Fix CRITICAL-SEC-1: Add timing-safe comparison to `validateWebhookSignature`
2. Fix CRITICAL-SEC-3: Use webhook secret instead of API key secret
3. Fix CRITICAL-AMT-2: Add minimum/maximum amount validation

**High Priority:**
1. Fix CRITICAL-SEC-2: Remove JSON.stringify fallback, fail explicitly
2. Fix HIGH-IDEM-1: Add idempotency_key to Razorpay order creation
3. Add amount validation to paymentGatewayService webhook handler

---

*Additional findings compiled by Additional Payment Security Auditor*
