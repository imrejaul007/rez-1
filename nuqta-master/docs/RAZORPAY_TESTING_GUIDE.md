# Razorpay Subscription Payment - Quick Testing Guide

## 🚀 Quick Start Testing

### Step 1: Get Razorpay Test Keys (5 minutes)

1. Go to https://dashboard.razorpay.com/signup
2. Sign up with your email (it's free)
3. After login, go to: **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy your **Test Key ID** (starts with `rzp_test_`)

### Step 2: Update Frontend Configuration

1. Open `.env` file in frontend folder
2. Find this line:
   ```env
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
   ```
3. Replace with your actual key:
   ```env
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   ```
4. Save the file

### Step 3: Start the App

```bash
cd frontend
npm start
```

### Step 4: Test Payment Flow

1. **Open the app** (web, iOS, or Android)
2. **Login/Register** if not already logged in
3. **Navigate to**: Profile → Subscription → Choose Your Plan
4. **Select a plan**:
   - Choose Monthly or Yearly billing
   - Click "Upgrade Now" on Premium or VIP
5. **Confirm**: Click "Proceed to Payment" in dialog
6. **Payment Screen Opens**: You'll see subscription details
7. **Enter Test Card**:
   - Card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: `12/25`
   - Name: `Test User`
8. **Complete Payment**: Click Pay
9. **Success!**: You should see success modal
10. **Verify**: Check your subscription is now active

## 🧪 Razorpay Test Cards

### Valid Cards (Payment Success):

```
Visa:
  Card: 4111 1111 1111 1111
  CVV: Any 3 digits
  Expiry: Any future date

Mastercard:
  Card: 5555 5555 5555 4444
  CVV: Any 3 digits
  Expiry: Any future date

Amex:
  Card: 3782 822463 10005
  CVV: Any 4 digits
  Expiry: Any future date
```

### Test UPI:

```
Success: success@razorpay
Failure: failure@razorpay
```

### 3D Secure OTP:

When prompted for OTP, use: `1234`

## 📱 Platform-Specific Testing

### Testing on Web (Easiest):

```bash
cd frontend
npm run web
```

Open http://localhost:8081 and test directly in browser.

### Testing on Mobile (Expo Go):

```bash
cd frontend
npm start
```

**Note**: Expo Go will show a **simulated payment** option for testing purposes. For real Razorpay testing on mobile, you need expo-dev-client (see below).

### Testing on Mobile (Expo Dev Client - Real Payment):

```bash
cd frontend
npx expo install expo-dev-client
npx expo prebuild
npx expo run:android  # or run:ios
```

This builds a native app with Razorpay SDK integrated.

## ✅ Expected Behavior

### 1. When You Click "Upgrade Now":
- ✅ Confirmation dialog appears
- ✅ Shows plan details and price
- ✅ "Proceed to Payment" button

### 2. After Confirming:
- ✅ Loading indicator shows
- ✅ Backend creates subscription
- ✅ Payment modal opens
- ✅ Shows subscription details (tier, billing, amount)

### 3. During Payment:
- ✅ Razorpay checkout opens
- ✅ Shows secure payment form
- ✅ "Secured by Razorpay" badge visible
- ✅ Can enter card details

### 4. After Successful Payment:
- ✅ Success animation shows
- ✅ Payment details displayed
- ✅ Subscription benefits listed
- ✅ "View My Subscription" button works
- ✅ Subscription is activated immediately

### 5. On Subscription Page:
- ✅ Tier badge shows "Premium" or "VIP"
- ✅ Benefits are unlocked
- ✅ Days remaining shown
- ✅ Auto-renew toggle available

## 🐛 Troubleshooting

### Problem: "Razorpay is not configured"

**Solution**:
1. Check `.env` file has correct Razorpay key
2. Restart expo server: Press `r` in terminal
3. Clear cache: `npx expo start --clear`

### Problem: Payment modal doesn't open

**Solution**:
1. Check browser console for errors
2. Verify backend is running: `http://localhost:5001/api`
3. Check if user is logged in

### Problem: "Payment verification failed"

**Solution**:
1. Check backend logs
2. Ensure backend has same Razorpay key
3. Verify `/payment/razorpay/verify` endpoint exists

### Problem: Payment succeeds but subscription not activated

**Solution**:
1. Check backend payment verification endpoint
2. Check subscription update logic in backend
3. Manually verify in Razorpay dashboard

## 🔍 Debug Mode

Enable detailed logging:

1. Open `.env`
2. Set:
   ```env
   EXPO_PUBLIC_DEBUG_MODE=true
   EXPO_PUBLIC_LOG_LEVEL=debug
   ```
3. Restart app
4. Check console for logs starting with:
   - `[SUBSCRIPTION]`
   - `[RAZORPAY]`
   - `[PAYMENT]`

## 📊 Testing Checklist

- [ ] Can see subscription plans page
- [ ] Can select Monthly/Yearly billing
- [ ] "Upgrade Now" button works
- [ ] Confirmation dialog appears
- [ ] Payment modal opens with correct details
- [ ] Can enter test card details
- [ ] Payment processes successfully
- [ ] Success modal appears
- [ ] Subscription is activated
- [ ] Benefits are unlocked
- [ ] Can view subscription details
- [ ] Tier badge shows correctly
- [ ] Can test payment failure (use `failure@razorpay` UPI)
- [ ] Error handling works properly

## 🎯 Test Scenarios

### Scenario 1: Successful Monthly Premium Subscription
1. Select Monthly billing
2. Click Upgrade on Premium plan
3. Use card: 4111 1111 1111 1111
4. Complete payment
5. **Expected**: Subscription activated, charged ₹99

### Scenario 2: Successful Yearly VIP Subscription
1. Select Yearly billing
2. Click Upgrade on VIP plan
3. Use card: 5555 5555 5555 4444
4. Complete payment
5. **Expected**: Subscription activated, charged ₹2850 (saved 20%)

### Scenario 3: Payment Failure
1. Select any plan
2. Use UPI: `failure@razorpay`
3. **Expected**: Payment fails, error shown, retry option available

### Scenario 4: Payment Cancellation
1. Open payment modal
2. Click Cancel/Close
3. **Expected**: Modal closes, subscription not created

### Scenario 5: Network Error
1. Stop backend server
2. Try to upgrade
3. **Expected**: Error message shown, retry option available

## 📈 Success Metrics

After testing, you should see:
- ✅ 100% payment success rate with valid test cards
- ✅ Proper error handling for failures
- ✅ Immediate subscription activation
- ✅ Benefits unlocked correctly
- ✅ UI updates reflect new tier

## 🎉 Done!

If all tests pass, your Razorpay subscription payment integration is working perfectly!

## 🆘 Need Help?

**Backend Issues**:
- Check backend documentation
- Verify Razorpay configuration in backend
- Check backend logs for errors

**Frontend Issues**:
- Check browser console
- Enable debug mode
- Review error messages

**Razorpay Issues**:
- Check Razorpay dashboard for transactions
- Review Razorpay documentation
- Contact Razorpay support

---

**Quick Test Command** (Web):
```bash
cd frontend && npm run web
```

**Quick Test Command** (Mobile):
```bash
cd frontend && npm start
```

Good luck testing! 🚀
