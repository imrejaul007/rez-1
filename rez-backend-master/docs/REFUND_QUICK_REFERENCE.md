# Refund Workflow - Quick Reference Guide

**Last Updated**: 2025-11-18

---

## Current Endpoints

### Merchant Endpoints (Already Implemented)

#### 1. Process Refund
```
POST /api/merchant/orders/:id/refund
Authorization: Bearer <merchant-token>

Request Body:
{
  "amount": 500,           // Required: Refund amount in ₹
  "reason": "string",      // Required: Refund reason
  "refundItems": [         // Optional: For partial refunds
    {
      "itemId": "ObjectId",
      "quantity": 2
    }
  ],
  "notifyCustomer": true   // Optional: Default true
}

Response:
{
  "success": true,
  "data": {
    "refundId": "rfnd_abc123",
    "status": "processed",
    "amount": 500,
    "orderNumber": "ORD123",
    "refundType": "partial",
    "estimatedArrival": "2025-11-25T00:00:00Z",
    "remainingRefundableAmount": 500
  }
}
```

### User Endpoints (To Be Implemented)

#### 2. Request Refund
```
POST /api/orders/:orderId/refund-request
Authorization: Bearer <user-token>

Request Body:
{
  "reason": "Product damaged",
  "refundItems": [        // Optional: For partial refunds
    {
      "itemId": "ObjectId",
      "quantity": 1
    }
  ]
}
```

#### 3. Get Refund History
```
GET /api/orders/refunds?status=completed&page=1&limit=20
Authorization: Bearer <user-token>
```

#### 4. Get Refund Details
```
GET /api/orders/refunds/:refundId
Authorization: Bearer <user-token>
```

---

## Refund Methods by Payment Gateway

### 1. Razorpay Refunds (Implemented ✅)

**File**: `src/services/PaymentService.ts` (Line 420)

**Flow**:
1. Validate order payment status
2. Calculate refund amount
3. Call Razorpay API: `razorpay.payments.refund()`
4. Update order status
5. Send SMS notification

**Supported**:
- ✅ Full refund
- ✅ Partial refund
- ✅ Automatic status updates
- ✅ Stock restoration
- ✅ SMS notifications

**Time**: 5-7 business days

---

### 2. Stripe Refunds (To Be Implemented ❌)

**File**: `src/services/stripeService.ts`

**Methods to Add**:
```typescript
createRefund(paymentIntentId, amount?, reason?)
getRefundStatus(refundId)
cancelRefund(refundId)
```

**Flow**:
1. Validate payment intent
2. Call Stripe API: `stripe.refunds.create()`
3. Update order status
4. Send notifications

**Time**: 5-10 business days

---

### 3. Wallet Refunds (To Be Implemented ❌)

**File**: `src/services/PaymentService.ts`

**Logic**:
```typescript
case 'wallet': {
  await walletService.addBalance({
    userId: user._id,
    amount: refundAmount,
    type: 'refund',
    description: 'Refund for order XXX'
  });
}
```

**Time**: Instant

---

### 4. COD Refunds (Manual Process ⚠️)

**Status**: Requires manual bank transfer

**Flow**:
1. Mark refund as `pending_manual_processing`
2. Notify admin
3. Admin processes bank transfer
4. Admin marks refund as complete

**Time**: 3-5 business days

---

## Refund Status States

```
PENDING          → Refund requested, awaiting processing
PROCESSING       → Refund being processed by gateway
COMPLETED        → Refund successful, money credited
FAILED           → Refund failed, retry or manual intervention
CANCELLED        → Refund request cancelled
```

---

## Validation Rules

### Order Eligibility
- ✅ Payment status must be `paid`
- ✅ Order status: `delivered` or `cancelled`
- ✅ Not already fully refunded
- ✅ Within refund window (7 days for delivered)

### Amount Validation
- ✅ Refund amount ≤ (Paid Amount - Already Refunded Amount)
- ✅ Refund amount > 0
- ✅ For partial: Sum of item refunds ≤ Total

### Stock Restoration
- ✅ Restore stock for full refunds
- ✅ Restore stock for partial refunds (specified items)
- ✅ Handle variant stock separately
- ✅ Set product as available if stock > 0

