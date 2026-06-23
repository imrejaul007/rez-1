# Cleanup Priority List

**Generated:** 2025-11-11
**Total Cleanup Items:** 89 tasks
**Estimated Total Effort:** 82-113 hours

---

## Priority Matrix Overview

```
High Impact, Low Effort     │  High Impact, High Effort
(DO FIRST)                  │  (PLAN & SCHEDULE)
                            │
✅ Remove backup files       │  🔄 Replace console statements
✅ Fix OTP verification      │  🔄 Add React.memo to components
✅ Error boundaries          │  🔄 Split large files
✅ Loading/Error states      │  🔄 Modal consolidation
────────────────────────────┼────────────────────────────────
Low Impact, Low Effort      │  Low Impact, High Effort
(QUICK WINS)                │  (DEFER)
                            │
✅ Remove commented code     │  ⏸️ Complete all TODOs
✅ Clean empty files         │  ⏸️ Full style refactoring
✅ Fix wildcard imports      │
```

---

## Priority 1: Critical (Pre-Production Blockers)

### Must be completed before production deployment

| # | Task | Impact | Effort | Owner | Deadline |
|---|------|--------|--------|-------|----------|
| 1.1 | Remove backup files | High | 15 min | Dev Team | Day 1 |
| 1.2 | Fix OTP verification placeholder | Critical | 2 hours | Backend Team | Week 1 |
| 1.3 | Add authentication tokens (19 instances) | Critical | 3 hours | Backend Team | Week 1 |
| 1.4 | Set up production logger service | High | 2 hours | DevOps | Week 1 |
| 1.5 | Replace console.error with logger | High | 4 hours | Dev Team | Week 1 |
| 1.6 | Replace console.warn with logger | High | 2 hours | Dev Team | Week 1 |
| 1.7 | Remove console.log statements | High | 3 hours | Dev Team | Week 1 |
| 1.8 | Implement captcha verification | Medium | 3-4 hours | Frontend Team | Week 2 |
| 1.9 | Update transaction limits API | High | 3-4 hours | Backend Team | Week 2 |

**Total P1 Effort:** 13-17 hours
**Deadline:** End of Week 2

---

## Priority 2: High (Performance & Stability)

### Critical for performance and user experience

| # | Task | Impact | Effort | Owner | Timeline |
|---|------|--------|--------|-------|----------|
| 2.1 | Add React.memo to card components | High | 3 hours | Frontend | Week 3 |
| 2.2 | Add React.memo to list items | High | 2 hours | Frontend | Week 3 |
| 2.3 | Add React.memo to modal components | High | 2 hours | Frontend | Week 3 |
| 2.4 | Review useEffect cleanup (high-risk) | High | 6 hours | Frontend | Week 3-4 |
| 2.5 | Review useEffect cleanup (medium-risk) | Medium | 4 hours | Frontend | Week 4 |
| 2.6 | Audit memory leaks | High | 5 hours | Frontend | Week 4 |
| 2.7 | Consolidate error boundaries | High | 3-4 hours | Frontend | Week 3 |
| 2.8 | Create base modal component | High | 4 hours | Frontend | Week 4 |
| 2.9 | Refactor top 20 modals | Medium | 4 hours | Frontend | Week 4 |
| 2.10 | Split large files (>1500 lines) | Medium | 10 hours | Frontend | Week 5 |
| 2.11 | Split medium files (1000-1500 lines) | Low | 10 hours | Frontend | Week 6 |
| 2.12 | Implement code splitting | High | 6 hours | Frontend | Week 5 |

**Total P2 Effort:** 38-55 hours
**Timeline:** Week 3-6

---

## Priority 3: Medium (Maintainability & Code Quality)

### Important for long-term maintainability

| # | Task | Impact | Effort | Owner | Timeline |
|---|------|--------|--------|-------|----------|
| 3.1 | Create useApi hook | High | 3 hours | Frontend | Week 5 |
| 3.2 | Refactor API calls (top 50) | Medium | 4 hours | Frontend | Week 5 |
| 3.3 | Create useForm hook | High | 3 hours | Frontend | Week 6 |
| 3.4 | Refactor forms (top 15) | Medium | 3 hours | Frontend | Week 6 |
| 3.5 | Create LoadingState component | Medium | 1 hour | Frontend | Week 5 |
| 3.6 | Create ErrorState component | Medium | 1 hour | Frontend | Week 5 |
| 3.7 | Refactor loading states | Low | 2 hours | Frontend | Week 6 |
| 3.8 | Refactor error states | Low | 2 hours | Frontend | Week 6 |
| 3.9 | Address high-priority TODOs (P2) | Medium | 15-20 hours | Full Team | Week 5-8 |
| 3.10 | Consolidate utility functions | Low | 4-5 hours | Frontend | Week 7 |

