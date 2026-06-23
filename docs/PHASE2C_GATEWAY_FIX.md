# PHASE 2C — Gateway Routing Fix

**File:** `rez-api-gateway/nginx.conf`

## Bug
The `/api/auth` location block stripped the `/api/auth` prefix via
`rewrite ^/api/auth(/.*)?$ $1 break;`, so `/api/auth/me` was proxied to the
auth-service as `/me`. The auth-service mounts its routes under
`/api/v1/auth/...`, so the request 404'd.

Additionally, MFA (`/api/v1/mfa`) and OAuth2 (`/api/v1/oauth`) routes were not
routed by the gateway at all — they fell through to the monolith catch-all.

## Diff Summary

### 1. Fixed `/api/auth` rewrite (line ~656)
```diff
-            rewrite ^/api/auth(/.*)?$ $1 break;
+            rewrite ^/api/auth(/.*)?$ /api/v1/auth$1 break;
```
Now `/api/auth/me` is forwarded to the auth-service as `/api/v1/auth/me`,
matching where rez-auth-service mounts its routes.

### 2. Inserted MFA location block (after `/api/auth`, before `/api/user/auth`)
```nginx
# MFA — auth-service handles MFA under /api/v1/mfa
location /api/v1/mfa {
    limit_req zone=auth_limit burst=20 nodelay;
    rewrite ^/api/v1/mfa(/.*)?$ $1 break;
    proxy_pass $auth_backend;
    proxy_ssl_server_name on;
}
```

### 3. Inserted OAuth2 location block (after MFA, before `/api/user/auth`)
```nginx
# OAuth2 partner flow — auth-service handles OAuth under /api/v1/oauth
location /api/v1/oauth {
    limit_req zone=auth_limit burst=20 nodelay;
    rewrite ^/api/v1/oauth(/.*)?$ $1 break;
    proxy_pass $auth_backend;
    proxy_ssl_server_name on;
}
```

### Untouched
- `/api/user/auth` block (works correctly as-is — proxied as `/api/user/auth/...`,
  no rewrite needed for the auth-service route shape).
- All map vars and upstream blocks.
- The monolith catch-all `location /api`.

## Verification (grep)

```
654:        location /api/auth {
662:        location /api/v1/mfa {
670:        location /api/v1/oauth {
```
All three location blocks present.

`limit_req_zone` declarations (relevant ones):
```
142:    limit_req_zone $binary_remote_addr zone=api_limit:20m rate=50r/s;
148:    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=100r/m;
161:    limit_req_zone $merchant_rate_key zone=merchant_limit:20m rate=100r/s;
165:    limit_req_zone $binary_remote_addr zone=merchant_auth_limit:10m rate=60r/m;
175:    limit_req_zone $pos_rate_key zone=pos_limit:10m rate=30r/s;
190:    limit_req_zone $merchant_write_key zone=merchant_write:10m rate=30r/m;
```

## Rate-Limit Zone Notes

`auth_limit` zone is already declared at line 148
(`zone=auth_limit:10m rate=100r/m`). No `oauth_limit` zone exists.

Per the task's "keep this minimal" instruction, **both MFA and OAuth2 reuse
`auth_limit`** rather than introducing a new zone. Rationale:
- OAuth2 partner flow has similar rate-limit needs to the standard auth flow.
- `auth_limit` is keyed on `$binary_remote_addr` with a generous 100r/m, which
  is appropriate for both MFA challenges and OAuth2 callbacks.
- Adding a new zone would be a separate concern (capacity planning) and is out
  of scope for this routing fix.

If OAuth2 partner traffic grows substantially and needs independent
back-pressure from login/OTP traffic, a dedicated `oauth_limit` zone can be
added later following the same `limit_req_zone` declaration pattern as
`merchant_auth_limit` (line 165).
