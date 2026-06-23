# CrossStoreProductsSection Component

A production-ready React Native component that displays personalized product recommendations from **other stores** (cross-store recommendations).

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Props](#props)
- [API Requirements](#api-requirements)
- [Examples](#examples)
- [Customization](#customization)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- ✅ **Personalized Recommendations**: Fetches cross-store product recommendations
- ✅ **Store Badge**: Shows "From [Store Name]" badge on each product
- ✅ **Loading State**: Displays spinner while fetching data
- ✅ **Error State**: Shows error message with retry button
- ✅ **Empty State**: Displays message when no recommendations available
- ✅ **View All Button**: Navigates to search page to see more
- ✅ **Horizontal Scroll**: Smooth horizontal scrolling
- ✅ **Responsive Design**: Works on mobile, tablet, and web
- ✅ **Accessibility**: Full screen reader support
- ✅ **Add to Cart**: Integrated cart functionality
- ✅ **Wishlist**: Toggle wishlist from cards
- ✅ **Performance Optimized**: FlatList with optimizations

## 📦 Installation

The component is already created in your project:

```
frontend/components/store/CrossStoreProductsSection.tsx
```

### Dependencies

This component uses:
- `expo-router` - Navigation
- `@expo/vector-icons` - Icons
- `@/components/ThemedText` - Themed text component
- `@/components/homepage/cards/ProductCard` - Product card component
- `@/hooks/useRecommendations` - Recommendations hook

## 🚀 Usage

### Basic Usage

```tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';

function MyScreen() {
  return (
    <ScrollView>
      <CrossStoreProductsSection />
    </ScrollView>
  );
}
```

### On Store Page (Exclude Current Store)

```tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';

function StorePage() {
  const storeId = 'store-123'; // From route params

  return (
    <ScrollView>
      {/* Store content */}

      <CrossStoreProductsSection
        currentStoreId={storeId}
        limit={10}
      />
    </ScrollView>
  );
}
```

### With Custom Handler

```tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';
import { useRouter } from 'expo-router';

function MyScreen() {
  const router = useRouter();

  const handleProductPress = (productId: string, product: any) => {
    console.log('Product clicked:', product);
    router.push(`/product/${productId}`);
  };

  return (
    <ScrollView>
      <CrossStoreProductsSection
        onProductPress={handleProductPress}
        limit={8}
      />
    </ScrollView>
  );
}
```

## 🔧 Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `currentStoreId` | `string` | No | `undefined` | Store ID to exclude from recommendations |
| `onProductPress` | `(productId: string, product: ProductItem) => void` | No | Navigate to `/product/[id]` | Custom product click handler |
| `limit` | `number` | No | `10` | Number of products to fetch |

## 🌐 API Requirements

The component uses the `usePersonalizedRecommendations` hook which expects:

### Endpoint
```
GET /api/recommendations/personalized?limit=10
```

### Response Format
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "product-1",
        "_id": "product-1",
        "name": "Product Name",
        "brand": "Brand Name",
        "image": "https://...",
        "price": {
          "current": 999,
          "original": 1499,
          "discount": 33
        },
        "storeName": "Store ABC",
        "storeId": "store-456",
        "category": "Electronics",
        "rating": {
          "value": 4.5,
          "count": 120
        },
        "availabilityStatus": "in_stock",
        "inventory": {
          "stock": 50
        }
      }
    ]
  }
}
```

### Required Fields
- `id` or `_id` - Product ID
- `name` - Product name
- `image` - Product image URL
- `price.current` - Current price
- `storeName` - Store name (for badge)
- `storeId` - Store ID (for filtering)

## 📚 Examples

See `CrossStoreProductsSection.example.tsx` for detailed examples:

1. **Basic Example** - Default usage
2. **Store Page Example** - Exclude current store
3. **Custom Handler Example** - Custom product click logic
4. **Limited Example** - Show fewer products
5. **Product Detail Example** - Cross-store alternatives
6. **Full Store Page Example** - Complete integration
7. **Advanced Example** - With analytics

## 🎨 Customization

### Card Width

Modify `getCardWidth()` function:

```tsx
const getCardWidth = () => {
  if (Platform.OS === 'web') {
    if (SCREEN_WIDTH >= 1024) return 240; // Desktop
    if (SCREEN_WIDTH >= 768) return 210; // Tablet
  }
  return 180; // Mobile
};
```

### Colors

Update colors in `styles`:

```tsx
const styles = StyleSheet.create({
  // Primary color
  title: {
    color: '#111827', // Change to your brand color
  },
  viewAllText: {
    color: '#8B5CF6', // Change to your brand color
  },
  // ... more styles
});
```

### Badge Style

Customize the store badge:

```tsx
storeBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F5F3FF', // Change background
  borderColor: '#E9D5FF', // Change border
  // ... more styles
},
```

## ♿ Accessibility

The component is fully accessible:

- **Screen Reader Support**: All elements have proper labels
- **Semantic Roles**: Uses proper accessibility roles
- **Keyboard Navigation**: Fully keyboard accessible on web
- **Hints**: Provides helpful hints for actions

### Accessibility Labels

```tsx
// Section label
accessibilityLabel="Cross-store product recommendations section"

