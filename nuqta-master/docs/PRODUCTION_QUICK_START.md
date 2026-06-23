# Production Quick Start Guide

**Quick reference for deploying REZ App to production**

---

## Pre-Flight Checklist

### 1. Run Verification Script

```bash
cd frontend
ts-node scripts/verify-production-readiness.ts
```

This will check:
- Backend routes availability
- Required files existence
- Mock data detection
- TODO comments
- Environment configuration

---

## 2. Critical Items to Fix

### HIGH PRIORITY

1. **OTP Verification (CRITICAL)**
   - File: `app/onboarding/otp-verification.tsx:82`
   - Action: Review and uncomment production code
   - Status: ⚠️ MUST FIX BEFORE DEPLOYMENT

2. **UGC System Decision**
   - File: `app/ugc/[id].tsx`
   - Action: Either implement API or disable route
   - Status: ⚠️ DECIDE BEFORE DEPLOYMENT

### MEDIUM PRIORITY

3. **Payment Web Fallback**
   - File: `app/payment-razorpay.tsx:294-307`
   - Action: Remove mock or ensure expo-dev-client is used
   - Status: ⚠️ REVIEW

---

## 3. Environment Variables

### Frontend (.env)

```env
# Required
EXPO_PUBLIC_API_URL=https://your-production-api.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx

# Optional
EXPO_PUBLIC_ENVIRONMENT=production
```

### Backend (.env)

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rez-prod

# Cloudinary (Bill Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_secret_key

# Razorpay (Payments)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# JWT Security
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=production
PORT=5001
```

---

## 4. Backend Verification

### Check Routes Are Registered

Look for these console logs when starting backend:

```
✅ Bill routes registered at /api/bills
✅ Unified gamification routes registered at /api/gamification
✅ Social feed routes registered at /api/social
```

### Test Critical Endpoints

```bash
# Health check
curl https://your-api.com/health

# Bill upload
curl https://your-api.com/api/bills -H "Authorization: Bearer YOUR_TOKEN"

# Gamification
curl https://your-api.com/api/gamification/challenges -H "Authorization: Bearer YOUR_TOKEN"

# Payment methods
curl https://your-api.com/api/payment-methods
```

---

## 5. Mock Data Status

### Production Ready (No Mock Data)
- ✅ WalletScreen.tsx - Uses real APIs
- ✅ EventPage.tsx - Uses real APIs with fallback
- ✅ All payment flows - Real Razorpay integration

### Needs Attention
- ⚠️ payment-razorpay.tsx - Has web fallback mock (development only)
- ⚠️ ugc/[id].tsx - Entirely mock data (needs API or disable)

---

## 6. Build for Production

### iOS

```bash
cd frontend
eas build --platform ios --profile production
```

### Android

```bash
cd frontend
eas build --platform android --profile production
```

### Web

```bash
cd frontend
npx expo export:web
```

---

## 7. Testing Checklist

Before going live, test these flows:

- [ ] User registration with OTP
- [ ] Login with OTP
- [ ] Browse products and categories
- [ ] Add items to cart
- [ ] Checkout flow
- [ ] Razorpay payment (native, not web fallback)
- [ ] Wallet operations
- [ ] Bill upload and verification
- [ ] Gamification features
- [ ] Social feed
- [ ] Profile management

---

## 8. Post-Deployment Monitoring

### What to Monitor

1. **Payment Success Rate**
   - Target: >95%
   - Alert if: <90%

2. **API Response Times**
   - Target: <500ms for 95th percentile
   - Alert if: >1000ms

3. **Error Rates**
   - Target: <1%
   - Alert if: >5%

4. **User Flows**
   - Registration completion rate
   - Checkout completion rate
   - Payment completion rate

---

## 9. Rollback Plan

If issues occur:

1. **Immediate:**
   - Revert to previous stable version
   - Notify users via app announcement

2. **Communication:**
   - Post status on social media
   - Send push notifications if needed

3. **Investigation:**
   - Check backend logs
   - Review error tracking (Sentry, etc.)
   - Test affected features in staging

---

## 10. Support Resources

### Documentation
- Full report: `FINAL_PRODUCTION_STATUS.md`
- Verification script: `scripts/verify-production-readiness.ts`

### Backend Info
- Server file: `user-backend/src/server.ts`
- Routes: Lines 364-373
- Total endpoints: 211
- API modules: 23

### Key Files to Review
1. `app/onboarding/otp-verification.tsx:82` - OTP TODO
2. `app/payment-razorpay.tsx:294-307` - Payment fallback
3. `app/ugc/[id].tsx` - Mock data

---

## Quick Commands Reference

```bash
# Verify production readiness
ts-node scripts/verify-production-readiness.ts

# Build for production
eas build --platform all --profile production

# Deploy backend
npm run build && npm start

# Check backend health
curl https://your-api.com/health | jq

# View backend logs
pm2 logs rez-backend

# Monitor API
watch -n 5 'curl -s https://your-api.com/health | jq .database'
```

---

**Last Updated:** October 24, 2025
**Status:** Ready for deployment with noted fixes
**Version:** 1.0.0
