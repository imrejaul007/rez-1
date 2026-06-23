# UGC VIDEO SYSTEM - LAUNCH DAY CHECKLIST
## Step-by-Step Launch Procedures

**Launch Date:** _____________
**Launch Time:** _____________  (Recommended: Off-peak hours, e.g., 2 AM local time)
**Team Lead:** _____________

---

## PRE-LAUNCH (T-7 DAYS)

### Week Before Launch

#### Code Freeze
- [ ] **Code Repository**
  - [ ] Final code merged to `main` branch
  - [ ] Tag release: `git tag -a v1.0.0-ugc -m "UGC Video System Launch"`
  - [ ] Push tags: `git push origin v1.0.0-ugc`
  - [ ] Code freeze announced to team
  - [ ] No new features after this point

#### Staging Environment
- [ ] **Deploy to Staging**
  - [ ] Backend deployed to staging server
  - [ ] Frontend built with staging environment variables
  - [ ] Cloudinary TEST environment configured
  - [ ] Database: Use staging database (not production)

- [ ] **Staging Smoke Test**
  - [ ] Upload test video
  - [ ] Tag products
  - [ ] Submit test report
  - [ ] Add to cart from video
  - [ ] All features work in staging

#### Beta Testing
- [ ] **Beta Group Setup**
  - [ ] 10-20 beta testers selected
  - [ ] Beta access granted (TestFlight for iOS, internal track for Android)
  - [ ] Feedback form shared: _____________

- [ ] **Beta Testing Period** (3-5 days)
  - [ ] Beta testers onboarded
  - [ ] Feedback collected daily
  - [ ] Critical bugs logged and fixed
  - [ ] Non-critical bugs documented for post-launch

#### Documentation
- [ ] **User Documentation Ready**
  - [ ] Help article: "How to Upload Videos"
  - [ ] Help article: "How to Tag Products in Videos"
  - [ ] Help article: "How to Report Inappropriate Content"
  - [ ] FAQ updated with UGC questions

- [ ] **Support Team Briefing**
  - [ ] Support team trained on UGC features
  - [ ] Common issues and solutions documented
  - [ ] Escalation path defined

#### Marketing Preparation
- [ ] **Marketing Materials**
  - [ ] Announcement post drafted
  - [ ] Social media graphics ready
  - [ ] Email campaign prepared
  - [ ] In-app announcement banner designed

---

## PRE-LAUNCH (T-24 HOURS)

### Day Before Launch

#### Final Checks
- [ ] **Environment Verification**
  - [ ] Production `.env` files reviewed
  - [ ] All environment variables set correctly
  - [ ] Cloudinary production keys active
  - [ ] API base URL points to production
  - [ ] No debug flags enabled

- [ ] **Dependency Audit**
  ```bash
  cd frontend
  npm audit --production
  npm outdated
  ```
  - [ ] No critical vulnerabilities
  - [ ] Dependencies up to date (or risks documented)

- [ ] **Build Verification**
  ```bash
  # Frontend production build
  cd frontend
  npm run build  # or npx expo build
  ```
  - [ ] Build completes successfully
  - [ ] No warnings or errors
  - [ ] Bundle size acceptable (<50MB)

#### Database Preparation
- [ ] **Database Indexes**
  ```javascript
  // Run in MongoDB shell
  db.ugc.createIndex({ userId: 1, createdAt: -1 })
  db.ugc.createIndex({ isFlagged: 1, createdAt: -1 })
  db.ugc.createIndex({ "taggedProducts.productId": 1 })
  db.ugc.createIndex({ createdAt: -1 })
  ```
  - [ ] All indexes created
  - [ ] Index creation logged

- [ ] **Database Backup**
  - [ ] Full database backup taken
  - [ ] Backup stored securely
  - [ ] Backup verified (can be restored)
  - [ ] Backup location: _____________

#### Cloudinary Final Check
- [ ] **Cloudinary Dashboard**
  - [ ] Upload preset `ugc_videos` exists and is unsigned
  - [ ] Folder structure created: `/videos/ugc/`
  - [ ] Storage quota sufficient (at least 50% free)
  - [ ] Bandwidth quota sufficient (at least 70% free)
  - [ ] Test upload successful

#### Team Preparation
- [ ] **Team Roles Assigned**
  - [ ] **Launch Lead:** _____________ (coordinates launch)
  - [ ] **Backend Engineer:** _____________ (monitors backend)
  - [ ] **Frontend Engineer:** _____________ (monitors app)
  - [ ] **QA Engineer:** _____________ (runs smoke tests)
  - [ ] **Support Lead:** _____________ (handles user issues)
  - [ ] **On-Call Engineer:** _____________ (for emergencies)

