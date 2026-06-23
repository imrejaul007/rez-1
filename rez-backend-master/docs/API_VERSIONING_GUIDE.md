# API Versioning Guide

## Overview

The REZ Merchant API uses semantic versioning to ensure backward compatibility and smooth transitions during updates.

## Current Version

**Version:** 1.0.0 (v1)
**Release Date:** 2025-01-17
**Status:** Stable

## Versioning Strategy

### 1. URL Path Versioning (Future)

Future versions will use URL path versioning:
```
https://api.rezapp.com/api/v1/merchant/products
https://api.rezapp.com/api/v2/merchant/products
```

**Current Implementation:**
- v1 is the default and only version
- No version prefix required: `/api/merchant/products`

### 2. Accept Header Versioning

Clients can specify version via Accept header:
```
Accept: application/vnd.rez.v1+json
```

**Examples:**
```bash
# Default (v1)
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer TOKEN"

# Explicit version
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/vnd.rez.v1+json"
```

### 3. Custom Header Versioning (Alternative)

```
X-API-Version: 1
```

## Version Lifecycle

### Stable Phase
- Full support and maintenance
- Bug fixes and security updates
- No breaking changes

### Deprecated Phase
- 6-month minimum notice
- Continued support
- Migration guides provided
- Deprecation warnings in responses

### Sunset Phase
- 3-month grace period after deprecation
- Limited support
- Critical bugs only
- Redirect to new version

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require New Version)

1. **Removing endpoints**
   ```
   ❌ DELETE /api/merchant/products/:id
   ```

2. **Removing required fields**
   ```json
   ❌ {
     "name": "Product",
     // "description" field removed
   }
   ```

3. **Changing field types**
   ```json
   ❌ "price": "29.99"  // String
   ✅ "price": 29.99     // Number
   ```

4. **Changing response structure**
   ```json
   ❌ { "product": { "id": "123" } }
   ✅ { "data": { "product": { "id": "123" } } }
   ```

5. **Renaming fields**
   ```json
   ❌ "businessName" → "companyName"
   ```

### Non-Breaking Changes (Same Version)

1. **Adding new endpoints**
   ```
   ✅ POST /api/merchant/products/bulk-update
   ```

2. **Adding optional fields**
   ```json
   ✅ {
     "name": "Product",
     "description": "Optional description",
     "tags": [] // New optional field
   }
   ```

3. **Adding new response fields**
   ```json
   ✅ {
     "product": {
       "id": "123",
       "newField": "value" // New field added
     }
   }
   ```

4. **Deprecating fields** (with warning)
   ```json
   ✅ {
     "oldField": "value", // Still supported
     "newField": "value"  // Preferred
   }
   ```

## Deprecation Process

### 1. Announcement (T-0)

**Documentation Update:**
```markdown
## Deprecated Endpoints

### GET /api/merchant/old-endpoint
**Status:** Deprecated
**Removal Date:** 2025-07-17 (6 months)
**Alternative:** GET /api/merchant/new-endpoint
**Migration Guide:** See /docs/migration/v1-to-v2.md
```

**Response Header:**
```
Deprecation: true
Sunset: Sat, 17 Jul 2025 00:00:00 GMT
Link: </api/merchant/new-endpoint>; rel="alternate"
```

**Response Body Warning:**
```json
{
  "success": true,
  "data": {...},
  "warning": {
    "type": "deprecation",
    "message": "This endpoint is deprecated and will be removed on 2025-07-17",
    "alternative": "/api/merchant/new-endpoint",
    "migrationGuide": "https://docs.rezapp.com/migration/v1-to-v2"
  }
}
```

### 2. Deprecation Period (T+0 to T+6 months)

- Endpoint remains fully functional
- Warnings in all responses
- Migration guides published
- Support team notified
- Email notifications to API users

### 3. Sunset Warning (T+5 months)

**Email Notification:**
```
Subject: Action Required: API Endpoint Deprecation

Dear Merchant,

The following endpoint will be removed in 30 days:
GET /api/merchant/old-endpoint

Please migrate to:
GET /api/merchant/new-endpoint

Migration guide: https://docs.rezapp.com/migration/v1-to-v2
```

### 4. Removal (T+6 months)

**Response:**
```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "success": false,
  "error": "ENDPOINT_REMOVED",
  "message": "This endpoint has been removed. Please use /api/merchant/new-endpoint",
  "alternative": "/api/merchant/new-endpoint",
  "migrationGuide": "https://docs.rezapp.com/migration/v1-to-v2",
  "removedOn": "2025-07-17T00:00:00Z"
}
```

## Version Migration

### Example: v1 to v2 Migration

**v1 Product Creation:**
```json
POST /api/merchant/products
{
  "name": "Product",
  "price": 29.99,
  "inventory": 100
}
```

