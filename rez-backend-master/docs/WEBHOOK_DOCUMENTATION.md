# Webhook Documentation

## Overview

Webhooks allow your application to receive real-time notifications when events occur in the REZ Merchant system.

**Status:** 🚧 Coming Soon (Phase 7)

## Webhook Events

### Order Events

#### order.created
Triggered when a new order is placed.

**Payload:**
```json
{
  "event": "order.created",
  "timestamp": "2025-01-17T10:30:00Z",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-2025-001",
    "customerId": "507f1f77bcf86cd799439012",
    "total": 129.99,
    "status": "pending",
    "items": [
      {
        "productId": "507f1f77bcf86cd799439013",
        "productName": "Product Name",
        "quantity": 2,
        "price": 49.99
      }
    ]
  }
}
```

#### order.updated
Triggered when order status changes.

**Payload:**
```json
{
  "event": "order.updated",
  "timestamp": "2025-01-17T10:35:00Z",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-2025-001",
    "previousStatus": "pending",
    "newStatus": "confirmed",
    "updatedBy": "507f1f77bcf86cd799439014"
  }
}
```

#### order.cancelled
Triggered when an order is cancelled.

**Payload:**
```json
{
  "event": "order.cancelled",
  "timestamp": "2025-01-17T11:00:00Z",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-2025-001",
    "reason": "Customer request",
    "refundAmount": 129.99,
    "cancelledBy": "507f1f77bcf86cd799439014"
  }
}
```

### Product Events

#### product.out_of_stock
Triggered when product inventory reaches zero.

**Payload:**
```json
{
  "event": "product.out_of_stock",
  "timestamp": "2025-01-17T12:00:00Z",
  "data": {
    "productId": "507f1f77bcf86cd799439013",
    "productName": "Product Name",
    "sku": "PROD-001",
    "lastSoldAt": "2025-01-17T11:55:00Z"
  }
}
```

#### product.low_stock
Triggered when inventory falls below threshold.

**Payload:**
```json
{
  "event": "product.low_stock",
  "timestamp": "2025-01-17T12:00:00Z",
  "data": {
    "productId": "507f1f77bcf86cd799439013",
    "productName": "Product Name",
    "sku": "PROD-001",
    "currentStock": 5,
    "threshold": 10
  }
}
```

### Payment Events

#### payment.received
Triggered when payment is confirmed.

**Payload:**
```json
{
  "event": "payment.received",
  "timestamp": "2025-01-17T10:32:00Z",
  "data": {
    "paymentId": "507f1f77bcf86cd799439015",
    "orderId": "507f1f77bcf86cd799439011",
    "amount": 129.99,
    "method": "credit_card",
    "status": "completed"
  }
}
```

#### payment.failed
Triggered when payment fails.

**Payload:**
```json
{
  "event": "payment.failed",
  "timestamp": "2025-01-17T10:32:00Z",
  "data": {
    "paymentId": "507f1f77bcf86cd799439015",
    "orderId": "507f1f77bcf86cd799439011",
    "amount": 129.99,
    "method": "credit_card",
    "reason": "Insufficient funds"
  }
}
```

### Review Events

#### review.created
Triggered when a customer posts a review.

**Payload:**
```json
{
  "event": "review.created",
  "timestamp": "2025-01-17T14:00:00Z",
  "data": {
    "reviewId": "507f1f77bcf86cd799439016",
    "productId": "507f1f77bcf86cd799439013",
    "customerId": "507f1f77bcf86cd799439012",
    "rating": 5,
    "comment": "Great product!",
    "verified": true
  }
}
```

### Team Events

#### team.member_added
Triggered when a team member joins.

**Payload:**
```json
{
  "event": "team.member_added",
  "timestamp": "2025-01-17T15:00:00Z",
  "data": {
    "userId": "507f1f77bcf86cd799439017",
    "email": "team@example.com",
    "name": "Team Member",
    "role": "staff",
    "invitedBy": "507f1f77bcf86cd799439014"
  }
}
```

### Audit Events

#### audit.critical_action
Triggered for critical actions requiring review.

**Payload:**
```json
{
  "event": "audit.critical_action",
  "timestamp": "2025-01-17T16:00:00Z",
  "data": {
    "action": "product:bulk_delete",
    "userId": "507f1f77bcf86cd799439014",
    "userName": "Admin User",
    "resourceCount": 50,
    "ipAddress": "192.168.1.1"
  }
}
```

## Webhook Configuration

### Creating a Webhook (Future API)

**Endpoint:** `POST /api/merchant/webhooks`

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/rez",
  "events": ["order.created", "order.updated", "payment.received"],
  "secret": "your-webhook-secret",
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webhookId": "507f1f77bcf86cd799439018",
    "url": "https://your-app.com/webhooks/rez",
    "events": ["order.created", "order.updated", "payment.received"],
    "secret": "whsec_...",
    "active": true,
    "createdAt": "2025-01-17T10:00:00Z"
  }
}
```

### Listing Webhooks

**Endpoint:** `GET /api/merchant/webhooks`

**Response:**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "webhookId": "507f1f77bcf86cd799439018",
        "url": "https://your-app.com/webhooks/rez",
        "events": ["order.created", "order.updated"],
        "active": true,
        "lastTriggered": "2025-01-17T15:30:00Z",
        "successRate": 98.5
      }
    ]
  }
}
```