- [ ] **Communication Channels**
  - [ ] Slack/Discord channel created: #ugc-launch
  - [ ] Video call link for launch: _____________
  - [ ] All team members added
  - [ ] Phone numbers exchanged for emergencies

#### Rollback Plan Review
- [ ] **Rollback Preparation**
  - [ ] Previous stable version identified: v_____________
  - [ ] Rollback procedure documented (see ROLLBACK_PLAN.md)
  - [ ] Rollback decision criteria agreed upon
  - [ ] Database rollback script ready (if needed)

---

## LAUNCH DAY (T-0)

### 2 Hours Before Launch

#### Final System Check
- [ ] **Backend Health**
  ```bash
  # SSH into production server
  ssh user@production-server
  pm2 status
  pm2 logs rezapp-backend --lines 50
  ```
  - [ ] Backend server running
  - [ ] No errors in logs
  - [ ] CPU usage normal (<50%)
  - [ ] Memory usage normal (<70%)

- [ ] **Database Health**
  - [ ] MongoDB Atlas dashboard: All green
  - [ ] Connection count normal
  - [ ] No slow queries
  - [ ] Disk space sufficient (>30% free)

- [ ] **Cloudinary Status**
  - [ ] Cloudinary dashboard accessible
  - [ ] No service issues reported
  - [ ] Upload test successful

#### Monitoring Setup
- [ ] **Error Tracking**
  - [ ] Sentry dashboard open and monitored
  - [ ] Error alerts configured
  - [ ] Email notifications enabled

- [ ] **Analytics**
  - [ ] Google Analytics real-time dashboard open
  - [ ] Custom UGC events configured:
    - `video_upload_started`
    - `video_upload_completed`
    - `video_upload_failed`
    - `product_tagged`
    - `video_reported`
    - `cart_added_from_video`

- [ ] **Performance Monitoring**
  - [ ] API response time dashboard
  - [ ] Server metrics dashboard
  - [ ] Database performance dashboard

---

### 1 Hour Before Launch

#### Deployment Preparation
- [ ] **Backend Deployment Ready**
  ```bash
  # Prepare deployment (don't execute yet)
  cd /var/www/rezapp-backend
  git fetch origin
  git checkout v1.0.0-ugc
  npm install --production
  npm run build
  ```
  - [ ] Commands tested in dry-run mode
  - [ ] No errors during preparation

- [ ] **Frontend Build Ready**
  ```bash
  # iOS build
  eas build --platform ios --profile production --non-interactive

  # Android build
  eas build --platform android --profile production --non-interactive
  ```
  - [ ] Builds completed successfully
  - [ ] Build URLs saved: _____________

#### Team Assembly
- [ ] **All Team Members Online**
  - [ ] Launch Lead: ✅
  - [ ] Backend Engineer: ✅
  - [ ] Frontend Engineer: ✅
  - [ ] QA Engineer: ✅
  - [ ] Support Lead: ✅
  - [ ] On-Call Engineer: ✅

- [ ] **Communication Check**
  - [ ] Video call connected
  - [ ] Screen sharing working
  - [ ] All monitors visible

---

### LAUNCH TIME (T+0)

#### Backend Deployment (T+0 to T+15 min)

**Step 1: Deploy Backend**
```bash
# 1. Stop current backend
pm2 stop rezapp-backend

# 2. Deploy new code
cd /var/www/rezapp-backend
git pull origin main
npm install --production
npm run build

# 3. Restart backend
pm2 restart rezapp-backend

# 4. Monitor logs
pm2 logs rezapp-backend --lines 100
```

- [ ] ⏱️ **T+0:** Backend stopped (00:00)
- [ ] ⏱️ **T+5:** New code deployed (00:05)
- [ ] ⏱️ **T+10:** Backend restarted (00:10)
- [ ] ⏱️ **T+15:** Logs verified - no errors (00:15)

**Backend Health Check:**
```bash
# Health endpoint
curl https://api.rezapp.com/health
# Expected: {"status":"ok","timestamp":"..."}

# UGC endpoint (should require auth)
curl https://api.rezapp.com/api/ugc
# Expected: 401 Unauthorized (correct - requires token)
```

- [ ] ✅ Health endpoint returns 200 OK
- [ ] ✅ UGC endpoints accessible
- [ ] ✅ No errors in logs

---

#### Frontend Deployment (T+15 to T+45 min)

**Step 2: Submit to App Stores**

