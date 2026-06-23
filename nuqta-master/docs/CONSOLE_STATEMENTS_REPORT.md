# Console Statements Report

**Generated:** 2025-11-11
**Total Console Statements:** 3,384

---

## Overview

This report catalogs all console statements in the codebase and provides a strategy for removal/replacement.

## Console Statement Breakdown

### By Type

| Type | Count | Percentage | Recommendation |
|------|-------|------------|----------------|
| `console.error` | 1,825 | 53.9% | Replace with logger.error |
| `console.log` | 1,312 | 38.8% | Remove or replace with logger.debug |
| `console.warn` | 241 | 7.1% | Replace with logger.warn |
| `console.debug` | 6 | 0.2% | Replace with logger.debug |

### By Directory

| Directory | Count | Percentage | Priority |
|-----------|-------|------------|----------|
| services/ | 1,124 | 33.2% | High |
| contexts/ | ~800 | 23.6% | High |
| hooks/ | 534 | 15.8% | Medium |
| app/ | 445 | 13.2% | High |
| utils/ | ~246 | 7.3% | Medium |
| components/ | 235 | 6.9% | Medium |

---

## Top 20 Files by Console Usage

### 1. app/(tabs)/index.tsx
**Console Statements:** ~10+

```typescript
// Lines with console usage:
console.error('❌ [HOME] Failed to sync loyalty points:', creditResponse.error);
console.warn('⚠️ [HOME] Could not get wallet balance, using calculated loyalty points');
console.error('❌ [HOME] Error syncing with wallet:', walletError);
console.error('❌ [HOME] Error loading user statistics:', error);
console.error('❌ [HOME] Failed to refresh homepage:', error);
console.error('Tracking action press error:', error);
console.error('Wallet action press error:', error);
console.error('Offers action press error:', error);
console.error('Store action press error:', error);
```

**Recommendation:** Replace with centralized logger

---

### 2. app/account/ (Multiple Files)
**Total Console Statements:** ~80+

#### addresses.tsx (5 statements)
```typescript
console.error('Error fetching addresses:', err);
console.error('Error adding address:', err);
console.error('Error updating address:', err);
console.error('Error deleting address:', err);
console.error('Error setting default address:', err);
```

#### cashback.tsx (6 statements)
```typescript
console.warn('Failed to load cashback summary:', summaryRes.error);
console.warn('Failed to load pending cashback:', pendingRes.error);
console.warn('Failed to load campaigns:', campaignsRes.error);
console.error('Failed to load cashback data:', error);
console.warn('Failed to load cashback history:', response.error);
console.error('Failed to load cashback history:', error);
```

#### payment.tsx (5 statements)
```typescript
console.error('Deletion failed');
console.error('Error during deletion:', error);
console.error('❌ Verification error:', error);
console.error('[Payment Settings] Error saving preference:', error);
```

**Pattern:** Consistent error logging across account features

---

### 3. services/storeSearchService.ts
**Console Statements:** High usage in all methods

```typescript
// Pattern: Every API call has:
// TODO: Add authentication token
```

**19 instances of missing authentication** - Critical for production

---

### 4. app/article/[id].tsx
**Console Statements:** 4 (mixed debug and error)

```typescript
console.log('📰 [ArticleDetail] Fetching article:', id);
console.log('✅ [ArticleDetail] Article loaded:', response.data.article);
console.error('❌ [ArticleDetail] Article not found');
console.error('❌ [ArticleDetail] Error fetching article:', err);
```

**Pattern:** Good use of emoji prefixes for log categorization

---

### 5. app/bill-upload-enhanced.tsx
**Console Statements:** 3

```typescript
console.error('Error taking picture:', error);
console.error('Error picking image:', error);
console.warn('Router not available'); // Used as fallback
```

**Pattern:** Navigation fallback using console.warn (anti-pattern)

---

## Console Usage Patterns

### Pattern 1: Error Logging (Appropriate)
**Usage:** 1,825 instances

```typescript
// Current implementation:
console.error('❌ [CONTEXT] Error message:', error);

// Should become:
logger.error('[CONTEXT] Error message', { error, metadata });
```

**Recommendation:** Keep but replace with structured logger

---

