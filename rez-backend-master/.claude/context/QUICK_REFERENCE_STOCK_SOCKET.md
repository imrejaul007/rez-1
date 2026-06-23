# Quick Reference - Stock Socket Service

## Import
```typescript
import stockSocketService from '../services/stockSocketService';
```

## Basic Usage

### Emit Stock Update
```typescript
stockSocketService.emitStockUpdate(
  'product123',  // productId
  25,            // newStock
  {
    storeId: 'store456',
    previousStock: 30,
    reason: 'purchase'  // 'purchase' | 'restock' | 'adjustment' | 'return'
  }
);
```

### Emit Low Stock Warning
```typescript
stockSocketService.emitStockLow(
  'product123',      // productId
  5,                 // currentStock
  'store456',        // storeId (optional)
  'Cool Product'     // productName (optional)
);
```

### Emit Out of Stock
```typescript
stockSocketService.emitOutOfStock(
  'product123',      // productId
  'store456',        // storeId (optional)
  'Cool Product'     // productName (optional)
);
```

## Controller Integration Examples

### Order Controller
```typescript
// In createOrder function, after stock is updated
for (const item of orderItems) {
  const product = await Product.findById(item.productId);
  if (product) {
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
```

### Product Controller
```typescript
// In updateProductStock function
stockSocketService.emitStockUpdate(
  productId,
  newStock,
  {
    storeId: product.storeId?.toString(),
    previousStock: product.stock,
    reason: 'restock'
  }
);
```

## Frontend (React Native)

### Install
```bash
npm install socket.io-client
```

### Connect & Listen
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

socket.on('connect', () => {
  socket.emit('join-room', 'all-users');
});

socket.on('stock:updated', (data) => {
  console.log('Stock updated:', data);
});

socket.on('stock:low', (data) => {
  console.log('Low stock:', data);
});

socket.on('stock:outofstock', (data) => {
  console.log('Out of stock:', data);
});
```

## Event Payloads

### stock:updated
```typescript
{
  productId: string;
  newStock: number;
  storeId?: string;
  previousStock?: number;
  timestamp: Date;
  reason?: 'purchase' | 'restock' | 'adjustment' | 'return';
}
```

### stock:low
```typescript
{
  productId: string;
  currentStock: number;
  threshold: 10;
  storeId?: string;
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
}
```

## Configuration

### Change Low Stock Threshold
```typescript
stockSocketService.setLowStockThreshold(5); // Default is 10
```

## Testing

### Browser Console
```javascript
const socket = io('http://localhost:5001');
socket.emit('join-room', 'all-users');
socket.on('stock:updated', data => console.log(data));
socket.on('stock:low', data => console.log(data));
socket.on('stock:outofstock', data => console.log(data));
```

## Documentation
- Full Guide: `STOCK_SOCKET_USAGE_EXAMPLE.md`
- Implementation Summary: `PHASE_1.2_IMPLEMENTATION_COMPLETE.md`