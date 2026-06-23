# Agent 7: Sample API Requests

## Quick Copy-Paste Examples for Testing

Replace `YOUR_JWT_TOKEN` and `ORDER_ID` with actual values.

---

## 1. Bulk Actions

### Confirm Multiple Orders
```bash
curl -X POST http://localhost:5001/api/merchant/orders/bulk-action \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "confirm",
    "orderIds": [
      "673abc123456789012345678",
      "673def123456789012345678",
      "673ghi123456789012345678"
    ]
  }'
```

### Cancel Multiple Orders
```bash
curl -X POST http://localhost:5001/api/merchant/orders/bulk-action \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel",
    "orderIds": [
      "673abc123456789012345678"
    ],
    "reason": "Product out of stock"
  }'
```

### Mark Orders as Shipped
```bash
curl -X POST http://localhost:5001/api/merchant/orders/bulk-action \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "mark-shipped",
    "orderIds": [
      "673abc123456789012345678"
    ],
    "trackingInfo": {
      "trackingId": "TRACK123456789",
      "deliveryPartner": "DHL Express",
      "estimatedTime": "2025-11-20T15:00:00Z"
    }
  }'
```

---

## 2. Refunds

### Full Refund
```bash
curl -X POST http://localhost:5001/api/merchant/orders/ORDER_ID/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500.00,
    "reason": "Customer dissatisfied with product quality",
    "notifyCustomer": true
  }'
```

### Partial Refund (Specific Items)
```bash
curl -X POST http://localhost:5001/api/merchant/orders/ORDER_ID/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 750.00,
    "reason": "One item damaged during delivery",
    "refundItems": [
      {
        "itemId": "673item123456789012345678",
        "quantity": 1
      }
    ],
    "notifyCustomer": true
  }'
```

### Partial Refund (Multiple Items)
```bash
curl -X POST http://localhost:5001/api/merchant/orders/ORDER_ID/refund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "reason": "Customer returned multiple items",
    "refundItems": [
      {
        "itemId": "673item1...",
        "quantity": 2
      },
      {
        "itemId": "673item2...",
        "quantity": 1
      }
    ],
    "notifyCustomer": true
  }'
```

---

## 3. Get Orders (Enhanced Filtering)

### Get All Orders
```bash
curl "http://localhost:5001/api/merchant/orders?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Status
```bash
curl "http://localhost:5001/api/merchant/orders?status=confirmed&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Payment Status
```bash
curl "http://localhost:5001/api/merchant/orders?paymentStatus=paid&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Date Range
```bash
curl "http://localhost:5001/api/merchant/orders?startDate=2025-11-01&endDate=2025-11-17&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search by Customer Name
```bash
curl "http://localhost:5001/api/merchant/orders?search=John&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Search by Order Number
```bash
curl "http://localhost:5001/api/merchant/orders?search=ORD17318&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Sort by Total (Descending)
```bash
curl "http://localhost:5001/api/merchant/orders?sortBy=total&order=desc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Combined Filters
```bash
curl "http://localhost:5001/api/merchant/orders?status=confirmed&paymentStatus=paid&startDate=2025-11-01&endDate=2025-11-17&sortBy=total&order=desc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Analytics

### Get Overall Analytics (Last 30 Days)
```bash
curl "http://localhost:5001/api/merchant/orders/analytics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics for Date Range
```bash
curl "http://localhost:5001/api/merchant/orders/analytics?startDate=2025-10-01&endDate=2025-11-17" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics by Day
```bash
curl "http://localhost:5001/api/merchant/orders/analytics?startDate=2025-11-01&endDate=2025-11-17&interval=day" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics by Week
```bash
curl "http://localhost:5001/api/merchant/orders/analytics?startDate=2025-10-01&endDate=2025-11-17&interval=week" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics by Month
```bash
curl "http://localhost:5001/api/merchant/orders/analytics?startDate=2025-01-01&endDate=2025-11-17&interval=month" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics for Specific Store
```bash
curl "http://localhost:5001/api/merchant/orders/analytics?storeId=673store123456789012345678" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 5. Postman Collection JSON

For easy import into Postman:

