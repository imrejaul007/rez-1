# ProductSelector - Quick Reference Card

## 🚀 5-Second Copy-Paste

```tsx
import ProductSelector from '@/components/ugc/ProductSelector';
import { ProductSelectorProduct } from '@/types/product-selector.types';

const [show, setShow] = useState(false);
const [products, setProducts] = useState<ProductSelectorProduct[]>([]);

<ProductSelector
  visible={show}
  onClose={() => setShow(false)}
  selectedProducts={products}
  onProductsChange={setProducts}
  maxProducts={10}
  minProducts={5}
/>
```

---

## 📋 Props Cheat Sheet

| Prop | Type | Default | Example |
|------|------|---------|---------|
| `visible` | `boolean` | - | `true` |
| `onClose` | `() => void` | - | `() => setShow(false)` |
| `selectedProducts` | `Product[]` | - | `[...]` |
| `onProductsChange` | `(p) => void` | - | `setProducts` |
| `maxProducts` | `number` | `10` | `15` |
| `minProducts` | `number` | `1` | `5` |
| `title` | `string` | `'Select Products'` | `'Tag Products'` |
| `confirmButtonText` | `string` | `'Done'` | `'Add'` |
| `allowMultiple` | `boolean` | `true` | `false` |
| `requireSelection` | `boolean` | `true` | `false` |

---

## 🎯 Common Use Cases

### Multi-Select (5-10 products)
```tsx
<ProductSelector
  maxProducts={10}
  minProducts={5}
  allowMultiple={true}
/>
```

### Single-Select
```tsx
<ProductSelector
  maxProducts={1}
  minProducts={1}
  allowMultiple={false}
/>
```

### Optional Selection
```tsx
<ProductSelector
  maxProducts={10}
  minProducts={0}
  requireSelection={false}
/>
```

---

## 🔑 Key Methods

```tsx
const {
  products,           // Product[]
  loading,            // boolean
  error,              // string | null
  searchProducts,     // (query: string) => void
  selectProduct,      // (product) => boolean
  deselectProduct,    // (id: string) => void
  isSelected,         // (id: string) => boolean
  canSelectMore,      // boolean
} = useProductSearch({ maxProducts: 10 });
```

---

## 📊 Product Data Structure

```typescript
{
  _id: string,              // "507f1f77bcf86cd799439011"
  name: string,             // "Cotton T-Shirt"
  basePrice: number,        // 999
  salePrice?: number,       // 799
  images: string[],         // ["https://..."]
  store: {
    _id: string,           // "507f1f77bcf86cd799439012"
    name: string,          // "Fashion Store"
  },
  category?: string,        // "Apparel"
  rating?: {
    average: number,       // 4.5
    count: number,         // 123
  },
  inStock?: boolean,        // true
  availability?: string,    // "in_stock"
}
```

---

## 🌐 API Endpoints

### Get Products
```
GET /api/products?page=1&limit=20
```

### Search Products
```
GET /api/products/search?q=shirt&page=1&limit=20
```

### Response Format
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

## 🎨 Customization Examples

### Custom Title
```tsx
<ProductSelector title="Choose Your Products" />
```

### Custom Button Text
```tsx
<ProductSelector confirmButtonText="Add to Cart" />
```

### Pre-filled Search
```tsx
<ProductSelector initialSearchQuery="shoes" />
```

---

## ⚡ Performance Tips

1. **Conditional Rendering**
   ```tsx
   {visible && <ProductSelector ... />}
   ```

2. **Memoized Callback**
   ```tsx
   const handleChange = useCallback((p) => setProducts(p), []);
   ```

3. **Stable References**
   ```tsx
   const [products] = useState([]); // Initial once
   ```

---

## 🐛 Troubleshooting

### Products not loading?
```bash
# Check backend is running
curl http://localhost:5001/api/products
```

### Search not working?
- Wait 500ms after typing (debounce)
- Check console for errors

### Images not showing?
- Fallback placeholder shows automatically
- Check CORS on backend

---

## ✅ Testing Checklist

- [ ] Modal opens
- [ ] Search works
- [ ] Products display
- [ ] Selection works
- [ ] Max limit enforced
- [ ] Min validation works
- [ ] Confirm/Cancel work

---

## 📁 File Locations

```
frontend/
├── types/product-selector.types.ts
├── hooks/useProductSearch.ts
└── components/ugc/
    ├── ProductCard.tsx
    ├── ProductSelector.tsx
    └── README_PRODUCT_SELECTOR.md
```

---

## 🔗 Quick Links

- **Full Docs:** `README_PRODUCT_SELECTOR.md`
- **Quick Start:** `PRODUCT_SELECTOR_QUICK_START.md`
- **Examples:** `ProductSelectorExample.tsx`
- **Architecture:** `PRODUCT_SELECTOR_ARCHITECTURE.md`

---

## 💡 Pro Tips

1. Always use state for `selectedProducts`
2. Wrap in `useCallback` for performance
3. Handle errors gracefully
4. Test with backend running
5. Use TypeScript for type safety

---

## 🎯 One-Liner Summary

**ProductSelector**: A production-ready modal component for searching and multi-selecting products with debounced search, pagination, validation, and beautiful UI.

---

**Need help?** Check `README_PRODUCT_SELECTOR.md` for full documentation!
