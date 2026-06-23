# Production Runbook

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Common Operations](#common-operations)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Incident Response](#incident-response)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Emergency Procedures](#emergency-procedures)

## System Overview

### Service Information
- **Service Name**: REZ Merchant Backend API
- **Environment**: Production
- **URL**: https://api.rezapp.com
- **Health Endpoint**: https://api.rezapp.com/health
- **Documentation**: https://api.rezapp.com/docs

### Technology Stack
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: MongoDB Atlas (M30 cluster)
- **Cache**: Redis 7 (cluster mode)
- **Container**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry, New Relic
- **Logging**: ELK Stack / CloudWatch

### Team Contacts
| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| On-Call Engineer | [Name] | [Phone] | [Email] | @handle |
| Backend Lead | [Name] | [Phone] | [Email] | @handle |
| DevOps Lead | [Name] | [Phone] | [Email] | @handle |
| Database Admin | [Name] | [Phone] | [Email] | @handle |
| Security Lead | [Name] | [Phone] | [Email] | @handle |
| CTO | [Name] | [Phone] | [Email] | @handle |

## Architecture

### Infrastructure
```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
│                   (Kubernetes Service)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼───┐    ┌───▼────┐   ┌───▼────┐
    │ Pod 1  │    │ Pod 2  │   │ Pod 3  │
    │ (API)  │    │ (API)  │   │ (API)  │
    └────┬───┘    └───┬────┘   └───┬────┘
         │            │            │
         └────────────┼────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼────┐              ┌────▼────┐
    │ MongoDB │              │  Redis  │
    │ Cluster │              │ Cluster │
    └─────────┘              └─────────┘
```

### Resource Allocation
- **Pods**: 3-10 (auto-scaling)
- **CPU per pod**: 500m - 1000m
- **Memory per pod**: 512Mi - 1Gi
- **Storage**: 50Gi (Persistent Volume)

### External Dependencies
- Cloudinary (Image/Video storage)
- SendGrid (Email service)
- Twilio (SMS service)
- Razorpay (Payment gateway)
- MongoDB Atlas (Database)
- Redis (Cache & Sessions)

## Common Operations

### 1. View Logs

**View live logs**
```bash
kubectl logs -f deployment/merchant-backend -n production --tail=100
```

**View logs from specific pod**
```bash
kubectl get pods -n production -l app=merchant-backend
kubectl logs -f <pod-name> -n production
```

**Search logs for errors**
```bash
kubectl logs deployment/merchant-backend -n production --tail=1000 | grep -i error
```

**View logs from last hour**
```bash
kubectl logs deployment/merchant-backend -n production --since=1h
```

### 2. Check Service Health

**Check pod status**
```bash
kubectl get pods -n production -l app=merchant-backend
```

**Check deployment status**
```bash
kubectl get deployment merchant-backend -n production
```

**Check service endpoints**
```bash
kubectl get endpoints merchant-backend-service -n production
```

**Test health endpoint**
```bash
curl -f https://api.rezapp.com/health
```

**Check resource usage**
```bash
kubectl top pods -n production -l app=merchant-backend
```

### 3. Scale Application

**Manual scaling**
```bash
# Scale up
kubectl scale deployment merchant-backend --replicas=5 -n production

# Scale down
kubectl scale deployment merchant-backend --replicas=2 -n production

# Check current replicas
kubectl get deployment merchant-backend -n production
```

**Check auto-scaling status**
```bash
kubectl get hpa merchant-backend-hpa -n production
```

**Temporarily disable auto-scaling**
```bash
kubectl delete hpa merchant-backend-hpa -n production
```

**Re-enable auto-scaling**
```bash
kubectl apply -f k8s/hpa.yaml -n production
```

### 4. Restart Application

**Rolling restart (zero downtime)**
```bash
kubectl rollout restart deployment/merchant-backend -n production
```

**Force restart all pods**
```bash
kubectl delete pods -n production -l app=merchant-backend
```

**Restart specific pod**
```bash
kubectl delete pod <pod-name> -n production
```

### 5. Update Environment Variables

**Update secret**
```bash
kubectl edit secret db-secrets -n production
```

**Apply updated secrets**
```bash
kubectl apply -f k8s/secrets.yaml -n production
```

**Restart deployment to pick up new secrets**
```bash
kubectl rollout restart deployment/merchant-backend -n production
```

### 6. Deploy New Version

**Via CI/CD (Recommended)**
```bash
# Push to main branch triggers automatic deployment
git push origin main
```

**Manual deployment**
```bash
# Update image
kubectl set image deployment/merchant-backend \
  api=rezapp/merchant-backend:v1.2.3 \
  -n production

# Monitor rollout
kubectl rollout status deployment/merchant-backend -n production
```

### 7. Database Operations

**Run migrations**
```bash
# Get a pod name
POD=$(kubectl get pods -n production -l app=merchant-backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $POD -n production -- npm run migrate
```

**Create backup**
```bash
kubectl exec -it $POD -n production -- /app/scripts/backup.sh
```

**Connect to database (read-only)**
```bash
mongosh "$MONGODB_URI" --eval "db.getMongo().setReadPref('secondary')"
```

### 8. Cache Operations

**Connect to Redis**
```bash
kubectl exec -it deployment/merchant-backend -n production -- redis-cli -h $REDIS_HOST
```

**Clear cache**
```bash
kubectl exec -it deployment/merchant-backend -n production -- redis-cli -h $REDIS_HOST FLUSHDB
```

**Check cache stats**
```bash
kubectl exec -it deployment/merchant-backend -n production -- redis-cli -h $REDIS_HOST INFO stats
```

## Troubleshooting

### Issue: High Error Rate

**Symptoms**: Error rate > 1%, 5xx responses

**Diagnosis**
```bash
# Check pod logs for errors
kubectl logs deployment/merchant-backend -n production --tail=500 | grep -i error

# Check pod status
kubectl get pods -n production -l app=merchant-backend

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n production -l app=merchant-backend
```

**Common Causes**
1. Database connection issues
2. Redis connection issues
3. Memory/CPU exhaustion
4. External service timeout
5. Code bugs

**Resolution**
1. Check external service status
2. Verify database/cache connectivity
3. Check resource limits
4. Review recent code changes
5. Consider rollback if recently deployed

### Issue: Slow Response Time

**Symptoms**: Response time p95 > 500ms

**Diagnosis**
```bash
# Check resource usage
kubectl top pods -n production

# Check database slow queries
# (Use MongoDB Atlas UI or CLI)

# Check cache hit rate
kubectl exec -it deployment/merchant-backend -n production -- \
  redis-cli -h $REDIS_HOST INFO stats | grep hit_rate
```

**Common Causes**
1. Database slow queries
2. Missing indexes
3. Cache misses
4. Memory pressure
5. CPU throttling
6. Network latency

**Resolution**
1. Optimize slow queries
2. Add missing indexes
3. Increase cache TTL
4. Scale horizontally
5. Optimize code

### Issue: Pod Crash Loop

**Symptoms**: Pods continuously restarting

**Diagnosis**
```bash
# Check pod status
kubectl get pods -n production -l app=merchant-backend

# Describe problem pod
kubectl describe pod <pod-name> -n production

# Check logs from crashed pod
kubectl logs <pod-name> -n production --previous

# Check events
kubectl get events -n production --field-selector involvedObject.name=<pod-name>
```

**Common Causes**
1. Application startup failure
2. Memory limit exceeded (OOMKilled)
3. Failed health checks
4. Missing environment variables
5. Database connection failure

**Resolution**
1. Check logs for startup errors
2. Increase memory limits if OOMKilled
3. Fix health check endpoint
4. Verify all secrets are configured
5. Verify database connectivity

### Issue: Database Connection Exhaustion

**Symptoms**: "Too many connections" errors

**Diagnosis**
```bash
# Check current connections
# (Use MongoDB Atlas monitoring)

# Check connection pool stats in logs
kubectl logs deployment/merchant-backend -n production | grep "connection pool"
```

**Resolution**
```bash
# Restart application to reset connections
kubectl rollout restart deployment/merchant-backend -n production

# Adjust connection pool settings in .env
# MONGODB_MAX_POOL_SIZE=50
# MONGODB_MIN_POOL_SIZE=10
```

### Issue: Out of Memory

**Symptoms**: Pods killed with OOMKilled status

**Diagnosis**
```bash
# Check memory usage
kubectl top pods -n production -l app=merchant-backend

# Check memory limit
kubectl describe deployment merchant-backend -n production | grep -A 5 Limits

# Check for memory leaks in monitoring
```

**Resolution**
```bash
# Temporary: Increase memory limit
kubectl set resources deployment merchant-backend \
  --limits=memory=2Gi \
  -n production

# Long-term: Fix memory leak in code
# Investigate with heap snapshots
```

### Issue: External Service Timeout

**Symptoms**: Timeout errors for Cloudinary, SendGrid, Twilio, Razorpay

**Diagnosis**
```bash
# Check logs for timeout errors
kubectl logs deployment/merchant-backend -n production | grep -i timeout

# Test connectivity to external service
kubectl exec -it deployment/merchant-backend -n production -- \
  curl -I https://api.cloudinary.com
```

**Resolution**
1. Check external service status page
2. Verify API credentials
3. Increase timeout settings
4. Add retry logic
5. Implement circuit breaker

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 0.1%
   - Warning: > 1%
   - Critical: > 5%

2. **Response Time**
   - Target: p95 < 300ms
   - Warning: p95 > 500ms
   - Critical: p95 > 1000ms

3. **Request Rate**
   - Monitor trends
   - Alert on sudden drops (> 50%)

4. **CPU Usage**
   - Target: < 70%
   - Warning: > 80%
   - Critical: > 90%

5. **Memory Usage**
   - Target: < 80%
   - Warning: > 85%
   - Critical: > 90%

6. **Database Connections**
   - Target: < 80% of pool size
   - Warning: > 90%
   - Critical: > 95%

### Dashboards

**Sentry**: https://sentry.io/organizations/rez/issues/
- Error tracking
- Performance monitoring
- Release tracking

**New Relic**: https://rpm.newrelic.com/accounts/[id]/applications/[id]
- APM metrics
- Transaction traces
- Database performance

**Kubernetes Dashboard**: https://dashboard.k8s.rezapp.com
- Pod status
- Resource usage
- Events

**MongoDB Atlas**: https://cloud.mongodb.com
- Database performance
- Slow queries
- Index usage

## Incident Response

### Incident Severity Levels

**SEV-1: Critical**
- Complete service outage
- Data loss/corruption
- Security breach
- Response: Immediate, all hands on deck

**SEV-2: High**
- Major feature broken
- Performance severely degraded
- Response: Within 15 minutes

**SEV-3: Medium**
- Minor feature broken
- Affecting some users
- Response: Within 1 hour

**SEV-4: Low**
- Minor issues
- No immediate impact
- Response: Next business day

### Incident Response Process

1. **Detection** (0-5 minutes)
   - Alert triggers
   - On-call engineer notified
   - Verify issue is real

2. **Triage** (5-10 minutes)
   - Assess severity
   - Determine impact
   - Page additional team members if needed

3. **Communication** (10-15 minutes)
   - Post in #incidents channel
   - Assign incident commander
   - Start incident log
   - Notify stakeholders

4. **Mitigation** (15+ minutes)
   - Identify root cause
   - Implement fix or rollback
   - Monitor metrics

5. **Resolution**
   - Verify issue resolved
   - Monitor for 30 minutes
   - Post resolution update

6. **Post-Mortem** (24-48 hours)
   - Write incident report
   - Identify action items
   - Schedule follow-up meeting

### Incident Communication Template

```
🚨 INCIDENT: [Brief Description]

Severity: SEV-[1/2/3/4]
Status: [Investigating/Mitigating/Resolved]
Impact: [Description of user impact]
Started: [Time]

Updates:
- [Time] - [Update message]
- [Time] - [Update message]

Incident Commander: @[name]
```

## Maintenance Procedures

### Planned Maintenance

**Schedule**
- Announce at least 48 hours in advance
- Prefer low-traffic periods (2-5 AM UTC)
- Maximum duration: 2 hours

**Process**
1. Create maintenance announcement
2. Update status page
3. Send email notification
4. Enable maintenance mode (if needed)
5. Perform maintenance
6. Verify system health
7. Disable maintenance mode
8. Update status page
9. Send completion notification

### Database Maintenance

**Weekly Tasks**
- Review slow query log
- Analyze index usage
- Check database size trends
- Review backup completion

**Monthly Tasks**
- Optimize indexes
- Archive old data
- Test backup restoration
- Review capacity planning

### Security Maintenance

**Weekly Tasks**
- Review security alerts
- Check failed login attempts
- Audit access logs

**Monthly Tasks**
- Rotate credentials
- Update dependencies
- Security scan
- Review IAM policies

## Emergency Procedures

### Complete Service Outage

1. **Confirm outage**: Check multiple monitoring sources
2. **Page team**: Alert all key personnel
3. **Start incident**: Create #incident-[timestamp] channel
4. **Triage**:
   - Check Kubernetes cluster health
   - Check database status
   - Check external services
   - Review recent changes
5. **Recover**:
   - Rollback recent deployment if applicable
   - Scale up resources if needed
   - Fix critical issues
6. **Verify**: Test all critical flows
7. **Communicate**: Update users and stakeholders

### Data Breach

1. **Contain**: Immediately isolate affected systems
2. **Assess**: Determine scope of breach
3. **Page security team**: Alert security lead and CTO
4. **Preserve evidence**: Don't delete logs
5. **Notify**: Legal, compliance, affected users
6. **Remediate**: Fix vulnerability
7. **Report**: File incident reports as required

### Database Failure

1. **Check replication**: Verify replica set status
2. **Promote replica**: If primary failed
3. **Restore from backup**: If complete failure
4. **Verify data integrity**: Check recent data
5. **Resume service**: Once database is stable
6. **Post-mortem**: Analyze failure cause

## Quick Reference Commands

```bash
# View logs
kubectl logs -f deployment/merchant-backend -n production

# Check status
kubectl get pods -n production -l app=merchant-backend

# Restart
kubectl rollout restart deployment/merchant-backend -n production

# Rollback
kubectl rollout undo deployment/merchant-backend -n production

# Scale
kubectl scale deployment merchant-backend --replicas=5 -n production

# Health check
curl https://api.rezapp.com/health

# Connect to pod
kubectl exec -it deployment/merchant-backend -n production -- /bin/sh

# Resource usage
kubectl top pods -n production
```

## Additional Resources

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Rollback Guide](./ROLLBACK_GUIDE.md)
- [API Documentation](https://api.rezapp.com/docs)
- [Architecture Diagrams](./docs/architecture/)
- [Team Handbook](./docs/team-handbook.md)
