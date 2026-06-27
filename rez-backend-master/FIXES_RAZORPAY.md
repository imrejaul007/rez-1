# Razorpay Security Fixes

## Summary
This document details security fixes applied to the Razorpay integration in the rez-backend project.

---

## Issue 1: Timing-Safe Signature Comparison

### Problem
Several files were using `===` operator for comparing HMAC signatures, which is vulnerable to timing attacks. An attacker could potentially exploit timing differences to guess the correct signature.

### Affected Files
1. `src/services/razorpaySubscriptionService.ts` - `verifyWebhookSignature()` method (line 267)
2. `src/services/paymentGatewayService.ts` - `verifyRazorpayWebhook()` method (line 473)

### Fix Applied
Replaced `===` comparison with `crypto.timingSafeEqual()` wrapped in try/catch:

```typescript
// Before (vulnerable)
return expectedSignature === signature;

// After (secure)
try {
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
} catch (e) {
  // Buffers have different lengths - cannot be equal
  return false;
}
```

### Files Fixed
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpaySubscriptionService.ts`
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/paymentGatewayService.ts`

### Note
The following files already had `timingSafeEqual` implemented correctly:
- `src/services/razorpayService.ts` - `verifyRazorpaySignature()` (already fixed)
- `src/services/razorpayService.ts` - `validateWebhookSignature()` (already fixed)

---

## Issue 2: Simulated Payout Code in Production Path

### Problem
The `createRazorpayPayout()` function in `razorpayService.ts` contained simulated/mock payout code that would execute in any environment, including production. This could result in fake payouts being recorded.

### Affected File
- `src/services/razorpayService.ts` - `createRazorpayPayout()` function (lines 353-372)

### Fix Applied
Added `NODE_ENV` check to ensure simulated code only runs in non-production environments:

```typescript
// FIX: Guard simulated payout code with NODE_ENV check
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  logger.warn('⚠️ [RAZORPAY] Using simulated payout (not production)');
}

// Response now includes _simulated flag in non-production
const payout: any = {
  // ...
  status: isProduction ? 'processing' : 'simulated',
  // ...
  _simulated: !isProduction // Mark as simulated in non-production
};
```

### Files Fixed
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/razorpayService.ts`

### Recommended Actions
1. Set `NODE_ENV=production` in production deployment
2. Uncomment the actual Razorpay X API call when ready:
   ```typescript
   const payout = await razorpay.payouts.create(payoutData);
   ```

---

## Issue 3: Webhook Body Re-serialization

### Problem
Some webhook handlers were using `JSON.stringify(payload)` to compute HMAC signatures, which could produce different bytes than what Razorpay originally sent (due to key ordering, whitespace, etc.).

### Affected File
- `src/services/paymentGatewayService.ts` - `verifyRazorpayWebhook()` method

### Fix Applied
Modified to use `rawBody` when available, falling back to `JSON.stringify`:

```typescript
// FIX: Use rawBody for signature verification - Razorpay signs the exact bytes received
const rawBody = (payload as any).rawBody || JSON.stringify(payload);
const expectedSignature = crypto
  .createHmac('sha256', this.config.razorpay.webhookSecret)
  .update(rawBody)
  .digest('hex');
```

### Files Fixed
- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/services/paymentGatewayService.ts`

### Note
The following files already handled this correctly:
- `src/controllers/razorpayController.ts` - webhook handler (line 153)
- Middleware in `src/config/middleware.ts` and `src/config/productionMiddleware.ts` captures raw body

---

## Verification

To verify the fixes are working:

1. **Timing-Safe Comparison**: No `===` comparisons should remain in signature verification methods
2. **Payout Simulation**: Set `NODE_ENV=development` and verify payout responses include `_simulated: true`
3. **Webhook Body**: Monitor logs for "Raw body" entries to confirm raw bytes are being used

---

## Security Classification

| Issue | Severity | Status |
|-------|----------|--------|
| Timing attack vulnerability | HIGH | Fixed |
| Simulated code in production | HIGH | Fixed |
| Webhook body serialization | MEDIUM | Fixed |

---

## References

- [Razorpay Webhook Documentation](https://razorpay.com/docs/webhooks/)
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- Timing attack explanation: https://en.wikipedia.org/wiki/Timing_attack
