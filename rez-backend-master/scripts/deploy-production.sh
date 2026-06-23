#!/bin/bash

# ===================================
# Production Deployment Script
# ===================================
# Safe deployment script with checks and rollback

set -e

# Configuration
NAMESPACE="production"
IMAGE_TAG="${1:-latest}"
IMAGE="rezapp/merchant-backend:$IMAGE_TAG"
DEPLOYMENT="merchant-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Confirm deployment
confirm_deployment() {
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}WARNING: You are about to deploy to PRODUCTION${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Namespace:   $NAMESPACE"
    echo "Deployment:  $DEPLOYMENT"
    echo "Image:       $IMAGE"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to proceed): " confirm

    if [ "$confirm" != "yes" ]; then
        log_error "Deployment cancelled"
        exit 0
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        log_error "Namespace '$NAMESPACE' not found"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if deployment exists
    if ! kubectl get deployment $DEPLOYMENT -n $NAMESPACE &> /dev/null; then
        log_error "Deployment '$DEPLOYMENT' not found in namespace '$NAMESPACE'"
        exit 1
    fi

    # Check current status
    current_replicas=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.availableReplicas}')
    if [ -z "$current_replicas" ] || [ "$current_replicas" -eq 0 ]; then
        log_warn "No replicas currently available"
    else
        log_success "Current available replicas: $current_replicas"
    fi

    # Verify image exists
    log_info "Verifying Docker image: $IMAGE"
    if ! docker pull $IMAGE &> /dev/null; then
        log_error "Cannot pull image: $IMAGE"
        log_error "Please verify the image exists and you have access"
        exit 1
    fi
    log_success "Image verified"

    log_success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log_info "Creating pre-deployment backup..."

    # Save current deployment
    kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o yaml > /tmp/deployment-backup-$(date +%s).yaml
    log_success "Deployment backup created"

    # Trigger database backup
    if [ -f "./scripts/backup.sh" ]; then
        log_info "Triggering database backup..."
        ./scripts/backup.sh || log_warn "Database backup failed (continuing anyway)"
    fi
}

# Deploy new version
deploy() {
    log_info "Starting deployment..."
    log_info "Updating image to: $IMAGE"

    # Record deployment
    kubectl annotate deployment $DEPLOYMENT -n $NAMESPACE \
        kubernetes.io/change-cause="Deploy $IMAGE at $(date)" \
        --overwrite

    # Update image
    kubectl set image deployment/$DEPLOYMENT \
        api=$IMAGE \
        -n $NAMESPACE

    log_success "Deployment initiated"
}

# Monitor rollout
monitor_rollout() {
    log_info "Monitoring rollout status..."

    if kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m; then
        log_success "Rollout completed successfully"
        return 0
    else
        log_error "Rollout failed or timed out"
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    # Check pod status
    ready_pods=$(kubectl get pods -n $NAMESPACE -l app=merchant-backend --field-selector=status.phase=Running --no-headers | wc -l)
    if [ "$ready_pods" -eq 0 ]; then
        log_error "No pods are running"
        return 1
    fi
    log_success "$ready_pods pods running"

    # Check health endpoint
    log_info "Checking health endpoint..."
    sleep 10  # Wait for pods to be ready

    SERVICE_IP=$(kubectl get svc merchant-backend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -z "$SERVICE_IP" ]; then
        SERVICE_IP=$(kubectl get svc merchant-backend-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    fi

    if [ -n "$SERVICE_IP" ]; then
        if curl -f -s "http://$SERVICE_IP/health" > /dev/null; then
            log_success "Health check passed"
        else
            log_warn "Health check failed (may need more time to start)"
        fi
    else
        log_warn "Could not get service IP for health check"
    fi

    # Check for errors in logs
    log_info "Checking logs for errors..."
    errors=$(kubectl logs deployment/$DEPLOYMENT -n $NAMESPACE --tail=50 | grep -i error | wc -l)
    if [ "$errors" -gt 0 ]; then
        log_warn "Found $errors error messages in recent logs"
    else
        log_success "No errors in recent logs"
    fi

    return 0
}

# Rollback on failure
rollback() {
    log_error "Deployment failed. Initiating rollback..."

    kubectl rollout undo deployment/$DEPLOYMENT -n $NAMESPACE

    log_info "Waiting for rollback to complete..."
    kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m

    log_warn "Rollback completed. System restored to previous version."
}

# Post-deployment
post_deployment() {
    log_info "Post-deployment tasks..."

    # Show current status
    echo ""
    echo "Current deployment status:"
    kubectl get deployment $DEPLOYMENT -n $NAMESPACE
    echo ""
    echo "Running pods:"
    kubectl get pods -n $NAMESPACE -l app=merchant-backend
    echo ""

    # Show recent events
    echo "Recent events:"
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
    echo ""

    log_success "Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor logs: kubectl logs -f deployment/$DEPLOYMENT -n $NAMESPACE"
    echo "2. Check metrics dashboard"
    echo "3. Test critical user flows"
    echo "4. Monitor error rates for next 30 minutes"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Production Deployment Script                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    confirm_deployment
    check_prerequisites
    pre_deployment_checks
    create_backup
    deploy

    if ! monitor_rollout; then
        rollback
        exit 1
    fi

    if ! verify_deployment; then
        log_warn "Verification failed, but deployment is running"
        log_warn "Please check logs and metrics carefully"
    fi

    post_deployment
}

# Handle errors
trap 'log_error "An error occurred. Deployment may be in inconsistent state."; exit 1' ERR

# Run main function
main "$@"
