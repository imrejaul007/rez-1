# FrequentlyBoughtTogether - Visual Flow Diagram

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                FrequentlyBoughtTogether                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Header                                             │    │
│  │  - Gift icon + "Frequently Bought Together"         │    │
│  │  - "Save X%" badge (if applicable)                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Subtitle                                           │    │
│  │  "Customers who bought this item also purchased"    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Horizontal Scroll Products                         │    │
│  │                                                      │    │
│  │  [Current Product] + [Bundle 1] + [Bundle 2] + ...  │    │
│  │       (selected)      (optional)   (optional)        │    │
│  │                                                      │    │
│  │  Each with:                                          │    │
│  │  - Checkbox (top-left)                              │    │
│  │  - Product image                                     │    │
│  │  - Brand name                                        │    │
│  │  - Product name                                      │    │
│  │  - Rating (if available)                             │    │
│  │  - Price (with bundle discount)                      │    │
│  │  - Stock badge (if low/out)                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Price Summary Card                                 │    │
│  │                                                      │    │
│  │  "X items selected"              ₹9,999            │    │
│  │                                  ₹7,999            │    │
│  │                                                      │    │
│  │  💰 You save ₹2,000 (20% off)                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [🛒 Add All to Cart] Button                       │    │
│  │  (Purple gradient)                                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                          │
└─────────────────────────────────────────────────────────────┘

1. Component Loads
   │
   ├─► API Call: /products/{id}/frequently-bought
   │   │
   │   ├─► Success? → Display products
   │   │
   │   └─► Failed/Empty? → Use mock data
   │
   ↓

2. User Sees Bundle
   │
   ├─► Current product: PRE-SELECTED (cannot deselect)
   │
   ├─► Bundle products: UNSELECTED (can select)
   │
   └─► Price: Shows current product price only
   │
   ↓

3. User Selects Products
   │
   ├─► Click checkbox on bundle product
   │   │
   │   ├─► Product becomes SELECTED (purple border)
   │   │
   │   └─► Price updates (includes bundle discount)
   │
   ├─► Can select/deselect multiple products
   │
   └─► Price recalculates in real-time
   │
   ↓

4. User Clicks "Add All to Cart"
   │
   ├─► Check if products need variants
   │   │
   │   ├─► YES → Open variant modal
   │   │   │
   │   │   ├─► User selects size/color
   │   │   │
   │   │   ├─► Click "Add to Cart"
   │   │   │
   │   │   └─► Continue with remaining products
   │   │
   │   └─► NO → Add all products directly
   │
   ├─► Add each product to cart (CartContext)
   │   │
   │   ├─► Success → Count successful adds
   │   │
   │   └─► Failed → Count failed adds, log error
   │
   ├─► Show toast notification
   │   │
   │   ├─► Success: "X items added to cart!"
   │   │
   │   └─► Error: "Failed to add Y items"
   │
   └─► Call onBundleAdded() callback (if provided)
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        DATA FLOW                              │
└──────────────────────────────────────────────────────────────┘

Frontend Component
      │
      │ 1. Load bundle products
      ↓
┌─────────────────┐
│ productsApi.ts  │
│ getFrequently   │
│ BoughtTogether  │
└─────────────────┘
      │
      │ 2. API Request
      ↓
┌─────────────────┐         ┌──────────────────┐
│  Backend API    │────────→│  Database        │
│  /products/     │         │  - Products      │
│  {id}/          │←────────│  - Correlations  │
│  frequently-    │         │  - Bundle rules  │
│  bought         │         └──────────────────┘
└─────────────────┘
      │
      │ 3. Response (or error)
      ↓
┌─────────────────┐
│ Component       │
│ - Success?      │
│   → Map to      │         ┌──────────────────┐
│     BundleProduct│        │  Mock Data       │
│ - Failed?       │────────→│  bundleData.ts   │
│   → Use mock    │         │  - 10 bundles    │
└─────────────────┘         └──────────────────┘
      │
      │ 4. Display products
      ↓
┌─────────────────┐
│ User Interface  │
│ - Current       │
│   product       │
│ - Bundle        │
│   products      │
│ - Pricing       │
└─────────────────┘
      │
      │ 5. User selects products
      ↓
┌─────────────────┐
│ Local State     │
│ - selectedProducts: Set<string>
│ - Calculate bundle price
│ - Calculate savings
└─────────────────┘
      │
      │ 6. User adds to cart
      ↓
┌─────────────────┐         ┌──────────────────┐
│ CartContext     │────────→│  Backend API     │
│ - addItem()     │         │  POST /cart/add  │
│ - Optimistic    │←────────│  - Sync to DB    │
│   update        │         └──────────────────┘
└─────────────────┘
      │
      │ 7. Update UI
      ↓
┌─────────────────┐
│ Toast           │
│ Notification    │
│ - Success ✓     │
│ - Error ✗       │
└─────────────────┘
```

## Component State Machine

```
┌──────────────────────────────────────────────────────────────┐
│                     STATE MACHINE                             │
└──────────────────────────────────────────────────────────────┘

[INITIAL]
   │
   │ componentDidMount / useEffect
   ↓
[LOADING]
   │ - Show spinner
   │ - "Loading bundle products..."
   │
   │ API call completes
   ↓
[LOADED]
   │ - Display products
   │ - Current product selected
   │ - Calculate initial price
   │
   │ User clicks checkbox
   ↓
[SELECTING]
   │ - Toggle product in selectedProducts
   │ - Recalculate price
   │ - Update UI (border, background)
   │ - Back to LOADED
   │
   │ User clicks "Add All to Cart"
   ↓
