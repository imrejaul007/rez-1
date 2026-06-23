# REZ App - Backend API Endpoints Reference

Complete reference of all backend API endpoints with request/response examples.

**Base URL:** `http://localhost:5001/api`

---

## Authentication & User Management

### POST /user/auth/send-otp
Send OTP for authentication.

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "email": "user@example.com",
  "referralCode": "REF123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300
  }
}
```

---

### POST /user/auth/verify-otp
Verify OTP and authenticate user.

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "phoneNumber": "+919876543210",
      "email": "user@example.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://..."
      },
      "wallet": {
        "balance": 0,
        "totalEarned": 0,
        "totalSpent": 0,
        "pendingAmount": 0
      },
      "role": "user",
      "isVerified": true,
      "isOnboarded": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

### GET /user/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "phoneNumber": "+919876543210",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://...",
      "bio": "Software developer",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "location": {
        "address": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "coordinates": [19.0760, 72.8777]
      }
    },
    "preferences": {
      "language": "en",
      "theme": "light",
      "notifications": {
        "push": true,
        "email": true,
        "sms": false
      },
      "categories": ["electronics", "fashion"]
    },
    "wallet": {
      "balance": 1500.50,
      "totalEarned": 5000,
      "totalSpent": 3500,
      "pendingAmount": 250
    },
    "role": "user",
    "isVerified": true,
    "isOnboarded": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-11-11T00:00:00.000Z"
  }
}
```

---

### PUT /user/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://...",
    "bio": "Updated bio",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "location": {
      "address": "123 New St",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001"
    }
  },
  "preferences": {
    "language": "en",
    "theme": "dark",
    "notifications": {
      "push": true,
      "email": false,
      "sms": false
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated user object
  }
}
```

---

## Products

### GET /products
Get products with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Category ID or slug
- `store` (string): Store ID
- `search` (string): Search query
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `tags` (array): Product tags
- `sort` (string): Sort field (name, price, rating, popularity, newest, oldest)
- `order` (string): Sort order (asc, desc)

**Example:**
```
GET /products?page=1&limit=20&category=electronics&sort=price&order=asc
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Gaming Laptop",
        "description": "High-performance gaming laptop",
        "sku": "LAP-001",
        "category": {
          "id": "cat_123",
          "name": "Electronics",
          "slug": "electronics"
        },
        "store": {
          "id": "store_123",
          "name": "Tech Store",
          "slug": "tech-store"
        },
        "images": [
          {
            "id": "img_1",
            "url": "https://...",
            "alt": "Gaming Laptop",
            "isMain": true
          }
        ],
        "pricing": {
          "basePrice": 45000,
          "salePrice": 40000,
          "cost": 30000,
          "taxable": true
        },
        "ratings": {
          "average": 4.5,
          "count": 120,
          "breakdown": {
            "5": 80,
            "4": 30,
            "3": 8,
            "2": 1,
            "1": 1
          }
        },
        "tags": ["gaming", "laptop", "professional"],
        "status": "active",
        "visibility": "public"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 100,
      "limit": 20
    },
    "filters": {
      "categories": [
        { "id": "cat_1", "name": "Electronics", "count": 45 }
      ],
      "stores": [
        { "id": "store_1", "name": "Tech Store", "count": 25 }
      ],
      "priceRange": { "min": 5000, "max": 100000 },
      "tags": [
        { "name": "gaming", "count": 30 }
      ]
    }
  }
}
```

---

### GET /products/:id
Get single product by ID.

**Example:**
```
GET /products/prod_123
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Gaming Laptop",
    "description": "High-performance gaming laptop with RTX 4060",
    "sku": "LAP-001",
    "category": {
      "id": "cat_123",
      "name": "Electronics",
      "slug": "electronics"
    },
    "store": {
      "id": "store_123",
      "name": "Tech Store",
      "slug": "tech-store"
    },
    "variants": [
      {
        "id": "var_1",
        "name": "16GB RAM / 512GB SSD",
        "sku": "LAP-001-16-512",
        "price": 45000,
        "comparePrice": 50000,
        "inventory": {
          "quantity": 10,
          "trackQuantity": true,
          "allowBackorder": false
        },
        "attributes": {
          "ram": "16GB",
          "storage": "512GB",
          "color": "Black"
        }
      }
    ],
    "images": [...],
    "pricing": {
      "basePrice": 45000,
      "salePrice": 40000,
      "taxable": true
    },
    "ratings": {
      "average": 4.5,
      "count": 120
    },
    "tags": ["gaming", "laptop"],
    "status": "active",
    "visibility": "public",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-11-11T00:00:00.000Z"
  }
}
```

---

### GET /products/search
Search products.

**Query Parameters:**
- `q` (string, required): Search query
- `page` (number): Page number
- `limit` (number): Items per page
- `category` (string): Filter by category
- `store` (string): Filter by store

**Example:**
```
GET /products/search?q=laptop&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "suggestions": [
      "laptop bag",
      "laptop stand",
      "laptop cooling pad"
    ],
    "filters": [
      {
        "name": "Brand",
        "type": "brand",
        "options": [
          { "value": "Dell", "label": "Dell", "count": 25 },
          { "value": "HP", "label": "HP", "count": 20 }
        ]
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 3,
      "total": 60,
      "limit": 20
    },
    "query": "laptop",
    "searchTime": 45
  }
}
```

---

## Shopping Cart

### GET /cart
Get user's cart.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "cart_123",
    "user": "user_123",
    "items": [
      {
        "_id": "item_1",
        "product": {
          "_id": "prod_123",
          "name": "Gaming Laptop",
          "images": [...],
          "pricing": { "currency": "INR" },
          "inventory": { "stock": 10, "isAvailable": true },
          "isActive": true
        },
        "store": {
          "_id": "store_123",
          "name": "Tech Store",
          "location": {
            "address": "123 Main St",
            "city": "Mumbai",
            "state": "Maharashtra"
          }
        },
        "variant": {
          "type": "RAM",
          "value": "16GB"
        },
        "quantity": 1,
        "price": 45000,
        "originalPrice": 50000,
        "discount": 5000,
        "addedAt": "2024-11-11T10:00:00.000Z"
      }
    ],
    "lockedItems": [],
    "totals": {
      "subtotal": 45000,
      "tax": 8100,
      "delivery": 0,
      "discount": 5000,
      "cashback": 450,
      "total": 48100,
      "savings": 5000
    },
    "coupon": null,
    "itemCount": 1,
    "storeCount": 1,
    "isActive": true,
    "expiresAt": "2024-11-12T10:00:00.000Z",
    "createdAt": "2024-11-11T10:00:00.000Z",
    "updatedAt": "2024-11-11T10:00:00.000Z"
  }
}
```

