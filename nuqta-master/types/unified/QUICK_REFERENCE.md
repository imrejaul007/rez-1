# Unified Types - Quick Reference Guide

## 📁 File Structure

```
types/unified/
├── Product.ts         # Canonical Product interface
├── Store.ts           # Canonical Store interface
├── Cart.ts            # Canonical CartItem interface
├── User.ts            # Canonical User interface
├── Order.ts           # Canonical Order interface
├── Review.ts          # Canonical Review interface
├── guards.ts          # Runtime type checking
├── converters.ts      # Data normalization
├── validators.ts      # Data validation
├── migrations.ts      # Migration utilities
└── index.ts           # Central exports
```

## 🚀 Quick Start

### Import Everything You Need

```typescript
import {
  // Types
  Product,
  Store,
  CartItem,
  User,
  Order,
  Review,

  // Converters
  toProduct,
  toStore,
  toCartItem,
  toOrder,
  toReview,

  // Type Guards
  isProduct,
  isProductAvailable,
  isStore,
  isStoreOpen,

  // Validators
  validateProduct,
  validateStore,

  // Migrations
  migrateId,
  migrateToUnifiedType,
} from '@/types/unified';
```

## 📋 Common Patterns

### Converting API Response

```typescript
// Single item
const product = toProduct(apiResponse.data);

// Array
const products = apiResponse.data.map(toProduct);

// With migration
const product = migrateToUnifiedType(apiResponse.data, 'product');
```

### Type Checking

```typescript
// Type guard
if (isProduct(data)) {
  // TypeScript knows data is Product
  console.log(data.name);
}

// Availability check
if (isProductAvailable(product)) {
  // Show add to cart
}

// Stock check
if (isProductLowStock(product)) {
  // Show low stock warning
}
```

### Validation

```typescript
// Validate data
const result = validateProduct(product);

if (!result.valid) {
  result.errors.forEach((error) => {
    console.error(`${error.field}: ${error.message}`);
  });
}
```

### ID Migration

```typescript
// Single object
const normalized = migrateId(mongoObject); // _id → id

// Deep nested
const normalized = deepMigrateIds(complexObject);

// Array
const normalized = migrateIds(arrayOfObjects);
```

## 🔑 Key Field Access

### Product

```typescript
product.id                    // Standard ID
product.name                  // Product name
product.price.current         // Current price
product.price.original        // Original price
product.price.discount        // Discount %
product.images[0].url         // First image
product.primaryImage          // Quick access to first image
product.rating?.value         // Rating (0-5)
product.rating?.count         // Number of ratings
product.inventory.stock       // Stock quantity
product.inventory.isAvailable // Can purchase?
product.availabilityStatus    // 'in_stock' | 'low_stock' | 'out_of_stock'
```

### Store

```typescript
store.id                      // Standard ID
store.name                    // Store name
store.location.address        // Full address
store.location.city           // City
store.location.coordinates    // { latitude, longitude }
store.status.isOpen           // Currently open?
store.status.status           // 'open' | 'closed' | 'closing_soon'
store.hours.monday            // Monday hours
store.rating?.value           // Rating (0-5)
store.contact.phone           // Phone number
store.contact.email           // Email
```

### CartItem

```typescript
item.id                       // Cart item ID
item.productId                // Product reference
item.name                     // Product name
item.price                    // Current price (number)
item.quantity                 // Quantity in cart
item.image                    // Product image URL
item.variant                  // Selected variant
item.inventory.stock          // Available stock
item.availabilityStatus       // Stock status
```

### User

```typescript
user.id                       // User ID
user.email                    // Email address
user.profile.name             // Full name
user.profile.avatar           // Avatar URL
user.addresses                // Array of addresses
user.defaultAddressId         // Default address
user.walletBalance            // Wallet balance
user.cashbackBalance          // Cashback balance
user.loyaltyTier              // 'bronze' | 'silver' | 'gold' | 'platinum'
```

### Order

```typescript
order.id                      // Order ID
order.orderNumber             // Display number
order.status                  // Order status
order.paymentStatus           // Payment status
order.deliveryStatus          // Delivery status
order.items                   // Order items array
order.pricing.total           // Total amount
order.pricing.subtotal        // Subtotal
order.pricing.discount        // Discount amount
order.shippingAddress         // Delivery address
order.tracking                // Tracking info
```

