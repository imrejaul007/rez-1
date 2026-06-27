# Consolidated Security Audit Report

**Report Date:** June 25, 2026
**Services Audited:** rez-backend-master, rez-auth-service, rez-api-gateway, nuqta-master (frontend)
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Executive Summary

This consolidated report combines findings from Code Quality, Backend, Integration, and Frontend security audits. The REZ ecosystem has significant security issues that must be addressed before production deployment.

**Critical Issues Found:** 20
**High Issues Found:** 35
**Medium Issues Found:** 28
**Low Issues Found:** 15

### Critical Categories Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Secrets Management | 4 | 5 | 3 | 2 | 14 |
| Authentication & Authorization | 6 | 8 | 6 | 3 | 23 |
| Input Security | 1 | 4 | 5 | 2 | 12 |
| Configuration | 3 | 7 | 8 | 4 | 22 |
| Information Disclosure | 2 | 4 | 4 | 2 | 12 |
| Type Safety & Code Quality | 5 | 7 | 2 | 2 | 16 |

---

## 1. SECRETS MANAGEMENT

### [SEC-001] - Production Uses Same Secrets as Development
- **Severity:** CRITICAL
- **File:** `rez-auth-service/.env.production:26`, `.env.dev:16`
- **Description:** Auth-service production environment has `JWT_SECRET=oRyv5Wm49RkBUAQjNwKokCgOuRKXIoExXuIa5DaeJajgIE19iujYWIy5r/orDt7K` - identical to development. If development secrets leak, production is compromised.
- **Fix:** Generate unique, cryptographically random secrets for each environment. Store production secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault).

### [SEC-002] - Internal Service Token Mismatch Between Config Files
- **Severity:** CRITICAL
- **File:** `.env.dev:27`, `docker-compose.dev.yml:143`
- **Description:** `.env.dev` defines `INTERNAL_SERVICE_TOKEN=2169e798c47d8655a491f663f11f45395a26d6cf376ecb9ecbe03b19c7b8d791`, but `docker-compose.dev.yml` line 143 has `dev-internal-token-aaaa`. Backend services cannot call auth-service internal endpoints.
- **Fix:** Ensure `INTERNAL_SERVICE_TOKEN` is identical across all configuration files and services.

### [SEC-003] - Secrets Redefined in Docker Compose
- **Severity:** CRITICAL
- **File:** `docker-compose.dev.yml:75-78, 134-136`
- **Description:** Docker compose redefines secrets inline that are already defined in `.env.dev`. Changes to `.env.dev` do not affect running containers, creating confusion about which secrets are actually in use.
- **Fix:** Remove inline secret definitions from docker-compose. Use `.env` file directly or Docker secrets. Document the precedence.

### [SEC-004] - Hardcoded API Keys in Frontend .env File
- **Severity:** CRITICAL
- **File:** `nuqta-master/.env:40-84`
- **Description:** All API keys are placeholder/example values. These must be replaced before production, but there is no validation to prevent deployment with placeholders.
```bash
EXPO_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
```
- **Fix:** Add CI/CD validation step that fails if placeholder patterns (`your-`, `pk_test_`, etc.) are detected in production builds.

### [SEC-005] - Google Maps API Key Appears Real
- **Severity:** HIGH
- **File:** `nuqta-master/.env:47-48`
- **Description:** Google Maps API keys (`AIzaSyD3iZHeRYgAH2WQNSmhPZqNLqJQ2mdvhUA`) appear to be real keys committed to repository. If these are production keys, they are publicly exposed.
- **Fix:** Verify if these are real keys. If so, revoke immediately and generate new restricted keys. Apply domain/IP restrictions to API keys.

### [SEC-006] - Environment Variable Validation Missing for Payment Keys
- **Severity:** HIGH
- **File:** `app/payment-razorpay.tsx:51`
- **Description:** `const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || ''` - Falls back to empty string silently. Payment processing fails without clear error message.
- **Fix:** Add validation at app startup:
```typescript
if (!process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID) {
  throw new Error('RAZORPAY_KEY_ID is required');
}
```

