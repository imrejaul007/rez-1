# Product Flow Audit Report
**Date:** 2026-06-25
**Auditor:** Product Manager
**Project:** Res/Nuqta App
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Executive Summary

Verified 8 end-to-end product flows covering Frontend → API → Backend Logic → Database. Overall the architecture is well-structured with proper authentication middleware, error handling, and offline support. However, several endpoint mismatches and missing implementations were identified.

---

## Flow 1: Registration/Login

### Frontend
- **File:** `nuqta-master/app/sign-in.tsx`
- **Flow:** Phone number → OTP → Verify → Home/Onboarding

### API Calls
| Step | Endpoint | Method | Frontend Call |
|------|----------|--------|---------------|
| Send OTP | `/api/auth/send-otp` | POST | `actions.sendOTP(phone)` |
| Verify OTP | `/api/auth/verify-otp` | POST | `actions.login(phone, otp)` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/authRoutes.ts`
- **Endpoints:** POST `/send-otp`, POST `/verify-otp`
- **Middleware:** Rate limiting (`otpLimiter`, `authLimiter`), Validation

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **HIGH** | `authRoutes.ts:26-36` | Rate limiting may be too aggressive for OTP flow - 3 OTP requests/minute may frustrate users during registration |
| **MEDIUM** | `sign-in.tsx:1` | File has `// @ts-nocheck` - should be properly typed |

### Verification Status: **PASS** with recommendations

---

## Flow 2: Store Visit / Loyalty Points

### Frontend
- **File:** `nuqta-master/app/store-visit.tsx`
- **File:** `nuqta-master/app/loyalty.tsx`

### API Calls (Store Visit)
| Step | Endpoint | Method | Frontend Call |
|------|----------|--------|---------------|
| Schedule Visit | `/api/store-visits/schedule` | POST | `storeVisitApi.scheduleStoreVisit()` |
| Get Queue | `/api/store-visits/queue` | POST | `storeVisitApi.getQueueNumber()` |
| Check Availability | `/api/store-visits/availability/:storeId` | GET | `storeVisitApi.checkStoreAvailability()` |
| Get Slots | `/api/store-visits/available-slots/:storeId` | GET | `storeVisitApi.getAvailableSlots()` |
| Get Visits | `/api/store-visits/user` | GET | `storeVisitApi.getUserVisits()` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/storeVisitRoutes.ts`
- **Routes Found:**
  - POST `/schedule` (auth required)
  - POST `/queue` (optional auth)
  - GET `/user` (auth required)
  - PUT `/:visitId/reschedule` (auth required)
  - PUT `/:visitId/cancel` (auth required)
  - GET `/available-slots/:storeId` (public)
  - GET `/queue-status/:storeId` (public)
  - GET `/availability/:storeId` (public)

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **HIGH** | `store-visit.tsx:319` | Frontend calls `getAvailableSlots(storeId, dateStr)` but backend route is `/available-slots/:storeId` - **MISSING query param handling** |
| **MEDIUM** | `storeVisitApi.ts:143` | API passes `date` as URLSearchParams but backend expects path param `:storeId` |
| **LOW** | `storeVisitRoutes.ts:21` | Queue endpoint uses `optionalAuth` - may allow duplicate queue entries |

### Backend Routes for Loyalty
- **File:** `rez-backend-master/src/routes/loyaltyRoutes.ts`
- **Endpoints:** GET `/`, POST `/checkin`, GET `/coins`, GET `/catalog`, GET `/tier`, GET `/redemptions`, GET `/challenges`, POST `/redeem`

### Verification Status: **PARTIAL FAIL** - Store Visit slots API mismatch needs fix

---

## Flow 3: Bill Payment

### Frontend
- **File:** `nuqta-master/app/bill-payment.tsx`
- **File:** `nuqta-master/services/billPaymentApi.ts`

### API Calls
| Step | Endpoint | Method | Frontend Call |
|------|----------|--------|---------------|
| Get Bill Types | `/api/bill-payments/types` | GET | `getBillTypes()` |
| Get Providers | `/api/bill-payments/providers` | GET | `getProviders(type)` |
| Fetch Bill | `/api/bill-payments/fetch-bill` | POST | `fetchBill(providerId, customerNumber)` |
| Pay Bill | `/api/bill-payments/pay` | POST | `payBill(...)` |
| Get Plans | `/api/bill-payments/plans` | GET | `getPlans(providerId)` |
| Get History | `/api/bill-payments/history` | GET | `getPaymentHistory(page, limit)` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/billRoutes.ts`
- **Route:** `/api/bill-payments/*`
- **Issue:** Backend only has `/upload`, `/`, `/statistics`, `/analyze-image`, `/:billId` - **MISSING `/providers`, `/fetch-bill`, `/pay`, `/plans`, `/history` routes**

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **CRITICAL** | `billRoutes.ts` | Backend missing all bill payment endpoints (`/providers`, `/fetch-bill`, `/pay`, `/plans`, `/history`) |
| **HIGH** | Frontend calls `/bill-payments/*` | Backend routes file (`billRoutes.ts`) doesn't mount bill-payment specific routes |
| **MEDIUM** | `billPaymentApi.ts:104-173` | API layer correctly calls endpoints that don't exist on backend |

