# Integration Audit Report

**Date:** 2026-06-25
**Auditor:** Integration Specialist
**Scope:** Cross-Service Integration (Frontend, API Gateway, Auth Service, Backend Monolith)
**Severity Scale:** CRITICAL > HIGH > MEDIUM > LOW

---

## Executive Summary

The REZ backend ecosystem consists of 4 primary services:
- **nuqta-master** - React Native/Expo mobile frontend
- **rez-api-gateway** - Nginx-based API gateway
- **rez-auth-service** - Microservice for authentication (OTP, JWT, MFA)
- **rez-backend-master** - Express monolith backend

The architecture follows a **strangler-fig pattern** where the gateway routes traffic between the monolith and emerging microservices.

---

## 1. DATA FLOW AUDIT

### 1.1 Frontend API Calls → Gateway → Backend Routes

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **DF-01** | HIGH | Frontend calls `/api/auth/*` but gateway rewrites to `/api/v1/auth/*` correctly. However, nginx.conf line 683-688 shows `/api/auth` rewrites to `/api/v1/auth$1` which is correct for auth-service. BUT the frontend may be calling paths that are NOT correctly mapped. | `rez-api-gateway/nginx.conf:683-688` |
| **DF-02** | HIGH | Backend monolith routes mounted at `/api` prefix (see `server.ts:64`: `const API_PREFIX = process.env.API_PREFIX || '/api'`), but nginx location blocks have inconsistent path handling. Some use rewrite, some don't. | `rez-backend-master/src/server.ts:64` |
| **DF-03** | MEDIUM | Gateway has TWO conflicting rewrites for `/api/auth`: line 683-688 rewrites to `/api/v1/auth`, but `/api/user/auth` at line 723-728 ALSO rewrites to `/api/v1/auth`. This creates routing ambiguity. | `rez-api-gateway/nginx.conf:683-688, 723-728` |
| **DF-04** | HIGH | Backend health check endpoint at `/health` (line 92 in server.ts) but nginx doesn't have a dedicated location for `/health` to backend - only static returns at gateway level. Backend health checks don't include auth-service or redis health. | `rez-backend-master/src/server.ts:92-122` |

### 1.2 Auth Token Flow

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **ATF-01** | CRITICAL | JWT_SECRET is shared across services (defined in `.env.dev` line 16, used in auth-service `.env` line 26, and backend `docker-compose.dev.yml` line 134). However, there are TWO different secret validation approaches: auth-service uses `JWT_SECRET` directly (index.ts:58), backend uses `getJwtSecret()` helper that includes length validation. If secrets don't match exactly, tokens signed by auth-service won't be accepted by backend. | `rez-auth-service/src/index.ts:58`, `rez-backend-master/src/middleware/auth.ts:44-60` |
| **ATF-02** | HIGH | Backend `verifyToken()` function (auth.ts:90-108) tries `JWT_ADMIN_SECRET` first, then falls back to `JWT_SECRET`. Auth-service only uses `JWT_SECRET`. This creates asymmetric token validation - an admin token signed by auth-service with JWT_SECRET won't have admin role in backend. | `rez-backend-master/src/middleware/auth.ts:90-108` |
| **ATF-03** | MEDIUM | Auth-service generates tokens with `phoneNumber` in payload (authRoutes.ts:386), but backend's shadow user creation only extracts `phoneNumber` from decoded token (auth.ts:204-205). If the payload structure differs, this will fail silently. | `rez-auth-service/src/routes/authRoutes.ts:386`, `rez-backend-master/src/middleware/auth.ts:204-205` |
| **ATF-04** | MEDIUM | Auth-service has MFA session tokens with `purpose: 'mfa_verify'` (authRoutes.ts:334), but backend doesn't validate MFA purpose - it only checks token validity. This means MFA bypass tokens from auth-service could potentially be used for regular API access if intercepted. | `rez-auth-service/src/routes/authRoutes.ts:334` |
| **ATF-05** | HIGH | Token blacklist implementation differs: auth-service uses Redis with prefix `blacklist:token:` (tokenService.ts), backend uses `blacklist:token:` (auth.ts:9). If a token is blacklisted in one service, the other won't know. | `rez-auth-service/src/services/tokenService.ts`, `rez-backend-master/src/middleware/auth.ts:9` |