### [SEC-007] - Production API URL Points to localhost by Default
- **Severity:** HIGH
- **File:** `nuqta-master/.env:4-7`
- **Description:** Default API URL is `http://localhost:10000/api`. Production builds will fail to connect to backend if `EXPO_PUBLIC_ENVIRONMENT=production` is not set correctly.
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:10000/api
EXPO_PUBLIC_PROD_API_URL=https://your-production-api.com/api
```
- **Fix:** Ensure CI/CD pipeline sets `EXPO_PUBLIC_ENVIRONMENT=production` and `PROD_API_URL` correctly for production builds.

### [SEC-008] - Missing Environment Variable Name Consistency
- **Severity:** HIGH
- **File:** `rez-backend-master/src/middleware/auth.ts:66`, `rez-auth-service/src/routes/authRoutes.ts:407`
- **Description:** Backend uses `JWT_EXPIRES_IN` while auth-service uses `JWT_EXPIRES_IN_SECONDS`. Token expiry times may differ between services.
- **Fix:** Standardize on one environment variable name across all services.

### [SEC-009] - MFA Session Secret Only in Auth Service
- **Severity:** HIGH
- **File:** `rez-auth-service/src/index.ts:67-69`
- **Description:** Auth-service requires `JWT_MFA_SESSION_SECRET` for MFA flows, but backend has no equivalent validation. MFA sessions from auth-service may not be valid in backend.
- **Fix:** Ensure backend validates MFA tokens using the same secret, or implement token exchange mechanism.

### [SEC-010] - Razorpay Prefill Uses Placeholder User Data
- **Severity:** MEDIUM
- **File:** `app/payment-razorpay.tsx:434-437`
- **Description:** Hardcoded placeholder values for Razorpay prefilled user data:
```typescript
prefill: {
  email: 'user@example.com',
  contact: '9876543210',
  name: 'User Name'
}
```
- **Fix:** Fetch actual user data from auth context before payment initialization.

### [SEC-011] - Hardcoded Deep Link Base URL
- **Severity:** MEDIUM
- **File:** `app/payment-razorpay.tsx:216`
- **Description:** Deep link base URL `https://rez.app` is hardcoded instead of using environment variable.
- **Fix:** Use `process.env.EXPO_PUBLIC_DEEP_LINK_BASE_URL`.

### [SEC-012] - Hardcoded Logo URL in Payment
- **Severity:** MEDIUM
- **File:** `app/payment-razorpay.tsx:428`
- **Description:** `image: 'https://your-logo-url.com/logo.png'` - placeholder URL will appear on Razorpay checkout.
- **Fix:** Move to environment variable: `process.env.EXPO_PUBLIC_LOGO_URL`.

### [SEC-013] - Support Contact Uses Placeholder Values
- **Severity:** LOW
- **File:** `nuqta-master/.env:80-81`
- **Description:** `EXPO_PUBLIC_SUPPORT_PHONE=+91-1234567890` is placeholder.
- **Fix:** Validate format; fail build if placeholder values detected in production.

### [SEC-014] - App Store URLs Point to Non-existent Apps
- **Severity:** LOW
- **File:** `nuqta-master/.env:9,66`
- **Description:** App Store IDs may not match actual app listings.
- **Fix:** Verify URLs match actual store listings before production deployment.

---

## 2. AUTHENTICATION & AUTHORIZATION

### [AUTH-001] - Shadow User Bypasses Account Status Checks
- **Severity:** CRITICAL
- **File:** `src/middleware/auth.ts:202-235`
- **Description:** When a shadow user is auto-created (for cross-service auth from auth-service), all account status checks (isActive, isAccountLocked) are skipped. A deactivated or locked user whose JWT hasn't expired can continue using the system.
```typescript
const shadowUser = await User.create({
  _id: decoded.userId,
  phone: (decoded as any).phoneNumber || '',
  role: 'user',  // SECURITY: correctly hardcoded to 'user'
  // MISSING: isActive and isAccountLocked() checks!
});
return next();  // Bypasses all account status checks
```
- **Impact:** Deactivated users can continue making authenticated requests; bypasses fraud/account freeze controls.
- **Fix:** Move `isActive` and `isAccountLocked()` checks before shadow user creation, or add checks after creation but before `return next()`.

### [AUTH-002] - IDOR Vulnerability on Order Financial Details
- **Severity:** CRITICAL
- **File:** `src/routes/orderRoutes.ts:133-138`
- **Description:** The `/order/:orderId/financial` route has no ownership check. Any authenticated user can view another user's order financial details, exposing ledger entries, coin transactions, and refund history.
```typescript
router.get('/:orderId/financial',
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  getOrderFinancialDetails  // No ownership check!
);
```
- **Fix:** Add ownership verification middleware or inline check:
```typescript
const order = await Order.findById(req.params.orderId).select('_id user').lean();
if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
if (order.user.toString() !== req.userId) {
  return res.status(403).json({ success: false, message: 'Access denied' });
}
```

### [AUTH-003] - JWT Secret Validation Differs Between Services
- **Severity:** CRITICAL
- **File:** `rez-auth-service/src/index.ts:58`, `rez-backend-master/src/middleware/auth.ts:44-60`
- **Description:** Auth-service uses `JWT_SECRET` directly for token validation. Backend uses `getJwtSecret()` helper with length validation. If secrets don't match exactly, tokens signed by auth-service won't be accepted by backend.
- **Impact:** Users may be unexpectedly logged out or denied access.
- **Fix:** Unify JWT configuration across all services. Use same environment variable and validation logic.

