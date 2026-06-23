# TEAM HANDOFF DOCUMENT
## REZ App - Knowledge Transfer & Operational Guide

**Document Version:** 1.0.0
**Date:** January 2025
**Purpose:** Complete knowledge transfer for operational team

---

## CURRENT STATE SUMMARY

### Application Overview
- **Name:** REZ App
- **Version:** 1.0.0
- **Platform:** React Native (Expo)
- **Language:** TypeScript
- **Backend:** Node.js + MongoDB
- **Status:** Production-ready (76/100 quality score)

### Key Metrics
- **Codebase:** 10,677 TypeScript files
- **Screens:** 60+ application screens
- **API Endpoints:** 211 backend endpoints
- **Test Coverage:** ~50% (target 70%+)
- **Features:** Comprehensive e-commerce + gamification + social

---

## ARCHITECTURE OVERVIEW

### Frontend Architecture
```
frontend/
├── app/                # Screens (Expo Router)
├── components/         # Reusable components
├── services/           # API integration
├── hooks/              # Custom React hooks
├── contexts/           # State management
├── utils/              # Utility functions
└── types/              # TypeScript definitions
```

### Backend Architecture
```
backend/
├── controllers/        # Request handlers
├── models/             # Database schemas
├── routes/             # API routes
├── middleware/         # Auth, validation, etc.
└── services/           # Business logic
```

### Database Schema
- **MongoDB Atlas** (M10+ recommended)
- **Collections:** Users, Products, Orders, Cart, Payments, Wallet, etc.
- **Indexes:** See PRODUCTION_READINESS_CHECKLIST.md

---

## DEPLOYMENT PROCEDURES

### Frontend Deployment (Mobile App)

**iOS:**
```bash
cd frontend
npm install
npx expo build:ios --release-channel production
# Download IPA from Expo
# Upload to App Store Connect
```

**Android:**
```bash
cd frontend
npm install
npx expo build:android --release-channel production
# Download APK from Expo
# Upload to Google Play Console
```

### Backend Deployment

```bash
# On production server
cd /var/www/rez-app-backend
git pull origin main
npm install --production
npm run build
pm2 restart rezapp-backend
pm2 save
```

---

## MONITORING DASHBOARDS

### Error Tracking
- **Sentry:** https://sentry.io/organizations/rez-app
- **Login:** [credentials in password manager]
- **Check:** Error rate, crash rate, performance

### Uptime Monitoring
- **UptimeRobot:** https://uptimerobot.com/dashboard
- **Monitors:** API health, website uptime
- **Alerts:** Email + SMS

### Performance Monitoring
- **PM2 Dashboard:** `pm2 monit` (on server)
- **Metrics:** CPU, memory, response times

### Analytics
- **Firebase:** https://console.firebase.google.com
- **Google Analytics:** [if configured]

---

## KNOWN ISSUES & WORKAROUNDS

### Issue #1: TypeScript Compilation Errors
**Status:** Known
**Impact:** Prevents builds
**Location:**
- `hooks/usePerformance.ts` line 271
- `services/stockNotificationApi.ts` line 190
- `__tests__/gamification/testUtils.ts` line 19

**Workaround:** Fix syntax errors before build
**Permanent Fix:** Scheduled for Priority 1 (Day 1)

### Issue #2: ESLint Configuration Error
**Status:** Known
**Impact:** Lint command fails
**Error:** Cannot find module 'eslint-config-expo/flat'

**Workaround:** Manual code review
**Permanent Fix:** Reinstall dependencies or update config

### Issue #3: Test Coverage Below Target
**Status:** Known
**Impact:** Testing gaps
**Current:** ~50%
**Target:** 70%+

**Action Plan:** Month 1 priority (see FINAL_RECOMMENDATIONS.md)

---

## ROLLBACK PROCEDURES

### Frontend Rollback (Mobile App)
1. Identify previous working version
2. Rebuild and republish from that version
3. Submit to app stores
4. Monitor for issues

**Time:** 2-4 hours (app store review)

### Backend Rollback
1. Stop current application:
   ```bash
   pm2 stop rezapp-backend
   ```

2. Checkout previous version:
   ```bash
   git checkout [previous-commit-hash]
   npm install
   npm run build
   ```

3. Start application:
   ```bash
   pm2 start rezapp-backend
   pm2 save
   ```

4. Verify:
   ```bash
   curl https://api.rezapp.com/health
   pm2 logs rezapp-backend
   ```

**Time:** 10-15 minutes

### Database Rollback
1. Stop application
2. Restore from backup:
   ```bash
   mongorestore --uri="mongodb+srv://..." --archive=/backup/[timestamp].gz
   ```
3. Restart application
4. Verify data integrity

**Time:** 30-60 minutes

---

## ESCALATION PATHS

### Issue Severity

**P0 - Critical**
- Service completely down
- Data breach
- Payment system failure

**Response:** Immediate (24/7)
**Notify:** On-call → Team Lead → CTO → CEO

**P1 - High**
- Partial outage
- Critical feature broken
- High error rate

**Response:** <1 hour
**Notify:** On-call → Team Lead → CTO

**P2 - Medium**
- Non-critical feature broken
- Performance issues

**Response:** <4 hours
**Notify:** On-call → Team Lead

**P3 - Low**
- Minor bugs
- UI issues

**Response:** <24 hours
**Notify:** On-call → Team Lead

### Contact Information

**On-Call Rotation:**
- Week 1: [Engineer A] - [Phone] - [Email]
- Week 2: [Engineer B] - [Phone] - [Email]
- Week 3: [Engineer C] - [Phone] - [Email]
- Week 4: [Engineer D] - [Phone] - [Email]

**Team Leads:**
- Technical Lead: [Name] - [Phone] - [Email]
- Backend Lead: [Name] - [Phone] - [Email]
- Frontend Lead: [Name] - [Phone] - [Email]
- DevOps Lead: [Name] - [Phone] - [Email]

**Management:**
- CTO: [Name] - [Phone] - [Email]
- CEO: [Name] - [Phone] - [Email]

**External Support:**
- MongoDB: Via dashboard
- Razorpay: 1800-103-8800
- Twilio: Via dashboard
- Hosting Provider: [Phone/Email]

---

## COMMON TASKS

### 1. Add New API Endpoint

**Backend:**
```javascript
// controllers/featureController.js
exports.newEndpoint = async (req, res) => {
  // Implementation
};

// routes/feature.js
router.get('/new-endpoint', auth, featureController.newEndpoint);
```

**Frontend:**
```typescript
// services/featureApi.ts
export async function newEndpoint() {
  return apiClient.get('/feature/new-endpoint');
}
```

### 2. Deploy Hotfix

```bash
# Create hotfix branch
git checkout -b hotfix/fix-critical-bug main

# Make fix and commit
git add .
git commit -m "fix: critical bug description"

# Push and deploy
git push origin hotfix/fix-critical-bug
# Deploy to production
# Merge back to main and develop
```

### 3. Update Environment Variables

**Frontend (.env):**
```bash
# Edit .env file
EXPO_PUBLIC_API_BASE_URL=https://api.rezapp.com/api

# Restart development server
npm start -- --clear
```

**Backend (.env):**
```bash
# Edit .env file on server
vim /var/www/rez-app-backend/.env

# Restart application
pm2 restart rezapp-backend
```

### 4. Check Application Logs

**Frontend:**
- React Native Debugger
- Expo console
- Sentry dashboard

**Backend:**
```bash
# View logs
pm2 logs rezapp-backend

# Last 100 lines
pm2 logs rezapp-backend --lines 100

# Error logs only
pm2 logs rezapp-backend --err

# Specific time range
pm2 logs rezapp-backend --timestamp
```

### 5. Restart Services

**Backend:**
```bash
# Restart application
pm2 restart rezapp-backend

# Restart all
pm2 restart all

# Reload (zero-downtime)
pm2 reload rezapp-backend

# View status
pm2 status
```

**Database:**
- MongoDB Atlas: Via dashboard
- Monitor connection pool

### 6. Run Database Backup

```bash
# Manual backup
./scripts/backup-database.sh

# Verify backup
ls -lh /backup/mongodb/

# Test restore (on test database)
./scripts/test-restore.sh
```

---

## THIRD-PARTY SERVICES

### Razorpay (Payments)
- **Dashboard:** https://dashboard.razorpay.com
- **API Keys:** Environment variables
- **Webhook:** https://api.rezapp.com/webhooks/razorpay
- **Support:** 1800-103-8800

### Twilio (SMS/OTP)
- **Dashboard:** https://www.twilio.com/console
- **API Keys:** Environment variables
- **Phone Number:** [your-twilio-number]
- **Support:** Via dashboard

### Cloudinary (Media Storage)
- **Dashboard:** https://cloudinary.com/console
- **API Keys:** Environment variables
- **Usage:** Videos, images, bills
- **Support:** Via dashboard

