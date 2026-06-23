# Product Recommendation Diversity System

## 🎯 Overview

The Product Recommendation Diversity System is a comprehensive backend enhancement designed to eliminate duplicate products across recommendation sections and ensure variety in product recommendations. This system implements sophisticated algorithms to balance recommendations across categories, brands, and price ranges.

## 🚀 Features

- **Advanced Deduplication**: Eliminate duplicate products across multiple recommendation sections
- **Category Balancing**: Limit products per category to ensure variety
- **Brand Balancing**: Prevent single brands from dominating recommendations
- **Price Stratification**: Ensure representation from budget, mid-tier, and premium products
- **Diversity Scoring**: Calculate and track diversity metrics using Gini coefficient
- **Multiple Algorithms**: Support for hybrid, collaborative, and content-based recommendation modes
- **Intelligent Caching**: 5-minute TTL caching for optimal performance
- **Analytics Tracking**: Monitor diversity scores, response times, and usage patterns

## 📦 Components

### 1. Diversity Service (`diversityService.ts`)

Core service providing diversity algorithms.

**Key Functions:**
- `balanceByCategory(products, maxPerCategory)` - Limit products per category
- `balanceByBrand(products, maxPerBrand)` - Limit products per brand
- `balanceByPriceRange(products, ranges)` - Stratify by price
- `calculateDiversityScore(products)` - Return Gini coefficient (0-1)
- `applyDiversityMode(products, mode, options)` - Main algorithm

**Diversity Modes:**
- `balanced` - Balances across all dimensions (category, brand, price)
- `category_diverse` - Focuses on category diversity
- `price_diverse` - Focuses on price stratification

### 2. Diverse Recommendation Controller (`diverseRecommendationController.ts`)

Handles the `/api/v1/recommendations/diverse` endpoint.

**Algorithm:**
1. Fetch candidate products (5x requested limit)
2. Score each: `(0.6 × relevance) + (0.4 × diversity)`
3. Greedy selection maximizing diversity
4. Cache results (5 min TTL)

### 3. Enhanced Products API

Added `excludeProducts` and `diversityMode` parameters to existing products endpoints.

## 🔧 API Usage

### POST /api/v1/recommendations/diverse

Get diverse product recommendations with advanced deduplication.

**Request Body:**
```json
{
  "excludeProducts": ["507f1f77bcf86cd799439011"],
  "excludeStores": ["507f1f77bcf86cd799439012"],
  "shownProducts": ["507f1f77bcf86cd799439013"],
  "limit": 10,
  "context": "homepage",
  "options": {
    "minCategories": 3,
    "maxPerCategory": 2,
    "maxPerBrand": 2,
    "diversityScore": 0.7,
    "algorithm": "hybrid",
    "minRating": 3.0,
    "priceRanges": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Diverse recommendations retrieved successfully",
  "data": {
    "recommendations": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Product Name",
        "category": { "name": "Electronics" },
        "brand": "Apple",
        "pricing": { "selling": 1000 },
        "rating": { "average": 4.5 }
      }
    ],
    "metadata": {
      "categoriesShown": ["Electronics", "Fashion", "Home"],
      "brandsShown": ["Apple", "Nike", "IKEA"],
      "diversityScore": 0.83,
      "deduplicatedCount": 15,
      "priceDistribution": {
        "budget": 3,
        "mid": 4,
        "premium": 3
      },
      "algorithm": "hybrid",
      "context": "homepage",
      "requestedLimit": 10,
      "returnedCount": 10
    }
  }
}
```

### GET /api/v1/products?excludeProducts=...&diversityMode=...

Enhanced products endpoint with diversity support.

**Query Parameters:**
- `excludeProducts` - Comma-separated product IDs to exclude
- `diversityMode` - One of: `balanced`, `category_diverse`, `price_diverse`, `none`
- All existing parameters (category, store, price filters, etc.)

**Example:**
```
GET /api/v1/products?category=electronics&diversityMode=balanced&excludeProducts=507f1f77bcf86cd799439011,507f1f77bcf86cd799439012&limit=10
```

## 📊 Diversity Scoring

The diversity score is calculated using the Gini coefficient, a measure of statistical dispersion:

**Formula:**
```
diversityScore = (
  (1 - categoryGini) × 0.4 +  // 40% weight on category diversity
  (1 - brandGini) × 0.3 +     // 30% weight on brand diversity
  priceRangeScore × 0.3        // 30% weight on price diversity
)
```