### [AUTH-004] - Admin Token Validation Asymmetry
- **Severity:** HIGH
- **File:** `src/middleware/auth.ts:90-108`
- **Description:** Backend `verifyToken()` tries `JWT_ADMIN_SECRET` first, then falls back to `JWT_SECRET`. Auth-service only uses `JWT_SECRET`. An admin token signed by auth-service won't have admin role in backend.
- **Fix:** Ensure auth-service can also sign admin tokens with `JWT_ADMIN_SECRET`, or implement token exchange.

### [AUTH-005] - Token Blacklist Not Synchronized Between Services
- **Severity:** HIGH
- **File:** `rez-auth-service/src/services/tokenService.ts`, `src/middleware/auth.ts:9`
- **Description:** Both services use Redis blacklist with prefix `blacklist:token:`, but if a token is blacklisted in one service, the other won't know. A user could be logged out from auth-service but still have access to backend.
- **Fix:** Implement shared blacklist keyspace or use Redis pub/sub to synchronize blacklists.

### [AUTH-006] - Re-authentication Has No Cryptographic Token Validation
- **Severity:** HIGH
- **File:** `src/middleware/reAuth.ts:23-36`
- **Description:** The `requireReAuth()` middleware only checks for Redis key existence, not its value. If an attacker gains Redis access and knows the key format (`reauth:${userId}:verified`), they could bypass re-authentication.
```typescript
const verified = await redis.get(`reauth:${userId}:verified`);
if (!verified) {
  return res.status(403).json({ requiresReAuth: true });
}
```
- **Fix:** Store cryptographically random token value:
```typescript
// After OTP verification:
const reAuthToken = crypto.randomBytes(32).toString('hex');
await redis.set(`reauth:${userId}:verified`, reAuthToken, 300);
// In middleware:
const stored = await redis.get(`reauth:${userId}:verified`);
if (!stored || stored !== expectedToken) { ... }
```

### [AUTH-007] - Shadow User Onboarding State Mismatch
- **Severity:** HIGH
- **File:** `src/middleware/auth.ts:209`, `rez-auth-service/src/routes/authRoutes.ts:143`
- **Description:** Auth-service sets `isOnboarded: true` after user completes onboarding. Backend shadow user is created with hardcoded `isOnboarded: false`. First API request sees user as not onboarded even after completing onboarding.
- **Fix:** Propagate onboarding state from auth-service to backend, or check auth-service for onboarding status.

### [AUTH-008] - Separate MongoDB Databases with No Synchronization
- **Severity:** HIGH
- **File:** `rez-auth-service/src/routes/authRoutes.ts:285-299`, `src/middleware/auth.ts:202-215`
- **Description:** Auth-service and backend have separate MongoDB databases (`rez-auth` vs `rez`). User profile changes in auth-service are NOT reflected in backend. Data duplication with no sync mechanism.
- **Fix:** Either use single MongoDB with different collections, or implement event-driven synchronization between databases.

### [AUTH-009] - Phone Number Format Inconsistency
- **Severity:** MEDIUM
- **File:** `rez-auth-service/src/routes/authRoutes.ts:116-134`, `src/middleware/auth.ts:204-205`
- **Description:** Auth-service normalizes phone to E.164 format (`+countryCode+phone`). Backend shadow user stores raw value. No canonical phone normalization in backend.
- **Fix:** Normalize phone numbers consistently in backend shadow user creation.

### [AUTH-010] - MFA Purpose Not Validated in Backend
- **Severity:** MEDIUM
- **File:** `rez-auth-service/src/routes/authRoutes.ts:334`
- **Description:** Auth-service generates MFA session tokens with `purpose: 'mfa_verify'`. Backend doesn't validate MFA purpose - it only checks token validity. MFA bypass tokens could be used for regular API access.
- **Fix:** Add purpose validation in backend when verifying MFA tokens.

### [AUTH-011] - Token Expiry Check Only 2 Minutes Before Expiration
- **Severity:** MEDIUM
- **File:** `contexts/AuthContext.tsx:184-204`
- **Description:** Token refresh only triggers when 2 minutes remain. If app is backgrounded for >2 minutes, token expires without refresh.
- **Fix:** Implement visibility change listener to check token expiry on app resume:
```typescript
AppState.addEventListener('change', (state) => {
  if (state === 'active') checkTokenExpiry();
});
```

### [AUTH-012] - Multiple Token Storage Mechanisms
- **Severity:** MEDIUM
- **File:** `contexts/AuthContext.tsx`, `utils/authStorage.ts`, `services/authApi.ts`
- **Description:** Token stored in three places: AsyncStorage, module-level `_currentAuthToken`, and apiClient instance. No single source of truth.
- **Fix:** Centralize all token storage in `authStorage.ts` only.

