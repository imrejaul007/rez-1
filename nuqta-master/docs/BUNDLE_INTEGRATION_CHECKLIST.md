# FrequentlyBoughtTogether - Integration Checklist

## 5-Minute Quick Start

### Step 1: Import Component (30 seconds)
```tsx
import { FrequentlyBoughtTogether } from '@/components/store';
```

### Step 2: Add to Your Page (2 minutes)
```tsx
<FrequentlyBoughtTogether
  currentProduct={product}
  onBundleAdded={() => console.log('Added!')}
/>
```

### Step 3: Test (2 minutes)
1. Load page with product
2. See bundle products load
3. Select/deselect products
4. Click "Add All to Cart"
5. Verify toast notification

✅ **Done!** Component is working.

---

## Full Integration Checklist

### Prerequisites ✅
- [ ] Project uses React Native with Expo
- [ ] CartContext is set up
- [ ] ToastContext is set up
- [ ] ProductVariantModal component exists
- [ ] API endpoint `/products/{id}/frequently-bought` exists (or use mock data)

### Installation Steps

#### 1. Verify Dependencies (2 minutes)
Check these are installed:
```json
{
  "expo-linear-gradient": "~13.0.2",
  "@expo/vector-icons": "^14.0.2",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@react-native-community/netinfo": "11.3.1"
}
```

#### 2. Verify Context Providers (5 minutes)
Check `app/_layout.tsx` includes:
```tsx
<CartProvider>
  <ToastProvider>
    {/* Your app */}
  </ToastProvider>
</CartProvider>
```

#### 3. Add to Product Page (10 minutes)

**Option A: Product Detail Page**
```tsx
// app/product/[id].tsx
import { FrequentlyBoughtTogether } from '@/components/store';

function ProductDetailPage() {
  const [product, setProduct] = useState<ProductItem | null>(null);

  // ... load product ...

  return (
    <ScrollView>
      {/* Product header, images, description */}

      {product && (
        <FrequentlyBoughtTogether
          currentProduct={product}
          onBundleAdded={() => {
            // Optional: track analytics, navigate, etc.
          }}
        />
      )}

      {/* Reviews, Q&A, etc. */}
    </ScrollView>
  );
}
```

**Option B: MainStorePage**
```tsx
// app/MainStorePage.tsx
import { FrequentlyBoughtTogether } from '@/components/store';

function MainStorePage({ productData }) {
  return (
    <ScrollView>
      {/* Store header, product display */}

      <FrequentlyBoughtTogether
        currentProduct={productData}
      />

      {/* Store policies, etc. */}
    </ScrollView>
  );
}
```

#### 4. Test Component (10 minutes)

**Basic Test**:
- [ ] Component renders
- [ ] Shows current product
- [ ] Shows 2-4 bundle products
- [ ] Checkboxes work
- [ ] Price updates
- [ ] "Add All to Cart" works
- [ ] Toast notification shows

**Advanced Test**:
- [ ] API integration works (or mock data loads)
- [ ] Variant modal opens for variant products
- [ ] Cart updates correctly
- [ ] Error handling works
- [ ] Loading states display

#### 5. Customize (Optional, 15 minutes)

**Update Mock Data**:
```typescript
// data/bundleData.ts
// Edit MOCK_BUNDLES array with your products
```

**Customize Styling**:
```typescript
// components/store/FrequentlyBoughtTogether.tsx
// Edit styles object for custom colors
const styles = StyleSheet.create({
  // ... modify colors, spacing, etc.
});
```

---

## Backend Integration

### API Endpoint Requirements

**Endpoint**: `GET /products/{productId}/frequently-bought`

**Query Parameters**:
- `limit` (number, optional): Max products to return (default: 4)

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product Name",
      "brand": "Brand Name",
      "image": "https://example.com/image.jpg",
      "description": "Product description",
      "pricing": {
        "basePrice": 999,
        "salePrice": 1499
      },
      "category": {
        "name": "Category"
      },
      "ratings": {
        "average": 4.5,
        "count": 234
      },
      "tags": ["tag1", "tag2"],
      "status": "active"
    }
  ]
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error message"
}
```

### Backend Implementation Notes

1. **Purchase Correlation Algorithm**: Calculate which products are frequently bought together based on order history
2. **Cache Results**: Cache bundle recommendations for performance
3. **Inventory Check**: Only return in-stock products
4. **Personalization**: Consider user preferences and browsing history
5. **A/B Testing**: Test different bundle configurations

---

## Common Integration Patterns

### Pattern 1: Product Detail Page
```tsx
<ScrollView>
  <ProductHeader product={product} />
  <ProductImages images={product.images} />
  <ProductDescription description={product.description} />

  {/* Frequently Bought Together */}
  <FrequentlyBoughtTogether currentProduct={product} />

  <ProductReviews productId={product.id} />
  <RelatedProducts productId={product.id} />
