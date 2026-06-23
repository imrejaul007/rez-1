# Referral System Production Deployment Checklist

## Overview
This comprehensive checklist ensures the referral system is production-ready with proper testing, monitoring, and rollback procedures.

**Target Deployment Date**: TBD
**Environment**: Production (iOS, Android, Web)
**Feature**: Referral & Earn System

---

## Pre-Deployment Phase

### 1. Code Review & Quality Assurance

#### 1.1 Code Review Checklist
- [ ] **All code reviewed by senior developer**
  - Files: `app/referral.tsx`, `app/referral/dashboard.tsx`
  - Review focus: Security, performance, accessibility

- [ ] **ESLint warnings resolved**
  ```bash
  cd frontend
  npm run lint
  # Expected: 0 errors, 0 warnings
  ```

- [ ] **TypeScript strict mode passing**
  ```bash
  npx tsc --noEmit
  # Expected: 0 errors
  ```

- [ ] **No console.log in production code**
  ```bash
  grep -r "console.log" app/referral* components/referral*
  # Should only find console.error for error handling
  ```

- [ ] **All TODOs resolved or documented**
  ```bash
  grep -r "TODO" app/referral* components/referral* services/referral* hooks/useReferral*
  ```

#### 1.2 Performance Checklist
- [ ] **Critical optimizations implemented** (from REFERRAL_PERFORMANCE_OPTIMIZATION.md)
  - [ ] FlatList memoization (Priority 1)
  - [ ] ShareModal lazy loading (Priority 1)
  - [ ] Memory leaks fixed (Priority 1)
  - [ ] useMemo optimizations (Priority 1)

- [ ] **Bundle size verified**
  ```bash
  npx expo export:web
  # Check build/static/js/main.*.js size
  # Target: <500KB gzipped
  ```

- [ ] **Memory leaks tested**
  - Tool: Xcode Instruments / Android Studio Profiler
  - Test: Navigate 50 times between pages
  - Expected: Memory stable, no accumulation

- [ ] **FPS benchmark completed**
  - Tool: React DevTools Profiler
  - Test: Scroll through 50+ referrals
  - Expected: 60fps maintained

#### 1.3 Security Checklist
- [ ] **API endpoints secured with authentication**
  - All `/referral/*` endpoints require valid JWT
  - Rate limiting implemented (100 requests/minute per user)

- [ ] **PII (Personal Identifiable Information) anonymized**
  - Email: `anonymizeEmail()` used (line 433)
  - Phone: Implement `anonymizePhone()` if displayed
  - Names: Implement `anonymizeName()` if needed

- [ ] **GDPR compliance verified**
  - User consent tracked for data sharing
  - Privacy policy link available
  - Data retention policy implemented (90 days for referral data)

- [ ] **Input validation on all forms**
  - Referral code format validation
  - XSS protection on user-generated content

- [ ] **No sensitive data in logs**
  ```bash
  grep -r "referralCode\|email\|phone" app/referral* | grep "console"
  # Should not expose sensitive data
  ```

#### 1.4 Accessibility Checklist
- [ ] **All interactive elements have accessibility labels**
  - Back button (line 263-266)
  - Copy button (line 292-294)
  - Share button (line 305-308)
  - Dashboard button (line 403-405)

- [ ] **Screen reader tested**
  - iOS: VoiceOver
  - Android: TalkBack
  - Web: NVDA/JAWS

- [ ] **Color contrast meets WCAG AA standards**
  - Text: 4.5:1 minimum
  - Interactive elements: 3:1 minimum

- [ ] **Touch targets >= 44x44 points**
  - Verified for all buttons and touchable areas

---

### 2. Environment Configuration

#### 2.1 Environment Variables
- [ ] **Production API endpoints configured**
  ```bash
  # .env.production
  EXPO_PUBLIC_API_URL=https://api.rezapp.com
  EXPO_PUBLIC_REFERRAL_BASE_URL=https://rezapp.com/invite
  EXPO_PUBLIC_SENTRY_DSN=https://...
  EXPO_PUBLIC_ANALYTICS_KEY=...
  ```

- [ ] **Feature flags configured**
  ```typescript
  // config/featureFlags.ts
  export const REFERRAL_FEATURE = {
    enabled: true,
    tierSystemEnabled: true,
    leaderboardEnabled: true,
    qrCodeEnabled: true,
  };
  ```

