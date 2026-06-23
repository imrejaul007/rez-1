const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function checkStoreConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get sample stores
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
    const stores = await Store.find().limit(3);

    console.log('\n📊 Found', stores.length, 'stores in database\n');

    stores.forEach((store, index) => {
      console.log('Store', index + 1, ':', {
        id: store._id.toString(),
        name: store.name,
        slug: store.slug,
        hasLogo: !!store.logo,
        hasVideos: !!store.videos && store.videos.length > 0,
        videoCount: store.videos?.length || 0,
        hasLocation: !!store.location,
        hasRating: !!store.ratings || !!store.rating
      });
    });

    // Check if any store has videos
    const storeWithVideos = await Store.findOne({ videos: { $exists: true, $ne: [] } });
    console.log('\n🎥 Store with videos:', storeWithVideos ? 'Found' : 'None found');

    if (storeWithVideos) {
      console.log('   Videos:', storeWithVideos.videos);
    }

    // Get a sample product to check store reference
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    const product = await Product.findOne().populate('store');

    if (product) {
      console.log('\n📦 Sample Product:', {
        id: product._id.toString(),
        name: product.name || product.title,
        storeId: product.store?._id?.toString() || product.store?.toString(),
        storeName: product.store?.name || 'Not populated',
        storeIsPopulated: typeof product.store === 'object'
      });
    }

    // Check a specific store used in seeding
    const specificStore = await Store.findOne({ name: 'TechMart Electronics' });
    if (specificStore) {
      console.log('\n🏪 TechMart Electronics:', {
        id: specificStore._id.toString(),
        name: specificStore.name,
        hasVideos: !!specificStore.videos && specificStore.videos.length > 0
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkStoreConnection();
