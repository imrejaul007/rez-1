# MainStorePage Component Structure with Search/Filter/Sort

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│           MainStoreHeader (Purple Gradient)          │
│  [←]         Store Name                     [Avatar] │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                   Search Bar                         │
│  [🔍]  Search products...                      [×]  │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│            Filter & Sort Control Bar                 │
│  [🔽 Filters (2)]      [⇅ Price: Low to High ▾]    │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│               Active Filter Chips                    │
│  [Electronics ×] [4+ Stars ×] [Clear All]          │
└─────────────────────────────────────────────────────┘
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │          Product Image Carousel              │   │
│  │   [Share] [♥]                                │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │   [Deals] [About] [Reviews]                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │          Product Details                     │   │
│  │   Title, Description, Location               │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │          Cashback Offer                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │          UGC Videos Section                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │   Products                    125 items      │   │
│  │                                               │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │   │
│  │  │Prod1│ │Prod2│ │Prod3│ │Prod4│           │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘           │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │   │
│  │  │Prod5│ │Prod6│ │Prod7│ │Prod8│           │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘           │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│          [Visit Store Button]                        │
└─────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
MainStorePage
├── ThemedView (page container)
│   ├── StatusBar
│   ├── LinearGradient (header)
│   │   └── MainStoreHeader
│   │       ├── Back Button
│   │       ├── Store Name
│   │       └── Profile Avatar
│   │
│   ├── ScrollView
│   │   │
│   │   ├── Search Container (NEW)
│   │   │   └── Search Bar
│   │   │       ├── Search Icon
│   │   │       ├── TextInput
│   │   │       └── Clear Button (conditional)
│   │   │
│   │   ├── Controls Bar (NEW)
│   │   │   ├── Filter Button
│   │   │   │   ├── Filter Icon
│   │   │   │   └── Text + Badge
│   │   │   └── Sort Button
│   │   │       ├── Sort Icon
│   │   │       ├── Text
│   │   │       └── Chevron Icon
│   │   │
│   │   ├── Active Filters Container (NEW - conditional)
│   │   │   └── Horizontal ScrollView
│   │   │       ├── Search Chip (conditional)
│   │   │       ├── Category Chips (mapped)
│   │   │       ├── Rating Chip (conditional)
│   │   │       ├── Price Range Chip (conditional)
│   │   │       ├── Stock Status Chip (conditional)
│   │   │       ├── Cashback Chip (conditional)
│   │   │       └── Clear All Button
│   │   │
│   │   ├── Image Section
│   │   │   └── ProductDisplay
│   │   │       ├── Image Carousel
│   │   │       ├── Share Button
│   │   │       └── Favorite Button
│   │   │
│   │   ├── Tabs Container
│   │   │   └── TabNavigation
│   │   │       ├── Deals Tab
│   │   │       ├── About Tab
│   │   │       └── Reviews Tab
│   │   │
│   │   ├── Product Details Section
│   │   │   └── ProductDetails
│   │   │       ├── Title
│   │   │       ├── Description
│   │   │       ├── Location
│   │   │       └── Distance
│   │   │
│   │   ├── Cashback Section
│   │   │   └── CashbackOffer
│   │   │
│   │   ├── UGC Section
│   │   │   └── UGCSection
│   │   │       ├── Section Header
│   │   │       ├── View All Button
│   │   │       └── Video Grid
│   │   │
│   │   └── Products Section (ENHANCED)
│   │       ├── Section Header (NEW)
│   │       │   ├── Title
│   │       │   └── Product Count (NEW)
│   │       └── Content (conditional)
│   │           ├── ProductsErrorState (if error)
│   │           ├── StoreProductGrid (loading)
│   │           ├── EmptyProducts (if no products)
│   │           └── StoreProductGrid (with products)
│   │
│   ├── Fixed Bottom
│   │   └── VisitStoreButton
│   │
│   ├── Error Toast (conditional)
│   │
│   ├── AboutModal
│   ├── WalkInDealsModal
│   ├── ReviewModal
│   ├── FilterModal (NEW)
│   └── SortModal (NEW)
```

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   User Actions                       │
└─────────────────────────────────────────────────────┘
           │           │           │
           ▼           ▼           ▼
      [Search]    [Filter]    [Sort]
           │           │           │
           ▼           ▼           ▼
┌─────────────────────────────────────────────────────┐
│                  State Updates                       │
│  searchQuery   filters    sortOption                │
└─────────────────────────────────────────────────────┘
           │
           ▼ (debounced 500ms)
┌─────────────────────────────────────────────────────┐
│            debouncedSearchQuery                      │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│               useEffect triggers                     │
│     (any of: search, filters, sort changes)         │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              Build Query Params                      │
│  page, limit, sort, order, search, category,        │
│  minPrice, maxPrice, tags                           │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│        productsApi.getProductsByStore()              │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              Update Products State                   │
│  products, hasProducts, productsLoading,            │
│  productsError, availableCategories                 │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│                Re-render UI                          │
│  Updated product grid, count, states                │
└─────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌──────────────────────────────────────────────────┐
│              Component State                      │
├──────────────────────────────────────────────────┤
│                                                   │
│  Search State:                                    │
│    - searchQuery: string                          │
│    - debouncedSearchQuery: string (500ms delay)   │
│                                                   │
│  Filter State:                                    │
│    - filters: FilterState                         │
│      ├── priceRange: { min, max }                │
│      ├── rating: number | null                    │
│      ├── categories: string[]                     │
│      ├── inStock: boolean                         │
│      └── cashbackMin: number                      │
│                                                   │
│  Sort State:                                      │
│    - sortOption: SortOption                       │
│                                                   │
│  Modal State:                                     │
│    - showFilterModal: boolean                     │
│    - showSortModal: boolean                       │
│                                                   │
│  Product State:                                   │
│    - products: ProductItem[]                      │
│    - productsLoading: boolean                     │
│    - productsError: string | null                 │
│    - hasProducts: boolean                         │
│    - availableCategories: Category[]              │
│                                                   │
│  Computed State (useMemo):                        │
│    - activeFilterCount: number                    │
│    - hasActiveFilters: boolean                    │
│                                                   │
└──────────────────────────────────────────────────┘
```

