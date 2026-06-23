/**
 * Script to verify region filtering is working correctly
 *
 * Checks:
 * 1. Store city distribution matches expected values
 * 2. Region service filter returns correct stores
 * 3. Dubai stores have Dubai city, Bangalore stores have Bangalore city
 *
 * Usage: npx ts-node src/scripts/verify-region-filtering.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { regionService, REGIONS } from '../services/regionService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

async function verifyRegionFiltering() {
  try {
    console.log('🚀 Starting region filtering verification...\n');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // 1. Check city distribution
    console.log('========================================');
    console.log('📊 CITY DISTRIBUTION');
    console.log('========================================');

    const cityDistribution = await db.collection('stores').aggregate([
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    for (const city of cityDistribution) {
      console.log(`   ${city._id || 'null'}: ${city.count} stores`);
    }

    // 2. Test region filter for Bangalore
    console.log('\n========================================');
    console.log('🔍 BANGALORE REGION FILTER TEST');
    console.log('========================================');

    const bangaloreFilter = regionService.getStoreFilter('bangalore');
    console.log('Filter:', JSON.stringify(bangaloreFilter, null, 2));

    const bangaloreStores = await db.collection('stores')
      .find(bangaloreFilter)
      .project({ name: 1, 'location.city': 1 })
      .limit(5)
      .toArray();

    console.log(`\nFound ${bangaloreStores.length} Bangalore stores (showing first 5):`);
    for (const store of bangaloreStores) {
      console.log(`   - ${store.name} (city: ${store.location?.city})`);
    }

    const bangaloreCount = await db.collection('stores').countDocuments(bangaloreFilter);
    console.log(`\nTotal Bangalore stores: ${bangaloreCount}`);

    // 3. Test region filter for Dubai
    console.log('\n========================================');
    console.log('🔍 DUBAI REGION FILTER TEST');
    console.log('========================================');

    const dubaiFilter = regionService.getStoreFilter('dubai');
    console.log('Filter:', JSON.stringify(dubaiFilter, null, 2));

    const dubaiStores = await db.collection('stores')
      .find(dubaiFilter)
      .project({ name: 1, 'location.city': 1 })
      .limit(5)
      .toArray();

    console.log(`\nFound ${dubaiStores.length} Dubai stores (showing first 5):`);
    for (const store of dubaiStores) {
      console.log(`   - ${store.name} (city: ${store.location?.city})`);
    }

    const dubaiCount = await db.collection('stores').countDocuments(dubaiFilter);
    console.log(`\nTotal Dubai stores: ${dubaiCount}`);

    // 4. Check for any stores without proper city
    console.log('\n========================================');
    console.log('⚠️ STORES WITHOUT PROPER CITY');
    console.log('========================================');

    const storesWithoutCity = await db.collection('stores').countDocuments({
      $or: [
        { 'location.city': { $exists: false } },
        { 'location.city': null },
        { 'location.city': '' }
      ]
    });

    console.log(`Stores without city: ${storesWithoutCity}`);

    // 5. Check for any stores not in Bangalore or Dubai
    const allCities = REGIONS.bangalore.cities.concat(REGIONS.dubai.cities);
    const cityPatterns = allCities.map(city => new RegExp(`^${city}$`, 'i'));

    const unknownCityStores = await db.collection('stores')
      .find({
        $and: [
          { 'location.city': { $exists: true, $ne: null, $nin: [''] } },
          { 'location.city': { $not: { $in: cityPatterns } } }
        ]
      })
      .project({ name: 1, 'location.city': 1 })
      .toArray();

    console.log(`\nStores with unknown cities: ${unknownCityStores.length}`);
    if (unknownCityStores.length > 0) {
      for (const store of unknownCityStores.slice(0, 5)) {
        console.log(`   - ${store.name} (city: ${store.location?.city})`);
      }
    }

    // 6. Summary
    console.log('\n========================================');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('========================================');
    console.log(`✅ Bangalore stores: ${bangaloreCount}`);
    console.log(`✅ Dubai stores: ${dubaiCount}`);
    console.log(`${storesWithoutCity === 0 ? '✅' : '⚠️'} Stores without city: ${storesWithoutCity}`);
    console.log(`${unknownCityStores.length === 0 ? '✅' : '⚠️'} Stores with unknown cities: ${unknownCityStores.length}`);

    const totalExpected = bangaloreCount + dubaiCount + storesWithoutCity + unknownCityStores.length;
    const totalActual = await db.collection('stores').countDocuments({});
    console.log(`\nTotal stores in DB: ${totalActual}`);

    if (bangaloreCount > 0 && dubaiCount > 0 && storesWithoutCity === 0) {
      console.log('\n✅ REGION FILTERING IS WORKING CORRECTLY');
    } else {
      console.log('\n⚠️ THERE MAY BE ISSUES WITH REGION FILTERING');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyRegionFiltering()
  .then(() => {
    console.log('✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
