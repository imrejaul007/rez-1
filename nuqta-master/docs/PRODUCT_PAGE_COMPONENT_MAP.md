# Product Page Component Integration Map

## Visual Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCT PAGE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Header]                                                   │
│    ← Back | Product Details | 🪙 Coins | ♥ ⚙ 🛒           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Product Image Gallery]                                    │
│    • Images & Videos carousel                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Product Info]                                             │
│    • Brand & Rating                                         │
│    • Product Name                                           │
│    • Price & Discount                                       │
│    • Stock Badge                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Cashback & Rewards Card]                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Product Variant Selector] (if variants exist)             │
│    • Size Guide Button                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Frequently Bought Together]                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Delivery Information]                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┬─────────────┐                             │
│  │   DETAILS   │   REVIEWS   │  ← Tabs                     │
│  └─────────────┴─────────────┘                             │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  DETAILS TAB CONTENT                              │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  • Description                                    │     │
│  │  • Specifications                                 │     │
│  │  • Return Policy Card                             │     │
│  │  • Seller Information                             │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  REVIEWS TAB CONTENT                              │     │
│  ├───────────────────────────────────────────────────┤     │
│  │                                                   │     │
│  │  [Product Reviews Section]                        │     │
│  │    • Rating summary                               │     │
│  │    • User reviews                                 │     │
│  │    • Filters & sorting                            │     │
│  │                                                   │     │
│  ├───────────────────────────────────────────────────┤     │
│  │                                                   │     │
│  │  🆕 [EXPERT REVIEWS]                              │     │
│  │    • Professional evaluations                     │     │
│  │    • Verified expert badges                       │     │
│  │    • Pros & Cons sections                         │     │
│  │    • Expert verdict                               │     │
│  │    • Review images                                │     │
│  │                                                   │     │
│  ├───────────────────────────────────────────────────┤     │
│  │                                                   │     │
│  │  🆕 [CUSTOMER PHOTOS]                             │     │
│  │    • User-uploaded product photos                 │     │
│  │    • Upload button                                │     │
│  │    • Verified purchase badges                     │     │
│  │    • Full-screen photo viewer                     │     │
│  │    • Helpful votes                                │     │
│  │                                                   │     │
│  ├───────────────────────────────────────────────────┤     │
│  │                                                   │     │
│  │  🆕 [Q&A SECTION]                                 │     │
│  │    • Ask questions                                │     │
│  │    • Answer questions                             │     │
│  │    • Seller answers (badged)                      │     │
│  │    • Verified purchase answers                    │     │
│  │    • Helpful voting                               │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🆕 [PRODUCT COMPARISON]                                    │
│  (Conditional: only shows when comparison products exist)   │
│    • Side-by-side comparison                               │
│    • Specs & features table                                │
│    • Price comparison                                      │
│    • Quick actions                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Related Products Section]                                 │
│    • Similar products carousel                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Bottom Action Bar]                                        │
│    Qty: [-] 1 [+]  | [Add to Cart] [Buy Now]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Integration Details

### 1️⃣ ExpertReviews
**Location:** Reviews Tab → After ProductReviewsSection
**Line:** ~805-814
**Visibility:** Always visible (shows empty state if no reviews)

```typescript
<ExpertReviews
  productId={product.id}
  reviews={[]} // Backend integration pending
  onMarkHelpful={(reviewId) => {
    console.log('Mark expert review helpful:', reviewId);
  }}
/>
```

---

### 2️⃣ CustomerPhotos
**Location:** Reviews Tab → After ExpertReviews
**Line:** ~817-831
**Visibility:** Always visible (shows empty state if no photos)

```typescript
<CustomerPhotos
  productId={product.id}
  photos={[]} // Backend integration pending
  onUploadPhoto={async (photo) => {
    console.log('Uploading photo:', photo);
  }}
  onMarkHelpful={(photoId) => {
    console.log('Mark photo helpful:', photoId);
  }}
  enableUpload={true}
/>
```

---

### 3️⃣ QASection
**Location:** Reviews Tab → After CustomerPhotos
**Line:** ~834-851
**Visibility:** Always visible (shows empty state if no questions)

```typescript
<QASection
  productId={product.id}
  questions={[]} // Backend integration pending
  onAskQuestion={async (question) => {
    console.log('Asking question:', question);
  }}
  onAnswerQuestion={async (questionId, answer) => {
    console.log('Answering question:', questionId, answer);
  }}
  onMarkHelpful={(questionId, answerId) => {
    console.log('Mark helpful:', questionId, answerId);
  }}
/>
```