- [ ] **Rate limiting configured**
  - Backend: 100 requests/minute per user
  - Frontend: Debouncing implemented (5s minimum)

#### 2.2 Backend Verification
- [ ] **All referral API endpoints deployed**
  ```bash
  # Test endpoints
  curl -X GET https://api.rezapp.com/referral/statistics -H "Authorization: Bearer <token>"
  curl -X GET https://api.rezapp.com/referral/history -H "Authorization: Bearer <token>"
  curl -X POST https://api.rezapp.com/referral/generate-link -H "Authorization: Bearer <token>"
  ```

- [ ] **Database migrations completed**
  - `referrals` table created
  - `referral_tiers` table created
  - `referral_rewards` table created
  - Indexes on `userId`, `referralCode`, `status`

- [ ] **Backend monitoring configured**
  - Error tracking: Sentry
  - Performance: New Relic / DataDog
  - Logs: CloudWatch / Papertrail

- [ ] **Webhook endpoints tested**
  - Referral completion webhook
  - Reward credit webhook
  - Tier upgrade webhook

#### 2.3 Third-Party Integrations
- [ ] **Deep linking configured**
  - iOS: Universal Links configured
  - Android: App Links configured
  - Web: Redirect rules configured
  - Test link: `https://rezapp.com/invite/ABC123`

- [ ] **Share functionality tested**
  - WhatsApp sharing: ✓
  - Facebook sharing: ✓
  - Instagram sharing: ✓
  - Telegram sharing: ✓
  - SMS sharing: ✓
  - Email sharing: ✓

- [ ] **QR code generation tested**
  - QR codes scan correctly
  - Deep links work from QR codes
  - Error correction level: Medium (M)

---

### 3. Testing & Quality Assurance

#### 3.1 Unit Testing
- [ ] **All unit tests passing**
  ```bash
  npm run test
  # Expected: 100% pass rate
  # Coverage target: >80% for referral code
  ```

- [ ] **Critical functions tested**
  - [ ] `getReferralStats()`
  - [ ] `getReferralHistory()`
  - [ ] `getReferralCode()`
  - [ ] `trackShare()`
  - [ ] `anonymizeEmail()`
  - [ ] `useReferral()` hook

#### 3.2 Integration Testing
- [ ] **End-to-end referral flow tested**
  1. User A generates referral code
  2. User B signs up with code
  3. User B completes first order
  4. User A receives reward
  5. Both users receive notifications

- [ ] **Tier progression tested**
  1. Start at STARTER tier
  2. Make 5 referrals → PRO tier
  3. Make 20 referrals → ELITE tier
  4. Verify rewards credited at each level

- [ ] **Share flow tested**
  1. Open ShareModal
  2. Generate QR code
  3. Copy referral code
  4. Share via WhatsApp
  5. Verify tracking event sent

#### 3.3 Manual Testing Scenarios

##### Scenario 1: New User Journey
- [ ] User navigates to referral page
- [ ] Sees "LOADING..." while code loads
- [ ] Code displays correctly
- [ ] Can copy code to clipboard
- [ ] Receives "Copied!" confirmation
- [ ] Can share via social media
- [ ] Returns to app after sharing

##### Scenario 2: User with Referrals
- [ ] Stats display correctly (total referrals, earnings)
- [ ] History shows past 5 referrals
- [ ] Status badges colored correctly (completed, pending, active, expired)
- [ ] Anonymized emails displayed (m***@gmail.com)
- [ ] Pull-to-refresh works
- [ ] Dashboard button navigates correctly

##### Scenario 3: Dashboard View
- [ ] Tier badge displays current tier
- [ ] Stats show qualified referrals, earnings, success rate
- [ ] Progress bar shows next tier progress
- [ ] Next tier rewards listed
- [ ] Claimable rewards section (if applicable)
- [ ] Leaderboard displays top 5 users
- [ ] User rank shows correctly
- [ ] Can navigate to share page

##### Scenario 4: ShareModal
- [ ] Modal opens with animation
- [ ] Tier progress displayed (if available)
- [ ] QR code generates correctly
- [ ] Referral code displays
- [ ] Can copy code
- [ ] Can copy link
- [ ] Platform buttons work
- [ ] Modal closes correctly

##### Scenario 5: Error Handling
- [ ] Network error: Shows error message
- [ ] Authentication error: Redirects to sign-in
- [ ] Rate limit: Shows appropriate message
- [ ] Invalid referral code: Shows error
- [ ] Failed share: Shows error alert

