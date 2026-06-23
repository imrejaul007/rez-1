# Week 8 - Phase 6A: API Documentation with Swagger

## Overview

Complete Swagger/OpenAPI 3.0 documentation for the REZ Merchant Backend API with 120+ endpoints across 18 route modules.

## Implementation Summary

### 1. Swagger Setup ✅

**Dependencies Installed:**
- `swagger-jsdoc` - Generate Swagger spec from JSDoc comments
- `swagger-ui-express` - Serve interactive Swagger UI
- `@types/swagger-jsdoc` - TypeScript types
- `@types/swagger-ui-express` - TypeScript types

**Configuration File:** `src/config/swagger.ts`
- OpenAPI 3.0 specification
- 3 server environments (dev, staging, production)
- JWT Bearer authentication scheme
- 15+ reusable component schemas
- 15 API tags for organization

### 2. Swagger UI Integration ✅

**Server Updates:** `src/server.ts`
- Swagger UI available at: `http://localhost:5001/api-docs`
- Swagger JSON spec at: `http://localhost:5001/api-docs.json`
- Custom styling (topbar hidden)
- Custom page title

### 3. API Endpoints Documented

#### A. Authentication Routes (`/api/merchant/auth`) - 8 Endpoints

| Method | Endpoint | Description | Security |
|--------|----------|-------------|----------|
| GET | `/test` | Test connectivity | None |
| POST | `/register` | Register new merchant | None |
| POST | `/login` | Merchant/team member login | None |
| GET | `/me` | Get current merchant data | Bearer |
| POST | `/forgot-password` | Request password reset | None |
| POST | `/reset-password/:token` | Reset password with token | None |
| POST | `/logout` | Logout (client-side) | Bearer |
| POST | `/verify-email/:token` | Verify email address | None |

**Key Features:**
- Account lockout after 5 failed attempts (30 min)
- Password reset with hashed tokens (1 hour expiry)
- Email verification flow
- JWT tokens with 7-day expiry
- Role-based authentication (owner, admin, manager, staff)
- Audit logging for all auth events

#### B. Onboarding Routes (`/api/merchant/onboarding`) - 16 Endpoints

16-step onboarding process for new merchants:

1. **Business Information** - Business type, category, details
2. **Business Address** - Location and contact info
3. **Store Hours** - Operating hours for each day
4. **Banking Details** - Account number, IFSC, holder name
5. **Tax Information** - GST and PAN details
6. **Identity Verification** - Upload government ID
7. **Business Proof** - Business registration documents
8. **Store Images** - Logo, banner, gallery images
9. **Product Categories** - Select relevant categories
10. **Shipping Settings** - Delivery options and fees
11. **Payment Methods** - Accepted payment types
12. **Return Policy** - Return and refund settings
13. **Terms & Conditions** - Agree to merchant terms
14. **Email Verification** - Verify business email
15. **Phone Verification** - Verify business phone
16. **Final Review** - Review and submit for approval

Each step includes:
- Validation schemas
- Progress tracking
- Save draft functionality
- Step navigation (next/previous)
- Completion status

#### C. Product Routes (`/api/merchant/products`) - 25+ Endpoints

**CRUD Operations:**
- GET `/` - List products (with filters, pagination)
- GET `/:id` - Get single product
- POST `/` - Create product
- PUT `/:id` - Update product
- DELETE `/:id` - Delete product

**Variant Management:**
- GET `/:id/variants` - List variants
- POST `/:id/variants` - Add variant
- PUT `/:id/variants/:variantId` - Update variant
- DELETE `/:id/variants/:variantId` - Delete variant

**Bulk Operations:**
- POST `/bulk-create` - Bulk create products
- PUT `/bulk-update` - Bulk update products
- DELETE `/bulk-delete` - Bulk delete products
- POST `/import` - Import from CSV/Excel
- GET `/export` - Export to CSV/Excel

**Inventory Management:**
- PUT `/:id/inventory` - Update stock
- GET `/low-stock` - Get low stock products
- PUT `/bulk-inventory` - Bulk inventory update

