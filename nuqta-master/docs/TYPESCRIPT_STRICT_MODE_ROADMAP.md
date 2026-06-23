# TypeScript Strict Mode Roadmap - Rez App Frontend

**Goal:** Achieve 90%+ type coverage and full strict mode compliance
**Timeline:** 12-16 weeks (phased approach)
**Effort:** 320-480 developer hours

---

## Overview

This roadmap outlines a systematic, phased approach to improving TypeScript type safety in the Rez App frontend. The strategy balances immediate wins with long-term improvements while maintaining development velocity.

### Current State
- ✅ Strict mode: **Enabled**
- ⚠️ Type coverage: **~63%**
- ❌ `any` usage: **1,292 occurrences (33% of files)**
- ❌ Type assertions: **841 `as any` (26% of files)**

### Target State
- ✅ Strict mode: **Fully enforced**
- ✅ Type coverage: **90%+**
- ✅ `any` usage: **<5% of files (only where truly necessary)**
- ✅ Type assertions: **<2% of files (with justification)**

---

## Guiding Principles

1. **Non-Breaking:** Changes should not break existing functionality
2. **Incremental:** Improve gradually to maintain development velocity
3. **High-Impact First:** Prioritize critical paths (auth, payment, cart)
4. **Team Education:** Build TypeScript skills alongside improvements
5. **Automated Enforcement:** Use linting to prevent regression
6. **Measure Progress:** Track metrics weekly

---

## Phase 0: Foundation (Week 1) - 16 hours

**Goal:** Fix blocking issues and establish baseline

### Tasks

#### 1. Fix Syntax Errors (2 hours)
**Priority:** 🔥 Critical

**Files to Fix:**
- [ ] `__tests__/gamification/testUtils.ts` (Lines 19-20)
  - Fix unterminated regex literal
  - Likely JSX parsing issue in test utilities

- [ ] `hooks/usePerformance.ts` (Line 271)
  - Fix generic type syntax in HOC pattern
  - Ensure proper JSX generic component typing

- [ ] `services/stockNotificationApi.ts` (Line 190)
  - Remove escaped characters (`\!` → `!`)
  - Fix boolean negation syntax

**Acceptance Criteria:**
- `npx tsc --noEmit` runs without errors
- All files compile successfully

#### 2. Configure Type Coverage Tooling (2 hours)

**Install Tools:**
```bash
npm install --save-dev type-coverage
npm install --save-dev @typescript-eslint/eslint-plugin@latest
```

**Add Scripts to package.json:**
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-coverage": "type-coverage --detail",
    "type-coverage-watch": "type-coverage --watch"
  }
}
```

**Baseline Measurement:**
- Run and document current type coverage percentage
- Export detailed report: `type-coverage --detail > type-coverage-baseline.txt`

#### 3. Update ESLint Configuration (4 hours)

**Add TypeScript Rules:**
```javascript
// .eslintrc.js or eslint.config.js
module.exports = {
  // ... existing config
  rules: {
    // Phase 0: Warnings only (no blocking)
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    // Phase 0: Info only
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  }
};
```

**Create .eslintignore Exceptions:**
- Temporarily ignore high-volume offenders
- Document plan to fix each ignored pattern

#### 4. Team Documentation (4 hours)

**Create TypeScript Style Guide:**
- [ ] Document preferred patterns
- [ ] Show `any` vs `unknown` examples
- [ ] Explain when `as any` is acceptable
- [ ] Provide type guard templates

**Training Materials:**
- [ ] 30-minute team presentation
- [ ] "Before/After" examples document
- [ ] Link to TypeScript handbook sections

#### 5. Setup Progress Tracking (4 hours)

**Create Tracking Dashboard:**
- Weekly metrics spreadsheet
- Automated reporting script
- GitHub issue templates for type improvements

**Metrics to Track:**
- Total `any` count
- Total `as any` count
- Type coverage percentage
- Files with 100% type coverage

---

## Phase 1: Quick Wins (Weeks 2-3) - 40 hours

**Goal:** Achieve visible improvements in critical areas with minimal disruption

### 1.1 Add Return Types to Exported Functions (16 hours)

**Priority:** 🔥 High

**Strategy:**
```typescript
// Before
export function fetchUserData(userId: string) {
  return api.get(`/users/${userId}`);
}

