# Multi-Payment Methods Implementation Guide for REZ App

## Overview
This guide provides comprehensive instructions for implementing multiple payment methods in the REZ app, including Razorpay, Stripe, UPI, Cards, Net Banking, Digital Wallets, and Cash on Delivery (COD).

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [Payment Methods](#payment-methods)
5. [Integration Steps](#integration-steps)
6. [Testing](#testing)
7. [Production Checklist](#production-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Installation

### 1. Install React Native Razorpay

For **native apps** (with expo-dev-client):
```bash
npm install react-native-razorpay
npx expo install react-native-razorpay
```

For **Expo Go** (development only):
- Razorpay will use web fallback with mock payments
- For production, **must** use expo-dev-client

### 2. Stripe is Already Installed

The app already has Stripe dependencies:
- `@stripe/stripe-react-native` - For React Native apps
- `@stripe/stripe-js` - For web platform
- `@stripe/react-stripe-js` - For web components

---

## Configuration

### 1. Environment Variables

Update `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\.env`:

```bash
# Razorpay Configuration
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx  # Get from Razorpay Dashboard
EXPO_PUBLIC_ENABLE_RAZORPAY=true

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx  # Already configured
EXPO_PUBLIC_ENABLE_STRIPE=true

# COD Configuration
EXPO_PUBLIC_ENABLE_COD=true
EXPO_PUBLIC_COD_FEE=50              # COD charges in rupees
EXPO_PUBLIC_COD_MIN_ORDER=0         # Minimum order amount for COD
EXPO_PUBLIC_COD_MAX_ORDER=50000     # Maximum order amount for COD
```

### 2. Get Razorpay Test Keys

1. Sign up at [https://dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Go to Settings → API Keys
3. Generate Test Keys
4. Copy the **Key ID** (starts with `rzp_test_`)
5. **Never** commit the **Key Secret** to git - it's only for backend

### 3. Get Stripe Test Keys

The app already has Stripe test keys configured. To update:
1. Sign up/login at [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle to **Test mode**
3. Go to Developers → API Keys
4. Copy **Publishable key** (starts with `pk_test_`)

---

## Architecture

### File Structure

```
services/
├── razorpayService.ts              # Razorpay integration
├── stripeReactNativeService.ts     # Stripe React Native integration
├── paymentOrchestratorService.ts   # Central payment orchestrator
├── paymentService.ts               # Legacy payment service
└── stripeApi.ts                    # Stripe API for web

types/
└── payment.types.ts                # Comprehensive payment types

app/
├── checkout.tsx                    # Checkout page (already has wallet payment)
├── payment.tsx                     # Generic payment page
├── payment-razorpay.tsx            # Razorpay-specific payment page
└── account/
    └── payment-methods.tsx         # Payment method management

components/
└── PaymentMethodSelector.tsx       # Payment method selection modal
```

### Service Architecture

```
┌─────────────────────────────────────────────┐
│     paymentOrchestratorService.ts           │
│   (Central Payment Management)              │
└─────────────┬───────────────────────────────┘
              │
      ┌───────┴───────┬──────────┬────────┐
      │               │          │        │
┌─────▼──────┐  ┌────▼───┐  ┌───▼──┐  ┌─▼──┐
│ Razorpay   │  │ Stripe │  │ COD  │  │ WL │
│ Service    │  │ Service│  │ API  │  │ API│
└────────────┘  └────────┘  └──────┘  └────┘
```

---

## Payment Methods

### 1. Razorpay (Indian Payments)

**Supported Methods:**
- UPI (GPay, PhonePe, Paytm, BHIM, etc.)
- Credit/Debit Cards (Visa, Mastercard, Amex, RuPay)
- Net Banking (All major banks)
- Digital Wallets (Paytm, PhonePe, Amazon Pay, etc.)

**Features:**
- Native checkout UI (with expo-dev-client)
- Web fallback (for Expo Go)
- Automatic payment verification
- 3D Secure support
- EMI options

**Usage:**
```typescript
import razorpayService from '@/services/razorpayService';

// Check if configured
if (razorpayService.isConfigured()) {
  // Process payment
  const paymentRequest = {
    orderId: 'ORDER_123',
    amount: 5000, // in rupees
    currency: 'INR',
    paymentMethod: 'upi',
    gateway: 'razorpay',
  };

  const response = await razorpayService.processPayment(
    paymentRequest,
    {
      name: 'John Doe',
      email: 'john@example.com',
      contact: '9876543210',
    }
  );
}
```

### 2. Stripe (International Payments)

**Supported Methods:**
- International Cards (Visa, Mastercard, Amex)
- Digital Wallets (Apple Pay, Google Pay)
- SEPA, iDEAL, etc.

**Features:**
- React Native Payment Sheet
- Strong Customer Authentication (SCA)
- 3D Secure 2
- Save cards securely (tokenized)
- Multi-currency support

**Usage:**
```typescript
import stripeReactNativeService from '@/services/stripeReactNativeService';

// Initialize Stripe (in App.tsx or _layout.tsx)
await stripeReactNativeService.initialize();

// Process payment
const paymentRequest = {
  orderId: 'ORDER_123',
  amount: 5000,
  currency: 'INR',
  paymentMethod: 'card',
  gateway: 'stripe',
};

const response = await stripeReactNativeService.processPayment(
  paymentRequest,
  {
    name: 'John Doe',
    email: 'john@example.com',
  }
);
```

### 3. COD (Cash on Delivery)

**Configuration:**
- Enabled/Disabled via environment variable
- Configurable COD fee
- Min/Max order amount restrictions
- Pincode-based availability (optional)

**Usage:**
```typescript
// COD is handled via payment orchestrator
const paymentRequest = {
  orderId: 'ORDER_123',
  amount: 5000,
  currency: 'INR',
  paymentMethod: 'cod',
  gateway: 'none',
};

const response = await paymentOrchestratorService.processPayment(paymentRequest);
```

### 4. Internal Wallet (PayBill & REZ Coins)

Already implemented in the app:
- PayBill wallet balance
- REZ coins for discounts
- Instant transactions

---

## Integration Steps

### Step 1: Initialize Payment Services

In your app's root layout (`app/_layout.tsx`):

```typescript
import stripeReactNativeService from '@/services/stripeReactNativeService';
import paymentOrchestratorService from '@/services/paymentOrchestratorService';

// In your app initialization
useEffect(() => {
  async function initializePayments() {
    try {
      // Initialize Stripe
      await stripeReactNativeService.initialize();

      // Initialize payment orchestrator
      await paymentOrchestratorService.initialize();

      console.log('✅ Payment services initialized');
    } catch (error) {
      console.error('❌ Payment initialization failed:', error);
    }
  }

  initializePayments();
}, []);
```

### Step 2: Update Checkout Page

The checkout page (`app/checkout.tsx`) already has wallet payment. To add more payment methods:

```typescript
import paymentOrchestratorService from '@/services/paymentOrchestratorService';

// Get available payment methods
const [paymentMethods, setPaymentMethods] = useState([]);

useEffect(() => {
  async function loadPaymentMethods() {
    const methods = await paymentOrchestratorService.getAvailablePaymentMethods(
      totalAmount,
      'INR'
    );
    setPaymentMethods(methods);
  }

  loadPaymentMethods();
}, [totalAmount]);

// Handle payment method selection
const handlePaymentMethodSelect = async (method: PaymentMethod) => {
  const paymentRequest = {
    orderId: orderId,
    amount: totalAmount,
    currency: 'INR',
    paymentMethod: method.type,
    gateway: method.gateway,
    metadata: {
      userId: user.id,
      storeId: store.id,
      items: cartItems,
    },
  };

  try {
    const response = await paymentOrchestratorService.processPayment(
      paymentRequest,
      {
        name: user.name,
        email: user.email,
        contact: user.phone,
      }
    );

    if (response.success) {
      // Navigate to success page
      router.push(`/order-confirmation?orderId=${orderId}`);
    }
  } catch (error) {
    Alert.alert('Payment Failed', error.message);
  }
};
```

### Step 3: Add "Other Payment Methods" Button

Update the "Other payment mode" button in `app/checkout.tsx`:

```typescript
const navigateToOtherPaymentMethods = async () => {
  // Get available methods
  const methods = await paymentOrchestratorService.getAvailablePaymentMethods(
    state.billSummary.totalPayable,
    'INR'
  );

  // Navigate to payment selection page with methods
  router.push({
    pathname: '/payment',
    params: {
      amount: state.billSummary.totalPayable,
      currency: 'INR',
      orderId: orderId,
      methods: JSON.stringify(methods),
    },
  });
};
```

### Step 4: Handle Payment Success/Failure

```typescript
// In your payment success handler
const handlePaymentSuccess = (paymentResponse: PaymentResponse) => {
  // Update order status
  // Clear cart
  // Show success message
  // Navigate to order confirmation

  Alert.alert(
    'Payment Successful!',
    `Your order has been placed successfully.`,
    [
      {
        text: 'View Order',
        onPress: () => router.push(`/order-confirmation?orderId=${orderId}`),
      },
    ]
  );
};

// In your payment failure handler
const handlePaymentFailure = (error: Error) => {
  Alert.alert(
    'Payment Failed',
    error.message || 'Payment could not be processed. Please try again.',
    [
      {
        text: 'Retry',
        onPress: () => {
          // Retry payment
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
};
```

---

## Testing

### Test with Razorpay

**Test Cards:**
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
```

**Test UPI:**
```
UPI ID: success@razorpay
```

**Test Scenarios:**
- Success: Use `success@razorpay`
- Failure: Use `failure@razorpay`

### Test with Stripe

**Test Cards:**
```
Success: 4242 4242 4242 4242
3D Secure: 4000 0027 6000 3184
Decline: 4000 0000 0000 0002
```

**Expiry:** Any future date
**CVV:** Any 3 digits

### Test COD

- Enable COD in `.env`
- Test with different order amounts
- Verify COD fee is added
- Check min/max order validation

---

## Production Checklist

### Before Going Live

- [ ] Replace Razorpay test key with live key
- [ ] Replace Stripe test key with live key
- [ ] Build with expo-dev-client (not Expo Go)
- [ ] Test all payment flows end-to-end
- [ ] Implement proper error handling
- [ ] Add payment analytics
- [ ] Set up webhook listeners for payment status
- [ ] Configure proper SSL certificates
- [ ] Add retry mechanism for failed payments
- [ ] Implement refund flow
- [ ] Add payment receipt generation
- [ ] Test 3D Secure flows
- [ ] Verify PCI compliance
- [ ] Add fraud detection
- [ ] Configure payment method icons
- [ ] Set up proper logging
- [ ] Test on real devices
- [ ] Verify deep links work
- [ ] Test payment redirects
- [ ] Add timeout handling

### Security Checklist

- [ ] Never store actual card numbers
- [ ] Always use tokenization for saved cards
- [ ] Implement proper authentication
- [ ] Use HTTPS for all API calls
- [ ] Validate payment signatures
- [ ] Implement rate limiting
- [ ] Add session timeout
- [ ] Encrypt sensitive data
- [ ] Implement proper access control
- [ ] Add audit logging
- [ ] Monitor for suspicious activity
- [ ] Implement 2FA for high-value transactions

---

## Troubleshooting

### Razorpay Not Working

**Issue:** "Razorpay is not configured properly"
```
Solution:
1. Check .env has correct EXPO_PUBLIC_RAZORPAY_KEY_ID
2. Ensure key starts with rzp_test_ (test) or rzp_live_ (production)
3. Verify EXPO_PUBLIC_ENABLE_RAZORPAY=true
4. Restart expo server
```

**Issue:** "Native Razorpay module not available"
```
Solution:
1. Install: npm install react-native-razorpay
2. Build with: npx expo prebuild
3. Run: npx expo run:android or npx expo run:ios
4. Or use web fallback for testing in Expo Go
```

### Stripe Not Working

**Issue:** "Failed to initialize Stripe"
```
Solution:
1. Check EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env
2. Verify key starts with pk_test_ or pk_live_
3. Initialize Stripe in app root: await stripeReactNativeService.initialize()
4. Check React Native module is installed: @stripe/stripe-react-native
```

**Issue:** "Payment Sheet not appearing"
```
Solution:
1. Ensure you're using expo-dev-client (not Expo Go)
2. Check payment intent was created successfully
3. Verify clientSecret is not empty
4. Check console for initialization errors
```

### COD Not Available

**Issue:** "COD option not showing"
```
Solution:
1. Check EXPO_PUBLIC_ENABLE_COD=true in .env
2. Verify order amount is within COD limits
3. Check COD configuration on backend
4. Verify pincode is in COD serviceable area (if configured)
```

### Common Errors

**Error:** "Order ID is required"
```
Solution: Create order on backend first, then pass orderId to payment flow
```

**Error:** "Payment verification failed"
```
Solution:
1. Check payment signature is correct
2. Verify backend has correct Razorpay/Stripe secret key
3. Check webhook configuration
4. Ensure order exists in database
```

**Error:** "Payment gateway timeout"
```
Solution:
1. Check internet connection
2. Increase API timeout in config
3. Implement retry logic
4. Show user-friendly error message
```

---

## Backend Integration Required

For payments to work, your backend needs these endpoints:

### Razorpay Endpoints

```
POST /api/payment/razorpay/create-order
POST /api/payment/razorpay/verify
GET  /api/payment/razorpay/status/:paymentId
```

### Stripe Endpoints

```
POST /api/payment/stripe/create-intent
POST /api/payment/stripe/verify
GET  /api/payment/stripe/status/:paymentIntentId
```

### COD Endpoints

```
POST /api/payment/cod/create
GET  /api/payment/cod/config
```

### Internal Payment Endpoints

```
POST /api/payment/internal/process  (PayBill, REZ Coins)
```

### Saved Payment Methods

```
GET    /api/payment/saved-methods
POST   /api/payment/save-method
DELETE /api/payment/saved-methods/:id
GET    /api/payment/preferences
PUT    /api/payment/preferences
```

---

## Additional Features to Implement

### 1. Save Cards for Future Use

```typescript
// After successful payment
const saveCard = async (paymentMethodId: string) => {
  await paymentOrchestratorService.savePaymentMethod('card', {
    cardToken: paymentMethodId,
    last4: '4242',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2025,
    holderName: 'John Doe',
    gateway: 'stripe',
  });
};
```

### 2. Auto-Select Last Used Method

```typescript
// Get recommended payment method
const recommendedMethod = await paymentOrchestratorService.getRecommendedPaymentMethod(
  amount,
  'INR'
);
```

### 3. Payment Method Management

Navigate to `/account/payment-methods` to:
- View saved cards
- Add new payment methods
- Set default payment method
- Delete saved methods

### 4. Payment Analytics

Track payment success rates, preferred methods, and revenue:
```typescript
// Implement in your analytics service
trackPaymentAttempt(method, amount);
trackPaymentSuccess(method, amount, duration);
trackPaymentFailure(method, amount, reason);
```

---

## Support & Resources

### Documentation
- Razorpay: https://razorpay.com/docs/
- Stripe: https://stripe.com/docs/payments
- React Native Razorpay: https://github.com/razorpay/react-native-razorpay

### Test Accounts
- Razorpay Test Mode: https://dashboard.razorpay.com/test/dashboard
- Stripe Test Mode: https://dashboard.stripe.com/test/dashboard

### Contact
For issues specific to this implementation, refer to the code comments or create an issue in your project repository.

---

## Next Steps

1. **Install Dependencies**
   ```bash
   cd C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend
   npm install react-native-razorpay
   ```

2. **Configure Keys**
   - Update `.env` with actual Razorpay test key
   - Verify Stripe key is correct

3. **Initialize Services**
   - Add initialization code to `app/_layout.tsx`

4. **Update Checkout**
   - Connect payment orchestrator to checkout page
   - Add payment method selection UI

5. **Test Thoroughly**
   - Test all payment methods
   - Test success and failure scenarios
   - Test on real devices

6. **Backend Setup**
   - Implement required backend endpoints
   - Configure webhook handlers
   - Set up payment verification

7. **Go Live**
   - Switch to live keys
   - Build production app
   - Monitor payments closely

---

**Last Updated:** 2025-10-27
**Version:** 1.0.0
**Status:** Implementation Complete - Ready for Testing