### Review

```typescript
review.id                     // Review ID
review.type                   // 'product' | 'store' | 'order'
review.rating                 // Rating (1-5)
review.comment                // Review text
review.user.name              // Reviewer name
review.verified               // Verified purchase?
review.images                 // Review images
review.helpful                // Helpful count
review.merchantReply          // Store response
```

## 🛠️ Helper Functions

### Product Helpers

```typescript
import {
  isProductAvailable,
  isProductLowStock,
  isProductOutOfStock,
  isProductOnSale,
  getProductDiscount,
  formatProductPrice,
} from '@/types/unified';

// Check availability
if (isProductAvailable(product)) { }

// Check stock level
if (isProductLowStock(product)) { }

// Check if on sale
if (isProductOnSale(product)) { }

// Get discount percentage
const discount = getProductDiscount(product); // number

// Format price
const formatted = formatProductPrice(product.price.current); // "₹1,999"
```

### Store Helpers

```typescript
import {
  isStoreOpen,
  isStoreVerified,
  isDeliveryAvailable,
  isPickupAvailable,
} from '@/types/unified';

// Check if open
if (isStoreOpen(store)) { }

// Check verification
if (isStoreVerified(store)) { }

// Check delivery
if (isDeliveryAvailable(store)) { }
```

### Cart Helpers

```typescript
import {
  calculateItemTotal,
  calculateCartSubtotal,
  getSelectedItems,
  isCartEmpty,
} from '@/types/unified';

// Calculate item total
const total = calculateItemTotal(cartItem);

// Calculate subtotal
const subtotal = calculateCartSubtotal(cartItems);

// Get selected items
const selected = getSelectedItems(cartItems);

// Check if empty
if (isCartEmpty(cartState)) { }
```

### Review Helpers

```typescript
import {
  getRatingPercentage,
  getRatingDistributionPercentages,
  isRecentReview,
  formatReviewDate,
} from '@/types/unified';

// Get percentage
const percentage = getRatingPercentage(4.5, 5); // 90

// Get distribution %
const dist = getRatingDistributionPercentages(breakdown, total);

// Check if recent
if (isRecentReview(review)) { }

// Format date
const formatted = formatReviewDate(review.createdAt); // "2 days ago"
```

## 🔄 Migration Examples

### Migrate _id to id

```typescript
// Before
const product = { _id: '123', name: 'Product' };

// After
import { migrateId } from '@/types/unified';
const product = migrateId({ _id: '123', name: 'Product' });
// Result: { id: '123', name: 'Product' }
```

### Migrate Price Format

```typescript
// Before
const data = { price: 1999, originalPrice: 2999 };

// After
import { migratePriceFormat } from '@/types/unified';
const migrated = migratePriceFormat(data);
// Result: { price: { current: 1999, original: 2999, currency: 'INR', discount: 33 } }
```

### Migrate Rating Format

```typescript
// Before
const data = { rating: 4.5, reviewCount: 120 };

// After
import { migrateRatingFormat } from '@/types/unified';
const migrated = migrateRatingFormat(data);
// Result: { rating: { value: 4.5, count: 120, maxValue: 5 } }
```

### Full Migration

```typescript
// Before (any format)
const oldProduct = { /* ... */ };

// After
import { migrateToUnifiedType } from '@/types/unified';
const product = migrateToUnifiedType(oldProduct, 'product');
```

## 🎯 Component Examples

### Product Card

```typescript
import { Product, isProductAvailable, formatProductPrice } from '@/types/unified';

function ProductCard({ product }: { product: Product }) {
  return (
    <View>
      <Image source={{ uri: product.primaryImage }} />
      <Text>{product.name}</Text>
      <Text>{formatProductPrice(product.price.current)}</Text>
      {product.price.original && (
        <Text style={styles.strikethrough}>
          {formatProductPrice(product.price.original)}
        </Text>
      )}
      {product.rating && (
        <Text>{product.rating.value}⭐ ({product.rating.count})</Text>
      )}
      {isProductAvailable(product) ? (
        <Button title="Add to Cart" />
      ) : (
        <Text>Out of Stock</Text>
      )}
    </View>
  );
}
```

### Store Card

