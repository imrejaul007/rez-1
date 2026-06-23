/**
 * Migrate Store Relationships
 *
 * This script fixes the database by:
 * 1. Linking merchants to stores as owners
 * 2. Linking unlinked videos to stores
 * 3. Linking videos to products where possible
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

async function migrateData() {
  try {
    console.log('\n🔄 Starting migration...\n');
    console.log('🔍 Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });

    console.log('✅ Connected to MongoDB!\n');

    const db = mongoose.connection.db;

    // Collections
    const storesCollection = db.collection('stores');
    const usersCollection = db.collection('users');
    const videosCollection = db.collection('videos');
    const productsCollection = db.collection('products');

    // Step 1: Link merchants to stores
    console.log('🏪 STEP 1: Linking merchants to stores...\n');

    const merchants = await usersCollection.find({ role: 'merchant' }).toArray();
    const stores = await storesCollection.find({ owner: { $exists: false } }).toArray();

    console.log(`Found ${merchants.length} merchants`);
    console.log(`Found ${stores.length} stores without owners`);

    if (merchants.length > 0 && stores.length > 0) {
      let storeIndex = 0;
      let linkedCount = 0;

      for (const merchant of merchants) {
        // Each merchant can own multiple stores (3-5 stores per merchant)
        const storesToAssign = Math.min(4, stores.length - storeIndex); // Assign up to 4 stores per merchant

        for (let i = 0; i < storesToAssign && storeIndex < stores.length; i++) {
          const store = stores[storeIndex];

          await storesCollection.updateOne(
            { _id: store._id },
            { $set: { owner: merchant._id } }
          );

          console.log(`  ✅ Linked ${merchant.profile?.firstName || 'Merchant'} to ${store.name}`);
          linkedCount++;
          storeIndex++;
        }
      }

      console.log(`\n  ✅ Linked ${linkedCount} stores to merchants\n`);
    } else {
      console.log('  ⚠️ No merchants or stores to link\n');
    }

    // Step 2: Link videos to stores
    console.log('🎥 STEP 2: Linking videos to stores...\n');

    const videosWithoutStores = await videosCollection.find({
      $or: [
        { stores: { $exists: false } },
        { stores: [] }
      ]
    }).toArray();

    console.log(`Found ${videosWithoutStores.length} videos without stores`);

    if (videosWithoutStores.length > 0) {
      const allStores = await storesCollection.find({}).toArray();
      let linkedVideos = 0;

      for (const video of videosWithoutStores) {
        // Strategy: Link video to stores based on products or random selection
        let storesToLink = [];

        // If video has products, link to those product stores
        if (video.products && video.products.length > 0) {
          const products = await productsCollection.find({
            _id: { $in: video.products }
          }).toArray();

          storesToLink = products
            .map(p => p.store)
            .filter(storeId => storeId && mongoose.Types.ObjectId.isValid(storeId));
        }

        // If no stores from products, assign 1-2 random stores
        if (storesToLink.length === 0) {
          const randomStoreCount = Math.floor(Math.random() * 2) + 1; // 1-2 stores
          for (let i = 0; i < randomStoreCount && i < allStores.length; i++) {
            const randomStore = allStores[Math.floor(Math.random() * allStores.length)];
            if (!storesToLink.includes(randomStore._id)) {
              storesToLink.push(randomStore._id);
            }
          }
        }

        if (storesToLink.length > 0) {
          await videosCollection.updateOne(
            { _id: video._id },
            { $set: { stores: storesToLink } }
          );

          console.log(`  ✅ Linked video "${video.title?.substring(0, 40)}..." to ${storesToLink.length} store(s)`);
          linkedVideos++;
        }
      }

      console.log(`\n  ✅ Linked ${linkedVideos} videos to stores\n`);
    } else {
      console.log('  ✅ All videos already linked to stores\n');
    }

    // Step 3: Link videos to products
    console.log('📦 STEP 3: Linking videos to products...\n');

    const videosWithoutProducts = await videosCollection.find({
      $or: [
        { products: { $exists: false } },
        { products: [] }
      ]
    }).toArray();

    console.log(`Found ${videosWithoutProducts.length} videos without products`);

    if (videosWithoutProducts.length > 0) {
      let linkedProducts = 0;

      for (const video of videosWithoutProducts) {
        // Strategy: Find products from video's stores
        let productsToLink = [];

        if (video.stores && video.stores.length > 0) {
          // Get 1-3 random products from video's stores
          const storeProducts = await productsCollection.find({
            store: { $in: video.stores }
          }).limit(50).toArray(); // Get up to 50 to choose from

          if (storeProducts.length > 0) {
            const productCount = Math.min(3, storeProducts.length);
            const shuffled = storeProducts.sort(() => 0.5 - Math.random());
            productsToLink = shuffled.slice(0, productCount).map(p => p._id);
          }
        }

        if (productsToLink.length > 0) {
          await videosCollection.updateOne(
            { _id: video._id },
            { $set: { products: productsToLink } }
          );

          console.log(`  ✅ Linked video "${video.title?.substring(0, 40)}..." to ${productsToLink.length} product(s)`);
          linkedProducts++;
        }
      }

      console.log(`\n  ✅ Linked ${linkedProducts} videos to products\n`);
    } else {
      console.log('  ✅ All videos already linked to products\n');
    }

    // Step 4: Verification
    console.log('✅ STEP 4: Verifying migration...\n');

    const storesWithOwners = await storesCollection.countDocuments({ owner: { $exists: true, $ne: null } });
    const totalStores = await storesCollection.countDocuments();
    const videosWithStores = await videosCollection.countDocuments({ stores: { $exists: true, $ne: [] } });
    const totalVideos = await videosCollection.countDocuments();
    const videosWithProducts = await videosCollection.countDocuments({ products: { $exists: true, $ne: [] } });

    console.log('  📊 Verification Results:');
    console.log(`    Stores with owners: ${storesWithOwners}/${totalStores}`);
    console.log(`    Videos with stores: ${videosWithStores}/${totalVideos}`);
    console.log(`    Videos with products: ${videosWithProducts}/${totalVideos}`);
    console.log('');

    // Sample data for testing
    console.log('🎯 SAMPLE DATA FOR TESTING:\n');

    const sampleStores = await storesCollection.find({}).limit(3).toArray();

    for (const store of sampleStores) {
      console.log(`Store: ${store.name} (ID: ${store._id})`);
      console.log(`  Owner: ${store.owner || 'None'}`);

      const storeVideos = await videosCollection.countDocuments({
        stores: store._id
      });

      const storeProducts = await productsCollection.countDocuments({
        store: store._id
      });

      console.log(`  Videos: ${storeVideos}`);
      console.log(`  Products: ${storeProducts}`);
      console.log('');
    }

    console.log('✅ Migration complete!\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the migration
migrateData()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
