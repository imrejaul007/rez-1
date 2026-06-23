# REZ Merchant API - Quick Start Guide

## Getting Started in 5 Minutes

### 1. Access API Documentation

Open Swagger UI in your browser:
```
http://localhost:5001/api-docs
```

### 2. Register a Merchant Account

**Endpoint:** `POST /api/merchant/auth/register`

**Request:**
```bash
curl -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Test Store",
    "ownerName": "Test Owner",
    "email": "test@example.com",
    "password": "Test123!",
    "phone": "+1234567890",
    "businessAddress": {
      "street": "123 Test St",
      "city": "Test City",
      "state": "TC",
      "zipCode": "12345",
      "country": "USA"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Merchant registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "merchant": {
      "id": "507f1f77bcf86cd799439011",
      "businessName": "My Test Store",
      "email": "test@example.com"
    }
  }
}
```

**Save the token!** You'll need it for all authenticated requests.

### 3. Make Your First Authenticated Request

**Endpoint:** `GET /api/merchant/auth/me`

**Request:**
```bash
curl -X GET http://localhost:5001/api/merchant/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "507f1f77bcf86cd799439011",
      "businessName": "My Test Store",
      "ownerName": "Test Owner",
      "email": "test@example.com",
      "verificationStatus": "pending"
    }
  }
}
```

### 4. Create Your First Product

**Endpoint:** `POST /api/merchant/products`

**Request:**
```bash
curl -X POST http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "A great test product",
    "price": 29.99,
    "inventory": 100,
    "category": "General",
    "images": ["https://via.placeholder.com/300"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Test Product",
      "price": 29.99,
      "inventory": 100
    }
  }
}
```

### 5. List Your Products

**Endpoint:** `GET /api/merchant/products`

**Request:**
```bash
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "507f1f77bcf86cd799439012",
        "name": "Test Product",
        "price": 29.99,
        "inventory": 100
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Common Tasks

### Login (if already registered)

```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Get Dashboard Summary

```bash
curl -X GET http://localhost:5001/api/merchant/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Product Inventory

```bash
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID/inventory \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "inventory": 150
  }'
```

### List Orders

```bash
curl -X GET "http://localhost:5001/api/merchant/orders?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Order Status

```bash
curl -X PUT http://localhost:5001/api/merchant/orders/ORDER_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing"
  }'
```

### Invite Team Member

```bash
curl -X POST http://localhost:5001/api/merchant/team/invite \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "team@example.com",
    "name": "Team Member",
    "role": "staff"
  }'
```

### Get Analytics Overview

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/overview \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Using Postman

### 1. Import Collection

1. Download Swagger JSON:
   ```
   http://localhost:5001/api-docs.json
   ```

2. Use `openapi-to-postmanv2` to convert:
   ```bash
   npm install -g openapi-to-postmanv2
   openapi2postmanv2 -s http://localhost:5001/api-docs.json -o postman-collection.json
   ```

3. Import `postman-collection.json` in Postman

### 2. Set Up Environment

Create a Postman environment with these variables:

```json
{
  "name": "REZ Merchant API - Local",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5001",
      "enabled": true
    },
    {
      "key": "token",
      "value": "",
      "enabled": true
    }
  ]
}
```

### 3. Auto-Save Token

Add this to the "Tests" tab of the login/register request:

```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
  const response = pm.response.json();
  if (response.data && response.data.token) {
    pm.environment.set("token", response.data.token);
    console.log("Token saved:", response.data.token);
  }
}
```

## Using JavaScript/TypeScript

### Setup

```bash
npm install axios
```

### Create API Client

```typescript
// api-client.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

export class MerchantAPI {
  private token: string | null = null;

  async register(data: {
    businessName: string;
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    businessAddress: any;
  }) {
    const response = await axios.post(`${API_BASE_URL}/api/merchant/auth/register`, data);
    this.token = response.data.data.token;
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${API_BASE_URL}/api/merchant/auth/login`, {
      email,
      password
    });
    this.token = response.data.data.token;
    return response.data;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getProducts(params?: { page?: number; limit?: number; search?: string }) {
    const response = await axios.get(`${API_BASE_URL}/api/merchant/products`, {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async createProduct(data: any) {
    const response = await axios.post(`${API_BASE_URL}/api/merchant/products`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const response = await axios.get(`${API_BASE_URL}/api/merchant/orders`, {
      headers: this.getHeaders(),
      params
    });
    return response.data;
  }

  async getAnalytics() {
    const response = await axios.get(`${API_BASE_URL}/api/merchant/analytics/overview`, {
      headers: this.getHeaders()
    });
    return response.data;
  }
}
```

### Usage

```typescript
// app.ts
const api = new MerchantAPI();

// Register
await api.register({
  businessName: "My Store",
  ownerName: "John Doe",
  email: "john@example.com",
  password: "SecurePass123!",
  phone: "+1234567890",
  businessAddress: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "USA"
  }
});

// Get products
const products = await api.getProducts({ page: 1, limit: 20 });
console.log(products);

// Create product
const newProduct = await api.createProduct({
  name: "Test Product",
  price: 29.99,
  inventory: 100,
  category: "General"
});

// Get analytics
const analytics = await api.getAnalytics();
console.log(analytics);
```

## Error Handling

### Standard Error Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 423 | Locked | Account locked |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Handling Errors

```typescript
try {
  const products = await api.getProducts();
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Error:', error.response.data.message);
    console.error('Code:', error.response.status);
  } else if (error.request) {
    // No response received
    console.error('No response from server');
  } else {
    // Request setup error
    console.error('Error:', error.message);
  }
}
```

## Rate Limiting

**Limits:**
- Authentication: 5 requests / 15 minutes
- General: 100 requests / minute
- Bulk: 10 requests / hour

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Pagination

**Query Parameters:**
```
GET /api/merchant/products?page=2&limit=50&sort=-createdAt
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "pages": 5
  }
}
```

## Filtering & Searching

**Products:**
```
GET /api/merchant/products?category=clothing&minPrice=10&maxPrice=100&search=shirt
```

**Orders:**
```
GET /api/merchant/orders?status=pending&startDate=2025-01-01&endDate=2025-01-31
```

**Audit Logs:**
```
GET /api/merchant/audit/logs?action=product:update&userId=507f1f77bcf86cd799439011
```

## Next Steps

1. **Explore Swagger UI** - http://localhost:5001/api-docs
2. **Complete Onboarding** - 16-step process
3. **Add Products** - Build your catalog
4. **Invite Team** - Collaborate with staff
5. **Monitor Analytics** - Track performance
6. **Review Audit Logs** - Ensure compliance

## Support

- **Documentation**: http://localhost:5001/api-docs
- **API Info**: http://localhost:5001/api-info
- **Health Check**: http://localhost:5001/health
- **Email**: support@rezapp.com
