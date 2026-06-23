# Wishlist Quick Reference Guide

## 🚀 Quick Start

### 1. Import and Use Wishlist Context

```typescript
import { useWishlist } from '@/contexts/WishlistContext';

function MyComponent() {
  const {
    wishlistItems,           // Array of all wishlist items
    isInWishlist,           // Check if product is in wishlist
    addToWishlist,          // Add product to wishlist
    removeFromWishlist,     // Remove product from wishlist
    clearWishlist,          // Clear all items
    getWishlistCount,       // Get total items count
    isLoading,              // Loading state
    error                   // Error state
  } = useWishlist();
}
```

---

## 📝 Common Use Cases

### Add Product to Wishlist

```typescript
const handleAddToWishlist = async () => {
  try {
    await addToWishlist({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      price: product.price.current,
      originalPrice: product.price.original,
      discount: 25,
      rating: 4.5,
      reviewCount: 120,
      brand: 'Nike',
      category: 'Shoes',
      availability: 'IN_STOCK',
    });
    showSuccess('Added to wishlist!');
  } catch (error) {
    showError('Failed to add to wishlist');
  }
};
```

### Check if Product is in Wishlist

```typescript
const inWishlist = isInWishlist(productId);

// Use in render
<Ionicons
  name={inWishlist ? 'heart' : 'heart-outline'}
  size={24}
  color={inWishlist ? '#EF4444' : '#9CA3AF'}
/>
```

### Toggle Wishlist (Add/Remove)

```typescript
const handleToggleWishlist = async () => {
  if (isInWishlist(productId)) {
    await removeFromWishlist(productId);
    showSuccess('Removed from wishlist');
  } else {
    await addToWishlist({ /* product data */ });
    showSuccess('Added to wishlist');
  }
};
```

### Remove from Wishlist

```typescript
const handleRemove = async () => {
  try {
    await removeFromWishlist(productId);
    showSuccess('Removed from wishlist');
  } catch (error) {
    showError('Failed to remove');
  }
};
```

### Get Wishlist Count

```typescript
const count = getWishlistCount();

// Display in badge
<View style={styles.badge}>
  <Text>{count}</Text>
</View>
```

---

## 🎨 UI Components

### Wishlist Heart Button

```typescript
import { Ionicons } from '@expo/vector-icons';

<TouchableOpacity
  style={styles.wishlistButton}
  onPress={handleToggleWishlist}
  disabled={isTogglingWishlist}
>
  <Ionicons
    name={isInWishlist(productId) ? 'heart' : 'heart-outline'}
    size={24}
    color={isInWishlist(productId) ? '#EF4444' : '#9CA3AF'}
  />
</TouchableOpacity>

const styles = StyleSheet.create({
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
```

### Animated Heart Icon

```typescript
import { Animated } from 'react-native';

const [heartScale] = useState(new Animated.Value(1));

// Animate on toggle
const animateHeart = () => {
  Animated.sequence([
    Animated.timing(heartScale, {
      toValue: 1.3,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(heartScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start();
};

<Animated.View style={{ transform: [{ scale: heartScale }] }}>
  <Ionicons name="heart" size={24} color="#EF4444" />
</Animated.View>
```

### Wishlist Badge

```typescript
// Show wishlist count in header
<TouchableOpacity onPress={() => router.push('/wishlist')}>
  <View style={styles.iconContainer}>
    <Ionicons name="heart-outline" size={24} color="#1F2937" />
    {getWishlistCount() > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{getWishlistCount()}</Text>
      </View>
    )}
  </View>
</TouchableOpacity>

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
```

---

## 🔗 Navigation

### Navigate to Wishlist Page

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to main wishlist page
router.push('/wishlist');

// Navigate to specific wishlist
router.push(`/wishlist/${wishlistId}`);
```

---

## 🎯 Best Practices

### 1. Optimistic Updates

```typescript
const [isToggling, setIsToggling] = useState(false);

