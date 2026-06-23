# Frontend Socket.IO Integration - Phase 1.2 Complete

## Summary

Successfully implemented real-time Socket.IO integration in the REZ app frontend. The integration provides live updates for stock levels, prices, and product availability.

## Installation Completed

✅ **Package Installed:**
```bash
npm install socket.io-client@4.8.1 --legacy-peer-deps
```

## Files Created

### 1. Type Definitions
**File:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\types\socket.types.ts`

Defines all Socket.IO event types and payloads:
- `StockUpdatePayload` - Real-time stock updates
- `LowStockPayload` - Low stock alerts
- `OutOfStockPayload` - Out of stock notifications
- `PriceUpdatePayload` - Price change events
- `ProductAvailabilityPayload` - Product availability changes
- `SocketEvents` - Event name constants
- `SocketState` - Connection state interface
- Various callback type definitions

### 2. Socket Context
**File:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\contexts\SocketContext.tsx`

Main Socket.IO context with the following features:

#### Connection Management
- Auto-connect on initialization
- Auto-reconnect with exponential backoff (5 attempts max)
- Connection state tracking
- Error handling and recovery

#### Event Listeners
- `onStockUpdate(callback)` - Listen for stock updates
- `onLowStock(callback)` - Listen for low stock alerts
- `onOutOfStock(callback)` - Listen for out of stock events
- `onPriceUpdate(callback)` - Listen for price changes
- `onProductAvailability(callback)` - Listen for availability changes
- `onConnect(callback)` - Connection events
- `onDisconnect(callback)` - Disconnection events
- `onError(callback)` - Error events

#### Subscription Management
- `subscribeToProduct(productId)` - Subscribe to specific product updates
- `unsubscribeFromProduct(productId)` - Unsubscribe from product
- `subscribeToStore(storeId)` - Subscribe to all products in a store
- `unsubscribeFromStore(storeId)` - Unsubscribe from store

#### Custom Hooks
- `useSocket()` - Access socket context
- `useStockUpdates(productId)` - Simplified hook for product stock updates
  - Returns: `{ stockData, isLowStock, isOutOfStock, isInStock }`

#### Platform Support
- **Web**: Connects to `localhost:5001`
- **Android Emulator**: Automatically uses `10.0.2.2` instead of localhost
- **iOS/Physical Devices**: Configurable via IP address

### 3. Cart Integration Component
**File:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\components\cart\CartSocketIntegration.tsx`

Integrates socket events with CartContext:
- Removes items from cart when out of stock
- Updates cart quantities when stock decreases
- Notifies users of price changes
- Reloads cart data when prices update
- Provides user alerts for all stock/price changes

### 4. Layout Integration
**File:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\_layout.tsx` (Modified)

Added SocketProvider to the provider hierarchy:
```tsx
<SocketProvider>
  <LocationProvider>
    <GreetingProvider>
      <CartProvider>
        {/* Other providers */}
      </CartProvider>
    </GreetingProvider>
  </LocationProvider>
</SocketProvider>
```

### 5. Documentation
**File:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\SOCKET_USAGE_EXAMPLES.md`

Comprehensive usage examples including:
- Basic socket usage in components
- Product page integration
- Store page integration
- Cart integration patterns
- Connection status indicators
- Best practices and troubleshooting

## Configuration

### Environment Variables
Socket URL is derived from `EXPO_PUBLIC_API_BASE_URL` in `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5001/api
```

### Socket Connection Settings
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

## Usage Examples

### Example 1: Simple Stock Updates in Product Card
```tsx
import { useStockUpdates } from '@/contexts/SocketContext';

function ProductCard({ productId }) {
  const { isOutOfStock, isLowStock, stockData } = useStockUpdates(productId);

  return (
    <View>
      {isOutOfStock && <Text>Out of Stock</Text>}
      {isLowStock && <Text>Only {stockData?.quantity} left!</Text>}
    </View>
  );
}
```

### Example 2: Subscribe to Store Updates
```tsx
import { useSocket } from '@/contexts/SocketContext';

function StorePage({ storeId }) {
  const { subscribeToStore, onStockUpdate } = useSocket();

  useEffect(() => {
    subscribeToStore(storeId);

    const unsubscribe = onStockUpdate((payload) => {
      if (payload.storeId === storeId) {
        // Update UI with new stock data
      }
    });

    return () => unsubscribe();
  }, [storeId]);
}
```

### Example 3: Connection Status
```tsx
import { useSocket } from '@/contexts/SocketContext';

