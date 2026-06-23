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

  console.log('=== PRODUCT DATABASE CHECK ===\n');

  // 1. Count products
  const totalProducts = await products.countDocuments({});
  const activeProducts = await products.countDocuments({ isActive: true });
  const featuredProducts = await products.countDocuments({ isFeatured: true });
  const deletedProducts = await products.countDocuments({ isDeleted: true });

  console.log('Total products:', totalProducts);
  console.log('Active products:', activeProducts);
  console.log('Featured products:', featuredProducts);
  console.log('Soft-deleted products:', deletedProducts);

  // 2. Check stores
  const allStores = await stores.find({}).toArray();
  console.log('\n=== STORE STATUS ===');
  console.log('Total stores:', allStores.length);

  // Check which stores have products
  const storeProductCounts = await products.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$store', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const storesWithProducts = storeProductCounts.length;
  const storesWithoutProducts = allStores.length - storesWithProducts;

  console.log('Stores with products:', storesWithProducts);
  console.log('Stores without products:', storesWithoutProducts);

  // 3. Sample products
  if (totalProducts > 0) {
    console.log('\n=== SAMPLE PRODUCTS (first 5) ===');
    const sampleProducts = await products.find({}).limit(5).toArray();
    sampleProducts.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.name}`);
      console.log('   Store:', p.store);
      console.log('   Category:', p.category);
      console.log('   SubCategory:', p.subCategory || 'none');
      console.log('   MerchantId:', p.merchantId || 'none');
      console.log('   Price:', p.pricing?.selling || p.price?.current || 'N/A');
      console.log('   Images:', p.images?.length || 0);
      console.log('   isActive:', p.isActive);
      console.log('   isFeatured:', p.isFeatured);
    });
  }

  // 4. Get categories structure for reference
  console.log('\n=== CATEGORIES WITH SUBCATEGORIES ===');
  const parentCats = await categories.find({ parentCategory: null }).toArray();
  const childCats = await categories.find({ parentCategory: { $ne: null } }).toArray();

  console.log('Parent categories:', parentCats.length);
  console.log('Subcategories:', childCats.length);

  // Show first 10 parent-child relationships
  console.log('\n--- Sample category structure ---');
  for (let i = 0; i < Math.min(10, parentCats.length); i++) {
    const parent = parentCats[i];
    const children = childCats.filter(c => c.parentCategory?.toString() === parent._id.toString());
    console.log(`\n${parent.name} (${children.length} subcategories)`);
    children.slice(0, 3).forEach(c => console.log(`  - ${c.name}`));
    if (children.length > 3) console.log(`  ... and ${children.length - 3} more`);
  }

  // 5. Check merchant ID
  console.log('\n=== MERCHANT CHECK ===');
  const merchantId = '68aaa623d4ae0ab11dc2436f';
  const storesWithMerchant = await stores.countDocuments({ merchant: new mongoose.Types.ObjectId(merchantId) });
  console.log('Stores with merchant ' + merchantId + ':', storesWithMerchant);

  // 6. Products by category distribution
  console.log('\n=== PRODUCTS BY CATEGORY ===');
  const productsByCategory = await products.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();

  for (const pc of productsByCategory) {
    const cat = await categories.findOne({ _id: pc._id });
    console.log(`${cat?.name || 'Unknown'}: ${pc.count} products`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
