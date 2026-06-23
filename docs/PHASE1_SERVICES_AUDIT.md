# PHASE 1 — Services Audit

Repo root: `C:\Users\user\Downloads\rez-backend-master`
Inspected: 2026-06-21

Both services are in **microservice form** but live in a **strangler-fig** migration: nginx does the heavy lifting, the Node code fills in bits the router can't do. Skip `node_modules`, `dist`, `coverage`, `package-lock.json` (present in auth-service root, not in gateway root).

---

## 1. rez-auth-service

### File tree (`src/`, depth 3)

```
src/
  index.ts
  health.ts
  metrics.ts
  config/
    env.ts, logger.ts, mongodb.ts, mongodb-auth.ts, redis.ts, redis-auth.ts,
    redisSentinel.ts, tracing.ts
  middleware/
    appCheckVerifier.ts, auth.ts, corpAuth.ts, internalAuth.ts, metrics.ts,
    rateLimiter.ts, requireMfa.ts, tracing.ts
  models/
    AdminMfaConfig.ts, MfaConfig.ts, RefreshToken.ts, User.ts, UserProfile.ts,
    index.ts
  routes/
    authRoutes.ts, internalRoutes.ts, internalProfile.routes.ts, mfaRoutes.ts,
    oauthPartnerRoutes.ts, profile.routes.ts
    admin/
      oauthAdmin.ts                  (NOT mounted in index.ts — dead code)
  services/
    deviceService.ts, emailService.ts, otpService.ts, profile.service.ts,
    rezMindService.ts, tokenService.ts, totpEncryption.ts, totpService.ts
  types/
    index.ts, user.types.ts
  utils/
    encryption.ts, errorResponse.ts, index.ts, requestLogger.ts, response.ts
  __tests__/
    otpSecurity.test.ts, securityFixes.test.ts, tokenSecurity.test.ts
```

`node_modules/`, `dist/`, `package-lock.json` present at repo root (skipped).

### Endpoints (all served by `app.listen(process.env.PORT || 4002)`)

`index.ts` mounts routers under:

| Mount path        | Router file                  | Notes |
|-------------------|------------------------------|-------|
| `/api/v1/auth`    | `routes/authRoutes.ts`       | Public + JWT-protected user auth |
| `/api/v1/mfa`     | `routes/mfaRoutes.ts`        | MFA setup, all require `verifyJWT` |
| `/api/v1/profile` | `routes/profile.routes.ts`   | All require `requireAuth` |
| `/internal`       | `routes/internalRoutes.ts`   | Require `requireInternalToken` |
| `/internal`       | `routes/internalProfile.routes.ts` | Require `requireInternalToken` |
| `/api/v1/oauth`   | `routes/oauthPartnerRoutes.ts` | OAuth2 partner flow |
| `app.get('/health')` | inline | Liveness (200/503) |
| `app.get('/metrics')` | inline | Prometheus |
| `app.use('/api-docs', swaggerUi)` | inline | OpenAPI docs |

Health-listener on a separate `process.env.HEALTH_PORT || 4102` (see `health.ts`).

#### Full endpoint table (from `router.post|get|patch|delete` grep)

