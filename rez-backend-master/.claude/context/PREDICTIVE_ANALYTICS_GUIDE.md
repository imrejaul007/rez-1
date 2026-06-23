# Predictive Analytics Guide

## Overview

The Predictive Analytics Service uses statistical methods to forecast sales, predict stockouts, analyze seasonal trends, and forecast demand. This guide explains the algorithms, accuracy, and best practices.

## Forecasting Methods

### 1. Linear Regression (Sales Forecasting)

**Used For:** Sales and revenue prediction

**How It Works:**
```
y = mx + b

Where:
- y = predicted revenue
- x = day number (time)
- m = slope (trend)
- b = intercept (baseline)
```

**Algorithm:**
1. Collects last 90 days of sales data
2. Calculates linear regression line
3. Projects future values based on trend
4. Adds confidence intervals (±1.96 × standard deviation)

**Example:**
```typescript
const forecast = await PredictiveAnalyticsService.forecastSales(storeId, 7);

// Returns:
{
  forecast: [
    {
      date: "2025-11-18",
      predictedRevenue: 4850.25,
      predictedOrders: 12,
      confidenceLower: 3200.50,  // 95% confidence
      confidenceUpper: 6500.00
    }
  ],
  trend: "increasing",  // or "decreasing", "stable"
  accuracy: 87.5  // based on MAPE
}
```

**Accuracy Factors:**
- **High Accuracy (>90%)**: Stable, consistent sales pattern
- **Medium Accuracy (70-90%)**: Some volatility, but clear trend
- **Low Accuracy (<70%)**: High volatility, seasonal spikes

### 2. Moving Averages (Demand Forecasting)

**Used For:** Product demand prediction

**How It Works:**
```
Weekly Demand = Average(Last 12 Weeks)
Next Week = Weighted Average(Recent Weeks)
```

**Algorithm:**
1. Calculates weekly sales for last 90 days
2. Uses simple moving average for baseline
3. Applies exponential smoothing (α=0.3) for recent trends
4. Adds safety stock based on volatility

**Example:**
```typescript
const demand = await PredictiveAnalyticsService.forecastDemand(productId);

// Returns:
{
  nextWeekDemand: 24,
  nextMonthDemand: 96,
  recommendedStock: 240,  // 2 months + safety stock
  reorderPoint: 48,       // 1 week + safety stock
  economicOrderQuantity: 120
}
```

**Safety Stock Calculation:**
```
Safety Stock = 2 × Standard Deviation of Weekly Sales
```

### 3. Seasonal Decomposition (Trend Analysis)

**Used For:** Identifying patterns (monthly, weekly, daily)

**How It Works:**
```
Seasonal Index = Period Average / Overall Average

Index > 1.0 = Above average (peak period)
Index = 1.0 = Average
Index < 1.0 = Below average (slow period)
```

**Algorithm:**
1. Groups sales by period (month/week/hour)
2. Calculates average for each period
3. Compares to overall average
4. Identifies peak and slow periods

**Example:**
```typescript
const seasonal = await PredictiveAnalyticsService.analyzeSeasonalTrends(
  storeId,
  'monthly'
);

// Returns:
{
  trends: [
    {
      period: "Jan",
      averageRevenue: 45000,
      averageOrders: 120,
      index: 0.85  // 15% below average
    },
    {
      period: "Nov",
      averageRevenue: 68000,
      averageOrders: 180,
      index: 1.28  // 28% above average (Black Friday)
    }
  ],
  insights: [
    "Peak period: November with 68000 average revenue",
    "2 high-performing periods (20%+ above average)"
  ]
}
```

### 4. Stockout Prediction

**Used For:** Predicting when products run out of stock

**How It Works:**
```
Days Until Stockout = Current Stock / Daily Average Sales
Reorder Point = (Lead Time × Daily Sales) + Safety Stock
```

**Algorithm:**
1. Calculates daily average sales (last 30 days)
2. Divides current stock by daily rate
3. Suggests reorder point (7 days lead time)
4. Prioritizes by urgency

**Example:**
```typescript
const stockout = await PredictiveAnalyticsService.predictStockout(productId);

// Returns:
{
  currentStock: 45,
  dailyAverageSales: 3.2,
  daysUntilStockout: 14,
  predictedStockoutDate: "2025-12-01",
  recommendedReorderDate: "2025-11-24",  // 7 days before
  priority: "medium"  // critical|high|medium|low
}
```

**Priority Levels:**
- **Critical**: ≤3 days until stockout
- **High**: 4-7 days
- **Medium**: 8-14 days
- **Low**: >14 days

## Accuracy Measurement

### MAPE (Mean Absolute Percentage Error)

Used to measure forecast accuracy:

```
MAPE = (1/n) × Σ |Actual - Forecast| / |Actual| × 100%

Accuracy = 100% - MAPE
```

**Interpretation:**
- **>90% Accuracy**: Excellent, trust the forecast
- **80-90% Accuracy**: Good, reliable for planning
- **70-80% Accuracy**: Fair, consider margin of error
- **<70% Accuracy**: Poor, insufficient data or high volatility

**Improving Accuracy:**
1. **More Historical Data**: Use 90+ days instead of 30
2. **Remove Anomalies**: Filter out one-time spikes
3. **Seasonal Adjustments**: Account for known patterns
4. **Regular Updates**: Recompute forecasts weekly

## Confidence Intervals

All forecasts include 95% confidence intervals:

```
Confidence Interval = ±1.96 × Standard Deviation

Lower Bound = Forecast - 1.96σ
Upper Bound = Forecast + 1.96σ
```

