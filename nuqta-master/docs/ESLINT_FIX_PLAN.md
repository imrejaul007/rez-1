# ESLint Fix Plan - Prioritized Roadmap

**Project:** Rez App Frontend
**Version:** 1.0
**Last Updated:** November 11, 2025

---

## Overview

This document provides a prioritized, actionable plan to resolve all 3,447 ESLint issues across 684 files in the Rez App Frontend.

### Summary Statistics

| Metric | Count | % of Total |
|--------|-------|------------|
| Total Issues | 3,447 | 100% |
| Errors | 2,978 | 86.4% |
| Warnings | 469 | 13.6% |
| Auto-fixable | 194 | 5.6% |
| Manual fixes required | 3,253 | 94.4% |

---

## Phase 1: Critical Infrastructure (Week 1)

**Goal:** Get linter operational and fix blocking issues
**Estimated Time:** 8-10 hours
**Impact:** High - Enables all future work

### Task 1.1: Fix ESLint Configuration (Priority: CRITICAL)
**Time:** 1 hour
**Complexity:** Low
**Blocker:** Yes

**Problem:** ESLint 8.57.1 incompatible with ESLint 9 flat config format

**Steps:**
1. Create new `.eslintrc.js` file with legacy format
2. Remove incompatible `eslint.config.js`
3. Verify linter runs successfully
4. Commit configuration

**Files to Modify:**
- Delete: `eslint.config.js`
- Create: `.eslintrc.js`

**Success Criteria:**
- `npm run lint` executes without config errors
- All 902 files scanned successfully

---

### Task 1.2: Fix Parse Error (Priority: CRITICAL)
**Time:** 15 minutes
**Complexity:** Low
**Blocker:** No

**Problem:** Invalid escaped characters in `stockNotificationApi.ts:190`

**File:** `services/stockNotificationApi.ts`

**Change:**
```typescript
// Before (Line 190)
if (\!checkResponse.success || \!checkResponse.data?.hasPendingNotification) {

// After
if (!checkResponse.success || !checkResponse.data?.hasPendingNotification) {
```

**Verification:**
```bash
npx eslint services/stockNotificationApi.ts
```

---

### Task 1.3: Run Auto-fix for All Fixable Issues (Priority: HIGH)
**Time:** 30 minutes (includes verification)
**Complexity:** Low
**Blocker:** No

**Fixable Issues:**
- 166 array type syntax warnings
- 21 import ordering warnings
- 7 prefer-const errors

**Command:**
```bash
npm run lint:fix
```

**Expected Result:** 194 issues automatically resolved

**Verification Steps:**
1. Run linter before: Record issue count
2. Run auto-fix command
3. Run linter after: Verify 194 fewer issues
4. Test app: Ensure nothing broke
5. Review changes: Quick git diff review
6. Commit: "chore: auto-fix ESLint issues (array types, imports, const)"

**Risk:** Low - Auto-fixes are safe

---

### Task 1.4: Update Ignore Patterns (Priority: MEDIUM)
**Time:** 15 minutes
**Complexity:** Low

**Current:** Only ignores `dist/*`

**Add to ignore:**
```javascript
ignorePatterns: [
  'dist',
  'build',
  'node_modules',
  '.expo',
  '.expo-shared',
  'coverage',
  '__tests__',
  '__mocks__',
  'tests.bak',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx',
  'babel.config.js',
  'metro.config.js',
  'jest.config.js',
  'eslint-full-report.json',
  'analyze-eslint.js'
]
```

---

### Task 1.5: Add Enhanced NPM Scripts (Priority: MEDIUM)
**Time:** 10 minutes
**Complexity:** Low

**Add to `package.json`:**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "lint:report": "eslint . --ext .ts,.tsx,.js,.jsx -f html -o eslint-report.html",
    "lint:ci": "eslint . --ext .ts,.tsx,.js,.jsx -f json -o eslint-report.json",
    "lint:summary": "eslint . --ext .ts,.tsx,.js,.jsx --format compact",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Phase 2: Critical Errors (Weeks 2-3)

**Goal:** Fix errors that could cause runtime failures
**Estimated Time:** 30-40 hours
**Impact:** High - Prevents crashes and bugs

