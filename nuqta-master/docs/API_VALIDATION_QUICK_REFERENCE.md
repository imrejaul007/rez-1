# API Response Validation - Quick Reference

## For Developers

### Import Validators

```typescript
import {
  validateProduct,
  validateProductArray,
  validateStore,
  validateStoreArray,
  validateCriticalFields,
  normalizeId
} from '@/utils/responseValidators';
```

---

## Usage Examples

### 1. Validate Single Product

```typescript
async getProduct(id: string) {
  const response = await apiClient.get(`/products/${id}`);

  if (response.success && response.data) {
    const validatedProduct = validateProduct(response.data);

    if (!validatedProduct) {
      console.warn('Invalid product data');
      return null;
    }

    return validatedProduct;
  }
}
```

### 2. Validate Product Array

```typescript
async getProducts() {
  const response = await apiClient.get('/products');

  if (response.success && response.data) {
    // Automatically filters invalid products
    const validProducts = validateProductArray(response.data);
    return validProducts;
  }
}
```

### 3. Validate Single Store

```typescript
async getStore(id: string) {
  const response = await apiClient.get(`/stores/${id}`);

  if (response.success && response.data) {
    const validatedStore = validateStore(response.data);

    if (!validatedStore) {
      console.warn('Invalid store data');
      return null;
    }

    return validatedStore;
  }
}
```

### 4. Validate Store Array

```typescript
async getStores() {
  const response = await apiClient.get('/stores');

  if (response.success && response.data) {
    // Automatically filters invalid stores and preserves rating breakdowns
    const validStores = validateStoreArray(response.data);
    return validStores;
  }
}
```

---

## What Gets Normalized?

### Product Fields

| Backend Field | Normalized Field | Notes |
|---------------|------------------|-------|
| `_id` | `id` | MongoDB ID standardization |
| `pricing.basePrice` | `price.current` | Price normalization |
| `pricing.salePrice` | `price.current` | Sale price takes priority |
| `ratings.average` | `rating.value` | Rating normalization |
| `ratings.count` | `rating.count` | Review count |
| `images[].url` | `images[].url` | Image array standardization |

### Store Fields

| Backend Field | Normalized Field | Notes |
|---------------|------------------|-------|
| `_id` | `id` | MongoDB ID standardization |
| `ratings.average` | `rating.value` | Rating normalization |
| `ratings.breakdown` | `rating.breakdown` | ✅ **Preserved!** |
| `location.address` | `location.address` | Location normalization |
| `offers.cashback` | `cashback.percentage` | Cashback normalization |

---

## Supported Backend Formats

### Price Formats

```typescript
// ✅ All these formats work:

// Format 1: pricing object
{ pricing: { basePrice: 1999, salePrice: 1499 } }

// Format 2: price object
{ price: { current: 1499, original: 1999 } }

// Format 3: direct number
{ price: 1499 }

// Format 4: legacy basePrice
{ basePrice: 1499, originalPrice: 1999 }
```

### Rating Formats

```typescript
// ✅ All these formats work:

// Format 1: ratings object
{ ratings: { average: 4.5, count: 120 } }

// Format 2: rating object
{ rating: { value: 4.5, count: 120 } }

// Format 3: direct number
{ rating: 4.5, ratingCount: 120 }
```

---

## Error Handling

### Validation Returns Null for Invalid Data

```typescript
const product = validateProduct(invalidData);

if (!product) {
  // Handle invalid data
  console.warn('Product validation failed');
  return defaultProduct;
}

// Safe to use product here
```

### Array Validation Filters Invalid Items

```typescript
const products = validateProductArray([
  validProduct1,
  invalidProduct,  // ❌ Filtered out
  validProduct2,
]);

// products = [validProduct1, validProduct2]
console.log(`Validated ${products.length} products`);
```

---

## Console Warnings

Validators log helpful warnings:

