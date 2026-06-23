# Field Names Quick Reference Guide

## ✅ CORRECT Field Names (Use These)

### Product Model
```typescript
// ✅ CORRECT
Product.find({
  store: storeId,           // NOT storeId
  category: categoryId      // NOT categoryId
})

// ✅ CORRECT Population
.populate('store', 'name logo')
.populate('category', 'name slug')
```

### Video Model
```typescript
// ✅ CORRECT
Video.find({
  products: { $in: [productId] }  // Uses 'products' array, NOT 'productId'
})

// ✅ CORRECT Population
.populate('products', 'name images pricing')
.populate('stores', 'name logo')
```

### Order Model
```typescript
// ✅ CORRECT
Order.find({
  user: userId           // NOT userId in the query field
})

// ✅ CORRECT Population
.populate('user', 'profile.name')
.populate('items.product', 'name images')
.populate('items.store', 'name logo')
```

### Review Model
```typescript
// ✅ CORRECT
Review.find({
  store: storeId,        // NOT storeId
  user: userId           // NOT userId
})

// ✅ CORRECT Population
.populate('store', 'name logo')
.populate('user', 'profile.name')
```

### Wishlist Model
```typescript
// ✅ CORRECT
Wishlist.find({
  user: userId           // NOT userId
})

// ✅ CORRECT
Wishlist.findOne({ user: userId, isDefault: true })
```

### Cart Model
```typescript
// ✅ CORRECT
Cart.findOne({
  user: userId           // NOT userId
})

// ✅ CORRECT Population
.populate('items.product', 'name images pricing')
.populate('items.store', 'name logo')
```

---

## ❌ INCORRECT Field Names (Don't Use These)

### Product Model
```typescript
// ❌ WRONG - Will not find anything
Product.find({
  storeId: storeId,         // WRONG! Use 'store'
  categoryId: categoryId    // WRONG! Use 'category'
})
```

### Video Model
```typescript
// ❌ WRONG - Will not find anything
Video.find({
  productId: productId      // WRONG! Use 'products' array
})
```

### Order Model
```typescript
// ❌ WRONG - Will not find anything
Order.find({
  userId: userId            // WRONG! Use 'user'
})
```

### Review Model
```typescript
// ❌ WRONG - Will not find anything
Review.find({
  storeId: storeId,        // WRONG! Use 'store'
  productId: productId,    // WRONG! Reviews don't have productId
  userId: userId           // WRONG! Use 'user'
})
```

### Wishlist Model
```typescript
// ❌ WRONG - Will not find anything
Wishlist.find({
  userId: userId           // WRONG! Use 'user'
})
```

---

## Legacy Models (Different Pattern)

Some older models intentionally use the `Id` suffix. **These are correct as-is:**

### TableBooking Model
```typescript
// ✅ CORRECT (Legacy naming)
TableBooking.find({
  storeId: storeId,      // Correct for this model
  userId: userId         // Correct for this model
})
```

### StoreVisit Model
```typescript
// ✅ CORRECT (Legacy naming)
StoreVisit.find({
  storeId: storeId,      // Correct for this model
  userId: userId         // Correct for this model
})
```

---

## Common Patterns

### Creating New Documents

```typescript
// ✅ CORRECT - Product
const product = new Product({
  name: 'Product Name',
  store: storeObjectId,           // Use 'store'
  category: categoryObjectId,     // Use 'category'
  // ... other fields
});

// ✅ CORRECT - Order
const order = new Order({
  user: userObjectId,             // Use 'user'
  items: [{
    product: productObjectId,
    store: storeObjectId,
    // ... other fields
  }]
});

// ✅ CORRECT - Review
const review = new Review({
  store: storeObjectId,           // Use 'store'
  user: userObjectId,             // Use 'user'
  // ... other fields
});

// ✅ CORRECT - Wishlist
const wishlist = new Wishlist({
  user: userObjectId,             // Use 'user'
  items: [...]
});
```

### Aggregation Pipelines

```typescript
// ✅ CORRECT - Product Aggregation
Product.aggregate([
  {
    $match: {
      store: new mongoose.Types.ObjectId(storeId),      // Use 'store'
      category: new mongoose.Types.ObjectId(categoryId) // Use 'category'
    }
  },
  {
    $lookup: {
      from: 'stores',
      localField: 'store',      // Use 'store'
      foreignField: '_id',
      as: 'storeDetails'
    }
  }
]);

// ✅ CORRECT - Order Aggregation
Order.aggregate([
  {
    $match: {
      user: new mongoose.Types.ObjectId(userId)   // Use 'user'
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'user',       // Use 'user'
      foreignField: '_id',
      as: 'userDetails'
    }
  }
]);
```

