# Phase 1 — Frontend API Audit (`nuqta-master`)

**Audit date:** 2026-06-21
**Target:** `C:\Users\user\Downloads\rez-backend-master\nuqta-master` (Expo / React Native, expo-router)
**Reference:** `C:\Users\user\OneDrive\Desktop\New folder (3)` (already-migrated rez-master consumer)
**Goal:** Capture every API call + auth/token mechanism so the frontend can be rewired to the new gateway + auth-service architecture.

---

## 1. Auth endpoints used

The frontend calls one dedicated auth surface — `/user/auth/*` — via the `apiClient` (`services\apiClient.ts`). All auth calls go through `services\authApi.ts` (`AuthService` class). Logout also calls the same surface.

| Method | Path | Purpose | Callsite |
| --- | --- | --- | --- |
| POST | `/user/auth/send-otp` | Request OTP (login/signup) | `services\authApi.ts:233` |
| POST | `/user/auth/verify-otp` | Verify OTP, get tokens + user | `services\authApi.ts:293` |
| POST | `/user/auth/refresh-token` | Rotate access + refresh JWT | `services\authApi.ts:343` |
| POST | `/user/auth/logout` | Invalidate session on server | `services\authApi.ts:385` |
| GET  | `/user/auth/me` | Fetch current user | `services\authApi.ts:415`, `services\identityApi.ts:71` |
| PUT  | `/user/auth/profile` | Update profile (note: actually `PUT /user/profile` — see profile table) | `services\authApi.ts:475` |
| POST | `/user/auth/complete-onboarding` | Finish onboarding | `services\authApi.ts:519` |
| DELETE | `/user/auth/account` | Delete account | `services\authApi.ts:554` |
| GET  | `/user/auth/statistics` | Aggregated user stats | `services\authApi.ts:626` |

Additional auth-adjacent endpoints hit directly:
- `PUT /auth/change-password` (1x) — `app\account\change-password.tsx`
- `DELETE /auth/account` (1x) — `app\account\delete-account.tsx`
- `POST /user/auth/upload-avatar` (1x) — `services\imageUploadService.ts:79` (uses `fetch` directly, not `apiClient`)

**Token shape on `/user/auth/verify-otp` response** (`services\authApi.ts:70-77`):
```ts
{ user: User, tokens: { accessToken, refreshToken, expiresIn } }
```

---

## 2. API base URLs (with current values from `.env`)

The app uses **two** different `EXPO_PUBLIC_API_*` values; both currently point at the same `http://localhost:5001/api` dev backend.

| Env var | Current value | Read at | Used by |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:5001/api` | `config\env.ts:15`, `services\apiClient.ts:95` | Singleton `apiClient` + `imageUploadService` |
| `EXPO_PUBLIC_API_URL` | `http://localhost:5001/api` | `components\homepage\DealsThatSaveMoney.tsx:373,388`, `services\eventAnalytics.ts`, `components\subscription\StripePaymentModal.tsx` | Ad-hoc `fetch()` callers |
| `EXPO_PUBLIC_DEV_API_URL` | `http://localhost:5001/api` | `config\env.ts:17` | `getApiUrl()` dev branch |
| `EXPO_PUBLIC_PROD_API_URL` | `https://your-production-api.com/api` | `config\env.ts:18` | `getApiUrl()` prod branch (placeholder) |
| `EXPO_PUBLIC_SOCKET_URL` | `http://localhost:5001` | `config\env.ts` (via `EXPO_PUBLIC_SOCKET_URL`) | Realtime socket |
| `EXPO_PUBLIC_AUTH_ENDPOINT` | `/auth` | `config\env.ts:23` | Legacy endpoint prefix (only used by `config\api.ts` for the unused `API_ENDPOINTS` map; actual auth calls hardcode `/user/auth/*`) |

**Critical:** the auth endpoints are **not** built from `EXPO_PUBLIC_AUTH_ENDPOINT` — they are hardcoded as `/user/auth/*` literals in `services\authApi.ts`. So changing the env value alone will not move the auth surface.

Other relevant env vars (auth/token related):
- `EXPO_PUBLIC_JWT_STORAGE_KEY` = `rez_app_token` (legacy, unused — keys are hardcoded in `utils\authStorage.ts`)
- `EXPO_PUBLIC_REFRESH_TOKEN_KEY` = `rez_app_refresh_token` (legacy, unused)
- `EXPO_PUBLIC_USER_DATA_KEY` = `rez_app_user` (legacy, unused)

Full EXPO_PUBLIC list: 73 vars, all listed in `nuqta-master/.env` (see lines 1-87). Highlights: feature flags, geocoding keys (Google/Opencage), Firebase, Stripe, Razorpay, Sentry, Mixpanel, location defaults, region.

**Reference frontend's gateway/auth layout (for comparison):**
- `EXPO_PUBLIC_API_BASE_URL` = `https://rez-api-gateway.onrender.com/api`
- `EXPO_PUBLIC_GATEWAY_URL` = `https://rez-api-gateway.onrender.com`
- `EXPO_PUBLIC_RABTUL_AUTH_URL` = `https://rez-auth-service.onrender.com` (used directly in `services\authApi.ts`)
- Plus 30+ per-service URLs (wallet, payment, search, catalog, etc.)

---

## 3. Token storage strategy

Defined in `nuqta-master\utils\authStorage.ts` (the single source of truth for all auth data).

| Platform | Access token | Refresh token | User blob |
| --- | --- | --- | --- |
| Native (iOS/Android) | `expo-secure-store` key `access_token` (Keychain/Keystore, encrypted) | `expo-secure-store` key `refresh_token` | `expo-secure-store` key `auth_user` (JSON string) |
| Web | `window.localStorage` key `access_token` | `window.localStorage` key `refresh_token` | `window.localStorage` key `auth_user` (JSON string) |

- **Storage keys** are hardcoded inside `utils\authStorage.ts:24-28` — they do NOT use the `EXPO_PUBLIC_JWT_STORAGE_KEY` / `EXPO_PUBLIC_REFRESH_TOKEN_KEY` / `EXPO_PUBLIC_USER_DATA_KEY` env values (those are dead).
- **AsyncStorage is a write-time safety net only** — on native, `nativeSet()` writes to SecureStore and then calls `AsyncStorage.removeItem()`; `nativeGet()` reads SecureStore first and falls back to AsyncStorage only as a one-shot migration path (then promotes the value to SecureStore). The class never writes tokens to AsyncStorage.
- **Single global `apiClient`** (`services\apiClient.ts`) holds an in-memory `authToken` mirror that is set/cleared via `apiClient.setAuthToken(token|null)`. It is mirrored into the `Authorization: Bearer …` default header on every set.

**Reference frontend difference:** reference uses **httpOnly cookies on web** (`Phase 6`), with `credentials: 'include'` on the apiClient and SecureStore on native. Tokens never go to AsyncStorage or localStorage on web in the reference. (See `services\apiClient.ts` re-export from `services/api/apiClientCore.ts` and `utils\authStorage.ts` comment block lines 16-28.)

---

## 4. Auth header pattern

Constructed in **two** places — both produce `Authorization: Bearer <token>`:

**a) `services\apiClient.ts:121-128` (singleton, primary):**
```ts
setAuthToken(token: string | null) {
  this.authToken = token;
  if (token) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    delete this.defaultHeaders['Authorization'];
  }
}
```
Every request from `apiClient.get/post/put/patch/delete/uploadFile` merges `this.defaultHeaders` into the outgoing `RequestInit.headers`, so the header is attached automatically — no per-call wiring needed.