```
[VALIDATOR] Invalid product data: not an object
[VALIDATOR] Product missing ID field
[VALIDATOR] Product missing name/title field
[VALIDATOR] Product missing valid price data
[VALIDATOR] Filtered out 2 invalid products
[VALIDATOR] Store missing rating field
[VALIDATOR] Error normalizing price: ...
```

---

## Best Practices

### ✅ DO

```typescript
// Always validate API responses
const response = await apiClient.get('/products');
const products = validateProductArray(response.data);

// Check for null after single-item validation
const product = validateProduct(response.data);
if (product) {
  // Use product safely
}

// Trust validated data structure
const price = product.price.current; // ✅ Safe
const rating = product.rating.value; // ✅ Safe
```

### ❌ DON'T

```typescript
// Don't skip validation
const products = response.data; // ❌ May have inconsistent structure

// Don't assume fields exist
const price = product.pricing.basePrice; // ❌ May be undefined

// Don't manually normalize
const id = product.id || product._id; // ❌ Validator does this
```

---

## Adding New Validators

### Template for Custom Validator

```typescript
export function validateCustomType(data: any): CustomType | null {
  try {
    // 1. Check if data is valid object
    if (!data || typeof data !== 'object') {
      console.warn('[VALIDATOR] Invalid data: not an object');
      return null;
    }

    // 2. Validate required fields
    const id = normalizeId(data);
    if (!id) {
      console.warn('[VALIDATOR] Missing ID field');
      return null;
    }

    // 3. Build validated object
    const validated: CustomType = {
      id,
      name: data.name || 'Unknown',
      // ... other fields with fallbacks
    };

    return validated;
  } catch (error) {
    console.error('[VALIDATOR] Error validating:', error);
    return null;
  }
}
```

---

## Performance Considerations

- Validators are lightweight (mostly field mapping)
- Array validation runs in O(n) time
- No heavy computations or external calls
- Validation overhead: ~0.1ms per item

### Optimization Tips

```typescript
// For large arrays, consider pagination
const validProducts = validateProductArray(
  response.data.slice(0, 20) // Validate first page only
);

// Validation is synchronous - can be cached
const cachedValidation = memoize(validateProduct);
```

---

## Testing

### Example Unit Test

```typescript
describe('validateProduct', () => {
  it('normalizes pricing field', () => {
    const rawProduct = {
      _id: '123',
      name: 'Test Product',
      pricing: { basePrice: 1999, salePrice: 1499 }
    };

    const validated = validateProduct(rawProduct);

    expect(validated?.id).toBe('123');
    expect(validated?.price.current).toBe(1499);
    expect(validated?.price.original).toBe(1999);
  });

  it('returns null for missing ID', () => {
    const rawProduct = { name: 'Test' };
    const validated = validateProduct(rawProduct);
    expect(validated).toBeNull();
  });
});
```

---

## TypeScript Integration

Validators are fully typed:

```typescript
// Input: any (from API)
const rawData: any = await fetch(...);

// Output: typed or null
const product: ProductItem | null = validateProduct(rawData);

// Type narrowing with null check
if (product) {
  product.price.current // ✅ TypeScript knows this exists
}
```

---

## Troubleshooting

### Product Validation Fails

Check console for specific warning:
- Missing ID → Ensure backend returns `_id` or `id`
- Missing name → Ensure backend returns `name` or `title`
- Missing price → Ensure backend returns `pricing`, `price`, or `basePrice`

### Store Validation Fails

Check console for specific warning:
- Missing ID → Ensure backend returns `_id` or `id`
- Missing name → Ensure backend returns `name`
- Rating breakdown lost → Use `validateStore()` not manual mapping

### Array Returns Empty

- Check if input is actually an array
- Check console for validation warnings
- Verify at least one item passes validation

---

## Support

For questions or issues with validators:
1. Check console warnings for specific errors
2. Verify backend response format
3. Review this quick reference
4. Check `API_RESPONSE_FIXES_SUMMARY.md` for detailed info
