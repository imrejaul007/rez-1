# Cart Validation - Quick Reference Guide

## Import

```typescript
import {
  // Main validation functions
  validateAddToCart,
  validateQuantity,
  validateStock,
  validateCartItem,

  // Utility functions
  isProductAvailable,
  getMaxAvailableQuantity,
  hasLowStock,
  getStockStatus,

  // Constants
  MAX_QUANTITY_PER_ITEM,
  MIN_QUANTITY,
  LOW_STOCK_THRESHOLD,

  // Types
  ValidationResult,
  CartValidationOptions,
  ValidatableProduct,
} from '@/utils/cartValidation';
```

## Quick Examples

### Validate Add to Cart
```typescript
const validation = validateAddToCart(
  product,          // Product object
  quantity,         // Quantity to add
  selectedVariant,  // Selected variant (or null)
  currentCartQty,   // Current quantity in cart
  {
    checkStock: true,           // Check stock availability
    checkVariants: true,        // Check variant selection
    checkQuantityLimits: true,  // Check quantity limits
  }
);

if (!validation.valid) {
  Alert.alert('Error', validation.error);
  return;
}

if (validation.warning) {
  console.log('Warning:', validation.warning);
}
```

### Validate Quantity Only
```typescript
const validation = validateQuantity(
  5,                    // Quantity to validate
  MAX_QUANTITY_PER_ITEM,// Max allowed (10)
  currentCartQty        // Current quantity in cart
);

if (!validation.valid) {
  Alert.alert('Error', validation.error);
}
```

### Check Stock Availability
```typescript
const validation = validateStock(
  product,        // Product object
  variant,        // Variant (or null)
  quantity        // Requested quantity
);

if (!validation.valid) {
  Alert.alert('Out of Stock', validation.error);
}
```

### Validate Cart Item Structure
```typescript
const validation = validateCartItem(item);

if (!validation.valid) {
  console.error('Invalid cart item:', validation.error);
}
```

## Utility Functions

### Check Availability
```typescript
const available = isProductAvailable(product, variant);
if (!available) {
  // Product is out of stock
}
```

### Get Max Quantity
```typescript
const maxQty = getMaxAvailableQuantity(
  product,
  variant,
  true  // Respect MAX_QUANTITY_PER_ITEM limit
);

setQuantity(Math.min(quantity, maxQty));
```

### Check Low Stock
```typescript
const isLowStock = hasLowStock(product, variant);
if (isLowStock) {
  // Show low stock badge
}
```

### Get Stock Status
```typescript
const status = getStockStatus(product, variant);
// Returns: 'in_stock' | 'low_stock' | 'out_of_stock'

switch (status) {
  case 'in_stock':
    // Show green badge
    break;
  case 'low_stock':
    // Show yellow badge
    break;
  case 'out_of_stock':
    // Show red badge
    break;
}
```

## Constants

```typescript
MAX_QUANTITY_PER_ITEM = 10  // Max items per product
MIN_QUANTITY = 1            // Min quantity allowed
LOW_STOCK_THRESHOLD = 5     // Low stock warning threshold
```

## Common Patterns

### ProductPage Add to Cart
```typescript
const handleAddToCart = async () => {
  if (!product) return;

  const currentQty = cartActions.getItemQuantity(productId);

  const validation = validateAddToCart(
    product,
    quantity,
    selectedVariant,
    currentQty
  );

  if (!validation.valid) {
    Alert.alert('Cannot Add to Cart', validation.error);
    return;
  }

  await cartActions.addItem(cartItem);
};
```

### Cart Quantity Update
```typescript
const handleQuantityChange = (itemId: string, newQty: number) => {
  const validation = validateQuantity(newQty, MAX_QUANTITY_PER_ITEM, 0);

  if (!validation.valid) {
    Alert.alert('Invalid Quantity', validation.error);
    return;
  }

  cartActions.updateQuantity(itemId, newQty);
};
```

