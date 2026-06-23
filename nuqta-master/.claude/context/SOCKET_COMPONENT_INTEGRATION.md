# Socket Context Component Integration Guide

## How Components Use the Socket Context

This guide shows practical integration patterns for using Socket.IO in your components.

## Component Hierarchy

```
App (_layout.tsx)
└── SocketProvider (manages global socket connection)
    ├── CartProvider (uses socket for cart updates)
    ├── ProductCard (uses socket for stock updates)
    ├── ProductPage (uses socket for detailed product info)
    ├── StorePage (uses socket for store-wide updates)
    └── CartPage (uses socket for real-time cart sync)
```

## Integration Pattern 1: Product Card Component

**Location:** `components/homepage/cards/ProductCard.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useStockUpdates } from '@/contexts/SocketContext';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    // ... other fields
  };
}

export function ProductCard({ product }: ProductCardProps) {
  // Use the simplified hook for stock updates
  const { isOutOfStock, isLowStock, stockData } = useStockUpdates(product.id);
  const { actions: cartActions } = useCart();

  const handleAddToCart = () => {
    if (isOutOfStock) {
      Alert.alert('Unavailable', 'This product is out of stock');
      return;
    }

    cartActions.addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      // ... other required fields
    });
  };

  return (
    <View>
      <Text>{product.name}</Text>
      <Text>${product.price}</Text>

      {/* Real-time stock status */}
      {isOutOfStock && (
        <View style={{ backgroundColor: 'red', padding: 5 }}>
          <Text style={{ color: 'white' }}>Out of Stock</Text>
        </View>
      )}

      {isLowStock && !isOutOfStock && (
        <View style={{ backgroundColor: 'orange', padding: 5 }}>
          <Text style={{ color: 'white' }}>
            Only {stockData?.quantity} left!
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleAddToCart}
        disabled={isOutOfStock}
        style={{
          backgroundColor: isOutOfStock ? 'gray' : 'blue',
          padding: 10
        }}
      >
        <Text style={{ color: 'white' }}>
          {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Integration Pattern 2: Store Page Component

**Location:** `app/StorePage.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useSocket } from '@/contexts/SocketContext';

interface StorePageProps {
  storeId: string;
}

export function StorePage({ storeId }: StorePageProps) {
  const { subscribeToStore, unsubscribeFromStore, onStockUpdate } = useSocket();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Subscribe to all products in this store
    subscribeToStore(storeId);

    // Listen for stock updates
    const unsubscribe = onStockUpdate((payload) => {
      if (payload.storeId === storeId) {
        // Update the specific product in the list
        setProducts(prev =>
          prev.map(product =>
            product.id === payload.productId
              ? {
                  ...product,
                  stock: payload.quantity,
                  stockStatus: payload.status
                }
              : product
          )
        );
      }
    });

    // Cleanup
    return () => {
      unsubscribeFromStore(storeId);
      unsubscribe();
    };
  }, [storeId]);

  return (
    <View>
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
```

## Integration Pattern 3: Cart Page Component

**Location:** `app/CartPage.tsx`

```tsx
import React from 'react';
import { View, FlatList } from 'react-native';
import { useCart } from '@/contexts/CartContext';
import CartSocketIntegration from '@/components/cart/CartSocketIntegration';
import CartItem from '@/components/cart/CartItem';

export function CartPage() {
  const { state: cartState } = useCart();

  return (
    <View style={{ flex: 1 }}>
      {/* This component handles socket integration for cart */}
      <CartSocketIntegration />

      <FlatList
        data={cartState.items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) => item.id}
      />

      {/* Cart total and checkout button */}
    </View>
  );
}
```

## Integration Pattern 4: Product Detail Page

**Location:** `app/StoreSection/ProductInfo.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useSocket, useStockUpdates } from '@/contexts/SocketContext';
import { useCart } from '@/contexts/CartContext';

