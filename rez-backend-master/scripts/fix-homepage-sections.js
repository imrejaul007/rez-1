const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';
const MERCHANT_ID = new mongoose.Types.ObjectId('68aaa623d4ae0ab11dc2436f');

// Reliable Unsplash images by category
const categoryImages = {
  'Electronics': [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
  ],
  'Fashion & Beauty': [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop',
  ],
  'Food & Dining': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',
  ],
  'Home & Living': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
  ],
  'Grocery & Essentials': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&h=400&fit=crop',
  ],
  'Sports & Fitness': [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
  ],
  'Books & Stationery': [
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=400&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  ]
};

function getImageForCategory(categoryName) {
  const images = categoryImages[categoryName] || categoryImages['default'];
  return images[Math.floor(Math.random() * images.length)];
}

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  const products = db.collection('products');
  const categories = db.collection('categories');
  const stores = db.collection('stores');

  console.log('=== FIXING HOMEPAGE SECTIONS & IMAGES ===\n');

  // Get all categories
  const allCategories = await categories.find({}).toArray();
  const allStores = await stores.find({ isActive: true }).toArray();

  // Step 1: Update products for homepage sections
  console.log('Step 1: Updating products for homepage sections...');

  const allProductIds = await products.find({ isDeleted: { $ne: true } }).project({ _id: 1 }).toArray();
  const productIdList = allProductIds.map(p => p._id);
  const shuffled = productIdList.sort(() => Math.random() - 0.5);

  // New Arrivals: 30 products - update createdAt to recent
  const newArrivals = shuffled.slice(0, 30);
  for (const id of newArrivals) {
    const randomDays = Math.floor(Math.random() * 7);
    const recentDate = new Date(Date.now() - randomDays * 24 * 60 * 60 * 1000);
    await products.updateOne(
      { _id: id },
      {
        $set: { createdAt: recentDate },
        $addToSet: { tags: 'new-arrival' }
      }
    );
  }
  console.log('Marked 30 products as new arrivals');

  // Just For You: 50 products with high ratings
  const justForYou = shuffled.slice(30, 80);
  for (const id of justForYou) {
    const highRating = (Math.random() * 0.5 + 4.5).toFixed(1) * 1;
    await products.updateOne(
      { _id: id },
      {
        $set: {
          'ratings.average': highRating,
          'analytics.views': Math.floor(Math.random() * 500) + 500
        },
        $addToSet: { tags: 'recommended' }
      }
    );
  }
  console.log('Marked 50 products for Just For You section');

  // Featured Products: 40 products
  const featured = shuffled.slice(80, 120);
  for (const id of featured) {
    await products.updateOne(
      { _id: id },
      {
        $set: {
          isFeatured: true,
          visibility: 'featured'
        },
        $addToSet: { tags: 'featured' }
      }
    );
  }
  console.log('Marked 40 products as featured');

  // Best Sellers: 30 products with high purchases
  const bestSellers = shuffled.slice(120, 150);
  for (const id of bestSellers) {
    await products.updateOne(
      { _id: id },
      {
        $set: {
          'analytics.purchases': Math.floor(Math.random() * 500) + 200
        },
        $addToSet: { tags: 'best-seller' }
      }
    );
  }
  console.log('Marked 30 products as best sellers');

  // Trending: 25 products
  const trending = shuffled.slice(150, 175);
  for (const id of trending) {
    await products.updateOne(
      { _id: id },
      {
        $set: {
          'analytics.views': Math.floor(Math.random() * 1000) + 800,
          'analytics.shareCount': Math.floor(Math.random() * 100) + 50
        },
        $addToSet: { tags: 'trending' }
      }
    );
  }
  console.log('Marked 25 products as trending');

  // Step 2: Update product images
  console.log('\nStep 2: Updating product images...');

  const productsToUpdate = await products.find({
    isDeleted: { $ne: true },
    $or: [
      { images: { $size: 0 } },
      { 'images.0': { $exists: false } },
      { 'images.0': { $regex: /placeholder/i } }
    ]
  }).toArray();

  let imagesUpdated = 0;
  for (const product of productsToUpdate) {
    const cat = allCategories.find(c => c._id.toString() === product.category?.toString());
    const catName = cat?.name || 'default';
    const newImage = getImageForCategory(catName);

    await products.updateOne(
      { _id: product._id },
      { $set: { images: [newImage] } }
    );
    imagesUpdated++;
  }
  console.log(`Updated images for ${imagesUpdated} products`);

  // Step 3: Ensure merchantId is set on all products
  console.log('\nStep 3: Ensuring merchantId on all products...');
  const merchantUpdate = await products.updateMany(
    { $or: [{ merchantId: { $exists: false } }, { merchantId: null }] },
    { $set: { merchantId: MERCHANT_ID } }
  );
  console.log(`Updated merchantId on ${merchantUpdate.modifiedCount} products`);

  // Step 4: Validate store references
  console.log('\nStep 4: Validating store references...');
  const storeIds = allStores.map(s => s._id);

  const orphanProducts = await products.find({
    isDeleted: { $ne: true },
    store: { $nin: storeIds }
  }).toArray();

  if (orphanProducts.length > 0) {
    console.log(`Found ${orphanProducts.length} orphan products, reassigning...`);
    for (const product of orphanProducts) {
      const randomStore = allStores[Math.floor(Math.random() * allStores.length)];
      await products.updateOne(
        { _id: product._id },
        { $set: { store: randomStore._id } }
      );
    }
  } else {
    console.log('All products have valid store references');
  }

  // Final Summary
  console.log('\n=== MIGRATION COMPLETE ===\n');

  const finalStats = {
    totalProducts: await products.countDocuments({ isDeleted: { $ne: true } }),
    activeProducts: await products.countDocuments({ isActive: true, isDeleted: { $ne: true } }),
    featuredProducts: await products.countDocuments({ isFeatured: true, isDeleted: { $ne: true } }),
    productsWithSubcategory: await products.countDocuments({ subCategory: { $ne: null }, isDeleted: { $ne: true } }),
    newArrivals: await products.countDocuments({ tags: 'new-arrival', isDeleted: { $ne: true } }),
    recommended: await products.countDocuments({ tags: 'recommended', isDeleted: { $ne: true } }),
    bestSellers: await products.countDocuments({ tags: 'best-seller', isDeleted: { $ne: true } }),
    trending: await products.countDocuments({ tags: 'trending', isDeleted: { $ne: true } }),
    storesWithProducts: (await products.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$store' } }
    ]).toArray()).length
  };

  console.log('Total Products:', finalStats.totalProducts);
  console.log('Active Products:', finalStats.activeProducts);
  console.log('Featured Products:', finalStats.featuredProducts);
  console.log('Products with Subcategory:', finalStats.productsWithSubcategory);
  console.log('');
  console.log('Homepage Sections:');
  console.log('  - New Arrivals:', finalStats.newArrivals);
  console.log('  - Recommended (Just For You):', finalStats.recommended);
  console.log('  - Best Sellers:', finalStats.bestSellers);
  console.log('  - Trending:', finalStats.trending);
  console.log('');
  console.log('Stores with Products:', finalStats.storesWithProducts, '/', allStores.length);

  await mongoose.disconnect();
}

run().catch(console.error);
