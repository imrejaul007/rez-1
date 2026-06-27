# Code Optimization Report: Replaceable Code

This document identifies code that can be replaced with existing npm modules or simplified using native JavaScript/TypeScript methods.

## 1. Custom Date Formatting That Can Use Native APIs or date-fns/dayjs

### [nuqta-master/utils/timeAgoFormatter.ts:8-56]
- **Current:** Custom time ago implementation with manual second/minute/hour/day calculations
- **Replace with:** `date-fns/formatDistanceToNow` or `dayjs().fromNow()`
- **Savings:** ~50 lines of custom code
```typescript
// Current implementation (56 lines)
export function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const timestamp = new Date(isoString);
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
  // ... 50 more lines of manual time calculations
}

// Replace with:
import { formatDistanceToNow } from 'date-fns';
export function formatTimeAgo(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}
```

### [nuqta-master/utils/timeAgoFormatter.ts:61-69]
- **Current:** Custom compact number formatting (1.2K, 3.5M)
- **Replace with:** `Intl.NumberFormat` with notation option
- **Savings:** ~10 lines
```typescript
// Current (9 lines)
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

// Replace with:
export function formatCount(count: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(count);
}
```

### [rez-api-gateway/src/routes/procurement/nextabizzRoutes.ts:316]
- **Current:** Manual order number generation with string padding
- **Replace with:** `crypto.randomUUID()` or `uuid` package
- **Savings:** 1 line
```typescript
// Current
const orderNumber = `NB${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

// Replace with:
const orderNumber = `NB${crypto.randomUUID().split('-')[0].toUpperCase()}`;
```

### [rez-api-gateway/src/routes/hotel/makcorpsRoutes.ts:276]
- **Current:** Same manual confirmation number pattern as above
- **Replace with:** `crypto.randomUUID()`
- **Savings:** 1 line

### [rez-backend-master/src/controllers/offersPageController.ts:262-263]
- **Current:** Manual month extraction from dates
- **Replace with:** `date-fns/getMonth`
- **Savings:** Minor readability improvement
```typescript
// Current
const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
const currentMonth = new Date().getMonth();

// Replace with:
import { getMonth } from 'date-fns';
const birthMonth = getMonth(new Date(user.profile.dateOfBirth));
const currentMonth = getMonth(new Date());
```

---

## 2. Custom UUID/ID Generation That Can Use Native APIs

### [nuqta-master/utils/idempotencyKey.ts:11-15]
- **Current:** Custom idempotency key generation using `Date.now()` and `Math.random()`
- **Replace with:** `crypto.randomUUID()` (available in Node 14.17+)
- **Savings:** ~5 lines
```typescript
// Current
export function generateIdempotencyKey(operation: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${operation}_${timestamp}_${random}`;
}

// Replace with:
import { randomUUID } from 'crypto';
export function generateIdempotencyKey(operation: string): string {
  return `${operation}_${randomUUID()}`;
}
```

### [nuqta-master/.optimize-logs/prod-bundle-current.js:414048-414052]
- **Current:** Fallback ID generation pattern (already has crypto.randomUUID fallback)
- **Note:** Already optimized, but fallback can be removed if Node 14.17+ is guaranteed
```javascript
// Current (has fallback to Date.now())
if (typeof crypto !== 'undefined' && crypto.randomUUID) {
  return crypto.randomUUID();
}
return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

### [rez-auth-service/src/middleware/tracing.ts:51]
- **Current:** UUID generation with hyphen removal
- **Replace with:** `crypto.randomUUID()` (already removes hyphens)
- **Savings:** 1 line
```typescript
// Current
return crypto.randomUUID().replace(/-/g, '');

// Replace with (if shorter format needed):
return crypto.randomUUID().replace(/-/g, ''); // Already optimal
// Or if full UUID is fine:
return crypto.randomUUID();
```

---

## 3. Deep Clone Patterns

### [nuqta-master/__tests__/utils/testHelpers.ts and rez-backend-master/src/controllers/admin/priveConfigAdminController.ts]
- **Current:** `JSON.parse(JSON.stringify(obj))` for deep cloning
- **Replace with:** `structuredClone()` (native, available in Node 17+) or `_.cloneDeep()` from lodash
- **Savings:** Variable (2 lines → 1 line)
```typescript
// Current
const cloned = JSON.parse(JSON.stringify(original));

// Replace with:
const cloned = structuredClone(original);
// Or with lodash:
const cloned = _.cloneDeep(original);
```

**Note:** `structuredClone()` handles more edge cases (Date, Map, Set, RegExp) and is faster.

---

## 4. Array/Object Manipulation That Can Use Native Methods

### [rez-backend-master/src/services/homepageService.ts:648-651]
- **Current:** Manual object mapping from Promise.all results
- **Replace with:** `Object.fromEntries()` with zip pattern
- **Savings:** ~4 lines
```typescript
// Current
const data = Object.keys(promises).reduce((acc, key, index) => {
  acc[key] = results[index];
  return acc;
}, {} as Record<string, any>);

// Replace with:
const data = Object.fromEntries(
  Object.keys(promises).map((key, index) => [key, results[index]])
);
```

### [nuqta-master/utils/cartHelpers.ts:4-6]
- **Current:** Simple array reduce for sum
- **Replace with:** Native `reduce` is actually optimal here (no change needed)
- **Note:** This is already optimal usage

### [nuqta-master/utils/cartHelpers.ts:14-20]
- **Current:** Complex reduce with conditional logic
- **Replace with:** Could use `reduce` with clearer syntax
- **Savings:** Minor readability improvement
```typescript
// Current
export const calculateLockedTotal = (items: LockedProduct[]): number => {
  return items.reduce((total, item) => {
    const lockFee = item.isPaidLock && item.lockFee ? item.lockFee : 0;
    return total + (item.price - lockFee);
  }, 0);
};

// Could simplify to:
export const calculateLockedTotal = (items: LockedProduct[]): number => {
  return items.reduce((total, item) => 
    total + (item.price - (item.isPaidLock ? item.lockFee ?? 0 : 0)), 0);
};
```

---

## 5. Lodash Usage Opportunities

### Multiple files using lodash (`_`):
The codebase already uses lodash extensively. Here are specific optimization opportunities:

### [Multiple files: `_.map()`, `_.filter()`, `_.reduce()`]
- **Current:** Using lodash for common array operations
- **Replace with:** Native ES6+ equivalents (already done in many places)
- **Savings:** Dependency size reduction
```typescript
// Current (lodash)
const ids = _.map(items, 'id');
const active = _.filter(items, { active: true });
const sum = _.reduce(items, (acc, item) => acc + item.value, 0);

// Replace with (native):
const ids = items.map(item => item.id);
const active = items.filter(item => item.active);
const sum = items.reduce((acc, item) => acc + item.value, 0);
```

### [Files using lodash for deep operations:]
These should KEEP using lodash:
- `_.cloneDeep()` - for complex object cloning
- `_.merge()` - for deep object merging
- `_.pick()`, `_.omit()` - for object property selection
- `_.debounce()`, `_.throttle()` - for function debouncing
- `_.groupBy()`, `_.sortBy()`, `_.uniqBy()` - for complex array operations

---

## 6. String Utilities That Can Use Native Methods

### [rez-backend-master/src/utils/sanitize.ts:5-7]
- **Current:** Custom regex escape function
- **Replace with:** Already optimal (no native equivalent)
- **Note:** Keep as-is

### [nuqta-master/utils/priceFormatter.ts:401-463]
- **Current:** Extensive custom price parsing with multiple regex replacements
- **Replace with:** Could use a library like `dinero.js` for complex currency handling
- **Savings:** ~60 lines if library is adopted
- **Note:** Current implementation handles edge cases well; evaluate if library fits

### [nuqta-master/utils/greetingUtils.ts - Multiple files]
- **Current:** Custom time-of-day calculations and message formatting
- **Replace with:** `date-fns` for time operations + template literals
- **Savings:** ~20 lines (keep template data, use date-fns for hour extraction)
```typescript
// Current
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'evening';
  } else {
    return 'night';
  }
}

