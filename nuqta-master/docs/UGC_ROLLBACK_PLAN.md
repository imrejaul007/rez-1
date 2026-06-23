# UGC VIDEO SYSTEM - ROLLBACK PLAN
## Emergency Procedures for Deployment Rollback

**Last Updated:** November 8, 2025
**Version:** 1.0.0
**Emergency Contact:** [On-Call Engineer Phone]

---

## WHEN TO ROLLBACK

### 🔴 CRITICAL - Rollback Immediately

Execute rollback **immediately** if any of these occur:

- [ ] **Backend Crashes Repeatedly**
  - Server crashes > 3 times in 1 hour
  - PM2 cannot keep process alive
  - Out of memory errors

- [ ] **Critical Security Vulnerability**
  - User data exposed
  - File upload bypass discovered
  - Authentication broken
  - XSS/injection vulnerability confirmed

- [ ] **Data Corruption**
  - Database writes failing
  - Corrupted video uploads
  - User data loss detected

- [ ] **Payment System Affected**
  - Cart functionality broken
  - Payment processing errors
  - Order creation failing

- [ ] **Error Rate Spike**
  - Error rate > 10%
  - 5xx errors > 5% of requests
  - Database connection failures

### 🟡 HIGH PRIORITY - Rollback Within 1 Hour

Consider rollback if:

- [ ] **Poor Performance**
  - API response time > 2 seconds (p95)
  - Video upload success rate < 80%
  - Feed not loading for users

- [ ] **Feature Completely Broken**
  - Video upload not working at all
  - Product tagging broken
  - Reporting system down

- [ ] **Mass User Complaints**
  - > 20 support tickets in first hour
  - App crashes on iOS/Android
  - Negative reviews flooding in

### 🟢 LOW PRIORITY - Fix Without Rollback

Can be fixed in place (no rollback needed):

- [ ] Minor UI bugs
- [ ] Toast notification text errors
- [ ] Cosmetic issues
- [ ] Performance optimization opportunities
- [ ] Non-critical feature enhancements

---

## ROLLBACK DECISION PROCESS

### Decision Maker
**Primary:** Launch Lead / Technical Lead
**Backup:** CTO / Engineering Manager

### Decision Criteria

**Ask these questions:**
1. Is user data at risk? → **YES = ROLLBACK**
2. Is the app unusable? → **YES = ROLLBACK**
3. Can we fix it in < 30 minutes? → **NO = ROLLBACK**
4. Is revenue impacted? → **YES = ROLLBACK**
5. Is error rate increasing? → **YES = ROLLBACK**

**Decision Tree:**
```
Critical Issue? → YES → ROLLBACK
       ↓
      NO
       ↓
Can fix in 30min? → NO → ROLLBACK
       ↓
      YES
       ↓
Fix in place → Monitor closely
```

---

## ROLLBACK PROCEDURES

### PROCEDURE 1: BACKEND ROLLBACK

**Time Required:** ~10 minutes
**Risk Level:** Low (well-tested)

#### Step 1: Identify Previous Stable Version

```bash
# SSH into production server
ssh user@production-server

# Check Git history
cd /var/www/rezapp-backend
git log --oneline -10

# Identify last stable commit (before UGC merge)
# Example: abc123d "Last stable version before UGC"
```

**Previous Stable Version:**
- Git commit: `_____________`
- Git tag: `_____________` (e.g., v0.9.9)
- Date: `_____________`

#### Step 2: Stop Backend

```bash
# Stop backend application
pm2 stop rezapp-backend

# Verify it's stopped
pm2 status
```

- [ ] ✅ Backend stopped
- [ ] ✅ No running processes

#### Step 3: Revert Code

```bash
# Checkout previous stable version
git checkout <stable-commit-hash>
# OR
git checkout <stable-tag>

# Alternative: Revert the UGC merge commit
# git revert <ugc-merge-commit> --no-commit
# git commit -m "Revert UGC feature"

# Reinstall dependencies (in case package.json changed)
npm install --production

# Rebuild
npm run build
```

- [ ] ✅ Code reverted
- [ ] ✅ Dependencies installed
- [ ] ✅ Build successful

#### Step 4: Restore Environment Variables (if needed)

```bash
# If .env was modified, restore backup
cp .env.backup .env

# Verify critical variables
grep "MONGODB_URI" .env
grep "CLOUDINARY" .env
```

- [ ] ✅ Environment variables restored

#### Step 5: Restart Backend