**Interpretation:**
- **Narrow Range**: Low volatility, high confidence
- **Wide Range**: High volatility, less certainty

**Example:**
```json
{
  "predictedRevenue": 5000,
  "confidenceLower": 4200,
  "confidenceUpper": 5800
}
```

This means: "95% confident revenue will be between ₹4,200 and ₹5,800"

## Economic Order Quantity (EOQ)

Calculates optimal reorder quantity:

```
EOQ = √(2 × Annual Demand × Order Cost / Holding Cost)
```

**Simplified Formula:**
```
EOQ ≈ √(2 × Monthly Demand × 100 / 5)
```

**Assumptions:**
- Order Cost: ₹100 per order
- Holding Cost: ₹5 per unit per month (storage, insurance, etc.)

**Example:**
```
Monthly Demand = 100 units
EOQ = √(2 × 100 × 100 / 5) = √4000 ≈ 63 units

Recommendation: Order 63 units at a time
```

## Best Practices

### 1. Data Requirements

**Minimum Data:**
- Sales Forecasting: 30 days (prefer 90 days)
- Seasonal Analysis: 90 days (prefer 365 days)
- Stockout Prediction: 30 days
- Demand Forecasting: 60 days

**Data Quality:**
- Remove test orders
- Exclude refunded orders
- Handle data gaps (fill with zeros)
- Normalize for promotional periods

### 2. Forecast Frequency

**Update Schedules:**
- Sales Forecast: Daily (morning)
- Stockout Alerts: 2x daily
- Seasonal Analysis: Weekly
- Demand Forecast: Weekly

### 3. Interpretation Tips

**Trend Analysis:**
```
"increasing" → Expect growth, increase inventory
"stable" → Maintain current levels
"decreasing" → Reduce orders, clear excess stock
```

**Stockout Priority:**
```
"critical" → Order immediately, expedite shipping
"high" → Order this week
"medium" → Order within 2 weeks
"low" → Schedule for next month
```

**Seasonal Index:**
```
index > 1.2 → Peak period, stock up 20%+
index 0.8-1.2 → Normal period
index < 0.8 → Slow period, reduce stock 20%+
```

### 4. Handling Special Cases

**Promotions/Sales:**
- Exclude from training data (outliers)
- Or create separate forecast for promotional periods

**New Products:**
- Use category averages if <30 days data
- Compare to similar products
- Start with conservative forecasts

**Seasonal Products:**
- Use year-over-year data
- Don't forecast off-season
- Adjust for market trends

**Stockouts in History:**
- Lost sales not captured
- Actual demand higher than recorded
- Adjust upward by 10-20%

## Integration Examples

### Dashboard Widget

```typescript
// Get 7-day forecast for dashboard card
const forecast = await PredictiveAnalyticsService.forecastSales(storeId, 7);

// Display:
// "Next Week Forecast: ₹{totalPredictedRevenue}"
// "Trend: {trend}"
// "Confidence: {accuracy}%"
```

### Inventory Alert System

```typescript
// Check all products daily
const products = await Product.find({ store: storeId });

for (const product of products) {
  const stockout = await PredictiveAnalyticsService.predictStockout(
    product._id
  );

  if (stockout.priority === 'critical') {
    await sendAlert({
      title: 'Critical Stock Alert',
      message: `${product.name} will run out in ${stockout.daysUntilStockout} days`,
      action: 'Reorder Now'
    });
  }
}
```

### Automated Reordering

```typescript
// Auto-generate purchase orders
const demand = await PredictiveAnalyticsService.forecastDemand(productId);

if (product.inventory.stock <= demand.reorderPoint) {
  await createPurchaseOrder({
    productId,
    quantity: demand.economicOrderQuantity,
    supplier: product.supplier,
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
}
```

## Limitations

### What Forecasting Can't Do

1. **Predict Black Swan Events**: COVID-19, natural disasters, viral trends
2. **Account for Competitors**: New competitor opens nearby
3. **Forecast New Markets**: No historical data
4. **Capture External Factors**: Weather, economy, regulations

### Mitigation Strategies

1. **Manual Overrides**: Allow merchants to adjust forecasts
2. **Multiple Scenarios**: Best case, expected, worst case
3. **Real-Time Adjustments**: Update as new data comes in
4. **External Indicators**: Integrate weather, holidays, events

## Future Enhancements

### Phase 1 (Current)
- ✅ Linear regression for sales
- ✅ Moving averages for demand
- ✅ Seasonal decomposition
- ✅ Stockout prediction

### Phase 2 (Future)
- [ ] ARIMA models (better for seasonal data)
- [ ] Prophet (Facebook's forecasting library)
- [ ] Machine Learning (TensorFlow.js)
- [ ] Sentiment analysis (reviews, social media)

### Phase 3 (Advanced)
- [ ] Multi-variate forecasting (weather, events, etc.)
- [ ] Anomaly detection (fraud, unusual patterns)
- [ ] Competitive intelligence (market trends)
- [ ] Personalized forecasts per customer segment

## References

**Statistical Methods:**
- Linear Regression: [Wikipedia](https://en.wikipedia.org/wiki/Linear_regression)
- Exponential Smoothing: [Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing)
- MAPE: [Wikipedia](https://en.wikipedia.org/wiki/Mean_absolute_percentage_error)

**Libraries:**
- simple-statistics: [Documentation](https://simplestatistics.org/)

**Further Reading:**
- "Forecasting: Principles and Practice" by Hyndman & Athanasopoulos
- "Demand Forecasting for Inventory Control" by Ord, Fildes & Kourentzes
