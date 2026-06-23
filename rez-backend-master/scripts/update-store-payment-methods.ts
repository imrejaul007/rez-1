/**
 * Update Store Payment Methods
 * 
 * Adds payment methods array to all stores (currently 0 stores have this)
 * This is the base script that must run before seeding BNPL stores
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Store Schema (simplified for script)
const StoreSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);

async function updateStorePaymentMethods() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log(`✅ Connected to database: ${DB_NAME}`);

    // Step 1: Add default payment methods to all stores
    console.log('\n📝 Step 1: Adding default payment methods to all stores...');
    const defaultPaymentMethods = ['upi', 'card', 'wallet', 'cash'];
    
    const updateResult1 = await Store.updateMany(
      {
        $or: [
          { 'operationalInfo.paymentMethods': { $exists: false } },
          { 'operationalInfo.paymentMethods': { $eq: [] } },
          { 'operationalInfo.paymentMethods': null }
        ]
      },
      {
        $set: {
          'operationalInfo.paymentMethods': defaultPaymentMethods
        }
      }
    );

    console.log(`✅ Updated ${updateResult1.modifiedCount} stores with default payment methods`);

    // Step 2: Update stores that already have some payment methods but missing defaults
    console.log('\n📝 Step 2: Ensuring all stores have complete payment methods...');
    const updateResult2 = await Store.updateMany(
      {
        'operationalInfo.paymentMethods': { $exists: true, $ne: [] }
      },
      {
        $addToSet: {
          'operationalInfo.paymentMethods': { $each: defaultPaymentMethods }
        }
      }
    );

    console.log(`✅ Enhanced ${updateResult2.modifiedCount} stores with additional payment methods`);

    // Verify the update
    const storesWithPaymentMethods = await Store.countDocuments({
      'operationalInfo.paymentMethods': { $exists: true, $ne: [] }
    });

    const totalStores = await Store.countDocuments({});
    
    console.log('\n📊 Summary:');
    console.log(`   Total stores: ${totalStores}`);
    console.log(`   Stores with payment methods: ${storesWithPaymentMethods}`);
    console.log(`   Coverage: ${((storesWithPaymentMethods / totalStores) * 100).toFixed(1)}%`);

    if (storesWithPaymentMethods === totalStores) {
      console.log('\n✅ SUCCESS: All stores now have payment methods!');
    } else {
      console.log(`\n⚠️  WARNING: ${totalStores - storesWithPaymentMethods} stores still missing payment methods`);
    }

  } catch (error) {
    console.error('❌ Error updating store payment methods:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
updateStorePaymentMethods()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });














