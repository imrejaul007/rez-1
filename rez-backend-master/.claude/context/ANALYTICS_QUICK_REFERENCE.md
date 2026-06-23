# Analytics Quick Reference

## API Endpoints

### Sales Analytics

```bash
# Sales overview with growth metrics
GET /api/merchant/analytics/sales/overview
Query params: period (today|yesterday|week|month|quarter|year|custom)
             startDate, endDate (for custom range)

# Revenue trends over time
GET /api/merchant/analytics/sales/trends
Query params: period (daily|weekly|monthly), days (default: 30)

# Sales by time of day
GET /api/merchant/analytics/sales/by-time

# Sales by day of week
GET /api/merchant/analytics/sales/by-day
```

### Product Analytics

```bash
# Top selling products
GET /api/merchant/analytics/products/top-selling
Query params: limit (default: 10), sortBy (quantity|revenue)
```

### Category Analytics

```bash
# Category performance
GET /api/merchant/analytics/categories/performance
```

### Customer Analytics

```bash
# Customer insights
GET /api/merchant/analytics/customers/insights
```

### Inventory Analytics

```bash
# Inventory status and alerts
GET /api/merchant/analytics/inventory/status
```

### Payment Analytics

```bash
# Payment method breakdown
GET /api/merchant/analytics/payments/breakdown
```

### Predictive Analytics

```bash
# Sales forecast
GET /api/merchant/analytics/forecast/sales
Query params: days (default: 7, max: 90)

# Stockout prediction for specific product
GET /api/merchant/analytics/forecast/stockout/:productId

# Demand forecast for specific product
GET /api/merchant/analytics/forecast/demand/:productId

# Seasonal trends analysis
GET /api/merchant/analytics/trends/seasonal
Query params: type (monthly|weekly|daily)
```

### Cache Management

```bash
# Warm up cache (pre-compute common queries)
POST /api/merchant/analytics/cache/warm-up

# Invalidate all analytics cache
POST /api/merchant/analytics/cache/invalidate

# Get cache statistics
GET /api/merchant/analytics/cache/stats
```

## Response Examples

### Sales Overview
```json
{
  "success": true,
  "data": {
    "totalRevenue": 145230.50,
    "totalOrders": 342,
    "averageOrderValue": 424.65,
    "totalItems": 1856,
    "previousPeriodRevenue": 128450.25,
    "previousPeriodOrders": 298,
    "revenueGrowth": 13.07,
    "ordersGrowth": 14.77,
    "period": {
      "start": "2025-10-17T00:00:00.000Z",
      "end": "2025-11-17T23:59:59.999Z"
    }
  }
}
```

### Top Products
```json
{
  "success": true,
  "data": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "productName": "Premium T-Shirt",
      "totalQuantity": 145,
      "totalRevenue": 7250.00,
      "orderCount": 87,
      "averagePrice": 50.00
    }
  ]
}
```

### Sales Forecast
```json
{
  "success": true,
  "data": {
    "forecastDays": 7,
    "historical": [...],
    "forecast": [
      {
        "date": "2025-11-18",
        "predictedRevenue": 4850.25,
        "predictedOrders": 12,
        "confidenceLower": 3200.50,
        "confidenceUpper": 6500.00
      }
    ],
    "totalPredictedRevenue": 33951.75,
    "averageDailyRevenue": 4850.25,
    "trend": "increasing",
    "accuracy": 87.5
  }
}
```

### Stockout Prediction
```json
{
  "success": true,
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "productName": "Premium T-Shirt",
    "currentStock": 45,
    "dailyAverageSales": 3.2,
    "predictedStockoutDate": "2025-12-01T00:00:00.000Z",
    "daysUntilStockout": 14,
    "recommendedReorderQuantity": 144,
    "recommendedReorderDate": "2025-11-24T00:00:00.000Z",
    "priority": "medium"
  }
}
```

### Inventory Status
```json
{
  "success": true,
  "data": {
    "totalProducts": 450,
    "inStockProducts": 423,
    "lowStockProducts": 18,
    "outOfStockProducts": 9,
    "overstockedProducts": 12,
    "lowStockItems": [
      {
        "productId": "...",
        "productName": "Blue Jeans",
        "currentStock": 4,
        "lowStockThreshold": 5,
        "reorderLevel": 10
      }
    ],
    "outOfStockItems": [...]
  }
}
```

