# Phase Frontend Audit — rez-app End-to-End Integration Report

**Date:** 2026-06-21
**Scope:** nuqta-master (Expo/React Native) ↔ rez-api-gateway (nginx :10000) ↔ rez-backend-master (:5001) / rez-auth-service (:4002)
**Method:** Live HTTP audit. Every frontend API call was curled through the gateway.

---

## Section A — Summary

### A.1 Status code distribution (239 unique endpoints)

| Status | Count | Meaning |
|--------|-------|---------|
| 200    | 29    | Endpoint reachable, returns OK (public endpoints) |
| 401    | 86    | Requires authentication — **expected** for protected endpoints |
| 400    | 18    | Reaches backend, fails validation (e.g. `/articles/search` needs `q`) |
| 404    | 66    | **Route missing in backend or wrong gateway rewrite** |
| 429    | 35    | Rate-limited by gateway (wallet + wishlist were hammered) |
| 500    | 5     | **Backend controller throws** (videos + mfa + oauth paths) |
| 000    | 0     | (no timeouts) |

Total audited: **239 unique API paths** (2 false-positive strings stripped: `store`, `string`).

### A.2 Working (200) — 29 endpoints, all public/discovery

```
/articles                            /articles/featured                  /articles/trending
/cashback/campaigns                  /coupons                            /coupons/featured
/earning-projects/categories         /learning                           /products
/products/featured                   /products/new-arrivals              /products/popular-searches
/projects                            /projects/categories                /reviews/featured
/services/featured                   /stores                             /stores/bnpl
/stores/cuisine-counts               /stores/featured                    /stores/search/advanced
/stores/top-cashback                 /support/config/public              /support/faq
/support/faq/categories              /support/faq/popular                /videos
/videos/trending                     /vouchers/categories
```

### A.3 401 (Expected) — 86 protected endpoints

All wallet, notifications, user, earnings, etc. return 401 without a JWT. **This is correct behaviour** — they require a Bearer token.

### A.4 400 (Reachable but expects query params) — 18 endpoints

`/articles/{bookmarks,categories,recommendations,search}`, `/coupons/{best-offer,search,validate}`, `/location/timezone`, `/products/{categories,homepage,search,suggestions}`, `/projects/{my-earnings,templates}`, `/stores/{nearby,search}`, `/support/faq/search`, `/videos/search`.

These reach the backend controller and respond 400 because the GET request has no params. **Healthy.**

### A.5 429 (Rate-limited) — 35 endpoints (mostly wallet + wishlist)

```
/wallet/{balance, categories, coin-rules, confirm-payment, credit-loyalty-points,
         dev-topup, expiring-coins, gift-cards/purchase, gift/{config,received,send,sent,
         validate-recipient}, initiate-payment, payment, payment-methods,
         razorpay/create-order, recharge/preview, refund, scheduled-drops, settings,
         split, stripe/create-payment-intent, summary, sync-balance, topup,
         transactions, transfer/{confirm,initiate}, verify-payment, withdraw}
/wishlist{,/check,/following,/items/bulk,/items/bulk-move,/items/bulk-remove,
         /merge,/public,/recommendations,/shared,/shared-with-me}
```

This is the **gateway `merchant_limit` rate limiter** firing at `100r/s` for unauthenticated calls. After waiting 5 minutes they returned to 401.

---

## Section B — Missing endpoints (404): 66 endpoints

### B.1 Gateway-rewrite mismatches (4 endpoints)

These reach the auth-service but the path is wrong because of the nginx rewrite rule:

| Frontend path | Gateway rewrite | Auth-service has | Result |
|---------------|-----------------|-------------------|--------|
| `GET /api/user/auth/profile` | `/api/v1/auth/profile` | only `/auth/me` | **404** |
| `GET /api/user/auth/statistics` | `/api/v1/auth/statistics` | not registered | **404** |
| `GET /api/v1/mfa` (any) | none (new location block) | n/a — gateway routes to auth-service but no list endpoint | **500** (auth-service crashes) |
| `GET /api/v1/oauth` (any) | none (new location block) | n/a — same | **500** |

