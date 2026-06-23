# Cashback Payment Integration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Configure Razorpay (Optional - Can Test Without)

**Option A: Test Without Razorpay (Simulation Mode)**
```bash
# Leave Razorpay credentials empty in .env
# System will simulate payouts - perfect for testing!
```

**Option B: Use Razorpay Test Mode**
1. Sign up at [razorpay.com](https://razorpay.com)
2. Get test credentials from Dashboard > Settings > API Keys
3. Update `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_test_secret
RAZORPAY_ACCOUNT_NUMBER=your_test_account_number
```

### Step 2: Restart Backend
```bash
cd user-backend
npm run dev
```

### Step 3: Test the API

**Test 1: Approve Cashback (Auto-Payout)**
```bash
PUT http://localhost:5000/api/cashback/:cashbackId/approve
Authorization: Bearer YOUR_MERCHANT_TOKEN
Content-Type: application/json

{
  "approvedAmount": 50.00,
  "notes": "Approved for payment"
}
```

**Expected Response (Simulation Mode):**
```json
{
  "success": true,
  "message": "Cashback approved and paid successfully",
  "data": {
    "id": "...",
    "status": "paid",
    "approvedAmount": 50.00,
    "payoutId": "simulated_1234567890",
    "paymentStatus": "processed"
  }
}
```

---

## 📋 API Endpoints

### 1. Approve Cashback (Auto-Payout)
```
PUT /api/cashback/:id/approve
```
- Approves cashback request
- **Automatically processes payout if bank details exist**
- Returns paid status on success

### 2. Manual Payment Processing
```
POST /api/cashback/:id/process-payment
```
- Manually trigger payment for approved cashback
- Accepts optional bank details in body
- Useful for retry scenarios

**Body:**
```json
{
  "bankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "John Doe"
  }
}
```

### 3. Check Payout Status
```
GET /api/cashback/:id/payout-status
```
- Get real-time payout status from Razorpay
- Returns current status and details

---

## 🧪 Testing Scenarios

### Scenario 1: Successful Auto-Payout
1. Create cashback with customer bank details
2. Approve cashback
3. Payment processes automatically
4. Status changes to 'paid'

### Scenario 2: Manual Payment
1. Create cashback without bank details
2. Approve cashback (status: 'approved')
3. Call process-payment with bank details
4. Payment processes
5. Status changes to 'paid'

### Scenario 3: Check Payment Status
1. Approve cashback (creates payout)
2. Call payout-status endpoint
3. Get current status from Razorpay

---

## 🔍 How to Check if It's Working

### Console Logs (Simulation Mode):
```
💰 [CASHBACK] Processing payout for cashback request: abc123
💰 PAYOUT (Razorpay not configured - simulating):
═══════════════════════════════════════════════════════
Amount: ₹50
Beneficiary: John Doe
Account: 1234567890
IFSC: HDFC0001234
Purpose: cashback
Reference: cashback_abc123
Status: SIMULATED SUCCESS
═══════════════════════════════════════════════════════
✅ [CASHBACK] Cashback abc123 paid successfully
```

### Database Check:
```javascript
// Check cashback document in MongoDB
{
  "_id": "...",
  "status": "paid",
  "payoutId": "simulated_1234567890" or "payout_xyz",
  "paymentStatus": "processed",
  "paidAt": "2025-11-17T10:30:00.000Z",
  "customerBankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "John Doe"
  },
  "timeline": [
    {
      "status": "approved",
      "timestamp": "...",
      "notes": "Request approved"
    },
    {
      "status": "paid",
      "timestamp": "...",
      "notes": "Payment processed via Razorpay payout"
    }
  ]
}
```

---

## ⚙️ Configuration Options

### Environment Variables

```env
# Required for real payouts
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_ACCOUNT_NUMBER=your_account_number

# Leave empty for simulation mode
# RAZORPAY_KEY_ID=
# RAZORPAY_KEY_SECRET=
# RAZORPAY_ACCOUNT_NUMBER=
```

---

## 🐛 Troubleshooting

### Issue: "Bank details are required"
**Solution:** Provide bank details in cashback creation or manual payment request

### Issue: "Cashback must be approved first"
**Solution:** Approve cashback before calling process-payment

### Issue: "Not authorized"
**Solution:** Ensure merchant token is valid and merchant owns the cashback

### Issue: Payout not processing
**Solution:**
1. Check console logs for errors
2. Verify Razorpay credentials in .env
3. Check Razorpay account balance
4. Try simulation mode first

---

## 📊 Payment Flow Diagram

```
Customer Order → Cashback Request Created → Merchant Approves
                                                    ↓
                                          Bank Details Exist?
                                                    ↓
                                    Yes ←----------→ No
                                     ↓               ↓
                        Auto-Process Payout    Status: 'approved'
                                     ↓               ↓
                            Status: 'paid'    Manual Payment Later
```

---

## 🔐 Security Notes

1. **Authentication:** All routes require merchant authentication
2. **Authorization:** Merchants can only access their own cashbacks
3. **Validation:** Amount, status, and bank details are validated
4. **Logging:** All payment attempts are logged with details

---

## 📝 Sample Cashback Creation (For Testing)

```javascript
POST /api/cashback
{
  "customerId": "user123",
  "orderId": "order456",
  "customer": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "totalCashbackEarned": 100,
    "accountAge": 30,
    "verificationStatus": "verified"
  },
  "customerBankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "John Doe"
  },
  "order": {
    "id": "order456",
    "orderNumber": "ORD123",
    "totalAmount": 1000,
    "orderDate": "2025-11-17T10:00:00.000Z",
    "items": [
      {
        "productId": "prod1",
        "productName": "Product 1",
        "quantity": 2,
        "price": 500,
        "cashbackEligible": true
      }
    ]
  },
  "requestedAmount": 50,
  "cashbackRate": 5
}
```

---

## 🎯 Success Indicators

✅ Console shows payout creation logs
✅ Cashback status changes to 'paid'
✅ `payoutId` is populated
✅ `paidAt` timestamp is set
✅ Timeline includes payment entry
✅ Response includes payment details

---

## 📞 Support Resources

- **Razorpay Docs:** https://razorpay.com/docs/api/payouts/
- **Implementation Summary:** See `CASHBACK_PAYMENT_INTEGRATION_SUMMARY.md`
- **PaymentService Code:** `src/services/PaymentService.ts`
- **Cashback Routes:** `src/merchantroutes/cashback.ts`

---

## 🚦 Next Steps

1. ✅ Test in simulation mode
2. ✅ Verify console logs
3. ✅ Check database updates
4. ⬜ Configure Razorpay test credentials
5. ⬜ Test with Razorpay test mode
6. ⬜ Test error scenarios
7. ⬜ Setup production credentials (when ready)

---

**Ready to Test!** 🎉

The system is fully functional in simulation mode. Start testing without any Razorpay setup!
