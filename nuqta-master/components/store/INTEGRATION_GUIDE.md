# CrossStoreProductsSection - Quick Integration Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Import the Component

```tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';
```

### Step 2: Add to Your Screen

**On Store Page:**
```tsx
import { useLocalSearchParams } from 'expo-router';

export default function StorePage() {
  const { id } = useLocalSearchParams(); // Get store ID from route

  return (
    <ScrollView>
      {/* Your store content */}

      <CrossStoreProductsSection
        currentStoreId={id as string}
        limit={10}
      />

      {/* More content */}
    </ScrollView>
  );
}
```

**On Product Page:**
```tsx
export default function ProductPage() {
  const storeId = product?.store?._id; // Get from product data

  return (
    <ScrollView>
      {/* Product details */}

      <CrossStoreProductsSection
        currentStoreId={storeId}
        limit={8}
      />
    </ScrollView>
  );
}
```

**On Homepage:**
```tsx
export default function HomePage() {
  return (
    <ScrollView>
      {/* Other sections */}

      <CrossStoreProductsSection limit={10} />
    </ScrollView>
  );
}
```

### Step 3: Verify Setup

1. **Check API is configured**: The component uses `/api/recommendations/personalized`
2. **Check hook is working**: `usePersonalizedRecommendations` should be available
3. **Run the app**: You should see recommendations appear

---

## 📱 Common Use Cases

### 1. Store Page - Show Alternatives from Other Stores

```tsx
// app/Store.tsx or app/store/[id].tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';
import { useLocalSearchParams } from 'expo-router';

export default function StoreDetailPage() {
  const { id } = useLocalSearchParams();

  return (
    <ScrollView style={styles.container}>
      {/* Store Header */}
      <StoreHeader storeId={id} />

      {/* Store Products */}
      <StoreProductsGrid storeId={id} />

      {/* Cross-Store Recommendations */}
      <CrossStoreProductsSection
        currentStoreId={id as string}
        limit={10}
      />

      {/* Other Store Sections */}
      <StoreReviews storeId={id} />
    </ScrollView>
  );
}
```

### 2. Product Page - Similar Products from Other Stores

```tsx
// app/product/[id].tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';
import { useRouter } from 'expo-router';

export default function ProductDetailPage() {
  const router = useRouter();
  const product = useProduct(); // Your hook to get product data

  const handleProductPress = (productId: string, product: any) => {
    // Track analytics
    analytics.track('cross_store_product_clicked', {
      fromProduct: product.id,
      toProduct: productId,
    });

    // Navigate
    router.push(`/product/${productId}`);
  };

  return (
    <ScrollView>
      {/* Product Details */}
      <ProductDetails product={product} />

      {/* Similar from Same Store */}
      <SimilarProducts storeId={product.storeId} />

      {/* Cross-Store Alternatives */}
      <CrossStoreProductsSection
        currentStoreId={product.storeId}
        onProductPress={handleProductPress}
        limit={8}
      />
    </ScrollView>
  );
}
```

### 3. Homepage - Personalized Recommendations

```tsx
// app/(tabs)/index.tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';

export default function HomePage() {
  return (
    <ScrollView>
      {/* Hero Banner */}
      <HeroBanner />

      {/* Events */}
      <EventsSection />

      {/* New Arrivals */}
      <NewArrivalsSection />

      {/* Cross-Store Recommendations */}
      <CrossStoreProductsSection limit={10} />

      {/* Trending Stores */}
      <TrendingStoresSection />
    </ScrollView>
  );
}
```

---

## 🔧 Advanced Configuration

### Custom Product Click Handler with Analytics

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function MyPage() {
  const analytics = useAnalytics();
  const router = useRouter();

  const handleProductPress = (productId: string, product: any) => {
    // Track event
    analytics.track('cross_store_product_clicked', {
      productId,
      productName: product.name,
      storeId: product.storeId,
      storeName: product.storeName,
      price: product.price.current,
      source: 'store_page',
    });

    // Navigate with params
    router.push({
      pathname: `/product/${productId}`,
      params: {
        from: 'cross-store-recommendations',
        sourceStore: currentStoreId,
      },
    });
  };

  return (
    <CrossStoreProductsSection
      onProductPress={handleProductPress}
      limit={10}
    />
  );
}
```

### Dynamic Limit Based on Screen Size

```tsx
import { useWindowDimensions } from 'react-native';

function MyPage() {
  const { width } = useWindowDimensions();

  // Show more products on larger screens
  const limit = width >= 1024 ? 15 : width >= 768 ? 12 : 10;

  return (
    <CrossStoreProductsSection limit={limit} />
  );
}
```

### Conditional Rendering Based on User State

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyPage() {
  const { isAuthenticated } = useAuth();

  return (
    <ScrollView>
      {/* Only show recommendations for authenticated users */}
      {isAuthenticated && (
        <CrossStoreProductsSection limit={10} />
      )}
    </ScrollView>
  );
}
```

