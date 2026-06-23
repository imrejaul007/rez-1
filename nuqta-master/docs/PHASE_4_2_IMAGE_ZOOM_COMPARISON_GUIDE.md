# Phase 4.2: Image Zoom & Product Comparison - Implementation Guide

## 🎯 Overview

This guide covers Phase 4.2 implementation which includes:
1. ✅ **Image Zoom Functionality** (Already implemented)
2. ✅ **Product Comparison Feature** (Newly implemented by Agent 2)

---

## 📦 Components Created/Updated

### New Components

#### 1. **ProductComparison.tsx** ⭐ NEW
Location: `components/product/ProductComparison.tsx`

**Features:**
- Side-by-side comparison of up to 4 products
- Price comparison with discounts and savings
- Cashback badges
- Specifications comparison table
- Features comparison with checkmarks
- Customer ratings display
- Quick actions (Add to Cart, View Details)
- Horizontal scrolling for mobile optimization
- Empty state handling

**Props Interface:**
```typescript
interface ProductComparisonProps {
  products: Product[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onViewProduct: (productId: string) => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  brand: string;
  specs?: Record<string, string>;
  features?: string[];
  discount?: number;
  cashback?: number;
}
```

#### 2. **ComparisonContext.tsx** ⭐ NEW
Location: `contexts/ComparisonContext.tsx`

**Features:**
- Global state management for product comparison
- AsyncStorage persistence
- Maximum 4 products limit
- Optimistic updates
- Helper hooks for different use cases

**API:**
```typescript
interface ComparisonContextType {
  products: Product[];
  addProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isInComparison: (productId: string) => boolean;
  count: number;
  isLoading: boolean;
  canAddMore: boolean;
}
```