// Replace with (using date-fns setHours comparison):
import { setHours, isBefore, isAfter } from 'date-fns';
```

---

## 7. Financial/Currency Calculations

### [rez-backend-master/src/utils/currency.ts]
- **Current:** Uses `decimal.js` for precise currency calculations
- **Replace with:** Keep as-is (decimal.js is the correct choice for financial calculations)
- **Note:** This is actually a good use case - decimal.js is smaller than alternatives and handles edge cases

---

## 8. Validation Patterns

### [nuqta-master/utils/priceFormatter.ts:60-85]
- **Current:** Custom price validation
- **Replace with:** Could be simplified using `zod` or native validation
- **Savings:** ~25 lines
```typescript
// Current
export function validatePrice(price: any): number | null {
  if (price == null) return null;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (typeof numPrice !== 'number' || isNaN(numPrice)) return null;
  if (numPrice < 0) return null;
  if (!isFinite(numPrice)) return null;
  return numPrice;
}

// Replace with (using zod):
import { z } from 'zod';
const PriceSchema = z.number().finite().nonnegative().nullable();
```

---

## Summary of Recommended Changes

| Category | Files Affected | Estimated Savings | Recommendation |
|----------|----------------|-------------------|----------------|
| Date Formatting | 5+ | ~70 lines | Adopt date-fns |
| UUID Generation | 4 | ~10 lines | Use crypto.randomUUID() |
| Deep Clone | 3 | ~5 lines | Use structuredClone() |
| Array Operations | 10+ | ~30 lines | Migrate to native ES6 |
| Validation | 2 | ~25 lines | Consider zod |
| Price Parsing | 1 | N/A | Evaluate dinero.js |

### Priority Actions:
1. **High Priority:** Replace `JSON.parse(JSON.stringify())` with `structuredClone()` in test files
2. **Medium Priority:** Add date-fns and use for time formatting across codebase
3. **Low Priority:** Gradually migrate lodash array operations to native equivalents
4. **Consider:** Adding zod for schema validation instead of custom validators

### Dependencies to Add:
```bash
npm install date-fns zod
```

### Dependencies to Potentially Remove (after migration):
- Some lodash methods (only if full native migration is done)
