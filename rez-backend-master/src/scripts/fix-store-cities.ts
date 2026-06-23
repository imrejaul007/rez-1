/**
 * Script to fix store city data for region filtering
 *
 * Problem: All Indian stores have location.city = "Mumbai" instead of "Bangalore"
 * This breaks region filtering because Bangalore region looks for cities like
 * "Bangalore", "Bengaluru", etc.
 *
 * Solution: Update all Mumbai stores to Bangalore
 *
 * Usage: npx ts-node src/scripts/fix-store-cities.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function fixStoreCities() {
  try {
    console.log('🚀 Starting store city fix script...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // First, show current city distribution
    console.log('📊 Current city distribution:');
    const beforeDistribution = await db.collection('stores').aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    for (const city of beforeDistribution) {
      console.log(`   ${city._id || 'null'}: ${city.count} stores`);
    }

    // Count Mumbai stores that will be updated
    const mumbaiCount = await db.collection('stores').countDocuments({
      'location.city': 'Mumbai'
    });

    console.log(`\n🔄 Found ${mumbaiCount} stores with city "Mumbai" to update to "Bangalore"`);

    if (mumbaiCount === 0) {
      console.log('✅ No Mumbai stores found - nothing to update');
    } else {
      // Update Mumbai stores to Bangalore
      const result = await db.collection('stores').updateMany(
        { 'location.city': 'Mumbai' },
        {
          $set: {
            'location.city': 'Bangalore',
            'location.state': 'Karnataka',
            'location.country': 'India',
            'updatedAt': new Date()
          }
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} stores from Mumbai to Bangalore`);
    }

    // Show final city distribution
    console.log('\n📊 Final city distribution:');
    const afterDistribution = await db.collection('stores').aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    for (const city of afterDistribution) {
      console.log(`   ${city._id || 'null'}: ${city.count} stores`);
    }

    // Verify that Bangalore and Dubai are the main cities
    const bangaloreCount = await db.collection('stores').countDocuments({
      'location.city': { $regex: /^bangalore$/i }
    });
    const dubaiCount = await db.collection('stores').countDocuments({
      'location.city': { $regex: /^dubai$/i }
    });

    console.log('\n========================================');
    console.log('📊 FIX SUMMARY');
    console.log('========================================');
    console.log(`Bangalore stores: ${bangaloreCount}`);
    console.log(`Dubai stores: ${dubaiCount}`);
    console.log(`Total stores: ${bangaloreCount + dubaiCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixStoreCities()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
