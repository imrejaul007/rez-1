const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductsAndStores() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check stores collection
    console.log('📦 CHECKING STORES:');
    console.log('=====================================');
    const storesCollection = db.collection('stores');
    const storeCount = await storesCollection.countDocuments();
    console.log(`Total stores in database: ${storeCount}`);

    if (storeCount > 0) {
      const stores = await storesCollection.find({}).limit(3).toArray();
      console.log('\nFirst 3 stores:');
      stores.forEach(store => {
        console.log(`  - ${store.name} (ID: ${store._id})`);
      });
    }

    // Check products collection
    console.log('\n\n📦 CHECKING PRODUCTS:');
    console.log('=====================================');
    const productsCollection = db.collection('products');
    const totalProducts = await productsCollection.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);

    // Check how many products have stores
    const productsWithStore = await productsCollection.countDocuments({ store: { $exists: true, $ne: null } });
    const productsWithoutStore = await productsCollection.countDocuments({ $or: [{ store: { $exists: false } }, { store: null }] });

    console.log(`Products WITH store: ${productsWithStore}`);
    console.log(`Products WITHOUT store: ${productsWithoutStore}`);

    // Show sample products
    console.log('\n📋 Sample Products:');
    console.log('-------------------');
    const sampleProducts = await productsCollection.find({}).limit(5).toArray();

    for (const product of sampleProducts) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`  ID: ${product._id}`);
      console.log(`  Store: ${product.store || 'NULL/UNDEFINED'}`);
      console.log(`  Category: ${product.category}`);
      console.log(`  Price: ₹${product.pricing?.selling || product.price?.current || 'N/A'}`);
    }

    // Check specific product (MacBook Air M3)
    console.log('\n\n🔍 CHECKING SPECIFIC PRODUCT (MacBook Air M3):');
    console.log('================================================');
    const macbook = await productsCollection.findOne({ name: { $regex: /MacBook Air M3/i } });
    if (macbook) {
      console.log(`Found: ${macbook.name}`);
      console.log(`  ID: ${macbook._id}`);
      console.log(`  Store field: ${macbook.store || 'NULL/UNDEFINED'}`);
      console.log(`  All fields:`, Object.keys(macbook));
    } else {
      console.log('MacBook Air M3 not found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\n✅ Disconnected from MongoDB');
  }
}

checkProductsAndStores();