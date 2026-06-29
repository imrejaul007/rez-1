# REZ Platform — Render Backend Deployment Guide

This guide covers deploying the three backend repositories to [Render](https://render.com), plus how they connect to the Expo frontend on Vercel.

**Repositories:**

| Repo | Role |
|------|------|
| `rez-api-gateway` | Public API entry (nginx reverse proxy) |
| `rez-auth-service` | Authentication (OTP, JWT, MFA) |
| `rez-backend-master` | Main API monolith + background worker |

**Frontend:** `nuqta-master` → deploy to **Vercel** (not Render).

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [What you need outside Render](#what-you-need-outside-render)
3. [Deploy order](#deploy-order)
4. [Step 0 — MongoDB + Redis](#step-0--mongodb--redis)
5. [Step 1 — rez-backend-master](#step-1--rez-backend-master)
6. [Step 2 — rez-auth-service](#step-2--rez-auth-service)
7. [Step 3 — rez-api-gateway](#step-3--rez-api-gateway)
8. [Step 4 — Frontend (Vercel)](#step-4--frontend-vercel)
9. [Monorepo vs separate repos](#monorepo-vs-separate-repos)
10. [Gateway routing reference](#gateway-routing-reference)
11. [Environment variable checklists](#environment-variable-checklists)
12. [Post-deploy verification](#post-deploy-verification)
13. [Troubleshooting](#troubleshooting)
14. [Cost estimate (starter tier)](#cost-estimate-starter-tier)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients (Expo web / mobile)                                    │
│  EXPO_PUBLIC_API_BASE_URL → gateway URL                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  rez-api-gateway (Render Web — Docker, port 10000)              │
│  nginx — routes /api/* to correct upstream                      │
└──────────────┬─────────────────────────────┬────────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ rez-auth-service         │   │ rez-backend-master (rez-api)     │
│ Render Web — Node        │   │ Render Web — Node                │
│ /api/auth, /api/user/auth│   │ stores, cart, orders, payments,  │
│ OTP, JWT, MFA            │   │ sockets, most /api/* routes      │
└──────────┬───────────────┘   └──────────────┬───────────────────┘
           │                                  │
           │         ┌────────────────────────┤
           │         │                        │
           ▼         ▼                        ▼
    ┌─────────────────────────────────────────────────────────────┐
    │  MongoDB Atlas          Redis / Valkey (Render Key Value)   │
    └─────────────────────────────────────────────────────────────┘
                             ▲
                             │
              ┌──────────────┴──────────────┐
              │ rez-worker (Background)    │
              │ Same repo as backend       │
              │ Cron, queues, notifications│
              └────────────────────────────┘
```

### Render services to create

| Repo | Render service name | Type | Config file |
|------|---------------------|------|-------------|
| `rez-backend-master` | `rez-api` | Web Service (Node) | `render.yaml` |
| `rez-backend-master` | `rez-worker` | Background Worker | `render.yaml` |
| `rez-auth-service` | `rez-auth-service` | Web Service (Node) | `render.yaml` |
| `rez-api-gateway` | `rez-api-gateway` | Web Service (Docker) | `render.yaml` |

**Important:** The public URL your app uses is the **gateway** URL, not the backend URL directly.

```
EXPO_PUBLIC_API_BASE_URL=https://<your-gateway>.onrender.com/api
```

Locally, `nuqta-master/.env` uses `http://localhost:10000/api` (gateway port) — production should follow the same pattern.

---

## What you need outside Render

These are **not** in your three repos but are required:

| Service | Provider | Purpose |
|---------|----------|---------|
| **MongoDB** | [MongoDB Atlas](https://www.mongodb.com/atlas) | Primary database |
| **Redis** | Render Key Value, Upstash, or similar | Cache, queues, rate limits |

Without MongoDB and Redis, `rez-backend-master` and `rez-auth-service` will fail to start.

---

## Deploy order

Deploy in this order — each step depends on the previous:

1. **MongoDB Atlas** + **Redis**
2. **rez-backend-master** (`rez-api` + `rez-worker`)
3. **rez-auth-service**
4. **rez-api-gateway** (needs backend + auth URLs)
5. **nuqta-master** on Vercel (point API URL at gateway)

---

## Step 0 — MongoDB + Redis

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user (save username + password).
3. Copy the connection string → `MONGODB_URI`
   - Example: `mongodb+srv://user:pass@cluster.mongodb.net/rez?retryWrites=true&w=majority`
4. **Network Access** → allow `0.0.0.0/0` (or Render egress IPs) so Render can connect.

### Redis

1. In Render: **New** → **Key Value** (Redis-compatible), or use [Upstash](https://upstash.com).
2. Copy `REDIS_URL` → e.g. `redis://red-xxxx:6379` or `rediss://...` with password.

### Generate shared secrets

Run once locally. **JWT secrets must be identical** on backend and auth-service:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 48   # JWT_MERCHANT_SECRET
openssl rand -base64 48   # JWT_ADMIN_SECRET
openssl rand -base64 32   # OTP_HMAC_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY
openssl rand -hex 32      # TOTP_ENCRYPTION_KEY
openssl rand -hex 32      # INTERNAL_SERVICE_TOKEN
```

Store these in a password manager — never commit them to git.

---

## Step 1 — rez-backend-master

Creates **two** Render services from one repo (defined in `rez-backend-master/render.yaml`).

### Service A: `rez-api` (Web)

| Setting | Value |
|---------|--------|
| **Root Directory** | `.` if repo is only backend; `rez-backend-master` if monorepo |
| **Runtime** | Node **20.x** |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` |
| **Plan** | Starter (or higher for production) |

### Service B: `rez-worker` (Background Worker)

| Setting | Value |
|---------|--------|
| Same repo / root directory as `rez-api` |
| **Start Command** | `npm run start:worker` |
| **Extra env** | `ENABLE_CRON=true`, `WORKER_ROLE=noncritical`, `PROCESS_ROLE=worker` |

The worker handles background jobs: notifications, cashback queues, cron tasks. The API process intentionally does **not** run all workers (to stay within Redis connection limits on free tier).

### Backend required environment variables

Set these in the Render dashboard for **both** `rez-api` and `rez-worker`:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# JWT — MUST match rez-auth-service exactly
JWT_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
JWT_MERCHANT_SECRET=<openssl rand -base64 48>
JWT_ADMIN_SECRET=<openssl rand -base64 48>

# CORS — your Vercel / app URL
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app
MERCHANT_FRONTEND_URL=https://your-app.vercel.app

# Proxy (gateway sits in front)
TRUST_PROXY_DEPTH=2
WORKER_ROLE=critical          # on rez-api only
ENABLE_CRON=false             # on rez-api; true on worker

# Security (server hard-exits if missing in production)
OTP_HMAC_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
TOTP_ENCRYPTION_KEY=<openssl rand -hex 32>

# Payments (required in production — validateEnv.ts enforces)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Media uploads
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email / SMS (recommended)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=REZ <noreply@yourdomain.com>
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+91...

# Monitoring (production-required by validateEnv.ts)
SENTRY_DSN=https://...@sentry.io/...

# Internal service auth
INTERNAL_SERVICE_TOKEN=<openssl rand -hex 32>
INTERNAL_SERVICE_KEY=<same or coordinated with auth tokens JSON>

# Optional external microservices (defaults exist in render.yaml)
GAMIFICATION_SERVICE_URL=https://rez-gamification-service-3b5d.onrender.com
AUTH_SERVICE_URL=https://<your-auth-service>.onrender.com
```

After deploy, note the URL:

```
https://rez-api-xxxx.onrender.com
```

Test: `curl https://rez-api-xxxx.onrender.com/health`

---

## Step 2 — rez-auth-service

### Render settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `.` or `rez-auth-service` (monorepo) |
| **Runtime** | Node |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Health Check Path** | `/health` |

Config reference: `rez-auth-service/render.yaml`

### Auth required environment variables

```env
NODE_ENV=production
EXPOSE_DEV_OTP=false

MONGODB_URI=mongodb+srv://...    # can use same Atlas cluster; db name may differ
REDIS_URL=redis://...

# JWT — MUST match rez-backend-master exactly
JWT_SECRET=<same as backend>
JWT_REFRESH_SECRET=<same as backend>
JWT_MERCHANT_SECRET=<same as backend>
JWT_ADMIN_SECRET=<same as backend>

OTP_HMAC_SECRET=<same as backend>
OTP_TOTP_ENCRYPTION_KEY=<openssl rand -hex 32>

# CORS
CORS_ORIGIN=https://your-app.vercel.app
APP_URL=https://your-app.vercel.app

# Email (OTP delivery)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=REZ Auth <noreply@yourdomain.com>

# Internal service tokens (JSON map of service → token)
INTERNAL_SERVICE_TOKENS_JSON={"backend":"<your-internal-token>"}

# Security (set manually — sync: false in render.yaml)
ALLOWED_INTERNAL_IPS=0.0.0.0/0   # tighten in production to Render egress IPs

# Optional
SENTRY_DSN=https://...@sentry.io/...
OTEL_SERVICE_NAME=rez-auth-service
```

After deploy:

```
https://rez-auth-service-xxxx.onrender.com
```

Test: `curl https://rez-auth-service-xxxx.onrender.com/health`

---

## Step 3 — rez-api-gateway

### Render settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `.` or `rez-api-gateway` (monorepo) |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile` |
| **Health Check Path** | `/health` |

Config reference: `rez-api-gateway/render.yaml`

The gateway container runs nginx on Render's `$PORT` (default 10000). At startup, `start.sh` substitutes environment variables into `nginx.conf`.

### Gateway environment variables

**All** `*_SERVICE_URL` variables are required — the gateway exits if any are empty.

For a **3-repo setup** (no separate microservices yet), point everything except auth at your monolith:

```env
MONOLITH_URL=https://rez-api-xxxx.onrender.com
AUTH_SERVICE_URL=https://rez-auth-service-xxxx.onrender.com

# Point all other services at monolith until you split microservices:
SEARCH_SERVICE_URL=https://rez-api-xxxx.onrender.com
PAYMENT_SERVICE_URL=https://rez-api-xxxx.onrender.com
WALLET_SERVICE_URL=https://rez-api-xxxx.onrender.com
MERCHANT_SERVICE_URL=https://rez-api-xxxx.onrender.com
CATALOG_SERVICE_URL=https://rez-api-xxxx.onrender.com
MARKETING_SERVICE_URL=https://rez-api-xxxx.onrender.com
ORDER_SERVICE_URL=https://rez-api-xxxx.onrender.com
ANALYTICS_SERVICE_URL=https://rez-api-xxxx.onrender.com
GAMIFICATION_SERVICE_URL=https://rez-api-xxxx.onrender.com
MEDIA_SERVICE_URL=https://rez-api-xxxx.onrender.com
FINANCE_SERVICE_URL=https://rez-api-xxxx.onrender.com
NOTIFICATION_SERVICE_URL=https://rez-api-xxxx.onrender.com
ADS_SERVICE_URL=https://rez-api-xxxx.onrender.com
KARMA_SERVICE_URL=https://rez-api-xxxx.onrender.com
```

Replace `rez-api-xxxx` and `rez-auth-service-xxxx` with your actual Render hostnames.

After deploy, this is your **public API base**:

```
https://rez-api-gateway-xxxx.onrender.com
```

Test:

```bash
curl https://rez-api-gateway-xxxx.onrender.com/health
curl https://rez-api-gateway-xxxx.onrender.com/api/health
```

---

## Step 4 — Frontend (Vercel)

Deploy `nuqta-master` to Vercel (not Render).

### Vercel project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `nuqta-master` |
| **Framework** | Other |
| **Build Command** | `npm run build:render` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci \|\| npm install` |

Config reference: `nuqta-master/vercel.json`

### Vercel environment variables

```env
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_BASE_URL=https://rez-api-gateway-xxxx.onrender.com/api
EXPO_PUBLIC_API_URL=https://rez-api-gateway-xxxx.onrender.com/api

# Payments
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Firebase, Maps, Sentry, etc. — see nuqta-master/.env.production.example
```

### Backend CORS must include Vercel URL

On **rez-api** and **rez-auth-service**:

```env
CORS_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
```

---

## Monorepo vs separate repos

### Option A — Monorepo (`imrejaul007/rez-1`)

One GitHub repo containing all folders. Create **4 Render services**, each with a different **Root Directory**:

| Render service | Root Directory |
|----------------|----------------|
| `rez-api-gateway` | `rez-api-gateway` |
| `rez-auth-service` | `rez-auth-service` |
| `rez-api` | `rez-backend-master` |
| `rez-worker` | `rez-backend-master` |

Connect the same GitHub repo to each service; only the root directory differs.

### Option B — Three separate GitHub repos

Each repo deploys independently with Root Directory `.`.

### Blueprint (Infrastructure as Code)

- `rez-backend-master/render.yaml` — defines `rez-api` + `rez-worker` (can use Render Blueprint)
- `rez-auth-service/render.yaml` — single web service
- `rez-api-gateway/render.yaml` — Docker web service

For a monorepo Blueprint, you may need a combined root `render.yaml` or create services manually with correct root directories.

---

## Gateway routing reference

| Path prefix | Routed to |
|-------------|-----------|
| `/api/auth` | `AUTH_SERVICE_URL` |
| `/api/user/auth` | `AUTH_SERVICE_URL` |
| `/api/v1/mfa` | `AUTH_SERVICE_URL` |
| `/api/v1/oauth` | `AUTH_SERVICE_URL` |
| `/api/payment` | `PAYMENT_SERVICE_URL` |
| `/api/wallet` | `WALLET_SERVICE_URL` |
| `/api/gamification` | `GAMIFICATION_SERVICE_URL` |
| `/api/orders` | `ORDER_SERVICE_URL` |
| `/api/catalog` | `CATALOG_SERVICE_URL` |
| `/api/search` | `SEARCH_SERVICE_URL` |
| `/socket.io/` | `MONOLITH_URL` (WebSockets) |
| `/api/*` (catch-all) | `MONOLITH_URL` |

When microservices are not deployed, pointing all `*_SERVICE_URL` values at `MONOLITH_URL` works because the backend monolith implements most routes.

---

## Environment variable checklists

### Quick copy — rez-api (backend web)

```
NODE_ENV=production
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_MERCHANT_SECRET=
JWT_ADMIN_SECRET=
FRONTEND_URL=
CORS_ORIGIN=
TRUST_PROXY_DEPTH=2
WORKER_ROLE=critical
OTP_HMAC_SECRET=
ENCRYPTION_KEY=
TOTP_ENCRYPTION_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SENTRY_DSN=
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
INTERNAL_SERVICE_TOKEN=
AUTH_SERVICE_URL=
```

### Quick copy — rez-worker

Same as `rez-api`, plus:

```
ENABLE_CRON=true
WORKER_ROLE=noncritical
PROCESS_ROLE=worker
NOTIFICATION_WORKER_EXTERNAL=true
```

Remove `WORKER_ROLE=critical` from worker (use `noncritical`).

### Quick copy — rez-auth-service

```
NODE_ENV=production
EXPOSE_DEV_OTP=false
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_MERCHANT_SECRET=
JWT_ADMIN_SECRET=
OTP_HMAC_SECRET=
OTP_TOTP_ENCRYPTION_KEY=
CORS_ORIGIN=
APP_URL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
INTERNAL_SERVICE_TOKENS_JSON=
ALLOWED_INTERNAL_IPS=
SENTRY_DSN=
```

### Quick copy — rez-api-gateway

```
MONOLITH_URL=
AUTH_SERVICE_URL=
SEARCH_SERVICE_URL=
PAYMENT_SERVICE_URL=
WALLET_SERVICE_URL=
MERCHANT_SERVICE_URL=
CATALOG_SERVICE_URL=
MARKETING_SERVICE_URL=
ORDER_SERVICE_URL=
ANALYTICS_SERVICE_URL=
GAMIFICATION_SERVICE_URL=
MEDIA_SERVICE_URL=
FINANCE_SERVICE_URL=
NOTIFICATION_SERVICE_URL=
ADS_SERVICE_URL=
KARMA_SERVICE_URL=
```

### Quick copy — Vercel (frontend)

```
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_BASE_URL=https://<gateway>.onrender.com/api
EXPO_PUBLIC_RAZORPAY_KEY_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_SENTRY_DSN=
```

---

## Post-deploy verification

Run these after each service deploys:

```bash
# 1. Backend health (direct)
curl https://rez-api-xxxx.onrender.com/health

# 2. Auth health (direct)
curl https://rez-auth-service-xxxx.onrender.com/health

# 3. Gateway health
curl https://rez-api-gateway-xxxx.onrender.com/health

# 4. API through gateway (what the app uses)
curl https://rez-api-gateway-xxxx.onrender.com/api/health

# 5. Optional — test a public endpoint
curl https://rez-api-gateway-xxxx.onrender.com/api/categories
```

### Browser checks

1. Open your Vercel app URL.
2. Open DevTools → Network.
3. Confirm API calls go to `https://<gateway>.onrender.com/api/...`.
4. Confirm no CORS errors (if CORS fails, fix `CORS_ORIGIN` on backend + auth).

### Cold starts

Render free/starter tiers spin down after inactivity. First request after idle may take **30–60 seconds**. This is normal.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| CORS error in browser | `CORS_ORIGIN` not set or wrong URL | Set `CORS_ORIGIN` and `FRONTEND_URL` to exact Vercel URL (no trailing slash mismatch) |
| 502 Bad Gateway from gateway | Backend/auth not running or wrong URL | Verify `MONOLITH_URL` and `AUTH_SERVICE_URL`; check Render logs |
| Gateway container exits immediately | Missing `*_SERVICE_URL` env var | Set all 16 service URLs in gateway env |
| Backend crash on startup | Missing required env | Check logs for `Environment validation failed`; set `MONGODB_URI`, `JWT_*`, `CORS_ORIGIN`, `REDIS_URL`, Razorpay keys |
| Auth works locally, not production | JWT secret mismatch | Ensure `JWT_SECRET` etc. are **identical** on backend and auth-service |
| Login OTP never arrives | `RESEND_API_KEY` missing | Set Resend credentials on auth-service |
| WebSocket / live updates fail | Gateway or wrong URL | App must use gateway URL; `/socket.io/` routes to monolith |
| Worker jobs not running | `rez-worker` not deployed | Deploy worker service with `ENABLE_CRON=true` |
| MongoDB connection refused | Atlas IP allowlist | Allow `0.0.0.0/0` or Render egress IPs in Atlas |
| Rate limit affects all users | `TRUST_PROXY_DEPTH` wrong | Set `TRUST_PROXY_DEPTH=2` on backend (gateway + Render LB) |

### Useful Render log locations

- Render Dashboard → Service → **Logs**
- Render Dashboard → Service → **Events** (deploy failures)

### Local parity (docker-compose)

Local full stack matches production topology:

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
```

- Gateway: `http://localhost:10000`
- Backend: `http://localhost:5001`
- Auth: `http://localhost:4002`

---

## Cost estimate (starter tier)

| Resource | Render plan | Notes |
|----------|-------------|-------|
| rez-api-gateway | Starter Web | Docker/nginx |
| rez-auth-service | Starter Web | Node |
| rez-api | Starter Web | Node |
| rez-worker | Starter Worker | Background jobs |
| Redis | Key Value free/starter | Shared by all services |
| MongoDB | Atlas free M0 | External |

**Total: ~4 Render billable services** + Atlas + Redis.

Upgrade to paid plans when you need: no cold starts, more RAM for `expo export` builds, higher Redis connection limits.

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `rez-backend-master/render.yaml` | Backend API + worker blueprint |
| `rez-auth-service/render.yaml` | Auth service blueprint |
| `rez-api-gateway/render.yaml` | Gateway Docker blueprint |
| `rez-api-gateway/start.sh` | Gateway env substitution + startup |
| `rez-api-gateway/nginx.conf` | Route definitions |
| `docker-compose.dev.yml` | Local full-stack dev |
| `nuqta-master/vercel.json` | Frontend Vercel config |
| `nuqta-master/.env.production.example` | Frontend production env template |
| `docs/PRODUCTION_LAUNCH_CHECKLIST.md` | Full production go-live checklist |

---

## Deployment checklist (printable)

- [ ] MongoDB Atlas cluster created; `MONGODB_URI` copied
- [ ] Redis instance created; `REDIS_URL` copied
- [ ] Secrets generated (JWT, OTP, encryption keys)
- [ ] `rez-api` deployed; `/health` returns 200
- [ ] `rez-worker` deployed; logs show cron/queue init
- [ ] `rez-auth-service` deployed; `/health` returns 200
- [ ] JWT secrets match between backend and auth
- [ ] `rez-api-gateway` deployed; all 16 `*_SERVICE_URL` set
- [ ] Gateway `/api/health` returns 200
- [ ] Vercel frontend deployed with `EXPO_PUBLIC_API_BASE_URL` = gateway
- [ ] `CORS_ORIGIN` set on backend + auth to Vercel URL
- [ ] Razorpay/Stripe live keys set (backend + frontend)
- [ ] Resend API key set on auth-service
- [ ] Sentry DSN set (optional but recommended)
- [ ] End-to-end test: open app → browse → login → checkout flow

---

*Last updated: 2026-06-27 — covers `rez-api-gateway`, `rez-auth-service`, `rez-backend-master`, and `nuqta-master` on Vercel.*