**b) `config\api.ts:21-42` (legacy axios interceptor):**
```ts
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();   // from utils\authStorage
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
This is the **unused** axios instance — nothing in the current code imports from `config\api.ts`. The actual HTTP path uses the `fetch`-based `services\apiClient.ts` singleton.

**Other headers attached to every request** (`services\apiClient.ts:217-230`):
- `X-Rez-Region: <region>` (e.g. `bangalore`) — set by `apiClient.setRegion()` / `setRegionGetter()`
- `X-Device-Fingerprint: <hash>` (when present in AsyncStorage key `@security_device_fingerprint`)
- `X-Device-OS: "<Platform.OS> <Platform.Version>"`
- `Content-Type: application/json` (default; removed automatically for `FormData` uploads)
- `Accept: application/json`

**Token refresh flow** (`services\apiClient.ts:300-340`, orchestrated by `contexts\AuthContext.tsx:633-736`):
1. 401 response → `apiClient.handleTokenRefresh()` invokes the refresh callback set by `AuthProvider` (`AuthContext.setRefreshTokenCallback`).
2. Callback calls `authService.refreshToken(refreshToken)` → `POST /user/auth/refresh-token`.
3. On success, new tokens are saved via `authStorage.saveAuthToken` + `saveRefreshToken`, and the in-memory `apiClient.authToken` + `defaultHeaders.Authorization` are updated.
4. On refresh failure (401/403/invalid/expired), `apiClient.logoutCallback` clears everything and dispatches `AUTH_LOGOUT` → `AuthContext` redirects to `/sign-in`.

---

## 5. Endpoint inventory by category

**Method breakdown by total call sites** (564 unique `(method, path)` tuples; 686 total call sites):
- GET  : 345 unique paths, 431 total call sites
- POST : 186 unique paths, 219 total call sites
- PUT  : 13 unique paths, 14 total call sites
- PATCH: 4 unique paths, 6 total call sites
- DELETE: 10 unique paths, 10 total call sites
- UPLOADFILE: 6 unique paths, 6 total call sites

**Category breakdown** (best-effort classification):
- public : 193 unique endpoints
- authenticated : 274 unique endpoints
- auth : 11 unique endpoints (`/user/auth/*`, `/auth/*`)
- file : 6 unique endpoints (UPLOADFILE)
- other : 80 unique endpoints (mostly payment, analytics, region, location, etc.)

### 5.1 Auth (`/user/auth/*`, `/auth/*`) — see section 1 table above

### 5.2 Public / browse (most common)

| Method | Path | Callsites | Sample callsites |
| --- | --- | --- | --- |
| GET | `/stores` | 10 | `app\electronics.tsx`, `app\fashion.tsx`, `services\exploreApi.ts`, `services\storesApi.ts` |
| GET | `/products` | 6 | `app\electronics.tsx`, `services\exploreApi.ts`, `components\action-pages\CompareDevices.tsx` |
| GET | `/videos` | 5 | `app\MainCategory\[slug]\stories.tsx`, `components\action-pages\Stories.tsx`, `services\reelApi.ts`, `hooks\useCategoryPageData.ts` |
| GET | `/stores/featured` | 5 | `services\storesApi.ts`, `app\electronics.tsx`, `app\fashion.tsx`, `services\storeSearchService.ts` |
| GET | `/categories` | 4 | `app\electronics.tsx`, `app\fashion.tsx`, `services\exploreApi.ts` |
| GET | `/products/featured` | 4 | `services\productsApi.ts`, `app\food.tsx` |
| GET | `/products/search` | 4 | `app\submit-pick.tsx`, `app\social\upload.tsx`, `components\action-pages\Compare.tsx`, `services\exploreApi.ts` |
| GET | `/stores/search` | 4 | `app\earn\photo-upload.tsx`, `app\social\upload.tsx`, `services\exploreApi.ts` |
| GET | `/stores/nearby` | 4 | `services\exploreApi.ts`, `services\storeSearchService.ts` |
| GET | `/reviews/featured` | 4 | `app\MainCategory\[slug]\stories.tsx`, `components\action-pages\Stories.tsx`, `hooks\useCategoryPageData.ts` |
| GET | `/offers/flash-sales` | 4 | `services\flashSaleApi.ts`, `services\realOffersApi.ts`, `components\category\OffersSection.tsx`, `app\MainCategory\[slug]\offers\index.tsx` |
| GET | `/offers/bank-offers` | 4 | `services\realOffersApi.ts`, `components\category\OffersSection.tsx`, `app\MainCategory\[slug]\offers\index.tsx`, `app\offers\sponsored.tsx` |
| GET | `/gamification/stats` | 4 | `services\gamificationApi.ts`, `services\leaderboardApi.ts` |
| GET | `/stores/trending` | 3 | `app\offers\birthday.tsx`, `hooks\useStoreDiscovery.ts`, `services\exploreApi.ts` |
| GET | `/social-media/posts` | 3 | `app\admin\social-media-posts.tsx`, `services\socialMediaApi.ts` |
| GET | `/projects` | 3 | `app\projects.tsx`, `services\earningProjectsApi.ts` |
| GET | `/offers/hotspots` | 3 | `services\realOffersApi.ts`, `app\search\hotspots.tsx` |
| GET | `/gamification/challenges` | 3 | `services\challengesApi.ts` |
| GET | `/wishlist/shared-with-me` | 1 | `services\wishlistSharingApi.ts` |
| GET | `/stores/search-by-delivery-time` | 1 | `services\storeSearchService.ts` |
| GET | `/categories/{slug}` | 2 | `app\fashion.tsx`, `services\exploreApi.ts`, `services\categoriesApi.ts` |
| GET | `/products/category/{slug}` | 1 | `app\fashion.tsx` |
| GET | `/products/trending` | 2 | `app\fashion.tsx`, `services\exploreApi.ts` |
| GET | `/products/new-arrivals` | 2 | `services\realOffersApi.ts` |
| GET | `/products/hot-deals` | 1 | `services\exploreApi.ts` |
| GET | `/products/subcategory/{slug}` | 1 | `services\productsApi.ts` |
| GET | `/products/{id}` | 1 | `services\productsApi.ts` |
| GET | `/products/{id}/related` | 1 | `services\productsApi.ts` |
| GET | `/stores/{id}` | 2 | `services\storesApi.ts`, `app\pay-in-store\enter-amount.tsx` |
| GET | `/stores/slug/{slug}` | 1 | `services\storesApi.ts` |
| GET | `/stores/by-category-slug/{slug}` | 2 | `services\exploreApi.ts`, `services\storesApi.ts` |
| GET | `/stores/by-tag/{tag}` | 1 | `services\exploreApi.ts` |
| GET | `/stores/search-by-category/{category}` | 1 | `services\storeSearchService.ts` |
| GET | `/stores/category/{categoryId}` | 1 | `services\storeSearchService.ts` |
| GET | `/stores/categories/list` | 1 | `services\storeSearchService.ts` |
| GET | `/stores/search/advanced` | 1 | `services\storeSearchService.ts` |
| GET | `/videos/{id}` | 1 | `services\reelApi.ts` |
| GET | `/videos/trending` | 2 | `services\reelApi.ts` |
| GET | `/videos/category/{category}` | 1 | `services\reelApi.ts` |
| GET | `/videos/creator/{creatorId}` | 1 | `services\reelApi.ts` |
| GET | `/videos/store/{storeId}` | 1 | `services\reelApi.ts` |
| GET | `/videos/search` | 2 | `services\reelApi.ts` |
| GET | `/search/suggestions` | 1 | `services\searchService.ts` |
| GET | `/search/autocomplete` | 2 | `services\searchService.ts` |
| GET | `/search/popular` | 1 | `services\searchService.ts` |
| GET | `/search/did-you-mean` | 1 | `services\searchApi.ts` |
| GET | `/search/ai-search` | 2 | `app\search\ai-search.tsx` |
| GET | `/search/history/recent` | 1 | `app\MainCategory\[slug]\search.tsx` |
| GET | `/categories/{slug}` | 2 | (see above) |
| GET | `/experiences` | 2 | `components\action-pages\experiences\BeautyExperiencesIndex.tsx` |
| GET | `/experiences/{id}` | 1 | `services\experiencesApi.ts`, `components\action-pages\experiences\BeautyExperienceDetail.tsx` |
| GET | `/experiences/unique-finds` | 1 | `services\experiencesApi.ts` |
| GET | `/offer-categories` | 1 | `services\realOffersApi.ts` |
| GET | `/offer-categories/{slug}` | 1 | `services\realOffersApi.ts` |
| GET | `/hero-banners` | 1 | `services\realOffersApi.ts` |
| GET | `/offer-categories` | 1 | (dup) |
| GET | `/offers/mega` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/students` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/new-arrivals` | 2 | `services\realOffersApi.ts` |
| GET | `/offers/trending` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/nearby` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/{id}` | 1 | `services\realOffersApi.ts`, `app\MainCategory\[slug]\offers\[id].tsx` |
| GET | `/offers/featured` | 1 | `app\food.tsx` |
| GET | `/offers/homepage-deals-section` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/exclusive-zones` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/exclusive-zones/{slug}/offers` | 2 | `services\realOffersApi.ts`, `app\offers\birthday.tsx` |
| GET | `/offers/special-profiles` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/special-profiles/{slug}/offers` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/friends-redeemed` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/bogo` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/sales-clearance` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/free-delivery` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/user/recommendations` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/hotspots/{slug}/offers` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/page-data` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/page-data-v2` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/user/redemptions` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/discount-buckets` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/bank/{id}` | 1 | `app\MainCategory\[slug]\offers\[id].tsx` |
| GET | `/cashback/summary` | 1 | `services\cashbackApi.ts` |
| GET | `/cashback/double-campaigns` | 1 | `services\realOffersApi.ts` |
| GET | `/cashback/coin-drops` | 1 | `services\realOffersApi.ts` |
| GET | `/cashback/upload-bill-stores` | 1 | `services\realOffersApi.ts` |
| GET | `/cashback/super-cashback-stores` | 1 | `services\realOffersApi.ts` |
| GET | `/loyalty/milestones` | 1 | `services\realOffersApi.ts` |
| GET | `/loyalty/progress` | 1 | `services\realOffersApi.ts` |
| GET | `/flash-sales/active` | 1 | `services\realOffersApi.ts` |
| GET | `/flash-sales/{id}` | 2 | `services\realOffersApi.ts` |
| GET | `/flash-sales/upcoming` | 1 | `services\flashSaleApi.ts` |
| GET | `/flash-sales/expiring-soon` | 2 | `services\flashSaleApi.ts`, `services\realOffersApi.ts` |
| GET | `/flash-sales/purchases/{purchaseId}` | 1 | `services\realOffersApi.ts` |
| GET | `/coupons` | 2 | `app\MainCategory\[slug]\offers\index.tsx` |
| GET | `/coupons/my-coupons` | 2 | `services\couponApi.ts`, `components\category\OffersSection.tsx` |
| GET | `/discounts` | 2 | `services\discountsApi.ts` |
| GET | `/discounts/{id}` | 1 | `services\discountsApi.ts` |
| GET | `/discounts/my-history` | 1 | `services\discountsApi.ts` |
| GET | `/discounts/{id}/analytics` | 1 | `services\discountsApi.ts` |
| GET | `/outlets` | 1 | `services\outletsApi.ts` |
| GET | `/outlets/{id}` | 1 | `services\outletsApi.ts` |
| GET | `/outlets/store/{storeId}` | 1 | `services\outletsApi.ts` |
| GET | `/outlets/nearby` | 1 | `services\outletsApi.ts` |
| GET | `/outlets/{id}/opening-hours` | 1 | `services\outletsApi.ts` |
| GET | `/outlets/{id}/offers` | 1 | `services\outletsApi.ts` |
| GET | `/gold/price` | 1 | `services\goldSavingsApi.ts` |
| GET | `/gold/holding` | 1 | `services\goldSavingsApi.ts` |
| GET | `/gold/transactions` | 1 | `services\goldSavingsApi.ts` |
| GET | `/recommendations/personalized` | 1 | `services\exploreApi.ts` |
| GET | `/explore/live-stats` | 1 | `services\exploreApi.ts` |
| GET | `/explore/verified-reviews` | 1 | `services\exploreApi.ts` |
| GET | `/explore/featured-comparison` | 1 | `services\exploreApi.ts` |
| GET | `/explore/friends-activity` | 1 | `services\exploreApi.ts` |
| GET | `/explore/stats-summary` | 1 | `services\exploreApi.ts` |
| GET | `/config/feature-flags` | 1 | `services\remoteFeatureConfig.ts` |
| GET | `/gamification/quick-actions` | 1 | `services\quickActionsApi.ts` |
| GET | `/content/quick-actions` | 1 | `services\quickActionsApi.ts` |
| GET | `/gamification/checkin-config` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/streaks` | 2 | `services\gamificationApi.ts` |
| GET | `/gamification/spin-wheel/data` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/spin-wheel/eligibility` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/spin-wheel/history` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/leaderboard` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/coins/balance` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/affiliate/stats` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/promotional-posters` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/affiliate/submissions` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/streak/bonuses` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/reviewable-items` | 2 | `services\gamificationApi.ts` |
| GET | `/gamification/bonus-opportunities` | 1 | `services\gamificationApi.ts` |
| GET | `/gamification/play-and-earn` | 1 | `services\gamificationApi.ts` |
| GET | `/content/value-cards` | 1 | `services\valueCardsApi.ts` |
| GET | `/play-earn/batch` | 1 | `hooks\queries\playAndEarn\useQuickActionsData.ts` |
| GET | `/play-earn/shopping-methods` | 1 | `hooks\queries\playAndEarn\useProgramsData.ts` |
| GET | `/polls/daily` | 1 | `services\pollApi.ts` |
| GET | `/polls/{id}` | 1 | `services\pollApi.ts` |
| GET | `/platform/stats` | 1 | `services\platformApi.ts` |
| GET | `/reviews/store/{storeId}` | 1 | `services\storeSearchService.ts` |
| GET | `/favorites/user/my-favorites` | 1 | `services\storeSearchService.ts` |
| GET | `/comparisons/user/my-comparisons` | 1 | `services\storeSearchService.ts` |
| GET | `/comparisons/{comparisonId}` | 1 | `services\storeSearchService.ts` |
| GET | `/analytics/store/{storeId}` | 1 | `services\storeSearchService.ts` |
| GET | `/analytics/popular` | 1 | `services\storeSearchService.ts` |
| GET | `/analytics/user/my-analytics` | 1 | `services\storeSearchService.ts` |
| GET | `/zone(s|)/{slug}/eligibility` | 2 | `app\offers\zones\[slug]\verify.tsx`, `services\realOffersApi.ts` |
| GET | `/zones/{slug}/status` | 1 | `services\realOffersApi.ts` |
| GET | `/zones/my-verifications` | 1 | `services\realOffersApi.ts` |
| GET | `/home-services/categories` | 1 | `services\homeServicesApi.ts` |
| GET | `/home-services/featured` | 1 | `services\homeServicesApi.ts` |
| GET | `/home-services/popular` | 1 | `services\homeServicesApi.ts` |
| GET | `/home-services/stats` | 1 | `services\homeServicesApi.ts` |
| GET | `/travel-services/categories` | 1 | `services\travelApi.ts` |
| GET | `/travel-services/featured` | 1 | `services\travelApi.ts` |
| GET | `/travel-services/popular` | 1 | `services\travelApi.ts` |
| GET | `/travel-services/stats` | 1 | `services\travelApi.ts` |
| GET | `/services/{serviceId}` | 1 | `services\servicesApi.ts` |
| GET | `/services/featured` | 2 | (homepage) |
| GET | `/tournaments` | 1 | `services\tournamentApi.ts` |
| GET | `/tournaments/featured` | 1 | `services\tournamentApi.ts` |
| GET | `/tournaments/{id}` | 1 | `services\tournamentApi.ts` |
| GET | `/tournaments/{tournamentId}/my-rank` | 1 | `services\tournamentApi.ts` |
| GET | `/tournaments/my-tournaments` | 1 | `services\tournamentApi.ts` |
| GET | `/tournaments/live` | 1 | `services\tournamentApi.ts` |
| GET | `/special-programs` | 1 | `services\specialProgramApi.ts` |
| GET | `/special-programs/{slug}/check-eligibility` | 1 | `services\specialProgramApi.ts` |
| GET | `/special-programs/{slug}/dashboard` | 1 | `services\specialProgramApi.ts` |
| GET | `/programs/college` | 1 | `services\programApi.ts` |
| GET | `/programs/corporate` | 1 | `services\programApi.ts` |
| GET | `/programs/social-impact` | 1 | `services\programApi.ts` |
| GET | `/programs/social-impact/{eventId}` | 2 | `services\programApi.ts`, `services\socialImpactApi.ts` |
| GET | `/programs/my-programs` | 1 | `services\programApi.ts` |
| GET | `/programs/{programId}` | 1 | `services\programApi.ts` |
| GET | `/programs/{programId}/tasks` | 1 | `services\programApi.ts` |
| GET | `/programs/social-impact/my-stats` | 1 | `services\socialImpactApi.ts` |
| GET | `/earnings/history` | 2 | `app\earnings-history.tsx` |
| GET | `/notifications/stats` | 2 | `services\gamificationApi.ts` |
| GET | `/campaigns/{campaignId}` | 1 | `services\campaignsApi.ts` |
| GET | `/campaigns/redemptions/{code}` | 1 | `services\campaignsApi.ts`, `hooks\useCheckoutUI.ts` |
| GET | `/subscriptions/tiers` | 1 | `services\subscriptionApi.ts` |
| GET | `/subscriptions/current` | 1 | `services\subscriptionApi.ts` |
| GET | `/subscriptions/benefits` | 1 | `services\subscriptionApi.ts` |
| GET | `/subscriptions/value-proposition/{tier}` | 1 | `services\subscriptionApi.ts` |
| GET | `/billing/invoice/{transactionId}` | 1 | `services\subscriptionApi.ts` |
| GET | `/payments/emi-options` | 1 | `app\checkout\emi-selection.tsx` |
| GET | `/b/savings/dashboard` | 1 | `services\b\savingsApi.ts` |
| GET | `/b/savings/goals` | 1 | `services\b\savingsApi.ts` |
| GET | `/b/savings/streak` | 1 | `services\b\savingsApi.ts` |
| GET | `/b/savings/projection` | 1 | `services\b\savingsApi.ts` |
| GET | `/wallet/transactions` | 1 | `services\walletApi.ts` |
| GET | `/wallet/balance` | 2 | `services\walletApi.ts` |
| GET | `/wallet/summary` | 1 | `services\walletApi.ts` |
| GET | `/wallet/categories` | 1 | `services\walletApi.ts` |
| GET | `/payments/emi-options` | 1 | (see above) |
| GET | `/store-payment/offers/{storeId}` | 2 | `app\pay-in-store\*` |
| GET | `/store-vouchers/store/{storeId}` | 1 | `services\storeVouchersApi.ts` |
| GET | `/store-vouchers/{id}` | 1 | `services\storeVouchersApi.ts` |
| GET | `/store-vouchers/my-vouchers` | 1 | `services\storeVouchersApi.ts` |
| GET | `/store-vouchers/my-vouchers/{id}` | 1 | `services\storeVouchersApi.ts` |
| GET | `/wishlist/{wishlistId}` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/default` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/check` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/following` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/public` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/recommendations` | 1 | `services\wishlistApi.ts` |
| GET | `/wishlist/shared` | 1 | `services\wishlistApi.ts` |
| GET | `/share{s/,}/content` | 1 | `services\shareApi.ts` |
| GET | `/shares/stats` | 1 | `services\shareApi.ts` |
| GET | `/shares/daily-limits` | 1 | `services\shareApi.ts` |
| GET | `/insurance/types` | 1 | `services\insuranceApi.ts` |
| GET | `/insurance/plans` | 1 | `services\insuranceApi.ts` |
| GET | `/insurance/featured` | 1 | `services\insuranceApi.ts` |
| GET | `/insurance/plans/{id}` | 1 | `services\insuranceApi.ts` |
| GET | `/recharge/operators` | 1 | `services\rechargeApi.ts` |
| GET | `/recharge` | 1 | `services\rechargeApi.ts` |
| GET | `/earn/nearby` | 1 | `services\nearbyEarnApi.ts` |
| GET | `/bill-payments/types` | 1 | `services\billPaymentApi.ts` |
| GET | `/surveys` (+ many sub-paths) | 9 | `services\surveysApi.ts` (uses raw `fetch`, not apiClient) |
| GET | `/events` (+ many sub-paths) | 14 | `services\eventsApi.ts` (uses raw `fetch`, not apiClient) |
| GET | `/event-analytics/track` | 1 | `services\eventAnalytics.ts` (uses raw `fetch`) |
| GET | `/social-media/posts` | 3 | `services\socialMediaApi.ts`, `app\admin\social-media-posts.tsx` |
| GET | `/projects` | 3 | (above) |
| GET | `/location/search` | 1 (POST actually) | `services\locationService.ts` |
| GET | `/health` | 1 | `services\apiClient.ts:557` (health check, baseURL with `/api` stripped) |

### 5.3 Authenticated (cart, orders, wallet, profile)

| Method | Path | Callsites | Sample callsites |
| --- | --- | --- | --- |
| GET | `/user/profile` | 4 | `services\profileApi.ts`, `services\authApi.ts` (note: profile API uses `PUT /user/profile`, see below) |
| PUT | `/user/profile` | 2 | `services\profileApi.ts`, `services\authApi.ts` |
| GET | `/user/profile/completion` | 1 | `services\profileApi.ts` |
| POST | `/user/profile/picture` | 1 | `services\profileApi.ts` |
| DELETE | `/user/profile/picture` | 1 | `services\profileApi.ts` |
| POST | `/user/profile/verify` | 1 | `services\profileApi.ts` |
| GET | `/user/trust-passport` | 1 | `app\account\trust-passport.tsx` |
| GET | `/user/auth/me` | 2 | (see auth) |
| PUT | `/user/auth/profile` | 1 | (legacy auth flow) |
| POST | `/user/auth/send-otp` | 1 | (see auth) |
| POST | `/user/auth/verify-otp` | 1 | (see auth) |
| POST | `/user/auth/refresh-token` | 1 | (see auth) |
| POST | `/user/auth/logout` | 1 | (see auth) |
| POST | `/user/auth/complete-onboarding` | 1 | (see auth) |
| DELETE | `/user/auth/account` | 1 | (see auth) |
| GET | `/user/auth/statistics` | 1 | (see auth) |
| GET | `/cart` | 1 | `services\cartApi.ts` |
| POST | `/cart/add` | 3 | `services\cartApi.ts` |
| DELETE | `/cart/clear` | 1 | `services\cartApi.ts` |
| POST | `/cart/coupon` | 1 | `services\cartApi.ts` |
| DELETE | `/cart/coupon` | 1 | `services\cartApi.ts` |
| GET | `/cart/summary` | 1 | `services\cartApi.ts` |
| POST | `/cart/lock` | 1 | `services\cartApi.ts` |
| GET | `/cart/locked` | 1 | `services\cartApi.ts` |
| POST | `/cart/lock-with-payment` | 1 | `services\cartApi.ts` |
| GET | `/cart/validate` | 1 | `services\cartValidationService.ts` |
| POST | `/cart/check-stock` | 1 | `services\cartValidationService.ts` |
| POST | `/cart/check-stock/batch` | 1 | `services\cartValidationService.ts` |
| POST | `/cart/validate/auto-fix` | 1 | `services\cartValidationService.ts` |
| POST | `/orders` | 1 | `services\ordersApi.ts` |
| GET | `/orders` | 2 | `services\ordersApi.ts` |
| GET | `/orders/counts` | 1 | `services\ordersApi.ts` |
| GET | `/orders/{orderId}` | 1 | `services\ordersApi.ts` |
| PATCH | `/orders/{orderId}/cancel` | 1 | `services\ordersApi.ts` |
| POST | `/orders/{orderId}/rate` | 1 | `services\ordersApi.ts` |
| POST | `/orders/{orderId}/refund-request` | 1 | `services\ordersApi.ts` |
| PATCH | `/orders/{orderId}/status` | 1 | `services\ordersApi.ts` |
| GET | `/orders/refunds/{refundId}` | 1 | `app\payments\refund-initiated.tsx` |
| GET | `/orders/refunds` | 1 | `app\payments\refund-initiated.tsx` |
| GET | `/billing/invoice/{txId}/download` | 1 | `app\orders\[id].tsx` (raw `fetch`) |
| GET | `/wallet/balance` | 2 | (see above) |
| GET | `/wallet/transactions` | 1 | (see above) |
| GET | `/wallet/transaction/{id}` | 1 | `services\walletApi.ts` |
| POST | `/wallet/topup` | 1 | `services\walletApi.ts` |
| POST | `/wallet/withdraw` | 1 | `services\walletApi.ts` |
| POST | `/wallet/payment` | 1 | `services\walletApi.ts` |
| POST | `/wallet/credit-loyalty-points` | 1 | `services\walletApi.ts` |
| POST | `/wallet/dev-topup` | 1 | `services\walletApi.ts` |
| POST | `/wallet/sync-balance` | 1 | `services\walletApi.ts` |
| POST | `/wallet/money-requests` | 1 | `app\wallet\request-money.tsx` |
| POST | `/wallet/initiate-payment` | 2 | `services\walletApi.ts` |
| POST | `/wallet/confirm-payment` | 2 | `services\walletApi.ts` |
| POST | `/wallet/refund` | 1 | `services\walletApi.ts` |
| POST | `/wallet/split` | 1 | `services\walletApi.ts` |
| POST | `/wallet/transfer/initiate` | 1 | `services\walletApi.ts` |
| POST | `/wallet/transfer/confirm` | 1 | `services\walletApi.ts` |
| POST | `/wallet/gift/send` | 1 | `services\walletApi.ts` |
| POST | `/wallet/gift/validate-recipient` | 1 | `services\walletApi.ts` |
| GET | `/wallet/gift/config` | 1 | `services\walletApi.ts` |
| GET | `/wallet/gift/sent` | 1 | `services\walletApi.ts` |
| GET | `/wallet/gift/received` | 1 | `services\walletApi.ts` |
| POST | `/wallet/gift-cards/purchase` | 1 | `services\walletApi.ts` |
| GET | `/wallet/payment-methods` | 1 | `services\walletApi.ts` |
| GET | `/wallet/limits` | 1 | `app\wallet\limits.tsx` |
| GET | `/wallet/expiring-coins` | 1 | `services\walletApi.ts` |
| GET | `/wallet/scheduled-drops` | 1 | `services\walletApi.ts` |
| GET | `/wallet/recharge/preview` | 1 | `services\walletApi.ts` |
| GET | `/wallet/coin-rules` | 1 | `services\walletApi.ts` |
| PUT | `/wallet/limits` | 1 | `services\walletApi.ts` |
| PUT | `/wallet/settings` | 1 | `services\walletApi.ts` |
| POST | `/payment/create-checkout-session` | 3 | `components\subscription\StripePaymentModal.tsx` (raw fetch), `services\paymentOrchestratorService.ts` |
| POST | `/payment/internal/process` | 1 | `services\paymentOrchestratorService.ts` |
| POST | `/payment/cod/create` | 1 | `services\paymentOrchestratorService.ts` |
| POST | `/payment/save-method` | 1 | `services\paymentOrchestratorService.ts` |
| POST | `/payment/stripe/create-setup-intent` | 1 | `services\paymentOrchestratorService.ts` |
| POST | `/payment/verify-stripe-session` | 1 | `services\paymentOrchestratorService.ts` |
| PUT | `/payment/preferences` | 1 | `services\paymentOrchestratorService.ts` |
| POST | `/store-payment/initiate` | 1 | `services\storePaymentApi.ts` |
| POST | `/store-payment/confirm` | 3 | `services\storePaymentApi.ts` |
| POST | `/store-payment/cancel` | 3 | `services\storePaymentApi.ts` |
| POST | `/store-vouchers/validate` | 1 | `services\storeVouchersApi.ts` |
| POST | `/store-vouchers/{id}/claim` | 1 | `services\storeVouchersApi.ts` |
| POST | `/store-visits/queue` | 1 | `services\storeVisitApi.ts` |
| POST | `/store-visits/schedule` | 1 | `services\storeVisitApi.ts` |
| GET | `/store-visits/user` | 2 | `services\storeVisitApi.ts` |
| POST | `/wishlist` | 2 | `services\wishlistApi.ts` |
| POST | `/wishlist/{wishlistId}/items` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/remove-item` | 1 | `services\wishlistApi.ts` |
| DELETE | `/wishlist/items/{itemId}` | 1 | `services\wishlistApi.ts` |
| DELETE | `/wishlist/{wishlistId}/clear` | 1 | `services\wishlistApi.ts` |
| PATCH | `/wishlist/{wishlistId}` | 1 | `services\wishlistApi.ts` |
| DELETE | `/wishlist/{wishlistId}` | 1 | `services\wishlistApi.ts` |
| PATCH | `/wishlist/items/{itemId}` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/items/{itemId}/move-to-cart` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/{wishlistId}/share` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/{wishlistId}/sync` | 1 | `services\wishlistApi.ts` |
| PATCH | `/wishlist/items/{itemId}/move` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/{wishlistId}/follow` | 1 | `services\wishlistApi.ts` |
| DELETE | `/wishlist/{wishlistId}/follow` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/items/{itemId}/price-alert` | 1 | `services\wishlistApi.ts` |
| DELETE | `/wishlist/items/{itemId}/price-alert` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/{wishlistId}/duplicate` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/merge` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/items/bulk` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlist/items/bulk-remove` | 1 | `services\wishlistApi.ts` |
| PATCH | `/wishlist/items/bulk-move` | 1 | `services\wishlistApi.ts` |
| POST | `/wishlists/items` | 1 | `services\wishlistApi.ts` |
| GET | `/subscriptions/subscribe` | 1 (POST actually) | `services\subscriptionApi.ts` |
| POST | `/subscriptions/subscribe` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/upgrade` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/upgrade/initiate` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/upgrade/confirm` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/downgrade` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/cancel` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/renew` | 1 | `services\subscriptionApi.ts` |
| PATCH | `/subscriptions/auto-renew` | 1 | `services\subscriptionApi.ts` |
| POST | `/subscriptions/validate-promo` | 1 | `services\subscriptionApi.ts` |
| POST | `/vouchers/purchase` | 1 | `services\storeVouchersApi.ts` |
| POST | `/vouchers/redeem` | 1 | `services\storeVouchersApi.ts` |
| POST | `/vouchers/validate` | 1 | `services\storeVouchersApi.ts` |
| POST | `/vouchers/confirm-card-purchase` | 1 | `services\storeVouchersApi.ts` |
| POST | `/bookings` | 1 | `services\bookingApi.ts` |
| GET | `/bookings/{bookingId}` | 1 | `services\bookingApi.ts` |
| POST | `/table-bookings` | 1 | `services\tableBookingApi.ts` |
| POST | `/emergency/book` | 1 | `services\emergencyApi.ts` |
| POST | `/consultations` | 1 | `services\consultationApi.ts` |
| POST | `/consultations/book` | 1 | `services\consultationApi.ts` |
| POST | `/service-appointments` | 1 | `services\serviceAppointmentApi.ts` |
| GET | `/service-appointments/user` | 1 | `services\serviceAppointmentApi.ts` |
| GET | `/service-appointments/{appointmentId}` | 1 | `services\serviceAppointmentApi.ts` |
| POST | `/comparisons` | 1 | `services\storeSearchService.ts` |
| DELETE | `/comparisons/{comparisonId}` | 1 | `services\storeSearchService.ts` |
| POST | `/favorites/statuses` | 1 | `services\storeSearchService.ts` |
| POST | `/social-media/submit` | 1 | `services\socialMediaApi.ts` |
| POST | `/social-media/check-duplicate` | 1 | `services\socialMediaApi.ts` |
| POST | `/articles` | 1 | `services\articlesApi.ts` |
| POST | `/institute-referrals` | 1 | `services\referralTierApi.ts` |
| POST | `/referral/claim-rewards` | 1 | `services\referralTierApi.ts` |
| POST | `/referral/generate-link` | 1 | `services\referralTierApi.ts` |
| POST | `/referral/share` | 1 | `services\referralTierApi.ts` |
| POST | `/api/referral/apply-code` | 1 | (admin) |
| POST | `/api/referral/claim-reward` | 1 | (admin) |
| POST | `/api/referral/generate-qr` | 1 | (admin) |
| POST | `/api/referral/validate-code` | 1 | (admin) |
| GET | `/creators/featured` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/trending-picks` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/all` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/{id}` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/{creatorId}/picks` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/{creatorId}/stats` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/picks/{pickId}` | 1 | `services\creatorsApi.ts` |
| POST | `/creators/picks/{pickId}/like` | 1 | `services\creatorsApi.ts` |
| POST | `/creators/picks/{pickId}/bookmark` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/eligibility` | 1 | `services\creatorsApi.ts` |
| POST | `/creators/apply` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/my-profile` | 1 | `services\creatorsApi.ts` |
| PUT | `/creators/my-profile` | 1 | `services\creatorsApi.ts` |
| POST | `/creators/my-picks` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/my-picks` | 1 | `services\creatorsApi.ts` |
| DELETE | `/creators/my-picks/{pickId}` | 1 | `services\creatorsApi.ts` |
| PATCH | `/creators/my-picks/{pickId}` | 1 | `services\creatorsApi.ts` |
| GET | `/creators/my-earnings` | 1 | `services\creatorsApi.ts` |
| GET | `/notifications/push/subscribe` | 1 (POST actually) | `services\notificationService.ts` |
| POST | `/notifications/register-token` | 1 | `services\notificationService.ts` |
| POST | `/notifications/unregister-token` | 1 | `services\notificationService.ts` |
| POST | `/notifications/register-push-token` | 1 | `services\notificationService.ts` |
| POST | `/notifications/send` | 1 | `services\notificationService.ts` |
| POST | `/notifications/test` | 1 | `services\notificationService.ts` |
| POST | `/notifications/templates` | 1 | `services\notificationService.ts` |
| POST | `/notifications/bulk-delete` | 1 | `services\notificationService.ts` |
| PATCH | `/notifications/preferences` | 1 | `services\notificationService.ts` |
| PATCH | `/notifications/read` | 3 | `services\notificationService.ts` |
| GET | `/support/tickets` | 1 | `services\supportApi.ts` |
| POST | `/support/callback` | 1 | `services\supportApi.ts` |
| POST | `/support/quick-actions/order-issue` | 1 | `services\supportApi.ts` |
| POST | `/support/quick-actions/report-product` | 1 | `services\supportApi.ts` |
| GET | `/streak/streaks` | 2 | `services\streakApi.ts` |
| POST | `/streak/streak/checkin` | 1 | `services\streakApi.ts` |
| POST | `/streak/streak/claim-milestone` | 1 | `services\streakApi.ts` |
| POST | `/streak/streak/freeze` | 2 | `services\streakApi.ts`, `app\explore\daily-checkin.tsx` |
| GET | `/streak/stats` | 1 | `services\streakApi.ts` |
| POST | `/achievements/recalculate` | 1 | `services\achievementApi.ts` |
| POST | `/analytics/track` | 1 | `services\analytics\AnalyticsService.ts` (raw `fetch`) |
| POST | `/analytics/events` | 1 | `utils\analyticsQueue.ts` (raw `fetch`) |
| POST | `/analytics/batch` | 1 | `services\analytics\providers\CustomProvider.ts` (raw `fetch`) |
| POST | `/events/analytics/track` | 1 | `services\eventAnalytics.ts` (raw `fetch`) |
| POST | `/events/bookings/{bookingId}/confirm` | 1 | `services\eventsApi.ts` (raw `fetch`) |
| POST | `/events/{eventId}/favorite` | 1 | `services\eventsApi.ts` (raw `fetch`) |
| POST | `/events/{eventId}/share` | 1 | `services\eventsApi.ts` (raw `fetch`) |
| POST | `/shares/purchase` | 1 | `services\shareApi.ts` |
| POST | `/shares/track` | 1 | `services\shareApi.ts` |
| POST | `/offers/{id}/like` | 1 | `services\realOffersApi.ts` |
| POST | `/offers/{id}/share` | 1 | `services\realOffersApi.ts` |
| POST | `/offers/{id}/view` | 1 | `services\realOffersApi.ts` |
| POST | `/offers/{id}/click` | 1 | `services\realOffersApi.ts` |
| POST | `/offers/{id}/favorite` | 1 | `services\realOffersApi.ts` |
| DELETE | `/offers/{id}/favorite` | 1 | `services\realOffersApi.ts` |
| POST | `/offers/{id}/redeem` | 1 | `app\MainCategory\[slug]\offers\[id].tsx` |
| POST | `/offers/redemptions/validate` | 2 | `services\realOffersApi.ts`, `hooks\useCheckoutUI.ts` |
| POST | `/offers/redemptions/{redemptionId}/use` | 1 | `services\realOffersApi.ts` |
| GET | `/offers/redemptions/{redemptionId}` | 1 | `services\realOffersApi.ts` |
| POST | `/discounts/apply` | 1 | `services\discountsApi.ts` |
| POST | `/discounts/card-offers/apply` | 1 | `services\discountsApi.ts` |
| POST | `/discounts/card-offers/validate` | 1 | `services\discountsApi.ts` |
| POST | `/discounts/validate` | 1 | `services\discountsApi.ts` |
| POST | `/cashback/redeem` | 1 | `services\cashbackApi.ts` |
| POST | `/cashback/forecast` | 1 | `services\cashbackApi.ts` |
| POST | `/coupons/best-offer` | 1 | `services\couponApi.ts` |
| POST | `/gold/buy` | 1 | `services\goldSavingsApi.ts` |
| POST | `/gold/sell` | 1 | `services\goldSavingsApi.ts` |
| POST | `/programs/college/join` | 1 | `services\programApi.ts` |
| POST | `/programs/college/submit` | 1 | `services\programApi.ts` |
| POST | `/programs/corporate/join` | 1 | `services\programApi.ts` |
| POST | `/programs/social-impact/register` | 2 | `services\programApi.ts`, `services\socialImpactApi.ts` |
| DELETE | `/programs/social-impact/{eventId}/register` | 1 | `services\socialImpactApi.ts` |
| POST | `/projects` | 1 | `services\earningProjectsApi.ts` |
| POST | `/projects/upload` | 1 | `services\projectUploadService.ts` |
| POST | `/prive/invites/apply` | 1 | `services\priveInviteApi.ts` |
| POST | `/prive/invites/generate` | 1 | `services\priveInviteApi.ts` |
| POST | `/prive/invites/validate` | 1 | `services\priveInviteApi.ts` |
| GET | `/prive/access` | 1 | `services\priveInviteApi.ts` |
| GET | `/prive/invites/stats` | 1 | `services\priveInviteApi.ts` |
| GET | `/prive/invites/codes` | 1 | `services\priveInviteApi.ts` |
| GET | `/prive/invites/leaderboard` | 1 | `services\priveInviteApi.ts` |
| GET | `/prive/eligibility` | 2 | `app\trust-credit.tsx`, `services\priveApi.ts` |
| GET | `/prive/program-config/public` | 1 | `contexts\PriveContext.tsx` |
| POST | `/gamification/affiliate/submit` | 1 | `services\gamificationApi.ts` |
| POST | `/gamification/spin-wheel/spin` | 1 | `services\gamificationApi.ts` |
| POST | `/gamification/surprise-drop/claim` | 1 | `services\gamificationApi.ts` |
| POST | `/gamification/quiz/start` | 1 | `services\gamificationApi.ts` |
| POST | `/gamification/quiz/{quizId}/answer` | 1 | `services\gamificationApi.ts` |
| POST | `/gamification/streak/checkin` | 1 | `services\gamificationApi.ts` |
| POST | `/campaigns/deals/track` | 3 | `services\campaignsApi.ts` |
| POST | `/campaigns/deals/verify-payment` | 3 | `services\campaignsApi.ts` |
| POST | `/challenges/{challengeId}/join` | 1 | `services\challengesApi.ts` |
| POST | `/challenges/{progressId}/claim` | 1 | `services\challengesApi.ts` |
| GET | `/challenges/active` | 1 | `services\challengesApi.ts` |
| GET | `/challenges/my-progress` | 2 | `services\challengesApi.ts` |
| GET | `/challenges/unified` | 1 | `services\challengesApi.ts` |
| GET | `/challenges/{challengeId}/leaderboard` | 1 | `services\challengesApi.ts` |
| POST | `/games/spin-wheel/create` | 1 | `services\gameApi.ts` |
| POST | `/games/spin-wheel/play` | 1 | `services\gameApi.ts` |
| POST | `/games/scratch-card/create` | 1 | `services\gameApi.ts` |
| POST | `/games/scratch-card/play` | 1 | `services\gameApi.ts` |
| POST | `/games/quiz/create` | 2 | `services\gameApi.ts`, `app\games\trivia.tsx` |
| POST | `/games/quiz/submit` | 2 | `services\gameApi.ts`, `app\games\trivia.tsx` |
| GET | `/games/daily-trivia` | 1 | `services\gameApi.ts` |
| POST | `/games/daily-trivia/answer` | 1 | `services\gameApi.ts` |
| GET | `/games/my-games` | 1 | `services\gameApi.ts` |
| GET | `/games/pending` | 1 | `services\gameApi.ts` |
| GET | `/games/statistics` | 1 | `services\gameApi.ts` |
| GET | `/games/daily-limits` | 1 | `services\gameApi.ts` |
| GET | `/games/{gameType}/status` | 1 | `services\gameApi.ts` |
| GET | `/games/available` | 1 | `services\gameApi.ts` |
| POST | `/games/memory-match/start` | 1 | `app\games\memory.tsx` |
| POST | `/games/memory-match/complete` | 1 | `app\games\memory.tsx` |
| POST | `/games/coin-hunt/complete` | 1 | `app\coin-hunt.tsx` |
| POST | `/games/guess-price/start` | 1 | `app\games\*.tsx` |
| POST | `/games/guess-price/submit` | 1 | `app\games\*.tsx` |
| POST | `/tournaments/{tournamentId}/leave` | 1 | `services\tournamentApi.ts` |
| POST | `/social/feed` | 1 (GET actually) | `services\activityFeedApi.ts` |
| GET | `/social/feed` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/users/{userId}/activities` | 1 | `services\activityFeedApi.ts` |
| POST | `/social/activities` | 1 | `services\activityFeedApi.ts` |
| POST | `/social/activities/{activityId}/like` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/activities/{activityId}/comments` | 1 | `services\activityFeedApi.ts` |
| POST | `/social/activities/{activityId}/comment` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/users/{userId}/followers` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/users/{userId}/following` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/users/{userId}/follow-counts` | 2 | `services\activityFeedApi.ts`, `services\followApi.ts` |
| GET | `/social/users/{userId}/is-following` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/suggested-users` | 1 | `services\activityFeedApi.ts` |
| GET | `/social/activities/{activityId}/stats` | 1 | `services\activityFeedApi.ts` |
| POST | `/social/users/{userId}/follow` | 2 | `services\activityFeedApi.ts`, `services\followApi.ts` |
| POST | `/social/users/{userId}/unfollow` | 1 | `services\followApi.ts` |
| POST | `/social/users/{userId}/follow` (dup) | 1 | `services\followApi.ts` |
| GET | `/ugc/create-post` | 1 (POST actually) | `services\ugcApi.ts` |
| POST | `/ugc/create` | 1 | `services\ugcApi.ts` |
| POST | `/ugc/create-post` | 1 | `services\ugcApi.ts` |
| POST | `/reviews` | 1 | `services\reviewsApi.ts` |
| POST | `/reviews/bulk-moderate` | 1 | `services\reviewsApi.ts` |
| GET | `/notifications/stats` | 2 | (above) |
| POST | `/health-records` | 1 | `services\healthRecordsApi.ts` |
| POST | `/messages/conversations` | 1 | `services\storeMessagingApi.ts` |
| POST | `/user-products/service-requests` | 1 | `services\userProductApi.ts` |
| POST | `/flash-sales/purchase/initiate` | 1 | `services\realOffersApi.ts` |
| POST | `/flash-sales/purchase/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/flash-sales/purchase/fail` | 1 | `services\realOffersApi.ts` |
| POST | `/zones/{slug}/verify` | 2 | `app\offers\zones\[slug]\verify.tsx`, `services\realOffersApi.ts` |
| POST | `/zones/corporate/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/zones/defence/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/zones/healthcare/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/zones/student/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/zones/teacher/verify` | 1 | `services\realOffersApi.ts` |
| POST | `/earnings/withdraw` | 1 | `services\earningsApi.ts` |
| POST | `/bills/calculate-cashback` | 1 | `services\billUploadService.ts` |
| POST | `/bills/match-merchant` | 1 | `services\billUploadService.ts` |
| POST | `/bills/verify` | 1 | `services\billVerificationService.ts` |
| POST | `/bills/extract-data` | 1 | `services\billVerificationService.ts` |
| POST | `/bills/fraud-check` | 1 | `services\billVerificationService.ts` |
| POST | `/bills/analyze-image` | 1 | `services\billVerificationService.ts` |
| GET | `/bills` | 1 | `services\billUploadService.ts` |
| GET | `/bills/{billId}` | 1 | `services\billUploadService.ts` |
| POST | `/bill-payments/fetch-bill` | 1 | `services\billPaymentApi.ts` |
| POST | `/bill-payments/refund` | 1 | `services\billPaymentApi.ts` |
| POST | `/bill-payments/pay` | 1 | `services\billPaymentApi.ts` |
| POST | `/financial-services/leads` | 1 | `components\action-pages\ApplyService.tsx` |
| POST | `/travel-services/plan` | 1 | `services\travelApi.ts` |
| POST | `/travel-payment/create-checkout-session` | 1 | `services\travelApi.ts` |
| POST | `/travel-payment/verify-stripe-session` | 1 | `services\travelApi.ts` |
| POST | `/razorpay/create-order` | 1 | `app\payment-razorpay.tsx` |
| POST | `/razorpay/verify-payment` | 1 | `app\payment-razorpay.tsx` |
| POST | `/razorpay/refund` | 1 | `app\payment-razorpay.tsx` |
| POST | `/photos/upload` | 1 | `services\photoUploadApi.ts` |
| POST | `/videos` | 1 | `services\videosApi.ts` |
| POST | `/videos/{reelId}/like` | 1 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/bookmark` | 1 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/view` | 1 | `services\reelApi.ts` |
| GET | `/videos/{reelId}/comments` | 1 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/comments` | 2 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/share` | 1 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/comments/{commentId}/like` | 1 | `services\reelApi.ts` |
| POST | `/videos/{reelId}/report` | 1 | `services\reelApi.ts` |
| POST | `/disputes/{id}/evidence` | 1 | `services\disputeApi.ts` |
| GET | `/disputes/{id}` | 1 | `services\disputeApi.ts` |
| POST | `/polls/{pollId}/vote` | 1 | `services\pollApi.ts` |
| POST | `/offers/{offerId}/comments` | 1 | `services\offerCommentApi.ts` |
| PUT | `/auth/change-password` | 1 | `app\account\change-password.tsx` |
| DELETE | `/auth/account` | 1 | `app\account\delete-account.tsx` |
| PUT | `/user-settings/courier` | 1 | `app\account\courier-preferences.tsx` |
| PUT | `/user-settings/notifications/email` | 1 | `app\account\email-notifications.tsx` |
| PUT | `/user-settings/notifications/inapp` | 1 | `app\account\*` |
| PUT | `/user-settings/notifications/push` | 1 | `app\account\push-notifications.tsx` |
| PUT | `/user-settings/notifications/sms` | 1 | `app\account\sms-notifications.tsx` |
| PUT | `/b/notif-prefs` | 1 | `app\account\notification-history.tsx` |
| PUT | `/user/auth/profile` | 1 | `app\account\profile.tsx` |
| POST | `/payment/save-method` | 1 | (above) |
| POST | `/payment/internal/process` | 1 | (above) |
| POST | `/payment/cod/create` | 1 | (above) |

### 5.4 File / upload endpoints

These use `apiClient.uploadFile()` (30s timeout) which sends `multipart/form-data` (Content-Type stripped automatically).

| Method | Path | Callsites | Sample callsites |
| --- | --- | --- | --- |
| UPLOADFILE | `/articles` | 1 | `services\articlesApi.ts` |
| UPLOADFILE | `/bills/upload` | 1 | `services\billVerificationService.ts` |
| UPLOADFILE | `/bills/{billId}/resubmit` | 1 | `services\billUploadService.ts` |
| UPLOADFILE | `/reviews/upload-image` | 1 | `services\reviewsApi.ts` |
| UPLOADFILE | `/social-media/submit-media` | 1 | `services\socialMediaApi.ts` |
| UPLOADFILE | `/videos/upload` | 1 | `services\videosApi.ts` |
| UPLOADFILE | `/wishlist/import` | 1 | `services\wishlistApi.ts` |
| POST (FormData) | `/user/profile/picture` | 1 | `services\profileApi.ts` |
| POST (FormData) | `/user/auth/upload-avatar` | 1 | `services\imageUploadService.ts:79` (raw `fetch`) |
| POST (FormData) | `/bills/analyze-image` | 1 | `services\billVerificationService.ts:50` (raw `fetch` w/ FormData) |
| POST (FormData) | `/bills/extract-data` | 1 | `services\billVerificationService.ts:88` (raw `fetch` w/ FormData) |
| POST (FormData) | `/zones/{slug}/verify` | 1 | `app\offers\zones\[slug]\verify.tsx:177` (FormData) |
| POST (FormData) | `/payment/kyc/upload` | 1 | `services\paymentVerificationService.ts:347` (FormData) |
| POST (FormData) | `/payment-methods/{id}/reverify` | 1 | `services\paymentVerificationService.ts:644` (FormData) |

### 5.5 Direct `fetch()` callers (NOT going through `apiClient`)

These bypass the `apiClient` singleton and the auto-injected `Authorization` header. They each construct the URL from `process.env.EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_BASE_URL` and may not include the bearer token.

| File | Line | URL | Notes |
| --- | --- | --- | --- |
| `services\surveysApi.ts` | 136,164,197,241,272,307,343,371,397 | `${this.baseUrl}/surveys/...` | Whole surveys module uses raw `fetch`; `baseUrl` not seen in file head — likely from elsewhere |
| `services\eventsApi.ts` | 158,211,246,298,345,380,448,512,548,585,620,657,776,795,823,848 | `${this.baseUrl}/events/...` | Same — whole events module bypasses `apiClient` |
| `services\eventAnalytics.ts` | 273 | `${this.baseUrl}/events/analytics/track` | `baseUrl = EXPO_PUBLIC_API_URL` (constructor) |
| `services\imageUploadService.ts` | 79 | `${API_URL}/user/auth/upload-avatar` | Does pass `Authorization: Bearer ${authToken}` explicitly |
| `services\analytics\providers\CustomProvider.ts` | 121 | `${this.config.apiUrl}/t/events` | Configurable `apiUrl` from analytics init |
| `utils\analyticsQueue.ts` | 139 | `${apiUrl}/analytics/events` | Passed in via analytics init |
| `components\subscription\StripePaymentModal.tsx` | 95 | `${EXPO_PUBLIC_API_BASE_URL}/payment/create-checkout-session` | Adds `Authorization: Bearer` manually |
| `components\homepage\DealsThatSaveMoney.tsx` | 373,388 | `${EXPO_PUBLIC_API_URL}/offers/homepage-deals-section/track-{impression,click}` | Adds `Bearer` from `getAuthToken()` |
| `app\orders\[id].tsx` | 116 | `${baseURL}/billing/invoice/${txId}/download` | Adds `Authorization: Bearer` manually |
| `scripts\test-*` (many) | various | `http://localhost:5001/...` | Test scripts only — not shipped |

---

## 6. Differences vs reference frontend (`New folder (3)`)

| Aspect | `nuqta-master` (current) | Reference (`New folder (3)`) | Migration impact |
| --- | --- | --- | --- |
| **App entry** | `app/_layout.tsx` (Sentry-wrapped, `AppProviders`, `AuthProvider`) + bare `App.tsx` stub that re-exports `expo-router/entry` (the reference has only the stub) | Same shape | None |
| **Config layout** | `config/env.ts` + `config/api.ts` (axios, unused) | `config/env.ts` + `services/api/{apiClientCore,apiResponse,apiUtilities}.ts` modular split | The `config/api.ts` axios wrapper should be deleted; follow reference's modular split |
| **API base URL** | Single `EXPO_PUBLIC_API_BASE_URL` = `http://localhost:5001/api` (all calls use this) | `EXPO_PUBLIC_API_BASE_URL` = `https://rez-api-gateway.onrender.com/api` (gateway) — used for everything except auth | Switch base URL to gateway; auth endpoints are an exception |
| **Auth service** | Direct calls via `apiClient` to `/user/auth/*` on the gateway | Direct calls to `${EXPO_PUBLIC_RABTUL_AUTH_URL}/api/auth/*` (i.e. `https://rez-auth-service.onrender.com`) with `X-Internal-Token` header | Auth must call auth-service directly with internal token, not the gateway |
| **Auth path scheme** | `/user/auth/send-otp`, `/user/auth/verify-otp`, `/user/auth/refresh-token`, `/user/auth/logout`, `/user/auth/me`, `/user/auth/complete-onboarding`, `/user/auth/account`, `/user/auth/statistics`, `PUT /user/auth/profile` | `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/refresh-token`, `/api/auth/logout`, `/api/auth/me`, `PATCH /api/auth/profile` (not PUT), `/api/auth/onboarding` (not `/complete-onboarding`), `/api/auth/account`, `/api/auth/statistics` | Need to remap paths and switch PUT → PATCH for profile update |
| **Auth response shape** | `{ user, tokens: { accessToken, refreshToken, expiresIn } }` | Same — but reference validates `expiresIn` is a positive number (`utils\authStorage.ts` line 12-13) | Add `expiresIn` validation in the consumer |
| **Auth header on native** | `Authorization: Bearer <token>` (manually in `apiClient.defaultHeaders`) | Same — but with a parallel `X-Internal-Token` header on auth-service calls (for service-to-service trust) | Add `X-Internal-Token` to auth-service calls only |
| **CSRF on web** | None | `X-CSRF-Token: <random nonce>` (cached 5 min) on web auth requests | Add CSRF nonce for web (reference pattern, lines 282-304 of `authApi.ts`) |
| **Idempotency on logout** | None | `Idempotency-Key: logout-<timestamp>-<random>` on `POST /api/auth/logout` | Add idempotency key on logout (web) |
| **Token storage on web** | `localStorage` (`access_token`, `refresh_token`, `auth_user`) — keys hardcoded in `utils\authStorage.ts` | `httpOnly` cookies set by backend (`rez_access_token`) + `localStorage` only for non-sensitive user data (name/avatar). `credentials: 'include'` on every apiClient request | Migrate web to httpOnly cookies; remove token writes to localStorage; add `credentials: 'include'` to `apiClient` |
| **Token storage on native** | `expo-secure-store` (`access_token`, `refresh_token`, `auth_user`) | Same — but reference uses key names like `rez_access_token` (configurable via `EXPO_PUBLIC_JWT_STORAGE_KEY`) | Optionally align key names with reference |
| **Refresh flow** | In-memory refresh token cache; 401 → refresh callback → retry once | Same shape — but reference is stricter (`maxRetries: 0` for OTP send, `maxRetries: 1` for refresh) | Tighten retry counts to match reference |
| **Logout retry** | Retries 1× on failure | Retries 0× (`maxRetries: 0`) — prevents double-invalidation | Reduce retry count for logout |
| **OTP send retry** | Retries 2× | Retries 0× (HIGH-5: duplicate SMS charge risk) | **Critical:** disable retries on OTP send |
| **OTP verify retry** | Retries 1× | Retries 0× (HIGH-4: wrong-OTP should fail immediately) | **Critical:** disable retries on OTP verify |
| **Auth endpoint env mapping** | None — paths are hardcoded as `/user/auth/*` | `EXPO_PUBLIC_AUTH_SERVICE_URL` consumed directly in `authApi.ts` | Add env var for auth service base URL |
| **Validation** | Basic: phone regex, email regex, `^\d{6}$` OTP regex | Same plus: explicitly accepts leading zeros (test "000000") | Tighten / loosen as needed |
| **Error retry helper** | `withRetry` from `utils\apiUtils` | Same helper, same shape | No change |
| **Profile update method** | `PUT /user/profile` (and `PUT /user/auth/profile`) | `PATCH /api/auth/profile` | Switch PUT → PATCH |
| **Onboarding endpoint** | `POST /user/auth/complete-onboarding` | `POST /api/auth/onboarding` | Rename path |
| **Analytics on web** | Plain `Authorization: Bearer` | Same | None |
| **Direct `fetch()` services** | `surveysApi.ts`, `eventsApi.ts`, `eventAnalytics.ts`, `imageUploadService.ts` all bypass `apiClient` | These same modules in reference use the `apiClient` (modular `services/api/`) and inherit the auth header | **Refactor these to go through `apiClient`** so they get the auth header automatically |

---

## 7. Migration changes needed

### Environment / `.env`
- [ ] **Set `EXPO_PUBLIC_API_BASE_URL` to the gateway URL** (e.g. `https://rez-api-gateway.onrender.com/api`). All non-auth calls will flow through this.
- [ ] **Add `EXPO_PUBLIC_AUTH_SERVICE_URL`** (e.g. `https://rez-auth-service.onrender.com`) — used directly by `authApi.ts` to reach the auth service.
- [ ] **Add `EXPO_PUBLIC_INTERNAL_SERVICE_TOKEN`** (shared secret) — passed in the `X-Internal-Token` header on auth-service calls (matches reference's `EXPO_PUBLIC_INTERNAL_SERVICE_TOKEN`).
- [ ] Keep `EXPO_PUBLIC_API_URL` aliased to the gateway (used by a handful of `fetch()` callers — `DealsThatSaveMoney`, `eventAnalytics`, `StripePaymentModal`). They will all start hitting the gateway once the URL is updated.
- [ ] Update `EXPO_PUBLIC_PROD_API_URL` from the placeholder `https://your-production-api.com/api` to the real gateway URL.
- [ ] Remove (or document as dead) `EXPO_PUBLIC_JWT_STORAGE_KEY` / `EXPO_PUBLIC_REFRESH_TOKEN_KEY` / `EXPO_PUBLIC_USER_DATA_KEY` — `utils\authStorage.ts` does not read them; key names are hardcoded.

### `services/authApi.ts` (most important file)
- [ ] **Add auth-service base URL** from `EXPO_PUBLIC_AUTH_SERVICE_URL` with HTTPS-only enforcement in production.
- [ ] **Add `getRabulAuthHeaders()` helper** that injects `X-Request-Origin: rez-consumer-app` and `X-Internal-Token: <env>`.
- [ ] **Remap every auth endpoint**:
  - `POST /user/auth/send-otp`        → `POST ${RABTUL_AUTH_SERVICE_URL}/api/auth/send-otp`  + `getRabulAuthHeaders()`
  - `POST /user/auth/verify-otp`      → `POST ${RABTUL_AUTH_SERVICE_URL}/api/auth/verify-otp` + `getRabulAuthHeaders()` + `X-CSRF-Token` (web only)
  - `POST /user/auth/refresh-token`   → `POST ${RABTUL_AUTH_SERVICE_URL}/api/auth/refresh-token` + `getRabulAuthHeaders()`
  - `POST /user/auth/logout`          → `POST ${RABTUL_AUTH_SERVICE_URL}/api/auth/logout` + `getRabulAuthHeaders()` + `Idempotency-Key`
  - `GET  /user/auth/me`              → `GET  ${RABTUL_AUTH_SERVICE_URL}/api/auth/me` + `getRabulAuthHeaders()`
  - `PUT  /user/profile`              → `PATCH ${RABTUL_AUTH_SERVICE_URL}/api/auth/profile` (note: method change to PATCH)
  - `POST /user/auth/complete-onboarding` → `POST ${RABTUL_AUTH_SERVICE_URL}/api/auth/onboarding` (path rename)
  - `DELETE /user/auth/account`       → `DELETE ${RABTUL_AUTH_SERVICE_URL}/api/auth/account`
  - `GET  /user/auth/statistics`      → `GET  ${RABTUL_AUTH_SERVICE_URL}/api/auth/statistics`
- [ ] **Disable retry on OTP send and OTP verify** (`maxRetries: 0`). Currently `2` and `1`.
- [ ] **Disable retry on logout** (`maxRetries: 0`). Currently `1`.
- [ ] **Add CSRF token generation** for web (nonce via `crypto.getRandomValues`, cached 5 min, returned as `X-CSRF-Token`).
- [ ] **Add idempotency key for logout** (`logout-<ts>-<random>`).
- [ ] **Validate `expiresIn` is a positive number** in `validateAuthResponse` (currently missing in nuqta-master).
- [ ] **Pass `RABTUL_AUTH_SERVICE_URL` as an absolute URL** to `apiClient.post/get/...` so the request bypasses the gateway base URL and hits auth-service directly.
- [ ] **Confirm token shape** is unchanged: `{ user, tokens: { accessToken, refreshToken, expiresIn } }`.

### `services/apiClient.ts` (singleton)
- [ ] **Add `credentials: 'include'`** on the underlying `fetch()` call so httpOnly cookies travel with every request (reference uses cookies on web).
- [ ] **Verify the 401 → refresh → retry path** still works after the auth-service-direct calls; the refresh callback's `apiClient.post('/user/auth/refresh-token', …)` must also be updated to use the new `RABTUL_AUTH_SERVICE_URL` (or moved into `authApi.refreshToken` which already knows the auth URL).
- [ ] **Add `X-Internal-Token` only for auth-service calls** (handled in `authApi.ts`, not here).

### `utils/authStorage.ts`
- [ ] **Web: stop writing tokens to `localStorage`.** Tokens should be httpOnly cookies only. Keep `localStorage` for non-sensitive user data (name, avatar) if needed. Reference has detailed comments on this matrix (lines 16-28).
- [ ] **Native: keep SecureStore as-is**, but consider renaming keys to align with reference (`rez_access_token` instead of `access_token`) — driven by `EXPO_PUBLIC_JWT_STORAGE_KEY`.
- [ ] **No `AsyncStorage` writes for tokens** — the current one-way migration is fine.

### `services/apiClient.ts` (bypass fetchers)
- [ ] **Refactor `services/surveysApi.ts`** to use `apiClient` (or the reference's modular `services/api/apiClientCore`) instead of raw `fetch`, so the auth header is attached automatically.
- [ ] **Refactor `services/eventsApi.ts`** the same way.
- [ ] **Refactor `services/eventAnalytics.ts`** the same way.
- [ ] **Update `services/imageUploadService.ts`** to use `apiClient.uploadFile()` instead of raw `fetch` (or add the `Authorization: Bearer` header to the existing raw `fetch`).
- [ ] **Update `components/subscription/StripePaymentModal.tsx`** to use `apiClient` (currently does raw `fetch` with manual `Authorization` header).
- [ ] **Update `components/homepage/DealsThatSaveMoney.tsx`** to use `apiClient` for impression/click tracking (currently uses `fetch` with `Bearer` from `getAuthToken()`).
- [ ] **Update `app/orders/[id].tsx`** billing-invoice download to use `apiClient` or pass `Authorization` explicitly.

### `config/api.ts`
- [ ] **Delete (or stop importing) `config/api.ts`** — it declares an unused axios-based `apiClient` and an `API_ENDPOINTS` map that is never referenced. If a second client wrapper is needed, mirror the reference's `services/api/` modular split.

### `contexts/AuthContext.tsx` (orchestration)
- [ ] **Update `apiClient.setRefreshTokenCallback` wiring** so the refresh callback uses the new auth-service-direct path. The callback already calls `authService.refreshToken()`, so this should be automatic once `authApi.ts` is updated.
- [ ] **No other AuthContext changes needed** — its state machine is identical to the reference.

### Tests / scripts
- [ ] **Update `scripts/test-*.js`** and any Jest setup that hardcodes `http://localhost:5001` to point at the new gateway URL (or to the local gateway dev port).
- [ ] **Update `__tests__/integration/**/*`** to mock the new auth-service URL pattern.

### Other small items
- [ ] **`app/account/change-password.tsx`** and **`app/account/delete-account.tsx`** use the legacy `/auth/...` paths (without `/user/` prefix). Decide whether these should also go through the auth-service or stay on the gateway.
- [ ] **`services\paymentVerificationService.ts`** has 16 endpoints under `${this.baseUrl}` that resolve to gateway — verify these are all still valid against the new gateway.
- [ ] **`components\product\QA_PHOTOS_INTEGRATION_EXAMPLE.tsx`** and **`components\store\ExampleUsage.tsx`** contain commented-out example `fetch` calls — these are documentation only and not invoked at runtime, but should be updated for consistency.
- [ ] **Socket URL** (`EXPO_PUBLIC_SOCKET_URL = http://localhost:5001`) — confirm whether the gateway exposes a `/socket.io` (or ws) endpoint, or whether a separate realtime service URL is needed.