**iOS Deployment:**
```bash
# Submit to App Store
eas submit --platform ios --latest
```
- [ ] ⏱️ **T+15:** iOS submission started (00:15)
- [ ] ⏱️ **T+30:** iOS submission completed (00:30)
- [ ] Submission ID: _____________

**Android Deployment:**
```bash
# Submit to Google Play
eas submit --platform android --latest
```
- [ ] ⏱️ **T+20:** Android submission started (00:20)
- [ ] ⏱️ **T+35:** Android submission completed (00:35)
- [ ] Submission ID: _____________

**Note:** App store review times vary:
- iOS: 24-48 hours typically
- Android: 1-7 days typically

**Alternative: OTA Update (Immediate)**
If using Expo OTA updates:
```bash
eas update --branch production --message "UGC Video System Launch"
```
- [ ] ⏱️ **T+15:** OTA update published (00:15)
- [ ] ⏱️ **T+20:** Update live (00:20)

---

#### Smoke Testing (T+45 to T+60 min)

**Step 3: Run Smoke Tests**

🔴 **CRITICAL:** All smoke tests must pass before announcing launch

**Test 1: User Registration/Login**
- [ ] Create new test account
- [ ] Login successful
- [ ] Token received and stored

**Test 2: Video Feed**
- [ ] Feed loads (may be empty initially)
- [ ] No errors in console
- [ ] Loading states work

**Test 3: Video Upload**
- [ ] Select video from gallery
- [ ] Tag 5 products
- [ ] Upload progress shows
- [ ] Upload completes successfully
- [ ] Toast notification appears: "Video uploaded successfully"

**Test 4: Video Playback**
- [ ] Uploaded video appears in feed
- [ ] Tap to play works
- [ ] Video plays smoothly
- [ ] All product tags visible

**Test 5: Shopping Integration**
- [ ] Tap tagged product
- [ ] Add to cart works
- [ ] Toast notification: "Added to cart"
- [ ] Cart count updates

**Test 6: Reporting**
- [ ] Tap report button
- [ ] Select reason
- [ ] Submit report
- [ ] Toast notification: "Report submitted"

**Test 7: Error Handling**
- [ ] Upload invalid file type
- [ ] Error message appears
- [ ] App doesn't crash

- [ ] ⏱️ **T+60:** All smoke tests passed ✅

---

### POST-LAUNCH MONITORING (T+1 HOUR to T+24 HOURS)

#### First Hour (T+1 to T+2)

**Monitor Every 15 Minutes:**

- [ ] **T+1 Hour Check**
  - [ ] Backend uptime: 100%
  - [ ] API response time: p95 < 500ms
  - [ ] Error rate: < 1%
  - [ ] No 5xx errors
  - [ ] Videos uploaded: _____ (should be low initially)

**Metrics Dashboard:**
```
[Backend Metrics]
- CPU Usage: _____% (target: <70%)
- Memory Usage: _____% (target: <80%)
- Request/sec: _____ (baseline established)
- Error Rate: _____% (target: <1%)

[Cloudinary Metrics]
- Storage Used: _____GB
- Bandwidth Used: _____GB
- Uploads Today: _____

[User Metrics]
- Videos Uploaded: _____
- Products Tagged: _____
- Reports Submitted: _____
- Add-to-Cart from Video: _____
```

#### First 4 Hours (T+2 to T+6)

**Hourly Checks:**

- [ ] **T+2 Hour Check**
  - [ ] System stable
  - [ ] User engagement increasing
  - [ ] No critical errors
  - [ ] Support tickets: _____ (document common issues)

- [ ] **T+3 Hour Check**
  - [ ] Backend performance stable
  - [ ] Database queries optimized
  - [ ] No memory leaks
  - [ ] Cloudinary uploads successful

- [ ] **T+4 Hour Check**
  - [ ] Video upload success rate: > 95%
  - [ ] Playback smooth
  - [ ] No user complaints
  - [ ] Shopping integration working

- [ ] **T+6 Hour Check**
  - [ ] Peak hour traffic handled
  - [ ] No degradation
  - [ ] All systems green

#### First 24 Hours (T+6 to T+24)

**Monitor Every 4 Hours:**

- [ ] **T+12 Hour Check (Mid-day)**
  - [ ] Traffic pattern normal
  - [ ] User feedback positive
  - [ ] Bug reports: _____ (categorize by severity)

- [ ] **T+18 Hour Check (Evening)**
  - [ ] Peak traffic handled
  - [ ] Performance metrics stable
  - [ ] Support team managing well

- [ ] **T+24 Hour Check (Next Day)**
  - [ ] 24-hour uptime achieved
  - [ ] No critical issues
  - [ ] User adoption metrics:
    - Videos uploaded: _____
    - Unique users: _____
    - Products tagged: _____
    - Cart conversions: _____

