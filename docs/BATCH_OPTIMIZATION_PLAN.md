# Database Batch Write Optimization - Implementation Plan

## Audit Summary

This document outlines the plan to optimize database write operations by replacing sequential individual writes with efficient bulk operations.

---

## Current State Analysis

### Already Using Bulk Operations ✅

| File | Pattern | Status |
|------|---------|--------|
| `initPersonaProfiles.ts` | `bulkWrite()` with `updateOne` in batches of 200 | ✅ Good |
| `BulkProductService.ts` | Outer batch loop of 100 | ⚠️ Partial |
| `bulkImportService.ts` | Batch validation, parallel row processing | ⚠️ Partial |

### Needs Optimization 🔴

| Location | Pattern | Priority |
|----------|---------|----------|
| `seeds/seedDemoData.ts` | Sequential `findOneAndUpdate` in for loops | HIGH |
| `seeds/dubaiStoreSeeds.ts` | Sequential find + create for stores/products | HIGH |
| `seeds/bangaloreStoreSeed.ts` | Sequential find + create for stores | MEDIUM |
| `seeds/categoryPageSeeds.ts` | Sequential upserts in nested loops | HIGH |
| `seeds/campaignTemplateSeeds.ts` | Sequential `updateOne` in loop | MEDIUM |
| `BulkProductService.ts` | Individual saves inside batch loop (line 344-414) | HIGH |
| `bulkImportService.ts` | Individual row saves (line 445-450) | HIGH |

---

## Implementation Plan

### Phase 1: Seed Files Optimization

#### 1.1 `seedDemoData.ts` - Batch Upserts

**Current Pattern (Lines ~152-174, 566-659, 1137-1205, etc.):**
```typescript
// Sequential individual upserts
for (const cat of CORE_CATEGORIES) {
  await Category.findOneAndUpdate({ slug: cat.slug }, { $setOnInsert: {...} }, { upsert: true });
}
```

**Optimized Pattern:**
```typescript
// Bulk upsert using bulkWrite
const ops = CORE_CATEGORIES.map(cat => ({
  updateOne: {
    filter: { slug: cat.slug },
    update: { $setOnInsert: {...} },
    upsert: true
  }
}));
await Category.bulkWrite(ops, { ordered: false });
```

**Affected Functions:**
- `seedCategories()` - ~10 operations
- `seedStores()` - ~20 operations
- `seedOffers()` - ~35 operations
- `seedFlashSales()` - ~5 operations
- `seedBonusCampaigns()` - ~5 operations
- `seedLockPriceDeals()` - ~10 operations
- `seedTrialOffers()` - ~15 operations
- `seedVoucherBrands()` - ~10 operations
- `seedHeroBanners()` - ~3 operations

**Estimated Improvement:** ~100 sequential DB calls → ~9 bulk calls (91% reduction)

---

#### 1.2 `dubaiStoreSeeds.ts` - Batch Creates

**Current Pattern (Lines ~529-573, ~576-620):**
```typescript
for (const storeSeed of dubaiStoreSeeds) {
  const existing = await Store.findOne({ slug: storeSeed.slug });
  if (!existing) await Store.create({...});
}
```

**Optimized Pattern:**
```typescript
// 1. Fetch all existing slugs in one query
const existingSlugs = new Set(
  (await Store.find({ slug: { $in: dubaiStoreSeeds.map(s => s.slug) } }, { slug: 1 }).lean())
    .map(s => s.slug)
);

// 2. Prepare bulk insert
const toCreate = dubaiStoreSeeds.filter(s => !existingSlugs.has(s.slug));
if (toCreate.length > 0) {
  await Store.insertMany(toCreate.map(s => ({...})));
}
```

**Estimated Improvement:** ~50 queries + ~25 inserts → ~2 queries + 1 bulk insert

---

#### 1.3 `categoryPageSeeds.ts` - Batch Operations

**Current Pattern (Lines ~473-498, ~503-505):**
```typescript
for (const sub of data.subcategories) {
  let subCat = await Category.findOne({ slug: sub.slug });
  if (!subCat) subCat = await Category.create({...});
}
```

**Optimized Pattern:**
```typescript
// Batch upsert for all subcategories
const subOps = data.subcategories.map(sub => ({
  updateOne: {
    filter: { slug: sub.slug },
    update: { $setOnInsert: {...} },
    upsert: true
  }
}));
await Category.bulkWrite(subOps);
```

---

#### 1.4 `campaignTemplateSeeds.ts` - Bulk Upsert

**Current Pattern (Lines ~139-143):**
```typescript
for (const t of TEMPLATES) {
  await CampaignTemplate.updateOne({ templateId: t.templateId }, { $set: t }, { upsert: true });
}
```

**Optimized Pattern:**
```typescript
const ops = TEMPLATES.map(t => ({
  updateOne: {
    filter: { templateId: t.templateId },
    update: { $set: t },
    upsert: true
  }
}));
await CampaignTemplate.bulkWrite(ops);
```

---

### Phase 2: Bulk Import Service Optimization

#### 2.1 `BulkProductService.ts` - Batch Product Creation

**Current Pattern (Lines 339-415):**
```typescript
for (let i = 0; i < products.length; i += batchSize) {
  const batch = products.slice(i, i + batchSize);
  for (let j = 0; j < batch.length; j++) {
    // Individual save for each product
    const merchantProduct = new MProduct(productData);
    await merchantProduct.save({ session });
    await this.createUserSideProduct(merchantProduct, ...);
  }
}
```

