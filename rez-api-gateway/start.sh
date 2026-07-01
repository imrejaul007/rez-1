#!/bin/sh
# Substitute environment variables into nginx.conf and start nginx.
# Render sets PORT dynamically — we inject it plus the service URLs.

set -e

export PORT="${PORT:-10000}"

# Production defaults (imrejaul007/rez-1 on Render). Override in Render dashboard per environment.
# MONOLITH = main API; AUTH = dedicated auth service. All other routes fall back to monolith.
export MONOLITH_URL="${MONOLITH_URL:-https://rez-1.onrender.com}"
export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-https://rez-1-1.onrender.com}"
export SEARCH_SERVICE_URL="${SEARCH_SERVICE_URL:-https://rez-1.onrender.com}"
export PAYMENT_SERVICE_URL="${PAYMENT_SERVICE_URL:-https://rez-1.onrender.com}"
export WALLET_SERVICE_URL="${WALLET_SERVICE_URL:-https://rez-1.onrender.com}"
export MERCHANT_SERVICE_URL="${MERCHANT_SERVICE_URL:-https://rez-1.onrender.com}"
export CATALOG_SERVICE_URL="${CATALOG_SERVICE_URL:-https://rez-1.onrender.com}"
export MARKETING_SERVICE_URL="${MARKETING_SERVICE_URL:-https://rez-1.onrender.com}"
export ORDER_SERVICE_URL="${ORDER_SERVICE_URL:-https://rez-1.onrender.com}"
export ANALYTICS_SERVICE_URL="${ANALYTICS_SERVICE_URL:-https://rez-1.onrender.com}"
export GAMIFICATION_SERVICE_URL="${GAMIFICATION_SERVICE_URL:-https://rez-1.onrender.com}"
export MEDIA_SERVICE_URL="${MEDIA_SERVICE_URL:-https://rez-1.onrender.com}"
export FINANCE_SERVICE_URL="${FINANCE_SERVICE_URL:-https://rez-1.onrender.com}"
export NOTIFICATION_SERVICE_URL="${NOTIFICATION_SERVICE_URL:-https://rez-1.onrender.com}"
export ADS_SERVICE_URL="${ADS_SERVICE_URL:-https://rez-1.onrender.com}"
export KARMA_SERVICE_URL="${KARMA_SERVICE_URL:-https://rez-1.onrender.com}"
export SESSION_MANAGER_URL="${SESSION_MANAGER_URL:-https://rabtul-technologies.onrender.com}"
export INTERNAL_SERVICE_TOKEN="${INTERNAL_SERVICE_TOKEN:-}"

# CORS allowlist for frontend (pipe-separated regex alternation, no scheme in pattern)
export CORS_ORIGINS="${CORS_ORIGINS:-localhost:8081|localhost:19006|localhost:3000|rez-1\.vercel\.app}"

echo "[gateway] PORT=$PORT"
echo "[gateway] CORS_ORIGINS  → $CORS_ORIGINS"
echo "[gateway] MONOLITH      → $MONOLITH_URL"
echo "[gateway] SEARCH        → $SEARCH_SERVICE_URL"
echo "[gateway] AUTH          → $AUTH_SERVICE_URL"
echo "[gateway] PAYMENT       → $PAYMENT_SERVICE_URL"
echo "[gateway] WALLET        → $WALLET_SERVICE_URL"
echo "[gateway] MERCHANT      → $MERCHANT_SERVICE_URL"
echo "[gateway] CATALOG       → $CATALOG_SERVICE_URL"
echo "[gateway] MARKETING     → $MARKETING_SERVICE_URL"
echo "[gateway] ORDER         → $ORDER_SERVICE_URL"
echo "[gateway] ANALYTICS     → $ANALYTICS_SERVICE_URL"
echo "[gateway] GAMIFICATION  → $GAMIFICATION_SERVICE_URL"
echo "[gateway] MEDIA         → $MEDIA_SERVICE_URL"
echo "[gateway] FINANCE       → $FINANCE_SERVICE_URL"
echo "[gateway] NOTIFICATION  → $NOTIFICATION_SERVICE_URL"
echo "[gateway] ADS           → $ADS_SERVICE_URL"
echo "[gateway] KARMA           → $KARMA_SERVICE_URL (not deployed, routes to monolith)"
echo "[gateway] SESSION_MANAGER → $SESSION_MANAGER_URL"

# Fail fast if any required upstream URL is missing — silent empty values
# turn into broken proxy_pass directives that 502 every request.
# IMPORTANT: This list MUST match the envsubst list on the next line. If a
# var is in envsubst but not validated, an unset var will leave a literal
# ${VAR} string in the proxy_pass URL → silent 502s at runtime.
for var in CORS_ORIGINS MONOLITH_URL SEARCH_SERVICE_URL AUTH_SERVICE_URL PAYMENT_SERVICE_URL \
           WALLET_SERVICE_URL MERCHANT_SERVICE_URL CATALOG_SERVICE_URL \
           MARKETING_SERVICE_URL ORDER_SERVICE_URL ANALYTICS_SERVICE_URL \
           GAMIFICATION_SERVICE_URL MEDIA_SERVICE_URL FINANCE_SERVICE_URL \
           NOTIFICATION_SERVICE_URL ADS_SERVICE_URL KARMA_SERVICE_URL \
           SESSION_MANAGER_URL INTERNAL_SERVICE_TOKEN; do
  # Use printenv for POSIX-compatible indirect variable expansion
  value=$(printenv "$var" 2>/dev/null || echo "")
  if [ -z "$value" ]; then
    echo "[gateway] FATAL: $var is not set" >&2
    exit 1
  fi
done

# envsubst replaces ${VAR} placeholders in nginx.conf
envsubst '${PORT} ${CORS_ORIGINS} ${MONOLITH_URL} ${SEARCH_SERVICE_URL} ${AUTH_SERVICE_URL} ${PAYMENT_SERVICE_URL} ${WALLET_SERVICE_URL} ${MERCHANT_SERVICE_URL} ${CATALOG_SERVICE_URL} ${MARKETING_SERVICE_URL} ${ORDER_SERVICE_URL} ${ANALYTICS_SERVICE_URL} ${GAMIFICATION_SERVICE_URL} ${MEDIA_SERVICE_URL} ${FINANCE_SERVICE_URL} ${NOTIFICATION_SERVICE_URL} ${ADS_SERVICE_URL} ${KARMA_SERVICE_URL} ${SESSION_MANAGER_URL} ${INTERNAL_SERVICE_TOKEN}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

echo "[gateway] nginx config generated, starting..."

# Phase 6.23: Prime DNS cache for all upstream hostnames. When nginx workers
# start, they may try to resolve upstreams before Docker's internal DNS
# (127.0.0.11) has a cached entry, causing the first 1-2 requests to fail
# with "host not found" 502s. Touching each hostname forces glibc/nginx to
# cache the result, so workers pick it up immediately.
echo "[gateway] Priming DNS for upstream hostnames..."
for host in backend auth-service; do
  if getent hosts "$host" >/dev/null 2>&1; then
    echo "[gateway]   ✓ $host resolved"
  else
    echo "[gateway]   ⚠ $host not resolvable yet (will retry on first request)"
  fi
done

exec nginx -g 'daemon off;'
