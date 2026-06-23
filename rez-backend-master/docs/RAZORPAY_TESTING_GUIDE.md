# Razorpay Integration - Testing Guide

## Quick Start Testing

### 1. Environment Setup

```bash
# Copy and configure environment variables
cp .env.example .env

# Add your Razorpay test credentials
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 2. Get Test Credentials

1. Sign up at https://razorpay.com
2. Go to Dashboard → Settings → API Keys
3. Click "Generate Test Keys"
4. Copy Key ID and Key Secret to `.env`

---

## Test Cards (Razorpay Test Mode)

### Success Scenarios

| Card Number         | CVV | Expiry     | Expected Result          |
|---------------------|-----|------------|--------------------------|
| 4111 1111 1111 1111 | Any | Any Future | Success                  |
| 5555 5555 5555 4444 | Any | Any Future | Success (Mastercard)     |
| 3566 0020 2036 0505 | Any | Any Future | Success (JCB)            |

### Failure Scenarios

| Card Number         | CVV | Expiry     | Expected Result          |
|---------------------|-----|------------|--------------------------|
| 4000 0000 0000 0002 | Any | Any Future | Card Declined            |
| 4000 0000 0000 9995 | Any | Any Future | Insufficient Funds       |
| 4000 0000 0000 9987 | Any | Any Future | Lost Card                |

### Other Payment Methods

**UPI Test IDs:**
- Success: `success@razorpay`
- Failure: `failure@razorpay`

**Wallets:**
All wallets work in test mode with dummy auth

---

## API Testing with cURL

### 1. Create Payment Order

```bash
# Get auth token first (login)
TOKEN="your_jwt_token_here"

# Create payment order
curl -X POST http://localhost:5000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "67567891234567890abcdef",
    "amount": 1000,
    "currency": "INR"
  }'

# Response:
{
  "success": true,
  "razorpayOrderId": "order_xxxxxxxxxxxxx",
  "razorpayKeyId": "rzp_test_xxxxxxxxxxxxx",
  "amount": 100000,
  "currency": "INR",
  "orderId": "67567891234567890abcdef",
  "orderNumber": "ORD-1234567890",
  "notes": { ... }
}
```

### 2. Verify Payment (After Frontend Payment)

```bash
# Generate test signature (for testing only!)
# In production, signature comes from Razorpay

ORDER_ID="order_xxxxxxxxxxxxx"
PAYMENT_ID="pay_xxxxxxxxxxxxx"
SECRET="your_razorpay_secret"

# Generate signature using openssl
SIGNATURE=$(echo -n "${ORDER_ID}|${PAYMENT_ID}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Verify payment
curl -X POST http://localhost:5000/api/payment/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"orderId\": \"67567891234567890abcdef\",
    \"razorpay_order_id\": \"$ORDER_ID\",
    \"razorpay_payment_id\": \"$PAYMENT_ID\",
    \"razorpay_signature\": \"$SIGNATURE\"
  }"

# Success Response:
{
  "success": true,
  "message": "Payment verified and order confirmed successfully",
  "verified": true,
  "order": { ... }
}
```

### 3. Check Payment Status

```bash
curl -X GET http://localhost:5000/api/payment/status/67567891234567890abcdef \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "orderId": "67567891234567890abcdef",
  "orderNumber": "ORD-1234567890",
  "paymentStatus": "paid",
  "gatewayOrderId": "order_xxxxxxxxxxxxx",
  "gatewayPaymentId": "pay_xxxxxxxxxxxxx",
  "amount": 1000,
  "currency": "INR",
  "paidAt": "2025-11-18T10:30:45.000Z"
}
```

---

## Testing Utilities

### Generate Test Signature (Node.js)

```javascript
const crypto = require('crypto');

