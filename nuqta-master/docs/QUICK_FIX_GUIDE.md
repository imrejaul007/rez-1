# QUICK FIX GUIDE - Critical Issues

**Priority:** URGENT
**Estimated Time:** 2-4 hours
**Impact:** Unlocks 70% of app features

---

## 🔴 CRITICAL FIX #1: Authentication Flow

### Problem
```
POST /api/auth/send-otp
Response: "User not found. Please sign up first"
```

Cannot register new users or test any authenticated features.

### Solution Option A: Update Backend (Recommended)
**File:** `user-backend/routes/auth.js` or equivalent

```javascript
// BEFORE: Requires user to exist
router.post('/send-otp', async (req, res) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  // Send OTP...
});

// AFTER: Auto-register if user doesn't exist
router.post('/send-otp', async (req, res) => {
  let user = await User.findOne({ phoneNumber });

  // Auto-create user if doesn't exist
  if (!user) {
    user = await User.create({
      phoneNumber,
      email: req.body.email,
      isOnboarded: false,
      profile: {},
      preferences: {}
    });
  }

  // Send OTP to both new and existing users
  const otp = generateOTP();
  // ... send SMS/email

  res.json({
    success: true,
    message: 'OTP sent successfully',
    data: { expiresIn: 300 }
  });
});
```

### Solution Option B: Create Test User
**File:** `user-backend/scripts/create-test-user.js`

```javascript
// Run this script to create test user
const mongoose = require('mongoose');
const User = require('../models/User');

async function createTestUser() {
  await mongoose.connect(process.env.MONGODB_URI);

  const testUser = await User.create({
    phoneNumber: '9999999999',
    email: 'test@rezapp.com',
    profile: {
      firstName: 'Test',
      lastName: 'User'
    },
    preferences: {
      emailNotifications: true,
      pushNotifications: true
    },
    isVerified: true,
    isOnboarded: true,
    role: 'user'
  });

  console.log('Test user created:', testUser.phoneNumber);
  console.log('Test OTP: 123456'); // Configure test OTP
}

createTestUser();
```

Then use:
- Phone: `9999999999`
- OTP: `123456` (configure as test OTP)

---

## 🟡 CRITICAL FIX #2: API Endpoint Paths

### Problem
Frontend uses `/user/auth/*` but backend expects `/auth/*`

### Solution: Update Frontend Services

**File:** `frontend/services/authApi.ts`

```typescript
// FIND AND REPLACE ALL:

// BEFORE:
async sendOtp(data: OtpRequest) {
  return apiClient.post('/user/auth/send-otp', data);
}

async verifyOtp(data: OtpVerification) {
  return apiClient.post('/user/auth/verify-otp', data);
}

async refreshToken(refreshToken: string) {
  return apiClient.post('/user/auth/refresh-token', { refreshToken });
}

async logout() {
  return apiClient.post('/user/auth/logout');
}

async getProfile() {
  return apiClient.get('/user/auth/me');
}

async updateProfile(data: ProfileUpdate) {
  return apiClient.put('/user/auth/profile', data);
}

async completeOnboarding(data: ProfileUpdate) {
  return apiClient.post('/user/auth/complete-onboarding', data);
}

async deleteAccount() {
  return apiClient.delete('/user/auth/account');
}

async getUserStatistics() {
  return apiClient.get('/user/auth/statistics');
}

// AFTER: (Remove /user/ prefix)
async sendOtp(data: OtpRequest) {
  return apiClient.post('/auth/send-otp', data);
}

async verifyOtp(data: OtpVerification) {
  return apiClient.post('/auth/verify-otp', data);
}

async refreshToken(refreshToken: string) {
  return apiClient.post('/auth/refresh-token', { refreshToken });
}

async logout() {
  return apiClient.post('/auth/logout');
}

async getProfile() {
  return apiClient.get('/auth/me');
}

async updateProfile(data: ProfileUpdate) {
  return apiClient.put('/auth/profile', data);
}

async completeOnboarding(data: ProfileUpdate) {
  return apiClient.post('/auth/complete-onboarding', data);
}

async deleteAccount() {
  return apiClient.delete('/auth/account');
}

async getUserStatistics() {
  return apiClient.get('/auth/statistics');
}
```

**Check Other Services Too:**

Files to review:
- `services/cartApi.ts` - May use `/user/cart/*`
- `services/ordersApi.ts` - May use `/user/orders/*`
- `services/wishlistApi.ts` - May use `/user/wishlist/*`
- `services/walletApi.ts` - May use `/user/wallet/*`
- `services/reviewApi.ts` - May use `/user/reviews/*`
- `services/notificationService.ts` - May use `/user/notifications/*`

**Pattern to follow:**
```typescript
// If backend route is: /api/products
// Frontend should use: /products

// If backend route is: /api/auth/login
// Frontend should use: /auth/login

// NOT: /user/auth/login
```

---

## 🟡 CRITICAL FIX #3: Payment Gateway Config

### Problem
Razorpay key is placeholder: `rzp_test_your_razorpay_key_id`

### Solution: Add Valid Test Keys

**File:** `frontend/.env`

```bash
# BEFORE:
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id

# AFTER: (Get from https://dashboard.razorpay.com/app/keys)
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_1234567890abcd
```

**To Get Razorpay Test Keys:**
1. Go to https://dashboard.razorpay.com/
2. Sign up or login
3. Navigate to Settings → API Keys
4. Generate Test Keys (NOT Live Keys)
5. Copy Test Key ID (starts with `rzp_test_`)
6. Update `.env` file
7. Restart app