**Total P3 Effort:** 24-32 hours
**Timeline:** Week 5-8

---

## Priority 4: Low (Nice-to-Have)

### Quality improvements with lower immediate impact

| # | Task | Impact | Effort | Owner | Timeline |
|---|------|--------|--------|-------|----------|
| 4.1 | Remove commented code (22 lines) | Low | 30 min | Any Dev | Anytime |
| 4.2 | Clean empty files | Low | 15 min | Any Dev | Anytime |
| 4.3 | Optimize wildcard imports | Low | 2-3 hours | Frontend | Week 8 |
| 4.4 | Consolidate common styles | Low | 4-5 hours | Frontend | Week 9 |
| 4.5 | Address low-priority TODOs (P4) | Low | 20-30 hours | Full Team | Week 10+ |

**Total P4 Effort:** 7-9 hours (excluding P4 TODOs)
**Timeline:** Week 8-10

---

## Detailed Task Breakdown

### P1.1: Remove Backup Files 🔴

**Why:** Backup files should not be in version control
**Impact:** Clean repository, reduce confusion
**Effort:** 15 minutes

**Files to Remove:**
```bash
./app/_layout.tsx.backup
./services/stockNotificationApi.ts.backup
./tests.bak/ (directory)
```

**Action Steps:**
1. Verify current versions are stable
2. Check git history for these files
3. Delete backup files
4. Add to .gitignore if needed
5. Commit: "chore: remove backup files"

**Success Criteria:**
- [ ] No .backup or .bak files in repository
- [ ] Current versions verified working
- [ ] Git history preserved

---

### P1.2: Fix OTP Verification 🔴 CRITICAL

**File:** `app/onboarding/otp-verification.tsx:106`
**Current State:** Placeholder accepting any OTP
**Security Risk:** HIGH - Anyone can bypass authentication

```typescript
// Current (INSECURE):
// TODO: FOR PRODUCTION - Use actual OTP verification:
if (otp.length === 6) {
  // Accept any 6-digit code
  onSuccess();
}

// Required (SECURE):
const response = await authApi.verifyOTP({
  phoneNumber,
  otp,
  sessionToken
});
if (response.success) {
  onSuccess();
}
```

**Action Steps:**
1. Create backend OTP verification endpoint
2. Update frontend to call real API
3. Handle verification errors
4. Add rate limiting
5. Add resend OTP functionality
6. Test with real phone numbers

**Dependencies:**
- Backend OTP service
- SMS provider integration
- Rate limiting service

**Success Criteria:**
- [ ] Real OTP verification implemented
- [ ] Rate limiting active
- [ ] Error handling complete
- [ ] Security audit passed

**Effort:** 2 hours (frontend) + 4 hours (backend)

---

### P1.3: Add Authentication Tokens 🔴 CRITICAL

**File:** `services/storeSearchService.ts` (19 instances)
**Current State:** All API calls missing authentication
**Security Risk:** CRITICAL - Unprotected endpoints

```typescript
// Current (INSECURE):
const response = await apiClient.get('/stores', {
  headers: {
    'Content-Type': 'application/json',
    // TODO: Add authentication token
  }
});

// Required (SECURE):
const response = await apiClient.get('/stores', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  }
});
```

**Better Solution - Create Auth Interceptor:**

```typescript
// services/apiClient.ts
apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Action Steps:**
1. Create auth interceptor in apiClient
2. Remove all 19 TODO comments
3. Test authenticated requests
4. Handle token refresh
5. Handle 401 errors
6. Add token expiry handling

**Success Criteria:**
- [ ] All API calls authenticated
- [ ] Token refresh works
- [ ] 401 errors handled
- [ ] No TODO comments remain

**Effort:** 3 hours

---

### P1.4-1.7: Replace Console Statements 🔴

**Total Console Statements:** 3,384
**Priority Breakdown:**
- **P1.5:** console.error (1,825) - Replace with logger.error
- **P1.6:** console.warn (241) - Replace with logger.warn
- **P1.7:** console.log (1,312) - Remove or wrap in __DEV__

**Step 1: Create Logger Service (2 hours)**

```typescript
// services/logger.ts
class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  error(message: string, metadata?: any) {
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, metadata);
    }
    // Send to monitoring service (Sentry, LogRocket, etc.)
    this.sendToMonitoring('error', message, metadata);
  }

  warn(message: string, metadata?: any) {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, metadata);
    }
    this.sendToMonitoring('warn', message, metadata);
  }

  debug(message: string, metadata?: any) {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, metadata);
    }
  }

  private sendToMonitoring(level: string, message: string, metadata?: any) {
    // Integrate with error tracking service
  }
}