function generateTestSignature(orderId, paymentId, secret) {
  const text = `${orderId}|${paymentId}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');
  return signature;
}

// Usage
const signature = generateTestSignature(
  'order_test123',
  'pay_test456',
  process.env.RAZORPAY_KEY_SECRET
);

console.log('Signature:', signature);
```

### Validate Razorpay Configuration

```javascript
const {
  validateRazorpayConfiguration
} = require('./src/utils/razorpayUtils');

const validation = validateRazorpayConfiguration();

console.log('Configuration Valid:', validation.isValid);
console.log('Missing Variables:', validation.missingVars);
console.log('Warnings:', validation.warnings);
```

---

## Automated Testing

### Unit Test Example

```javascript
// tests/utils/razorpayUtils.test.js
const {
  validateRazorpayPaymentSignature,
  verifyPaymentDataCompleteness,
  convertToPaise,
  convertToRupees
} = require('../../src/utils/razorpayUtils');
const crypto = require('crypto');

describe('Razorpay Utils', () => {
  describe('validateRazorpayPaymentSignature', () => {
    const secret = 'test_secret_key_12345';
    const orderId = 'order_test123456';
    const paymentId = 'pay_test789012';

    const generateSignature = (oId, pId, sec) => {
      return crypto
        .createHmac('sha256', sec)
        .update(`${oId}|${pId}`)
        .digest('hex');
    };

    test('should validate correct signature', () => {
      const correctSignature = generateSignature(orderId, paymentId, secret);

      const result = validateRazorpayPaymentSignature(
        orderId,
        paymentId,
        correctSignature,
        secret
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject incorrect signature', () => {
      const wrongSignature = 'incorrect_signature_value';

      const result = validateRazorpayPaymentSignature(
        orderId,
        paymentId,
        wrongSignature,
        secret
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeUndefined();
    });

    test('should reject when parameters are missing', () => {
      const result = validateRazorpayPaymentSignature(
        '',
        paymentId,
        'signature',
        secret
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required parameters');
    });
  });

  describe('verifyPaymentDataCompleteness', () => {
    test('should validate complete payment data', () => {
      const data = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test456',
        razorpay_signature: 'a'.repeat(64)
      };

      const result = verifyPaymentDataCompleteness(data);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid order ID format', () => {
      const data = {
        razorpay_order_id: 'invalid_id',
        razorpay_payment_id: 'pay_test456',
        razorpay_signature: 'a'.repeat(64)
      };

      const result = verifyPaymentDataCompleteness(data);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid Razorpay order ID format');
    });

    test('should reject invalid signature length', () => {
      const data = {
        razorpay_order_id: 'order_test123',
        razorpay_payment_id: 'pay_test456',
        razorpay_signature: 'short'
      };

      const result = verifyPaymentDataCompleteness(data);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });
  });

  describe('Currency Conversion', () => {
    test('convertToPaise should convert rupees to paise', () => {
      expect(convertToPaise(1)).toBe(100);
      expect(convertToPaise(10)).toBe(1000);
      expect(convertToPaise(99.99)).toBe(9999);
      expect(convertToPaise(0.01)).toBe(1);
    });

    test('convertToRupees should convert paise to rupees', () => {
      expect(convertToRupees(100)).toBe(1);
      expect(convertToRupees(1000)).toBe(10);
      expect(convertToRupees(9999)).toBe(99.99);
      expect(convertToRupees(1)).toBe(0.01);
    });

    test('should handle edge cases', () => {
      expect(() => convertToPaise(-10)).toThrow('cannot be negative');
      expect(() => convertToPaise(NaN)).toThrow('must be a valid number');
      expect(() => convertToRupees(-100)).toThrow('cannot be negative');
    });
  });
});
```

### Run Tests

```bash
# Install test dependencies
npm install --save-dev jest supertest

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test razorpayUtils.test.js
```

---

## Integration Testing

### Test Complete Payment Flow

```javascript
// tests/integration/payment.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Order } = require('../../src/models/Order');
const { generateTestToken, createTestOrder } = require('../helpers');

describe('Payment Integration Tests', () => {
  let testToken;
  let testOrder;

  beforeEach(async () => {
    testToken = await generateTestToken();
    testOrder = await createTestOrder();
  });

  describe('POST /api/payment/create-order', () => {
    test('should create payment order successfully', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: 1000,
          currency: 'INR'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.razorpayOrderId).toMatch(/^order_/);
      expect(response.body.amount).toBe(100000); // in paise
    });

    test('should reject payment for non-existent order', async () => {
      const response = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: '507f1f77bcf86cd799439011', // fake ID
          amount: 1000,
          currency: 'INR'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payment/verify', () => {
    test('should verify valid payment', async () => {
      // Create Razorpay order first
      const createResponse = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: testOrder.totals.total,
          currency: 'INR'
        });

      const { razorpayOrderId } = createResponse.body;
      const paymentId = 'pay_test123456';

      // Generate valid signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

      // Verify payment
      const verifyResponse = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.verified).toBe(true);

      // Verify order status updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
      expect(updatedOrder.status).toBe('confirmed');
    });

    test('should reject invalid signature', async () => {
      const createResponse = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: testOrder._id.toString(),
          amount: testOrder.totals.total,
          currency: 'INR'
        });

      const { razorpayOrderId } = createResponse.body;

      const verifyResponse = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          orderId: testOrder._id.toString(),
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: 'pay_invalid',
          razorpay_signature: 'invalid_signature'
        });

      expect(verifyResponse.status).toBe(400);
      expect(verifyResponse.body.success).toBe(false);
    });
  });
});
```

---

## Manual Testing Checklist

### Pre-Testing Setup
- [ ] Environment variables configured
- [ ] Database running and connected
- [ ] Backend server running on port 5000
- [ ] Frontend app running (if testing full flow)
- [ ] Test user account created
- [ ] Test products in database

### Test Case 1: Successful Payment
**Steps:**
1. [ ] Create order with 1-2 products
2. [ ] Proceed to checkout
3. [ ] Select Razorpay payment
4. [ ] Use test card: 4111 1111 1111 1111
5. [ ] Complete payment
6. [ ] Verify success message shown
7. [ ] Check order status changed to 'confirmed'
8. [ ] Check payment status is 'paid'
9. [ ] Verify stock deducted from products
10. [ ] Verify cart cleared
11. [ ] Check SMS/email notification received

**Expected Result:** ✅ All steps complete successfully

---

### Test Case 2: Failed Payment
**Steps:**
1. [ ] Create order
2. [ ] Proceed to checkout
3. [ ] Use declined test card: 4000 0000 0000 0002
4. [ ] Payment should fail
5. [ ] Verify error message shown
6. [ ] Check order status changed to 'cancelled'
7. [ ] Check payment status is 'failed'
8. [ ] Verify stock NOT deducted
9. [ ] Verify cart still has items

**Expected Result:** ✅ Payment fails gracefully, no data corruption

---

### Test Case 3: Invalid Signature Attack
**Steps:**
1. [ ] Create order via API
2. [ ] Create Razorpay order via API
3. [ ] Manually call verify endpoint with wrong signature
4. [ ] Verify request is rejected
5. [ ] Check security log created
6. [ ] Verify order remains in 'placed' status
7. [ ] Verify stock not deducted

**Expected Result:** ✅ Attack detected and blocked

---

### Test Case 4: Duplicate Payment
**Steps:**
1. [ ] Complete successful payment
2. [ ] Try to verify same payment again
3. [ ] Should show "already paid" message
4. [ ] Verify no double stock deduction
5. [ ] Verify order totals correct

**Expected Result:** ✅ Duplicate prevented

---

### Test Case 5: Concurrent Payments
**Steps:**
1. [ ] Create multiple orders for same product
2. [ ] Process payments simultaneously
3. [ ] Only X payments should succeed (where X = available stock)
4. [ ] Remaining should fail with "insufficient stock"
5. [ ] Verify final stock count is correct

**Expected Result:** ✅ No overselling

---

## Monitoring and Debugging

### Check Logs

```bash
# View payment logs
tail -f logs/payment.log

# Search for specific payment
grep "pay_xxxxxxxxxxxxx" logs/payment.log

# View error logs only
grep "ERROR" logs/payment.log

# View signature verification logs
grep "Signature verification" logs/payment.log
```

### Common Log Patterns

**Successful Payment:**
```
✅ [PAYMENT SERVICE] Signature verified successfully
✅ [PAYMENT SERVICE] Payment processed and stock deducted successfully
✅ [AUDIT] Payment verification successful: { orderId: ..., userId: ... }
```

**Failed Signature:**
```
❌ [PAYMENT SERVICE] Signature verification failed
❌ [AUDIT] Payment verification failed: { orderId: ..., userId: ... }
```

**Configuration Error:**
```
❌ [PAYMENT SERVICE] Razorpay configuration invalid. Missing: RAZORPAY_KEY_SECRET
⚠️ [PAYMENT SERVICE] Payment features will be disabled
```

---

## Troubleshooting

### Issue: "Invalid signature" error
**Check:**
1. Verify RAZORPAY_KEY_SECRET is correct
2. Ensure using same mode (test/live) for keys
3. Check signature is from current payment attempt
4. Verify no extra whitespace in .env file

### Issue: Razorpay not configured
**Check:**
1. .env file exists
2. Variables are loaded (console.log on startup)
3. No typos in variable names
4. Server restarted after .env changes

### Issue: Payment succeeds but stock not deducted
**Check:**
1. Database transaction logs
2. Product IDs are correct
3. Variant matching logic (if using variants)
4. Stock value before/after payment

### Issue: Webhook not working
**Check:**
1. RAZORPAY_WEBHOOK_SECRET configured
2. Webhook URL registered in Razorpay dashboard
3. Server accessible from internet (use ngrok for local)
4. Webhook signature being verified

---

## Performance Testing

### Load Test with k6

```javascript
// payment-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s',
};

export default function () {
  const payload = JSON.stringify({
    orderId: '67567891234567890abcdef',
    amount: 1000,
    currency: 'INR'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TEST_TOKEN',
    },
  };

  const response = http.post(
    'http://localhost:5000/api/payment/create-order',
    payload,
    params
  );

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run:
```bash
k6 run payment-load-test.js
```

---

## Security Checklist

- [ ] Razorpay secrets not committed to git
- [ ] Using HTTPS in production
- [ ] Signature validation using timing-safe comparison
- [ ] All user inputs validated
- [ ] Sensitive data sanitized in logs
- [ ] Rate limiting enabled on payment endpoints
- [ ] Webhook signature validation enabled
- [ ] Database transactions used for payment processing
- [ ] Idempotency checks in place
- [ ] Error messages don't leak sensitive info

---

## Support

### Razorpay Support
- Dashboard: https://dashboard.razorpay.com
- Support: https://razorpay.com/support/
- Documentation: https://razorpay.com/docs/

### Test Mode
- All test payments are free
- No real money is charged
- Test data is separate from production

---

**Last Updated:** 2025-11-18
**Version:** 1.0