**v2 Product Creation:**
```json
POST /api/v2/merchant/products
{
  "product": {
    "name": "Product",
    "pricing": {
      "amount": 29.99,
      "currency": "USD"
    },
    "inventory": {
      "quantity": 100,
      "trackInventory": true
    }
  }
}
```

**Migration Guide:**
```markdown
# Migrating from v1 to v2

## Product Creation

### Changes:
1. Root `price` → `pricing.amount`
2. Added required `pricing.currency`
3. Root `inventory` → `inventory.quantity`
4. Added optional `inventory.trackInventory`

### Migration Code:

// v1
const v1Product = {
  name: "Product",
  price: 29.99,
  inventory: 100
};

// v2 (migrated)
const v2Product = {
  product: {
    name: v1Product.name,
    pricing: {
      amount: v1Product.price,
      currency: "USD" // Default
    },
    inventory: {
      quantity: v1Product.inventory,
      trackInventory: true // Default
    }
  }
};
```

## Version Detection

### Server-Side

```typescript
// middleware/apiVersion.ts
export const detectAPIVersion = (req: Request) => {
  // Check URL path
  const pathMatch = req.path.match(/\/api\/v(\d+)\//);
  if (pathMatch) {
    return parseInt(pathMatch[1]);
  }

  // Check Accept header
  const acceptHeader = req.get('Accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.rez\.v(\d+)\+json/);
    if (versionMatch) {
      return parseInt(versionMatch[1]);
    }
  }

  // Check custom header
  const versionHeader = req.get('X-API-Version');
  if (versionHeader) {
    return parseInt(versionHeader);
  }

  // Default to v1
  return 1;
};
```

### Client-Side

```typescript
class MerchantAPI {
  private version: number = 1;

  setVersion(version: number) {
    this.version = version;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': `application/vnd.rez.v${this.version}+json`,
      'X-API-Version': this.version.toString()
    };
  }

  async createProduct(data: any) {
    const url = this.version === 1
      ? '/api/merchant/products'
      : `/api/v${this.version}/merchant/products`;

    return axios.post(url, data, { headers: this.getHeaders() });
  }
}
```

## Version Compatibility

### Supported Versions

| Version | Status | Support Until | Sunset Date |
|---------|--------|---------------|-------------|
| 1.0.0 | Stable | Indefinite | TBD |
| 2.0.0 | Planned | TBD | TBD |

### Version Matrix

| Feature | v1 | v2 (Planned) |
|---------|----|----|
| Authentication | ✅ JWT | ✅ JWT + OAuth2 |
| Products | ✅ Basic | ✅ Enhanced |
| Orders | ✅ Basic | ✅ Enhanced |
| Analytics | ✅ Real-time | ✅ Real-time + AI |
| Team RBAC | ✅ Yes | ✅ Enhanced |
| Webhooks | ❌ No | ✅ Yes |
| GraphQL | ❌ No | ✅ Yes |
| Rate Limiting | ✅ IP-based | ✅ Token-based |

## Best Practices

### For API Consumers

1. **Always specify version explicitly**
   ```typescript
   headers: {
     'Accept': 'application/vnd.rez.v1+json'
   }
   ```

2. **Handle deprecation warnings**
   ```typescript
   if (response.warning) {
     console.warn('API Warning:', response.warning.message);
     // Log to monitoring system
   }
   ```

3. **Test with new versions early**
   ```typescript
   // Test v2 endpoints before migration
   const testAPI = new MerchantAPI();
   testAPI.setVersion(2);
   ```

4. **Monitor version headers**
   ```typescript
   const apiVersion = response.headers['x-api-version'];
   const deprecation = response.headers['deprecation'];
   ```

### For API Providers

1. **Document all changes**
2. **Provide migration guides**
3. **Notify users 6 months in advance**
4. **Maintain backward compatibility**
5. **Version breaking changes only**

## Changelog

### v1.0.0 (2025-01-17)

**Added:**
- Authentication endpoints (8)
- Product management (25+ endpoints)
- Order processing (15 endpoints)
- Team RBAC (12 endpoints)
- Analytics (17 endpoints)
- Audit logging (17 endpoints)
- Dashboard (8 endpoints)
- Onboarding (16 endpoints)

### v1.1.0 (Planned - 2025-Q2)

**Added:**
- Webhook support
- Advanced filtering
- Bulk operations improvements
- Export enhancements

**Deprecated:**
- None

### v2.0.0 (Planned - 2025-Q4)

**Added:**
- GraphQL support
- OAuth2 authentication
- Enhanced analytics with AI
- Real-time WebSocket events

**Breaking Changes:**
- Product schema restructure
- Order schema enhancements
- New authentication flow

**Removed:**
- Legacy endpoints (deprecated in v1.0.0)

## Support

For version-related questions:
- Email: api-support@rezapp.com
- Documentation: https://docs.rezapp.com/versioning
- Migration Help: https://docs.rezapp.com/migration
