# Stock Socket Service - Usage Examples

This document provides examples of how to use the Stock Socket Service to emit real-time stock updates throughout the REZ app backend.

## Table of Contents
1. [Overview](#overview)
2. [Importing the Service](#importing-the-service)
3. [Example 1: Emitting Stock Updates](#example-1-emitting-stock-updates)
4. [Example 2: Using in Order Controller](#example-2-using-in-order-controller)
5. [Example 3: Using in Product Controller](#example-3-using-in-product-controller)
6. [Example 4: Using in Cart Controller](#example-4-using-in-cart-controller)
7. [Frontend Implementation](#frontend-implementation)

---

## Overview

The Stock Socket Service provides real-time stock update notifications to connected clients. It automatically handles:
- Stock updated events
- Low stock warnings (when stock <= 10)
- Out of stock alerts (when stock = 0)

All events are emitted to multiple rooms:
- Product-specific room: `product-{productId}`
- Store-specific room: `store-{storeId}` (if storeId provided)
- All users room: `all-users`
- All merchants room: `all-merchants` (for low stock & out of stock)

---

## Importing the Service

```typescript
import stockSocketService from '../services/stockSocketService';
// OR import individual functions:
import { emitStockUpdate, emitStockLow, emitOutOfStock } from '../services/stockSocketService';
```

---

## Example 1: Emitting Stock Updates

### Basic Stock Update
```typescript
// When stock is updated
stockSocketService.emitStockUpdate(
  'product123',  // productId
  25             // newStock
);
```

### Stock Update with Additional Options
```typescript
stockSocketService.emitStockUpdate(
  'product123',     // productId
  25,               // newStock
  {
    storeId: 'store456',
    previousStock: 30,
    reason: 'purchase'  // 'purchase' | 'restock' | 'adjustment' | 'return'
  }
);
```

---

## Example 2: Using in Order Controller

Update your order controller to emit stock updates when orders are placed:

```typescript
// src/controllers/orderController.ts

import stockSocketService from '../services/stockSocketService';

export const createOrder = async (req: Request, res: Response) => {
  try {
    // ... existing order creation logic ...

    // After order is created and stock is updated
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);

      if (product) {
        // Emit stock update
        stockSocketService.emitStockUpdate(
          product._id.toString(),
          product.stock,
          {
            storeId: product.storeId?.toString(),
            previousStock: product.stock + item.quantity,
            reason: 'purchase'
          }
        );
      }
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## Example 3: Using in Product Controller

Update your product controller to emit stock updates when products are restocked:

```typescript
// src/controllers/productController.ts

import stockSocketService from '../services/stockSocketService';

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const previousStock = product.stock;
    product.stock = stock;
    await product.save();

    // Emit stock update
    stockSocketService.emitStockUpdate(
      productId,
      stock,
      {
        storeId: product.storeId?.toString(),
        previousStock,
        reason: 'restock'
      }
    );

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## Example 4: Using in Cart Controller

Update your cart controller to emit stock updates when items are removed from cart (returns):

```typescript
// src/controllers/cartController.ts

import stockSocketService from '../services/stockSocketService';

export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { cartItemId } = req.params;
    const cartItem = await CartItem.findById(cartItemId).populate('productId');

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const product = cartItem.productId;
    const quantity = cartItem.quantity;

    // Remove from cart
    await cartItem.remove();

    // Update product stock (if this returns stock)
    if (product) {
      product.stock += quantity;
      await product.save();

      // Emit stock update
      stockSocketService.emitStockUpdate(
        product._id.toString(),
        product.stock,
        {
          storeId: product.storeId?.toString(),
          previousStock: product.stock - quantity,
          reason: 'return'
        }
      );
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## Frontend Implementation

### React Native (Expo) - Socket.IO Client Setup

#### 1. Install Socket.IO Client
```bash
npm install socket.io-client
```

#### 2. Create Socket Service
```typescript
// services/socketService.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5001'; // Your backend URL

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      // Join all users room
      this.socket?.emit('join-room', 'all-users');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinProductRoom(productId: string) {
    this.socket?.emit('join-room', `product-${productId}`);
  }

  leaveProductRoom(productId: string) {
    this.socket?.emit('leave-room', `product-${productId}`);
  }

  onStockUpdated(callback: (data: any) => void) {
    this.socket?.on('stock:updated', callback);
  }

  onStockLow(callback: (data: any) => void) {
    this.socket?.on('stock:low', callback);
  }

  onStockOutOfStock(callback: (data: any) => void) {
    this.socket?.on('stock:outofstock', callback);
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

#### 3. Use in React Native Component
```typescript
// components/ProductCard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import socketService from '../services/socketService';

interface Product {
  _id: string;
  name: string;
  stock: number;
  price: number;
}

export default function ProductCard({ product }: { product: Product }) {
  const [currentStock, setCurrentStock] = useState(product.stock);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Join product room
    socketService.joinProductRoom(product._id);

    // Listen for stock updates
    socketService.onStockUpdated((data) => {
      if (data.productId === product._id) {
        setCurrentStock(data.newStock);
        console.log(`Stock updated for ${product.name}: ${data.newStock}`);
      }
    });

    // Listen for low stock warnings
    socketService.onStockLow((data) => {
      if (data.productId === product._id) {
        Alert.alert(
          'Low Stock Warning',
          `Only ${data.currentStock} items left for ${product.name}!`
        );
      }
    });

    // Listen for out of stock alerts
    socketService.onStockOutOfStock((data) => {
      if (data.productId === product._id) {
        setCurrentStock(0);
        Alert.alert('Out of Stock', `${product.name} is now out of stock.`);
      }
    });

    // Cleanup
    return () => {
      socketService.leaveProductRoom(product._id);
    };
  }, [product._id]);

  return (
    <View>
      <Text>{product.name}</Text>
      <Text>${product.price}</Text>
      <Text style={{ color: currentStock <= 10 ? 'red' : 'green' }}>
        Stock: {currentStock}
      </Text>
      {currentStock === 0 && <Text style={{ color: 'red' }}>OUT OF STOCK</Text>}
      {currentStock > 0 && currentStock <= 10 && (
        <Text style={{ color: 'orange' }}>LOW STOCK</Text>
      )}
    </View>
  );
}
```

#### 4. Global Socket Context (Recommended Approach)
```typescript
// contexts/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';

interface SocketContextType {
  isConnected: boolean;
  joinProductRoom: (productId: string) => void;
  leaveProductRoom: (productId: string) => void;
  subscribeToStockUpdates: (callback: (data: any) => void) => void;
  subscribeToStockLow: (callback: (data: any) => void) => void;
  subscribeToOutOfStock: (callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socketService.disconnect();
    };
  }, []);

  const value: SocketContextType = {
    isConnected,
    joinProductRoom: (productId) => socketService.joinProductRoom(productId),
    leaveProductRoom: (productId) => socketService.leaveProductRoom(productId),
    subscribeToStockUpdates: (callback) => socketService.onStockUpdated(callback),
    subscribeToStockLow: (callback) => socketService.onStockLow(callback),
    subscribeToOutOfStock: (callback) => socketService.onStockOutOfStock(callback),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
```

---

## Advanced Usage

### Setting Custom Low Stock Threshold
```typescript
import stockSocketService from '../services/stockSocketService';

// Set threshold to 5 instead of default 10
stockSocketService.setLowStockThreshold(5);
```

### Manual Low Stock or Out of Stock Emission
```typescript
// Manually emit low stock warning
stockSocketService.emitStockLow(
  'product123',
  5,
  'store456',
  'Cool Product'
);

// Manually emit out of stock
stockSocketService.emitOutOfStock(
  'product123',
  'store456',
  'Cool Product'
);
```

### Getting Socket.IO Instance
```typescript
const io = stockSocketService.getIO();
if (io) {
  // Use io for custom emissions
  io.to('custom-room').emit('custom-event', { data: 'value' });
}
```

---

## Event Payloads

### stock:updated
```typescript
{
  productId: string;
  storeId?: string;
  newStock: number;
  previousStock?: number;
  timestamp: Date;
  reason?: 'purchase' | 'restock' | 'adjustment' | 'return';
}
```

### stock:low
```typescript
{
  productId: string;
  storeId?: string;
  currentStock: number;
  threshold: number;
  timestamp: Date;
  productName?: string;
}
```

### stock:outofstock
```typescript
{
  productId: string;
  storeId?: string;
  timestamp: Date;
  productName?: string;
  lastAvailable?: Date;
}
```

---

## Testing

### Using Postman or Socket.IO Client
1. Connect to `http://localhost:5001`
2. Join room: Emit `join-room` with value `all-users`
3. Listen for events: `stock:updated`, `stock:low`, `stock:outofstock`
4. Trigger events by making API calls that update stock

### Using Browser Console
```javascript
const socket = io('http://localhost:5001');

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('join-room', 'all-users');
});

socket.on('stock:updated', (data) => {
  console.log('Stock Updated:', data);
});

socket.on('stock:low', (data) => {
  console.log('Low Stock:', data);
});

socket.on('stock:outofstock', (data) => {
  console.log('Out of Stock:', data);
});
```

---

## Best Practices

1. **Always emit stock updates** when stock changes (orders, restocks, adjustments)
2. **Include storeId** when available for better room targeting
3. **Use appropriate reasons** to track why stock changed
4. **Handle errors gracefully** - the service logs warnings if Socket.IO isn't initialized
5. **Join appropriate rooms** on the frontend based on user context
6. **Unsubscribe/leave rooms** when components unmount to prevent memory leaks
7. **Use context/global state** for socket management instead of per-component connections

---

## Troubleshooting

### Socket.IO not initialized warning
- Make sure `stockSocketService.initialize(io)` is called in `server.ts` after Socket.IO server is created
- Check that the HTTP server is properly created and Socket.IO is attached to it

### Events not received on frontend
- Verify Socket.IO client is connected: `socket.connected` should be `true`
- Ensure you've joined the correct room before listening for events
- Check CORS settings in `server.ts` allow your frontend origin
- Verify the backend is emitting events by checking server logs

### Multiple connections
- Use a global socket instance or context provider
- Don't create new socket connections in every component
- Properly cleanup/disconnect when app is closed or user logs out

---

## Summary

The Stock Socket Service is now fully integrated and ready to use. Simply import it in any controller/service where stock changes occur and call the appropriate emit functions. The service handles all the complex Socket.IO logic, room management, and automatic low stock/out of stock detection.