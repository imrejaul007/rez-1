# TypeScript Quick Reference - Rez App

**Quick lookup guide for common TypeScript patterns and solutions**

---

## At a Glance

| Current State | Target State |
|---------------|--------------|
| ⚠️ Type Coverage: 63% | ✅ Type Coverage: 90%+ |
| ❌ `any` usage: 1,292 | ✅ `any` usage: <50 |
| ❌ `as any`: 841 | ✅ `as any`: <50 |
| ✅ Strict Mode: Enabled | ✅ Fully Enforced |

---

## Common Patterns Cheat Sheet

### Replace `any` with Better Types

```typescript
// ❌ BAD: any
function process(data: any) { ... }

// ✅ GOOD: unknown with type guard
function process(data: unknown) {
  if (isValidData(data)) { ... }
}

// ✅ GOOD: Generic
function process<T>(data: T) { ... }

// ✅ GOOD: Specific type
function process(data: User) { ... }
```

### Function Return Types

```typescript
// ❌ BAD: No return type
async function fetchUser(id: string) { ... }

// ✅ GOOD: Explicit return type
async function fetchUser(id: string): Promise<User> { ... }
```

### Error Handling

```typescript
// ❌ BAD
catch (error: any) {
  console.log(error.message);
}

// ✅ GOOD
catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log('Unknown error', error);
  }
}
```

### API Responses

```typescript
// ❌ BAD
interface Response {
  success: boolean;
  data?: any;
  error?: string;
}

// ✅ GOOD: Discriminated union
type Response<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### React Components

```typescript
// ✅ GOOD
interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function Button({ label, onPress, disabled = false }: ButtonProps): JSX.Element {
  return <Pressable onPress={onPress} disabled={disabled}>
    <Text>{label}</Text>
  </Pressable>;
}
```

### Custom Hooks

```typescript
// ✅ GOOD
interface UseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useData<T>(url: string): UseDataReturn<T> {
  // implementation
}
```

---

## Type Guard Templates

### Basic Type Guards

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

### Object Type Guards

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    isObject(value) &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'email' in value && typeof value.email === 'string'
  );
}
```

### Array Type Guards

```typescript
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}
```

---

## Utility Types Quick Reference

### Built-in Utility Types

```typescript
// Partial - Make all properties optional
type PartialUser = Partial<User>;

// Required - Make all properties required
type RequiredUser = Required<PartialUser>;

// Pick - Select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - Exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// Record - Object with specific key/value types
type UserMap = Record<string, User>;

// NonNullable - Remove null and undefined
type DefiniteUser = NonNullable<User | null | undefined>;

// ReturnType - Extract function return type
type UserResult = ReturnType<typeof getUser>;

// Parameters - Extract function parameter types
type UserParams = Parameters<typeof getUser>;

// Awaited - Extract Promise resolved type
type UserData = Awaited<Promise<User>>;
```

### Custom Utility Types

```typescript
// DeepPartial - Nested optional properties
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// DeepReadonly - Nested readonly properties
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// NonNullableFields - Remove null/undefined from all fields
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

// RequireAtLeastOne - At least one property required
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
```

---

## React Native Specific Types

### Event Types

```typescript
import {
  GestureResponderEvent,
  NativeSyntheticEvent,
  TextInputChangeEventData,
  TextInputSubmitEditingEventData,
} from 'react-native';

// Touch events
const handlePress = (event: GestureResponderEvent) => {
  console.log(event.nativeEvent.locationX);
};

// Input change
const handleChange = (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
  console.log(event.nativeEvent.text);
};

// Or simplified
const handleChangeText = (text: string) => {
  console.log(text);
};
```

### Style Types

```typescript
import { StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';

interface ComponentProps {
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}
```

### Navigation Types

```typescript
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

// Define navigation stack
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: { section?: string };
};

// Screen props
type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
}
```

---

## Common Scenarios

### Scenario 1: API Call with Unknown Response

```typescript
// Problem: API returns unknown data
async function fetchData(url: string) {
  const response = await fetch(url);
  const data = await response.json(); // Type: any
  return data;
}

// Solution: Type guard + validation
interface ExpectedData {
  id: string;
  value: number;
}

function isExpectedData(data: unknown): data is ExpectedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data && typeof data.id === 'string' &&
    'value' in data && typeof data.value === 'number'
  );
}

async function fetchData(url: string): Promise<ExpectedData> {
  const response = await fetch(url);
  const data: unknown = await response.json();

  if (!isExpectedData(data)) {
    throw new Error('Invalid response data');
  }

  return data;
}
```

### Scenario 2: Dynamic Object Keys

```typescript
// Problem: Accessing dynamic keys
const obj: Record<string, any> = getData();
const value = obj[key]; // Type: any

// Solution 1: Type guard
function hasKey<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

if (hasKey(obj, 'specificKey')) {
  const value = obj.specificKey; // Type: unknown (safe to refine further)
}

// Solution 2: Defined interface
interface KnownObject {
  [key: string]: number | string;
}

const obj: KnownObject = getData();
const value = obj[key]; // Type: number | string
```

### Scenario 3: Form State

