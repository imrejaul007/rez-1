# Common Tasks Guide

Step-by-step guides for 30+ common development tasks.

## Table of Contents

- [Screen Development](#screen-development)
- [Component Development](#component-development)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Navigation](#navigation)
- [Forms and Validation](#forms-and-validation)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)

---

## Screen Development

### Task 1: Create a New Screen

**Goal**: Add a new screen to the app

**Steps**:

1. **Create the screen file**
```bash
# Create file in app directory
touch app/notifications.tsx
```

2. **Add basic screen structure**
```typescript
// app/notifications.tsx
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from 'expo-router';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Load data
      setLoading(false);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.message}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
```

3. **Add navigation to _layout.tsx**
```typescript
// app/_layout.tsx
<Stack.Screen name="notifications" options={{ headerShown: false }} />
```

4. **Test navigation**
```typescript
// From any screen
import { router } from 'expo-router';

router.push('/notifications');
```

---

### Task 2: Add Dynamic Route Parameters

**Goal**: Create a screen that accepts URL parameters

**Steps**:

1. **Create dynamic route**
```bash
mkdir -p app/product
touch app/product/[id].tsx
```

2. **Access params in component**
```typescript
// app/product/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View>
      <Text>Product ID: {id}</Text>
    </View>
  );
}
```

3. **Navigate with params**
```typescript
// Navigate to product/123
router.push('/product/123');

// Or with query params
router.push({
  pathname: '/product/[id]',
  params: { id: '123' }
});
```

---

## Component Development

### Task 3: Create a Reusable Component

**Goal**: Build a reusable Button component

**Steps**:

1. **Create component file**
```bash
mkdir -p components/ui
touch components/ui/Button.tsx
```

2. **Define props interface**
```typescript
// components/ui/Button.tsx
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}
```

3. **Implement component**
```typescript
export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#5856D6',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#007AFF',
  },
});
```

4. **Use the component**
```typescript
import Button from '@/components/ui/Button';

<Button
  title="Submit"
  onPress={handleSubmit}
  variant="primary"
  loading={isLoading}
/>
```

---

### Task 4: Create Component with Children

**Goal**: Build a Card wrapper component

```typescript
// components/ui/Card.tsx
import { View, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  elevated?: boolean;
}

export default function Card({ children, elevated = false }: Props) {
  return (
    <View style={[styles.card, elevated && styles.elevated]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

// Usage
<Card elevated>
  <Text>Card content</Text>
</Card>
```

---

## API Integration

### Task 5: Create an API Service

**Goal**: Add a new API service for categories

**Steps**:

1. **Define types**
```typescript
// types/category.types.ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  productCount: number;
}

export interface CategoryFilters {
  featured?: boolean;
  limit?: number;
}
```

2. **Create service**
```typescript
// services/categoriesApi.ts
import apiClient from './apiClient';
import type { Category, CategoryFilters } from '@/types/category.types';

export const categoriesApi = {
  getAll: async (filters?: CategoryFilters): Promise<Category[]> => {
    const response = await apiClient.get('/categories', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/slug/${slug}`);
    return response.data;
  },
};
```

3. **Use in component**
```typescript
import { useState, useEffect } from 'react';
import { categoriesApi } from '@/services/categoriesApi';
import type { Category } from '@/types/category.types';

function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll({ featured: true });
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render logic
}
```

---

### Task 6: Handle API Errors

```typescript
async function fetchData() {
  try {
    setLoading(true);
    const data = await api.getData();
    setData(data);
    setError(null);
  } catch (err) {
    const error = err as Error;
    setError(error);

    // Log error
    console.error('API Error:', error);

    // Show user-friendly message
    if (error.message.includes('network')) {
      Alert.alert('Network Error', 'Please check your internet connection');
    } else {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
}
```

---

## State Management

### Task 7: Create a Context Provider

**Goal**: Add global state for notifications

**Steps**:

1. **Define types**
```typescript
// types/notification.types.ts
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}
```

2. **Create context**
```typescript
// contexts/NotificationContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import type { NotificationContextType, Notification } from '@/types/notification.types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
```

3. **Add provider to app**
```typescript
// app/_layout.tsx
import { NotificationProvider } from '@/contexts/NotificationContext';

<NotificationProvider>
  {/* Rest of app */}
</NotificationProvider>
```

4. **Use in component**
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      {notifications.map(n => (
        <TouchableOpacity key={n.id} onPress={() => markAsRead(n.id)}>
          <Text>{n.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## Navigation

### Task 8: Navigate Between Screens

```typescript
import { router } from 'expo-router';

// Simple navigation
router.push('/profile');

// With params
router.push({
  pathname: '/product/[id]',
  params: { id: '123' }
});

// Go back
router.back();

// Replace (no back navigation)
router.replace('/login');

// Navigate to tab
router.push('/(tabs)/earn');
```

---

### Task 9: Pass Data Between Screens

**Method 1: URL Params**
```typescript
// Screen A
router.push({
  pathname: '/product/[id]',
  params: {
    id: '123',
    name: 'Product Name',
    price: '99.99'
  }
});

// Screen B
const { id, name, price } = useLocalSearchParams<{
  id: string;
  name: string;
  price: string;
}>();
```

**Method 2: Context**
```typescript
// Use context for complex data
const { setSelectedProduct } = useProducts();
setSelectedProduct(product);
router.push('/product-detail');

// In detail screen
const { selectedProduct } = useProducts();
```

---

## Forms and Validation

### Task 10: Create a Form with Validation

```typescript
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      // Submit form
      await api.login(email, password);
      router.push('/home');
    } catch (error) {
      setErrors({ email: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email && <Text style={styles.error}>{errors.email}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {errors.password && <Text style={styles.error}>{errors.password}</Text>}

      <Button
        title="Login"
        onPress={handleSubmit}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  error: {
    color: '#ff0000',
    fontSize: 12,
    marginBottom: 8,
  },
});
```

---

## Testing

### Task 11: Write Component Tests

```typescript
// __tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders with title', () => {
    const { getByText } = render(
      <Button title="Click me" onPress={() => {}} />
    );
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPress} />
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalled();
  });

  it('disables when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPress} loading />
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

---

## Debugging

### Task 12: Debug API Calls

```typescript
// Enable request logging
import apiClient from '@/services/apiClient';

apiClient.interceptors.request.use(request => {
  console.log('🔵 Request:', request.method?.toUpperCase(), request.url);
  console.log('📦 Data:', request.data);
  return request;
});

apiClient.interceptors.response.use(
  response => {
    console.log('✅ Response:', response.status, response.config.url);
    console.log('📦 Data:', response.data);
    return response;
  },
  error => {
    console.log('❌ Error:', error.config?.url);
    console.log('📦 Error:', error.response?.data);
    return Promise.reject(error);
  }
);
```

---

## Performance Optimization

### Task 13: Optimize FlatList

```typescript
const ITEM_HEIGHT = 100;

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  // Performance optimizations
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // Use React.memo for renderItem component
/>
```

---

## Quick Reference

### Common Commands

```bash
# Start app
npm start

# Run on device
npm run android
npm run ios

# Tests
npm test
npm run test:watch

# Linting
npm run lint

# Clear cache
npm start -- --clear
```

### Common Imports

```typescript
// React Native
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

// React
import { useState, useEffect, useCallback, useMemo } from 'react';

// Navigation
import { router, useLocalSearchParams } from 'expo-router';

// Components
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
```

---

**Last Updated**: November 2024
**More Tasks**: See individual feature documentation for advanced tasks