// After
export async function fetchUserData(userId: string): Promise<User> {
  const response = await api.get<User>(`/users/${userId}`);
  return response.data;
}
```

**Files to Update (Priority Order):**
1. [ ] All files in `services/` (50+ files)
2. [ ] All files in `hooks/` (80+ files)
3. [ ] All files in `utils/` (60+ files)

**Automation:**
```bash
# Find functions without return types
npx tsc --noEmit --pretty 2>&1 | grep "missing return type"
```

**Acceptance Criteria:**
- All exported functions have explicit return types
- At least 200 functions updated
- No new TypeScript errors introduced

### 1.2 Replace `any` in Critical Paths (16 hours)

**Priority:** 🔥 Critical

**Critical Files (Must Fix):**
1. [ ] `contexts/AuthContext.tsx` (9 `any` types)
   - User type, token type, auth state

2. [ ] `contexts/CartContext.tsx` (7 `any` types)
   - CartItem interface, cart actions

3. [ ] `app/payment-razorpay.tsx` (12 `any` types)
   - Payment options, razorpay types

4. [ ] `services/apiClient.ts` (7 `any` types)
   - Generic API response, request options

5. [ ] `utils/errorHandler.ts` (16 `any` types)
   - Error types, error catching

**Pattern to Follow:**
```typescript
// Before: Unsafe error handling
try {
  await riskyOperation();
} catch (error: any) {
  console.error(error.message);
}

// After: Safe error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 1.3 Enable Additional Compiler Options (4 hours)

**Priority:** 🔶 Medium

**Update tsconfig.json:**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Fix Resulting Errors:**
- Remove unused imports and variables
- Add explicit returns to all code paths
- Add break/return to switch cases

**Estimate:** 50-100 new errors to fix

### 1.4 Create Type Guard Library (4 hours)

**Priority:** 🔶 Medium

**Create `utils/typeGuards.ts`:**
```typescript
// Type guards for common patterns
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

export function isValidResponse<T>(
  response: unknown,
  validator: (data: unknown) => data is T
): response is { success: true; data: T } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true &&
    'data' in response &&
    validator(response.data)
  );
}
```

---

## Phase 2: Systematic Improvement (Weeks 4-7) - 120 hours

**Goal:** Reduce `any` usage by 50% and achieve 75% type coverage

### 2.1 Services Layer Refactoring (40 hours)

**Priority:** 🔥 High

**Approach:**
1. Create strict response types for each API endpoint
2. Replace `any` with `unknown` for unpredictable data
3. Add runtime validation with type guards

**Target Files (by priority):**
1. [ ] `services/gamificationApi.ts` (29 `any` types)
2. [ ] `services/subscriptionApi.ts` (20 occurrences)
3. [ ] `services/followApi.ts` (17 occurrences)
4. [ ] `services/paymentVerificationService.ts` (19 occurrences)
5. [ ] `services/realVideosApi.ts` (12 occurrences)
6. [ ] `services/realTimeService.ts` (12 occurrences)
7. [ ] All remaining services (100+ files)

**Pattern:**
```typescript
// Before
async function getGameStats(userId: string): Promise<any> {
  const response = await api.get(`/games/stats/${userId}`);
  return response.data;
}

// After
interface GameStats {
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  points: number;
}

async function getGameStats(userId: string): Promise<GameStats> {
  const response = await api.get<{ data: GameStats }>(`/games/stats/${userId}`);

  // Runtime validation
  if (!isGameStats(response.data)) {
    throw new Error('Invalid game stats response');
  }

  return response.data;
}
```

