#!/usr/bin/env bash
# start.sh — bring the rez-app stack up from cold.
#
# Steps:
#   1. Verify Docker is running
#   2. Copy .env.example files if needed
#   3. docker compose up -d (builds images on first run)
#   4. Wait for all 5 services to be HEALTHY
#   5. Run the smoke test
#
# Usage:
#   ./start.sh                  # full cold-start
#   ./start.sh --skip-build     # use existing images
#   ./start.sh --no-smoke      # don't run smoke test after

set -e

# ── Parse flags ──
SKIP_BUILD=0
NO_SMOKE=0
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=1 ;;
    --no-smoke)   NO_SMOKE=1 ;;
    --help|-h)
      echo "Usage: $0 [--skip-build] [--no-smoke]"
      echo "  --skip-build   Use existing Docker images (faster)"
      echo "  --no-smoke     Start the stack but skip the smoke test"
      exit 0
      ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# ── Helpers ──
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

step() { echo -e "${GREEN}▶${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

# ── 1. Verify Docker ──
step "Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
  fail "docker not installed. Install Docker Desktop from https://docker.com/products/docker-desktop"
fi
if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon not running. Start Docker Desktop and try again."
fi
ok "Docker $(docker --version) is running"

# ── 2. Copy .env.example files if needed ──
step "Checking .env files..."
mkdir -p .state
[ -f .env.dev ] || cp .env.dev .env.dev 2>/dev/null || true  # already exists in repo
ok ".env.dev present (cross-service dev secrets)"

# Backend .env is composed via docker-compose; no top-level .env needed.

# ── 3. Build + start ──
step "Building + starting the stack..."
if [ "$SKIP_BUILD" -eq 1 ]; then
  docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
else
  docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
fi
ok "5 services scheduled to start (mongo, redis, auth-service, backend, gateway)"

# ── 4. Wait for HEALTHY ──
step "Waiting for all services to be healthy..."
HEALTH_TIMEOUT=300  # 5 minutes
ELAPSED=0
while [ $ELAPSED -lt $HEALTH_TIMEOUT ]; do
  HEALTHY=$(docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null \
    | python -c "
import json, sys
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('Health') == 'healthy':
            print('ok')
    except: pass
" 2>/dev/null | wc -l)
  TOTAL=$(docker compose -f docker-compose.dev.yml ps --format json 2>/dev/null \
    | python -c "
import json, sys
for line in sys.stdin:
    try:
        json.loads(line)
        print('x')
    except: pass
" 2>/dev/null | wc -l)
  if [ "$HEALTHY" -ge "4" ]; then  # 4 of 5 services have healthchecks; gateway doesn't
    ok "All services are healthy ($HEALTHY/$TOTAL)"
    break
  fi
  echo "  $HEALTHY/$TOTAL healthy (${ELAPSED}s / ${HEALTH_TIMEOUT}s)"
  sleep 5
  ELAPSED=$((ELAPSED+5))
done
if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
  warn "Some services did not become healthy in ${HEALTH_TIMEOUT}s"
  echo "  Run: docker compose -f docker-compose.dev.yml ps"
  echo "  And:  docker compose -f docker-compose.dev.yml logs --tail=100"
fi

# ── 5. Smoke test (optional) ──
if [ "$NO_SMOKE" -eq 0 ]; then
  step "Running smoke test..."
  if [ -x ./smoke-test.sh ]; then
    bash ./smoke-test.sh
  else
    warn "smoke-test.sh not executable; skipping"
  fi
fi

# ── Summary ──
echo
echo "═══════════════════════════════════════════"
echo "  Stack is up. Service URLs (local):"
echo "    Gateway:      http://localhost:10000"
echo "    Auth-service: http://localhost:4002"
echo "    Backend:      http://localhost:5001"
echo "    Mongo:        mongodb://localhost:27018"
echo "    Redis:        redis://localhost:6380"
echo
echo "  Next: cd nuqta-master && npm run web"
echo "  Or:   bash smoke-test.sh"
echo "  Stop: docker compose -f docker-compose.dev.yml down"
echo "═══════════════════════════════════════════"
