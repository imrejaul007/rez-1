/**
 * Script to check existing stores in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function checkStores() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Get all stores
    const stores = await db.collection('stores').find({}).toArray();
    console.log(`📦 Total stores: ${stores.length}\n`);

    // Show store details
    console.log('========================================');
    console.log('EXISTING STORES');
    console.log('========================================\n');

    for (const s of stores) {
      const store = s as any;
      console.log(`Name: ${store.name}`);
      console.log(`  Slug: ${store.slug}`);
      console.log(`  Category: ${store.category}`);
      console.log(`  Merchant: ${store.merchantId}`);
      console.log(`  isActive: ${store.isActive}`);
      console.log('');
    }

    // Get unique merchant IDs
    const merchantIds = [...new Set(stores.map(s => (s as any).merchantId?.toString()).filter(Boolean))];
    console.log(`\n📊 Unique Merchant IDs: ${merchantIds.length}`);
    merchantIds.forEach(id => console.log(`   - ${id}`));

    // Get main categories
    const mainCategories = await db.collection('categories').find({ parentCategory: { $exists: false } }).toArray();
    console.log(`\n📂 Main Categories (${mainCategories.length}):`);
    for (const c of mainCategories) {
      const cat = c as any;
      console.log(`   - ${cat.name} | slug: ${cat.slug} | _id: ${cat._id}`);
    }

    // Get subcategories
    const subCategories = await db.collection('categories').find({ parentCategory: { $exists: true } }).toArray();
    console.log(`\n📂 Sub Categories: ${subCategories.length}`);

    // Get products count per store
    console.log('\n📦 Products per store:');
    for (const s of stores.slice(0, 20)) {
      const store = s as any;
      const productCount = await db.collection('products').countDocuments({ store: store._id });
      console.log(`   ${store.name}: ${productCount} products`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkStores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
