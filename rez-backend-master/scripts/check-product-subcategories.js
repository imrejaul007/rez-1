const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const products = db.collection('products');
  const stores = db.collection('stores');
  const categories = db.collection('categories');

  console.log('=== CHECKING PRODUCT SUBCATEGORIES ===\n');

  // Get Fashion category and its subcategories
  const fashionCat = await categories.findOne({ slug: 'fashion' });
  console.log('Fashion Category ID:', fashionCat._id.toString());

  // Get Fashion subcategories
  const fashionSubcats = await categories.find({
    parentCategory: fashionCat._id
  }).toArray();

  console.log('\nFashion Subcategories:');
  fashionSubcats.forEach(s => {
    console.log(`  - ${s.name}: ${s._id.toString()}`);
  });

  // Get Fashion stores
  const fashionStores = await stores.find({
    category: fashionCat._id,
    isActive: true
  }).toArray();

  console.log('\n=== PRODUCTS IN FASHION STORES ===\n');

  for (const store of fashionStores) {
    console.log(`Store: ${store.name}`);

    const storeProducts = await products.find({
      store: store._id,
      isDeleted: { $ne: true }
    }).toArray();

    console.log(`Products: ${storeProducts.length}`);

    storeProducts.forEach(p => {
      const subCatId = p.subCategory?.toString() || 'NULL';
      const matchingSubcat = fashionSubcats.find(s => s._id.toString() === subCatId);
      console.log(`  - ${p.name}`);
      console.log(`    subCategory: ${subCatId}`);
      console.log(`    matches: ${matchingSubcat?.name || 'NO MATCH'}`);
    });

    console.log('');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
