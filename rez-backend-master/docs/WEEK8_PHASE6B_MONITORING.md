# Week 8 - Phase 6B: Monitoring & Logging Implementation

## Overview
This document provides a comprehensive guide to the monitoring and logging infrastructure implemented for the REZ Merchant Backend.

## Table of Contents
1. [Architecture](#architecture)
2. [Components](#components)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Dashboards](#dashboards)
7. [Alerting](#alerting)
8. [Best Practices](#best-practices)

---

## Architecture

### Monitoring Stack
```
┌─────────────────────────────────────────────────┐
│                  Application                     │
│  ┌─────────────┐  ┌──────────────┐             │
│  │   Logger    │  │  Prometheus  │             │
│  │  (Winston)  │  │   Metrics    │             │
│  └──────┬──────┘  └──────┬───────┘             │
└─────────┼─────────────────┼─────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│   ELK Stack      │  │    Grafana       │
│  ┌────────────┐  │  │  ┌────────────┐  │
│  │Elasticsearch│  │  │  │ Dashboards │  │
│  │  Logstash  │  │  │  │   Alerts   │  │
│  │   Kibana   │  │  │  └────────────┘  │
│  └────────────┘  │  └──────────────────┘
└──────────────────┘
          │
          ▼
┌──────────────────┐
│     Sentry       │
│  Error Tracking  │
└──────────────────┘
```

### Data Flow
1. Application logs → Winston → Log Files → Logstash → Elasticsearch → Kibana
2. Metrics → Prometheus → Grafana
3. Errors → Sentry
4. APM → New Relic

---

## Components

### 1. Winston Logger (`src/config/logger.ts`)
- Structured logging with JSON format
- Log levels: error, warn, info, http, debug
- Daily log rotation
- Separate files for different log types
- Automatic exception/rejection handling
- Sensitive data sanitization

### 2. Sentry Integration (`src/config/sentry.ts`)
- Real-time error tracking
- Error grouping and deduplication
- Release tracking
- Performance monitoring
- User context tracking
- Before-send hooks for data sanitization

### 3. Prometheus Metrics (`src/config/prometheus.ts`)
- HTTP request metrics (count, duration)
- Database query metrics
- Error tracking
- Business metrics (orders, revenue, bookings)
- Custom metrics support

### 4. Metrics Service (`src/services/MetricsService.ts`)
- Custom metrics collection
- Counter, Gauge, Histogram support
- Percentile calculations (p50, p95, p99)
- Prometheus export format
- Automatic old metrics cleanup

### 5. Performance Monitor (`src/services/PerformanceMonitor.ts`)
- Function execution timing
- Async/sync operation measurement
- Performance threshold alerts
- Automatic metric recording

### 6. Health Checks (`src/merchantroutes/health.ts`)
- `/health` - Basic health check
- `/health/detailed` - Detailed system status
- `/ready` - Kubernetes readiness probe
- `/live` - Kubernetes liveness probe
- `/startup` - Kubernetes startup probe

### 7. Alert System (`src/config/alerts.ts`)
- Pre-configured alert rules
- Cooldown periods
- Multiple notification channels
- Custom alert support

---

## Installation

### 1. Install Dependencies
```bash
cd user-backend
npm install winston winston-daily-rotate-file
npm install @sentry/node prom-client newrelic
```

### 2. Configure Environment Variables
```bash
# .env
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
NEW_RELIC_APP_NAME=REZ Merchant Backend
PROMETHEUS_ENABLED=true
METRICS_PORT=9090
```

### 3. Start ELK Stack (Optional)
```bash
docker-compose -f docker-compose.elk.yml up -d
```

### 4. Access Dashboards
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

---

## Configuration

### Logger Configuration
```typescript
import { logger } from './config/logger';

// Log with context
logger.info('User logged in', {
  userId: user.id,
  ip: req.ip
});

// Log errors
logger.error('Payment failed', {
  error: error.message,
  stack: error.stack,
  orderId: order.id
});
```

### Prometheus Metrics
```typescript
import { httpRequestCounter, httpRequestDuration } from './config/prometheus';

// Increment counter
httpRequestCounter.inc({
  method: 'GET',
  route: '/api/orders',
  status: '200'
});

// Observe duration
httpRequestDuration.observe({
  method: 'GET',
  route: '/api/orders',
  status: '200'
}, duration);
```

### Custom Metrics
```typescript
import { metrics } from './services/MetricsService';

// Increment counter
metrics.increment('orders.created', 1, { status: 'success' });

// Record gauge
metrics.gauge('active.users', 150);

// Record timing
metrics.timing('payment.processing', durationMs);
```

### Performance Monitoring
```typescript
import { perfMonitor } from './services/PerformanceMonitor';

// Measure async function
const result = await perfMonitor.measure('fetchOrders', async () => {
  return await Order.find({});
});

// Manual timing
perfMonitor.start('processPayment');
// ... do work
const duration = perfMonitor.end('processPayment');
```

---

## Usage

### 1. Basic Logging
```typescript
// Import logger
import { logger } from './config/logger';

// Log at different levels
logger.debug('Debugging information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error message');

// Log with metadata
logger.info('Order created', {
  orderId: order._id,
  amount: order.total,
  customerId: order.customerId
});
```

### 2. Request Logging
```typescript
// Middleware automatically logs all requests
import { loggingMiddleware } from './middleware/logging';
app.use(loggingMiddleware);

// Logs include:
// - Request method, path, query params
// - Response status, duration
// - IP address, user agent
// - Correlation ID for request tracing
```

### 3. Error Tracking
```typescript
import { captureException, captureMessage } from './config/sentry';

// Capture exceptions
try {
  await processPayment(order);
} catch (error) {
  captureException(error, {
    orderId: order.id,
    amount: order.total
  });
  throw error;
}

// Capture messages
captureMessage('Payment processing slow', 'warning', {
  duration: processingTime
});
```

### 4. Health Checks
```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Readiness check
curl http://localhost:5000/ready

# Liveness check
curl http://localhost:5000/live
```

### 5. Metrics Collection
```typescript
// Business metrics
import { orderCounter, revenueCounter } from './config/prometheus';

orderCounter.inc({ status: 'completed' });
revenueCounter.inc({ currency: 'INR' }, order.total);

// Custom metrics
import { metrics } from './services/MetricsService';

metrics.increment('api.calls', 1, { endpoint: '/orders' });
metrics.timing('db.query', queryTime, { collection: 'orders' });
```

---

## Dashboards

### Grafana Dashboard
Import `dashboards/merchant-backend.json` into Grafana for pre-configured visualizations:

**Panels:**
1. Request Rate (req/s)
2. Response Time Percentiles (p50, p95, p99)
3. Error Rate
4. Database Query Duration
5. Active Users
6. Memory Usage
7. CPU Usage
8. Recent Errors Table

### Kibana Dashboards
1. **Application Logs**: View all application logs
2. **Error Logs**: Filter and analyze errors
3. **HTTP Access Logs**: API request patterns
4. **Performance Logs**: Slow requests and queries

### Creating Custom Dashboards
```bash
# Access Grafana
http://localhost:3000

# Add Prometheus data source
Configuration → Data Sources → Add Prometheus
URL: http://prometheus:9090

# Import dashboard
Create → Import → Upload merchant-backend.json
```

---

## Alerting

### Pre-configured Alerts

1. **High Error Rate**
   - Condition: Error rate > 1%
   - Severity: High
   - Cooldown: 5 minutes

2. **High Response Time**
   - Condition: p95 > 500ms
   - Severity: Medium
   - Cooldown: 5 minutes

3. **Database Connection Lost**
   - Condition: MongoDB not connected
   - Severity: Critical
   - Cooldown: 1 minute

4. **High Memory Usage**
   - Condition: Heap usage > 90%
   - Severity: High
   - Cooldown: 5 minutes

5. **Slow Database Queries**
   - Condition: p95 query time > 1s
   - Severity: Medium
   - Cooldown: 5 minutes

### Starting Alert Monitoring
```typescript
import { startAlertMonitoring } from './config/alerts';

// Start monitoring
startAlertMonitoring();
```

### Custom Alerts
```typescript
import { addAlert } from './config/alerts';

addAlert({
  name: 'High Order Volume',
  condition: async () => {
    const orders = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 60000) }
    });
    return orders > 1000;
  },
  message: 'Order volume exceeds 1000 per minute',
  severity: 'medium',
  cooldown: 300
});
```

### Notification Channels
Configure in `src/config/alerts.ts`:
- PagerDuty (critical alerts)
- Slack (high/medium alerts)
- Email (all severities)

---

## Best Practices

### 1. Logging
- ✅ Use structured logging (JSON format)
- ✅ Include correlation IDs for request tracing
- ✅ Never log sensitive data (passwords, tokens, PAN)
- ✅ Use appropriate log levels
- ✅ Log errors with stack traces
- ✅ Include context in log messages
- ❌ Don't log in tight loops
- ❌ Don't log excessive detail in production

### 2. Metrics
- ✅ Use counters for events (orders, errors)
- ✅ Use gauges for snapshots (active users, queue size)
- ✅ Use histograms for measurements (duration, size)
- ✅ Add relevant labels to metrics
- ✅ Keep metric names consistent
- ❌ Don't create metrics with high cardinality
- ❌ Don't track every single value

### 3. Error Tracking
- ✅ Capture all unhandled exceptions
- ✅ Add context to errors
- ✅ Group similar errors
- ✅ Set up error budgets
- ✅ Monitor error trends
- ❌ Don't ignore errors
- ❌ Don't capture expected errors

### 4. Performance Monitoring
- ✅ Monitor critical paths
- ✅ Set performance budgets
- ✅ Track slow queries
- ✅ Monitor external API calls
- ✅ Use profiling in development
- ❌ Don't monitor everything (overhead)
- ❌ Don't ignore performance degradation

### 5. Alerting
- ✅ Alert on symptoms, not causes
- ✅ Make alerts actionable
- ✅ Use appropriate severity levels
- ✅ Implement cooldown periods
- ✅ Document runbooks
- ❌ Don't create noisy alerts
- ❌ Don't alert on everything

---

## Troubleshooting

### Logs Not Appearing
1. Check log directory exists and is writable
2. Verify LOG_LEVEL environment variable
3. Check Winston configuration
4. Verify Logstash is running

### Metrics Not Showing
1. Check Prometheus is scraping endpoint
2. Verify /metrics endpoint is accessible
3. Check metric naming (no duplicates)
4. Verify Grafana data source configuration

### Alerts Not Firing
1. Verify alert monitoring is started
2. Check alert conditions are correct
3. Verify notification channels are configured
4. Check cooldown periods

### Sentry Errors Not Showing
1. Verify SENTRY_DSN is set correctly
2. Check network connectivity to Sentry
3. Verify before-send hook isn't filtering too much
4. Check Sentry project settings

---

## Maintenance

### Log Rotation
- Logs automatically rotate daily
- Combined logs: 14 days retention
- Error logs: 30 days retention
- HTTP logs: 7 days retention

### Metrics Cleanup
- Old metrics cleaned every 10 minutes
- Keep only last hour of data
- Longer retention in Prometheus/Grafana

### Database Cleanup
```bash
# Clean old log entries from Elasticsearch
curl -X DELETE "localhost:9200/rez-logs-*-$(date -d '30 days ago' +%Y.%m.%d)"
```

---

## Production Checklist

- [ ] Configure SENTRY_DSN
- [ ] Set NEW_RELIC_LICENSE_KEY
- [ ] Configure log retention policies
- [ ] Set up Grafana dashboards
- [ ] Configure alert notification channels
- [ ] Set LOG_LEVEL=warn or LOG_LEVEL=error
- [ ] Enable Prometheus scraping
- [ ] Set up log aggregation (ELK/CloudWatch)
- [ ] Configure backup for metrics
- [ ] Document runbooks for alerts
- [ ] Set up on-call rotation
- [ ] Test alert notifications
- [ ] Configure CORS for metrics endpoints
- [ ] Enable authentication for dashboards

---

## Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Prometheus Client](https://github.com/sigs/prometheus-client_nodejs)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Guide](https://www.elastic.co/guide/)
- [New Relic APM](https://docs.newrelic.com/docs/apm/)

---

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review Sentry error reports
3. Check Grafana dashboards
4. Consult team documentation
5. Contact DevOps team
