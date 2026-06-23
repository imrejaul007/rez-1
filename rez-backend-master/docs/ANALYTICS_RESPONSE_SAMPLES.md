# Analytics API Response Samples

Complete response format examples for all 8 standardized endpoints.

---

## 1. GET `/api/merchant/analytics/overview`

### Request
```bash
GET /api/merchant/analytics/overview?period=30d
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "sales": {
      "totalRevenue": 15420.50,
      "totalOrders": 142,
      "averageOrderValue": 108.60,
      "revenueGrowth": 12.5,
      "ordersGrowth": 8.3
    },
    "products": {
      "topSelling": [
        {
          "productId": "60d5ec49f1b2c72b8c8e4f1a",
          "productName": "Wireless Earbuds Pro",
          "totalQuantity": 145,
          "totalRevenue": 14500.00,
          "orderCount": 89,
          "averagePrice": 100.00
        },
        {
          "productId": "60d5ec49f1b2c72b8c8e4f1b",
          "productName": "Smart Watch Ultra",
          "totalQuantity": 67,
          "totalRevenue": 13400.00,
          "orderCount": 67,
          "averagePrice": 200.00
        },
        {
          "productId": "60d5ec49f1b2c72b8c8e4f1c",
          "productName": "Phone Case Premium",
          "totalQuantity": 234,
          "totalRevenue": 4680.00,
          "orderCount": 156,
          "averagePrice": 20.00
        }
      ],
      "totalProducts": 234,
      "lowStockCount": 12
    },
    "customers": {
      "totalCustomers": 450,
      "newCustomers": 23,
      "returningCustomers": 89,
      "repeatRate": 45.8,
      "avgLifetimeValue": 450.75
    },
    "inventory": {
      "inStock": 210,
      "lowStock": 12,
      "outOfStock": 8,
      "totalProducts": 234
    },
    "trends": [
      { "date": "2025-11-10", "revenue": 1200.50, "orders": 15, "averageOrderValue": 80.03, "items": 45 },
      { "date": "2025-11-11", "revenue": 980.25, "orders": 12, "averageOrderValue": 81.69, "items": 38 },
      { "date": "2025-11-12", "revenue": 1450.75, "orders": 18, "averageOrderValue": 80.60, "items": 52 },
      { "date": "2025-11-13", "revenue": 1320.00, "orders": 16, "averageOrderValue": 82.50, "items": 48 },
      { "date": "2025-11-14", "revenue": 1580.30, "orders": 19, "averageOrderValue": 83.17, "items": 58 },
      { "date": "2025-11-15", "revenue": 890.00, "orders": 11, "averageOrderValue": 80.91, "items": 34 },
      { "date": "2025-11-16", "revenue": 1100.50, "orders": 14, "averageOrderValue": 78.61, "items": 42 }
    ],
    "period": {
      "start": "2025-10-18T00:00:00.000Z",
      "end": "2025-11-17T23:59:59.999Z"
    }
  }
}
```

---

## 2. GET `/api/merchant/analytics/inventory/stockout-prediction`

### Request (All Products)
```bash
GET /api/merchant/analytics/inventory/stockout-prediction
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1a",
      "productName": "Wireless Earbuds Pro",
      "currentStock": 3,
      "dailyAverageSales": 1.5,
      "predictedStockoutDate": "2025-11-19T00:00:00.000Z",
      "daysUntilStockout": 2,
      "recommendedReorderQuantity": 67,
      "recommendedReorderDate": "2025-11-17T00:00:00.000Z",
      "priority": "critical"
    },
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1b",
      "productName": "Smart Watch Ultra",
      "currentStock": 12,
      "dailyAverageSales": 2.2,
      "predictedStockoutDate": "2025-11-23T00:00:00.000Z",
      "daysUntilStockout": 5,
      "recommendedReorderQuantity": 99,
      "recommendedReorderDate": "2025-11-18T00:00:00.000Z",
      "priority": "high"
    },
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1c",
      "productName": "Phone Case Premium",
      "currentStock": 25,
      "dailyAverageSales": 2.5,
      "predictedStockoutDate": "2025-11-27T00:00:00.000Z",
      "daysUntilStockout": 10,
      "recommendedReorderQuantity": 112,
      "recommendedReorderDate": "2025-11-20T00:00:00.000Z",
      "priority": "medium"
    }
  ]
}
```