function Header() {
  const { state } = useSocket();

  return (
    <View>
      {state.reconnecting && (
        <Text>Reconnecting... (Attempt {state.reconnectAttempts})</Text>
      )}
      {state.error && <Text>Connection Error: {state.error}</Text>}
    </View>
  );
}
```

## Integration with Existing Systems

### CartContext Integration
The SocketContext works seamlessly with CartContext:
1. Listens for stock/price updates on cart items
2. Automatically adjusts cart quantities when stock decreases
3. Removes items when they go out of stock
4. Notifies users of price changes
5. Reloads cart to reflect backend updates

### Usage in CartPage
The CartSocketIntegration component is ready to use:
```tsx
import CartSocketIntegration from '@/components/cart/CartSocketIntegration';

function CartPage() {
  return (
    <View>
      <CartSocketIntegration />
      {/* Cart UI components */}
    </View>
  );
}
```

## Backend Connection

### Expected Backend Events
The frontend listens for these events from backend:

1. **stock:updated** - When product stock changes
   ```typescript
   {
     productId: string,
     storeId: string,
     quantity: number,
     status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
     timestamp: string
   }
   ```

2. **stock:low** - When stock falls below threshold
   ```typescript
   {
     productId: string,
     storeId: string,
     storeName: string,
     productName: string,
     quantity: number,
     threshold: number,
     timestamp: string
   }
   ```

3. **stock:outofstock** - When product becomes unavailable
   ```typescript
   {
     productId: string,
     storeId: string,
     storeName: string,
     productName: string,
     timestamp: string
   }
   ```

4. **price:updated** - When product price changes
   ```typescript
   {
     productId: string,
     storeId: string,
     oldPrice: number,
     newPrice: number,
     discountPercentage?: number,
     timestamp: string
   }
   ```

### Client -> Server Events
The frontend emits these events to backend:

1. **subscribe:product** - Subscribe to product updates
   ```typescript
   { productId: string }
   ```

2. **unsubscribe:product** - Unsubscribe from product
   ```typescript
   { productId: string }
   ```

3. **subscribe:store** - Subscribe to store updates
   ```typescript
   { storeId: string }
   ```

4. **unsubscribe:store** - Unsubscribe from store
   ```typescript
   { storeId: string }
   ```

## Testing the Integration

### 1. Start the Backend
Ensure backend is running on port 5001:
```bash
cd "C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend"
npm start
```

### 2. Start the Frontend
```bash
cd "C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend"
npm start
```

### 3. Check Console Logs
You should see:
```
🔌 [SocketContext] Initializing Socket.IO connection to: http://localhost:5001
🔌 [SocketContext] Socket connected
```

### 4. Test Stock Updates
From backend, emit a stock update event and verify frontend receives it:
```
📦 [SocketContext] Stock updated: { productId: '...', quantity: 5, ... }
```

### 5. Test Cart Integration
1. Add items to cart
2. Trigger stock update from backend
3. Verify cart updates automatically
4. Check user receives alert notification

## Troubleshooting

### Socket Not Connecting
1. ✅ Backend is running on port 5001
2. ✅ `EXPO_PUBLIC_API_BASE_URL` is set correctly in `.env`
3. ✅ For Android emulator, IP is auto-converted to `10.0.2.2`
4. ✅ For physical devices, update IP in `SocketContext.tsx` `getSocketUrl()`

### Events Not Received
1. ✅ Socket is connected (`state.connected === true`)
2. ✅ Subscribed to product/store using subscribe methods
3. ✅ Event names match backend exactly
4. ✅ Backend is emitting events (check backend logs)

### Multiple Subscriptions
- ✅ Context tracks subscribed IDs to prevent duplicates
- ✅ Auto re-subscribes after reconnection
- ✅ Cleanup functions properly unsubscribe

## Next Steps

1. **Test Integration**: Start both backend and frontend, verify connection
2. **Implement in Components**: Add useStockUpdates to product cards
3. **Add to Cart Page**: Import CartSocketIntegration component
4. **Add Status Indicator**: Show connection status in header/footer
5. **Test Edge Cases**: Simulate disconnections, stock changes, etc.

## Performance Considerations

- Socket connection is shared across entire app (single connection)
- Subscriptions are tracked to prevent duplicates
- Auto-reconnection prevents connection drops
- Events are namespaced by product/store to reduce noise
- Memory leaks prevented via cleanup functions

## Security Notes

- Socket.IO automatically handles authentication via session/cookies
- Events are validated on backend before emission
- Client cannot directly modify stock/prices (server-side only)
- Connection is encrypted when using HTTPS in production

---

## Status: ✅ COMPLETE

All Phase 1.2 requirements have been implemented:
- ✅ socket.io-client installed
- ✅ SocketContext created with connection management
- ✅ Event listeners set up for stock updates, low stock, out of stock
- ✅ Custom hooks provided: useSocket(), useStockUpdates()
- ✅ Auto-reconnect implemented
- ✅ Error handling in place
- ✅ Integration with CartContext demonstrated
- ✅ App wrapped with SocketProvider in _layout.tsx
- ✅ Comprehensive documentation provided
- ✅ Usage examples created

The frontend is now ready to receive real-time updates from the backend Socket.IO server.