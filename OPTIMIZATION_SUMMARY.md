# Res App - Optimization Summary

**Generated:** 2026-06-25
**Scope:** All services (rez-backend-master, rez-auth-service, rez-api-gateway, nuqta-master)

---

## Quick Wins (Safe to Do Now)

| Issue | Impact | Effort | Files |
|-------|--------|--------|-------|
| Delete `.trash/` directory | Clean up orphaned files | 5 min | `nuqta-master/.trash/` |
| Remove unused firebase packages | ~500KB bundle reduction | 5 min | `package.json` |
| Remove unused imports in rez-auth-service | Code cleanup | 10 min | 4 files |
| Remove `react-native-markdown-display` | ~280KB bundle reduction | 30 min | 1 file |
| Remove duplicate errorLogger exports | Code cleanup | 5 min | `middleware/errorLogger.ts` |
| Remove commented-out code blocks | Code cleanup | 15 min | 4 files |
| Upgrade MD5 to SHA-256 for ETag | Security hardening | 5 min | `middleware/responseOptimization.ts` |
| Fix inconsistent success response | Bug fix | 5 min | `offerRoutes.ts:461-466` |
| Remove dynamic require/import patterns | Code cleanup | 10 min | `rez-auth-service/src/index.ts` |

---

## Medium Effort (Review Before)

| Issue | Impact | Files | Recommendation |
|-------|--------|-------|----------------|
| **Add pagination to endpoints** | Performance | 9 endpoints (hot-deals, nearby, etc.) | Add `page`/`limit` query params |
| **Add caching to trending/featured** | Performance | 12+ offer endpoints | Add cache middleware with TTL |
| **Lazy load map screens** | ~500KB initial load savings | `app/b/map/*` | Use React.lazy() |
| **Replace JSON.parse(JSON.stringify())** | Modern API, better edge case handling | 3 files | Use `structuredClone()` |
| **Remove Swagger in production** | Minor security/size | `rez-auth-service/src/index.ts` | Conditional import |
| **Investigate CrossAppSync dead functions** | Code cleanup | `CrossAppSyncService.ts:408-455` | Verify need for helper functions |
| **Investigate IntegrationTestService.disabled** | Code cleanup | `merchantservices/` | Verify if test code needed |

---

## High Effort (Future)

| Issue | Impact | Files | Notes |
|-------|--------|-------|-------|
| **Create @rez/shared package** | Major code deduplication | Cross-service | Consolidate response helpers, error classes, validators, rate limiters |
| **Split gamificationController** | Maintainability | 2131 lines → 6 modules | Extract challenge, achievement, leaderboard, coin, streak, miniGame controllers |
| **Split productController** | Maintainability | 2103 lines → 5 modules | Extract search, trending, nearby services |
| **Split useCheckout hook** | Maintainability | 2355 lines → 3 hooks | Extract init, payment, coins logic |
| **Standardize naming conventions** | Consistency | 50+ files | camelCase vs snake_case decision needed |
| **Standardize pagination** | Consistency | 15+ files | Create pagination utility |
| **Cursor-based pagination** | Performance for large datasets | `products`, `offers`, `search/history` | For high-volume endpoints |
| **Consider zod for validation** | Modern, typed validation | Multiple custom validators | Replace custom price/email validators |

---

## Estimated Savings

| Category | Current State | After Optimization |
|----------|--------------|-------------------|
| **Bundle size** | 734MB node_modules | ~500-800KB reduction in final bundle |
| **Code cleanup** | ~200+ unused/dead code lines identified | ~150 lines removable |
| **Missing pagination** | 9 endpoints | 0 (all paginated) |
| **Missing cache headers** | 12+ endpoints | 0 (all cached appropriately) |
| **Duplicate code** | 8+ patterns across services | 1 shared package |
| **Large files** | 8 files >2000 lines | 0 files >500 lines (after split) |

---

## Security Findings

