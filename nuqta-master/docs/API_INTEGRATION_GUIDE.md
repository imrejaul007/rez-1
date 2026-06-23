# REZ App - API Integration Guide

Complete guide for integrating and using REZ App APIs in your React Native application.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication Integration](#authentication-integration)
3. [Product Browsing Integration](#product-browsing-integration)
4. [Shopping Cart Integration](#shopping-cart-integration)
5. [Order Management Integration](#order-management-integration)
6. [Wallet Integration](#wallet-integration)
7. [Real-time Features](#real-time-features)
8. [File Upload Integration](#file-upload-integration)
9. [Error Handling Patterns](#error-handling-patterns)
10. [Caching Strategies](#caching-strategies)
11. [Offline Support](#offline-support)
12. [Performance Optimization](#performance-optimization)
13. [Testing Integration](#testing-integration)
14. [Common Patterns](#common-patterns)

---

## Getting Started

### Installation

The API services are already included in the project. No additional installation required.

### Configuration

Update your `.env` file with backend URL:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
EXPO_PUBLIC_API_TIMEOUT=30000
```

### Basic Setup

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { getStoredToken } from '@/utils/storage';

export default function RootLayout() {
  useEffect(() => {
    // Initialize API client with stored token
    const initializeApi = async () => {
      const token = await getStoredToken();
      if (token) {
        apiClient.setAuthToken(token);
      }
    };

    initializeApi();
  }, []);

  return (
    // Your app layout
  );
}
```

---

## Authentication Integration

### Complete Authentication Flow

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import authService, { User } from '@/services/authApi';
import apiClient from '@/services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Setup token refresh and logout callbacks
  useEffect(() => {
    apiClient.setRefreshTokenCallback(handleTokenRefresh);
    apiClient.setLogoutCallback(handleLogout);
  }, []);

  async function initializeAuth() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (token && storedUser) {
        apiClient.setAuthToken(token);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);

        // Refresh user data from backend
        await refreshUser();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function sendOtp(phoneNumber: string) {
    try {
      const response = await authService.sendOtp({ phoneNumber });

      if (response.success) {
        // OTP sent successfully
        return;
      }

      throw new Error(response.error || 'Failed to send OTP');
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  }

  async function verifyOtp(phoneNumber: string, otp: string) {
    try {
      const response = await authService.verifyOtp({ phoneNumber, otp });

      if (response.success && response.data) {
        const { user, tokens } = response.data;

        // Store tokens and user data
        await AsyncStorage.setItem('accessToken', tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', tokens.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        // Set token in API client
        apiClient.setAuthToken(tokens.accessToken);

        // Update state
        setUser(user);
        setIsAuthenticated(true);

        return;
      }

      throw new Error(response.error || 'Failed to verify OTP');
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  }

  async function handleTokenRefresh() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        return false;
      }

      const response = await authService.refreshToken(refreshToken);

      if (response.success && response.data) {
        const { tokens } = response.data;

        // Store new tokens
        await AsyncStorage.setItem('accessToken', tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', tokens.refreshToken);

        // Update API client
        apiClient.setAuthToken(tokens.accessToken);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async function handleLogout() {
    await logout();
  }

  async function logout() {
    try {
      // Call logout API
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local data regardless of API call result
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');

      apiClient.setAuthToken(null);

      setUser(null);
      setIsAuthenticated(false);
    }
  }

  async function refreshUser() {
    try {
      const response = await authService.getProfile();

      if (response.success && response.data) {
        setUser(response.data);
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        sendOtp,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Using Authentication in Components

```typescript
// app/sign-in.tsx
import { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function SignInScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSendOtp() {
    try {
      setError('');
      setIsLoading(true);

      await sendOtp(phoneNumber);

      setStep('otp');
    } catch (error: any) {
      setError(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    try {
      setError('');
      setIsLoading(true);

      await verifyOtp(phoneNumber, otp);

      // Navigate to home
      router.replace('/(tabs)');
    } catch (error: any) {
      setError(error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <View>
        <Text>Enter Phone Number</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
        />
        {error && <Text style={{ color: 'red' }}>{error}</Text>}
        <Button
          title={isLoading ? 'Sending...' : 'Send OTP'}
          onPress={handleSendOtp}
          disabled={isLoading}
        />
      </View>
    );
  }

  return (
    <View>
      <Text>Enter OTP</Text>
      <TextInput
        value={otp}
        onChangeText={setOtp}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button
        title={isLoading ? 'Verifying...' : 'Verify OTP'}
        onPress={handleVerifyOtp}
        disabled={isLoading}
      />
    </View>
  );
}
```

---

## Product Browsing Integration

### Product List with Pagination

```typescript
// hooks/useProducts.ts
import { useState, useEffect } from 'react';
import productsService, { Product } from '@/services/productsApi';

interface UseProductsOptions {
  category?: string;
  store?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = options.limit || 20;

  async function fetchProducts(pageNum: number, append: boolean = false) {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await productsService.getProducts({
        page: pageNum,
        limit,
        ...options,
      });

      if (response.success && response.data) {
        const newProducts = response.data.products;

        if (append) {
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }

        setHasMore(response.data.pagination.current < response.data.pagination.pages);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch products');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [options.category, options.store, options.search, options.minPrice, options.maxPrice, options.sort]);

  function loadMore() {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }

  function refresh() {
    setPage(1);
    fetchProducts(1, false);
  }

  return {
    products,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh,
  };
}
```

### Using Product List

```typescript
// app/products.tsx
import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';

export default function ProductsScreen() {
  const { products, isLoading, error, hasMore, isLoadingMore, loadMore, refresh } =
    useProducts({ category: 'electronics', sort: 'price' });

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
        <Button title="Retry" onPress={refresh} />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => <ProductCard product={item} />}
      keyExtractor={item => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      onRefresh={refresh}
      refreshing={isLoading}
      ListFooterComponent={
        isLoadingMore ? <ActivityIndicator size="small" /> : null
      }
      ListEmptyComponent={
        <View>
          <Text>No products found</Text>
        </View>
      }
    />
  );
}
```

### Product Search

```typescript
// hooks/useProductSearch.ts
import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import productsService, { Product } from '@/services/productsApi';

export function useProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  async function performSearch(searchQuery: string) {
    try {
      setIsSearching(true);

      const response = await productsService.searchProducts({
        q: searchQuery,
        limit: 20,
      });

      if (response.success && response.data) {
        setResults(response.data.products);
        setSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    suggestions,
    isSearching,
    clearSearch,
  };
}
```

---

## Shopping Cart Integration

### Cart Context

```typescript
// contexts/CartContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import cartService, { Cart, CartItem } from '@/services/cartApi';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  itemCount: number;
  total: number;
  addToCart: (productId: string, quantity: number, variant?: any) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variant?: any) => Promise<void>;
  removeItem: (productId: string, variant?: any) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const itemCount = cart?.itemCount || 0;
  const total = cart?.totals.total || 0;

  // Fetch cart on mount and when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [isAuthenticated]);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await cartService.getCart();

      if (response.success && response.data) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (
    productId: string,
    quantity: number,
    variant?: any
  ) => {
    try {
      const response = await cartService.addToCart({
        productId,
        quantity,
        variant,
      });

      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  }, []);

  const updateQuantity = useCallback(async (
    productId: string,
    quantity: number,
    variant?: any
  ) => {
    try {
      const response = await cartService.updateCartItem(
        productId,
        { quantity },
        variant
      );

      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      throw error;
    }
  }, []);

  const removeItem = useCallback(async (productId: string, variant?: any) => {
    try {
      const response = await cartService.removeCartItem(productId, variant);

      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Remove item error:', error);
      throw error;
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      const response = await cartService.clearCart();

      if (response.success) {
        setCart(null);
      } else {
        throw new Error(response.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const response = await cartService.applyCoupon({ couponCode: code });

      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || 'Failed to apply coupon');
      }
    } catch (error) {
      console.error('Apply coupon error:', error);
      throw error;
    }
  }, []);

  const removeCoupon = useCallback(async () => {
    try {
      const response = await cartService.removeCoupon();

      if (response.success && response.data) {
        setCart(response.data);
      } else {
        throw new Error(response.error || 'Failed to remove coupon');
      }
    } catch (error) {
      console.error('Remove coupon error:', error);
      throw error;
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        itemCount,
        total,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

### Using Cart in Components

```typescript
// components/ProductCard.tsx
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/services/productsApi';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddToCart() {
    try {
      setIsAdding(true);
      await addToCart(product.id, 1);
      alert('Added to cart!');
    } catch (error: any) {
      alert(error.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <View>
      <Text>{product.name}</Text>
      <Text>₹{product.pricing.salePrice || product.pricing.basePrice}</Text>
      <Button
        title={isAdding ? 'Adding...' : 'Add to Cart'}
        onPress={handleAddToCart}
        disabled={isAdding}
      />
    </View>
  );
}
```

---

## Order Management Integration

### Creating Orders

```typescript
// app/checkout.tsx
import { useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { useCart } from '@/contexts/CartContext';
import ordersService from '@/services/ordersApi';
import { router } from 'expo-router';

export default function CheckoutScreen() {
  const { cart, clearCart } = useCart();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'upi' | 'cod'>('wallet');

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }

    try {
      setIsCreating(true);

      const response = await ordersService.createOrder({
        deliveryAddress: selectedAddress,
        paymentMethod,
        specialInstructions: '',
        couponCode: cart?.coupon?.code,
      });

      if (response.success && response.data) {
        // Clear cart
        await clearCart();

        // Navigate to order confirmation
        router.push({
          pathname: '/order-confirmation',
          params: { orderId: response.data.id },
        });
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to place order');
    } finally {
      setIsCreating(false);
    }
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <View>
        <Text>Your cart is empty</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      {/* Cart Items */}
      <View>
        <Text>Order Summary</Text>
        {cart.items.map(item => (
          <View key={item._id}>
            <Text>{item.product.name}</Text>
            <Text>Qty: {item.quantity}</Text>
            <Text>₹{item.price}</Text>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View>
        <Text>Delivery Address</Text>
        {/* Address selection UI */}
      </View>

      {/* Payment Method */}
      <View>
        <Text>Payment Method</Text>
        {/* Payment method selection UI */}
      </View>

      {/* Order Totals */}
      <View>
        <Text>Subtotal: ₹{cart.totals.subtotal}</Text>
        <Text>Tax: ₹{cart.totals.tax}</Text>
        <Text>Delivery: ₹{cart.totals.delivery}</Text>
        <Text>Discount: -₹{cart.totals.discount}</Text>
        <Text>Total: ₹{cart.totals.total}</Text>
      </View>

      <Button
        title={isCreating ? 'Placing Order...' : 'Place Order'}
        onPress={handlePlaceOrder}
        disabled={isCreating}
      />
    </ScrollView>
  );
}
```

### Order Tracking

```typescript
// hooks/useOrderTracking.ts
import { useState, useEffect } from 'react';
import ordersService from '@/services/ordersApi';

export function useOrderTracking(orderId: string) {
  const [tracking, setTracking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTracking() {
    try {
      setIsLoading(true);
      const response = await ordersService.getOrderTracking(orderId);

      if (response.success && response.data) {
        setTracking(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch tracking');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchTracking();

      // Poll for updates every 30 seconds
      const interval = setInterval(fetchTracking, 30000);

      return () => clearInterval(interval);
    }
  }, [orderId]);

  return {
    tracking,
    isLoading,
    error,
    refresh: fetchTracking,
  };
}
```

---

## Wallet Integration

### Wallet Balance Display

```typescript
// hooks/useWallet.ts
import { useState, useEffect, useCallback } from 'react';
import walletService, { WalletBalanceResponse } from '@/services/walletApi';
import { useAuth } from '@/contexts/AuthContext';

export function useWallet() {
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await walletService.getBalance();

      if (response.success && response.data) {
        setBalance(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch wallet balance');
      }
    } catch (error: any) {
      setError(error.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
  }, [isAuthenticated]);

  return {
    balance,
    isLoading,
    error,
    refresh: fetchBalance,
  };
}
```

### Wallet Transactions

```typescript
// hooks/useWalletTransactions.ts
import { useState, useEffect } from 'react';
import walletService, { TransactionResponse } from '@/services/walletApi';

export function useWalletTransactions(filters: any = {}) {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function fetchTransactions(pageNum: number, append: boolean = false) {
    try {
      setIsLoading(true);

      const response = await walletService.getTransactions({
        page: pageNum,
        limit: 20,
        ...filters,
      });

      if (response.success && response.data) {
        const newTransactions = response.data.transactions;

        if (append) {
          setTransactions(prev => [...prev, ...newTransactions]);
        } else {
          setTransactions(newTransactions);
        }

        setHasMore(response.data.pagination.hasNext);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions(1, false);
  }, [filters]);

  function loadMore() {
    if (hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage, true);
    }
  }

  return {
    transactions,
    isLoading,
    hasMore,
    loadMore,
    refresh: () => fetchTransactions(1, false),
  };
}
```

---

## Real-time Features

### WebSocket Integration

```typescript
// services/realTimeService.ts
import { io, Socket } from 'socket.io-client';

class RealTimeService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('http://localhost:5001', {
      auth: {
        userId,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Setup event listeners
    this.socket.on('cart:updated', (data) => {
      this.emit('cart:updated', data);
    });

    this.socket.on('order:status', (data) => {
      this.emit('order:status', data);
    });

    this.socket.on('wallet:balance', (data) => {
      this.emit('wallet:balance', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

export const realTimeService = new RealTimeService();
```

---

## File Upload Integration

### Image Upload

```typescript
// hooks/useImageUpload.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '@/services/apiClient';

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function pickAndUploadImage() {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        return await uploadImage(imageUri);
      }

      return null;
    } catch (error) {
      console.error('Image pick error:', error);
      throw error;
    }
  }

  async function uploadImage(uri: string) {
    try {
      setIsUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);

      const response = await apiClient.uploadFile('/upload/image', formData);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Upload failed');
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return {
    isUploading,
    progress,
    pickAndUploadImage,
    uploadImage,
  };
}
```

---

## Error Handling Patterns

### Global Error Handler

```typescript
// utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export function showErrorAlert(error: any) {
  const message = handleApiError(error);
  Alert.alert('Error', message);
}
```

---

## Caching Strategies

### Simple Cache Implementation

```typescript
// utils/cache.ts
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 300000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const cache = new Cache();
```

---

## Offline Support

### Offline Queue

```typescript
// services/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueueItem {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
}

class OfflineQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;

  async add(endpoint: string, method: string, data: any) {
    const item: QueueItem = {
      id: Date.now().toString(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.saveQueue();
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        // Process item
        await this.processItem(item);

        // Remove from queue
        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        console.error('Failed to process queue item:', error);
        break;
      }
    }

    this.isProcessing = false;
  }

  private async processItem(item: QueueItem) {
    // Implement API call based on method
  }

  private async saveQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }

  async loadQueue() {
    const data = await AsyncStorage.getItem('offline_queue');
    if (data) {
      this.queue = JSON.parse(data);
    }
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## Performance Optimization

### Request Debouncing

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### Request Cancellation

```typescript
// Use AbortController for cancellable requests
async function searchProducts(query: string, signal: AbortSignal) {
  const response = await fetch(`/api/products/search?q=${query}`, {
    signal,
  });
  return response.json();
}

// Usage
const controller = new AbortController();

searchProducts('laptop', controller.signal)
  .then(results => console.log(results))
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
    }
  });

// Cancel request
controller.abort();
```

---

## Testing Integration

### Mock API Responses

```typescript
// __mocks__/services/productsApi.ts
export default {
  getProducts: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        products: [
          {
            id: 'prod_1',
            name: 'Test Product',
            pricing: { basePrice: 1000 },
          },
        ],
        pagination: {
          current: 1,
          pages: 1,
          total: 1,
          limit: 20,
        },
      },
    })
  ),
};
```

### Testing Components

```typescript
// __tests__/hooks/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { useProducts } from '@/hooks/useProducts';
import productsService from '@/services/productsApi';

jest.mock('@/services/productsApi');

describe('useProducts', () => {
  it('should fetch products', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Test Product');
  });
});
```

---

## Common Patterns

### Pagination Pattern

```typescript
function usePagination<T>(fetchFn: (page: number) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    const newItems = await fetchFn(page + 1);
    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
      setPage(page + 1);
    } else {
      setHasMore(false);
    }
  }

  return { items, hasMore, loadMore };
}
```

### Optimistic Updates

```typescript
async function likeProduct(productId: string) {
  // Optimistically update UI
  setLiked(true);
  setLikeCount(prev => prev + 1);

  try {
    // Make API call
    const response = await api.likeProduct(productId);

    if (!response.success) {
      // Revert on error
      setLiked(false);
      setLikeCount(prev => prev - 1);
    }
  } catch (error) {
    // Revert on error
    setLiked(false);
    setLikeCount(prev => prev - 1);
  }
}
```

### Retry Pattern

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}
```

---

## Best Practices

1. **Always handle errors** - Show user-friendly messages
2. **Use TypeScript** - Leverage type safety
3. **Implement loading states** - Show progress to users
4. **Cache responses** - Reduce unnecessary API calls
5. **Debounce search** - Avoid excessive requests
6. **Handle offline mode** - Queue important operations
7. **Test API integration** - Write unit and integration tests
8. **Monitor performance** - Track API response times
9. **Secure sensitive data** - Never log tokens or passwords
10. **Document API usage** - Help other developers

---

**End of Integration Guide**