### Pattern 2: Debug Logging (Remove for Production)
**Usage:** 1,312 instances

```typescript
// Current implementation:
console.log('📰 [Component] Action:', data);
console.log('✅ [Component] Success:', result);

// Should become:
if (__DEV__) {
  logger.debug('[Component] Action', { data });
}
```

**Recommendation:** Wrap in __DEV__ check or remove entirely

---

### Pattern 3: Warning Messages (Keep with Logger)
**Usage:** 241 instances

```typescript
// Current implementation:
console.warn('⚠️ [Service] Warning message:', details);

// Should become:
logger.warn('[Service] Warning message', { details });
```

**Recommendation:** Replace with logger.warn

---

### Pattern 4: Router Fallback (Anti-pattern)
**Usage:** Multiple instances

```typescript
// Anti-pattern found:
router?.push ? router.push('/path') : console.warn('Router not available')

// Should be:
if (!router?.push) {
  throw new NavigationError('Router not available');
}
router.push('/path');
```

**Recommendation:** Use proper error handling, not console

---

## Console by Feature Area

### Authentication & User Management
**Location:** `app/account/`, `contexts/AuthContext.tsx`
**Console Statements:** ~120
**Pattern:** Mostly error logging
**Priority:** High (user-facing errors need proper handling)

### Payment & Wallet
**Location:** `app/account/payment*.tsx`, `components/wallet/`
**Console Statements:** ~80
**Pattern:** Transaction errors, verification failures
**Priority:** Critical (financial operations)

### E-commerce (Products, Cart, Checkout)
**Location:** `app/product/`, `app/checkout.tsx`, `contexts/CartContext.tsx`
**Console Statements:** ~200
**Pattern:** Product loading, cart operations
**Priority:** High (core functionality)

### Social & UGC
**Location:** `app/ugc/`, `app/social-media.tsx`, `components/playPage/`
**Console Statements:** ~150
**Pattern:** Upload tracking, engagement logging
**Priority:** Medium

### Analytics & Tracking
**Location:** `services/*Analytics.ts`, `hooks/useAnalytics.ts`
**Console Statements:** ~180
**Pattern:** Event tracking, performance monitoring
**Priority:** Medium

### Services & APIs
**Location:** `services/*.ts`
**Console Statements:** 1,124
**Pattern:** API call logging, error tracking
**Priority:** High (most usage)

---

## Categorization by Action

### 1. Remove Completely (Debug Statements)
**Count:** ~1,000

```typescript
// Examples to remove:
console.log('Component mounted');
console.log('Data loaded:', data);
console.log('Debugging value:', value);
```

**Files with most debug logs:**
- `app/article/[id].tsx`
- `app/articles.tsx`
- `app/admin/social-media-posts.tsx`
- Various hooks in `hooks/`

---

### 2. Replace with Logger Service (Errors & Warnings)
**Count:** ~2,066

```typescript
// Replace all:
console.error(...) → logger.error(...)
console.warn(...) → logger.warn(...)
```

**Create Logger Service:**

```typescript
// services/logger.ts
class Logger {
  error(message: string, metadata?: any) {
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, metadata);
    }
    // In production: send to monitoring service
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
    // Integrate with Sentry, LogRocket, or other service
  }
}

export const logger = new Logger();
```

---

### 3. Refactor (Navigation Fallbacks)
**Count:** ~18

```typescript
// Current anti-pattern:
router?.push ? router.push('/path') : console.warn('Router not available')

// Better approach:
try {
  if (!router?.push) {
    throw new NavigationError('Router not initialized');
  }
  router.push('/path');
} catch (error) {
  logger.error('Navigation failed', { error, path: '/path' });
  // Show user-friendly error message
}
```

---

## Migration Strategy

### Phase 1: Set Up Logger Service (2 hours)
1. Create `services/logger.ts`
2. Integrate with monitoring service (Sentry/LogRocket)
3. Add environment-based logging levels
4. Create logger middleware for API calls

