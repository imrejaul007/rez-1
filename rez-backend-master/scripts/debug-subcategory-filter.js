const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const categories = db.collection('categories');
  const products = db.collection('products');
  const stores = db.collection('stores');

  console.log('=== DEBUG: SUBCATEGORY FILTER ISSUE ===\n');

  // Get Fashion category
  const fashion = await categories.findOne({ slug: 'fashion' });
  console.log('Fashion Category ID:', fashion._id.toString());
  console.log('Fashion childCategories:', fashion.childCategories?.length || 0);

  if (fashion.childCategories && fashion.childCategories.length > 0) {
    console.log('\nFashion childCategories (what frontend receives):');
    const childCategoryIds = [];
    for (const childId of fashion.childCategories) {
      const child = await categories.findOne({ _id: childId });
      console.log(`  - ${child?.name || 'NOT FOUND'}: ${childId.toString()}`);
      childCategoryIds.push(childId.toString());
    }

    // Get Fashion stores
    const fashionStores = await stores.find({
      category: fashion._id,
      isActive: true
    }).toArray();

    console.log('\n=== PRODUCTS IN FASHION STORES ===\n');

    for (const store of fashionStores) {
      const storeProducts = await products.find({
        store: store._id,
        isActive: true,
        isDeleted: { $ne: true }
      }).toArray();

      if (storeProducts.length > 0) {
        console.log(`Store: ${store.name}`);
        console.log(`Products: ${storeProducts.length}`);

        for (const p of storeProducts) {
          const subCatStr = p.subCategory?.toString() || 'NULL';
          const matchesChildCategory = childCategoryIds.includes(subCatStr);

          console.log(`  - ${p.name}`);
          console.log(`    subCategory: ${subCatStr}`);
          console.log(`    matches Fashion childCategory: ${matchesChildCategory ? 'YES ✓' : 'NO ✗'}`);

          if (!matchesChildCategory && p.subCategory) {
            // Check what category this subCategory actually belongs to
            const actualSubcat = await categories.findOne({ _id: p.subCategory });
            if (actualSubcat) {
              console.log(`    actual subcategory: ${actualSubcat.name} (parent: ${actualSubcat.parentCategory?.toString() || 'none'})`);
            }
          }
        }
        console.log('');
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