export const logger = Logger.getInstance();
```

**Step 2: Replace in Priority Order**

**Phase 1: Services (4 hours)**
- 1,124 statements in services/
- Most critical for backend errors
- Use find-replace with verification

**Phase 2: Contexts (2 hours)**
- ~800 statements in contexts/
- State management errors
- Critical for app stability

**Phase 3: App (1 hour)**
- 445 statements in app/
- User-facing errors
- Important for UX

**Phase 4: Hooks (1 hour)**
- 534 statements in hooks/
- Business logic errors

**Action Steps:**
1. Create logger service with monitoring integration
2. Add logger to all API clients
3. Replace console.error in services/
4. Replace console.warn in services/
5. Replace console.log in services/ (or wrap in __DEV__)
6. Repeat for contexts/, app/, hooks/
7. Test all error scenarios
8. Verify no console output in production build

**Success Criteria:**
- [ ] Logger service implemented
- [ ] Monitoring integration active
- [ ] All console.error replaced
- [ ] All console.warn replaced
- [ ] console.log removed or wrapped
- [ ] Production build has no console output
- [ ] Errors appear in monitoring dashboard

**Total Effort:** 9 hours

---

### P2.1-2.3: Add React.memo 🟡

**Current State:** Only 4 components use React.memo
**Target:** 100+ components should use React.memo
**Impact:** Significant performance improvement

**Components Needing React.memo:**

**High Priority (Week 3):**
1. All card components (30+)
   - ProductCard
   - StoreCard
   - EventCard
   - DealCard
   - OfferCard
   - etc.

2. All list item components (25+)
   - TransactionCard
   - OrderItem
   - ReviewItem
   - NotificationItem
   - etc.

3. All modal components (52)
   - After modal consolidation

**Implementation Pattern:**

```typescript
// Before:
export const ProductCard: React.FC<Props> = ({ product, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {/* ... */}
    </TouchableOpacity>
  );
};