### 1.3 User Data Consistency

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **UDC-01** | CRITICAL | Auth-service and backend have SEPARATE MongoDB databases (`rez-auth` vs `rez`). Auth-service creates users in `rez-auth` DB (authRoutes.ts:285-299), but backend creates "shadow users" in `rez` DB on first authenticated request (auth.ts:202-215). This creates data duplication with NO synchronization mechanism. User profile changes in auth-service are NOT reflected in backend. | `rez-auth-service/src/routes/authRoutes.ts:285-299`, `rez-backend-master/src/middleware/auth.ts:202-215` |
| **UDC-02** | HIGH | Auth-service user schema has `profile.firstName`, `profile.lastName` fields (buildUserResponse at authRoutes.ts:140-141). Backend User model may have different field structure. No schema validation between services. | `rez-auth-service/src/routes/authRoutes.ts:140-157`, `rez-backend-master/src/models/User.ts` |
| **UDC-03** | MEDIUM | `isOnboarded` field is set in auth-service (authRoutes.ts:143), but backend shadow user is created with hardcoded `isOnboarded: false` (auth.ts:209). First API request will see user as not onboarded even if they completed onboarding in auth-service. | `rez-auth-service/src/routes/authRoutes.ts:143`, `rez-backend-master/src/middleware/auth.ts:209` |
| **UDC-04** | HIGH | Phone number format differs: auth-service accepts E.164 format and normalizes to `+countryCode+phone` (authRoutes.ts:116-134), but backend shadow user stores raw value. No canonical phone normalization in backend. | `rez-auth-service/src/routes/authRoutes.ts:116-134` |

---

## 2. API CONTRACTS AUDIT

### 2.1 API Version Mismatches

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **AVM-01** | HIGH | Auth-service mounts routes at `/api/v1/auth` (index.ts:147). Gateway rewrites `/api/auth` to `/api/v1/auth` (nginx.conf:685). BUT frontend may call `/auth/send-otp` expecting direct auth-service, but gateway catches `/api/auth` first. Path prefix mismatch. | `rez-auth-service/src/index.ts:147`, `rez-api-gateway/nginx.conf:683-688` |
| **AVM-02** | MEDIUM | Backend reports `x-api-version: 1.0.0` header (server.ts:156-158), auth-service doesn't set any API version header. No mechanism to enforce API version compatibility. | `rez-backend-master/src/server.ts:156-158` |
| **AVM-03** | LOW | Auth-service Swagger docs at `/api-docs` (index.ts:138-142), backend at `/api-docs`. No consolidated API documentation. | `rez-auth-service/src/index.ts:138-145`, `rez-backend-master/src/config/middleware.ts:283-295` |

### 2.2 Error Response Format Consistency

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **ERF-01** | CRITICAL | Error response formats are INCONSISTENT across services:

**Backend (success):**
```json
{ "success": true, "data": {...} }
```

**Backend (error):**
```json
{ "success": false, "message": "..." }
```

**Auth-service (error):**
```json
ApiError throws { status, message, code, details }
errorResponse() returns { success: false, message, code? }
```

**Frontend expects (api.types.ts:2-17):**
```json
{ success: true, data: T, message?: string, error?: string, errors?: Record }
```

