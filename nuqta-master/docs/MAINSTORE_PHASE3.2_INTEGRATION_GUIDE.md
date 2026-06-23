# MainStorePage Phase 3.2 - Critical E-commerce Components Integration Guide

## Overview
This guide documents the 6 critical missing sections added to MainStorePage to match Amazon/Flipkart functionality and improve conversion rates.

---

## Components Created

### 1. **SpecificationsTable**
**Path**: `components/product/SpecificationsTable.tsx`

**Features**:
- Displays product specifications in a clean table format
- Alternating row colors for better readability
- Expandable/collapsible view (shows 5 specs initially, expandable to all)
- TypeScript interfaces for type safety
- Responsive layout

**Usage**:
```tsx
import { SpecificationsTable } from '@/components/product';

<SpecificationsTable
  specifications={{
    'Brand': 'Nike',
    'Material': 'Cotton',
    'Color': 'Blue',
    'Size': 'Medium',
    'Weight': '200g',
    'Country of Origin': 'India',
    'Care Instructions': 'Machine wash cold',
    'Fit Type': 'Regular',
  }}
  defaultExpanded={false}
/>
```

**Key Features**:
- ✅ Clean table layout with borders
- ✅ Even/odd row alternating colors
- ✅ Show More/Less toggle for long lists
- ✅ Fully responsive
- ✅ TypeScript typed

---

### 2. **DeliveryEstimator**
**Path**: `components/product/DeliveryEstimator.tsx`

**Features**:
- PIN code validation (6 digits)
- Loading state during delivery check
- Mock delivery estimation (can be replaced with real API)
- Shows delivery date, charges, and delivery message
- Error handling for invalid PIN codes
- Visual feedback with success state

**Usage**:
```tsx
import { DeliveryEstimator } from '@/components/product';

<DeliveryEstimator
  productId="prod_123"
  onCheckDelivery={async (pincode) => {
    // Optional: Connect to real API
    const response = await fetch(`/api/delivery?pincode=${pincode}`);
    return response.json();
  }}
/>
```

**Mock Behavior**:
- PIN codes starting with "1" → Free delivery
- Other PIN codes → ₹50 delivery charge
- Estimated delivery: 3 days from today

**Key Features**:
- ✅ Real-time PIN code validation
- ✅ Loading spinner during check
- ✅ Error state for invalid input
- ✅ Success state with delivery info
- ✅ Free/paid delivery badge
- ✅ Estimated date display

---

### 3. **VariantSelector**
**Path**: `components/product/VariantSelector.tsx`

**Features**:
- Horizontal scrollable variant options
- Selected state visual feedback
- Out-of-stock variants (disabled with strike-through)
- Accessibility support
- Callback for variant selection

**Usage**:
```tsx
import { VariantSelector } from '@/components/product';

<VariantSelector
  title="Select Size"
  variants={[
    { id: 's', label: 'S', available: true },
    { id: 'm', label: 'M', available: true },
    { id: 'l', label: 'L', available: false },
    { id: 'xl', label: 'XL', available: true },
  ]}
  selectedId="m"
  onSelect={(variantId) => {
    console.log('Selected variant:', variantId);
    // Update product state
  }}
/>
```

**Key Features**:
- ✅ Horizontal scrollable layout
- ✅ Selected state highlighting
- ✅ Disabled state for unavailable variants
- ✅ Visual strike-through for out-of-stock
- ✅ Touch-friendly button sizes
- ✅ Accessibility labels

---

### 4. **TrustBadges**
**Path**: `components/product/TrustBadges.tsx`

**Features**:
- Displays trust signals (secure payments, free delivery, etc.)
- Icon + text layout
- Wrapping flex layout
- Customizable badges

**Usage**:
```tsx
import { TrustBadges } from '@/components/product';

// Default badges
<TrustBadges />

// Custom badges
<TrustBadges
  badges={[
    { icon: '🔒', text: 'Secure Checkout' },
    { icon: '🎁', text: 'Gift Wrap Available' },
    { icon: '⭐', text: '5 Star Rated' },
  ]}
/>
```

**Default Badges**:
- 🔒 Secure Payments
- 🚚 Free Delivery
- ↩️ Easy Returns
- ✓ Verified Seller

**Key Features**:
- ✅ Flexible badge system
- ✅ Icon + text layout
- ✅ Wrapping layout for multiple badges
- ✅ Pill-shaped design
- ✅ Customizable content

---

### 5. **StockIndicator**
**Path**: `components/product/StockIndicator.tsx`

**Features**:
- Real-time stock status display
- Color-coded status (green/yellow/red)
- Low stock threshold alerts
- Visual dot indicator

**Usage**:
```tsx
import { StockIndicator } from '@/components/product';

// In stock
<StockIndicator stock={50} />

// Low stock (default threshold: 10)
<StockIndicator stock={5} />

// Out of stock
<StockIndicator stock={0} />

// Custom threshold
<StockIndicator stock={12} lowStockThreshold={15} />
```