[CHECKING_VARIANTS]
   │ - Check if any product needs variants
   │
   ├─► Has variants?
   │   │
   │   │ YES
   │   ↓
   │ [VARIANT_MODAL_OPEN]
   │   │ - Show ProductVariantModal
   │   │ - Wait for user selection
   │   │
   │   │ User confirms variant
   │   ↓
   │ [ADDING_TO_CART]
   │
   └─► NO
       │
       ↓
   [ADDING_TO_CART]
       │ - Show loading state
       │ - "Adding to Cart..."
       │ - addingToCart = true
       │
       │ Add products to cart
       ↓
   [CART_OPERATIONS]
       │ - Loop through selected products
       │ - cartActions.addItem() for each
       │ - Track success/failure count
       │
       │ All operations complete
       ↓
   [SHOWING_TOAST]
       │ - Success toast (if any succeeded)
       │ - Error toast (if any failed)
       │ - Call onBundleAdded()
       │
       ↓
   [LOADED]
       │ - Back to loaded state
       │ - Ready for next interaction

[ERROR]
   │ (Can happen at any state)
   │ - Show error toast
   │ - Log error
   │ - Fallback to mock data (if loading)
   │ - Maintain UI state (if adding to cart)
```

## Pricing Calculation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  PRICING CALCULATION                          │
└──────────────────────────────────────────────────────────────┘

calculateBundlePrice() {

  Initialize:
  ├─ total = 0
  ├─ originalTotal = 0
  └─ selectedProducts = Set<string>

  For CURRENT PRODUCT (if selected):
  ├─ Add to total: price.current
  └─ Add to originalTotal: price.original || price.current

  For each BUNDLE PRODUCT (if selected):
  ├─ Calculate discounted price:
  │  │
  │  └─ finalPrice = price.current * (1 - bundleDiscount / 100)
  │
  ├─ Add to total: finalPrice
  └─ Add to originalTotal: price.original || price.current

  Calculate Savings:
  ├─ savings = originalTotal - total
  └─ savingsPercent = (savings / originalTotal) * 100

  Return:
  {
    total: number,           // Final price user pays
    originalTotal: number,   // Price without bundle discount
    savings: number,         // Amount saved
    savingsPercent: number   // Percentage saved
  }
}

Example:

Current Product: ₹4,999 (original: ₹7,999)
Bundle Product 1: ₹899 (bundleDiscount: 15%)
  → Discounted: ₹899 * 0.85 = ₹764
Bundle Product 2: ₹599 (bundleDiscount: 12%)
  → Discounted: ₹599 * 0.88 = ₹527

Total:
├─ originalTotal = 7999 + 1499 + 999 = ₹10,497
├─ total = 4999 + 764 + 527 = ₹6,290
├─ savings = 10497 - 6290 = ₹4,207
└─ savingsPercent = (4207 / 10497) * 100 = 40%
```

## Cart Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  CART INTEGRATION                             │
└──────────────────────────────────────────────────────────────┘

User Clicks "Add All to Cart"
   │
   ├─ productsToAdd = []
   │
   ├─ Add current product (if selected)
   │  └─ productsToAdd.push(currentProduct)
   │
   ├─ Add bundle products (if selected)
   │  └─ bundleProducts.forEach(p => {
   │       if (selectedProducts.has(p.id)) {
   │         productsToAdd.push(p)
   │       }
   │     })
   │
   ├─ Check for variants
   │  │
   │  ├─ needsVariant = productsToAdd.find(p =>
   │  │     p.tags.includes('has-variants')
   │  │   )
   │  │
   │  ├─ If needsVariant exists:
   │  │  │
   │  │  ├─ Open ProductVariantModal
   │  │  ├─ User selects variant
   │  │  ├─ Add variant product first
   │  │  └─ Continue with remaining products
   │  │
   │  └─ Else: Add all products directly
   │
   └─ For each product in productsToAdd:
      │
      ├─ Call: cartActions.addItem({
      │    id: product.id,
      │    name: product.name,
      │    image: product.image,
      │    originalPrice: product.price.original,
      │    discountedPrice: product.price.current,
      │    discount: product.price.discount,
      │    variant: variant // if applicable
      │  })
      │
      ├─ CartContext handles:
      │  │
      │  ├─ Optimistic UI update (immediate)
      │  ├─ Save to AsyncStorage (local cache)
      │  └─ Sync to backend (if online)
      │
      ├─ Track result:
      │  │
      │  ├─ Success? → successCount++
      │  └─ Failed? → failCount++, log error
      │
      └─ After all products processed:
         │
         ├─ Show toast:
         │  │
         │  ├─ successCount > 0:
         │  │  └─ "X items added to cart!"
         │  │
         │  └─ failCount > 0:
         │     └─ "Failed to add Y items"
         │
         └─ Call onBundleAdded() callback
```

## Error Handling Decision Tree

```
┌──────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING                              │
└──────────────────────────────────────────────────────────────┘

Error Occurs
   │
   ├─ During API call?
   │  │
   │  ├─ YES → Log error
   │  │      → Use mock data
   │  │      → Show products anyway
   │  │      → User doesn't see error
   │  │
   │  └─ NO → Continue
   │
   ├─ During cart operation?
   │  │
   │  ├─ YES → Log error
   │  │      → Don't stop other products
   │  │      → Track failCount
   │  │      → Show error toast at end
   │  │      → Partial success is OK
   │  │
   │  └─ NO → Continue
   │
   ├─ Network error?
   │  │
   │  ├─ YES → Log error
   │  │      → Show error toast
   │  │      → Keep UI state
   │  │      → Don't crash component
   │  │
   │  └─ NO → Continue
   │
   └─ Unexpected error?
      │
      └─ YES → Log error
             → Show generic error toast
             → Maintain current state
             → Component stays functional
```

---

**Visual Flow Complete**
**Updated**: 2025-11-12