### Request (Single Product)
```bash
GET /api/merchant/analytics/inventory/stockout-prediction?productId=60d5ec49f1b2c72b8c8e4f1a
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "productId": "60d5ec49f1b2c72b8c8e4f1a",
    "productName": "Wireless Earbuds Pro",
    "currentStock": 3,
    "dailyAverageSales": 1.5,
    "predictedStockoutDate": "2025-11-19T00:00:00.000Z",
    "daysUntilStockout": 2,
    "recommendedReorderQuantity": 67,
    "recommendedReorderDate": "2025-11-17T00:00:00.000Z",
    "priority": "critical"
  }
}
```

---

## 3. GET `/api/merchant/analytics/customers/insights`

### Request
```bash
GET /api/merchant/analytics/customers/insights
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalCustomers": 450,
    "newCustomers": 23,
    "returningCustomers": 89,
    "averageOrdersPerCustomer": 3.2,
    "customerLifetimeValue": 450.75,
    "repeatCustomerRate": 45.8,
    "topCustomers": [
      {
        "userId": "60d5ec49f1b2c72b8c8e4f2a",
        "userName": "Customer 60d5ec49",
        "totalOrders": 15,
        "totalSpent": 3500.50,
        "lastOrderDate": "2025-11-15T14:30:00.000Z"
      },
      {
        "userId": "60d5ec49f1b2c72b8c8e4f2b",
        "userName": "Customer 60d5ec49",
        "totalOrders": 12,
        "totalSpent": 2800.75,
        "lastOrderDate": "2025-11-14T10:15:00.000Z"
      },
      {
        "userId": "60d5ec49f1b2c72b8c8e4f2c",
        "userName": "Customer 60d5ec49",
        "totalOrders": 10,
        "totalSpent": 2200.00,
        "lastOrderDate": "2025-11-16T16:45:00.000Z"
      }
    ]
  }
}
```

---

## 4. GET `/api/merchant/analytics/products/performance`

### Request
```bash
GET /api/merchant/analytics/products/performance?limit=5&sortBy=revenue
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1a",
      "productName": "Wireless Earbuds Pro",
      "totalQuantity": 145,
      "totalRevenue": 14500.00,
      "orderCount": 89,
      "averagePrice": 100.00,
      "profitMargin": 30.00,
      "trend": "stable"
    },
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1b",
      "productName": "Smart Watch Ultra",
      "totalQuantity": 67,
      "totalRevenue": 13400.00,
      "orderCount": 67,
      "averagePrice": 200.00,
      "profitMargin": 30.00,
      "trend": "stable"
    },
    {
      "productId": "60d5ec49f1b2c72b8c8e4f1c",
      "productName": "Phone Case Premium",
      "totalQuantity": 234,
      "totalRevenue": 4680.00,
      "orderCount": 156,
      "averagePrice": 20.00,
      "profitMargin": 30.00,
      "trend": "stable"
    }
  ]
}
```

---

## 5. GET `/api/merchant/analytics/revenue/breakdown`

### Request (By Category)
```bash
GET /api/merchant/analytics/revenue/breakdown?groupBy=category
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "name": "Electronics",
      "revenue": 12400.50,
      "percentage": 35.5,
      "growth": 0
    },
    {
      "name": "Accessories",
      "revenue": 8200.30,
      "percentage": 23.4,
      "growth": 0
    },
    {
      "name": "Clothing",
      "revenue": 6500.00,
      "percentage": 18.6,
      "growth": 0
    },
    {
      "name": "Home & Garden",
      "revenue": 4800.75,
      "percentage": 13.7,
      "growth": 0
    },
    {
      "name": "Sports",
      "revenue": 3000.00,
      "percentage": 8.6,
      "growth": 0
    }
  ]
}
```

### Request (By Product)
```bash
GET /api/merchant/analytics/revenue/breakdown?groupBy=product
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "name": "Wireless Earbuds Pro",
      "revenue": 14500.00,
      "percentage": 42.5,
      "growth": 0
    },
    {
      "name": "Smart Watch Ultra",
      "revenue": 13400.00,
      "percentage": 39.3,
      "growth": 0
    },
    {
      "name": "Phone Case Premium",
      "revenue": 4680.00,
      "percentage": 13.7,
      "growth": 0
    }
  ]
}
```

### Request (By Payment Method)
```bash
GET /api/merchant/analytics/revenue/breakdown?groupBy=paymentMethod
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "name": "credit_card",
      "revenue": 18500.50,
      "percentage": 52.8,
      "growth": 0
    },
    {
      "name": "debit_card",
      "revenue": 9200.30,
      "percentage": 26.3,
      "growth": 0
    },
    {
      "name": "upi",
      "revenue": 5800.00,
      "percentage": 16.6,
      "growth": 0
    },
    {
      "name": "wallet",
      "revenue": 1520.00,
      "percentage": 4.3,
      "growth": 0
    }
  ]
}
```