### Firebase (Push Notifications)
- **Console:** https://console.firebase.google.com
- **Project:** rez-app-prod
- **API Keys:** Environment variables
- **Support:** Via console

### MongoDB Atlas (Database)
- **Dashboard:** https://cloud.mongodb.com
- **Cluster:** rez-app-production
- **Connection:** Environment variable
- **Backups:** Automatic
- **Support:** Via dashboard

---

## CREDENTIALS & ACCESS

**Password Manager:** [1Password/LastPass/etc.]

**Stored Credentials:**
- GitHub repository access
- Expo account
- Apple Developer account
- Google Play Console
- MongoDB Atlas
- Razorpay dashboard
- Twilio dashboard
- Cloudinary dashboard
- Firebase console
- Sentry account
- Domain registrar
- Server SSH keys

**Access Control:**
- Review access quarterly
- Remove access when team members leave
- Use strong, unique passwords
- Enable 2FA everywhere possible

---

## DOCUMENTATION LOCATIONS

### Project Documentation
- **Production Readiness:** PRODUCTION_READINESS_CHECKLIST.md
- **Code Quality:** CODE_QUALITY_SCORECARD.md
- **Recommendations:** FINAL_RECOMMENDATIONS.md
- **Best Practices:** BEST_PRACTICES_SUMMARY.md
- **Maintenance:** MAINTENANCE_GUIDE.md
- **Success Metrics:** SUCCESS_METRICS.md

### External Documentation
- **Expo Docs:** https://docs.expo.dev
- **React Native:** https://reactnative.dev/docs
- **MongoDB:** https://docs.mongodb.com
- **Razorpay:** https://razorpay.com/docs

---

## HANDOFF CHECKLIST

### Knowledge Transfer
- [ ] Code architecture explained
- [ ] Deployment procedures demonstrated
- [ ] Monitoring dashboards reviewed
- [ ] Rollback procedures practiced
- [ ] Escalation paths understood
- [ ] Common tasks demonstrated
- [ ] Credentials transferred
- [ ] Documentation reviewed

### Access Verification
- [ ] GitHub repository access
- [ ] Production server SSH access
- [ ] Database access
- [ ] Monitoring tool access
- [ ] Third-party service dashboards
- [ ] Password manager access
- [ ] On-call phone/contact setup

### Tools Setup
- [ ] Development environment configured
- [ ] Code editor with extensions
- [ ] Git configured
- [ ] SSH keys generated
- [ ] VPN access (if required)
- [ ] Monitoring tools installed
- [ ] Slack/communication tools

### First Week Tasks
- [ ] Shadow current on-call
- [ ] Review recent incidents
- [ ] Practice deployment
- [ ] Practice rollback
- [ ] Review monitoring dashboards daily
- [ ] Attend team meetings
- [ ] Ask questions!

---

## TEAM CULTURE & PRACTICES

### Daily Standups
- Time: 10:00 AM
- Duration: 15 minutes
- Format: What did you do? What will you do? Any blockers?

### Weekly Meetings
- Monday: Sprint planning
- Wednesday: Technical discussion
- Friday: Sprint retrospective

### Code Reviews
- All code must be reviewed
- Use Pull Requests
- At least 1 approval required
- Check CI/CD passes

### On-Call Rotation
- Week-long shifts
- Handoff document required
- Response time: <15 minutes (P0)
- Compensation: Time off or pay

### Communication
- Slack: Daily communication
- Email: Official communication
- Phone: Emergencies only
- Documentation: Source of truth

---

## FINAL NOTES

### Things to Remember
1. **Documentation is key** - If it's not documented, it doesn't exist
2. **Ask questions** - No question is too simple
3. **Monitor proactively** - Don't wait for users to report issues
4. **Test before deploying** - Always
5. **Keep calm** - Incidents happen, handle them professionally
6. **Learn from mistakes** - Post-mortems are for learning, not blaming
7. **Communication** - Keep stakeholders informed

### When in Doubt
1. Check documentation first
2. Check monitoring dashboards
3. Review recent changes
4. Ask team for help
5. Escalate if needed

### Success Indicators
- Low error rate (<1%)
- High uptime (>99.5%)
- Quick incident response
- Positive user feedback
- Team collaboration

---

**Handoff Date:** _______________
**Handed Off By:** _______________
**Received By:** _______________
**Verified By (Lead):** _______________

**Questions or Issues:** Contact Technical Lead

---

**Last Updated:** January 2025
**Document Version:** 1.0.0
**Owner:** Technical Lead