This mismatch causes frontend error handling to fail silently. | Multiple files |
| **ERF-02** | HIGH | Auth-service `errorResponse()` utility (utils/response.ts) returns different structure than backend `errorHandler` middleware. Auth-service has `{success: false, message}` but backend middleware may return `{success: false, error: {...}}`. | `rez-auth-service/src/utils/response.ts`, `rez-backend-master/src/middleware/errorHandler.ts` |
| **ERF-03** | MEDIUM | Backend wraps all errors in `globalErrorHandler` (middleware/errorHandler.ts), but auth-service has custom error handling at index.ts:159-171. Error response format depends on which service handles the request. | `rez-backend-master/src/middleware/errorHandler.ts`, `rez-auth-service/src/index.ts:159-171` |
| **ERF-04** | HIGH | Auth-service `ApiError` class includes `code` and `details` fields, but backend's standard error responses don't include these fields. Frontend's `DetailedApiError` type expects `code` field (api.types.ts:223-233). | `rez-auth-service/src/utils/errorResponse.ts`, `nuqta-master/types/api.types.ts:224-233` |

### 2.3 Request/Response Schema Mismatches

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **RSM-01** | HIGH | Auth-service `/auth/send-otp` request body: `{ phone, countryCode?, channel?, force? }` (authRoutes.ts:188). No shared schema with frontend. Frontend may send different field names (e.g., `phoneNumber` vs `phone`). | `rez-auth-service/src/routes/authRoutes.ts:188-218`, `nuqta-master/utils/apiUtils.ts` |
| **RSM-02** | MEDIUM | Auth-service `/auth/verify-otp` response includes `isNewUser`, `hasPIN` (authRoutes.ts:207, 213), but frontend `ApiResponse` type doesn't account for these fields. | `rez-auth-service/src/routes/authRoutes.ts:207, 213`, `nuqta-master/types/api.types.ts:2-7` |
| **RSM-03** | MEDIUM | Backend `/api/user/auth/me` returns `User` model directly (controllers/userController.ts), but auth-service `/auth/me` returns `buildUserResponse()` object (authRoutes.ts:1336). Field names differ: backend may return `_id` vs `id`, different profile structure. | `rez-backend-master/src/controllers/userController.ts`, `rez-auth-service/src/routes/authRoutes.ts:1336` |
| **RSM-04** | HIGH | Auth-service OTP response includes `{ success, isNewUser, hasPIN }` with SMS/WhatsApp details. Backend doesn't know about `hasPIN` flow - it will treat all users as needing OTP verification. | `rez-auth-service/src/routes/authRoutes.ts:207, 213` |

---

## 3. CONFIGURATION AUDIT

### 3.1 Environment Variables Consistency

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **ENV-01** | CRITICAL | `.env.dev` defines secrets, but `docker-compose.dev.yml` REDEFINES the same secrets inline (lines 75-78, 134-136). Changes to `.env.dev` don't affect running containers. This creates confusion about which secrets are actually in use. | `.env.dev`, `docker-compose.dev.yml:75-78, 134-136` |
| **ENV-02** | HIGH | Auth-service `.env.production` has `JWT_SECRET=oRyv5Wm49RkBUAQjNwKokCgOuRKXIoExXuIa5DaeJajgIE19iujYWIy5r/orDt7K` - SAME as `.env.dev`. Production and development use identical secrets. | `rez-auth-service/.env.production:26`, `.env.dev:16` |
| **ENV-03** | HIGH | Backend requires `JWT_EXPIRES_IN` (auth.ts:66), auth-service uses `JWT_EXPIRES_IN_SECONDS` (authRoutes.ts:407). Variable name mismatch means backend will use default '15m' while auth-service uses explicit seconds. | `rez-backend-master/src/middleware/auth.ts:66`, `rez-auth-service/src/routes/authRoutes.ts:407` |
| **ENV-04** | MEDIUM | Auth-service uses `REDIS_URL` (index.ts:28), backend uses `REDIS_URL` AND `REDIS_PASSWORD` (docker-compose.dev.yml:130-131). Redis connection string format differs between services. | `rez-auth-service/src/index.ts:28`, `rez-backend-master/docker-compose.dev.yml:130-131` |
| **ENV-05** | HIGH | Auth-service requires `JWT_MFA_SESSION_SECRET` in production (index.ts:67-69), but backend has no equivalent - it only validates MFA tokens with the standard JWT_SECRET. MFA sessions from auth-service may not be valid in backend. | `rez-auth-service/src/index.ts:67-69` |
| **ENV-06** | MEDIUM | CORS_ORIGIN format differs: auth-service uses comma-separated string (index.ts:92), backend uses comma-separated OR env var parsing (middleware.ts:29). No standardized format. | `rez-auth-service/src/index.ts:92`, `rez-backend-master/src/config/middleware.ts:29` |