```bash
# Restart backend
pm2 restart rezapp-backend

# Monitor startup
pm2 logs rezapp-backend --lines 50
```

- [ ] ✅ Backend started successfully
- [ ] ✅ No errors in startup logs

#### Step 6: Verify Backend Health

```bash
# Health check
curl https://api.rezapp.com/health
# Expected: {"status":"ok"}

# Test critical endpoints
curl -H "Authorization: Bearer <test-token>" https://api.rezapp.com/api/products
curl -H "Authorization: Bearer <test-token>" https://api.rezapp.com/api/cart

# UGC endpoint should return 404 or error (feature removed)
curl https://api.rezapp.com/api/ugc
```

- [ ] ✅ Health check returns 200 OK
- [ ] ✅ Critical endpoints working
- [ ] ✅ UGC endpoints disabled/removed

**Backend Rollback Complete:** ✅

---

### PROCEDURE 2: FRONTEND ROLLBACK

#### Option A: Expo OTA Update Rollback (Fastest - 5 minutes)

If using Expo OTA updates:

```bash
# Rollback to previous update
eas update --branch production --message "Rollback UGC feature"

# OR publish specific previous update
eas update:republish --update-id <previous-update-id>
```

- [ ] ✅ OTA update published
- [ ] ✅ Users will receive rollback on next app open

**Note:** OTA updates apply only to JavaScript changes, not native code.

#### Option B: App Store Rollback (Slower - Hours to Days)

**iOS Rollback:**
```bash
# Option 1: Submit previous build to App Store
eas submit --platform ios --id <previous-build-id>

# Option 2: Phased release
# Go to App Store Connect → Version → Pause Phased Release
```

- [ ] iOS submission started
- [ ] Estimated approval time: 24-48 hours

**Android Rollback:**
```bash
# Option 1: Submit previous build to Play Store
eas submit --platform android --id <previous-build-id>

# Option 2: Staged rollout
# Go to Play Console → Release → Halt rollout
```

- [ ] Android submission started
- [ ] Estimated approval time: 1-7 days

**Note:** App store rollback takes time. Consider:
1. Pausing rollout (stop new users from getting it)
2. Fixing forward instead of rolling back
3. Disabling UGC feature via feature flag (if implemented)

#### Option C: Feature Flag Disable (Immediate)

If you implemented feature flags:

**Backend:**
```env
# In .env file
ENABLE_UGC_UPLOAD=false
ENABLE_VIDEO_MODERATION=false
```

```bash
# Restart backend to apply
pm2 restart rezapp-backend
```

**Frontend:**
```env
# In .env or remote config
EXPO_PUBLIC_ENABLE_VIDEO_UPLOAD=false
```

- [ ] ✅ Feature flags disabled
- [ ] ✅ UGC features hidden in app
- [ ] ✅ No code rollback needed

---

### PROCEDURE 3: DATABASE ROLLBACK

🔴 **CAUTION:** Database rollback is risky. Only do if data corruption occurred.

#### Before Rolling Back Database:

**Ask:**
1. Is there actual data corruption? → Verify first
2. Can we fix with data migration script? → Try this first
3. Will we lose user-generated content? → Document what's lost

#### MongoDB Atlas Point-in-Time Restore

**Time Required:** 30-60 minutes
**Data Loss:** All data after restore point

**Steps:**

1. **Go to MongoDB Atlas Dashboard**
   - Navigate to your cluster
   - Click "Backup" tab
   - Click "Restore Data"

2. **Select Restore Point**
   - Choose timestamp before UGC deployment
   - Example: Today 2:00 AM (before launch at 3:00 AM)

3. **Choose Restore Method**
   - **Option A:** Restore to same cluster (RISKY - will overwrite)
   - **Option B:** Restore to new cluster (SAFE - test first)

4. **Recommended: Restore to New Cluster**
   ```
   Cluster Name: rezapp-prod-restore-[date]
   Tier: Same as production
   Region: Same as production
   ```

5. **Verify Restored Data**
   ```bash
   # Connect to restored cluster
   mongo "mongodb+srv://restored-cluster..."

   # Check collections
   use rezapp
   show collections

   # Verify data integrity
   db.products.count()
   db.users.count()
   db.ugc.count()  # Should be 0 or minimal
   ```

6. **Switch to Restored Cluster**
   ```bash
   # Update backend .env
   MONGODB_URI=mongodb+srv://restored-cluster...

   # Restart backend
   pm2 restart rezapp-backend
   ```

7. **Deprecate Old Cluster**
   - Keep old cluster running for 24 hours (in case)
   - Document data loss window
   - Notify users if necessary

