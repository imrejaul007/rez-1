# Quick Payment Setup Instructions

## Step-by-Step Setup Guide

### 1. Install Required Packages

```bash
cd C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend

# Install React Native Razorpay
npm install react-native-razorpay
```

**Note:** For Expo Go development, Razorpay will use web fallback. For production, you MUST build with `expo-dev-client`.

### 2. Configure Environment Variables

Open `.env` and update the following:

```bash
# Replace with your actual Razorpay test key from dashboard
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_actual_key_here

# Stripe key is already configured, but verify it's correct
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51PQsD1A3bD41AFFrxWV0dn3xVgOZTp92LyO3OtrTYHjv4l7GHoQR8kp2CB2tjeVK79XXG2c7DEpRtECDVAGZBCNY00GncnIF0a

# Enable payment methods
EXPO_PUBLIC_ENABLE_RAZORPAY=true
EXPO_PUBLIC_ENABLE_STRIPE=true
EXPO_PUBLIC_ENABLE_COD=true

# COD Configuration
EXPO_PUBLIC_COD_FEE=50
EXPO_PUBLIC_COD_MIN_ORDER=0
EXPO_PUBLIC_COD_MAX_ORDER=50000
```

### 3. Get Razorpay Test Keys

1. Go to: https://dashboard.razorpay.com/signup
2. Sign up for an account
3. Navigate to: **Settings** → **API Keys**
4. Click **Generate Test Keys**
5. Copy the **Key ID** (starts with `rzp_test_`)
6. **IMPORTANT:** Do NOT share the Key Secret publicly
7. Update `EXPO_PUBLIC_RAZORPAY_KEY_ID` in `.env` file

### 4. Initialize Payment Services

Add this to `app/_layout.tsx` (or your root layout):

```typescript
import { useEffect } from 'react';
import stripeReactNativeService from '@/services/stripeReactNativeService';
import paymentOrchestratorService from '@/services/paymentOrchestratorService';

export default function RootLayout() {
  useEffect(() => {
    async function initializePayments() {
      try {
        console.log('🔄 Initializing payment services...');

        // Initialize Stripe
        await stripeReactNativeService.initialize();

        // Initialize payment orchestrator
        await paymentOrchestratorService.initialize();

        console.log('✅ Payment services initialized successfully');
      } catch (error) {
        console.error('❌ Payment initialization failed:', error);
      }
    }

    initializePayments();
  }, []);

  return (
    // Your existing layout code
  );
}
```

### 5. Update Checkout Page (Optional - If Not Already Done)

The checkout page already has wallet payment. To add multiple payment methods:

```typescript
import paymentOrchestratorService from '@/services/paymentOrchestratorService';

// In your checkout component
const handleShowPaymentOptions = async () => {
  const methods = await paymentOrchestratorService.getAvailablePaymentMethods(
    billSummary.totalPayable,
    'INR'
  );

  // Navigate to payment selection page
  router.push({
    pathname: '/payment',
    params: {
      amount: billSummary.totalPayable,
      currency: 'INR',
      orderId: orderId,
    },
  });
};
```

### 6. Test the Implementation

#### For Expo Go (Development):
```bash
npm start
```
- Razorpay will use **web fallback** with mock payments
- Suitable for UI testing only

