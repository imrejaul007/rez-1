# Product Selector - Quick Start Guide

## 5-Minute Integration Guide

### Step 1: Import the Component (30 seconds)

```tsx
import ProductSelector from '@/components/ugc/ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';
```

### Step 2: Add State (30 seconds)

```tsx
const [showProductSelector, setShowProductSelector] = useState(false);
const [selectedProducts, setSelectedProducts] = useState<ProductSelectorProduct[]>([]);
```

### Step 3: Add the Component (1 minute)

```tsx
<ProductSelector
  visible={showProductSelector}
  onClose={() => setShowProductSelector(false)}
  selectedProducts={selectedProducts}
  onProductsChange={setSelectedProducts}
  maxProducts={10}
  minProducts={5}
  title="Tag Products in Video"
/>
```

### Step 4: Add Trigger Button (1 minute)

```tsx
<TouchableOpacity onPress={() => setShowProductSelector(true)}>
  <Text>Tag Products ({selectedProducts.length}/10)</Text>
</TouchableOpacity>
```

### Step 5: Use Selected Products (2 minutes)

```tsx
const handlePublish = async () => {
  const productIds = selectedProducts.map(p => p._id);

  await uploadVideo({
    videoUri: videoUri,
    taggedProducts: productIds,
    // ... other data
  });
};
```

---

## Complete Example (Copy-Paste Ready)

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProductSelector from '@/components/ugc/ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';

export default function VideoUploadScreen() {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductSelectorProduct[]>([]);

  const handlePublish = () => {
    console.log('Publishing with products:', selectedProducts.map(p => p._id));
    // Upload video logic here
  };

  return (
    <View style={styles.container}>
      {/* Tag Products Button */}
      <TouchableOpacity
        style={styles.tagButton}
        onPress={() => setShowProductSelector(true)}
      >
        <Text style={styles.tagButtonText}>
          Tag Products ({selectedProducts.length}/10)
        </Text>
      </TouchableOpacity>

      {/* Publish Button */}
      <TouchableOpacity
        style={[
          styles.publishButton,
          selectedProducts.length < 5 && styles.publishButtonDisabled
        ]}
        onPress={handlePublish}
        disabled={selectedProducts.length < 5}
      >
        <Text style={styles.publishButtonText}>Publish Video</Text>
      </TouchableOpacity>

      {/* Product Selector Modal */}
      <ProductSelector
        visible={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        selectedProducts={selectedProducts}
        onProductsChange={setSelectedProducts}
        maxProducts={10}
        minProducts={5}
        title="Tag Products in Your Video"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  tagButton: {
    backgroundColor: '#F5F7FF',
    borderWidth: 2,
    borderColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  tagButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  publishButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
```

---

## Configuration Options

### Multi-Select (Default)
```tsx
<ProductSelector
  maxProducts={10}
  minProducts={5}
  allowMultiple={true}
  // User can select 5-10 products
/>
```

### Single-Select
```tsx
<ProductSelector
  maxProducts={1}
  minProducts={1}
  allowMultiple={false}
  // User can select only 1 product
/>
```

### Optional Selection
```tsx
<ProductSelector
  maxProducts={10}
  minProducts={0}
  requireSelection={false}
  // User can select 0-10 products
/>
```

---

## Testing Checklist

Before using in production, test:

### Basic Functionality
- [ ] Modal opens when triggered
- [ ] Search works (type and wait 500ms)
- [ ] Products display correctly
- [ ] Images load or show fallback
- [ ] Prices formatted correctly (₹)
- [ ] Selection works (tap product card)
- [ ] Max limit enforced (try selecting 11+)
- [ ] Min validation works (try confirming with < 5)
- [ ] Selected products section shows
- [ ] Remove from selection works
- [ ] Load more pagination works
- [ ] Confirm button validates and closes
- [ ] Cancel button closes modal

### Edge Cases
- [ ] Empty search results shows message
- [ ] Network error shows retry button
- [ ] Out of stock products disabled
- [ ] Very long product names truncate
- [ ] Missing images show placeholder
- [ ] Keyboard dismisses on tap outside

---

## API Requirements

### Backend Must Be Running
```bash
# In user-backend directory
npm run dev

# Should output:
# Server running on http://localhost:5001
```

### Required Endpoints
1. **GET /api/products**
   - Returns paginated product list
   - Supports `page`, `limit`, `status`, `visibility` params

2. **GET /api/products/search**
   - Returns search results
   - Supports `q`, `page`, `limit` params

### Test API Manually
```bash
# Test get products
curl http://localhost:5001/api/products?page=1&limit=5

# Test search
curl http://localhost:5001/api/products/search?q=shirt&limit=5
```

Expected response:
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "current": 1,
      "pages": 14,
      "total": 277,
      "hasMore": true
    }
  }
}
```

---

## Troubleshooting

### Problem: Products not loading
**Solution:**
1. Check backend is running: `http://localhost:5001`
2. Check console for errors
3. Verify API endpoint in browser
4. Check network connectivity

### Problem: Search not working
**Solution:**
1. Wait 500ms after typing (debounce)
2. Check search endpoint: `/api/products/search?q=test`
3. Verify backend search is working

### Problem: Images not showing
**Solution:**
1. Check image URLs in API response
2. Verify CORS enabled on backend
3. Placeholder should show if URL invalid

### Problem: Selection not updating
**Solution:**
1. Ensure `selectedProducts` is state
2. Verify `onProductsChange` callback is set
3. Check console for errors

---

## Common Mistakes

### ❌ Wrong: Not using state
```tsx
const selectedProducts = [];  // Won't update!
```

### ✅ Correct: Use useState
```tsx
const [selectedProducts, setSelectedProducts] = useState([]);
```

### ❌ Wrong: Not handling close
```tsx
<ProductSelector
  visible={true}  // Always visible!
  onClose={() => {}}  // Does nothing
/>
```

### ✅ Correct: Control visibility
```tsx
const [visible, setVisible] = useState(false);

<ProductSelector
  visible={visible}
  onClose={() => setVisible(false)}
/>
```

### ❌ Wrong: Not validating min products
```tsx
handlePublish();  // Might have 0 products!
```

### ✅ Correct: Validate before action
```tsx
if (selectedProducts.length >= 5) {
  handlePublish();
}
```

---

## Performance Tips

1. **Don't render modal until needed**
   ```tsx
   {showSelector && <ProductSelector ... />}
   ```

2. **Memoize callbacks**
   ```tsx
   const handleChange = useCallback((products) => {
     setSelectedProducts(products);
   }, []);
   ```

3. **Use key extractor**
   - Already implemented in component
   - Uses product._id for optimal performance

---

## Advanced Usage

### Pre-fill Products
```tsx
const [selected, setSelected] = useState([
  {
    _id: '123',
    name: 'Pre-selected Product',
    // ... other fields
  }
]);
```

### Pre-fill Search
```tsx
<ProductSelector
  initialSearchQuery="shirts"
  // Opens with "shirts" already searched
/>
```

### Custom Messages
```tsx
<ProductSelector
  title="Choose Your Favorite Products"
  confirmButtonText="Add to Video"
/>
```

---

## Next Steps

1. ✅ Copy the complete example above
2. ✅ Replace `VideoUploadScreen` with your screen name
3. ✅ Test with backend running
4. ✅ Customize colors/text if needed
5. ✅ Add to your UGC upload flow

---

## Support

- **Documentation:** See `README_PRODUCT_SELECTOR.md`
- **Examples:** See `ProductSelectorExample.tsx`
- **Types:** See `types/product-selector.types.ts`

---

**Ready to use in 5 minutes!** 🚀
