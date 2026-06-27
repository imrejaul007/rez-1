# CORS Configuration Fixes

## Summary
Fixed CORS configuration to use environment variables instead of hardcoded origins.

## Issues Fixed

### 1. Hardcoded localhost origins in nginx.conf (CRITICAL)
**File:** `rez-api-gateway/nginx.conf`

**Before:**
```nginx
set $cors_allowed_prod "https://rez\.money|https://www\.rez\.money|...";
if ($http_origin ~* "^(https://(rez\.money|www\.rez\.money|...|localhost))$") {
    set $cors_origin $http_origin;
}
```

**After:**
```nginx
set $cors_allowed_origins "${CORS_ORIGINS}";
if ($http_origin ~* "^(https://(${cors_allowed_origins}))$") {
    set $cors_origin $http_origin;
}
```

### 2. CORS_ORIGINS Environment Variable
**File:** `rez-api-gateway/.env.example`

Added the `CORS_ORIGINS` variable with proper documentation:
- Production: All REZ domains and Vercel deployments (no localhost)
- Development: localhost and 127.0.0.1

### 3. X-Forwarded-Proto (ALREADY FIXED)
The nginx.conf already uses `$scheme` for X-Forwarded-Proto headers:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

## CORS Synchronization Across Services

### rez-backend (Monolith)
- Uses `CORS_ORIGIN` environment variable
- Validates at startup: fails if `CORS_ORIGIN=*` in production
- Validates `corsValidator.ts` runs on server start
- **Config:** `src/config/middleware.ts` - `getAllowedOrigins()`

### rez-auth-service
- Uses `CORS_ORIGIN` environment variable
- Validates at startup: rejects wildcards
- **Config:** `src/index.ts` lines 102-121

### rez-api-gateway (nginx)
- Uses `CORS_ORIGINS` environment variable (pipe-separated for regex)
- **Config:** `nginx.conf` - CORS block

## Deployment Checklist

### Production
1. Set `CORS_ORIGINS` in Render dashboard to production domains only:
   ```
   rez\.money|www\.rez\.money|menu\.rez\.money|admin\.rez\.money|merchant\.rez\.money|rez-app-admin\.vercel\.app|rez-app-consumer\.vercel\.app|rez-app-merchant\.vercel\.app|rez-web-menu\.vercel\.app|ad-bazaar\.vercel\.app
   ```

2. Set `CORS_ORIGIN` for backend services:
   ```
   https://rez.money,https://www.rez.money,https://menu.rez.money,https://admin.rez.money,https://merchant.rez.money,https://rez-app-admin.vercel.app,https://rez-app-consumer.vercel.app,https://rez-app-merchant.vercel.app,https://rez-web-menu.vercel.app,https://ad-bazaar.vercel.app
   ```

3. Verify `NODE_ENV=production` is set

### Development
1. `CORS_ORIGINS=localhost|127\.0\.0\.1` (nginx)
2. `CORS_ORIGIN=http://localhost:3000,...` (backend services)
3. `NODE_ENV=development`

## Security Notes

- Never use wildcard `*` for CORS origins in production
- All services validate CORS configuration at startup
- Backend services reject requests without Origin header for mutation operations
- nginx strips duplicate CORS headers from upstream responses