### Updating a Webhook

**Endpoint:** `PUT /api/merchant/webhooks/:id`

**Request:**
```json
{
  "events": ["order.created", "order.updated", "order.cancelled"],
  "active": true
}
```

### Deleting a Webhook

**Endpoint:** `DELETE /api/merchant/webhooks/:id`

## Webhook Security

### Signature Verification

All webhook requests include an HMAC signature in the `X-Rez-Signature` header.

**Verify Signature (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhooks/rez', express.json(), (req, res) => {
  const signature = req.headers['x-rez-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, 'your-webhook-secret');

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log('Webhook event:', req.body.event);
  res.json({ received: true });
});
```

### IP Whitelist

Webhook requests will originate from these IP addresses:

```
Production:
- 52.12.34.56
- 52.12.34.57

Staging:
- 52.12.34.58
```

## Webhook Delivery

### Retry Policy

- **Initial attempt**: Immediate
- **1st retry**: After 1 minute
- **2nd retry**: After 5 minutes
- **3rd retry**: After 15 minutes
- **4th retry**: After 1 hour
- **5th retry**: After 6 hours
- **Final retry**: After 24 hours

### Success Criteria

- HTTP status code: 200-299
- Response within 10 seconds
- Valid JSON response (optional)

### Failure Handling

After all retries are exhausted:
1. Webhook marked as failed
2. Email notification sent to merchant
3. Event logged in audit trail
4. Webhook can be manually retried via dashboard

## Implementing a Webhook Receiver

### Express.js Example

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/rez', express.json(), async (req, res) => {
  try {
    // 1. Verify signature
    const signature = req.headers['x-rez-signature'];
    const isValid = verifyWebhookSignature(req.body, signature, process.env.WEBHOOK_SECRET);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Handle event
    const { event, data, timestamp } = req.body;

    switch (event) {
      case 'order.created':
        await handleNewOrder(data);
        break;

      case 'order.updated':
        await handleOrderUpdate(data);
        break;

      case 'payment.received':
        await handlePaymentReceived(data);
        break;

      case 'product.out_of_stock':
        await handleOutOfStock(data);
        break;

      default:
        console.log('Unhandled event:', event);
    }

    // 3. Return success
    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleNewOrder(data) {
  console.log('New order received:', data.orderNumber);
  // Send email notification
  // Update inventory
  // Trigger fulfillment process
}

async function handleOrderUpdate(data) {
  console.log('Order updated:', data.orderNumber, data.newStatus);
  // Update local database
  // Notify customer
}

async function handlePaymentReceived(data) {
  console.log('Payment received:', data.paymentId);
  // Confirm order
  // Start processing
}

async function handleOutOfStock(data) {
  console.log('Product out of stock:', data.productName);
  // Send alert to team
  // Trigger reorder workflow
}

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000');
});
```

### Idempotency

Handle duplicate webhook deliveries using idempotency:

```javascript
const processedEvents = new Set();

app.post('/webhooks/rez', express.json(), async (req, res) => {
  const eventId = req.headers['x-rez-event-id'];

  // Check if already processed
  if (processedEvents.has(eventId)) {
    console.log('Duplicate event, skipping:', eventId);
    return res.json({ received: true, duplicate: true });
  }

  // Process event
  await processWebhook(req.body);

  // Mark as processed
  processedEvents.add(eventId);

  res.json({ received: true });
});
```

## Testing Webhooks

### Development Environment

Use ngrok for local testing:

```bash
# Start ngrok
ngrok http 3000

# Configure webhook URL
https://abc123.ngrok.io/webhooks/rez
```

### Manual Testing

**Trigger Test Event:**
```bash
curl -X POST http://localhost:5001/api/merchant/webhooks/test \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": "507f1f77bcf86cd799439018",
    "event": "order.created"
  }'
```

### Webhook Logs

**View Delivery History:**
```bash
GET /api/merchant/webhooks/:id/deliveries
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "507f1f77bcf86cd799439019",
        "event": "order.created",
        "timestamp": "2025-01-17T10:30:00Z",
        "status": "success",
        "statusCode": 200,
        "duration": 125,
        "attempts": 1
      },
      {
        "id": "507f1f77bcf86cd79943901a",
        "event": "payment.received",
        "timestamp": "2025-01-17T10:32:00Z",
        "status": "failed",
        "statusCode": 500,
        "duration": 10000,
        "attempts": 3,
        "error": "Connection timeout"
      }
    ]
  }
}
```

## Best Practices

1. **Respond Quickly**
   - Return 200 immediately
   - Process webhook asynchronously

2. **Implement Idempotency**
   - Use event ID to track processed events
   - Handle duplicate deliveries gracefully

3. **Verify Signatures**
   - Always verify webhook signatures
   - Use timing-safe comparison

4. **Handle Failures Gracefully**
   - Log all webhook events
   - Implement error recovery
   - Monitor webhook health

5. **Secure Your Endpoint**
   - Use HTTPS only
   - Implement rate limiting
   - Whitelist IP addresses

6. **Monitor Performance**
   - Track success rates
   - Monitor response times
   - Set up alerts for failures

## Support

For webhook support:
- Email: webhooks@rezapp.com
- Documentation: https://docs.rezapp.com/webhooks
- Status: https://status.rezapp.com
