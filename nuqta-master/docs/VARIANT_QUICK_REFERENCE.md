# Variant Selection Flow - Quick Reference

## Quick Start: Using Variants in Your Store Component

### Basic Setup
```typescript
import StoreProductGrid from '@/components/store/StoreProductGrid';

export default function StoreScreen() {
  const [products, setProducts] = useState<ProductItem[]>([]);

  return (
    <StoreProductGrid
      products={products}
      loading={false}
      onProductPress={(product) => {
        // Navigate to product detail
      }}
    />
  );
}
```

### Product Data Structure (with variants)
```typescript
const productWithVariants: ProductItem = {
  id: 'prod-123',
  name: 'T-Shirt',
  brand: 'BrandName',
  type: 'product',
  price: {
    current: 800,
    original: 1000,
    currency: 'INR'
  },
  category: 'Apparel',
  availabilityStatus: 'in_stock',
  tags: [],
  image: 'https://...',
  // Variants (optional - if not provided, defaults are used)
  variants: [
    {
      id: 'v1',
      size: 'S',
      color: 'Black',
      sku: 'TSH-S-BLK',
      price: 800,
      stock: 15,
      available: true
    },
    {
      id: 'v2',
      size: 'M',
      color: 'Black',
      sku: 'TSH-M-BLK',
      price: 800,
      stock: 20,
      available: true
    }
    // ... more variants
  ]
};
```

## Helper Functions Usage

### 1. Check if Product Has Variants
```typescript
import { hasVariants } from '@/utils/variantHelper';

if (hasVariants(product)) {
  // Show variant modal
  setShowVariantModal(true);
}
```

### 2. Format Variant for Display
```typescript
import { formatVariantDisplay } from '@/utils/variantHelper';

const selection: VariantSelection = {
  size: 'M',
  color: 'Black'
};

const display = formatVariantDisplay(selection);
// Returns: "Size: M, Color: Black"
```

### 3. Create Cart Item from Variant
```typescript
import { createCartItemFromVariant } from '@/utils/variantHelper';

const variant: VariantSelection = {
  variantId: 'v1',
  size: 'M',
  color: 'Black',
  sku: 'TSH-M-BLK',
  price: 800,
  stock: 20
};

const cartItem = createCartItemFromVariant(product, variant, 1);
await cartActions.addItem(cartItem);
```

### 4. Generate Unique SKU
```typescript
import { generateVariantSku } from '@/utils/variantHelper';

const variant: VariantSelection = {
  size: 'M',
  color: 'Black'
};

const sku = generateVariantSku(product, variant);
// Returns: "PROD12-M-BLA-xyz123"
```

### 5. Validate Variant Selection
```typescript
import { isVariantSelectionComplete } from '@/utils/variantHelper';

const variant: VariantSelection = {
  size: 'M',
  color: 'Black'
};

if (isVariantSelectionComplete(variant)) {
  // All required attributes selected
  handleAddToCart();
}
```

### 6. Check Variant Stock
```typescript
import { isVariantInStock } from '@/utils/variantHelper';

if (isVariantInStock(variant, 1)) {
  // Product in stock
  addToCart();
} else {
  // Out of stock
  showError('Out of stock');
}
```

## Component Usage

### StoreProductCard
```typescript
import StoreProductCard from '@/components/store/StoreProductCard';

<StoreProductCard
  product={product}
  variants={product.variants}
  onPress={() => navigateToDetail(product)}
  onAddToCart={(variant) => {
    console.log('Added with variant:', variant);
  }}
  isFavorited={isFav}
  onWishlistToggle={toggleWishlist}
/>
```

### ProductVariantModal
```typescript
import ProductVariantModal from '@/components/cart/ProductVariantModal';

<ProductVariantModal
  visible={showModal}
  product={product}
  variants={product.variants}
  onConfirm={(variant) => {
    // Handle variant confirmation
    addToCart(variant);
  }}
  onCancel={() => setShowModal(false)}
  loading={isLoading}
/>
```

## Common Scenarios

### Scenario 1: Product Without Variants
```typescript
// Component automatically detects and adds directly
const product = { id: '123', name: 'Shirt', ... };

// User taps "Add to Cart"
// → Modal doesn't open
// → Product added immediately
// → Toast: "Added to cart!"
```