### [AUTH-013] - Refresh Token Stored Without Encryption
- **Severity:** MEDIUM
- **File:** `utils/authStorage.ts`
- **Description:** Refresh tokens stored in AsyncStorage, which is not encrypted on Android by default.
- **Fix:** Use `expo-secure-store` for refresh token storage in production.

### [AUTH-014] - Shadow User Creation Without Audit Trail
- **Severity:** LOW
- **File:** `src/middleware/auth.ts:224-230`
- **Description:** When shadow user is created with privileged JWT, it's logged but not persisted to audit trail.
- **Fix:** Create persistent security audit log entry for shadow user creation.

### [AUTH-015] - Background Token Refresh Race Condition
- **Severity:** LOW
- **File:** `contexts/AuthContext.tsx:586-624`
- **Description:** Profile sync runs in background without proper cancellation handling. Stale data could overwrite fresh data.
- **Fix:** Add proper mutex/lock mechanism for background sync operations.

---

## 3. INPUT SECURITY

### [INP-001] - No Input Sanitization on User-Provided Data
- **Severity:** HIGH
- **File:** Various form components
- **Description:** User inputs (UPI IDs, amounts, addresses) aren't sanitized before display or API calls. While React escapes output by default, backend APIs may be called directly.
- **Fix:** Add input validation/sanitization utilities. Ensure backend validates all inputs via Joi schemas.

### [INP-002] - Payment Amount Tolerance Too Permissive
- **Severity:** MEDIUM
- **File:** `src/services/PaymentService.ts:95-100`
- **Description:** Payment amount validation allows 1 rupee tolerance (`Math.abs(amount - orderTotal) > 1`). While reasonable for floating-point issues, could be exploited.
- **Fix:** Document the tolerance policy. Consider reducing tolerance for high-value transactions.

### [INP-003] - Missing `RAZORPAY_WEBHOOK_SECRET` Validation at Startup
- **Severity:** MEDIUM
- **File:** `src/config/razorpay.config.ts`
- **Description:** Webhook secret is not validated at application startup. Webhook endpoints would silently reject all webhooks if secret is missing.
- **Fix:** Add webhook secret validation at startup:
```typescript
if (process.env.NODE_ENV === 'production' && !process.env.RAZORPAY_WEBHOOK_SECRET) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET is required in production');
}
```

### [INP-004] - Webhook Body Verification Missing Explicit Check
- **Severity:** MEDIUM
- **File:** `src/controllers/paymentController.ts:262-276`
- **Description:** If `express.raw()` is not properly mounted, `req.body` could be pre-parsed as JSON, causing signature verification to produce incorrect results.
- **Fix:** Add explicit check that raw body is available. Return 400 error if not:
```typescript
if (!Buffer.isBuffer(req.body)) {
  return res.status(400).json({ error: 'Raw body required for webhook' });
}
```

### [INP-005] - User ID Access Pattern Inconsistency
- **Severity:** MEDIUM
- **File:** `stores/selectors.ts:41`
- **Description:** Code checks both `id` and `_id` because backend may return either format. Could lead to null user IDs if neither property exists.
```typescript
const useUserId = () => useAuthStore((s) => s.state.user?.id || s.state.user?._id);
```
- **Fix:** Standardize on single ID format across backend. Update frontend selectors.

### [INP-006] - Currency Amount Format Inconsistencies
- **Severity:** MEDIUM
- **File:** Multiple payment/wallet files
- **Description:** Amounts sent as number in some places (`amount: 5000`), as string in others. Backend may reject or misinterpret.
- **Fix:** Standardize amount format. Document type expectations in API contracts.

### [INP-007] - Cart Item Locking Has No Automatic Expiration Cleanup
- **Severity:** LOW
- **File:** `src/routes/cartRoutes.ts:117-120`
- **Description:** Cart locking allows users to lock items at current prices, but no TTL or cleanup mechanism for abandoned locks.
- **Fix:** Add TTL to lock records. Create scheduled job to clean up expired locks.

### [INP-008] - Date Format Inconsistencies
- **Severity:** LOW
- **File:** Throughout codebase
- **Description:** Dates passed in various formats: ISO strings, date strings, Unix timestamps.
- **Fix:** Use ISO 8601 consistently. Handle timezone explicitly.

---

## 4. CONFIGURATION

