# REZ Stack — Operator Runbook

> For on-call engineers. **When in doubt, restart first; ask questions later.**

## 1. Service health

| Service | Health endpoint | Expected response |
|---------|-----------------|-------------------|
| Gateway | `GET http://<host>:10000/status` | `{"status":"healthy",...}` HTTP 200 |
| Auth-service | `GET http://<host>:4002/health` | `{"status":"ok",...}` HTTP 200; `{"status":"degraded",...}` is OK if Redis is down; HTTP 503 only if Mongo is down |
| Backend | `GET http://<host>:5001/health` | `{"status":"ok","db":"connected","redis":"connected",...}` HTTP 200 |
| Mongo | `mongosh "mongodb://localhost:27017/rez" --eval "db.runCommand({ping:1})"` | `{ ok: 1 }` |
| Redis | `redis-cli -a <password> ping` | `PONG` |

**Quick check script:**
```bash
for url in http://localhost:10000/status http://localhost:5001/health http://localhost:4002/health; do
  echo -n "$url → "
  curl -s -o /dev/null -w "%{http_code}\n" "$url"
done
```

Expected: `200`, `200`, `200`.

## 2. Logs

| Service | Local-dev logs | Production logs |
|---------|----------------|-----------------|
| Backend | stdout (`docker compose logs -f backend`) | Render dashboard → Logs; or your log aggregator |
| Auth-service | stdout (`docker compose logs -f auth-service`) | Same |
| Gateway | nginx access + error logs (`docker compose logs -f gateway`) | Same |
| Mongo | mongod log | Render |
| Redis | redis log | Render |

**Enable debug logging** in dev: set `LOG_LEVEL=debug` in `.env.dev` and restart the service.

## 3. Restart procedures

### Single-service restart (no downtime for others)

```bash
docker compose -f docker-compose.dev.yml restart auth-service
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart gateway
```

### Full stack restart

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
```

### Rebuild after a code change

```bash
# After editing a service's source
docker compose -f docker-compose.dev.yml build <service>
docker compose -f docker-compose.dev.yml up -d <service>
```

### Hard reset (drop data)

```bash
docker compose -f docker-compose.dev.yml down -v   # WARNING: deletes all data
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
```

## 4. Common failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Frontend can't log in (OTP never arrives) | Auth-service can't reach notification queue | Check `redis-cloud` URL in `.env.dev`; verify `EXPOSE_DEV_OTP=true` for local |
| `502 Bad Gateway` from gateway | Upstream service is down or starting | Check `docker compose ps`; restart the failed service |
| `503 Service Unavailable` from backend `/health` | Mongo or Redis disconnected | Verify both via section 1; check `MONGODB_URI` + `REDIS_URL` env |
| OTP verify returns `401` | Token expired or JWT secret mismatch between auth-service and backend | Ensure `JWT_SECRET` matches in both `.env` files; restart both |
| Auth-service logs `FATAL: Missing required env vars` | First-startup env not loaded | `docker compose -f docker-compose.dev.yml --env-file .env.dev up -d` (not just `up`) |
| Gateway logs `FATAL: AUTH_SERVICE_URL is not set` | Compose env vars not injected | Same fix as above — must use `--env-file` |
| Test suite crashes with OOM | Default Node heap too small | Use `node --max-old-space-size=8192 ./node_modules/jest/bin/jest.js --runInBand` |
| Backend tests fail with `User validation failed: phoneNumber` | `testUtils.ts` is missing required fields | See "Test fixtures" in README — fix helper, re-run |
| Frontend hits 404 on `/api/v1/mfa/*` | Gateway route is missing (was added in `rez-api-gateway/nginx.conf` line 662) | Verify the file was edited; rebuild the gateway image |
| OTP send returns 500 | `INTERNAL_SERVICE_TOKENS_JSON` not set in auth-service | Both services need this env var; same value |

## 5. Database operations

### Connect to local Mongo

```bash
docker exec -it rez-dev-mongo mongosh "mongodb://rezadmin:rezdevpass@localhost:27017/rez?authSource=admin"
```

### Connect to local Redis

```bash
docker exec -it rez-dev-redis redis-cli -a rezdevpass
```

### Sync indexes

```bash
# Backend
docker exec -it rez-dev-backend npm run db:indexes

# Or directly:
docker exec -it rez-dev-backend node -e "require('./dist/scripts/ensureIndexes.js')"
```

### Backup / restore

```bash
# Backup
docker exec rez-dev-mongo mongodump --uri="mongodb://rezadmin:rezdevpass@localhost:27017/rez?authSource=admin" --out=/data/backup
docker cp rez-dev-mongo:/data/backup ./backups/$(date +%Y%m%d)

# Restore
docker cp ./backups/20260621 rez-dev-mongo:/data/restore
docker exec rez-dev-mongo mongorestore --uri="mongodb://rezadmin:rezdevpass@localhost:27017/rez?authSource=admin" /data/restore/rez
```

## 6. Token rotation

The auth-service and backend share JWT secrets. To rotate:

1. Generate new secrets:
   ```bash
   openssl rand -hex 64  # JWT_SECRET
   openssl rand -hex 64  # JWT_REFRESH_SECRET
   openssl rand -hex 32  # OTP_TOTP_ENCRYPTION_KEY
   openssl rand -base64 64  # OTP_HMAC_SECRET
   ```
2. Update `.env.dev` (or production env group) with the new values.
3. Restart BOTH auth-service and backend in lockstep (old tokens are invalidated on restart).
4. All users will be forced to re-login.

**Rollback:** keep the old secrets in version-controlled backup; revert `.env.dev` if rotation breaks auth.

## 7. Rollback procedure

The stack has no formal release versioning yet. To roll back a service:

```bash
# Identify the last-known-good image tag (if you pushed one)
docker images rez-backend

# Or revert the source change and rebuild
git -C rez-backend-master revert <commit-sha>
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
```

For production, use Render's "Rollback" button on the service dashboard.

## 8. Contact / escalation

| Role | Contact | When to escalate |
|------|---------|------------------|
| On-call engineer | (your team's number) | Any P1 outage |
| DBA | (your team's DBA) | Mongo failures, data corruption |
| Security | (your team's sec) | Suspected credential leak, suspicious activity |
| Vendor (Render) | Render support | Hosting issues |

## 9. Smoke test (end-to-end)

After any change, verify the full OTP login flow:

```bash
# 1. Get an OTP (with EXPOSE_DEV_OTP=true, the code is in the response)
curl -X POST http://localhost:10000/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+15555550100"}'

# Response: { "success": true, "data": { "otp": "123456" } }  ← dev only

# 2. Verify the OTP
curl -X POST http://localhost:10000/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+15555550100","otp":"123456"}'

# Response: { "user": {...}, "tokens": { "accessToken": "...", "refreshToken": "..." } }

# 3. Call a protected endpoint with the access token
ACCESS="<paste accessToken from step 2>"
curl http://localhost:10000/api/user/auth/me -H "Authorization: Bearer $ACCESS"

# Response: { "user": {...} }
```

If all 3 return `200 OK` with sensible bodies, the stack is healthy.

## 10. Stub audit (before any production deploy)

The merge left ~20 stub methods that warn at runtime. Search for them:

```bash
grep -rn "STUB: added during Phase 2" rez-backend-master/src/
```

Each stub must be either:
1. **Implemented** with the real logic (recommended for any path that's user-facing).
2. **Removed** along with its callers (if the feature isn't needed).

Until this audit is done, do not promote to production.