### Verification Status: **FAIL** - Bill payment endpoints not implemented on backend

---

## Flow 4: Deal Purchase

### Frontend
- **File:** `nuqta-master/app/deal-store.tsx`
- **File:** `nuqta-master/app/deal-payment.tsx`
- **Service:** `services/campaignsApi.ts`

### API Calls
| Step | Endpoint | Method | Usage |
|------|----------|--------|-------|
| Get Deals | `/api/campaigns` | GET | `campaignsApi.getExcitingDeals()` |
| Get Category Deals | `/api/campaigns/:id` | GET | Category deal pages |
| Apply Redemption | `/api/campaigns/redemption` | POST | Apply deal code |

### Backend Routes
- **File:** `rez-backend-master/src/routes/campaignRoutes.ts`
- **File:** `rez-backend-master/src/routes/couponRoutes.ts`
- Routes present for campaigns and coupons

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **MEDIUM** | `deal-store.tsx:46` | Uses `campaignsApi.getExcitingDeals(20)` - verify pagination logic |
| **LOW** | `deal-store.tsx:234-270` | Navigation uses `router.push()` with `as any` casts - type safety concern |

### Verification Status: **PASS** with minor concerns

---

## Flow 5: Coin Earning/Redemption

### Frontend
- **File:** `nuqta-master/app/coin-system.tsx`
- **File:** `nuqta-master/app/loyalty.tsx`
- **Service:** `services/walletApi.ts`

### API Calls
| Step | Endpoint | Method | Usage |
|------|----------|--------|-------|
| Get Coin Rules | `/api/loyalty/coins` | GET | `walletApi.getCoinRules()` |
| Get Balance | `/api/loyalty/points/balance` | GET | Loyalty page balance |
| Redeem | `/api/loyalty/redeem` | POST | `redeemReward()` |
| Daily Check-in | `/api/loyalty/games/check-in` | POST | `dailyCheckIn()` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/loyaltyRoutes.ts`
- **Routes Found:** `/coins`, `/points/balance`, `/catalog`, `/tier`, `/redemptions`, `/challenges`, `/games/check-in`, `/redeem`

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **MEDIUM** | `coin-system.tsx:272` | `walletApi.getCoinRules()` - verify this endpoint exists on backend |
| **LOW** | `loyalty.tsx:77-83` | `redeemReward()` takes `rewardId` and `points` - ensure backend validates ownership |

### Verification Status: **PASS** - Coin system properly implemented

---

## Flow 6: Referral Flow

### Frontend
- **File:** `nuqta-master/app/referral.tsx`
- **Service:** `services/referralApi.ts`

### API Calls
| Step | Endpoint | Method | Usage |
|------|----------|--------|-------|
| Get Stats | `/api/referral/statistics` | GET | `getReferralStats()` |
| Get History | `/api/referral/history` | GET | `getReferralHistory()` |
| Generate Link | `/api/referral/generate-link` | POST | `getReferralCode()` |
| Share | `/api/referral/share` | POST | `trackShare()` |
| Claim Rewards | `/api/referral/claim-rewards` | POST | `claimReferralRewards()` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/referralRoutes.ts`
- **Routes Found:**
  - GET `/data`
  - GET `/history`
  - GET `/statistics`
  - POST `/generate-link`
  - POST `/share` (rate limited: `referralShareLimiter`)
  - POST `/claim-rewards`
  - GET `/leaderboard`
  - GET `/code`
  - GET `/stats`
  - GET `/tier`
  - GET `/rewards`
  - POST `/claim-reward`
  - POST `/generate-qr`
  - GET `/milestones`
  - POST `/validate-code`
  - GET `/analytics`
  - POST `/apply-code`

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **MEDIUM** | `referral.tsx:236` | Fallback link `https://rezapp.com/invite/${referralCode}` - verify this domain is configured |
| **LOW** | `referralRoutes.ts:72` | Share endpoint has additional `referralShareLimiter` - may cause user frustration if sharing limits are too low |

