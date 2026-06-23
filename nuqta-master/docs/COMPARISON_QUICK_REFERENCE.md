# Product Comparison - Quick Reference

## 🚀 Quick Start (5 minutes)

### 1. Add Provider to App
```typescript
// app/_layout.tsx
import { ComparisonProvider } from '@/contexts/ComparisonContext';

<ComparisonProvider>
  <YourApp />
</ComparisonProvider>
```

### 2. Add Compare Button
```typescript
import { useComparison } from '@/contexts/ComparisonContext';

const { addProduct, isInComparison } = useComparison();

<Button
  title={isInComparison(product.id) ? "In Comparison" : "Compare"}
  onPress={() => addProduct(product)}
/>
```

### 3. Show Comparison Badge
```typescript
const { count } = useComparison();

{count > 0 && (
  <View style={styles.badge}>
    <Text>{count}</Text>
  </View>
)}
```

### 4. Create Comparison Page
```typescript
import { ProductComparison } from '@/components/product';
import { useComparison } from '@/contexts/ComparisonContext';

export default function ComparisonPage() {
  const { products, removeProduct } = useComparison();

  return (
    <ProductComparison
      products={products}
      onRemoveProduct={removeProduct}
      onAddToCart={(id) => console.log('Add:', id)}
      onViewProduct={(id) => router.push(`/product/${id}`)}
    />
  );
}
```

---

## 📦 Exports

```typescript
// Components
import { ProductComparison } from '@/components/product';
import { ProductImageGallery, ImageZoomModal } from '@/components/product';

// Context
import {
  ComparisonProvider,
  useComparison,
  useComparisonActions,
  useComparisonStatus,
} from '@/contexts/ComparisonContext';
```

---

## 🎣 Hooks

### `useComparison()`
Full access to comparison state and actions.

```typescript
const {
  products,        // Product[] - All products in comparison
  addProduct,      // (product: Product) => Promise<void>
  removeProduct,   // (productId: string) => Promise<void>
  clearAll,        // () => Promise<void>
  isInComparison,  // (productId: string) => boolean
  count,           // number - Count of products
  isLoading,       // boolean - Loading state
  canAddMore,      // boolean - Can add more products
} = useComparison();
```

### `useComparisonActions()`
Actions only (lightweight).

```typescript
const {
  addProduct,
  removeProduct,
  clearAll,
  isInComparison,
} = useComparisonActions();
```

### `useComparisonStatus()`
Status only (for badges).

```typescript
const {
  count,          // number
  isInComparison, // (productId: string) => boolean
  canAddMore,     // boolean
} = useComparisonStatus();
```

---

## 🎨 Component Props

### ProductComparison

```typescript
interface ProductComparisonProps {
  products: Product[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}
```

### ProductImageGallery (Existing)

```typescript
interface ProductImageGalleryProps {
  images: string[];
  videos?: string[];
  onImagePress?: (index: number) => void;
  showThumbnails?: boolean;
  autoPlayVideo?: boolean;
}
```

### ImageZoomModal (Existing)

```typescript
interface ImageZoomModalProps {
  visible: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}
```

---

## 💾 Product Data Structure

```typescript
interface Product {
  // Required
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  brand: string;

  // Optional
  originalPrice?: number;
  discount?: number;
  cashback?: number;
  specs?: Record<string, string>;
  features?: string[];
}
```

---

## 🎯 Common Use Cases

### Add Product with Validation

```typescript
const handleCompare = async (product: Product) => {
  if (!canAddMore) {
    alert('Maximum 4 products can be compared');
    return;
  }

  if (isInComparison(product.id)) {
    alert('Product already in comparison');
    return;
  }

  await addProduct(product);
  router.push('/comparison');
};
```

### Clear Comparison with Confirmation

```typescript
const handleClearAll = () => {
  Alert.alert(
    'Clear Comparison',
    'Remove all products from comparison?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: clearAll,
      },
    ]
  );
};
```

### Comparison Badge with Animation

```typescript
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

{count > 0 && (
  <Animated.View
    entering={FadeIn}
    exiting={FadeOut}
    style={styles.badge}
  >
    <Text>{count}</Text>
  </Animated.View>
)}
```

### Dynamic Compare Button

```typescript
const CompareButton = ({ product }) => {
  const { addProduct, removeProduct, isInComparison, canAddMore } = useComparison();
  const inComparison = isInComparison(product.id);

  return (
    <Button
      title={inComparison ? "Remove from Compare" : "Add to Compare"}
      onPress={() => inComparison ? removeProduct(product.id) : addProduct(product)}
      variant={inComparison ? "secondary" : "outline"}
      disabled={!inComparison && !canAddMore}
    />
  );
};
```

---

## 🎨 Styling Examples

### Comparison Floating Button

```typescript
const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#6366F1',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

### Comparison Badge

```typescript
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
```

---

## ⚙️ Configuration

### Change Max Products Limit

```typescript
// contexts/ComparisonContext.tsx
const MAX_COMPARISON_ITEMS = 4; // Change this value
```

### Change Storage Key

```typescript
// contexts/ComparisonContext.tsx
const COMPARISON_STORAGE_KEY = '@comparison_products'; // Change this
```

---

## 🐛 Common Issues

### Issue: Context not found
```typescript
// ❌ Wrong
function MyComponent() {
  const { count } = useComparison(); // Error!
}

// ✅ Correct - Ensure Provider is wrapped
<ComparisonProvider>
  <MyComponent />
</ComparisonProvider>
```

### Issue: Data not persisting
```typescript
// Ensure AsyncStorage is imported correctly
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### Issue: Performance lag with many products
```typescript
// Use lightweight hooks instead
// ❌ Heavy
const { products, count, ... } = useComparison();

// ✅ Lightweight
const { count } = useComparisonStatus();
```

---

## 📱 UX Best Practices

1. **Show visual feedback** when adding/removing products
2. **Display count badge** prominently
3. **Disable compare button** when max reached
4. **Provide clear CTA** to view comparison
5. **Allow quick removal** from comparison list
6. **Persist data** across sessions
7. **Show empty state** when no products

---

## 🔗 Related Files

- Implementation: `components/product/ProductComparison.tsx`
- Context: `contexts/ComparisonContext.tsx`
- Full Guide: `PHASE_4_2_IMAGE_ZOOM_COMPARISON_GUIDE.md`
- Design Tokens: `constants/DesignTokens.ts`

---

**Quick Reference - Agent 2** ✅