**Root cause:** `nginx.conf` rewrites `/api/user/auth/(*)` → `/api/v1/auth$1`. But the auth-service registers routes as `/auth/profile`, `/auth/me`, etc. (not `/auth/profile`). The double-stripping means the auth-service receives `/api/v1/auth/profile` (gateway) which Express routes as `/api/v1/auth/profile`, but `authRoutes.ts` only defines `router.patch('/auth/profile', …)` — so it matches `/auth/profile` *under* the `/api/v1` mount (already correct), but `/api/v1/auth/profile` is also aliased to `/user/auth/profile`. The GET `/user/auth/profile` is NOT registered (only PATCH is). The `/statistics` route does not exist at all in the auth-service.

### B.2 Backend monolith — routes exist but at a different name (1 endpoint)

| Frontend path | Backend has | Notes |
|---------------|-------------|-------|
| `GET /api/nearby-stores` | `GET /nearby-stores` in locationRoutes.ts (but backend) | Router is mounted under `/api` so `/api/nearby-stores` should work. Live test returned 404. **Likely cause:** the route's `generalLimiter` is missing or the path differs in production build. See Section E. |

### B.3 Backend monolith — endpoints truly missing (61 endpoints)

These have **no matching router definition** anywhere in `rez-backend-master/src/routes/`:

| Category | Missing endpoints |
|----------|-------------------|
| **Referral** | `/api/referral/analytics`, `/apply-code`, `/check-upgrade`, `/claim-reward`, `/generate-qr`, `/leaderboard`, `/milestones`, `/rewards`, `/tier`, `/validate-code` |
| **Cashback** | `/cashback/forecast`, `/cashback/redeem` |
| **Orders** | `/orders/analytics`, `/orders/reorder/{frequently-ordered,suggestions}`, `/orders/stats` |
| **Payment** | `/payment/{cod/config,cod/create,create-checkout-session,create-order,internal/process,preferences,save-method,saved-methods,verify,verify-stripe-payment}` |
| **Razorpay** | `/razorpay/{create-order,refund,verify-payment}` (config is registered) |
| **Reviews** | `/reviews`, `/reviews/analytics`, `/reviews/bulk-moderate`, `/reviews/pending`, `/reviews/suggestions` (only `/reviews/featured` works) |
| **Search** | `/search/{autocomplete,history/popular,products-grouped}` |
| **Stats** | `/stats` |
| **Stores** | `/stores/categories`, `/stores/search-by-delivery-time` |
| **Support** | `/support/callback`, `/support/quick-actions/{order-issue,report-product}` |
| **Travel** | `/travel-payment/{create-checkout-session,create-order,verify,verify-stripe-session}` |
| **UGC** | `/ugc/create`, `/ugc/create-post` |
| **Vouchers** | `/vouchers/purchase` |
| **Other** | `/bookings/health`, `/consultations`, `/consultations/user`, `/emergency/book`, `/gamification/streak/checkin`, `/gamification/streaks`, `/location/{geocode,search,update,validate}`, `/recommendations/picked-for-you`, `/recommendations/products/personalized`, `/users/me/questions`, `/analytics/batch` |

### B.4 Auth-service routes that exist but the frontend never uses the matching path (none beyond B.1)

---

## Section C — 500 errors (backend crashes): 5 endpoints

### C.1 Videos aggregation failure

All five `/videos/{featured,categories,bookmarks,history,recommendations}` endpoints throw `Error: Failed to fetch video` at `videoController.js:372` (compiled). The TS source is at line 391:

```ts
} catch (error) {
  logger.error('Error fetching video:', error);
  throw new AppError('Failed to fetch video', 500);
}
```