#### For Production Build (Required for native payments):
```bash
# Prebuild for native modules
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### 7. Test Payment Methods

#### Test Razorpay UPI:
- Use UPI ID: `success@razorpay` (for success)
- Use UPI ID: `failure@razorpay` (for failure)

#### Test Razorpay Cards:
```
Card Number: 4111 1111 1111 1111
Expiry: 12/25 (any future date)
CVV: 123 (any 3 digits)
```

#### Test Stripe Cards:
```
Success: 4242 4242 4242 4242
3D Secure: 4000 0027 6000 3184
Decline: 4000 0000 0000 0002
Expiry: 12/25
CVV: 123
```

---

## File Structure Created

### New Services:
```
services/
├── razorpayService.ts              ✅ Complete Razorpay integration
├── stripeReactNativeService.ts     ✅ Stripe React Native integration
└── paymentOrchestratorService.ts   ✅ Central payment management
```

### New Types:
```
types/
└── payment.types.ts                ✅ Comprehensive payment types
```

### Updated Files:
```
.env                                ✅ Added payment configuration
```

### Documentation:
```
MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md  ✅ Complete implementation guide
PAYMENT_SETUP_INSTRUCTIONS.md          ✅ Quick setup instructions (this file)
```

---

## What's Implemented

### ✅ Payment Methods Supported:

1. **Razorpay** (Indian Payments)
   - UPI (GPay, PhonePe, Paytm, BHIM)
   - Credit/Debit Cards
   - Net Banking
   - Digital Wallets

2. **Stripe** (International Payments)
   - International Cards
   - Apple Pay / Google Pay
   - Multi-currency support

3. **COD** (Cash on Delivery)
   - Configurable fee and limits
   - Location-based availability

4. **Internal Wallets**
   - PayBill Wallet (already exists)
   - REZ Coins (already exists)

### ✅ Features Implemented:

- Payment method detection
- Automatic gateway routing
- Payment verification
- 3D Secure support
- Error handling
- Payment status tracking
- Native and web support
- Saved payment methods (ready for backend integration)
- Payment preferences
- COD configuration

---

## What Still Needs Backend Integration

Your backend needs to implement these endpoints:

### Razorpay:
```
POST /api/payment/razorpay/create-order
POST /api/payment/razorpay/verify
GET  /api/payment/razorpay/status/:paymentId
```

### Stripe:
```
POST /api/payment/stripe/create-intent
POST /api/payment/stripe/verify
GET  /api/payment/stripe/status/:paymentIntentId
```

### COD:
```
POST /api/payment/cod/create
GET  /api/payment/cod/config
```

### Saved Methods:
```
GET    /api/payment/saved-methods
POST   /api/payment/save-method
DELETE /api/payment/saved-methods/:id
GET    /api/payment/preferences
PUT    /api/payment/preferences
```

---

## Troubleshooting

### Issue: "Cannot find module 'react-native-razorpay'"

**Solution:**
```bash
npm install react-native-razorpay
npx expo prebuild
npx expo run:android  # or expo run:ios
```

### Issue: "Razorpay is not configured"

**Solution:**
1. Check `.env` has `EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...`
2. Restart expo: `npm start -- --clear`
3. Verify key is not empty or placeholder

### Issue: "Payment Sheet not appearing"

**Solution:**
- Must use `expo-dev-client`, not Expo Go
- Run: `npx expo prebuild && npx expo run:android`

### Issue: "Backend endpoints not found"

**Solution:**
- Implement backend endpoints (see list above)
- Or use mock mode for testing (update services to return mock data)

---

## Production Checklist

Before deploying to production:

- [ ] Replace test keys with live keys
- [ ] Build with expo-dev-client (not Expo Go)
- [ ] Test all payment flows thoroughly
- [ ] Implement backend endpoints
- [ ] Configure webhooks
- [ ] Set up proper error logging
- [ ] Add payment analytics
- [ ] Test on real devices
- [ ] Verify PCI compliance
- [ ] Add fraud detection
- [ ] Implement refund flow

---

## Next Actions

1. **Install Dependencies:**
   ```bash
   npm install react-native-razorpay
   ```

2. **Update `.env` with your Razorpay key**

3. **Restart Expo:**
   ```bash
   npm start -- --clear
   ```

4. **Initialize services in app root**

5. **Test with test keys**

6. **Implement backend endpoints**

7. **Build for production:**
   ```bash
   npx expo prebuild
   npx expo run:android
   ```

---

## Support

For detailed information, refer to:
- `MULTI_PAYMENT_IMPLEMENTATION_GUIDE.md` - Complete implementation guide
- Service files in `services/` - Code documentation
- Type definitions in `types/payment.types.ts`

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-10-27
**Next Step:** Install dependencies and configure Razorpay key