```typescript
import { Store, isStoreOpen } from '@/types/unified';

function StoreCard({ store }: { store: Store }) {
  return (
    <View>
      <Image source={{ uri: store.logo }} />
      <Text>{store.name}</Text>
      <Text>{store.location.city}</Text>
      <Badge color={isStoreOpen(store) ? 'green' : 'red'}>
        {store.status.status}
      </Badge>
      {store.rating && (
        <Text>{store.rating.value}⭐</Text>
      )}
    </View>
  );
}
```

### Cart Item

```typescript
import { CartItem, isCartItemAvailable } from '@/types/unified';

function CartItemCard({ item }: { item: CartItem }) {
  return (
    <View>
      <Image source={{ uri: item.image }} />
      <Text>{item.name}</Text>
      <Text>₹{item.price} × {item.quantity}</Text>
      <Text>Total: ₹{item.price * item.quantity}</Text>
      {!isCartItemAvailable(item) && (
        <Text style={styles.error}>Out of Stock</Text>
      )}
    </View>
  );
}
```

## 📚 Type Definitions

### Product Price

```typescript
interface ProductPrice {
  current: number;      // Required
  original?: number;
  currency: string;     // Required
  discount?: number;
  savings?: number;
  formatted?: string;
}
```

### Product Rating

```typescript
interface ProductRating {
  value: number;        // 0-5
  count: number;
  maxValue?: number;    // Default: 5
  breakdown?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
```

### Product Image

```typescript
interface ProductImage {
  id?: string;
  url: string;          // Required
  alt: string;          // Required
  thumbnail?: string;
  fullsize?: string;
  width?: number;
  height?: number;
  order?: number;
  isPrimary?: boolean;
}
```

### Product Inventory

```typescript
interface ProductInventory {
  stock: number;                  // Required
  isAvailable: boolean;           // Required
  lowStockThreshold?: number;     // Default: 5
  trackQuantity?: boolean;        // Default: true
  allowBackorder?: boolean;       // Default: false
  reservedCount?: number;
  estimatedRestockDate?: string | Date;
  maxOrderQuantity?: number;
  minOrderQuantity?: number;      // Default: 1
}
```

## 🚨 Common Pitfalls

### ❌ Don't Access _id

```typescript
// ❌ Wrong
const id = product._id;

// ✅ Correct
const id = product.id;
```

### ❌ Don't Use Simple Types for Complex Data

```typescript
// ❌ Wrong
const price = product.price; // Assumes number

// ✅ Correct
const price = product.price.current;
```

### ❌ Don't Forget Optional Chaining

```typescript
// ❌ Wrong
const rating = product.rating.value; // May be undefined

// ✅ Correct
const rating = product.rating?.value || 0;
```

### ❌ Don't Use String for Images

```typescript
// ❌ Wrong
<Image source={{ uri: product.image }} />

// ✅ Correct
<Image source={{ uri: product.primaryImage || product.images[0]?.url }} />
```

## 🔍 TypeScript Tips

### Use Type Guards

```typescript
// Instead of type assertions
const product = data as Product; // ❌ Unsafe

// Use type guards
if (isProduct(data)) {
  const product = data; // ✅ Type-safe
}
```

### Use Pick for Subsets

```typescript
// Instead of duplicating types
interface CardProps {
  id: string;
  name: string;
  price: number;
} // ❌ Duplication

// Use Pick
type CardProps = Pick<Product, 'id' | 'name' | 'price'>; // ✅ DRY
```

### Use Partial for Updates

```typescript
// Instead of making everything optional
interface UpdateProduct {
  id?: string;
  name?: string;
  // ...
} // ❌ Tedious

// Use Partial
type UpdateProduct = Partial<Product>; // ✅ Clean
```

## 📖 Further Reading

- **Full Report**: See `UNIFIED_TYPE_SYSTEM_REPORT.md`
- **Type Files**: Check inline documentation in each type file
- **Examples**: See `types/unified/index.ts` for usage examples
- **Migration Guide**: See Phase 1-4 in the full report

## 💡 Pro Tips

1. **Always use type guards** before accessing optional fields
2. **Use converters** at API boundaries
3. **Validate data** before sending to backend
4. **Migrate progressively** - don't try to update everything at once
5. **Test after each change** - catch issues early
6. **Use IDE autocomplete** - let TypeScript guide you

---

**Last Updated**: November 14, 2025
**Version**: 1.0
