# Agent 4 Quick Reference Guide

## Utilities & Types Quick Start

### Store Transformers (`utils/storeTransformers.ts`)

```typescript
import {
  transformStoreData,
  formatPrice,
  parsePrice,
  calculateDiscountPercentage,
  formatDiscountText,
  calculateDistance,
} from '@/utils/storeTransformers';

// Transform API response
const storeData = transformStoreData(apiResponse);

// Format prices
const formatted = formatPrice(2199); // "₹2,199"
const number = parsePrice("₹2,199"); // 2199

// Calculate discount
const discount = calculateDiscountPercentage(2999, 2199); // 27

// Format discount
const text = formatDiscountText(discount); // "27% Off"

// Calculate distance
const km = calculateDistance(12.9716, 77.5946, 13.0827, 80.2707); // 348.5
```

---

### Date Utils (`utils/dateUtils.ts`)

```typescript
import {
  formatDate,
  getRelativeTime,
  format12Hour,
  isStoreOpen,
  getNextOpeningTime,
} from '@/utils/dateUtils';

// Format dates
const date = formatDate(new Date()); // "Nov 14, 2025"
const relative = getRelativeTime(new Date()); // "Just now"

// Business hours
const open = isStoreOpen(storeHours); // true/false
const next = getNextOpeningTime(storeHours); // "Opens tomorrow at 10:00 AM"

// Time conversion
const time = format12Hour("14:30"); // "2:30 PM"
```

---

### Store Constants (`constants/storeConstants.ts`)

```typescript
import {
  FILTER_OPTIONS,
  PRODUCT_GRID_CONFIG,
  LOADING_CONFIG,
  ERROR_MESSAGES,
} from '@/constants/storeConstants';

// Use predefined options
const sortOptions = FILTER_OPTIONS.SORT_BY; // Array of sort options
const categories = FILTER_OPTIONS.CATEGORIES; // Array of categories

// Layout constants
const columns = PRODUCT_GRID_CONFIG.NUM_COLUMNS; // 2
const padding = PRODUCT_GRID_CONFIG.HORIZONTAL_PADDING; // 16

// Timeouts
const skeletonDuration = LOADING_CONFIG.SKELETON_DURATION; // 1200ms

// Error messages
const error = ERROR_MESSAGES.LOAD_PRODUCTS; // "Failed to load products..."
```

---

### Type Guards (`utils/typeGuards.ts`)

```typescript
import {
  isProduct,
  isStoreData,
  isDiscount,
  safeNumber,
  safeString,
  safeJsonParse,
} from '@/utils/typeGuards';

// Type checking
if (isProduct(data)) {
  // data is typed as Product
  console.log(data.name);
}

// Safe parsing
const price = safeNumber(input, 0); // 0 if invalid
const name = safeString(input, "Unknown"); // "Unknown" if invalid
const json = safeJsonParse<MyType>(str, defaultValue);
```

---

### Store Types (`types/store.types.ts`)

```typescript
import {
  Product,
  StoreData,
  Review,
  Promotion,
  Category,
  Cart,
  CartItem,
} from '@/types/store.types';

// Use in component props
interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

// Use in state
const [products, setProducts] = useState<Product[]>([]);
const [store, setStore] = useState<StoreData | null>(null);
```

---

## Common Patterns

### Pattern 1: Loading Store Data

```typescript
import { StoreData } from '@/types/store.types';
import { transformStoreData } from '@/utils/storeTransformers';
import { isStoreData } from '@/utils/typeGuards';

const fetchStore = async (storeId: string) => {
  const response = await storesApi.getStoreById(storeId);

  if (response.success && response.data) {
    const data = transformStoreData(response.data);

    if (isStoreData(data)) {
      setStore(data);
    }
  }
};
```

### Pattern 2: Formatting Product Prices

```typescript
import { formatPrice, parsePrice } from '@/utils/storeTransformers';

// Display
<Text>{formatPrice(product.price)}</Text> // "₹2,199"

// Calculate
const total = parsePrice(product.price) * quantity;
```

### Pattern 3: Date Formatting

```typescript
import { formatDate, getRelativeTime } from '@/utils/dateUtils';

// Review date
<Text>{getRelativeTime(review.createdAt)}</Text> // "2 days ago"

// Order date
<Text>{formatDate(order.createdAt, 'long')}</Text> // "Wednesday, November 14, 2025"
```

### Pattern 4: Store Status

```typescript
import { isStoreOpen, getNextOpeningTime } from '@/utils/dateUtils';
import { STORE_STATUS, STATUS_COLORS } from '@/constants/storeConstants';

const status = isStoreOpen(store.hours) ? STORE_STATUS.OPEN : STORE_STATUS.CLOSED;
const color = STATUS_COLORS[status];

<View style={{ backgroundColor: color }}>
  <Text>{status}</Text>
</View>
```

### Pattern 5: Safe Navigation Params

```typescript
import { safeJsonParse, safeString } from '@/utils/typeGuards';
import { StoreNavigationParams } from '@/types/store.types';

const params = useLocalSearchParams();
const storeData = safeJsonParse<StoreData>(
  params.storeData as string,
  null
);
const storeId = safeString(params.storeId, '');
```

---

## Migration Checklist

### Migrating a Component to Use Utilities

