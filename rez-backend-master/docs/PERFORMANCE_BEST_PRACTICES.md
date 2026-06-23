# Performance Best Practices - Merchant Backend

## Table of Contents
1. [Database Optimization](#database-optimization)
2. [Caching Strategies](#caching-strategies)
3. [API Design](#api-design)
4. [Memory Management](#memory-management)
5. [Code-Level Optimizations](#code-level-optimizations)
6. [Background Processing](#background-processing)
7. [Monitoring & Profiling](#monitoring--profiling)
8. [Deployment](#deployment)

---

## 1. Database Optimization

### 1.1 Always Use Indexes

✅ **DO:**
```typescript
// Create indexes for frequently queried fields
ProductSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ merchantId: 1, category: 1 });

// Use compound indexes for multi-field queries
OrderSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
```

❌ **DON'T:**
```typescript
// Query without indexes
await Product.find({ customField: 'value' }); // Slow collection scan
```

### 1.2 Use .lean() for Read-Only Operations

✅ **DO:**
```typescript
// 5-10x faster - returns plain objects
const products = await Product.find({ merchantId }).lean();
```

❌ **DON'T:**
```typescript
// Slow - creates full Mongoose documents
const products = await Product.find({ merchantId });
```

### 1.3 Use Field Projection

✅ **DO:**
```typescript
// Only fetch needed fields (60-80% faster)
const products = await Product
  .find({ merchantId })
  .select('name price images.url')
  .lean();
```

❌ **DON'T:**
```typescript
// Fetches all fields (slow, large payload)
const products = await Product.find({ merchantId });
```

### 1.4 Use Aggregation Pipelines

✅ **DO:**
```typescript
// Single aggregation pipeline
const stats = await Order.aggregate([
  { $match: { merchantId } },
  { $group: {
    _id: null,
    totalOrders: { $sum: 1 },
    totalRevenue: { $sum: '$total' }
  }}
]);
```

❌ **DON'T:**
```typescript
// Multiple separate queries
const orders = await Order.find({ merchantId });
const totalOrders = orders.length;
const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
```

### 1.5 Cursor-Based Pagination

✅ **DO:**
```typescript
// Cursor pagination (efficient for large datasets)
const { data, nextCursor } = await paginateCursor(
  Product,
  { merchantId },
  { cursor, limit: 20 }
);
```

❌ **DON'T:**
```typescript
// Offset pagination (slow for large offsets)
const products = await Product
  .find({ merchantId })
  .skip(10000) // Very slow!
  .limit(20);
```

### 1.6 Connection Pooling

✅ **DO:**
```typescript
// Configure connection pool
mongoose.connect(uri, {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 30000
});
```

### 1.7 Avoid $where and $exists

❌ **DON'T:**
```typescript
// Very slow
await Product.find({ $where: "this.price > 100" });
await Product.find({ optionalField: { $exists: true } });
```

✅ **DO:**
```typescript
// Use standard operators
await Product.find({ price: { $gt: 100 } });
// Add field with default value instead of checking existence
```

---

## 2. Caching Strategies

### 2.1 Multi-Level Caching

✅ **DO:**
```typescript
// Use multi-level cache
const products = await EnhancedCacheService.getOrSet(
  `products:${merchantId}`,
  async () => {
    return await Product.find({ merchantId }).lean();
  },
  900 // 15 min TTL
);
```

### 2.2 Cache Invalidation

✅ **DO:**
```typescript
// Invalidate on write operations
await Product.findByIdAndUpdate(id, updates);
await EnhancedCacheService.deletePattern(`products:${merchantId}:*`);
```

### 2.3 Appropriate TTLs

✅ **DO:**
```typescript
// Use appropriate TTLs for different data types
const TTLs = {
  productDetail: 3600,      // 1 hour (rarely changes)
  productList: 1800,        // 30 min
  analytics: 900,           // 15 min (frequently updated)
  dashboardMetrics: 300,    // 5 min (real-time feel)
  userSession: 86400        // 24 hours
};
```

### 2.4 Cache Warming

✅ **DO:**
```typescript
// Warm up cache on startup
async function warmupCache() {
  const merchants = await Merchant.find({ status: 'active' });

  for (const merchant of merchants) {
    // Pre-load frequently accessed data
    await EnhancedCacheService.set(
      `dashboard:${merchant.id}`,
      await getDashboardData(merchant.id),
      300
    );
  }
}
```

---

## 3. API Design

### 3.1 Enable Compression

✅ **DO:**
```typescript
import compression from 'compression';
app.use(compression());
```

### 3.2 Implement Field Selection

✅ **DO:**
```typescript
// Allow clients to select fields
// GET /api/products?fields=name,price,images.url

app.get('/api/products', async (req, res) => {
  const fields = req.query.fields?.split(',');
  const products = await Product
    .find({ merchantId })
    .select(fields?.join(' '))
    .lean();

  res.json(products);
});
```

### 3.3 Use ETags for Caching

✅ **DO:**
```typescript
// Add ETag header
app.get('/api/products/:id', async (req, res) => {
  const product = await getProduct(req.params.id);
  const etag = generateETag(product);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not modified
  }

  res.setHeader('ETag', etag);
  res.json(product);
});
```

### 3.4 Rate Limiting

✅ **DO:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3.5 Response Pagination

✅ **DO:**
```typescript
// Always paginate list endpoints
app.get('/api/products', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await paginateOffset(
    Product,
    { merchantId },
    { page, limit }
  );

  res.json(result);
});
```

---

## 4. Memory Management

### 4.1 Monitor Memory Usage

✅ **DO:**
```typescript
// Initialize memory monitor
MemoryMonitorService.initialize();

// Set up alerts
MemoryMonitorService.onAlert((stats) => {
  if (stats.current.heapUsed > MAX_HEAP) {
    console.error('High memory usage!');
    // Alert ops team
  }
});
```

### 4.2 Use Streaming for Large Data

✅ **DO:**
```typescript
// Stream large datasets
app.get('/api/export/products', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');

  const cursor = Product.find({ merchantId }).cursor();
  const csvStream = csv.createWriteStream();
  csvStream.pipe(res);

  for await (const product of cursor) {
    csvStream.write(product);
  }

  csvStream.end();
});
```

❌ **DON'T:**
```typescript
// Load all data into memory
const allProducts = await Product.find({ merchantId });
const csv = convertToCSV(allProducts); // Out of memory!
res.send(csv);
```

### 4.3 Limit Array Sizes

✅ **DO:**
```typescript
// Limit embedded arrays
const ProductSchema = new Schema({
  images: {
    type: [{
      url: String,
      thumbnailUrl: String
    }],
    validate: [arrayLimit(10), 'Too many images']
  }
});

function arrayLimit(val) {
  return function(arr) {
    return arr.length <= val;
  };
}
```

### 4.4 Clean Up Resources

✅ **DO:**
```typescript
// Proper cleanup
process.on('SIGTERM', async () => {
  await EnhancedCacheService.shutdown();
  await QueueService.shutdown();
  await mongoose.connection.close();
  process.exit(0);
});
```

---

## 5. Code-Level Optimizations

### 5.1 Use Async/Await Properly

✅ **DO:**
```typescript
// Parallel execution
const [products, categories, orders] = await Promise.all([
  getProducts(merchantId),
  getCategories(merchantId),
  getOrders(merchantId)
]);
```

❌ **DON'T:**
```typescript
// Sequential execution (slow)
const products = await getProducts(merchantId);
const categories = await getCategories(merchantId);
const orders = await getOrders(merchantId);
```

### 5.2 Avoid Synchronous Operations

❌ **DON'T:**
```typescript
// Blocks event loop
const hash = bcrypt.hashSync(password, 10);
const file = fs.readFileSync('large-file.json');
```

✅ **DO:**
```typescript
// Async operations
const hash = await bcrypt.hash(password, 10);
const file = await fs.promises.readFile('large-file.json');
```

### 5.3 Use Object Pooling

✅ **DO:**
```typescript
// Reuse objects instead of creating new ones
const objectPool = {
  pool: [],
  acquire() {
    return this.pool.pop() || this.create();
  },
  release(obj) {
    this.reset(obj);
    this.pool.push(obj);
  },
  create() {
    return { /* new object */ };
  },
  reset(obj) {
    // Reset object state
  }
};
```

### 5.4 Debounce/Throttle Heavy Operations

✅ **DO:**
```typescript
// Debounce search queries
const debouncedSearch = debounce(async (query) => {
  return await Product.find({ $text: { $search: query } });
}, 300);
```

---

## 6. Background Processing

### 6.1 Use Queue for Heavy Operations

✅ **DO:**
```typescript
// Queue email sending
await QueueService.sendEmail({
  to: user.email,
  subject: 'Order Confirmation',
  body: emailBody
});

// Return immediately
res.json({ success: true, message: 'Order created' });
```

❌ **DON'T:**
```typescript
// Send email synchronously
await emailService.send(user.email, subject, body); // Slow!
res.json({ success: true });
```

### 6.2 Implement Job Retries

✅ **DO:**
```typescript
// Configure retries with backoff
await queue.add(data, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});
```

### 6.3 Monitor Queue Health

✅ **DO:**
```typescript
// Regular queue health checks
setInterval(async () => {
  const health = await QueueService.getHealthStatus();

  if (health.overall !== 'healthy') {
    console.error('Queue health degraded:', health);
  }
}, 60000);
```

---

## 7. Monitoring & Profiling

### 7.1 Use APM Tools

✅ **DO:**
```typescript
// New Relic integration
require('newrelic');

// Or DataDog
const tracer = require('dd-trace').init();
```

### 7.2 Log Slow Queries

✅ **DO:**
```typescript
// Monitor slow database queries
mongoose.set('debug', (coll, method, query, doc, options) => {
  const start = Date.now();

  return function() {
    const duration = Date.now() - start;
    if (duration > 100) { // Log queries > 100ms
      console.warn(`Slow query (${duration}ms):`, {
        collection: coll,
        method,
        query
      });
    }
  };
});
```

### 7.3 Profile with Clinic.js

✅ **DO:**
```bash
# CPU profiling
clinic doctor -- node dist/server.js

# Memory profiling
clinic heapprofiler -- node dist/server.js

# Event loop profiling
clinic bubbleprof -- node dist/server.js
```

### 7.4 Monitor Key Metrics

✅ **DO:**
```typescript
// Track custom metrics
class MetricsService {
  static async recordAPICall(endpoint, duration, statusCode) {
    // Send to monitoring service
  }

  static async recordCacheHit(key) {
    // Track cache performance
  }

  static async recordDatabaseQuery(collection, duration) {
    // Track database performance
  }
}
```

---

## 8. Deployment

### 8.1 Use PM2 or Similar

✅ **DO:**
```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'merchant-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 8.2 Optimize Node.js Flags

✅ **DO:**
```json
{
  "scripts": {
    "start:prod": "node --max-old-space-size=4096 --optimize-for-size dist/server.js"
  }
}
```

### 8.3 Enable Keep-Alive

✅ **DO:**
```typescript
// Enable HTTP keep-alive
const server = app.listen(PORT);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
```

### 8.4 Use Load Balancer

✅ **DO:**
```yaml
# nginx.conf
upstream backend {
  least_conn;
  server backend1:5001;
  server backend2:5001;
  server backend3:5001;
}

server {
  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
  }
}
```

---

## Performance Checklist

### Before Deployment
- [ ] All database queries use indexes
- [ ] Implemented caching for frequently accessed data
- [ ] Enabled gzip compression
- [ ] Implemented pagination for list endpoints
- [ ] Background jobs configured for heavy operations
- [ ] Memory monitoring enabled
- [ ] Load tests passed
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Health checks working

### After Deployment
- [ ] APM monitoring active
- [ ] Error tracking configured
- [ ] Alerts set up for key metrics
- [ ] Database performance monitored
- [ ] Cache hit rate monitored
- [ ] Queue depth monitored
- [ ] Regular load testing scheduled
- [ ] Incident response plan in place

---

## Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| API Response Time (p95) | <200ms | APM, Custom metrics |
| API Response Time (p99) | <500ms | APM, Custom metrics |
| Throughput | 500+ req/sec | APM, Load tests |
| Error Rate | <1% | APM, Error tracking |
| Memory Usage | <512MB | Memory monitor |
| CPU Usage | <70% | System metrics |
| Cache Hit Rate | >80% | Custom metrics |
| Database Query Time (p95) | <50ms | APM, Slow query log |
| Queue Processing Time | <5s (p95) | Queue metrics |

---

## Common Performance Antipatterns

### ❌ N+1 Queries
```typescript
// DON'T
const orders = await Order.find({ merchantId });
for (const order of orders) {
  order.customer = await Customer.findById(order.customerId); // N queries!
}
```

✅ **Fix:**
```typescript
// DO - Use population or joins
const orders = await Order.find({ merchantId }).populate('customer');
```

### ❌ Loading All Records
```typescript
// DON'T
const allProducts = await Product.find({}); // Could be millions!
```

✅ **Fix:**
```typescript
// DO - Always paginate
const products = await paginateCursor(Product, {}, { limit: 20 });
```

### ❌ Synchronous Operations in Routes
```typescript
// DON'T
app.post('/api/order', async (req, res) => {
  const order = await createOrder(req.body);
  await sendEmail(order); // Blocks response!
  res.json(order);
});
```

✅ **Fix:**
```typescript
// DO - Queue background tasks
app.post('/api/order', async (req, res) => {
  const order = await createOrder(req.body);
  await QueueService.sendEmail({ order }); // Async
  res.json(order);
});
```

### ❌ No Caching
```typescript
// DON'T
app.get('/api/dashboard', async (req, res) => {
  const data = await calculateDashboard(merchantId); // Slow every time!
  res.json(data);
});
```

✅ **Fix:**
```typescript
// DO - Cache expensive operations
app.get('/api/dashboard', async (req, res) => {
  const data = await EnhancedCacheService.getOrSet(
    `dashboard:${merchantId}`,
    () => calculateDashboard(merchantId),
    300
  );
  res.json(data);
});
```

---

## Conclusion

Following these best practices will ensure your application:
- ✅ Handles high traffic efficiently
- ✅ Uses resources optimally
- ✅ Scales horizontally
- ✅ Provides fast response times
- ✅ Remains stable under load
- ✅ Is easy to monitor and debug

Remember: **"Premature optimization is the root of all evil, but measured optimization based on profiling is engineering excellence."**