---

## 6. GET `/api/merchant/analytics/comparison`

### Request
```bash
GET /api/merchant/analytics/comparison?metric=revenue&period=30d
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "metric": "revenue",
    "period": "30d",
    "current": 15420.50,
    "previous": 13500.00,
    "change": 1920.50,
    "changePercent": 14.22,
    "trend": "up"
  }
}
```

### Request (Orders Comparison)
```bash
GET /api/merchant/analytics/comparison?metric=orders&period=7d
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "metric": "orders",
    "period": "7d",
    "current": 45,
    "previous": 38,
    "change": 7,
    "changePercent": 18.42,
    "trend": "up"
  }
}
```

---

## 7. GET `/api/merchant/analytics/realtime`

### Request
```bash
GET /api/merchant/analytics/realtime
Authorization: Bearer eyJhbGc...
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "todayRevenue": 2450.75,
    "todayOrders": 28,
    "averageOrderValue": 87.53,
    "totalItems": 142,
    "activeCustomers": 23,
    "timestamp": "2025-11-17T14:30:45.123Z"
  }
}
```

---

## 8. GET `/api/merchant/analytics/export/:exportId`

### Request
```bash
GET /api/merchant/analytics/export/exp_abc123xyz
Authorization: Bearer eyJhbGc...
```

### Response (200 OK - Completed)
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123xyz",
    "storeId": "60d5ec49f1b2c72b8c8e4f1a",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "/api/merchant/analytics/download/exp_abc123xyz",
    "expiresAt": "2025-11-18T14:30:00.000Z",
    "createdAt": "2025-11-17T14:30:00.000Z"
  }
}
```

### Response (200 OK - Processing)
```json
{
  "success": true,
  "data": {
    "exportId": "exp_abc123xyz",
    "storeId": "60d5ec49f1b2c72b8c8e4f1a",
    "status": "processing",
    "progress": 67,
    "downloadUrl": null,
    "expiresAt": null,
    "createdAt": "2025-11-17T14:28:00.000Z"
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Store not found for merchant"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch analytics overview",
  "error": "Database connection timeout"
}
```

### 400 Bad Request (Invalid Parameters)
```json
{
  "success": false,
  "message": "Invalid groupBy parameter. Use: category, product, or paymentMethod"
}
```

---

## TypeScript Interfaces

```typescript
// Overview Response
interface OverviewResponse {
  success: boolean;
  data: {
    sales: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      revenueGrowth: number;
      ordersGrowth: number;
    };
    products: {
      topSelling: TopProduct[];
      totalProducts: number;
      lowStockCount: number;
    };
    customers: {
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      repeatRate: number;
      avgLifetimeValue: number;
    };
    inventory: {
      inStock: number;
      lowStock: number;
      outOfStock: number;
      totalProducts: number;
    };
    trends: RevenueTrendData[];
    period: {
      start: string;
      end: string;
    };
  };
}

// Stockout Prediction Response
interface StockoutPredictionResponse {
  success: boolean;
  data: StockoutPrediction | StockoutPrediction[];
}

interface StockoutPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  dailyAverageSales: number;
  predictedStockoutDate: string | null;
  daysUntilStockout: number | null;
  recommendedReorderQuantity: number;
  recommendedReorderDate: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// Product Performance Response
interface ProductPerformanceResponse {
  success: boolean;
  data: EnhancedProduct[];
}

interface EnhancedProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  averagePrice: number;
  profitMargin: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Revenue Breakdown Response
interface RevenueBreakdownResponse {
  success: boolean;
  data: RevenueBreakdownItem[];
}

interface RevenueBreakdownItem {
  name: string;
  revenue: number;
  percentage: number;
  growth: number;
}

// Comparison Response
interface ComparisonResponse {
  success: boolean;
  data: {
    metric: string;
    period: string;
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// Realtime Response
interface RealtimeResponse {
  success: boolean;
  data: {
    todayRevenue: number;
    todayOrders: number;
    averageOrderValue: number;
    totalItems: number;
    activeCustomers: number;
    timestamp: string;
  };
}

// Export Response
interface ExportResponse {
  success: boolean;
  data: {
    exportId: string;
    storeId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl: string | null;
    expiresAt: string | null;
    createdAt: string;
  };
}
```

---

**Last Updated:** 2025-11-17
**Version:** 1.0
