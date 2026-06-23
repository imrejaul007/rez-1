const mongoose = require('mongoose');
require('dotenv').config();

async function checkStoresProducts() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  try {
    console.log('\n🔍 Checking stores and their products...\n');

    const storesCollection = db.collection('stores');
    const productsCollection = db.collection('products');

    // Get all active stores
    const stores = await storesCollection.find({ isActive: true }).toArray();
    console.log(`📦 Found ${stores.length} active stores\n`);

    const storesWithoutProducts = [];
    const storesWithProducts = [];

    for (const store of stores) {
      const productCount = await productsCollection.countDocuments({
        store: store._id,
        isActive: true
      });

      if (productCount === 0) {
        storesWithoutProducts.push({
          name: store.name,
          id: store._id,
          category: store.category
        });
        console.log(`❌ "${store.name}" - 0 products`);
      } else {
        storesWithProducts.push({
          name: store.name,
          id: store._id,
          productCount
        });
        console.log(`✅ "${store.name}" - ${productCount} products`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Stores with products: ${storesWithProducts.length}`);
    console.log(`❌ Stores without products: ${storesWithoutProducts.length}`);

    if (storesWithoutProducts.length > 0) {
      console.log('\n⚠️  Stores without products:');
      storesWithoutProducts.forEach(store => {
        console.log(`   - ${store.name} (${store.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking stores:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

checkStoresProducts();