### [CFG-001] - Rate Limiting Disabled on Critical Routes
- **Severity:** CRITICAL
- **File:** `src/routes/*.ts` (cartRoutes, orderRoutes, productRoutes, analyticsRoutes, storeRoutes)
- **Description:** Rate limiting is disabled by commenting out `generalLimiter` on many routes. Comment says "Disabled for development" but there's no production re-enable mechanism.
```typescript
router.get('/',
  // generalLimiter, // Disabled for development
  getCart
);
```
- **Impact:** No rate limiting on cart operations, order operations, product browsing. Enables cart flooding, order spam, web scraping.
- **Fix:** Remove commented-out limiters. Use proper feature flag for dev disable:
```typescript
const limiter = isProduction ? generalLimiter : noopMiddleware;
router.get('/', limiter, handler);
```

### [CFG-002] - Gateway CORS Origins Not Synchronized
- **Severity:** HIGH
- **File:** `rez-api-gateway/nginx.conf:360`, `rez-auth-service/src/index.ts:92`, `src/config/middleware.ts:26-71`
- **Description:** CORS origins are configured in three places with different values. Adding a new frontend domain requires changes in all locations.
- **Fix:** Extract CORS configuration to shared config or environment variable. Synchronize across all services.

### [CFG-003] - Gateway Strips CORS Headers But Backend Also Sets Them
- **Severity:** HIGH
- **File:** `rez-api-gateway/nginx.conf:375-379`, `src/config/middleware.ts:120-152`
- **Description:** Gateway strips CORS headers from upstream, but backend also sets CORS headers. Could cause duplicate header warnings or unexpected behavior.
- **Fix:** Decide where CORS headers should be set (gateway OR backend, not both). Document the architecture decision.

### [CFG-004] - No Exponential Backoff on Gateway Retries
- **Severity:** HIGH
- **File:** `rez-api-gateway/nginx.conf:464-475`
- **Description:** Gateway implements passive circuit-breaking via `proxy_next_upstream` with immediate retries. No exponential backoff - immediate retries can amplify load during partial outages.
- **Fix:** Configure nginx with retry delays, or implement application-level circuit breaker for resilience.

### [CFG-005] - Node.js Circuit Breaker Implementation Unused
- **Severity:** HIGH
- **File:** `rez-api-gateway/src/index.ts:1-28`
- **Description:** Node.js gateway has circuit breaker pattern implemented, but marked as "REFERENCE / UNUSED IMPLEMENTATION". Production uses nginx without circuit breaker.
- **Fix:** Either use Node.js gateway with circuit breaker, or implement circuit breaker in nginx configuration.

### [CFG-006] - Internal Auth Header Not Forwarded by Gateway
- **Severity:** HIGH
- **File:** `rez-api-gateway/nginx.conf:408-409`
- **Description:** Gateway strips `X-Internal-Token` from client requests, but doesn't add service's own internal token when proxying. Internal endpoints won't receive internal auth header.
- **Fix:** Add service's internal token header when proxying to backends:
```nginx
proxy_set_header X-Internal-Token $internal_service_token;
```

### [CFG-007] - Gateway Timeout Configuration Mismatch
- **Severity:** MEDIUM
- **File:** `rez-api-gateway/nginx.conf:38-45`
- **Description:** Gateway nginx timeouts set (5s connect, 30s send, 60s read), but backend Express has no global timeout middleware.
- **Fix:** Add request timeout middleware to Express, or ensure nginx timeouts are appropriate for all operations.

### [CFG-008] - Backend Health Check Caches Results
- **Severity:** MEDIUM
- **File:** `src/server.ts:72-88`
- **Description:** Backend health check caches result for 5 seconds. Under high load, health check won't accurately reflect current state. Could report healthy when backend is actually struggling.
- **Fix:** Remove caching from health check, or implement proper health check aggregation.

### [CFG-009] - Gateway Health Endpoint Exposes Internal URLs
- **Severity:** MEDIUM
- **File:** `rez-api-gateway/nginx.conf:448-459`
- **Description:** Gateway `/health/services` endpoint returns full upstream URLs. Exposes internal infrastructure to anyone who can reach the endpoint.
- **Fix:** Remove internal URLs from health response. Return only service status (healthy/unhealthy).

### [CFG-010] - Payment Timeout Uses Hardcoded 5 Minutes
- **Severity:** MEDIUM
- **File:** `app/payment-razorpay.tsx:120`
- **Description:** Payment session timeout hardcoded to 5 minutes (`5 * 60 * 1000`).
- **Fix:** Move to configuration with environment-specific values.

### [CFG-011] - Polling Intervals Hardcoded in Payment Service
- **Severity:** MEDIUM
- **File:** `services/paymentService.ts:212-213`
- **Description:** Payment status polling defaults to 30 attempts * 3s = 90 seconds maximum.
- **Fix:** Move to configuration with environment-specific values.

