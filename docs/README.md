# REZ App Stack

REZ is a local-merchant commerce platform: users browse, order, and earn cashback across stores. The platform is split into microservices, all runnable locally via `docker compose`.

## Architecture

```
                    [ nuqta-master (Expo/React Native) ]
                                    │ HTTPS / WS
                                    ▼
                    ┌───────────────────────────────┐
                    │  rez-api-gateway  :10000      │  (nginx)
                    │  - CORS, rate limit           │
                    │  - path-based routing         │
                    └───────────────────────────────┘
                          │              │           │
                          ▼              ▼           ▼
        ┌──────────────┐    ┌────────────────────┐   ┌──────────────────┐
        │ rez-auth-svc │    │ rez-backend-master │   │ 14 placeholder   │
        │   :4002      │    │     :5001          │   │ service URLs     │
        │  OTP/JWT/MFA │    │  monolith + jobs   │   │ (wallet, payment,│
        │  OAuth2      │    │  BullMQ, OTEL,     │   │  catalog, etc.)  │
        │              │    │  prom-client       │   │                  │
        └──────────────┘    └────────────────────┘   └──────────────────┘
              │                       │                       │
              └───────────┬───────────┘                       │
                          ▼                                   ▼
                  ┌──────────────┐                  (env-configured URLs)
                  │  mongo:7     │
                  │  redis:7     │
                  └──────────────┘
```

## Repo layout

| Path | Purpose |
|------|---------|
| `rez-backend-master/` | Express 5 + Mongoose 8 + BullMQ monolith (merged with git upstream) — runs on **port 5001** |
| `rez-auth-service/`  | Standalone auth microservice — OTP, JWT, MFA, OAuth2 — runs on **port 4002** |
| `rez-api-gateway/`   | nginx-based router — runs on **port 10000** (Render default) |
| `nuqta-master/`      | Expo React Native frontend. `.env` is pre-configured to call the gateway at `localhost:10000` |
| `docker-compose.dev.yml` | Local-dev compose: mongo:7, redis:7, auth-service, backend, gateway |
| `.env.dev`           | Cross-service dev secrets |
| `LOOP_PLAN.md`       | The master plan that drove the integration |
| `PHASE1_*` / `PHASE2_*` / `PHASE3_*` | Per-phase audit + fix reports |
| `RUNBOOK.md`         | Operator runbook (incident response, restart procedures) |

## Quick start

The fastest path from cold to working stack:

```bash
cd "C:\Users\user\Downloads\rez-backend-master"
./start.sh                  # builds + starts + runs smoke test (~3 min)
# Expected: "✓ ALL 13 TESTS PASSED"
```

Or step-by-step:

```bash
# 1. Start the local stack (mongo + redis + 3 services)
cd "C:\Users\user\Downloads\rez-backend-master"
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

# 2. Verify health
curl http://localhost:10000/status                # gateway
curl http://localhost:5001/health                 # backend
curl http://localhost:4002/health                 # auth-service

# 3. Run the smoke test (validates full auth flow)
bash smoke-test.sh
# Expected: "✓ ALL 13 TESTS PASSED"

# 4. Start the frontend
cd nuqta-master
npx expo start
```

The frontend (Expo) opens in a browser/QR code. Use the **web** target for fastest local iteration: press `w` in the Expo CLI.

## Smoke test the gateway → frontend path

```bash
cd nuqta-master
EXPO_PUBLIC_API_BASE_URL=http://localhost:10000/api node scripts/check-backend.js
# Expected: ✅ Backend connectivity check complete!
```

## Service URLs (local dev)

| Service | Port | Health check | Notes |
|---------|------|--------------|-------|
| Gateway | 10000 | `GET /status` | Public entrypoint for the frontend |
| Auth-service | 4002 | `GET /health` | Standalone; also has `/api-docs` (Swagger) |
| Backend | 5001 | `GET /health` | Monolith; also `/health/ready` for K8s-style readiness |
| Mongo | 27017 | (driver-level) | DB `rez` (backend) + `rez-auth` (auth-service) |
| Redis | 6379 | `PING` | Caching, rate limit, BullMQ, session state |

## Auth flow

1. Frontend `POST /api/user/auth/send-otp` → gateway → auth-service → enqueues OTP (BullMQ → notification-service in production; dev: `EXPOSE_DEV_OTP=true` returns the code in the response).
2. Frontend `POST /api/user/auth/verify-otp` → gateway → auth-service → if OTP valid, issues `{ accessToken (15m), refreshToken (24h, capped 48h), user }`. Stores `deviceFingerprint` + flags `deviceRisk` (trusted/new/suspicious).
3. Frontend stores tokens in `expo-secure-store` (native) or httpOnly cookies (web) and attaches `Authorization: Bearer <accessToken>` to subsequent requests via the `apiClient` singleton.
4. On 401 → `apiClient.handleTokenRefresh` → `POST /api/user/auth/refresh-token` → new access+refresh → retry once → on second 401 → `clearAuthData` + `AUTH_LOGOUT` redirect.
5. For admin: `POST /auth/admin/login` (email+password) → if MFA enabled, `pendingToken` + TOTP via `POST /auth/admin/mfa/verify`.