- [ ] ✅ Database restored
- [ ] ✅ Data integrity verified
- [ ] ✅ Backend connected to restored DB

**Data Loss Documentation:**
```
Restore Point: [Date/Time]
Data Lost:
- UGC videos uploaded after: [Time]
- Reports submitted after: [Time]
- User interactions after: [Time]

Estimated affected users: _____
```

---

## POST-ROLLBACK PROCEDURES

### Immediate Actions (0-15 minutes)

#### 1. Verify Rollback Success

**Backend Checks:**
```bash
# Health check
curl https://api.rezapp.com/health

# Critical endpoints
curl https://api.rezapp.com/api/products
curl https://api.rezapp.com/api/cart

# Logs clean
pm2 logs rezapp-backend --lines 100 | grep ERROR
```

- [ ] ✅ Health check passing
- [ ] ✅ No errors in logs
- [ ] ✅ Critical features working

**Frontend Checks:**
- [ ] App launches successfully
- [ ] Can browse products
- [ ] Can add to cart
- [ ] Can checkout
- [ ] UGC features hidden/disabled

#### 2. Monitor Key Metrics

**First 15 Minutes:**
- [ ] Error rate: < 1% ✅
- [ ] API response time: < 500ms ✅
- [ ] User sessions: Normal ✅
- [ ] Support tickets: Decreasing ✅

### Communication (15-30 minutes)

#### Internal Communication

**Slack/Email to Team:**
```
🔄 ROLLBACK EXECUTED

We've rolled back the UGC Video System deployment at [TIME].

Reason: [Brief description]

Current Status:
✅ Backend stable
✅ Frontend functional
✅ Users can use app normally

Rollback completed successfully. System is stable.

Post-mortem meeting scheduled for [TIME].

[Rollback Lead Name]
```

#### External Communication (if necessary)

**Criteria for User Communication:**
- [ ] > 10% of users affected
- [ ] Feature was already announced
- [ ] Users noticed the issue

**User Communication (if needed):**

**In-App Message:**
```
We've temporarily disabled video uploads while we make improvements.
We'll have it back soon!
```

**Social Media:**
```
We're making some improvements to our new video feature.
It will be back shortly! Thanks for your patience. 🙏
```

**Email (only if severe):**
```
Subject: Service Update

We briefly experienced issues with our new video feature.
The issue has been resolved, and all other features are working normally.

We apologize for any inconvenience.

- The REZ Team
```

### Investigation (30 minutes - 2 hours)

#### Root Cause Analysis

**Document the Issue:**
1. **What happened?**
   - Symptom: _____________
   - Error messages: _____________
   - Time of occurrence: _____________

2. **Why did it happen?**
   - Root cause: _____________
   - Contributing factors: _____________

3. **How was it detected?**
   - Monitoring alert? _____________
   - User report? _____________
   - Team member noticed? _____________

4. **What was the impact?**
   - Users affected: _____
   - Duration: _____ minutes
   - Revenue impact: $_____

**Collect Evidence:**
- [ ] Server logs saved
- [ ] Error tracking screenshots
- [ ] Database state before rollback
- [ ] User reports archived

**Incident Report Template:**
```markdown
# Incident Report: UGC Deployment Rollback

**Date:** [Date]
**Time:** [Time]
**Duration:** [X] minutes
**Severity:** Critical / High / Medium / Low

## Summary
[Brief description]

## Timeline
- [Time]: UGC deployed
- [Time]: Issue detected
- [Time]: Rollback initiated
- [Time]: Rollback completed
- [Time]: System stable

## Root Cause
[Detailed explanation]

## Impact
- Users affected: [X]
- Features impacted: [List]
- Data loss: [Yes/No - details]

## Resolution
[What was done to fix]

## Prevention
[How to prevent in future]

## Action Items
- [ ] Fix root cause
- [ ] Add monitoring for [X]
- [ ] Update deployment checklist
- [ ] Team training on [X]
```

### Planning Next Attempt (2-24 hours)

#### Fix the Issue

**Create Fix Plan:**
1. **Identify Fix:**
   - What needs to change: _____________
   - Code changes required: _____________
   - Test cases to add: _____________

2. **Test Fix:**
   - [ ] Fix applied in development
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Staging deployment successful
   - [ ] Staging smoke tests pass

3. **Review Changes:**
   - [ ] Code review complete
   - [ ] Security review (if security issue)
   - [ ] Performance review (if performance issue)