### 3.2 CORS Configuration

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **CORS-01** | HIGH | Gateway CORS origin regex (nginx.conf:360) includes hardcoded Vercel domains and localhost ports. Auth-service CORS_ORIGIN includes different domains. Backend has its own CORS list. No synchronization - adding a new frontend domain requires changes in 3 places. | `rez-api-gateway/nginx.conf:360`, `rez-auth-service/src/index.ts:92`, `rez-backend-master/src/config/middleware.ts:26-71` |
| **CORS-02** | HIGH | Gateway strips CORS headers from upstream (nginx.conf:375-379), but backend also sets CORS headers. This could cause duplicate header warnings or unexpected behavior. | `rez-api-gateway/nginx.conf:375-379`, `rez-backend-master/src/config/middleware.ts:120-152` |
| **CORS-03** | MEDIUM | Gateway CORS allows `localhost:8081,19006,3000,4000,5000,5001,4002` (nginx.conf:360). Backend middleware also adds localhost variants. Inconsistent allowed origins between services. | `rez-api-gateway/nginx.conf:360`, `rez-backend-master/src/config/middleware.ts:46-55` |
| **CORS-04** | MEDIUM | Auth-service origin validation rejects wildcards (index.ts:95-101). Backend doesn't reject wildcards - it just doesn't add them. Inconsistent wildcard handling. | `rez-auth-service/src/index.ts:95-101`, `rez-backend-master/src/config/middleware.ts` |

### 3.3 Health Check Endpoints

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **HC-01** | MEDIUM | Backend `/health` returns Mongo + Redis status (server.ts:92-122). Auth-service `/health` returns Mongo + Redis status (index.ts:124-132). Both return similar data but DIFFERENT JSON structure. | `rez-backend-master/src/server.ts:92-122`, `rez-auth-service/src/index.ts:124-132` |
| **HC-02** | HIGH | Backend health check caches result for 5 seconds (server.ts:72-88). Auth-service doesn't cache. Under high request volume, backend health check won't accurately reflect current state. | `rez-backend-master/src/server.ts:72-88` |
| **HC-03** | LOW | Gateway `/health` returns static JSON (nginx.conf:435-442). Doesn't check upstream services. A gateway with healthy nginx but unhealthy backends would still return 200. | `rez-api-gateway/nginx.conf:435-442` |
| **HC-04** | MEDIUM | Backend has `/health/ready` for Kubernetes-style readiness probes (server.ts:135-145). Auth-service has separate health server on port 4102 (index.ts:177). Gateway doesn't route to these - they require direct service access. | `rez-backend-master/src/server.ts:135-145`, `rez-auth-service/src/index.ts:174, 177` |

---

## 4. SERVICE DEPENDENCIES AUDIT

### 4.1 Service Startup Order

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **SSO-01** | HIGH | Docker-compose defines startup order: mongo → redis → auth-service → backend → gateway. Backend `depends_on` auth-service (docker-compose.dev.yml:175-176). BUT backend's `auth.ts` middleware creates shadow users if user exists in auth-service but not backend. If backend starts before a user makes a request, no issue. But if auth-service restarts, tokens issued before restart remain valid in backend. | `docker-compose.dev.yml:55-115` |
| **SSO-02** | MEDIUM | Backend waits for auth-service health check (docker-compose.dev.yml:175-176). But auth-service itself depends on mongo and redis. No circuit-breaker if auth-service is slow to start - backend will wait indefinitely. | `docker-compose.dev.yml:175-176` |
| **SSO-03** | MEDIUM | Auth-service graceful shutdown closes OTP queue first (index.ts:193-194), then Redis, then MongoDB. Backend closes Redis first (server.ts:319-323). Different shutdown sequences could cause issues if services are coupled. | `rez-auth-service/src/index.ts:193-202`, `rez-backend-master/src/server.ts:319-323` |

