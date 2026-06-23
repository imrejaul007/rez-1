# Performance Optimization - Quick Reference

## 🚀 Quick Commands

### Load Testing
```bash
npm run load:basic       # Basic load test (100 req/sec)
npm run load:spike       # Spike test (500 req/sec)
npm run load:stress      # Stress test (up to 1000 req/sec)
npm run load:endurance   # Endurance test (30 min)
npm run load:report      # Generate HTML report
```

### Profiling
```bash
npm run profile:cpu         # CPU profiling
npm run profile:memory      # Memory profiling
npm run profile:eventloop   # Event loop profiling
```

### Production
```bash
npm run build            # Build for production
npm run start:prod       # Start optimized
npm run start:prod:gc    # Start with GC exposed
```

---

## 💾 Cache Service

### Initialize
```typescript
import { EnhancedCacheService } from './services/EnhancedCacheService';
await EnhancedCacheService.initialize();
```

### Get or Set
```typescript
const data = await EnhancedCacheService.getOrSet(
  'key',
  async () => fetchDataFromDB(),
  900 // TTL in seconds
);
```

### Invalidate
```typescript
await EnhancedCacheService.delete('key');
await EnhancedCacheService.deletePattern('prefix:*');
await EnhancedCacheService.clear();
```

### Statistics
```typescript
const stats = EnhancedCacheService.getStats();
// { hitRate, memoryHits, redisHits, ... }
```

---

## 📋 Queue Service

### Initialize
```typescript
import { QueueService } from './services/QueueService';
await QueueService.initialize();
```

### Queue Jobs
```typescript
// Email
await QueueService.sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  body: 'Message'
});

// SMS
await QueueService.sendSMS({
  to: '+1234567890',
  message: 'Hello'
});

// Report
await QueueService.generateReport({
  merchantId,
  reportType: 'sales',
  format: 'pdf'
});

// Analytics
await QueueService.calculateAnalytics({
  merchantId,
  type: 'daily',
  data: {}
});
```

### Health Check
```typescript
const health = await QueueService.getHealthStatus();
```

---

## 📊 Memory Monitor

### Initialize
```typescript
import { MemoryMonitorService } from './services/MemoryMonitorService';
MemoryMonitorService.initialize();
```

### Get Stats
```typescript
const stats = MemoryMonitorService.getStats();
console.log(MemoryMonitorService.getReport());
```

### Check Health
```typescript
if (!MemoryMonitorService.isHealthy()) {
  console.warn('High memory usage!');
}
```

### Force GC
```typescript
MemoryMonitorService.forceGC();
```

---

## 📄 Pagination

### Cursor-Based (Recommended)
```typescript
import { paginateCursor } from './utils/paginationHelper';

const result = await paginateCursor(
  Model,
  { merchantId },
  {
    cursor: req.query.cursor,
    limit: 20,
    sortField: '_id'
  }
);

// Response: { data, pagination: { nextCursor, hasNext } }
```

### Offset-Based (Traditional)
```typescript
import { paginateOffset } from './utils/paginationHelper';

const result = await paginateOffset(
  Model,
  { merchantId },
  {
    page: 1,
    limit: 20,
    sort: { createdAt: -1 }
  }
);

// Response: { data, pagination: { page, total, hasNext } }
```

---

## 🗄️ Database Query Optimization

### Fast Read Queries
```typescript
// Use .lean() for read-only (5-10x faster)
const products = await Product
  .find({ merchantId })
  .select('name price images.url')  // Select specific fields
  .lean()  // Return plain objects
  .exec();
```

### Aggregation Pipeline
```typescript
const stats = await Order.aggregate([
  { $match: { merchantId } },
  { $group: {
    _id: null,
    total: { $sum: '$total' },
    count: { $sum: 1 }
  }}
]);
```

### Use Indexes
```typescript
// Queries use these indexes automatically
ProductSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
```

---

## ✅ Performance Checklist

### Database Queries
- [ ] Using `.lean()` for read-only queries
- [ ] Using `.select()` to limit fields
- [ ] Queries have supporting indexes
- [ ] Using aggregation instead of multiple queries
- [ ] Using cursor-based pagination

### Caching
- [ ] Frequently accessed data is cached
- [ ] Appropriate TTLs configured
- [ ] Cache invalidation on updates
- [ ] Cache hit rate > 80%

### API Endpoints
- [ ] Gzip compression enabled
- [ ] Response pagination implemented
- [ ] Field selection parameter supported
- [ ] Rate limiting configured

### Background Jobs
- [ ] Heavy operations queued
- [ ] Email/SMS sending async
- [ ] Report generation async
- [ ] Retry logic configured

### Memory
- [ ] Memory monitoring active
- [ ] No memory leaks detected
- [ ] Streaming for large data
- [ ] Resource cleanup on shutdown

---

## 📈 Performance Targets

| Metric | Target | Command to Check |
|--------|--------|------------------|
| Response Time (p95) | <200ms | `npm run load:basic` |
| Throughput | 500+ req/sec | `npm run load:stress` |
| Memory Usage | <512MB | Check memory monitor |
| Cache Hit Rate | >80% | Check cache stats |
| Error Rate | <1% | Check load test results |

---

## 🚨 Common Issues & Solutions

### High Response Time
```typescript
// Check cache hit rate
const stats = EnhancedCacheService.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);

// Check slow queries
mongoose.set('debug', true);

// Profile application
// npm run profile:cpu
```

### High Memory Usage
```typescript
// Check memory stats
const stats = MemoryMonitorService.getStats();
console.log(MemoryMonitorService.getReport());

// Force garbage collection
MemoryMonitorService.forceGC();

// Profile memory
// npm run profile:memory
```

### Database Slow Queries
```typescript
// Verify indexes are being used
const explain = await Product
  .find({ merchantId })
  .explain();

console.log(explain);

// Add missing index
ProductSchema.index({ merchantId: 1, someField: 1 });
```

### Queue Buildup
```typescript
// Check queue health
const health = await QueueService.getHealthStatus();

// Look for:
// - High waiting count
// - High failed count
// - Processing errors
```

---

## 📊 Monitoring Alerts

### Set Up Alerts For:
- Response time p95 > 300ms
- Error rate > 1%
- Memory usage > 80%
- CPU usage > 80%
- Cache hit rate < 70%
- Queue depth > 1000
- Database connections > 90

---

## 🔧 Production Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://...
DB_NAME=rez-app

# Redis
REDIS_URL=redis://...
REDIS_PASSWORD=...
CACHE_ENABLED=true

# Performance
NODE_ENV=production
MAX_POOL_SIZE=100
MIN_POOL_SIZE=10
```

### Server Specs (Recommended)
- 4 vCPUs
- 8GB RAM
- 50GB SSD
- Auto-scaling enabled

---

## 📚 Documentation Files

1. **WEEK7_PHASE5B_PERFORMANCE.md** - Complete guide
2. **LOAD_TEST_RESULTS.md** - Test results
3. **PERFORMANCE_BEST_PRACTICES.md** - Best practices
4. **PHASE5B_COMPLETION_SUMMARY.md** - Summary
5. **PERFORMANCE_QUICK_REFERENCE.md** - This file

---

## 🆘 Need Help?

1. Check the full documentation files
2. Run load tests to identify issues
3. Use profiling tools to find bottlenecks
4. Monitor production metrics
5. Review best practices guide

---

**Performance is not a one-time task - it's an ongoing process of monitoring, measuring, and optimizing.**
