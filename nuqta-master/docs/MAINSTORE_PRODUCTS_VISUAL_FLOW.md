# MainStorePage Products Section - Visual Flow

## Component Hierarchy

```
MainStorePage
│
├── ScrollView
│   ├── ProductDisplay (Images)
│   ├── TabNavigation (About/Deals/Reviews)
│   ├── ProductDetails (Title, Description, Location)
│   ├── CashbackOffer
│   ├── UGCSection (Store Videos)
│   │
│   └── Products Section ⭐ NEW
│       ├── Section Title: "Products"
│       │
│       └── Conditional Rendering:
│           │
│           ├─── [If Error] ───────────►  ProductsErrorState
│           │                              ├── Error Icon
│           │                              ├── Error Message
│           │                              └── Retry Button ──► handleRetryProducts()
│           │
│           ├─── [If Loading] ─────────►  StoreProductGrid
│           │                              ├── products={[]}
│           │                              ├── loading={true}
│           │                              └── Skeleton Loaders
│           │
│           ├─── [If Empty] ──────────►  EmptyProducts
│           │                              ├── Empty Icon
│           │                              ├── Store Name
│           │                              └── Empty Message
│           │
│           └─── [If Success] ────────►  StoreProductGrid
│                                          ├── products={productsArray}
│                                          ├── loading={false}
│                                          ├── Product Cards
│                                          └── onProductPress ──► /product/:id
│
└── VisitStoreButton (Fixed Bottom)
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Page Load / Store ID                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  loadProducts()      │
              │  useEffect           │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ productsLoading=true │
              └──────────┬───────────┘
                         │
                    ┌────┴────┐
                    │ API Call│
                    └────┬────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
   ┌────────────────┐        ┌────────────────┐
   │   SUCCESS      │        │     ERROR      │
   │ response.data  │        │ response.error │
   └───────┬────────┘        └───────┬────────┘
           │                         │
           ▼                         ▼
   ┌────────────────┐        ┌────────────────┐
   │ setProducts()  │        │ setError()     │
   │ setHasProducts │        │ products=[]    │
   └───────┬────────┘        └───────┬────────┘
           │                         │
           ▼                         ▼
   ┌────────────────┐        ┌────────────────┐
   │ Show Product   │        │ Show Error     │
   │ Grid           │        │ State          │
   └────────────────┘        └───────┬────────┘
                                     │
                                     │ User clicks Retry
                                     ▼
                            ┌────────────────┐
                            │ handleRetry    │
                            │ Products()     │
                            └───────┬────────┘
                                    │
                                    │ (loops back to API Call)
                                    └──────────────┐
                                                   │
                                    ┌──────────────┘
                                    ▼
                             (Back to API Call)
```

---

## UI States Visual

### 1. Loading State
```
┌─────────────────────────────────────────┐
│ Products                                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │            │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │            │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │            │
│  └──────────┘  └──────────┘            │
│  Skeleton      Skeleton                │
│  Loader        Loader                  │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Error State
```
┌─────────────────────────────────────────┐
│ Products                                │
├─────────────────────────────────────────┤
│                                         │
│          ⚠️                              │
│                                         │
│  Unable to load products.               │
│  Please try again.                      │
│                                         │
│  ┌───────────────────┐                 │
│  │   🔄 Try Again    │                 │
│  └───────────────────┘                 │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Empty State
```
┌─────────────────────────────────────────┐
│ Products                                │
├─────────────────────────────────────────┤
│                                         │
│          📦                              │
│                                         │
│  No Products Available                  │
│                                         │
│  [Store Name] hasn't added any          │
│  products yet. Check back later!        │
│                                         │
└─────────────────────────────────────────┘
```

### 4. Success State (Products Grid)
```
┌─────────────────────────────────────────┐
│ Products                                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  [IMG]   │  │  [IMG]   │            │
│  │          │  │          │            │
│  │ Product1 │  │ Product2 │            │
│  │ ₹999     │  │ ₹1,299   │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │  [IMG]   │  │  [IMG]   │            │
│  │          │  │          │            │
│  │ Product3 │  │ Product4 │            │
│  │ ₹799     │  │ ₹2,499   │            │
│  └──────────┘  └──────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Data Flow

### 1. Initial Load
```
params.storeId
    ↓
loadProducts useEffect
    ↓
productsApi.getProductsByStore(storeId)
    ↓
response.data.products
    ↓
setProducts(productsData)
    ↓
StoreProductGrid renders with products
```

### 2. Error → Retry Flow
```
API Error
    ↓
setProductsError("message")
    ↓
ProductsErrorState component renders
    ↓
User clicks "Try Again" button
    ↓
handleRetryProducts() called
    ↓
