# Phase 1 Notes — 2026-06-22

**Scope:** Subtasks 1.3 (CORS) and 1.4 (VAPID key). Subtasks 1.1 and 1.2 (secrets scrubbing) were **deferred** because the developer is still using the real API keys for local dev and testing.

---

## Subtask 1.3 — CORS ✅ DONE

### Part A: Fixed `CORS_ORIGIN=*` in dev `.env`
- **File:** `rez-backend-master/.env:8`
- **Before:** `CORS_ORIGIN=*`
- **After:** `CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:10000`

### Part B: Wired strict prod CORS validator into `startServer()`

**Old:** `rez-backend-master/src/middleware/corsConfig.ts` (242 lines) contained `validateCorsConfiguration()` but had **zero importers** — it was dead code. Per the audit, no one ever called it, so even though it would correctly reject `CORS_ORIGIN=*` in production, the production boot would never trip it.

**New:**
- `rez-backend-master/src/config/corsValidator.ts` (new file) — extracted `validateCorsConfiguration()` function, fail-closed in production (throws if `CORS_ORIGIN` is missing or `*`).
- `rez-backend-master/src/server.ts:41` — added import: `import { validateCorsConfiguration } from './config/corsValidator';`
- `rez-backend-master/src/server.ts:228-237` — added validation block right after `validateEnvironment()`, before `server.listen()`. On failure, logs error and `process.exit(1)`.
- `rez-backend-master/src/middleware/corsConfig.ts` — **deleted** (file is now dead).

### Verification
| Check | Result |
|---|---|
| `grep -nE "CORS_ORIGIN=\*" rez-backend-master/.env` | 0 hits ✅ |
| `ls rez-backend-master/src/middleware/corsConfig.ts` | ENOENT (deleted) ✅ |
| `grep -n "validateCorsConfiguration" rez-backend-master/src/server.ts` | 2 hits (line 41 import + line 232 call) ✅ |
| `grep -rn "corsConfig" rez-backend-master/src` | 0 hits ✅ |
| `cd rez-backend-master && npm run build` | exit 0, 0 errors ✅ |

---

## Subtask 1.4 — VAPID key in `.env.example` ✅ DONE

**Why:** `nuqta-master/app.config.js:27` reads `process.env.EXPO_PUBLIC_VAPID_KEY`. If undefined at build time, the `expo-notifications` plugin will crash the build. The previous `.env.example` did not document this variable.

**Added at `nuqta-master/.env.example:45-52`:**
```bash
# ================================================
# PUSH NOTIFICATIONS (VAPID)
# ================================================
# VAPID public key for web push via Firebase Cloud Messaging.
# Generate a key pair in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
# Add the PUBLIC key here. The PRIVATE key stays on the backend (rez-auth-service).
# Without this, the expo-notifications plugin build will crash.
EXPO_PUBLIC_VAPID_KEY=YOUR_VAPID_PUBLIC_KEY_HERE
```

### Verification
| Check | Result |
|---|---|
| `grep -n "EXPO_PUBLIC_VAPID_KEY" nuqta-master/.env.example` | 1 hit (line 52) ✅ |
| `cd nuqta-master && npx tsc --noEmit` | exit 0, 0 errors ✅ |
| `cd rez-auth-service && npm run build` | exit 0, 0 errors ✅ |

---

## Subtasks 1.1 & 1.2 — DEFERRED

**Status:** Not executed this session. The real Atlas/Maps/OpenCage/Twilio/Redis credentials in `rez-backend-master/.env` and `rez-auth-service/.env` remain in place because the developer is still using them for local testing.

**Risk if not done before any `git push` to a public remote:**
- MongoDB Atlas user `mukulraj756` password exposed
- MongoDB Atlas user `work_db_user` password exposed
- Twilio account SID + auth token exposed
- Redis Cloud password exposed
- Sentry DSN exposed (low risk — public anyway)
- Google Maps / OpenCage keys exposed

**Mitigation:** As long as `.env` files are gitignored (they are — verified at `nuqta-master/.gitignore:34` and equivalent in backend `.gitignore`s) and not `git add -f`'d, the secrets stay local.

**Reminder for later:** When the developer is ready to scrub, the steps are:
- For each line in each `.env` containing a real credential: replace with a placeholder + comment pointing to where to get the real value (Google Cloud Console, MongoDB Atlas, Twilio, Redis Cloud, etc.)
- Create a `PHASE1_NOTES.md` (this file) update listing what was scrubbed
- Verify `_scrub_creds.mjs` reports "Found credentials in 0 files"

**No rotation needed yet** — developer is still in dev. Rotation (Phase 10) happens when the app is ready to deploy to production.

---

## Summary

| Subtask | Status | Time spent |
|---|---|---|
| 1.1 — Frontend keys scrub | ⏸️ Deferred (dev) | 0 |
| 1.2 — Backend creds scrub | ⏸️ Deferred (dev) | 0 |
| 1.3 — CORS prod validation | ✅ Done | ~10 min |
| 1.4 — VAPID key in `.env.example` | ✅ Done | ~3 min |

**Ready for Phase 2:** Yes — Phase 2 (dead code deletion) is safe to run regardless of whether 1.1/1.2 are done.
