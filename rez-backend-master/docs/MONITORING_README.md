# REZ Merchant Backend - Monitoring & Logging System

## 🎯 Overview

This directory contains a comprehensive production-grade monitoring and logging infrastructure for the REZ Merchant Backend application.

---

## 📦 What's Included

### Core Components
- ✅ **Winston Logger** - Structured logging with daily rotation
- ✅ **Sentry Integration** - Real-time error tracking
- ✅ **Prometheus Metrics** - Application and business metrics
- ✅ **Custom Metrics Service** - Advanced metrics collection
- ✅ **Performance Monitor** - Function execution timing
- ✅ **Health Checks** - Kubernetes-ready health endpoints
- ✅ **Alert System** - Automated alerting with runbooks
- ✅ **New Relic APM** - Application performance monitoring
- ✅ **ELK Stack** - Log aggregation and visualization
- ✅ **Grafana Dashboard** - Pre-configured monitoring dashboard

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add:
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

### 3. Start Application
```bash
npm start
```

### 4. Verify Monitoring
```bash
# Health check
curl http://localhost:5000/health/detailed

# Metrics
curl http://localhost:5000/metrics

# View logs
tail -f logs/combined-$(date +%Y-%m-%d).log
```

---

## 📁 File Structure

```
user-backend/
├── src/
│   ├── config/
│   │   ├── logger.ts           # Winston logger configuration
│   │   ├── sentry.ts           # Sentry error tracking
│   │   ├── prometheus.ts       # Prometheus metrics
│   │   └── alerts.ts           # Alert system
│   ├── services/
│   │   ├── MetricsService.ts   # Custom metrics
│   │   └── PerformanceMonitor.ts # Performance tracking
│   ├── middleware/
│   │   ├── logging.ts          # Request logging
│   │   └── errorLogger.ts      # Error handling
│   └── merchantroutes/
│       ├── health.ts           # Health check endpoints
│       └── metrics.ts          # Metrics endpoints
├── docs/
│   ├── WEEK8_PHASE6B_MONITORING.md  # Implementation guide
│   ├── LOGGING_GUIDE.md             # Logging best practices
│   ├── METRICS_REFERENCE.md         # Metrics reference
│   └── ALERTING_PLAYBOOK.md         # Alert runbooks
├── logs/                       # Log files (auto-created)
├── dashboards/
│   └── merchant-backend.json   # Grafana dashboard
├── examples/
│   └── monitoring-integration.ts # Integration example
├── tests/
│   └── monitoring.test.ts      # Test suite
├── newrelic.js                 # New Relic config
└── docker-compose.elk.yml      # ELK Stack setup
```

---

## 📊 Monitoring Endpoints

### Health Checks
```bash
GET /health                    # Basic health check
GET /health/detailed           # Detailed system status
GET /ready                     # Kubernetes readiness probe
GET /live                      # Kubernetes liveness probe
GET /startup                   # Kubernetes startup probe
```

### Metrics
```bash
GET /metrics                   # Prometheus metrics
GET /metrics/app               # Application metrics (JSON)
GET /metrics/summary           # Metric summaries
POST /metrics/reset            # Reset metrics (admin)
```

---

## 📝 Usage Examples

### Logging
```typescript
import { logger } from './config/logger';

logger.info('Order created', { orderId: order.id, amount: order.total });
logger.error('Payment failed', { error: error.message, orderId: order.id });
```

### Metrics
```typescript
import { metrics } from './services/MetricsService';

metrics.increment('orders.created', 1, { status: 'success' });
metrics.gauge('active.users', 150);
metrics.timing('payment.processing', durationMs);
```