**Score Interpretation:**
- `0.0 - 0.3`: Poor diversity (homogeneous)
- `0.3 - 0.5`: Fair diversity
- `0.5 - 0.7`: Good diversity
- `0.7 - 1.0`: Excellent diversity (heterogeneous)

**Target Score:** `≥ 0.7` for production recommendations

## 🎨 Algorithm Details

### Relevance Scoring

Products are scored based on multiple signals:

```typescript
relevanceScore = (
  ratingScore × 0.4 +        // Quality (0-1, based on 5-star scale)
  popularityScore × 0.3 +    // Popularity (views + purchases)
  recencyScore × 0.2 +       // Recency (bonus for new products)
  availabilityScore × 0.1    // Stock availability
)
```

### Diversity Contribution

Measures how much a product increases diversity:

```typescript
diversityContribution = (
  categoryDiversity × 0.4 +   // Uniqueness in category
  brandDiversity × 0.3 +      // Uniqueness in brand
  priceDiversity × 0.3        // Uniqueness in price range
)
```

### Hybrid Scoring

Final score combines both relevance and diversity:

```typescript
hybridScore = (relevance × 0.6) + (diversity × 0.4)
```

## 🧪 Testing

### Run Tests

```bash
# Run diversity service tests
npm test diversityService.test.ts

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

The test suite includes:
- ✅ Category balancing (4 tests)
- ✅ Brand balancing (3 tests)
- ✅ Price range balancing (4 tests)
- ✅ Diversity score calculation (4 tests)
- ✅ Diversity mode application (5 tests)
- ✅ Metadata generation (2 tests)
- ✅ Edge cases (3 tests)
- ✅ Performance tests (2 tests)

**Total: 27 comprehensive test cases**

## 📈 Performance Considerations

### Optimizations Implemented

1. **Candidate Limit**: Fetch 5x limit for good selection pool without overloading
2. **Lean Queries**: Use `.lean()` for 30-40% performance improvement
3. **Redis Caching**: 5-minute TTL prevents redundant computations
4. **Greedy Selection**: O(n²) worst case, but fast for typical use cases
5. **Async Analytics**: Track metrics without blocking response

### Performance Benchmarks

| Operation | Input Size | Time (ms) | Notes |
|-----------|-----------|-----------|-------|
| `balanceByCategory` | 1000 products | < 500 | Linear time O(n) |
| `calculateDiversityScore` | 500 products | < 1000 | Quadratic O(n²) but fast in practice |
| `applyDiversityMode` | 1000 products | < 5000 | Full pipeline |
| `/diverse` endpoint | 50 candidates | 200-500 | Including DB query |

### Recommended Limits

- **Max `limit` parameter**: 50 (enforced)
- **Candidate fetch multiplier**: 5x
- **Cache TTL**: 300 seconds (5 minutes)
- **Max products per category**: 2
- **Max products per brand**: 2

## 🔍 Monitoring & Analytics

### Tracked Metrics

The system automatically tracks:
- Diversity scores achieved
- API usage by context (homepage, product_page, etc.)
- Response times
- Cache hit rates
- Deduplication effectiveness

### Redis Analytics Storage

```typescript
// Analytics stored in Redis with 30-day retention
const analyticsKey = `analytics:recommendations:${date}`;

{
  "timestamp": "2025-01-14T10:30:00Z",
  "context": "homepage",
  "limit": 10,
  "diversityScore": 0.83,
  "responseTime": 245
}
```

### Retrieving Analytics

```bash
# Get today's analytics
redis-cli LRANGE analytics:recommendations:2025-01-14 0 -1

# Count requests
redis-cli LLEN analytics:recommendations:2025-01-14
```

## 🛠️ Configuration

### Environment Variables

No additional environment variables required. The system uses existing Redis and MongoDB connections.

### Tuning Parameters

Adjust these in controller or service as needed:

```typescript
// In diverseRecommendationController.ts
const candidateMultiplier = 5; // Fetch 5x candidates
const cacheTTL = 300; // 5 minutes