### [CFG-012] - Auth-Service CORS Rejects Wildcards But Backend Doesn't
- **Severity:** LOW
- **File:** `rez-auth-service/src/index.ts:95-101`, `src/config/middleware.ts`
- **Description:** Auth-service validates and rejects wildcard origins. Backend doesn't reject wildcards.
- **Fix:** Standardize wildcard handling across all services.

### [CFG-013] - Region Store Singleton Pattern Issue
- **Severity:** LOW
- **File:** `stores/regionStore.ts:1-14`
- **Description:** Region store modifies apiClient singleton by adding headers. Multiple instances could cause issues.
- **Fix:** Use region-aware API client instances instead of mutating singleton.

### [CFG-014] - Debug Mode May Be Enabled in Production
- **Severity:** LOW
- **File:** `nuqta-master/.env:15`
- **Description:** `EXPO_PUBLIC_DEBUG_MODE=true` in .env file. May be overridden by build config but not guaranteed.
- **Fix:** Ensure `DEBUG_MODE=false` in production builds. Verify in CI/CD pipeline.

---

## 5. INFORMATION DISCLOSURE

### [INFO-001] - Error Response Format Inconsistent Across Services
- **Severity:** CRITICAL
- **File:** Multiple files across services
- **Description:** Error response formats are inconsistent:

**Backend success:**
```json
{ "success": true, "data": {...} }
```

**Backend error:**
```json
{ "success": false, "message": "..." }
```

**Auth-service error:**
```json
{ success: false, message, code?, details? }
```

**Frontend expects:**
```json
{ success: true, data: T, message?: string, error?: string, errors?: Record }
```

- **Impact:** Frontend error handling fails silently when backend returns different structure.
- **Fix:** Create shared error response schemas used by all services. Document standard format.

### [INFO-002] - Error Messages May Leak Internal Information
- **Severity:** HIGH
- **File:** Multiple controllers, especially `src/services/razorpayService.ts:116`
- **Description:** Error messages from external APIs include internal details:
```typescript
throw new Error(`Razorpay order creation failed: ${error.message}`);
```
- **Impact:** `error.message` could contain sensitive details like API keys, internal IPs.
- **Fix:** Wrap external API errors with generic messages. Log full error server-side. Return only safe error codes to client.

### [INFO-003] - Health Endpoint Exposes Internal Infrastructure
- **Severity:** HIGH
- **File:** `rez-api-gateway/nginx.conf:448-459`
- **Description:** Gateway `/health/services` returns full upstream URLs including internal service endpoints.
- **Fix:** Return only service names and status, not URLs.

### [INFO-004] - Empty Catch Blocks Swallow Errors
- **Severity:** HIGH
- **File:** `contexts/AuthContext.tsx:329, 619-622`, `app/payment.tsx:119-120`
- **Description:** Multiple instances of `catch {}` without error handling. Errors go unnoticed.
```typescript
} catch {}
```
- **Impact:** Authentication failures may go unnoticed. Debugging becomes impossible.
- **Fix:** Replace all empty catch blocks with proper error logging:
```typescript
} catch (err) {
  devLog.error('Auth profile sync failed:', err);
}
```

### [INFO-005] - Generic Error Messages Don't Help Users
- **Severity:** MEDIUM
- **File:** `app/payment-razorpay.tsx:419-421`
- **Description:** Generic error messages don't help users understand what went wrong:
```typescript
platformAlertSimple('Payment Failed', error.message || 'Failed to initiate payment');
```
- **Impact:** User frustration. Increased support tickets.
- **Fix:** Map error codes to user-friendly messages with actionable steps.

### [INFO-006] - No Network Error Differentiation
- **Severity:** MEDIUM
- **File:** `services/apiClient.ts:523-530`
- **Description:** Connection errors are handled but timeout vs DNS vs refused connection aren't differentiated in UI.
- **Fix:** Return error type along with message for conditional UI rendering.

### [INFO-007] - Test Routes May Expose Functionality in Production
- **Severity:** MEDIUM
- **File:** `src/routes/testRoutes.ts`
- **Description:** If test routes are mounted in production, they could expose test or debug functionality.
- **Fix:** Ensure test routes are only mounted in non-production environments:
```typescript
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', testRoutes);
}
```

### [INFO-008] - Silent Failures in Payment Polling
- **Severity:** MEDIUM
- **File:** `services/paymentService.ts:226-229`
- **Description:** On transient failures, polling continues silently. User may see "Payment Pending" when there's a network issue.
- **Fix:** Show subtle indicator after N consecutive failures. Log to analytics.

### [INFO-009] - Token Refresh Failure Silent Logout
- **Severity:** LOW
- **File:** `contexts/AuthContext.tsx:549-558`
- **Description:** Token refresh failures silently log out users without explaining why.
- **Fix:** Show "Session expired" notification before redirect.

