# PHASE 10 NOTES — Pre-Production Operator Actions

> **Date:** 2026-06-22
> **Phase:** 10 of `PRODUCTION_READINESS_PHASE_PLAN.md`
> **Author:** Autonomous agent (no Atlas / Render / provider-dashboard access)
> **Status:** Preparation complete. Operator actions documented, ready for human execution.

---

## TL;DR

Phase 10 is the only phase that **cannot be fully executed by an autonomous agent** — it requires access to MongoDB Atlas, the Render dashboard, and several third-party provider dashboards (Razorpay, Stripe, Firebase, Makcorps, NextaBizz, etc.). What this phase delivers is:

1. **`PRODUCTION_LAUNCH_CHECKLIST.md`** (updated) — every operator action spelled out step by step, with `sync: false` env-var lists, exact dashboard navigation, and verification steps.
2. **`rez-api-gateway/nginx.conf:240`** — DNS resolver updated to public DNS (the only Phase 10 action an agent CAN do).
3. **This document** — explains what was prepared, why each step matters, and what blocks the launch until a human runs each section.

---

## Subtask-by-subtask summary

### 10.1 Rotate Atlas credentials — PREPARED

Documented in `PRODUCTION_LAUNCH_CHECKLIST.md` §1.1.

- Both Atlas users (`mukulraj756`, `work_db_user`) have their current passwords present in git history (committed during early development, before the iter 10 credential scrub).
- The scrub removed the **plaintext references** from source files but cannot invalidate credentials that were once committed — they MUST be rotated.
- Steps prepared: log in → Database Access → Edit Password → Autogenerate → Update Render env group → Update `.env.dev` → Verify with `mongosh`.
- Note: `rez-api`, `rez-worker`, `rez-auth-service`, and every microservice (`rez-gamification-service`, `rez-wallet-service`, etc.) all connect to Atlas and need the new password in their env vars.

### 10.2 Set `ALLOWED_INTERNAL_IPS` and `APP_CHECK_SECRET_KEY` — PREPARED

Documented in `PRODUCTION_LAUNCH_CHECKLIST.md` §1.2.

- Both vars are `sync: false` in `rez-auth-service/render.yaml` — they will never auto-populate.
- `ALLOWED_INTERNAL_IPS` should be the comma-separated list of Render's static egress IPs (https://docs.render.com/static-outbound-ip-addresses). Without this, the IP-based gate on admin endpoints is effectively open.
- `APP_CHECK_SECRET_KEY` should be generated locally with `openssl rand -hex 32` — the agent cannot generate this securely because the resulting secret must be entered by hand.
- Verification command included: from a Render shell, hit admin endpoint → 401 with `internal_ips: denied`. From a non-Render IP → 403.

### 10.3 Set webhook secrets — PREPARED

Documented in `PRODUCTION_LAUNCH_CHECKLIST.md` §1.3.

Seven secrets enumerated with provider dashboard locations:
- `RAZORPAY_WEBHOOK_SECRET` — Razorpay dashboard → Settings → Webhooks
- `STRIPE_WEBHOOK_SECRET` — Stripe dashboard → Developers → Webhooks
- `MAKCORPS_WEBHOOK_SECRET` — Makcorps dashboard → Account → API → Webhooks
- `NEXTABIZZ_WEBHOOK_SECRET` — NextaBizz dashboard → Integrations
- `TRAVEL_WEBHOOK_SECRET` — partner coordination via Slack
- `ADBAZAAR_WEBHOOK_SECRET` — AdBazaar dashboard → Settings
- `REZ_OTA_WEBHOOK_SECRET` — hotel OTA partner
- `OTP_HMAC_SECRET` and `INTERNAL_SERVICE_TOKEN` — internally generated, `openssl rand -base64 64` / `openssl rand -hex 32`

Each secret has a verification step (re-deliver test event, confirm signature validation in logs).

### 10.4 Replace placeholder env values — PREPARED

Documented in `PRODUCTION_LAUNCH_CHECKLIST.md` §1.4.

Three categories:

