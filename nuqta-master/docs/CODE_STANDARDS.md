# Code Standards and Guidelines

Comprehensive coding standards for the Rez App frontend codebase.

## Table of Contents

- [TypeScript Guidelines](#typescript-guidelines)
- [React Native Best Practices](#react-native-best-practices)
- [Component Patterns](#component-patterns)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Styling Conventions](#styling-conventions)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Security](#security)
- [Error Handling](#error-handling)

---

## TypeScript Guidelines

### General Rules

1. **Always use TypeScript** - No `.js` or `.jsx` files
2. **Enable strict mode** - Already configured in `tsconfig.json`
3. **Explicit types** - Avoid `any`, use proper types
4. **Type imports** - Use `import type` for type-only imports

### Type Definitions

```typescript
// ✅ Good - Explicit types
interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

function getProduct(id: string): Promise<Product> {
  // Implementation
}

// ❌ Bad - Using any
function getProduct(id: any): any {
  // Implementation
}
```

### Interfaces vs Types

```typescript
// ✅ Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Use types for unions, primitives, utilities
type Status = 'pending' | 'approved' | 'rejected';
type ID = string | number;
type Nullable<T> = T | null;

// ✅ Extend interfaces
interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

// ✅ Compose types
type UserWithStatus = User & { status: Status };
```

### Generics

```typescript
// ✅ Good - Reusable generic function
function createArray<T>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

const numbers = createArray<number>(3, 0); // [0, 0, 0]
const strings = createArray<string>(2, 'hello'); // ['hello', 'hello']

// ✅ Good - Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>;
}
```

### Type Imports

```typescript
// ✅ Good - Type-only imports
import type { Product } from '@/types/product.types';
import type { FC } from 'react';

// ✅ Good - Mixed imports
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// ❌ Bad - Importing types without 'type'
import { Product } from '@/types/product.types';
```

### Utility Types

```typescript
// Built-in utility types
type Partial<T>         // Make all properties optional
type Required<T>        // Make all properties required
type Readonly<T>        // Make all properties readonly
type Pick<T, K>         // Pick specific properties
type Omit<T, K>         // Omit specific properties
type Record<K, V>       // Create object type with keys K and values V

// Examples
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

type PartialProduct = Partial<Product>;  // All optional
type ProductPreview = Pick<Product, 'id' | 'name' | 'price'>;  // Subset
type ProductWithoutId = Omit<Product, 'id'>;  // Exclude id
```

### Enums vs Union Types

```typescript
// ✅ Prefer union types
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

// Use enums only when you need reverse mapping
enum ErrorCode {
  NotFound = 404,
  Unauthorized = 401,
  ServerError = 500,
}
```

---

## React Native Best Practices

### Component Structure

```typescript
// ✅ Good component structure
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { FC } from 'react';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const Button: FC<Props> = ({ title, onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Button;
```

### Hooks Rules

```typescript
// ✅ Good - Hooks at top level
function MyComponent() {
  const [count, setCount] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    // Effect logic
  }, []);

  // Component logic
}

// ❌ Bad - Conditional hooks
function MyComponent({ condition }) {
  if (condition) {
    const [count, setCount] = useState(0); // Wrong!
  }
}

// ✅ Good - Conditional effect logic
function MyComponent({ condition }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (condition) {
      // Effect logic
    }
  }, [condition]);
}
```

### UseEffect Dependencies

```typescript
// ✅ Good - Include all dependencies
useEffect(() => {
  fetchData(userId, productId);
}, [userId, productId]);

// ❌ Bad - Missing dependencies
useEffect(() => {
  fetchData(userId, productId);
}, []); // eslint warning

// ✅ Good - Use useCallback for functions
const fetchData = useCallback(async () => {
  const data = await api.getData();
  setData(data);
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Memoization

```typescript
// ✅ Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// ✅ Use useCallback for functions passed to children
const handlePress = useCallback(() => {
  console.log('Pressed');
}, []);

// ✅ Use React.memo for pure components
const ProductCard = React.memo(({ product }: Props) => {
  return (
    <View>
      <Text>{product.name}</Text>
    </View>
  );
});
```

---

## Component Patterns

### Functional Components

```typescript
// ✅ Prefer function declarations
function ProductCard({ product }: Props) {
  return <View>{/* Content */}</View>;
}

// ✅ Or arrow functions with explicit type
const ProductCard: FC<Props> = ({ product }) => {
  return <View>{/* Content */}</View>;
};

// ❌ Avoid class components (unless necessary)
class ProductCard extends Component<Props> {
  // Use functional components instead
}
```

### Props Pattern

```typescript
// ✅ Good - Explicit interface
interface Props {
  // Required props
  id: string;
  name: string;

  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  disabled?: boolean;

  // Event handlers
  onPress?: () => void;
  onLongPress?: () => void;

  // Children
  children?: React.ReactNode;

  // Style overrides
  style?: StyleProp<ViewStyle>;
}

function MyComponent({
  id,
  name,
  variant = 'primary',
  disabled = false,
  onPress,
  style,
}: Props) {
  // Component logic
}

// ❌ Bad - Props as any
function MyComponent(props: any) {
  // Don't do this
}
```

### Render Props Pattern

```typescript
// ✅ Good - Render prop pattern
interface DataLoaderProps<T> {
  fetchData: () => Promise<T>;
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataLoader<T>({ fetchData, children }: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fetchData]);

  return <>{children(data, loading, error)}</>;
}

// Usage
<DataLoader fetchData={fetchProducts}>
  {(products, loading, error) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    return <ProductList products={products} />;
  }}
</DataLoader>
```

### Compound Components

```typescript
// ✅ Good - Compound component pattern
interface CardProps {
  children: React.ReactNode;
}

function Card({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

Card.Header = function CardHeader({ children }: CardProps) {
  return <View style={styles.header}>{children}</View>;
};

Card.Body = function CardBody({ children }: CardProps) {
  return <View style={styles.body}>{children}</View>;
};

Card.Footer = function CardFooter({ children }: CardProps) {
  return <View style={styles.footer}>{children}</View>;
};

// Usage
<Card>
  <Card.Header>
    <Text>Title</Text>
  </Card.Header>
  <Card.Body>
    <Text>Content</Text>
  </Card.Body>
  <Card.Footer>
    <Button title="Action" />
  </Card.Footer>
</Card>
```

---

## State Management

### Context Pattern

```typescript
// ✅ Good - Context with TypeScript
import { createContext, useContext, useState, useCallback } from 'react';
import type { FC, ReactNode } from 'react';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

### Local State

```typescript
// ✅ Good - useState for simple state
const [isOpen, setIsOpen] = useState(false);
const [text, setText] = useState('');
const [count, setCount] = useState(0);

// ✅ Good - useState with object (only for related state)
const [form, setForm] = useState({
  email: '',
  password: '',
});

// Update specific field
setForm(prev => ({ ...prev, email: 'new@email.com' }));

// ✅ Good - useReducer for complex state
type State = {
  loading: boolean;
  data: Product[] | null;
  error: Error | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Product[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

function MyComponent() {
  const [state, dispatch] = useReducer(reducer, {
    loading: false,
    data: null,
    error: null,
  });
}
```

---

## API Integration

### Service Pattern

```typescript
// ✅ Good - API service structure
// services/productsApi.ts
import apiClient from './apiClient';
import type { Product, ProductFilters } from '@/types/product.types';

export const productsApi = {
  /**
   * Get all products with optional filters
   */
  getAll: async (filters?: ProductFilters): Promise<Product[]> => {
    try {
      const response = await apiClient.get('/products', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  },

  /**
   * Get single product by ID
   */
  getById: async (id: string): Promise<Product> => {
    try {
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create new product
   */
  create: async (data: Omit<Product, 'id'>): Promise<Product> => {
    try {
      const response = await apiClient.post('/products', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  },
};
```

### Error Handling

```typescript
// ✅ Good - Proper error handling
async function fetchProducts() {
  try {
    setLoading(true);
    const products = await productsApi.getAll();
    setProducts(products);
    setError(null);
  } catch (err) {
    const error = err as Error;
    setError(error);
    console.error('Failed to fetch products:', error);

    // Show user-friendly error
    Alert.alert(
      'Error',
      'Failed to load products. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setLoading(false);
  }
}
```

---

## Styling Conventions

### StyleSheet

```typescript
// ✅ Good - StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

// ❌ Bad - Inline styles
<View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
```

### Dynamic Styles

```typescript
// ✅ Good - Conditional styles
<View style={[
  styles.button,
  disabled && styles.disabled,
  variant === 'primary' && styles.primary,
]} />

// ✅ Good - Dynamic values
<View style={[
  styles.container,
  { backgroundColor: theme.backgroundColor }
]} />
```

### Responsive Design

```typescript
// ✅ Good - Use dimensions
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    maxWidth: 400,
  },
});

// ✅ Good - Percentage-based
const styles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 400,
  },
});
```

---

## Accessibility

### Labels and Roles

```typescript
// ✅ Good - Accessibility labels
<TouchableOpacity
  accessible
  accessibilityLabel="Add to cart"
  accessibilityRole="button"
  accessibilityHint="Double tap to add product to your cart"
  onPress={handleAddToCart}
>
  <Text>Add to Cart</Text>
</TouchableOpacity>

// ✅ Good - Image accessibility
<Image
  source={{ uri: product.image }}
  accessible
  accessibilityLabel={product.name}
  accessibilityRole="image"
/>

// ✅ Good - Input accessibility
<TextInput
  accessible
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email address"
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
/>
```

### Focus Management

```typescript
// ✅ Good - Auto-focus important elements
const inputRef = useRef<TextInput>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

<TextInput ref={inputRef} />
```

---

## Performance

### List Optimization

```typescript
// ✅ Good - FlatList optimization
<FlatList
  data={products}
  renderItem={({ item }) => <ProductCard product={item} />}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Image Optimization

```typescript
// ✅ Good - Use expo-image
import { Image } from 'expo-image';

<Image
  source={{ uri: product.image }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

## Security

### Input Sanitization

```typescript
// ✅ Good - Sanitize user input
import { sanitizeInput } from '@/utils/inputSanitization';

const handleSubmit = () => {
  const cleanInput = sanitizeInput(userInput);
  // Use cleanInput
};
```

### Secure Storage

```typescript
// ✅ Good - Use SecureStore for sensitive data
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('authToken', token);

// Retrieve token
const token = await SecureStore.getItemAsync('authToken');

// ❌ Bad - AsyncStorage for sensitive data
await AsyncStorage.setItem('authToken', token); // Don't do this
```

---

## Error Handling

### Error Boundaries

```typescript
// ✅ Good - Error boundary
import ErrorBoundary from '@/components/common/ErrorBoundary';

<ErrorBoundary fallback={<ErrorScreen />}>
  <MyComponent />
</ErrorBoundary>
```

### Try-Catch

```typescript
// ✅ Good - Proper error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Handle unknown error
    console.error('Unexpected error:', error);
  }
  throw error; // Re-throw if needed
}
```

---

**Last Updated**: November 2024
**Questions?** Check [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) or ask in Slack
