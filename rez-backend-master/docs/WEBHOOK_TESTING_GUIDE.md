# Webhook Testing Guide

This guide provides comprehensive instructions for testing payment webhooks from Razorpay and Stripe in both development and production environments.

## Table of Contents

1. [Webhook Endpoints](#webhook-endpoints)
2. [Environment Setup](#environment-setup)
3. [Razorpay Webhook Testing](#razorpay-webhook-testing)
4. [Stripe Webhook Testing](#stripe-webhook-testing)
5. [Local Testing with ngrok](#local-testing-with-ngrok)
6. [Webhook Event Types](#webhook-event-types)
7. [Security Measures](#security-measures)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring and Logs](#monitoring-and-logs)

---

## Webhook Endpoints

Your backend exposes the following webhook endpoints:

- **Razorpay**: `POST /api/webhooks/razorpay`
- **Stripe**: `POST /api/webhooks/stripe`

Both endpoints are publicly accessible (no authentication required) but are protected by signature verification.

---

## Environment Setup

### 1. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 2. Get Webhook Secrets

#### Razorpay:
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Create a new webhook
4. Copy the **Webhook Secret**

#### Stripe:
1. Login to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers** → **Webhooks**
3. Add endpoint
4. Reveal and copy the **Signing secret**

---

## Razorpay Webhook Testing

### Method 1: Using Razorpay Dashboard (Production/Test Mode)

1. **Setup Webhook in Dashboard:**
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Click "Create Webhook"
   - Enter your webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
   - Select events to subscribe to:
     - `payment.captured`
     - `payment.failed`
     - `payment.authorized`
     - `order.paid`
     - `refund.created`
     - `refund.processed`
     - `refund.failed`
   - Copy the Webhook Secret and add to `.env`

2. **Trigger Test Webhooks:**
   - In the webhook settings, use the "Test Webhook" button
   - Select an event type
   - Click "Send Test Webhook"

### Method 2: Using Razorpay CLI (Local Testing)

```bash
# Install Razorpay CLI
npm install -g razorpay-webhook-cli

# Forward webhooks to local server
razorpay-webhook-cli forward --secret your_webhook_secret --url http://localhost:5001/api/webhooks/razorpay
```

### Method 3: Manual Testing with cURL

```bash
# Test payment.captured event
curl -X POST http://localhost:5001/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <signature>" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test123",
          "amount": 50000,
          "currency": "INR",
          "status": "captured",
          "method": "card",
          "created_at": 1234567890,
          "notes": {
            "orderId": "your_order_id_here",
            "userId": "your_user_id_here"
          }
        }
      }
    }
  }'
```

**Note:** You need to generate a valid signature using your webhook secret.

---

## Stripe Webhook Testing

### Method 1: Using Stripe CLI (Recommended for Local Testing)

1. **Install Stripe CLI:**
   ```bash
   # Windows (using Scoop)
   scoop install stripe

   # macOS (using Homebrew)
   brew install stripe/stripe-cli/stripe

   # Linux
   wget https://github.com/stripe/stripe-cli/releases/download/vX.X.X/stripe_X.X.X_linux_x86_64.tar.gz
   tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server:**
   ```bash
   stripe listen --forward-to localhost:5001/api/webhooks/stripe
   ```

   This will output a webhook signing secret (starts with `whsec_`). Add it to your `.env` file.

4. **Trigger test events:**
   ```bash
   # Trigger payment_intent.succeeded event
   stripe trigger payment_intent.succeeded

   # Trigger payment_intent.payment_failed event
   stripe trigger payment_intent.payment_failed

   # Trigger charge.refunded event
   stripe trigger charge.refunded
   ```

### Method 2: Using Stripe Dashboard

1. **Setup Webhook in Dashboard:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.refunded`
     - `checkout.session.completed`

2. **Send Test Webhook:**
   - Click on the webhook endpoint
   - Click "Send test webhook"
   - Select event type and click "Send test webhook"

### Method 3: Manual Testing with cURL

```bash
# Test payment_intent.succeeded event
curl -X POST http://localhost:5001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: <signature>" \
  -d '{
    "id": "evt_test123",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test123",
        "amount": 5000,
        "currency": "inr",
        "status": "succeeded",
        "metadata": {
          "orderId": "your_order_id_here"
        }
      }
    }
  }'
```

---

## Local Testing with ngrok

For testing webhooks on your local machine with external payment gateways:

### 1. Install ngrok

```bash
# Download from https://ngrok.com/download
# Or use package manager

# Windows (using Chocolatey)
choco install ngrok

# macOS (using Homebrew)
brew install ngrok

# Linux (using snap)
snap install ngrok
```

### 2. Start ngrok tunnel

```bash
# Start your backend server first
npm run dev

# In a new terminal, start ngrok
ngrok http 5001
```

### 3. Use ngrok URL for webhooks

ngrok will provide a public URL like: `https://abc123.ngrok.io`

Update your webhook URLs in payment gateway dashboards:
- **Razorpay**: `https://abc123.ngrok.io/api/webhooks/razorpay`
- **Stripe**: `https://abc123.ngrok.io/api/webhooks/stripe`

### 4. Monitor webhook requests

Visit ngrok's web interface at `http://127.0.0.1:4040` to see all webhook requests in real-time.

---

## Webhook Event Types

### Razorpay Events

| Event Type | Description | Handler Status |
|------------|-------------|----------------|
| `payment.captured` | Payment successfully captured | ✅ Implemented |
| `payment.failed` | Payment failed | ✅ Implemented |
| `payment.authorized` | Payment authorized (pending capture) | ✅ Implemented |
| `order.paid` | Order marked as paid | ✅ Implemented |
| `refund.created` | Refund initiated | ✅ Implemented |
| `refund.processed` | Refund completed | ✅ Implemented |
| `refund.failed` | Refund failed | ✅ Implemented |

### Stripe Events

| Event Type | Description | Handler Status |
|------------|-------------|----------------|
| `payment_intent.succeeded` | Payment completed successfully | ✅ Implemented |
| `payment_intent.payment_failed` | Payment failed | ✅ Implemented |
| `payment_intent.created` | Payment intent created | ✅ Implemented |
| `payment_intent.canceled` | Payment intent canceled | ✅ Implemented |
| `charge.refunded` | Charge refunded | ✅ Implemented |
| `checkout.session.completed` | Checkout session completed | ✅ Implemented |

---

## Security Measures

### 1. Signature Verification

Both Razorpay and Stripe webhooks are verified using cryptographic signatures:

**Razorpay:**
```typescript
// Signature verification using HMAC SHA256
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(webhookBody)
  .digest('hex');
```

**Stripe:**
```typescript
// Signature verification using Stripe SDK
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

### 2. Idempotency

All webhook events are logged in the database with unique event IDs:

- Duplicate events are detected and ignored
- Prevents double-processing of payments
- Event logs are stored for 90 days

### 3. Error Handling

- Invalid signatures return `401 Unauthorized`
- Processing errors return `200 OK` to prevent retries
- All events are logged for debugging

---

## Troubleshooting

### Webhook Not Received

**Check:**
1. Webhook URL is correct and accessible
2. Firewall allows incoming webhooks
3. SSL certificate is valid (for HTTPS)
4. Server is running and not returning errors

**Logs to check:**
```bash
# Check server logs
tail -f logs/app.log

# Check webhook logs in database
# MongoDB query:
db.webhooklogs.find().sort({createdAt: -1}).limit(10)
```

### Signature Verification Failed

**Common causes:**
1. Wrong webhook secret in `.env`
2. Webhook secret not matching gateway settings
3. Request body modified before verification
4. Using wrong endpoint (Razorpay URL for Stripe webhook)

**Debug steps:**
```bash
# Check environment variables
echo $RAZORPAY_WEBHOOK_SECRET
echo $STRIPE_WEBHOOK_SECRET

# Verify webhook secret in payment gateway dashboard
# Re-generate webhook secret if needed
```

### Event Not Processing

**Check:**
1. Event type is supported (see tables above)
2. Order ID exists in database
3. Payment not already processed
4. No errors in webhook handler

**View webhook logs:**
```bash
# Get recent webhook events
GET /api/webhooks/logs?limit=20

# Get failed webhooks
GET /api/webhooks/logs?status=failed

# Get webhook statistics
GET /api/webhooks/stats
```

### Duplicate Events

**Normal behavior:**
- Payment gateways may send duplicate webhooks
- Our system detects and ignores duplicates
- First event is processed, subsequent events return `200 OK` with "duplicate" status

---

## Monitoring and Logs

### 1. Database Logs

All webhook events are stored in `webhooklogs` collection:

```javascript
// MongoDB query examples
// Get all Razorpay webhooks
db.webhooklogs.find({ provider: 'razorpay' })

// Get failed webhooks
db.webhooklogs.find({ status: 'failed' })

// Get webhooks for specific order
db.webhooklogs.find({ 'metadata.orderId': 'order_id_here' })

// Get webhook statistics
db.webhooklogs.aggregate([
  { $group: {
    _id: '$status',
    count: { $sum: 1 }
  }}
])
```

### 2. Application Logs

Check application logs for webhook processing:

```bash
# View logs
tail -f logs/app.log | grep WEBHOOK

# Filter by provider
tail -f logs/app.log | grep "RAZORPAY WEBHOOK"
tail -f logs/app.log | grep "STRIPE WEBHOOK"
```

### 3. Webhook Statistics API

Get webhook statistics programmatically:

```bash
# Get overall stats
GET /api/webhooks/stats

# Get Razorpay stats
GET /api/webhooks/stats?provider=razorpay

# Get stats for date range
GET /api/webhooks/stats?startDate=2024-01-01&endDate=2024-12-31
```

### 4. Real-time Monitoring

Use ngrok's web interface or payment gateway dashboards to monitor webhooks in real-time:

- **ngrok**: `http://127.0.0.1:4040`
- **Razorpay**: Dashboard → Webhooks → Click webhook → View Logs
- **Stripe**: Dashboard → Developers → Webhooks → Click endpoint → View Events

---

## Production Checklist

Before going live, ensure:

- [ ] Webhook URLs use HTTPS (SSL certificate installed)
- [ ] Webhook secrets are production secrets (not test)
- [ ] Firewall allows incoming webhook requests
- [ ] Error monitoring is set up (Sentry, New Relic, etc.)
- [ ] Database backups are configured
- [ ] Webhook logs are monitored regularly
- [ ] Payment gateway webhooks are active
- [ ] Test at least one successful payment
- [ ] Test at least one failed payment
- [ ] Test at least one refund

---

## Testing Workflow

### Complete Test Scenario

1. **Create a test order:**
   ```bash
   POST /api/orders
   # Save the order ID
   ```

2. **Create payment:**
   ```bash
   POST /api/payment/create-order
   # Note the razorpay_order_id
   ```

3. **Complete payment** (via Razorpay checkout or test API)

4. **Webhook should be received automatically**

5. **Verify:**
   - Check webhook log in database
   - Check order status updated to "confirmed"
   - Check payment status updated to "paid"
   - Check stock deducted

### Manual Webhook Testing

1. **Find an existing order ID** from your database

2. **Update the test webhook payload** with correct order ID

3. **Generate valid signature:**
   ```javascript
   const crypto = require('crypto');
   const webhookBody = JSON.stringify(payload);
   const signature = crypto
     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
     .update(webhookBody)
     .digest('hex');
   ```

4. **Send webhook request** with generated signature

5. **Check logs** to verify processing

---

## Support and Resources

### Razorpay Resources
- [Webhook Documentation](https://razorpay.com/docs/webhooks/)
- [Test Webhooks](https://razorpay.com/docs/webhooks/test/)
- [Webhook Events](https://razorpay.com/docs/webhooks/events/)

### Stripe Resources
- [Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

### Need Help?

- Check application logs
- Check webhook logs in database
- Review error messages
- Contact payment gateway support
- Review this guide's troubleshooting section

---

## Appendix: Signature Generation Examples

### Generate Razorpay Signature (Node.js)

```javascript
const crypto = require('crypto');

function generateRazorpaySignature(webhookBody, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(webhookBody)
    .digest('hex');
}

// Example usage
const payload = { event: 'payment.captured', payload: {...} };
const webhookBody = JSON.stringify(payload);
const signature = generateRazorpaySignature(webhookBody, 'your_webhook_secret');

console.log('X-Razorpay-Signature:', signature);
```

### Generate Stripe Signature (Use Stripe CLI)

Stripe signatures are complex and time-based. Use Stripe CLI for testing:

```bash
stripe trigger payment_intent.succeeded
```

Or use Stripe's webhook testing in the dashboard.

---

## Version History

- **v1.0.0** (2025-01-18): Initial webhook implementation
  - Razorpay webhook handler
  - Stripe webhook handler
  - Idempotency handling
  - Comprehensive logging
  - Security measures

---

**Last Updated:** 2025-01-18
