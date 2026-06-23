# Agent 5: Merchant Cashback API - Quick Reference

## 🎯 Endpoints Overview

| Method | Endpoint | Purpose | Permission |
|--------|----------|---------|------------|
| GET | `/api/merchant/cashback/:id` | Get single cashback request | cashback:manage |
| POST | `/api/merchant/cashback` | Create cashback request | cashback:manage |
| PUT | `/api/merchant/cashback/:id/mark-paid` | Mark as paid | cashback:approve |
| POST | `/api/merchant/cashback/bulk-action` | Bulk approve/reject | cashback:approve |
| POST | `/api/merchant/cashback/export` | Export data | cashback:manage |
| GET | `/api/merchant/cashback/analytics` | Get analytics | cashback:manage |
| GET | `/api/merchant/cashback/pending-count` | Get pending count | cashback:manage |

---

## 📝 Quick Examples

### 1. Create Cashback
```bash
POST /api/merchant/cashback
{
  "orderId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439012",
  "amount": 62.50,
  "reason": "Customer loyalty reward"
}
```

### 2. Get Details
```bash
GET /api/merchant/cashback/507f1f77bcf86cd799439011
```

### 3. Bulk Approve
```bash
POST /api/merchant/cashback/bulk-action
{
  "action": "approve",
  "cashbackIds": ["id1", "id2", "id3"],
  "notes": "Verified customers"
}
```

### 4. Mark as Paid
```bash
PUT /api/merchant/cashback/507f1f77bcf86cd799439011/mark-paid
{
  "paymentMethod": "bank_transfer",
  "paymentReference": "TXN123456789"
}
```

### 5. Export Data
```bash
POST /api/merchant/cashback/export
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-17T23:59:59Z",
  "status": "paid",
  "format": "csv"
}
```

### 6. Get Analytics
```bash
GET /api/merchant/cashback/analytics?startDate=2025-11-01&endDate=2025-11-17
```

### 7. Get Pending Count
```bash
GET /api/merchant/cashback/pending-count
```

---

## 🔑 Status Flow

```
pending → under_review → approved → paid
                    ↓
                rejected
```

**Valid Transitions:**
- pending → approved
- pending → rejected
- pending → under_review
- under_review → approved
- under_review → rejected
- approved → paid

---

## 💳 Payment Methods

- `wallet` - Direct to customer wallet
- `bank_transfer` - Bank transfer via Razorpay (automated)
- `check` - Physical check

---

## 🚨 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## 📧 Notifications Sent

1. Request created → Customer
2. Request approved → Customer
3. Request rejected → Customer
4. Payment processed → Customer
5. Bulk actions → Each affected customer

---

## 🔒 Required Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## ⚡ Features

✅ Razorpay payout integration
✅ Email notifications (SendGrid)
✅ Audit trail logging
✅ MongoDB transactions (bulk ops)
✅ 5-minute caching (pending count)
✅ CSV/Excel export
✅ Risk assessment
✅ Permission-based access

---

## 📊 Cache Information

**Pending Count Cache:**
- Duration: 5 minutes
- Cleared on:
  - New request creation
  - Approve/reject actions
  - Mark as paid

---

## 🎯 Bulk Action Limits

- Max requests per action: **50**
- Action types: `approve`, `reject`
- Uses MongoDB transactions for atomicity

---

## 📁 Files Created

1. `src/routes/merchant/cashback.ts` - Route definitions
2. `src/controllers/merchant/cashbackController.ts` - Business logic
3. `src/services/razorpayService.ts` - Enhanced with payout function
4. `src/server.ts` - Updated with route registration
5. `AGENT_5_CASHBACK_ENDPOINTS_COMPLETE.md` - Full documentation
6. `AGENT_5_QUICK_REFERENCE.md` - This file

---

## 🔧 Environment Setup

```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourstore.com
```

---

## 🚀 Ready to Use!

All 7 endpoints are production-ready with:
- Full validation
- Error handling
- Notifications
- Audit trails
- Payment integration

Start the backend and test the endpoints! 🎉