##### Scenario 6: Edge Cases
- [ ] No referral history: Shows empty state
- [ ] Pending earnings = 0: Hides pending section
- [ ] At max tier (LEGEND): Hides progress section
- [ ] Offline mode: Shows cached data
- [ ] App backgrounded: Cleans up timers

#### 3.4 Cross-Platform Testing

##### iOS Testing
- [ ] **iPhone SE (Small screen)**
  - Layout adapts correctly
  - Touch targets accessible

- [ ] **iPhone 14 Pro (Standard)**
  - All features work
  - Animations smooth (60fps)

- [ ] **iPhone 14 Pro Max (Large screen)**
  - No layout overflow
  - Text readable

- [ ] **iPad (Tablet)**
  - Layout optimized for larger screen
  - Modal sizing appropriate

##### Android Testing
- [ ] **Android 10 (Older version)**
  - App doesn't crash
  - Features degraded gracefully

- [ ] **Android 13 (Current)**
  - All features work
  - Material design respected

- [ ] **Android 14 (Latest)**
  - Latest APIs utilized
  - Performance optimized

- [ ] **Foldable (Samsung Z Fold)**
  - Handles screen transitions
  - Layout adapts to fold

##### Web Testing
- [ ] **Chrome (Desktop)**
  - Responsive design works
  - Share functionality adapted

- [ ] **Safari (Desktop)**
  - No webkit-specific issues
  - Clipboard API works

- [ ] **Chrome (Mobile)**
  - Touch interactions work
  - Progressive Web App features

- [ ] **Firefox (Desktop)**
  - All features compatible

#### 3.5 Load Testing
- [ ] **API load testing completed**
  ```bash
  # Use Apache JMeter or k6
  # Test: 1000 concurrent users
  # Expected: <500ms response time, 0% error rate
  ```

- [ ] **Referral creation stress test**
  - Create 100 referrals in 1 minute
  - Verify: No database deadlocks
  - Verify: No duplicate codes generated

- [ ] **Leaderboard query performance**
  - With 10,000 users
  - With 100,000 referrals
  - Expected: <200ms query time

---

### 4. Monitoring & Observability

#### 4.1 Error Monitoring Setup
- [ ] **Sentry configured for referral pages**
  ```typescript
  // app/referral.tsx
  import * as Sentry from '@sentry/react-native';

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 1.0,
  });

  // Capture errors
  try {
    await fetchReferralData();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'referral' },
      extra: { userId: state.user?.id },
    });
  }
  ```

- [ ] **Error alerts configured**
  - Critical: Error rate > 5% → Page team immediately
  - Warning: Error rate > 1% → Slack notification
  - Info: New error type → Log to dashboard

#### 4.2 Performance Monitoring
- [ ] **Custom performance metrics tracked**
  ```typescript
  // Track key metrics
  import { measurePerformance } from '@/utils/performance';

  measurePerformance('referral_page_load', async () => {
    await fetchReferralData();
  });

  measurePerformance('qr_code_generation', () => {
    // QR code generation logic
  });
  ```

- [ ] **Performance alerts configured**
  - Warning: Load time > 2s
  - Critical: Load time > 3s
  - Critical: Memory usage > 150MB

#### 4.3 Analytics Tracking
- [ ] **Key events tracked**
  - `referral_page_viewed`
  - `referral_code_copied`
  - `referral_shared` (by platform)
  - `share_modal_opened`
  - `qr_code_generated`
  - `dashboard_viewed`
  - `tier_upgraded`
  - `reward_claimed`

- [ ] **User properties tracked**
  - `referral_tier`
  - `total_referrals`
  - `lifetime_earnings`
  - `last_referral_date`

- [ ] **Analytics dashboard created**
  - Daily active referrers
  - Share platform breakdown
  - Conversion funnel
  - Tier distribution

#### 4.4 Logging Strategy
- [ ] **Structured logging implemented**
  ```typescript
  import logger from '@/utils/logger';

  logger.info('Referral page loaded', {
    userId: state.user?.id,
    referralCount: stats?.totalReferrals,
    tier: stats?.currentTier,
  });

  logger.error('Failed to fetch referral data', {
    error: error.message,
    userId: state.user?.id,
  });
  ```

- [ ] **Log levels configured**
  - Production: ERROR, WARN only
  - Staging: INFO, ERROR, WARN
  - Development: ALL

---

