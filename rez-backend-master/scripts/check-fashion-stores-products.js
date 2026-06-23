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

  console.log('=== CHECKING FASHION STORES & PRODUCTS ===\n');

  // Get Fashion category
  const fashionCat = await categories.findOne({ slug: 'fashion' });
  if (!fashionCat) {
    console.log('Fashion category not found!');
    await mongoose.disconnect();
    return;
  }

  console.log('Fashion Category ID:', fashionCat._id.toString());
  console.log('Fashion Category Name:', fashionCat.name);

  // Get stores in Fashion category
  const fashionStores = await stores.find({
    category: fashionCat._id,
    isActive: true
  }).toArray();

  console.log('\nFashion Stores:', fashionStores.length);

  for (const store of fashionStores) {
    console.log('\n--- Store:', store.name, '---');
    console.log('Store ID:', store._id.toString());
    console.log('Category:', store.category?.toString());

    // Check products for this store
    const storeProducts = await products.find({
      store: store._id,
      isDeleted: { $ne: true }
    }).toArray();

    console.log('Products count:', storeProducts.length);

    if (storeProducts.length > 0) {
      console.log('Sample products:');
      storeProducts.slice(0, 3).forEach(p => {
        console.log('  -', p.name, '| Price:', p.pricing?.selling);
      });
    }
  }

  // Also check: are there products with Fashion category but different store?
  console.log('\n=== PRODUCTS IN FASHION CATEGORY ===');
  const fashionProducts = await products.find({
    category: fashionCat._id,
    isDeleted: { $ne: true }
  }).toArray();

  console.log('Total products with Fashion category:', fashionProducts.length);

  // Check product distribution by store
  const productsByStore = {};
  fashionProducts.forEach(p => {
    const storeId = p.store?.toString() || 'no-store';
    productsByStore[storeId] = (productsByStore[storeId] || 0) + 1;
  });

  console.log('\nProducts distribution by store:');
  for (const [storeId, count] of Object.entries(productsByStore)) {
    const store = await stores.findOne({ _id: new mongoose.Types.ObjectId(storeId) });
    console.log(`  ${store?.name || storeId}: ${count} products`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
