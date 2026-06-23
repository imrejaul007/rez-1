#!/bin/bash

# REZ Backend Health Check Script
# Usage: ./scripts/healthcheck.sh [host] [port]

HOST=${1:-localhost}
PORT=${2:-5001}
HEALTH_URL="http://${HOST}:${PORT}/health"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Checking health at: ${HEALTH_URL}${NC}"

# Make request and capture response
RESPONSE=$(curl -sf "$HEALTH_URL" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "${GREEN}API is healthy!${NC}"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    exit 0
else
    echo -e "${RED}API health check failed!${NC}"
    echo "Error: $RESPONSE"
    exit 1
fi
