/**
 * Check and optionally activate stores
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkActiveStores() {
  console.log('Checking active stores...\n');

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const storesCollection = db.collection('stores');
  const categoriesCollection = db.collection('categories');

  // Find active stores
  const activeStores = await storesCollection.find({ isActive: true }).toArray();
  console.log(`Active stores (${activeStores.length}):`);

  for (const store of activeStores) {
    const category = await categoriesCollection.findOne({ _id: store.category });
    console.log(`  - ${store.name} | Category: ${category?.name || 'Unknown'}`);
  }

  // Count stores by category (active vs inactive)
  console.log('\n\nStores by category (active/total):');
  const categories = await categoriesCollection.find({
    $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }]
  }).toArray();

  for (const cat of categories.slice(0, 15)) {
    const total = await storesCollection.countDocuments({ category: cat._id });
    const active = await storesCollection.countDocuments({ category: cat._id, isActive: true });
    if (total > 0) {
      console.log(`  ${cat.name}: ${active}/${total}`);
    }
  }

  // Show inactive stores that could be activated
  console.log('\n\nInactive stores (first 10):');
  const inactiveStores = await storesCollection.find({ isActive: { $ne: true } }).limit(10).toArray();
  for (const store of inactiveStores) {
    const category = await categoriesCollection.findOne({ _id: store.category });
    console.log(`  - ${store.name} | Category: ${category?.name || 'Unknown'}`);
  }

  await mongoose.disconnect();
}

checkActiveStores();