### Phase 2: Replace High-Priority Areas (4-6 hours)
1. **services/** - Replace 1,124 statements
   - API error logging
   - Service-level warnings
2. **contexts/** - Replace ~800 statements
   - State management errors
   - Context initialization issues
3. **app/** - Replace 445 statements
   - Page-level errors
   - User interaction issues

### Phase 3: Replace Medium-Priority Areas (3-4 hours)
1. **hooks/** - Replace 534 statements
2. **utils/** - Replace ~246 statements
3. **components/** - Replace 235 statements

### Phase 4: Remove Debug Statements (2-3 hours)
1. Remove all `console.log` debug statements
2. Verify no information leakage
3. Test in production build

### Phase 5: Refactor Anti-patterns (1-2 hours)
1. Fix navigation fallbacks
2. Replace inline console with proper error handling
3. Add user-friendly error messages

---

## Automation Script

### Find and Replace Script

```bash
#!/bin/bash
# Replace console statements with logger

# Phase 1: Replace console.error
find ./app ./components ./hooks ./services ./contexts ./utils -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i 's/console\.error/logger.error/g'

# Phase 2: Replace console.warn
find ./app ./components ./hooks ./services ./contexts ./utils -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i 's/console\.warn/logger.warn/g'

# Phase 3: Wrap console.log in __DEV__
# (Manual review recommended)

# Phase 4: Add logger import where needed
# (Manual review recommended)
```

**Note:** Manual review recommended after automated replacement

---

## Verification Checklist

After replacing console statements:

### Functionality
- [ ] All error logging still works
- [ ] User-facing errors show properly
- [ ] Debug info available in dev mode
- [ ] No console output in production build

### Performance
- [ ] No performance degradation
- [ ] Logger doesn't block main thread
- [ ] Monitoring service integrated properly

### Security
- [ ] No sensitive data logged
- [ ] API keys not exposed
- [ ] User data properly sanitized

### Monitoring
- [ ] Errors appear in monitoring dashboard
- [ ] Alert notifications work
- [ ] Error grouping functions properly

---

## Expected Results

### Before Cleanup:
- **Console Statements:** 3,384
- **Production Logs:** Exposed to end users
- **Monitoring:** Ad-hoc console logging
- **Performance:** Console overhead in production

### After Cleanup:
- **Console Statements:** 0 (replaced with logger)
- **Production Logs:** Silent to end users, sent to monitoring
- **Monitoring:** Centralized, structured logging
- **Performance:** No console overhead

---

## Estimated Effort

| Task | Hours | Priority |
|------|-------|----------|
| Create logger service | 2 | P1 |
| Replace services/ | 3 | P1 |
| Replace contexts/ | 2 | P1 |
| Replace app/ | 2 | P1 |
| Replace hooks/ | 2 | P2 |
| Replace components/ | 1 | P2 |
| Replace utils/ | 1 | P2 |
| Remove debug logs | 2 | P2 |
| Refactor anti-patterns | 1 | P2 |
| Testing & verification | 2 | P1 |
| **Total** | **18 hours** | - |

---

## Production Readiness

### Critical Issues:
🔴 **3,384 console statements** expose debug information in production
🔴 **Sensitive data may be logged** (user IDs, transaction details, errors)
🔴 **Performance impact** from console operations
🔴 **No centralized error tracking** for production issues

### After Cleanup:
✅ Clean production builds with no console output
✅ Structured logging sent to monitoring service
✅ Better performance without console overhead
✅ Improved debugging with centralized logs
✅ User privacy protected

---

## References

### Files with Highest Console Usage:
1. `services/storeSearchService.ts` - Review all API calls
2. `services/billUploadAnalytics.ts` - High analytics logging
3. `hooks/useSupportChat.ts` - Chat error handling
4. `app/checkout.tsx` - Payment flow logging
5. `contexts/SocketContext.tsx` - Real-time logging

### Common Console Patterns:
- Error boundaries: `components/*/ErrorBoundary.tsx`
- API services: `services/*Api.ts`
- React hooks: `hooks/use*.ts`
- Page components: `app/**/*.tsx`

---

**Next Steps:**
1. Review and approve logger service design
2. Create logger implementation
3. Begin Phase 1 replacement (services/)
4. Test after each phase
5. Complete all phases before production deployment

**Success Criteria:**
- Zero console statements in production build
- All errors tracked in monitoring dashboard
- No degradation in error handling quality
- Improved performance metrics