---

## 🧪 Testing

### Test if Component is Working

Add this to your page to debug:

```tsx
import { usePersonalizedRecommendations } from '@/hooks/useRecommendations';

function DebugPage() {
  const { recommendations, loading, error } = usePersonalizedRecommendations({
    autoFetch: true,
    limit: 10,
  });

  console.log('Recommendations:', recommendations);
  console.log('Loading:', loading);
  console.log('Error:', error);

  return <CrossStoreProductsSection limit={10} />;
}
```

### Mock Data for Testing

If the API is not ready, you can mock the hook:

```tsx
// For testing only
jest.mock('@/hooks/useRecommendations', () => ({
  usePersonalizedRecommendations: () => ({
    recommendations: [
      {
        id: 'test-1',
        name: 'Test Product',
        price: { current: 999 },
        image: 'https://via.placeholder.com/200',
        storeName: 'Test Store',
        storeId: 'test-store-1',
      },
    ],
    loading: false,
    error: null,
    fetch: jest.fn(),
    refresh: jest.fn(),
  }),
}));
```

---

## ✅ Pre-Integration Checklist

Before integrating, make sure:

- [ ] `usePersonalizedRecommendations` hook is available
- [ ] API endpoint `/api/recommendations/personalized` is working
- [ ] Backend returns data in expected format
- [ ] `ProductCard` component is available
- [ ] `CartContext` is set up
- [ ] `WishlistContext` is set up
- [ ] `expo-router` is configured
- [ ] Icons are working (`@expo/vector-icons`)

---

## 🐛 Common Issues & Solutions

### Issue: Component not showing

**Solution:**
```tsx
// Check if recommendations are being fetched
const { recommendations, loading, error } = usePersonalizedRecommendations({
  autoFetch: true,
  limit: 10,
});

console.log('Recommendations count:', recommendations.length);
console.log('Loading state:', loading);
console.log('Error:', error);
```

### Issue: Products from current store showing

**Solution:**
```tsx
// Make sure to pass currentStoreId
<CrossStoreProductsSection
  currentStoreId={storeId} // Must be a string
  limit={10}
/>

// Or filter on backend by adding excludeStoreId param
```

### Issue: Store badge not showing

**Solution:**
```tsx
// Verify storeName is in API response
// Check product data structure:
console.log('Product:', product);
console.log('Store Name:', product.storeName);
console.log('Store ID:', product.storeId);
```

### Issue: Navigation not working

**Solution:**
```tsx
// Make sure expo-router is set up
import { useRouter } from 'expo-router';

const router = useRouter();

// Custom handler
const handleProductPress = (productId: string) => {
  router.push(`/product/${productId}`);
};
```

---

## 📊 Performance Tips

1. **Limit products**: Don't fetch more than 15-20 products
2. **Pagination**: Consider adding pagination for large datasets
3. **Caching**: API should cache recommendations
4. **Lazy loading**: FlatList handles this automatically
5. **Image optimization**: Use optimized images from backend

---

## 🎨 Customization Examples

### Change Colors

```tsx
// Edit styles in CrossStoreProductsSection.tsx
const styles = StyleSheet.create({
  title: {
    color: '#YOUR_COLOR', // Change title color
  },
  viewAllText: {
    color: '#YOUR_COLOR', // Change button color
  },
  storeBadge: {
    backgroundColor: '#YOUR_COLOR', // Change badge color
  },
});
```

### Change Card Width

```tsx
// Edit getCardWidth() function
const getCardWidth = () => {
  if (Platform.OS === 'web') {
    if (SCREEN_WIDTH >= 1024) return 240; // Your width
    if (SCREEN_WIDTH >= 768) return 210; // Your width
  }
  return 180; // Your width
};
```

### Change Section Title

```tsx
// Edit title in component
<ThemedText style={styles.title}>
  Your Custom Title
</ThemedText>
```

---

## 📚 Additional Resources

- [Full README](./CrossStoreProductsSection.README.md)
- [Usage Examples](./CrossStoreProductsSection.example.tsx)
- [Type Definitions](./CrossStoreProductsSection.types.ts)
- [Tests](./CrossStoreProductsSection.test.tsx)

---

## 🆘 Support

If you encounter issues:

1. Check console logs for errors
2. Verify API is returning data
3. Check network tab in dev tools
4. Review examples in `CrossStoreProductsSection.example.tsx`
5. Run tests: `npm test CrossStoreProductsSection.test.tsx`

---

**Happy coding! 🚀**