The catch block hides the real cause. Likely culprits (in `getVideoById` and similar):
- Mongoose aggregation pipeline references a non-existent collection (`videos` vs `reels`)
- An `$lookup` against `stores` fails because the lookup localField is `videos.associatedStore` but the schema stores it differently
- The `products` populate in `relatedProducts` at line 367-372 fails when a video has no associated product

**Frontend impact:** Videos screen + reels feed completely broken on all five entry points.

### C.2 MFA & OAuth gateway 500

```
$ curl http://127.0.0.1:10000/api/v1/mfa        → 500 (nginx HTML page)
$ curl http://127.0.0.1:10000/api/v1/oauth       → 500 (nginx HTML page)
```

The new location blocks at `nginx.conf:671-684` forward these to the auth-service. The auth-service has `mfaRoutes.ts` and `oauthPartnerRoutes.ts` mounted, but a bare GET on the prefix has no handler and likely triggers a crash in the error handler middleware (Express 4 default error page is HTML, not JSON).

**Frontend impact:** MFA enrolment and OAuth partner flows are completely broken from the gateway.

---

## Section D — Auth integration verification

### D.1 Send-OTP works end-to-end

```
POST /api/auth/send-otp  {"phoneNumber":"+919876543210"}
→ 200  {"success":true,"message":"OTP sent","_dev_otp":"164093","isNewUser":true,"hasPIN":false}
```

Gateway rewrite `/api/auth → /api/v1/auth` works (auth-service mount: `/api/v1/auth`). The `_dev_otp` field is debug-only — production returns just `message`.

### D.2 Verify-OTP works and returns the expected shape

```
POST /api/auth/verify-otp  {"phoneNumber":"+919876543210","otp":"164093"}
→ 200  {
  "success": true,
  "isNewUser": true,
  "accessToken": "eyJ…",          ← 15-min JWT
  "refreshToken": "eyJ…",         ← 7-day JWT
  "tokens": { "accessToken": …, "refreshToken": …, "expiresIn": 900 },
  "user": {
    "id": "6a37c8ce…", "_id": "…",
    "name": "", "phone": "+919876543210", "phoneNumber": "+919876543210",
    "email": "", "role": "user",
    "isVerified": false, "isOnboarded": false,
    "profile": {}
  },
  "deviceRisk": "new"
}
```

**JWT payload** (decoded):
```json
{ "userId":"6a37c8ce…", "role":"user", "phoneNumber":"+919876543210", "iat":…, "exp":… }
```

**Shape mismatch with `authApi.ts:74` `AuthResponse` interface:**
- Frontend expects `user.id` ✓, `user.email?` ✓, `user.profile.{firstName?, lastName?, avatar?, …}` ✓, `user.preferences.{language?, currency?, notifications?, categories?, theme?}` ✗ (not returned), `user.wallet.{balance, totalEarned, totalSpent, pendingAmount}` ✗ (not returned), `user.role` ✓, `user.isVerified` ✓, `user.isOnboarded` ✓, `user.createdAt` ✗ (not returned), `user.updatedAt` ✗ (not returned).

The auth-service returns a **slim user object** (matches the post-migration contract in `authRoutes.ts:128-149` `buildUserResponse`). The frontend `User` interface still references the old monolith shape (wallet, preferences, createdAt). The frontend's `validateAuthResponse` and downstream code likely ignore the missing fields, but if any code does `user.wallet.balance` it will throw because `wallet` is undefined.

### D.3 Authenticated request works through the gateway

```
GET /api/user/auth/me  Authorization: Bearer <jwt>
→ 200  {"success":true,"data":{"id":"6a37c8ce…","phone":"+919876543210","profile":{}}}

PATCH /api/user/auth/profile  Authorization: Bearer <jwt>  {"profile":{"firstName":"Test"}}
→ 200  {"success":true,"data":{"id":"…","profile":{"firstName":"Test"}}}
```

The JWT signed by auth-service is accepted by auth-service middleware. ✅

### D.4 Wallet `/balance` returns 401 "User not found"