interface ProductInfoProps {
  productId: string;
  initialPrice: number;
  // ... other props
}

export function ProductInfo({ productId, initialPrice }: ProductInfoProps) {
  const { stockData, isOutOfStock, isLowStock } = useStockUpdates(productId);
  const { onPriceUpdate } = useSocket();
  const { actions: cartActions } = useCart();

  const [currentPrice, setCurrentPrice] = useState(initialPrice);

  useEffect(() => {
    // Listen for price changes
    const unsubscribe = onPriceUpdate((payload) => {
      if (payload.productId === productId) {
        const priceDiff = payload.newPrice - payload.oldPrice;
        const message = priceDiff > 0
          ? `Price increased by $${Math.abs(priceDiff).toFixed(2)}`
          : `Price dropped by $${Math.abs(priceDiff).toFixed(2)}!`;

        setCurrentPrice(payload.newPrice);
        Alert.alert('Price Update', message);
      }
    });

    return () => unsubscribe();
  }, [productId]);

  return (
    <View>
      <Text>Price: ${currentPrice}</Text>

      {/* Real-time stock indicator */}
      {isOutOfStock && (
        <Text style={{ color: 'red' }}>Out of Stock</Text>
      )}

      {isLowStock && !isOutOfStock && (
        <Text style={{ color: 'orange' }}>
          Hurry! Only {stockData?.quantity} left
        </Text>
      )}

      {stockData && !isOutOfStock && !isLowStock && (
        <Text style={{ color: 'green' }}>In Stock</Text>
      )}

      <Button
        title="Add to Cart"
        disabled={isOutOfStock}
        onPress={() => {
          /* Add to cart logic */
        }}
      />
    </View>
  );
}
```

## Integration Pattern 5: Global Connection Status

**Location:** `components/common/ConnectionStatus.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSocket } from '@/contexts/SocketContext';

export function ConnectionStatus() {
  const { state, onConnect, onDisconnect } = useSocket();
  const [visible, setVisible] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (!state.connected || state.reconnecting) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [state.connected, state.reconnecting]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: state.connected ? 'green' : 'red',
        padding: 10,
        opacity: fadeAnim,
        zIndex: 1000,
      }}
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>
        {state.reconnecting
          ? `Reconnecting... (Attempt ${state.reconnectAttempts})`
          : state.connected
          ? 'Connected'
          : 'Disconnected'}
      </Text>
    </Animated.View>
  );
}
```

## Integration Pattern 6: Cart Item with Stock Updates

**Location:** `components/cart/CartItem.tsx` (Update existing)

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useStockUpdates } from '@/contexts/SocketContext';
import { useCart } from '@/contexts/CartContext';

interface CartItemProps {
  item: {
    id: string;
    productId: string;
    name: string;
    quantity: number;
    price: number;
    // ... other fields
  };
}

export function CartItem({ item }: CartItemProps) {
  const { stockData, isOutOfStock } = useStockUpdates(item.productId);
  const { actions: cartActions } = useCart();

  // Show warning if cart quantity exceeds available stock
  const stockWarning = stockData && item.quantity > stockData.quantity;

  return (
    <View style={{ padding: 10, borderBottomWidth: 1 }}>
      <Text>{item.name}</Text>
      <Text>${item.price}</Text>

      {/* Show stock warning */}
      {stockWarning && (
        <Text style={{ color: 'orange', fontSize: 12 }}>
          Only {stockData.quantity} available
        </Text>
      )}

      {isOutOfStock && (
        <Text style={{ color: 'red', fontSize: 12 }}>
          This item is now out of stock
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => cartActions.updateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Text>-</Text>
        </TouchableOpacity>

        <Text style={{ marginHorizontal: 10 }}>{item.quantity}</Text>

        <TouchableOpacity
          onPress={() => cartActions.updateQuantity(item.id, item.quantity + 1)}
          disabled={stockWarning || isOutOfStock}
        >
          <Text>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

## Where to Add Socket Integration

### High Priority Components:
1. ✅ **ProductCard** - Show real-time stock status
2. ✅ **CartPage** - Auto-update cart when stock changes
3. ✅ **CartItem** - Show stock warnings
4. ✅ **ProductInfo** - Detailed product stock and price updates
5. ✅ **StorePage** - Store-wide stock updates

### Medium Priority:
6. **HomePage** - Update featured products
7. **SearchResults** - Update search result stock
8. **WishlistPage** - Notify users of stock changes
9. **CheckoutPage** - Validate stock before checkout

### Low Priority:
10. **Header** - Connection status indicator
11. **NotificationCenter** - Stock/price alerts
12. **ProfilePage** - Show personalized stock alerts

## Testing Checklist

- [ ] Product card shows "Out of Stock" when stock is depleted
- [ ] Product card shows "Only X left" when stock is low
- [ ] Cart automatically removes items when they go out of stock
- [ ] Cart adjusts quantities when stock decreases below cart quantity
- [ ] Price updates are reflected immediately
- [ ] Users receive alerts for stock/price changes
- [ ] Connection status is visible when disconnected
- [ ] Auto-reconnection works after network interruption
- [ ] Multiple subscriptions don't cause duplicate events
- [ ] Unsubscribe cleanup prevents memory leaks

## Performance Tips

1. **Subscribe only when visible**: Use `useEffect` with proper dependencies
2. **Batch updates**: Update multiple items at once instead of one by one
3. **Debounce alerts**: Don't show too many alerts in quick succession
4. **Clean up subscriptions**: Always return cleanup function from `useEffect`
5. **Use useCallback**: Memoize event handlers to prevent re-subscriptions

## Code Snippet: Complete Product Card

Here's a complete, production-ready ProductCard with socket integration:

```tsx
import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useStockUpdates } from '@/contexts/SocketContext';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    originalPrice?: number;
  };
}

