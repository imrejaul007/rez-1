# Product Selector Component - Documentation

## Overview
The ProductSelector is a comprehensive, production-ready component for searching and selecting products to tag in UGC videos. It features real-time search, multi-select functionality, and a polished UI.

## Features

### Core Features
- ✅ Real-time product search with 500ms debounce
- ✅ Multi-select support (configurable max/min products)
- ✅ Single-select mode option
- ✅ Product grid display with images
- ✅ Selected products preview section
- ✅ Load more pagination
- ✅ Empty states (no results, error, no products)
- ✅ Loading states with shimmer
- ✅ Product count indicator (X/10 selected)
- ✅ Remove from selection
- ✅ Search clear functionality
- ✅ Responsive modal with animations

### Product Card Features
- Product image with fallback
- Product name (truncated if long)
- Price with currency formatting (₹)
- Original price (strikethrough if on sale)
- Discount badge (% OFF)
- Store name with icon
- Rating display (stars + count)
- Category tag
- Stock status indicators (Out of Stock, Low Stock)
- Selection checkbox
- Selected badge indicator
- Disabled state for out-of-stock items
- Accessibility support

### UX Enhancements
- Touch-friendly tap targets
- Smooth animations (modal slide-in, checkbox)
- Keyboard avoiding view
- Safe area support
- Pull to load more
- Visual feedback (selected state, disabled state)
- Clear error messages
- Retry functionality

## Installation

The component and all dependencies are already created. No additional packages needed beyond the existing project setup.

### Required Files
1. `types/product-selector.types.ts` - TypeScript definitions
2. `hooks/useProductSearch.ts` - Search and selection logic hook
3. `components/ugc/ProductCard.tsx` - Individual product card
4. `components/ugc/ProductSelector.tsx` - Main selector modal

## Usage

### Basic Example

```tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import ProductSelector from '@/components/ugc/ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';

export default function VideoUploadScreen() {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductSelectorProduct[]>([]);

  const handleProductsChange = (products: ProductSelectorProduct[]) => {
    setSelectedProducts(products);
    console.log('Selected products:', products);
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setShowProductSelector(true)}>
        <Text>Tag Products ({selectedProducts.length})</Text>
      </TouchableOpacity>

      <ProductSelector
        visible={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        selectedProducts={selectedProducts}
        onProductsChange={handleProductsChange}
        maxProducts={10}
        minProducts={1}
      />
    </View>
  );
}
```

### Advanced Example with Custom Configuration

```tsx
import React, { useState } from 'react';
import ProductSelector from '@/components/ugc/ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';

export default function AdvancedExample() {
  const [showSelector, setShowSelector] = useState(false);
  const [products, setProducts] = useState<ProductSelectorProduct[]>([]);

  return (
    <ProductSelector
      visible={showSelector}
      onClose={() => setShowSelector(false)}
      selectedProducts={products}
      onProductsChange={setProducts}

      // Configuration
      maxProducts={15}
      minProducts={5}
      title="Tag Products in Your Video"
      confirmButtonText="Add Products"

      // Options
      allowMultiple={true}
      requireSelection={true}

      // Filters (future features)
      showStoreFilter={false}
      showCategoryFilter={false}

      // Initial search
      initialSearchQuery=""
    />
  );
}
```

### Single Selection Mode

```tsx
<ProductSelector
  visible={visible}
  onClose={onClose}
  selectedProducts={selectedProducts}
  onProductsChange={onProductsChange}
  allowMultiple={false}  // Single selection only
  maxProducts={1}
  minProducts={1}
  title="Select a Product"
/>
```

### Using the Hook Separately

```tsx
import { useProductSearch } from '@/hooks/useProductSearch';

export default function CustomComponent() {
  const {
    products,
    loading,
    error,
    hasMore,
    searchProducts,
    loadMore,
    selectedProducts,
    selectProduct,
    deselectProduct,
    isSelected,
    canSelectMore,
  } = useProductSearch({
    maxProducts: 10,
    minProducts: 1,
  });

  return (
    // Your custom UI implementation
  );
}
```

## API Reference

### ProductSelector Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | **required** | Controls modal visibility |
| `onClose` | `() => void` | **required** | Called when modal closes |
| `selectedProducts` | `ProductSelectorProduct[]` | **required** | Currently selected products |
| `onProductsChange` | `(products) => void` | **required** | Called when selection changes |
| `maxProducts` | `number` | `10` | Maximum products allowed |
| `minProducts` | `number` | `1` | Minimum products required |
| `title` | `string` | `'Select Products'` | Modal header title |
| `confirmButtonText` | `string` | `'Done'` | Confirm button label |
| `allowMultiple` | `boolean` | `true` | Enable multi-select |
| `requireSelection` | `boolean` | `true` | Require min selection to confirm |
| `showStoreFilter` | `boolean` | `false` | Show store filter (future) |
| `showCategoryFilter` | `boolean` | `false` | Show category filter (future) |
| `initialSearchQuery` | `string` | `''` | Pre-fill search query |

### ProductCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `ProductSelectorProduct` | **required** | Product data |
| `isSelected` | `boolean` | **required** | Selection state |
| `onToggleSelect` | `(product) => void` | **required** | Toggle selection callback |
| `disabled` | `boolean` | `false` | Disable interaction |
| `showStore` | `boolean` | `true` | Show store name |
| `showPrice` | `boolean` | `true` | Show price |
| `showRating` | `boolean` | `true` | Show rating |
| `compactMode` | `boolean` | `false` | Compact layout |