**Optimized Pattern:**
```typescript
// 1. Collect all valid products first
const validProducts = [];
for (const row of products) {
  // Validate and prepare data
  validProducts.push(preparedData);
}

// 2. Bulk insert merchant products
const merchantProducts = await MProduct.insertMany(
  validProducts.map(p => new MProduct(p)),
  { session, ordered: false }
);

// 3. Bulk insert user-side products
const userProducts = await Product.insertMany(
  merchantProducts.map((mp, idx) => prepareUserProduct(mp, validProducts[idx])),
  { session, ordered: false }
);
```

**Estimated Improvement:** 1000 products = 1000 individual saves → 2 bulk inserts (99.8% reduction in queries)

---

#### 2.2 `bulkImportService.ts` - Batch Processing

**Current Pattern (Lines 445-450):**
```typescript
const processedBatch = await Promise.all(
  validatedBatch.map(row =>
    row.status === 'error' ? Promise.resolve(row) : this.processProductRow(row, storeId, merchantId)
  )
);
```

**Optimized Pattern:**
```typescript
// Separate errors from valid rows
const validRows = processedBatch.filter(r => r.status !== 'error');
const errorRows = processedBatch.filter(r => r.status === 'error');

// Bulk create all products at once
const createdProducts = await Product.insertMany(
  validRows.map(r => prepareProductData(r)),
  { ordered: false }
);

// Update with IDs
const results = validRows.map((row, idx) => ({
  ...row,
  productId: createdProducts[idx]._id,
  action: 'created'
}));
```

---

### Phase 3: Transaction Safety

All batch operations must:

1. **Wrap in MongoDB transactions**
2. **Use `ordered: false`** for bulk operations (continue on error)
3. **Handle partial failures gracefully**
4. **Log errors with context**

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const result = await Model.bulkWrite(ops, { session, ordered: false });
  await session.commitTransaction();
  return result;
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

### Phase 4: Chunking for Large Datasets

**Configurable batch sizes:**
```typescript
const BATCH_SIZES = {
  SMALL: 100,      // Default for most operations
  MEDIUM: 500,     // For large seed files
  LARGE: 1000,     // For bulk imports (MongoDB limit)
};

async function processInChunks<T>(
  items: T[],
  batchSize: number,
  processor: (chunk: T[]) => Promise<any>
): Promise<any[]> {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const result = await processor(chunk);
    results.push(result);
  }
  return results;
}
```

---

## Files to Modify

### Primary Changes

| File | Changes | Priority |
|------|---------|----------|
| `seeds/seedDemoData.ts` | Replace sequential `findOneAndUpdate` with `bulkWrite` | HIGH |
| `seeds/dubaiStoreSeeds.ts` | Batch fetch + bulk insert | HIGH |
| `seeds/categoryPageSeeds.ts` | Batch upserts for subcategories | MEDIUM |
| `seeds/campaignTemplateSeeds.ts` | Replace loop with `bulkWrite` | MEDIUM |
| `BulkProductService.ts` | Replace inner loop saves with `insertMany` | HIGH |
| `bulkImportService.ts` | Bulk create instead of row-by-row | HIGH |

### Secondary Changes (Optional)

| File | Changes | Priority |
|------|---------|----------|
| `merchantservices/AnalyticsService.ts` | N+1 query patterns | LOW |
| Other services with sequential writes | Case-by-case review | LOW |

### Status Update (2026-06-26) ✅

All HIGH and MEDIUM priority items have been completed:

- [x] `seedDemoData.ts` - bulkWrite ✅
- [x] `dubaiStoreSeeds.ts` - Batch fetch + insertMany ✅
- [x] `categoryPageSeeds.ts` - bulkWrite ✅
- [x] `campaignTemplateSeeds.ts` - bulkWrite ✅
- [x] `BulkProductService.ts` - insertMany ✅
- [x] `bulkImportService.ts` - bulkWrite + insertMany ✅
- [x] `orderLifecycleJobs.ts` - bulkWrite for order recovery ✅
- [x] `seedProducts.ts` - insertMany for products ✅

---

## Performance Targets

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| `seedDemoData.ts` | ~100 DB calls | ~10 calls | **90% reduction** |
| `dubaiStoreSeeds.ts` | ~75 DB calls | ~3 calls | **96% reduction** |
| Bulk import (1000 products) | ~2000 calls | ~5 calls | **99.75% reduction** |
| `initPersonaProfiles.ts` | Already optimized | - | - |

---

## Implementation Order

1. **Phase 1.1:** `seedDemoData.ts` - Highest impact, most operations
2. **Phase 1.2:** `dubaiStoreSeeds.ts` - Straightforward optimization
3. **Phase 1.3:** `categoryPageSeeds.ts` - Nested loop optimization
4. **Phase 1.4:** `campaignTemplateSeeds.ts` - Simple change
5. **Phase 2.1:** `BulkProductService.ts` - Critical for merchant imports
6. **Phase 2.2:** `bulkImportService.ts` - Critical for product imports

---

## Validation Checklist

After implementation:

- [ ] All seed scripts still produce identical data
- [ ] Bulk imports complete successfully
- [ ] Transaction rollback works on errors
- [ ] No duplicate records created
- [ ] All hooks/middleware still execute
- [ ] Performance improvement verified (DB call count reduced)
- [ ] Memory usage remains stable for large datasets
- [ ] Error messages are descriptive and actionable

---

## Estimated Development Time

| Phase | Complexity | Estimated Time |
|-------|------------|-----------------|
| Phase 1.1 | High | 2-3 hours |
| Phase 1.2 | Medium | 1-2 hours |
| Phase 1.3 | Medium | 1-2 hours |
| Phase 1.4 | Low | 30 min |
| Phase 2.1 | High | 2-3 hours |
| Phase 2.2 | High | 2-3 hours |

**Total:** ~10-15 hours development time

**Estimated Performance Gain:** 90-99% reduction in database round trips for batch operations.
