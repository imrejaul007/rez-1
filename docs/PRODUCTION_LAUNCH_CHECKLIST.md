# Production Launch Checklist

> Final go-live checklist for the REZ platform. The owner of each row
> is responsible for initialing the **Sign-off** section at the bottom.
> Cross-reference: [PRODUCTION_READINESS_PHASE_PLAN.md](./PRODUCTION_READINESS_PHASE_PLAN.md)
> (Phase 10 — Pre-Production Operator Actions).

> **Phase 10.5 update (2026-06-22):** the `nginx.conf` resolver has
> been switched from Docker's `127.0.0.11` to public DNS
> (`8.8.8.8 1.1.1.1`). No further operator action needed for that
> change beyond triggering a Render redeploy (see §1.5).

---

## Section 1 — Required ITER13 / Phase 10 Operator Actions (BLOCKING)

These five actions were deferred from the autonomous loop and **must**
be performed by a human operator with access to the production
dashboards. Until all five sub-actions (1.1-1.5) are checked, the
launch is on hold.

### 1.1 Rotate Atlas credentials (BLOCKING)

- [ ] Log into **MongoDB Atlas** → `rez-prod` project → **Database Access**.
- [ ] Rotate the password for user `mukulraj756`.
- [ ] Rotate the password for user `work_db_user`.
- [ ] Update `.env.dev` and `.env.prod` with the new passwords (do
      **not** commit — they are gitignored).
- [ ] Update the **Render** environment group `rez-prod-env` with the
      new values via the Render dashboard or `render env-vars`.
- [ ] Re-deploy `rez-backend`, `rez-worker`, `rez-auth-service`, and
      every microservice so they pick up the new env vars.
- [ ] Verify connectivity: hit `/health` on each service and confirm
      200 with `mongo: connected`.
- [ ] Verify Atlas IP allowlist still includes the Render egress range
      (or `0.0.0.0/0` if Render is behind a NAT — confirm with Render
      support).
- [ ] Sanity-check from your dev machine with
      `mongosh "<new MONGODB_URI>"` and run `show dbs` to confirm the
      rez databases are visible.

### 1.2 Set `ALLOWED_INTERNAL_IPS` and `APP_CHECK_SECRET_KEY` (BLOCKING)

These are declared `sync: false` in `rez-auth-service/render.yaml` so
they never leak into the rendered manifest. They must be set manually
in Render.

- [ ] Generate the App Check secret on your dev machine with
      `openssl rand -hex 32` (output is 64 hex chars).
