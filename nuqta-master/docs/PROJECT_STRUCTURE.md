# Project Structure Documentation

Complete guide to understanding the Rez App codebase structure and organization.

## Table of Contents

- [Directory Overview](#directory-overview)
- [Detailed Structure](#detailed-structure)
- [File Naming Conventions](#file-naming-conventions)
- [Module Boundaries](#module-boundaries)
- [Important Files](#important-files)
- [Where to Find Things](#where-to-find-things)

---

## Directory Overview

```
frontend/
├── app/                    # 📱 Screens & Routes (Expo Router)
├── components/             # 🧩 Reusable UI Components
├── contexts/               # 🌐 Global State (React Context)
├── services/               # 🔌 API & External Services
├── hooks/                  # 🎣 Custom React Hooks
├── utils/                  # 🛠️ Helper Functions
├── types/                  # 📝 TypeScript Type Definitions
├── constants/              # 📌 App Constants
├── config/                 # ⚙️ Configuration Files
├── assets/                 # 🎨 Static Assets (images, fonts)
├── data/                   # 📊 Mock/Static Data
├── __tests__/              # 🧪 Test Files
├── scripts/                # 🔧 Utility Scripts
└── .expo/                  # 🚀 Expo Build Files (auto-generated)
```

---

## Detailed Structure

### 📱 app/ - Screens & Routes

Expo Router uses file-based routing. Every file in `app/` becomes a route.

```
app/
├── (tabs)/                 # Tab navigator group
│   ├── _layout.tsx         # Tab bar configuration
│   ├── index.tsx           # Home screen → /
│   ├── earn.tsx            # Earn screen → /earn
│   ├── play.tsx            # Play screen → /play
│   └── profile.tsx         # Profile screen → /profile
│
├── onboarding/             # Onboarding flow
│   ├── splash.tsx          # → /onboarding/splash
│   ├── registration.tsx    # → /onboarding/registration
│   ├── otp-verification.tsx
│   ├── location-permission.tsx
│   ├── category-selection.tsx
│   └── rewards-intro.tsx
│
├── product/                # Product screens
│   └── [id].tsx            # Dynamic route → /product/:id
│
├── category/               # Category screens
│   └── [slug].tsx          # → /category/:slug
│
├── store/                  # Store screens (DEPRECATED - see note)
│   └── [id]/
│       ├── index.tsx       # → /store/:id
│       └── reviews.tsx     # → /store/:id/reviews
│
├── account/                # Account settings
│   ├── index.tsx           # Account hub
│   ├── payment.tsx
│   ├── delivery.tsx
│   ├── settings.tsx
│   └── notifications.tsx
│
├── wallet/                 # Wallet & transactions
│   └── index.tsx
│
├── subscription/           # Subscription management
│   ├── plans.tsx
│   ├── manage.tsx
│   └── billing.tsx
│
├── voucher/                # Voucher system
│   ├── [brandId].tsx
│   └── category/
│       └── [slug].tsx
│
├── _layout.tsx             # Root layout (providers, navigation)
├── index.tsx               # App entry point
├── sign-in.tsx             # Sign in screen
├── CartPage.tsx            # Shopping cart
├── MainStorePage.tsx       # Store detail page
├── Store.tsx               # Store page (alternative)
├── EventPage.tsx           # Event details
├── checkout.tsx            # Checkout flow
└── +not-found.tsx          # 404 page
```

**Navigation Patterns:**

```typescript
// File-based routing examples
app/product/[id].tsx        // → /product/123
app/category/[slug].tsx     // → /category/electronics
app/store/[id]/index.tsx    // → /store/456
app/store/[id]/reviews.tsx  // → /store/456/reviews

// Access params in component
import { useLocalSearchParams } from 'expo-router';

function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Use id
}
```

**Note on Deprecated Files:**
- `app/StorePage.tsx` - DELETED (use MainStorePage.tsx or Store.tsx)
- `app/store/[id]/*` - DELETED (consolidated into Store.tsx)
- See git history for migration details

---

### 🧩 components/ - UI Components

Organized by feature/domain:

```
components/
├── common/                 # Shared, generic components
│   ├── ErrorBoundary.tsx
│   ├── LoadingSpinner.tsx
│   ├── Toast.tsx
│   ├── OptimizedImage.tsx
│   ├── AccessibleButton.tsx
│   └── SkeletonLoader.tsx
│
├── navigation/             # Navigation components
│   └── BottomNavigation.tsx
│
├── homepage/               # Homepage-specific
│   ├── HorizontalScrollSection.tsx
│   ├── SkeletonLoader.tsx
│   └── cards/
│       ├── ProductCard.tsx
│       ├── StoreCard.tsx
│       ├── EventCard.tsx
│       └── RecommendationCard.tsx
│
├── cart/                   # Cart components
│   ├── CartHeader.tsx
│   ├── CartItem.tsx
│   ├── PriceSection.tsx
│   └── CartValidation.tsx
│
├── product/                # Product components
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   └── ProductInfo.tsx
│
├── store/                  # Store components
│   ├── StoreHeader.tsx
│   └── StoreActionButtons.tsx
│
├── wallet/                 # Wallet components
│   ├── WalletBalanceCard.tsx
│   ├── TransactionCard.tsx
│   └── TransactionHistory.tsx
│
├── profile/                # Profile components
│   ├── MenuItemCard.tsx
│   └── ProfileMenuModal.tsx
│
├── earnPage/               # Earn page components
│   ├── EarningsCard.tsx
│   ├── ProjectCard.tsx
│   └── CategoryGrid.tsx
│
├── playPage/               # Play page (videos)
│   ├── VideoCard.tsx
│   ├── FeaturedVideoCard.tsx
│   └── ArticleSection.tsx
│
├── onboarding/             # Onboarding components
│   ├── FormInput.tsx
│   ├── PurpleGradientBg.tsx
│   └── LoadingScreen.tsx
│
├── ui/                     # Base UI components
│   └── IconSymbol.tsx
│
├── ThemedText.tsx          # Themed text component
├── ThemedView.tsx          # Themed view component
├── Collapsible.tsx         # Collapsible section
└── ParallaxScrollView.tsx  # Parallax scroll view
```

**Component Structure:**

```typescript
// Standard component pattern
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
}

export default function MyComponent({ title, onPress, variant = 'primary' }: Props) {
  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={onPress} accessible accessibilityLabel={title}>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

---

### 🌐 contexts/ - Global State

React Context for app-wide state management:

```
contexts/
├── AppContext.tsx              # Global app state
├── AuthContext.tsx             # Authentication state
├── CartContext.tsx             # Shopping cart
├── WishlistContext.tsx         # Wishlist
├── ProfileContext.tsx          # User profile
├── OffersContext.tsx           # Offers/deals
├── CategoryContext.tsx         # Categories
├── LocationContext.tsx         # Location data
├── SocketContext.tsx           # WebSocket connection
├── NotificationContext.tsx     # Notifications
├── GamificationContext.tsx     # Points, achievements
├── SubscriptionContext.tsx     # Subscription state
├── SecurityContext.tsx         # Security features
├── OfflineQueueContext.tsx     # Offline sync queue
└── AppPreferencesContext.tsx   # User preferences
```

**Context Usage Pattern:**

```typescript
// Define context
import { createContext, useContext, useState } from 'react';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems(prev => [...prev, item]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
```

**Provider Hierarchy in app/_layout.tsx:**

```typescript
<ErrorBoundary>
  <OfflineQueueProvider>
    <AppProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <GamificationProvider>
            <SocketProvider>
              <LocationProvider>
                <CartProvider>
                  {/* App content */}
                </CartProvider>
              </LocationProvider>
            </SocketProvider>
          </GamificationProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </AppProvider>
  </OfflineQueueProvider>
</ErrorBoundary>
```

---

### 🔌 services/ - API & External Services

All external API calls and service integrations:

```
services/
├── apiClient.ts                # Base Axios client
├── authApi.ts                  # Authentication API
├── productsApi.ts              # Products endpoints
├── storesApi.ts                # Stores endpoints
├── cartApi.ts                  # Cart endpoints
├── ordersApi.ts                # Orders endpoints
├── homepageApi.ts              # Homepage data
├── videosApi.ts                # Videos API
├── projectsApi.ts              # Projects/tasks API
├── reviewApi.ts                # Reviews API
├── wishlistApi.ts              # Wishlist API
├── categoriesApi.ts            # Categories API
├── offersApi.ts                # Offers/deals API
├── walletApi.ts                # Wallet operations
├── notificationService.ts      # Push notifications
├── locationService.ts          # Location services
├── paymentService.ts           # Payment processing
├── razorpayApi.ts              # Razorpay integration
├── stripeApi.ts                # Stripe integration
├── realTimeService.ts          # WebSocket service
├── uploadConfig.ts             # File upload config
├── billUploadService.ts        # Bill upload
├── ugcApi.ts                   # User-generated content
├── searchService.ts            # Search functionality
├── analyticsService.ts         # Analytics tracking
└── storageService.ts           # AsyncStorage wrapper
```

**Service Pattern:**

```typescript
// services/productsApi.ts
import apiClient from './apiClient';
import type { Product, ProductFilters } from '@/types/product';

export const productsApi = {
  // Get all products
  getAll: async (filters?: ProductFilters): Promise<Product[]> => {
    const response = await apiClient.get('/products', { params: filters });
    return response.data;
  },

  // Get single product
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  // Search products
  search: async (query: string): Promise<Product[]> => {
    const response = await apiClient.get('/products/search', {
      params: { q: query }
    });
    return response.data;
  },
};
```

**API Client Configuration:**

```typescript
// services/apiClient.ts
import axios from 'axios';
import { API_CONFIG } from '@/config/env';

const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
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

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      await refreshToken();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### 🎣 hooks/ - Custom React Hooks

Reusable logic extracted into hooks:

```
hooks/
├── useColorScheme.ts           # Theme detection
├── useThemeColor.ts            # Theme colors
├── useNavigation.ts            # Navigation helpers
├── useHomepage.ts              # Homepage data
├── useEarnPageData.ts          # Earn page data
├── usePlayPageData.ts          # Play page data
├── useWallet.ts                # Wallet operations
├── useCart.ts                  # Cart operations (via context)
├── useAuth.ts                  # Authentication (via context)
├── useLocation.ts              # Location services
├── useOnboarding.ts            # Onboarding flow
├── useSearch.ts                # Search functionality
├── useDebounce.ts              # Debounce values
├── useNetworkStatus.ts         # Network status
├── useOfflineQueue.ts          # Offline sync
├── useBillUpload.ts            # Bill upload
├── useVideoUpload.ts           # Video upload
├── usePaymentMethods.ts        # Payment methods
└── useAnalytics.ts             # Analytics tracking
```

**Hook Pattern:**

```typescript
// hooks/useProducts.ts
import { useState, useEffect } from 'react';
import { productsApi } from '@/services/productsApi';
import type { Product } from '@/types/product';

export function useProducts(categoryId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll({ categoryId });
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchProducts();
  };

  return { products, loading, error, refresh };
}
```

---

### 🛠️ utils/ - Helper Functions

Pure utility functions:

```
utils/
├── errorHandler.ts             # Error handling utilities
├── validation.ts               # Input validation
├── formatters.ts               # Data formatting
├── shareUtils.ts               # Social sharing
├── navigationHelper.ts         # Navigation utilities
├── imageOptimization.ts        # Image processing
├── videoCompression.ts         # Video compression
├── dateUtils.ts                # Date formatting
├── priceUtils.ts               # Price formatting
├── storageUtils.ts             # AsyncStorage helpers
├── performanceUtils.ts         # Performance monitoring
└── logger.ts                   # Logging utilities
```

---

### 📝 types/ - TypeScript Definitions

Type definitions organized by domain:

```
types/
├── homepage.types.ts           # Homepage types
├── product.types.ts            # Product types
├── cart.types.ts               # Cart types
├── order.types.ts              # Order types
├── store.types.ts              # Store types
├── user.types.ts               # User types
├── payment.types.ts            # Payment types
├── review.types.ts             # Review types
├── navigation.types.ts         # Navigation types
└── api.types.ts                # API response types
```

**Type Pattern:**

```typescript
// types/product.types.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: Category;
  store: Store;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  categoryId?: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'price' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
}
```

---

### ⚙️ config/ - Configuration

```
config/
├── env.ts                      # Environment variables
├── index.ts                    # Exports all configs
├── api.config.js               # API configuration
├── cloudinary.config.ts        # Cloudinary setup
├── monitoring.config.ts        # Monitoring setup
└── uploadConfig.ts             # Upload configuration
```

---

### 📌 constants/ - App Constants

```
constants/
└── Colors.ts                   # Theme colors
```

---

### 🎨 assets/ - Static Files

```
assets/
├── fonts/
│   └── SpaceMono-Regular.ttf
├── images/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
└── videos/
```

---

## File Naming Conventions

### General Rules

1. **Components**: PascalCase
   - `ProductCard.tsx`
   - `WalletBalanceCard.tsx`

2. **Hooks**: camelCase with `use` prefix
   - `useHomepage.ts`
   - `useCart.ts`

3. **Services**: camelCase with domain suffix
   - `productsApi.ts`
   - `paymentService.ts`

4. **Types**: camelCase with `.types.ts` suffix
   - `product.types.ts`
   - `navigation.types.ts`

5. **Utils**: camelCase with function name
   - `errorHandler.ts`
   - `formatters.ts`

6. **Routes**: kebab-case for multi-word
   - `sign-in.tsx`
   - `otp-verification.tsx`

### Specific Patterns

```typescript
// Component files
ProductCard.tsx              // Component
ProductCard.test.tsx         // Tests
ProductCard.styles.ts        // Styles (if separated)

// Service files
productsApi.ts               // API service
productsApi.test.ts          // Tests

// Hook files
useProducts.ts               // Hook
useProducts.test.ts          // Tests

// Type files
product.types.ts             // Types only
```

---

## Module Boundaries

### Dependency Rules

```
app/              → Can import from: components, hooks, services, contexts, utils, types
components/       → Can import from: hooks, utils, types
contexts/         → Can import from: services, hooks, utils, types
services/         → Can import from: utils, types, config
hooks/            → Can import from: services, utils, types, contexts
utils/            → Can import from: types only
types/            → No dependencies (pure types)
```

### Import Aliases

Use `@/` alias for cleaner imports:

```typescript
// ❌ Avoid relative imports
import { ProductCard } from '../../../components/product/ProductCard';

// ✅ Use alias
import { ProductCard } from '@/components/product/ProductCard';
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Important Files

### Must-Read Files

1. **app/_layout.tsx** - Root layout, all providers
2. **app/(tabs)/_layout.tsx** - Tab navigation config
3. **app/(tabs)/index.tsx** - Homepage implementation
4. **contexts/AuthContext.tsx** - Authentication flow
5. **services/apiClient.ts** - API configuration
6. **config/env.ts** - Environment config
7. **package.json** - Dependencies and scripts

### Configuration Files

1. **.env** - Environment variables (DO NOT COMMIT)
2. **.env.example** - Environment template
3. **tsconfig.json** - TypeScript configuration
4. **babel.config.js** - Babel configuration
5. **jest.config.js** - Jest test configuration
6. **app.json** - Expo configuration

---

## Where to Find Things

### "I need to..."

| Task | Location |
|------|----------|
| Add a new screen | `app/` |
| Create a UI component | `components/` |
| Add global state | `contexts/` |
| Call an API | `services/` |
| Add reusable logic | `hooks/` |
| Define types | `types/` |
| Add utility function | `utils/` |
| Configure environment | `.env` or `config/` |
| Add constants | `constants/` |

### "I'm looking for..."

| Feature | Files |
|---------|-------|
| **Authentication** | `contexts/AuthContext.tsx`, `services/authApi.ts`, `app/sign-in.tsx` |
| **Cart** | `contexts/CartContext.tsx`, `services/cartApi.ts`, `app/CartPage.tsx` |
| **Homepage** | `app/(tabs)/index.tsx`, `hooks/useHomepage.ts`, `services/homepageApi.ts` |
| **Product Detail** | `app/product/[id].tsx`, `services/productsApi.ts` |
| **Checkout** | `app/checkout.tsx`, `hooks/useCheckout.ts` |
| **Wallet** | `app/wallet/index.tsx`, `hooks/useWallet.ts`, `services/walletApi.ts` |
| **Payments** | `services/paymentService.ts`, `services/razorpayApi.ts`, `services/stripeApi.ts` |
| **Navigation** | `components/navigation/BottomNavigation.tsx`, `app/(tabs)/_layout.tsx` |

---

## Code Organization Best Practices

### 1. Feature-Based Organization

Group related files by feature:

```
components/
└── product/
    ├── ProductCard.tsx
    ├── ProductGrid.tsx
    ├── ProductDetails.tsx
    └── ProductFilters.tsx
```

### 2. Colocation

Keep related files together:

```
app/product/
├── [id].tsx              # Product detail screen
├── ProductHeader.tsx     # Screen-specific component
└── useProductDetail.ts   # Screen-specific hook
```

### 3. Clear Exports

Use index files for clean exports:

```typescript
// components/product/index.ts
export { ProductCard } from './ProductCard';
export { ProductGrid } from './ProductGrid';
export { ProductDetails } from './ProductDetails';

// Usage
import { ProductCard, ProductGrid } from '@/components/product';
```

### 4. Avoid Deep Nesting

Keep directory depth manageable (3-4 levels max):

```
✅ Good
components/product/ProductCard.tsx

❌ Too deep
components/features/product/cards/primary/ProductCard.tsx
```

---

## Quick Reference

### Common Paths

```bash
# Components
components/common/          # Shared components
components/[feature]/       # Feature-specific

# Screens
app/(tabs)/                 # Main tab screens
app/[feature]/              # Feature screens

# State
contexts/[Feature]Context.tsx

# API
services/[feature]Api.ts

# Hooks
hooks/use[Feature].ts

# Types
types/[feature].types.ts
```

### Import Examples

```typescript
// Components
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Hooks
import { useHomepage } from '@/hooks/useHomepage';
import { useCart } from '@/contexts/CartContext';

// Services
import { productsApi } from '@/services/productsApi';
import apiClient from '@/services/apiClient';

// Types
import type { Product } from '@/types/product.types';

// Utils
import { formatPrice } from '@/utils/formatters';

// Config
import { API_CONFIG } from '@/config/env';
```

---

**Last Updated**: November 2024
**Questions?** Check [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) or ask in Slack