```json
{
  "info": {
    "name": "Agent 7 - Merchant Order Enhancements",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Bulk Actions",
      "item": [
        {
          "name": "Confirm Orders",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"action\": \"confirm\",\n  \"orderIds\": [\"{{order_id}}\"]\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/bulk-action",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "bulk-action"]
            }
          }
        },
        {
          "name": "Cancel Orders",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"action\": \"cancel\",\n  \"orderIds\": [\"{{order_id}}\"],\n  \"reason\": \"Out of stock\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/bulk-action",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "bulk-action"]
            }
          }
        },
        {
          "name": "Mark as Shipped",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"action\": \"mark-shipped\",\n  \"orderIds\": [\"{{order_id}}\"],\n  \"trackingInfo\": {\n    \"trackingId\": \"TRACK123\",\n    \"deliveryPartner\": \"DHL\"\n  }\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/bulk-action",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "bulk-action"]
            }
          }
        }
      ]
    },
    {
      "name": "Refunds",
      "item": [
        {
          "name": "Full Refund",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 2500.00,\n  \"reason\": \"Customer dissatisfied\",\n  \"notifyCustomer\": true\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/{{order_id}}/refund",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "{{order_id}}", "refund"]
            }
          }
        },
        {
          "name": "Partial Refund",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 750.00,\n  \"reason\": \"Item damaged\",\n  \"refundItems\": [\n    {\"itemId\": \"{{item_id}}\", \"quantity\": 1}\n  ],\n  \"notifyCustomer\": true\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/{{order_id}}/refund",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "{{order_id}}", "refund"]
            }
          }
        }
      ]
    },
    {
      "name": "Get Orders",
      "item": [
        {
          "name": "Get All Orders",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/merchant/orders?page=1&limit=20",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders"],
              "query": [
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "20"}
              ]
            }
          }
        },
        {
          "name": "Get Filtered Orders",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/merchant/orders?status=confirmed&paymentStatus=paid&page=1&limit=20",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders"],
              "query": [
                {"key": "status", "value": "confirmed"},
                {"key": "paymentStatus", "value": "paid"},
                {"key": "page", "value": "1"},
                {"key": "limit", "value": "20"}
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Analytics",
      "item": [
        {
          "name": "Get Analytics",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/analytics",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "analytics"]
            }
          }
        },
        {
          "name": "Get Analytics (Date Range)",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{base_url}}/api/merchant/orders/analytics?startDate=2025-10-01&endDate=2025-11-17",
              "host": ["{{base_url}}"],
              "path": ["api", "merchant", "orders", "analytics"],
              "query": [
                {"key": "startDate", "value": "2025-10-01"},
                {"key": "endDate", "value": "2025-11-17"}
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5001"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_JWT_TOKEN_HERE"
    },
    {
      "key": "order_id",
      "value": "ORDER_ID_HERE"
    },
    {
      "key": "item_id",
      "value": "ITEM_ID_HERE"
    }
  ]
}
```

---

## Tips for Testing

1. **Get JWT Token**: First authenticate via `/api/merchant/auth/login` or `/api/user/auth/login`
2. **Replace Placeholders**: Update `YOUR_JWT_TOKEN`, `ORDER_ID`, etc. with real values
3. **Check Logs**: Monitor backend console for detailed operation logs
4. **Test Order States**: Create orders in different states to test transitions
5. **Test Razorpay**: Use Razorpay sandbox for refund testing

---

## Expected Responses

### Success Response (Bulk Action)
```json
{
  "success": true,
  "message": "Bulk action completed: 3 succeeded, 0 failed",
  "data": {
    "success": 3,
    "failed": 0,
    "errors": []
  }
}
```

### Success Response (Refund)
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "rfnd_ABC123",
    "status": "processed",
    "amount": 1500.00,
    "orderNumber": "ORD17318...",
    "refundType": "partial",
    "estimatedArrival": "2025-11-24T00:00:00Z",
    "remainingRefundableAmount": 500.00
  }
}
```

### Error Response (Invalid Status)
```json
{
  "success": false,
  "message": "Cannot confirm order with status: delivered"
}
```

### Error Response (Invalid Refund)
```json
{
  "success": false,
  "message": "Refund amount (₹3000) exceeds eligible amount (₹2500)"
}
```

---

## Quick Test Flow

1. **Create/Find an order** in `placed` status
2. **Confirm it** using bulk-action
3. **Mark as shipped** with tracking
4. **Get orders** with various filters
5. **Process refund** (partial or full)
6. **View analytics** to see updated stats

Happy Testing! 🧪