#### Update Deployment Plan

**Lessons Learned:**
- What we missed in checklist: _____________
- What monitoring we need: _____________
- What tests we need: _____________

**Updated Checklist Items:**
- [ ] Add check for: _____________
- [ ] Add monitoring for: _____________
- [ ] Add test for: _____________

#### Schedule Redeployment

**Redeployment Readiness:**
- [ ] Root cause fixed
- [ ] Fix tested thoroughly
- [ ] Team briefed on changes
- [ ] Deployment checklist updated
- [ ] Rollback plan updated
- [ ] Monitoring enhanced

**Redeployment Date:** _____________
**Redeployment Time:** _____________

---

## ROLLBACK DECISION LOG

**Use this template to document rollback decisions:**

| Date/Time | Issue | Decision | Decision Maker | Outcome |
|-----------|-------|----------|----------------|---------|
|           |       |          |                |         |

**Example:**
| Date/Time | Issue | Decision | Decision Maker | Outcome |
|-----------|-------|----------|----------------|---------|
| 2025-11-08 03:30 | Backend crash loop | ROLLBACK | John Doe (Tech Lead) | Successful - System stable at 03:45 |

---

## CONTACT INFORMATION

### Emergency Contacts

**Launch Team:**
- Launch Lead: _____________ | Phone: _____________
- Backend Engineer: _____________ | Phone: _____________
- Frontend Engineer: _____________ | Phone: _____________
- DevOps Engineer: _____________ | Phone: _____________

**Management Escalation:**
- Technical Lead: _____________ | Phone: _____________
- CTO: _____________ | Phone: _____________
- CEO: _____________ | Phone: _____________ (critical only)

**Vendor Support:**
- Cloudinary Support: support@cloudinary.com | +1-XXX-XXX-XXXX
- MongoDB Atlas Support: [Support Portal]
- Expo Support: [Support Portal]

### Communication Channels

- **Emergency Slack:** #ugc-launch-emergency
- **Video Call:** [Link]
- **Status Page:** [Link if applicable]

---

## ROLLBACK TESTING

### Pre-Launch Rollback Drill

**Before launch, practice rollback:**

1. **Deploy to Staging:**
   - [ ] Deploy UGC to staging
   - [ ] Verify it works

2. **Simulate Issue:**
   - [ ] Introduce error (e.g., stop database)
   - [ ] Trigger alerts

3. **Execute Rollback:**
   - [ ] Follow rollback procedures
   - [ ] Time each step
   - [ ] Document issues

4. **Verify Success:**
   - [ ] Staging back to normal
   - [ ] All features working

5. **Update Procedures:**
   - [ ] Fix any procedure gaps
   - [ ] Update time estimates

**Rollback Drill Completed:** ☐ YES | Date: _____________

---

## APPENDIX

### Useful Commands

**Backend:**
```bash
# Check backend status
pm2 status
pm2 logs rezapp-backend

# Restart backend
pm2 restart rezapp-backend

# View environment
pm2 env rezapp-backend

# Check Git history
git log --oneline -20
git show <commit-hash>

# Revert to commit
git checkout <commit-hash>
git reset --hard <commit-hash>
```

**Database:**
```bash
# Connect to MongoDB
mongo "mongodb+srv://..."

# Check collections
show collections

# Count documents
db.ugc.count()

# Find recent documents
db.ugc.find().sort({createdAt:-1}).limit(10)
```

**Cloudinary:**
```bash
# Test upload
curl -X POST https://api.cloudinary.com/v1_1/YOUR_CLOUD/upload \
  -F "upload_preset=ugc_videos" \
  -F "file=@test.mp4"
```

### Rollback Checklist Summary

**Quick Reference:**
- [ ] 1. Identify issue and decide to rollback
- [ ] 2. Notify team (Slack #ugc-launch-emergency)
- [ ] 3. Stop backend (pm2 stop)
- [ ] 4. Revert code (git checkout)
- [ ] 5. Rebuild (npm run build)
- [ ] 6. Restart backend (pm2 restart)
- [ ] 7. Verify health (/health endpoint)
- [ ] 8. Disable frontend feature (OTA update OR feature flag)
- [ ] 9. Monitor metrics (error rate, response time)
- [ ] 10. Communicate to users (if necessary)
- [ ] 11. Investigate root cause
- [ ] 12. Document incident
- [ ] 13. Plan fix and redeployment

---

**Document Version:** 1.0.0
**Last Updated:** November 8, 2025
**Next Review:** After each rollback execution or quarterly
