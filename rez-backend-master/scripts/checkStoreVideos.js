const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function checkStoreVideos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false, collection: 'stores' }));

    // Get ALL stores
    const stores = await Store.find({}).lean();
    console.log(`📊 Total stores found: ${stores.length}\n`);
    console.log('='.repeat(100));

    if (stores.length === 0) {
      console.log('⚠️ No stores found in database');
      await mongoose.connection.close();
      return;
    }

    let storesWithVideos = 0;
    let totalVideos = 0;
    const storeVideoData = [];

    // Check each store
    for (const store of stores) {
      const storeId = store._id.toString();
      const storeName = store.name || 'Unnamed Store';
      const videos = store.videos || [];
      const videoCount = Array.isArray(videos) ? videos.length : 0;

      console.log(`\n🏪 Store: ${storeName}`);
      console.log(`📍 ID: ${storeId}`);
      console.log(`🎥 Videos: ${videoCount}`);

      if (videoCount > 0) {
        storesWithVideos++;
        totalVideos += videoCount;
        storeVideoData.push({ name: storeName, id: storeId, count: videoCount });

        console.log(`\n   📹 Video Details:`);
        videos.forEach((video, index) => {
          console.log(`\n   Video ${index + 1}:`);
          console.log(`      Title: ${video.title || 'Untitled'}`);
          console.log(`      URL: ${video.url || 'No URL'}`);
          console.log(`      Thumbnail: ${video.thumbnail || 'No thumbnail'}`);
          console.log(`      Duration: ${video.duration || 'Unknown'} seconds`);
          console.log(`      Views: ${video.views || 0}`);
          if (video.description) {
            console.log(`      Description: ${video.description.substring(0, 60)}...`);
          }
        });
      }

      // Show other store info
      console.log(`\n   📊 Store Info:`);
      console.log(`      Description: ${store.description ? '✅ Yes' : '❌ No'}`);
      console.log(`      Banner: ${store.banner ? '✅ Yes' : '❌ No'}`);
      console.log(`      Logo: ${store.logo ? '✅ Yes' : '❌ No'}`);
      console.log(`      Contact: ${store.contact || store.phone || '❌ No'}`);
      console.log(`      Category: ${store.category || '❌ No'}`);
      console.log(`      Rating: ${store.ratings?.average || 0} (${store.ratings?.count || 0} reviews)`);
      if (store.offers?.cashback) {
        console.log(`      Cashback: ${store.offers.cashback}%`);
      }

      console.log('\n' + '-'.repeat(100));
    }

    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('\n📊 SUMMARY:\n');
    console.log(`   Total Stores: ${stores.length}`);
    console.log(`   Stores WITH Videos: ${storesWithVideos}`);
    console.log(`   Stores WITHOUT Videos: ${stores.length - storesWithVideos}`);
    console.log(`   Total Videos: ${totalVideos}`);
    console.log(`   Average Videos per Store: ${(totalVideos / stores.length).toFixed(2)}`);

    if (storesWithVideos > 0) {
      console.log('\n✅ STORES WITH VIDEOS:\n');
      storeVideoData.forEach(({ name, id, count }) => {
        console.log(`   • ${name}`);
        console.log(`     ID: ${id}`);
        console.log(`     Videos: ${count}\n`);
      });
    }

    if (stores.length - storesWithVideos > 0) {
      console.log('\n⚠️ STORES WITHOUT VIDEOS:\n');
      for (const store of stores) {
        const videos = store.videos || [];
        if (videos.length === 0) {
          console.log(`   • ${store.name || 'Unnamed Store'} (${store._id})`);
        }
      }
    }

    console.log('\n' + '='.repeat(100));

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkStoreVideos();