---

## Database Schema

### Order Model Refund Fields

```typescript
payment: {
  status: 'refunded' | 'partially_refunded',
  refundId: string,
  refundedAt: Date
}

totals: {
  refundAmount: number  // Cumulative refund amount
}

timeline: [{
  status: 'refund_processed',
  message: string,
  timestamp: Date,
  metadata: {
    refundAmount: number,
    razorpayRefundId: string,
    reason: string
  }
}]
```

### Refund Model (To Be Created)

```typescript
{
  order: ObjectId,
  user: ObjectId,
  orderNumber: string,
  paymentMethod: 'razorpay' | 'stripe' | 'wallet' | 'cod',
  refundAmount: number,
  refundType: 'full' | 'partial',
  refundReason: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  gatewayRefundId: string,
  requestedAt: Date,
  completedAt: Date,
  estimatedArrival: Date
}
```

---

## Notification Templates

### SMS Notification (Implemented ✅)
```
Refund of ₹{amount} for order #{orderNumber} has been processed.
It will reflect in your account within 5-7 business days.
```

### Email Notification (To Be Implemented ❌)
**Subject**: `Refund Processed for Order {orderNumber}`

**Content**:
- Order details
- Refund amount
- Refund method
- Estimated arrival
- What's next section

---

## Error Handling

### Common Errors

```typescript
// Order not found
{ code: 404, message: 'Order not found' }

// Already refunded
{ code: 409, message: 'Order is already fully refunded' }

// Unpaid order
{ code: 400, message: 'Cannot refund unpaid order' }

// Amount exceeds limit
{ code: 422, message: 'Refund amount exceeds eligible amount' }

// Gateway error
{ code: 500, message: 'Razorpay refund failed: {error}' }

// Out of refund window
{ code: 400, message: 'Refund window has expired (7 days)' }
```

### Transaction Safety
- All refunds use MongoDB transactions
- Automatic rollback on failure
- Stock restoration atomic with refund

---

## Testing Commands

### Test Razorpay Refund
```bash
curl -X POST http://localhost:5000/api/merchant/orders/:orderId/refund \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "reason": "Test refund",
    "notifyCustomer": true
  }'
```

### Test Partial Refund
```bash
curl -X POST http://localhost:5000/api/merchant/orders/:orderId/refund \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "reason": "Partial refund test",
    "refundItems": [
      {
        "itemId": "ITEM_ID",
        "quantity": 1
      }
    ]
  }'
```

---

## Monitoring & Logging

### Key Logs to Monitor

```typescript
// Refund initiated
'💰 [REFUND] Processing refund: { orderId, amount, reason }'

// Razorpay refund created
'✅ [REFUND] Razorpay refund created: { refundId, status }'

// Stock restored
'✅ [REFUND] Restored {quantity} units for product {productId}'

// Notification sent
'✅ [REFUND] Refund notifications sent successfully'

// Error
'❌ [REFUND] Error: {error.message}'
```

### Database Queries for Monitoring

```typescript
// Today's refunds
db.orders.find({
  'payment.refundedAt': {
    $gte: new Date('2025-11-18T00:00:00Z')
  }
})

// Pending refunds
db.refunds.find({ status: 'pending' })

// Failed refunds
db.refunds.find({ status: 'failed' })

// Total refunds this month
db.orders.aggregate([
  {
    $match: {
      'payment.refundedAt': {
        $gte: new Date('2025-11-01T00:00:00Z')
      }
    }
  },
  {
    $group: {
      _id: null,
      totalRefunded: { $sum: '$totals.refundAmount' },
      count: { $sum: 1 }
    }
  }
])
```

---

## Admin Actions

### Manual Refund Process (COD)

1. **Locate Order**
   ```typescript
   const order = await Order.findOne({ orderNumber: 'ORD123' });
   ```

2. **Verify Eligibility**
   - Check payment status
   - Check refund amount
   - Check already refunded amount

3. **Process Bank Transfer**
   - Get user bank details
   - Initiate transfer
   - Note transaction ID

