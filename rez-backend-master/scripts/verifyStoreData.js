/**
 * Verify Store Data
 * Check a specific store has all required relationships
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

async function verifyStore(storeId) {
  try {
    console.log('\n🔍 Verifying store data...\n');

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db;

    // Get store
    const store = await db.collection('stores').findOne({ _id: new mongoose.Types.ObjectId(storeId) });

    if (!store) {
      console.log('❌ Store not found!');
      return;
    }

    console.log('🏪 STORE:', store.name);
    console.log('   ID:', storeId);
    console.log('   Owner:', store.owner || 'None');
    console.log('');

    // Get owner details
    if (store.owner) {
      const owner = await db.collection('users').findOne({ _id: store.owner });
      if (owner) {
        console.log('👤 OWNER DETAILS:');
        console.log('   Name:', owner.profile?.firstName || 'Unknown');
        console.log('   Phone:', owner.phoneNumber);
        console.log('   Role:', owner.role);
        console.log('');
      }
    }

    // Get videos
    const videos = await db.collection('videos').find({
      stores: new mongoose.Types.ObjectId(storeId)
    }).toArray();

    console.log('🎥 VIDEOS:', videos.length);
    videos.forEach((video, idx) => {
      console.log(`   ${idx + 1}. ${video.title}`);
      console.log(`      Type: ${video.contentType}`);
      console.log(`      Creator: ${video.creator}`);
      console.log(`      Products: ${video.products?.length || 0}`);
      console.log(`      Views: ${video.analytics?.totalViews || 0}`);
    });
    console.log('');

    // Get products
    const products = await db.collection('products').find({
      store: new mongoose.Types.ObjectId(storeId)
    }).toArray();

    console.log('📦 PRODUCTS:', products.length);
    products.forEach((product, idx) => {
      const price = product.pricing?.selling || product.price || 'N/A';
      console.log(`   ${idx + 1}. ${product.name} - ₹${price}`);
    });
    console.log('');

    // Summary
    console.log('✅ SUMMARY:');
    console.log(`   Store: ${store.name}`);
    console.log(`   Owner: ${store.owner ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   Videos: ${videos.length}`);
    console.log(`   Products: ${products.length}`);
    console.log('');

    if (store.owner && videos.length > 0 && products.length > 0) {
      console.log('🎉 Store is FULLY READY for frontend display!');
    } else {
      console.log('⚠️ Store is missing some data:');
      if (!store.owner) console.log('   - No owner');
      if (videos.length === 0) console.log('   - No videos');
      if (products.length === 0) console.log('   - No products');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Test with Royal Jewels Palace
const testStoreId = '69059ef3cdd7a84b808a74e0'; // Royal Jewels Palace
verifyStore(testStoreId)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