- [ ] Look up Render's static egress IPs for your auth-service region
      (https://docs.render.com/static-outbound-ip-addresses). Copy the
      IP ranges as a comma-separated CIDR list.
- [ ] In Render, open `rez-auth-service` → **Environment**.
- [ ] Set `ALLOWED_INTERNAL_IPS` = the Render egress CIDR list.
- [ ] Set `APP_CHECK_SECRET_KEY` = the value from `openssl rand -hex 32`.
      Do **not** use the value from `.env.dev`.
- [ ] Trigger a manual deploy of `rez-auth-service` and confirm the
      startup log shows `app_check: enabled` and `internal_ips: N
      allowed`.
- [ ] Confirm an internal call from `rez-backend` to
      `rez-auth-service/verify` succeeds (200) and an external call
      with the same token fails (403).

### 1.3 Set webhook secrets (BLOCKING)

- [ ] **Razorpay**: dashboard → **Webhooks** → create / rotate the
      secret for the production endpoint
      (`https://api.rez.in/webhooks/razorpay`). Set
      `RAZORPAY_WEBHOOK_SECRET` on the Render `rez-api` and
      `rez-worker` env groups. Re-deliver one test webhook and confirm
      signature validation succeeds.
- [ ] **Stripe** (if used): dashboard → **Webhooks** → rotate. Set
      `STRIPE_WEBHOOK_SECRET`. Re-deliver test event.
- [ ] **Makcorps** (hotel pricing): Makcorps dashboard → **Account** →
      **API** → **Webhooks**. Set `MAKCORPS_WEBHOOK_SECRET`.
- [ ] **NextaBizz**: NextaBizz dashboard → **Integrations** →
      **Webhooks**. Set `NEXTABIZZ_WEBHOOK_SECRET`.
- [ ] **Travel partner**: coordinate via Slack `#travel-integrations`
      to get the shared HMAC secret. Set `TRAVEL_WEBHOOK_SECRET`.
- [ ] **AdBazaar** (https://ad-bazaar.vercel.app): **Settings** →
      **Webhooks**. Set `ADBAZAAR_WEBHOOK_SECRET` (must match
      AdBazaar's own env).
- [ ] **Firebase Phone Auth**: confirm `OTP_HMAC_SECRET` matches the
      Firebase app's secret in `.env.prod` and Render (must be ≥32
      chars and identical across dev/prod).
- [ ] **Internal service token**: regenerate `INTERNAL_SERVICE_TOKEN`
      (≥32 chars) and set on `rez-backend`, `rez-auth-service`, and
      `rez-api-gateway`.
- [ ] **Rez OTA** (hotel stay-completion bonus): set
      `REZ_OTA_WEBHOOK_SECRET`.

### 1.4 Replace placeholder env values in production (BLOCKING)

The `render.yaml` files declare many env vars as `sync: false`. These
are the production values the operator must set. Each block below
must be 100% filled before launch.

#### 1.4.1 Frontend (Expo bundle — `nuqta-master/app.config.js`)
- [ ] `EXPO_PUBLIC_RAZORPAY_KEY_ID` — Razorpay → Settings → API Keys
      (live key, `rzp_live_...`).
- [ ] `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe → Developers →
      API Keys (live `pk_live_...`).
- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY`
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID`
- [ ] `EXPO_PUBLIC_SENTRY_DSN` — Sentry → Project Settings → Client
      Keys (DSN).
- [ ] `EXPO_PUBLIC_GA_TRACKING_ID` — Google Analytics → Admin → Data
      Streams → Measurement ID (`G-XXXXX`).
- [ ] `EXPO_PUBLIC_MIXPANEL_TOKEN` — Mixpanel → Project Settings →
      Access Tokens.

Set these either in `app.config.js` for a single build, or as EAS
build-time secrets (`eas env:create`) for separate staging / prod
builds.

#### 1.4.2 Backend env vars (Render dashboard per service)
- [ ] `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — Razorpay live API keys.
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Stripe live keys.
- [ ] `SENDGRID_API_KEY` — SendGrid → Settings → API Keys.
- [ ] `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` /
      `TWILIO_PHONE_NUMBER` — Twilio console.
- [ ] `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` /
      `CLOUDINARY_API_SECRET` — Cloudinary console.
- [ ] `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — Resend.com (e.g.
      `noreply@rez.in`).
- [ ] `WHATSAPP_APP_SECRET` / `WHATSAPP_VERIFY_TOKEN` /
      `WHATSAPP_STORE_ID` — Meta Business → WhatsApp Configuration.
- [ ] `FIREBASE_CREDENTIALS_JSON` — Firebase → Project Settings →
      Service Accounts → Generate New Private Key (paste as single-line
      JSON).
- [ ] `ENCRYPTION_KEY` — `openssl rand -hex 32`.
- [ ] `TOTP_ENCRYPTION_KEY` — `openssl rand -hex 32`.
- [ ] `OTP_HMAC_SECRET` — `openssl rand -base64 64`.
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` / `JWT_ADMIN_SECRET` /
      `JWT_MERCHANT_SECRET` — `openssl rand -hex 64` each.
- [ ] `INTERNAL_SERVICE_TOKEN` / `INTERNAL_SERVICE_KEY` —
      `openssl rand -hex 32` each.
- [ ] `INTERNAL_SERVICE_TOKENS_JSON` on auth-service — JSON map
      `{ "rez-backend": "<64-hex>", "rez-api-gateway": "<64-hex>",
      ... }`.
- [ ] `SENTRY_DSN` — Sentry → Project Settings → Client Keys (DSN).
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` — your OTLP collector URL.
- [ ] `CORS_ORIGIN` — comma-separated
      `https://app.rez.in,https://merchant.rez.in,https://admin.rez.in`.
- [ ] `FRONTEND_URL` / `MERCHANT_FRONTEND_URL` / `ADMIN_FRONTEND_URL`
      — the three frontend origins as fallback for CORS.

#### 1.4.3 Service URLs (Render env vars)
For `rez-api-gateway`, all upstream service URLs must point at the
production render deployments:
- [ ] `MONOLITH_URL`, `BACKEND_URL`, `AUTH_SERVICE_URL`,
      `GAMIFICATION_SERVICE_URL`, `WALLET_SERVICE_URL`,
      `PAYMENT_SERVICE_URL`, `CATALOG_SERVICE_URL`,
      `ANALYTICS_SERVICE_URL`, `SEARCH_SERVICE_URL`,
      `MARKETING_SERVICE_URL`, `MEDIA_SERVICE_URL`,
      `ORDER_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`,
      `MERCHANT_SERVICE_URL`, `FINANCE_SERVICE_URL`, `ADS_SERVICE_URL`,
      `KARMA_SERVICE_URL`.

### 1.5 Confirm `nginx.conf` resolver update (DONE by Phase 10.5)

The DNS resolver in `rez-api-gateway/nginx.conf:240` was changed from
`127.0.0.11` (Docker-only internal DNS) to `8.8.8.8 1.1.1.1` (public
DNS that works on Render). This change is required so the gateway can
resolve the upstream service hostnames on Render, where there is no
Docker DNS.

- [x] `rez-api-gateway/nginx.conf:240` resolver updated to
      `resolver 8.8.8.8 1.1.1.1 valid=3600s ipv6=off;` (completed by
      Phase 10.5).
- [ ] Trigger a Render redeploy of `rez-api-gateway` so the new image
      rolls out.
- [ ] Verify from the Render shell:
      `nslookup rez-api.onrender.com 8.8.8.8` → expect a non-empty
      answer.
- [ ] Smoke-test: hit `https://api.rez.in/v1/categories` → expect 200.

---

## Section 2 — Pre-launch Technical Checklist

### 2.1 Code & CI

- [ ] All four CI workflows are green on `main`:
      - `rez-backend` CI (`rez-backend-master/.github/workflows/ci.yml`)
      - `nuqta-master` Frontend Testing (`frontend-testing.yml`)
      - Frontend Build (`frontend-build.yml`)
      - Weekly Dependency Audit (`audit.yml`) — last run < 7 days old.
- [ ] Branch protection on `main` requires the four status checks
      above (see [CONTRIBUTING.md](./CONTRIBUTING.md)).
- [ ] No open PRs older than 7 days, or all such PRs have an
      explicit `on-hold` label.

### 2.2 Data & Migrations

- [ ] `npm run db:indexes` has been run against the production
      database within the last 24 hours.
- [ ] No pending Mongoose migrations (check `src/scripts/migrations/`).
- [ ] `npm run seed:categories` and `npm run seed:financial-services`
      have been run against prod at least once.
- [ ] Atlas backups are enabled (Continuous backup, PITR window ≥ 7
      days). Verify in Atlas → **Backup**.
- [ ] Atlas point-in-time restore has been **tested** in the last 30
      days on a non-prod cluster that mirrors prod schema.

### 2.3 Smoke Tests (BLOCKING)

- [ ] `./smoke-test.sh prod` passes all **10 smoke tests** with zero
      failures. The 10 tests are:
      1. Health endpoints for `rez-backend`, `rez-auth-service`,
         `rez-api-gateway` return 200.
      2. Anonymous `/api/v1/categories` returns ≥ 20 categories.
      3. Anonymous `/api/v1/offers/featured` returns ≥ 3 offers.
      4. Phone-OTP login flow completes end-to-end (sends OTP, logs
         in, returns access + refresh token).
      5. Authenticated `/api/v1/users/me` returns the logged-in user.
      6. `rez-backend` can reach Mongo (health check `db.ping()`).
      7. `rez-backend` can reach Redis (`SET`/`GET` round-trip).
      8. Razorpay order creation endpoint returns 201 with a valid
         order id.
      9. CORS allows the production frontend origin
         (`https://app.example.com`).
      10. Internal `/internal/health` is **rejected** without the
          `INTERNAL_SERVICE_TOKEN`.

### 2.4 Observability

- [ ] Logs are flowing into the ELK stack (or chosen aggregator) —
      verify with a test request to `rez-backend` and search for it.
- [ ] Prometheus is scraping all three services. Confirm `/metrics`
      endpoints return non-empty payloads.
- [ ] Alert rules in `prometheus-alerts.yml` are loaded and the test
      alerts have fired at least once.
- [ ] Sentry DSNs are configured for `rez-backend`, `rez-auth-service`,
      `rez-api-gateway`, and `nuqta-master`.
- [ ] On-call rotation is published in PagerDuty / Opsgenie.

### 2.5 Security

- [ ] All secrets in Render are `sync: false` (no values in git).
- [ ] `.env.dev` and `.env.prod` are **not** committed.
- [ ] Latest `npm audit --omit=dev` shows zero high/critical CVEs.
- [ ] CORS allowlist is restricted to the production frontend origin.
- [ ] Rate limiting is enabled on `/auth/*`, `/payments/*`, and
      `/wallet/*`.

### 2.6 Frontend

- [ ] Latest `dist/` build was produced from a clean `main` checkout
      (via the `frontend-build.yml` artifact).
- [ ] Static host (Render static site / Vercel) is serving the latest
      `dist/` and serving it over HTTPS.
- [ ] Sentry source maps are uploaded for the production build.
- [ ] The web bundle's `EXPO_PUBLIC_API_BASE_URL` points at the
      production API gateway (not staging).

---

## Section 3 — DO NOT (read carefully)

These items will cause a launch to be rolled back.

- **DO NOT** commit real `.env` files. Use `.env.example` for templates.
- **DO NOT** skip the 10-test `smoke-test.sh` — it is the minimum
  bar. If any test fails, the launch is paused until it passes.
- **DO NOT** merge to `main` without the four required CI status
  checks being green. Branch protection must be enforced.
- **DO NOT** rotate credentials on a Friday afternoon. Schedule
  credential rotations for Tue/Wed/Thu so there is time to recover.
- **DO NOT** change `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `JWT_MERCHANT_SECRET`, `JWT_ADMIN_SECRET`, or `OTP_HMAC_SECRET`
  between dev and prod. Use separate values, but rotate them all
  together so signing algorithms stay in sync.
- **DO NOT** disable rate limiting in production, even temporarily.
  It exists to protect payment endpoints.
- **DO NOT** deploy without an on-call engineer paged and
  acknowledged.
- **DO NOT** treat this checklist as complete if any box in Section 1
  is unchecked. All five sub-actions (1.1-1.5) are blocking.

---

## Section 4 — Sign-off

By signing below, each owner confirms that every applicable box above
has been completed and verified.

| Role | Name | Date | Signature / Initials |
|---|---|---|---|
| Engineering Lead | ________________ | __________ | __________ |
| DevOps / SRE | ________________ | __________ | __________ |
| Security | ________________ | __________ | __________ |
| Product / PM | ________________ | __________ | __________ |
| Atlas / DB Admin | ________________ | __________ | __________ |

> Once all four sign-offs are collected, file this document in
> `docs/sign-offs/` (create the folder if needed) and link it from the
> launch announcement channel.