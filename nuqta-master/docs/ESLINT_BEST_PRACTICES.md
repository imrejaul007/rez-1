# ESLint Best Practices - Team Guidelines

**Project:** Rez App Frontend
**Version:** 1.0
**Last Updated:** November 11, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Running ESLint Locally](#running-eslint-locally)
3. [IDE Integration](#ide-integration)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [TypeScript Best Practices](#typescript-best-practices)
6. [React & React Native Best Practices](#react--react-native-best-practices)
7. [Writing Clean Code](#writing-clean-code)
8. [When to Suppress Rules](#when-to-suppress-rules)
9. [Pre-commit Workflow](#pre-commit-workflow)
10. [Contributing](#contributing)

---

## Introduction

This guide helps team members write code that passes ESLint validation, improving code quality and reducing review time.

### Why ESLint Matters

- **Catches Bugs Early:** Finds potential errors before runtime
- **Enforces Consistency:** Team code looks uniform
- **Improves Maintainability:** Easier to read and modify
- **Reduces Review Time:** Automated style checks
- **Better Type Safety:** TypeScript rules prevent type errors

---

## Running ESLint Locally

### Quick Commands

```bash
# Lint entire codebase
npm run lint

# Auto-fix fixable issues
npm run lint:fix

# Lint specific file
npx eslint path/to/file.ts

# Lint specific directory
npx eslint app/

# Generate HTML report
npm run lint:report

# Type check without linting
npm run type-check
```

### Before Committing

**Always run these commands before committing:**

```bash
# 1. Auto-fix what you can
npm run lint:fix

# 2. Check for remaining issues
npm run lint

# 3. Verify TypeScript types
npm run type-check

# 4. Run tests (if applicable)
npm test
```

### Development Workflow

```bash
# 1. Start development
npm start

# 2. Work on features
# ... coding ...

# 3. Before committing, check your changes
git add .
npm run lint:fix
npm run lint

# 4. If clean, commit
git commit -m "feat: your feature"

# 5. Push
git push
```

---

## IDE Integration

### Visual Studio Code (Recommended)

#### 1. Install ESLint Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search "ESLint"
4. Install "ESLint" by Microsoft

#### 2. Configure VS Code Settings

Create or edit `.vscode/settings.json`:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    "./frontend"
  ],
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

#### 3. Benefits

- **Real-time Feedback:** See errors as you type
- **Auto-fix on Save:** Many issues fixed automatically
- **Inline Suggestions:** Quick fixes available
- **Error Highlights:** Red squiggly lines under problems

#### 4. Keyboard Shortcuts

- **Fix All:** `Ctrl+.` / `Cmd+.` → "Fix all auto-fixable problems"
- **Show Problem:** Hover over red squiggle
- **Go to Next Error:** `F8`
- **Quick Fix:** `Ctrl+.` / `Cmd+.` on error

---

### WebStorm / IntelliJ IDEA

#### 1. Enable ESLint

1. Go to Settings/Preferences
2. Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
3. Check "Automatic ESLint configuration"
4. Check "Run eslint --fix on save"

#### 2. Keyboard Shortcuts

- **Fix ESLint problems:** `Alt+Shift+Enter`
- **Show intention actions:** `Alt+Enter`

---

### Sublime Text

#### 1. Install Packages

1. Install Package Control
2. Install "ESLint" package
3. Install "SublimeLinter" package

#### 2. Configure

Settings → Package Settings → ESLint → Settings - User

```json
{
  "node_path": "/path/to/node",
  "eslint_path": "${project_path}/node_modules/.bin/eslint"
}
```

---

## Common Issues & Solutions

### Issue 1: `@typescript-eslint/no-explicit-any`

**Problem:**
```typescript
const handleData = (data: any) => { ... };  // ❌ Error
```

**Solutions:**

```typescript
// ✅ Option 1: Use proper type
interface Data {
  id: string;
  name: string;
}
const handleData = (data: Data) => { ... };

// ✅ Option 2: Use unknown (safer than any)
const handleData = (data: unknown) => {
  // Must type-check before use
  if (typeof data === 'object' && data !== null) {
    // Use data safely
  }
};

// ✅ Option 3: Use generic type
function handleData<T>(data: T): T {
  return data;
}

// ✅ Option 4: Union type
const handleData = (data: string | number | boolean) => { ... };
```

**When it's okay to use `any`:**
- Never in production code
- Only in tests (with explicit override)
- Legacy code being refactored (temporary, with TODO)

---

### Issue 2: `@typescript-eslint/no-unused-vars`

**Problem:**
```typescript
import { View, Text, Platform, Modal } from 'react-native';  // ❌ Modal unused
const MyComponent = ({ data, onPress, loading }) => {  // ❌ loading unused
  return <View><Text>Hello</Text></View>;
};
```

**Solutions:**

```typescript
// ✅ Remove unused imports
import { View, Text } from 'react-native';

// ✅ Remove unused props
const MyComponent = ({ data, onPress }) => {
  return <View><Text>Hello</Text></View>;
};

// ✅ Or use underscore prefix if intentionally unused
const MyComponent = ({ data, onPress, _loading }) => {
  // _loading signals "intentionally unused"
  return <View><Text>Hello</Text></View>;
};
```

---

### Issue 3: `react-hooks/exhaustive-deps`

**Problem:**
```typescript
// ⚠️ Warning: Missing dependency 'loadData'
useEffect(() => {
  loadData();
}, [userId]);
```

**Solutions:**

```typescript
// ✅ Option 1: Add missing dependency
useEffect(() => {
  loadData();
}, [userId, loadData]);

// ✅ Option 2: Wrap function in useCallback
const loadData = useCallback(() => {
  // implementation
}, [/* dependencies */]);

useEffect(() => {
  loadData();
}, [userId, loadData]);

// ✅ Option 3: Move function inside useEffect
useEffect(() => {
  const loadData = () => {
    // implementation
  };
  loadData();
}, [userId]);

// ✅ Option 4: Use ref for non-reactive callback
const loadDataRef = useRef(loadData);
useEffect(() => {
  loadDataRef.current = loadData;
});

useEffect(() => {
  loadDataRef.current();
}, [userId]);
```

**When to ignore this warning:**
- Almost never
- Only if you fully understand implications
- Must add detailed comment explaining why

---

### Issue 4: `@typescript-eslint/no-var-requires`

**Problem:**
```typescript
const api = require('./api');  // ❌ Use ES6 imports
```

**Solution:**
```typescript
// ✅ Use import statement
import api from './api';
import { helper } from './utils';
import * as utils from './utils';
import type { ApiResponse } from './types';
```

**Exception:**
- Config files (`.js` files) can use `require()`
- Already configured in overrides

---

### Issue 5: `react-hooks/rules-of-hooks`

**Problem:**
```typescript
// ❌ Conditional hook call
function MyComponent({ shouldLoad }) {
  if (shouldLoad) {
    const [data, setData] = useState(null);  // ERROR!
  }
  return <View>...</View>;
}

// ❌ Hook in loop
function MyList({ items }) {
  return items.map(item => {
    const [selected, setSelected] = useState(false);  // ERROR!
    return <Item key={item.id} />;
  });
}
```

**Solutions:**

```typescript
// ✅ Always call hooks at top level
function MyComponent({ shouldLoad }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (shouldLoad) {
      // Load data conditionally
    }
  }, [shouldLoad]);

  return <View>...</View>;
}

// ✅ Move hook to separate component
function ListItem({ item }) {
  const [selected, setSelected] = useState(false);
  return <Item selected={selected} />;
}

function MyList({ items }) {
  return items.map(item => (
    <ListItem key={item.id} item={item} />
  ));
}
```

---

### Issue 6: `react/jsx-no-undef`

**Problem:**
```typescript
// ❌ Component not imported
const MyScreen = () => {
  return <Button onPress={handlePress}>Click</Button>;  // ERROR!
};
```

**Solution:**
```typescript
// ✅ Import component
import { Button } from 'react-native';

const MyScreen = () => {
  return <Button onPress={handlePress}>Click</Button>;
};
```

---

## TypeScript Best Practices

### 1. Always Define Types

**Bad:**
```typescript
const fetchUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};
```

**Good:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const fetchUser = async (id: string): Promise<ApiResponse<User>> => {
  const response = await api.get<User>(`/users/${id}`);
  return {
    success: true,
    data: response.data
  };
};
```

---

### 2. Use Type Inference When Obvious

**Over-typed (unnecessary):**
```typescript
const name: string = 'John';  // Type is obvious
const count: number = 0;
const items: string[] = ['a', 'b', 'c'];
```

**Good:**
```typescript
const name = 'John';  // TypeScript infers string
const count = 0;  // TypeScript infers number
const items = ['a', 'b', 'c'];  // TypeScript infers string[]

// But DO type when not obvious
const user: User = await fetchUser();  // Good practice
```

---

### 3. Use Proper Types for React Native

```typescript
import type {
  ViewStyle,
  TextStyle,
  StyleProp,
  GestureResponderEvent
} from 'react-native';

interface Props {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
}
```

---

### 4. Create Shared Types

**Structure:**
```
types/
  api.types.ts       # API responses, errors
  component.types.ts # Common component props
  navigation.types.ts # Navigation params
  store.types.ts     # Redux/Context types
```

**Example:**
```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Usage
import type { ApiResponse, ApiError } from '@/types/api.types';

async function fetchProducts(): Promise<ApiResponse<Product[]>> {
  // ...
}
```

---

## React & React Native Best Practices

### 1. Component Props

**Always define prop interface:**

```typescript
// ✅ Good
interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  children
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles[variant], style]}
    >
      {loading ? <ActivityIndicator /> : <Text>{title}</Text>}
      {children}
    </TouchableOpacity>
  );
};
```

---

### 2. Use Hooks Correctly

**useEffect:**
```typescript
// ✅ Good - All dependencies included
useEffect(() => {
  const fetchData = async () => {
    const result = await api.get('/data', { userId });
    setData(result.data);
  };

  fetchData();
}, [userId]);  // All external dependencies listed

// ✅ Good - Cleanup function
useEffect(() => {
  const subscription = api.subscribe();

  return () => {
    subscription.unsubscribe();  // Cleanup
  };
}, []);
```

**useCallback:**
```typescript
// ✅ Good - Memoize callback passed to children
const handlePress = useCallback((item: Item) => {
  navigation.navigate('Detail', { itemId: item.id });
}, [navigation]);

// Pass to child components without causing re-renders
<ItemList items={items} onItemPress={handlePress} />
```

**useMemo:**
```typescript
// ✅ Good - Memoize expensive computations
const sortedItems = useMemo(() => {
  return items
    .filter(item => item.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

---

### 3. Conditional Rendering

```typescript
// ✅ Good patterns
{loading && <ActivityIndicator />}
{error && <ErrorMessage error={error} />}
{!loading && !error && <Content data={data} />}
{isLoggedIn ? <Dashboard /> : <Login />}

// ❌ Avoid complex nested ternaries
{isLoggedIn ? (hasData ? <Dashboard /> : <Loading />) : <Login />}

// ✅ Better - Extract to variable or function
const renderContent = () => {
  if (!isLoggedIn) return <Login />;
  if (!hasData) return <Loading />;
  return <Dashboard />;
};

return <View>{renderContent()}</View>;
```

---

### 4. Event Handlers

```typescript
import type { GestureResponderEvent } from 'react-native';

// ✅ Good - Proper typing
const handlePress = (event: GestureResponderEvent): void => {
  console.log('Pressed at:', event.nativeEvent.locationX);
};

const handleChange = (text: string): void => {
  setSearchQuery(text);
};

// ✅ Good - Inline arrow function (simple cases)
<Button onPress={() => navigation.goBack()} />

// ✅ Good - useCallback for complex handlers passed to children
const handleItemPress = useCallback((itemId: string) => {
  navigation.navigate('Detail', { itemId });
}, [navigation]);
```

---

## Writing Clean Code

### 1. Avoid Magic Numbers

```typescript
// ❌ Bad
<View style={{ padding: 16, marginBottom: 8 }}>

// ✅ Good
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

<View style={{ padding: SPACING.md, marginBottom: SPACING.sm }}>
```

---

### 2. Extract Complex Logic

```typescript
// ❌ Bad - Complex logic in JSX
<Text>
  {user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email
    ? user.email.split('@')[0]
    : 'Anonymous'}
</Text>

// ✅ Good - Extract to function
const getUserDisplayName = (user: User): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'Anonymous';
};

<Text>{getUserDisplayName(user)}</Text>
```

---

### 3. Use Early Returns

```typescript
// ❌ Bad - Nested conditions
function MyComponent({ data, loading, error }) {
  if (!loading) {
    if (!error) {
      if (data) {
        return <Content data={data} />;
      } else {
        return <Empty />;
      }
    } else {
      return <Error error={error} />;
    }
  } else {
    return <Loading />;
  }
}

// ✅ Good - Early returns
function MyComponent({ data, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <Error error={error} />;
  if (!data) return <Empty />;

  return <Content data={data} />;
}
```

---

### 4. Component Organization

```typescript
// ✅ Recommended component structure

// 1. Imports
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { GestureResponderEvent } from 'react-native';

// 2. Types
interface Props {
  title: string;
  onPress: () => void;
}

// 3. Constants
const MAX_ITEMS = 10;

// 4. Component
export const MyComponent = ({ title, onPress }: Props) => {
  // 4a. Hooks
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // 4b. Effects
  useEffect(() => {
    // ...
  }, []);

  // 4c. Callbacks
  const handlePress = useCallback((event: GestureResponderEvent) => {
    // ...
  }, []);

  // 4d. Render helpers
  const renderItem = (item: Item) => {
    return <ItemView key={item.id} item={item} />;
  };

  // 4e. Early returns
  if (loading) return <Loading />;

  // 4f. Main render
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text>Press me</Text>
      </TouchableOpacity>
    </View>
  );
};

// 5. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  }
});

// 6. Default export (if needed)
export default MyComponent;
```

---

## When to Suppress Rules

### General Principle
**Suppression should be rare and well-documented.**

### Using ESLint Disable Comments

```typescript
// ❌ Bad - No explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await api.get('/data');

// ✅ Good - With explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy API with dynamic response structure, refactor tracked in JIRA-123
const data: any = await api.get('/legacy-endpoint');

// ✅ Better - Fix the underlying issue
interface LegacyResponse {
  [key: string]: unknown;
}
const data: LegacyResponse = await api.get('/legacy-endpoint');
```

### Valid Suppression Scenarios

1. **Third-party Library Issues**
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- React Native type definitions incomplete
   const component = require('some-legacy-package');
   ```

2. **Generated Code**
   ```typescript
   /* eslint-disable */
   // This file is auto-generated, do not edit manually
   export const GENERATED_DATA = { ... };
   /* eslint-enable */
   ```

3. **Temporary Workaround**
   ```typescript
   // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO: Refactor to include proper dependencies
   useEffect(() => {
     complexFunction();
   }, []);
   ```

### Never Suppress These Rules
- `react-hooks/rules-of-hooks` - Will cause crashes
- `@typescript-eslint/no-unsafe-call` - Type safety critical
- `security/*` rules - Security vulnerabilities

---

## Pre-commit Workflow

### Manual Checklist

Before every commit:

```bash
# 1. Auto-fix issues
npm run lint:fix

# 2. Check for remaining issues
npm run lint

# 3. If errors, fix manually
# ... fix code ...

# 4. Verify TypeScript
npm run type-check

# 5. Run tests (if applicable)
npm test

# 6. Commit
git add .
git commit -m "feat: your feature"
```

### Automated Pre-commit (Future)

Once Husky is configured, this will run automatically:

```bash
git commit -m "feat: your feature"
# → Automatically runs lint-staged
# → Fixes issues automatically
# → Blocks commit if errors remain
```

---

## Contributing

### Adding New Rules

1. Discuss with team in PR or Slack
2. Update `.eslintrc.js`
3. Run linter on entire codebase
4. Document breaking changes
5. Fix issues before merging
6. Update this guide

### Reporting False Positives

If you believe ESLint is incorrectly flagging code:

1. Verify it's actually a false positive (not a real issue)
2. Create GitHub issue with:
   - Rule name
   - Code example
   - Why you believe it's incorrect
   - Suggested fix or override
3. Team will review and decide

### Proposing Best Practices

Have a better pattern? Share it!

1. Fork documentation
2. Add your pattern with examples
3. Submit PR
4. Team review and discussion

---

## Quick Reference

### Most Common Commands

```bash
# Fix auto-fixable issues
npm run lint:fix

# Check all issues
npm run lint

# Check specific file
npx eslint path/to/file.ts

# Type check
npm run type-check

# Full check
npm run type-check && npm run lint
```

### Most Common Fixes

| Issue | Quick Fix |
|-------|-----------|
| Unused import | Remove the import |
| `any` type | Replace with proper type or `unknown` |
| Missing dependency | Add to dependency array |
| require() | Replace with `import` |
| Unused variable | Remove or prefix with `_` |

### Getting Help

- **ESLint Docs:** https://eslint.org/
- **TypeScript ESLint:** https://typescript-eslint.io/
- **React Rules:** https://github.com/jsx-eslint/eslint-plugin-react
- **Team Slack:** #dev-frontend channel
- **Questions:** Ask in daily standup

---

## Additional Resources

### Documentation Links

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [React Plugin Rules](https://github.com/jsx-eslint/eslint-plugin-react)
- [React Hooks Rules](https://reactjs.org/docs/hooks-rules.html)
- [React Native Best Practices](https://reactnative.dev/docs/performance)

### Tools

- [ESLint Playground](https://eslint.org/play/) - Test rules online
- [TypeScript Playground](https://www.typescriptlang.org/play) - Test types
- [AST Explorer](https://astexplorer.net/) - Understand ESLint rules

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Maintained By:** Frontend Team
**Next Review:** December 11, 2025

---

**Questions?** Ask in #dev-frontend Slack channel or during team meetings.