---

### POST /cart/add
Add item to cart.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "productId": "prod_123",
  "quantity": 1,
  "variant": {
    "type": "RAM",
    "value": "16GB"
  },
  "metadata": {
    "eventId": "event_123",
    "slotId": "slot_456"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated cart object
  }
}
```

---

### PUT /cart/item/:productId
Update cart item quantity.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "quantity": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated cart object
  }
}
```

---

### DELETE /cart/item/:productId
Remove item from cart.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated cart object
  }
}
```

---

### POST /cart/coupon
Apply coupon to cart.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "couponCode": "SAVE10"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Updated cart with coupon applied
  }
}
```

---

### GET /cart/validate
Validate cart items.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "issues": [
      {
        "itemId": "item_1",
        "type": "price_change",
        "message": "Price has changed from ₹45,000 to ₹46,000",
        "currentPrice": 46000
      },
      {
        "itemId": "item_2",
        "type": "out_of_stock",
        "message": "Product is out of stock",
        "availableQuantity": 0
      }
    ]
  }
}
```

---

## Orders

### POST /orders
Create order from cart.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "deliveryAddress": {
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India",
    "landmark": "Near City Mall",
    "addressType": "home"
  },
  "paymentMethod": "wallet",
  "specialInstructions": "Please call before delivery",
  "couponCode": "SAVE10"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "order_123",
    "id": "order_123",
    "orderNumber": "ORD-2024-001",
    "userId": "user_123",
    "status": "placed",
    "paymentStatus": "pending",
    "items": [...],
    "totals": {
      "subtotal": 45000,
      "tax": 8100,
      "delivery": 100,
      "discount": 5000,
      "cashback": 450,
      "total": 48200,
      "paidAmount": 0,
      "refundAmount": 0
    },
    "payment": {
      "method": "wallet",
      "status": "pending"
    },
    "delivery": {
      "method": "standard",
      "status": "pending",
      "address": {...},
      "deliveryFee": 100,
      "attempts": []
    },
    "timeline": [
      {
        "status": "placed",
        "message": "Order placed successfully",
        "timestamp": "2024-11-11T10:00:00.000Z"
      }
    ],
    "specialInstructions": "Please call before delivery",
    "createdAt": "2024-11-11T10:00:00.000Z",
    "updatedAt": "2024-11-11T10:00:00.000Z"
  }
}
```

