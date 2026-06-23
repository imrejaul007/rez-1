# Order Processing Quick Reference - Merchant Guide

## Quick Start

This guide helps merchants understand and use the enhanced order processing system with automatic inventory management, customer notifications, and document generation.

## Order Status Flow

```
placed → confirmed → preparing → ready → dispatched → delivered
  ↓         ↓          ↓          ↓         ↓
cancelled cancelled cancelled
```

## Status Update

### API Call

```http
PUT /api/merchant/orders/{orderId}/status
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Order confirmed, processing started",
  "notifyCustomer": true
}
```

### What Happens Automatically

#### When Status = "confirmed"

✅ **Inventory Deducted** - Stock automatically reduced for all items
✅ **Invoice Generated** - Professional PDF invoice created
✅ **Email Sent** - Customer receives order confirmation email with invoice
✅ **SMS Sent** - Customer receives SMS notification

**Example Response**:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "orderId": "673abc123",
    "orderNumber": "ORD17000012340001",
    "status": "confirmed",
    "invoiceUrl": "http://localhost:5000/uploads/invoices/invoice-ORD17000012340001-1699876543210.pdf"
  }
}
```

#### When Status = "preparing"

✅ **Packing Slip Generated** - Item checklist for warehouse
✅ **Notifications Sent** - Email + SMS to customer

#### When Status = "ready" or "dispatched"

✅ **Shipping Label Generated** - 4x6 label with barcode
✅ **Tracking Info Sent** - If tracking ID provided
✅ **Notifications Sent** - Email + SMS to customer

## Document Generation

### Get Invoice

**Endpoint**: `GET /api/merchant/orders/{orderId}/invoice`

**What You Get**:
- Professional PDF invoice
- Complete order details
- Tax breakdown
- Payment information
- Your business branding

**Auto-Generated**: When order is confirmed
**Can Regenerate**: Yes, anytime via this endpoint

### Get Shipping Label

**Endpoint**: `GET /api/merchant/orders/{orderId}/shipping-label`

**What You Get**:
- 4x6 inch shipping label (standard size)
- Barcode for scanning
- Shipping address
- Order number
- COD amount (if applicable)

**Auto-Generated**: When order is ready/dispatched
**Print Ready**: Yes, standard thermal printer size

### Get Packing Slip

**Endpoint**: `GET /api/merchant/orders/{orderId}/packing-slip`

**What You Get**:
- Item list (no prices)
- Quantities to pack
- Shipping address
- Special instructions
- Quality check section

**Auto-Generated**: When order is preparing

### Bulk Shipping Labels

**Endpoint**: `POST /api/merchant/orders/bulk-labels`

**Request**:
```json
{
  "orderIds": [
    "673abc123",
    "673def456",
    "673ghi789"
  ]
}
```

**What You Get**:
- Single PDF with all labels
- Multiple orders in one file
- Easy batch printing

## Customer Notifications

### Automatic Notifications

Every status change triggers:
1. **SMS** - Short, concise update
2. **Email** - Detailed update with links

### Notification Content by Status

| Status | SMS Message | Email Content |
|--------|------------|---------------|
| **confirmed** | "Your order #ORD123 from Store has been confirmed!" | Confirmation email with invoice download |
| **preparing** | "Your order #ORD123 is being prepared" | Preparation update with estimated time |
| **ready** | "Good news! Your order #ORD123 is ready!" | Ready for pickup/dispatch notification |
| **dispatched** | "Your order #ORD123 is out for delivery. Tracking: TRK456" | Dispatch email with tracking link |
| **delivered** | "Your order #ORD123 has been delivered. Thank you!" | Delivery confirmation with review request |
| **cancelled** | "Your order #ORD123 has been cancelled" | Cancellation notice with refund info |

### Disable Notifications

Set `notifyCustomer: false` in status update:

```json
{
  "status": "confirmed",
  "notifyCustomer": false
}
```

## Inventory Management

### Automatic Stock Deduction

**Trigger**: Order status changes to "confirmed"

**What Happens**:
1. System checks if enough stock available
2. If yes → Deducts quantity from each product
3. If no → **Rejects** the status change
4. Updates product availability if stock reaches zero

### Insufficient Stock Example

**Request**:
```json
{
  "status": "confirmed"
}
```

**Response** (if insufficient stock):
```json
{
  "success": false,
  "message": "Insufficient stock for product: Premium T-Shirt. Available: 3, Required: 5"
}
```

**Result**:
- ❌ Order status NOT changed
- ❌ NO inventory deducted
- ❌ NO invoice generated
- ℹ️ You need to adjust order quantity or restock

### Stock Validation

Before confirming orders, system validates:
- ✅ Product exists
- ✅ Sufficient stock available
- ✅ Product is active
- ✅ All items can be fulfilled

### Manual Stock Check

Not needed! System automatically validates before confirmation.

## Error Handling

### Common Scenarios

#### Scenario 1: Insufficient Stock

**Error**: "Insufficient stock for product: Blue Jeans"

**Solution**:
1. Check current stock in inventory
2. Either reduce order quantity OR
3. Restock the product
4. Try confirming again

#### Scenario 2: Invalid Status Transition

**Error**: "Cannot change status from delivered to preparing"

**Solution**: Status can only move forward in the flow. Check current status and use valid next status.

#### Scenario 3: Order Not Found

**Error**: "Order not found"

**Solution**: Verify order ID is correct

#### Scenario 4: Document Generation Failed

**Behavior**: Order is still confirmed, but document not generated

**Solution**: Use dedicated endpoint to regenerate:
- `/api/merchant/orders/{id}/invoice`
- `/api/merchant/orders/{id}/shipping-label`
- `/api/merchant/orders/{id}/packing-slip`

## Valid Status Transitions

| Current Status | Can Change To |
|---------------|---------------|
| placed | confirmed, cancelled |
| confirmed | preparing, cancelled |
| preparing | ready, cancelled |
| ready | dispatched, delivered |
| dispatched | delivered |
| delivered | (final state) |
| cancelled | (final state) |

## Best Practices

### Order Processing Workflow

1. **Receive Order** - Status: `placed`
   - Review order details
   - Check payment status

2. **Confirm Order** - Change to: `confirmed`
   - System validates stock
   - Inventory auto-deducted
   - Invoice generated
   - Customer notified

3. **Prepare Order** - Change to: `preparing`
   - Print packing slip
   - Pick items from warehouse
   - Quality check

4. **Ready for Dispatch** - Change to: `ready`
   - Print shipping label
   - Package the order
   - Hand to delivery partner

5. **Dispatch Order** - Change to: `dispatched`
   - Enter tracking ID
   - Customer gets tracking info
   - Monitor delivery

6. **Complete Order** - Change to: `delivered`
   - Order fulfilled
   - Request customer review

### Tips for Efficient Processing

✅ **Confirm orders promptly** - Inventory is locked after confirmation
✅ **Print labels in batch** - Use bulk label endpoint for multiple orders
✅ **Add tracking IDs** - Customers appreciate transparency
✅ **Use notes field** - Document any special handling
✅ **Monitor notifications** - Ensure customers stay informed

## Document Access

### Where Documents Are Stored

All generated PDFs are stored in:
```
/uploads/
  ├── invoices/          (Invoices)
  ├── labels/            (Shipping labels)
  └── packing-slips/     (Packing slips)
