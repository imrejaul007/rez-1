# ESLint Quick Reference - Rez App Frontend

**One-page cheat sheet for daily development**

---

## Quick Commands

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix

# Check specific file
npx eslint path/to/file.ts

# Check directory
npx eslint app/

# Generate report
npm run lint:report

# Type check
npm run type-check

# Full verification
npm run type-check && npm run lint
```

---

## Common Issues & Quick Fixes

### 1. Unused Imports/Variables

**Error:**
```
@typescript-eslint/no-unused-vars: 'Platform' is defined but never used
```

**Fix:** Remove unused imports
```typescript
// Before
import { View, Text, Platform, Modal } from 'react-native';

// After
import { View, Text } from 'react-native';
```

---

### 2. TypeScript `any` Type

**Error:**
```
@typescript-eslint/no-explicit-any: Unexpected any. Specify a different type.
```

**Fix Options:**
```typescript
// ❌ Bad
const handleData = (data: any) => { ... };

// ✅ Option 1: Proper type
interface Data { id: string; name: string; }
const handleData = (data: Data) => { ... };

// ✅ Option 2: Unknown (safer)
const handleData = (data: unknown) => { ... };

// ✅ Option 3: Generic
function handleData<T>(data: T): T { ... }

// ✅ Option 4: Union
const handleData = (data: string | number) => { ... };
```

---

### 3. React Hooks Dependencies

**Warning:**
```
react-hooks/exhaustive-deps: React Hook useEffect has missing dependency
```

**Fix Options:**
```typescript
// ⚠️ Before
useEffect(() => {
  loadData();
}, [userId]);  // Missing: loadData

// ✅ Fix 1: Add dependency
useEffect(() => {
  loadData();
}, [userId, loadData]);

// ✅ Fix 2: Wrap in useCallback
const loadData = useCallback(() => {
  // implementation
}, [dependencies]);

useEffect(() => {
  loadData();
}, [userId, loadData]);

// ✅ Fix 3: Move inside
useEffect(() => {
  const loadData = () => { ... };
  loadData();
}, [userId]);
```

---

### 4. CommonJS require()

**Error:**
```
@typescript-eslint/no-var-requires: Require statement not part of import statement
```

**Fix:**
```typescript
// ❌ Bad
const api = require('./api').default;

// ✅ Good
import api from './api';
```

---

### 5. Hooks Rules Violation

**Error:**
```
react-hooks/rules-of-hooks: React Hook "useState" is called conditionally
```

**Fix:**
```typescript
// ❌ Bad - Conditional hook
function MyComponent({ shouldLoad }) {
  if (shouldLoad) {
    const [data, setData] = useState(null);  // ERROR!
  }
}

// ✅ Good - Always at top level
function MyComponent({ shouldLoad }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (shouldLoad) {
      // Load conditionally
    }
  }, [shouldLoad]);
}
```

---

### 6. Undefined Component

**Error:**
```
react/jsx-no-undef: 'Button' is not defined
```

**Fix:**
```typescript
// ❌ Missing import
<Button onPress={handlePress}>Click</Button>

// ✅ Add import
import { Button } from 'react-native';
<Button onPress={handlePress}>Click</Button>
```

---

### 7. prefer-const

**Error:**
```
prefer-const: 'data' is never reassigned. Use 'const' instead
```

**Fix:**
```typescript
// ❌ Bad
let data = { status: 'active' };

// ✅ Good (auto-fixable)
const data = { status: 'active' };
```

---

### 8. Array Type Syntax

**Warning:**
```
@typescript-eslint/array-type: Array type using 'Array<T>' is forbidden
```

**Fix:**
```typescript
// ❌ Before
const items: Array<string> = [];

// ✅ After (auto-fixable)
const items: string[] = [];
```

---

## Pre-commit Checklist

```bash
# 1. Auto-fix
npm run lint:fix

# 2. Check remaining
npm run lint

# 3. Fix manually if needed
# ... edit code ...

# 4. Type check
npm run type-check

# 5. Commit
git commit -m "your message"
```

---

## VS Code Integration

### Auto-fix on Save

`.vscode/settings.json`:
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Keyboard Shortcuts

- `Ctrl+.` / `Cmd+.` - Quick fix menu
- `F8` - Go to next error
- Hover over error - See details

---

## Common Patterns

### Component Props

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style
}: ButtonProps) => {
  // implementation
};
```