4. **Update Order**
   ```typescript
   order.payment.status = 'refunded';
   order.payment.refundId = 'manual_txn_123';
   order.payment.refundedAt = new Date();
   order.totals.refundAmount = amount;
   await order.save();
   ```

5. **Notify Customer**
   ```typescript
   await SMSService.sendRefundNotification(phone, orderNumber, amount);
   ```

---

## Performance Considerations

### Database Indexes (Already Implemented)
```typescript
Order.index({ 'payment.status': 1 })
Order.index({ user: 1, 'payment.refundedAt': -1 })
```

### Indexes to Add (For Refund Model)
```typescript
Refund.index({ user: 1, createdAt: -1 })
Refund.index({ order: 1 })
Refund.index({ status: 1, createdAt: -1 })
Refund.index({ gatewayRefundId: 1 }, { sparse: true })
```

### Query Optimization
- Use `.lean()` for read-only queries
- Populate only required fields
- Limit refund history to 20-50 records per page

---

## Security Considerations

### Authorization
- ✅ Merchants can only refund orders from their stores
- ✅ Users can only view their own refunds
- ✅ Refund endpoints require authentication

### Validation
- ✅ Amount validation (can't exceed paid amount)
- ✅ Status validation (can't refund unpaid orders)
- ✅ Double refund prevention

### Audit Trail
- ✅ All refunds logged in order timeline
- ⚠️ Separate refund model recommended for audit
- ✅ Gateway refund ID stored
- ✅ Reason and metadata tracked

---

## Common Issues & Solutions

### Issue 1: Razorpay Refund Failed
**Error**: `Payment not found` or `Invalid payment ID`

**Solution**:
- Verify `order.payment.transactionId` exists
- Check Razorpay dashboard for payment
- Ensure payment was captured, not just authorized

---

### Issue 2: Stock Not Restored
**Error**: Silent failure

**Solution**:
- Check transaction commit status
- Verify product still exists
- Check variant matching logic
- Review console logs for stock restoration

---

### Issue 3: Multiple Partial Refunds Exceed Total
**Error**: Validation fails

**Solution**:
```typescript
const maxRefundAmount = order.totals.paidAmount - (order.totals.refundAmount || 0);
if (amount > maxRefundAmount) {
  throw new Error('Refund amount exceeds eligible amount');
}
```

---

### Issue 4: Notification Not Sent
**Error**: SMS/Email fails silently

**Solution**:
- Check Twilio configuration
- Verify phone number format (+91...)
- Check email service configuration
- Review notification error logs

---

## Refund Processing Time

| Payment Method | Processing Time | Typical Arrival |
|----------------|----------------|-----------------|
| Razorpay | Instant | 5-7 business days |
| Stripe | 1-2 hours | 5-10 business days |
| Wallet | Instant | Immediate |
| COD (Manual) | 1-2 days | 3-5 business days |

---

## Next Steps

### Immediate (This Week)
1. Implement Stripe refund methods
2. Implement wallet refund logic
3. Create Refund model
4. Add user refund endpoints

### Short Term (Next 2 Weeks)
5. Add email refund notifications
6. Implement refund queue service
7. Add admin refund dashboard
8. Comprehensive testing

### Long Term (Next Month)
9. Automated refund approval rules
10. Refund analytics & reporting
11. Refund fraud detection
12. Multi-currency refund support

---

## Support & Documentation

**Main Documentation**: `REFUND_WORKFLOW_IMPLEMENTATION.md`

**Related Files**:
- `src/services/PaymentService.ts` - Razorpay refund logic
- `src/services/razorpayService.ts` - Razorpay API wrapper
- `src/controllers/merchant/orderController.ts` - Merchant refund endpoint
- `src/models/Order.ts` - Order schema with refund fields
- `src/services/SMSService.ts` - Refund notifications

**External Documentation**:
- [Razorpay Refunds API](https://razorpay.com/docs/api/refunds/)
- [Stripe Refunds API](https://stripe.com/docs/api/refunds)

---

**Version**: 1.0
**Maintainer**: Backend Team
**Last Review**: 2025-11-18