</ScrollView>
```

### Pattern 2: Store Page
```tsx
<ScrollView>
  <StoreHeader store={store} />
  <ProductDisplay product={product} />

  {/* Frequently Bought Together */}
  <FrequentlyBoughtTogether
    currentProduct={product}
    onBundleAdded={() => {
      analytics.track('bundle_added_from_store');
    }}
  />

  <StorePolicies store={store} />
</ScrollView>
```

### Pattern 3: Cart Page Upsell
```tsx
<ScrollView>
  <CartItems items={cartItems} />

  {/* Upsell based on cart items */}
  {cartItems.length > 0 && (
    <View>
      <Text>Complete Your Purchase</Text>
      <FrequentlyBoughtTogether
        currentProduct={cartItems[0]}
      />
    </View>
  )}

  <CheckoutButton />
</ScrollView>
```

### Pattern 4: Multiple Bundles
```tsx
<ScrollView>
  {featuredProducts.map(product => (
    <View key={product.id}>
      <Text>{product.name}</Text>
      <FrequentlyBoughtTogether
        currentProduct={product}
      />
    </View>
  ))}
</ScrollView>
```

---

## Troubleshooting Guide

### Issue 1: Component Not Rendering
**Symptoms**: Component doesn't appear on page

**Solutions**:
- [ ] Check `currentProduct` prop is provided
- [ ] Check product has valid `id`
- [ ] Check console for errors
- [ ] Verify import path is correct

**Debug**:
```tsx
console.log('Current product:', currentProduct);
console.log('Component mounted');
```

### Issue 2: No Bundle Products Showing
**Symptoms**: Only current product shows, no bundles

**Solutions**:
- [ ] Check API response (or mock data)
- [ ] Verify API endpoint is correct
- [ ] Check network tab for failed requests
- [ ] Verify mock data is imported

**Debug**:
```tsx
// In component
console.log('Bundle products loaded:', bundleProducts.length);
```

### Issue 3: Products Not Adding to Cart
**Symptoms**: "Add All to Cart" doesn't work

**Solutions**:
- [ ] Verify CartContext is set up
- [ ] Check user is authenticated
- [ ] Check cart actions are available
- [ ] Verify product IDs are valid

**Debug**:
```tsx
const { state, actions } = useCart();
console.log('Cart state:', state);
console.log('Cart actions:', actions);
```

### Issue 4: Variant Modal Not Opening
**Symptoms**: Modal doesn't show for variant products

**Solutions**:
- [ ] Add `has-variants` tag to product
- [ ] Verify ProductVariantModal component exists
- [ ] Check modal visibility state

**Debug**:
```tsx
console.log('Product tags:', product.tags);
console.log('Needs variant:', needsVariant);
```

### Issue 5: Toast Notifications Not Showing
**Symptoms**: No success/error messages

**Solutions**:
- [ ] Verify ToastContext is set up
- [ ] Check ToastProvider wraps app
- [ ] Test toast manually

**Debug**:
```tsx
const { showSuccess, showError } = useToast();
showSuccess('Test toast');
```

### Issue 6: Incorrect Pricing
**Symptoms**: Bundle price doesn't calculate correctly

**Solutions**:
- [ ] Check bundle discount values
- [ ] Verify price calculation logic
- [ ] Check product price data

**Debug**:
```tsx
const { total, originalTotal, savings } = calculateBundlePrice();
console.log('Prices:', { total, originalTotal, savings });
```

---

## Performance Optimization

### Lazy Loading (Optional)
```tsx
import { lazy, Suspense } from 'react';

const FrequentlyBoughtTogether = lazy(() =>
  import('@/components/store/FrequentlyBoughtTogether')
);

// In component
<Suspense fallback={<LoadingSpinner />}>
  <FrequentlyBoughtTogether currentProduct={product} />
