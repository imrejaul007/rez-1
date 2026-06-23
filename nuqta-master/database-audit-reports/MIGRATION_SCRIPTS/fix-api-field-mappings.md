# API FIELD MAPPING FIXES

**Priority:** CRITICAL - Must be done first
**Risk Level:** Medium (requires code changes but no data migration)
**Estimated Effort:** 2-4 hours
**Impact:** Fixes ALL broken relationships

---

## PROBLEM SUMMARY

The database uses different field names than the backend API expects:

| API Expects | Database Has | Collection | Status |
|-------------|--------------|------------|--------|
| `storeId` | `store` | products | ❌ Mismatch |
| `categoryId` | `category` | products | ❌ Mismatch |
| `productId` | `products` (array) | videos | ❌ Mismatch |
| `storeId` | `stores` (array) | videos | ❌ Mismatch |
| `userId` | *missing* | orders, wishlists, carts | ❌ Missing |
| `productId` | `product` | order items | ❌ Mismatch |

---

## SOLUTION: UPDATE API QUERIES

### Option A: Update Backend Queries (RECOMMENDED)

**Pros:**
- No database migration needed
- Zero risk of data loss
- Can be done incrementally
- Backward compatible

**Cons:**
- Need to update TypeScript interfaces
- Need to update Mongoose models
- Need to update all query code

### Option B: Migrate Database Fields

**Pros:**
- API code matches database
- Cleaner long-term

**Cons:**
- Risk of data corruption
- Requires downtime
- Complex migration
- Need to update all references

**DECISION: Go with Option A**

---

## REQUIRED CODE CHANGES

### 1. Products API - Store Relationship

**Current Code (BROKEN):**
```typescript
// Backend: services/productsApi.ts
const products = await Product.find({ storeId: storeId });
```

**Fixed Code:**
```typescript
const products = await Product.find({ store: storeId });
```

**Mongoose Model Update:**
```typescript
// models/Product.ts
interface IProduct {
  store: Schema.Types.ObjectId;  // NOT storeId
  category: Schema.Types.ObjectId;  // NOT categoryId
  merchantId: Schema.Types.ObjectId;
}

const ProductSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant' }
});
```

---

### 2. Products API - Category Relationship

**Current Code (BROKEN):**
```typescript
const products = await Product.find({ categoryId: categoryId });
```

**Fixed Code:**
```typescript
const products = await Product.find({ category: categoryId });
```

**Population:**
```typescript
const product = await Product.findById(id)
  .populate('store')     // NOT 'storeId'
  .populate('category')  // NOT 'categoryId'
  .populate('merchantId');
```

---

### 3. Videos API - Products/Stores Relationship

**Current Code (BROKEN):**
```typescript
const videos = await Video.find({ productId: productId });
const videos = await Video.find({ storeId: storeId });
```

**Fixed Code:**
```typescript
// Videos use ARRAYS, not single IDs
const videos = await Video.find({
  products: { $in: [productId] }  // products is an array
});

const videos = await Video.find({
  stores: { $in: [storeId] }  // stores is an array
});
```

**Mongoose Model:**
```typescript
interface IVideo {
  products: Schema.Types.ObjectId[];  // Array!
  stores: Schema.Types.ObjectId[];    // Array!
  creator: Schema.Types.ObjectId;
}

const VideoSchema = new Schema({
  products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  stores: [{ type: Schema.Types.ObjectId, ref: 'Store' }],
  creator: { type: Schema.Types.ObjectId, ref: 'User' }
});
```

---

### 4. Orders API - User/Product Relationships

**Current Database Structure:**
```javascript
{
  "_id": "...",
  "items": [
    {
      "product": "68ecdae37084846c4f4f71c1",  // NOT productId
      "quantity": 2,
      "price": 1999
    }
  ]
  // Note: NO userId field found in sample!
}
```

**Problem:** Orders don't have `userId` field at all!

**Options:**

**A. Add userId to existing orders (if you have user data):**
```typescript
// Migration script needed
db.orders.updateMany({}, {
  $set: { userId: null }  // Set to null or actual user ID if available
});
```

**B. Query orders differently:**
```typescript
// Instead of: Order.find({ userId: userId })
// Use order IDs from user's order history:
const user = await User.findById(userId);
const orders = await Order.find({ _id: { $in: user.orderIds } });
```

**C. Add userId going forward:**
```typescript
// When creating new orders:
const order = new Order({
  userId: req.user.id,  // Add this
  items: [...],
  total: ...
});
```

---

### 5. Reviews API - Product/Store Relationships

**Current Database Structure:**
```javascript
{
  "_id": "...",
  "rating": 5,  // Plain number (needs fix)
  // Note: NO productId or storeId found in samples!
}
```

**Problem:** Reviews are missing `productId` and `storeId` entirely!

**Solution Options:**

**A. Check if field exists but wasn't in sample:**
```typescript
// Run this query to check:
db.reviews.find({ productId: { $exists: true } }).limit(10);
db.reviews.find({ storeId: { $exists: true } }).limit(10);
db.reviews.find({ product: { $exists: true } }).limit(10);
db.reviews.find({ store: { $exists: true } }).limit(10);
```

**B. If reviews truly lack references:**
- Reviews might be orphaned test data
- May need to delete and recreate with proper references

---

### 6. Wishlists API - User/Product Relationships

**Current Database Structure:**
```javascript
{
  "_id": "...",
  "items": [
    // Structure unknown - need to check actual data
  ]
  // Note: NO userId field found!
}
```

**Solution:** Similar to orders - either add userId or query differently.

---

### 7. Carts API - User/Product Relationships