- [ ] **Import types**
  ```typescript
  import { Product, StoreData } from '@/types/store.types';
  ```

- [ ] **Import transformers**
  ```typescript
  import { formatPrice, parsePrice } from '@/utils/storeTransformers';
  ```

- [ ] **Import constants**
  ```typescript
  import { PRODUCT_GRID_CONFIG } from '@/constants/storeConstants';
  ```

- [ ] **Replace `any` types**
  ```typescript
  // Before: const [products, setProducts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  ```

- [ ] **Replace magic numbers**
  ```typescript
  // Before: const columns = 2;
  const columns = PRODUCT_GRID_CONFIG.NUM_COLUMNS;
  ```

- [ ] **Replace inline formatting**
  ```typescript
  // Before: `₹${price.toLocaleString('en-IN')}`
  formatPrice(price)
  ```

- [ ] **Add type guards**
  ```typescript
  import { isProduct } from '@/utils/typeGuards';

  if (isProduct(data)) {
    // Safe to use data as Product
  }
  ```

---

## Testing Examples

### Unit Test for Utilities

```typescript
import { formatPrice, parsePrice, calculateDiscountPercentage } from '@/utils/storeTransformers';

describe('storeTransformers', () => {
  test('formatPrice formats correctly', () => {
    expect(formatPrice(2199)).toBe('₹2,199');
    expect(formatPrice(100)).toBe('₹100');
  });

  test('parsePrice parses correctly', () => {
    expect(parsePrice('₹2,199')).toBe(2199);
    expect(parsePrice('₹100')).toBe(100);
  });

  test('calculateDiscountPercentage calculates correctly', () => {
    expect(calculateDiscountPercentage(100, 80)).toBe(20);
    expect(calculateDiscountPercentage(2999, 2199)).toBe(27);
  });
});
```

### Integration Test with Components

```typescript
import { render } from '@testing-library/react-native';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/store.types';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  price: 2199,
  // ... other required fields
};

test('ProductCard displays formatted price', () => {
  const { getByText } = render(<ProductCard product={mockProduct} />);
  expect(getByText('₹2,199')).toBeTruthy();
});
```

---

## Performance Considerations

### Tree Shaking

All utilities use **named exports** for tree-shaking:

```typescript
// ✅ Good - Only imports what you need
import { formatPrice } from '@/utils/storeTransformers';

// ❌ Bad - Imports everything
import storeTransformers from '@/utils/storeTransformers';
```

### Memoization

Use utilities with React.useMemo for expensive calculations:

```typescript
const formattedPrice = useMemo(
  () => formatPrice(product.price),
  [product.price]
);

const discountPercentage = useMemo(
  () => calculateDiscountPercentage(product.originalPrice, product.price),
  [product.originalPrice, product.price]
);
```

---

## Troubleshooting

### Type Error: "Cannot find module"

**Solution**: Check tsconfig.json has path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Type Error: "Property does not exist on type"

**Solution**: Ensure you're using the correct type:
```typescript
import { Product } from '@/types/store.types';
// Not from MainStoreProduct
```

### Runtime Error: "Cannot read property of undefined"

**Solution**: Use type guards:
```typescript
import { safeGet } from '@/utils/typeGuards';

// Before: data.user.name
// After:
const userName = safeGet(data, 'user.name', 'Unknown');
```

---

## Best Practices

### 1. Always Import Types
```typescript
import { Product, StoreData } from '@/types/store.types';
```

### 2. Use Type Guards for API Data
```typescript
if (isProduct(apiData)) {
  setProduct(apiData);
}
```

### 3. Use Constants Instead of Magic Numbers
```typescript
// ❌ Bad
const padding = 16;

// ✅ Good
import { PRODUCT_GRID_CONFIG } from '@/constants/storeConstants';
const padding = PRODUCT_GRID_CONFIG.HORIZONTAL_PADDING;
```

### 4. Use Safe Accessors for Navigation Params
```typescript
import { safeJsonParse, safeString } from '@/utils/typeGuards';

const data = safeJsonParse<StoreData>(params.storeData, null);
```

### 5. Document Custom Types
```typescript
/**
 * Extended product type with additional UI fields
 */
interface UIProduct extends Product {
  formattedPrice: string;
  discountBadge?: string;
}
```

---

## Files Reference

| File | Purpose | Lines | Functions/Types |
|------|---------|-------|-----------------|
| `utils/storeTransformers.ts` | Data transformations | 340 | 15 functions |
| `utils/dateUtils.ts` | Date/time utilities | 280 | 13 functions |
| `utils/typeGuards.ts` | Type checking | 380 | 30+ functions |
| `constants/storeConstants.ts` | App constants | 400 | 18 groups |
| `types/store.types.ts` | TypeScript types | 500 | 50+ interfaces |

---

## Next Steps

1. **Use in existing components**: Update Section3, Section5, Section6
2. **Write tests**: Create unit tests for utilities
3. **Extend as needed**: Add more utilities when patterns emerge
4. **Document changes**: Update this guide when adding new utilities

---

## Support

For questions or issues:
- Check `AGENT_4_DELIVERY_REPORT.md` for detailed documentation
- Review type definitions in `types/store.types.ts`
- See usage examples in `app/MainStorePage.tsx`

**Last Updated**: November 14, 2025
**Version**: 1.0.0
**Agent**: Agent 4