```

### Document URLs

Format: `{PUBLIC_URL}/uploads/{type}/{filename}`

Example:
```
http://localhost:5000/uploads/invoices/invoice-ORD17000012340001-1699876543210.pdf
```

### Document Retention

Documents are permanently stored. Consider implementing cleanup policy for old documents (future enhancement).

## API Quick Reference

### Update Order Status
```
PUT /api/merchant/orders/{orderId}/status
Body: { "status": "confirmed", "notifyCustomer": true }
```

### Get Invoice
```
GET /api/merchant/orders/{orderId}/invoice
```

### Get Shipping Label
```
GET /api/merchant/orders/{orderId}/shipping-label
```

### Get Packing Slip
```
GET /api/merchant/orders/{orderId}/packing-slip
```

### Bulk Labels
```
POST /api/merchant/orders/bulk-labels
Body: { "orderIds": ["id1", "id2"] }
```

### Get Order Details
```
GET /api/merchant/orders/{orderId}
```

### List All Orders
```
GET /api/merchant/orders?status=confirmed&page=1&limit=20
```

## Troubleshooting

### Issue: Customer not receiving notifications

**Check**:
1. Is `notifyCustomer` set to `true`?
2. Is customer email/phone valid?
3. Check server logs for notification errors

**Note**: Notification failures don't affect order processing

### Issue: Invoice not generating

**Check**:
1. Is order status at least "confirmed"?
2. Check file permissions on server
3. Use dedicated endpoint to regenerate

### Issue: Cannot confirm order

**Common Causes**:
1. Insufficient stock
2. Invalid status transition
3. Product not found

**Check Response**: Error message will indicate exact reason

### Issue: Barcode not on label

**Cause**: Barcode generation failed (non-critical)

**Solution**: Label is still usable, order number is printed as text

## Support

For technical issues:
1. Check error message in API response
2. Review server logs
3. Verify API authentication token
4. Ensure all required fields are provided

## System Requirements

- Valid merchant authentication token
- Active internet connection for notifications
- Modern browser for viewing PDFs
- Thermal printer for shipping labels (recommended)

## Summary - What Happens When

| Action | Inventory | Documents | Notifications |
|--------|-----------|-----------|---------------|
| Confirm order | ✅ Deducted | ✅ Invoice | ✅ Email + SMS |
| Prepare order | - | ✅ Packing slip | ✅ Email + SMS |
| Ready/Dispatch | - | ✅ Shipping label | ✅ Email + SMS |
| Deliver order | - | - | ✅ Email + SMS |
| Cancel order | ⚠️ Not released* | - | ✅ Email + SMS |

*Inventory release on cancellation planned for future version

## Quick Decision Tree

```
Do you want to process this order?
│
├─ YES → Confirm order (status: confirmed)
│  ├─ Enough stock? → ✅ Order confirmed, inventory deducted
│  └─ Not enough? → ❌ Error, restock needed
│
└─ NO → Cancel order (status: cancelled)
   └─ Cancellation notification sent
```

---

**Need Help?** Check the full implementation guide: `WEEK5_PHASE3A_ORDER_ENHANCEMENTS.md`
