# 🚀 Diversity System - Quick Reference

## 📍 Quick Links

- **Main Service:** `src/services/diversityService.ts`
- **Main Controller:** `src/controllers/diverseRecommendationController.ts`
- **Tests:** `src/__tests__/diversityService.test.ts`
- **Full Docs:** `DIVERSITY_SYSTEM_README.md`
- **Implementation Summary:** `DIVERSITY_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Most Common Use Cases

### 1. Get Diverse Recommendations (Frontend)

```typescript
// POST /api/v1/recommendations/diverse
const response = await fetch('/api/v1/recommendations/diverse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    excludeProducts: shownProductIds,  // Array of already shown product IDs
    limit: 10,
    context: 'homepage',
    options: {
      minCategories: 3,
      algorithm: 'hybrid'
    }
  })
});

const { recommendations, metadata } = await response.json().data;

console.log('Diversity Score:', metadata.diversityScore);
console.log('Categories:', metadata.categoriesShown);
```

### 2. Get Products with Diversity Mode

```typescript
// GET /api/v1/products?diversityMode=balanced&excludeProducts=id1,id2
const response = await fetch(
  '/api/v1/products?diversityMode=balanced&excludeProducts=507f1f77bcf86cd799439011,507f1f77bcf86cd799439012&limit=20'
);

const products = await response.json().data;
```

### 3. Use Diversity Service Directly (Backend)

```typescript
import { diversityService } from '../services/diversityService';

// Apply balanced diversity
const diverseProducts = await diversityService.applyDiversityMode(
  products,
  'balanced',
  {
    maxPerCategory: 2,
    maxPerBrand: 2,
    minRating: 3.0
  }
);

// Calculate diversity score
const score = diversityService.calculateDiversityScore(products);
console.log('Diversity Score:', score); // 0.0 - 1.0

// Get metadata
const metadata = diversityService.getMetadata(products);
console.log('Categories:', metadata.categoriesShown);
```

---

## 🔧 API Reference

### POST /api/v1/recommendations/diverse

**Request Body:**
```json
{
  "excludeProducts": ["id1", "id2"],      // Optional
  "excludeStores": ["storeId1"],          // Optional
  "shownProducts": ["id3", "id4"],        // Optional
  "limit": 10,                            // 1-50, default: 10
  "context": "homepage",                  // Required
  "options": {
    "minCategories": 3,                   // Optional
    "maxPerCategory": 2,                  // Optional
    "maxPerBrand": 2,                     // Optional
    "algorithm": "hybrid",                // hybrid | collaborative | content_based
    "minRating": 3.0,                     // Optional
    "priceRanges": 3                      // Optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "metadata": {
      "categoriesShown": ["Electronics", "Fashion"],
      "brandsShown": ["Apple", "Nike"],
      "diversityScore": 0.83,
      "deduplicatedCount": 15,
      "priceDistribution": { "budget": 3, "mid": 4, "premium": 3 }
    }
  }
}
```

### GET /api/v1/products

**Additional Query Parameters:**
- `excludeProducts`: Comma-separated product IDs
- `diversityMode`: `balanced` | `category_diverse` | `price_diverse` | `none`

---

## 🎨 Diversity Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `balanced` | Balance across all dimensions | Homepage, general recommendations |
| `category_diverse` | Focus on category variety | Category exploration |
| `price_diverse` | Focus on price range variety | Budget-conscious shoppers |
| `none` | No diversity applied | Default behavior |

---

## 📊 Scoring Cheat Sheet

### Diversity Score Ranges

| Score | Quality | Action |
|-------|---------|--------|
| 0.0 - 0.3 | Poor | Investigate data quality |
| 0.3 - 0.5 | Fair | Consider adjusting parameters |
| 0.5 - 0.7 | Good | Acceptable for production |
| 0.7 - 1.0 | Excellent | Optimal diversity |

### Target Score: **≥ 0.7**

---

## 🔍 Debugging

### Check Diversity Score

```typescript
// In controller or service
console.log('🎯 Diversity Score:', diversityService.calculateDiversityScore(products));
```

### Check Distribution

```typescript
const metadata = diversityService.getMetadata(products);
console.log('📊 Distribution:', {
  categories: metadata.categoriesShown.length,
  brands: metadata.brandsShown.length,
  priceRanges: Object.keys(metadata.priceDistribution).length
});
```

### Check Cache

```bash
# In Redis CLI
redis-cli GET "diverse-recommendations:homepage:*"
redis-cli TTL "diverse-recommendations:homepage:*"
```

---

## ⚡ Performance Tips

1. **Use Caching:** First request ~400ms, cached ~50ms
2. **Limit Candidates:** Don't fetch more than 250 products
3. **Enable Indexes:** Ensure DB indexes on category, brand, price
4. **Monitor Redis:** Keep Redis memory < 80%
5. **Use Lean Queries:** Always `.lean()` for read-only

---

## 🐛 Common Issues

### Issue: Low Diversity Score

**Symptoms:** Score < 0.5

**Fix:**
```typescript
// Increase limits
options: {
  maxPerCategory: 3,  // Was 2
  maxPerBrand: 3      // Was 2
}
```

### Issue: Empty Recommendations

**Symptoms:** Empty array returned

**Fix:**
```typescript
// Lower requirements
options: {
  minRating: 0,       // Was 3.0
  minCategories: 1    // Was 3
}
```

### Issue: Slow Response

**Symptoms:** Response time > 1s

**Fix:**
1. Check Redis connection
2. Verify DB indexes
3. Reduce candidate limit
4. Monitor DB query time

---

## 📝 Code Snippets

### Homepage Implementation

```typescript
// Homepage component
async function loadRecommendations() {
  const shownIds = products.map(p => p.id); // Track shown products

  const response = await fetch('/api/v1/recommendations/diverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shownProducts: shownIds,
      limit: 10,
      context: 'homepage',
      options: { algorithm: 'hybrid' }
    })
  });

  const { recommendations } = await response.json().data;
  setProducts([...products, ...recommendations]);
}
```

### Product Page Recommendations

```typescript
// Product detail page
async function loadSimilarProducts(currentProductId) {
  const response = await fetch('/api/v1/recommendations/diverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      excludeProducts: [currentProductId],
      limit: 6,
      context: 'product_page',
      options: {
        maxPerCategory: 2,
        algorithm: 'content_based'
      }
    })
  });

  return await response.json().data.recommendations;
}
```

### Sequential Recommendations (No Duplicates)

```typescript
// Infinite scroll implementation
const allShownIds = [];