// Product label
accessibilityLabel={`Product ${index + 1} of ${products.length}. ${item.name} from ${item.storeName}`}

// View All button
accessibilityLabel="View all recommendations"
accessibilityHint="Double tap to see all recommended products"
```

## ⚡ Performance

### Optimizations

1. **FlatList Optimizations**:
   - `getItemLayout` - Fixed item heights
   - `initialNumToRender={3}` - Render 3 items initially
   - `maxToRenderPerBatch={3}` - Render 3 items per batch
   - `windowSize={5}` - Render 5 screens worth of items
   - `removeClippedSubviews` - Remove off-screen items (Android)

2. **Memoization**:
   - `useMemo` for filtered products
   - `useCallback` for handlers
   - Prevents unnecessary re-renders

3. **Image Loading**:
   - ProductCard uses optimized images
   - Lazy loading via FlatList

### Performance Tips

- Keep `limit` reasonable (10-20 products)
- Use `currentStoreId` to filter products server-side if possible
- Consider pagination for large datasets

## 🐛 Troubleshooting

### No recommendations showing

**Check:**
1. API endpoint is configured correctly
2. `usePersonalizedRecommendations` hook is working
3. User is authenticated (if required)
4. Backend is returning data

**Debug:**
```tsx
const { recommendations, loading, error } = usePersonalizedRecommendations({
  autoFetch: true,
  limit: 10,
});

console.log('Recommendations:', recommendations);
console.log('Loading:', loading);
console.log('Error:', error);
```

### Store badge not showing

**Check:**
1. API response includes `storeName` field
2. Product data is being mapped correctly
3. Badge is not hidden by ProductCard styles

**Debug:**
```tsx
console.log('Product storeName:', item.storeName);
```

### Products from current store showing

**Check:**
1. `currentStoreId` prop is passed correctly
2. Product `storeId` matches `currentStoreId`
3. Filter logic is working

**Debug:**
```tsx
console.log('Current Store ID:', currentStoreId);
console.log('Product Store ID:', product.storeId);
```

### Performance issues

**Check:**
1. Too many products? Reduce `limit`
2. Images too large? Optimize images
3. FlatList not optimized? Check optimization settings

**Optimize:**
```tsx
// Reduce initial render
initialNumToRender={2}

// Increase window size for smoother scroll
windowSize={7}

// Enable clipping on Android
removeClippedSubviews={Platform.OS === 'android'}
```

## 📝 Component States

### 1. Loading State
- Shows spinner
- Displays "Loading recommendations..." text

### 2. Error State
- Shows error icon
- Displays error message
- Retry button to refetch

### 3. Empty State
- Shows basket icon
- Displays "No recommendations available" message

### 4. Success State
- Shows horizontal scrollable product list
- Each product has store badge
- View All button in header

## 🔗 Related Components

- `ProductCard` - Displays individual products
- `StoreCard` - Displays stores
- `HorizontalScrollSection` - Generic horizontal scroll
- `RecommendationCard` - Alternative recommendation card

## 📄 License

This component is part of the Rez App frontend.

---

## 🙋 Need Help?

- Check the examples in `CrossStoreProductsSection.example.tsx`
- Review the API requirements section
- See troubleshooting guide above
- Check console logs for errors