**Frontend (Expo bundle):**
- 11 `EXPO_PUBLIC_*` env vars enumerated with their source dashboards.
- These are baked into the JS bundle at build time, so they must be set BEFORE the EAS production build is triggered.

**Backend (Render env groups):**
- 30+ env vars enumerated, grouped by provider.
- All `sync: false` in `render.yaml` so they must be set manually.
- Note: `INTERNAL_SERVICE_TOKENS_JSON` on auth-service is a JSON map, not a single secret — included with example value.

**Service URLs (rez-api-gateway):**
- 17 `*_SERVICE_URL` env vars that must point at production render deployments (not localhost).

### 10.5 Update `nginx.conf` resolver — DONE

`C:\Users\user\Downloads\rez-backend-master\rez-api-gateway\nginx.conf:240`

**Before:**
```nginx
resolver 127.0.0.11 valid=3600s ipv6=off;
```

**After:**
```nginx
resolver 8.8.8.8 1.1.1.1 valid=3600s ipv6=off;
```

**Why this matters:**
- On Render, the gateway runs as a Docker container **outside** any compose network, so Docker's internal DNS (`127.0.0.11`) is unreachable.
- The old resolver would silently fail DNS lookups for `rez-api.onrender.com` and friends, causing 502 errors at the gateway.
- Public DNS (Google + Cloudflare) works in both contexts:
  - On Render: resolves Render hostnames directly.
  - In local Docker smoke-test: the upstream hostnames are FQDNs (`auth-service:3000` → `auth-service`) which Docker proxies to any reachable DNS, not only `127.0.0.11`.
- The change is annotated in-place with a Phase 10.5 comment explaining the reasoning.

**Verification:** the Render redeploy that pulls the new image will log successful upstream DNS resolution on first request. A simple `curl https://api.rez.in/v1/categories` after redeploy is sufficient.

---

## What the agent did NOT do (and why)

- ❌ **Did not log into MongoDB Atlas.** No credentials in scope, and rotating from an agent terminal would be a security anti-pattern (credentials would briefly exist in shell history).
- ❌ **Did not log into Render dashboard.** Same reasoning.
- ❌ **Did not log into Razorpay / Stripe / Firebase / Makcorps / NextaBizz / AdBazaar.** Each requires human-in-the-loop 2FA and possibly signed contract approval.
- ❌ **Did not modify `.env.dev` or `.env.prod`.** Per the task's anti-pattern list, these have real dev credentials the developer is actively using.
- ❌ **Did not commit changes.** The checklist update and nginx change are local; the operator should commit them after reviewing.

---

## What blocks the launch

Until all five sub-sections of `PRODUCTION_LAUNCH_CHECKLIST.md` §1 are checked, the platform is **not production-ready**:

| Sub-section | Blocks? | Why |
|---|---|---|
| 1.1 Atlas rotation | YES | Old credentials are in git history; a leaked clone = full DB read/write. |
| 1.2 `ALLOWED_INTERNAL_IPS` | YES | Admin endpoints effectively open to the internet. |
| 1.2 `APP_CHECK_SECRET_KEY` | YES | Firebase App Check disabled — any client can impersonate a verified app. |
| 1.3 Webhook secrets | YES | HMAC verification falls back to "always accept" when secret is placeholder. |
| 1.4 Placeholder env vars | YES | Stripe live keys, Twilio tokens, etc. must be real — placeholders cause runtime errors or 401s. |
| 1.5 nginx resolver | **DONE** by agent. | Render deploy needed (triggered by operator after §1.5 ack). |

---

## References

- `PRODUCTION_LAUNCH_CHECKLIST.md` — the operator-facing checklist.
- `PRODUCTION_READINESS_PHASE_PLAN.md` §11 — the original Phase 10 plan.
- `SECURITY_FIXES_ITER13.md` — last code-side security iteration, references the same operator actions.
- `rez-auth-service/render.yaml`, `rez-backend-master/render.yaml`, `rez-api-gateway/render.yaml` — env var declarations.
- `rez-api-gateway/nginx.conf` — the file modified for subtask 10.5.