---

## 8. File index (load-bearing files for migration)

| Purpose | Path |
| --- | --- |
| Single API client (fetch-based) | `nuqta-master\services\apiClient.ts` |
| Auth API service | `nuqta-master\services\authApi.ts` |
| Auth context (state machine + token refresh orchestration) | `nuqta-master\contexts\AuthContext.tsx` |
| Token storage (SecureStore + localStorage) | `nuqta-master\utils\authStorage.ts` |
| App-wide config / env | `nuqta-master\config\env.ts` |
| Legacy axios wrapper (DELETE) | `nuqta-master\config\api.ts` |
| App entry | `nuqta-master\app\_layout.tsx` |
| Sign-in screen | `nuqta-master\app\sign-in.tsx` |
| Auth provider wiring | `nuqta-master\app\setup\AppProviders.tsx` |
| `.env` | `nuqta-master\.env` |
| Reference auth API (already migrated) | `C:\Users\user\OneDrive\Desktop\New folder (3)\services\authApi.ts` |
| Reference apiClient (modular split) | `C:\Users\user\OneDrive\Desktop\New folder (3)\services\apiClient.ts` → `C:\Users\user\OneDrive\Desktop\New folder (3)\services\api\` |
| Reference authStorage (httpOnly cookies on web) | `C:\Users\user\OneDrive\Desktop\New folder (3)\utils\authStorage.ts` |
| Reference env | `C:\Users\user\OneDrive\Desktop\New folder (3)\config\env.ts` |
| Reference .env (gateway + 30+ service URLs) | `C:\Users\user\OneDrive\Desktop\New folder (3)\.env` |
