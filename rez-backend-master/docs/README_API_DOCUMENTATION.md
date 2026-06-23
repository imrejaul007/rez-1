# REZ Merchant API Documentation - README

## Quick Access

### 🚀 Start Here
- **Swagger UI**: http://localhost:5001/api-docs
- **API Quick Start**: [API_QUICK_START.md](./API_QUICK_START.md)
- **Main Documentation**: [WEEK8_PHASE6A_API_DOCUMENTATION.md](./WEEK8_PHASE6A_API_DOCUMENTATION.md)

### 📚 Documentation Index

1. **[API Quick Start Guide](./API_QUICK_START.md)**
   - Get started in 5 minutes
   - Basic authentication
   - Common operations
   - Postman setup

2. **[Complete API Documentation](./WEEK8_PHASE6A_API_DOCUMENTATION.md)**
   - All 120+ endpoints
   - Request/response schemas
   - Error handling
   - Security details

3. **[API Versioning Guide](./API_VERSIONING_GUIDE.md)**
   - Version strategy
   - Deprecation policy
   - Migration guides
   - Changelog

4. **[Webhook Documentation](./WEBHOOK_DOCUMENTATION.md)**
   - Event types
   - Security
   - Implementation examples
   - Testing guide

5. **[Completion Report](./PHASE6A_COMPLETION_REPORT.md)**
   - Implementation summary
   - Statistics
   - Testing results
   - Next steps

### 💻 Code Examples

- **[JavaScript Examples](./api-examples/javascript.md)**
  - Fetch API examples
  - Axios client class
  - Error handling
  - Complete workflows

- **[cURL Examples](./api-examples/curl.md)**
  - All endpoints
  - Authentication
  - Bulk operations
  - Tips and tricks

## Getting Started

### 1. Install Dependencies

```bash
cd "C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend"
npm install
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Open Swagger UI

Navigate to: http://localhost:5001/api-docs

### 4. Test an Endpoint

1. Click on "Authentication" section
2. Click "POST /api/merchant/auth/register"
3. Click "Try it out"
4. Fill in the example request
5. Click "Execute"
6. View the response

## API Overview

### Endpoints by Category

| Category | Endpoints | Status |
|----------|-----------|--------|
| Authentication | 8 | ✅ Documented |
| Onboarding | 16 | ✅ Documented |
| Products | 25+ | ✅ Documented |
| Orders | 15 | ✅ Documented |
| Team Management | 12 | ✅ Documented |
| Analytics | 17 | ✅ Documented |
| Audit Logs | 17 | ✅ Documented |
| Dashboard | 8 | ✅ Documented |
| Categories | 7 | ✅ Documented |
| Uploads | 6 | ✅ Documented |
| Cashback | 5 | ✅ Documented |
| Sync | 8 | ✅ Documented |
| Reviews | 6 | ✅ Documented |
| Bulk Operations | 5 | ✅ Documented |
| Product Variants | 8 | ✅ Documented |

**Total**: 120+ endpoints fully documented

### Authentication

All endpoints (except authentication routes) require a Bearer token:

```bash
Authorization: Bearer <your-jwt-token>
```

Get your token by:
1. Registering: `POST /api/merchant/auth/register`
2. Or logging in: `POST /api/merchant/auth/login`

### Base URL

**Development**: `http://localhost:5001`
**Staging**: `https://staging-api.rezapp.com`
**Production**: `https://api.rezapp.com`

## Quick Examples

### Register a Merchant

```bash
curl -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Store",
    "ownerName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "+1234567890",
    "businessAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }'
```

### Create a Product

```bash
curl -X POST http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "price": 29.99,
    "inventory": 100,
    "category": "General"
  }'
```

### Get Analytics

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Postman Collection

### Generate Collection

```bash
npm install -g openapi-to-postmanv2
openapi2postmanv2 -s http://localhost:5001/api-docs.json -o postman-collection.json
```

### Import to Postman

1. Open Postman
2. Click "Import"
3. Select `postman-collection.json`
4. Set up environment with `baseUrl` and `token` variables

## Documentation Structure

```
docs/
├── README_API_DOCUMENTATION.md         (This file)
├── WEEK8_PHASE6A_API_DOCUMENTATION.md (Complete documentation)
├── API_QUICK_START.md                  (Getting started)
├── API_VERSIONING_GUIDE.md             (Versioning strategy)
├── WEBHOOK_DOCUMENTATION.md            (Webhook events)
├── PHASE6A_COMPLETION_REPORT.md        (Implementation report)
└── api-examples/
    ├── javascript.md                   (JavaScript examples)
    └── curl.md                         (cURL examples)
```

## Support

### Resources
- **Swagger UI**: http://localhost:5001/api-docs
- **API Info**: http://localhost:5001/api-info
- **Health Check**: http://localhost:5001/health

### Contact
- **Email**: support@rezapp.com
- **Documentation**: https://docs.rezapp.com
- **Issues**: https://github.com/rezapp/api/issues

## Next Steps

1. ✅ **Completed**: API Documentation (Phase 6A)
2. 🔄 **Next**: Merchant Mobile App (Phase 6B)
3. 📅 **Upcoming**: Advanced Analytics Dashboard (Phase 6C)
4. 📅 **Upcoming**: Automated Testing Suite (Phase 6D)
5. 📅 **Future**: Webhook System (Phase 7)

## Version Information

- **API Version**: 1.0.0
- **OpenAPI Specification**: 3.0.0
- **Documentation Version**: 1.0.0
- **Last Updated**: 2025-01-17

## License

MIT License - See LICENSE file for details

---

**Generated by Agent 1 - Phase 6A**
**Status**: ✅ COMPLETE