const ProductCard = memo(({ product }: ProductCardProps) => {
  const { stockData, isOutOfStock, isLowStock } = useStockUpdates(product.id);
  const { actions: cartActions, state: cartState } = useCart();

  const isInCart = cartState.items.some(item => item.productId === product.id);

  const handleAddToCart = useCallback(() => {
    if (isOutOfStock) {
      Alert.alert('Unavailable', 'This product is currently out of stock');
      return;
    }

    cartActions.addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      image: product.image,
      originalPrice: product.originalPrice || product.price,
      discountedPrice: product.price,
      quantity: 1,
      selected: true,
      addedAt: new Date().toISOString(),
    });

    Alert.alert('Success', `${product.name} added to cart`);
  }, [isOutOfStock, product, cartActions]);

  return (
    <View style={styles.container}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {/* Add image component here */}
      </View>

      {/* Stock Badge */}
      {isOutOfStock && (
        <View style={[styles.badge, styles.outOfStockBadge]}>
          <Text style={styles.badgeText}>Out of Stock</Text>
        </View>
      )}

      {isLowStock && !isOutOfStock && (
        <View style={[styles.badge, styles.lowStockBadge]}>
          <Text style={styles.badgeText}>
            Only {stockData?.quantity} left!
          </Text>
        </View>
      )}

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>${product.price}</Text>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            (isOutOfStock || isInCart) && styles.addButtonDisabled
          ]}
          onPress={handleAddToCart}
          disabled={isOutOfStock || isInCart}
        >
          <Text style={styles.addButtonText}>
            {isOutOfStock
              ? 'Unavailable'
              : isInCart
              ? 'In Cart'
              : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  badge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockBadge: {
    backgroundColor: 'red',
  },
  lowStockBadge: {
    backgroundColor: 'orange',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProductCard;
```

---

**Summary**: The Socket integration is designed to be simple and intuitive. Most components only need to import `useStockUpdates(productId)` to get real-time updates. The context handles all connection management, subscriptions, and cleanup automatically.