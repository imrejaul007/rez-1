# Code Refactoring Opportunities

## Files Exceeding 500 Lines (Should Be Split)

### Long Backend Files
- `rez-backend-master/src/controllers/gamificationController.ts` - 2131 lines
- `rez-backend-master/src/controllers/productController.ts` - 2103 lines
- `rez-backend-master/src/controllers/storePaymentFlowController.ts` - 2068 lines
- `rez-backend-master/src/controllers/priveController.ts` - 2071 lines

### Long Frontend Files
- `nuqta-master/hooks/useCheckout.ts` - 2355 lines (React hook)
- `nuqta-master/data/categoryData.ts` - 2648 lines (static data)
- `nuqta-master/services/wishlistApi.ts` - 2135 lines
- `nuqta-master/services/realOffersApi.ts` - 1951 lines

---

## Functions to Split (>100 lines)

### Backend Controllers

#### `gamificationController.ts`
| Line | Function Name | Lines | Issue |
|------|---------------|-------|-------|
| 1298 | `streakCheckin` | ~220 | Complex streak logic with multiple steps - extract streak calculation |
| 1031 | `getPlayAndEarnData` | ~140 | Multiple Promise.all fetches - extract data fetching |
| 2027 | `getBonusOpportunities` | ~105 | Long aggregation logic - extract opportunity formatting |
| 70 | `joinChallenge` | ~60 | Validation and progress creation - split concerns |

#### `productController.ts`
| Line | Function Name | Lines | Issue |
|------|---------------|-------|-------|
| 24 | `getProducts` | ~300 | Massive filter/query builder - split by filter type |
| 1298 | `getSearchSuggestions` | ~50 | Moderate - could extract suggestion logic |
| 1395 | `getTrendingProducts` | ~140 | Aggregation pipeline - extract to service |

#### `storePaymentFlowController.ts`
| Line | Function Name | Lines | Issue |
|------|---------------|-------|-------|
| (file) | Multiple handlers | ~200+ each | Group related handlers into feature modules |

### Frontend Hooks

#### `useCheckout.ts`
| Line | Function Name | Lines | Issue |
|------|---------------|-------|-------|
| 172 | `initializeCheckout` | ~640 | Massive initialization - split by data type |
| 1632 | `handleCODPayment` | ~220 | Multi-store order handling - extract store grouping |
| 1860 | `handleRazorpayPayment` | ~240 | Payment processing - split callback handlers |
| 1118 | `handleCustomCoinAmount` | ~100 | Coin calculation logic - extract utility |

---

## Deep Nesting (>4 levels - Refactor with Early Returns)

### `gamificationController.ts`
- Line 1447-1460: `streakCheckin` - milestone loop with nested conditionals
- Line 629-656: `spinWheel` - tournament update loop with try/catch

### `productController.ts`
- Line 214-247: `getProducts` - search vs sort branching with multiple conditions
- Line 286-304: `diversityMode` handling with nested service calls

### `useCheckout.ts`
- Line 415-445: `initializeCheckout` - Promise.allSettled with deeply nested result handling
- Line 172-810: `initializeCheckout` - entire function needs modularization

---

## Magic Values That Should Be Constants

### Time Constants
| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `server.ts` | 72 | `5000` | `HEALTH_CHECK_TTL_MS` |
| `workers/index.ts` | 38 | `7 * 24 * 3600` | `JOB_RETENTION_7_DAYS` |
| `workers/index.ts` | 39 | `30 * 24 * 3600` | `JOB_RETENTION_30_DAYS` |
| `workers/index.ts` | 124 | `3600` | `JOB_COMPLETE_RETENTION_1H` |
| `workers/index.ts` | 125 | `86400` | `JOB_FAILED_RETENTION_24H` |
| `workers/index.ts` | 323 | `60000` | `RATE_LIMIT_50_PER_MIN` |
| `merchantEventWorker.ts` | 50 | `500` | `RATE_LIMIT_BULK_500` |
| `merchantEventWorker.ts` | 53 | `86400` | `JOB_COMPLETE_24H` |
| `priveController.ts` | 38 | `7 * 24 * 60 * 60 * 1000` | `ONE_WEEK_MS` |