### 5. Documentation

#### 5.1 User-Facing Documentation
- [ ] **Help Center articles created**
  - "How to Refer Friends"
  - "Understanding Referral Tiers"
  - "How to Claim Rewards"
  - "Troubleshooting Referral Issues"

- [ ] **In-app tooltips added**
  - First-time user onboarding
  - Tier progression explanation
  - Reward claiming process

- [ ] **FAQ updated**
  - When do I receive my referral reward?
  - How many friends can I refer?
  - What happens if my referral code doesn't work?

#### 5.2 Developer Documentation
- [ ] **API documentation updated**
  - All referral endpoints documented
  - Request/response examples
  - Error codes documented

- [ ] **Code comments reviewed**
  - Complex logic explained
  - Performance considerations noted
  - Security implications documented

- [ ] **Architecture diagram created**
  - Component hierarchy
  - Data flow diagram
  - API integration diagram

---

### 6. Rollback Plan

#### 6.1 Rollback Triggers
- [ ] **Automatic rollback conditions defined**
  - Error rate > 10% for 5 minutes
  - API response time > 5s for 5 minutes
  - Crash rate > 2%

- [ ] **Manual rollback procedure documented**
  ```bash
  # Step 1: Disable feature flag
  # In Firebase Remote Config or similar
  REFERRAL_FEATURE_ENABLED=false

  # Step 2: Revert database migrations (if needed)
  npm run migrate:rollback

  # Step 3: Deploy previous version
  git revert <commit-hash>
  npm run deploy:production

  # Step 4: Notify team
  # Slack: #incident-response
  ```

