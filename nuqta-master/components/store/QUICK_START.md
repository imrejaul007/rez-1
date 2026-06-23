# CrossStoreProductsSection - Quick Start Card

## 🚀 30-Second Start

```tsx
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';

<CrossStoreProductsSection currentStoreId="store-123" limit={10} />
```

---

## 📋 Props

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `currentStoreId` | `string` | `undefined` | No |
| `onProductPress` | `function` | Navigate to `/product/[id]` | No |
| `limit` | `number` | `10` | No |

---

## 📦 What You Need

- ✅ `usePersonalizedRecommendations` hook
- ✅ API endpoint: `/api/recommendations/personalized`
- ✅ `ProductCard` component
- ✅ `CartContext` & `WishlistContext`
- ✅ `expo-router`

---

## 🎯 Use Cases

### Store Page
```tsx
<CrossStoreProductsSection
  currentStoreId={storeId}
  limit={10}
/>
```

### Product Page
```tsx
<CrossStoreProductsSection
  currentStoreId={product.storeId}
  limit={8}
/>
```

### Homepage
```tsx
<CrossStoreProductsSection limit={10} />
```

---

## 🎨 Features

- ✨ Personalized recommendations
- 🏪 Store badge: "From [Store Name]"
- 🔄 Loading state
- ⚠️ Error state with retry
- 🛒 Add to cart
- ❤️ Wishlist toggle
- 📱 Responsive design
- ♿ Accessibility

---

## 📁 Files

```
components/store/
├── CrossStoreProductsSection.tsx       ← Main component
├── CrossStoreProductsSection.types.ts  ← TypeScript types
├── CrossStoreProductsSection.example.tsx ← Examples
├── CrossStoreProductsSection.README.md ← Full docs
├── CrossStoreProductsSection.test.tsx  ← Tests
├── INTEGRATION_GUIDE.md                ← Integration guide
├── CrossStoreProductsSection.VISUAL.md ← Visual guide
└── CrossStoreProductsSection.SUMMARY.md ← Summary
```

---

## 🐛 Debug

```tsx
const { recommendations, loading, error } = usePersonalizedRecommendations({
  autoFetch: true,
  limit: 10,
});

console.log('Data:', recommendations);
console.log('Loading:', loading);
console.log('Error:', error);
```

---

## 🔗 More Info

- **Full Docs**: `CrossStoreProductsSection.README.md`
- **Examples**: `CrossStoreProductsSection.example.tsx`
- **Integration**: `INTEGRATION_GUIDE.md`
- **Visual**: `CrossStoreProductsSection.VISUAL.md`
- **Summary**: `CrossStoreProductsSection.SUMMARY.md`

---

**That's it! You're ready to go! 🎉**
