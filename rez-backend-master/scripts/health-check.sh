#!/bin/bash

# ===================================
# Production Health Check Script
# ===================================
# Comprehensive health check for all services

set -e

# Configuration
API_URL="${API_URL:-https://api.rezapp.com}"
NAMESPACE="${NAMESPACE:-production}"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

log_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Production Health Check - $(date)       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check API endpoint
check_api_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}

    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$API_URL$endpoint" || echo "000")
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)

    if [ "$status" -eq "$expected_status" ]; then
        log_pass "API $endpoint: HTTP $status"
        return 0
    else
        log_fail "API $endpoint: Expected $expected_status, got $status"
        return 1
    fi
}

# Check Kubernetes resources
check_k8s_resource() {
    local resource=$1
    local name=$2

    if kubectl get $resource $name -n $NAMESPACE &>/dev/null; then
        log_pass "Kubernetes $resource '$name' exists"
        return 0
    else
        log_fail "Kubernetes $resource '$name' not found"
        return 1
    fi
}

# Main health checks
main() {
    log_header

    # Check prerequisites
    section "Prerequisites"
    if command_exists curl; then
        log_pass "curl is installed"
    else
        log_fail "curl not found (required for API checks)"
    fi

    if command_exists kubectl; then
        log_pass "kubectl is installed"
    else
        log_warn "kubectl not found (Kubernetes checks will be skipped)"
    fi

    # API Health Checks
    section "API Health Checks"
    check_api_endpoint "/health" 200

    # If API is up, check other endpoints
    if [ $? -eq 0 ]; then
        check_api_endpoint "/api/merchants/profile" 401  # Should require auth
        check_api_endpoint "/docs" 200  # Swagger docs
    fi

    # Kubernetes Checks
    if command_exists kubectl; then
        section "Kubernetes Resources"

        # Check deployment
        check_k8s_resource "deployment" "merchant-backend"

        # Check service
        check_k8s_resource "service" "merchant-backend-service"

        # Check HPA
        check_k8s_resource "hpa" "merchant-backend-hpa"

        # Check pods
        section "Pod Status"
        pod_count=$(kubectl get pods -n $NAMESPACE -l app=merchant-backend --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
        total_pods=$(kubectl get pods -n $NAMESPACE -l app=merchant-backend --no-headers 2>/dev/null | wc -l)

        if [ "$pod_count" -gt 0 ]; then
            log_pass "$pod_count/$total_pods pods running"
        else
            log_fail "No pods running ($total_pods total)"
        fi

        # Check for crash loops
        crashing=$(kubectl get pods -n $NAMESPACE -l app=merchant-backend --field-selector=status.phase=CrashLoopBackOff --no-headers 2>/dev/null | wc -l)
        if [ "$crashing" -eq 0 ]; then
            log_pass "No pods in CrashLoopBackOff"
        else
            log_fail "$crashing pods in CrashLoopBackOff"
        fi

        # Resource usage
        section "Resource Usage"
        if command_exists kubectl; then
            kubectl top pods -n $NAMESPACE -l app=merchant-backend 2>/dev/null | while read line; do
                log_info "$line"
            done
        fi

        # Recent events
        section "Recent Events"
        events=$(kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' --field-selector type=Warning 2>/dev/null | tail -5)
        if [ -z "$events" ]; then
            log_pass "No recent warning events"
        else
            log_warn "Recent warning events detected"
            echo "$events"
        fi
    fi

    # Summary
    section "Summary"
    echo ""
    echo -e "Passed:   ${GREEN}$PASSED${NC}"
    echo -e "Failed:   ${RED}$FAILED${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}━━━ All checks passed! ━━━${NC}"
        exit 0
    else
        echo -e "${RED}━━━ $FAILED checks failed ━━━${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