---

### 4️⃣ ProductComparison
**Location:** Main Content → Before RelatedProductsSection
**Line:** ~856-902
**Visibility:** Conditional (only when `comparisonProducts.length > 0`)

```typescript
{comparisonProducts.length > 0 && (
  <ProductComparison
    products={[
      // Current product mapped to comparison format
      {
        id: product.id,
        name: product.name,
        price: product.price,
        // ... other fields
      },
      ...comparisonProducts // Additional comparison products
    ]}
    onRemoveProduct={(productId) => {
      // Remove from comparison
    }}
    onAddToCart={(productId) => {
      // Add to cart
    }}
    onViewProduct={(productId) => {
      // Navigate to product
    }}
  />
)}
```

---

## Component Flow Diagram

```
User Opens Product Page
        │
        ▼
Product Details Load
        │
        ├─► Views Details Tab
        │   ├─► Description
        │   ├─► Specifications
        │   ├─► Return Policy
        │   └─► Seller Info
        │
        └─► Switches to Reviews Tab
            ├─► User Reviews ───────────┐
            │                           │
            ├─► 🆕 Expert Reviews       │  All in
            │   • Professional opinions │  Reviews
            │   • Verified credentials  │  Tab
            │                           │  Section
            ├─► 🆕 Customer Photos      │
            │   • Upload photos         │
            │   • View gallery          │
            │                           │
            └─► 🆕 Q&A Section          │
                • Ask questions         │
                • Get answers       ────┘

Scrolls Down
        │
        ├─► 🆕 Product Comparison (if enabled)
        │   • Compare with similar products
        │   • Side-by-side specs
        │
        └─► Related Products
            • Discover alternatives
```

---

## Data Flow

```
┌──────────────────┐
│   ProductPage    │
└────────┬─────────┘
         │
         ├─── productId ──┐
         │                │
         ▼                ▼
┌─────────────────┐  ┌────────────────┐
│ Backend APIs    │  │  State Mgmt    │
│ (TODO)          │  │                │
├─────────────────┤  ├────────────────┤
│                 │  │                │
│ /expert-reviews │  │ reviews: []    │
│ /customer-photos│  │ photos: []     │
│ /questions      │  │ questions: []  │
│ /comparison     │  │ comparison: [] │
│                 │  │                │
└─────────────────┘  └────────────────┘
         │                │
         └────────┬───────┘
                  ▼
         ┌─────────────────┐
         │   Components    │
         ├─────────────────┤
         │ ExpertReviews   │
         │ CustomerPhotos  │
         │ QASection       │
         │ ProductComparison│
         └─────────────────┘
```

---

## User Journey

### Scenario 1: Reading Reviews
```
1. User opens product page
2. Clicks "Reviews" tab
3. Scrolls through user reviews
4. 🆕 Sees expert review from industry professional
5. Reads pros/cons analysis
6. 🆕 Views customer photos of product in use
7. 🆕 Reads Q&A about product features
8. Makes informed purchase decision
```

### Scenario 2: Asking Questions
```
1. User opens product page
2. Has question about compatibility
3. Clicks "Reviews" tab
4. Scrolls to Q&A section
5. 🆕 Clicks "Ask a Question"
6. 🆕 Types question and submits
7. Gets answer from seller or community
```

### Scenario 3: Comparing Products
```
1. User browses similar products
2. Adds products to comparison list
3. Returns to product page
4. 🆕 Sees comparison section appear
5. 🆕 Reviews specs side-by-side
6. Makes comparison-based decision
```

---

## Mobile Responsiveness

All integrated components are mobile-optimized:

- ✅ ExpertReviews: Collapsible content, touch-friendly buttons
- ✅ CustomerPhotos: Horizontal scroll, modal fullscreen view
- ✅ QASection: Mobile-friendly input modals
- ✅ ProductComparison: Horizontal scroll for comparison table

---

## Performance Impact

| Component | Initial Render | With Data | Scrolling |
|-----------|---------------|-----------|-----------|
| ExpertReviews | Lightweight empty state | Medium (images, text) | Smooth |
| CustomerPhotos | Lightweight empty state | Medium (images) | Smooth |
| QASection | Lightweight empty state | Light (text only) | Smooth |
| ProductComparison | Not rendered | Heavy (conditional) | Smooth (horizontal scroll) |

---

*Last Updated: December 1, 2025*
