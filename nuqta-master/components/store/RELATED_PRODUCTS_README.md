# RelatedProducts Component

## Overview
The `RelatedProducts` component displays a horizontal scrollable list of products related to a given product. It's designed for product discovery and cross-selling on store pages, product detail pages, and other contexts where showing similar items enhances the user experience.

## Features

### Core Features
- **Smart Product Discovery**: Fetches related products based on product ID
- **Horizontal Scrolling**: Optimized FlatList with smooth scrolling and snap-to-interval
- **Loading States**: Professional skeleton loaders during data fetch
- **Error Handling**: Graceful error states with retry functionality
- **Empty States**: User-friendly empty state when no products are available
- **Responsive Design**: Works on all screen sizes and platforms
- **Purple Theme**: Consistent with app design (#7C3AED)

### Performance Optimizations
- Lazy loading with FlatList
- `getItemLayout` for instant scrolling
- `removeClippedSubviews` for better memory usage
- Limited initial render (3 items)
- Optimized window size (5 items)
- Max render batch (5 items)

## Installation

The component is already integrated into the project structure:

```bash
# Component location
frontend/components/store/RelatedProducts.tsx

# Export location
frontend/components/store/index.ts
```

## API Integration

### Backend API Endpoint
```
GET /products/{productId}/related?limit=10
```

### Service Method
```typescript
// Located in: services/productsApi.ts
async getRelatedProducts(
  productId: string,
  limit: number = 10
): Promise<ApiResponse<ProductItem[]>>
```

### Mock Data
The component automatically falls back to 15 mock products if the backend API is unavailable, ensuring smooth development and testing.

## Usage Examples

### Basic Usage
```tsx
import { RelatedProducts } from '@/components/store';

function ProductDetailPage() {
  return (
    <View>
      {/* Other product details */}

      <RelatedProducts productId="product-123" />
    </View>
  );
}
```

### Custom Title and Limit
```tsx
<RelatedProducts
  productId="product-123"
  title="Similar Products"
  limit={8}
/>
```

### With Custom Navigation Handler
```tsx
<RelatedProducts
  productId="product-123"
  onProductPress={(product) => {
    // Custom navigation logic
    console.log('Navigating to:', product.name);
    router.push(`/product/${product.id}`);
  }}
/>
```

### Hide View All Button
```tsx
<RelatedProducts
  productId="product-123"
  showViewAll={false}
/>
```

### Complete Integration Example
```tsx
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { RelatedProducts } from '@/components/store';
import { useRouter } from 'expo-router';

export default function StorePage({ storeId, productId }: { storeId: string; productId: string }) {
  const router = useRouter();

  const handleProductPress = (product: ProductItem) => {
    // Track analytics
    trackProductView(product.id);

    // Navigate to product detail
    router.push(`/product/${product.id}`);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Store Header */}
      <StoreHeader storeId={storeId} />

      {/* Product Details */}
      <ProductDetails productId={productId} />

      {/* Related Products Section */}
      <RelatedProducts
        productId={productId}
        onProductPress={handleProductPress}
        limit={10}
        showViewAll={true}
        title="You May Also Like"
      />

      {/* Other sections */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
```

## Props API

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `productId` | `string` | Yes | - | The ID of the current product to find related items for |
| `currentProduct` | `ProductItem` | No | - | The current product object (used for category fallback) |
| `onProductPress` | `(product: ProductItem) => void` | No | Default navigation | Callback when a product card is pressed |
| `limit` | `number` | No | `10` | Maximum number of products to display |
| `showViewAll` | `boolean` | No | `true` | Show/hide "View All" button in header |
| `title` | `string` | No | `"You May Also Like"` | Section header title |

## Component States

### Loading State
Shows 3 skeleton cards in a horizontal layout with shimmer animation.

### Success State
Displays a horizontal scrollable FlatList of product cards using the `StoreProductCard` component.

### Empty State
Shows a centered message with an icon when no related products are found:
- Icon: 🛍️
- Title: "No Related Products"
- Description: Helpful message

### Error State
Shows an error message with a retry button:
- Icon: ⚠️
- Title: "Failed to Load"
- Description: Error message
- Action: "Try Again" button with loading indicator

## Styling

### Theme Colors
- **Primary Purple**: `#7C3AED` - Buttons, links, accents
- **Text Dark**: `#1F2937` - Primary text
- **Text Gray**: `#6B7280` - Secondary text
- **Error Red**: `#EF4444` - Error states
- **Background**: `#FFFFFF` - Card backgrounds

### Dimensions
- **Card Width**: 200px
- **Card Spacing**: 16px
- **Image Height**: 180px
- **Border Radius**: 12px

## Integration with MainStorePage

To integrate into your store page:

```tsx
import { RelatedProducts } from '@/components/store';

// In your MainStorePage.tsx
<ScrollView>
  {/* Existing sections */}

  {/* Add this section */}
  <RelatedProducts
    productId={selectedProductId}
    currentProduct={currentProduct}
    title="You May Also Like"
    limit={10}
  />
</ScrollView>
```

## Error Handling

The component handles errors gracefully:

1. **Network Errors**: Shows error state with retry button
2. **API Failures**: Falls back to mock data in development
3. **Empty Results**: Shows friendly empty state
4. **Invalid Product ID**: Returns null (component doesn't render)

## Performance Considerations

### FlatList Optimizations
```tsx
<FlatList
  data={products}
  horizontal
  removeClippedSubviews={true}
  maxToRenderPerBatch={5}
  initialNumToRender={3}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: CARD_WIDTH + CARD_SPACING,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  })}
/>
```

### Memory Management
- Uses `removeClippedSubviews` to unmount off-screen items
- Limited initial render (3 items)
- Small window size (5 items)
- Optimized batch rendering

## Mock Data

The component includes 15 diverse mock products covering various categories:
- Electronics (Headphones, Watch, Speaker, etc.)
- Furniture (Desk Chair)
- Home & Living (Lamp, Cable Organizer)
- Accessories (Mouse, Keyboard, Cables)
- Gaming (Mechanical Keyboard)
- Bags (Backpack)

Each mock product includes:
- High-quality images from Unsplash
- Realistic pricing (₹299 - ₹8999)
- Ratings and review counts
- Discount percentages
- Cashback information
- Stock availability
- Tags and descriptions

## Testing

### Manual Testing Checklist
- [ ] Component loads with valid productId
- [ ] Skeleton loader displays during loading
- [ ] Products display correctly after loading
- [ ] Horizontal scrolling works smoothly
- [ ] Product cards are tappable
- [ ] View All button navigates correctly
- [ ] Empty state displays when no products
- [ ] Error state displays on failure
- [ ] Retry button works after error
- [ ] Component handles missing productId
- [ ] Mock data loads when API unavailable

### Test with Different Scenarios
```tsx
// Test with valid product
<RelatedProducts productId="valid-product-123" />

// Test with invalid product
<RelatedProducts productId="invalid-product" />

// Test with custom limit
<RelatedProducts productId="product-123" limit={5} />

// Test without productId (should not render)
<RelatedProducts productId="" />
```

## Troubleshooting

### Products Not Loading
1. Check backend API connectivity
2. Verify productId is valid
3. Check network logs for API errors
4. Ensure mock data fallback is working

### Styling Issues
1. Verify theme colors are consistent
2. Check card width and spacing
3. Ensure FlatList has proper padding
4. Test on different screen sizes

### Performance Issues
1. Reduce `limit` prop (try 5-8 products)
2. Ensure images are optimized
3. Check FlatList optimization props
4. Monitor memory usage

## Future Enhancements

Potential improvements for future iterations:
- [ ] Add filter by category
- [ ] Add sort options (price, rating, popularity)
- [ ] Implement infinite scroll
- [ ] Add to wishlist functionality
- [ ] Quick view modal
- [ ] Variant selection from card
- [ ] Compare products feature
- [ ] Share product functionality

## Dependencies

- `react-native` - Core RN components
- `expo-router` - Navigation
- `@/types/homepage.types` - Type definitions
- `@/components/store/StoreProductCard` - Product card component
- `@/components/common/SkeletonLoader` - Loading skeleton
- `@/services/productsApi` - API service
- `@/hooks/useToast` - Toast notifications
- `@/contexts/CartContext` - Cart functionality (via StoreProductCard)

## Support

For issues or questions:
1. Check this documentation
2. Review component source code
3. Check related components (StoreProductCard, FrequentlyBoughtTogether)
4. Consult project documentation

## License

Part of the Rez App project. All rights reserved.