**Weekly Goal:** 5-7 service files fully typed

### 2.2 Hooks Refactoring (32 hours)

**Priority:** 🔥 High

**Focus Areas:**
1. [ ] Data fetching hooks (useHomepage, useFashionData, etc.)
2. [ ] State management hooks (useCart, useWishlist, etc.)
3. [ ] Form hooks (useCheckout, useProfile, etc.)

**Pattern:**
```typescript
// Before
export function useProductData(productId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await api.get(`/products/${productId}`);
      setData(result.data);
      setLoading(false);
    };
    fetchData();
  }, [productId]);

  return { data, loading };
}

// After
interface Product {
  id: string;
  name: string;
  price: number;
  // ... all fields
}

interface UseProductDataReturn {
  data: Product | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProductData(productId: string): UseProductDataReturn {
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get<{ data: Product }>(`/products/${productId}`);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

**Weekly Goal:** 8-12 hooks fully typed

### 2.3 Context Refactoring (24 hours)

**Priority:** 🔥 High

**Target Contexts:**
1. [ ] CartContext.tsx (7 `any`, 4 `as any`)
2. [ ] AuthContext.tsx (9 `any`, 2 `as any`)
3. [ ] CategoryContext.tsx (10 `any`, 2 `as any`)
4. [ ] GamificationContext.tsx (3 `any`)
5. [ ] ProfileContext.tsx (2 `any`, 4 `as any`)
6. [ ] WishlistContext.tsx (1 `any`, 3 `as any`)

**Pattern:**
```typescript
// Before
interface CartContextValue {
  items: any[];
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  total: number;
}

// After
interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    image: string;
  };
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  total: number;
  itemCount: number;
  isLoading: boolean;
}
```

### 2.4 Component Props (24 hours)

**Priority:** 🔶 Medium

**Focus:**
- Remove `any` from component props
- Add strict prop types for all components
- Use discriminated unions for variant props

**Pattern:**
```typescript
// Before
interface ButtonProps {
  onPress: (e: any) => void;
  variant?: string;
  data?: any;
}

// After
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface BaseButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

interface PrimaryButtonProps extends BaseButtonProps {
  variant: 'primary';
  icon?: never;
}

interface SecondaryButtonProps extends BaseButtonProps {
  variant: 'secondary';
  icon?: IconName;
}

type ButtonProps = PrimaryButtonProps | SecondaryButtonProps;
```

---

## Phase 3: Advanced Type Safety (Weeks 8-11) - 120 hours

**Goal:** Achieve 85%+ type coverage and eliminate most `as any`

### 3.1 Eliminate Type Assertions (40 hours)

**Priority:** 🔥 High

**Target:** Reduce 841 `as any` assertions to <50

**Strategy:**
1. Identify root cause of each assertion
2. Fix underlying type issue
3. Only keep assertions with justification comment

**Common Patterns to Fix:**

#### Navigation Type Assertions
```typescript
// Before
const navigation = useNavigation<any>();
navigation.navigate('Profile', { userId: 123 } as any);

// After
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

const navigation = useNavigation<ProfileScreenNavigationProp>();
navigation.navigate('Profile', { userId: 123 });
```

#### React Native Events
```typescript
// Before
const handlePress = (event: any) => {
  const target = (event.target as any).value;
};

// After
import { GestureResponderEvent, NativeSyntheticEvent } from 'react-native';

const handlePress = (event: GestureResponderEvent) => {
  // Proper event handling without assertions
};
```

#### Third-Party Library Types
```typescript
// Before
const result = (await thirdPartyLib.method() as any).data;

// After
// Create custom type declaration
// types/third-party-lib.d.ts
declare module 'third-party-lib' {
  export interface MethodResult {
    data: string;
    status: number;
  }

  export function method(): Promise<MethodResult>;
}