### Update Operations

```typescript
// ✅ CORRECT - Update Product
await Product.updateOne(
  { _id: productId },
  {
    $set: {
      store: newStoreId,        // Use 'store'
      category: newCategoryId   // Use 'category'
    }
  }
);

// ✅ CORRECT - Update Order
await Order.updateOne(
  { _id: orderId },
  {
    $set: {
      user: newUserId,          // Use 'user'
      'items.0.store': newStoreId
    }
  }
);
```

---

## Verification Commands

Test your database field names:

```bash
# Run verification script
node verify-field-names.js
```

Or manually test in MongoDB shell:

```javascript
// Product collection
db.products.findOne({}, { store: 1, category: 1, storeId: 1, categoryId: 1 })
// Should have 'store' and 'category', NOT 'storeId' or 'categoryId'

// Order collection
db.orders.findOne({}, { user: 1, userId: 1 })
// Should have 'user', NOT 'userId'

// Review collection
db.reviews.findOne({}, { store: 1, user: 1, storeId: 1, userId: 1, productId: 1 })
// Should have 'store' and 'user', NOT 'storeId', 'userId', or 'productId'

// Video collection
db.videos.findOne({}, { products: 1, productId: 1 })
// Should have 'products' array, NOT 'productId'

// Wishlist collection
db.wishlists.findOne({}, { user: 1, userId: 1 })
// Should have 'user', NOT 'userId'
```

---

## Migration Guide (If Needed)

If you find your database uses the WRONG field names and need to migrate:

### Step 1: Backup Database
```bash
mongodump --uri="mongodb://..." --out=./backup
```

### Step 2: Rename Fields
```javascript
// Example: Rename 'storeId' to 'store' in products collection
db.products.updateMany(
  {},
  { $rename: { "storeId": "store", "categoryId": "category" } }
);

// Example: Rename 'userId' to 'user' in orders collection
db.orders.updateMany(
  {},
  { $rename: { "userId": "user" } }
);

// Example: Rename 'userId' to 'user' in reviews collection
db.reviews.updateMany(
  {},
  { $rename: { "storeId": "store", "userId": "user" } }
);

// Example: Rename 'userId' to 'user' in wishlists collection
db.wishlists.updateMany(
  {},
  { $rename: { "userId": "user" } }
);
```

### Step 3: Update Indexes
```javascript
// Drop old indexes
db.products.dropIndex({ storeId: 1 });
db.products.dropIndex({ categoryId: 1 });

// Create new indexes
db.products.createIndex({ store: 1 });
db.products.createIndex({ category: 1 });

// Similar for other collections...
```

### Step 4: Verify
```bash
node verify-field-names.js
```

---

## TypeScript Interfaces

Use these interfaces in your code:

```typescript
// ✅ CORRECT Product Interface
interface IProduct {
  store: Types.ObjectId;          // NOT storeId
  category: Types.ObjectId;       // NOT categoryId
  // ... other fields
}

// ✅ CORRECT Order Interface
interface IOrder {
  user: Types.ObjectId;           // NOT userId
  items: {
    product: Types.ObjectId;
    store: Types.ObjectId;
  }[];
}

// ✅ CORRECT Review Interface
interface IReview {
  store: Types.ObjectId;          // NOT storeId
  user: Types.ObjectId;           // NOT userId
  // ... other fields
}

// ✅ CORRECT Video Interface
interface IVideo {
  products: Types.ObjectId[];     // NOT productId
  stores: Types.ObjectId[];
  // ... other fields
}

// ✅ CORRECT Wishlist Interface
interface IWishlist {
  user: Types.ObjectId;           // NOT userId
  // ... other fields
}
```

---

## Summary

### Modern Models (Use these field names)
- ✅ `store` (not `storeId`)
- ✅ `category` (not `categoryId`)
- ✅ `user` (not `userId`)
- ✅ `products` array (not `productId`)

### Legacy Models (Keep existing field names)
- ⚠️ `storeId`, `userId` (in TableBooking, StoreVisit, etc.)

**When in doubt:** Check the model schema file in `src/models/` to see the exact field name used.