### Performance Monitoring
```typescript
import { perfMonitor } from './services/PerformanceMonitor';

const result = await perfMonitor.measure('fetchOrders', async () => {
  return await Order.find({});
});
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

## 📚 Documentation

### Quick References
- **Quick Start:** [MONITORING_QUICK_START.md](./MONITORING_QUICK_START.md)
- **Implementation Summary:** [MONITORING_IMPLEMENTATION_SUMMARY.md](./MONITORING_IMPLEMENTATION_SUMMARY.md)
- **Completion Report:** [PHASE6B_COMPLETION_REPORT.md](./PHASE6B_COMPLETION_REPORT.md)

### Detailed Guides
- **Implementation Guide:** [docs/WEEK8_PHASE6B_MONITORING.md](./docs/WEEK8_PHASE6B_MONITORING.md)
- **Logging Guide:** [docs/LOGGING_GUIDE.md](./docs/LOGGING_GUIDE.md)
- **Metrics Reference:** [docs/METRICS_REFERENCE.md](./docs/METRICS_REFERENCE.md)
- **Alerting Playbook:** [docs/ALERTING_PLAYBOOK.md](./docs/ALERTING_PLAYBOOK.md)

---

## 🎨 Dashboards

### Grafana
1. Import `dashboards/merchant-backend.json`
2. Access: http://localhost:3000
3. View real-time metrics and alerts

**Panels:**
- Request Rate
- Response Time (p50, p95, p99)
- Error Rate
- Database Performance
- Memory/CPU Usage
- Active Users
- Recent Errors

### Kibana
1. Access: http://localhost:5601
2. Create index pattern: `rez-logs-*`
3. View and search logs

---

## 🚨 Alerts

### Pre-configured Alerts
- **Critical:** Database connection lost
- **High:** Error rate > 5%, Response time > 2s
- **Medium:** Error rate > 1%, Slow queries
- **Low:** Warnings, minor issues

### Notification Channels
- PagerDuty (critical alerts)
- Slack (high/medium alerts)
- Email (all severities)

---

## 🔧 Configuration

### Environment Variables
```bash
# Logging
LOG_LEVEL=info                          # Log level (debug, info, warn, error)

# Sentry
SENTRY_DSN=https://...                  # Sentry project DSN

# New Relic
NEW_RELIC_LICENSE_KEY=...               # New Relic license key
NEW_RELIC_APP_NAME=REZ Merchant Backend # Application name
NEW_RELIC_LOG_LEVEL=info                # New Relic log level

# Prometheus
PROMETHEUS_ENABLED=true                 # Enable Prometheus metrics
METRICS_PORT=9090                       # Metrics port
```

### Log Retention
- Combined logs: 14 days
- Error logs: 30 days
- HTTP logs: 7 days
- Exception logs: 30 days

---

## 🧪 Testing

### Run Tests
```bash
npm test tests/monitoring.test.ts
```

### Manual Testing
```bash
# Check health
curl http://localhost:5000/health/detailed

# Check metrics
curl http://localhost:5000/metrics | head -50

# Generate test logs
curl http://localhost:5000/api/test-endpoint

# View logs
tail -f logs/combined-$(date +%Y-%m-%d).log | jq .
```

---

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Configure `SENTRY_DSN` in production
- [ ] Configure `NEW_RELIC_LICENSE_KEY` in production
- [ ] Set `LOG_LEVEL=warn` in production
- [ ] Deploy ELK Stack (if using)
- [ ] Import Grafana dashboards
- [ ] Configure alert notification channels
- [ ] Test end-to-end monitoring
- [ ] Train team on monitoring tools
- [ ] Set up on-call rotation

### Deployment Steps
1. **Install dependencies:** `npm install --production`
2. **Set environment variables:** Configure `.env`
3. **Start application:** `npm start`
4. **Verify health:** Check `/health/detailed`
5. **Start alert monitoring:** Automatic on server start
6. **Monitor dashboards:** Access Grafana/Kibana

---

## 📈 Metrics Collected

### HTTP Metrics
- Request rate (req/s)
- Response time (p50, p95, p99)
- Status code distribution
- Error rate

### Database Metrics
- Query duration
- Connection pool usage
- Slow queries
- Query patterns

### Business Metrics
- Orders (created, completed, cancelled)
- Revenue (by currency)
- Bookings (by type/status)
- Active users

### System Metrics
- Memory usage (resident, heap)
- CPU usage
- Process uptime
- Event loop lag

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

### High Memory Usage
```bash
# Check current usage
curl http://localhost:5000/health/detailed | jq .memory

# View heap snapshot
node --inspect server.js
# Open chrome://inspect
```

---

## 📞 Support

### Documentation
- Implementation Guide: See `docs/WEEK8_PHASE6B_MONITORING.md`
- Logging Guide: See `docs/LOGGING_GUIDE.md`
- Metrics Reference: See `docs/METRICS_REFERENCE.md`
- Alerting Playbook: See `docs/ALERTING_PLAYBOOK.md`

### External Resources
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [New Relic APM](https://docs.newrelic.com/docs/apm/)

---

## 🎉 What's Next?

1. **Review Documentation:** Read the comprehensive guides in `docs/`
2. **Integrate with Your App:** See `examples/monitoring-integration.ts`
3. **Set Up Dashboards:** Import Grafana dashboard
4. **Configure Alerts:** Set up notification channels
5. **Train Your Team:** Share documentation and playbooks
6. **Monitor Production:** Use dashboards to track application health

---

## ✅ Status

**Implementation:** ✅ COMPLETE
**Testing:** ✅ VERIFIED
**Documentation:** ✅ COMPREHENSIVE
**Production Ready:** ✅ YES

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Maintainer:** REZ Development Team