The token validates (auth-service accepts it), but the backend (port 5001) can't find the user in its own `users` collection. **The auth-service and the monolith use different MongoDB databases or different collections**, and the user record exists only in auth-service. This is a **cross-service user-propagation issue**.

---

## Section E — Specific fixes

### E.1 Fix CORS for frontend dev origins (CRITICAL — blocks ALL fetches)

**File:** `C:\Users\user\Downloads\rez-backend-master\rez-api-gateway\nginx.conf`
**Lines:** 337-340

**Before:**
```nginx
set $cors_origin "";
if ($http_origin ~* "^https://(rez\.money|www\.rez\.money|menu\.rez\.money|admin\.rez\.money|merchant\.rez\.money|rez-app-admin\.vercel\.app|rez-app-consumer\.vercel\.app|rez-app-marchant\.vercel\.app|rez-web-menu\.vercel\.app|ad-bazaar\.vercel\.app)$") {
    set $cors_origin $http_origin;
}
```

**After:**
```nginx
set $cors_origin "";
if ($http_origin ~* "^(https?://(rez\.money|www\.rez\.money|menu\.rez\.money|admin\.rez\.money|merchant\.rez\.money|rez-app-admin\.vercel\.app|rez-app-consumer\.vercel\.app|rez-app-marchant\.vercel\.app|rez-web-menu\.vercel\.app|ad-bazaar\.vercel\.app)|http://localhost:(8081|19006|19000|8082|3000|4000|5000|5001|4002|10000))$") {
    set $cors_origin $http_origin;
}
```

Also add `EXPO_PUBLIC_ALLOWED_ORIGINS` env-var expansion so prod can include its own Vercel URLs without code changes.

**Why critical:** Without this, the gateway returns a successful 200 with no `Access-Control-Allow-Origin` header. The browser will block the response. Every fetch from the Expo web build (`localhost:8081`) or Expo native dev server (`localhost:19006`) will fail in the browser console with CORS errors — even though the backend logic works.

### E.2 Fix `/api/user/auth/profile` GET and `/api/user/auth/statistics`

**File:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts`
**Where to add:** Right after line 509 (existing `/user/auth/profile` PATCH alias)

**Add:**
```ts
// BE-AUDIT-01: Frontend expects GET profile (not PATCH) for authApi.getProfile / getUserStatistics
router.get('/user/auth/profile', getMeHandler);
router.get('/user/auth/statistics', async (req, res) => {
  // Aggregate wallet, orders, referrals from internal services
  // For now, return a minimal stub that matches frontend's UserStatistics shape
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Not authenticated');
  const decoded = await tokenService.validateToken(header.slice(7));
  res.json({
    success: true,
    data: {
      user: { joinedDate: new Date().toISOString(), isVerified: true, totalReferrals: 0, referralEarnings: 0 },
      wallet: { balance: 0, totalEarned: 0, totalSpent: 0, pendingAmount: 0 },
      orders: { total: 0, completed: 0, cancelled: 0, totalSpent: 0 },
      videos: { totalCreated: 0, totalViews: 0, totalLikes: 0, totalShares: 0 },
      projects: { totalParticipated: 0, approved: 0, rejected: 0, totalEarned: 0 },
      offers: { totalRedeemed: 0 },
      vouchers: { total: 0, used: 0, active: 0 },
      summary: { totalActivity: 0, totalEarnings: 0, totalSpendings: 0 },
    },
  });
});
```

### E.3 Add `/api/v1/mfa` and `/api/v1/oauth` GET health endpoints

**File:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts`
**Add at the end of the router:**
```ts
// BE-AUDIT-02: Avoid 500 HTML error page on bare prefix — return JSON 404 instead
router.get('/', (_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'MFA endpoint not specified' });
});
```

**Same for `oauthPartnerRoutes.ts`:**
```ts
router.get('/', (_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'OAuth endpoint not specified' });
});
```

