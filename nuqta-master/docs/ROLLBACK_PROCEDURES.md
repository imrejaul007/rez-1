# ROLLBACK PROCEDURES

> **Critical Document**: Step-by-step procedures to rollback failed deployments
>
> **When to Use**: When critical issues are discovered post-deployment
>
> **Last Updated**: 2025-11-15

---

## Table of Contents

1. [When to Rollback](#1-when-to-rollback)
2. [Backend Rollback Steps](#2-backend-rollback-steps)
3. [Frontend Rollback Steps](#3-frontend-rollback-steps)
4. [Database Rollback Procedures](#4-database-rollback-procedures)
5. [Communication Plan](#5-communication-plan)
6. [Post-Rollback Actions](#6-post-rollback-actions)

---

## 1. When to Rollback

### 1.1 Rollback Triggers (Immediate)

**CRITICAL - Rollback Immediately:**
- [ ] Complete service outage (API returns 5xx errors > 50%)
- [ ] Database connection failures
- [ ] Payment processing failures (100% failure rate)
- [ ] Data corruption detected
- [ ] Security breach or vulnerability exploit
- [ ] Authentication system failure (users cannot login)
- [ ] Critical functionality completely broken

**Decision Time**: < 5 minutes

### 1.2 Rollback Triggers (Evaluation Required)

**HIGH - Evaluate within 30 minutes:**
- [ ] Error rate > 10% on critical endpoints
- [ ] Payment failure rate > 20%
- [ ] Performance degradation > 200% (p95 > 1000ms)
- [ ] Significant feature regression
- [ ] High volume of user complaints
- [ ] Mobile app crashes on launch > 25% of users

**Decision Time**: 15-30 minutes

### 1.3 Monitor & Fix (No Rollback)

**MEDIUM - Monitor and patch:**
- [ ] Minor UI bugs
- [ ] Non-critical feature issues
- [ ] Error rate < 5%
- [ ] Performance degradation < 100%
- [ ] Isolated user reports

**Action**: Deploy hotfix instead of rollback

---

## 2. Backend Rollback Steps

### 2.1 Quick Rollback (PM2 Previous Version)

**Duration**: ~2-5 minutes

**Prerequisites:**
- Previous version still available in Git
- Database migrations are backward compatible

**Steps:**

**Step 1: Access Server**
```bash
# SSH into backend server
ssh -i production-key.pem ubuntu@api.rezapp.com
```

**Step 2: Navigate to Application Directory**
```bash
cd /var/www/rez-app/user-backend
```

**Step 3: Check Current Version**
```bash
# Check current commit
git log -1 --oneline

# Note down current commit hash for reference
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT" >> /tmp/rollback.log
```

**Step 4: Identify Last Stable Version**
```bash
# View recent commits
git log --oneline -10

# Or check deployment tags
git tag -l 'v*' | tail -5

# Example: Last stable was v1.0.4
STABLE_VERSION="v1.0.4"
```

**Step 5: Checkout Previous Version**
```bash
# Stop application first
pm2 stop rez-api-production

# Stash any uncommitted changes
git stash

# Checkout stable version
git checkout $STABLE_VERSION

# Or checkout specific commit
# git checkout abc123def
```

**Step 6: Reinstall Dependencies (if needed)**
```bash
# Only if package.json changed
npm install --production

# Rebuild
npm run build
```

**Step 7: Restart Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Verify status
pm2 status
pm2 logs rez-api-production --lines 50
```

**Step 8: Health Check**
```bash
# Wait 10 seconds for startup
sleep 10

# Test health endpoint
curl -i https://api.rezapp.com/api/health

# Expected: 200 OK
```

**Step 9: Monitor**
```bash
# Watch logs for errors
pm2 logs rez-api-production --err

# Monitor PM2
pm2 monit
```

### 2.2 Complete Backend Rollback (From Backup)

**Duration**: ~15-30 minutes

**When to Use:**
- Quick rollback failed
- Code repository corrupted
- Need to restore from clean backup

**Steps:**

**Step 1: Stop Current Application**
```bash
pm2 stop all
pm2 delete all
```

**Step 2: Backup Current State**
```bash
# Create backup of current (failed) version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo cp -r /var/www/rez-app/user-backend /var/backups/failed-deployment-$TIMESTAMP
```

**Step 3: Restore from Backup**
```bash
# Option A: Restore from previous successful deployment backup
sudo rm -rf /var/www/rez-app/user-backend
sudo cp -r /var/backups/deployment-20251114-stable /var/www/rez-app/user-backend

# Option B: Fresh clone from stable tag
cd /var/www/rez-app
rm -rf user-backend
git clone https://github.com/your-org/rez-app.git temp
cd temp
git checkout v1.0.4
cp -r user-backend /var/www/rez-app/
cd ..
rm -rf temp
```

**Step 4: Restore Environment Variables**
```bash
cd /var/www/rez-app/user-backend

# Copy production .env (should be backed up separately)
cp /var/backups/env-files/.env.production .env
chmod 600 .env
```

**Step 5: Install and Build**
```bash
npm install --production
npm run build
```

**Step 6: Restart Application**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

**Step 7: Verify**
```bash
# Health check
curl https://api.rezapp.com/api/health

# Test critical endpoints
curl https://api.rezapp.com/api/products
curl -X POST https://api.rezapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 2.3 Load Balancer Rollback (Blue-Green Deployment)

**Duration**: ~1 minute (instant)

**Prerequisites:**
- Blue-Green deployment setup
- Previous version running on standby servers

**Steps:**

**Step 1: Access Load Balancer**
```bash
# AWS ALB
aws elbv2 describe-target-groups --names production-backend

# Get current target group (Blue or Green)
CURRENT_TG=$(aws elbv2 describe-listeners --listener-arns <ARN> --query 'Listeners[0].DefaultActions[0].TargetGroupArn')
```

**Step 2: Switch Traffic**
```bash
# Switch listener to previous target group
aws elbv2 modify-listener \
  --listener-arn <LISTENER_ARN> \
  --default-actions Type=forward,TargetGroupArn=<PREVIOUS_TG_ARN>
```

**Step 3: Verify**
```bash
# Test through load balancer
curl https://api.rezapp.com/api/health

# Check target health
aws elbv2 describe-target-health --target-group-arn <PREVIOUS_TG_ARN>
```

---

## 3. Frontend Rollback Steps

### 3.1 Web App Rollback

**Duration**: ~2-5 minutes

#### Option A: Nginx Rollback (Static Hosting)

**Step 1: Access Server**
```bash
ssh -i production-key.pem ubuntu@rezapp.com
```

**Step 2: Locate Previous Build**
```bash
cd /var/www/deployments

# List previous deployments
ls -lt
# Example output:
# frontend-20251115-120000/  (current - FAILED)
# frontend-20251114-180000/  (previous - STABLE)
# frontend-20251113-140000/
```

**Step 3: Switch Symlink**
```bash
# Remove current symlink
sudo rm /var/www/rezapp.com

# Create symlink to previous build
sudo ln -s /var/www/deployments/frontend-20251114-180000 /var/www/rezapp.com
```

**Step 4: Clear Cache**
```bash
# Clear Nginx cache
sudo rm -rf /var/cache/nginx/*

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

**Step 5: Verify**
```bash
curl -I https://rezapp.com
# Should return 200 OK

# Test in browser
# Clear browser cache: Ctrl+Shift+R
```

#### Option B: CDN Rollback (Vercel/Netlify)

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# List deployments
vercel ls

# Rollback to previous
vercel rollback <PREVIOUS_DEPLOYMENT_URL>
# Example: vercel rollback https://rez-app-abc123.vercel.app
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# List deployments
netlify deploy --list

# Rollback
netlify rollback --site-id=<SITE_ID> --deploy-id=<PREVIOUS_DEPLOY_ID>
```

### 3.2 Mobile App Rollback

**iOS (App Store):**
```bash
# Cannot rollback published app instantly
# Workaround:

# 1. Kill switch via remote config (if implemented)
#    Update Firebase Remote Config to force older version behavior

# 2. Submit expedited review for previous version
#    - Go to App Store Connect
#    - Remove current version from sale
#    - Re-submit previous version
#    - Request expedited review (critical bug fix)

# 3. Use phased release
#    - Go to App Store Connect
#    - Pause phased release
#    - This stops further rollout to users
```

**Android (Play Store):**
```bash
# Faster than iOS - can rollback via Play Console

# 1. Go to Google Play Console
# 2. Release > Production > Manage
# 3. Click "Create new release from previous version"
# 4. Select last stable version
# 5. Click "Review release"
# 6. Click "Start rollout to production"

# Rollout will take 1-2 hours to reach all users

# Emergency: Use staged rollback
# - Set rollout percentage to 0% to pause
# - Then gradually increase for previous version
```

**Expo OTA Update Rollback:**
```bash
# If using Expo EAS Update
cd frontend

# List published updates
eas update:list

# Republish previous update
eas update:republish --channel production --group <PREVIOUS_UPDATE_GROUP_ID>

# Or rollback to specific update
eas update:rollback --channel production

# Users will receive rollback on next app restart
```

---

## 4. Database Rollback Procedures

### 4.1 Schema Migration Rollback

**CRITICAL WARNING**: Database rollbacks are HIGH RISK. Only perform if absolutely necessary.

**Prerequisites:**
- Migration scripts have `down` methods
- Full database backup exists
- Tested rollback procedure in staging

**Step 1: Verify Backup Exists**
```bash
# List backups
mongosh "$MONGODB_URI" --eval "
  db.adminCommand({listDatabases: 1})
"

# Or check MongoDB Atlas backups
# Go to Cluster > Backup
# Verify recent snapshot exists
```

**Step 2: Stop Application (Prevent Data Writes)**
```bash
# Stop backend to prevent new writes
pm2 stop rez-api-production
```

**Step 3: Create Emergency Backup**
```bash
# Full dump of current state
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="/var/backups/mongodb/pre-rollback-$TIMESTAMP"

# Compress
tar -czf "/var/backups/mongodb/pre-rollback-$TIMESTAMP.tar.gz" "/var/backups/mongodb/pre-rollback-$TIMESTAMP"
```

**Step 4: Rollback Migration**
```bash
cd /var/www/rez-app/user-backend

# Run migration rollback
npm run migrate:down

# Or rollback to specific version
npm run migrate:down -- --to 20251114_120000
```

**Step 5: Verify Schema**
```bash
# Check collections
mongosh "$MONGODB_URI" --eval "
  use rez_production
  db.getCollectionNames()
"

# Verify critical collection structure
mongosh "$MONGODB_URI" --eval "
  use rez_production
  db.users.findOne()
  db.products.findOne()
"
```

**Step 6: Restart Application**
```bash
pm2 start rez-api-production
pm2 logs rez-api-production --lines 100
```

### 4.2 Data Corruption Rollback (Point-in-Time Recovery)

**When to Use:**
- Data corruption detected
- Accidental data deletion
- Need to restore to specific point in time

**Using MongoDB Atlas:**

**Step 1: Access Atlas Console**
```bash
# Go to cloud.mongodb.com
# Select cluster > Backup
```

**Step 2: Choose Restore Point**
```bash
# Select snapshot from before corruption
# Or use continuous backup to restore to exact time
# Example: Restore to 2025-11-15 10:30 AM
```

**Step 3: Restore Options**

**Option A: Restore to New Cluster (Recommended)**
```bash
# 1. In Atlas, click "Restore"
# 2. Choose "Download" or "Restore to New Cluster"
# 3. Select new cluster name: rez-production-restored
# 4. Wait for restore (10-30 minutes depending on size)
# 5. Verify data in restored cluster
# 6. Update backend .env to point to new cluster
# 7. Restart backend
```

**Option B: Restore to Same Cluster (RISKY)**
```bash
# WARNING: This will overwrite current data
# 1. Stop ALL applications writing to database
# 2. In Atlas, click "Restore"
# 3. Choose "Restore to same cluster"
# 4. Confirm (this is irreversible)
# 5. Wait for restore
# 6. Restart applications
```

**Step 4: Verify Data Integrity**
```bash
# Connect to restored cluster
mongosh "<RESTORED_CLUSTER_URI>"

# Run data integrity checks
db.users.countDocuments()
db.products.countDocuments()
db.orders.countDocuments()

# Compare with expected counts
# Verify critical data exists
db.users.findOne({email: "critical.user@example.com"})
```

### 4.3 Manual Data Restoration

**For Specific Collections Only:**

```bash
# Restore single collection from backup
mongorestore --uri="$MONGODB_URI" \
  --nsInclude="rez_production.users" \
  /var/backups/mongodb/backup-20251114/rez_production/users.bson

# Or restore specific documents
mongosh "$MONGODB_URI" --eval "
  use rez_production
  db.users.deleteMany({createdAt: {\$gte: new Date('2025-11-15T10:00:00Z')}})
"

# Then restore from backup
mongorestore --uri="$MONGODB_URI" \
  --nsInclude="rez_production.users" \
  --drop \
  /var/backups/mongodb/backup-20251114/rez_production/users.bson
```

---

## 5. Communication Plan

### 5.1 Internal Communication

**Immediate (Within 5 minutes of rollback decision):**

**Notify Team via Slack/Teams:**
```
🚨 PRODUCTION ROLLBACK IN PROGRESS 🚨

Reason: [Brief description of issue]
Affected: [Backend/Frontend/Database/All]
Started: [Time]
ETA: [Estimated completion time]
Lead: [Person managing rollback]

Status updates will be posted every 15 minutes.
```

**Team Roles:**
- **Rollback Lead**: Executes rollback procedures
- **Observer**: Monitors system metrics, verifies health
- **Communicator**: Updates stakeholders
- **Subject Matter Expert**: Available for consultation

### 5.2 External Communication

**User-Facing Status Page:**

**Template:**
```
⚠️ Service Maintenance

We are currently performing emergency maintenance to resolve a critical issue.

Status: In Progress
Start Time: 2025-11-15 10:30 AM UTC
Expected Resolution: 2025-11-15 11:00 AM UTC

Affected Services:
- [List affected features]

We apologize for any inconvenience. Updates will be posted here.

Latest Update (10:45 AM): Rollback in progress, 50% complete.
```

**Update Channels:**
- [ ] Status page (status.rezapp.com)
- [ ] In-app banner (if possible)
- [ ] Social media (Twitter/X, LinkedIn)
- [ ] Email to critical users (optional)

### 5.3 Stakeholder Communication

**Email Template:**
```
Subject: Production Incident Response - Rollback Initiated

Dear Stakeholders,

We have identified a critical issue in production and have initiated rollback procedures.

**Details:**
- Incident Time: [Time]
- Impact: [Description]
- Affected Users: [Percentage/Count]
- Current Status: Rollback in progress

**Actions Taken:**
1. Issue identified via [monitoring/user reports]
2. Rollback decision made at [Time]
3. Rollback initiated at [Time]
4. Expected completion: [Time]

**Next Steps:**
- Complete rollback and verify system health
- Investigate root cause
- Implement fix
- Post-mortem scheduled for [Date/Time]

We will send updates every 30 minutes until resolved.

Best regards,
DevOps Team
```

### 5.4 Post-Rollback Communication

**Success Notification:**
```
✅ ROLLBACK COMPLETE

Service has been restored to previous stable version.

Completed: [Time]
Duration: [Duration]
Status: All systems operational

Next Steps:
- Monitoring for 2 hours
- Root cause analysis scheduled
- Fix implementation timeline TBD

Thank you for your patience.
```

---

## 6. Post-Rollback Actions

### 6.1 Immediate Actions (Within 1 hour)

**1. Verify System Stability**
```bash
# Monitor for 1 hour minimum
# Check error rates
# Check response times
# Verify no new issues
```

**Checklist:**
- [ ] API health checks passing
- [ ] Error rate < 1%
- [ ] Response times normal (p95 < 500ms)
- [ ] No user complaints
- [ ] Database connections stable
- [ ] Payment processing working

**2. Document Incident**

Create incident report: `incidents/INCIDENT-2025-11-15.md`

```markdown
# Production Incident - 2025-11-15

## Summary
[Brief description of what went wrong]

## Timeline
- 10:00 AM: Deployment started
- 10:15 AM: Issues detected
- 10:20 AM: Rollback decision made
- 10:25 AM: Rollback initiated
- 10:45 AM: Rollback complete
- 11:00 AM: System verified stable

## Impact
- Duration: 45 minutes
- Affected Users: ~1,500
- Failed Transactions: 23
- Revenue Impact: $X

## Root Cause
[What caused the issue]

## Resolution
[How it was resolved - rollback]

## Lessons Learned
[What we learned]

## Action Items
- [ ] Fix root cause
- [ ] Add monitoring for this scenario
- [ ] Update deployment checklist
- [ ] Improve testing
```

### 6.2 Short-term Actions (Within 24 hours)

**1. Root Cause Analysis**
```markdown
# Root Cause Analysis

## 5 Whys
1. Why did the issue occur?
   - [Answer]
2. Why did [Answer 1] happen?
   - [Answer]
3. Why did [Answer 2] happen?
   - [Answer]
4. Why did [Answer 3] happen?
   - [Answer]
5. Why did [Answer 4] happen?
   - [Root cause]

## Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Technical Details
[Deep dive into technical root cause]
```

**2. Fix Implementation Plan**
```markdown
# Fix Plan

## Issue
[Description]

## Proposed Solution
[How to fix]

## Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Testing Plan
- [ ] Unit tests
- [ ] Integration tests
- [ ] Staging deployment
- [ ] Load testing
- [ ] Manual verification

## Rollout Plan
- Deploy to staging: [Date]
- Staging verification: [Duration]
- Production deployment: [Date/Time]
- Gradual rollout: [Percentage plan]
```

### 6.3 Long-term Actions (Within 1 week)

**1. Post-Mortem Meeting**

**Agenda:**
- What happened?
- Why did it happen?
- How did we respond?
- What went well?
- What could be improved?
- Action items

**Attendees:**
- Tech Lead
- DevOps Engineer
- Backend Developer
- Frontend Developer
- QA Engineer
- Product Manager

**2. Process Improvements**

**Update Deployment Checklist:**
```markdown
Added to PRE_DEPLOYMENT_CHECKLIST.md:
- [ ] [New check based on incident]
- [ ] [Additional verification]
```

**Improve Monitoring:**
```markdown
New Alerts:
- [Metric] > [Threshold] → Alert immediately
- [Condition] detected → Page on-call engineer
```

**Enhance Testing:**
```markdown
New Tests:
- E2E test for [scenario that failed]
- Load test covering [condition]
- Chaos engineering test for [failure mode]
```

**3. Update Runbooks**

```markdown
Updated ROLLBACK_PROCEDURES.md:
- Added new scenario: [Issue type]
- Updated rollback steps for [component]
- Added verification steps for [condition]
```

---

## Appendix: Quick Reference

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Tech Lead | _______ | _______ | _______ |
| DevOps Lead | _______ | _______ | _______ |
| On-Call Engineer | _______ | _______ | _______ |
| Product Manager | _______ | _______ | _______ |

### Critical Commands

**Backend Rollback:**
```bash
pm2 stop rez-api-production
git checkout v1.0.4
npm install --production
npm run build
pm2 start ecosystem.config.js --env production
```

**Frontend Rollback (Nginx):**
```bash
sudo rm /var/www/rezapp.com
sudo ln -s /var/www/deployments/frontend-STABLE /var/www/rezapp.com
sudo systemctl reload nginx
```

**Database Backup:**
```bash
mongodump --uri="$MONGODB_URI" --out="/var/backups/mongodb/emergency-$(date +%Y%m%d_%H%M%S)"
```

### Decision Tree

```
Issue Detected
    ↓
Critical? (5xx > 50%, payments failing, auth broken)
    ↓
YES → ROLLBACK IMMEDIATELY
    ↓
NO → Evaluate Impact
    ↓
High Impact? (Error rate > 10%, performance > 2x)
    ↓
YES → Rollback within 30 mins
    ↓
NO → Deploy Hotfix Instead
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintained By**: DevOps Team