## Filter Modal Structure

```
FilterModal
├── Modal Container
│   ├── Header
│   │   ├── Title: "Filters"
│   │   └── Close Button
│   │
│   ├── ScrollView Content
│   │   ├── Price Range Section
│   │   │   ├── Section Title
│   │   │   ├── Price Display (min - max)
│   │   │   ├── Min Price Slider
│   │   │   └── Max Price Slider
│   │   │
│   │   ├── Rating Section
│   │   │   ├── Section Title
│   │   │   └── Rating Options
│   │   │       ├── 4+ Stars
│   │   │       ├── 3+ Stars
│   │   │       ├── 2+ Stars
│   │   │       ├── 1+ Stars
│   │   │       └── Any
│   │   │
│   │   ├── Categories Section
│   │   │   ├── Section Title
│   │   │   └── Category Grid
│   │   │       ├── Electronics
│   │   │       ├── Fashion
│   │   │       ├── Food & Dining
│   │   │       ├── Groceries
│   │   │       ├── Beauty
│   │   │       └── Services
│   │   │
│   │   ├── Cashback Section
│   │   │   ├── Section Title
│   │   │   ├── Cashback Value Display
│   │   │   └── Cashback Slider (0-20%)
│   │   │
│   │   └── Stock Section
│   │       ├── Label: "Show in-stock items only"
│   │       └── Toggle Switch
│   │
│   └── Footer
│       ├── Reset Button
│       └── Apply Filters Button
```

## Sort Modal Structure

```
SortModal
└── Modal Container
    ├── Header
    │   ├── Title: "Sort By"
    │   └── Close Button
    │
    └── Options List
        ├── Most Relevant
        │   ├── Icon: star-outline
        │   ├── Label
        │   ├── Description
        │   └── Checkmark (if selected)
        │
        ├── Price: Low to High
        │   ├── Icon: trending-up-outline
        │   └── ...
        │
        ├── Price: High to Low
        │   ├── Icon: trending-down-outline
        │   └── ...
        │
        ├── Highest Rated
        │   ├── Icon: star
        │   └── ...
        │
        ├── Newest First
        │   ├── Icon: time-outline
        │   └── ...
        │
        ├── Most Popular
        │   ├── Icon: flame-outline
        │   └── ...
        │
        └── Highest Cashback
            ├── Icon: cash-outline
            └── ...
```

## Interaction Flows

### Flow 1: Search for Products
```
User types "shirt" in search bar
  ↓
searchQuery state updates to "shirt"
  ↓
500ms debounce timer starts
  ↓
Timer completes
  ↓
debouncedSearchQuery updates to "shirt"
  ↓
useEffect detects change
  ↓
API call with search="shirt"
  ↓
Products update in grid
  ↓
Search chip appears: [Search: "shirt" ×]
```

