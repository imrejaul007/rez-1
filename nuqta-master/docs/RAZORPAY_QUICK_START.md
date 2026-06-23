# Razorpay Integration - Quick Start Guide
## Get Up and Running in 15 Minutes

---

## What You'll Need

1. Razorpay Test Account (Sign up at https://razorpay.com)
2. Test API Keys from Razorpay Dashboard
3. 15 minutes of your time

---

## Step 1: Get Razorpay Test Credentials (5 minutes)

1. **Sign up for Razorpay**:
   - Visit https://razorpay.com
   - Click "Sign Up"
   - Enter your email and create a password
   - Verify your email

2. **Get Test API Keys**:
   - Login to Razorpay Dashboard
   - Go to Settings (gear icon) > API Keys
   - Click "Generate Test Key"
   - You'll see two keys:
     - **Key ID**: Starts with `rzp_test_` (e.g., `rzp_test_1234567890`)
     - **Key Secret**: A long secret string
   - **Copy both keys** - you'll need them in the next step

> **Note**: You can use test mode without KYC. For production, you'll need to complete KYC verification.

---

## Step 2: Install Required Packages (2 minutes)

### For Native App (Recommended for Production):

```bash
cd frontend

# Install Razorpay SDK
npm install react-native-razorpay

# For Expo (required for native modules)
npx expo install expo-dev-client
npx expo prebuild
```

### For Expo Go (Testing Only):
The updated code includes a web fallback that works with Expo Go for quick testing.

---

## Step 3: Configure Environment Variables (3 minutes)

### Frontend Configuration

Open `frontend/.env` and update:

```env
# Replace with your actual test key ID
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_1234567890
```

### Backend Configuration

Open `user-backend/.env` and update:

```env
# Replace with your actual test credentials
RAZORPAY_KEY_ID=rzp_test_1234567890
RAZORPAY_KEY_SECRET=your_test_key_secret_here
RAZORPAY_WEBHOOK_SECRET=leave_blank_for_now
```

> **Important**: Never commit your `.env` files to Git. They're already in `.gitignore`.

---

## Step 4: Update Payment File (2 minutes)

The updated payment file is at:
```
frontend/app/payment-razorpay.tsx
```

### Option A: Replace Existing File (Recommended)
```bash
# Rename current payment.tsx as backup
mv app/payment.tsx app/payment-backup.tsx

# Rename Razorpay payment file to payment.tsx
mv app/payment-razorpay.tsx app/payment.tsx
```

### Option B: Keep Both Files
Keep the new file as `payment-razorpay.tsx` and update your routes to use it.

---

## Step 5: Start Backend Server (1 minute)

```bash
cd user-backend
npm run dev
```

You should see:
```
✅ Server running on port 5001
✅ MongoDB connected
✅ Razorpay initialized
```

---

## Step 6: Start Frontend App (1 minute)

### For Expo Dev Client (Native Razorpay):
```bash
cd frontend
npx expo run:android  # or run:ios
```

### For Expo Go (Web Fallback):
```bash
cd frontend
npm start
```

Then scan QR code with Expo Go app.

---

## Step 7: Test Payment Flow (1 minute)

1. **Navigate to Payment Page**:
   - Go to Wallet > Add Money
   - Or go to Checkout page
   - Enter amount (e.g., ₹500)

2. **Select Payment Method**:
   - Choose any method (UPI, Card, Net Banking, Wallet)
   - Razorpay checkout will open

3. **Use Test Credentials**:

   **For Card Payment**:
   ```
   Card Number: 4111 1111 1111 1111
   CVV: 123
   Expiry: 12/25 (any future date)
   Name: Test User
   ```

   **For UPI Payment**:
   ```
   VPA: success@razorpay
   ```

   **For Net Banking**:
   - Select any test bank
   - Use credentials shown on page

4. **Verify Success**:
   - Payment should complete
   - Order should be confirmed
   - Stock should be updated
   - You should see success message

---

## Troubleshooting

### Issue: "Invalid Key ID"
**Solution**:
- Check that you copied the correct Key ID from Razorpay dashboard
- Make sure it starts with `rzp_test_`
- Verify .env file is loaded (restart app)

### Issue: "Payment verification failed"
**Solution**:
- Check that Key Secret in backend .env is correct
- Verify backend is running
- Check backend logs for errors

### Issue: "Razorpay module not found"
**Solution**:
- For Expo: Use expo-dev-client
- Or use the web fallback (works in Expo Go)
- The code automatically falls back to web mode

### Issue: Payment succeeds but order not updated
**Solution**:
- Check backend logs
- Verify `/api/payment/verify` endpoint is working
- Ensure MongoDB is connected
- Check for stock availability issues

---

## What's Next?

### For Development:
1. Test all payment methods
2. Test error scenarios
3. Test refund flow
4. Set up webhooks (optional for testing)

### For Production:
1. Complete Razorpay KYC verification
2. Get Live API keys
3. Update production environment variables
4. Follow the Production Checklist
5. Test in production mode
6. Go live!

---

## Test Cards & UPIs

### Successful Payments
```
Card: 4111 1111 1111 1111
UPI: success@razorpay
```

### Failed Payments
```
Card: 4000 0000 0000 0002
UPI: failure@razorpay
```

### International Card
```
Card: 5104 0600 0000 0008
```

### Card with 3D Secure
```
Card: 4000 0027 6000 3184
OTP: 1221 (when prompted)
```

---

## Architecture Overview

```
┌─────────────┐
│   User      │
│  (Mobile)   │
└──────┬──────┘
       │
       │ 1. Select Payment
       ▼
┌─────────────────────┐
│   Frontend          │
│  payment.tsx        │
└──────┬──────────────┘
       │
       │ 2. Create Order
       ▼
┌─────────────────────┐
│   Backend           │
│  /payment/create    │
└──────┬──────────────┘
       │
       │ 3. Create Razorpay Order
       ▼
┌─────────────────────┐
│   Razorpay API      │
│  orders.create()    │
└──────┬──────────────┘
       │
       │ 4. Return Order ID
       ▼
┌─────────────────────┐
│   Frontend          │
│  Open Checkout      │
└──────┬──────────────┘
       │
       │ 5. User Pays
       ▼
┌─────────────────────┐
│   Razorpay          │
│  Checkout UI        │
└──────┬──────────────┘
       │
       │ 6. Payment Response
       ▼
┌─────────────────────┐
│   Frontend          │
│  Verify Payment     │
└──────┬──────────────┘
       │
       │ 7. Verify Signature
       ▼
┌─────────────────────┐
│   Backend           │
│  /payment/verify    │
└──────┬──────────────┘
       │
       │ 8. Update Order & Stock
       ▼
┌─────────────────────┐
│   MongoDB           │
│  Update Records     │
└─────────────────────┘
```

---

## Key Features

### ✅ Security
- PCI DSS Level 1 Compliant
- 256-bit SSL encryption
- Signature verification
- No card data stored

### ✅ Payment Methods
- UPI (GPay, PhonePe, Paytm, etc.)
- Credit/Debit Cards
- Net Banking (50+ banks)
- Wallets (Paytm, Mobikwik, etc.)

### ✅ Features
- Instant refunds
- Automated webhooks
- Real-time payment tracking
- International payments
- EMI options

---

## Support

### Documentation
- **Full Guide**: See `RAZORPAY_IMPLEMENTATION_GUIDE.md`
- **Production Checklist**: See `RAZORPAY_PRODUCTION_CHECKLIST.md`

### Razorpay Resources
- **Docs**: https://razorpay.com/docs
- **API Reference**: https://razorpay.com/docs/api
- **Support**: support@razorpay.com
- **Phone**: 1800-103-8800

### REZ App Support
- Check backend logs: `user-backend/logs/`
- Frontend console: React Native Debugger
- MongoDB: Check `orders` and `payments` collections

---

## Congratulations!

You now have Razorpay payments integrated in your REZ app!

**What you've accomplished:**
- ✅ Set up Razorpay account
- ✅ Configured API credentials
- ✅ Installed required packages
- ✅ Integrated payment flow
- ✅ Tested payment processing

**Next steps:**
1. Test all payment methods
2. Set up webhooks for production
3. Complete KYC for live payments
4. Follow production checklist
5. Go live!

---

**Need Help?**
- Read the full implementation guide
- Check Razorpay documentation
- Contact Razorpay support
- Review backend logs

**Happy Coding!** 🚀