// Default options
const defaultOptions = {
  minCategories: 3,
  maxPerCategory: 2,
  maxPerBrand: 2,
  diversityScore: 0.7,
  minRating: 3.0,
  priceRanges: 3
};
```

## 🐛 Troubleshooting

### Issue: Low diversity scores

**Symptoms:** Diversity score consistently < 0.5

**Solutions:**
1. Increase `maxPerCategory` and `maxPerBrand`
2. Fetch more candidates (increase limit)
3. Reduce `minRating` threshold
4. Check product data quality (categories, brands)

### Issue: Empty recommendations

**Symptoms:** Empty array returned

**Solutions:**
1. Verify products exist in database
2. Check exclusion lists aren't too restrictive
3. Lower `minRating` requirement
4. Verify products are active and available

### Issue: Slow response times

**Symptoms:** Response time > 1 second

**Solutions:**
1. Verify Redis is running and connected
2. Check database indexes on product fields
3. Reduce candidate fetch limit
4. Monitor database query performance

### Issue: Cache not working

**Symptoms:** No cache hits in logs

**Solutions:**
1. Verify Redis connection
2. Check cache key generation
3. Ensure TTL is set correctly
4. Clear Redis cache if stale

## 📝 Code Examples

### Basic Usage

```typescript
import { diversityService } from './services/diversityService';

// Balance products by category
const balanced = diversityService.balanceByCategory(products, 2);

// Calculate diversity score
const score = diversityService.calculateDiversityScore(products);

// Apply full diversity mode
const diverse = await diversityService.applyDiversityMode(
  products,
  'balanced',
  { maxPerCategory: 2, maxPerBrand: 2 }
);
```

### Frontend Integration

```typescript
// Fetch diverse recommendations
async function fetchDiverseRecommendations() {
  const response = await fetch('/api/v1/recommendations/diverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      excludeProducts: shownProductIds,
      limit: 10,
      context: 'homepage',
      options: {
        minCategories: 3,
        algorithm: 'hybrid'
      }
    })
  });

  const data = await response.json();
  return data.data.recommendations;
}
```

### Custom Diversity Algorithm

```typescript
// Create custom diversity function
function customDiversityAlgorithm(products: DiversityProduct[]) {
  // Your custom logic here
  const filtered = products.filter(/* ... */);
  const balanced = diversityService.balanceByCategory(filtered, 3);
  return balanced;
}
```

## 🔐 Security Considerations

1. **Input Validation**: All inputs validated with Joi schemas
2. **ObjectId Validation**: Prevents MongoDB injection
3. **Rate Limiting**: Apply rate limiters in production
4. **Cache Isolation**: User-specific cache keys prevent data leakage
5. **Error Handling**: Never expose internal errors to clients

## 🚢 Deployment Checklist

- [ ] Enable rate limiting on `/diverse` endpoint
- [ ] Set up Redis monitoring
- [ ] Configure analytics aggregation
- [ ] Add database indexes:
  - `products.category`
  - `products.brand`
  - `products.pricing.selling`
  - `products.ratings.average`
- [ ] Set up error alerting for diversity scores < 0.5
- [ ] Document API in Swagger/OpenAPI
- [ ] Load test with production-like data
- [ ] Configure cache eviction policies

## 📚 Additional Resources

### Related Documentation
- [Product Schema Documentation](./models/Product.ts)
- [Recommendation Controller](./controllers/recommendationController.ts)
- [Redis Service](./services/redisService.ts)

### Research Papers
- Gini coefficient: [Wikipedia](https://en.wikipedia.org/wiki/Gini_coefficient)
- Diversity in Recommender Systems: [Survey Paper](https://arxiv.org/abs/1711.06885)

### Tools
- [Redis Commander](https://www.npmjs.com/package/redis-commander) - Redis GUI
- [MongoDB Compass](https://www.mongodb.com/products/compass) - MongoDB GUI

## 👥 Contributing

### Adding New Diversity Algorithms

1. Add function to `diversityService.ts`
2. Add mode to `DiversityMode` type
3. Implement in `applyDiversityMode` switch statement
4. Add tests in `diversityService.test.ts`
5. Update documentation

### Example:

```typescript
// 1. Add function
export function balanceByNewMetric(products: DiversityProduct[]) {
  // Implementation
}

// 2. Update type
type DiversityMode = 'balanced' | 'category_diverse' | 'price_diverse' | 'new_metric';

// 3. Implement in switch
case 'new_metric':
  result = balanceByNewMetric(filtered);
  break;

// 4. Add tests
test('should balance by new metric', () => { /* ... */ });
```

## 📞 Support

For issues or questions:
1. Check this README
2. Review test cases for examples
3. Check logs for debugging info
4. Contact backend team

## 📄 License

This system is part of the Rez App backend. All rights reserved.

---

**Version:** 1.0.0
**Last Updated:** January 2025
**Maintainer:** Backend Team