</Suspense>
```

### Conditional Rendering
```tsx
// Only show if product has bundles
{shouldShowBundles && product && (
  <FrequentlyBoughtTogether currentProduct={product} />
)}
```

### Memoization
```tsx
import { memo } from 'react';

const MemoizedBundle = memo(FrequentlyBoughtTogether);

<MemoizedBundle currentProduct={product} />
```

---

## Analytics Integration

### Track Bundle Views
```tsx
import { analytics } from '@/services/analytics';

<FrequentlyBoughtTogether
  currentProduct={product}
  onBundleAdded={() => {
    analytics.track('bundle_added', {
      productId: product.id,
      bundleSize: selectedProducts.size,
      bundleValue: total,
      savings: savings,
    });
  }}
/>
```

### Track User Interactions
```tsx
// In component, add tracking
const handleProductToggle = (productId: string) => {
  toggleProductSelection(productId);
  analytics.track('bundle_product_toggled', { productId });
};
```

---

## Testing Guide

### Unit Tests
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import FrequentlyBoughtTogether from './FrequentlyBoughtTogether';

describe('FrequentlyBoughtTogether', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <FrequentlyBoughtTogether currentProduct={mockProduct} />
    );
    expect(getByText('Frequently Bought Together')).toBeTruthy();
  });

  it('adds products to cart', async () => {
    const onBundleAdded = jest.fn();
    const { getByText } = render(
      <FrequentlyBoughtTogether
        currentProduct={mockProduct}
        onBundleAdded={onBundleAdded}
      />
    );

    fireEvent.press(getByText('Add All to Cart'));
    // ... assertions
  });
});
```

### Integration Tests
```tsx
describe('FrequentlyBoughtTogether Integration', () => {
  it('integrates with CartContext', async () => {
    // Test cart integration
  });

  it('shows toast notifications', async () => {
    // Test toast integration
  });

  it('handles variant selection', async () => {
    // Test variant modal
  });
});
```

---

## Deployment Steps

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Mock data reviewed
- [ ] API endpoint tested
- [ ] Cart integration verified
- [ ] Toast notifications working

### 2. Staging Deployment
```bash
# Build for staging
npm run build:staging

# Deploy to staging
npm run deploy:staging

# Test on staging
npm run test:e2e:staging
```

### 3. Production Deployment
```bash
# Build for production
npm run build:production

# Deploy to production
npm run deploy:production

# Monitor errors
npm run monitor:production
```

### 4. Post-Deployment
- [ ] Monitor error rates
- [ ] Track conversion metrics
- [ ] Review user feedback
- [ ] Check performance metrics

---

## Quick Reference Commands

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm run test
```

### Build for Production
```bash
npm run build
```

### Start Development Server
```bash
npm start
```

### Type Check
```bash
npm run type-check
```

---

## Support & Resources

### Documentation
- **Complete Guide**: `FREQUENTLY_BOUGHT_TOGETHER_GUIDE.md`
- **Quick Reference**: `BUNDLE_QUICK_REFERENCE.md`
- **Visual Flows**: `BUNDLE_FLOW_DIAGRAM.md`
- **Summary**: `BUNDLE_IMPLEMENTATION_SUMMARY.md`

### Code Examples
- **Examples File**: `components/store/FrequentlyBoughtTogetherExample.tsx`
- **Mock Data**: `data/bundleData.ts`

### Component Location
- **Main Component**: `components/store/FrequentlyBoughtTogether.tsx`
- **Export**: `components/store/index.ts`

---

## Final Checklist

### Before Going Live
- [ ] Component tested on iOS
- [ ] Component tested on Android
- [ ] Component tested on Web (if applicable)
- [ ] API integration verified
- [ ] Cart integration verified
- [ ] Toast notifications tested
- [ ] Variant modal tested
- [ ] Error handling verified
- [ ] Loading states verified
- [ ] Mock data updated
- [ ] Analytics integrated
- [ ] Documentation reviewed
- [ ] Team trained on usage
- [ ] Monitoring set up

### Success Criteria
- [ ] Bundle conversion rate > 10%
- [ ] No critical errors in logs
- [ ] Page load time < 3 seconds
- [ ] User feedback positive
- [ ] Cart integration smooth
- [ ] Analytics data collecting

---

**Status**: ✅ Ready for Integration
**Last Updated**: 2025-11-12

Start with the 5-minute quick start, then work through the full checklist for production deployment.