**Available Hooks:**
- `useComparison()` - Full comparison state and actions
- `useComparisonActions()` - Actions only (for components that don't need state)
- `useComparisonStatus()` - Status only (for badges/counters)

### Existing Components (Already Implemented)

#### 3. **ProductImageGallery.tsx** ✅ Existing
Location: `components/product/ProductImageGallery.tsx`

**Features:**
- Horizontal scrolling image gallery
- Video support
- Thumbnail navigation strip
- Full-screen zoom capability
- Image/video indicators
- "Tap to zoom" hint overlay

#### 4. **ImageZoomModal.tsx** ✅ Existing
Location: `components/product/ImageZoomModal.tsx`

**Features:**
- Pinch-to-zoom functionality (1x to 4x)
- Double-tap to zoom
- Gesture handling with react-native-reanimated
- Horizontal swipe between images
- Thumbnail navigation
- Navigation arrows
- Image counter

---

## 🚀 Integration Instructions

### Step 1: Add ComparisonProvider to App Root

**File:** `app/_layout.tsx`

```typescript
import { ComparisonProvider } from '@/contexts/ComparisonContext';

export default function RootLayout() {
  return (
    <ComparisonProvider>
      {/* Your existing app structure */}
    </ComparisonProvider>
  );
}
```

### Step 2: Using Image Gallery (Already Available)

**File:** `app/ProductPage.tsx` or `app/MainStorePage.tsx`

```typescript
import { ProductImageGallery } from '@/components/product';

function ProductPage({ product }) {
  return (
    <ScrollView>
      <ProductImageGallery
        images={product.images}
        videos={product.videos}
        showThumbnails={true}
        autoPlayVideo={false}
      />
      {/* Rest of product details */}
    </ScrollView>
  );
}
```

### Step 3: Add "Compare" Button to Product Cards

**Example:** Product Card Component

```typescript
import { useComparison } from '@/contexts/ComparisonContext';
import { Ionicons } from '@expo/vector-icons';

function ProductCard({ product }) {
  const { addProduct, isInComparison, canAddMore } = useComparison();
  const inComparison = isInComparison(product.id);

  return (
    <View style={styles.card}>
      <Image source={{ uri: product.image }} style={styles.image} />

      {/* Comparison Button */}
      <Pressable
        style={[
          styles.compareButton,
          inComparison && styles.compareButtonActive
        ]}
        onPress={() => addProduct(product)}
        disabled={inComparison || !canAddMore}
      >
        <Ionicons
          name={inComparison ? "checkmark-circle" : "scale-outline"}
          size={20}
          color={inComparison ? "#10B981" : "#6366F1"}
        />
        <Text style={styles.compareText}>
          {inComparison ? "In Comparison" : "Compare"}
        </Text>
      </Pressable>

      {/* Rest of card content */}
    </View>
  );
}
```

### Step 4: Add Comparison Badge to Navigation/Header

**Example:** Header Component

```typescript
import { useComparisonStatus } from '@/contexts/ComparisonContext';
import { useRouter } from 'expo-router';

function Header() {
  const { count } = useComparisonStatus();
  const router = useRouter();

  return (
    <View style={styles.header}>
      {/* Other header items */}

      {count > 0 && (
        <Pressable
          style={styles.comparisonBadge}
          onPress={() => router.push('/comparison')}
        >
          <Ionicons name="scale-outline" size={24} color="#6366F1" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
```

### Step 5: Create Comparison Page

**File:** `app/comparison.tsx`

```typescript
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductComparison } from '@/components/product';
import { useComparison } from '@/contexts/ComparisonContext';
import { SPACING } from '@/constants/DesignTokens';

export default function ComparisonPage() {
  const router = useRouter();
  const { products, removeProduct, clearAll } = useComparison();

  const handleAddToCart = async (productId: string) => {
    // Add to cart logic
    console.log('Add to cart:', productId);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/ProductPage?cardId=${productId}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <ProductComparison
          products={products}
          onRemoveProduct={removeProduct}
          onAddToCart={handleAddToCart}
          onViewProduct={handleViewProduct}
        />
      </ScrollView>

      {products.length > 0 && (
        <View style={styles.footer}>
          <Button
            title="Clear All"
            onPress={clearAll}
            variant="outline"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
```

### Step 6: Add Comparison CTA in MainStorePage

**File:** `app/MainStorePage.tsx`

```typescript
import { useComparison } from '@/contexts/ComparisonContext';

function MainStorePage({ storeId }) {
  const { addProduct, count } = useComparison();

  return (
    <ScrollView>
      {/* Existing store content */}

      {/* Products Section */}
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onCompare={() => addProduct(product)}
        />
      ))}

      {/* Comparison Floating Action Button */}
      {count > 0 && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/comparison')}
        >
          <Ionicons name="scale" size={24} color="#FFF" />
          <Text style={styles.fabText}>Compare ({count})</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
```

---

## 🎨 Styling Examples

### Comparison Button Styles

```typescript
const styles = StyleSheet.create({
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
    backgroundColor: '#FFF',
  },
  compareButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  compareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
});
```

### Floating Action Button (FAB)

```typescript
const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 📱 User Flow

### Comparison Flow

1. **Discover Products**
   - User browses products on MainStorePage
   - Each product has a "Compare" button

2. **Add to Comparison**
   - User taps "Compare" on product card
   - Product added to comparison (max 4)
   - Button shows "In Comparison" with checkmark
   - Comparison badge appears in header with count

3. **View Comparison**
   - User taps comparison badge in header
   - Navigates to `/comparison` page
   - Sees side-by-side comparison table

4. **Comparison Table Features**
   - Scroll horizontally to see all products
   - Compare prices, specs, features
   - Remove individual products with ✕ button
   - Add to cart directly from comparison
   - View product details

5. **Actions**
   - User can add any product to cart
   - User can view full product details
   - User can clear all comparisons
   - Data persists across app sessions

### Image Zoom Flow

1. **Product Page**
   - User sees main product image
   - Thumbnail strip below (if multiple images)
   - "Tap to zoom" hint visible

2. **Open Zoom**
   - User taps on main image
   - Full-screen modal opens

3. **Zoom Interaction**
   - Pinch to zoom in/out (1x to 4x)
   - Swipe left/right to change images
   - Tap thumbnails to jump to specific image
   - Tap ✕ to close modal

---

## 🔧 Dependencies Required

All dependencies are **already installed**:

✅ `react-native-gesture-handler` (v2.16.1)
✅ `react-native-reanimated` (v3.10.1)
✅ `@react-native-async-storage/async-storage` (v1.23.1)
✅ `@expo/vector-icons` (v14.0.3)

No additional installation needed!

---

## 🧪 Testing Guide

### Test Comparison Functionality

```typescript
// Test 1: Add product to comparison
const product = {
  id: '1',
  name: 'Test Product',
  price: 999,
  originalPrice: 1299,
  image: 'https://example.com/image.jpg',
  rating: 4.5,
  reviews: 120,
  brand: 'Test Brand',
  specs: { Size: 'Medium', Color: 'Blue' },
  features: ['Feature 1', 'Feature 2'],
};

addProduct(product);

// Test 2: Check if product is in comparison
expect(isInComparison('1')).toBe(true);

// Test 3: Remove product
removeProduct('1');

// Test 4: Clear all
clearAll();

// Test 5: Max limit (try adding 5 products)
// Should show warning after 4th product
```

### Manual Testing Checklist

- [ ] Add products to comparison
- [ ] Verify comparison badge shows correct count
- [ ] Open comparison page
- [ ] Verify all product data displays correctly
- [ ] Test horizontal scrolling
- [ ] Remove individual products
- [ ] Test "Add to Cart" button
- [ ] Test "View Details" button
- [ ] Clear all products
- [ ] Verify data persists after app restart
- [ ] Test with 1, 2, 3, and 4 products
- [ ] Test image zoom (pinch, swipe, thumbnails)

---

## 🎯 Key Features Summary

### Image Zoom (Existing)
✅ Pinch-to-zoom (1x to 4x)
✅ Double-tap to zoom
✅ Swipe navigation between images
✅ Thumbnail navigation
✅ Video support
✅ Smooth animations
✅ Full-screen modal

### Product Comparison (New)
✅ Side-by-side comparison
✅ Up to 4 products
✅ Price comparison with savings
✅ Specifications table
✅ Features checklist
✅ Rating comparison
✅ Quick actions (Add to Cart, View Details)
✅ Persistent storage
✅ Global state management
✅ Responsive design
✅ Empty state handling

---

## 📊 Comparison Data Structure

### Example Product for Comparison

```typescript
const sampleProduct: Product = {
  id: 'prod_123',
  name: 'Premium Wireless Headphones',
  price: 4999,
  originalPrice: 6999,
  discount: 29,
  cashback: 250,
  image: 'https://example.com/headphones.jpg',
  rating: 4.7,
  reviews: 2543,
  brand: 'AudioTech',

  specs: {
    'Battery Life': '30 hours',
    'Bluetooth': '5.2',
    'Noise Cancellation': 'Active ANC',
    'Weight': '250g',
    'Driver Size': '40mm',
  },

  features: [
    'Active Noise Cancellation',
    'Wireless Charging',
    'Multipoint Connection',
    'Voice Assistant',
    'Foldable Design',
    'Carrying Case Included',
  ],
};
```

---

## 🚨 Important Notes

1. **Maximum Comparison Limit**: Set to 4 products (configurable in `ComparisonContext.tsx`)
2. **Storage**: Uses AsyncStorage with key `@comparison_products`
3. **Performance**: Comparison data is persisted to avoid data loss
4. **Image Zoom**: Already fully implemented, no changes needed
5. **Design Tokens**: All components use centralized design tokens from `constants/DesignTokens.ts`

---

## 📝 Next Steps

1. ✅ Components created
2. ✅ Context provider implemented
3. ✅ Exports updated
4. ⏳ Add ComparisonProvider to app root
5. ⏳ Create comparison page (`app/comparison.tsx`)
6. ⏳ Add compare buttons to product cards
7. ⏳ Add comparison badge to header
8. ⏳ Test all functionality

---

## 🆘 Troubleshooting

### Issue: Products not persisting
**Solution:** Ensure ComparisonProvider is wrapped around your app root

### Issue: Toast not showing
**Solution:** Context uses console.log by default. Integrate ToastContext if needed

### Issue: Images not zooming
**Solution:** Ensure react-native-gesture-handler and reanimated are properly configured in babel.config.js

### Issue: Comparison badge not updating
**Solution:** Use `useComparisonStatus()` hook instead of `useComparison()` for better performance

---

## 📚 Related Documentation

- [Design Tokens](./constants/DesignTokens.ts)
- [Product Components](./components/product/)
- [Context API](./contexts/)
- [MainStorePage Integration](./app/MainStorePage.tsx)

---

**Agent 2 - Phase 4.2 Implementation Complete** ✅
