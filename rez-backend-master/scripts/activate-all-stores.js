/**
 * Activate all stores in the database
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function activateAllStores() {
  console.log('Activating all stores...\n');

  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const storesCollection = db.collection('stores');

  // Count before
  const beforeActive = await storesCollection.countDocuments({ isActive: true });
  const beforeInactive = await storesCollection.countDocuments({ isActive: { $ne: true } });
  console.log(`Before: ${beforeActive} active, ${beforeInactive} inactive`);

  // Activate all stores
  const result = await storesCollection.updateMany(
    {},  // Match all stores
    { $set: { isActive: true } }
  );

  console.log(`\nUpdated ${result.modifiedCount} stores to isActive: true`);

  // Count after
  const afterActive = await storesCollection.countDocuments({ isActive: true });
  console.log(`After: ${afterActive} active stores`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

activateAllStores();