All paths are relative to the mount. `:token`, `:id`, `:clientId` are path params.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/otp/send` | phone+IP rate | Send 6-digit OTP (SMS, default channel) |
| POST | `/auth/otp/send-whatsapp` | rate | Same as above, WhatsApp channel forced |
| POST | `/user/auth/send-otp` (alias) | rate | Legacy alias for gateway strip |
| POST | `/auth/otp/verify` | rate | Verify OTP, issue access+refresh, create user if new; if MFA enabled, returns `mfaRequired:true` + `mfaSessionToken` |
| POST | `/user/auth/verify-otp` (alias) | rate | Legacy alias |
| POST | `/auth/mfa/verify-otp` | rate | Consume `mfaSessionToken` + `totpCode`, return access+refresh |
| POST | `/auth/login-pin` | rate | PIN login (4–6 digit), 5-fail/15-min lockout |
| POST | `/user/auth/login-pin` (alias) | rate | Legacy alias |
| GET  | `/auth/has-pin` | rate | Always returns `{success:true}` (enumeration-safe) |
| POST | `/auth/set-pin` | JWT | Set 4–6 digit PIN (rejects common PINs) |
| POST | `/auth/complete-onboarding` | JWT | Flip `auth.isOnboarded=true`, save profile/preferences |
| PATCH| `/auth/profile` | JWT | Update profile/preferences (no email) |
| DELETE| `/auth/account` | JWT | Soft-delete + blacklist token |
| GET  | `/auth/me` | JWT | Return current user |
| GET  | `/auth/validate` | rate | Returns `{valid:true|false}`; if `x-internal-token` matches `INTERNAL_SERVICE_TOKEN` also returns `userId`, `role`, `merchantId` |
| POST | `/auth/refresh` | rate | Rotate refresh → new access+refresh (single-use, 409 on concurrent) |
| POST | `/refresh-token` (alias) | rate | Same, legacy path |
| POST | `/auth/token/refresh` | rate | Same rotate handler |
| POST | `/auth/logout` | JWT | Blacklist access + refresh |
| POST | `/auth/change-phone/request` | JWT, rate | Send OTP to new number |
| POST | `/auth/change-phone/verify` | JWT, rate | Verify OTP, atomic update, force re-login |
| POST | `/auth/email/verify/request` | JWT, rate | Send verification email (Resend) |
| GET  | `/auth/email/verify/:token` | rate | Confirm from emailed link |
| POST | `/auth/guest` | rate | Issue guest JWT (optionally validates `storeId` against `MERCHANT_SERVICE_URL/api/internal/stores/:id/validate`) |
| POST | `/auth/admin/login` | rate | Admin email+password (bcrypt), 5-fail/15-min lockout; if AdminMfaConfig → returns `pendingToken` |
| POST | `/auth/admin/mfa/verify` | rate | TOTP or backup code → admin access+refresh |
| GET  | `/internal/auth/user/:id` | internalToken | Build user response by id |
| POST | `/users/patch-tests` | internalToken | Record patch test result (called by merchant-service) |
| GET  | `/users?phone=` | internalToken | Lookup user by phone (audited) |
| POST | `/users/bulk` | internalToken | Bulk lookup (≤1000 ids) |
| POST | `/users/:id/push-token` | internalToken | Register/unregister push token |
| POST | `/profile/transaction` | internalToken | Record cross-vertical tx |
| POST | `/profile/engagement` | internalToken | Record engagement |
| GET  | `/profile/:userId?phone=` | internalToken | Profile summary |
| POST | `/profile/refresh` | internalToken | Batch refresh engagement scores |
| POST | `/api/v1/mfa/auth/mfa/setup` | JWT | Generate TOTP secret + QR URI + backup codes (encrypted at rest) |
| POST | `/api/v1/mfa/auth/mfa/verify-setup` | JWT | Enable MFA on first valid TOTP |
| POST | `/api/v1/mfa/auth/mfa/verify` | JWT | Verify TOTP during an already-authed flow |
| POST | `/api/v1/mfa/auth/mfa/backup-verify` | JWT | Verify `XXXX-XXXX` backup code |
| DELETE | `/api/v1/mfa/auth/mfa/disable` | JWT | Disable MFA (requires TOTP) |
| GET  | `/api/v1/mfa/auth/mfa/status` | JWT | MFA status (counts) |
| GET  | `/api/v1/profile/summary` | JWT | Unified profile (cross-vertical) |
| POST | `/api/v1/profile/transaction` | JWT | Record tx |
| POST | `/api/v1/profile/engagement` | JWT | Record engagement |
| GET  | `/api/v1/profile/tier` | JWT | Tier + LTV + next tier threshold |
| GET  | `/api/v1/oauth/authorize` | oauthLimiter | OAuth2 authorization → returns `authorization_url` for consent step |
| POST | `/api/v1/oauth/consent` | oauthLimiter | OTP-verify + create auth code |
| POST | `/api/v1/oauth/token` | oauthLimiter | `grant_type=authorization_code` → access (1h) + refresh (30d) |
| GET  | `/api/v1/oauth/userinfo` | Bearer access_token | OIDC userinfo |
| POST | `/api/v1/oauth/refresh` | — | `grant_type=refresh_token` with rotation + reuse-detection |
| POST | `/api/v1/oauth/revoke` | — | Revoke token |

`routes/admin/oauthAdmin.ts` defines 5 admin partner-management routes but is **NOT** mounted in `index.ts` — drop from wiring table.

### Auth flows supported

1. **Phone OTP** — `POST /auth/otp/send` (SMS or WhatsApp) → `POST /auth/otp/verify` → tokens. Auto-creates user on first verify. PIN-bearing users short-circuit to PIN login unless `force:true`.
2. **PIN login** — `POST /auth/login-pin`. 4–6 digits. 5-fail → 15-min lock.
3. **MFA / TOTP (RFC 6238)** — Setup via `/api/v1/mfa/auth/mfa/setup` + verify-setup. Once enabled, OTP-verify returns `mfaRequired:true` + `mfaSessionToken` (signed JWT, 5 min). User posts to `/auth/mfa/verify-otp` with TOTP to complete login. Backup codes (`XXXX-XXXX`) supported.
4. **JWT** — Both access and refresh tokens. Access TTL 15 min (`JWT_EXPIRES_IN`). Refresh TTL 24 h, capped at 48 h (`JWT_REFRESH_TTL_HOURS`). Merchant access 24 h. Admin access 15 min (`JWT_ADMIN_EXPIRES_IN`).
5. **Refresh rotation** — `POST /auth/refresh` issues new access+refresh, atomically blacklists the used refresh (Redis SET NX + Mongo `RefreshToken` unique-index). Concurrent reuse returns 409 `CONCURRENT_REFRESH`.
6. **Logout** — `POST /auth/logout` blacklists both tokens (Redis + Mongo `lastLogoutAt` fallback).
7. **Token validation** — `GET /auth/validate` for sibling services. Returns `{valid:true}` publicly, full payload only if `x-internal-token` header matches `INTERNAL_SERVICE_TOKEN`.
8. **OAuth2 partner flow** — Full RFC-style code flow with refresh rotation + reuse-detection, plus `client_credentials` storage in Redis.
9. **Email verification** — `POST /auth/email/verify/request` (Resend) → `GET /auth/email/verify/:token`.
10. **Phone change** — Two-step OTP flow, atomic update, forces re-login.
11. **Guest session** — `POST /auth/guest` for unauthenticated web-menu users; optionally validates `storeId` against merchant service (fail-closed if `MERCHANT_SERVICE_URL` is set).
12. **Admin login** — `POST /auth/admin/login` (bcrypt or legacy plaintext with constant-time compare + auto-upgrade). MFA challenge with `pendingToken` + `/auth/admin/mfa/verify`.
13. **Device fingerprint** — `deviceService.computeFingerprint` (UA+lang+IP, sha256 truncated to 16 hex). Risk levels `trusted|new|suspicious` (>10 unique devices/24h = suspicious). Returned in login responses as `deviceRisk`.
14. **Inter-service internal API** — All `/internal/*` require `x-internal-token` + (optionally) `x-internal-service` header scoped by `INTERNAL_SERVICE_TOKENS_JSON`; legacy single-token fallback via `INTERNAL_SERVICE_TOKEN`. IP allowlist via `ALLOWED_INTERNAL_IPS` (fatal in production if unset).

### Required env vars

Hard-validated by `validateEnv()` in `index.ts`:

| Var | Why |
|---|---|
| `MONGODB_URI` | MongoDB connection |
| `REDIS_URL` | Redis (rate limits, blacklist, OTP, refresh rotation) |
| `JWT_SECRET` | Consumer JWT signing |
| `JWT_REFRESH_SECRET` | Refresh JWT signing |
| `JWT_ADMIN_SECRET` | Admin/pending/JWT-MFA |
| `JWT_MERCHANT_SECRET` | Merchant JWT |
| `OTP_HMAC_SECRET` | Hashes OTPs before storing in Redis |
| `INTERNAL_SERVICE_TOKENS_JSON` *or* legacy `INTERNAL_SERVICE_TOKEN` | Inter-service auth |

Effectively required for the service to start (referenced but not fatal): `PORT` (default 4002), `HEALTH_PORT` (default 4102), `CORS_ORIGIN`, `RESEND_API_KEY` (emailService), `RESEND_FROM_EMAIL` (default `noreply@rez.money`), `APP_URL` (default `https://rez.money`), `OTP_TOTP_ENCRYPTION_KEY` (fatal at MFA-encrypt time, not at startup), `MERCHANT_SERVICE_URL` (required for guest auth with `storeId`), partner client secrets — at minimum `PARTNER_RENDEZ_CLIENT_SECRET`, `PARTNER_STAY_OWEN_CLIENT_SECRET`, `PARTNER_ADBAZAAR_CLIENT_SECRET` (the OAuth partner init `throw`s at module load if any of these three are missing).

Optional: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `OTEL_*`, `JWT_REFRESH_TTL_HOURS` (24), `JWT_EXPIRES_IN` (15m), `JWT_ADMIN_EXPIRES_IN` (15m), `MFA_REQUIRED_FOR_ROLE`, `ALLOWED_INTERNAL_IPS`, `EXPOSE_DEV_OTP` (dev only).

### JWT payload shape

**Access token** (HS256, secret chosen by role — `tokenService.generateAccessToken`):

```jsonc
{
  "userId": "<ObjectId string>",
  "role": "user" | "admin" | "merchant" | "guest" | "super_admin" | "operator" | "support",
  "iat": <unix>,
  "exp": <unix>,
  // extras (any of):
  "phoneNumber": "+91XXXXXXXXXX",   // embedded for web-ordering routes
  "merchantId": "<storeId>"          // embedded for guest sessions
}
```

**Refresh token**: `{ userId, role, type: "refresh", iat, exp }` signed with `JWT_REFRESH_SECRET`.

**MFA session token** (5 min): `{ userId, phone, role, deviceFingerprint, purpose: "mfa_verify", iat, exp }` signed with `JWT_MFA_SESSION_SECRET ?? JWT_SECRET`.

**Admin pending token** (5 min): `{ userId, role, email, mfaPending: true, pendingSince, iat, exp }` signed with `JWT_ADMIN_SECRET`.

### Inter-service auth mechanism

Two layers, both in `src/middleware/internalAuth.ts`:

- **Scoped tokens** (preferred): `INTERNAL_SERVICE_TOKENS_JSON={"merchant-service": "tok1", "notification-service": "tok2", ...}`. Client must send `x-internal-token: <value>` AND `x-internal-service: <key>`. Lookup is constant-time (`crypto.timingSafeEqual`).
- **Legacy fallback**: single `INTERNAL_SERVICE_TOKEN` accepted if scoped lookup fails.
- **IP allowlist** (`ALLOWED_INTERNAL_IPS`): comma-separated CIDRs/IPs. In production, an unset list is treated as fatal and rejects the request (defense in depth; K8s NetworkPolicy is the primary control).
- **Outbound from auth-service**: when validating a guest `storeId`, fetches `${MERCHANT_SERVICE_URL}/api/internal/stores/:id/validate` with `x-internal-token: ${INTERNAL_SERVICE_TOKEN}` (no scoping here — fail-closed if URL is set, fatal if unset).

Note: nginx actively **strips** `X-Internal-Token` / `X-Internal-Service` from inbound requests before proxying (`proxy_set_header X-Internal-Token ""`), so the gateway cannot impersonate internal callers by passing them through.

### OTP delivery (no Twilio)

- Package has no `twilio` dependency. `package.json` lists `resend` and `bullmq`. The user mentioned twilio in package.json, but that is **not present** here — verify on whichever repo they meant.
- OTPs are enqueued onto a BullMQ `notification-events` queue (channel = `sms` or `whatsapp`), with a Redis-stored hashed OTP for verify. The actual SMS/WhatsApp send happens in the `notification-service` consumer.
- Email verification uses Resend directly (no queue).

---

## 2. rez-api-gateway

### Important context — what actually runs

**The deployed container is nginx, not Node.** `Dockerfile` is `FROM nginx:1.27-alpine` and only copies `nginx.conf` + `start.sh`; the `src/` Node code is **not used at runtime**. `start.sh` runs `envsubst` on `nginx.conf.template` (substituting `${PORT}` and 16 service-URL vars) and `exec nginx`. Therefore:

- **Real routing = nginx** (via location blocks + `proxy_pass`)
- **Kong = alternative declarative config, unused at runtime** (`kong/declarative/kong.yml` exists for an alternate deploy path; the production Render deploy uses nginx)
- **Node src/index.ts** is a reference implementation (and a fallback if someone runs `node src/index.ts` directly). It has its own proxy routes for payment, order, catalog, hotel, wallet, notification, integrations — but it does **NOT** proxy `/api/auth` to the auth service. Do not rely on Node for auth routing.

### File tree (`src/`, depth 3)

```
src/
  index.ts
  config/logger.ts
  middleware/auth.ts
  routes/
    finance/rtmnFinanceRoutes.ts
    hotel/makcorpsRoutes.ts
    integrations/index.ts
    procurement/nextabizzRoutes.ts
  shared/
    authMiddleware.ts
    index.ts
  utils/
    circuitBreaker.ts
    index.ts
```

### Routing mechanism

**Primary: nginx** with `envsubst`-injected env vars. `nginx.conf` is 934 lines; top section is HTTP/perf/real-IP/CORS, then `server { listen ${PORT} ... }` with `location` blocks per service.

Health:
- `GET /status` → inline `200` JSON (preferred, "avoids ad blockers")
- `GET /health` → same, backward-compat alias
- `GET /health/services` → returns the configured upstream URL map, restricted to `10.0.0.0/8` and `127.0.0.1/32`

Auth-specific routing (nginx `nginx.conf` lines 653–668):

```nginx
location /api/auth {
    limit_req zone=auth_limit burst=20 nodelay;
    rewrite ^/api/auth(/.*)?$ $1 break;   # strip /api/auth
    proxy_pass $auth_backend;
    proxy_ssl_server_name on;
}

location /api/user/auth {
    limit_req zone=auth_limit burst=20 nodelay;
    rewrite ^/api/user/auth(/.*)?$ $1 break;   # strip /api/user/auth
    proxy_pass $auth_backend;
    proxy_ssl_server_name on;
}
```

So:
- `/api/auth/...` → `https://rez-auth-service.onrender.com/...` (matches auth-service mount `/api/v1/auth/...` **only if you use the `/api/auth/...` aliases** — the auth service also exposes bare-path aliases under `/api/v1/auth` like `/send-otp`, `/verify-otp`, `/login-pin`, `/logout`, `/me`, `/profile`, `/complete-onboarding`, `/account`, `/refresh-token`. The router also strips `/api/v1/auth` for those because the rewrite `^/api/auth(/.*)?$ $1` strips `/api/auth`, leaving the rest.)

  Wait — re-reading: `rewrite ^/api/auth(/.*)?$ $1 break` strips `/api/auth` and proxies the **remainder**. So `/api/auth/otp/send` → backend `/otp/send`, but the auth service mounts everything under `/api/v1/auth`. **This means the gateway rewrite currently proxies the auth paths to a path that the auth service doesn't have.** This looks broken. The auth service does have bare-path aliases under `/api/v1/auth` for `send-otp`, `verify-otp`, etc., but not for `otp/send` (which lives at `/api/v1/auth/auth/otp/send` on the auth side after both prefix strips). **Treat this as a known bug or expect to update the rewrite to `rewrite ^/api/auth(/.*)?$ /api/v1/auth$1 break`.** Confirm with the team before wiring frontend.

- `/api/user/auth/...` → `https://rez-auth-service.onrender.com/...` (bare path; auth service has matching `/user/auth/...` aliases).
- `/api/v1/auth/...` is **not** routed by the gateway — frontend must use `/api/auth/...` or `/api/user/auth/...`.

**CORS allowlist** (nginx): `rez.money`, `www.rez.money`, `menu.rez.money`, `admin.rez.money`, `merchant.rez.money`, plus the Vercel deployment slugs `rez-app-admin.vercel.app`, `rez-app-consumer.vercel.app`, `rez-app-marchant.vercel.app` (sic, typo in source), `rez-web-menu.vercel.app`, `ad-bazaar.vercel.app`.

**Auth/token-validation at the gateway: none.** The gateway strips `Authorization` for upstream service proxies that need it, but does **not** validate JWTs itself. It is a pure router + CORS + rate-limit + WAF-headers gateway. Per-service auth happens inside each microservice (auth-service validates with `tokenService.validateToken`, others use `requireUser` from the Node side — but since the gateway is nginx, downstream services also call `jwt.verify` themselves with their own `JWT_SECRET`).

### Path-rewriting rules (auth-relevant)

| Gateway path | Rewritten to upstream | Upstream service |
|---|---|---|
| `/api/auth/<X>` | `/<X>` | `${AUTH_SERVICE_URL}` |
| `/api/user/auth/<X>` | `/<X>` | `${AUTH_SERVICE_URL}` |

Other auth-adjacent paths proxied by nginx (not auth-service): `/internal/auth/user/:id` is NOT routed by the gateway; calls to it from a sibling service should go directly to the auth service URL or via an internal-only network.

`proxy_set_header X-Internal-Token ""; proxy_set_header X-Internal-Service "";` in the common block prevents public clients from forging internal headers.

### Required env vars (referenced in code / nginx template / start.sh)

`start.sh` does fail-fast checks on these (fatal if missing at container start):

- `PORT` (default 10000 for Render)
- `MONOLITH_URL`
- `SEARCH_SERVICE_URL`
- `AUTH_SERVICE_URL`
- `PAYMENT_SERVICE_URL`
- `WALLET_SERVICE_URL`
- `MERCHANT_SERVICE_URL`
- `CATALOG_SERVICE_URL`
- `MARKETING_SERVICE_URL`
- `ORDER_SERVICE_URL`
- `ANALYTICS_SERVICE_URL`
- `GAMIFICATION_SERVICE_URL`
- `MEDIA_SERVICE_URL`
- `FINANCE_SERVICE_URL`
- `ADS_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL` (envsubst list only, not in fail-fast list)
- `KARMA_SERVICE_URL` (envsubst list only, not in fail-fast list)

`render.yaml` lists 17 SERVICE_URL vars (matches above 16 + `BACKEND_URL` which is a legacy alias for `MONOLITH_URL`).

### Health endpoints

- `GET /status` — inline 200 JSON, the preferred health check
- `GET /health` — inline 200 JSON, backward-compat alias
- `GET /health/services` — restricted to internal IPs, returns upstream URL map

`healthCheckPath: /health` in `render.yaml` matches both.

---

## 3. Frontend wiring implications

**Use the gateway URL as the single base URL for all API calls.** The gateway is on Render at `https://api.rez.money` (or whatever the Render hostname is). Do NOT call `rez-auth-service.onrender.com` directly from the browser — CORS, security headers, and rate limits are all enforced at the gateway.

**All auth paths must use `/api/auth/...` or `/api/user/auth/...`.** `/api/v1/auth/...` will 404 from the gateway.

Because of the apparent `/api/auth/...` → `/...` rewrite mismatch (see Routing Mechanism note), for safety the frontend should call the `/api/user/auth/...` form for the OTP/PIN flow, since auth service has explicit aliases for those (e.g. `/user/auth/send-otp`, `/user/auth/verify-otp`, `/user/auth/login-pin`, `/user/auth/logout`, `/user/auth/me`, `/user/auth/profile`, `/user/auth/complete-onboarding`, `/user/auth/account`, `/user/auth/refresh-token`).

### Auth-related frontend → gateway → auth-service mapping

Frontend path (browser calls) | Gateway path (nginx strips `/api/user/auth`) | Auth-service path (after rewrite) | Method
|---|---|---|---|
| `POST /api/user/auth/send-otp` | `/api/user/auth/send-otp` | `/user/auth/send-otp` | POST |
| `POST /api/user/auth/verify-otp` | `/api/user/auth/verify-otp` | `/user/auth/verify-otp` | POST |
| `POST /api/user/auth/mfa/verify-otp` | `/api/user/auth/mfa/verify-otp` | `/user/auth/mfa/verify-otp` (404 — not aliased) | POST |
| `POST /api/user/auth/login-pin` | `/api/user/auth/login-pin` | `/user/auth/login-pin` | POST |
| `POST /api/user/auth/logout` | `/api/user/auth/logout` | `/user/auth/logout` | POST |
| `GET  /api/user/auth/me` | `/api/user/auth/me` | `/user/auth/me` | GET |
| `PATCH /api/user/auth/profile` | `/api/user/auth/profile` | `/user/auth/profile` | PATCH |
| `POST /api/user/auth/complete-onboarding` | `/api/user/auth/complete-onboarding` | `/user/auth/complete-onboarding` | POST |
| `DELETE /api/user/auth/account` | `/api/user/auth/account` | `/user/auth/account` | DELETE |
| `POST /api/user/auth/refresh-token` | `/api/user/auth/refresh-token` | `/user/auth/refresh-token` | POST |

### Things to flag to the team

1. **`/api/auth/...` rewrite is broken** — it strips `/api/auth` but auth service mounts under `/api/v1/auth`. Until fixed, **only `/api/user/auth/...` works** through the gateway.
2. **`/api/v1/mfa/...`** is **not routed by the gateway** — only the inline `/auth/mfa/verify-otp` (after OTP verify, MFA challenge) and `/api/v1/mfa/auth/mfa/*` (post-login MFA setup) matter. The MFA verify after OTP-verify is at `/auth/mfa/verify-otp` in the auth service. To reach it via the gateway, frontend would need a path like `/api/user/auth/mfa/verify-otp` — auth service does not have this alias. Need to either add an alias or expose a new gateway route.
3. **OAuth2 partner flow** (`/api/v1/oauth/*`) is **not routed by the gateway**. Partner apps would need to call the auth service directly or be added to the gateway.
4. **Internal auth routes** (`/internal/*`) are **not routed by the gateway** (intentional). Sibling services call them directly.
5. **CORS allowlist** on the gateway does not include the local dev ports `3000` or `5173` — frontend dev must set up an entry or use a Vercel preview that matches one of the listed Vercel slugs. (Node gateway code has its own CORS allowlist for `localhost:3000` / `localhost:5173`, but that code path isn't used in production.)
6. **Frontend must store `accessToken` and `refreshToken`** from the login response. The login body returns both as top-level fields and inside a `tokens` object. Refresh via `POST /api/user/auth/refresh-token` with `{refreshToken}` body. On 401 from any backend, refresh and retry.
7. **`deviceRisk` field** in the login response (`trusted|new|suspicious`) — frontend may want to surface this or trigger extra verification.
8. **MFA setup paths** (post-login): not gateway-routed. Frontend should call auth service directly **or** a new gateway path must be added.

### Recommended frontend path table (safe defaults)

Use these to call the gateway from the browser:

```js
const API = 'https://api.rez.money';  // Render hostname of the gateway

// OTP
POST   ${API}/api/user/auth/send-otp
POST   ${API}/api/user/auth/verify-otp

// MFA challenge after verify-otp returns mfaRequired:true
POST   ${API}/api/user/auth/mfa/verify-otp   // DOES NOT WORK — needs new gateway route

// PIN
POST   ${API}/api/user/auth/login-pin

// Session
GET    ${API}/api/user/auth/me
POST   ${API}/api/user/auth/refresh-token
POST   ${API}/api/user/auth/logout

// Profile
PATCH  ${API}/api/user/auth/profile
POST   ${API}/api/user/auth/complete-onboarding
DELETE ${API}/api/user/auth/account
```

Headers: `Authorization: Bearer <accessToken>`. Body for refresh: `{ "refreshToken": "..." }`. Body for logout: `{ "refreshToken": "..." }` to also blacklist the refresh token.
