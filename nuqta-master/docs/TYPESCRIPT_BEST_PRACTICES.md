# TypeScript Best Practices - Rez App Frontend

**Purpose:** Establish team guidelines for writing type-safe, maintainable TypeScript code

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Type Definitions](#type-definitions)
3. [Function Typing](#function-typing)
4. [React Component Typing](#react-component-typing)
5. [API and Data Fetching](#api-and-data-fetching)
6. [Error Handling](#error-handling)
7. [Utility Types](#utility-types)
8. [Type Guards](#type-guards)
9. [Common Pitfalls](#common-pitfalls)
10. [Code Review Checklist](#code-review-checklist)

---

## General Principles

### 1. Avoid `any` - Use `unknown` Instead

**❌ Bad:**
```typescript
function processData(data: any) {
  return data.value.toUpperCase(); // No safety
}
```

**✅ Good:**
```typescript
function processData(data: unknown): string {
  if (isValidData(data)) {
    return data.value.toUpperCase();
  }
  throw new Error('Invalid data');
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof data.value === 'string'
  );
}
```

**Why:** `unknown` forces you to check types before use, preventing runtime errors.

### 2. Be Explicit with Return Types

**❌ Bad:**
```typescript
function calculateTotal(items: CartItem[]) { // Return type inferred
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**✅ Good:**
```typescript
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Why:** Explicit return types catch errors when implementation changes and serve as documentation.

### 3. Use Const Assertions for Literal Types

**❌ Bad:**
```typescript
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}; // Type: { PENDING: string; APPROVED: string; REJECTED: string }
```

**✅ Good:**
```typescript
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const; // Type: { readonly PENDING: 'pending'; readonly APPROVED: 'approved'; ... }

type Status = typeof STATUS[keyof typeof STATUS]; // Type: 'pending' | 'approved' | 'rejected'
```

**Why:** Const assertions preserve exact literal types, enabling better type checking.

---

## Type Definitions

### 1. Prefer Interfaces for Object Shapes

**Use Interfaces When:**
- Defining object structures
- Need to extend/implement
- Defining React component props

**Use Type Aliases When:**
- Defining unions or intersections
- Using mapped types
- Creating utility types

**✅ Interface:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface Admin extends User {
  permissions: string[];
}
```

**✅ Type Alias:**
```typescript
type Result<T> = Success<T> | Error;
type Status = 'idle' | 'loading' | 'success' | 'error';
```

### 2. Use Branded Types for Primitive Values

**❌ Bad:**
```typescript
function getUser(userId: string): User { ... }
function getProduct(productId: string): Product { ... }

// Easy to mix up:
const userId = getProductId(); // Oops!
getUser(userId); // Should error but doesn't
```

**✅ Good:**
```typescript
// types/branded.ts
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

function getUser(userId: UserId): User { ... }
function getProduct(productId: ProductId): Product { ... }

// Now this errors:
const userId: UserId = '123' as UserId;
const productId: ProductId = '456' as ProductId;
getUser(productId); // ❌ TypeScript Error!
```

### 3. Use Discriminated Unions

**❌ Bad:**
```typescript
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

function handleResponse(response: ApiResponse) {
  if (response.success) {
    console.log(response.data); // data might be undefined
  }
}
```

**✅ Good:**
```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResponse<T>(response: ApiResponse<T>) {
  if (response.success) {
    console.log(response.data); // TypeScript knows data exists
  } else {
    console.error(response.error); // TypeScript knows error exists
  }
}
```

---

## Function Typing

### 1. Explicit Parameter and Return Types

**❌ Bad:**
```typescript
async function fetchUser(id) { // Implicit 'any'
  const response = await api.get(`/users/${id}`);
  return response.data;
}
```

**✅ Good:**
```typescript
async function fetchUser(id: string): Promise<User> {
  const response = await api.get<{ data: User }>(`/users/${id}`);
  return response.data;
}
```

### 2. Function Overloads for Multiple Signatures

**✅ Good:**
```typescript
// Overload signatures
function formatDate(date: Date): string;
function formatDate(date: string): string;
function formatDate(date: number): string;

// Implementation signature
function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  return d.toISOString();
}

// Usage with proper typing
const result1 = formatDate(new Date()); // ✅
const result2 = formatDate('2024-01-01'); // ✅
const result3 = formatDate(1234567890); // ✅
const result4 = formatDate(null); // ❌ Error
```

### 3. Use Generic Constraints

**❌ Bad:**
```typescript
function getProperty<T>(obj: T, key: string) {
  return obj[key]; // Error: key might not be in obj
}
```

**✅ Good:**
```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Usage
const user = { id: '1', name: 'Alice' };
const name = getProperty(user, 'name'); // ✅ Type: string
const invalid = getProperty(user, 'age'); // ❌ Error: 'age' not in user
```

---

## React Component Typing

### 1. Component Props

**❌ Bad:**
```typescript
function Button({ label, onPress, disabled }: any) {
  return <Pressable onPress={onPress}><Text>{label}</Text></Pressable>;
}
```

**✅ Good:**
```typescript
interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function Button({ label, onPress, disabled = false }: ButtonProps): JSX.Element {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Text>{label}</Text>
    </Pressable>
  );
}

// Alternative: Use React.FC
const Button: React.FC<ButtonProps> = ({ label, onPress, disabled = false }) => {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Text>{label}</Text>
    </Pressable>
  );
};
```

### 2. Event Handlers

**✅ Good:**
```typescript
import { GestureResponderEvent, NativeSyntheticEvent, TextInputChangeEventData } from 'react-native';

interface FormProps {
  onSubmit: () => void;
  onInputChange: (text: string) => void;
}

function Form({ onSubmit, onInputChange }: FormProps) {
  const handlePress = (event: GestureResponderEvent) => {
    console.log('Pressed at:', event.nativeEvent.locationX);
    onSubmit();
  };

  const handleChangeText = (text: string) => {
    onInputChange(text);
  };

  return (
    <>
      <TextInput onChangeText={handleChangeText} />
      <Pressable onPress={handlePress}>
        <Text>Submit</Text>
      </Pressable>
    </>
  );
}
```

### 3. Children Props

**✅ Good:**
```typescript
interface ContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function Container({ children, style }: ContainerProps) {
  return <View style={style}>{children}</View>;
}
```

**For render props:**
```typescript
interface ListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function List<T>({ data, renderItem }: ListProps<T>) {
  return (
    <View>
      {data.map((item, index) => (
        <View key={index}>{renderItem(item, index)}</View>
      ))}
    </View>
  );
}
```

---

## API and Data Fetching

### 1. Type API Responses

**✅ Good:**
```typescript
// types/api.ts
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    total: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// services/userApi.ts
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(userId: string): Promise<User> {
  const response = await api.get<ApiResponse<User>>(`/users/${userId}`);

  if (response.success) {
    return response.data;
  } else {
    throw new Error(response.error.message);
  }
}
```

### 2. Custom Hooks Return Types

**✅ Good:**
```typescript
interface UseUserDataReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useUserData(userId: string): UseUserDataReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUser(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}
```

---

## Error Handling

### 1. Proper Error Catching

**❌ Bad:**
```typescript
try {
  await riskyOperation();
} catch (error: any) {
  console.error(error.message);
}
```

**✅ Good:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  } else if (typeof error === 'string') {
    console.error('String error:', error);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 2. Custom Error Classes

**✅ Good:**
```typescript
// utils/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
try {
  await api.call();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error [${error.code}]:`, error.message);
  } else if (error instanceof ValidationError) {
    console.error(`Validation error in ${error.field}:`, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Utility Types

### 1. Built-in Utility Types

**Partial - Make all properties optional:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string; }

function updateUser(id: string, updates: Partial<User>) {
  // ...
}
```

**Required - Make all properties required:**
```typescript
interface Config {
  apiUrl?: string;
  timeout?: number;
}

type RequiredConfig = Required<Config>;
// { apiUrl: string; timeout: number; }
```

**Pick - Select specific properties:**
```typescript
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string; }
```

**Omit - Exclude specific properties:**
```typescript
type UserWithoutEmail = Omit<User, 'email'>;
// { id: string; name: string; }
```

**Record - Create object type with keys:**
```typescript
type UserRoles = Record<string, { permissions: string[] }>;
// { [key: string]: { permissions: string[] } }
```

### 2. Custom Utility Types

**DeepPartial:**
```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Usage
type PartialConfig = DeepPartial<{
  api: { url: string; timeout: number };
  cache: { enabled: boolean };
}>;
```

**NonNullableFields:**
```typescript
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

// Usage
interface MaybeUser {
  id?: string;
  name?: string;
}

type User = NonNullableFields<MaybeUser>;
// { id: string; name: string; }
```

---

## Type Guards

### 1. Basic Type Guards

**✅ Good:**
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}
```

### 2. Object Type Guards

**✅ Good:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

// Usage
function processData(data: unknown) {
  if (isUser(data)) {
    console.log(data.email); // TypeScript knows data is User
  }
}
```

### 3. Discriminated Union Type Guards

**✅ Good:**
```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'square'; size: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'square':
      return shape.size ** 2;
  }
}
```

---

## Common Pitfalls

### 1. Don't Use Type Assertions Unless Necessary

**❌ Bad:**
```typescript
const user = getUserData() as User; // Unsafe - bypasses type checking
```

**✅ Good:**
```typescript
const userData = getUserData();
if (isUser(userData)) {
  const user: User = userData; // Safe - validated at runtime
}
```

**When to use `as`:**
- Narrowing from union types
- Dealing with DOM elements
- You KNOW more than TypeScript (use sparingly)

### 2. Avoid Enum - Use Const Objects

**❌ Bad (Enums generate runtime code):**
```typescript
enum Status {
  Pending = 'pending',
  Active = 'active',
  Completed = 'completed'
}
```

**✅ Good (Const objects are compile-time only):**
```typescript
const Status = {
  Pending: 'pending',
  Active: 'active',
  Completed: 'completed'
} as const;

type Status = typeof Status[keyof typeof Status];
```

### 3. Don't Overuse Optional Properties

**❌ Bad:**
```typescript
interface User {
  id?: string;
  name?: string;
  email?: string;
}
```

**✅ Good:**
```typescript
// If truly optional, separate interfaces
interface UserBase {
  id: string;
  name: string;
}

interface RegisteredUser extends UserBase {
  email: string;
  verified: boolean;
}

interface GuestUser extends UserBase {
  sessionId: string;
}

type User = RegisteredUser | GuestUser;
```

### 4. Handle Null and Undefined Explicitly

**❌ Bad:**
```typescript
function getUser(id: string): User | undefined {
  // ...
}

const name = getUser('123').name; // Runtime error if undefined
```

**✅ Good:**
```typescript
function getUser(id: string): User | undefined {
  // ...
}

const user = getUser('123');
const name = user?.name ?? 'Anonymous'; // Safe access with fallback
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] No `any` types (or justified with comment)
- [ ] All exported functions have return types
- [ ] Complex types are defined in `types/` directory
- [ ] Type assertions have justification comments
- [ ] Error handling doesn't use `catch (error: any)`
- [ ] Optional chaining used for nullable values
- [ ] React component props have interfaces
- [ ] API responses have proper types
- [ ] No unused imports or variables

### For Reviewers

- [ ] Types accurately represent data structures
- [ ] No unsafe type assertions
- [ ] Generic types have appropriate constraints
- [ ] Union types use discriminated unions where applicable
- [ ] Runtime validation for external data
- [ ] Proper use of utility types
- [ ] Type guards implemented correctly

---

## Resources

### Internal Resources
- [TypeScript Audit Report](./TYPESCRIPT_AUDIT_REPORT.md)
- [TypeScript Strict Mode Roadmap](./TYPESCRIPT_STRICT_MODE_ROADMAP.md)
- [TypeScript Quick Reference](./TYPESCRIPT_QUICK_REFERENCE.md)

### External Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Total TypeScript](https://www.totaltypescript.com/)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Type Coverage](https://github.com/plantain-00/type-coverage)
- [ts-prune](https://github.com/nadeesha/ts-prune) - Find unused exports

---

## Questions?

If you're unsure about a typing pattern:
1. Check this guide first
2. Search TypeScript Handbook
3. Ask in team chat
4. Open discussion issue

**Remember:** Better to ask than to use `any`!

---

**Last Updated:** 2025-11-11
**Maintainer:** Engineering Team
**Version:** 1.0