const handleToggle = async () => {
  if (isToggling) return; // Prevent double-tap

  setIsToggling(true);
  try {
    // Perform action
    await toggleWishlist();
  } finally {
    setIsToggling(false);
  }
};
```

### 2. Error Handling

```typescript
const handleAction = async () => {
  try {
    await wishlistAction();
    showSuccess('Success!');
  } catch (error) {
    console.error('Wishlist error:', error);
    showError(error instanceof Error ? error.message : 'Failed');
  }
};
```

### 3. Loading States

```typescript
{isLoading ? (
  <ActivityIndicator size="small" color="#7C3AED" />
) : (
  <WishlistContent />
)}
```

### 4. Empty States

```typescript
{wishlistItems.length === 0 ? (
  <View style={styles.emptyState}>
    <Ionicons name="heart-outline" size={64} color="#E5E7EB" />
    <Text style={styles.emptyText}>Your wishlist is empty</Text>
    <TouchableOpacity style={styles.browseButton}>
      <Text style={styles.browseText}>Browse Products</Text>
    </TouchableOpacity>
  </View>
) : (
  <WishlistItems items={wishlistItems} />
)}
```

---

## 📊 API Reference

### WishlistContext Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `isInWishlist` | `productId: string` | `boolean` | Check if product is in wishlist |
| `addToWishlist` | `item: WishlistItem` | `Promise<void>` | Add product to wishlist |
| `removeFromWishlist` | `productId: string` | `Promise<void>` | Remove product from wishlist |
| `clearWishlist` | - | `Promise<void>` | Clear all items |
| `getWishlistCount` | - | `number` | Get total items count |

### WishlistItem Interface

```typescript
interface WishlistItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
}
```

---

## 🎨 Color Palette

```typescript
const colors = {
  primary: '#7C3AED',      // Purple primary
  secondary: '#8B5CF6',    // Purple secondary
  accent: '#A78BFA',       // Purple accent
  heartFilled: '#EF4444',  // Red for filled heart
  heartOutline: '#9CA3AF', // Gray for outline
  success: '#10B981',      // Green for success
  error: '#EF4444',        // Red for errors
  background: '#F9FAFB',   // Light gray background
};
```

---

## 🧪 Testing Examples

### Unit Test

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useWishlist } from '@/contexts/WishlistContext';

describe('useWishlist', () => {
  it('should add item to wishlist', async () => {
    const { result } = renderHook(() => useWishlist());

    await act(async () => {
      await result.current.addToWishlist({
        productId: 'test-1',
        productName: 'Test Product',
        // ... other fields
      });
    });

    expect(result.current.isInWishlist('test-1')).toBe(true);
  });
});
```

### Integration Test

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import ProductCard from '@/components/homepage/cards/ProductCard';

describe('ProductCard', () => {
  it('should toggle wishlist on heart icon press', async () => {
    const { getByLabelText } = render(
      <ProductCard product={mockProduct} />
    );

    const heartButton = getByLabelText('Add to wishlist');
    fireEvent.press(heartButton);

    // Verify wishlist state changed
    expect(getByLabelText('Remove from wishlist')).toBeTruthy();
  });
});
```

---

## 🔧 Troubleshooting

### Issue: Wishlist not loading

**Solution:**
```typescript
// Check authentication status
const { state: authState } = useAuth();

if (!authState.isAuthenticated) {
  // User needs to login
  router.push('/sign-in');
}
```

### Issue: Duplicate items

**Solution:**
```typescript
// Always check before adding
if (isInWishlist(productId)) {
  showError('Item already in wishlist');
  return;
}

await addToWishlist(item);
```

### Issue: Slow performance

**Solution:**
```typescript
// Use memo for expensive operations
const wishlistStatus = useMemo(
  () => isInWishlist(productId),
  [productId, wishlistItems.length]
);
```

---

## 📱 Platform-Specific Notes

### iOS
- Use `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- Heart animation works perfectly

### Android
- Use `elevation` for shadows
- May need `useNativeDriver: true` for animations

### Web
- All features work seamlessly
- Use `Clipboard` API for copy link

---

## 🚀 Performance Tips

1. **Memoize expensive calculations:**
   ```typescript
   const inWishlist = useMemo(
     () => isInWishlist(productId),
     [productId, wishlistItems]
   );
   ```

2. **Debounce rapid calls:**
   ```typescript
   const debouncedToggle = useMemo(
     () => debounce(handleToggle, 300),
     []
   );
   ```

3. **Lazy load images:**
   ```typescript
   <Image
     source={{ uri: imageUrl }}
     loadingIndicatorSource={require('@/assets/placeholder.png')}
   />
   ```

---

## 📚 Related Documentation

- [Wishlist API Documentation](./docs/api/wishlist.md)
- [WishlistContext Guide](./docs/contexts/WishlistContext.md)
- [Share Modal Guide](./docs/components/ShareModal.md)
- [Complete Integration Guide](./WISHLIST_INTEGRATION_COMPLETE.md)

---

## 💡 Tips

- Always use `try/catch` for async operations
- Provide visual feedback with animations
- Show toast notifications for user actions
- Handle offline scenarios gracefully
- Use optimistic updates for better UX
- Keep wishlist state in sync with backend

---

**Need Help?** Check the full integration guide: `WISHLIST_INTEGRATION_COMPLETE.md`