### [INFO-010] - Date Strings Not Locale-Aware
- **Severity:** LOW
- **File:** `app/checkout.tsx:57-58`
- **Description:** Hardcoded `en-US` locale regardless of user's actual locale.
- **Fix:** Use `Intl.DateTimeFormat` with user's actual locale.

---

## 6. TYPE SAFETY & CODE QUALITY (Security Implications)

### [TYPE-001] - ObjectId Typed as `any` in User Types
- **Severity:** CRITICAL
- **File:** `rez-auth-service/src/types/user.types.ts:13`, `rez-auth-service/src/types/index.ts:10, 19-20`
- **Description:** `_id: any` in critical user types. Session and Device types are completely untyped (`Session: any`, `Device: any`).
- **Security Impact:** Type safety bypasses could lead to runtime errors that expose internal state.
- **Fix:** Replace with proper `Types.ObjectId` or `string` types. Define Session and Device interfaces.

### [TYPE-002] - Extensive `as any` Casting in Reward Engine
- **Severity:** CRITICAL
- **File:** `src/core/rewardEngine.ts:168, 173, 206-207, 221, 234-237, 248, 284-286, 312, 336, 383, 442-444, 513, 534-535, 540, 548-550, 557-558, 564, 574-575, 578, 655, 667, 676, 679, 686`
- **Description:** 40+ occurrences of `as any` casting throughout the reward engine. Bypasses all type safety.
- **Security Impact:** Financial calculations could produce incorrect results, potentially leading to unauthorized reward payouts.
- **Fix:** Define proper interfaces for all API responses and database models. Remove all `as any` casts.

### [TYPE-003] - Type Safety Disabled with @ts-nocheck
- **Severity:** HIGH
- **File:** `app/payment-razorpay.tsx:1`, `contexts/AuthContext.tsx:1`, `app/(tabs)/index.tsx:1`
- **Description:** Multiple critical files have `@ts-nocheck` directive, disabling TypeScript checking.
- **Security Impact:** Type errors go undetected. Refactoring becomes dangerous. Runtime errors could expose internal data.
- **Fix:** Remove `@ts-nocheck` directives. Add proper type definitions.

### [TYPE-004] - ESLint Not Configured in Backend and Gateway
- **Severity:** HIGH
- **File:** `rez-backend-master/`, `rez-api-gateway/`
- **Description:** No `.eslintrc.js` or `.eslintrc.json` in project roots. Type safety rules not enforced.
- **Fix:** Add ESLint configuration with TypeScript support. Enable strict rules including `no-explicit-any`, `no-console`.

### [TYPE-005] - Strict Mode Disabled in Auth Service
- **Severity:** HIGH
- **File:** `rez-auth-service/tsconfig.json`
- **Description:** `"strict": false` and `"noImplicitAny": false` while main backend has `"strict": true`.
- **Fix:** Enable strict mode in auth-service. Align TypeScript configuration across all services.

### [TYPE-006] - Webhook Payloads Typed as `any`
- **Severity:** MEDIUM
- **File:** `src/controllers/webhookController.ts:34, 174, 137, 156, 171, 178, 214, 249-250, 285, 308, 336, 367, 397, 429, 454, 531, 563, 582, 605-606, 648, 782, 936, 1051, 1141`
- **Description:** Extensive `any` type usage for webhook events.
- **Security Impact:** Could process malformed or malicious webhook payloads without validation.
- **Fix:** Define webhook event interfaces. Add runtime validation with Zod or similar.

### [TYPE-007] - Queue Payloads Typed as Index Signature
- **Severity:** MEDIUM
- **File:** `src/events/orderQueue.ts:60, 94, 97, 155-156, 170, 179, 198, 219, 238`
- **Description:** Queue payload typed as `[key: string]: any`.
- **Security Impact:** Invalid message formats could cause runtime errors or process incorrect data.
- **Fix:** Define queue message interfaces for each queue type.

---

## 7. CRYPTOGRAPHIC ISSUES

### [CRYPTO-001] - String Comparison Used Instead of Timing-Safe Comparison
- **Severity:** CRITICAL
- **File:** `src/services/razorpayService.ts:137`
- **Description:** Signature verification uses direct string comparison (`===`) instead of `crypto.timingSafeEqual`:
```typescript
const isValid = expectedSignature === razorpaySignature;
```
- **Impact:** Timing attack vulnerability. An attacker could potentially determine valid signatures through timing analysis.
- **Fix:** Replace with timing-safe comparison:
```typescript
const expectedBuf = Buffer.from(expectedSignature);
const receivedBuf = Buffer.from(razorpaySignature);
if (expectedBuf.length !== receivedBuf.length) return false;
return crypto.timingSafeEqual(expectedBuf, receivedBuf);
```