setProductsError(null)
setProductsLoading(true)
    ↓
productsApi.getProductsByStore(storeId)
    ↓
Success → setProducts(data)
    OR
Error → setProductsError(message)
```

### 3. Product Click Flow
```
User clicks product card
    ↓
onProductPress callback fired
    ↓
router.push(`/product/${product.id}`)
    ↓
Navigate to Product Detail Page
```

---

## Code Integration Points

### Existing Code Reused:
```typescript
// State (lines 469-472)
const [products, setProducts] = useState<ProductItem[]>([]);
const [productsLoading, setProductsLoading] = useState(false);
const [productsError, setProductsError] = useState<string | null>(null);
const [hasProducts, setHasProducts] = useState(false);

// API Call (lines 394-439)
useEffect(() => {
  const loadProducts = async () => {
    // Fetch logic
  };
  loadProducts();
}, [storeData?.id, params.storeId]);
```

### New Code Added:
```typescript
// Imports (lines 28-30)
import StoreProductGrid from "@/components/store/StoreProductGrid";
import EmptyProducts from "@/components/store/EmptyProducts";
import ProductsErrorState from "@/components/store/ProductsErrorState";

// Retry Handler (lines 444-482)
const handleRetryProducts = useCallback(async () => {
  // Retry logic
}, [storeData?.id, params.storeId]);

// UI Section (lines 749-779)
<View style={styles.sectionCard}>
  <Text style={styles.sectionTitle}>Products</Text>
  {/* Conditional rendering */}
</View>

// Style (lines 917-922)
sectionTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#1F2937",
  marginBottom: 16,
}
```

---

## Props Passed to Components

### ProductsErrorState Props:
```typescript
{
  message: productsError,        // Error message string
  onRetry: handleRetryProducts   // Retry callback function
}
```

### StoreProductGrid Props (Loading):
```typescript
{
  products: [],                  // Empty array for loading
  loading: true,                 // Show skeletons
  onProductPress: (product) => {
    router.push(`/product/${product.id}`);
  }
}
```

### StoreProductGrid Props (Success):
```typescript
{
  products: products,            // Array of ProductItem objects
  loading: false,                // Hide skeletons
  onProductPress: (product) => {
    router.push(`/product/${product.id}`);
  }
}
```

### EmptyProducts Props:
```typescript
{
  storeName: isDynamic && storeData
    ? storeData.name
    : productData.storeName
}
```

---

## Conditional Logic Truth Table

| productsError | productsLoading | hasProducts | Component Rendered      |
|---------------|-----------------|-------------|-------------------------|
| ❌ null       | ❌ false        | ❌ false    | EmptyProducts           |
| ❌ null       | ❌ false        | ✅ true     | StoreProductGrid        |
| ❌ null       | ✅ true         | ❌ false    | StoreProductGrid (load) |
| ❌ null       | ✅ true         | ✅ true     | StoreProductGrid (load) |
| ✅ "message"  | ❌ false        | ❌ false    | ProductsErrorState      |
| ✅ "message"  | ❌ false        | ✅ true     | ProductsErrorState      |
| ✅ "message"  | ✅ true         | ❌ false    | ProductsErrorState      |
| ✅ "message"  | ✅ true         | ✅ true     | ProductsErrorState      |

**Priority**: Error > Loading > Empty > Success

---

## Performance Considerations

### Optimizations Used:
1. **useCallback** for handleRetryProducts
   - Prevents unnecessary re-renders
   - Memoizes function with proper dependencies

2. **Conditional Rendering**
   - Only one component rendered at a time
   - No unnecessary DOM nodes

3. **Existing State Reuse**
   - No duplicate API calls
   - Shared state management

### Memory Footprint:
- **Small**: ~80 lines of code added
- **Efficient**: Reuses existing infrastructure
- **Scalable**: Handles large product catalogs via StoreProductGrid

---

## User Experience Flow

```
1. User lands on MainStorePage
         ↓
2. Sees loading skeletons in Products section
         ↓
3a. Products load successfully
    → User sees product grid
    → User clicks product
    → Navigates to product detail

3b. Products fail to load
    → User sees error message
    → User clicks "Try Again"
    → Sees loading skeletons again
    → Products load (back to 3a)

3c. Store has no products
    → User sees empty state
    → Message: "Check back later!"
```

---

## Summary

The Products section is now fully integrated with:
- ✅ 4 distinct UI states (Loading, Error, Empty, Success)
- ✅ Seamless error recovery via retry
- ✅ Clean, intuitive user experience
- ✅ Consistent with existing MainStorePage design
- ✅ Production-ready implementation

Total integration: **~80 lines** | **3 new imports** | **1 retry handler** | **1 UI section**
