/**
 * Script to check stores in the database
 * Run with: node scripts/checkStores.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

async function checkStores() {
  console.log('🔍 Checking MongoDB for stores...\n');
  console.log('Connection URI:', MONGODB_URI?.substring(0, 50) + '...');
  console.log('Database:', DB_NAME);

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get stores collection
    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');

    // Count total stores
    const totalCount = await storesCollection.countDocuments();
    console.log(`📊 Total stores in database: ${totalCount}`);

    // Count active stores
    const activeCount = await storesCollection.countDocuments({ isActive: true });
    console.log(`✅ Active stores: ${activeCount}`);

    // Count stores with coordinates
    const withCoords = await storesCollection.countDocuments({
      'location.coordinates': { $exists: true, $ne: null }
    });
    console.log(`📍 Stores with coordinates: ${withCoords}`);

    // Count featured stores
    const featuredCount = await storesCollection.countDocuments({ isFeatured: true });
    console.log(`⭐ Featured stores: ${featuredCount}`);

    // Count stores with category
    const withCategory = await storesCollection.countDocuments({
      category: { $exists: true, $ne: null }
    });
    console.log(`📁 Stores with category: ${withCategory}`);

    // Get sample store
    console.log('\n📋 Sample store data:');
    const sampleStore = await storesCollection.findOne({ isActive: true });

    if (sampleStore) {
      console.log({
        _id: sampleStore._id,
        name: sampleStore.name,
        isActive: sampleStore.isActive,
        isFeatured: sampleStore.isFeatured,
        category: sampleStore.category,
        hasLocation: !!sampleStore.location,
        hasCoordinates: !!sampleStore.location?.coordinates,
        coordinates: sampleStore.location?.coordinates,
        hasRatings: !!sampleStore.ratings,
        ratingsAverage: sampleStore.ratings?.average,
      });
    } else {
      console.log('❌ No active stores found!');
    }

    // Check if any stores would be returned by featured endpoint
    console.log('\n🔎 Checking what getFeaturedStores would return:');
    const featuredStores = await storesCollection
      .find({ isActive: true })
      .sort({ 'ratings.average': -1 })
      .limit(5)
      .toArray();

    console.log(`Found ${featuredStores.length} stores for featured endpoint:`);
    featuredStores.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (rating: ${s.ratings?.average || 'N/A'}, active: ${s.isActive})`);
    });

    // Check categories collection
    console.log('\n📁 Checking categories:');
    const categoriesCollection = db.collection('categories');
    const categoryCount = await categoriesCollection.countDocuments();
    console.log(`Total categories: ${categoryCount}`);

    if (categoryCount > 0) {
      const sampleCategory = await categoriesCollection.findOne();
      console.log('Sample category:', { _id: sampleCategory?._id, name: sampleCategory?.name });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkStores();