---

## LAUNCH ANNOUNCEMENT

### Internal Announcement (Immediately After Smoke Tests Pass)

**Slack/Email to Team:**
```
🚀 UGC Video System is LIVE! 🎉

We've successfully launched the UGC Video System at [TIME].

✅ All smoke tests passed
✅ Backend stable and responsive
✅ Video upload working perfectly
✅ Shopping integration functional

Monitoring continues for next 24 hours.

Great work team! 👏

[Launch Lead Name]
```

### External Announcement (T+2 Hours, After Stable Period)

**In-App Announcement:**
- [ ] Banner shown in app: "New Feature: Share Your Videos!"
- [ ] Tutorial modal on first open
- [ ] Highlight "Upload" button

**Social Media:**
- [ ] Twitter/X post
- [ ] Instagram story
- [ ] Facebook post
- [ ] LinkedIn announcement (if applicable)

**Email Campaign:**
- [ ] Email sent to active users
- [ ] Subject: "Introducing Video Shopping 🎥🛍️"
- [ ] CTA: Upload your first video

**Press Release (if applicable):**
- [ ] Sent to media contacts
- [ ] Posted on company blog

---

## SUCCESS CRITERIA

### Must-Have (Launch Day)
- [ ] ✅ Backend uptime: 100%
- [ ] ✅ Video upload success rate: > 95%
- [ ] ✅ Error rate: < 1%
- [ ] ✅ No critical bugs
- [ ] ✅ Support team able to handle inquiries

### Good-to-Have (First Week)
- [ ] Videos uploaded: > 100
- [ ] User engagement: > 50% of active users try feature
- [ ] Cart conversion from videos: > 5%
- [ ] User rating: ≥ 4 stars
- [ ] Support tickets: < 10 per day

---

## ROLLBACK TRIGGERS

🚨 **Initiate Rollback If:**
- [ ] Backend crashes repeatedly (> 3 times in 1 hour)
- [ ] Error rate > 10%
- [ ] Video upload success rate < 80%
- [ ] Critical security vulnerability discovered
- [ ] Data corruption detected
- [ ] Payment system affected (if integrated)

**Rollback Decision Maker:** [Launch Lead Name]

**Rollback Procedure:** See ROLLBACK_PLAN.md

---

## ISSUE TRACKING

### Critical Issues (Fix Immediately)
| Issue | Time | Status | Owner | Resolution |
|-------|------|--------|-------|------------|
|       |      |        |       |            |

### High Priority (Fix Within 24 Hours)
| Issue | Time | Status | Owner | Resolution |
|-------|------|--------|-------|------------|
|       |      |        |       |            |

### Medium/Low Priority (Fix Post-Launch)
| Issue | Time | Priority | Owner | Notes |
|-------|------|----------|-------|-------|
|       |      |          |       |       |

---

## TEAM COMMUNICATION LOG

### Launch Timeline
| Time | Event | Status | Notes |
|------|-------|--------|-------|
| T-60 | Backend deployed | ✅ |  |
| T-30 | Frontend deployed | ✅ |  |
| T-15 | Smoke tests started | ✅ |  |
| T+0 | Smoke tests passed | ✅ |  |
| T+1 | Monitoring confirmed stable | ✅ |  |
| T+2 | Public announcement | ✅ |  |

---

## POST-LAUNCH REPORT

**To be completed 24 hours after launch**

### Metrics Summary
- **Uptime:** _____%
- **Videos Uploaded:** _____
- **Unique Uploaders:** _____
- **Total Views:** _____
- **Products Tagged:** _____
- **Add-to-Cart Actions:** _____
- **Reports Submitted:** _____
- **Support Tickets:** _____

### Issues Encountered
1. _____________
2. _____________
3. _____________

### Lessons Learned
1. _____________
2. _____________
3. _____________

### Next Steps
- [ ] Address high-priority bugs
- [ ] Optimize based on performance data
- [ ] Plan feature enhancements

---

## SIGN-OFF

### Launch Completion
- [ ] **Launch Lead:** __________________ Date: ________ Time: ________
  - Launch executed successfully

- [ ] **Technical Lead:** __________________ Date: ________ Time: ________
  - System stable and performant

- [ ] **Product Manager:** __________________ Date: ________ Time: ________
  - User feedback positive

---

**Launch Status:** 🚀 **LIVE** | ⏸️ **PAUSED** | 🔄 **ROLLED BACK**

**Document Version:** 1.0.0
**Last Updated:** November 8, 2025