**Stock States**:
- **Out of Stock** (0): Red badge
- **Low Stock** (≤10): Yellow/orange badge with "Only X left!"
- **In Stock** (>10): Green badge

**Key Features**:
- ✅ Three distinct stock states
- ✅ Color-coded visual feedback
- ✅ Animated dot indicator
- ✅ Configurable low stock threshold
- ✅ Urgency messaging for low stock

---

### 6. **RecentlyViewed**
**Path**: `components/product/RecentlyViewed.tsx`

**Features**:
- Horizontal scrollable product cards
- Product image support with fallback
- Discount badge display
- Original price strike-through
- Item count header
- Automatic navigation on tap

**Usage**:
```tsx
import { RecentlyViewed } from '@/components/product';

<RecentlyViewed
  products={[
    {
      id: 'prod_1',
      name: 'Nike Air Max',
      price: 4999,
      originalPrice: 6999,
      discount: 28,
      image: 'https://example.com/image1.jpg',
    },
    {
      id: 'prod_2',
      name: 'Adidas Ultraboost',
      price: 5499,
    },
  ]}
  onProductPress={(product) => {
    // Optional custom handler
    console.log('Viewing product:', product);
  }}
/>
```

**Key Features**:
- ✅ Horizontal scroll with multiple products
- ✅ Product image with placeholder fallback
- ✅ Discount percentage badge
- ✅ Original price strike-through
- ✅ Item count in header
- ✅ Navigation on tap
- ✅ Responsive card sizing

---

## Integration with MainStorePage

### Step 1: Import Components

Add to `app/MainStorePage.tsx`:

```tsx
import {
  SpecificationsTable,
  DeliveryEstimator,
  VariantSelector,
  TrustBadges,
  StockIndicator,
  RecentlyViewed,
} from '@/components/product';
```

### Step 2: Add to Render (Recommended Order)

```tsx
<ScrollView style={styles.container}>
  {/* Existing product header, images, etc. */}

  {/* 1. Stock Availability - Top priority */}
  <StockIndicator stock={productData.stock} />

  {/* 2. Trust Badges - Build confidence early */}
  <TrustBadges />

  {/* 3. Variant Selector - Critical for cart */}
  {productData.variants && productData.variants.length > 0 && (
    <VariantSelector
      title="Select Size"
      variants={productData.variants}
      onSelect={(variantId) => setSelectedVariant(variantId)}
    />
  )}

  {/* 4. Delivery Estimator - Important for purchase decision */}
  <DeliveryEstimator productId={productData.id} />

  {/* Existing product description, UGC, reviews, etc. */}

  {/* 5. Specifications - Detail-oriented users */}
  <SpecificationsTable
    specifications={productData.specifications || {}}
  />

  {/* 6. Recently Viewed - Bottom for cross-sell */}
  <RecentlyViewed products={recentlyViewedProducts} />
</ScrollView>
```

### Step 3: Add State Management (if needed)

```tsx
const [selectedVariant, setSelectedVariant] = useState<string>('');
const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);

// Fetch recently viewed on mount
useEffect(() => {
  // Load from AsyncStorage or API
  const loadRecentlyViewed = async () => {
    const recent = await AsyncStorage.getItem('recentlyViewed');
    if (recent) {
      setRecentlyViewedProducts(JSON.parse(recent));
    }
  };
  loadRecentlyViewed();
}, []);
```

---

## Mock Data Examples

### Product Data Structure

```typescript
interface ProductData {
  id: string;
  name: string;
  price: number;
  stock: number;
  variants?: Array<{
    id: string;
    label: string;
    available: boolean;
  }>;
  specifications?: Record<string, string>;
}

// Example
const mockProduct: ProductData = {
  id: 'prod_123',
  name: 'Nike Air Max 2024',
  price: 8999,
  stock: 15,
  variants: [
    { id: '7', label: '7 UK', available: true },
    { id: '8', label: '8 UK', available: true },
    { id: '9', label: '9 UK', available: false },
    { id: '10', label: '10 UK', available: true },
  ],
  specifications: {
    'Brand': 'Nike',
    'Model': 'Air Max 2024',
    'Material': 'Mesh + Synthetic',
    'Sole Material': 'Rubber',
    'Color': 'Black/White',
    'Weight': '300g per shoe',
    'Ideal For': 'Men',
    'Occasion': 'Sports, Casual',
    'Care Instructions': 'Wipe with clean, dry cloth',
  },
};
```

### Recently Viewed Products Mock

```typescript
const mockRecentlyViewed: Product[] = [
  {
    id: 'prod_101',
    name: 'Adidas Ultraboost Running Shoes',
    price: 7999,
    originalPrice: 9999,
    discount: 20,
    image: 'https://example.com/shoe1.jpg',
  },
  {
    id: 'prod_102',
    name: 'Puma RS-X Sneakers',
    price: 5499,
    originalPrice: 7999,
    discount: 31,
  },
  {
    id: 'prod_103',
    name: 'Reebok Classic Leather',
    price: 4999,
  },
];
```

