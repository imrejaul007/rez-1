# REZ API Contracts v1.0

This document defines the EXACT shape of critical API responses so frontend developers know what to expect. All endpoints require proper authentication where specified.

## Authentication
All authenticated endpoints require: `Authorization: Bearer <token>`

---

## Consumer Endpoints

### GET /api/stores/near?lat={lat}&lng={lng}&radius={km}
Fetches nearby stores based on geolocation.

**Query Parameters:**
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude
- `radius` (number, optional): Search radius in km (default: 10)
- `page` (number, optional): Pagination page (default: 1)
- `limit` (number, optional): Results per page (default: 20)

**Authentication:** Optional (different results for authenticated users)

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "_id": "string (MongoDB ObjectId)",
        "name": "string",
        "logo": "string | null (URL or null)",
        "rating": "number (0-5, float)",
        "reviewCount": "number",
        "category": "string",
        "tags": ["string"],
        "isOpen": "boolean",
        "distance": "number (km, float)",
        "location": {
          "type": "Point",
          "coordinates": ["number (lng)", "number (lat)"]
        },
        "avgPrice": "number | null (currency in INR)"
      }
    ],
    "total": "number (total matching stores)",
    "page": "number",
    "limit": "number"
  },
  "message": "string (optional)"
}
```

**Error Response (400/401/500):**
```json
{
  "success": false,
  "error": "string",
  "message": "string",
  "code": "string (optional error code)"
}
```

---

### POST /api/wallet/pay
Processes a payment from user wallet.

**Request Body:**
```json
{
  "amount": "number (in INR, must be > 0)",
  "storeId": "string (MongoDB ObjectId)",
  "description": "string (optional, transaction description)"
}
```

**Authentication:** Required (Bearer token in Authorization header)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "string (unique transaction ID)",
    "newBalance": "number (updated wallet balance in INR)",
    "coinsEarned": "number (coins/rewards earned from this transaction)",
    "cashbackINR": "number (cashback amount in INR, may be 0)",
    "timestamp": "string (ISO 8601 datetime)"
  },
  "message": "Payment successful"
}
```

**Error Response (400/401/403/500):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_BALANCE | STORE_NOT_FOUND | INVALID_AMOUNT | PAYMENT_FAILED",
  "message": "string (user-friendly message)",
  "data": {
    "currentBalance": "number (optional, if balance-related error)"
  }
}
```

---

### GET /api/products/search?q={query}&category={category}&page={page}
Search products across stores.

**Query Parameters:**
- `q` (string, required): Search query
- `category` (string, optional): Filter by category
- `page` (number, optional): Pagination page (default: 1)
- `limit` (number, optional): Results per page (default: 20)
- `sortBy` (string, optional): "price" | "rating" | "relevance" (default: "relevance")

**Authentication:** Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "price": "number (in INR)",
        "originalPrice": "number | null",
        "discount": "number (percentage, 0-100)",
        "rating": "number (0-5, float)",
        "reviewCount": "number",
        "image": "string (URL)",
        "images": ["string (URLs)"],
        "category": "string",
        "store": {
          "_id": "string",
          "name": "string",
          "logo": "string | null"
        },
        "inStock": "boolean",
        "stock": "number (quantity available)"
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "filters": {
      "categories": ["string"],
      "priceRange": {
        "min": "number",
        "max": "number"
      }
    }
  }
}
```

---

### GET /api/orders
List user orders (paginated).

**Query Parameters:**
- `page` (number, optional): Default 1
- `limit` (number, optional): Default 10
- `status` (string, optional): "placed" | "confirmed" | "preparing" | "ready" | "dispatched" | "out_for_delivery" | "delivered" | "cancelling" | "cancelled" | "returned" | "refunded"

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "string",
        "orderId": "string (user-friendly ID)",
        "storeId": "string",
        "storeName": "string",
        "items": [
          {
            "productId": "string",
            "productName": "string",
            "quantity": "number",
            "price": "number",
            "discount": "number | null"
          }
        ],
        "totalAmount": "number (in INR)",
        "status": "string (placed|confirmed|preparing|ready|dispatched|out_for_delivery|delivered|cancelling|cancelled|returned|refunded)",
        "paymentMethod": "string (wallet|credit_card|etc)",
        "createdAt": "string (ISO 8601)",
        "updatedAt": "string (ISO 8601)",
        "estimatedDelivery": "string (ISO 8601) | null",
        "trackingUrl": "string | null"
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number"
  }
}
```

> **Note:** The legacy status aliases `pending` → `placed`, `shipped` → `dispatched` are handled
> by `LEGACY_STATUS_MAP` on the frontend. Always use the canonical values above in new code.

---

### POST /api/cart/add
Add item to cart.

**Request Body:**
```json
{
  "productId": "string (MongoDB ObjectId)",
  "quantity": "number (positive integer)",
  "storeId": "string (MongoDB ObjectId)"
}
```

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "cartId": "string",
    "itemCount": "number (total items in cart)",
    "totalPrice": "number (in INR, before tax)",
    "items": [
      {
        "productId": "string",
        "quantity": "number",
        "price": "number",
        "discount": "number | null"
      }
    ]
  }
}
```

**Error Response (400/404/500):**
```json
{
  "success": false,
  "error": "PRODUCT_NOT_FOUND | INSUFFICIENT_STOCK | CART_ERROR",
  "message": "string"
}
```

---

