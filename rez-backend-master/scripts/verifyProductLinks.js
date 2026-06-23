const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function verifyProductLinks() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const storesCollection = mongoose.connection.db.collection('stores');
    const productsCollection = mongoose.connection.db.collection('products');

    // Check FlashPharma Plus specifically
    const store = await storesCollection.findOne({ name: 'FlashPharma Plus' });

    if (!store) {
      console.log('❌ Store not found!');
      return;
    }

    console.log('🏪 Store Found:');
    console.log('   Name:', store.name);
    console.log('   ID:', store._id);
    console.log('   ID Type:', typeof store._id);
    console.log('   ID String:', store._id.toString());
    console.log('');

    // Try different query methods
    console.log('🔍 Searching for products...\n');

    // Method 1: String comparison
    const products1 = await productsCollection.find({
      store: store._id.toString()
    }).toArray();
    console.log(`Method 1 (String): Found ${products1.length} products`);

    // Method 2: ObjectId comparison
    const products2 = await productsCollection.find({
      store: store._id
    }).toArray();
    console.log(`Method 2 (ObjectId): Found ${products2.length} products`);

    // Method 3: Check all products for this store
    const allProducts = await productsCollection.find().toArray();
    const matchingProducts = allProducts.filter(p => {
      const pStoreId = typeof p.store === 'string' ? p.store : p.store.toString();
      const sStoreId = store._id.toString();
      return pStoreId === sStoreId;
    });
    console.log(`Method 3 (Manual filter): Found ${matchingProducts.length} products\n`);

    if (matchingProducts.length > 0) {
      console.log('📦 Products found:');
      matchingProducts.forEach(p => {
        console.log(`   - ${p.name} (Store field: ${p.store}, Type: ${typeof p.store})`);
      });
    }

    // Check what the store field looks like in products
    console.log('\n🔬 Sample product store field analysis:');
    const sampleProduct = await productsCollection.findOne();
    if (sampleProduct) {
      console.log('   Product name:', sampleProduct.name);
      console.log('   Store field:', sampleProduct.store);
      console.log('   Store field type:', typeof sampleProduct.store);
      console.log('   Store field toString:', sampleProduct.store ? sampleProduct.store.toString() : 'null');
    }

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyProductLinks();
