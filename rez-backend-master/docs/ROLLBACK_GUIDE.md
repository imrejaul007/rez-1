# Rollback Procedure Guide

## When to Rollback

### Critical Triggers (Immediate Rollback)
- Error rate > 5% for more than 5 minutes
- Critical feature completely broken (authentication, payments, orders)
- Data corruption detected
- Security breach detected
- Database connection failures affecting > 50% of requests
- Complete service outage

### Warning Triggers (Evaluate for Rollback)
- Error rate between 1-5% for more than 15 minutes
- Response time p95 > 1000ms consistently
- Memory leaks causing gradual degradation
- Unexpected behavior in critical flows
- External service integration failures

### Do NOT Rollback If
- Minor bugs in non-critical features
- Performance degradation < 20%
- Isolated issues affecting < 1% of users
- Issues that can be hotfixed quickly (< 30 minutes)

## Rollback Decision Matrix

| Issue Type | Error Rate | Affected Users | Response Time | Action |
|------------|-----------|----------------|---------------|---------|
| Critical Bug | > 5% | > 50% | Any | **ROLLBACK IMMEDIATELY** |
| Critical Bug | > 1% | > 10% | > 1000ms | **ROLLBACK** |
| Major Bug | > 1% | > 25% | > 500ms | Evaluate rollback |
| Minor Bug | < 1% | < 10% | < 500ms | Hotfix instead |
| Performance | < 1% | Any | > 2000ms | **ROLLBACK** |

## Pre-Rollback Checklist

Before initiating rollback:

1. **Confirm the Issue**
   - [ ] Verify issue is real (not monitoring false positive)
   - [ ] Check multiple data sources (logs, metrics, user reports)
   - [ ] Rule out external service issues

2. **Assess Impact**
   - [ ] Document current error rate
   - [ ] Document affected user count
   - [ ] Identify affected features
   - [ ] Estimate business impact

3. **Communication**
   - [ ] Notify team immediately (Slack/Teams)
   - [ ] Assign incident commander
   - [ ] Start incident log
   - [ ] Prepare user communication (if needed)

4. **Document Current State**
   - [ ] Current deployment version/commit hash
   - [ ] Screenshot of error dashboards
   - [ ] Recent log samples
   - [ ] Database state snapshot

## Rollback Procedures

### Method 1: Kubernetes Rollback (Fastest - 5 minutes)

**When to use**: Most situations, when previous deployment was stable

```bash
# 1. Check rollout history
kubectl rollout history deployment/merchant-backend -n production

# 2. View specific revision details
kubectl rollout history deployment/merchant-backend -n production --revision=2

# 3. Rollback to previous version
kubectl rollout undo deployment/merchant-backend -n production

# 4. Rollback to specific revision
kubectl rollout undo deployment/merchant-backend -n production --to-revision=2

# 5. Monitor rollback progress
kubectl rollout status deployment/merchant-backend -n production

# 6. Verify pods are running
kubectl get pods -n production -l app=merchant-backend

# 7. Check pod logs
kubectl logs -f deployment/merchant-backend -n production
```

**Expected time**: 3-5 minutes

### Method 2: Load Balancer Switch (Immediate - 1 minute)

**When to use**: Emergency situations requiring instant rollback

```bash
# 1. Switch traffic to previous (green) deployment
kubectl patch service merchant-backend-service -n production \
  -p '{"spec":{"selector":{"version":"v1.0.0"}}}'

# 2. Verify traffic switched
kubectl get service merchant-backend-service -n production -o yaml

# 3. Monitor error rates
# Check your monitoring dashboard
```

**Expected time**: < 1 minute

### Method 3: Docker Image Rollback (Manual - 10 minutes)

**When to use**: When Kubernetes rollback history is unavailable

```bash
# 1. Identify previous stable image
docker images rezapp/merchant-backend

# 2. Update deployment with previous image
kubectl set image deployment/merchant-backend \
  api=rezapp/merchant-backend:previous-stable-tag \
  -n production

# 3. Monitor rollout
kubectl rollout status deployment/merchant-backend -n production
```

**Expected time**: 5-10 minutes

### Method 4: Full Redeploy (Comprehensive - 15 minutes)

**When to use**: When other methods fail

```bash
# 1. Delete current deployment
kubectl delete deployment merchant-backend -n production

# 2. Apply previous stable manifest
kubectl apply -f k8s/deployment.yaml.previous -n production

# 3. Verify deployment
kubectl get deployment merchant-backend -n production

# 4. Check pods
kubectl get pods -n production -l app=merchant-backend
```

**Expected time**: 10-15 minutes

## Database Rollback

**WARNING**: Database rollback is high-risk. Only perform if absolutely necessary.

### Assessment
- [ ] Determine if database rollback is necessary
- [ ] Identify which migrations need to be reverted
- [ ] Estimate data loss impact
- [ ] Get approval from technical lead/CTO

### Procedure

```bash
# 1. Stop all write operations
kubectl scale deployment merchant-backend --replicas=0 -n production

# 2. Create emergency backup
mongodump --uri="$MONGODB_URI" --out=/backups/emergency_$(date +%s)

# 3. Run rollback migrations
npm run migrate:rollback -- 1

# 4. Verify database state
mongo $MONGODB_URI --eval "db.migrations.find().sort({version:-1}).limit(1)"

# 5. Restart application
kubectl scale deployment merchant-backend --replicas=3 -n production
```

**Expected time**: 15-30 minutes