async function loadMoreProducts() {
  const response = await fetch('/api/v1/recommendations/diverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shownProducts: allShownIds,  // Exclude all previously shown
      limit: 10,
      context: 'homepage'
    })
  });

  const { recommendations } = await response.json().data;

  // Track IDs for next request
  allShownIds.push(...recommendations.map(p => p.id));

  return recommendations;
}
```

---

## 🧪 Testing

### Unit Test Example

```typescript
import { diversityService } from '../services/diversityService';

test('should balance by category', () => {
  const products = [
    { category: 'Electronics', ... },
    { category: 'Electronics', ... },
    { category: 'Fashion', ... }
  ];

  const balanced = diversityService.balanceByCategory(products, 2);

  expect(balanced.length).toBeLessThanOrEqual(products.length);
  // Assert no category has > 2 products
});
```

### Integration Test

```bash
# Test endpoint
curl -X POST http://localhost:5000/api/v1/recommendations/diverse \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "context": "homepage"}' | jq '.data.metadata.diversityScore'

# Expected output: > 0.7
```

---

## 📦 Dependencies

- `mongoose`: MongoDB queries
- `redis`: Caching
- `joi`: Validation

**No additional packages required!**

---

## 🚀 Quick Deploy Checklist

- [ ] Tests pass: `npm test diversityService.test.ts`
- [ ] Redis running: `redis-cli ping`
- [ ] DB indexes added (see below)
- [ ] Environment variables set
- [ ] Rate limiting enabled (production)

### Required DB Indexes

```javascript
db.products.createIndex({ "category": 1 })
db.products.createIndex({ "brand": 1 })
db.products.createIndex({ "pricing.selling": 1 })
db.products.createIndex({ "ratings.average": -1 })
```

---

## 💡 Pro Tips

1. **Always pass `shownProducts`** for deduplication
2. **Use `context`** for better analytics
3. **Monitor diversity scores** in production
4. **A/B test algorithms** (hybrid vs collaborative)
5. **Cache aggressively** (5 min TTL is safe)
6. **Start with `balanced` mode** for most cases
7. **Increase `maxPerCategory`** for small catalogs
8. **Use `price_diverse`** for budget-conscious users

---

## 📞 Need Help?

1. **Check full docs:** `DIVERSITY_SYSTEM_README.md`
2. **Check implementation:** `DIVERSITY_IMPLEMENTATION_SUMMARY.md`
3. **Check tests:** `src/__tests__/diversityService.test.ts`
4. **Check code:** `src/services/diversityService.ts`

---

**Quick Reference Version:** 1.0.0
**Last Updated:** January 2025