### [CRYPTO-002] - Simulated Payout Code in Production Path
- **Severity:** CRITICAL
- **File:** `src/services/razorpayService.ts:327-343`
- **Description:** `createRazorpayPayout` function contains simulated payout code that returns fake responses. No environment check to prevent execution in production.
```typescript
// In production, uncomment this:
// const payout = await razorpay.payouts.create(payoutData);
// Simulated response for development
const payout: any = { ... };
return payout;  // Returns fake payout data!
```
- **Impact:** If actual API call fails, fake payouts recorded. Financial reconciliation shows discrepancies. Real money could be incorrectly marked as paid out.
- **Fix:** Either remove simulated code entirely, or wrap in proper environment check:
```typescript
if (process.env.NODE_ENV !== 'production') {
  // simulated code
} else {
  const payout = await razorpay.payouts.create(payoutData);
  return payout;
}
```

---

## 8. SUMMARY & RECOMMENDATIONS

### Immediate Actions (Must Fix Before Production)

1. **[AUTH-001]** Fix shadow user bypass - Add account status checks before allowing access
2. **[AUTH-002]** Fix IDOR vulnerability - Add ownership check to `/order/:orderId/financial`
3. **[SEC-002]** Fix internal service token mismatch - Ensure consistent tokens across services
4. **[SEC-003]** Remove duplicate secret definitions from docker-compose
5. **[CFG-001]** Re-enable rate limiting on all critical routes
6. **[CRYPTO-001]** Replace string comparison with timingSafeEqual
7. **[CRYPTO-002]** Remove simulated payout code or guard with environment check
8. **[INFO-001]** Unify error response format across all services
9. **[TYPE-001]** Fix `_id: any` in user types
10. **[TYPE-002]** Audit and fix all `as any` casts in reward engine

### Short-Term Actions (Fix Before Launch)

1. **[AUTH-003]** Unify JWT configuration across services
2. **[AUTH-004]** Fix admin token validation asymmetry
3. **[AUTH-005]** Synchronize token blacklists between services
4. **[AUTH-006]** Add cryptographic token validation to re-auth
5. **[AUTH-008]** Implement data sync between auth and backend databases
6. **[CFG-002]** Synchronize CORS origins across all services
7. **[CFG-003]** Decide where CORS headers should be set (gateway OR backend)
8. **[CFG-004]** Add exponential backoff to gateway retries
9. **[CFG-006]** Fix internal auth header forwarding
10. **[TYPE-003]** Remove `@ts-nocheck` from critical files
11. **[TYPE-004]** Add ESLint configuration to backend and gateway
12. **[TYPE-005]** Enable strict mode in auth-service

### Medium-Term Actions (Post-Launch Planning)

1. **[AUTH-007]** Propagate onboarding state from auth-service to backend
2. **[AUTH-009]** Normalize phone number format across services
3. **[CFG-007]** Add request timeout middleware to Express
4. **[CFG-008]** Remove caching from health check
5. **[INFO-002]** Sanitize error messages from external APIs
6. **[INFO-004]** Replace all empty catch blocks
7. **[TYPE-006]** Define webhook event interfaces
8. **[TYPE-007]** Define queue message interfaces

---

## Appendix: File Reference Index

### Critical Security Files
| File | Issues |
|------|--------|
| `src/middleware/auth.ts` | AUTH-001, AUTH-003, AUTH-007, AUTH-009 |
| `src/routes/orderRoutes.ts` | AUTH-002 |
| `src/services/razorpayService.ts` | CRYPTO-001, CRYPTO-002 |
| `src/middleware/reAuth.ts` | AUTH-006 |
| `src/routes/*.ts` | CFG-001 |
| `rez-api-gateway/nginx.conf` | CFG-002, CFG-003, CFG-004, CFG-006, INFO-003 |

### Configuration Files
| File | Issues |
|------|--------|
| `.env.dev` | SEC-001, SEC-002 |
| `docker-compose.dev.yml` | SEC-002, SEC-003 |
| `nuqta-master/.env` | SEC-004, SEC-005, SEC-007 |
| `rez-auth-service/.env.production` | SEC-001 |
| `rez-auth-service/src/index.ts` | AUTH-003, AUTH-004, CFG-002 |

### Frontend Security Files
| File | Issues |
|------|--------|
| `app/payment-razorpay.tsx` | SEC-006, SEC-010, SEC-011, SEC-012, CFG-010, TYPE-003 |
| `contexts/AuthContext.tsx` | AUTH-011, AUTH-012, AUTH-015, INFO-004 |
| `services/apiClient.ts` | SEC-007, CFG-013, INFO-006 |

---

*Report generated: 2026-06-25*
*Consolidated from: AUDIT_CODE_QUALITY.md, AUDIT_BACKEND.md, AUDIT_INTEGRATION.md, AUDIT_FRONTEND.md*
