#!/bin/bash

# REZ Backend Production Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="rez-backend"
DOCKER_IMAGE="rez-backend"
VERSION=$(git describe --tags --always 2>/dev/null || echo "latest")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}REZ Backend Deployment Script${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo -e "${GREEN}========================================${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check if .env file exists
ENV_FILE=".env.${ENVIRONMENT}"
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}Error: Environment file ${ENV_FILE} not found${NC}"
    echo -e "${YELLOW}Please create ${ENV_FILE} with required environment variables${NC}"
    exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment variables from ${ENV_FILE}...${NC}"
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

# Pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t "${DOCKER_IMAGE}:${VERSION}" -t "${DOCKER_IMAGE}:latest" .

# Run database migrations (if applicable)
echo -e "${YELLOW}Running database migrations...${NC}"
# Add migration commands here if needed
# docker run --rm --env-file "$ENV_FILE" "${DOCKER_IMAGE}:${VERSION}" npm run migrate

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Start new containers
echo -e "${YELLOW}Starting new containers...${NC}"
VERSION=$VERSION docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Health check
echo -e "${YELLOW}Running health check...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_URL="http://localhost:5001/health"

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}Health check passed!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}Waiting for API to be ready... (attempt ${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 5
done

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    echo -e "${RED}Error: Health check failed after ${MAX_RETRIES} attempts${NC}"
    echo -e "${YELLOW}Rolling back to previous version...${NC}"
    docker-compose -f docker-compose.prod.yml down
    exit 1
fi

# Show container status
echo -e "${YELLOW}Container status:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo -e "${YELLOW}Recent logs:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20 api

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Cleanup old images
echo -e "${YELLOW}Cleaning up old Docker images...${NC}"
docker image prune -f

echo -e "${GREEN}Done!${NC}"
