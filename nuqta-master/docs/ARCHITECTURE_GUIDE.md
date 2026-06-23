# Architecture Guide

Comprehensive guide to Rez App's architecture, patterns, and design decisions.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Routing & Navigation](#routing--navigation)
- [State Management](#state-management)
- [API Architecture](#api-architecture)
- [Real-time Features](#real-time-features)
- [Offline Support](#offline-support)
- [Media Handling](#media-handling)
- [Security Patterns](#security-patterns)
- [Performance Strategy](#performance-strategy)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│                     (Expo 51)                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Screens  │  │ Components │  │   Hooks    │       │
│  │  (Routes)  │  │   (UI)     │  │  (Logic)   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│         │              │                │               │
│  ┌──────▼──────────────▼────────────────▼──────┐      │
│  │          Context Providers (State)           │      │
│  │  Auth│Cart│Wishlist│Profile│Notifications   │      │
│  └──────────────────┬───────────────────────────┘      │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────┐      │
│  │         Services Layer (API Calls)           │      │
│  │    Products│Stores│Orders│Payments│Uploads   │      │
│  └──────────────────┬───────────────────────────┘      │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    ┌───▼───┐   ┌────▼────┐   ┌───▼────┐
    │  REST │   │ WebSocket│   │External│
    │  API  │   │  (Socket │   │Services│
    │       │   │   .io)   │   │(Stripe)│
    └───────┘   └──────────┘   └────────┘
```

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React Native 0.74.5 | Cross-platform mobile UI |
| **Build Tool** | Expo 51 | Development & build tooling |
| **Language** | TypeScript 5.3 | Type-safe development |
| **Navigation** | Expo Router 3.5 | File-based routing |
| **State** | React Context API | Global state management |
| **HTTP Client** | Axios | REST API communication |
| **Real-time** | Socket.io-client | WebSocket connections |
| **Storage** | AsyncStorage | Local data persistence |
| **Payments** | Stripe & Razorpay | Payment processing |
| **Media** | Cloudinary | Image/video uploads |

---

## Routing & Navigation

### Expo Router (File-Based)

We use Expo Router for navigation, which provides:
- File-based routing (like Next.js)
- Type-safe navigation
- Deep linking support
- Tab navigation
- Stack navigation

**Route Structure**:

```
app/
├── _layout.tsx              # Root layout (providers)
├── index.tsx                # Entry point (/)
├── (tabs)/                  # Tab group
│   ├── _layout.tsx          # Tab configuration
│   ├── index.tsx            # Home tab (/)
│   ├── earn.tsx             # Earn tab (/earn)
│   ├── play.tsx             # Play tab (/play)
│   └── profile.tsx          # Profile tab (/profile)
├── product/
│   └── [id].tsx             # Dynamic route (/product/:id)
└── sign-in.tsx              # Auth screen (/sign-in)
```

**Navigation Flow**:

```typescript
// Programmatic navigation
import { router } from 'expo-router';

// Push to route
router.push('/product/123');

// Push with params
router.push({
  pathname: '/product/[id]',
  params: { id: '123', source: 'search' }
});

// Go back
router.back();

// Replace (no history)
router.replace('/login');
```

**Deep Linking**:

```typescript
// Handle deep links
// rezapp://product/123
// https://rezapp.com/product/123

// Automatically handled by Expo Router based on file structure
```

---

## State Management

### Context-Based Architecture

We use React Context API for global state, organized by domain:

```
contexts/
├── AuthContext.tsx          # User authentication
├── CartContext.tsx          # Shopping cart
├── WishlistContext.tsx      # User wishlist
├── ProfileContext.tsx       # User profile
├── OffersContext.tsx        # Deals/offers
├── CategoryContext.tsx      # Categories
├── LocationContext.tsx      # User location
├── SocketContext.tsx        # WebSocket connection
├── NotificationContext.tsx  # Notifications
├── GamificationContext.tsx  # Points/achievements
├── SubscriptionContext.tsx  # Subscription status
├── SecurityContext.tsx      # Security features
└── OfflineQueueContext.tsx  # Offline sync
```

### Context Pattern

```typescript
// 1. Define types
interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  total: number;
}

// 2. Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// 3. Provider component
export function CartProvider({ children }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // State logic
  const addItem = async (item: CartItem) => {
    // API call + local state update
    await cartApi.add(item);
    setItems(prev => [...prev, item]);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, total }}>
      {children}
    </CartContext.Provider>
  );
}

// 4. Custom hook
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be in CartProvider');
  return context;
}
```

### Provider Hierarchy

Providers are nested in `app/_layout.tsx`:

```typescript
<ErrorBoundary>
  <OfflineQueueProvider>      # Offline sync (outermost)
    <AppProvider>              # App-wide state
      <AuthProvider>           # Authentication
        <SubscriptionProvider> # Subscription
          <SocketProvider>     # Real-time
            <CartProvider>     # Cart
              {/* App content */}
            </CartProvider>
          </SocketProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </AppProvider>
  </OfflineQueueProvider>
</ErrorBoundary>
```

**Why this order?**
1. **ErrorBoundary**: Catches all errors
2. **OfflineQueue**: Manages offline operations
3. **App**: Global app state
4. **Auth**: User session (needed by others)
5. **Socket**: Real-time (needs auth)
6. **Cart**: Shopping (needs auth + socket)

---

## API Architecture

### Service Layer Pattern

All API calls go through services:

```
services/
├── apiClient.ts             # Axios instance with interceptors
├── authApi.ts               # Authentication endpoints
├── productsApi.ts           # Products CRUD
├── cartApi.ts               # Cart operations
├── ordersApi.ts             # Order management
└── ...
```

### API Client Configuration

```typescript
// services/apiClient.ts
import axios from 'axios';
import { API_CONFIG } from '@/config/env';
import { getAuthToken, refreshAuthToken } from '@/utils/auth';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        router.replace('/sign-in');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Service Structure

```typescript
// services/productsApi.ts
import apiClient from './apiClient';
import type { Product, ProductFilters } from '@/types/product.types';

export const productsApi = {
  // GET /products
  getAll: async (filters?: ProductFilters): Promise<Product[]> => {
    const response = await apiClient.get('/products', { params: filters });
    return response.data;
  },

  // GET /products/:id
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  // POST /products
  create: async (data: Omit<Product, 'id'>): Promise<Product> => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  // PATCH /products/:id
  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch(`/products/${id}`, data);
    return response.data;
  },

  // DELETE /products/:id
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
```

---

## Real-time Features

### WebSocket Architecture (Socket.io)

```typescript
// contexts/SocketContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/env';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(API_CONFIG.baseUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const emit = (event: string, data: any) => {
    socket?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socket?.on(event, callback);
  };

  return (
    <SocketContext.Provider value={{ socket, connected, emit, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be in SocketProvider');
  return context;
}
```

**Usage**:

```typescript
// Listen for real-time updates
const { on } = useSocket();

useEffect(() => {
  on('cart:updated', (data) => {
    updateCart(data);
  });

  on('order:status_changed', (data) => {
    showNotification(data);
  });
}, []);
```

---

## Offline Support

### Offline Queue System

```typescript
// contexts/OfflineQueueContext.tsx
export function OfflineQueueProvider({ children }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Listen for network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      if (online) {
        processQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  // Add operation to queue
  const enqueue = async (operation: Operation) => {
    if (isOnline) {
      // Execute immediately if online
      return await operation.execute();
    } else {
      // Queue for later if offline
      setQueue(prev => [...prev, operation]);
    }
  };

  // Process queue when online
  const processQueue = async () => {
    for (const operation of queue) {
      try {
        await operation.execute();
        // Remove from queue
        setQueue(prev => prev.filter(op => op.id !== operation.id));
      } catch (error) {
        console.error('Failed to process operation:', error);
      }
    }
  };

  return (
    <OfflineQueueContext.Provider value={{ enqueue, isOnline }}>
      {children}
    </OfflineQueueContext.Provider>
  );
}
```

---

## Media Handling

### Image Optimization

```typescript
// Use expo-image for optimized loading
import { Image } from 'expo-image';

<Image
  source={{ uri: product.image }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  placeholder={blurhash}
/>
```

### Cloudinary Integration

```typescript
// services/uploadConfig.ts
import { CLOUDINARY_CONFIG } from '@/config/env';

export const uploadImage = async (uri: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });
  formData.append('upload_preset', CLOUDINARY_CONFIG.imagePreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  return data.secure_url;
};
```

---

## Security Patterns

### Authentication Flow

```typescript
// 1. User logs in
const { login } = useAuth();
await login(email, password);

// 2. Store token in SecureStore
await SecureStore.setItemAsync('authToken', token);

// 3. Add token to API requests (via interceptor)
// See API Client Configuration above

// 4. Refresh token when expired
// Handled automatically in interceptor
```

### Input Sanitization

```typescript
// utils/inputSanitization.ts
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
}
```

---

## Performance Strategy

### Code Splitting

```typescript
// Lazy load screens
const LazyProductScreen = lazy(() => import('./ProductScreen'));

<Suspense fallback={<LoadingSpinner />}>
  <LazyProductScreen />
</Suspense>
```

### List Virtualization

```typescript
// Use FlatList for long lists
<FlatList
  data={products}
  renderItem={renderProduct}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews
/>
```

### Memoization

```typescript
// Memo expensive computations
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);

// Memo callbacks
const handlePress = useCallback(() => {
  console.log('Pressed');
}, []);

// Memo components
const ProductCard = React.memo(({ product }) => {
  return <View>{/* ... */}</View>;
});
```

---

## Architecture Decisions

### Why Expo Router?
- **File-based routing**: Simpler than manual route configuration
- **Type safety**: Better TypeScript support
- **Deep linking**: Built-in support
- **Web support**: Works on web without changes

### Why Context API?
- **Built-in**: No extra dependencies
- **Simple**: Easy to understand and use
- **Sufficient**: Meets our state management needs
- **Performance**: Good enough with proper optimization

### Why Axios?
- **Interceptors**: Easy request/response modification
- **Cancellation**: Request cancellation support
- **Timeout**: Built-in timeout handling
- **Transform**: Automatic JSON parsing

---

**Last Updated**: November 2024
**Questions?** Check [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md)