// Usage
const result = (await thirdPartyLib.method()).data;
```

### 3.2 Add Runtime Validation (32 hours)

**Priority:** 🔶 Medium

**Install Validation Library:**
```bash
npm install zod
# or
npm install yup
```

**Pattern with Zod:**
```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;

// Use in API calls
async function fetchUser(userId: string): Promise<User> {
  const response = await api.get(`/users/${userId}`);

  // Runtime validation + TypeScript type safety
  return UserSchema.parse(response.data);
}
```

**Apply to:**
- API response validation
- Form input validation
- WebSocket message validation
- LocalStorage data validation

### 3.3 Enhance Type Definitions (24 hours)

**Priority:** 🔶 Medium

**Improvements:**

#### 1. Branded Types
```typescript
// types/branded.ts
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type AuthToken = Brand<string, 'AuthToken'>;

// Usage
function getUser(userId: UserId): Promise<User> { ... }

const userId = '123' as UserId; // Explicit cast required
getUser(userId); // ✅
getUser('123'); // ❌ TypeScript error
```

#### 2. Discriminated Unions
```typescript
// types/api.types.ts
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Usage with type narrowing
async function handleApiCall<T>(call: Promise<ApiResponse<T>>): Promise<T> {
  const response = await call;

  if (response.success) {
    return response.data; // TypeScript knows data exists
  } else {
    throw new Error(response.error.message); // TypeScript knows error exists
  }
}
```

#### 3. Utility Types
```typescript
// types/utils.ts
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
```

### 3.4 Documentation and Examples (24 hours)

**Priority:** 🔶 Medium

**Create Comprehensive Docs:**
1. [ ] Type pattern cookbook
2. [ ] Common type errors and solutions
3. [ ] Migration guide for each pattern
4. [ ] Video tutorials (optional)

---

## Phase 4: Full Strict Mode (Weeks 12-16) - 120+ hours

**Goal:** Achieve 90%+ type coverage and full strict enforcement

### 4.1 Enable Additional Strict Flags (40 hours)

**Update tsconfig.json:**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,

    // Additional strictness
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true, // 🆕 Important!
    "noImplicitOverride": true, // 🆕 For classes
    "exactOptionalPropertyTypes": true, // 🆕 Strict undefined handling

    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Fix Resulting Errors:**
- Handle indexed access returning `undefined`
- Add `override` keyword to class methods
- Distinguish `undefined` from missing properties

### 4.2 ESLint Rules to Errors (16 hours)

**Enforce with CI:**
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Change from 'warn' to 'error'
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
  }
};
```

**CI/CD Integration:**
```yaml
# .github/workflows/type-check.yml
name: Type Check
on: [pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
```

### 4.3 Final Cleanup (40 hours)

**Remaining Tasks:**
1. [ ] Fix all remaining `any` types (<50 expected)
2. [ ] Remove all unnecessary `as any` assertions
3. [ ] Add JSDoc comments to complex types
4. [ ] Create type tests for critical types

### 4.4 Type Testing (24 hours)

**Install Type Testing Library:**
```bash
npm install --save-dev tsd
```

**Create Type Tests:**
```typescript
// types/__tests__/api.test-d.ts
import { expectType, expectError } from 'tsd';
import { ApiResponse, UserId } from '../api.types';

// Test type inference
const successResponse: ApiResponse<{ name: string }> = {
  success: true,
  data: { name: 'Test' }
};
expectType<{ name: string }>(successResponse.data);

// Test branded types
const userId: UserId = '123' as UserId;
expectError(getUserData('123')); // Should error without cast
expectType<Promise<User>>(getUserData(userId)); // Should be OK
```

---

## Maintenance and Prevention

### Ongoing Practices

#### 1. Code Review Checklist
- [ ] No new `any` types introduced
- [ ] All exported functions have return types
- [ ] Type assertions include justification comments
- [ ] New types added to appropriate type definition files

