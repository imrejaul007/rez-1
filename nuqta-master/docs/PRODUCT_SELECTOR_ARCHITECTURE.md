# Product Selector - Architecture Overview

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VideoUploadScreen                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  [Tag Products Button] (0/10 selected)               │  │
│  │                                                       │  │
│  │  selectedProducts: ProductSelectorProduct[]          │  │
│  │  setSelectedProducts: (products) => void             │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│                            │ onClick                        │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           ProductSelector (Modal)                    │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Header: "Select Products (2/10)" [X]           │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │ 🔍 Search: [____________] [x]                   │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │                                                 │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │  │
│  │  │  │ [✓] Img  │  │ [ ] Img  │  │ [✓] Img  │     │  │  │
│  │  │  │  Name    │  │  Name    │  │  Name    │     │  │  │
│  │  │  │  ₹999    │  │  ₹799    │  │  ₹599    │     │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘     │  │  │
│  │  │                                                 │  │  │
│  │  │  [Load More Products...]                       │  │  │
│  │  │                                                 │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │ Selected Products (2):                         │  │  │
│  │  │  ✓ Product 1 [x]                               │  │  │
│  │  │  ✓ Product 2 [x]                               │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │ [Cancel]           [Done ✓]                    │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
ProductSelector (Main Component)
├── Modal (React Native)
│   └── KeyboardAvoidingView
│       └── Animated.View
│           ├── Header Section
│           │   ├── Title + Subtitle (count)
│           │   └── Close Button
│           │
│           ├── Search Section
│           │   ├── Search Icon
│           │   ├── TextInput (debounced)
│           │   └── Clear Button
│           │
│           ├── Product List Section
│           │   └── FlatList
│           │       ├── ProductCard (item 1)
│           │       ├── ProductCard (item 2)
│           │       ├── ProductCard (item 3)
│           │       ├── ...
│           │       └── Footer Loading
│           │
│           ├── Selected Products Section
│           │   ├── Header (count + checkmark)
│           │   └── FlatList (horizontal)
│           │       ├── Selected Item 1 [x]
│           │       ├── Selected Item 2 [x]
│           │       └── ...
│           │
│           └── Action Buttons
│               ├── Cancel Button
│               └── Confirm Button (validated)
│
└── ProductCard (Reusable Component)
    ├── Selection Checkbox
    ├── Product Image
    │   ├── Discount Badge
    │   ├── Out of Stock Overlay
    │   └── Low Stock Badge
    ├── Product Info
    │   ├── Product Name
    │   ├── Store Name + Icon
    │   ├── Rating + Count
    │   ├── Price + Original Price
    │   └── Category Tag
    └── Selected Badge
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Actions                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   [Search]          [Select Product]     [Confirm]
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    useProductSearch Hook                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ State:                                               │  │
│  │  - products: Product[]                               │  │
│  │  - selectedProducts: Product[]                       │  │
│  │  - loading: boolean                                  │  │
│  │  - error: string | null                              │  │
│  │  - query: string                                     │  │
│  │  - page: number                                      │  │
│  │                                                       │  │
│  │ Actions:                                             │  │
│  │  - searchProducts(query) ──> API Call (debounced)   │  │
│  │  - selectProduct(product) ──> Update state           │  │
│  │  - deselectProduct(id) ──> Update state              │  │
│  │  - loadMore() ──> API Call (next page)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Service Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ productsService (services/productsApi.ts)            │  │
│  │                                                       │  │
│  │  searchProducts(query) ────────┐                     │  │
│  │  getProducts(params) ──────────┤                     │  │
│  │                                │                     │  │
│  └────────────────────────────────┼─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Client Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ apiClient (services/apiClient.ts)                    │  │
│  │                                                       │  │
│  │  get(endpoint, params) ────────┐                     │  │
│  │                                │                     │  │
│  └────────────────────────────────┼─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                            │
│                                                             │
│  GET /api/products?page=1&limit=20                          │
│  GET /api/products/search?q=query&page=1                    │
│                                                             │
│  Response: {                                                │
│    success: true,                                           │
│    data: {                                                  │
│      products: [...],                                       │
│      pagination: { current, pages, total, hasMore }         │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Parent Component                         │
│                                                             │
│  const [selectedProducts, setSelectedProducts] = useState() │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  Initial State: []                                    │ │
│  │                                                       │ │
│  │  User selects Product A ──> Hook updates             │ │
│  │                             │                         │ │
│  │                             ▼                         │ │
│  │  Hook State: [Product A]                             │ │
│  │                             │                         │ │
│  │  User selects Product B ──> Hook updates             │ │
│  │                             │                         │ │
│  │                             ▼                         │ │
│  │  Hook State: [Product A, Product B]                  │ │
│  │                             │                         │ │
│  │  User clicks "Done" ──────> onProductsChange()        │ │
│  │                             │                         │ │
│  │                             ▼                         │ │
│  │  Parent State: [Product A, Product B]                │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Search Flow with Debounce

```
User Types: "s" ──> Wait 500ms ──> Cancelled
User Types: "sh" ──> Wait 500ms ──> Cancelled
User Types: "shi" ──> Wait 500ms ──> Cancelled
User Types: "shir" ──> Wait 500ms ──> Cancelled
User Types: "shirt" ──> Wait 500ms ──> API Call!
                                       │
                                       ▼
                        GET /api/products/search?q=shirt
                                       │
                                       ▼
                        Response: { products: [...] }
                                       │
                                       ▼
                        Update products state
                                       │
                                       ▼
                        Re-render FlatList
                                       │
                                       ▼
                        Display results
```

## Pagination Flow

```
Initial Load (Page 1)
│
├─> GET /api/products?page=1&limit=20
│   │
│   └─> Response: { products: [1-20], hasMore: true }
│
User Scrolls to Bottom (onEndReached)
│
├─> Check: hasMore === true && !loading
│   │
│   └─> GET /api/products?page=2&limit=20
│       │
│       └─> Response: { products: [21-40], hasMore: true }
│           │
│           └─> Append to existing products
│               │
│               └─> products = [...prev, ...new]
│
User Scrolls to Bottom Again
│
├─> GET /api/products?page=3&limit=20
│   │
│   └─> Continue until hasMore === false
```

## Selection Validation Flow

```
User Clicks Product
│
├─> Check: Is already selected?
│   ├─> YES: Deselect (remove from array)
│   └─> NO: Continue
│
├─> Check: Max limit reached? (count >= maxProducts)
│   ├─> YES: Show error, prevent selection
│   └─> NO: Continue
│
├─> Add to selectedProducts array
│
└─> Update UI (checkbox, counter, preview section)


User Clicks "Done"
│
├─> Validate: count >= minProducts?
│   ├─> YES: Call onProductsChange(selectedProducts)
│   │         │
│   │         └─> Close modal
│   │
│   └─> NO: Show error alert
│           │
│           └─> Keep modal open
```

## Error Handling Flow

```
API Call
│
├─> Try: fetch(endpoint)
│   │
│   ├─> Success (200 OK)
│   │   │
│   │   └─> Parse response
│   │       │
│   │       ├─> Valid data: Update products
│   │       └─> Invalid data: Set error
│   │
│   ├─> Network Error
│   │   │
│   │   └─> Set error: "Connection failed"
│   │       │
│   │       └─> Show retry button
│   │
│   ├─> Timeout
│   │   │
│   │   └─> Set error: "Request timeout"
│   │       │
│   │       └─> Show retry button
│   │
│   └─> Server Error (500)
│       │
│       └─> Set error: response.message
│           │
│           └─> Show retry button
│
User Clicks Retry
│
└─> Retry API call (same parameters)
```

## Component Lifecycle

```
Component Mount
│
├─> Initialize hook with config
│   │
│   └─> useProductSearch({ maxProducts: 10, minProducts: 5 })
│
├─> Load initial products
│   │
│   └─> fetchProducts('', 1, false)
│       │
│       └─> GET /api/products?page=1&limit=20
│
User Opens Modal
│
├─> Modal becomes visible
│   │
│   └─> Slide-in animation
│
User Searches
│
├─> Type in search input
│   │
│   └─> Debounce timer starts (500ms)
│       │
│       └─> Timer completes
│           │
│           └─> searchProducts(query)
│               │
│               └─> API call with query
│
User Selects Products
│
├─> Tap product card
│   │
│   └─> toggleProduct(product)
│       │
│       └─> Update selectedProducts state
│
User Confirms
│
├─> Click "Done" button
│   │
│   └─> Validate min/max
│       │
│       └─> Call onProductsChange()
│           │
│           └─> Parent receives selected products
│
Component Unmount
│
└─> Cleanup
    │
    ├─> Cancel pending API requests
    │
    └─> Clear debounce timers
```

## Performance Optimizations

```
┌─────────────────────────────────────────────────────────────┐
│                   Optimization Layers                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Debounced Search (500ms)                                │
│     - Reduces API calls from 100+ to 5-10                   │
│     - User types "shirt" = 1 API call instead of 5          │
│                                                             │
│  2. Request Cancellation (AbortController)                  │
│     - Cancels previous requests when new one starts         │
│     - Prevents race conditions                              │
│                                                             │
│  3. Pagination (20 items per page)                          │
│     - Initial load: 20 products (~50KB)                     │
│     - Instead of all 277 products (~700KB)                  │
│                                                             │
│  4. FlatList Virtualization                                 │
│     - Only renders visible items + buffer                   │
│     - 277 products, only 10-15 in memory                    │
│     - Lazy loading as user scrolls                          │
│                                                             │
│  5. Memoized Callbacks (useCallback)                        │
│     - Prevents unnecessary re-renders                       │
│     - Stable function references                            │
│                                                             │
│  6. Image Optimization                                      │
│     - resizeMode="cover"                                    │
│     - Fallback for missing images                           │
│     - Lazy loading with FlatList                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Type Safety Flow

```typescript
// 1. API Response (Backend)
{
  _id: string,
  name: string,
  pricing: { basePrice: number },
  // ... other fields
}
        │
        │ Transform
        ▼
// 2. ProductSelectorProduct (Frontend)
{
  _id: string,
  name: string,
  basePrice: number,
  salePrice?: number,
  images: string[],
  store: { _id: string, name: string }
  // ... typed fields
}
        │
        │ useState
        ▼
// 3. Component State
selectedProducts: ProductSelectorProduct[]
        │
        │ Callback
        ▼
// 4. Parent Component
onProductsChange(products: ProductSelectorProduct[])
        │
        │ Extract IDs
        ▼
// 5. Upload to Backend
productIds: string[]
```

---

## File Dependencies

```
ProductSelector.tsx
├── Imports
│   ├── React Native (View, Text, Modal, FlatList, etc.)
│   ├── @expo/vector-icons (Ionicons)
│   ├── useProductSearch (custom hook)
│   ├── ProductCard (child component)
│   └── Types (product-selector.types.ts)
│
ProductCard.tsx
├── Imports
│   ├── React Native (View, Text, Image, TouchableOpacity)
│   ├── @expo/vector-icons (Ionicons)
│   └── Types (ProductCardProps)
│
useProductSearch.ts
├── Imports
│   ├── React (useState, useCallback, useRef, useEffect)
│   ├── productsService (API service)
│   └── Types (ProductSelectorProduct, etc.)
│
productsService
├── Imports
│   ├── apiClient (HTTP client)
│   └── Types (Product, ProductsQuery, etc.)
│
apiClient
├── Imports
│   └── utils/connectionUtils (error handling)
```

---

## Summary

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Type-safe data flow
- ✅ Optimized performance
- ✅ Error handling at every layer
- ✅ Scalable design

**All components work together seamlessly to provide a production-ready product selector!**