### Event Handlers

```typescript
import type { GestureResponderEvent } from 'react-native';

const handlePress = (event: GestureResponderEvent): void => {
  console.log('Pressed');
};

const handleChange = (text: string): void => {
  setQuery(text);
};
```

### API Calls

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

async function fetchProducts(): Promise<ApiResponse<Product[]>> {
  const response = await api.get<Product[]>('/products');
  return {
    success: true,
    data: response.data
  };
}
```

### useEffect

```typescript
// With dependencies
useEffect(() => {
  fetchData();
}, [userId, fetchData]);

// With cleanup
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();
}, []);

// Empty deps (mount only)
useEffect(() => {
  initialize();
}, []);
```

### useCallback

```typescript
const handlePress = useCallback((id: string) => {
  navigation.navigate('Detail', { id });
}, [navigation]);
```

### useMemo

```typescript
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

---

## Suppressing Rules

### When Necessary

```typescript
// ❌ Bad - No explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await api.get('/data');

// ✅ Good - With explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy API, refactor tracked in JIRA-123
const data: any = await api.get('/legacy');
```

### Block of code

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Multiple lines with legitimate reason
const legacyData: any = transformOldFormat(data);
const processedData: any = processLegacy(legacyData);
/* eslint-enable @typescript-eslint/no-explicit-any */
```

---

## Auto-fixable Rules

These can be fixed with `npm run lint:fix`:

- `prefer-const` - Use const instead of let
- `@typescript-eslint/array-type` - Array type syntax
- `import/first` - Import statements at top
- `import/order` - Import organization
- `semi` - Semicolons
- `quotes` - Single vs double quotes
- `comma-dangle` - Trailing commas

---

## Non-auto-fixable Rules (Manual)

These require manual fixes:

- `@typescript-eslint/no-explicit-any` - Type safety
- `@typescript-eslint/no-unused-vars` - Unused code
- `react-hooks/exhaustive-deps` - Hook dependencies
- `react-hooks/rules-of-hooks` - Hook rules
- `react/jsx-no-undef` - Undefined components
- `@typescript-eslint/no-var-requires` - CommonJS imports

---

## Error Severity Levels

| Severity | Symbol | Meaning |
|----------|--------|---------|
| Error (2) | ❌ | Must fix - blocks build/commit |
| Warning (1) | ⚠️ | Should fix - doesn't block |
| Off (0) | - | Rule disabled |

---

## File Ignore Patterns

Already ignored (don't need to lint):
- `node_modules/`
- `.expo/`
- `dist/`
- `coverage/`
- `*.test.ts`, `*.test.tsx`
- Config files (`babel.config.js`, etc.)

---

## Useful Links

- **Full Documentation:** `ESLINT_BEST_PRACTICES.md`
- **Fix Plan:** `ESLINT_FIX_PLAN.md`
- **Audit Report:** `ESLINT_AUDIT_REPORT.md`
- **ESLint Docs:** https://eslint.org/
- **TypeScript ESLint:** https://typescript-eslint.io/

---

## Getting Help

1. Check this quick reference
2. Read `ESLINT_BEST_PRACTICES.md`
3. Ask in #dev-frontend Slack
4. Pair with team member
5. Create GitHub issue

---

## Statistics

**Current State (Nov 11, 2025):**
- Total Files: 902
- Files with Issues: 684 (75.8%)
- Total Errors: 2,978
- Total Warnings: 469
- Auto-fixable: 194

**Top 3 Issues:**
1. `@typescript-eslint/no-explicit-any` - 2,142 errors
2. `@typescript-eslint/no-unused-vars` - 783 errors
3. `react-hooks/exhaustive-deps` - 279 warnings

---

## Configuration Files

- **Config:** `.eslintrc.js` (legacy) or `eslint.config.js` (flat - ESLint 9+)
- **TypeScript:** `tsconfig.json`
- **VS Code:** `.vscode/settings.json`
- **Git Hooks:** `.husky/pre-commit` (future)

---

## Quick Wins

**Easiest fixes to start with:**

1. Run `npm run lint:fix` → Fixes 194 issues automatically
2. Remove unused imports → High impact, low effort
3. Replace `require()` with `import` → Simple find/replace
4. Add missing component imports → Quick fixes

---

**Print this page and keep at your desk!**

**Version:** 1.0 | **Updated:** Nov 11, 2025
