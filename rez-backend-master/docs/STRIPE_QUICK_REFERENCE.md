# Stripe Payment Verification - Quick Reference Guide

## 🚀 New API Endpoints

### 1. Verify Stripe Checkout Session
```http
POST /api/payment/verify-stripe-session
Authorization: Bearer {token}

Body:
{
  "sessionId": "cs_test_xxx",
  "orderId": "optional_order_id"
}
```

### 2. Verify Stripe Payment Intent
```http
POST /api/payment/verify-stripe-payment
Authorization: Bearer {token}

Body:
{
  "paymentIntentId": "pi_xxx",
  "orderId": "optional_order_id"
}
```

### 3. Stripe Webhook Handler
```http
POST /api/payment/stripe-webhook
stripe-signature: {signature_from_stripe}

Body: {stripe_event_object}
```

---

## 📋 Files Modified

### 1. `src/services/stripeService.ts`
**New Methods**:
- `getPaymentIntent(paymentIntentId)` - Retrieve payment intent
- `verifyPaymentIntent(paymentIntentId)` - Verify payment success
- `verifyCheckoutSession(sessionId)` - Verify checkout session
- `verifyWebhookSignature(payload, signature)` - Verify webhook
- `createRefund(params)` - Create refund
- `handleStripeError(error)` - Handle Stripe errors

### 2. `src/controllers/paymentController.ts`
**New Endpoints**:
- `verifyStripeSession` - Verify checkout session
- `verifyStripePayment` - Verify payment intent
- `handleStripeWebhook` - Handle webhook events

**Webhook Event Handlers**:
- `handleStripePaymentSucceeded` - payment_intent.succeeded
- `handleStripePaymentFailed` - payment_intent.payment_failed
- `handleStripeCheckoutCompleted` - checkout.session.completed
- `handleStripeCheckoutExpired` - checkout.session.expired
- `handleStripeRefund` - charge.refunded

### 3. `src/routes/paymentRoutes.ts`
**New Routes**:
- POST `/verify-stripe-session` (authenticated)
- POST `/verify-stripe-payment` (authenticated)
- POST `/stripe-webhook` (no auth - signature verified)

---

## 🔐 Environment Variables

### Required Variables:
```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # ⚠️ UPDATE THIS
```

### Current Status:
- ✅ `STRIPE_SECRET_KEY` - Configured (Test)
- ✅ `STRIPE_PUBLISHABLE_KEY` - Configured (Test)
- ⚠️ `STRIPE_WEBHOOK_SECRET` - **NEEDS UPDATE**

---

## 🎯 Webhook Setup

### 1. Register Webhook in Stripe Dashboard
```
URL: https://your-domain.com/api/payment/stripe-webhook
Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - checkout.session.completed
  - checkout.session.expired
  - charge.refunded
```

### 2. Get Webhook Secret
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook
3. Copy "Signing secret" (starts with `whsec_`)
4. Update `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxx`

---

## 🧪 Testing

### Test Cards (Stripe Test Mode):
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
3D Secure: 4000 0027 6000 3184
```

### Test Flow:
1. Create checkout session → Get session URL
2. Use test card to complete payment
3. Call verify endpoint with sessionId
4. Check order status updated to 'confirmed'
5. Verify webhook received in Stripe Dashboard

### Test Webhook with Stripe CLI:
```bash
stripe trigger payment_intent.succeeded
stripe trigger checkout.session.completed
```

---

## 🐛 Troubleshooting

### Webhook Signature Fails
- ✓ Check `STRIPE_WEBHOOK_SECRET` is correct
- ✓ Ensure endpoint receives raw body
- ✓ Verify URL matches Stripe config

### Order Not Updated
- ✓ Check webhook is registered
- ✓ Verify orderId in payment metadata
- ✓ Check application logs
- ✓ Verify database connection

### "Stripe not configured" Error
- ✓ Check `STRIPE_SECRET_KEY` in `.env`
- ✓ Restart application
- ✓ Check initialization logs

---

## 📊 What Gets Updated

### On Payment Success:
```javascript
Order:
  - payment.status: 'pending' → 'paid'
  - payment.transactionId: {paymentIntentId}
  - payment.paidAt: {timestamp}
  - payment.paymentGateway: 'stripe'
  - status: 'placed' → 'confirmed'
  - totals.paidAmount: {amount}

Timeline:
  - 'payment_success': "Stripe payment completed"
  - 'confirmed': "Order confirmed after payment"
```

### On Payment Failure:
```javascript
Order:
  - payment.status: 'pending' → 'failed'
  - payment.failureReason: {error_message}
  - status: 'placed' → 'cancelled'
  - cancelReason: "Payment failed: {reason}"
  - cancelledAt: {timestamp}

Timeline:
  - 'payment_failed': "Stripe payment failed: {reason}"
```

---

## 🔍 Error Handling

### Error Types and Status Codes:
```
StripeCardError → 402 (card declined, insufficient funds)
StripeInvalidRequestError → 400 (bad parameters)
StripeAPIError → 500 (Stripe API issues)
StripeConnectionError → 503 (network issues)
StripeAuthenticationError → 500 (API key issues)
```

### Error Response Format:
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "error_code",
    "statusCode": 400
  }
}
```

---

## 📝 Logging

### Log Format:
```
✅ Success - Green operations
❌ Error - Red operations
⚠️ Warning - Yellow warnings
🔐 Security - Lock for verification
💳 Payment - Credit card for payments
🔔 Webhook - Bell for webhook events
💸 Refund - Money for refunds
```

### Example Logs:
```
✅ [STRIPE SERVICE] Payment intent verified successfully
❌ [STRIPE SERVICE] Error verifying payment intent: Invalid ID
🔔 [PAYMENT CONTROLLER] Stripe webhook event type: payment_intent.succeeded
💸 [STRIPE WEBHOOK] Refund processed for charge: ch_xxx
```

---

## 🚦 Deployment Checklist

### Before Deploy:
- [ ] Update webhook secret in `.env`
- [ ] Register webhook in Stripe Dashboard
- [ ] Test webhook signature verification
- [ ] Run unit tests
- [ ] Test with Stripe test cards

### After Deploy:
- [ ] Send test webhook from Stripe
- [ ] Verify order updates correctly
- [ ] Monitor webhook delivery status
- [ ] Check application logs

---

## 📞 Support

### Documentation:
- Full guide: `STRIPE_PAYMENT_VERIFICATION_IMPLEMENTATION.md`
- Stripe docs: https://stripe.com/docs/webhooks
- Test cards: https://stripe.com/docs/testing

### Monitoring:
- Stripe Dashboard → Developers → Webhooks
- Application logs: Check for [STRIPE] tags
- Database: Query orders with payment.paymentGateway = 'stripe'

---

**Quick Links**:
- [Full Implementation Guide](./STRIPE_PAYMENT_VERIFICATION_IMPLEMENTATION.md)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Webhook Testing](https://dashboard.stripe.com/test/webhooks)
