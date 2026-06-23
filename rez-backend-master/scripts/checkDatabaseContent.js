/**
 * Check Database Content
 *
 * This script connects to MongoDB and shows what data already exists
 * in the database, including stores, products, videos, and users.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

async function checkDatabase() {
  try {
    console.log('\n🔍 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI?.substring(0, 50) + '...');
    console.log('DB Name:', DB_NAME);

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });

    console.log('✅ Connected to MongoDB!\n');

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections in database:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log('');

    // Check Stores
    console.log('🏪 STORES:');
    const storesCollection = db.collection('stores');
    const storesCount = await storesCollection.countDocuments();
    console.log(`  Total: ${storesCount}`);

    if (storesCount > 0) {
      const stores = await storesCollection.find({}).limit(5).toArray();
      console.log('  Sample stores:');
      stores.forEach(store => {
        console.log(`    - ${store.name} (ID: ${store._id})`);
        console.log(`      Categories: ${store.category || 'N/A'}`);
        console.log(`      Owner: ${store.owner || 'N/A'}`);
        console.log(`      Products: ${store.products?.length || 0}`);
      });

      // Get all store IDs for reference
      const allStores = await storesCollection.find({}).project({ _id: 1, name: 1 }).toArray();
      console.log('\n  All Store IDs:');
      allStores.forEach(store => {
        console.log(`    ${store._id} - ${store.name}`);
      });
    } else {
      console.log('  ⚠️ No stores found in database');
    }
    console.log('');

    // Check Products
    console.log('📦 PRODUCTS:');
    const productsCollection = db.collection('products');
    const productsCount = await productsCollection.countDocuments();
    console.log(`  Total: ${productsCount}`);

    if (productsCount > 0) {
      const products = await productsCollection.find({}).limit(5).toArray();
      console.log('  Sample products:');
      products.forEach(product => {
        console.log(`    - ${product.name} (ID: ${product._id})`);
        console.log(`      Store: ${product.store}`);
        console.log(`      Price: ${product.pricing?.selling || product.price || 'N/A'}`);
        console.log(`      Category: ${product.category || 'N/A'}`);
      });

      // Group products by store
      const productsByStore = await productsCollection.aggregate([
        { $group: { _id: '$store', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      console.log('\n  Products per store:');
      for (const group of productsByStore) {
        console.log(`    Store ${group._id}: ${group.count} products`);
      }
    } else {
      console.log('  ⚠️ No products found in database');
    }
    console.log('');

    // Check Videos (UGC)
    console.log('🎥 VIDEOS (UGC):');
    const videosCollection = db.collection('videos');
    const videosCount = await videosCollection.countDocuments();
    console.log(`  Total: ${videosCount}`);

    if (videosCount > 0) {
      const videos = await videosCollection.find({}).limit(5).toArray();
      console.log('  Sample videos:');
      videos.forEach(video => {
        console.log(`    - ${video.title || 'Untitled'} (ID: ${video._id})`);
        console.log(`      Type: ${video.contentType || 'N/A'}`);
        console.log(`      Creator: ${video.creator}`);
        console.log(`      Stores: ${video.stores?.join(', ') || 'None'}`);
        console.log(`      Products: ${video.products?.length || 0}`);
        console.log(`      Views: ${video.analytics?.totalViews || video.engagement?.views || 0}`);
      });

      // Group videos by store
      const videosByStore = await videosCollection.aggregate([
        { $unwind: '$stores' },
        { $group: { _id: '$stores', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      console.log('\n  Videos per store:');
      if (videosByStore.length > 0) {
        for (const group of videosByStore) {
          console.log(`    Store ${group._id}: ${group.count} videos`);
        }
      } else {
        console.log('    ⚠️ No videos linked to stores');
      }

      // Check video types
      const videosByType = await videosCollection.aggregate([
        { $group: { _id: '$contentType', count: { $sum: 1 } } }
      ]).toArray();

      console.log('\n  Videos by type:');
      videosByType.forEach(group => {
        console.log(`    ${group._id || 'unknown'}: ${group.count}`);
      });
    } else {
      console.log('  ⚠️ No videos found in database');
    }
    console.log('');

    // Check Users
    console.log('👥 USERS:');
    const usersCollection = db.collection('users');
    const usersCount = await usersCollection.countDocuments();
    console.log(`  Total: ${usersCount}`);

    if (usersCount > 0) {
      const users = await usersCollection.find({}).limit(5).toArray();
      console.log('  Sample users:');
      users.forEach(user => {
        console.log(`    - ${user.profile?.firstName || 'No name'} ${user.profile?.lastName || ''} (ID: ${user._id})`);
        console.log(`      Phone: ${user.phoneNumber}`);
        console.log(`      Role: ${user.role || 'user'}`);
        console.log(`      Verified: ${user.auth?.isVerified || false}`);
      });

      // Check user roles
      const usersByRole = await usersCollection.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]).toArray();

      console.log('\n  Users by role:');
      usersByRole.forEach(group => {
        console.log(`    ${group._id || 'user'}: ${group.count}`);
      });
    } else {
      console.log('  ⚠️ No users found in database');
    }
    console.log('');

    // Check for merchant relationships
    console.log('🔗 RELATIONSHIPS:');

    // Stores with owners
    const storesWithOwners = await storesCollection.countDocuments({ owner: { $exists: true, $ne: null } });
    console.log(`  Stores with owner: ${storesWithOwners}/${storesCount}`);

    // Products linked to stores
    const productsWithStores = await productsCollection.countDocuments({ store: { $exists: true, $ne: null } });
    console.log(`  Products linked to stores: ${productsWithStores}/${productsCount}`);

    // Videos linked to stores
    const videosWithStores = await videosCollection.countDocuments({ stores: { $exists: true, $ne: [] } });
    console.log(`  Videos linked to stores: ${videosWithStores}/${videosCount}`);

    // Videos linked to products
    const videosWithProducts = await videosCollection.countDocuments({ products: { $exists: true, $ne: [] } });
    console.log(`  Videos linked to products: ${videosWithProducts}/${videosCount}`);

    // Videos with creators
    const videosWithCreators = await videosCollection.countDocuments({ creator: { $exists: true, $ne: null } });
    console.log(`  Videos with creators: ${videosWithCreators}/${videosCount}`);

    console.log('');

    // Summary
    console.log('📊 SUMMARY:');
    console.log(`  ✅ Collections: ${collections.length}`);
    console.log(`  🏪 Stores: ${storesCount}`);
    console.log(`  📦 Products: ${productsCount}`);
    console.log(`  🎥 Videos: ${videosCount}`);
    console.log(`  👥 Users: ${usersCount}`);
    console.log('');

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (storesCount === 0) {
      console.log('  ⚠️ Need to create stores first');
    }
    if (usersCount === 0) {
      console.log('  ⚠️ Need to create users (including merchants)');
    }
    if (productsCount === 0) {
      console.log('  ⚠️ Need to create products for stores');
    }
    if (videosCount === 0) {
      console.log('  ⚠️ Need to create UGC videos');
    }
    if (storesCount > 0 && storesWithOwners === 0) {
      console.log('  ⚠️ Stores exist but have no owners - need to link merchants');
    }
    if (productsCount > 0 && productsWithStores === 0) {
      console.log('  ⚠️ Products exist but not linked to stores');
    }
    if (videosCount > 0 && videosWithStores === 0) {
      console.log('  ⚠️ Videos exist but not linked to stores');
    }
    if (videosCount > 0 && videosWithCreators === 0) {
      console.log('  ⚠️ Videos exist but have no creators');
    }

    console.log('\n✅ Database check complete!\n');

  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the check
checkDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