---

### GET /orders
Get user orders.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status
- `paymentStatus` (string): Filter by payment status
- `dateFrom` (string): Start date (ISO 8601)
- `dateTo` (string): End date (ISO 8601)

**Example:**
```
GET /orders?page=1&limit=10&status=delivered
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 50,
      "limit": 10
    },
    "summary": {
      "totalOrders": 50,
      "totalSpent": 125000,
      "averageOrderValue": 2500
    }
  }
}
```

---

### GET /orders/:orderId
Get order by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    // Full order object
  }
}
```

---

### GET /orders/:orderId/tracking
Get order tracking.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "orderNumber": "ORD-2024-001",
    "status": "out_for_delivery",
    "estimatedDelivery": "2024-11-15T18:00:00.000Z",
    "trackingNumber": "TRK123456",
    "carrier": "BlueDart",
    "timeline": [
      {
        "status": "placed",
        "message": "Order placed",
        "timestamp": "2024-11-11T10:00:00.000Z"
      },
      {
        "status": "confirmed",
        "message": "Order confirmed by store",
        "timestamp": "2024-11-11T11:00:00.000Z"
      },
      {
        "status": "dispatched",
        "message": "Order dispatched",
        "timestamp": "2024-11-11T15:00:00.000Z"
      },
      {
        "status": "out_for_delivery",
        "message": "Out for delivery",
        "timestamp": "2024-11-12T09:00:00.000Z"
      }
    ]
  }
}
```

---

## Wallet

### GET /wallet/balance
Get wallet balance.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": {
      "total": 1500.50,
      "available": 1250.50,
      "pending": 250
    },
    "coins": [
      {
        "type": "wasil",
        "amount": 1000,
        "isActive": true,
        "earnedDate": "2024-11-01",
        "lastUsed": "2024-11-10"
      }
    ],
    "currency": "INR",
    "statistics": {
      "totalEarned": 5000,
      "totalSpent": 3500,
      "totalCashback": 750,
      "totalRefunds": 200,
      "totalTopups": 2000,
      "totalWithdrawals": 0
    },
    "limits": {
      "maxBalance": 100000,
      "dailySpendLimit": 10000,
      "dailySpentToday": 2500,
      "remainingToday": 7500
    },
    "status": {
      "isActive": true,
      "isFrozen": false
    },
    "lastUpdated": "2024-11-11T10:00:00.000Z"
  }
}
```

---

### GET /wallet/transactions
Get wallet transactions.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `type` (string): credit or debit
- `category` (string): Transaction category
- `status` (string): Transaction status
- `dateFrom` (string): Start date
- `dateTo` (string): End date

**Example:**
```
GET /wallet/transactions?page=1&limit=20&type=credit
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123",
        "transactionId": "TXN-2024-001",
        "user": "user_123",
        "type": "credit",
        "category": "earning",
        "amount": 500,
        "currency": "INR",
        "description": "Project completion reward",
        "source": {
          "type": "project",
          "reference": "proj_123",
          "description": "Video creation project"
        },
        "status": {
          "current": "completed",
          "history": [...]
        },
        "balanceBefore": 1000,
        "balanceAfter": 1500,
        "createdAt": "2024-11-11T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### POST /wallet/topup
Topup wallet.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "amount": 1000,
  "paymentMethod": "card",
  "paymentId": "pay_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transaction": {...},
    "wallet": {
      "balance": {
        "total": 2500,
        "available": 2500,
        "pending": 0
      },
      "currency": "INR"
    }
  }
}
```

---

### POST /wallet/payment
Process payment from wallet.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "amount": 500,
  "orderId": "order_123",
  "storeId": "store_123",
  "storeName": "Tech Store",
  "description": "Payment for order #ORD-2024-001"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transaction": {...},
    "wallet": {
      "balance": {
        "total": 1000,
        "available": 1000,
        "pending": 0
      },
      "currency": "INR"
    },
    "paymentStatus": "success"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "errors": {
    "phoneNumber": ["Phone number is required"],
    "otp": ["OTP must be 6 digits"]
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## WebSocket Events

### Connect
```javascript
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});
```

### Cart Updated
```javascript
socket.on('cart:updated', (data) => {
  console.log('Cart updated:', data);
});
```

### Order Status
```javascript
socket.on('order:status', (data) => {
  console.log('Order status updated:', data);
});
```

### Wallet Balance
```javascript
socket.on('wallet:balance', (data) => {
  console.log('Wallet balance updated:', data);
});
```

---

**End of Backend API Endpoints Reference**