**For Testing:**
Test card numbers:
- Success: 4111 1111 1111 1111
- OTP: 1234

---

## ⚡ QUICK VERIFICATION STEPS

### After Fixing Auth:

1. **Test Registration:**
```bash
curl -X POST http://localhost:5001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","email":"test@test.com"}'

# Should return:
# {"success":true,"message":"OTP sent successfully"}
```

2. **Test Verification:**
```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","otp":"123456"}'

# Should return:
# {
#   "success":true,
#   "data":{
#     "user":{...},
#     "tokens":{
#       "accessToken":"...",
#       "refreshToken":"..."
#     }
#   }
# }
```

3. **Test Protected Endpoint:**
```bash
TOKEN="your_access_token_here"

curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {"success":true,"data":{"id":"...","phoneNumber":"9876543210",...}}
```

---

## 🎯 TESTING CHECKLIST

After applying fixes, test in this order:

### Phase 1: Authentication (15 min)
- [ ] Send OTP to new number
- [ ] Receive OTP (or use test OTP)
- [ ] Verify OTP successfully
- [ ] User logged in with token
- [ ] Token stored in AsyncStorage
- [ ] Profile data retrieved

### Phase 2: Basic Features (30 min)
- [ ] Browse products
- [ ] View product details
- [ ] Add to cart
- [ ] Update cart quantity
- [ ] View cart summary
- [ ] Remove from cart

### Phase 3: Order Flow (30 min)
- [ ] Select delivery address
- [ ] Choose payment method (COD)
- [ ] Place order successfully
- [ ] View order in history
- [ ] Track order status
- [ ] Check order details

### Phase 4: Advanced Features (45 min)
- [ ] Add to wishlist
- [ ] View wishlist
- [ ] Check wallet balance
- [ ] Top up wallet
- [ ] Submit product review
- [ ] View notifications
- [ ] Use referral code

---

## 🔧 DEBUGGING TIPS

### If OTP Still Fails:
```javascript
// Check backend logs for:
console.log('📱 OTP Request:', req.body);
console.log('👤 User lookup:', user);
console.log('🔐 OTP generated:', otp);
console.log('📧 SMS/Email sent:', result);
```

### If Token Issues:
```javascript
// In frontend, check:
const token = await AsyncStorage.getItem('access_token');
console.log('🎫 Stored token:', token);

const apiToken = apiClient.getAuthToken();
console.log('🌐 API client token:', apiToken);
```

### If API Calls Fail:
```javascript
// Enable verbose logging in apiClient.ts:
console.log('🚀 Request:', {
  url: `${this.baseURL}${endpoint}`,
  method,
  headers: requestHeaders,
  body
});
```

---

## 📱 FRONTEND RESTART

After making changes:

### Expo Development Server:
```bash
# Stop current server (Ctrl+C)

# Clear cache and restart:
npx expo start -c

# Or for web:
npx expo start --web -c
```

### React Native:
```bash
# iOS:
npx react-native run-ios

# Android:
npx react-native run-android
```

---

## 🔄 BACKEND RESTART

After making changes:

```bash
# Navigate to backend directory:
cd ../user-backend

# Restart server:
npm run dev
# or
node server.js
# or
nodemon server.js
```

---

## ✅ SUCCESS INDICATORS

You'll know fixes worked when:

1. **Auth Working:**
   - New user can register ✅
   - OTP sent successfully ✅
   - Login succeeds with token ✅
   - Protected endpoints accessible ✅

2. **Cart Working:**
   - Items added to cart ✅
   - Cart count updates ✅
   - Prices calculated correctly ✅
   - Cart persists across sessions ✅

3. **Orders Working:**
   - Order placed successfully ✅
   - Order appears in history ✅
   - Tracking works ✅
   - Status updates received ✅

---

## 📞 HELP & SUPPORT

### If Still Having Issues:

1. **Check Logs:**
   - Backend console output
   - Frontend console output
   - Network tab in browser DevTools

2. **Verify Environment:**
   - Backend running on port 5001 ✅
   - MongoDB connected ✅
   - Frontend pointing to correct API URL ✅
   - Environment variables loaded ✅

3. **Common Mistakes:**
   - Forgot to restart after changes
   - Wrong API base URL
   - Missing environment variables
   - CORS issues
   - Token not set in headers

---

## 📚 RELATED DOCUMENTS

- **INTEGRATION_TEST_REPORT.md** - Detailed test results
- **TEST_SCENARIOS.md** - Complete test cases
- **INTEGRATION_TEST_SUMMARY.md** - Quick overview

---

## 🎓 FINAL NOTES

### Time Estimates:
- **Fix Auth Backend:** 30-45 min
- **Fix Frontend Paths:** 15-30 min
- **Configure Payment:** 10-15 min
- **Testing All Fixes:** 60-90 min
- **Total:** 2-4 hours

### Success Rate After Fixes:
- Current: 78.2% (68/87 tests)
- **Expected: 95%+ (82+/87 tests)** ✅

### Features Unlocked:
- Authentication flow ✅
- Cart operations ✅
- Order management ✅
- Wallet operations ✅
- Reviews & ratings ✅
- Wishlist ✅
- Notifications ✅
- Payment processing ✅

---

**Good luck! 🚀**
**You're just a few changes away from a fully functional app!**