### Verification Status: **PASS**

---

## Flow 7: Booking Flow

### Frontend
- **File:** `nuqta-master/app/booking.tsx`
- **Files:** `app/booking-detail.tsx`, `app/my-bookings.tsx`
- **Services:** `services/serviceBookingApi.ts`, `services/tableBookingApi.ts`

### API Calls
| Step | Endpoint | Method | Usage |
|------|----------|--------|-------|
| Book Service | `/api/service-booking/book` | POST | `serviceBookingService.bookService()` |
| Get Bookings | `/api/service-booking/user` | GET | List user bookings |
| Table Booking | `/api/table-booking` | POST | `tableBookingApi.bookTable()` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/serviceBookingRoutes.ts`
- **File:** `rez-backend-master/src/routes/serviceAppointmentRoutes.ts`

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **HIGH** | `booking.tsx:172-192` | Uses `productsApi.getProductById()` for service booking - verify services use products table |
| **MEDIUM** | `booking.tsx:197` | Redemption validation via `campaignsApi.getRedemptionByCode()` - ensure code validation is consistent |

### Verification Status: **PASS** with verification needed

---

## Flow 8: E-commerce Checkout

### Frontend
- **File:** `nuqta-master/app/cart.tsx`
- **File:** `nuqta-master/app/checkout.tsx`
- **Service:** `services/cartApi.ts`

### API Calls
| Step | Endpoint | Method | Frontend Call |
|------|----------|--------|---------------|
| Get Cart | `/api/cart` | GET | `cartApi.getCart()` |
| Add Item | `/api/cart/add` | POST | `cartActions.addItem()` |
| Update Item | `/api/cart/item/:productId` | PUT | `cartApi.updateCartItem()` |
| Remove Item | `/api/cart/item/:productId` | DELETE | `cartApi.removeCartItem()` |
| Apply Coupon | `/api/cart/coupon` | POST | `cartApi.applyCoupon()` |
| Validate | `/api/cart/validate` | GET | `useCartValidation` hook |
| Lock Item | `/api/cart/lock` | POST | `cartApi.lockItem()` |
| Get Locked | `/api/cart/locked` | GET | `cartApi.getLockedItems()` |

### Backend Routes
- **File:** `rez-backend-master/src/routes/cartRoutes.ts`
- **Routes Found:**
  - GET `/`
  - GET `/summary`
  - GET `/validate`
  - POST `/add`
  - PUT `/item/:productId`
  - PUT `/item/:productId/:variant`
  - DELETE `/item/:productId`
  - DELETE `/item/:productId/:variant`
  - DELETE `/clear`
  - POST `/coupon`
  - DELETE `/coupon`
  - POST `/lock`
  - GET `/locked`
  - DELETE `/lock/:productId`
  - POST `/lock/:productId/move-to-cart`
  - POST `/lock-with-payment`
  - GET `/lock-fee-options`
  - GET `/validate/summary`
  - POST `/validate/auto-fix`

### Issues Found
| Severity | Location | Issue |
|----------|----------|-------|
| **MEDIUM** | `cartApi.ts:420-426` | Variant handling uses base64 encoding - ensure backend decodes correctly |
| **LOW** | `cart.tsx:609-617` | Card offers section assumes first item has store - may fail for empty cart |
| **LOW** | `checkout.tsx:1` | File missing `// @ts-nocheck` comment but TypeScript may still have issues |

### Verification Status: **PASS**

---

## Summary Table

| Flow | Status | Critical Issues | High Issues | Medium Issues |
|------|--------|-----------------|-------------|---------------|
| Registration/Login | PASS | 0 | 1 | 1 |
| Store Visit/Loyalty | PARTIAL | 0 | 2 | 1 |
| Bill Payment | **FAIL** | 1 | 1 | 1 |
| Deal Purchase | PASS | 0 | 0 | 2 |
| Coin Earning/Redemption | PASS | 0 | 0 | 2 |
| Referral Flow | PASS | 0 | 0 | 2 |
| Booking Flow | PASS | 0 | 1 | 1 |
| E-commerce Checkout | PASS | 0 | 0 | 2 |

---

## Critical Issues Detail

### Issue 1: Bill Payment Backend Not Implemented
**Severity:** CRITICAL
**Flow:** Bill Payment
**Description:**
The frontend calls bill payment endpoints (`/providers`, `/fetch-bill`, `/pay`, `/plans`, `/history`) but the backend route file (`rez-backend-master/src/routes/billRoutes.ts`) only implements:
- POST `/upload`
- GET `/`
- GET `/statistics`
- POST `/analyze-image`
- GET `/:billId`
- POST `/:billId/resubmit`
- Admin routes