| Issue | Severity | Action |
|-------|----------|--------|
| `.env` file with real credentials | **HIGH** | Rotate all secrets, use secrets manager |
| Missing COOP/COEP/CORP headers | Low | Add to nginx.conf |
| MD5 for ETag generation | Low | Upgrade to SHA-256 |

---

## API Optimization Findings

| Issue | Count | Impact |
|-------|-------|--------|
| Naming inconsistencies (camelCase vs snake_case) | 12+ | Client confusion |
| Inconsistent response formats | 8+ | API consumer bugs |
| Missing pagination | 9 endpoints | Performance with large datasets |
| Missing cache headers | 12+ endpoints | Unnecessary server load |
| Over-fetching (analytics in list views) | 5+ | Unnecessary data transfer |

---

## Code Quality Findings

| Category | Issues | Priority |
|----------|--------|----------|
| Files >500 lines | 8 backend + 4 frontend | High |
| Files >2000 lines | 4 backend + 4 frontend | Critical |
| Magic numbers/strings | 20+ locations | Medium |
| Inconsistent pagination params | 5+ patterns | Medium |
| Duplicate response helpers | 3 implementations | High |
| Duplicate error classes | 2 implementations | High |
| Duplicate sanitization | 2 implementations | High |

---

## Recommended Actions

### Phase 1: Immediate (This Week)
1. Delete `.trash/` directory
2. Remove unused firebase packages (`@react-native-firebase/analytics`, `@react-native-firebase/app`)
3. Remove 4 unused imports in rez-auth-service
4. Fix `success: true` with null data bug in `offerRoutes.ts`
5. Rotate all credentials exposed in `.env` file

### Phase 2: Short Term (This Sprint)
1. Add pagination to 9 endpoints without it
2. Add cache headers to 12+ uncached endpoints
3. Remove `react-native-markdown-display`, replace with lighter alternative
4. Remove dynamic require/import patterns
5. Upgrade MD5 to SHA-256

### Phase 3: Medium Term (Next Sprint)
1. Lazy load map and heavy screens
2. Create pagination utility to standardize across codebase
3. Extract constants (TTL, rate limits, pagination defaults) to config files
4. Remove commented code blocks
5. Investigate potential dead code (CrossAppSyncService helpers)

### Phase 4: Long Term (Future Quarter)
1. Create `@rez/shared` package for cross-service utilities
2. Split large controllers (gamification, product, payment, checkout)
3. Standardize naming conventions (team decision needed)
4. Implement cursor-based pagination for high-volume endpoints
5. Consider zod for validation

---

## Dependencies to Modify

### Remove
```bash
npm uninstall @react-native-firebase/analytics @react-native-firebase/app react-native-markdown-display
```

### Add
```bash
npm install date-fns zod  # For date formatting and validation
```

---

## Files Requiring Most Attention

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `gamificationController.ts` | 2131 | Too large, deep nesting | Critical |
| `useCheckout.ts` | 2355 | Too large, magic numbers | Critical |
| `productController.ts` | 2103 | Too large | High |
| `storePaymentFlowController.ts` | 2068 | Too large | High |
| `priveController.ts` | 2071 | Too large | High |
| `categoryData.ts` | 2648 | Static data in code | Medium |
| `wishlistApi.ts` | 2135 | Too large | Medium |
| `realOffersApi.ts` | 1951 | Too large | Medium |

---

## Verification Commands

```bash
# Check bundle size
npx expo export --platform ios --output-dir dist

# Check for unused dependencies
npx depcheck

# TypeScript strict mode
tsc --noUnusedLocals --noUnusedParameters

# Run tests after changes
npm test
```

---

*Reports analyzed:*
- OPTIMIZATION_DEAD_CODE.md
- OPTIMIZATION_BUNDLE.md
- OPTIMIZATION_DUPLICATES.md
- OPTIMIZATION_SECURITY.md
- OPTIMIZATION_API.md
- OPTIMIZATION_REFACTOR.md
- OPTIMIZATION_REPLACEABLE_CODE.md
- OPTIMIZATION_UNUSED_IMPORTS.md
