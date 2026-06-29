# REZ API Gateway

Central routing service that proxies and secures all incoming API traffic to backend microservices.

## Purpose

The API Gateway is the single entry point for all client requests. It handles:
- Request routing to appropriate microservices
- Rate limiting per client IP
- JWT validation on protected routes
- CORS headers and security headers (CSP, HSTS)
- Load balancing across service instances

## Environment Variables

```env
# Core Service URLs
MONOLITH_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Microservice URLs
AUTH_SERVICE_URL=http://localhost:3002
CATALOG_SERVICE_URL=http://localhost:3003
GAMIFICATION_SERVICE_URL=http://localhost:3004
ANALYTICS_SERVICE_URL=http://localhost:3009
WALLET_SERVICE_URL=http://localhost:3011
PAYMENT_SERVICE_URL=http://localhost:3005
ORDER_SERVICE_URL=http://localhost:3006
SEARCH_SERVICE_URL=http://localhost:3007
MARKETING_SERVICE_URL=http://localhost:3013
MEDIA_SERVICE_URL=http://localhost:3008
NOTIFICATION_SERVICE_URL=http://localhost:3012
MERCHANT_SERVICE_URL=http://localhost:3020
FINANCE_SERVICE_URL=http://localhost:3010
ADS_SERVICE_URL=http://localhost:3014
KARMA_SERVICE_URL=http://localhost:3021

# Logging
NODE_ENV=development
```

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /healthz | Liveness probe |
| GET | /ready | Readiness probe |
| * | /api/auth/* | Route to auth service |
| * | /api/wallet/* | Route to wallet service |
| * | /api/payment/* | Route to payment service |
| * | /api/order/* | Route to order service |
| * | /api/merchant/* | Route to merchant service |
| * | /api/catalog/* | Route to catalog service |
| * | /api/search/* | Route to search service |

## Architecture

```
Client Request
      │
      ▼
┌─────────────┐
│  API GW     │ ─── Rate Limiter
└─────────────┘ ─── JWT Validator
      │              │
      ▼              ▼
┌─────────────────────────────────────┐
│     Microservices Mesh              │
├─────────────────────────────────────┤
│ Auth │ Wallet │ Payment │ Order    │
│ Catalog │ Search │ Marketing │ Ads │
└─────────────────────────────────────┘
```

## Deployment

### Render.com
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Configure environment variables in Render dashboard

### Docker
```bash
docker build -t rez-api-gateway .
docker run -p 5002:5002 --env-file .env.local rez-api-gateway
```

## Health Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /health | Basic health check |
| GET /healthz | Liveness probe (for K8s) |
| GET /ready | Readiness probe (for K8s) |

## License

MIT
