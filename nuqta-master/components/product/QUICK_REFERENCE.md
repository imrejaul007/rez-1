# ProductQuickView - Quick Reference Card

## 🚀 Quick Start (30 seconds)

```tsx
import { ProductQuickView } from '@/components/product';
import { useState } from 'react';

function MyPage() {
  const [visible, setVisible] = useState(false);
  const [productId, setProductId] = useState('');

  return (
    <>
      {/* Add long-press to your product card */}
      <StoreProductCard
        product={product}
        onLongPress={() => {
          setProductId(product.id);
          setVisible(true);
        }}
      />

      {/* Add the modal */}
      <ProductQuickView
        visible={visible}
        productId={productId}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

## 📋 Props Cheat Sheet

| Prop | Type | Required | Example |
|------|------|----------|---------|
| `visible` | `boolean` | ✅ | `{modalOpen}` |
| `productId` | `string` | ✅ | `"60f8a..."` |
| `onClose` | `function` | ✅ | `() => setOpen(false)` |
| `onViewFullDetails` | `function` | ⬜ | `() => router.push(...)` |
| `onAddToCart` | `function` | ⬜ | `(prod, var) => {...}` |

## 🎨 Key Features

- ✅ Image carousel (swipe)
- ✅ Variant picker (size/color)
- ✅ Quantity selector
- ✅ Stock badge
- ✅ Add to cart
- ✅ Wishlist toggle
- ✅ Share button
- ✅ Description preview
- ✅ Loading state
- ✅ Error handling

## 🔌 Integration Points

### APIs Used
```typescript
productsApi.getProductById(productId)
cartActions.addItem(item)
addToWishlist(item) / removeFromWishlist(id)
showSuccess() / showError()
```

### Context Requirements
- `CartProvider` (wrap app)
- `WishlistProvider` (wrap app)

## 💡 Common Patterns

### Pattern 1: With Router Navigation
```tsx
<ProductQuickView
  visible={visible}
  productId={productId}
  onClose={() => setVisible(false)}
  onViewFullDetails={() => {
    router.push(`/product/${productId}`);
  }}
/>
```

### Pattern 2: Custom Add to Cart
```tsx
<ProductQuickView
  visible={visible}
  productId={productId}
  onClose={() => setVisible(false)}
  onAddToCart={(product, variant) => {
    console.log('Custom logic here');
    customAddToCart(product, variant);
  }}
/>
```

### Pattern 3: From Product List
```tsx
{products.map(product => (
  <StoreProductCard
    key={product.id}
    product={product}
    onPress={() => goToProduct(product.id)}
    onLongPress={() => openQuickView(product.id)}
  />
))}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal won't open | Check `visible` prop is `true` |
| Product won't load | Verify productId is valid MongoDB ObjectId (24 chars) |
| Images missing | Check product.images array exists |
| Cart doesn't work | Ensure CartProvider wraps app |
| Wishlist doesn't work | Ensure WishlistProvider wraps app |
| Animation stutters | Enable `useNativeDriver` (already done) |

## 📱 User Interaction Flow

1. **Long press** product card → Modal slides in
2. **Swipe** images → Carousel updates
3. **Tap** size/color → Variant selected
4. **+/-** quantity → Number updates
5. **Tap** Add to Cart → Added + Toast + Close
6. **Tap** ❤️ → Toggle wishlist
7. **Tap** 🔗 → Native share sheet
8. **Tap** "View Full Details" → Navigate + Close
9. **Tap** X or backdrop → Close

## 🎯 Best Practices

### Do ✅
- Use with long-press on product cards
- Provide `onViewFullDetails` for navigation
- Handle loading states gracefully
- Test with real product IDs
- Use TypeScript for type safety

### Don't ❌
- Open multiple modals simultaneously
- Forget to close modal after navigation
- Use invalid product IDs
- Skip error handling
- Hardcode product data

## 📊 Performance Tips

1. **Lazy load**: Modal fetches data only when opened
2. **Native animations**: Already optimized
3. **Image optimization**: Use `resizeMode="cover"`
4. **Conditional render**: Modal only renders when visible
5. **Memoize callbacks**: Use `useCallback` for handlers

## 🎨 Customization Points

### Easy to customize:
- Colors (search for `#7C3AED`)
- Animation duration (300ms default)
- Quantity limits (1-10 default)
- Description truncation (3 lines default)

### File locations:
```typescript
// Colors
styles.addToCartButton.backgroundColor = '#7C3AED'

// Animation
Animated.timing(slideAnim, { duration: 300 })

// Limits
if (newQuantity >= 1 && newQuantity <= 10)

// Truncation
numberOfLines={expandedDescription ? undefined : 3}
```

## 📦 Files Reference

```
components/product/
├── ProductQuickView.tsx        ← Main component
├── ProductQuickViewExample.tsx ← Usage examples
├── PRODUCT_QUICK_VIEW_README.md ← Full docs
├── QUICK_REFERENCE.md          ← This file
└── index.ts                    ← Exports
```

## 🔗 Related Components

- `StoreProductCard` - Product card with long-press
- `ProductVariantModal` - Variant selection
- `ProductPage` - Full product page
- `CartContext` - Cart management
- `WishlistContext` - Wishlist management

## 📞 Support

**Common imports:**
```tsx
import { ProductQuickView } from '@/components/product';
import { useState } from 'react';
import { useRouter } from 'expo-router';
```

**Common types:**
```tsx
import { ProductItem } from '@/types/homepage.types';
import { VariantSelection } from '@/components/cart/ProductVariantModal';
```

**Example usage file:**
```
components/product/ProductQuickViewExample.tsx
```

---

**Quick tip**: Long-press any product card to see the quick view in action! 🎉