### Scenario 2: Product With Variants
```typescript
// Component detects and shows modal
const product = {
  id: '123',
  name: 'Shirt',
  variants: [...]
};

// User taps "Add to Cart"
// → Modal opens with size/color options
// → User selects M / Black
// → Taps "Add to Cart" in modal
// → Product with variant added
// → Toast: "Added to cart!"
```

### Scenario 3: Add Multiple Variants
```typescript
// Same product, different variants
const cart = [
  {
    id: 'SKU-M-BLK',
    variant: { size: 'M', color: 'Black' }
  },
  {
    id: 'SKU-L-RED',
    variant: { size: 'L', color: 'Red' }
  }
];

// Both treated as separate cart items
```

## State Management

### Cart Item with Variant
```typescript
interface CartItemWithVariant {
  id: string;                          // Unique ID (includes variant info)
  productId: string;                   // Original product ID
  name: string;
  brand: string;
  image: string;
  originalPrice: number;
  discountedPrice: number;
  quantity: number;
  variant: {                           // Full variant selection
    variantId?: string;
    size?: string;
    color?: string;
    sku?: string;
    price?: number;
    stock?: number;
    [key: string]: any;
  };
  selected: boolean;
  addedAt: string;
  category: string;
}
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const cartItem = createCartItemFromVariant(product, variant, 1);
  await cartActions.addItem(cartItem);
  showSuccess('Added to cart!');
} catch (error) {
  console.error('Failed to add to cart:', error);
  showError('Failed to add to cart. Please try again.');
}
```

### Validation Checks
```typescript
// Check if selection is complete
if (!isVariantSelectionComplete(variant)) {
  showError('Please select all options');
  return;
}

// Check stock
if (!isVariantInStock(variant)) {
  showError('Out of stock');
  return;
}

// Proceed with adding to cart
addToCart(variant);
```

## Testing Quick Commands

### Test Variant Detection
```bash
# Open store with variant products
# Tap "Add to Cart" on any product
# Check console for: hasVariants() output
```

### Test Modal Flow
```bash
# Tap "Add to Cart" on variant product
# Verify modal appears
# Select size and color
# Tap "Add to Cart" in modal
# Check cart for variant details
```

### Test Direct Add
```bash
# Tap "Add to Cart" on non-variant product
# Verify no modal appears
# Check cart for product without variant data
```

## Tips & Best Practices

1. **Always use hasVariants()** before opening modal
   ```typescript
   if (hasVariants(product)) {
     setShowModal(true);
   }
   ```

2. **Use createCartItemFromVariant()** for consistency
   ```typescript
   const item = createCartItemFromVariant(product, variant, qty);
   ```

3. **Validate before cart operations**
   ```typescript
   if (!isVariantSelectionComplete(variant)) return;
   ```

4. **Check stock availability**
   ```typescript
   if (!isVariantInStock(variant)) {
     showError('Out of stock');
   }
   ```

5. **Format variant for display**
   ```typescript
   const label = formatVariantDisplay(variant);
   // Shows: "Size: M, Color: Black"
   ```

## Debugging

### Check Variant Data
```typescript
console.log('Product has variants:', hasVariants(product));
console.log('Product variants:', product.variants);
console.log('Selected variant:', selectedVariant);
console.log('Variant display:', formatVariantDisplay(selectedVariant));
```

### Check Cart Item
```typescript
console.log('Cart item:', cartItem);
console.log('Variant SKU:', cartItem.variant.sku);
console.log('Variant info:', formatVariantDisplay(cartItem.variant));
```

### Check Modal State
```typescript
console.log('Modal visible:', showVariantModal);
console.log('Loading:', isAddingToCart);
console.log('Variants available:', variants?.length);
```

## Files to Check

- `utils/variantHelper.ts` - All variant logic
- `components/store/StoreProductCard.tsx` - Component integration
- `components/store/StoreProductGrid.tsx` - Grid integration
- `components/cart/ProductVariantModal.tsx` - Modal UI
- `contexts/CartContext.tsx` - Cart state management

## Need Help?

1. Check type definitions: `types/product-variants.types.ts`
2. Review modal implementation: `components/cart/ProductVariantModal.tsx`
3. Check CartContext: `contexts/CartContext.tsx`
4. See examples: This quick reference file