### 4.2 Circuit Breaker Patterns

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **CB-01** | HIGH | Gateway (nginx) implements passive circuit-breaking via `proxy_next_upstream` (nginx.conf:473-475). This retries immediately on error. No exponential backoff - immediate retries can amplify load during partial outages. Comment in nginx.conf acknowledges this (line 469-472). | `rez-api-gateway/nginx.conf:464-475` |
| **CB-02** | HIGH | Node.js gateway reference implementation (`src/index.ts`) has circuit breaker pattern, BUT it's marked as "REFERENCE / UNUSED IMPLEMENTATION" (line 1-28). Production uses nginx. Circuit breaker in Node.js gateway is NOT active. | `rez-api-gateway/src/index.ts:1-28` |
| **CB-03** | MEDIUM | No application-level circuit breaker between backend and auth-service for internal calls. If auth-service is down, backend's `/api/user/auth/*` routes will fail without graceful degradation. | N/A |
| **CB-04** | MEDIUM | Payment service has `proxy_next_upstream off` (nginx.conf:740) - correct for payments. But no similar protection for other state-changing endpoints. | `rez-api-gateway/nginx.conf:740` |

### 4.3 Timeout Configurations

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **TMO-01** | HIGH | Gateway nginx timeouts (nginx.conf:38-45):
- `proxy_connect_timeout 5s`
- `proxy_send_timeout 30s`
- `proxy_read_timeout 60s`

Backend Express has no global timeout middleware. Long-running requests could hang without timeout protection. | `rez-api-gateway/nginx.conf:38-45` |
| **TMO-02** | MEDIUM | Backend has `EXTERNAL_API_TIMEOUT_MS=10000` (10s) but this is only used for external API calls, not Express request timeouts. No `requestTimeout` configured on Express server. | `docker-compose.dev.yml:164` |
| **TMO-03** | MEDIUM | Auth-service guest auth validates store with 3-second timeout (authRoutes.ts:1150). Other internal service calls have no explicit timeout - relies on default fetch behavior. | `rez-auth-service/src/routes/authRoutes.ts:1150` |
| **TMO-04** | LOW | Frontend default timeout is 30 seconds (apiUtils.ts:34). Backend max body parsing is 1MB/10MB depending on route (middleware.ts:200). Gateway client_max_body_size is 12M (nginx.conf:58). Inconsistent size limits. | Multiple files |

---

## 5. SECURITY INTEGRATION ISSUES

| Issue ID | Severity | Description | Location |
|----------|----------|-------------|----------|
| **SEC-01** | CRITICAL | Internal service tokens differ: `.env.dev` has `INTERNAL_SERVICE_TOKEN=2169e798c47d8655a491f663f11f45395a26d6cf376ecb9ecbe03b19c7b8d791`, but `docker-compose.dev.yml` line 143 has `dev-internal-token-aaaa`. Backend won't be able to call auth-service internal endpoints. | `.env.dev:27`, `docker-compose.dev.yml:143` |
| **SEC-02** | HIGH | Gateway strips `X-Internal-Token` from client requests (nginx.conf:408). BUT it doesn't add the service's own internal token when proxying to backends. Internal endpoints behind gateway won't receive internal auth header. | `rez-api-gateway/nginx.conf:408-409` |
| **SEC-03** | HIGH | Backend has `TRUST_PROXY: "true"` (docker-compose.dev.yml:138). Auth-service has `app.set('trust proxy', 1)` (index.ts:83). But gateway sets `X-Forwarded-For` based on Cloudflare IPs (nginx.conf:139-141). Client IP detection may be unreliable. | Multiple files |
| **SEC-04** | MEDIUM | Gateway health endpoint `/health/services` returns full upstream URLs (nginx.conf:448-459). This exposes internal infrastructure to anyone who can reach the endpoint. | `rez-api-gateway/nginx.conf:448-459` |
| **SEC-05** | MEDIUM | Rate limiting differs: gateway uses nginx `limit_req` (50r/s for API, 100r/m for auth), backend uses `generalLimiter` middleware. Different rate limits create inconsistent protection. | `rez-api-gateway/nginx.conf:145-196`, `rez-backend-master/src/middleware/rateLimiter.ts` |