```typescript
// Problem: Form with multiple fields
const [formState, setFormState] = useState<any>({});

// Solution: Defined interface
interface FormState {
  name: string;
  email: string;
  age: number;
  newsletter: boolean;
}

const [formState, setFormState] = useState<FormState>({
  name: '',
  email: '',
  age: 0,
  newsletter: false,
});

const handleChange = <K extends keyof FormState>(
  field: K,
  value: FormState[K]
) => {
  setFormState(prev => ({ ...prev, [field]: value }));
};
```

### Scenario 4: Context with Complex State

```typescript
// Problem: Context value typed as any
const MyContext = createContext<any>(null);

// Solution: Strongly typed context
interface MyContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const MyContext = createContext<MyContextValue | null>(null);

function useMyContext(): MyContextValue {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyContextProvider');
  }
  return context;
}
```

---

## Migration Strategies

### Strategy 1: Top-Down (Services First)

1. Start with API/service layer
2. Define strict response types
3. Propagate types upward to hooks
4. Then to components

```typescript
// Step 1: Service
interface User { ... }
async function getUser(id: string): Promise<User> { ... }

// Step 2: Hook
interface UseUserReturn {
  user: User | null;
  loading: boolean;
}
function useUser(id: string): UseUserReturn { ... }

// Step 3: Component
interface ProfileProps {
  userId: string;
}
function Profile({ userId }: ProfileProps) {
  const { user, loading } = useUser(userId);
}
```

### Strategy 2: Critical Path First

1. Identify high-risk areas (auth, payment, cart)
2. Type those completely
3. Then move to other areas

```typescript
// Priority 1: Authentication
interface AuthState { ... }
interface LoginCredentials { ... }

// Priority 2: Payment
interface PaymentDetails { ... }
interface PaymentResult { ... }

// Priority 3: Shopping Cart
interface CartItem { ... }
interface Cart { ... }
```

### Strategy 3: New Code First

1. All new code must be fully typed
2. Gradually refactor old code
3. Use ESLint to enforce

```javascript
// .eslintrc.js
rules: {
  '@typescript-eslint/no-explicit-any': 'error', // Block new 'any'
}
```

---

## Troubleshooting

### Issue: "Object is possibly 'undefined'"

```typescript
// ❌ Error
const name = user.name; // Error if user can be undefined

// ✅ Fix 1: Optional chaining
const name = user?.name;

// ✅ Fix 2: Nullish coalescing
const name = user?.name ?? 'Unknown';

// ✅ Fix 3: Type guard
if (user) {
  const name = user.name; // OK
}
```

### Issue: "Type 'X' is not assignable to type 'Y'"

```typescript
// Usually means types don't match

// Check 1: Are types actually compatible?
// Check 2: Do you need a type assertion? (rarely)
// Check 3: Should you update the type definition?

// Example
interface A { id: string; }
interface B { id: number; }

const a: A = { id: '123' };
const b: B = a; // ❌ Error: incompatible

// Fix: Make them compatible or use different approach
```

### Issue: "Property 'X' does not exist on type 'Y'"

```typescript
// ❌ Error
const value = obj.unknownProperty; // Error

// ✅ Fix 1: Add to type definition
interface Obj {
  unknownProperty: string;
}

// ✅ Fix 2: Use type guard
if ('unknownProperty' in obj) {
  const value = obj.unknownProperty;
}

// ✅ Fix 3: Index signature
interface Obj {
  [key: string]: unknown;
}
```

---

## Commands

```bash
# Type check without emitting
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch

# Show config
npx tsc --showConfig

# Measure type coverage
npx type-coverage

# Detailed type coverage
npx type-coverage --detail

# Find unused exports
npx ts-prune
```

---

## ESLint Rules

```javascript
// Recommended rules for .eslintrc.js
module.exports = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
    }],
  }
};
```

---

## When to Use What

| Use Case | Type to Use |
|----------|-------------|
| Unknown external data | `unknown` |
| Type that could be anything | `unknown` (not `any`) |
| Truly dynamic/impossible to type | `any` with comment |
| API response | Discriminated union |
| Error handling | `instanceof Error` check |
| React component props | Interface |
| Function return | Explicit type |
| Union of literals | `as const` objects |
| Optional value | `T \| null` or `T \| undefined` |
| Dynamic keys | `Record<string, T>` |

---

## Quick Wins Checklist

Focus on these for immediate improvement:

- [ ] Fix 7 syntax errors
- [ ] Replace `any` in auth code
- [ ] Replace `any` in payment code
- [ ] Replace `any` in cart code
- [ ] Add return types to all services
- [ ] Add return types to all hooks
- [ ] Create type guards for API responses
- [ ] Type all context values
- [ ] Enable `noUnusedLocals` and `noUnusedParameters`

---

## Resources

- **Full Audit:** [TYPESCRIPT_AUDIT_REPORT.md](./TYPESCRIPT_AUDIT_REPORT.md)
- **Roadmap:** [TYPESCRIPT_STRICT_MODE_ROADMAP.md](./TYPESCRIPT_STRICT_MODE_ROADMAP.md)
- **Best Practices:** [TYPESCRIPT_BEST_PRACTICES.md](./TYPESCRIPT_BEST_PRACTICES.md)
- **Enhanced Config:** [TYPESCRIPT_CONFIGURATION_ENHANCED.json](./TYPESCRIPT_CONFIGURATION_ENHANCED.json)

---

**Quick Tip:** When in doubt, use `unknown` and narrow with type guards. It's always safer than `any`!

**Last Updated:** 2025-11-11
