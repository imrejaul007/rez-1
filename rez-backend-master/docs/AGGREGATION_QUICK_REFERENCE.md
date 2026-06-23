# MongoDB Aggregation Pipeline - Quick Reference Card

## 🚀 Quick Start

### Switch to Optimized Version

```javascript
// Option 1: Environment variable
process.env.USE_OPTIMIZED_HOMEPAGE = 'true';

// Option 2: Direct import
const { getHomepageDataOptimized } = require('./services/homepageService.optimized');
const data = await getHomepageDataOptimized({ sections: ['featuredProducts'] });
```

### Run Performance Test

```bash
node scripts/test-aggregation-performance.js
```

---

## 📊 Performance Expectations

| Metric | Target | Alert If |
|--------|--------|----------|
| Response Time | < 500ms | > 1000ms |
| Error Rate | < 0.1% | > 1% |
| Database CPU | < 60% | > 80% |
| Memory Usage | < 35MB | > 50MB |

---

## 🔧 Common Patterns

### Pattern 1: Basic Aggregation

```javascript
Product.aggregate([
  { $match: { isActive: true } },
  { $sort: { createdAt: -1 } },
  { $limit: 10 }
])
```

### Pattern 2: Lookup (Join)

```javascript
{
  $lookup: {
    from: 'stores',
    localField: 'store',
    foreignField: '_id',
    as: 'store',
    pipeline: [
      { $project: { name: 1, logo: 1 } }  // Only get needed fields
    ]
  }
}
```

### Pattern 3: Computed Fields

```javascript
{
  $addFields: {
    discountPercent: {
      $multiply: [
        { $divide: [
          { $subtract: ['$originalPrice', '$sellingPrice'] },
          '$originalPrice'
        ]},
        100
      ]
    }
  }
}
```

### Pattern 4: Parallel Operations ($facet)

```javascript
{
  $facet: {
    featured: [
      { $match: { isFeatured: true } },
      { $limit: 10 }
    ],
    trending: [
      { $match: { trending: true } },
      { $limit: 10 }
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Issue: Empty Array from $lookup

**Solution:** Add $unwind with preserveNullAndEmptyArrays

```javascript
{
  $unwind: {
    path: '$category',
    preserveNullAndEmptyArrays: true  // ✅ Don't lose documents
  }
}
```

### Issue: Slow Query

**Solution:** Check index usage

```javascript
const explain = await Product.aggregate(pipeline).explain('executionStats');
console.log('Index used:', explain.stages[0].$cursor.queryPlanner.winningPlan);
```

### Issue: High Memory Usage

**Solution:** Add $limit early in pipeline

```javascript
{
  $facet: {
    featured: [
      { $match: { isFeatured: true } },
      { $limit: 100 },  // ✅ Limit early
      { $sort: { rating: -1 } },
      { $limit: 10 }
    ]
  }
}
```

---

## 📈 Monitoring

### Key Queries

**Check slow queries:**
```javascript
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10)
```

**Enable profiling:**
```javascript
db.setProfilingLevel(1, { slowms: 100 })
```

**Check index usage:**
```javascript
db.products.aggregate([...]).explain('executionStats')
```

---

## 🎯 Required Indexes

```javascript
// Run this before deployment:
db.products.createIndex({ isActive: 1, isFeatured: 1, 'inventory.isAvailable': 1 });
db.stores.createIndex({ isActive: 1, isFeatured: 1 });
db.events.createIndex({ isActive: 1, status: 1, 'dateTime.start': 1 });
db.offers.createIndex({ 'validity.isActive': 1, category: 1 });
db.videos.createIndex({ isActive: 1, type: 1, views: -1 });
db.articles.createIndex({ isActive: 1, status: 1, publishedAt: -1 });
```

---

## ⚠️ Rollback

### Immediate Rollback

```bash
# Set environment variable
export USE_OPTIMIZED_HOMEPAGE=false

# Or in code
process.env.USE_OPTIMIZED_HOMEPAGE = 'false';
```

### Verify Rollback

```bash
curl https://api.example.com/homepage | grep -o "executionTime"
# Should see longer execution time (back to original)
```

---

## 📞 Need Help?

1. **Performance issue?** → Check PERFORMANCE_COMPARISON.md
2. **Migration question?** → Check AGGREGATION_MIGRATION_CHECKLIST.md
3. **Pattern example?** → Check AGGREGATION_PIPELINE_GUIDE.md
4. **Testing?** → Run `node scripts/test-aggregation-performance.js`

---

## ✅ Pre-Deployment Checklist

- [ ] Indexes created
- [ ] Performance test passed (>40% improvement)
- [ ] Staging environment tested
- [ ] Feature flag configured
- [ ] Monitoring/alerts set up
- [ ] Rollback procedure documented
- [ ] Team trained

---

## 🎓 Key Learnings

**DO:**
- ✅ Use $match early in pipeline
- ✅ Limit results before expensive operations
- ✅ Use $lookup with selective projections
- ✅ Add computed fields at database level
- ✅ Test with explain() before production

**DON'T:**
- ❌ Forget $unwind with preserveNullAndEmptyArrays
- ❌ Use $lookup without pipeline projection
- ❌ Skip index creation
- ❌ Deploy without testing
- ❌ Ignore monitoring alerts

---

**Quick Links:**
- [Full Guide](./AGGREGATION_PIPELINE_GUIDE.md)
- [Performance Data](./PERFORMANCE_COMPARISON.md)
- [Migration Plan](./AGGREGATION_MIGRATION_CHECKLIST.md)
- [Complete Summary](./AGENT_3_AGGREGATION_OPTIMIZATION_SUMMARY.md)
