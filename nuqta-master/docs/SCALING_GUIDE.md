# REZ App - Scaling Guide

## Table of Contents
1. [Horizontal Scaling Strategies](#horizontal-scaling-strategies)
2. [Database Scaling](#database-scaling)
3. [Caching Strategies](#caching-strategies)
4. [CDN Optimization](#cdn-optimization)
5. [Load Testing Results and Recommendations](#load-testing-results-and-recommendations)
6. [Cost Optimization](#cost-optimization)
7. [Performance Budgets](#performance-budgets)

---

## Horizontal Scaling Strategies

### Application Server Scaling

#### Current Baseline Architecture

```yaml
Current Setup (Supports ~10,000 concurrent users):
  Load Balancer: 1x AWS ALB
  Application Servers: 2x t3.xlarge (4 vCPU, 16 GB RAM)
  Database: MongoDB Atlas M30
  Redis Cache: 1x cache.r6g.large
  CDN: Cloudflare Pro

Expected Performance:
  Concurrent Users: 10,000
  Requests/second: 500
  Response Time (p95): < 500ms
  Availability: 99.9%
```

#### Scaling to 50,000 Users

```yaml
Target Architecture:
  Load Balancer: 1x AWS ALB with auto-scaling
  Application Servers: 5-10x t3.xlarge (auto-scaling)
  Database: MongoDB Atlas M50 with sharding
  Redis Cache: 3-node cluster (cache.r6g.xlarge)
  CDN: Cloudflare Business

Expected Performance:
  Concurrent Users: 50,000
  Requests/second: 2,500
  Response Time (p95): < 600ms
  Availability: 99.95%

Estimated Costs: $5,000-7,000/month
```

#### Scaling to 200,000 Users

```yaml
Enterprise Architecture:
  Load Balancer: Multiple ALBs across regions
  Application Servers: 20-40x c5.2xlarge (auto-scaling)
  Database: MongoDB Atlas M80+ with multi-region
  Redis Cache: Redis Enterprise cluster
  CDN: Cloudflare Enterprise + AWS CloudFront

Expected Performance:
  Concurrent Users: 200,000
  Requests/second: 10,000+
  Response Time (p95): < 800ms
  Availability: 99.99%

Estimated Costs: $25,000-35,000/month
```

### Auto-Scaling Configuration

#### AWS Auto Scaling Group

Create `infrastructure/autoscaling.tf`:

```hcl
# Launch Template
resource "aws_launch_template" "rezapp_api" {
  name_prefix   = "rezapp-api-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "t3.xlarge"

  vpc_security_group_ids = [aws_security_group.api.id]

  user_data = base64encode(templatefile("${path.module}/scripts/user-data.sh", {
    docker_image = var.docker_image
  }))

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "rezapp_api" {
  name                = "rezapp-api-asg"
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.api.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 20
  desired_capacity = 3

  launch_template {
    id      = aws_launch_template.rezapp_api.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "rezapp-api"
    propagate_at_launch = true
  }
}

# Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "rezapp-scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.rezapp_api.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "rezapp-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.rezapp_api.name
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "rezapp-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period             = "120"
  statistic          = "Average"
  threshold          = "75"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.rezapp_api.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "rezapp-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period             = "300"
  statistic          = "Average"
  threshold          = "30"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.rezapp_api.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}
```

#### Kubernetes Horizontal Pod Autoscaler

For Kubernetes deployment:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rezapp-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rezapp-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

### Load Balancer Configuration

#### Multi-Region Load Balancing

```yaml
Architecture:
  Global Load Balancer: AWS Global Accelerator
  Regional Load Balancers:
    - US East (Primary): AWS ALB
    - EU West (Secondary): AWS ALB
    - Asia Pacific (Secondary): AWS ALB

Traffic Distribution:
  - Health-based routing
  - Latency-based routing
  - Geo-proximity routing

Failover:
  - Automatic failover to healthy region
  - 30-second health check interval
  - 3 consecutive failures trigger failover
```

#### NGINX Load Balancer Configuration

For self-managed load balancing:

```nginx
upstream api_backend {
    # Load balancing algorithm
    least_conn;  # or ip_hash, round_robin

    # Backend servers
    server api1.rezapp.com:5001 max_fails=3 fail_timeout=30s weight=3;
    server api2.rezapp.com:5001 max_fails=3 fail_timeout=30s weight=3;
    server api3.rezapp.com:5001 max_fails=3 fail_timeout=30s weight=2;
    server api4.rezapp.com:5001 max_fails=3 fail_timeout=30s weight=2;

    # Backup server
    server backup.rezapp.com:5001 backup;

    # Keepalive connections
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.rezapp.com;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        # Connection pooling
        proxy_set_header Connection "";

        # Load balancing headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
}
```

### Stateless Application Design

#### Session Management

```typescript
// Use Redis for session storage instead of in-memory
import RedisStore from 'connect-redis';
import session from 'express-session';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
  },
});

redisClient.connect().catch(console.error);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
```

#### Sticky Sessions (if needed)

```nginx
# NGINX configuration for sticky sessions
upstream api_backend {
    ip_hash;  # Route same IP to same server
    server api1.rezapp.com:5001;
    server api2.rezapp.com:5001;
    server api3.rezapp.com:5001;
}

# Or use cookie-based sticky sessions
map $cookie_route $sticky_route {
    ~*^(?<route>.+)$ $route;
    default api1;
}

upstream api_backend {
    server api1.rezapp.com:5001 route=api1;
    server api2.rezapp.com:5001 route=api2;
    server api3.rezapp.com:5001 route=api3;
}
```

---

## Database Scaling

### MongoDB Sharding Strategy

#### When to Shard

```yaml
Shard When:
  - Database size > 500 GB
  - Working set > available RAM
  - Single server can't handle write load
  - Need geographic distribution

Current Metrics to Monitor:
  - Database size: Check if approaching 500 GB
  - IOPS: Check if consistently > 80% capacity
  - Connections: Check if approaching max
  - Query performance: Check slow query logs
```

#### Sharding Configuration

```javascript
// Shard key selection (very important!)
// For REZ app, recommended shard keys:

// Users collection - shard by user ID
sh.shardCollection("rezapp.users", { _id: "hashed" })

// Products collection - shard by merchant ID
sh.shardCollection("rezapp.products", { merchantId: 1 })

// Orders collection - shard by user ID and timestamp
sh.shardCollection("rezapp.orders", { userId: 1, createdAt: 1 })

// Reviews collection - shard by product ID
sh.shardCollection("rezapp.reviews", { productId: 1 })

// Cart collection - shard by user ID
sh.shardCollection("rezapp.cart", { userId: "hashed" })
```

#### Sharding Architecture

```yaml
Shard Cluster Setup (for 200k+ users):
  Config Servers: 3 (CSRS - Config Server Replica Set)
  Query Routers (mongos): 2-3 instances
  Shards: 3 replica sets (each with 3 nodes)

Total Nodes: 15
  - 3 config servers
  - 3 mongos routers
  - 9 shard nodes (3 shards × 3 replicas)

Estimated Cost: $3,000-5,000/month (MongoDB Atlas)
```

### Read Replicas

#### Configuration

```typescript
// mongoose-connect.ts
import mongoose from 'mongoose';

const options = {
  // Primary for writes
  uri: process.env.MONGODB_URI,

  // Read replicas
  readPreference: 'secondaryPreferred',

  // Connection pooling
  maxPoolSize: 50,
  minPoolSize: 10,

  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,

  // Write concern
  w: 'majority',
  wtimeoutMS: 5000,
};

// Separate connection for reads
const readConnection = mongoose.createConnection(
  process.env.MONGODB_READ_REPLICA_URI!,
  {
    ...options,
    readPreference: 'secondary',
  }
);

// Use read connection for read-heavy operations
export const getProductsOptimized = async () => {
  const ProductRead = readConnection.model('Product');
  return await ProductRead.find({}).lean();
};
```

#### Read/Write Splitting

```typescript
// services/databaseRouter.ts
class DatabaseRouter {
  // Write operations - always use primary
  async write(collection: string, operation: string, data: any) {
    const model = mongoose.model(collection);
    return await model[operation](data);
  }

  // Read operations - use secondary if available
  async read(collection: string, query: any) {
    const model = mongoose.model(collection);
    return await model.find(query).read('secondaryPreferred').lean();
  }
}

// Usage:
const router = new DatabaseRouter();

// Writes go to primary
await router.write('User', 'create', userData);

// Reads come from secondary (if available)
const products = await router.read('Product', { category: 'electronics' });
```

### Query Optimization

#### Index Strategy

```javascript
// Critical indexes for REZ app
db.products.createIndex({ name: "text", description: "text" }); // Search
db.products.createIndex({ category: 1, price: 1 }); // Browse & filter
db.products.createIndex({ merchantId: 1, isActive: 1 }); // Merchant queries
db.products.createIndex({ createdAt: -1 }); // Latest products
db.products.createIndex({ rating: -1, reviewCount: -1 }); // Sorting

db.orders.createIndex({ userId: 1, createdAt: -1 }); // User order history
db.orders.createIndex({ status: 1, createdAt: -1 }); // Order management
db.orders.createIndex({ merchantId: 1, status: 1 }); // Merchant orders

db.users.createIndex({ email: 1 }, { unique: true }); // Login
db.users.createIndex({ phone: 1 }, { unique: true }); // Phone login

db.reviews.createIndex({ productId: 1, createdAt: -1 }); // Product reviews
db.reviews.createIndex({ userId: 1 }); // User reviews

db.cart.createIndex({ userId: 1 }); // Cart lookup
db.cart.createIndex({ userId: 1, "items.productId": 1 }); // Item lookup
```

#### Query Performance Monitoring

```typescript
// middleware/queryMonitor.ts
import mongoose from 'mongoose';
import logger from '../config/logger';

mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any, options: any) => {
  const start = Date.now();

  // Log slow queries
  process.nextTick(() => {
    const duration = Date.now() - start;

    if (duration > 100) {
      logger.warn('Slow query detected', {
        collection: collectionName,
        method,
        duration,
        query: JSON.stringify(query),
        explain: 'Run db.collection.find(query).explain() in mongo shell',
      });
    }
  });
});

// Analyze query plans
export const analyzeQuery = async (model: any, query: any) => {
  const explain = await model.find(query).explain('executionStats');

  logger.info('Query Analysis', {
    totalDocsExamined: explain.executionStats.totalDocsExamined,
    totalKeysExamined: explain.executionStats.totalKeysExamined,
    executionTimeMillis: explain.executionStats.executionTimeMillis,
    indexUsed: explain.queryPlanner.winningPlan.inputStage?.indexName,
  });

  // Alert if full collection scan
  if (explain.executionStats.totalDocsExamined > 1000 &&
      !explain.queryPlanner.winningPlan.inputStage?.indexName) {
    logger.error('Collection scan detected - add index!', {
      query: JSON.stringify(query),
    });
  }

  return explain;
};
```

### Connection Pooling

```typescript
// config/database.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      // Connection pool settings
      maxPoolSize: 50,        // Max connections in pool
      minPoolSize: 10,        // Min connections to maintain
      maxIdleTimeMS: 30000,   // Close idle connections after 30s

      // Socket settings
      socketTimeoutMS: 45000,
      family: 4,              // Use IPv4

      // Server selection
      serverSelectionTimeoutMS: 5000,

      // Write concern
      w: 'majority',
      wtimeoutMS: 5000,

      // Read preference
      readPreference: 'primaryPreferred',
    });

    logger.info('MongoDB connected', {
      host: mongoose.connection.host,
      poolSize: mongoose.connection.client.options.maxPoolSize,
    });

    // Monitor pool size
    setInterval(() => {
      const poolSize = mongoose.connection.client?.topology?.s?.pool?.totalConnectionCount || 0;
      logger.info('Connection pool status', { poolSize });

      if (poolSize > 40) {
        logger.warn('Connection pool approaching limit', { poolSize });
      }
    }, 60000);

  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }
};

export default connectDB;
```

---

## Caching Strategies

### Multi-Layer Caching

```yaml
Layer 1: Browser Cache
  - Static assets: 1 year
  - API responses: None (use layer 2)

Layer 2: CDN Cache (Cloudflare)
  - Images: 1 month
  - CSS/JS: 1 year
  - API responses: Bypass

Layer 3: Application Cache (Redis)
  - User sessions: 24 hours
  - Product catalog: 1 hour
  - Category listings: 1 hour
  - Store details: 30 minutes
  - User profiles: 30 minutes

Layer 4: Database Query Cache
  - MongoDB query results: 5 minutes
  - Aggregation results: 15 minutes
```

### Redis Caching Implementation

#### Cache Strategy

```typescript
// services/cacheService.ts
import Redis from 'ioredis';
import logger from '../config/logger';

class CacheService {
  private client: Redis;
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      logger.error('Redis error', { error: err });
    });
  }

  // Generic get/set
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
      return 0;
    }
  }

  // Cache with fallback
  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute callback and cache result
    const result = await callback();
    await this.set(key, result, ttl);
    return result;
  }

  // Invalidate related caches
  async invalidateProduct(productId: string): Promise<void> {
    await this.deletePattern(`product:${productId}:*`);
    await this.deletePattern(`products:*`); // Invalidate all product lists
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.delete(`user:${userId}`);
    await this.delete(`cart:${userId}`);
    await this.delete(`orders:${userId}`);
  }
}

export const cacheService = new CacheService();
```

#### Cache Usage Examples

```typescript
// controllers/productController.ts
import { cacheService } from '../services/cacheService';

export const getProducts = async (req: Request, res: Response) => {
  const { category, page = 1, limit = 20 } = req.query;
  const cacheKey = `products:${category}:${page}:${limit}`;

  // Try cache first
  const products = await cacheService.remember(
    cacheKey,
    3600, // 1 hour
    async () => {
      // Database query
      return await Product.find({ category })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }
  );

  res.json({ success: true, data: products });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Update product
  const product = await Product.findByIdAndUpdate(id, req.body, { new: true });

  // Invalidate caches
  await cacheService.invalidateProduct(id);

  res.json({ success: true, data: product });
};
```

### Cache Warming

```typescript
// services/cacheWarmer.ts
import { cacheService } from './cacheService';
import { Product, Category } from '../models';

class CacheWarmer {
  // Warm popular data on startup
  async warmCache() {
    logger.info('Warming cache...');

    // Cache popular categories
    const categories = await Category.find({ isActive: true });
    for (const category of categories) {
      const products = await Product.find({ category: category._id })
        .limit(20)
        .lean();
      await cacheService.set(
        `products:${category._id}:1:20`,
        products,
        3600
      );
    }

    // Cache featured products
    const featured = await Product.find({ isFeatured: true })
      .limit(10)
      .lean();
    await cacheService.set('products:featured', featured, 7200);

    logger.info('Cache warming completed');
  }

  // Schedule periodic cache refresh
  startPeriodicWarming() {
    // Refresh every hour
    setInterval(() => {
      this.warmCache();
    }, 3600000);
  }
}

export const cacheWarmer = new CacheWarmer();

// In server.ts
cacheWarmer.warmCache();
cacheWarmer.startPeriodicWarming();
```

### Cache-Aside Pattern

```typescript
// Get data (cache-aside)
const getData = async (key: string) => {
  // 1. Try cache
  let data = await cacheService.get(key);

  // 2. If not in cache, get from DB
  if (!data) {
    data = await database.find(key);

    // 3. Store in cache
    if (data) {
      await cacheService.set(key, data, 3600);
    }
  }

  return data;
};

// Update data (write-through)
const updateData = async (key: string, newData: any) => {
  // 1. Update database
  await database.update(key, newData);

  // 2. Update cache
  await cacheService.set(key, newData, 3600);

  // 3. Or invalidate cache (write-invalidate)
  // await cacheService.delete(key);
};
```

---

## CDN Optimization

### Cloudflare Configuration

#### Page Rules

```yaml
Rule 1: API Bypass
  URL: api.rezapp.com/*
  Settings:
    - Cache Level: Bypass
    - Security Level: Medium

Rule 2: Static Assets
  URL: rezapp.com/static/*
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 1 month
    - Browser Cache TTL: 1 year

Rule 3: Images
  URL: rezapp.com/images/*
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 1 month
    - Polish: Lossless
    - Mirage: On

Rule 4: Homepage
  URL: rezapp.com/
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 4 hours
    - Browser Cache TTL: 4 hours
```

#### Image Optimization

```typescript
// Cloudinary configuration
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Optimize images on upload
export const uploadImage = async (file: Express.Multer.File) => {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'rezapp',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
      { quality: 'auto' }, // Auto quality
      { fetch_format: 'auto' }, // Auto format (WebP if supported)
    ],
    responsive_breakpoints: [
      {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 1200,
        max_images: 5,
      },
    ],
  });

  return result;
};

// Generate optimized URL
export const getOptimizedImageUrl = (publicId: string, width: number) => {
  return cloudinary.url(publicId, {
    transformation: [
      { width, crop: 'scale' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
};
```

### AWS CloudFront Configuration

```typescript
// infrastructure/cloudfront.tf
resource "aws_cloudfront_distribution" "rezapp" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "REZ App CDN"
  default_root_object = "index.html"

  # Origins
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-rezapp-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.rezapp.cloudfront_access_identity_path
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-rezapp-static"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # Cache behavior for images
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-rezapp-static"

    forwarded_values {
      query_string = false
      headers      = ["Accept"]
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 2592000  # 30 days
    max_ttl                = 31536000 # 1 year
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Geographic restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.rezapp.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Aliases
  aliases = ["rezapp.com", "www.rezapp.com"]
}
```

---

## Load Testing Results and Recommendations

### Load Testing Tools

```bash
# Install k6 for load testing
brew install k6  # macOS
# or
wget https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz
```

### Load Testing Scripts

Create `loadtests/api-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    errors: ['rate<0.01'], // Error rate < 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'https://api.rezapp.com';

export default function () {
  // Test 1: Get products
  let res = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
  check(res, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Search products
  res = http.get(`${BASE_URL}/api/products/search?q=electronics`);
  check(res, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Get product details
  res = http.get(`${BASE_URL}/api/products/123456`);
  check(res, {
    'product detail status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
```

Create `loadtests/spike-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Normal load
    { duration: '30s', target: 5000 }, // Spike!
    { duration: '1m', target: 5000 },  // Stay at spike
    { duration: '1m', target: 100 },   // Return to normal
  ],
};

const BASE_URL = 'https://api.rezapp.com';

export default function () {
  http.get(`${BASE_URL}/api/products`);
  sleep(1);
}
```

Create `loadtests/stress-test.js`:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 2000 },
    { duration: '5m', target: 2000 },
    { duration: '10m', target: 0 },
  ],
};

const BASE_URL = 'https://api.rezapp.com';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/products`],
    ['GET', `${BASE_URL}/api/categories`],
    ['GET', `${BASE_URL}/api/stores`],
  ]);

  check(responses[0], {
    'products request successful': (r) => r.status === 200,
  });
}
```

### Running Load Tests

```bash
# Basic load test
k6 run loadtests/api-test.js

# With results output
k6 run --out json=results.json loadtests/api-test.js

# With cloud results
k6 run --out cloud loadtests/api-test.js

# Spike test
k6 run loadtests/spike-test.js

# Stress test
k6 run loadtests/stress-test.js
```

### Expected Results

```yaml
Current Configuration (2x t3.xlarge):
  Concurrent Users: 10,000
  Requests/Second: 500
  Response Time (p95): 450ms
  Response Time (p99): 800ms
  Error Rate: < 0.1%
  Success Rate: > 99.9%

Bottlenecks Identified:
  1. Database queries (15% of requests > 1s)
  2. Image processing (10% of uploads timeout)
  3. Search functionality (slow on large result sets)

Recommendations:
  1. Add read replicas for database
  2. Implement caching for popular queries
  3. Optimize image processing pipeline
  4. Add Elasticsearch for search
  5. Scale to 5x t3.xlarge for 50k users
```

### Performance Optimization Results

```yaml
Before Optimization:
  Average Response Time: 650ms
  p95 Response Time: 1200ms
  Throughput: 300 req/s
  Error Rate: 2%

After Optimization:
  Average Response Time: 280ms (↓ 57%)
  p95 Response Time: 450ms (↓ 63%)
  Throughput: 500 req/s (↑ 67%)
  Error Rate: 0.1% (↓ 95%)

Optimizations Applied:
  1. Redis caching for product catalog
  2. Database query optimization (added indexes)
  3. Image CDN integration
  4. Connection pooling tuning
  5. Gzip compression enabled
```

---

## Cost Optimization

### Current Cost Breakdown

```yaml
Monthly Costs (10,000 users):
  AWS EC2 (2x t3.xlarge): $240
  AWS ALB: $25
  MongoDB Atlas M30: $350
  Redis (cache.r6g.large): $115
  Cloudflare Pro: $20
  Cloudinary: $99
  AWS S3 + CloudFront: $50
  Sentry: $26
  SendGrid: $15
  Twilio: $50
  Domain & SSL: $15
  Total: ~$1,005/month

Cost per User: $0.10/month
```

### Scaling Cost Projection

```yaml
50,000 Users:
  AWS EC2 (5x t3.xlarge): $600
  MongoDB Atlas M50: $650
  Redis Cluster: $400
  Other Services: +50%
  Total: ~$2,800/month
  Cost per User: $0.056/month (↓ 44%)

200,000 Users:
  AWS EC2 (20x c5.2xlarge): $4,800
  MongoDB Atlas M80: $2,000
  Redis Enterprise: $800
  Other Services: +100%
  Total: ~$12,000/month
  Cost per User: $0.06/month

Economies of Scale: YES ✓
```

### Cost Optimization Strategies

#### 1. Reserved Instances

```yaml
EC2 Reserved Instances:
  1-year upfront: 35% savings
  3-year upfront: 50% savings

For stable load (2 base servers):
  On-demand: $240/month
  1-year reserved: $156/month (↓ $84)
  3-year reserved: $120/month (↓ $120)

Annual Savings: $1,440 (3-year reserved)
```

#### 2. Spot Instances

```bash
# Use Spot Instances for non-critical workloads
# Example: Background jobs, data processing

# Launch spot instance
aws ec2 run-instances \
  --instance-type t3.xlarge \
  --instance-market-options '{"MarketType":"spot","SpotOptions":{"MaxPrice":"0.05","SpotInstanceType":"one-time"}}' \
  --image-id ami-xxxxx

# Savings: Up to 70% off on-demand price
```

#### 3. Auto-Scaling Optimization

```yaml
Strategy: Scale based on actual load

Off-Peak Hours (12 AM - 6 AM):
  Minimum instances: 2
  Average load: 20%
  Cost: $8/day

Peak Hours (6 PM - 10 PM):
  Maximum instances: 8
  Average load: 70%
  Cost: $4/hour × 4 hours = $16/day

Daily Savings: ~$100/day vs running 8 instances 24/7
Monthly Savings: ~$3,000
```

#### 4. Database Optimization

```yaml
MongoDB Atlas Optimization:
  - Use M30 instead of M40: Save $200/month
  - Enable compression: Save 40% storage costs
  - Optimize indexes: Reduce IOPS, lower tier
  - Clean old data: Archive to S3

Potential Savings: $300-500/month
```

#### 5. CDN Optimization

```yaml
Cloudflare vs CloudFront:
  Cloudflare Pro: $20/month (unlimited bandwidth)
  CloudFront: ~$100/month (1TB bandwidth)

Savings: $80/month

Image Optimization:
  WebP format: 30% smaller than JPEG
  Lazy loading: 50% fewer image requests
  Responsive images: 40% bandwidth savings

Total Image Cost Reduction: 60%
Savings: ~$100/month on image delivery
```

#### 6. Monitoring and Logging

```yaml
Optimize Log Retention:
  Current: 30 days full logs = $200/month
  Optimized: 7 days full, 30 days errors = $80/month

Savings: $120/month
```

### Total Optimized Cost

```yaml
Before Optimization: $1,005/month
After Optimization: $650/month
Savings: $355/month (35% reduction)
Annual Savings: $4,260
```

---

## Performance Budgets

### API Performance Budgets

```yaml
Endpoint Performance Targets:

GET /api/products:
  Average: < 200ms
  p95: < 400ms
  p99: < 800ms
  Timeout: 5s

POST /api/auth/login:
  Average: < 300ms
  p95: < 500ms
  p99: < 1000ms
  Timeout: 5s

GET /api/products/:id:
  Average: < 150ms
  p95: < 300ms
  p99: < 600ms
  Timeout: 3s

POST /api/orders:
  Average: < 500ms
  p95: < 1000ms
  p99: < 2000ms
  Timeout: 10s

POST /api/payments:
  Average: < 800ms
  p95: < 1500ms
  p99: < 3000ms
  Timeout: 30s

GET /api/search:
  Average: < 400ms
  p95: < 800ms
  p99: < 1500ms
  Timeout: 5s
```

### Frontend Performance Budgets

```yaml
Mobile App (React Native):
  App Size:
    - iOS: < 50 MB
    - Android: < 30 MB
    - JavaScript bundle: < 5 MB

  Load Times:
    - App launch: < 2 seconds
    - Screen transition: < 300ms
    - Image load: < 1 second

  Memory:
    - Idle: < 100 MB
    - Active: < 250 MB
    - Peak: < 400 MB

  Network:
    - API calls per screen: < 3
    - Prefetch data: Yes
    - Offline support: Critical features

Web App:
  Bundle Size:
    - Initial bundle: < 200 KB
    - Total JS: < 500 KB
    - Total CSS: < 50 KB
    - Images (first view): < 300 KB

  Load Times:
    - First Contentful Paint: < 1.5s
    - Time to Interactive: < 3.5s
    - Largest Contentful Paint: < 2.5s

  Lighthouse Scores:
    - Performance: > 90
    - Accessibility: > 95
    - Best Practices: > 95
    - SEO: > 95
```

### Database Performance Budgets

```yaml
Query Performance:
  Simple queries: < 50ms
  Aggregations: < 200ms
  Complex joins: < 500ms
  Full-text search: < 1000ms

Connection Pool:
  Size: 50 connections
  Utilization: < 80%
  Wait time: < 100ms

Storage:
  Database size: Monitor at 500 GB
  Index size: < 20% of data size
  Working set: < Available RAM
```

### Infrastructure Budgets

```yaml
Server Resources:
  CPU Utilization: < 70% average
  Memory Utilization: < 80%
  Disk I/O: < 80% capacity
  Network: < 80% bandwidth

Availability:
  Uptime: > 99.95% (4.38 hours downtime/year)
  Error Rate: < 0.1%
  Mean Time to Recovery: < 15 minutes
```

---

## Scaling Checklist

### When to Scale

```yaml
Scale Application Servers When:
  - CPU utilization > 70% for 5+ minutes
  - Response time p95 > 1000ms
  - Request queue length > 100
  - Memory utilization > 80%

Scale Database When:
  - Database size > 500 GB
  - IOPS > 80% capacity
  - Connection pool > 80% utilized
  - Query performance degrading

Scale Cache When:
  - Cache memory > 80% utilized
  - Cache hit rate < 70%
  - Eviction rate high
  - Connection timeouts occurring

Scale CDN When:
  - Bandwidth costs increasing significantly
  - Origin requests > 20% of total
  - Edge location latency increasing
```

### Scaling Execution Plan

```yaml
Phase 1: Monitoring (Weeks 1-2)
  - Set up comprehensive monitoring
  - Establish baseline metrics
  - Configure alerts
  - Document current performance

Phase 2: Optimization (Weeks 3-4)
  - Optimize database queries
  - Implement caching
  - CDN configuration
  - Code optimization

Phase 3: Horizontal Scaling (Weeks 5-6)
  - Add application servers
  - Configure load balancing
  - Test auto-scaling
  - Verify redundancy

Phase 4: Database Scaling (Weeks 7-8)
  - Add read replicas
  - Implement sharding (if needed)
  - Optimize connection pooling
  - Test failover

Phase 5: Global Distribution (Weeks 9-12)
  - Multi-region deployment
  - Geographic load balancing
  - Data replication
  - Disaster recovery testing
```

---

## Monitoring Scaling Metrics

### Key Metrics Dashboard

```yaml
Real-time Metrics:
  - Active users
  - Requests per second
  - Average response time
  - Error rate
  - CPU/Memory utilization

Daily Metrics:
  - Daily active users (DAU)
  - Peak concurrent users
  - Average response time by endpoint
  - Error breakdown
  - Database query performance

Weekly Metrics:
  - Weekly active users (WAU)
  - User retention
  - Feature usage statistics
  - Performance trends
  - Cost per user

Monthly Metrics:
  - Monthly active users (MAU)
  - Growth rate
  - Infrastructure costs
  - Performance vs targets
  - Capacity planning forecast
```

---

This scaling guide provides a comprehensive roadmap for scaling the REZ app from initial launch to enterprise scale. Adjust timelines and strategies based on actual growth patterns and business requirements.
