/**
 * Script to check Dubai products in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function checkDubaiProducts() {
  try {
    console.log('🚀 Checking Dubai products...\n');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // 1. Find Dubai stores
    console.log('========================================');
    console.log('📊 DUBAI STORES');
    console.log('========================================');

    const dubaiStores = await db.collection('stores').find({
      'location.city': { $regex: /^dubai$/i }
    }).project({ _id: 1, name: 1, 'location.city': 1 }).toArray();

    console.log(`Found ${dubaiStores.length} Dubai stores:`);
    for (const store of dubaiStores) {
      console.log(`   - ${store.name} (ID: ${store._id})`);
    }

    const dubaiStoreIds = dubaiStores.map(s => s._id);

    // 2. Find products linked to Dubai stores
    console.log('\n========================================');
    console.log('📊 PRODUCTS LINKED TO DUBAI STORES');
    console.log('========================================');

    const dubaiProducts = await db.collection('products').find({
      store: { $in: dubaiStoreIds }
    }).project({ _id: 1, name: 1, title: 1, store: 1 }).toArray();

    console.log(`Found ${dubaiProducts.length} products in Dubai stores:`);
    for (const product of dubaiProducts.slice(0, 10)) {
      const store = dubaiStores.find(s => s._id.equals(product.store));
      console.log(`   - ${product.name || product.title} (Store: ${store?.name || 'Unknown'})`);
    }
    if (dubaiProducts.length > 10) {
      console.log(`   ... and ${dubaiProducts.length - 10} more`);
    }

    // 3. Find Bangalore stores
    console.log('\n========================================');
    console.log('📊 BANGALORE STORES');
    console.log('========================================');

    const bangaloreStores = await db.collection('stores').find({
      'location.city': { $regex: /^bangalore$/i }
    }).project({ _id: 1, name: 1 }).toArray();

    console.log(`Found ${bangaloreStores.length} Bangalore stores`);

    const bangaloreStoreIds = bangaloreStores.map(s => s._id);

    // 4. Find products linked to Bangalore stores
    const bangaloreProducts = await db.collection('products').countDocuments({
      store: { $in: bangaloreStoreIds }
    });

    console.log(`Found ${bangaloreProducts} products in Bangalore stores`);

    // 5. Check products without store assignment
    console.log('\n========================================');
    console.log('📊 PRODUCTS WITHOUT STORE ASSIGNMENT');
    console.log('========================================');

    const productsWithoutStore = await db.collection('products').countDocuments({
      $or: [
        { store: { $exists: false } },
        { store: null }
      ]
    });

    console.log(`Products without store: ${productsWithoutStore}`);

    // 6. Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`Dubai stores: ${dubaiStores.length}`);
    console.log(`Dubai products: ${dubaiProducts.length}`);
    console.log(`Bangalore stores: ${bangaloreStores.length}`);
    console.log(`Bangalore products: ${bangaloreProducts}`);
    console.log(`Products without store: ${productsWithoutStore}`);

    if (dubaiProducts.length === 0) {
      console.log('\n⚠️ WARNING: No products are linked to Dubai stores!');
      console.log('This is why Dubai region shows no products.');
      console.log('Products need to be created/assigned to Dubai stores.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDubaiProducts()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
