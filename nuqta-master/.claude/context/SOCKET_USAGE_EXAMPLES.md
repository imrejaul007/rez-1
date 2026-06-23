# Socket.IO Integration - Usage Examples

This document provides examples of how to use the Socket.IO integration in the REZ app frontend.

## Overview

The Socket.IO integration provides real-time updates for:
- Stock levels (updated, low stock, out of stock)
- Product prices
- Product availability

## Basic Usage

### 1. Using the Socket Context in a Component

```tsx
import { useSocket } from '@/contexts/SocketContext';

function MyComponent() {
  const { state, subscribeToProduct, onStockUpdate } = useSocket();

  useEffect(() => {
    // Subscribe to a product
    subscribeToProduct('product-123');

    // Listen for stock updates
    const unsubscribe = onStockUpdate((payload) => {
      console.log('Stock updated:', payload);
      // Update your UI here
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <View>
      <Text>Socket Status: {state.connected ? 'Connected' : 'Disconnected'}</Text>
    </View>
  );
}
```

### 2. Using the useStockUpdates Hook (Simplified)

The easiest way to get real-time stock updates for a product:

```tsx
import { useStockUpdates } from '@/contexts/SocketContext';

function ProductCard({ productId }) {
  const { stockData, isLowStock, isOutOfStock, isInStock } = useStockUpdates(productId);

  return (
    <View>
      <Text>{isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}</Text>
      {stockData && (
        <Text>Quantity: {stockData.quantity}</Text>
      )}
    </View>
  );
}
```

### 3. Integrating with CartContext

Update cart items when stock changes:

```tsx
import { useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useSocket } from '@/contexts/SocketContext';

function CartIntegration() {
  const { state: cartState, actions: cartActions } = useCart();
  const { onStockUpdate, onOutOfStock } = useSocket();

  useEffect(() => {
    // Listen for stock updates
    const unsubscribeStock = onStockUpdate((payload) => {
      // Check if any cart item matches this product
      const cartItem = cartState.items.find(
        item => item.productId === payload.productId
      );

      if (cartItem) {
        // If cart quantity exceeds available stock, update it
        if (cartItem.quantity > payload.quantity) {
          cartActions.updateQuantity(cartItem.id, payload.quantity);
          // Show notification to user
          Alert.alert(
            'Stock Update',
            `${cartItem.name} stock is now ${payload.quantity}. Cart updated.`
          );
        }
      }
    });

    // Listen for out of stock
    const unsubscribeOut = onOutOfStock((payload) => {
      const cartItem = cartState.items.find(
        item => item.productId === payload.productId
      );

      if (cartItem) {
        // Remove item from cart
        cartActions.removeItem(cartItem.id);
        // Notify user
        Alert.alert(
          'Out of Stock',
          `${payload.productName} is now out of stock and has been removed from your cart.`
        );
      }
    });

    // Cleanup
    return () => {
      unsubscribeStock();
      unsubscribeOut();
    };
  }, [cartState.items]);

  return null; // This component only handles side effects
}
```

### 4. Product Page with Real-Time Updates

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useSocket, useStockUpdates } from '@/contexts/SocketContext';
import { useCart } from '@/contexts/CartContext';