#### 6.2 Data Integrity
- [ ] **Database backup created before deployment**
  ```bash
  # Backup referrals table
  pg_dump -U postgres -t referrals -t referral_tiers -t referral_rewards > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Rollback test performed in staging**
  - Deploy → Rollback → Verify data intact

#### 6.3 Communication Plan
- [ ] **Stakeholders identified**
  - Product Manager: [Name]
  - Engineering Lead: [Name]
  - Support Team Lead: [Name]
  - Marketing Team: [Name]

- [ ] **Communication channels established**
  - Slack: #referral-launch
  - Email: engineering@rezapp.com
  - Status page: status.rezapp.com

---

### 7. Go-Live Checklist

#### 7.1 Pre-Launch (Day -1)
- [ ] **Final code freeze**
  - No new commits to production branch
  - All tests passing

- [ ] **Staging environment verified**
  - Matches production configuration
  - All integrations working

- [ ] **Team briefing completed**
  - Deployment plan reviewed
  - Roles assigned
  - Contact list distributed

- [ ] **Support team trained**
  - Feature walkthrough completed
  - FAQ shared
  - Escalation procedures reviewed

#### 7.2 Launch Day (Hour 0)
- [ ] **Deployment started**
  - Timestamp: __________
  - Deployed by: __________
  - Commit hash: __________

- [ ] **Smoke tests completed**
  - [ ] Referral page loads
  - [ ] Can generate referral code
  - [ ] Can share referral link
  - [ ] Dashboard loads
  - [ ] API endpoints responding

- [ ] **Monitoring dashboards open**
  - Sentry errors
  - Analytics real-time
  - API response times
  - Server metrics

#### 7.3 Post-Launch (Hour +1 to +24)
- [ ] **Hour +1: Initial metrics check**
  - Error rate: _______% (Target: <1%)
  - Load time: _______ms (Target: <1.5s)
  - Active users: _______

- [ ] **Hour +4: First check-in**
  - No critical errors reported
  - Support tickets reviewed
  - Performance metrics stable

- [ ] **Hour +12: Mid-day check**
  - Analyze user feedback
  - Review analytics data
  - Address any issues

- [ ] **Hour +24: End of day review**
  - Total users engaged: _______
  - Total referrals created: _______
  - Error rate: _______%
  - Average load time: _______ms

#### 7.4 Post-Launch (Week 1)
- [ ] **Day 2: Full analysis**
  - Compare metrics to baseline
  - Identify optimization opportunities
  - User feedback synthesis

- [ ] **Day 3-7: Monitoring**
  - Daily metrics review
  - Address emerging issues
  - Document lessons learned

- [ ] **Day 7: Retrospective**
  - Team retrospective meeting
  - Document what went well
  - Document areas for improvement
  - Create action items for next release

---

### 8. Success Metrics

#### 8.1 Technical Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error Rate | <1% | ___% | ⬜ |
| Load Time (P50) | <1.5s | ___s | ⬜ |
| Load Time (P95) | <3.0s | ___s | ⬜ |
| API Response Time | <300ms | ___ms | ⬜ |
| Memory Usage | <70MB | ___MB | ⬜ |
| FPS | 60fps | ___fps | ⬜ |
| Crash-Free Rate | >99.5% | ___% | ⬜ |

#### 8.2 Business Metrics (Week 1)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total Referrals Created | 1,000 | ___ | ⬜ |
| Share Conversion Rate | 15% | ___% | ⬜ |
| Successful Referrals | 100 | ___ | ⬜ |
| Average Referrals/User | 2.5 | ___ | ⬜ |
| Tier Upgrades | 50 | ___ | ⬜ |

#### 8.3 User Satisfaction
- [ ] **User feedback collected**
  - In-app rating prompt after first referral
  - Support ticket sentiment analysis
  - App store review monitoring

- [ ] **Net Promoter Score (NPS) measured**
  - Target: >40
  - Actual: _______

---

### 9. Critical Issues & Blockers

#### 9.1 Known Issues (To Be Fixed Before Launch)
- [ ] ⚠️ **Memory leak in useReferral hook**
  - Status: In Progress
  - ETA: ________
  - Blocker: YES

- [ ] ⚠️ **ShareModal setTimeout not cleaned up**
  - Status: Not Started
  - ETA: ________
  - Blocker: YES

- [ ] ⚠️ **FlatList performance with 20+ items**
  - Status: Not Started
  - ETA: ________
  - Blocker: NO (acceptable degradation)

#### 9.2 Dependencies
- [ ] **Backend API endpoints deployed**
  - Status: ________
  - Blocker: YES

- [ ] **Database migrations completed**
  - Status: ________
  - Blocker: YES

- [ ] **Deep linking configured**
  - Status: ________
  - Blocker: NO (can launch without, add later)

---

### 10. Sign-Off

#### 10.1 Approval Required
- [ ] **Engineering Lead**: _________________ Date: _______
- [ ] **Product Manager**: _________________ Date: _______
- [ ] **QA Lead**: _________________ Date: _______
- [ ] **Security Officer**: _________________ Date: _______
- [ ] **DevOps Lead**: _________________ Date: _______

#### 10.2 Final Go/No-Go Decision
- [ ] **GO**: All critical items completed, no blockers
- [ ] **NO-GO**: Critical items incomplete or blockers present

**Decision**: _______ (GO / NO-GO)
**Decision Maker**: _________________
**Date/Time**: _________________

---

## Appendix A: Quick Reference

### Emergency Contacts
- **On-Call Engineer**: [Phone Number]
- **Product Manager**: [Phone Number]
- **DevOps**: [Phone Number]

### Critical Links
- **Monitoring Dashboard**: https://monitoring.rezapp.com/referral
- **Error Tracking**: https://sentry.io/rezapp/referral
- **Analytics**: https://analytics.rezapp.com/referral
- **Status Page**: https://status.rezapp.com

### Rollback Commands
```bash
# Disable feature flag
firebase remote-config:set REFERRAL_FEATURE_ENABLED=false

# Revert deployment
kubectl rollout undo deployment/rezapp-backend
expo publish --release-channel production-rollback

# Verify
curl https://api.rezapp.com/health
```

---

## Appendix B: Testing Scripts

### Automated Smoke Test
```bash
#!/bin/bash
# smoke-test.sh

echo "Running referral system smoke tests..."

# Test 1: API health
curl -f https://api.rezapp.com/referral/health || exit 1

# Test 2: Generate referral code
RESPONSE=$(curl -X POST https://api.rezapp.com/referral/generate-link \
  -H "Authorization: Bearer $TEST_TOKEN")
echo $RESPONSE | grep "referralCode" || exit 1

# Test 3: Fetch statistics
curl -f https://api.rezapp.com/referral/statistics \
  -H "Authorization: Bearer $TEST_TOKEN" || exit 1

echo "✅ All smoke tests passed"
```

### Load Test Script
```javascript
// load-test.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  const token = 'your_test_token';

  let res = http.get('https://api.rezapp.com/referral/statistics', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Owner**: Agent 8 (Performance Optimizer)
**Next Review**: Before Production Deployment

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-03 | 1.0 | Initial creation | Agent 8 |
| | | | |
