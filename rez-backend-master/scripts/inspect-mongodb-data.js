const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${DB_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

// Inspect database
async function inspectDatabase() {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    console.log('='.repeat(60));
    
    const collectionStats = [];
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      collectionStats.push({ name: collection.name, count });
      console.log(`  ${collection.name.padEnd(30)} : ${count} documents`);
    }
    
    // Key collections to inspect
    console.log('\n🔍 Detailed Inspection:');
    console.log('='.repeat(60));
    
    // Inspect Stores
    console.log('\n🏪 STORES Collection:');
    const stores = await db.collection('stores').find({}).limit(5).toArray();
    console.log(`Total stores: ${await db.collection('stores').countDocuments()}`);
    
    if (stores.length > 0) {
      console.log('\nSample store structure:');
      const sampleStore = stores[0];
      console.log(JSON.stringify(sampleStore, null, 2));
      
      // Check for cashback field
      const storesWithCashback = await db.collection('stores').countDocuments({
        'offers.cashback': { $exists: true, $ne: null }
      });
      console.log(`\nStores with cashback: ${storesWithCashback}`);
      
      // Check stores with payment methods
      const storesWithPaymentMethods = await db.collection('stores').countDocuments({
        'operationalInfo.paymentMethods': { $exists: true, $ne: [] }
      });
      console.log(`Stores with payment methods: ${storesWithPaymentMethods}`);
      
      // Check for BNPL (Buy Now Pay Later)
      const storesWithBNPL = await db.collection('stores').countDocuments({
        $or: [
          { 'operationalInfo.paymentMethods': { $in: ['bnpl', 'installment', 'pay-later', 'paylater'] } },
          { 'paymentSettings.acceptPayLater': true }
        ]
      });
      console.log(`Stores with BNPL: ${storesWithBNPL}`);
      
      // Sample stores with cashback
      const topCashbackStores = await db.collection('stores').find({
        'offers.cashback': { $exists: true, $gte: 10 }
      }).sort({ 'offers.cashback': -1 }).limit(3).toArray();
      
      if (topCashbackStores.length > 0) {
        console.log('\nTop 3 stores by cashback:');
        topCashbackStores.forEach((store, idx) => {
          console.log(`  ${idx + 1}. ${store.name} - ${store.offers?.cashback || 0}% cashback`);
        });
      }
    }
    
    // Inspect Products
    console.log('\n\n📦 PRODUCTS Collection:');
    const products = await db.collection('products').find({}).limit(5).toArray();
    console.log(`Total products: ${await db.collection('products').countDocuments()}`);
    
    if (products.length > 0) {
      console.log('\nSample product structure:');
      const sampleProduct = products[0];
      console.log(JSON.stringify(sampleProduct, null, 2));
      
      // Check products with categories
      const productsWithCategory = await db.collection('products').countDocuments({
        category: { $exists: true, $ne: null }
      });
      console.log(`\nProducts with category: ${productsWithCategory}`);
      
      // Check products with tags
      const productsWithTags = await db.collection('products').countDocuments({
        tags: { $exists: true, $ne: [] }
      });
      console.log(`Products with tags: ${productsWithTags}`);
    }
    
    // Inspect Search History
    console.log('\n\n🔍 SEARCH HISTORY:');
    const searchHistoryCount = await db.collection('search_histories').countDocuments();
    const searchHistory = await db.collection('search_histories').find({}).limit(5).toArray();
    console.log(`Total search history entries: ${searchHistoryCount}`);
    
    if (searchHistory.length > 0) {
      console.log('\nSample search queries:');
      searchHistory.forEach((entry, idx) => {
        console.log(`  ${idx + 1}. "${entry.query || entry.searchQuery || 'N/A'}"`);
      });
    }
    
    // Inspect Categories
    console.log('\n\n📂 CATEGORIES Collection:');
    const categories = await db.collection('categories').find({}).limit(10).toArray();
    console.log(`Total categories: ${await db.collection('categories').countDocuments()}`);
    
    if (categories.length > 0) {
      console.log('\nSample categories:');
      categories.forEach((cat, idx) => {
        console.log(`  ${idx + 1}. ${cat.name} (${cat.slug || 'no slug'})`);
      });
    }
    
    // Check for social proof data
    console.log('\n\n👥 SOCIAL PROOF DATA:');
    const socialProofCollections = ['socialproofs', 'socialproof', 'nearbyactivity'];
    for (const collName of socialProofCollections) {
      try {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`  ${collName}: ${count} documents`);
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Database: ${DB_NAME}`);
    console.log(`Total Collections: ${collections.length}`);
    console.log(`Total Stores: ${await db.collection('stores').countDocuments()}`);
    console.log(`Total Products: ${await db.collection('products').countDocuments()}`);
    console.log(`Total Categories: ${await db.collection('categories').countDocuments()}`);
    console.log(`Total Search History: ${await db.collection('search_histories').countDocuments()}`);
    
    // Field analysis for stores
    console.log('\n\n🔬 STORE FIELD ANALYSIS:');
    console.log('='.repeat(60));
    
    const storeFields = {
      'offers.cashback': await db.collection('stores').countDocuments({ 'offers.cashback': { $exists: true } }),
      'operationalInfo.paymentMethods': await db.collection('stores').countDocuments({ 'operationalInfo.paymentMethods': { $exists: true, $ne: [] } }),
      'paymentSettings.acceptPayLater': await db.collection('stores').countDocuments({ 'paymentSettings.acceptPayLater': true }),
      'location.coordinates': await db.collection('stores').countDocuments({ 'location.coordinates': { $exists: true, $ne: null } }),
      'ratings.average': await db.collection('stores').countDocuments({ 'ratings.average': { $exists: true } }),
    };
    
    Object.entries(storeFields).forEach(([field, count]) => {
      console.log(`  ${field.padEnd(40)} : ${count} stores`);
    });
    
    // Field analysis for products
    console.log('\n\n🔬 PRODUCT FIELD ANALYSIS:');
    console.log('='.repeat(60));
    
    const productFields = {
      'category': await db.collection('products').countDocuments({ category: { $exists: true } }),
      'tags': await db.collection('products').countDocuments({ tags: { $exists: true, $ne: [] } }),
      'pricing': await db.collection('products').countDocuments({ pricing: { $exists: true } }),
      'images': await db.collection('products').countDocuments({ images: { $exists: true, $ne: [] } }),
      'store': await db.collection('products').countDocuments({ store: { $exists: true } }),
    };
    
    Object.entries(productFields).forEach(([field, count]) => {
      console.log(`  ${field.padEnd(40)} : ${count} products`);
    });
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run inspection
inspectDatabase().catch(console.error);














