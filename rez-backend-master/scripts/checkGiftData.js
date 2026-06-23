const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Schemas
const CategorySchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });
const StoreSchema = new mongoose.Schema({}, { strict: false });

const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);
const Store = mongoose.model('Store', StoreSchema);

(async function checkGiftData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎁 CHECKING GIFT CATEGORY DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check Gift category
    const giftCategory = await Category.findOne({ slug: 'gift' });
    
    if (!giftCategory) {
      console.log('❌ Gift category does NOT exist!\n');
      process.exit(0);
    }

    console.log(`✅ Gift category exists: ${giftCategory.name} (${giftCategory._id})\n`);

    // Check Gift stores
    console.log('🏪 Checking Gift Stores:\n');
    const giftStores = await Store.find({
      $or: [
        { tags: { $in: ['gift', 'present', 'occasion', 'celebration'] } },
        { name: { $regex: /gift|present|celebration/i } }
      ],
      isActive: true
    });

    console.log(`📦 Total Gift Stores: ${giftStores.length}`);
    giftStores.forEach((store, i) => {
      console.log(`   ${i + 1}. ${store.name}`);
      console.log(`      Featured: ${store.isFeatured}`);
      console.log(`      Tags: ${store.tags?.join(', ') || 'none'}`);
      console.log(`      Cashback: ${store.offers?.cashback || 0}%`);
    });

    // Check Gift products
    console.log('\n📦 Checking Gift Products:\n');
    const giftProducts = await Product.find({ 
      category: giftCategory._id,
      isActive: true
    });

    console.log(`📦 Total Gift Products: ${giftProducts.length}`);
    const featuredProducts = giftProducts.filter(p => p.isFeatured);
    console.log(`⭐ Featured Products: ${featuredProducts.length}`);
    
    giftProducts.forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.name}`);
      console.log(`      Featured: ${product.isFeatured}`);
      console.log(`      Store: ${product.store}`);
      console.log(`      Price: ₹${product.pricing?.selling || 0}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
})();

