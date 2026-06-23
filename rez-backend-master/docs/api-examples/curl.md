# cURL API Examples

## Authentication

### Register Merchant

```bash
curl -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Tech Store",
    "ownerName": "John Smith",
    "email": "john@techstore.com",
    "password": "SecurePass123!",
    "phone": "+1234567890",
    "businessAddress": {
      "street": "456 Tech Avenue",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94105",
      "country": "USA"
    }
  }'
```

### Login

```bash
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@techstore.com",
    "password": "SecurePass123!"
  }'
```

### Get Current Merchant

```bash
curl -X GET http://localhost:5001/api/merchant/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Logout

```bash
curl -X POST http://localhost:5001/api/merchant/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Forgot Password

```bash
curl -X POST http://localhost:5001/api/merchant/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@techstore.com"
  }'
```

### Reset Password

```bash
curl -X POST http://localhost:5001/api/merchant/auth/reset-password/RESET_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePass123!",
    "confirmPassword": "NewSecurePass123!"
  }'
```

## Products

### List Products

```bash
# All products
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With pagination
curl -X GET "http://localhost:5001/api/merchant/products?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With filters
curl -X GET "http://localhost:5001/api/merchant/products?category=clothing&minPrice=10&maxPrice=100" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search
curl -X GET "http://localhost:5001/api/merchant/products?search=shirt" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Single Product

```bash
curl -X GET http://localhost:5001/api/merchant/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Product

```bash
curl -X POST http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium T-Shirt",
    "description": "High quality cotton t-shirt",
    "price": 29.99,
    "compareAtPrice": 39.99,
    "costPrice": 15.00,
    "sku": "TSH-BLU-M",
    "inventory": 100,
    "lowStockThreshold": 10,
    "category": "Clothing",
    "tags": ["fashion", "summer", "casual"],
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ]
  }'
```

### Update Product

```bash
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 24.99,
    "inventory": 150
  }'
```

### Delete Product

```bash
curl -X DELETE http://localhost:5001/api/merchant/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Product Inventory

```bash
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID/inventory \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "inventory": 200
  }'
```

### Toggle Product Active Status

```bash
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID/toggle-active \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Low Stock Products

```bash
curl -X GET http://localhost:5001/api/merchant/products/low-stock \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Product Variants

### List Product Variants

```bash
curl -X GET http://localhost:5001/api/merchant/products/PRODUCT_ID/variants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Add Product Variant

```bash
curl -X POST http://localhost:5001/api/merchant/products/PRODUCT_ID/variants \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "size",
    "value": "Large",
    "sku": "TSH-BLU-L",
    "price": 32.99,
    "stock": 75
  }'
```

### Update Product Variant

```bash
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID/variants/VARIANT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 100,
    "price": 31.99
  }'
```

### Delete Product Variant

```bash
curl -X DELETE http://localhost:5001/api/merchant/products/PRODUCT_ID/variants/VARIANT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Orders

### List Orders

```bash
# All orders
curl -X GET http://localhost:5001/api/merchant/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Filter by status
curl -X GET "http://localhost:5001/api/merchant/orders?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Filter by date range
curl -X GET "http://localhost:5001/api/merchant/orders?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With pagination
curl -X GET "http://localhost:5001/api/merchant/orders?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Single Order

```bash
curl -X GET http://localhost:5001/api/merchant/orders/ORDER_ID \
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

### Confirm Order

```bash
curl -X PUT http://localhost:5001/api/merchant/orders/ORDER_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Ship Order

```bash
curl -X PUT http://localhost:5001/api/merchant/orders/ORDER_ID/ship \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "TRK123456789",
    "carrier": "FedEx"
  }'
```

### Cancel Order

```bash
curl -X POST http://localhost:5001/api/merchant/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer request"
  }'
```

### Refund Order

```bash
curl -X POST http://localhost:5001/api/merchant/orders/ORDER_ID/refund \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 129.99,
    "reason": "Defective product"
  }'
```

### Generate Invoice

```bash
curl -X GET http://localhost:5001/api/merchant/orders/ORDER_ID/invoice \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output invoice.pdf
```

## Analytics

### Get Overview

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/overview \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Revenue Analytics

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/revenue \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Sales Data (Daily)

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/sales/daily \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Sales Data (Monthly)

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/sales/monthly \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Product Performance

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Customer Analytics

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Revenue Forecast

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/forecast/revenue \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Team Management

### List Team Members

```bash
curl -X GET http://localhost:5001/api/merchant/team \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
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

### Update Team Member Role

```bash
curl -X PUT http://localhost:5001/api/merchant/team/MEMBER_ID/role \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "manager"
  }'
```

### Remove Team Member

```bash
curl -X DELETE http://localhost:5001/api/merchant/team/MEMBER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Suspend Team Member

```bash
curl -X PUT http://localhost:5001/api/merchant/team/MEMBER_ID/suspend \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Dashboard

### Get Dashboard Summary

```bash
curl -X GET http://localhost:5001/api/merchant/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Recent Orders

```bash
curl -X GET http://localhost:5001/api/merchant/dashboard/recent-orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Top Products

```bash
curl -X GET http://localhost:5001/api/merchant/dashboard/top-products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Alerts

```bash
curl -X GET http://localhost:5001/api/merchant/dashboard/alerts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Audit Logs

### List Audit Logs

```bash
curl -X GET http://localhost:5001/api/merchant/audit/logs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Filter by Action

```bash
curl -X GET "http://localhost:5001/api/merchant/audit/logs/action/product:update" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Filter by User

```bash
curl -X GET http://localhost:5001/api/merchant/audit/logs/user/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Export Audit Logs

```bash
curl -X GET http://localhost:5001/api/merchant/audit/export \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output audit-logs.json
```

## Bulk Operations

### Bulk Create Products

```bash
curl -X POST http://localhost:5001/api/merchant/products/bulk-create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "name": "Product 1",
        "price": 19.99,
        "inventory": 100
      },
      {
        "name": "Product 2",
        "price": 29.99,
        "inventory": 50
      }
    ]
  }'
```

### Import Products from CSV

```bash
curl -X POST http://localhost:5001/api/merchant/bulk/import/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@products.csv"
```

### Export Products

```bash
curl -X GET http://localhost:5001/api/merchant/bulk/export/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output products.csv
```

### Export Orders

```bash
curl -X GET http://localhost:5001/api/merchant/bulk/export/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output orders.csv
```

## Categories

### List Categories

```bash
curl -X GET http://localhost:5001/api/merchant/categories \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Category

```bash
curl -X POST http://localhost:5001/api/merchant/categories \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic products and accessories"
  }'
```

## Uploads

### Upload Image

```bash
curl -X POST http://localhost:5001/api/merchant/uploads/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@product-image.jpg"
```

### Upload Multiple Images

```bash
curl -X POST http://localhost:5001/api/merchant/uploads/images \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"
```

## Using Variables

Save token to a variable for reuse:

```bash
# Register and save token
TOKEN=$(curl -s -X POST http://localhost:5001/api/merchant/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Store",
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
  }' | jq -r '.data.token')

# Use token in subsequent requests
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer $TOKEN"
```

## Pretty Print JSON

Using `jq` for formatted output:

```bash
curl -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Save Response to File

```bash
curl -X GET http://localhost:5001/api/merchant/analytics/overview \
  -H "Authorization: Bearer $TOKEN" \
  --output analytics.json
```

## Verbose Output

For debugging:

```bash
curl -v -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

## Silent Mode with Status Code

```bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET http://localhost:5001/api/merchant/products \
  -H "Authorization: Bearer $TOKEN")

echo "HTTP Status: $HTTP_CODE"
```