**Current Database Structure:**
```javascript
{
  "_id": "...",
  "items": [
    {
      "product": "...",  // Check actual field name
      "quantity": 2
    }
  ]
  // Note: NO userId field found!
}
```

**Solution:** Add userId field or implement session-based carts.

---

## VERIFICATION SCRIPT

Run this after making changes to verify relationships work:

```javascript
// verify-relationships.js
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://mukulraj756:<REDACTED>@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function verify() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('test');

  console.log('Testing Products → Stores relationship...');
  const product = await db.collection('products').findOne();
  if (product.store) {
    const store = await db.collection('stores').findOne({ _id: product.store });
    console.log(store ? '✅ PASS' : '❌ FAIL');
  }

  console.log('Testing Products → Categories relationship...');
  if (product.category) {
    const category = await db.collection('categories').findOne({ _id: product.category });
    console.log(category ? '✅ PASS' : '❌ FAIL');
  }

  console.log('Testing Videos → Products relationship...');
  const video = await db.collection('videos').findOne({ products: { $exists: true, $ne: [] } });
  if (video && video.products && video.products.length > 0) {
    const product = await db.collection('products').findOne({ _id: video.products[0] });
    console.log(product ? '✅ PASS' : '❌ FAIL');
  }

  await client.close();
}

verify().catch(console.error);
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Update Mongoose Models

- [ ] Update Product model
  - [ ] Change `storeId` to `store`
  - [ ] Change `categoryId` to `category`
  - [ ] Verify `merchantId` exists

- [ ] Update Video model
  - [ ] Use `products` array
  - [ ] Use `stores` array
  - [ ] Verify `creator` field

- [ ] Update Order model
  - [ ] Add `userId` field (if not exists)
  - [ ] Verify `items.product` field name

- [ ] Update Review model
  - [ ] Check what fields actually exist
  - [ ] Add `productId` or `product` if missing

- [ ] Update Wishlist model
  - [ ] Add `userId` field
  - [ ] Verify items structure

- [ ] Update Cart model
  - [ ] Add `userId` field
  - [ ] Verify items structure

### Phase 2: Update API Controllers

**Products API:**
- [ ] `GET /products` - filter by `store` not `storeId`
- [ ] `GET /products/:id` - populate `store`, `category`, `merchantId`
- [ ] `GET /products/category/:id` - filter by `category`
- [ ] `GET /products/store/:id` - filter by `store`

**Stores API:**
- [ ] `GET /stores/:id/products` - use `store` field

**Videos API:**
- [ ] `GET /videos` - filter using `products: { $in: [...] }`
- [ ] `GET /videos/:id` - populate `products`, `stores`, `creator`

**Orders API:**
- [ ] `GET /orders/user/:userId` - verify userId field exists
- [ ] `POST /orders` - ensure userId is saved
- [ ] `GET /orders/:id` - populate `items.product`

**Reviews API:**
- [ ] `GET /reviews/product/:id` - check actual field name
- [ ] `GET /reviews/store/:id` - check actual field name
- [ ] `POST /reviews` - ensure proper linking

**Wishlists API:**
- [ ] `GET /wishlists/user/:userId` - verify userId
- [ ] `POST /wishlists/add` - verify product reference

**Carts API:**
- [ ] `GET /carts/user/:userId` - verify userId
- [ ] `PUT /carts/update` - verify product reference

### Phase 3: Update TypeScript Interfaces

- [ ] Update `types/product.ts`
- [ ] Update `types/video.ts`
- [ ] Update `types/order.ts`
- [ ] Update `types/review.ts`
- [ ] Update `types/wishlist.ts`
- [ ] Update `types/cart.ts`

### Phase 4: Update Frontend API Calls

- [ ] Update `services/productsApi.ts`
- [ ] Update `services/storesApi.ts`
- [ ] Update `services/videosApi.ts`
- [ ] Update `services/ordersApi.ts`
- [ ] Update `services/reviewsApi.ts`
- [ ] Update `services/wishlistApi.ts`
- [ ] Update `services/cartApi.ts`

### Phase 5: Testing

- [ ] Run verification script
- [ ] Test product detail page (should show store info)
- [ ] Test store page (should show products)
- [ ] Test video page (should link to products)
- [ ] Test cart (should link to products)
- [ ] Test wishlist (should link to products)
- [ ] Test orders (should show product details)

---

## ROLLBACK PLAN

If something goes wrong:

1. **Revert code changes:**
   ```bash
   git revert HEAD
   ```

2. **No database changes needed** (we didn't modify database)

3. **Restore from backup if needed:**
   ```bash
   mongorestore --uri="..." ./backup-2025-11-15
   ```

---

## ESTIMATED TIMELINE

| Task | Time | Who |
|------|------|-----|
| Update Mongoose models | 30 min | Backend dev |
| Update API controllers | 1 hour | Backend dev |
| Update TypeScript interfaces | 30 min | Backend dev |
| Update frontend API calls | 1 hour | Frontend dev |
| Testing & debugging | 1 hour | QA + devs |
| **TOTAL** | **4 hours** | Team |

---

## SUCCESS CRITERIA

After completing all changes:

✅ Products API returns store information
✅ Products API returns category information
✅ Store API returns its products
✅ Videos API returns linked products and stores
✅ Orders show complete product details
✅ Reviews link to products/stores correctly
✅ Wishlist and cart work properly
✅ No console errors about missing references
✅ All populated fields return data

---

## NOTES

- This is the **HIGHEST PRIORITY** fix
- Affects nearly ALL app functionality
- Must be done before other migrations
- No database downtime required
- Can be deployed to production safely
- Consider adding field aliases in Mongoose for backward compatibility

---

**Created:** 2025-11-15
**Status:** Ready for implementation
**Dependencies:** None
**Blocks:** All other migrations