### Alternative: Restore from Backup

```bash
# 1. Stop application
kubectl scale deployment merchant-backend --replicas=0 -n production

# 2. Find latest stable backup
aws s3 ls s3://rez-backups/mongodb/ | grep mongodb_rez | tail -5

# 3. Download backup
aws s3 cp s3://rez-backups/mongodb/mongodb_rez_TIMESTAMP.tar.gz .

# 4. Restore backup
./scripts/restore.sh mongodb_rez_TIMESTAMP.tar.gz rez

# 5. Restart application
kubectl scale deployment merchant-backend --replicas=3 -n production
```

**Expected time**: 30-60 minutes (depends on database size)

## Post-Rollback Verification

After rollback, verify system health:

### Immediate Checks (5 minutes)
- [ ] Health endpoint responding: `curl https://api.rezapp.com/health`
- [ ] Error rate dropped to normal levels (< 0.1%)
- [ ] Response time back to normal (p95 < 300ms)
- [ ] All pods running: `kubectl get pods -n production`
- [ ] No crash loops

### Functional Tests (10 minutes)
- [ ] User authentication working
- [ ] Product listing working
- [ ] Order creation working
- [ ] Payment processing working (test transaction)
- [ ] File upload working
- [ ] Email/SMS notifications working

### Monitoring (30 minutes)
- [ ] Error logs clean (no critical errors)
- [ ] CPU usage normal (< 70%)
- [ ] Memory usage normal (< 80%)
- [ ] Database connections stable
- [ ] Cache hit rate normal
- [ ] External integrations working

## Communication Templates

### Internal Team Notification
```
🚨 ROLLBACK INITIATED

Issue: [Brief description]
Error Rate: [X%]
Affected Users: [~X users]
Action: Rolling back to version [X]
ETA: [X minutes]

Incident Commander: @[name]
Status Updates: Every 5 minutes in #incidents
```

### User Communication (if needed)
```
Subject: Service Degradation - Resolved

We experienced a brief service issue affecting [feature].
The issue has been resolved by reverting to a previous stable version.

Impact: [X minutes of degraded service]
Affected: [Description of affected functionality]
Resolution: [Time]

We apologize for any inconvenience.
```

### Post-Rollback Announcement
```
✅ ROLLBACK COMPLETE

Previous version restored successfully.
Error rate: [X%] → [Y%]
Response time: [Xms] → [Yms]

Next steps:
1. Root cause analysis
2. Fix and test in staging
3. Plan re-deployment
```

## Root Cause Analysis

After successful rollback, conduct RCA:

### Data to Collect
- [ ] Full error logs from failed deployment
- [ ] Metrics screenshots (before/during/after)
- [ ] Database query logs
- [ ] Network traces
- [ ] Changed files (git diff)
- [ ] Deployment timeline

### RCA Template

```markdown
# Incident Report: [Date] Deployment Rollback

## Summary
[1-2 sentence summary of what happened]

## Impact
- Duration: [X minutes]
- Error rate: [X%]
- Affected users: [~X users]
- Affected features: [list]
- Revenue impact: [if applicable]

## Timeline
- [Time] - Deployment started
- [Time] - First error detected
- [Time] - Issue confirmed
- [Time] - Rollback initiated
- [Time] - Rollback completed
- [Time] - Service fully restored

## Root Cause
[Detailed explanation of what caused the issue]

## Resolution
[How the issue was resolved]

## Action Items
- [ ] [Fix item 1] - Owner: [name] - Due: [date]
- [ ] [Fix item 2] - Owner: [name] - Due: [date]
- [ ] [Improve monitoring] - Owner: [name] - Due: [date]
- [ ] [Update deployment process] - Owner: [name] - Due: [date]

## Prevention
[How to prevent this in the future]

## Lessons Learned
[What we learned from this incident]
```

## Rollback Prevention

To minimize future rollbacks:

### Before Deployment
- Always deploy to staging first
- Run full test suite
- Perform load testing
- Review all code changes
- Test database migrations separately
- Have rollback plan ready

### During Deployment
- Deploy during low-traffic periods
- Use blue-green or canary deployments
- Monitor metrics continuously
- Have team on standby
- Communicate with stakeholders

### After Deployment
- Monitor for 2 hours minimum
- Run smoke tests
- Check error logs
- Verify performance metrics
- Keep team available

## Rollback Training

All team members should:
- [ ] Read this guide thoroughly
- [ ] Practice rollback in staging
- [ ] Know how to access monitoring dashboards
- [ ] Know incident communication procedures
- [ ] Have kubectl access configured
- [ ] Have emergency contact numbers

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Incident Commander | [Name] | [Phone] | @handle |
| DevOps Lead | [Name] | [Phone] | @handle |
| Backend Lead | [Name] | [Phone] | @handle |
| Database Admin | [Name] | [Phone] | @handle |
| CTO | [Name] | [Phone] | @handle |

## Quick Reference

### One-Line Rollback
```bash
kubectl rollout undo deployment/merchant-backend -n production && kubectl rollout status deployment/merchant-backend -n production
```

### Emergency Stop
```bash
kubectl scale deployment merchant-backend --replicas=0 -n production
```

### Emergency Restore
```bash
kubectl scale deployment merchant-backend --replicas=3 -n production
```

### View Logs
```bash
kubectl logs -f deployment/merchant-backend -n production --tail=100
```

### Check Health
```bash
curl -f https://api.rezapp.com/health || echo "FAILED"
```
