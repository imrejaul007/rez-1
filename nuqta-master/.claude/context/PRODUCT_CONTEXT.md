# Product System - Complete Technical Context

**Created:** December 1, 2025
**Purpose:** Comprehensive reference for product-related code across rez-app

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [User Frontend Analysis](#2-user-frontend-analysis)
3. [Merchant App Analysis](#3-merchant-app-analysis)
4. [Backend Analysis](#4-backend-analysis)
5. [Data Models](#5-data-models)
6. [API Endpoints](#6-api-endpoints)
7. [Data Flow](#7-data-flow)
8. [Known Issues](#8-known-issues)
9. [File Reference](#9-file-reference)

---

## 1. Architecture Overview

### System Components
```
┌─────────────────────┐     ┌─────────────────────┐
│   User Frontend     │     │   Merchant App      │
│   (React Native)    │     │   (React Native)    │
│   Expo Router       │     │   Expo Router       │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │ GET /api/products         │ POST/PUT/DELETE /api/products
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│              User Backend (Node.js)              │
│              Express + MongoDB                   │
├──────────────────────────────────────────────────┤
│  Product Model      │  MerchantProduct Model     │
│  (User-facing)      │  (Merchant-side)           │
└──────────────────────────────────────────────────┘
           │
           │ Cloudinary (Image Storage)
           │ Redis (Caching)
           │ Socket.IO (Real-time sync)
           ▼
```

### Key Relationships
- **MerchantProduct** → Created by merchants, synced to **Product** model
- **Product** → User-facing catalog, linked to Store and Category
- **Category** → Hierarchical (parent/child), linked to Products
- **Store** → Owned by Merchant, contains Products
- **Variants** → Nested in Product.inventory.variants

---

## 2. User Frontend Analysis

### 2.1 ProductPage Component
**File:** `frontend/app/product/[id].tsx`
**Lines:** 1,360+

#### Features Implemented
- Full product detail display with images, price, ratings
- Variant selection with dynamic pricing
- Shopping cart integration with validation
- Wishlist functionality (add/remove)
- Stock availability checking
- Product reviews with filtering/sorting
- Add to cart and Buy Now flows
- Related/frequently bought together products
- Delivery info and return policy
- Analytics tracking (views, cart, wishlist, shares)
- Size guide modal
- Coin balance display

#### Code Quality Issues

**1. Unsafe Type Casting (32 instances)**
```typescript
// Lines: 357, 501, 734, 764, 768, 772, 940, 959
router.push(`/checkout?productId=${product?.id}&quantity=${quantity}` as any);
```

**2. Hardcoded Values**
```typescript
// Line 616: Cashback offer
value: 5, maxCashback: 200

// Line 941: Referral code
"WASIL123"

// Lines 962-987: Size chart data
const sizeChartData = { ... } // Hardcoded
```

**3. Incomplete Backend Integration**
```typescript
// Lines 440-456: Stock notification
await new Promise(resolve => setTimeout(resolve, 1500)); // Mocked!
// TODO: Integrate with backend API when available
```

**4. Console Logs (20+ statements)**
- Lines: 112-115, 140-141, 145-157, 161-165, 239, 322-323, 328-337, 397-418, 638-650, 703-704, 763-764, 767-768, 771-772

#### Missing Integrations
Components exist but NOT integrated in ProductPage:
- `ExpertReviews.tsx` (11.5 KB)
- `CustomerPhotos.tsx` (16.6 KB)
- `QASection.tsx` (18.7 KB)
- `ProductComparison.tsx` (14.9 KB)

---

### 2.2 Products API Service
**File:** `frontend/services/productsApi.ts`
**Lines:** 950+

#### Key Methods
```typescript
getProducts(filters)           // Paginated product list
getProductById(id)             // Single product
getFeaturedProducts()          // Featured products
searchProducts(query)          // Search
getRecommendations(productId)  // Related products
checkAvailability(productId)   // Stock check
trackProductView(productId)    // Analytics
```

#### Issues
**1. Dual Type System (Lines 14-73)**
```typescript
// Old interface
export interface Product { ... }
// New unified interface
export { UnifiedProduct }
// Causes migration chaos
```

**2. Mock Data Still Present (Lines 592-939)**
```typescript
getMockRelatedProducts() // 350+ lines of hardcoded mock data
```

**3. Random Score Generation (Line 390-395)**
```typescript
recommendationScore: Math.random() * 0.5 + 0.5 // Should come from backend
```

---

### 2.3 Product Hooks

| Hook | File | Status | Purpose |
|------|------|--------|---------|
| useProductVariants | `hooks/useProductVariants.ts` | ✅ Excellent | Variant selection logic |
| useProductAvailability | `hooks/useProductAvailability.ts` | ✅ Good | Stock checking |
| useRelatedProducts | `hooks/useRelatedProducts.ts` | ✅ Good | Related products |
| useProductReviews | `hooks/useProductReviews.ts` | ✅ Good | Review management |

---

### 2.4 Product Components

| Component | File | Size | Status |
|-----------|------|------|--------|
| ProductVariantSelector | `components/product/ProductVariantSelector.tsx` | 278 lines | ✅ Good |
| StockBadge | `components/product/StockBadge.tsx` | 155 lines | ✅ Good |
| AddToCartModal | `components/product/AddToCartModal.tsx` | ~200 lines | ✅ Good |
| ProductImageGallery | `components/product/ProductImageGallery.tsx` | ~300 lines | ✅ Good |
| FrequentlyBoughtTogether | `components/product/FrequentlyBoughtTogether.tsx` | ~200 lines | ⚠️ Incomplete |
| RelatedProductsSection | `components/product/RelatedProductsSection.tsx` | ~250 lines | ⚠️ Partial |
| ExpertReviews | `components/product/ExpertReviews.tsx` | 11.5 KB | ❌ Not integrated |
| CustomerPhotos | `components/product/CustomerPhotos.tsx` | 16.6 KB | ❌ Not integrated |
| QASection | `components/product/QASection.tsx` | 18.7 KB | ❌ Not integrated |
| ProductComparison | `components/product/ProductComparison.tsx` | 14.9 KB | ❌ Not integrated |

---

### 2.5 Product Types

**Main Types File:** `frontend/types/product-variants.types.ts`
```typescript
interface ProductVariant {
  variantId: string;
  type: string;      // 'size', 'color', etc.
  value: string;     // 'XL', 'Red', etc.
  attributes: Record<string, string>;
  price?: number;
  stock: number;
  sku?: string;
  images?: string[];
  isAvailable?: boolean;
}
```

**Homepage Types:** `frontend/types/homepage.types.ts`
```typescript
interface ProductItem {
  id: string;
  _id?: string;  // MongoDB ID
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: { value: number; count: number };
  image: string;
  images?: string[];
  store?: { id: string; name: string };
  category?: string;
  inventory?: { stock: number };
  availabilityStatus?: string;
}
```

---

## 3. Merchant App Analysis

### 3.1 Product Add Page
**File:** `admin-project/merchant-app/app/products/add.tsx`
**Lines:** 1,318

#### Form Structure
```typescript
const [formData, setFormData] = useState({
  // Basic Info
  name: '',
  description: '',
  shortDescription: '',
  sku: '',
  barcode: '',

  // Pricing
  price: '',
  costPrice: '',
  compareAtPrice: '',
  currency: 'INR',

  // Inventory
  stock: '',
  lowStockThreshold: '5',
  trackInventory: true,
  allowBackorders: false,

  // Physical
  weight: '',
  dimensions: { length: '', width: '', height: '', unit: 'cm' },

  // SEO
  metaTitle: '',
  metaDescription: '',
  searchKeywords: [],

  // Status
  status: 'draft',
  visibility: 'public',

  // Cashback
  cashbackPercentage: '5',
  cashbackMaxAmount: '',
  cashbackActive: true,
});
```

#### Critical Issues
**1. No Form State Persistence**
- All data lost on navigation
- No draft save
- No session restore

**2. No SKU Uniqueness Validation**
```typescript
// Lines 242-248: Auto-generated SKU not validated
// Potential for duplicates on concurrent submissions
```

**3. Complex Payload Construction (Lines 386-470)**
- 84 lines of transformation logic
- Should be extracted to helper

---

### 3.2 Products Service
**File:** `admin-project/merchant-app/services/api/products.ts`
**Lines:** 803

#### Key Methods
```typescript
getProducts(filters)              // List products
getProduct(id)                    // Single product
createProduct(data)               // Create new
updateProduct(id, data)           // Update existing
deleteProduct(id)                 // Delete
getProductVariants(productId)     // Get variants
createVariant(productId, data)    // Add variant
bulkImportProducts(file)          // Bulk import
exportProductsAdvanced(config)    // Export
```

#### Critical Issues
**1. Wrong Error Handling Pattern (Lines 144-146)**
```typescript
} catch (error: any) {
  // Uses error.response?.data?.message (axios pattern)
  // But this is FETCH API - doesn't have .response property!
  throw new Error(error.response?.data?.message || error.message);
}
```

**2. No Request Timeout**
```typescript
// Lines 125-131, 153-159, etc.
// No AbortController - requests can hang forever
```

**3. Token Fetch Bottleneck (Lines 794-800)**
```typescript
private async getAuthToken(): Promise<string> {
  const token = await storageService.getAuthToken();
  // Called for EVERY request - no caching
}
```

---

### 3.3 Variant Management

**TODO Comments Found:**
```typescript
// VariantForm.tsx Line 99
// TODO: Implement image picker

// variants/add/[productId].tsx Line 139
// TODO: Upload to server

// variants/edit/[variantId].tsx Line 148
// TODO: Upload to server
```

---

## 4. Backend Analysis

### 4.1 Product Routes (Merchant)
**File:** `user-backend/src/merchantroutes/products.ts`
**Lines:** 1,877

#### Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/products | List merchant products |
| POST | /api/products | Create product |
| GET | /api/products/categories | Get categories |
| GET | /api/products/:id | Get single product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/:id/variants | Get variants |
| POST | /api/products/:id/variants | Add variant |
| GET | /api/products/:id/reviews | Get reviews |
| POST | /api/products/bulk-action | Bulk operations |

#### Security Issues
**1. Weak JWT Fallback (Line 42)**
```typescript
jwt.verify(token, merchantSecret || 'fallback-merchant-secret')
// NEVER use fallback secrets in production!
```

**2. Missing Rate Limiting**
- No rate limiter on product CRUD
- Bulk operations vulnerable

**3. Missing CSRF Protection**
- All POST/PUT/DELETE routes exposed

---

### 4.2 Product Sync (Merchant → User)
**Location:** `merchantroutes/products.ts` Lines 1565-1850

#### Sync Functions
```typescript
createUserSideProduct(merchantProduct, merchantId)
updateUserSideProduct(merchantProduct, productId)
```

#### What Gets Synced
| Field | Synced | Notes |
|-------|--------|-------|
| name, description | ✅ Yes | Direct copy |
| pricing | ✅ Yes | Format converted |
| images, videos | ✅ Yes | URLs extracted |
| category | ✅ Yes | Found/created |
| store | ✅ Yes | Validated |
| **cashback** | ❌ No | Missing! |
| **deliveryInfo** | ❌ No | Missing! |
| **relatedProducts** | ❌ No | Missing! |
| **frequentlyBoughtWith** | ❌ No | Missing! |

#### Sync Process
```
1. Find/Create Category
2. Find Store (validate merchant ownership)
3. Transform pricing format
4. Extract image/video URLs
5. Generate unique slug
6. Save to Product collection
7. Emit Socket.IO event (product_synced)
```

---

## 5. Data Models

### 5.1 Product Model (User-Facing)
**File:** `user-backend/src/models/Product.ts`

```typescript
{
  // Identity
  name: String (required, max 200),
  slug: String (unique, required),
  sku: String (unique),
  barcode: String,

  // Relations
  category: ObjectId (ref: Category),
  subCategory: ObjectId (ref: Category),
  store: ObjectId (ref: Store),
  merchantId: ObjectId (ref: Merchant),

  // Pricing
  pricing: {
    original: Number,
    selling: Number,
    discount: Number,
    currency: 'INR' | 'USD' | 'EUR',
    bulk: [{ minQuantity, price }]
  },

  // Inventory
  inventory: {
    stock: Number,
    isAvailable: Boolean,
    lowStockThreshold: Number (default: 5),
    unlimited: Boolean,
    allowBackorder: Boolean,
    variants: [{
      variantId, type, value, attributes,
      price, stock, sku, images, isAvailable
    }]
  },

  // Media
  images: [String],
  videos: [String],

  // Ratings
  ratings: {
    average: Number (0-5),
    count: Number,
    distribution: { 5, 4, 3, 2, 1 }
  },

  // Analytics
  analytics: {
    views, purchases, conversions,
    wishlistAdds, shareCount, returnRate,
    todayPurchases, todayViews, lastResetDate
  },

  // Cashback
  cashback: {
    percentage: Number (0-100),
    maxAmount: Number,
    minPurchase: Number,
    validUntil: Date,
    terms: String
  },

  // Delivery
  deliveryInfo: {
    estimatedDays: Number,
    freeShippingThreshold: Number,
    expressAvailable: Boolean,
    standardDeliveryTime: String,
    expressDeliveryTime: String
  },

  // Related
  bundleProducts: [ObjectId],
  frequentlyBoughtWith: [{ product, purchaseCount }],
  relatedProducts: [ObjectId],

  // Status
  isActive: Boolean,
  isFeatured: Boolean,
  isDigital: Boolean
}
```

### 5.2 MerchantProduct Model
**File:** `user-backend/src/models/MerchantProduct.ts`

```typescript
{
  // Different structure from Product
  price: Number,           // vs pricing.selling
  costPrice: Number,       // vs pricing.cost
  compareAtPrice: Number,  // vs pricing.original

  status: 'active' | 'inactive' | 'draft' | 'archived',
  visibility: 'public' | 'hidden' | 'featured',

  // Images as objects
  images: [{
    url: String,
    thumbnailUrl: String,
    altText: String,
    sortOrder: Number,
    isMain: Boolean
  }],

  // Variants simpler structure
  variants: [{
    option: String,
    value: String
  }]
}
```

---

## 6. API Endpoints

### 6.1 User API (Read-Only)
```
GET  /api/products              - List products (with filters)
GET  /api/products/:id          - Get product details
GET  /api/products/featured     - Featured products
GET  /api/products/search       - Search products
GET  /api/products/:id/reviews  - Product reviews
POST /api/products/:id/view     - Track view
```

### 6.2 Merchant API (Full CRUD)
```
GET    /api/products              - List merchant's products
POST   /api/products              - Create product
GET    /api/products/categories   - Get categories (parent only)
GET    /api/products/:id          - Get product
PUT    /api/products/:id          - Update product
DELETE /api/products/:id          - Delete product
GET    /api/products/:id/variants - Get variants
POST   /api/products/:id/variants - Add variant
POST   /api/products/bulk-action  - Bulk operations
```

---

## 7. Data Flow

### 7.1 Product Creation Flow
```
Merchant App                    Backend                         User App
     │                             │                                │
     │ POST /api/products          │                                │
     │ (with images)               │                                │
     │────────────────────────────>│                                │
     │                             │                                │
     │                     ┌───────┴───────┐                        │
     │                     │ Validate data │                        │
     │                     │ Upload images │                        │
     │                     │ to Cloudinary │                        │
     │                     └───────┬───────┘                        │
     │                             │                                │
     │                     ┌───────┴───────┐                        │
     │                     │    Save to    │                        │
     │                     │MerchantProduct│                        │
     │                     └───────┬───────┘                        │
     │                             │                                │
     │                     ┌───────┴───────┐                        │
     │                     │   SYNC TO     │                        │
     │                     │Product (user) │                        │
     │                     └───────┬───────┘                        │
     │                             │                                │
     │                     ┌───────┴───────┐                        │
     │                     │  Emit event   │                        │
     │                     │product_synced │─────────────────────────>
     │                     └───────┬───────┘                        │
     │                             │                                │
     │<────────────────────────────│                                │
     │   201 Created               │                                │
```

### 7.2 Product View Flow
```
User App                        Backend
    │                              │
    │ GET /api/products/:id        │
    │─────────────────────────────>│
    │                              │
    │                      ┌───────┴───────┐
    │                      │ Check Redis   │
    │                      │    cache      │
    │                      └───────┬───────┘
    │                              │
    │                      ┌───────┴───────┐
    │                      │If miss: fetch │
    │                      │from MongoDB   │
    │                      │+ cache result │
    │                      └───────┬───────┘
    │                              │
    │                      ┌───────┴───────┐
    │                      │Track analytics│
    │                      │(incrementViews)│
    │                      └───────┬───────┘
    │                              │
    │<─────────────────────────────│
    │   Product data               │
```

---

## 8. Known Issues

### 8.1 Critical (P1)
| Issue | Location | Impact |
|-------|----------|--------|
| 32 `as any` casts | `app/product/[id].tsx` | Type safety bypassed |
| Mock data in production | `services/productsApi.ts` | Bundle size, confusion |
| JWT fallback secret | `merchantauth.ts` | Security vulnerability |
| No rate limiting | Backend routes | DoS vulnerability |
| Cashback not synced | Sync function | Users can't see cashback |
| TODO: Image picker | VariantForm.tsx | Variants can't have images |

### 8.2 High (P2)
| Issue | Location | Impact |
|-------|----------|--------|
| No error boundaries | ProductPage | App crashes on error |
| Console logs in prod | Multiple files | Performance, security |
| No form persistence | add.tsx | Data loss on navigation |
| Fetch error handling | products.ts service | Silent failures |
| Missing components | ProductPage | Incomplete features |

### 8.3 Medium (P3)
| Issue | Location | Impact |
|-------|----------|--------|
| Dual type system | productsApi.ts | Maintenance nightmare |
| No request timeout | Merchant service | Hanging requests |
| No token caching | Merchant service | Performance |
| No variant UPDATE | Backend | Can't modify variants |
| No variant DELETE | Backend | Can't remove variants |

---

## 9. File Reference

### User Frontend
```
frontend/
├── app/
│   └── product/
│       └── [id].tsx                 # Main ProductPage (1360 lines)
├── components/
│   └── product/
│       ├── ProductVariantSelector.tsx
│       ├── StockBadge.tsx
│       ├── AddToCartModal.tsx
│       ├── ProductImageGallery.tsx
│       ├── FrequentlyBoughtTogether.tsx
│       ├── RelatedProductsSection.tsx
│       ├── ExpertReviews.tsx        # NOT INTEGRATED
│       ├── CustomerPhotos.tsx       # NOT INTEGRATED
│       ├── QASection.tsx            # NOT INTEGRATED
│       └── ProductComparison.tsx    # NOT INTEGRATED
├── services/
│   └── productsApi.ts               # Product API (950 lines)
├── hooks/
│   ├── useProductVariants.ts
│   ├── useProductAvailability.ts
│   ├── useRelatedProducts.ts
│   └── useProductReviews.ts
├── contexts/
│   ├── CartContext.tsx
│   └── WishlistContext.tsx
└── types/
    ├── product-variants.types.ts
    ├── homepage.types.ts
    └── cart.ts
```

### Merchant App
```
admin-project/merchant-app/
├── app/
│   └── products/
│       ├── add.tsx                  # Create product (1318 lines)
│       ├── [id].tsx                 # View product (1152 lines)
│       ├── edit/[id].tsx            # Edit product
│       ├── variants/
│       │   ├── add/[productId].tsx
│       │   └── edit/[variantId].tsx
│       ├── bulk-actions.tsx
│       ├── import.tsx
│       └── export.tsx
├── services/
│   └── api/
│       └── products.ts              # Products service (803 lines)
├── components/
│   └── products/
│       ├── ImageUploader.tsx
│       ├── VariantForm.tsx
│       └── VariantGenerator.tsx
└── types/
    ├── products.ts
    └── variants.ts
```

### Backend
```
user-backend/src/
├── models/
│   ├── Product.ts                   # User product model (943 lines)
│   ├── MerchantProduct.ts           # Merchant product model (648 lines)
│   └── Category.ts                  # Category model (316 lines)
├── routes/
│   └── userProductRoutes.ts         # User product routes (186 lines)
├── merchantroutes/
│   └── products.ts                  # Merchant routes (1877 lines)
├── controllers/
│   ├── productController.ts         # User product controller (1291 lines)
│   └── userProductController.ts     # User product features
├── middleware/
│   ├── upload.ts                    # File upload config (128 lines)
│   ├── uploadSecurity.ts            # Upload security (296 lines)
│   └── merchantauth.ts              # Merchant auth (150+ lines)
└── services/
    └── CloudinaryService.ts         # Cloud storage (200+ lines)
```

---

## Quick Reference Commands

### Find all product files
```bash
# Frontend
find frontend/app frontend/components frontend/services frontend/hooks -name "*product*" -o -name "*Product*"

# Backend
find user-backend/src -name "*product*" -o -name "*Product*"
```

### Check for console.logs
```bash
grep -rn "console.log" frontend/app/product/[id].tsx
grep -rn "console.log" frontend/services/productsApi.ts
```

### Find TODO comments
```bash
grep -rn "TODO" admin-project/merchant-app/
```

---

---

## 10. Session Fixes (December 1, 2025)

### 10.1 Products Not Showing in Merchant App

**Problem:** Products displayed "No products yet" despite 413 products in database.

**Root Cause:** Soft delete middleware in `Product.ts` and `MerchantProduct.ts` used `{ isDeleted: false }` which doesn't match products where `isDeleted` is `undefined`.

**Files Fixed:**
- `user-backend/src/models/Product.ts`
- `user-backend/src/models/MerchantProduct.ts`

**Fix:**
```typescript
// Before (didn't match products where isDeleted was undefined)
ProductSchema.pre(/^find/, function(this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
  next();
});

// After (matches products where isDeleted is false, null, or undefined)
ProductSchema.pre(/^find/, function(this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});
```

---

### 10.2 "New Arrivals" Section Missing from Homepage

**Problem:** The "New Arrivals" product section was missing from the user frontend homepage.

**Root Cause:** The `normalizePrice` function in `frontend/utils/responseValidators.ts` didn't recognize the backend's price format. Backend returns:
```json
"pricing": {
  "selling": 299999,
  "original": 499999,
  "currency": "INR",
  "discount": 40
}
```

But frontend only looked for `salePrice` and `basePrice`, causing all products to fail validation.

**File Fixed:** `frontend/utils/responseValidators.ts`

**Fix:**
```typescript
// Before (didn't handle 'selling' and 'original')
function normalizePrice(data: any): ProductItem['price'] | null {
  try {
    if (data.pricing) {
      const current = data.pricing.salePrice || data.pricing.basePrice;
      const original = data.pricing.salePrice ? data.pricing.basePrice : undefined;
      // ...
    }
  }
}

// After (handles 'selling', 'salePrice', and 'basePrice')
function normalizePrice(data: any): ProductItem['price'] | null {
  try {
    if (data.pricing) {
      const current = data.pricing.selling || data.pricing.salePrice || data.pricing.basePrice;
      const original = data.pricing.original || (data.pricing.salePrice ? data.pricing.basePrice : undefined);

      if (typeof current === 'number') {
        return {
          current,
          original,
          currency: data.pricing.currency || 'INR',
          discount: data.pricing.discount || (original ? Math.round(((original - current) / original) * 100) : undefined),
        };
      }
    }
    // ... rest of function
  }
}
```

---

### 10.3 TypeScript Errors Fixed

**Files Fixed:**
| File | Issue | Fix |
|------|-------|-----|
| `user-backend/src/middleware/csrf.ts` | Return type issues | Split `return res.status().json()` to `res.status().json(); return;` |
| `user-backend/src/merchantroutes/bulkImport.ts` | `error is of type 'unknown'` | Changed to `error instanceof Error ? error.message : 'Unknown error'` |
| `user-backend/src/merchantroutes/bulkImport.ts` | Missing `authenticateMerchant` | Changed to `authMiddleware` |
| `user-backend/src/merchantservices/bulkImportService.ts` | `error is of type 'unknown'` | Added proper error type checking |
| `user-backend/src/merchantservices/bulkImportService.ts` | `category._id` type issue | Added `(category._id as Types.ObjectId).toString()` |
| `user-backend/src/merchantroutes/products.ts` | `.lean()` return type | Added type assertion `as { name: string; sku: string } \| null` |

---

### 10.4 Database Status Verified

| Metric | Count |
|--------|-------|
| Total Products | 413 |
| Products with `isActive: true` | 407 |
| Products with `inventory.isAvailable: true` | 409 |
| Products matching new arrivals query | 130 |
| Products matching featured products query | 86 |
| Total Stores | 134 |

---

### 10.5 API Endpoints Verified

| Endpoint | Status | Response Format |
|----------|--------|-----------------|
| `GET /api/products/new-arrivals` | ✅ Working | `price: {current, original}` |
| `GET /api/products/featured` | ✅ Working | `price: {current, original}` |
| `GET /api/homepage?sections=newArrivals` | ✅ Working | `pricing: {selling, original}` |
| `GET /api/homepage/batch` | ❌ 404 | Endpoint doesn't exist |

---

### 10.6 Debugging Scripts Created

Located in `user-backend/scripts/`:
- `checkDB.js` - Check product counts and store linkage
- `checkLinkage.js` - Verify product-store-merchant relationships
- `checkProductFields.js` - Verify field values for homepage queries

---

## Last Updated
- **Date:** December 1, 2025
- **Analysis Version:** 1.1
- **Analyzed By:** Claude Code

---

## Related Documents
- `PRODUCT_IMPROVEMENT_PLAN.md` - Task tracker
- `CLAUDE.md` - Project configuration

---

## 11. Lock Price System Implementation (December 2, 2025)

### 11.1 Overview

The lock price system allows users to "lock" a product's price for 3 hours by paying a 5% lock fee. This prevents price increases during the lock period.

### 11.2 Business Logic

#### Lock Flow
1. User clicks "Lock Price" on a product (₹10,000)
2. Lock fee = 5% = ₹500
3. User pays ₹500 via Wallet or PayBill
4. Product goes to "Locked Items" tab in cart
5. When lock expires or user moves to cart, the ₹500 is applied as a discount
6. Final price = ₹10,000 - ₹500 = ₹9,500

#### Quantity Handling (Critical Fix)
When quantity increases, the lock fee discount should NOT scale:
- Qty 1: (₹10,000 × 1) - ₹500 = ₹9,500 ✅
- Qty 2: (₹10,000 × 2) - ₹500 = ₹19,500 ✅ (NOT ₹19,000)
- Qty 3: (₹10,000 × 3) - ₹500 = ₹29,500 ✅

The lock fee only applies to the originally locked quantity, not additional items.

---

### 11.3 Backend Changes

#### File: `user-backend/src/models/Cart.ts`

**1. Added `lockedQuantity` to ICartItem interface (line ~16)**
```typescript
export interface ICartItem {
  product?: Types.ObjectId;
  event?: Types.ObjectId;
  store: Types.ObjectId | null;
  quantity: number;
  variant?: { type: string; value: string; };
  price: number;
  originalPrice?: number;
  discount?: number;
  lockedQuantity?: number; // NEW: Number of items that have lock fee applied
  addedAt: Date;
  notes?: string;
  metadata?: any;
}
```

**2. Added `lockedQuantity` to Mongoose Schema (after `discount` field)**
```typescript
lockedQuantity: {
  type: Number,
  default: 0,
  min: 0
},
```

**3. Updated `moveLockedToCart` method**
```typescript
if (existingItemIndex > -1) {
  // Update existing item - add quantities and track locked quantity
  this.items[existingItemIndex].quantity += lockedItem.quantity;
  // Track how many items have the lock fee discount
  this.items[existingItemIndex].lockedQuantity = (this.items[existingItemIndex].lockedQuantity || 0) + lockedItem.quantity;
  // Apply the lock fee discount
  this.items[existingItemIndex].discount = (this.items[existingItemIndex].discount || 0) + lockedItem.lockFee;
  this.items[existingItemIndex].addedAt = new Date();
} else {
  // Add new item - keep original price and track lockedQuantity
  const cartItem: ICartItem = {
    product: (product as any)._id,
    store: (product as any).store?._id || null,
    quantity: lockedItem.quantity,
    variant: lockedItem.variant,
    price: lockedItem.lockedPrice, // Original price (₹10,000)
    originalPrice: lockedItem.lockedPrice,
    discount: lockedItem.lockFee, // Lock fee (₹500) - only applies to lockedQuantity
    lockedQuantity: lockedItem.quantity, // How many items have the lock fee discount
    addedAt: new Date(),
    notes: `Lock fee of ₹${lockedItem.lockFee} already paid for ${lockedItem.quantity} item(s)`
  };
  this.items.push(cartItem);
}
```

**4. Updated `calculateTotals` method**
```typescript
CartSchema.methods.calculateTotals = async function(): Promise<void> {
  let subtotal = 0;
  let savings = 0;
  let itemDiscounts = 0; // Total of lock fee discounts

  // Calculate subtotal and savings
  this.items.forEach((item: ICartItem) => {
    const lockedQty = item.lockedQuantity || 0;
    const regularQty = item.quantity - lockedQty;
    const lockFeeDiscount = item.discount || 0;

    // All items at original price, then subtract lock fee discount
    // This ensures: 2 items at ₹10,000 = ₹20,000, minus ₹500 lock fee = ₹19,500
    const itemTotal = (item.price * item.quantity) - lockFeeDiscount;
    subtotal += itemTotal;

    // Track lock fee discounts for display
    if (lockFeeDiscount > 0) {
      itemDiscounts += lockFeeDiscount;
      savings += lockFeeDiscount;
    }

    // Also track savings from original price differences (sale prices, etc.)
    if (item.originalPrice && item.originalPrice > item.price) {
      savings += (item.originalPrice - item.price) * item.quantity;
    }
  });

  // ... rest of calculation (tax, delivery, etc.)
};
```

---

### 11.4 Frontend Changes

#### File: `frontend/types/cart.ts`

Added fields to CartItem interface:
```typescript
export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  discount?: number; // NEW: Lock fee discount (only applies to lockedQuantity items)
  lockedQuantity?: number; // NEW: Number of items that have lock fee applied
  image: string | number;
  cashback: string;
  category: 'products' | 'service';
  quantity?: number;
  selected?: boolean;
  // ... other fields
}
```

#### File: `frontend/contexts/CartContext.tsx`

**1. Updated `calculateTotals` helper function**
```typescript
const calculateTotals = (items: CartItemWithQuantity[]) => {
  const selectedItems = items.filter(item => item.selected);
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => {
    const price = item.discountedPrice || item.originalPrice || 0;
    const discount = item.discount || 0; // Lock fee discount (only applies to lockedQuantity items)
    // Total = (price × quantity) - discount
    // This ensures: 2 items at ₹10,000 = ₹20,000, minus ₹500 lock fee = ₹19,500
    return sum + (price * item.quantity) - discount;
  }, 0);

  return { totalItems, totalPrice };
};
```

**2. Added `lockedQuantity` to cart item mapping**
```typescript
const cartItems: CartItemWithQuantity[] = mappedCart.items.map((item: any) => {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    image: item.image,
    originalPrice: item.originalPrice,
    discountedPrice: item.price,
    discount: item.discount, // Lock fee discount
    lockedQuantity: item.lockedQuantity, // How many items have lock fee applied
    quantity: item.quantity,
    selected: true,
    // ... other fields
  };
});
```

#### File: `frontend/utils/dataMappers.ts`

Updated `mapBackendCartItemToFrontend`:
```typescript
return {
  id: backendItem._id,
  productId: backendItem.product._id,
  name: backendItem.product.name,
  image: imageUrl,
  price: backendItem.price,
  originalPrice: backendItem.originalPrice || backendItem.price,
  discount: backendItem.discount || 0, // Lock fee discount
  lockedQuantity: (backendItem as any).lockedQuantity || 0, // How many items have lock fee applied
  quantity: backendItem.quantity,
  store: backendItem.store ? { /* ... */ } : null,
  variant: backendItem.variant,
  addedAt: backendItem.addedAt,
  notes: (backendItem as any).notes, // For lock fee notes
  // Calculated fields - subtract lock fee discount from subtotal
  subtotal: (backendItem.price * backendItem.quantity) - (backendItem.discount || 0),
  savings: backendItem.originalPrice
    ? (backendItem.originalPrice - backendItem.price) * backendItem.quantity
    : 0,
};
```

---

### 11.5 PayBill Balance Fix

#### Issue
PayBill balance was showing incorrectly after top-up. UI showed ₹500 but backend had ₹0.

#### File: `frontend/services/walletPayBillApi.ts`

**1. Updated `PaymentConfirmResponse` interface**
```typescript
export interface PaymentConfirmResponse {
  success: boolean;
  transaction: {
    id: string;
    transactionId: string;
    amount: number;
    bonusAmount?: number;
    discount?: number;
    totalAmount?: number;
    finalAmount?: number;
    status: 'completed' | 'failed' | 'pending';
    timestamp: string;
  };
  wallet: {
    previousBalance: number;
    creditedAmount: number;
    newBalance: number;
    currency: string;
  };
  paybillBalance?: number; // NEW: Backend returns this for PayBill top-ups
  autoCartAdded?: boolean;
  productId?: string;
  message?: string;
}
```

**2. Added logging to `confirmPayment` method for debugging**

#### File: `frontend/components/product/AddMoneyModal.tsx`

Updated `handlePaymentSuccess` to properly extract balance:
```typescript
const handlePaymentSuccess = async () => {
  const confirmResponse = await walletPayBillService.confirmPayment({
    paymentIntentId,
    timestamp: new Date().toISOString()
  });

  // Get the new balance - prioritize backend's paybillBalance
  let finalPaybillBalance: number;

  if (typeof confirmResponse.data.paybillBalance === 'number') {
    finalPaybillBalance = confirmResponse.data.paybillBalance;
  } else if (typeof confirmResponse.data.wallet?.newBalance === 'number') {
    finalPaybillBalance = confirmResponse.data.wallet.newBalance;
  } else {
    finalPaybillBalance = newBalance; // Fallback to calculated
  }

  onSuccess(finalPaybillBalance);
};
```

#### File: `frontend/components/product/LockPriceModal.tsx`

Updated `handleTopupSuccess` to fetch actual balance from server:
```typescript
const handleTopupSuccess = useCallback(async (newBalance: number) => {
  setShowTopupModal(false);

  // Always fetch the actual balance from the server to ensure accuracy
  try {
    const response = await paybillApi.getBalance();
    if (response.success && response.data) {
      const actualBalance = response.data.paybillBalance || 0;
      setPaybillBalanceState(actualBalance);

      if (actualBalance >= lockFee) {
        setSelectedPaymentMethod('paybill');
        setPendingAutoLock(true);
      } else {
        setError(`Top-up succeeded but balance is still less than lock fee.`);
      }
    }
  } catch (error) {
    // Fallback to passed balance
    setPaybillBalanceState(newBalance);
    if (newBalance >= lockFee) {
      setSelectedPaymentMethod('paybill');
      setPendingAutoLock(true);
    }
  }
}, [lockFee]);
```

---

### 11.6 Protection Against Double-Locking

#### Backend: `user-backend/src/controllers/cartController.ts`

Added checks in `lockItemWithPayment`:

```typescript
// Check if product is already locked (prevent double charging)
const existingCart = await Cart.getActiveCart(req.userId);
if (existingCart) {
  const alreadyLocked = existingCart.lockedItems.find((item: any) => {
    const itemProductId = item.product?._id?.toString() || item.product?.toString();
    return itemProductId === productId && variantMatch;
  });
  if (alreadyLocked) {
    return sendBadRequest(res, 'This product is already locked.');
  }
}

// Handle existing cart item - can't have same product in both cart and locked
if (existingCartItemIndex > -1) {
  const cartItem = cart.items[existingCartItemIndex];

  // Check if cart item was previously locked (has lock fee already applied)
  const hasLockFeeApplied = cartItem.notes?.includes('Lock fee');
  if (hasLockFeeApplied) {
    return sendBadRequest(res, 'This item already has a lock fee applied.');
  }
}
```

---

### 11.7 API Endpoints Used

#### Lock Price Flow
1. `GET /api/cart/lock-fee-options?productId=X&quantity=1` - Get lock fee options
2. `POST /api/cart/lock-with-payment` - Lock item with payment

#### PayBill Flow
1. `POST /api/wallet/paybill/create-payment-intent` - Create Stripe payment intent
2. `POST /api/wallet/paybill/confirm-payment` - Confirm payment and credit balance
3. `GET /api/wallet/paybill/balance` - Get current PayBill balance

---

### 11.8 Testing Checklist

- [ ] Lock a product with sufficient wallet balance
- [ ] Lock a product with insufficient balance → PayBill top-up modal opens
- [ ] After top-up, auto-lock proceeds
- [ ] Locked item shows in "Locked" tab
- [ ] Move locked item to cart → discount applied
- [ ] Increase quantity → total calculates correctly (lock fee doesn't scale)
- [ ] Can't lock same product twice (error shown)
- [ ] Can't lock product that's already in cart with lock fee

---

### 11.9 Key Files Modified for Lock System

#### Backend
- `user-backend/src/models/Cart.ts` - Cart model with lockedQuantity
- `user-backend/src/controllers/cartController.ts` - Lock logic with protections

#### Frontend
- `frontend/types/cart.ts` - CartItem interface
- `frontend/contexts/CartContext.tsx` - Total calculation
- `frontend/utils/dataMappers.ts` - Backend to frontend mapping
- `frontend/services/walletPayBillApi.ts` - PayBill API with proper types
- `frontend/components/product/LockPriceModal.tsx` - Lock modal with balance refresh
- `frontend/components/product/AddMoneyModal.tsx` - PayBill top-up modal

---

### 11.10 Known Behavior

1. **Lock Duration**: Fixed at 3 hours with 5% fee
2. **Payment Methods**: Wallet or PayBill
3. **Lock Fee**: Flat discount, doesn't scale with quantity
4. **Auto-Lock**: After successful PayBill top-up, lock proceeds automatically
5. **Balance Verification**: After top-up, actual balance is fetched from server before auto-lock

---

## 12. Earn from Instagram Feature (December 2, 2025)

### 12.1 Overview

The "Earn from Instagram" feature allows users to earn 5% cashback by sharing their purchases on Instagram. Users submit their Instagram post URL, which goes through validation and verification before cashback is credited within 48 hours.

### 12.2 User Journey (4 Steps)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Overview   │───►│  URL Input  │───►│  Uploading  │───►│  Success/   │
│   (Step 1)  │    │   (Step 2)  │    │   (Step 3)  │    │   Error     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### Entry Point
- **Component:** `InstagramCard` (gradient pink-to-purple button)
- **Location:** Product pages, store sections
- **Route:** Navigates to `/earn-from-social-media`
- **Can carry:** Product context (name, price, store)

#### Step-by-Step Flow

| Step | Screen | User Action |
|------|--------|-------------|
| **Overview** | Shows 5% cashback info + 48-hour crediting notice | Click "Upload" |
| **URL Input** | Paste Instagram post URL | Submit URL |
| **Uploading** | Progress indicator (0-100%) | Wait |
| **Success/Error** | Confirmation or retry option | Done/Retry |

---

### 12.3 Data Submitted

```typescript
{
  platform: 'instagram',
  postUrl: 'https://instagram.com/p/POST_ID',
  orderId?: string,  // Optional - links to purchase
  fraudMetadata: {
    deviceId: string,
    trustScore: number,
    riskScore: number,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    checksPassed: number,
    totalChecks: number,
    warnings: string[]
  }
}
```

---

### 12.4 Validation Pipeline (6 Steps)

```
URL Format ──► Security ──► Fraud ──► Instagram ──► Captcha ──► Submit
   Check        Check      Detection  Verification   (if needed)
```

| Validation | What It Checks |
|------------|----------------|
| **URL Format** | Must match `instagram.com/p/POST_ID` or `/reel/REEL_ID` |
| **Security** | Device fingerprint, blacklist, trust score |
| **Fraud Detection** | Duplicates, rate limits (3/day, 10/week, 30/month) |
| **Instagram Verify** | Post exists, is public, has brand mention/hashtags |

#### URL Validation Regex
```typescript
/^https?:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|instagramreel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/
```

---

### 12.5 Reward Calculation

```
Cashback = Product Price × 5%

Example:
  Product: ₹10,000
  Cashback: ₹500 (credited within 48 hours)
```

#### Status Flow
```
Pending ──► Approved ──► Credited
              │
              └──► Rejected (with reason)
```

#### SocialPost Interface
```typescript
interface SocialPost {
  _id: string;
  user: string;
  order?: string;
  platform: 'instagram';
  postUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  cashbackAmount: number;
  cashbackPercentage: number; // Always 5
  submittedAt: Date;
  reviewedAt?: Date;
  creditedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  metadata: {
    postId?: string;
    thumbnailUrl?: string;
    orderNumber?: string;
    extractedData?: any;
  }
}
```

---

### 12.6 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/social-media/submit` | POST | Submit Instagram post |
| `/social-media/earnings` | GET | Get total/pending earnings |
| `/social-media/posts` | GET | Get submission history |
| `/social-media/posts/{postId}` | GET | Get single post details |
| `/social-media/posts/{postId}` | DELETE | Delete pending submissions |
| `/social-media/stats` | GET | Get platform-specific statistics |
| `/social-media/instagram/verify-post` | POST | Backend Instagram verification |
| `/social-media/instagram/verify-account` | POST | Verify Instagram account |
| `/security/verify-device` | POST | Device fingerprint verification |
| `/security/check-blacklist` | POST | Check if device is blacklisted |

---

### 12.7 Anti-Fraud Measures

#### Rate Limiting
| Limit | Value |
|-------|-------|
| Per Day | 3 submissions |
| Per Week | 10 submissions |
| Per Month | 30 submissions |
| Between Submissions | 1 hour minimum |
| After Rejection | 24-hour cooldown |

#### Risk Score Calculation
| Factor | Points Added |
|--------|--------------|
| Duplicate URL | +90 |
| Duplicate image | +85 |
| Rate limit violation | +40 |
| Suspicious velocity | +35 |
| Multiple devices | +30 |
| New account (< 30 days) | +25 |
| Low followers (< 100) | +20 |
| Previous rejections | +10 per rejection |

#### Risk Levels
| Level | Score Range |
|-------|-------------|
| Low | 0-30 |
| Medium | 31-60 |
| High | 61-80 |
| Critical | 81-100 |

---

### 12.8 Instagram Post Requirements

For approval, Instagram post must contain:

| Requirement | Details |
|-------------|---------|
| **Brand mention** | `@rezapp` or `#rezapp` |
| **Required hashtags** | `#cashback`, `#shopping` |
| **Optional hashtags** | `#deals`, `#savings`, `#onlineshopping` |
| **Caption length** | Minimum 20 characters |
| **Post age** | Maximum 30 days old |
| **Content match score** | Must be ≥ 60% |

---

### 12.9 Key Files

#### Frontend
| File | Purpose | Lines |
|------|---------|-------|
| `app/earn-from-social-media.tsx` | Main 4-step wizard page | 810 |
| `app/social-media.tsx` | Full dashboard with history | 1132 |
| `components/StoreSection/InstagramCard.tsx` | Entry button component | 165 |
| `services/socialMediaApi.ts` | API service layer | - |
| `services/fraudDetectionService.ts` | Fraud checking logic | - |
| `services/instagramVerificationService.ts` | Post verification | - |

#### Backend (Expected)
| File | Purpose |
|------|---------|
| `routes/socialMediaRoutes.ts` | API routes |
| `controllers/socialMediaController.ts` | Business logic |
| `models/SocialPost.ts` | Database model |
| `services/instagramService.ts` | Instagram Graph API integration |

---

### 12.10 Error Handling & Retry

#### Retry Strategy
- **Maximum Retries:** 3 attempts
- **Backoff Strategy:** Exponential (1s, 2s, 4s)
- **Retries On:** Network failures, 5xx server errors
- **Does NOT Retry:** 4xx client errors (validation failures)

#### Common Rejection Reasons
- Invalid URL format
- Post does not exist or has been deleted
- Post is private or inaccessible
- Insufficient brand mention in caption
- Missing required hashtags
- Duplicate submission
- Rate limit exceeded
- Device blacklisted
- Suspicious activity patterns
- Account too new (< 30 days)
- Low follower count (< 100)

---

### 12.11 Visual Flow Summary

```
User clicks "Earn from Instagram"
           │
           ▼
    ┌──────────────┐
    │   Overview   │  Shows 5% cashback offer
    │    Screen    │  "Share to get coins"
    └──────┬───────┘
           │ Click "Upload"
           ▼
    ┌──────────────┐
    │  URL Input   │  Paste: instagram.com/p/XXX
    │    Screen    │  Client-side validation
    └──────┬───────┘
           │ Click "Submit"
           ▼
    ┌──────────────┐
    │  Validation  │  Security → Fraud → Instagram
    │   Pipeline   │  Verify post exists & has hashtags
    └──────┬───────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 ┌───────┐  ┌────────┐
 │Success│  │ Error  │
 │48hr   │  │ Retry  │
 │credit │  │ option │
 └───────┘  └────────┘
```

---

### 12.12 UI Theme

```
Primary: #8B5CF6 (Purple)
Dark Primary: #7C3AED
Secondary: #F3F4F6
Success: #10B981
Warning: #F59E0B
Error: #EF4444
Text: #111827
Text Secondary: #6B7280
Background: #FFFFFF
Border: #E5E7EB
```

---

### 12.13 State Management Hook

```typescript
// useEarnFromSocialMedia hook
state: {
  currentStep: 'overview' | 'url_input' | 'uploading' | 'success' | 'error',
  instagramUrl: string,
  isValidUrl: boolean,
  loading: boolean,
  error: string | null,
  success: boolean,
  uploadProgress: number, // 0-100
  earnings: { pendingAmount, totalEarned, cashbackRate, currentBalance },
  posts: SocialMediaPost[]
}

handlers: {
  handleUrlChange(url: string),
  handleSubmit(),
  handleRetry(),
  handleGoBack(),
  handleStartUpload()
}
```

---

### 12.14 Known Limitations

1. **Instagram Verification:** Uses simulated responses (real Instagram Graph API integration pending)
2. **Captcha:** Validation code exists but UI implementation incomplete
3. **Manual Review:** High-risk submissions (risk > 80) flagged for manual review
4. **Fixed Rate:** 5% cashback rate is hardcoded, no promotional multipliers
5. **Progress Simulation:** Upload progress is simulated, not actual upload progress

---

### 12.15 Fixes Applied (December 2, 2025)

#### Backend Fixes

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| **Instagram Verification Endpoints** | Added `/instagram/verify-post`, `/instagram/verify-account`, `/instagram/extract-post-data` endpoints | `socialMediaRoutes.ts`, `socialMediaController.ts` |
| **Security Endpoints** | Added `/security/verify-device`, `/security/check-blacklist`, `/security/report-suspicious`, `/security/verify-captcha`, `/security/ip-info`, `/security/check-multi-account` | `securityRoutes.ts` (new), `securityController.ts` (new), `server.ts` |
| **FraudMetadata Usage** | Backend now receives and uses `fraudMetadata` from frontend, blocks critical risk submissions | `socialMediaController.ts` |
| **Weekly/Monthly Rate Limits** | Added 10/week and 30/month limits in addition to 3/day | `socialMediaController.ts` |
| **Cooldown Alignment** | Changed cooldown from 24 hours to 1 hour to match frontend | `socialMediaController.ts` |
| **Rejection Cooldown** | Added 24-hour cooldown after post rejection | `socialMediaController.ts` |

#### Frontend Fixes

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| **Mock Data Removed** | Initial earnings set to 0 instead of hardcoded values | `earnSocialData.ts` |
| **Empty useEffect Fixed** | Added proper logging for product context | `earn-from-social-media.tsx` |
| **Graceful Error Handling** | Frontend now allows submissions on API errors (fail-open), backend validates | `securityService.ts`, `instagramVerificationService.ts`, `fraudDetectionService.ts` |

#### Rate Limits (Now Aligned)

| Limit Type | Value | Backend | Frontend |
|------------|-------|---------|----------|
| Cooldown | 1 hour | ✅ | ✅ |
| Daily | 3 posts | ✅ | ✅ |
| Weekly | 10 posts | ✅ | ✅ |
| Monthly | 30 posts | ✅ | ✅ |
| After Rejection | 24 hours | ✅ | ✅ |

#### New Backend Files Created

```
user-backend/src/
├── routes/
│   └── securityRoutes.ts (NEW)
├── controllers/
│   └── securityController.ts (NEW)
```

#### Key Code Changes Summary

**1. socialMediaController.ts - Rate Limits Configuration:**
```typescript
const RATE_LIMITS = {
  COOLDOWN_HOURS: 1,           // 1 hour between submissions
  DAILY_LIMIT: 3,
  WEEKLY_LIMIT: 10,
  MONTHLY_LIMIT: 30,
  REJECTION_COOLDOWN_HOURS: 24  // 24 hours after rejection
};
```

**2. socialMediaController.ts - FraudMetadata Blocking:**
```typescript
if (fraudMetadata.riskLevel === 'critical') {
  return sendError(res, 'Submission blocked due to security concerns.', 403);
}
if (fraudMetadata.trustScore < 20) {
  return sendError(res, 'Device verification failed.', 403);
}
```

**3. Frontend - Fail-Open on Errors:**
```typescript
// securityService.ts
return {
  passed: true, // Allow submission - backend will validate
  trustScore: 70, // Default moderate trust
  ...
};

// instagramVerificationService.ts
return {
  isValid: true, // Allow to proceed
  warnings: ['Verification unavailable. Post will be verified after submission.'],
  ...
};

// fraudDetectionService.ts
return {
  allowed: true, // Allow to proceed
  riskLevel: 'medium',
  warnings: ['Fraud check unavailable. Submission will be reviewed.'],
  ...
};
```

---

### 12.16 Remaining Work

1. **Real Instagram Graph API Integration:** Replace simulated responses with actual API calls
2. **Admin Panel:** Build UI for reviewing pending social media posts
3. **Notification System:** Add push/email notifications for post status changes
4. **Captcha UI:** Implement reCAPTCHA or hCaptcha UI components
5. **Order Linking Validation:** Ensure cashback is calculated when orderId is missing

---

---

## 13. Instagram Social Media Merchant Verification System (December 2, 2025)

### 13.1 Overview

When a user uploads an Instagram URL for their delivered order, the post goes to the merchant for verification. The merchant must verify within 24 hours before the user receives REZ coins.

### 13.2 Complete User Flow

```
User has delivered order
    ↓
User goes to "Earn from Social Media" page
    ↓
User selects order → pastes Instagram URL → submits
    ↓
Shows: "Your post is under review. Merchant will verify within 24 hours."
    ↓
Post saved with status 'pending' + linked to store/merchant
    ↓
Merchant sees post in Cashback Management → "Social Media" tab
    ↓
Merchant clicks Instagram link → verifies post exists → Approve/Reject
    ↓
If Approved → REZ coins added to user's wallet
```

### 13.3 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER APP                                 │
│  earn-from-social-media.tsx → POST /api/social-media/submit     │
│  (includes storeId from order)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  SocialMediaPost model (has store + merchant fields)            │
│  Routes: GET/PUT /api/merchant/social-media-posts               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MERCHANT APP                                │
│  cashback.tsx → "Social Media" tab                              │
│  Components: SocialMediaPostsList, SocialMediaPostCard          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.4 Critical Bug Fixes (December 2, 2025)

#### Bug 1: Store Model Uses `merchantId` Not `merchant`

**Problem:** Backend was querying `Store.find({ merchant: merchantId })` but the Store model uses `merchantId` field.

**Files Fixed:**

| File | Old Code | New Code |
|------|----------|----------|
| `merchant/socialMediaController.ts` | `Store.find({ merchant: merchantId })` | `Store.find({ merchantId: merchantId })` |
| `socialMediaController.ts` (user) | `select: 'merchant name'` | `select: 'merchantId name'` |
| `socialMediaController.ts` (user) | `store.merchant` | `store.merchantId` |

#### Bug 2: User Name Not Displaying (Showed "Unknown User")

**Problem:** User model stores name in `profile.firstName` and `profile.lastName`, not `name`.

**Files Fixed:**

| File | Fix |
|------|-----|
| `merchant/socialMediaController.ts` | Changed populate to include `profile.firstName profile.lastName fullName` |
| `merchant/socialMediaController.ts` | Added name extraction logic in response formatting |

**Code Change:**
```typescript
// Before
.populate('user', 'name email avatar phone')

// After
.populate('user', 'profile.firstName profile.lastName fullName email avatar phone')

// Response formatting
const userName = userObj?.fullName ||
  [userObj?.profile?.firstName, userObj?.profile?.lastName].filter(Boolean).join(' ') ||
  'Unknown User';
```

#### Bug 3: Store Filter Not Working in Merchant App

**Problem:** When merchant changed store dropdown, same posts showed for all stores.

**Files Fixed:**

| File | Fix |
|------|-----|
| `services/api/socialMedia.ts` | Added `storeId` to `SocialMediaFilters` interface |
| `services/api/socialMedia.ts` | Pass `storeId` query param in API call |
| `components/social-media/SocialMediaPostsList.tsx` | Added `storeId` prop, pass to API |
| `app/(dashboard)/cashback.tsx` | Use `useStore()` hook, pass `activeStore._id` to component |

---

### 13.5 Backend API Endpoints (Merchant)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/merchant/social-media-posts` | List posts for merchant's store(s) |
| GET | `/api/merchant/social-media-posts/:postId` | Get single post details |
| PUT | `/api/merchant/social-media-posts/:postId/approve` | Approve post, credit REZ coins |
| PUT | `/api/merchant/social-media-posts/:postId/reject` | Reject post with reason |
| GET | `/api/merchant/social-media-posts/stats` | Get verification statistics |

#### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `storeId` | string | Filter by specific store (optional) |
| `status` | string | Filter by status: pending, approved, rejected, credited |
| `page` | number | Pagination page (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

---

### 13.6 Data Models

#### SocialMediaPost Model

```typescript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),
  order: ObjectId (ref: 'Order'),
  store: ObjectId (ref: 'Store'),      // Links post to store
  merchant: ObjectId (ref: 'Merchant'), // Links post to merchant
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok',
  postUrl: string,
  status: 'pending' | 'approved' | 'rejected' | 'credited',
  cashbackAmount: number,
  cashbackPercentage: number,
  submittedAt: Date,
  reviewedAt: Date,
  creditedAt: Date,
  reviewedBy: ObjectId,
  rejectionReason: string,
  metadata: {
    postId: string,
    thumbnailUrl: string,
    orderNumber: string,
    extractedData: any
  }
}
```

#### Store Model (Relevant Fields)

```typescript
{
  _id: ObjectId,
  name: string,
  merchantId: ObjectId (ref: 'User'), // NOT 'merchant'!
  isActive: boolean,
  // ... other fields
}
```

---

### 13.7 Frontend Components (Merchant App)

#### SocialMediaPostsList Component

**File:** `admin-project/merchant-app/components/social-media/SocialMediaPostsList.tsx`

**Props:**
```typescript
interface SocialMediaPostsListProps {
  storeId?: string; // Filter posts by specific store
  onStatsUpdate?: (stats: SocialMediaStats) => void;
}
```

**Features:**
- Stats cards (Pending, Credited, Coins Paid, Approval Rate)
- Filter tabs (All, Pending, Approved, Credited, Rejected)
- Pull-to-refresh
- Approve/Reject modals

#### SocialMediaPostCard Component

**File:** `admin-project/merchant-app/components/social-media/SocialMediaPostCard.tsx`

**Displays:**
- User name and email
- Order number and date
- Platform icon (Instagram)
- "View Post" link (opens Instagram)
- REZ Coins amount
- Status badge
- Approve/Reject buttons (for pending posts)

#### VerifyPostModal Component

**File:** `admin-project/merchant-app/components/social-media/VerifyPostModal.tsx`

**Features:**
- Shows Instagram URL prominently
- Instructions for verification
- Approve button (with optional notes)
- Reject button (requires reason)

---

### 13.8 Store Context Integration

**File:** `admin-project/merchant-app/contexts/StoreContext.tsx`

**Hook:** `useStore()`

**Returns:**
```typescript
{
  stores: Store[],           // All merchant's stores
  activeStore: Store | null, // Currently selected store
  isLoading: boolean,
  error: string | null,
  setActiveStore: (store: Store) => Promise<void>,
  refreshStores: () => Promise<void>,
  // ... other methods
}
```

**Usage in cashback.tsx:**
```typescript
import { useStore } from '@/contexts/StoreContext';

export default function CashbackScreen() {
  const { activeStore } = useStore();

  // Pass to SocialMediaPostsList
  return <SocialMediaPostsList storeId={activeStore?._id} />;
}
```

---

### 13.9 API Response Format

#### GET /api/merchant/social-media-posts

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "...",
        "user": {
          "_id": "...",
          "name": "Mukul Raj",
          "email": "mukulraj756@gmail.com",
          "avatar": null,
          "phone": null
        },
        "order": {
          "_id": "...",
          "orderNumber": "ORD1761729634472TEST",
          "totals": { "total": 1140 },
          "createdAt": "2025-12-02T..."
        },
        "store": {
          "_id": "692016c8ad3a6bb2af9e5e48",
          "name": "hhhhhhhhhhhhhf"
        },
        "platform": "instagram",
        "postUrl": "https://www.instagram.com/reels/DRhhwPHklCh/",
        "status": "pending",
        "cashbackAmount": 57,
        "cashbackPercentage": 5,
        "submittedAt": "2025-12-02T11:45:40.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 13.10 Files Modified Summary

#### Backend Files

| File | Changes |
|------|---------|
| `user-backend/src/controllers/socialMediaController.ts` | Fixed `merchantId` extraction from store |
| `user-backend/src/controllers/merchant/socialMediaController.ts` | Fixed store query, user name population, added storeId filter |
| `user-backend/src/routes/socialMediaRoutes.ts` | Added `fraudMetadata` to validation schema |
| `user-backend/src/merchantroutes/socialMedia.ts` | Routes for merchant social media verification |

#### Merchant App Files

| File | Changes |
|------|---------|
| `admin-project/merchant-app/services/api/socialMedia.ts` | Added `storeId` to filters |
| `admin-project/merchant-app/components/social-media/SocialMediaPostsList.tsx` | Added `storeId` prop |
| `admin-project/merchant-app/app/(dashboard)/cashback.tsx` | Uses `useStore()`, passes storeId |

#### Debug Scripts Created

| File | Purpose |
|------|---------|
| `user-backend/scripts/checkSocialMediaPosts.js` | Check posts and store linkage in database |

---

### 13.11 Wallet Integration (On Approval)

When merchant approves a post:

1. Find user's wallet
2. Add `cashbackAmount` REZ coins to wallet
3. Create transaction record with reference to social media post
4. Update post status to 'credited'
5. Set `creditedAt` timestamp

---

### 13.12 Edge Cases Handled

| Case | Behavior |
|------|----------|
| Order has multiple stores | Uses first item's store |
| Post already approved/rejected | Returns error, no re-processing |
| User deleted | Shows "[Deleted User]" |
| Store deactivated | Posts visible but approval disabled |
| Wallet not found | Creates wallet automatically before crediting |
| Store not owned by merchant | Returns 404 (security) |

---

### 13.13 Testing Checklist

- [x] User submits Instagram post for delivered order
- [x] Post appears in merchant's Social Media tab
- [x] Merchant can filter by store using dropdown
- [x] User name displays correctly (not "Unknown User")
- [x] Merchant can open Instagram link to verify
- [x] Approve button works → User receives REZ coins
- [x] Reject button works → Requires reason
- [x] Switching stores shows only that store's posts

---

---

## 14. Product Gallery System (December 3, 2025)

### 14.1 Overview

The Product Gallery system allows merchants to upload product images with metadata (category, title, description, tags, etc.) which are then displayed to users on the product detail page. The system is similar to Store Gallery but specifically for products.

### 14.2 Complete Data Flow: Merchant → User

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MERCHANT UPLOADS (Web)                              │
│  merchant-app/app/products/[id]/images.tsx                            │
│  - Select images (expo-image-picker returns data URIs on web)         │
│  - Choose category (main, variant, lifestyle, details, etc.)          │
│  - Add title, description, tags                                        │
│  - Click Upload                                                        │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ POST /api/merchant/products/:productId/gallery
                            │ Content-Type: multipart/form-data
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    MERCHANT API SERVICE (Frontend)                     │
│  merchant-app/services/api/productGallery.ts                          │
│  - Convert data URI → File object (web only)                          │
│  - Build FormData with file + metadata                                │
│  - Send to backend                                                    │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND PROCESSING                                  │
│  user-backend/src/merchantroutes/productGallery.ts                    │
│  1. Upload file to Cloudinary → get url & publicId                    │
│  2. Save to MongoDB ProductGallery collection                         │
│     - productId, merchantId, url, publicId                            │
│     - category, title, description, tags, order                       │
│     - isCover, isVisible, views, likes, shares                        │
│  3. Return created gallery item                                       │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ Stored in MongoDB
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    MONGODB STORAGE                                     │
│  Collection: ProductGallery                                           │
│  {                                                                     │
│    productId: ObjectId,                                               │
│    merchantId: ObjectId,                                              │
│    url: "https://res.cloudinary.com/...",                             │
│    publicId: "products/...",                                          │
│    type: "image",                                                     │
│    category: "main" | "variant" | "lifestyle" | ...,                 │
│    title: "Product Front View",                                       │
│    description: "...",                                                │
│    tags: ["blue", "cotton"],                                          │
│    order: 0,                                                          │
│    isCover: true,                                                     │
│    isVisible: true,                                                   │
│    views: 0,                                                          │
│    likes: 0,                                                          │
│    shares: 0                                                          │
│  }                                                                     │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ User views product page
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    USER REQUESTS GALLERY                               │
│  frontend/app/ProductPage.tsx                                         │
│  - Renders ProductGallerySection component                            │
│  - Passes productId and variantId                                     │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ GET /api/products/:productId/gallery
                            │   ?limit=100&sortBy=order&sortOrder=asc
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PUBLIC API ROUTES (Backend)                         │
│  user-backend/src/routes/productGallery.ts                            │
│  1. Verify product exists and not deleted                             │
│  2. Query ProductGallery:                                             │
│     - Filter: productId, isVisible=true, deletedAt not exists         │
│     - Optional filters: category, variantId, type                     │
│     - Sort by: order, uploadedAt, or views                            │
│  3. Aggregate categories with counts                                  │
│  4. Return items + categories + total count                           │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ Returns JSON
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    USER API SERVICE (Frontend)                         │
│  frontend/services/productGalleryApi.ts                               │
│  - Parse response                                                     │
│  - Add default values for missing fields                              │
│  - Return typed ProductGalleryResponse                                │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    UI DISPLAY (User App)                               │
│  frontend/components/product/ProductGallerySection.tsx                │
│  - Show category filter chips                                         │
│  - Show tag filter chips                                              │
│  - Display category cards (if "All" selected)                         │
│  - Display 3-column grid of images                                    │
│  - Click image → Opens GalleryViewerModal                             │
│  - Full-screen viewer with swipe, zoom, share                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 14.3 System Components

#### A. Merchant Side (Upload)

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| **Images Tab** | `merchant-app/app/products/[id]/images.tsx` | UI for uploading/managing images | ~1200 |
| **API Service** | `merchant-app/services/api/productGallery.ts` | API calls for CRUD operations | 432 |
| **Upload Flow** | Data URI → File conversion (web) → FormData → Backend | - | - |

**Key Features:**
- Single & bulk upload
- Category selection (main, variant, lifestyle, details, packaging, general)
- Title, description, tags
- Set as cover image
- Reordering via drag-drop
- Delete images

#### B. Backend (Processing)

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| **Merchant Routes** | `user-backend/src/merchantroutes/productGallery.ts` | CRUD endpoints for merchants | ~800 |
| **Public Routes** | `user-backend/src/routes/productGallery.ts` | Read-only endpoints for users | 285 |
| **Model** | `user-backend/src/models/ProductGallery.ts` | MongoDB schema | 266 |
| **Cloudinary Service** | `user-backend/src/services/CloudinaryService.ts` | Image upload/delete | ~200 |

**Key Features:**
- File validation (size, type, count)
- Cloudinary integration
- Image optimization
- Soft delete
- View tracking

#### C. User Side (Viewing)

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| **Gallery Section** | `frontend/components/product/ProductGallerySection.tsx` | Main gallery display component | 818 |
| **Gallery Viewer** | `frontend/components/store/GalleryViewerModal.tsx` | Full-screen image viewer | 785 |
| **API Service** | `frontend/services/productGalleryApi.ts` | API calls for fetching gallery | 137 |

**Key Features:**
- Category cards view
- 3-column grid view
- Category filter chips
- Tag filter chips
- Full-screen viewer with zoom, swipe, share
- Analytics tracking
- Error handling & retry

---

### 14.4 API Endpoints

#### Merchant Endpoints (Protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/merchant/products/:productId/gallery` | Upload single image |
| POST | `/api/merchant/products/:productId/gallery/bulk` | Upload multiple images |
| GET | `/api/merchant/products/:productId/gallery` | List merchant's gallery items |
| GET | `/api/merchant/products/:productId/gallery/categories` | Get categories with counts |
| GET | `/api/merchant/products/:productId/gallery/:itemId` | Get single item details |
| PUT | `/api/merchant/products/:productId/gallery/:itemId` | Update item metadata |
| PUT | `/api/merchant/products/:productId/gallery/:itemId/set-cover` | Set as cover image |
| PUT | `/api/merchant/products/:productId/gallery/reorder` | Reorder items |
| DELETE | `/api/merchant/products/:productId/gallery/:itemId` | Delete single item |
| DELETE | `/api/merchant/products/:productId/gallery/bulk` | Delete multiple items |

#### Public Endpoints (User Access)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products/:productId/gallery` | Get gallery items (filtered) |
| GET | `/api/products/:productId/gallery/categories` | Get categories with counts |
| GET | `/api/products/:productId/gallery/:itemId` | Get single item + increment views |

**Query Parameters (Public GET):**
- `category` - Filter by category name
- `variantId` - Filter by product variant
- `type` - Filter by type (image/video)
- `limit` - Max items to return (default: 50, max: 100)
- `offset` - Pagination offset
- `sortBy` - Sort field (order, uploadedAt, views)
- `sortOrder` - Sort direction (asc, desc)

---

### 14.5 Data Schema

```typescript
interface IProductGallery {
  // Identity
  _id: ObjectId;
  productId: ObjectId;  // ref: Product
  merchantId: ObjectId; // ref: User

  // Media
  url: string;          // Cloudinary URL
  publicId: string;     // Cloudinary public ID
  type: 'image';        // Images only (no videos)

  // Metadata
  category: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general';
  title?: string;       // Max 200 chars
  description?: string; // Max 1000 chars
  tags?: string[];      // Lowercase, trimmed

  // Organization
  order: number;        // Sort order within category
  isVisible: boolean;   // Show/hide from users
  isCover: boolean;     // Main product image
  variantId?: string;   // Link to specific variant

  // Analytics
  views: number;
  likes: number;
  shares: number;
  viewedBy: ObjectId[]; // Track unique viewers

  // Timestamps
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;     // Soft delete
}
```

---

### 14.6 Critical Fixes Applied (December 3, 2025)

#### Fix 1: Route Ordering Bug
**Problem:** `GET /api/merchant/products/:productId/gallery/categories` returned 500 error

**Root Cause:** Express matched `/:itemId` route before `/categories` route

**Fix:** Moved `/categories` route BEFORE `/:itemId` route

**Files Changed:**
- `user-backend/src/merchantroutes/productGallery.ts`
- `user-backend/src/routes/productGallery.ts`

#### Fix 2: FormData Content-Type Header
**Problem:** Upload API returned 400 "Bad Request" with wrong Content-Type

**Root Cause:** Axios instance had default `Content-Type: application/json`, FormData requires `multipart/form-data`

**Fix:**
1. Removed default Content-Type from axios constructor
2. Updated request interceptor to auto-detect FormData
3. Let browser set boundary automatically

**Files Changed:**
- `merchant-app/services/api/index.ts` (lines 20-50, 80-95)

```typescript
// Before (WRONG)
this.axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json', // This breaks FormData!
  }
});

// After (CORRECT)
this.axiosInstance = axios.create({
  // No default Content-Type
});

// Interceptor
if (isFormData) {
  delete config.headers['Content-Type']; // Let browser set boundary
} else if (config.data && !config.headers['Content-Type']) {
  config.headers['Content-Type'] = 'application/json';
}
```

#### Fix 3: Data URI to File Conversion (Web)
**Problem:** expo-image-picker returns data URIs on web (`data:image/jpeg;base64,...`), backend expects File objects

**Fix:** Convert data URIs to File objects using `fetch()`

**Files Changed:**
- `merchant-app/services/api/productGallery.ts` (lines 124-144, 219-239)

```typescript
// Single Upload
if (file.uri.startsWith('data:')) {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const fileName = file.fileName || `product-${Date.now()}.jpg`;
  const mimeType = blob.type || 'image/jpeg';
  const fileObj = new File([blob], fileName, { type: mimeType });
  formData.append('file', fileObj);
}

// Bulk Upload (same logic for each file)
```

#### Fix 4: Category Filter Double-Click
**Problem:** User had to click category filter twice for it to work

**Root Cause:** React state updates are asynchronous, `loadGallery()` was called before `setSelectedCategory()` updated

**Fix:** Pass category directly to `loadGallery()` instead of relying on state

**Files Changed:**
- `merchant-app/app/products/[id]/images.tsx`

```typescript
// Before (WRONG)
onPress={() => {
  setSelectedCategory(cat);
  loadGallery(); // Uses old selectedCategory!
}}

// After (CORRECT)
onPress={() => {
  setSelectedCategory(cat);
  loadGallery(cat); // Pass directly
}}
```

#### Fix 5: User-Side Product Gallery Implementation
**Problem:** No gallery display on user's ProductPage

**Solution:** Created complete user-side implementation

**New Files Created:**
1. `user-backend/src/routes/productGallery.ts` - Public API routes
2. `frontend/services/productGalleryApi.ts` - API service
3. `frontend/components/product/ProductGallerySection.tsx` - UI component

**Integration:**
```tsx
// frontend/app/ProductPage.tsx
{isDynamic && cardData && (cardData.id || cardData._id) && (
  <ProductGallerySection
    productId={cardData.id || cardData._id!}
    variantId={cardData.selectedVariant?.id}
  />
)}
```

#### Fix 6: TypeScript Errors (thumbnail property)
**Problem:** Backend tried to access `thumbnail` property that doesn't exist

**Fix:** Removed thumbnail references (ProductGallery only stores images, no video thumbnails)

**Files Changed:**
- `user-backend/src/routes/productGallery.ts` (removed lines 118, 263)

#### Fix 7: "Product is not available" Error
**Problem:** Public API returned 400 error when product had `isAvailable: false`

**Root Cause:** Route checked both `isDeleted` AND `!isAvailable`, too strict for gallery viewing

**Fix:** Only check `isDeleted`, allow viewing gallery even if product unavailable

**Files Changed:**
- `user-backend/src/routes/productGallery.ts` (lines 39-41, 166-168, 244-246)

```typescript
// Before (TOO STRICT)
if (product.isDeleted || !product.isAvailable) {
  return sendBadRequest(res, 'Product is not available');
}

// After (CORRECT)
if (product.isDeleted) {
  return sendBadRequest(res, 'Product has been deleted');
}
```

#### Fix 8: Gallery Viewer 404 Error
**Problem:** When viewing product gallery images, got 404 error: `POST /stores/.../gallery/.../view 404`

**Root Cause:** `GalleryViewerModal` was hardcoded to use store API, but ProductGallerySection uses product API

**Fix:** Made GalleryViewerModal support both stores and products via `type` prop

**Files Changed:**
- `frontend/components/store/GalleryViewerModal.tsx`
  - Added `type?: 'store' | 'product'` prop
  - Conditionally call appropriate API based on type
  - For products, skip trackView API call (endpoint doesn't exist yet)
- `frontend/components/product/ProductGallerySection.tsx`
  - Pass `type="product"` to GalleryViewerModal

```tsx
<GalleryViewerModal
  visible={viewerVisible}
  items={galleryItems}
  initialIndex={selectedIndex}
  storeId={productId}
  onClose={() => setViewerVisible(false)}
  type="product" // NEW
/>
```

#### Fix 9: Removed Duplicate Gallery Section
**Problem:** ProductPage showed two galleries - dummy "r3qfp3rlf Gallery" (Section1) and real ProductGallerySection

**Fix:** Deleted `Section1.tsx` component and removed all references

**Files Changed:**
- Deleted: `frontend/app/StoreSection/Section1.tsx`
- Updated: `frontend/app/ProductPage.tsx` (removed import and usage)
- Updated: `frontend/app/MainStorePage.tsx` (removed import and usage)
- Updated: `frontend/app/MainStorePage.LAZY_LOADING_EXAMPLE.tsx` (updated example)

---

### 14.7 Field Mapping: Merchant → MongoDB → User

| Merchant Input | MongoDB Field | User API Response | User UI Display |
|---------------|---------------|-------------------|-----------------|
| Selected image file | `url` (Cloudinary) | `url` | `<Image source={{uri: url}}>` |
| Category dropdown | `category` | `category` | Category filter chip |
| Title input | `title` | `title` | Image caption in viewer |
| Description input | `description` | `description` | Info panel in viewer |
| Tags input | `tags[]` | `tags[]` | Tag filter chips |
| Variant selector | `variantId` | `variantId` | Variant filter |
| Order number | `order` | `order` | Sort order |
| "Set as cover" checkbox | `isCover` | `isCover` | ⭐ Star badge |
| "Visible" toggle | `isVisible` | `isVisible` | Show/hide item |
| - | `views` | `views` | View count in info |
| - | `likes` | `likes` | Like count (future) |
| - | `shares` | `shares` | Share count (future) |
| - | `uploadedAt` | `uploadedAt` | Timestamp |

---

### 14.8 Component Hierarchy

```
ProductPage.tsx
  └─► ProductGallerySection.tsx
       ├─► Category Filter Chips (horizontal scroll)
       ├─► Tag Filter Chips (horizontal scroll)
       ├─► Category Cards View (if no filters)
       │    └─► TouchableOpacity → handleCategoryPress()
       ├─► Gallery Grid View (3 columns)
       │    └─► FlatList
       │         └─► renderGalleryItem()
       │              └─► TouchableOpacity → handleItemPress()
       └─► GalleryViewerModal (full-screen)
            ├─► Carousel Mode (swipe)
            │    └─► ZoomableImage
            ├─► Grid Mode (toggle)
            │    └─► Thumbnail grid
            └─► Info Panel (title, desc, tags, views)
```

---

### 14.9 State Management

#### ProductGallerySection State
```typescript
const [allGalleryItems, setAllGalleryItems] = useState<ProductGalleryItem[]>([]); // All items from API
const [galleryItems, setGalleryItems] = useState<ProductGalleryItem[]>([]);       // Filtered items
const [categories, setCategories] = useState<ProductGalleryCategory[]>([]);       // Category list
const [selectedCategory, setSelectedCategory] = useState<string>('all');          // Active filter
const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());         // Active tags
const [viewMode, setViewMode] = useState<'categories' | 'grid'>('categories');    // Display mode
const [viewerVisible, setViewerVisible] = useState(false);                        // Modal state
const [selectedIndex, setSelectedIndex] = useState(0);                            // Current image
const [loading, setLoading] = useState(true);                                     // Loading state
const [error, setError] = useState<string | null>(null);                          // Error state
```

#### Filtering Logic
```typescript
const filterItems = () => {
  let filtered = [...allGalleryItems];

  // 1. Filter by variant (if specified)
  if (variantId) {
    filtered = filtered.filter(item =>
      !item.variantId || item.variantId === variantId
    );
  }

  // 2. Filter by category
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(item =>
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  // 3. Filter by tags (AND logic - must have all selected tags)
  if (selectedTags.size > 0) {
    filtered = filtered.filter(item => {
      const itemTags = item.tags?.map(t => t.toLowerCase()) || [];
      return Array.from(selectedTags).every(tag =>
        itemTags.includes(tag.toLowerCase())
      );
    });
  }

  setGalleryItems(filtered);
};
```

---

### 14.10 Performance Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Image Lazy Loading** | Only load visible images, preload next 3 |
| **Pagination** | API supports limit/offset (default: 50 items) |
| **Caching** | Results cached for 5 minutes (frontend) |
| **Skeleton Loaders** | Show during initial load |
| **Error Retry** | Auto-retry on network errors (max 3 attempts) |
| **Virtual Scrolling** | FlatList for efficient rendering |
| **Image Optimization** | Cloudinary auto-optimizes (format, quality, size) |

---

### 14.11 Analytics Tracking

```typescript
// Events tracked
analyticsService.track('product_gallery_viewed', {
  productId,
  variantId,
  category,
  tags: Array.from(selectedTags)
});

analyticsService.track('product_gallery_item_clicked', {
  productId,
  itemId,
  itemType,
  category,
  index
});

analyticsService.track('product_gallery_category_filtered', {
  productId,
  category
});

analyticsService.track('product_gallery_tag_filtered', {
  productId,
  tag,
  action: 'added' | 'removed'
});
```

---

### 14.12 Error Handling

#### Backend Errors
| Error | Status | Message |
|-------|--------|---------|
| Product not found | 404 | "Product not found" |
| Product deleted | 400 | "Product has been deleted" |
| Invalid pagination | 400 | "Invalid limit or offset" |
| Database error | 500 | "Failed to fetch product gallery" |

#### Frontend Errors
```tsx
// Error state with retry
if (error && allGalleryItems.length === 0) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={32} color="#EF4444" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadGallery()}
      >
        <Ionicons name="refresh" size={16} color="#FFF" />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### 14.13 Testing Checklist

#### Merchant Side
- [x] Upload single image
- [x] Upload multiple images (bulk)
- [x] Set category for each image
- [x] Add title, description, tags
- [x] Set image as cover
- [x] Reorder images
- [x] Delete images
- [x] Filter by category
- [x] Data URI → File conversion works on web
- [x] FormData sent with correct Content-Type

#### User Side
- [x] Gallery appears on ProductPage
- [x] Category cards display correctly
- [x] Category filter works (single click)
- [x] Tag filters work
- [x] 3-column grid displays images
- [x] Click image opens full-screen viewer
- [x] Viewer supports zoom, swipe, share
- [x] No 404 errors when viewing images
- [x] Empty state shows when no images
- [x] Error state with retry works
- [x] Loading skeleton shows on initial load

#### Data Flow
- [x] Merchant upload saves to MongoDB
- [x] Images stored in Cloudinary
- [x] Public API returns only visible items
- [x] Deleted items excluded from results
- [x] Categories aggregated correctly
- [x] View count NOT tracked (endpoint missing)

---

### 14.14 Key Files Reference

#### Backend
```
user-backend/src/
├── models/
│   └── ProductGallery.ts                # MongoDB schema (266 lines)
├── merchantroutes/
│   └── productGallery.ts                # Merchant CRUD routes (~800 lines)
├── routes/
│   └── productGallery.ts                # Public read-only routes (285 lines)
├── services/
│   └── CloudinaryService.ts             # Image upload service
└── server.ts                            # Route registration
```

#### Merchant App
```
admin-project/merchant-app/
├── app/
│   └── products/
│       └── [id]/
│           └── images.tsx               # Gallery management UI (~1200 lines)
├── services/
│   └── api/
│       ├── index.ts                     # Axios client (FormData fix)
│       └── productGallery.ts            # API service (432 lines)
└── types/
    └── products.ts                      # TypeScript interfaces
```

#### User Frontend
```
frontend/
├── app/
│   └── ProductPage.tsx                  # Integration point
├── components/
│   ├── product/
│   │   └── ProductGallerySection.tsx   # Gallery display (818 lines)
│   └── store/
│       └── GalleryViewerModal.tsx      # Full-screen viewer (785 lines)
├── services/
│   └── productGalleryApi.ts            # API client (137 lines)
└── types/
    └── product-gallery.ts               # TypeScript interfaces
```

---

### 14.15 Future Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Video Support** | Allow merchants to upload product videos | Medium |
| **View Tracking** | Add endpoint to track image views on user side | Low |
| **Like/Share** | Add like and share functionality | Low |
| **Bulk Edit** | Edit multiple images at once (category, tags, etc.) | Medium |
| **AI Tagging** | Auto-generate tags from image content | Low |
| **Image Filters** | Apply filters/effects before upload | Low |
| **Variant Images** | Better UI for managing variant-specific images | High |
| **Gallery Analytics** | Dashboard showing most viewed images | Medium |

---

### 14.16 Context for New Chat Sessions

When starting a new chat about Product Gallery, provide this context:

**Quick Summary:**
"The Product Gallery system allows merchants to upload images for products via the merchant app (`products/[id]/images` page). Images are stored in Cloudinary and metadata in MongoDB's ProductGallery collection. Users view galleries on ProductPage via ProductGallerySection component. System is fully functional end-to-end."

**Key Points:**
1. **Merchant uploads**: Data URI → File conversion → FormData → Cloudinary → MongoDB
2. **User views**: ProductGallerySection → API call → filtered results → display
3. **Categories**: main, variant, lifestyle, details, packaging, general
4. **Fixed issues**: Route ordering, FormData Content-Type, data URI conversion, double-click filter, 404 errors, duplicate sections
5. **Missing**: View tracking endpoint on user side, video support

**File Locations:**
- Merchant UI: `admin-project/merchant-app/app/products/[id]/images.tsx`
- Backend routes: `user-backend/src/routes/productGallery.ts` (public), `user-backend/src/merchantroutes/productGallery.ts` (merchant)
- User UI: `frontend/components/product/ProductGallerySection.tsx`
- Model: `user-backend/src/models/ProductGallery.ts`

---

## Last Updated
- **Date:** December 3, 2025
- **Analysis Version:** 1.6
- **Analyzed By:** Claude Code
- **Latest Addition:** Product Gallery System (Section 14)
- **Fixes Applied:** All critical and high-priority gaps addressed