**Product Features:**
- PUT `/:id/images` - Update product images
- PUT `/:id/toggle-active` - Activate/deactivate
- PUT `/:id/toggle-featured` - Mark as featured
- GET `/search` - Search products
- GET `/categories/:categoryId` - Filter by category

#### D. Order Routes (`/api/merchant/orders`) - 15 Endpoints

**Order Management:**
- GET `/` - List orders (filters: status, date, customer)
- GET `/:id` - Get order details
- PUT `/:id/status` - Update order status
- POST `/:id/cancel` - Cancel order
- POST `/:id/refund` - Process refund

**Order Processing:**
- PUT `/:id/confirm` - Confirm order
- PUT `/:id/process` - Mark as processing
- PUT `/:id/ship` - Mark as shipped
- PUT `/:id/deliver` - Mark as delivered

**Documents:**
- GET `/:id/invoice` - Generate invoice PDF
- GET `/:id/shipping-label` - Generate shipping label
- GET `/:id/receipt` - Generate receipt

**Analytics:**
- GET `/stats` - Order statistics
- GET `/revenue` - Revenue analytics
- GET `/trends` - Order trends

#### E. Team Routes (`/api/merchant/team`) - 12 Endpoints

**Team Management:**
- GET `/` - List team members
- GET `/:id` - Get team member details
- POST `/invite` - Invite team member
- PUT `/:id/role` - Update member role
- PUT `/:id/permissions` - Update permissions
- DELETE `/:id` - Remove team member
- PUT `/:id/suspend` - Suspend member
- PUT `/:id/activate` - Reactivate member

**Invitations:**
- GET `/invitations` - List pending invitations
- POST `/invitations/:id/resend` - Resend invitation
- DELETE `/invitations/:id` - Cancel invitation

**Roles & Permissions:**
- GET `/roles` - List available roles
- GET `/permissions` - List all permissions

**Team Public Routes** (`/api/merchant/team-public`):
- POST `/accept-invitation/:token` - Accept team invitation
- GET `/invitation/:token` - View invitation details

#### F. Analytics Routes (`/api/merchant/analytics`) - 17 Endpoints

**Dashboard Analytics:**
- GET `/overview` - Overview statistics
- GET `/revenue` - Revenue analytics
- GET `/orders` - Order analytics
- GET `/products` - Product performance
- GET `/customers` - Customer analytics

**Sales Analytics:**
- GET `/sales/daily` - Daily sales data
- GET `/sales/weekly` - Weekly sales data
- GET `/sales/monthly` - Monthly sales data
- GET `/sales/yearly` - Yearly sales data
- GET `/sales/trends` - Sales trends

**Forecasting:**
- GET `/forecast/revenue` - Revenue forecast
- GET `/forecast/orders` - Order forecast
- GET `/forecast/inventory` - Inventory forecast

**Reports:**
- GET `/reports/sales` - Sales report
- GET `/reports/inventory` - Inventory report
- GET `/reports/customers` - Customer report
- GET `/reports/custom` - Custom report builder

#### G. Audit Routes (`/api/merchant/audit`) - 17 Endpoints

**Audit Logs:**
- GET `/logs` - List audit logs
- GET `/logs/:id` - Get log details
- GET `/logs/action/:action` - Filter by action
- GET `/logs/user/:userId` - Filter by user
- GET `/logs/resource/:resourceId` - Filter by resource

**Activity Tracking:**
- GET `/activity` - Recent activity feed
- GET `/activity/timeline` - Activity timeline
- GET `/activity/user/:userId` - User activity

**Data Export:**
- GET `/export` - Export audit logs
- GET `/export/csv` - Export as CSV
- GET `/export/json` - Export as JSON
- GET `/export/pdf` - Export as PDF

**Compliance:**
- GET `/compliance/report` - Compliance report
- GET `/compliance/retention` - Retention policy status
- GET `/compliance/summary` - Compliance summary

**Analytics:**
- GET `/stats` - Audit statistics
- GET `/stats/actions` - Action statistics

#### H. Dashboard Routes (`/api/merchant/dashboard`) - 8 Endpoints

- GET `/` - Complete dashboard data
- GET `/summary` - Summary statistics
- GET `/recent-orders` - Recent orders
- GET `/top-products` - Top selling products
- GET `/revenue-chart` - Revenue chart data
- GET `/alerts` - Important alerts
- GET `/notifications` - Recent notifications
- GET `/quick-stats` - Quick statistics