### Task 2.1: Fix React Hooks Violations (Priority: CRITICAL)
**Time:** 6-8 hours
**Complexity:** High
**Count:** 6 errors

**Rule:** `react-hooks/rules-of-hooks`

**Common Violations:**
- Hooks called conditionally
- Hooks called outside components
- Hooks in loops

**Strategy:**
1. Identify all 6 files with violations
2. Analyze each violation context
3. Refactor to follow Rules of Hooks
4. Test affected components thoroughly

**Example Fix:**
```typescript
// Bad
function MyComponent() {
  if (condition) {
    const [state, setState] = useState(0);  // Conditional hook!
  }
}

// Good
function MyComponent() {
  const [state, setState] = useState(0);

  if (condition) {
    // Use state here
  }
}
```

**Verification:** Manual testing of affected components

---

### Task 2.2: Fix Undefined JSX Components (Priority: CRITICAL)
**Time:** 2-3 hours
**Complexity:** Medium
**Count:** 6 errors

**Rule:** `react/jsx-no-undef`

**Strategy:**
1. Run linter to identify all undefined components
2. Add missing imports
3. Verify component paths are correct
4. Test affected pages

**Common Causes:**
- Missing import statement
- Incorrect component name
- Wrong import path

**Example Fix:**
```typescript
// Error: 'Button' is not defined
<Button onPress={handlePress}>Click</Button>

// Fix: Add import
import { Button } from 'react-native';
<Button onPress={handlePress}>Click</Button>
```

---

### Task 2.3: Remove Unused Imports and Variables (Priority: HIGH)
**Time:** 20-25 hours
**Complexity:** Medium
**Count:** 783 errors

**Rule:** `@typescript-eslint/no-unused-vars`

**Strategy:** Systematic file-by-file cleanup

#### Sub-task 2.3.1: Remove Unused Imports
**Time:** 12-15 hours
**Files:** ~684 files

**Approach:**
1. Sort files by directory
2. Process in batches:
   - `app/` directory (50+ files)
   - `components/` directory (100+ files)
   - `services/` directory (50+ files)
   - `contexts/` directory (20+ files)
   - `hooks/` directory (30+ files)
   - `utils/` and `types/` (remaining)

**Per File Process:**
1. Open file
2. Identify unused imports from linter message
3. Remove unused imports
4. Verify file still compiles
5. Quick sanity check (no broken references)

**Common Unused Imports:**
- `Platform` from 'react-native'
- `Modal`, `Alert`, `Image` from 'react-native'
- Unused types
- Unused utility functions

**Example:**
```typescript
// Before
import { View, Text, Platform, Modal, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';

// After (if Modal, Alert, Platform, useCallback are unused)
import { View, Text } from 'react-native';
import { useState, useEffect } from 'react';
```

#### Sub-task 2.3.2: Remove Unused Variables
**Time:** 8-10 hours

**Common Patterns:**
- Destructured but unused props
- Unused function parameters
- Unused state variables

**Example:**
```typescript
// Bad
const { data, error, loading, refetch } = useQuery();  // refetch unused
const handleSubmit = (event, index) => {  // index unused
  // ...
};

// Good
const { data, error, loading } = useQuery();
const handleSubmit = (event) => {
  // ...
};

// Or use underscore prefix to indicate intentionally unused
const handleSubmit = (event, _index) => {
  // ...
};
```

---

### Task 2.4: Replace CommonJS require() with ES6 Imports (Priority: HIGH)
**Time:** 3-4 hours
**Complexity:** Low
**Count:** 23 errors

**Rule:** `@typescript-eslint/no-var-requires`

**Strategy:**
1. Search codebase for all `require()` calls
2. Replace with equivalent `import` statements
3. Verify imports work correctly

**Example:**
```typescript
// Bad
const walletApi = require('@/services/walletApi').default;
const { helper } = require('@/utils/helper');

// Good
import walletApi from '@/services/walletApi';
import { helper } from '@/utils/helper';
```

**Search Command:**
```bash
grep -r "require(" app components hooks services contexts utils --include="*.ts" --include="*.tsx"
```

---

### Task 2.5: Fix TypeScript Comment Suppressions (Priority: HIGH)
**Time:** 1-2 hours
**Complexity:** Medium
**Count:** 3 errors