### useProductSearch Hook

#### Options
```typescript
interface UseProductSearchOptions {
  maxProducts?: number;       // Default: 10
  minProducts?: number;       // Default: 1
  initialProducts?: Product[]; // Default: []
  debounceMs?: number;        // Default: 500
}
```

#### Returns
```typescript
{
  // State
  products: Product[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  query: string;
  total: number;

  // Actions
  searchProducts: (query: string) => void;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
  refresh: () => Promise<void>;

  // Selection
  selectedProducts: Product[];
  selectProduct: (product: Product) => boolean;
  deselectProduct: (productId: string) => void;
  toggleProduct: (product: Product) => void;
  clearSelection: () => void;
  isSelected: (productId: string) => boolean;
  canSelectMore: boolean;

  // Config
  maxProducts: number;
  minProducts: number;
}
```

## Product Data Structure

```typescript
interface ProductSelectorProduct {
  _id: string;                 // MongoDB ObjectId
  name: string;                // Product name
  description?: string;        // Product description
  basePrice: number;           // Original price
  salePrice?: number;          // Sale price (if on discount)
  images: string[];            // Product image URLs
  store: {
    _id: string;              // Store ID
    name: string;             // Store name
    logo?: string;            // Store logo URL
  };
  category?: string;           // Product category
  rating?: {
    average: number;          // Average rating (0-5)
    count: number;            // Number of ratings
  };
  inStock?: boolean;           // Stock availability
  tags?: string[];            // Product tags
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock';
}
```

## API Integration

### Backend Endpoint
```
GET http://localhost:5001/api/products
```

### Search Endpoint
```
GET http://localhost:5001/api/products/search?q=query
```

### Query Parameters
- `query` or `q` - Search query string
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort order: `newest`, `price_low`, `price_high`, `rating`
- `status` - Product status filter: `active`, `draft`, `archived`
- `visibility` - Visibility filter: `public`, `private`, `hidden`

### Response Format
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "current": 1,
      "pages": 10,
      "total": 200,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

## Styling & Theming

The component uses the app's color scheme:
- Primary: `#6366F1` (Indigo)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)
- Warning: `#F59E0B` (Amber)
- Background: `#FFFFFF` (White)
- Surface: `#F9FAFB` (Gray 50)

### Customization
To customize colors, edit the StyleSheet in:
- `ProductSelector.tsx` - Modal styles
- `ProductCard.tsx` - Card styles

## Performance Optimizations

1. **Debounced Search** - 500ms delay prevents excessive API calls
2. **Pagination** - Load 20 products at a time
3. **FlatList Optimizations** - `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`
4. **Request Cancellation** - AbortController cancels pending requests
5. **Memoization** - useCallback for all handlers
6. **Image Optimization** - resizeMode="cover" for proper scaling

## Accessibility

- All touchable elements have `accessibilityRole`
- `accessibilityLabel` for screen readers
- `accessibilityState` for selected/disabled states
- Proper hit slop for small touch targets
- Keyboard navigation support

## Error Handling

The component handles:
- Network errors (connection failed)
- API errors (backend errors)
- Empty results (no products found)
- Timeout errors (slow backend)
- Validation errors (min/max products)

## Testing

### Manual Testing Checklist
- [ ] Search functionality works
- [ ] Debounce delays API calls
- [ ] Products load and display correctly
- [ ] Selection works (multi and single)
- [ ] Max products limit enforced
- [ ] Min products validation works
- [ ] Load more pagination works
- [ ] Empty states display correctly
- [ ] Error states with retry work
- [ ] Out of stock products are disabled
- [ ] Price formatting is correct (₹)
- [ ] Discount badges show correctly
- [ ] Selected products section updates
- [ ] Remove from selection works
- [ ] Modal animations smooth
- [ ] Confirm/Cancel buttons work
- [ ] Search clear works
- [ ] Keyboard dismisses properly

### Edge Cases
- Empty product list
- Network offline
- Backend down
- Very long product names
- Missing product images
- Products without prices
- Products without ratings
- Zero search results

## Troubleshooting

### Products not loading
1. Check backend is running on `http://localhost:5001`
2. Verify API endpoint: `GET /api/products`
3. Check console for API errors
4. Verify network connectivity

### Search not working
1. Check debounce timer (500ms delay is normal)
2. Verify search endpoint: `GET /api/products/search?q=query`
3. Check console for search-related logs

### Selection not updating
1. Ensure `onProductsChange` callback is provided
2. Check `selectedProducts` prop is controlled
3. Verify state updates in parent component

### Images not displaying
1. Check image URLs are valid
2. Verify CORS settings on backend
3. Fallback to placeholder if URL invalid

## Future Enhancements

Planned features:
- [ ] Category filter dropdown
- [ ] Store filter dropdown
- [ ] Price range filter
- [ ] Sort options (price, rating, newest)
- [ ] Wishlist integration
- [ ] Recent products cache
- [ ] Offline support with cached products
- [ ] Product quick view modal
- [ ] Share product functionality
- [ ] Barcode scanner integration

## Support

For issues or questions:
1. Check console logs for errors
2. Verify API connectivity
3. Review this documentation
4. Check component props configuration

## License

Part of the REZ App project.