### Pagination Defaults (Inconsistent)
| File | Line | Value | Issue |
|------|------|-------|-------|
| `activityFeedController.ts` | 13 | `parseInt(req.query.limit as string) \|\| 20` | Inconsistent defaults |
| `activityFeedController.ts` | 47 | `parseInt(req.query.limit as string) \|\| 50` | Different default |
| `adminReferralController.ts` | 31 | `parseInt(limit as string, 10) \|\| 20` | Default varies |
| `productController.ts` | 36 | `page = 1, limit = 20` | Standard default |
| `productController.ts` | 828 | `limit = 10` | Different default |

### Cache TTL Values
| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `priveController.ts` | 42 | `300` | `CACHE_TTL_5_MIN` |
| `ReportService.ts` | 48 | `60 * 60 * 1000` | `CACHE_TTL_1_HOUR` |

### Rate Limiting
| File | Line | Value | Should Be |
|------|------|-------|-----------|
| `workers/index.ts` | 323 | `50` | `RATE_LIMIT_CRITICAL_50` |
| `workers/index.ts` | 329 | `100` | `RATE_LIMIT_STANDARD_100` |
| `workers/index.ts` | 425 | `200` | `RATE_LIMIT_BULK_200` |

---

## Inconsistent Naming Patterns

### ID Field Naming (`_id` vs `id`)
| File | Issue |
|------|-------|
| `nuqta-master/services/*.ts` | Mixed use of `_id` (MongoDB) and `id` (frontend) |
| `realOffersApi.ts` | Uses `_id: string` |
| `wishlistApi.ts` | Uses `id: string` for items, `_id: string` for categories |
| Throughout codebase | Normalization needed - create utility `normalizeId()` |

### Pagination Parameter Naming
| Pattern | Files Using It |
|---------|----------------|
| `page`, `limit` | Most controllers |
| `pageNum`, `limitNum` | `billPaymentController.ts`, `adminReferralController.ts` |
| `skip`, `limit` | Direct MongoDB usage |

### Boolean Naming
| Pattern | Example |
|---------|---------|
| `isActive` | Used consistently |
| `hasAccess`, `canSpin` | Mixed camelCase prefixes |
| `is_enabled`, `is_featured` | Some files use snake_case |

### Date Handling
| Pattern | Example |
|---------|---------|
| `createdAt`, `updatedAt` | MongoDB convention |
| `created_at`, `updated_at` | In some migration files |
| `dateCreated`, `dateModified` | In some models |

---

## Recommended Refactoring Actions

### 1. Extract Constants to Config Files
```
src/config/pagination.ts     - DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
src/config/cache.ts          - Cache TTL constants
src/config/rateLimits.ts    - Rate limiting thresholds
src/config/time.ts           - Time duration constants
```

### 2. Split Large Controllers by Feature
```
gamificationController.ts → 
  ├── challengeController.ts
  ├── achievementController.ts
  ├── leaderboardController.ts
  ├── coinController.ts
  ├── streakController.ts
  └── miniGameController.ts
```

### 3. Extract Reusable Hooks (Frontend)
```
useCheckout.ts →
  ├── useCheckoutInit.ts      - initializeCheckout logic
  ├── useCheckoutPayment.ts   - All payment handlers
  └── useCheckoutCoins.ts     - Coin toggle/calculation
```

### 4. Standardize Pagination
Create a utility:
```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
}
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
```

### 5. Create ID Normalization Utility
```typescript
// Frontend: Always use 'id' for display/API
// Backend: May use '_id' for MongoDB
const normalizeId = (obj: any): string => obj.id || obj._id?.toString() || '';
```

---

## Priority Order

1. **High Priority**: Magic numbers in `useCheckout.ts` - extract to config
2. **High Priority**: Split `gamificationController.ts` - too large to maintain
3. **Medium Priority**: Standardize pagination across controllers
4. **Medium Priority**: Create ID normalization utilities
5. **Low Priority**: Consistent naming conventions (requires team decision)
