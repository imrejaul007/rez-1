# Metrics Reference Guide

## Overview
Complete reference for all metrics collected in the REZ Merchant Backend.

---

## Table of Contents
1. [Metrics Types](#metrics-types)
2. [HTTP Metrics](#http-metrics)
3. [Database Metrics](#database-metrics)
4. [Business Metrics](#business-metrics)
5. [System Metrics](#system-metrics)
6. [Custom Metrics](#custom-metrics)
7. [Querying Metrics](#querying-metrics)

---

## Metrics Types

### Counter
Cumulative metric that only increases.

**Use Cases:**
- Total requests
- Total errors
- Total orders
- Total revenue

**Example:**
```typescript
import { httpRequestCounter } from './config/prometheus';

httpRequestCounter.inc({ method: 'GET', route: '/orders', status: '200' });
```

### Gauge
Snapshot metric that can go up or down.

**Use Cases:**
- Active users
- Queue size
- Memory usage
- CPU usage

**Example:**
```typescript
import { activeUsers } from './config/prometheus';

activeUsers.set(150);
```

### Histogram
Samples observations and counts them in configurable buckets.

**Use Cases:**
- Request duration
- Response size
- Database query time

**Example:**
```typescript
import { httpRequestDuration } from './config/prometheus';

httpRequestDuration.observe({ method: 'GET', route: '/orders', status: '200' }, 0.235);
```

---

## HTTP Metrics

### http_requests_total
**Type:** Counter
**Labels:** method, route, status
**Description:** Total number of HTTP requests

**Example:**
```prometheus
http_requests_total{method="GET",route="/api/orders",status="200"} 1523
http_requests_total{method="POST",route="/api/orders",status="201"} 342
http_requests_total{method="GET",route="/api/products",status="200"} 2891
```

**Queries:**
```prometheus
# Request rate per second
rate(http_requests_total[5m])

# Request rate by route
sum(rate(http_requests_total[5m])) by (route)

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

### http_request_duration_seconds
**Type:** Histogram
**Labels:** method, route, status
**Buckets:** 0.1, 0.5, 1, 2, 5, 10 seconds
**Description:** HTTP request duration in seconds

**Example:**
```prometheus
http_request_duration_seconds_bucket{method="GET",route="/api/orders",status="200",le="0.1"} 1234
http_request_duration_seconds_bucket{method="GET",route="/api/orders",status="200",le="0.5"} 1456
http_request_duration_seconds_sum{method="GET",route="/api/orders",status="200"} 123.45
http_request_duration_seconds_count{method="GET",route="/api/orders",status="200"} 1523
```

**Queries:**
```prometheus
# p50 response time
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# p95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# p99 response time
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

---

## Database Metrics

### db_query_duration_seconds
**Type:** Histogram
**Labels:** operation, collection
**Buckets:** 0.01, 0.05, 0.1, 0.5, 1, 2 seconds
**Description:** Database query duration in seconds

**Example:**
```prometheus
db_query_duration_seconds_bucket{operation="find",collection="orders",le="0.1"} 2345
db_query_duration_seconds_sum{operation="find",collection="orders"} 234.56
db_query_duration_seconds_count{operation="find",collection="orders"} 2891
```

**Usage:**
```typescript
import { trackDbOperation } from './config/prometheus';

const orders = await trackDbOperation('find', 'orders', async () => {
  return await Order.find({ status: 'pending' });
});
```

**Queries:**
```prometheus
# p95 query time
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))

# Slow queries (> 1s)
count(db_query_duration_seconds_bucket{le="1"} == 0)

# Query rate by collection
sum(rate(db_query_duration_seconds_count[5m])) by (collection)
```

### db_connections_active
**Type:** Gauge
**Description:** Number of active database connections

**Example:**
```prometheus
db_connections_active 25
```

**Queries:**
```prometheus
# Current active connections
db_connections_active

# Average connections over time
avg_over_time(db_connections_active[5m])

# Max connections reached
max_over_time(db_connections_active[1h])
```

---

## Business Metrics

### orders_total
**Type:** Counter
**Labels:** status
**Description:** Total number of orders

**Example:**
```prometheus
orders_total{status="completed"} 1234
orders_total{status="pending"} 45
orders_total{status="cancelled"} 89
```

**Usage:**
```typescript
import { orderCounter } from './config/prometheus';

// On order creation
orderCounter.inc({ status: 'pending' });

// On order completion
orderCounter.inc({ status: 'completed' });
```

**Queries:**
```prometheus
# Orders per minute
rate(orders_total[1m]) * 60

# Completion rate
rate(orders_total{status="completed"}[5m]) / rate(orders_total[5m])

# Cancellation rate
rate(orders_total{status="cancelled"}[5m]) / rate(orders_total[5m])
```

### revenue_total
**Type:** Counter
**Labels:** currency
**Description:** Total revenue

**Example:**
```prometheus
revenue_total{currency="INR"} 1234567.89
revenue_total{currency="USD"} 15432.10
```

**Usage:**
```typescript
import { revenueCounter } from './config/prometheus';

revenueCounter.inc({ currency: 'INR' }, order.total);
```

**Queries:**
```prometheus
# Revenue rate (per minute)
rate(revenue_total[1m]) * 60

# Revenue by currency
sum(rate(revenue_total[5m])) by (currency)

# Total revenue today
increase(revenue_total[24h])
```

### bookings_total
**Type:** Counter
**Labels:** status, type
**Description:** Total number of bookings

**Example:**
```prometheus
bookings_total{status="confirmed",type="restaurant"} 456
bookings_total{status="confirmed",type="salon"} 234
bookings_total{status="cancelled",type="restaurant"} 23
```

**Usage:**
```typescript
import { bookingCounter } from './config/prometheus';

bookingCounter.inc({ status: 'confirmed', type: 'restaurant' });
```

**Queries:**
```prometheus
# Bookings per hour
rate(bookings_total[1h]) * 3600

# Booking rate by type
sum(rate(bookings_total[5m])) by (type)

# Cancellation rate
rate(bookings_total{status="cancelled"}[5m]) / rate(bookings_total[5m])
```

---

## System Metrics

### process_resident_memory_bytes
**Type:** Gauge
**Description:** Resident memory size in bytes

**Queries:**
```prometheus
# Current memory usage
process_resident_memory_bytes

# Memory usage in MB
process_resident_memory_bytes / 1024 / 1024

# Memory usage over time
avg_over_time(process_resident_memory_bytes[5m])
```

### nodejs_heap_size_used_bytes
**Type:** Gauge
**Description:** V8 heap size used in bytes

**Queries:**
```prometheus
# Heap usage percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# Heap usage trend
rate(nodejs_heap_size_used_bytes[5m])
```

### process_cpu_user_seconds_total
**Type:** Counter
**Description:** Total user CPU time spent in seconds

**Queries:**
```prometheus
# CPU usage rate
rate(process_cpu_user_seconds_total[5m])

# Total CPU usage
rate(process_cpu_user_seconds_total[5m]) + rate(process_cpu_system_seconds_total[5m])
```

---

## Custom Metrics

### errors_total
**Type:** Counter
**Labels:** type, code
**Description:** Total number of errors

**Example:**
```prometheus
errors_total{type="server",code="500"} 23
errors_total{type="client",code="404"} 156
errors_total{type="client",code="400"} 89
```

**Usage:**
```typescript
import { errorCounter } from './config/prometheus';

errorCounter.inc({ type: 'server', code: '500' });
```

**Queries:**
```prometheus
# Error rate
rate(errors_total[5m])

# Error rate by type
sum(rate(errors_total[5m])) by (type)

# 5xx error rate
rate(errors_total{code=~"5.."}[5m])
```

### cache_operations_total
**Type:** Counter
**Labels:** operation, result
**Description:** Total number of cache operations

**Example:**
```prometheus
cache_operations_total{operation="get",result="hit"} 12345
cache_operations_total{operation="get",result="miss"} 234
cache_operations_total{operation="set",result="success"} 234
```

**Usage:**
```typescript
import { cacheCounter } from './config/prometheus';

cacheCounter.inc({ operation: 'get', result: 'hit' });
cacheCounter.inc({ operation: 'get', result: 'miss' });
```

**Queries:**
```prometheus
# Cache hit rate
rate(cache_operations_total{operation="get",result="hit"}[5m]) /
rate(cache_operations_total{operation="get"}[5m])

# Cache miss rate
rate(cache_operations_total{operation="get",result="miss"}[5m]) /
rate(cache_operations_total{operation="get"}[5m])
```

### active_users
**Type:** Gauge
**Description:** Number of currently active users

**Usage:**
```typescript
import { activeUsers } from './config/prometheus';

activeUsers.set(userCount);
```

**Queries:**
```prometheus
# Current active users
active_users

# Peak active users
max_over_time(active_users[24h])

# Average active users
avg_over_time(active_users[1h])
```

### queue_size
**Type:** Gauge
**Labels:** queue_name
**Description:** Number of items in queue

**Example:**
```prometheus
queue_size{queue_name="email"} 15
queue_size{queue_name="notification"} 8
queue_size{queue_name="image_processing"} 23
```

**Usage:**
```typescript
import { queueSize } from './config/prometheus';

queueSize.set({ queue_name: 'email' }, emailQueue.length);
```

**Queries:**
```prometheus
# Current queue size
queue_size

# Queue size by name
sum(queue_size) by (queue_name)

# Queue growth rate
rate(queue_size[5m])
```

---

## Querying Metrics

### Access Metrics Endpoint
```bash
# Prometheus format
curl http://localhost:5000/metrics

# JSON format
curl http://localhost:5000/metrics/app

# Summary statistics
curl http://localhost:5000/metrics/summary
```

### Common Queries

#### Request Rate
```prometheus
# Requests per second
rate(http_requests_total[5m])

# Requests per minute
rate(http_requests_total[1m]) * 60

# Requests per hour
rate(http_requests_total[1h]) * 3600
```

#### Error Rate
```prometheus
# Error percentage
(rate(http_requests_total{status=~"5.."}[5m]) /
 rate(http_requests_total[5m])) * 100

# 4xx error rate
rate(http_requests_total{status=~"4.."}[5m])
```

#### Response Time
```prometheus
# Average response time
rate(http_request_duration_seconds_sum[5m]) /
rate(http_request_duration_seconds_count[5m])

# p95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Slow requests (> 1s)
count(http_request_duration_seconds_bucket{le="1"} == 0)
```

#### Database Performance
```prometheus
# Query rate
rate(db_query_duration_seconds_count[5m])

# Slow queries
histogram_quantile(0.99, rate(db_query_duration_seconds_bucket[5m]))

# Queries per collection
sum(rate(db_query_duration_seconds_count[5m])) by (collection)
```

---

## Alerting Rules

### High Error Rate
```prometheus
alert: HighErrorRate
expr: |
  (rate(errors_total[5m]) / rate(http_requests_total[5m])) > 0.01
for: 5m
labels:
  severity: high
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value }}%"
```

### High Response Time
```prometheus
alert: HighResponseTime
expr: |
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
for: 5m
labels:
  severity: medium
annotations:
  summary: "High response time detected"
  description: "p95 response time is {{ $value }}s"
```

### Database Slow Queries
```prometheus
alert: SlowDatabaseQueries
expr: |
  histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m])) > 1.0
for: 5m
labels:
  severity: medium
annotations:
  summary: "Slow database queries detected"
  description: "p95 query time is {{ $value }}s"
```

---

## Dashboards

### Key Performance Indicators (KPIs)
```prometheus
# Request Rate
rate(http_requests_total[5m])

# Error Rate
(rate(errors_total[5m]) / rate(http_requests_total[5m])) * 100

# Average Response Time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# p95 Response Time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active Users
active_users

# Orders Per Hour
rate(orders_total[1h]) * 3600
```

### Resource Usage
```prometheus
# Memory Usage
process_resident_memory_bytes / 1024 / 1024

# Heap Usage Percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# CPU Usage
rate(process_cpu_user_seconds_total[5m]) + rate(process_cpu_system_seconds_total[5m])

# Active Database Connections
db_connections_active
```

---

## Best Practices

### Naming Conventions
- Use snake_case for metric names
- Suffix with unit (`_seconds`, `_bytes`, `_total`)
- Use consistent naming patterns

### Labels
- Keep cardinality low (< 1000 unique label combinations)
- Use meaningful label names
- Avoid user IDs or high-cardinality data in labels

### Performance
- Don't create too many metrics
- Use histograms for measurements
- Use gauges for snapshots
- Use counters for cumulative values

---

## Troubleshooting

### Metrics Not Showing
```bash
# Check metrics endpoint
curl http://localhost:5000/metrics

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Check metric registration
curl http://localhost:5000/metrics | grep metric_name
```

### High Cardinality
```bash
# Check label cardinality
curl http://localhost:5000/metrics | grep metric_name | wc -l

# Should be < 1000 for optimal performance
```

---

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)
