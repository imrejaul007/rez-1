const mongoose = require('mongoose');
require('dotenv').config();

// Use the correct MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function analyzeProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':***@')); // Hide password in logs

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB successfully!\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 Collections in database:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Try to access Product model
    let Product;
    try {
      Product = require('../src/models/Product');
    } catch (error) {
      console.log('\n⚠️  Product model not found, will check raw collection');
    }

    // Check if products collection exists
    const productsCollection = mongoose.connection.db.collection('products');
    const productCount = await productsCollection.countDocuments();

    console.log(`\n📦 PRODUCTS IN DATABASE: ${productCount}`);

    if (productCount > 0) {
      // Fetch sample products
      const sampleProducts = await productsCollection.find().limit(3).toArray();

      console.log('\n🔍 SAMPLE PRODUCT STRUCTURE:\n');
      console.log(JSON.stringify(sampleProducts[0], null, 2));

      console.log('\n📋 PRODUCT FIELDS:');
      if (sampleProducts[0]) {
        Object.keys(sampleProducts[0]).forEach(field => {
          console.log(`  - ${field}: ${typeof sampleProducts[0][field]}`);
        });
      }
    } else {
      console.log('\n⚠️  No products found in database');
    }

    // Check stores collection
    const storesCollection = mongoose.connection.db.collection('stores');
    const storeCount = await storesCollection.countDocuments();

    console.log(`\n🏪 STORES IN DATABASE: ${storeCount}`);

    if (storeCount > 0) {
      const stores = await storesCollection.find().limit(5).toArray();
      console.log('\n📋 FIRST 5 STORES:');
      stores.forEach(store => {
        console.log(`  - ${store.name || store.storeName || 'Unnamed'} (ID: ${store._id})`);
      });

      // Get all stores for product creation
      console.log('\n📊 ALL STORES FOR PRODUCT CREATION:');
      const allStores = await storesCollection.find().toArray();
      console.log(`Total stores: ${allStores.length}\n`);

      allStores.forEach((store, index) => {
        console.log(`${index + 1}. ${store.name || store.storeName} (${store._id})`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

analyzeProducts();
