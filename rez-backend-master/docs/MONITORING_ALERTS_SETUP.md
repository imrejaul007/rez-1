# Monitoring & Alerts Setup Guide

## Overview

Complete guide for setting up error alerts, performance monitoring, and uptime monitoring.

---

## 1. Sentry Error Alerts

### Critical Error Alerts

**Setup in Sentry:**
1. Go to **Alerts** → **Create Alert Rule**
2. Configure:
   - **Name:** Critical Errors
   - **Trigger:** Issue seen > 5 times in 5 minutes
   - **Conditions:** Level = error/fatal, Environment = production
   - **Actions:** Email + Slack + PagerDuty (if configured)

**Alert Channels:**
- Email: Team email list
- Slack: #alerts channel
- PagerDuty: Critical incidents

### High Error Rate Alert

**Setup:**
- **Trigger:** Error rate > 1% in 5 minutes
- **Conditions:** Environment = production
- **Actions:** Email + Slack

### New Issue Alert

**Setup:**
- **Trigger:** New issue created
- **Conditions:** Environment = production, Level = error/fatal
- **Actions:** Email notification

---

## 2. Performance Monitoring

### Response Time Alerts

**P95 Alert:**
- **Metric:** P95 response time
- **Threshold:** > 1000ms
- **Window:** 5 minutes
- **Action:** Email + Slack

**P99 Alert:**
- **Metric:** P99 response time
- **Threshold:** > 2000ms
- **Window:** 5 minutes
- **Action:** Email + Slack

### Throughput Alert

**Setup:**
- **Metric:** Request rate
- **Trigger:** Drop > 50% in 10 minutes
- **Action:** Email notification

---

## 3. Database Monitoring

### Slow Query Alert

**Setup (if using MongoDB Atlas):**
1. Enable Performance Advisor
2. Set alert for queries > 1000ms
3. Configure email notifications

**Manual Setup:**
- Monitor query logs
- Alert on queries > threshold
- Use MongoDB monitoring tools

### Connection Pool Alert

**Setup:**
- **Metric:** Active connections
- **Threshold:** > 80% of max connections
- **Action:** Email notification

---

## 4. Redis Monitoring

### Memory Usage Alert

**Setup:**
- **Metric:** Redis memory usage
- **Threshold:** > 80%
- **Action:** Email notification

### Connection Alert

**Setup:**
- **Metric:** Redis connections
- **Threshold:** > 80% of max connections
- **Action:** Email notification

---

## 5. Uptime Monitoring

### Health Check Monitoring

**Option 1: UptimeRobot (Free)**
1. Sign up at [UptimeRobot.com](https://uptimerobot.com)
2. Add monitor:
   - **Type:** HTTP(s)
   - **URL:** https://api.rezapp.com/health
   - **Interval:** 5 minutes
   - **Alert Contacts:** Email + SMS

**Option 2: Pingdom**
1. Sign up at [Pingdom.com](https://pingdom.com)
2. Add check:
   - **URL:** https://api.rezapp.com/health
   - **Interval:** 1 minute
   - **Alert:** Email + SMS

**Option 3: Custom Script**
```bash
#!/bin/bash
# health-check-monitor.sh

HEALTH_URL="https://api.rezapp.com/health"
ALERT_EMAIL="alerts@rezapp.com"

if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    echo "Health check failed!" | mail -s "API Health Check Failed" "$ALERT_EMAIL"
fi
```

### Server Uptime Monitoring

**Setup:**
- Monitor server availability
- Check disk space
- Monitor CPU/Memory
- Use tools like:
  - New Relic
  - Datadog
  - Prometheus + Grafana

---

## 6. Application Logs Monitoring

### Error Log Monitoring

**Setup:**
- Monitor `logs/error.log`
- Alert on error spikes
- Use log aggregation tools:
  - ELK Stack
  - Splunk
  - Datadog Logs

### Critical Error Patterns

**Monitor for:**
- Database connection errors
- Payment gateway errors
- External API failures
- Authentication failures

---

## 7. Alert Configuration

### Alert Severity Levels

**Critical (Immediate):**
- Server down
- Database unavailable
- Payment processing errors
- Security breaches

**High (Within 1 hour):**
- High error rate
- Performance degradation
- Service degradation

**Medium (Within 4 hours):**
- Warning-level errors
- Resource usage high
- Non-critical failures

**Low (Daily summary):**
- Info-level issues
- Performance trends
- Usage statistics

---

## 8. Notification Channels

### Email Alerts

**Configuration:**
- Primary: devops@rezapp.com
- Secondary: engineering@rezapp.com
- On-call: oncall@rezapp.com

### Slack Integration

**Setup:**
1. Create Slack webhook
2. Configure in Sentry/alerting tool
3. Set up channels:
   - #alerts-critical
   - #alerts-warnings
   - #monitoring

### SMS/PagerDuty

**For Critical Alerts:**
- Configure PagerDuty integration
- Set up on-call rotation
- Configure escalation policies

---

## 9. Monitoring Dashboard

### Key Metrics Dashboard

**Create dashboard with:**
1. Error rate (last 24h)
2. Response times (P50, P95, P99)
3. Request volume
4. Top errors
5. Database performance
6. Redis performance
7. Server resources

**Tools:**
- Sentry Performance
- Grafana
- Datadog
- New Relic

---

## 10. Testing Alerts

### Test Error Alert

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  Sentry.captureException(new Error('Test alert'));
}
```

### Test Health Check

```bash
# Simulate downtime
sudo systemctl stop mongodb
# Wait for alert
sudo systemctl start mongodb
```

### Test Performance Alert

```typescript
// Simulate slow response
await new Promise(resolve => setTimeout(resolve, 2000));
```

---

## Best Practices

1. **Alert Fatigue:**
   - Only alert on actionable items
   - Use appropriate severity levels
   - Group related alerts

2. **Alert Response:**
   - Document runbooks
   - Set up on-call rotation
   - Define escalation procedures

3. **Monitoring Coverage:**
   - Monitor all critical services
   - Track key business metrics
   - Monitor third-party dependencies

4. **Regular Review:**
   - Review alert effectiveness
   - Adjust thresholds
   - Update runbooks

---

## Next Steps

1. ✅ Monitoring guide created
2. ⏳ Configure Sentry alerts
3. ⏳ Set up uptime monitoring
4. ⏳ Configure notification channels
5. ⏳ Create monitoring dashboard
6. ⏳ Test all alerts
7. ⏳ Document alert procedures

---

**Status:** ✅ Monitoring & Alerts Guide Complete
**Last Updated:** $(date)