---

## Styling & Design Tokens

All components use consistent styling:

### Color Palette
- **Primary**: `#6C47FF` (Purple)
- **Text Primary**: `#1a1a1a`
- **Text Secondary**: `#666666`
- **Text Tertiary**: `#999999`
- **Border**: `#d0d0d0`, `#e0e0e0`, `#e5e5e5`
- **Background**: `#ffffff`, `#f8f8f8`, `#f5f5f5`
- **Success**: `#16a34a` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error**: `#dc2626` (Red)

### Spacing
- **xs**: 4px
- **sm**: 8px
- **md**: 12px, 16px
- **lg**: 20px, 24px

### Typography
- **Title**: 18px, fontWeight 600
- **Subtitle**: 16px, fontWeight 600
- **Body**: 14px
- **Small**: 13px
- **Caption**: 12px

### Border Radius
- **sm**: 4px
- **md**: 8px
- **full**: 20px (pill shape)

---

## Accessibility Features

All components include:
- ✅ Accessibility labels for screen readers
- ✅ Accessibility roles (button, text, etc.)
- ✅ Accessibility states (selected, disabled)
- ✅ High contrast colors
- ✅ Touch-friendly sizes (44px minimum)
- ✅ Keyboard navigation support

---

## Testing Checklist

### SpecificationsTable
- [ ] Displays all specifications correctly
- [ ] Toggle expands/collapses properly
- [ ] Alternating row colors visible
- [ ] Handles empty specifications gracefully

### DeliveryEstimator
- [ ] Validates 6-digit PIN code
- [ ] Shows loading state
- [ ] Displays delivery information
- [ ] Shows error for invalid PIN
- [ ] Handles API failures

### VariantSelector
- [ ] All variants displayed
- [ ] Selected state highlighted
- [ ] Unavailable variants disabled
- [ ] Callback fires on selection
- [ ] Horizontal scroll works

### TrustBadges
- [ ] All badges displayed
- [ ] Wraps on small screens
- [ ] Custom badges work
- [ ] Icons render correctly

### StockIndicator
- [ ] Shows correct state for stock level
- [ ] Color coding matches stock status
- [ ] Low stock threshold works
- [ ] Out of stock displays correctly

### RecentlyViewed
- [ ] Products scroll horizontally
- [ ] Images load or show placeholder
- [ ] Discount badges appear
- [ ] Navigation works on tap
- [ ] Handles empty state

---

## Performance Considerations

1. **Lazy Loading**: RecentlyViewed uses horizontal ScrollView for efficient rendering
2. **Memoization**: Consider wrapping components in React.memo if parent re-renders frequently
3. **Image Optimization**: RecentlyViewed supports image caching
4. **Async Operations**: DeliveryEstimator handles async checks with proper loading states

---

## Next Steps

1. ✅ All 6 components created
2. ✅ Export index updated
3. ⏳ Integrate into MainStorePage.tsx
4. ⏳ Connect to real product data
5. ⏳ Test on iOS/Android
6. ⏳ Add analytics tracking
7. ⏳ A/B test placement order

---

## API Integration Points

### DeliveryEstimator
```typescript
// Replace mock with real API
const checkDelivery = async (pincode: string): Promise<DeliveryInfo> => {
  const response = await fetch(`${API_BASE_URL}/delivery/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode, productId }),
  });
  return response.json();
};
```

### RecentlyViewed
```typescript
// Load from backend or AsyncStorage
const loadRecentlyViewed = async () => {
  const userId = await getCurrentUserId();
  const response = await fetch(`${API_BASE_URL}/users/${userId}/recently-viewed`);
  return response.json();
};
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Components not rendering
- Check imports are correct
- Verify `@/components/product` path alias

**Issue**: TypeScript errors
- Ensure all props are provided
- Check TypeScript interfaces match

**Issue**: Styling inconsistencies
- Verify no global styles overriding
- Check parent container styles

---

## Summary

**6 Components Created**:
1. ✅ SpecificationsTable - Expandable product specs
2. ✅ DeliveryEstimator - PIN code delivery check
3. ✅ VariantSelector - Size/variant selection
4. ✅ TrustBadges - Trust signals
5. ✅ StockIndicator - Real-time stock status
6. ✅ RecentlyViewed - Cross-sell products

**Total Files Created**: 7 (6 components + 1 index)

**Design Tokens**: ✅ Consistent throughout
**TypeScript**: ✅ Fully typed
**Accessibility**: ✅ WCAG compliant
**Responsive**: ✅ Mobile-first design

---

## Contact

For questions or issues with these components, refer to:
- Main implementation file: `app/MainStorePage.tsx`
- Component directory: `components/product/`
- This guide: `MAINSTORE_PHASE3.2_INTEGRATION_GUIDE.md`
