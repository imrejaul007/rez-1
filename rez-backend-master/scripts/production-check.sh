#!/bin/bash

# REZ Backend Production Readiness Check
# Usage: ./scripts/production-check.sh
# Run this before production deployment to verify all requirements

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

header "REZ Backend Production Readiness Check"

# ======================
# 1. Environment Check
# ======================
header "1. Environment Configuration"

# Check NODE_ENV
if [[ "$NODE_ENV" == "production" ]]; then
    pass "NODE_ENV is set to production"
else
    warn "NODE_ENV is '${NODE_ENV:-not set}' (should be 'production')"
fi

# Required environment variables
REQUIRED_VARS=(
    "MONGODB_URI"
    "JWT_SECRET"
    "JWT_MERCHANT_SECRET"
    "PORT"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        # Check for weak secrets
        if [[ "$var" == *"SECRET"* ]] && [[ ${#!var} -lt 32 ]]; then
            warn "$var is set but appears weak (< 32 chars)"
        else
            pass "$var is configured"
        fi
    else
        fail "$var is not set"
    fi
done

# Payment configuration
PAYMENT_VARS=(
    "STRIPE_SECRET_KEY"
    "RAZORPAY_KEY_ID"
    "RAZORPAY_KEY_SECRET"
)

for var in "${PAYMENT_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        if [[ "${!var}" == *"test"* ]] || [[ "${!var}" == *"sk_test"* ]]; then
            warn "$var appears to be a test key"
        else
            pass "$var is configured (production key)"
        fi
    else
        warn "$var is not set (required for payments)"
    fi
done

# ======================
# 2. Security Check
# ======================
header "2. Security Configuration"

# Check SSL certificates
if [[ -f "nginx/ssl/fullchain.pem" ]] && [[ -f "nginx/ssl/privkey.pem" ]]; then
    pass "SSL certificates found"
else
    warn "SSL certificates not found in nginx/ssl/"
fi

# Check nginx security headers
if [[ -f "nginx/nginx.conf" ]]; then
    if grep -q "X-Frame-Options" nginx/nginx.conf && \
       grep -q "X-Content-Type-Options" nginx/nginx.conf && \
       grep -q "Strict-Transport-Security" nginx/nginx.conf; then
        pass "Security headers configured in nginx"
    else
        warn "Some security headers missing in nginx.conf"
    fi
fi

# Check rate limiting
if grep -q "limit_req_zone" nginx/nginx.conf 2>/dev/null; then
    pass "Rate limiting configured in nginx"
else
    warn "Rate limiting not found in nginx"
fi

# ======================
# 3. Build Check
# ======================
header "3. Build & Dependencies"

# Check TypeScript compilation
if [[ -d "dist" ]]; then
    pass "TypeScript compiled (dist/ exists)"

    # Check if dist is up to date
    SRC_LATEST=$(find src -name "*.ts" -newer dist/server.js 2>/dev/null | head -1)
    if [[ -n "$SRC_LATEST" ]]; then
        warn "Source files newer than build - rebuild recommended"
    else
        pass "Build appears up to date"
    fi
else
    fail "dist/ directory not found - run 'npm run build'"
fi

# Check node_modules
if [[ -d "node_modules" ]]; then
    pass "Dependencies installed"
else
    fail "node_modules not found - run 'npm install'"
fi

# Check for vulnerabilities
if command -v npm &> /dev/null; then
    CRITICAL=$(npm audit --json 2>/dev/null | grep -o '"critical":[0-9]*' | cut -d: -f2 || echo "0")
    if [[ "$CRITICAL" -gt 0 ]]; then
        fail "Found $CRITICAL critical npm vulnerabilities"
    else
        pass "No critical npm vulnerabilities"
    fi
fi

# ======================
# 4. Docker Check
# ======================
header "4. Docker Configuration"

if [[ -f "Dockerfile" ]]; then
    pass "Dockerfile exists"
else
    fail "Dockerfile not found"
fi

if [[ -f "docker-compose.prod.yml" ]]; then
    pass "Production docker-compose exists"
else
    fail "docker-compose.prod.yml not found"
fi

if [[ -f ".dockerignore" ]]; then
    pass ".dockerignore exists"
else
    warn ".dockerignore not found"
fi

# ======================
# 5. Database Check
# ======================
header "5. Database Configuration"

if [[ -n "$MONGODB_URI" ]]; then
    # Check if it's a cloud/production URI
    if [[ "$MONGODB_URI" == *"mongodb+srv"* ]] || \
       [[ "$MONGODB_URI" == *"atlas"* ]] || \
       [[ "$MONGODB_URI" == *"cluster"* ]]; then
        pass "Using cloud/cluster MongoDB URI"
    elif [[ "$MONGODB_URI" == *"localhost"* ]] || [[ "$MONGODB_URI" == *"127.0.0.1"* ]]; then
        warn "MONGODB_URI points to localhost (use production database)"
    fi
fi

# Check Redis
if [[ -n "$REDIS_URL" ]]; then
    pass "Redis URL is configured"
else
    warn "REDIS_URL not set (caching disabled)"
fi

# ======================
# 6. Monitoring Check
# ======================
header "6. Monitoring & Logging"

# Check Sentry
if [[ -n "$SENTRY_DSN" ]]; then
    pass "Sentry DSN configured"
else
    warn "SENTRY_DSN not set (error tracking disabled)"
fi

# Check logging configuration
if [[ -d "logs" ]] || [[ -n "$LOG_LEVEL" ]]; then
    pass "Logging appears configured"
else
    warn "Logging directory or LOG_LEVEL not found"
fi

# Check metrics endpoint
if grep -q "metricsEndpoint" src/server.ts 2>/dev/null || \
   grep -q "/metrics" src/server.ts 2>/dev/null; then
    pass "Metrics endpoint configured"
else
    warn "Metrics endpoint not found"
fi

# ======================
# 7. Health Check
# ======================
header "7. Health Endpoint"

if grep -q "'/health'" src/server.ts 2>/dev/null || \
   grep -q '"/health"' src/server.ts 2>/dev/null; then
    pass "Health check endpoint exists"
else
    warn "Health check endpoint not found"
fi

# ======================
# Summary
# ======================
header "Production Readiness Summary"

echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}PRODUCTION NOT READY${NC}"
    echo -e "Fix $FAILED critical issue(s) before deploying"
    exit 1
elif [[ $WARNINGS -gt 5 ]]; then
    echo -e "${YELLOW}PRODUCTION READY WITH CAUTION${NC}"
    echo -e "Consider addressing $WARNINGS warning(s)"
    exit 0
else
    echo -e "${GREEN}PRODUCTION READY${NC}"
    exit 0
fi
