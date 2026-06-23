# RelatedProducts Component - Quick Reference

## Quick Start (Copy & Paste)

### 1. Basic Import and Usage
```tsx
import { RelatedProducts } from '@/components/store';

<RelatedProducts productId="your-product-id" />
```

### 2. Full Example with All Props
```tsx
<RelatedProducts
  productId="product-123"
  currentProduct={productObject}
  onProductPress={(product) => router.push(`/product/${product.id}`)}
  limit={10}
  showViewAll={true}
  title="You May Also Like"
/>
```

## Props Cheat Sheet

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `productId` | string | - | ✅ Yes |
| `currentProduct` | ProductItem | undefined | ❌ No |
| `onProductPress` | function | Auto-navigate | ❌ No |
| `limit` | number | 10 | ❌ No |
| `showViewAll` | boolean | true | ❌ No |
| `title` | string | "You May Also Like" | ❌ No |

## Common Use Cases

### Use Case 1: Store Page
```tsx
<RelatedProducts
  productId={selectedProductId}
  title="You May Also Like"
/>
```

### Use Case 2: Product Detail Page
```tsx
<RelatedProducts
  productId={currentProduct.id}
  currentProduct={currentProduct}
  title="Similar Products"
/>
```

### Use Case 3: Multiple Sections
```tsx
<RelatedProducts productId={id} title="Similar in Category" limit={8} />
<RelatedProducts productId={id} title="More from Brand" limit={6} />
<RelatedProducts productId={id} title="Customers Also Bought" limit={5} />
```

### Use Case 4: Custom Navigation with Analytics
```tsx
<RelatedProducts
  productId={productId}
  onProductPress={(product) => {
    analytics.track('related_product_clicked', { id: product.id });
    router.push(`/product/${product.id}`);
  }}
/>
```

## Component States

### 🔄 Loading
- Shows 3 skeleton cards
- Shimmer animation
- Auto-triggered on mount

### ✅ Success
- Horizontal scrollable list
- 10 products (default)
- Smooth snap scrolling

### 📭 Empty
- Shopping bag icon 🛍️
- "No Related Products"
- Friendly message

### ⚠️ Error
- Warning icon
- Error message
- Retry button

## File Locations

```
frontend/
├── components/
│   └── store/
│       ├── RelatedProducts.tsx                    ⭐ Main Component
│       ├── RelatedProductsIntegrationExample.tsx  📚 Examples
│       ├── RELATED_PRODUCTS_README.md             📖 Full Docs
│       └── index.ts                               📦 Exports
├── services/
│   └── productsApi.ts                             🔧 API Service (Enhanced)
└── RELATEDPRODUCTS_IMPLEMENTATION_SUMMARY.md      📊 Summary
```

## API Integration

### Endpoint
```
GET /api/products/{productId}/related?limit=10
```

### Service Method
```typescript
productsService.getRelatedProducts(productId, limit)
```

### Mock Data
- 15 diverse products
- Auto-fallback if API unavailable
- Includes Electronics, Furniture, Accessories, Gaming, etc.

## Styling Reference

### Colors
```typescript
Primary Purple: '#7C3AED'
Text Dark:      '#1F2937'
Text Gray:      '#6B7280'
Error Red:      '#EF4444'
Background:     '#FFFFFF'
```

### Dimensions
```typescript
Card Width:     200px
Card Spacing:   16px
Image Height:   180px
Border Radius:  12px
```

## Performance Tips

### FlatList Optimizations
```tsx
removeClippedSubviews={true}    // ✅ Enabled
maxToRenderPerBatch={5}         // ✅ Optimized
initialNumToRender={3}          // ✅ Fast initial render
windowSize={5}                  // ✅ Memory efficient
getItemLayout                   // ✅ Instant scrolling
```

## Troubleshooting

### Problem: Products not loading
**Solution**: Check network logs, verify productId is valid

### Problem: Empty state showing
**Solution**: Backend might have no related products, this is normal

### Problem: Slow scrolling
**Solution**: Reduce limit prop (try 5-8 products)

### Problem: Cards look different
**Solution**: Using StoreProductCard - check if it's updated

## Integration Checklist