### GET /api/user/profile
Fetch authenticated user profile.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "avatar": "string | null (URL)",
    "walletBalance": "number (in INR)",
    "coinsBalance": "number",
    "memberSince": "string (ISO 8601)",
    "tier": "string (bronze|silver|gold|platinum)",
    "totalOrders": "number",
    "totalSpent": "number (in INR)",
    "addresses": [
      {
        "_id": "string",
        "type": "string (home|office|other)",
        "address": "string",
        "lat": "number",
        "lng": "number",
        "isDefault": "boolean"
      }
    ],
    "preferences": {
      "language": "string",
      "currency": "string",
      "notifications": "boolean",
      "newsletter": "boolean"
    }
  }
}
```

---

### PUT /api/user/profile
Update user profile.

**Request Body:**
```json
{
  "name": "string (optional)",
  "avatar": "string (optional, URL or base64)",
  "preferences": {
    "language": "string (optional)",
    "notifications": "boolean (optional)",
    "newsletter": "boolean (optional)"
  }
}
```

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "message": "Profile updated successfully",
    "profile": {
      "name": "string",
      "email": "string",
      "avatar": "string | null"
    }
  }
}
```

---

### POST /api/auth/login
User login/authentication.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "deviceId": "string (optional, for tracking)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "string (JWT bearer token)",
      "refreshToken": "string (for token refresh)",
      "expiresIn": "number (seconds)"
    },
    "user": {
      "name": "string",
      "avatar": "string | null",
      "tier": "string"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS | USER_NOT_FOUND | ACCOUNT_LOCKED",
  "message": "string"
}
```

---

### POST /api/auth/register
User registration.

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (required, valid phone)",
  "password": "string (required, min 8 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "email": "string",
    "message": "Registration successful. Please verify your email."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "EMAIL_ALREADY_EXISTS | INVALID_EMAIL | WEAK_PASSWORD | PHONE_INVALID",
  "message": "string"
}
```

---

### GET /api/health
Basic liveness probe for load balancers.

**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "string (ISO 8601)"
}
```

---

### GET /api/health/ready
Readiness probe - checks all critical dependencies.

**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "status": "healthy | degraded | unhealthy",
  "checks": {
    "mongodb": {
      "status": "ok | error",
      "latencyMs": "number (optional)"
    },
    "redis": {
      "status": "ok | error",
      "latencyMs": "number (optional)"
    },
    "razorpay": {
      "status": "ok | error",
      "detail": "string (optional)"
    },
    "sentry": {
      "status": "ok | error"
    }
  },
  "timestamp": "string (ISO 8601)",
  "version": "string (semantic version)"
}
```

---

## Webhook Endpoints

### POST /api/webhooks/razorpay
Razorpay payment webhook handler.

**Headers:**
- `X-Razorpay-Signature` (required): HMAC SHA256 signature

**Request Body:**
```json
{
  "event": "string (payment.captured | payment.failed | refund.processed | order.paid)",
  "payload": {
    "payment": {
      "entity": "payment",
      "id": "string",
      "amount": "number (in paise)",
      "status": "string (captured | failed | authorized)",
      "method": "string (upi | card | wallet | netbanking)",
      "description": "string (optional)",
      "order_id": "string",
      "customer_id": "string",
      "created_at": "number (unix timestamp)"
    }
  }
}
```

**Response (always 200 for acknowledgment):**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## Merchant Endpoints

### POST /api/merchant/products
Create a new product (merchant only).

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "price": "number (required, in INR)",
  "originalPrice": "number (optional)",
  "category": "string (required)",
  "images": ["string (URLs or base64)"],
  "stock": "number (required, quantity)",
  "sku": "string (optional, unique)",
  "tags": ["string (optional)"]
}
```

**Authentication:** Required (merchant token)

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "string",
    "name": "string",
    "createdAt": "string (ISO 8601)"
  }
}
```

---

### GET /api/merchant/analytics
Merchant dashboard analytics.

**Query Parameters:**
- `period` (string, optional): "today" | "week" | "month" | "year" (default: "month")

**Authentication:** Required (merchant token)

**Response:**
```json
{
  "success": true,
  "data": {
    "ordersCount": "number",
    "revenue": "number (in INR)",
    "avgOrderValue": "number",
    "conversionRate": "number (percentage)",
    "topProducts": [
      {
        "productId": "string",
        "name": "string",
        "sales": "number",
        "revenue": "number"
      }
    ],
    "periodFrom": "string (ISO 8601)",
    "periodTo": "string (ISO 8601)"
  }
}
```

---

## Admin Endpoints

### GET /api/admin/users?page={page}&limit={limit}
List all users (admin only).

**Authentication:** Required (admin token)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "string",
        "name": "string",
        "email": "string",
        "status": "active | suspended | deleted",
        "tier": "string",
        "totalOrders": "number",
        "createdAt": "string (ISO 8601)",
        "lastLogin": "string (ISO 8601) | null"
      }
    ],
    "total": "number",
    "page": "number"
  }
}
```

---

### POST /api/admin/users/{userId}/suspend
Suspend a user account (admin only).

**Request Body:**
```json
{
  "reason": "string (required)",
  "duration": "string (optional, ISO duration or 'permanent')"
}
```

**Authentication:** Required (admin token)

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "status": "suspended",
    "suspendedUntil": "string (ISO 8601) | null"
  }
}
```

---

## Contract Compliance Notes

- All timestamps are ISO 8601 format with timezone information
- All monetary amounts are in INR unless otherwise specified
- All IDs are MongoDB ObjectId format (24-char hex strings)
- Pagination defaults: page=1, limit=10 (unless specified differently per endpoint)
- All error responses follow the pattern: `{ success: false, error: "ERROR_CODE", message: "..." }`
- Empty arrays should be returned as `[]` not `null`
- Optional nested objects should be `null` not `{}`
- Authentication failures always return 401 with `{ success: false, error: "UNAUTHORIZED" }`
- Rate limit information (if applicable) should be in response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-23 | Initial API contract documentation for critical endpoints |

