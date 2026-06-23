# ProductQuickView Component

A full-screen modal component for quick product preview without full page navigation.

## Features

- **Image Carousel**: Swipeable product images with indicators
- **Product Information**: Name, brand, rating, price with discount badge
- **Variant Selection**: Inline size/color selector with visual swatches
- **Quantity Selector**: Increment/decrement controls
- **Stock Status**: Real-time stock badge (In Stock, Low Stock, Out of Stock)
- **Description**: Truncated description with "Read More" toggle
- **Actions**: Add to Cart, Wishlist toggle, Share
- **Navigation**: "View Full Details" link to product page
- **Animations**: Smooth slide-up animation with backdrop blur
- **Error Handling**: Loading states, error messages, retry functionality

## Installation

The component is already installed and exported from `@/components/product/index.ts`.

## Usage

### Basic Usage

```tsx
import React, { useState } from 'react';
import { ProductQuickView } from '@/components/product';

function MyComponent() {
  const [visible, setVisible] = useState(false);
  const [productId, setProductId] = useState('');

  return (
    <>
      <Button
        title="Quick View"
        onPress={() => {
          setProductId('product-123');
          setVisible(true);
        }}
      />

      <ProductQuickView
        visible={visible}
        productId={productId}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

### With StoreProductCard (Long Press)

```tsx
import React, { useState } from 'react';
import StoreProductCard from '@/components/store/StoreProductCard';
import { ProductQuickView } from '@/components/product';
import { useRouter } from 'expo-router';

function ProductList({ products }) {
  const router = useRouter();
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  return (
    <>
      {products.map((product) => (
        <StoreProductCard
          key={product.id}
          product={product}
          onPress={() => router.push(`/product/${product.id}`)}
          onLongPress={() => {
            setSelectedProductId(product.id);
            setQuickViewVisible(true);
          }}
        />
      ))}

      <ProductQuickView
        visible={quickViewVisible}
        productId={selectedProductId}
        onClose={() => setQuickViewVisible(false)}
        onViewFullDetails={() => {
          router.push(`/product/${selectedProductId}`);
        }}
      />
    </>
  );
}
```

### With Custom Cart Handler

```tsx
<ProductQuickView
  visible={visible}
  productId={productId}
  onClose={() => setVisible(false)}
  onAddToCart={(product, variant) => {
    console.log('Custom cart handler:', product, variant);
    // Your custom logic here
  }}
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Controls modal visibility |
| `productId` | `string` | Yes | Product ID to load details for |
| `onClose` | `() => void` | Yes | Callback when modal is closed |
| `onViewFullDetails` | `() => void` | No | Callback for "View Full Details" button |
| `onAddToCart` | `(product: ProductItem, variant?: VariantSelection) => void` | No | Custom add to cart handler |

## Component Structure

```
ProductQuickView
├── Modal (full-screen)
│   ├── Backdrop (blurred)
│   ├── Content Container (slide-in from right)
│   │   ├── Header (close button)
│   │   ├── Image Carousel
│   │   │   ├── Images (swipeable)
│   │   │   ├── Indicators
│   │   │   └── Action Icons (wishlist, share)
│   │   ├── Content Scroll
│   │   │   ├── Product Info
│   │   │   │   ├── Brand
│   │   │   │   ├── Name
│   │   │   │   ├── Rating
│   │   │   │   └── Price
│   │   │   ├── Stock Badge
│   │   │   ├── Variant Selector
│   │   │   ├── Quantity Selector
│   │   │   ├── Description
│   │   │   └── View Details Link
│   │   └── Bottom Bar (Add to Cart)
```

## Data Flow

1. **Loading**: Component fetches product details via `productsApi.getProductById()`
2. **Display**: Shows product images, info, variants, etc.
3. **Variant Selection**: Updates local state when size/color is selected
4. **Add to Cart**:
   - Uses custom handler if provided (`onAddToCart` prop)
   - Otherwise uses `CartContext.addItem()`
5. **Wishlist**: Integrates with `WishlistContext`
6. **Share**: Uses React Native's Share API

## Styling

The component uses a purple theme (`#7C3AED`) to match the app's design system.

Key style features:
- Full-screen modal
- Slide-in animation from right
- Backdrop blur effect
- Purple accents for CTAs
- Stock status color coding (green/yellow/red)
- Responsive image carousel
- Prominent "Add to Cart" button

## API Integration

The component requires:

1. **Products API** (`productsApi.getProductById()`)
   - Fetches product details by ID
   - Expected response structure:
     ```typescript
     {
       success: boolean;
       data: ProductDetails;
     }
     ```

2. **Cart Context** (`CartContext`)
   - `addItem()` method for adding to cart

3. **Wishlist Context** (`WishlistContext`)
   - `isInWishlist()` to check wishlist status
   - `addToWishlist()` and `removeFromWishlist()` for toggling

4. **Toast Hook** (`useToast`)
   - `showSuccess()` and `showError()` for notifications

## Error Handling

The component handles:
- Loading states (spinner + text)
- API errors (error message + retry button)
- Missing product data
- Network failures

## Accessibility

- Proper button labels
- Keyboard navigation support
- Screen reader compatible
- Touch-friendly targets (44x44 minimum)

## Performance

- Lazy loading of product details
- Optimized re-renders
- Native driver animations
- Efficient image carousel

## Testing

Example test scenarios:
1. Open modal and verify product loads
2. Swipe through image carousel
3. Select size/color variants
4. Adjust quantity
5. Add to cart
6. Toggle wishlist
7. Share product
8. View full details
9. Close modal
10. Test error states

## Troubleshooting

### Modal doesn't open
- Ensure `visible` prop is set to `true`
- Check `productId` is valid

### Product doesn't load
- Verify API endpoint is correct
- Check network connectivity
- Ensure product ID format is correct (24-char MongoDB ObjectId)

### Add to Cart fails
- Check CartContext is properly configured
- Verify cart API is working
- Check console for error messages

### Images don't show
- Verify image URLs are valid
- Check network permissions
- Ensure images array exists in product data

## Future Enhancements

Possible improvements:
- [ ] Product video support
- [ ] 360° product view
- [ ] Size chart integration
- [ ] Customer reviews preview
- [ ] Related products section
- [ ] Comparison mode
- [ ] AR try-on integration
- [ ] Saved for later option

## Dependencies

Required packages:
- `react-native`
- `expo-blur`
- `expo-router`
- `@expo/vector-icons`

Context providers:
- `CartProvider`
- `WishlistProvider`

## Migration Guide

If upgrading from a previous version:

1. Update imports:
   ```tsx
   // Old
   import ProductQuickView from '@/components/ProductQuickView';

   // New
   import { ProductQuickView } from '@/components/product';
   ```

2. Update prop names (if changed):
   - No breaking changes in current version

## Related Components

- `StoreProductCard` - Product card with long-press support
- `ProductVariantModal` - Variant selection modal
- `ProductPage` - Full product details page
- `CartContext` - Shopping cart management
- `WishlistContext` - Wishlist management

## Support

For issues or questions:
1. Check console logs for errors
2. Verify all dependencies are installed
3. Ensure context providers are properly set up
4. Review the example usage in `ProductQuickViewExample.tsx`

## License

Part of the REZ App frontend codebase.