### Flow 2: Apply Multiple Filters
```
User taps "Filters" button
  ↓
FilterModal opens
  ↓
User selects:
  - Category: Electronics
  - Rating: 4+ Stars
  - Price: ₹1000 - ₹5000
  ↓
User taps "Apply Filters"
  ↓
filters state updates
  ↓
Modal closes
  ↓
useEffect detects filter change
  ↓
API call with category, rating, price params
  ↓
Products update
  ↓
Filter chips appear:
  [Electronics ×] [4+ Stars ×] [₹1000-₹5000 ×]
  ↓
Filter button shows: "Filters (3)"
```

### Flow 3: Change Sort Order
```
User taps sort button showing "Newest First"
  ↓
SortModal opens
  ↓
User selects "Price: Low to High"
  ↓
sortOption state updates
  ↓
Modal closes
  ↓
useEffect detects sort change
  ↓
API call with sort=price, order=asc
  ↓
Products re-order
  ↓
Sort button shows: "Price: Low to High"
```

### Flow 4: Remove Single Filter
```
User taps × on "4+ Stars" chip
  ↓
handleRemoveFilter('rating') called
  ↓
filters.rating set to null
  ↓
useEffect detects filter change
  ↓
API call without rating filter
  ↓
Products update
  ↓
Rating chip disappears
  ↓
Filter count badge updates
```

### Flow 5: Clear All Filters
```
User taps "Clear All" button
  ↓
handleClearAllFilters() called
  ↓
All filters reset to defaults
  ↓
searchQuery cleared
  ↓
useEffect detects changes
  ↓
API call with no filters/search
  ↓
All products shown
  ↓
All chips disappear
  ↓
Filter badge shows no count
```

## Performance Considerations

### Debouncing Strategy
```
User types: s → h → i → r → t
  ↓
State updates: "s" "sh" "shi" "shir" "shirt"
  ↓
Timers: T1 → T2 → T3 → T4 → T5
  ↓
T1-T4 cancelled, only T5 completes
  ↓
Single API call after 500ms: search="shirt"
  ↓
Result: 5 keystrokes → 1 API call (80% reduction)
```

### Memoization Strategy
```
activeFilterCount = useMemo(() => {
  // Recalculates only when filters change
}, [filters]);

productData = useMemo(() => {
  // Recalculates only when dependencies change
}, [initialProduct, productId, isDynamic, storeData]);

styles = useMemo(() => {
  // Recalculates only when dimensions change
}, [HORIZONTAL_PADDING, screenData]);
```

## Styling Theme

### Color Palette
```
Primary Purple: #7C3AED
Light Purple: #EDE9FE
Border Purple: #C4B5FD

White: #FFFFFF
Light Gray: #F8FAFC
Gray Border: #E5E7EB
Dark Gray: #1F2937
Medium Gray: #6B7280
Icon Gray: #9CA3AF

Red Accent: #DC2626
Red Light: #FEE2E2
Red Border: #FCA5A5

Success Green: #10B981
```

### Border Radius
```
Small: 10px (control buttons)
Medium: 12px (search bar)
Large: 18px (section cards)
XLarge: 20px (filter chips)
XXLarge: 24px (header gradient)
```

### Shadows
```
Light: shadowOpacity: 0.05, shadowRadius: 4
Medium: shadowOpacity: 0.08, shadowRadius: 8
Heavy: shadowOpacity: 0.15, shadowRadius: 20
```

## Responsive Behavior

### Small Screens (< 375px)
- Horizontal padding: 12px
- Smaller font sizes
- Compact button spacing

### Medium Screens (375px - 768px)
- Horizontal padding: 16px
- Standard font sizes
- Normal button spacing

### Large Screens (> 768px)
- Horizontal padding: 24px
- Larger tap targets
- More whitespace

## Accessibility Features

### Screen Reader Support
- All interactive elements have accessibility labels
- Filter counts announced
- Sort options announced
- Active filters announced

### Keyboard Navigation
- Tab order follows visual order
- Enter key submits search
- Escape closes modals

### Visual Feedback
- Clear focus states
- Active state indicators
- Loading indicators
- Error messages

## Browser/Platform Support

### iOS
- StatusBar integration
- Safe area handling
- Native scrolling

### Android
- StatusBar height adjustment
- Elevation shadows
- Material design compliance

### Web
- Responsive layout
- Mouse hover states
- Keyboard shortcuts