// After:
export const ProductCard = React.memo<Props>(({ product, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {/* ... */}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison if needed
  return prevProps.product.id === nextProps.product.id;
});
```

**Action Steps:**
1. Identify all card components
2. Add React.memo to each
3. Test render count reduction
4. Measure performance improvement
5. Add custom comparison where needed
6. Repeat for list items and modals

**Success Criteria:**
- [ ] 100+ components using React.memo
- [ ] Reduced render count measured
- [ ] Performance metrics improved
- [ ] No functional regressions

**Effort:** 7 hours total

---

### P2.4-2.6: Review useEffect Cleanup 🟡

**Current State:** 816+ useEffect without cleanup
**Risk:** Potential memory leaks
**Impact:** App stability and performance

**High-Risk useEffect (6 hours):**

Categories needing immediate review:
1. **Subscriptions** - WebSocket, EventEmitter
2. **Timers** - setTimeout, setInterval
3. **Listeners** - addEventListener
4. **Async Operations** - fetch with AbortController

**Common Patterns:**

```typescript
// BAD - Memory leak:
useEffect(() => {
  const timer = setInterval(() => {
    updateData();
  }, 5000);
}, []);

// GOOD - Cleanup:
useEffect(() => {
  const timer = setInterval(() => {
    updateData();
  }, 5000);

  return () => clearInterval(timer);
}, []);
```

```typescript
// BAD - Memory leak:
useEffect(() => {
  socket.on('message', handleMessage);
}, []);

// GOOD - Cleanup:
useEffect(() => {
  socket.on('message', handleMessage);

  return () => {
    socket.off('message', handleMessage);
  };
}, []);
```

**Action Steps:**
1. Search for `setInterval` without cleanup
2. Search for `setTimeout` without cleanup
3. Search for `addEventListener` without cleanup
4. Search for `socket.on` without cleanup
5. Search for `subscribe` without cleanup
6. Add cleanup functions
7. Test component unmount
8. Check for memory leaks

**Success Criteria:**
- [ ] All timers cleaned up
- [ ] All listeners removed
- [ ] All subscriptions unsubscribed
- [ ] Memory leak tests pass
- [ ] No warnings in console

**Effort:** 10 hours total

---

### P2.7: Consolidate Error Boundaries 🟡

**Current State:** 7 duplicate error boundary implementations
**Target:** 1 base + 6 specialized extensions
**Savings:** ~1,400 lines of code

**Implementation Plan:**

**Step 1: Create BaseErrorBoundary (1 hour)**
```typescript
// components/common/BaseErrorBoundary.tsx
export class BaseErrorBoundary extends Component<Props, State> {
  // Core error boundary logic
}
```

**Step 2: Extend for Specialized Use (2 hours)**
```typescript
// GameErrorBoundary extends BaseErrorBoundary
// WalletErrorBoundary extends BaseErrorBoundary
// etc.
```

**Step 3: Update Usage (30 min)**
- Update all components using error boundaries
- Test error scenarios

**Success Criteria:**
- [ ] BaseErrorBoundary created
- [ ] All 7 error boundaries refactored
- [ ] ~1,400 lines removed
- [ ] All error scenarios still work
- [ ] Tests pass

**Effort:** 3-4 hours

---

### P2.8-2.9: Modal Consolidation 🟡

**Current State:** 52 modals with duplicate code
**Target:** BaseModal + 52 specialized modals
**Savings:** ~10,000 lines of code

**Step 1: Create BaseModal (2 hours)**
```typescript
// components/common/BaseModal.tsx
export const BaseModal: React.FC<BaseModalProps> = ({ ... }) => {
  // Shared modal structure
  // Animation logic
  // Backdrop handling
  // Close functionality
};
```

**Step 2: Create useModal Hook (1 hour)**
```typescript
// hooks/useModal.ts
export const useModal = () => {
  // Modal state management
  // Open/close logic
  // Loading states
};
```

**Step 3: Refactor Top 20 Modals (4 hours)**
Priority order:
1. Payment modals (5)
2. Verification modals (5)
3. Share modals (4)
4. Product modals (3)
5. Booking modals (3)

**Success Criteria:**
- [ ] BaseModal component created
- [ ] useModal hook created
- [ ] 20 modals refactored
- [ ] Consistent UX across modals
- [ ] ~5,000 lines removed
- [ ] All modal functionality works

**Effort:** 8 hours

---

### P2.10-2.11: Split Large Files 🟡

**Target Files (>1500 lines):**

1. **data/categoryData.ts** (2,648 lines)
   - Split by category type
   - Extract to separate JSON files
   - Effort: 2 hours

2. **app/bill-upload.tsx** (2,282 lines)
   - Extract camera component
   - Extract validation logic
   - Extract upload service
   - Effort: 4 hours

3. **app/checkout.tsx** (1,712 lines)
   - Extract payment step
   - Extract address step
   - Extract review step
   - Effort: 3 hours

4. **app/profile/index.tsx** (1,506 lines)
   - Extract profile sections
   - Extract settings components
   - Effort: 3 hours

**Success Criteria:**
- [ ] All files under 1,000 lines
- [ ] Logical component separation
- [ ] Improved code splitting
- [ ] Faster page loads
- [ ] No functional changes

**Effort:** 10-15 hours

---

## Implementation Schedule

### Week 1: Critical Pre-Production
**Focus:** Security and production readiness

| Day | Tasks | Hours | Status |
|-----|-------|-------|--------|
| Mon | P1.1: Remove backups | 0.25 | ⬜ |
| Mon | P1.4: Create logger service | 2 | ⬜ |
| Tue | P1.2: Fix OTP verification | 2 | ⬜ |
| Wed | P1.3: Add auth tokens | 3 | ⬜ |
| Thu | P1.5: Replace console.error | 4 | ⬜ |
| Fri | P1.6-1.7: Replace console.warn/log | 3 | ⬜ |

**Week 1 Total:** 14.25 hours

---

### Week 2: Complete P1
**Focus:** Finish critical items

| Day | Tasks | Hours | Status |
|-----|-------|-------|--------|
| Mon | P1.8: Captcha verification | 3 | ⬜ |
| Tue | P1.9: Transaction limits API | 3 | ⬜ |
| Wed-Fri | Testing & verification | 8 | ⬜ |

**Week 2 Total:** 14 hours

---

### Week 3: Performance Optimization
**Focus:** React.memo and initial refactoring

| Day | Tasks | Hours | Status |
|-----|-------|-------|--------|
| Mon | P2.1-2.3: Add React.memo | 7 | ⬜ |
| Tue-Wed | P2.7: Consolidate error boundaries | 4 | ⬜ |
| Thu-Fri | P2.4: Review useEffect cleanup (high-risk) | 6 | ⬜ |

**Week 3 Total:** 17 hours

---

### Week 4: Modal & Effects
**Focus:** Modal consolidation and cleanup

| Day | Tasks | Hours | Status |
|-----|-------|-------|--------|
| Mon-Tue | P2.8: Create BaseModal | 2 | ⬜ |
| Tue-Thu | P2.9: Refactor top 20 modals | 6 | ⬜ |
| Fri | P2.5: Review useEffect cleanup (medium-risk) | 4 | ⬜ |

**Week 4 Total:** 12 hours

---

### Week 5: Large Files & Hooks
**Focus:** Code splitting and reusable hooks

| Day | Tasks | Hours | Status |
|-----|-------|-------|--------|
| Mon | P3.1: Create useApi hook | 3 | ⬜ |
| Tue | P3.5-3.6: Loading/Error components | 2 | ⬜ |
| Wed-Fri | P2.10: Split large files (top 5) | 10 | ⬜ |

**Week 5 Total:** 15 hours

---

### Week 6-8: Remaining Items
**Focus:** Complete refactoring and TODOs

- Week 6: Form patterns, remaining large files
- Week 7: Utility consolidation, medium TODOs
- Week 8: Polish, testing, documentation

---

## Success Metrics

### Code Quality
- [ ] Codebase reduced by 15,000+ lines
- [ ] No backup files in repository
- [ ] Zero console statements in production
- [ ] All critical TODOs completed

### Performance
- [ ] Render count reduced by 30%+
- [ ] Bundle size reduced by 15%+
- [ ] Page load time improved by 20%+
- [ ] No memory leaks detected

### Security
- [ ] All API calls authenticated
- [ ] OTP verification implemented
- [ ] Captcha active
- [ ] Security audit passed

### Developer Experience
- [ ] Reusable components created
- [ ] Consistent patterns established
- [ ] Documentation updated
- [ ] Team velocity increased

---

## Risk Mitigation

### High-Risk Changes
**Modal Refactoring, API Patterns**

Mitigation:
- Feature flags for gradual rollout
- Extensive testing before merge
- Rollback plan ready
- Monitor error rates

### Medium-Risk Changes
**Large file splitting, useEffect cleanup**

Mitigation:
- Code review required
- Integration tests
- Staged deployment

### Low-Risk Changes
**Remove backup files, console statements**

Mitigation:
- Quick review
- Automated tests

---

## Resource Allocation

### Team Structure (Recommended)

**Week 1-2 (Critical):**
- 2 Senior Developers (P1 items)
- 1 Backend Developer (OTP, Auth)
- 1 DevOps (Logger, Monitoring)

**Week 3-5 (Performance):**
- 2 Frontend Developers (React.memo, Modals)
- 1 Senior Developer (Code review)

**Week 6-8 (Cleanup):**
- 1-2 Developers (File splitting, TODOs)
- 1 QA (Testing)

---

## Approval & Sign-off

### Required Approvals

- [ ] **Tech Lead** - Overall plan approval
- [ ] **Product Manager** - Timeline approval
- [ ] **Security Team** - P1 security items
- [ ] **QA Lead** - Testing strategy

### Stakeholder Review

| Role | Name | Approval | Date |
|------|------|----------|------|
| Tech Lead | | ⬜ | |
| Product Manager | | ⬜ | |
| Security Lead | | ⬜ | |
| QA Lead | | ⬜ | |

---

## Next Steps

### Immediate (This Week):
1. [ ] Review and approve this priority list
2. [ ] Assign owners to P1 tasks
3. [ ] Create tracking tickets (Jira/GitHub)
4. [ ] Set up monitoring for success metrics
5. [ ] Begin P1.1 (Remove backup files)

### This Month:
1. [ ] Complete all P1 items
2. [ ] Begin P2 performance optimization
3. [ ] Weekly progress reviews
4. [ ] Update priority list as needed

### This Quarter:
1. [ ] Complete all P2 items
2. [ ] Address majority of P3 items
3. [ ] Continuous monitoring and improvement
4. [ ] Celebrate wins with team!

---

**Document Owner:** Development Team
**Last Updated:** 2025-11-11
**Next Review:** Weekly during implementation
