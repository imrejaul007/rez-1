# REZ Backend API

Production backend for the REZ mobile and web applications. Node.js/Express with MongoDB persistence.

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB 5.0+
- Redis (optional, for caching)

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your secrets and credentials
   ```

3. **Initialize database:**
   ```bash
   npm run db:indexes
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:5000/api` (PORT configurable via .env)

## API Response Format

All endpoints return standardized JSON responses:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Human-readable message",
  "meta": {
    "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 },
    "timestamp": "2026-03-23T12:34:56.789Z"
  }
}
```

Error responses include a `success: false` flag and optional `errors` array with field-level details.

**Response Helpers:** Use standardized helpers from `src/utils/response.ts`:
- `sendSuccess(res, data, message, statusCode, meta)` — 200/201 responses
- `sendError(res, message, statusCode, errors)` — error responses
- `sendPaginated(res, data, page, limit, total, message)` — paginated lists
- `sendCreated(res, data, message)` — 201 Created
- `sendNotFound(res, message)` — 404 Not Found
- `sendValidationError(res, errors, message)` — 400 with field errors

## Project Structure

```
src/
├── controllers/          # Request handlers
├── models/              # Mongoose schemas
├── routes/              # Express route definitions
├── services/            # Business logic
├── middleware/          # Auth, validation, rate limiting
├── utils/               # Helpers (response, auth, sanitization, etc.)
├── jobs/                # Background job handlers (cashback, notifications)
├── config/              # Logger, database, constants
├── merchants*/          # Merchant-facing features
└── server.ts            # Express app & server entry point
```

## Core Features

- **User Management** — Registration, authentication, JWT tokens
- **Wallet & Cashback** — Ledger-based accounting, reward distribution
- **Orders & Commerce** — Product catalog, cart, checkout, refunds
- **Payments** — Razorpay & Stripe integration with webhooks
- **Notifications** — Push (Firebase), SMS (Twilio), Email (SendGrid)
- **Merchant Platform** — Onboarding, settlements, ROI analytics
- **Audit & Compliance** — Event logging, fraud detection, ledger reconciliation

## Development

### Run Tests
```bash
npm run test              # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:unit        # Services only
npm run test:integration # Routes/API only
npm run test:e2e         # End-to-end flows
```

### Seed Database
```bash
npm run seed:all         # All seed scripts
npm run seed:categories  # Product categories
npm run seed:orders      # Sample orders
npm run seed:cashback    # Cashback rules
```

### Database Indexes
```bash
npm run db:indexes       # Ensure all indexes exist
npm run indexes:sync     # Sync indexes with schema
```

## Environment Variables

See `.env.example` for complete configuration. Key variables:

- `NODE_ENV` — development/staging/production
- `PORT` — API server port (default: 5000)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — Token signing keys
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Payment gateway
- `SENDGRID_API_KEY` — Email service
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — SMS service
- `SENTRY_DSN` — Error tracking

## Known TODOs & Technical Debt

See CHANGELOG.md for tracked issues. Key outstanding items:

- **Job Queue Infrastructure:** Replace synchronous queue with dedicated worker pool (Bee-Queue or Bull)
- **Ledger Audit Gaps:** Implement balance reconciliation and exchange rate validation
- **Voucher Integration:** Connect to real voucher provider API
- **Notification Service:** Wire push/SMS delivery confirmation
- **Merchant Upload Processing:** Move Sharp image processing to async job queue

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Health Checks
- `GET /api/health` — Service status
- `GET /api/metrics` — Prometheus metrics (port 9090)

### Monitoring
- **Error Tracking:** Sentry (configured via SENTRY_DSN)
- **Performance APM:** New Relic (NEW_RELIC_LICENSE_KEY)
- **Metrics:** Prometheus (PROMETHEUS_ENABLED=true)

## Contract & Regression Safety

**API Contract Rules:**
1. All endpoints use standardized response shape (see above)
2. Pagination always includes `meta.pagination` object
3. Timestamps are ISO 8601 format in UTC
4. Error field names match request body field names
5. Deprecated endpoints removed in next major version

**Testing Before Release:**
- Run full test suite: `npm run test`
- Verify no unhandled TODOs in production code
- Check response shapes match frontend expectations
- Load test critical paths (payment, checkout)

## Support & Contributing

- Report bugs in GitHub Issues
- Regression tests: `src/__tests__/` (jest)
- Code style: ESLint + Prettier (run `npm run lint`)

---

**Version:** 1.0.0
**Last Updated:** 2026-03-23
**Maintainer:** Release Engineering (Priya Menon)