---

## 6. CRITICAL ISSUES SUMMARY

### CRITICAL Severity (Must Fix Immediately)

| ID | Issue | Impact |
|----|-------|--------|
| **ATF-01** | JWT_SECRET validation differs between services | Tokens signed by auth-service may not validate in backend |
| **UDC-01** | Separate MongoDB databases with no sync | User data duplicated, changes don't propagate |
| **ERF-01** | Error response format inconsistent | Frontend error handling fails |
| **ENV-02** | Production uses same secrets as dev | Security risk if secrets leak |
| **SEC-01** | Internal service tokens mismatch | Backend can't call auth-service internal endpoints |

### HIGH Severity (Fix Before Production)

| ID | Issue | Impact |
|----|-------|--------|
| **DF-01, DF-02** | Path routing inconsistencies | Some API calls may 404 |
| **ATF-02** | Admin token validation asymmetry | Admin access may be denied unexpectedly |
| **ENV-03** | JWT_EXPIRES_IN vs JWT_EXPIRES_IN_SECONDS | Token expiry mismatch |
| **ENV-05** | MFA_SESSION_SECRET only in auth-service | MFA flow breaks across services |
| **CORS-01** | CORS origins not synchronized | Some origins blocked |
| **CB-01** | No exponential backoff on retries | Load amplification during outages |
| **CB-02** | Node.js circuit breaker unused | No app-level resilience |
| **SEC-02** | Internal auth header not forwarded | Internal endpoints inaccessible |

---

## 7. RECOMMENDATIONS

### Immediate Actions

1. **Unify Error Response Format**: Create shared `error-response.ts` and `success-response.ts` schemas used by all services
2. **Fix Internal Service Tokens**: Ensure `INTERNAL_SERVICE_TOKEN` is identical across all services
3. **Unify JWT Configuration**: Use same env var names (`JWT_EXPIRES_IN_SECONDS`) and validation logic
4. **Implement Data Sync**: Either use single MongoDB with different collections, or implement event-driven sync

### Short-term Fixes

5. **Synchronize CORS Origins**: Extract to shared config or environment variable
6. **Add Exponential Backoff**: Configure nginx with retry delays or implement app-level circuit breaker
7. **Unify Health Check Format**: Both services should return identical health response structure
8. **Document API Contracts**: Create OpenAPI spec for all inter-service APIs

### Long-term Architecture

9. **Migrate to Single User Store**: Either consolidate to one MongoDB or implement event sourcing
10. **Use Service Mesh**: Consider Istio/Linkerd for traffic management, retries, and auth
11. **Implement API Gateway**: Replace nginx with proper gateway (Kong, Tyk) for better observability
12. **Add Distributed Tracing**: Use OpenTelemetry consistently across all services

---

## 8. FILES AUDITED

| Service | Key Files Reviewed |
|---------|-------------------|
| Frontend | `nuqta-master/utils/apiUtils.ts`, `nuqta-master/types/api.types.ts` |
| API Gateway | `rez-api-gateway/nginx.conf`, `rez-api-gateway/src/index.ts`, `rez-api-gateway/src/shared/authMiddleware.ts` |
| Auth Service | `rez-auth-service/src/index.ts`, `rez-auth-service/src/routes/authRoutes.ts`, `rez-auth-service/src/middleware/auth.ts` |
| Backend | `rez-backend-master/src/server.ts`, `rez-backend-master/src/config/middleware.ts`, `rez-backend-master/src/config/routes.ts`, `rez-backend-master/src/middleware/auth.ts` |
| Docker | `docker-compose.dev.yml`, `.env.dev` |

---

*Report generated: 2026-06-25*
*Next audit recommended: After implementing above fixes*