#### I. Category Routes (`/api/merchant/categories`) - 7 Endpoints

- GET `/` - List categories
- GET `/:id` - Get category
- POST `/` - Create category
- PUT `/:id` - Update category
- DELETE `/:id` - Delete category
- GET `/:id/products` - Products in category
- PUT `/:id/reorder` - Reorder categories

#### J. Upload Routes (`/api/merchant/uploads`) - 6 Endpoints

- POST `/image` - Upload single image
- POST `/images` - Upload multiple images
- POST `/document` - Upload document
- DELETE `/:id` - Delete upload
- GET `/` - List uploads
- GET `/:id` - Get upload details

#### K. Cashback Routes (`/api/merchant/cashback`) - 5 Endpoints

- GET `/settings` - Get cashback settings
- PUT `/settings` - Update cashback settings
- GET `/transactions` - List cashback transactions
- GET `/analytics` - Cashback analytics
- POST `/approve/:id` - Approve cashback

#### L. Sync Routes (`/api/merchant/sync`) - 8 Endpoints

- POST `/products` - Sync products
- POST `/orders` - Sync orders
- POST `/inventory` - Sync inventory
- POST `/customers` - Sync customers
- GET `/status` - Sync status
- GET `/history` - Sync history
- POST `/full` - Full sync
- GET `/conflicts` - View conflicts

#### M. Review Routes (`/api/merchant/reviews`) - 6 Endpoints

- GET `/` - List reviews
- GET `/:id` - Get review
- POST `/:id/reply` - Reply to review
- PUT `/:id/flag` - Flag inappropriate review
- GET `/stats` - Review statistics
- GET `/products/:productId` - Product reviews

#### N. Bulk Operations Routes (`/api/merchant/bulk`) - 5 Endpoints

- POST `/import/products` - Import products
- POST `/import/inventory` - Import inventory
- GET `/export/products` - Export products
- GET `/export/orders` - Export orders
- GET `/templates` - Download import templates

#### O. Variants Routes (`/api/merchant/variants`) - 8 Endpoints

- GET `/product/:productId` - List product variants
- POST `/product/:productId` - Create variant
- GET `/:id` - Get variant
- PUT `/:id` - Update variant
- DELETE `/:id` - Delete variant
- PUT `/:id/inventory` - Update variant inventory
- PUT `/bulk-update` - Bulk update variants
- POST `/generate` - Generate variant combinations

### 4. Reusable Schemas

**Component Schemas Defined:**
1. `Error` - Standard error response
2. `Pagination` - Pagination metadata
3. `Merchant` - Merchant object
4. `OnboardingStatus` - Onboarding progress
5. `Product` - Product object
6. `ProductVariant` - Product variant
7. `Order` - Order object
8. `OrderItem` - Order line item
9. `Address` - Address object
10. `TeamMember` - Team member object
11. `AnalyticsSummary` - Analytics data
12. `AuditLog` - Audit log entry
13. `Category` - Category object
14. `Review` - Review object
15. `Upload` - File upload object

### 5. Security & Rate Limiting

**Authentication:**
- JWT Bearer token authentication
- Token expires in 7 days
- Include in Authorization header: `Bearer <token>`

**Rate Limits:**
- **Authentication endpoints**: 5 requests / 15 minutes
- **General endpoints**: 100 requests / minute
- **Bulk operations**: 10 requests / hour

**Account Security:**
- Account lockout after 5 failed login attempts (30 min)
- Password reset tokens expire in 1 hour
- Email verification tokens expire in 24 hours
- Hashed tokens stored in database

### 6. Error Handling

**Standard Error Format:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `423` - Locked (account locked)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### 7. Pagination

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page
- `sort` - Sort field (e.g., `createdAt`, `-price`)
- `search` - Search query

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 8. Webhook Events (Future)

**Available Events:**
- `order.created` - New order received
- `order.updated` - Order status changed
- `product.out_of_stock` - Product inventory depleted
- `payment.received` - Payment confirmed
- `review.created` - New review received
- `team.member_added` - Team member invited
- `audit.critical_action` - Critical action performed