**Rule:** `@typescript-eslint/ban-ts-comment`

**Strategy:**
1. Locate all `@ts-ignore`, `@ts-nocheck` comments
2. Understand why suppression was needed
3. Fix underlying type issue
4. Remove suppression comment
5. If suppression necessary, add detailed explanation (10+ chars)

**Example:**
```typescript
// Bad
// @ts-ignore
const value = someApiCall();

// Better (if absolutely necessary)
// @ts-expect-error: Legacy API returns inconsistent types, refactor pending
const value = someApiCall();

// Best: Fix the type
const value = someApiCall() as ExpectedType;
```

---

### Task 2.6: Fix Import Resolution Issues (Priority: HIGH)
**Time:** 2-3 hours
**Complexity:** Medium
**Count:** 3 errors

**Rules:**
- `import/no-unresolved` - 2 errors
- `import/namespace` - 1 error

**Strategy:**
1. Identify unresolved imports
2. Check if files exist at specified paths
3. Fix import paths or install missing packages
4. Verify TypeScript can resolve imports

**Common Causes:**
- Typo in import path
- Missing package in package.json
- Incorrect tsconfig path mapping

---

## Phase 3: Type Safety Improvements (Months 1-2)

**Goal:** Eliminate `any` types and improve type coverage
**Estimated Time:** 60-80 hours
**Impact:** High - Long-term code quality

### Task 3.1: Create Type Definitions (Priority: MEDIUM)
**Time:** 15-20 hours
**Complexity:** High

**Strategy:**
1. Audit existing type files in `types/` directory
2. Create missing type definitions for common patterns
3. Document types for team reference

**Priority Areas:**
1. API response types
2. Component prop types
3. Context types
4. Hook return types
5. Event handler types

**Example Type Definitions:**
```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// types/handlers.types.ts
export type PressHandler = (event: GestureResponderEvent) => void;
export type TextChangeHandler = (text: string) => void;
export type ErrorHandler = (error: Error | unknown) => void;
```

---

### Task 3.2: Replace `any` Types - API Calls (Priority: MEDIUM)
**Time:** 15-20 hours
**Complexity:** High
**Count:** ~500 instances in services

**Strategy:**
1. Focus on `services/` directory first
2. Add proper return types to API functions
3. Use generic types for API responses

**Example:**
```typescript
// Bad
export const fetchProducts = async (): Promise<any> => {
  const response = await apiClient.get('/products');
  return response.data;
};

// Good
export const fetchProducts = async (): Promise<ApiResponse<Product[]>> => {
  const response = await apiClient.get<Product[]>('/products');
  return {
    success: true,
    data: response.data
  };
};
```

---

### Task 3.3: Replace `any` Types - Event Handlers (Priority: MEDIUM)
**Time:** 10-15 hours
**Complexity:** Medium
**Count:** ~400 instances in app and components

**Common Patterns:**
```typescript
// Bad
const handlePress = (event: any) => { ... };
const handleChange = (value: any) => { ... };
const onError = (error: any) => { ... };

// Good
import type { GestureResponderEvent } from 'react-native';

const handlePress = (event: GestureResponderEvent) => { ... };
const handleChange = (value: string | number) => { ... };
const onError = (error: Error | unknown) => { ... };
```

---

### Task 3.4: Replace `any` Types - Component Props (Priority: MEDIUM)
**Time:** 15-20 hours
**Complexity:** Medium
**Count:** ~500 instances in components

**Strategy:**
1. Define proper prop interfaces
2. Use TypeScript for prop validation (replace PropTypes)
3. Document complex props

**Example:**
```typescript
// Bad
const MyComponent = (props: any) => { ... };

// Good
interface MyComponentProps {
  title: string;
  onPress: () => void;
  items: Item[];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MyComponent = ({
  title,
  onPress,
  items,
  loading = false,
  style
}: MyComponentProps) => { ... };
```

---

### Task 3.5: Replace `any` Types - State and Context (Priority: MEDIUM)
**Time:** 10-15 hours
**Complexity:** High
**Count:** ~300 instances in contexts and hooks