## Service Usage (Backend)

### AnalyticsService

```typescript
import { AnalyticsService } from '../merchantservices/AnalyticsService';

// Get sales overview
const overview = await AnalyticsService.getSalesOverview(
  storeId,
  startDate,
  endDate
);

// Get revenue trends
const trends = await AnalyticsService.getRevenueTrends(
  storeId,
  'daily',
  30
);

// Get top products
const topProducts = await AnalyticsService.getTopSellingProducts(
  storeId,
  10,
  'revenue'
);

// Get category performance
const categories = await AnalyticsService.getCategoryPerformance(storeId);

// Get customer insights
const customers = await AnalyticsService.getCustomerInsights(storeId);

// Get inventory status
const inventory = await AnalyticsService.getInventoryStatus(storeId);
```

### PredictiveAnalyticsService

```typescript
import { PredictiveAnalyticsService } from '../merchantservices/PredictiveAnalyticsService';

// Forecast sales
const forecast = await PredictiveAnalyticsService.forecastSales(
  storeId,
  7 // days
);

// Predict stockout
const stockout = await PredictiveAnalyticsService.predictStockout(
  productId
);

// Analyze seasonal trends
const seasonal = await PredictiveAnalyticsService.analyzeSeasonalTrends(
  storeId,
  'monthly'
);

// Forecast demand
const demand = await PredictiveAnalyticsService.forecastDemand(
  productId
);
```

### AnalyticsCacheService

```typescript
import { AnalyticsCacheService } from '../merchantservices/AnalyticsCacheService';

// Get or compute with caching
const data = await AnalyticsCacheService.getOrCompute(
  'my-cache-key',
  async () => {
    // Expensive computation
    return await AnalyticsService.getSalesOverview(...);
  },
  { ttl: 900 } // 15 minutes
);

// Invalidate cache
await AnalyticsCacheService.invalidateStore(storeId);

// Warm up cache
await AnalyticsCacheService.warmUpCache(storeId);

// Check if cache is available
if (AnalyticsCacheService.isAvailable()) {
  // Redis is connected
}
```

## Cache TTL Guidelines

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Sales Overview | 15 min | Changes frequently with new orders |
| Revenue Trends | 15 min | Daily updates sufficient |
| Top Products | 30 min | Ranking changes slowly |
| Category Performance | 30 min | Stable over short periods |
| Customer Insights | 30 min | Customer metrics change gradually |
| Inventory Status | 10 min | Critical for stock alerts |
| Sales Forecast | 1 hour | Historical data changes slowly |
| Stockout Prediction | 30 min | Stock levels change moderately |

## Performance Tips

1. **Use date range filters**: Don't query all-time data
2. **Enable caching**: Reduces database load by 90%+
3. **Warm up cache**: Pre-compute on merchant login
4. **Monitor query times**: Alert if >500ms
5. **Use indexes**: All analytics queries use optimized indexes
6. **Limit result sets**: Default limits prevent huge responses

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details"
}
```

Common errors:
- `401`: Unauthorized (missing/invalid token)
- `404`: Store not found
- `422`: Invalid date range (>1 year)
- `500`: Database/Redis error

## Monitoring

Key metrics to monitor:
- **Query Performance**: Target <200ms for fresh data
- **Cache Hit Rate**: Target >90%
- **Forecast Accuracy**: Target >80%
- **Database Load**: Analytics should use <10% of total queries

## Troubleshooting

**Slow queries?**
- Check indexes are created: `db.orders.getIndexes()`
- Verify date ranges aren't too large
- Check Redis connection: `GET /api/merchant/analytics/cache/stats`

**Inaccurate forecasts?**
- Ensure sufficient historical data (30+ days)
- Check for data anomalies (spikes, gaps)
- Verify seasonal patterns are identified

**Cache not working?**
- Check Redis connection
- Verify TTL settings
- Ensure cache invalidation on updates

## Authentication

All analytics endpoints require merchant authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5001/api/merchant/analytics/sales/overview
```

Token must contain `merchantId` field that maps to a store.
