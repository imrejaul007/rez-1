# Dashboard API - Quick Reference

## Base URL
```
/api/merchant/dashboard
```

## Authentication
All endpoints require merchant JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## 6 Core Endpoints

### 1. Complete Dashboard
```http
GET /api/merchant/dashboard
```
**Returns**: Metrics, activity, top products, alerts, sales chart

---

### 2. Metric Cards
```http
GET /api/merchant/dashboard/metrics
```
**Returns**: Revenue, orders, products, customers, AOV, conversion rate

---

### 3. Activity Feed
```http
GET /api/merchant/dashboard/activity?limit=20
```
**Query**: `limit` (default: 20)
**Returns**: Recent orders, products, team actions

---

### 4. Top Products
```http
GET /api/merchant/dashboard/top-products?period=30d&sortBy=revenue&limit=10
```
**Query**:
- `period`: "7d" | "30d" | "90d" (default: "30d")
- `sortBy`: "revenue" | "quantity" (default: "revenue")
- `limit`: number (default: 10)

**Returns**: Best selling products with revenue and quantity

---

### 5. Sales Chart Data
```http
GET /api/merchant/dashboard/sales-data?period=30d&granularity=day
```
**Query**:
- `period`: "7d" | "30d" | "90d" (default: "30d")
- `granularity`: "day" | "week" | "month" (default: "day")

**Returns**: Time series data for charts

---

### 6. Low Stock Alerts
```http
GET /api/merchant/dashboard/low-stock?threshold=10
```
**Query**: `threshold` (default: 10)
**Returns**: Products below stock threshold

---

## Response Format

All endpoints return:
```json
{
  "success": true,
  "data": { ... }
}
```

Error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical details"
}
```

---

## Quick Test

```bash
# Get complete dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/merchant/dashboard

# Get just metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/merchant/dashboard/metrics

# Get top 5 products (7 days)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/merchant/dashboard/top-products?period=7d&limit=5"

# Get weekly sales data
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/merchant/dashboard/sales-data?period=30d&granularity=week"

# Get low stock items (threshold 5)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/merchant/dashboard/low-stock?threshold=5"
```

---

## Frontend Integration

```typescript
const dashboard = await fetch('/api/merchant/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log(dashboard.data.metrics.totalRevenue.value);
console.log(dashboard.data.recentActivity);
console.log(dashboard.data.topProducts);
console.log(dashboard.data.lowStockAlerts);
console.log(dashboard.data.salesChart);
```

---

## Key Features

✅ All data filtered by merchant ID automatically
✅ Parallel data fetching for performance
✅ Flexible time periods and sorting
✅ Real-time activity feed
✅ Growth percentages calculated
✅ Trend indicators (up/down/neutral)
✅ Ready for caching (Redis recommended)
✅ Comprehensive error handling

---

## Files

- Routes: `src/merchantroutes/dashboard.ts`
- Service: `src/merchantservices/BusinessMetrics.ts`
- Models: `src/models/MerchantProduct.ts`, `MerchantOrder.ts`, `Cashback.ts`

---

**Status**: Production Ready ✅
**Last Updated**: November 17, 2025