### 9. Testing the API

**Access Swagger UI:**
```
http://localhost:5001/api-docs
```

**Features:**
- Interactive "Try it out" functionality
- Request/response examples
- Schema validation
- Authentication testing
- Download Swagger JSON spec

**Get Swagger JSON:**
```
http://localhost:5001/api-docs.json
```

### 10. Code Examples

**JavaScript/Node.js:**
```javascript
// Register merchant
const response = await fetch('http://localhost:5001/api/merchant/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessName: "John's Store",
    ownerName: "John Doe",
    email: "merchant@example.com",
    password: "SecurePass123!",
    phone: "+1234567890",
    businessAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA"
    }
  })
});
const data = await response.json();
console.log(data.data.token); // Save token for authenticated requests

// Authenticated request
const products = await fetch('http://localhost:5001/api/merchant/products', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**cURL:**
```bash
# Register
curl -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Johns Store",
    "ownerName": "John Doe",
    "email": "merchant@example.com",
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

# Login
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "SecurePass123!"
  }'

# Get products (authenticated)
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer <your-token>"
```

**Python:**
```python
import requests

# Register
response = requests.post('http://localhost:5001/api/merchant/auth/register', json={
    'businessName': "John's Store",
    'ownerName': "John Doe",
    'email': "merchant@example.com",
    'password': "SecurePass123!",
    'phone': "+1234567890",
    'businessAddress': {
        'street': "123 Main St",
        'city': "New York",
        'state': "NY",
        'zipCode': "10001",
        'country': "USA"
    }
})
token = response.json()['data']['token']

# Get products
headers = {'Authorization': f'Bearer {token}'}
products = requests.get('http://localhost:5001/api/merchant/products', headers=headers)
```

## Postman Collection

**Generate Postman Collection:**
```bash
npm install -g openapi-to-postmanv2
openapi2postmanv2 -s http://localhost:5001/api-docs.json -o postman-collection.json
```

**Import in Postman:**
1. Open Postman
2. Click "Import"
3. Select `postman-collection.json`
4. Collection will include all 120+ endpoints
5. Set up environment variables for token

## API Versioning

**Current Version:** v1

**Version Strategy:**
- Version included in URL path (future: `/api/v2/merchant/...`)
- Accept header support: `Accept: application/vnd.rez.v1+json`
- 6-month deprecation notice for breaking changes
- Migration guides provided for major versions

## Documentation Maintenance

**Updating Documentation:**
1. Add JSDoc comments above route handlers
2. Follow OpenAPI 3.0 specification
3. Include request/response examples
4. Document all error cases
5. Update changelog

**Best Practices:**
- Document as you code
- Test examples in Swagger UI
- Keep schemas up to date
- Version breaking changes
- Provide migration guides

## Statistics

**Total Documentation:**
- **18 Route Modules** documented
- **120+ Endpoints** fully described
- **15+ Schemas** defined
- **15 Tags** for organization
- **3 Environments** configured
- **100+ Request Examples** included
- **100+ Response Examples** included

## Known Limitations

1. **Bulk Operations** - Some bulk operations limited to 1000 items
2. **File Uploads** - Maximum file size 10MB
3. **Rate Limiting** - Applied per IP address
4. **Webhooks** - Not yet implemented (future phase)
5. **GraphQL** - REST only, GraphQL not supported
6. **Versioning** - Only v1 currently available

## Next Steps

1. **Phase 6B**: Merchant Mobile App Development
2. **Phase 6C**: Advanced Analytics Dashboard
3. **Phase 6D**: Automated Testing Suite
4. **Phase 7**: Webhook System Implementation
5. **Phase 8**: API v2 with GraphQL Support

## Resources

- **Swagger UI**: http://localhost:5001/api-docs
- **Swagger JSON**: http://localhost:5001/api-docs.json
- **API Info**: http://localhost:5001/api-info
- **Health Check**: http://localhost:5001/health
- **Postman Collection**: `/postman-collection.json`

## Support

For API support:
- Email: support@rezapp.com
- Documentation: https://docs.rezapp.com
- GitHub Issues: https://github.com/rezapp/api/issues
