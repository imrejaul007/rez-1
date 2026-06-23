# Alerting Playbook

## Overview
Runbook for responding to monitoring alerts in the REZ Merchant Backend.

---

## Table of Contents
1. [Alert Severity Levels](#alert-severity-levels)
2. [Common Alerts](#common-alerts)
3. [Response Procedures](#response-procedures)
4. [Escalation](#escalation)
5. [Post-Incident](#post-incident)

---

## Alert Severity Levels

### Critical (P1)
**Response Time:** Immediate (< 5 minutes)
**Impact:** Service down or major functionality broken
**Examples:**
- Database connection lost
- Application crashed
- Payment processing completely failed
- All API requests failing

### High (P2)
**Response Time:** < 15 minutes
**Impact:** Significant degradation affecting users
**Examples:**
- High error rate (> 5%)
- High response time (> 2s)
- Memory usage > 90%
- Critical endpoint failing

### Medium (P3)
**Response Time:** < 1 hour
**Impact:** Moderate degradation, workaround available
**Examples:**
- Error rate 1-5%
- Response time 500ms-2s
- Slow database queries
- Cache performance degraded

### Low (P4)
**Response Time:** < 4 hours
**Impact:** Minor issue, minimal user impact
**Examples:**
- Warnings in logs
- Non-critical feature degraded
- Minor performance issues

---

## Common Alerts

### 1. High Error Rate

**Alert:** Error rate exceeds 1%

**Symptoms:**
- Increased 5xx errors
- User complaints
- Failed transactions

**Investigation Steps:**
```bash
# 1. Check recent error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# 2. Check Sentry for error patterns
# Visit Sentry dashboard

# 3. Check affected endpoints
curl http://localhost:5000/metrics/summary

# 4. Review recent deployments
git log --oneline -10
```

**Common Causes:**
- Recent deployment introduced bugs
- Database connection issues
- External API failures
- Resource exhaustion

**Resolution:**
```bash
# If recent deployment:
git revert HEAD
npm run build
pm2 restart all

# If database issue:
# Check MongoDB status
mongo --eval "db.adminCommand('ping')"

# If external API:
# Check API status page
# Implement circuit breaker
```

**Escalation:** If unresolved in 30 minutes → Engineering Manager

---

### 2. High Response Time

**Alert:** p95 response time > 500ms

**Symptoms:**
- Slow page loads
- Timeouts
- User complaints about performance

**Investigation Steps:**
```bash
# 1. Check current response times
curl http://localhost:5000/metrics | grep http_request_duration

# 2. Identify slow endpoints
# Check Grafana dashboard

# 3. Check database query times
curl http://localhost:5000/metrics | grep db_query_duration

# 4. Check system resources
top
free -m
df -h
```

**Common Causes:**
- Slow database queries
- N+1 query problems
- Memory pressure
- CPU throttling
- Network latency

**Resolution:**
```bash
# Check slow queries
# Review MongoDB slow query log

# Add database indexes
mongo rez-app --eval "db.orders.createIndex({createdAt: -1})"

# Increase resources
# Scale up server
# Add more instances

# Enable caching
# Check Redis is running and cache hit rate
```

**Escalation:** If p95 > 2s for 15 minutes → Senior Engineer

---

### 3. Database Connection Lost

**Alert:** MongoDB connection not active

**Symptoms:**
- All database operations failing
- Application errors
- Service unavailable

**Investigation Steps:**
```bash
# 1. Check MongoDB status
systemctl status mongod
# or
docker ps | grep mongo

# 2. Check network connectivity
ping mongodb-host
telnet mongodb-host 27017

# 3. Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# 4. Check connection string
echo $MONGODB_URI
```

**Common Causes:**
- MongoDB service down
- Network issues
- Connection pool exhausted
- Authentication failure
- Disk space full

**Resolution:**
```bash
# Restart MongoDB
systemctl restart mongod
# or
docker restart mongodb

# Check disk space
df -h

# Increase connection pool
# Update MONGODB_URI with maxPoolSize

# Check authentication
mongo $MONGODB_URI --eval "db.adminCommand('ping')"
```

**Escalation:** Immediate → Database Admin + Engineering Manager

---

### 4. High Memory Usage

**Alert:** Memory usage > 90%

**Symptoms:**
- Slow performance
- Application crashes
- OOM errors

**Investigation Steps:**
```bash
# 1. Check current memory usage
free -m
top

# 2. Check Node.js heap usage
curl http://localhost:5000/metrics | grep nodejs_heap

# 3. Check for memory leaks
# Review heap snapshots
node --inspect server.js

# 4. Check recent changes
git log --oneline -10
```

**Common Causes:**
- Memory leaks
- Large result sets not paginated
- Circular references
- Event listener accumulation
- Large file uploads in memory

**Resolution:**
```bash
# Restart application
pm2 restart all

# Enable garbage collection logging
node --expose-gc --trace-gc server.js

# Increase memory limit
node --max-old-space-size=4096 server.js

# Review and fix memory leaks
# Use Chrome DevTools or clinic.js
```

**Escalation:** If memory leak suspected → Senior Engineer

---

### 5. Slow Database Queries

**Alert:** p95 query time > 1s

**Symptoms:**
- Slow API responses
- Timeouts
- High CPU on database

**Investigation Steps:**
```bash
# 1. Check MongoDB slow queries
mongo rez-app --eval "db.setProfilingLevel(2, {slowms: 100})"
mongo rez-app --eval "db.system.profile.find().limit(10).sort({ts:-1})"

# 2. Review query patterns in logs
grep "db_query_duration" logs/combined-*.log

# 3. Check database indexes
mongo rez-app --eval "db.orders.getIndexes()"

# 4. Check database stats
mongo rez-app --eval "db.stats()"
```

**Common Causes:**
- Missing indexes
- Large collections without pagination
- Complex aggregations
- Inefficient queries
- Database resource constraints

**Resolution:**
```bash
# Add indexes
mongo rez-app --eval "db.orders.createIndex({userId: 1, createdAt: -1})"

# Optimize queries
# Review and rewrite inefficient queries

# Add query result caching
# Implement Redis caching layer

# Paginate large result sets
# Update API to support pagination
```

**Escalation:** If p95 > 5s → Database Admin

---

### 6. Payment Processing Failed

**Alert:** Payment gateway errors

**Symptoms:**
- Failed payments
- User complaints
- Lost revenue

**Investigation Steps:**
```bash
# 1. Check payment error logs
grep "payment" logs/error-$(date +%Y-%m-%d).log

# 2. Check Razorpay status
# Visit Razorpay status page

# 3. Check API credentials
echo $RAZORPAY_KEY_ID
# Verify not expired

# 4. Test payment endpoint
curl -X POST http://localhost:5000/api/payments/test
```

**Common Causes:**
- Razorpay service outage
- Invalid API credentials
- Network timeout
- Invalid payment data
- Insufficient funds

**Resolution:**
```bash
# Check Razorpay dashboard
# Review failed transactions

# Retry failed payments
# Implement retry logic with exponential backoff

# Switch to backup gateway (if configured)
# Update PAYMENT_GATEWAY env variable

# Notify users
# Send email about payment issues
```

**Escalation:** Immediate → Payment Team + Engineering Manager

---

### 7. High Queue Size

**Alert:** Queue size > 1000

**Symptoms:**
- Delayed notifications
- Delayed email sends
- Background job delays

**Investigation Steps:**
```bash
# 1. Check queue metrics
curl http://localhost:5000/metrics | grep queue_size

# 2. Check queue processing
# Review job logs

# 3. Check queue workers
ps aux | grep worker

# 4. Check database for pending jobs
mongo rez-app --eval "db.jobs.find({status: 'pending'}).count()"
```

**Common Causes:**
- Worker processes down
- Slow job processing
- Job failures accumulating
- Sudden spike in load

**Resolution:**
```bash
# Restart queue workers
pm2 restart queue-worker

# Scale up workers
pm2 scale queue-worker 5

# Clear stuck jobs
# Review and remove failed jobs

# Increase worker concurrency
# Update worker configuration
```

**Escalation:** If queue > 5000 → Senior Engineer

---

## Response Procedures

### Step 1: Acknowledge Alert
```bash
# In PagerDuty/Opsgenie
# Click "Acknowledge"

# Post in #incidents Slack channel
"🚨 Investigating: [Alert Name]
Status: Acknowledged
ETA: [Time]"
```

### Step 2: Assess Impact
```bash
# Check metrics
curl http://localhost:5000/health/detailed

# Check error rate
curl http://localhost:5000/metrics/summary

# Check user reports
# Review support tickets
```

### Step 3: Investigate
```bash
# Follow alert-specific investigation steps
# Check logs, metrics, dashboards
# Identify root cause
```

### Step 4: Mitigate
```bash
# Apply fix or workaround
# Restart services if needed
# Scale resources if needed
```

### Step 5: Verify
```bash
# Check metrics improved
curl http://localhost:5000/health/detailed

# Monitor for 10 minutes
watch -n 10 curl http://localhost:5000/metrics/summary

# Get confirmation from users
```

### Step 6: Resolve
```bash
# In PagerDuty/Opsgenie
# Click "Resolve"

# Post in #incidents
"✅ Resolved: [Alert Name]
Root Cause: [Cause]
Resolution: [What was done]
Duration: [Time]"
```

---

## Escalation

### Escalation Matrix

**Critical (P1):**
- 0-5 min: On-call engineer
- 5 min: Engineering Manager
- 15 min: CTO
- 30 min: CEO

**High (P2):**
- 0-15 min: On-call engineer
- 30 min: Engineering Manager
- 1 hour: CTO

**Medium (P3):**
- 0-1 hour: On-call engineer
- 2 hours: Team Lead

**Low (P4):**
- Handle during business hours
- No escalation needed

### Contact Information
```
On-Call Engineer: #oncall Slack channel
Engineering Manager: manager@company.com
Database Admin: dba@company.com
Payment Team: payments@company.com
CTO: cto@company.com
```

---

## Post-Incident

### 1. Create Incident Report
```markdown
## Incident Report: [Alert Name]

**Date:** [Date]
**Duration:** [Duration]
**Severity:** [P1/P2/P3/P4]

**Summary:**
[Brief description]

**Timeline:**
- HH:MM - Alert fired
- HH:MM - Acknowledged
- HH:MM - Root cause identified
- HH:MM - Fix applied
- HH:MM - Resolved

**Root Cause:**
[Detailed explanation]

**Resolution:**
[What was done]

**Impact:**
- Users affected: [Number]
- Revenue lost: [Amount]
- Downtime: [Duration]

**Action Items:**
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Documentation update]
```

### 2. Conduct Blameless Postmortem
- Schedule within 24 hours
- Invite all stakeholders
- Focus on systems, not people
- Document learnings

### 3. Implement Improvements
- Add monitoring for gap
- Update runbooks
- Fix underlying issues
- Share learnings with team

---

## Useful Commands

### Check Application Status
```bash
# Health check
curl http://localhost:5000/health/detailed

# Check logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Check processes
pm2 list
```

### Check System Resources
```bash
# Memory
free -m

# CPU
top

# Disk
df -h

# Network
netstat -an | grep ESTABLISHED | wc -l
```

### Check Database
```bash
# MongoDB status
mongo --eval "db.adminCommand('ping')"

# Connection count
mongo --eval "db.serverStatus().connections"

# Slow queries
mongo rez-app --eval "db.system.profile.find().limit(10)"
```

### Check Metrics
```bash
# All metrics
curl http://localhost:5000/metrics

# Summary
curl http://localhost:5000/metrics/summary | jq .

# Specific metric
curl http://localhost:5000/metrics | grep metric_name
```

---

## Resources

- [Monitoring Dashboard](http://grafana:3000)
- [Error Tracking](https://sentry.io)
- [Log Aggregation](http://kibana:5601)
- [Status Page](https://status.company.com)
- [Runbooks](./runbooks/)
- [Architecture Docs](./ARCHITECTURE.md)