See `rez-auth-service/src/routes/authRoutes.ts` for the full endpoint list.

## Environment variables

### Backend (`rez-backend-master/.env` or compose env)
- `MONGODB_URI` — Mongo connection (compose: `mongodb://rezadmin:rezdevpass@mongo:27017/rez?authSource=admin`)
- `REDIS_URL` — Redis (compose: `redis://:rezdevpass@redis:6379`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_MERCHANT_SECRET` — **must match** the values in auth-service
- `AUTH_SERVICE_URL` — for internal validation calls (compose: `http://auth-service:4002`)
- `INTERNAL_SERVICE_TOKEN` — must match auth-service's `INTERNAL_SERVICE_TOKENS_JSON`
- `CORS_ORIGIN` — comma-separated origins
- `TRUST_PROXY` — set to `true` behind the gateway
- See `rez-backend-master/.env.example` for the full list

### Auth-service (`rez-auth-service/.env` or compose env)
- `MONGODB_URI` — same shape, different DB (`rez-auth`)
- `REDIS_URL` — same
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, `JWT_MERCHANT_SECRET` — all required
- `OTP_HMAC_SECRET` — used to hash OTPs before storing in Redis
- `OTP_TOTP_ENCRYPTION_KEY` — for encrypting TOTP secrets at rest
- `INTERNAL_SERVICE_TOKENS_JSON` — scoped map `{"auth-service":"token1","backend":"token2"}`
- `CORS_ORIGIN` — must include the gateway origin
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — for email verification
- `EXPOSE_DEV_OTP=true` — **DEV ONLY**; never in production

### Gateway (`rez-api-gateway/.env` or compose env)
- `PORT` — default `10000` (Render default)
- `MONOLITH_URL` — backend URL (compose: `http://backend:5001`)
- `AUTH_SERVICE_URL` — auth URL (compose: `http://auth-service:4002`)
- 14 other `*_SERVICE_URL` vars (wallet, payment, catalog, etc.) — these point at placeholder URLs in dev; the gateway will fail-fast at startup if any required one is missing
- See `rez-api-gateway/GATEWAY_ENV_VARS.txt` for the canonical list

### Frontend (`nuqta-master/.env`)
- `EXPO_PUBLIC_API_BASE_URL` — gateway URL (compose: `http://localhost:10000/api`)
- `EXPO_PUBLIC_API_URL` — same (used by ad-hoc fetch callers)
- `EXPO_PUBLIC_DEV_API_URL` — same
- `EXPO_PUBLIC_SOCKET_URL` — gateway URL (compose: `http://localhost:10000`)
- See `nuqta-master/.env.example` for the full list

## Development workflow

Branch convention: `feature/<domain>/<short-description>`. Commit via `claude code` (per `rez-backend/CLAUDE.md`). Run tests before pushing.

### Per-service commands

```bash
# Backend
cd rez-backend-master
npm install
npm run build
node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand   # tests need 8GB heap
npm run dev   # nodemon src/server.ts

# Auth-service
cd rez-auth-service
npm install
npm run build
npm test

# Gateway (nginx)
cd rez-api-gateway
docker build -t rez-gateway .   # nginx:1.27-alpine
docker run --rm -p 10000:10000 --env-file ../.env.dev rez-gateway

# Frontend
cd nuqta-master
npm install
npx expo start
```

## Known gaps (before any production deploy)

- 🛠️ **Stub methods** in services: `StreakService.recordActivity`, `NotificationService.notifyOpportunity/notifyProgress`, `prometheus.readModelStaleness/merchantEventQueueBacklog`, `scheduleCronJob` (re-added in `cronJobs.ts`), `getCircuit` (re-added in `circuitBreaker.ts`), `aggregatorSyncConflicts` (re-added in `prometheus.ts`). All log a warning at runtime. **Implement or remove before production.**
- 🔒 **Test fixtures**: `src/__tests__/helpers/testUtils.ts` is missing `phoneNumber` for test User creation. Causes 14+ tests in `services/CashbackService.test.ts` to fail. **Fix before claiming "tests pass".**
- 🐛 **Otel/Sentry**: Sentry DSN + OTEL endpoint are wired in code but the env vars are unset in `.env.dev`. Tracing will be no-op locally.
- 🐛 **Test heap**: backend test suite needs ≥8GB heap due to MongoMemoryServer instances.
- 🔒 **Hard-coded credentials in `scripts/*.js`**: ✅ scrubbed 2026-06-21 via `_scrub_creds.mjs`. Re-run if you add new scripts.

## Useful references

- `LOOP_PLAN.md` — master integration plan
- `RUNBOOK.md` — operator incident response
- `rez-auth-service/docs/openapi.yaml` — auth-service OpenAPI spec (also at `/api-docs` when running)
- `rez-api-gateway/README.md` — gateway architecture + Kong config
- `nuqta-master/PHASE1_FRONTEND_AUDIT.md` — full frontend API surface (564 endpoints)