**Example:**
```typescript
// Bad
const [data, setData] = useState<any>(null);
const contextValue: any = { ... };

// Good
interface UserData {
  id: string;
  name: string;
  // ... more fields
}

const [data, setData] = useState<UserData | null>(null);

interface AppContextValue {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
}

const contextValue: AppContextValue = { ... };
```

---

## Phase 4: React Hooks Dependencies (Month 2)

**Goal:** Fix stale closures and missing dependencies
**Estimated Time:** 20-25 hours
**Impact:** Medium - Prevents subtle bugs

### Task 4.1: Audit and Fix useEffect Dependencies (Priority: MEDIUM)
**Time:** 12-15 hours
**Complexity:** Medium
**Count:** 279 warnings

**Strategy:**
1. Review each useEffect hook
2. Add missing dependencies OR
3. Refactor to avoid dependency OR
4. Use useCallback/useMemo for stability

**Common Patterns:**

#### Pattern 1: Add Missing Dependency
```typescript
// Warning: missing 'loadData'
useEffect(() => {
  loadData();
}, [userId]);

// Fix 1: Add dependency
useEffect(() => {
  loadData();
}, [userId, loadData]);

// Fix 2: Wrap in useCallback
const loadData = useCallback(() => {
  // ...
}, [/* dependencies */]);

useEffect(() => {
  loadData();
}, [userId, loadData]);
```

#### Pattern 2: Extract Stable References
```typescript
// Warning: missing 'props.onUpdate'
useEffect(() => {
  props.onUpdate(data);
}, [data]);

// Fix: Extract to stable ref
const { onUpdate } = props;
useEffect(() => {
  onUpdate(data);
}, [data, onUpdate]);
```

#### Pattern 3: Use Ref for Non-reactive Values
```typescript
// If you don't want re-runs on every change
const callbackRef = useRef(props.onUpdate);
useEffect(() => {
  callbackRef.current = props.onUpdate;
});

useEffect(() => {
  callbackRef.current(data);
}, [data]);
```

---

### Task 4.2: Audit and Fix useCallback Dependencies (Priority: LOW)
**Time:** 5-8 hours
**Complexity:** Low

**Focus:** Callbacks passed as props to child components

---

### Task 4.3: Audit and Fix useMemo Dependencies (Priority: LOW)
**Time:** 3-5 hours
**Complexity:** Low

**Focus:** Expensive computations

---

## Phase 5: Code Quality & Style (Month 3)

**Goal:** Improve consistency and add remaining rules
**Estimated Time:** 15-20 hours
**Impact:** Low - Cosmetic improvements

### Task 5.1: Add Display Names to Components (Priority: LOW)
**Time:** 2-3 hours
**Count:** 2 warnings

### Task 5.2: Install Additional ESLint Plugins (Priority: LOW)
**Time:** 4-6 hours

**Plugins to Add:**
```bash
npm install --save-dev \
  eslint-plugin-jsx-a11y \
  eslint-plugin-security \
  eslint-plugin-react-native
```

**Then:**
1. Enable rules gradually
2. Fix new issues found
3. Document any overrides needed

### Task 5.3: Set Up Pre-commit Hooks (Priority: LOW)
**Time:** 2-3 hours

**Install Husky + lint-staged:**
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Configure `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Configure `package.json`:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## Phase 6: CI/CD Integration (Month 3)

**Goal:** Automate linting in pipeline
**Estimated Time:** 4-6 hours
**Impact:** High - Prevents regressions

### Task 6.1: Add GitHub Actions Workflow (Priority: MEDIUM)
**Time:** 2-3 hours

**Create `.github/workflows/lint.yml`:**
```yaml
name: Lint

on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main, master, develop]

jobs:
  eslint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint:ci

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: eslint-results
          path: eslint-report.json