function ProductPage({ productId }) {
  const { stockData, isLowStock, isOutOfStock } = useStockUpdates(productId);
  const { onPriceUpdate } = useSocket();
  const { actions: cartActions } = useCart();
  const [price, setPrice] = useState(100);

  useEffect(() => {
    // Listen for price updates
    const unsubscribe = onPriceUpdate((payload) => {
      if (payload.productId === productId) {
        setPrice(payload.newPrice);
        Alert.alert(
          'Price Update',
          `Price changed from $${payload.oldPrice} to $${payload.newPrice}`
        );
      }
    });

    return () => unsubscribe();
  }, [productId]);

  const handleAddToCart = () => {
    if (isOutOfStock) {
      Alert.alert('Out of Stock', 'This product is currently unavailable');
      return;
    }

    cartActions.addItem({
      id: productId,
      productId: productId,
      name: 'Product Name',
      price: price,
      // ... other product details
    });
  };

  return (
    <View>
      <Text>Product Price: ${price}</Text>

      {isOutOfStock && (
        <Text style={{ color: 'red' }}>Out of Stock</Text>
      )}

      {isLowStock && !isOutOfStock && (
        <Text style={{ color: 'orange' }}>
          Only {stockData?.quantity} left!
        </Text>
      )}

      {stockData && !isOutOfStock && (
        <Text>{stockData.quantity} available</Text>
      )}

      <Button
        title="Add to Cart"
        onPress={handleAddToCart}
        disabled={isOutOfStock}
      />
    </View>
  );
}
```

### 5. Store Page - Subscribe to All Products

```tsx
import React, { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

function StorePage({ storeId }) {
  const { subscribeToStore, unsubscribeFromStore, onStockUpdate } = useSocket();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Subscribe to entire store
    subscribeToStore(storeId);

    // Listen for any stock updates in this store
    const unsubscribe = onStockUpdate((payload) => {
      if (payload.storeId === storeId) {
        // Update product in list
        setProducts(prev =>
          prev.map(p =>
            p.id === payload.productId
              ? { ...p, stock: payload.quantity, status: payload.status }
              : p
          )
        );
      }
    });

    return () => {
      unsubscribeFromStore(storeId);
      unsubscribe();
    };
  }, [storeId]);

  return (
    <View>
      {/* Render products */}
    </View>
  );
}
```

### 6. Connection Status Indicator

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSocket } from '@/contexts/SocketContext';

function ConnectionStatus() {
  const { state, onConnect, onDisconnect } = useSocket();
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const unsubConnect = onConnect(() => {
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    });

    const unsubDisconnect = onDisconnect(() => {
      setShowStatus(true);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  if (!showStatus) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 50,
      alignSelf: 'center',
      backgroundColor: state.connected ? 'green' : 'red',
      padding: 10,
      borderRadius: 5
    }}>
      <Text style={{ color: 'white' }}>
        {state.connected ? 'Connected' : 'Disconnected'}
      </Text>
      {state.reconnecting && (
        <Text style={{ color: 'white', fontSize: 12 }}>
          Reconnecting... (Attempt {state.reconnectAttempts})
        </Text>
      )}
    </View>
  );
}
```

## Event Types Reference

### Stock Update Event
```typescript
interface StockUpdatePayload {
  productId: string;
  storeId: string;
  quantity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  previousQuantity?: number;
  timestamp: string;
}
```

### Low Stock Event
```typescript
interface LowStockPayload {
  productId: string;
  storeId: string;
  storeName: string;
  productName: string;
  quantity: number;
  threshold: number;
  timestamp: string;
}
```

### Out of Stock Event
```typescript
interface OutOfStockPayload {
  productId: string;
  storeId: string;
  storeName: string;
  productName: string;
  timestamp: string;
}
```

### Price Update Event
```typescript
interface PriceUpdatePayload {
  productId: string;
  storeId: string;
  oldPrice: number;
  newPrice: number;
  discountPercentage?: number;
  timestamp: string;
}
```

## Best Practices

1. **Always unsubscribe**: Use cleanup functions in useEffect to prevent memory leaks
2. **Subscribe only when needed**: Don't subscribe to products/stores that aren't visible
3. **Batch updates**: If handling multiple events, consider batching state updates
4. **Error handling**: Always handle connection errors gracefully
5. **User feedback**: Show connection status and notify users of important stock changes

## Configuration

The Socket.IO client connects to the backend using the `EXPO_PUBLIC_API_BASE_URL` environment variable.

For mobile development:
- The context automatically converts `localhost` to `10.0.2.2` for Android emulator
- For physical devices, update the IP in `SocketContext.tsx` to your machine's local IP

Default configuration:
```typescript
{
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
}
```

## Troubleshooting

### Socket not connecting
1. Check that backend is running on port 5001
2. Verify `EXPO_PUBLIC_API_BASE_URL` in `.env` file
3. For mobile, ensure correct IP address is set in `getSocketUrl()`
4. Check console logs for connection errors

### Events not received
1. Ensure you've subscribed to the product/store
2. Check that socket is connected (`state.connected === true`)
3. Verify event names match backend exactly
4. Check backend logs to confirm events are being emitted

### Multiple subscriptions
If you navigate between screens frequently, you may create duplicate subscriptions. The context handles this by storing subscribed IDs and re-subscribing only once after reconnection.