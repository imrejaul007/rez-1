# StockBadge Integration - Quick Reference

## Quick Start

### Import StockBadge
```typescript
import StockBadge from '@/components/common/StockBadge';
```

### Basic Usage
```typescript
<StockBadge
  stock={10}
  lowStockThreshold={5}
  variant="default"
  showIcon={true}
/>
```

## CartItem Integration (Already Complete)

The StockBadge is now integrated into `CartItem.tsx`:

### What You Get
- Automatic color-coded stock status badges
- Visual animations for low stock
- Quantity vs stock validation warnings
- Responsive design
- Full accessibility support

### Stock Status Display
```
✅ In Stock (Green badge)
⚠️  Low Stock - Only 3 left! (Yellow badge with pulse)
❌ Out of Stock (Red badge)
```

## CartItem Props Reference

```typescript
interface CartItemProps {
  item: CartItem;           // The cart item to display
  onRemove: (id: string) => void;  // Remove item callback
  onUpdateQuantity?: (id: string, quantity: number) => void; // Quantity change
  showAnimation?: boolean;  // Enable/disable animations (default: true)
}
```

## CartItem Type Reference

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  image: string | number;
  cashback: string;
  category: 'products' | 'service';
  quantity?: number;
  selected?: boolean;
  inventory?: {
    stock: number;                    // REQUIRED
    lowStockThreshold?: number;       // Default: 5
    trackQuantity?: boolean;
    allowBackorder?: boolean;
    reservedCount?: number;
  };
  availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  metadata?: {
    slotTime?: string;
    location?: string;
    date?: string;
    [key: string]: any;
  };
}
```

## Creating Cart Items with Stock

```typescript
// Minimal (with fallback to availabilityStatus)
const item: CartItem = {
  id: '123',
  name: 'Product',
  price: 299,
  image: 'url...',
  cashback: '₹10',
  category: 'products',
  availabilityStatus: 'in_stock', // Fallback when inventory not provided
};

// Complete (with inventory)
const item: CartItem = {
  id: '123',
  name: 'Product',
  price: 299,
  image: 'url...',
  cashback: '₹10',
  category: 'products',
  quantity: 2,
  inventory: {
    stock: 5,
    lowStockThreshold: 3,
    trackQuantity: true,
    allowBackorder: false,
  },
  availabilityStatus: 'low_stock',
};

// With event metadata
const eventItem: CartItem = {
  id: '123',
  name: 'Event Ticket',
  price: 500,
  image: 'url...',
  cashback: '₹50',
  category: 'products',
  inventory: {
    stock: 20,
  },
  metadata: {
    slotTime: '2:00 PM',
    location: 'Central Park',
    date: '2025-11-20',
  },
};
```

## Stock Status Logic

### Automatic Detection
```typescript
// How stock is determined
const stock = item.inventory?.stock ??
  (item.availabilityStatus === 'out_of_stock' ? 0 : 100);

// Low stock threshold
const lowStockThreshold = item.inventory?.lowStockThreshold ?? 5;
```

### Stock Status Conditions
- **Out of Stock**: `stock <= 0`
- **Low Stock**: `0 < stock <= lowStockThreshold`
- **In Stock**: `stock > lowStockThreshold`

## StockBadge Props Reference

```typescript
interface StockBadgeProps {
  stock: number;              // Current stock level (required)
  lowStockThreshold?: number; // When to show low stock (default: 5)
  variant?: 'default' | 'compact'; // Display variant
  showIcon?: boolean;         // Show status icon (default: true)
}
```

### Variants
- **`default`**: Full size badge with padding
- **`compact`**: Smaller badge for space-constrained areas

## Common Patterns

### Check if Product is Available
```typescript
const stock = item.inventory?.stock ?? 100;
const isAvailable = stock > 0;
```

### Check if Stock is Low
```typescript
const lowStockThreshold = item.inventory?.lowStockThreshold ?? 5;
const isLowStock = stock > 0 && stock <= lowStockThreshold;
```

### Check Quantity Validity
```typescript
const cartQuantity = item.quantity || 1;
const isQuantityValid = cartQuantity <= stock;
const hasQuantityWarning = cartQuantity > stock && stock > 0;
```

### Disable Add More Button
```typescript
const isAtMaxStock = (item.quantity || 1) >= stock;
<TouchableOpacity disabled={isAtMaxStock}>
  {/* Add button */}
</TouchableOpacity>
```

## useStockStatus Hook

```typescript
import { useStockStatus } from '@/hooks/useStockStatus';

const { isOutOfStock, isLowStock, stockMessage, canAddToCart } =
  useStockStatus({
    stock: 5,
    lowStockThreshold: 3,
  });
```

**Returns:**
```typescript
{
  isOutOfStock: boolean;     // stock <= 0
  isLowStock: boolean;       // 0 < stock <= threshold
  stockMessage: string;      // e.g., "Only 3 left!" or "In Stock"
  canAddToCart: boolean;     // stock > 0
  stockLevel: number;        // Current stock
  maxStock: number;          // Same as stock (for compatibility)
}
```

## Styling Reference

### Badge Colors
- **In Stock**: `#D1FAE5` (bg), `#059669` (text)
- **Low Stock**: `#FEF3C7` (bg), `#D97706` (text)
- **Out of Stock**: `#FEE2E2` (bg), `#DC2626` (text)

### Warning Box
- **Background**: `#FEF3C7`
- **Text**: `#D97706`
- **Border Radius**: 6px

## Best Practices

1. **Always provide stock data**
   ```typescript
   // Good
   inventory: { stock: 5 }

   // Fallback (less ideal)
   availabilityStatus: 'in_stock'
   ```

2. **Set appropriate thresholds**
   ```typescript
   // For high-demand items
   lowStockThreshold: 3

   // For regular items
   lowStockThreshold: 5

   // For slow-moving items
   lowStockThreshold: 10
   ```

3. **Track quantity when inventory matters**
   ```typescript
   inventory: {
     stock: 100,
     trackQuantity: true,  // Enable tracking
   }
   ```

4. **Use metadata for event items**
   ```typescript
   metadata: {
     slotTime: '2:00 PM',
     location: 'Venue',
     date: '2025-11-20',
   }
   ```

## Troubleshooting

### Badge Not Showing
- Check if `stock` prop is provided
- Verify `inventory` object exists on CartItem
- Fallback to `availabilityStatus` if inventory missing

### Warning Not Appearing
- Verify `quantity > stock` condition
- Check if `stock > 0` (warning only shows for partial availability)
- Check console for errors

### Animation Not Playing
- Ensure `showAnimation={true}` on CartItem
- Check device animation settings
- Verify useNativeDriver is supported

### Stock Status Incorrect
- Verify `stock` value is accurate
- Check `lowStockThreshold` value
- Confirm no stale state issues

## Files to Reference

- Component: `components/cart/CartItem.tsx`
- Badge: `components/common/StockBadge.tsx`
- Hook: `hooks/useStockStatus.ts`
- Types: `types/cart.ts`
- Guide: `STOCKBADGE_INTEGRATION_GUIDE.md`

## Version Info
- **Integration Date**: 2025-11-12
- **Status**: Complete and tested
- **Breaking Changes**: None
