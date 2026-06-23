# Analytics API Quick Reference

**Base URL:** `/api/merchant/analytics`
**Auth Required:** Yes (Bearer token)

---

## 🎯 Quick Reference Table

| Endpoint | Method | Purpose | Cache TTL |
|----------|--------|---------|-----------|
| `/overview` | GET | Dashboard overview | 15 min |
| `/inventory/stockout-prediction` | GET | Stockout forecasts | 30 min |
| `/customers/insights` | GET | Customer analytics | 30 min |
| `/products/performance` | GET | Product metrics | 15 min |
| `/revenue/breakdown` | GET | Revenue by category/product | 30 min |
| `/comparison` | GET | Period comparison | Inherited |
| `/realtime` | GET | Today's metrics | 1 min |
| `/export/:exportId` | GET | Export status | 5 min |

---

## 📊 1. Dashboard Overview

```bash
GET /api/merchant/analytics/overview?period=30d
```

**Returns:** Sales, products, customers, inventory, and trends in one call.

**Use Case:** Main merchant dashboard

---

## 📦 2. Stockout Prediction

```bash
# All critical products
GET /api/merchant/analytics/inventory/stockout-prediction

# Specific product
GET /api/merchant/analytics/inventory/stockout-prediction?productId=abc123
```

**Returns:** Days until stockout, reorder recommendations

**Use Case:** Inventory alerts and reorder management

---

## 👥 3. Customer Insights

```bash
GET /api/merchant/analytics/customers/insights
```

**Returns:** Total customers, new vs returning, lifetime value, top customers

**Use Case:** Customer analytics dashboard

---

## 🏆 4. Product Performance

```bash
GET /api/merchant/analytics/products/performance?limit=10&sortBy=revenue
```

**Query Params:**
- `limit`: Number of products (default: 10)
- `sortBy`: `revenue` or `quantity` (default: revenue)

**Use Case:** Best sellers report

---

## 💰 5. Revenue Breakdown

```bash
# By category
GET /api/merchant/analytics/revenue/breakdown?groupBy=category

# By product
GET /api/merchant/analytics/revenue/breakdown?groupBy=product

# By payment method
GET /api/merchant/analytics/revenue/breakdown?groupBy=paymentMethod
```

**Use Case:** Revenue composition analysis

---

## 📈 6. Period Comparison

```bash
GET /api/merchant/analytics/comparison?metric=revenue&period=7d
```

**Query Params:**
- `metric`: `revenue`, `orders`, or `customers`
- `period`: `7d`, `30d`, `90d`

**Returns:** Current vs previous period with change %

**Use Case:** Growth tracking

---

## ⚡ 7. Real-time Metrics

```bash
GET /api/merchant/analytics/realtime
```

**Returns:** Today's revenue, orders, and active customers

**Use Case:** Live dashboard widget

---

## 📤 8. Export Status

```bash
GET /api/merchant/analytics/export/:exportId
```

**Returns:** Export job status and download URL

**Use Case:** Data export feature

---

## 🔧 Common Patterns

### Error Handling
```typescript
try {
  const response = await fetch('/api/merchant/analytics/overview', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();

  if (!data.success) {
    console.error(data.message);
  }
} catch (error) {
  console.error('API Error:', error);
}
```

### Period Selection
```typescript
const periods = {
  today: '?period=today',
  week: '?period=week',
  month: '?period=month',
  custom: '?startDate=2025-01-01&endDate=2025-01-31'
};
```

---

## 📝 Response Format

All endpoints return:
```json
{
  "success": true|false,
  "data": { ... },
  "message": "Error message (if applicable)"
}
```

---

## 🚀 Performance Tips

1. **Use `/overview` instead of multiple calls** - Gets all dashboard data in one request
2. **Leverage caching** - Repeated calls within TTL return cached data
3. **Limit product queries** - Use `limit` parameter to reduce data transfer
4. **Filter stockout predictions** - Use `productId` for single product instead of fetching all

---

## 🔒 Security

- All endpoints require authentication
- Merchants can only access their own store's data
- Store ID automatically derived from auth token

---

## 📞 Support

For issues or questions:
- Check `AGENT_3_ANALYTICS_STANDARDIZATION_REPORT.md` for detailed docs
- Review response format examples in the full report
- Verify auth token is valid and not expired

---

**Last Updated:** 2025-11-17
**Version:** 1.0
