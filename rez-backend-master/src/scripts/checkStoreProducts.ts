/**
 * Script to check all stores and their products
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function checkStoreProducts() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    const db = mongoose.connection.db!;

    const stores = await db.collection('stores').find({}).toArray();
    console.log('Total stores:', stores.length);

    const bySubcategory: Record<string, Array<{ name: string; products: number }>> = {};

    for (const store of stores) {
      const subcat = store.subcategorySlug || 'NO_SUBCATEGORY';
      if (!bySubcategory[subcat]) {
        bySubcategory[subcat] = [];
      }
      const productCount = await db.collection('products').countDocuments({ store: store._id });
      bySubcategory[subcat].push({ name: store.name, products: productCount });
    }

    console.log('\n=== STORES BY SUBCATEGORY ===\n');
    for (const subcat of Object.keys(bySubcategory).sort()) {
      const storeList = bySubcategory[subcat];
      const totalProducts = storeList.reduce((sum, s) => sum + s.products, 0);
      console.log(`${subcat}: ${storeList.length} stores, ${totalProducts} products`);
      storeList.forEach(s => console.log(`  - ${s.name}: ${s.products} products`));
      console.log('');
    }

    const totalProducts = await db.collection('products').countDocuments({});
    console.log('Total products:', totalProducts);

    // Find stores with 0 products
    console.log('\n=== STORES WITH 0 PRODUCTS ===');
    for (const subcat of Object.keys(bySubcategory)) {
      const empty = bySubcategory[subcat].filter(s => s.products === 0);
      if (empty.length > 0) {
        console.log(`${subcat}:`);
        empty.forEach(s => console.log(`  - ${s.name}`));
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStoreProducts().then(() => process.exit(0));