### Quantity Selector Max Limit
```typescript
<TouchableOpacity
  onPress={() => {
    const maxQty = getMaxAvailableQuantity(product, variant);
    setQuantity(Math.min(quantity + 1, maxQty));
  }}
  disabled={quantity >= getMaxAvailableQuantity(product, variant)}
>
  <Text>+</Text>
</TouchableOpacity>
```

### Stock Badge Display
```typescript
const status = getStockStatus(product, variant);
const isLow = hasLowStock(product, variant);

return (
  <View>
    {status === 'out_of_stock' && (
      <Badge color="red">Out of Stock</Badge>
    )}
    {status === 'low_stock' && (
      <Badge color="yellow">Only {stock} left</Badge>
    )}
    {status === 'in_stock' && !isLow && (
      <Badge color="green">In Stock</Badge>
    )}
  </View>
);
```

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `VARIANT_REQUIRED` | No variant selected for product with variants | Select a variant |
| `OUT_OF_STOCK` | Product/variant is not available | Wait for restock or remove |
| `INSUFFICIENT_STOCK` | Quantity exceeds available stock | Reduce quantity |
| `QUANTITY_TOO_LOW` | Quantity < 1 | Increase quantity |
| `QUANTITY_TOO_HIGH` | Quantity > 10 | Reduce quantity |
| `QUANTITY_EXCEEDS_CART_LIMIT` | Current + new > max | Reduce quantity or remove from cart |
| `INVALID_CART_ITEM` | Missing required fields | Check item structure |
| `INVALID_PRODUCT` | Product is null/undefined | Check product exists |
| `INVALID_QUANTITY` | NaN, Infinity, or invalid number | Use valid number |

## Validation Options

```typescript
interface CartValidationOptions {
  checkStock?: boolean;         // Default: true
  checkVariants?: boolean;      // Default: true
  checkQuantityLimits?: boolean;// Default: true
  allowBackorder?: boolean;     // Default: false
}
```

### Example: Skip Variant Check
```typescript
// For bundle products or products without variants
const validation = validateAddToCart(product, quantity, null, 0, {
  checkVariants: false,
  checkStock: true,
});
```

### Example: Allow Backorder
```typescript
// For pre-order products
const product = {
  ...normalProduct,
  inventory: {
    ...normalProduct.inventory,
    allowBackorder: true,
  },
};
```

## TypeScript Types

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

interface ValidatableProduct {
  id: string;
  name: string;
  variants?: IProductVariant[];
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  inventory?: {
    stock?: number;
    quantity?: number;
    lowStockThreshold?: number;
    trackQuantity?: boolean;
    allowBackorder?: boolean;
  };
}
```

## Testing

```bash
# Run tests
npm test cartValidation.test.ts

# Watch mode
npm test cartValidation.test.ts -- --watch

# Coverage
npm test cartValidation.test.ts -- --coverage
```

## Tips

1. **Always check validation result** - Don't proceed if `valid` is false
2. **Show warnings to users** - Display `warning` for better UX
3. **Use constants** - Import and use `MAX_QUANTITY_PER_ITEM` instead of hardcoding
4. **Validate early** - Check before making API calls
5. **Handle errors gracefully** - Show user-friendly messages
6. **Test edge cases** - Use the test suite as reference

## Common Mistakes

❌ **Don't:**
```typescript
// Hardcoding limits
if (quantity > 10) { ... }

// Inconsistent error messages
Alert.alert('Error', 'Too many items');

// Skipping validation
await cartActions.addItem(item); // No validation
```

✅ **Do:**
```typescript
// Use constants
if (quantity > MAX_QUANTITY_PER_ITEM) { ... }

// Use validation utility
const validation = validateQuantity(quantity);
Alert.alert('Error', validation.error);

// Always validate
const validation = validateAddToCart(...);
if (!validation.valid) return;
await cartActions.addItem(item);
```

## Need Help?

- See full documentation: `CART_VALIDATION_DEDUPLICATION_SUMMARY.md`
- Check test file for examples: `__tests__/utils/cartValidation.test.ts`
- View source code: `utils/cartValidation.ts`