- [ ] Import component from '@/components/store'
- [ ] Add component to your page JSX
- [ ] Pass required `productId` prop
- [ ] Test loading state appears
- [ ] Test products load successfully
- [ ] Test horizontal scrolling works
- [ ] Test product card clicks work
- [ ] Test "View All" button (if enabled)
- [ ] Test error state with invalid productId
- [ ] Test empty state (if applicable)

## Code Snippets

### Minimal Setup
```tsx
import { RelatedProducts } from '@/components/store';

export default function MyPage() {
  return (
    <ScrollView>
      <RelatedProducts productId="prod-123" />
    </ScrollView>
  );
}
```

### With State Management
```tsx
const [productId, setProductId] = useState('prod-123');

<RelatedProducts
  productId={productId}
  onProductPress={(product) => {
    setProductId(product.id); // Update current product
  }}
/>
```

### With Loading State
```tsx
const [loading, setLoading] = useState(false);

{!loading && <RelatedProducts productId={productId} />}
```

### Conditional Rendering
```tsx
{showRelated && productId && (
  <RelatedProducts productId={productId} />
)}
```

## Testing

### Manual Test Steps
1. Open page with RelatedProducts
2. Verify skeleton loader shows
3. Verify products load (10 items)
4. Scroll horizontally
5. Tap a product card
6. Verify navigation works
7. Tap "View All" button
8. Test with invalid productId
9. Test error retry button

### Test with Mock Data
Mock data automatically loads if backend unavailable. No special setup needed.

## Common Patterns

### Pattern 1: Product Discovery Flow
```
User Views Product → Sees Related Products → Clicks One → Sees New Related Products → ...
```

### Pattern 2: Multiple Recommendation Types
```
- "You May Also Like" (Similar category)
- "More from Brand" (Same brand)
- "Frequently Bought Together" (Purchase patterns)
```

### Pattern 3: Personalized Recommendations
```tsx
<RelatedProducts
  productId={productId}
  title={`Perfect for ${userPreference} lovers`}
/>
```

## Pro Tips

### Tip 1: Limit Products for Performance
Lower limits = faster loading and better performance
```tsx
limit={6}  // Good for mobile
limit={10} // Good for tablet/desktop
```

### Tip 2: Combine with Other Sections
```tsx
<ProductDetails />
<FrequentlyBoughtTogether />
<RelatedProducts />
<ReviewsSection />
```

### Tip 3: Track Analytics
Always track when users interact with related products
```tsx
onProductPress={(product) => {
  trackEvent('related_product_clicked', { id: product.id });
  navigate(product);
}}
```

### Tip 4: A/B Test Titles
Try different titles to see what drives more clicks:
- "You May Also Like"
- "Similar Products"
- "Customers Also Viewed"
- "Recommended for You"

## Dependencies

Required packages (already in package.json):
- react-native
- expo-router
- expo-linear-gradient (for skeleton)

Internal dependencies:
- StoreProductCard component
- SkeletonLoader component
- productsApi service
- Toast hook

## Support & Resources

- **Full Documentation**: `RELATED_PRODUCTS_README.md`
- **Implementation Summary**: `RELATEDPRODUCTS_IMPLEMENTATION_SUMMARY.md`
- **Integration Examples**: `RelatedProductsIntegrationExample.tsx`
- **Component Source**: `RelatedProducts.tsx`

## Version Info

- **Created**: November 2025
- **Component Version**: 1.0.0
- **Status**: Production Ready ✅
- **TypeScript**: Fully Typed
- **Platform**: iOS, Android, Web

## Quick Fixes

### Fix 1: Products Not Appearing
```tsx
// Add key prop to force re-render
<RelatedProducts key={productId} productId={productId} />
```

### Fix 2: Styling Issues
```tsx
// Wrap in custom container
<View style={{ backgroundColor: '#F9FAFB', paddingVertical: 16 }}>
  <RelatedProducts productId={productId} />
</View>
```

### Fix 3: Navigation Not Working
```tsx
// Use explicit navigation
<RelatedProducts
  productId={productId}
  onProductPress={(product) => {
    router.push(`/product/${product.id}`);
  }}
/>
```

---

**Ready to Use!** Copy any of the code snippets above and start using the component immediately.