#### 2. Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  }
}
```

#### 3. Monthly Type Coverage Reports
- Generate type coverage report
- Identify regression areas
- Celebrate improvements

#### 4. Team Training
- Monthly TypeScript tips session
- Share interesting type problems and solutions
- Code review TypeScript-focused sessions

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|---------|
| Type Coverage | 63% | 68% | 75% | 85% | 90%+ |
| `any` Occurrences | 1,292 | 1,000 | 650 | 200 | <50 |
| `as any` Assertions | 841 | 700 | 400 | 100 | <50 |
| Files with `any` | 390 (33%) | 320 (27%) | 200 (17%) | 80 (7%) | <60 (5%) |
| TypeScript Errors | 7 | 0 | 0 | 0 | 0 |
| `unknown` Usage | 45 | 80 | 150 | 250 | 350+ |

### Definition of Done (Per Phase)

**Phase 1:**
- ✅ All syntax errors fixed
- ✅ ESLint TypeScript rules enabled (warnings)
- ✅ 200+ functions have explicit return types
- ✅ Critical paths (auth, payment, cart) have strict types

**Phase 2:**
- ✅ 50% reduction in `any` usage
- ✅ All services have strong types
- ✅ All contexts have strict type definitions
- ✅ 75% type coverage achieved

**Phase 3:**
- ✅ 85% type coverage achieved
- ✅ <100 type assertions remaining
- ✅ Runtime validation implemented
- ✅ Enhanced type definitions in place

**Phase 4:**
- ✅ 90%+ type coverage
- ✅ All strict compiler options enabled
- ✅ ESLint rules enforced as errors in CI
- ✅ Type tests implemented

---

## Risk Mitigation

### Potential Risks

1. **Breaking Changes**
   - **Mitigation:** Extensive testing after each phase
   - **Backup:** Feature flags for risky changes

2. **Development Velocity Impact**
   - **Mitigation:** Incremental approach, pair programming
   - **Buffer:** Add 20% time buffer to estimates

3. **Team Resistance**
   - **Mitigation:** Clear communication, training, visible wins
   - **Strategy:** Start with volunteers, build champions

4. **Third-Party Type Issues**
   - **Mitigation:** Create custom type declarations
   - **Fallback:** Isolated `any` usage with documentation

5. **Scope Creep**
   - **Mitigation:** Stick to roadmap, defer nice-to-haves
   - **Process:** Weekly review of scope

---

## Cost-Benefit Analysis

### Investment
- **Time:** 320-480 hours (8-12 weeks @ 1 FTE)
- **Training:** 40 hours team training
- **Tools:** $0 (using free/open-source tools)

### Expected Benefits

**Short-term (3-6 months):**
- 40% reduction in runtime type errors
- 30% faster onboarding for new developers
- Better IDE autocomplete and refactoring

**Long-term (6-12 months):**
- 60% reduction in production bugs related to types
- 50% faster feature development (due to better types)
- Easier refactoring and maintenance
- Improved code documentation through types

**ROI Calculation:**
Assuming 1 hour/week saved per developer (5 developers):
- 5 hours/week × 52 weeks = 260 hours/year saved
- Break-even: ~2 years
- 5-year ROI: ~300% (260 × 5 / 400)

---

## Conclusion

This roadmap provides a clear path from the current 63% type coverage to 90%+ coverage over 12-16 weeks. By following this phased approach, the team can improve type safety without disrupting development velocity, while building TypeScript expertise and establishing lasting good practices.

**Next Steps:**
1. ✅ Get stakeholder approval on roadmap
2. ✅ Assign Phase 0 tasks to team member
3. ✅ Schedule Phase 1 kickoff meeting
4. ✅ Begin tracking weekly metrics

**Success depends on:**
- Consistent execution
- Team buy-in and training
- Regular progress monitoring
- Flexibility to adjust based on learnings

Let's build a more type-safe codebase! 🚀

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Owner:** Engineering Team
**Review Cycle:** Monthly
