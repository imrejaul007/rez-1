# Monitoring & Logging - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (Already Done)
```bash
npm install winston winston-daily-rotate-file @sentry/node prom-client newrelic
```

### Step 2: Configure Environment
Add to `.env`:
```bash
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
NEW_RELIC_LICENSE_KEY=your-license-key
PROMETHEUS_ENABLED=true
```

### Step 3: Import and Use

#### In your server.ts:
```typescript
import { logger } from './config/logger';
import { initSentry } from './config/sentry';
import healthRoutes from './merchantroutes/health';
import metricsRoutes from './merchantroutes/metrics';

// Initialize Sentry
initSentry(app);

// Add routes
app.use('/', healthRoutes);
app.use('/', metricsRoutes);

// Start server
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
});
```

---

## 📝 Common Usage Patterns

### Logging
```typescript
import { logger } from './config/logger';

// Info
logger.info('Order created', { orderId: order.id, amount: order.total });

// Warning
logger.warn('Slow query detected', { duration: '2s' });

// Error
logger.error('Payment failed', { error: error.message, orderId: order.id });

// Debug (only in development)
logger.debug('Processing data', { data });
```

### Metrics
```typescript
import { metrics } from './services/MetricsService';

// Counter
metrics.increment('orders.created', 1, { status: 'success' });

// Gauge
metrics.gauge('active.users', 150);

// Timing
metrics.timing('payment.processing', durationMs);
```

### Performance Monitoring
```typescript
import { perfMonitor } from './services/PerformanceMonitor';

// Async function
const result = await perfMonitor.measure('fetchOrders', async () => {
  return await Order.find({});
});

// Manual timing
perfMonitor.start('processPayment');
// ... do work
const duration = perfMonitor.end('processPayment');
```

### Error Tracking
```typescript
import { captureException } from './config/sentry';

try {
  await processPayment(order);
} catch (error) {
  captureException(error, { orderId: order.id });
  throw error;
}
```

---

## 🔍 Check Monitoring

### Health Check
```bash
curl http://localhost:5000/health/detailed
```

### View Metrics
```bash
# Prometheus format
curl http://localhost:5000/metrics

# JSON format
curl http://localhost:5000/metrics/app | jq .
```

### View Logs
```bash
# Tail all logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Tail errors only
tail -f logs/error-$(date +%Y-%m-%d).log

# Pretty print JSON
tail -f logs/combined-$(date +%Y-%m-%d).log | jq .
```

---

## 📊 Dashboards

### Grafana
1. Import `dashboards/merchant-backend.json`
2. Access: http://localhost:3000
3. Default credentials: admin/admin

### Kibana
1. Access: http://localhost:5601
2. Create index pattern: `rez-logs-*`
3. View logs in Discover

---

## 🚨 Alerts

### Start Alert Monitoring
```typescript
import { startAlertMonitoring } from './config/alerts';

startAlertMonitoring();
```

### Pre-configured Alerts
- High Error Rate (> 1%)
- High Response Time (p95 > 500ms)
- Database Connection Lost
- High Memory Usage (> 90%)
- Slow Database Queries

### Add Custom Alert
```typescript
import { addAlert } from './config/alerts';

addAlert({
  name: 'High Order Volume',
  condition: async () => {
    const count = await Order.countRecent();
    return count > 1000;
  },
  message: 'Order volume exceeds 1000',
  severity: 'medium',
  cooldown: 300
});
```

---

## 🛠️ Troubleshooting

### Logs Not Appearing
```bash
# Check log directory
ls -la logs/

# Check log level
echo $LOG_LEVEL

# Test logging
node -e "require('./src/config/logger').logger.info('test')"
```

### Metrics Not Showing
```bash
# Check endpoint
curl http://localhost:5000/metrics

# Check Prometheus scraping
curl http://prometheus:9090/api/v1/targets
```

### Sentry Not Working
```bash
# Check DSN
echo $SENTRY_DSN

# Test Sentry
node -e "require('./src/config/sentry').captureMessage('test')"
```

---

## 📚 Full Documentation

For detailed information, see:
- `docs/WEEK8_PHASE6B_MONITORING.md` - Complete implementation guide
- `docs/LOGGING_GUIDE.md` - Logging best practices
- `docs/METRICS_REFERENCE.md` - All metrics reference
- `docs/ALERTING_PLAYBOOK.md` - Alert response procedures

---

## 🎯 Key Files

### Configuration
- `src/config/logger.ts` - Winston logger
- `src/config/sentry.ts` - Sentry integration
- `src/config/prometheus.ts` - Prometheus metrics
- `src/config/alerts.ts` - Alert system

### Services
- `src/services/MetricsService.ts` - Custom metrics
- `src/services/PerformanceMonitor.ts` - Performance tracking

### Middleware
- `src/middleware/logging.ts` - Request logging
- `src/middleware/errorLogger.ts` - Error handling

### Routes
- `src/merchantroutes/health.ts` - Health checks
- `src/merchantroutes/metrics.ts` - Metrics endpoints

---

## 🔗 Quick Links

- Health: http://localhost:5000/health/detailed
- Metrics: http://localhost:5000/metrics
- Grafana: http://localhost:3000
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090

---

**Ready to go! Start monitoring your application now!** 🎉