```

### Task 6.2: Configure Zero-Tolerance Policy (Priority: MEDIUM)
**Time:** 1-2 hours

**Options:**
1. Block PRs with any errors (strict)
2. Block PRs with critical errors only (moderate)
3. Report but don't block (lenient)

---

## Execution Schedule

### Week 1: Infrastructure
- **Days 1-2:** Tasks 1.1 - 1.5 (Config, auto-fix, scripts)
- **Days 3-5:** Task 2.1 (Hooks violations - CRITICAL)

### Week 2: Critical Errors
- **Days 1-2:** Task 2.2 (Undefined components)
- **Days 3-5:** Task 2.3.1 (Start removing unused imports)

### Week 3: Critical Errors Continued
- **Days 1-3:** Task 2.3 (Continue unused imports cleanup)
- **Days 4-5:** Tasks 2.4, 2.5, 2.6 (require(), ts-comments, imports)

### Month 2: Type Safety
- **Week 1:** Task 3.1 (Create type definitions)
- **Week 2:** Task 3.2 (API types)
- **Week 3:** Task 3.3 (Event handler types)
- **Week 4:** Task 3.4 (Component prop types)

### Month 3: Polish & Automation
- **Week 1:** Task 3.5 (State/context types)
- **Week 2:** Task 4.1 (useEffect dependencies)
- **Week 3:** Tasks 5.1-5.3 (Code quality, pre-commit hooks)
- **Week 4:** Task 6.1-6.2 (CI/CD integration)

---

## Risk Management

### High Risk Tasks
- **Hooks violations:** Could break functionality
  - **Mitigation:** Thorough testing after each fix
- **Type safety:** Large-scale refactoring
  - **Mitigation:** Incremental changes, PR reviews

### Medium Risk Tasks
- **Unused imports:** Might remove needed code
  - **Mitigation:** Verify compilation after each batch
- **Dependencies:** Breaking changes in packages
  - **Mitigation:** Version lock, test suite

### Low Risk Tasks
- **Auto-fix:** Generally safe
  - **Mitigation:** Review diff before committing
- **Style changes:** Cosmetic only
  - **Mitigation:** None needed

---

## Success Metrics

### After Phase 1 (Week 1)
- [ ] ESLint runs without config errors
- [ ] Auto-fixable issues reduced to 0
- [ ] Development workflow established

### After Phase 2 (Week 3)
- [ ] Critical errors < 50
- [ ] Hooks violations = 0
- [ ] Unused imports < 200

### After Phase 3 (Month 2)
- [ ] `any` types < 500
- [ ] API layer fully typed
- [ ] Component props properly typed

### After Phase 4 (Month 2.5)
- [ ] useEffect warnings < 50
- [ ] Hook dependencies properly managed

### Final (Month 3)
- [ ] Total errors < 100
- [ ] Total warnings < 50
- [ ] Pre-commit hooks active
- [ ] CI/CD pipeline enforcing rules

---

## Resource Requirements

### Developer Hours
- **Phase 1:** 10 hours (1 developer, 1 week)
- **Phase 2:** 35 hours (1 developer, 3 weeks)
- **Phase 3:** 70 hours (2 developers, 1 month)
- **Phase 4:** 25 hours (1 developer, 2 weeks)
- **Phase 5:** 20 hours (1 developer, 2 weeks)
- **Phase 6:** 6 hours (DevOps, 1 week)

**Total:** 166 developer hours over 3 months

### Cost Estimate (Optional)
At $75/hour average: ~$12,450
At $100/hour average: ~$16,600

### Benefits
- Reduced bugs in production
- Faster code reviews
- Easier onboarding
- Better maintainability
- Improved developer experience

---

## Appendix: Quick Reference Commands

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix

# Generate HTML report
npm run lint:report

# CI-friendly JSON output
npm run lint:ci

# Check specific file
npx eslint path/to/file.ts

# Check specific directory
npx eslint app/

# Type check (no emit)
npm run type-check

# Full verification
npm run type-check && npm run lint
```

---

## Appendix: Common Fix Patterns

### Remove Unused Import
```typescript
// Before
import { View, Text, Platform, Modal } from 'react-native';

// After (if Platform and Modal are unused)
import { View, Text } from 'react-native';
```

### Replace `any` Type
```typescript
// Before
const handleError = (error: any) => console.error(error);

// After
const handleError = (error: Error | unknown) => console.error(error);
```

### Fix useEffect Dependency
```typescript
// Before - Warning
useEffect(() => {
  loadData();
}, []);

// After
const loadData = useCallback(() => {
  // implementation
}, [dependencies]);

useEffect(() => {
  loadData();
}, [loadData]);
```

### Replace require()
```typescript
// Before
const api = require('./api').default;

// After
import api from './api';
```

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Next Review:** December 11, 2025