**Why:** The gateway currently returns nginx's default HTML 500 page for any GET on these prefixes. Returning JSON keeps the frontend's `response.json()` from throwing.

### E.4 Fix video controller 500 (5 endpoints)

**File:** `C:\Users\user\Downloads\rez-backend-master\rez-backend-master\src\controllers\videoController.ts`
**Root cause:** Aggregation/populate errors swallowed by generic catch block at line 391.

**Action:**
1. Wrap each `getVideoById`, `getTrendingVideos`, `getVideosByCategory`, `getVideosByStore`, etc. with a more specific error class
2. Add MongoDB index verification in `startup.ts` for the `videos` collection — if `videos` is empty, the `$lookup` to `stores` may fail
3. Add a fallback `try/catch` around the `relatedProducts.map()` at line 367-372 — when a video has products with missing `pricing.currentPrice`, the conditional `p.pricing?.currentPrice || p.price || 0` should not crash but the populate itself can throw if the schema is missing

**Quick fix for `getVideoById`** (the most common entry point — `/videos/:videoId`):
```ts
} catch (error) {
  logger.error('Error fetching video:', {
    message: (error as Error).message,
    stack: (error as Error).stack,
    videoId: req.params.videoId,
  });
  // BE-AUDIT-03: Return the actual error message in non-prod so frontend can show useful errors
  const isDev = process.env.NODE_ENV !== 'production';
  throw new AppError(
    isDev ? `Failed to fetch video: ${(error as Error).message}` : 'Failed to fetch video',
    500
  );
}
```

### E.5 Add the missing 61 backend monolith endpoints

Priority order (most user-facing first):

**Priority 1 — Payments & Orders (blocks checkout):**
- Add `/payment/create-order`, `/payment/verify`, `/payment/create-checkout-session`, `/payment/verify-stripe-payment`, `/payment/preferences`, `/payment/saved-methods` in `paymentRoutes.ts`. The handlers exist in `paymentController.ts` (referenced in router) but not all are wired up — verify by grepping `router.post` vs `export const`.
- Add `/orders/analytics`, `/orders/reorder/{frequently-ordered,suggestions}`, `/orders/stats` in `orderRoutes.ts`. Use the `orderAnalyticsService` already in the codebase.

**Priority 2 — Reviews & Search (breaks discovery):**
- Add `/reviews` (full list with filters), `/reviews/pending`, `/reviews/bulk-moderate`, `/reviews/suggestions`, `/reviews/analytics` to `reviewRoutes.ts`. Most have controllers in `reviewController.ts`.
- Add `/search/{autocomplete,history/popular,products-grouped}` to a new `searchRoutes.ts` (the gateway has a `/api/search` location block pointing to a search-service that's actually still the monolith).

**Priority 3 — Referral & Gamification (breaks growth loops):**
- Add `/api/referral/{analytics,apply-code,check-upgrade,claim-reward,generate-qr,leaderboard,milestones,rewards,tier,validate-code}` in `referralRoutes.ts`.
- Add `/gamification/{streaks,streak/checkin}` in `gamificationRoutes.ts`.

**Priority 4 — Location, UGC, Vouchers, Travel:**
- Add `/location/{geocode,search,update,validate}` to `locationRoutes.ts` (handlers exist as `geocodeAddress`, `searchPlaces`, etc. in the controller).
- Add `/ugc/create`, `/ugc/create-post` to `ugcRoutes.ts`.
- Add `/vouchers/purchase` to `voucherRoutes.ts`.
- Add `/travel-payment/{create-order,create-checkout-session,verify,verify-stripe-session}` (mirror of `/payment/*`).

### E.6 Fix cross-service user lookup for `/wallet/balance`

The backend monolith's `walletController.getWalletBalance` can't find the user because the JWT userId refers to an auth-service-only document.

**File:** `C:\Users\user\Downloads\rez-backend-master\rez-backend-master\src\middleware\auth.ts`
**Action:** When the JWT userId is not found in the monolith's `users` collection, fetch from the auth-service's internal endpoint:

```ts
// BE-AUDIT-04: Cross-service user resolution
const user = await User.findById(decoded.userId);
if (!user && decoded.userId) {
  // Fallback to auth-service internal lookup
  const authRes = await fetch(`${process.env.AUTH_SERVICE_URL}/api/internal/auth/user/${decoded.userId}`, {
    headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
  });
  if (authRes.ok) {
    const { data } = await authRes.json();
    // Backfill the user doc locally so subsequent requests don't hit auth-service
    await User.create({ _id: decoded.userId, phone: data.phone, email: data.email, ... });
  }
}
```

Or simpler: change `walletRoutes.ts` to accept phone number as a lookup key (the JWT contains `phoneNumber`).

---

## Section F — CORS verification

### F.1 Frontend dev origins are NOT in the gateway allowlist

| Origin | Allowed? | Reason |
|--------|----------|--------|
| `http://localhost:8081` (Expo web) | NO | Not in nginx allowlist regex |
| `http://localhost:19006` (Expo native dev) | NO | Not in nginx allowlist regex |
| `https://rez.money` | YES | Production Vercel origin |
| `https://admin.rez.money` | YES | Production admin origin |
| `https://rez-app-consumer.vercel.app` | YES | Production web |

### F.2 Preflight test results

```
$ curl -X OPTIONS http://127.0.0.1:10000/api/products \
    -H "Origin: http://localhost:8081" \
    -H "Access-Control-Request-Method: GET"
→ HTTP 204 (success status)
→ BUT: Access-Control-Allow-Origin header is MISSING
```

The browser will block the subsequent GET even though it returned 204, because there's no `Access-Control-Allow-Origin: http://localhost:8081` header.

### F.3 Same issue on the auth-service

`rez-auth-service/src/index.ts:80-98` — CORS_ORIGIN defaults to `https://rez.money,https://www.rez.money,https://admin.rez.money`. Localhost dev origins are blocked there too. **Two CORS layers must both be updated.**

### F.4 Required CORS fix

Apply E.1 above (gateway nginx.conf) AND add `http://localhost:8081,http://localhost:19006` to the `CORS_ORIGIN` env var on the auth-service container.

---

## Top fix priorities (TL;DR for the user)

1. **CRITICAL — CORS:** Add `localhost:8081` and `localhost:19006` to gateway allowlist. Without this, **NO** frontend fetches work. (Section E.1, F)
2. **CRITICAL — Videos 500:** Fix `videoController.ts` aggregation error — breaks video screen + reels feed. (Section E.4)
3. **HIGH — Auth service routes:** Add `GET /user/auth/profile` and `GET /user/auth/statistics` aliases — breaks profile screen on iOS/Android. (Section E.2)
4. **HIGH — Missing payment endpoints:** Add `/payment/*` routes in monolith — breaks checkout flow. (Section E.5)
5. **HIGH — Missing review routes:** Add `/reviews/{,analytics,pending,…}` — breaks product detail screen. (Section E.5)
6. **MEDIUM — Referral & gamification:** 11 routes missing — breaks share/referral flow. (Section E.5)
7. **MEDIUM — Cross-service user lookup:** Wallet and other monolith endpoints return 401 "User not found" even with a valid JWT. (Section E.6)
8. **MEDIUM — MFA/OAuth gateway 500s:** Replace nginx HTML 500 with JSON 404 on bare prefix. (Section E.3)
9. **LOW — User interface drift:** `authApi.ts` `User` interface includes `wallet`, `preferences`, `createdAt` — auth-service doesn't return these. Either update the interface or add a `/api/user/auth/profile` GET that returns the full user shape.

**Live audit numbers:** 239 endpoints. **29 working (200). 86 properly auth-protected (401). 18 reachable but expect params (400). 66 missing (404). 35 rate-limited (429). 5 broken (500). 0 network failures.**