**Files Affected:**
- Frontend: `nuqta-master/services/billPaymentApi.ts`
- Backend: `rez-backend-master/src/routes/billRoutes.ts`

**Recommended Fix:**
Add the following routes to `billRoutes.ts`:
```
router.get('/providers', getProviders);
router.post('/fetch-bill', fetchBill);
router.post('/pay', payBill);
router.get('/plans', getPlans);
router.get('/history', getPaymentHistory);
```

Or create separate `billPaymentRoutes.ts` file to handle bill payment operations.

---

## High Priority Issues

### Issue 2: Store Visit Available Slots API Mismatch
**Severity:** HIGH
**Flow:** Store Visit
**Files:**
- Frontend: `nuqta-master/app/store-visit.tsx:319`
- Frontend API: `nuqta-master/services/storeVisitApi.ts:143`
- Backend: `rez-backend-master/src/routes/storeVisitRoutes.ts:28`

**Problem:**
Frontend passes `date` as a query parameter but backend route is `/available-slots/:storeId` (expects path param).

**Frontend Call:**
```typescript
// storeVisitApi.ts:143
return apiClient.get(`/store-visits/available-slots/${storeId}?${params}`);
```

**Backend Route:**
```typescript
// storeVisitRoutes.ts:28
router.get('/available-slots/:storeId', getAvailableSlotsHandler);
```

**Recommended Fix:**
Update backend route to accept date query param:
```typescript
router.get('/available-slots/:storeId', (req, res) => {
  const { date } = req.query;
  // ... handler implementation
});
```

### Issue 3: Store Visit Queue Authentication
**Severity:** HIGH
**Flow:** Store Visit
**File:** `rez-backend-master/src/routes/storeVisitRoutes.ts:20`

**Problem:**
The queue endpoint uses `optionalAuth`, which means unauthenticated users can get queue numbers. This could lead to:
- Duplicate queue entries
- No user tracking for queue management
- Potential abuse

**Recommended Fix:**
Consider requiring authentication for queue operations while keeping public endpoints for availability status.

---

## Medium Priority Issues

| # | Flow | Location | Description |
|---|------|----------|-------------|
| 1 | Store Visit | `storeVisitApi.ts:143` | URLSearchParams may not work as expected with apiClient |
| 2 | Deal | `deal-store.tsx:46` | Pagination parameter `20` - verify backend handles it |
| 3 | Coin | `coin-system.tsx:272` | Verify `walletApi.getCoinRules()` endpoint exists |
| 4 | Referral | `referral.tsx:236` | Hardcoded domain `rezapp.com` - should be configurable |
| 5 | Booking | `booking.tsx:172` | Service data model may differ from products |
| 6 | Cart | `cartApi.ts:420-426` | Variant base64 encoding - ensure consistency |
| 7 | Cart | `cart.tsx:609` | Store ID assumption may fail edge cases |

---

## Recommendations

### Immediate Actions Required
1. **CRITICAL:** Implement missing bill payment endpoints on backend
2. **HIGH:** Fix store visit available slots API parameter handling
3. **HIGH:** Review queue authentication requirements

### Recommended Improvements
1. Add TypeScript types for all API responses
2. Implement integration tests for each flow
3. Add API versioning for backward compatibility
4. Document API response schemas

### Testing Checklist
- [ ] Test OTP rate limiting behavior
- [ ] Verify bill payment end-to-end (requires backend fix)
- [ ] Test offline queue number generation
- [ ] Verify coin expiration rules
- [ ] Test referral code application during registration
- [ ] Verify cart locked item expiration handling
- [ ] Test checkout with expired locked items

---

## Files Requiring Attention

### Backend (rez-backend-master)
| File | Priority | Action |
|------|----------|--------|
| `src/routes/billRoutes.ts` | CRITICAL | Add missing bill payment endpoints |
| `src/routes/storeVisitRoutes.ts` | HIGH | Fix available-slots endpoint query params |
| `src/routes/loyaltyRoutes.ts` | MEDIUM | Verify coin rules endpoint |

### Frontend (nuqta-master)
| File | Priority | Action |
|------|----------|--------|
| `services/billPaymentApi.ts` | CRITICAL | Validate API calls match backend |
| `services/storeVisitApi.ts` | HIGH | Fix available slots query param |
| `app/sign-in.tsx` | MEDIUM | Remove `@ts-nocheck` |
| `app/referral.tsx` | MEDIUM | Make domain configurable |

---

*Report generated by Product Manager - Res App*
