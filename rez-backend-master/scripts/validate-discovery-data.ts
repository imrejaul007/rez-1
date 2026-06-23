/**
 * Validate Discovery Data
 * 
 * Validates that all seeded data meets requirements for the discovery UI
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

// Schemas
const StoreSchema = new mongoose.Schema({}, { strict: false });
const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);

const SearchHistorySchema = new mongoose.Schema({}, { strict: false, collection: 'search_histories' });
const SearchHistory = mongoose.models.SearchHistory || mongoose.model('SearchHistory', SearchHistorySchema);

const NearbyActivitySchema = new mongoose.Schema({}, { strict: false, collection: 'nearby_activities' });
const NearbyActivity = mongoose.models.NearbyActivity || mongoose.model('NearbyActivity', NearbyActivitySchema);

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  count?: number;
  target?: number;
}

async function validateDiscoveryData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log(`✅ Connected to database: ${DB_NAME}\n`);

    const results: ValidationResult[] = [];

    // Check 1: Payment methods for all stores
    console.log('🔍 Check 1: Store Payment Methods...');
    const storesWithPaymentMethods = await Store.countDocuments({
      'operationalInfo.paymentMethods': { $exists: true, $ne: [] }
    });
    const totalStores = await Store.countDocuments({});
    const paymentMethodsCheck: ValidationResult = {
      check: 'Store Payment Methods',
      status: storesWithPaymentMethods === totalStores ? 'pass' : storesWithPaymentMethods > totalStores * 0.9 ? 'warning' : 'fail',
      message: `${storesWithPaymentMethods}/${totalStores} stores have payment methods`,
      count: storesWithPaymentMethods,
      target: totalStores
    };
    results.push(paymentMethodsCheck);
    console.log(`   ${paymentMethodsCheck.status === 'pass' ? '✅' : paymentMethodsCheck.status === 'warning' ? '⚠️' : '❌'} ${paymentMethodsCheck.message}`);

    // Check 2: BNPL stores
    console.log('\n🔍 Check 2: BNPL Stores...');
    const bnplStores = await Store.countDocuments({
      $or: [
        { 'operationalInfo.paymentMethods': { $in: ['bnpl', 'installment', 'pay-later', 'paylater'] } },
        { 'paymentSettings.acceptPayLater': true }
      ],
      isActive: true
    });
    const bnplCheck: ValidationResult = {
      check: 'BNPL Stores',
      status: bnplStores >= 20 ? 'pass' : bnplStores >= 10 ? 'warning' : 'fail',
      message: `${bnplStores} stores have BNPL enabled`,
      count: bnplStores,
      target: 20
    };
    results.push(bnplCheck);
    console.log(`   ${bnplCheck.status === 'pass' ? '✅' : bnplCheck.status === 'warning' ? '⚠️' : '❌'} ${bnplCheck.message}`);

    // Check 3: Search history entries
    console.log('\n🔍 Check 3: Search History...');
    const searchHistoryCount = await SearchHistory.countDocuments({});
    const uniqueQueries = await SearchHistory.distinct('query');
    const searchHistoryCheck: ValidationResult = {
      check: 'Search History',
      status: searchHistoryCount >= 50 ? 'pass' : searchHistoryCount >= 20 ? 'warning' : 'fail',
      message: `${searchHistoryCount} entries, ${uniqueQueries.length} unique queries`,
      count: searchHistoryCount,
      target: 50
    };
    results.push(searchHistoryCheck);
    console.log(`   ${searchHistoryCheck.status === 'pass' ? '✅' : searchHistoryCheck.status === 'warning' ? '⚠️' : '❌'} ${searchHistoryCheck.message}`);

    // Check 4: Social proof data
    console.log('\n🔍 Check 4: Nearby Activity Data...');
    const nearbyActivityCount = await NearbyActivity.countDocuments({ period: 'today' });
    const nearbyActivityCities = await NearbyActivity.distinct('city', { period: 'today' });
    const nearbyActivityCheck: ValidationResult = {
      check: 'Nearby Activity',
      status: nearbyActivityCount > 0 ? 'pass' : 'fail',
      message: `${nearbyActivityCount} entries for today, ${nearbyActivityCities.length} cities`,
      count: nearbyActivityCount,
      target: 1
    };
    results.push(nearbyActivityCheck);
    console.log(`   ${nearbyActivityCheck.status === 'pass' ? '✅' : '❌'} ${nearbyActivityCheck.message}`);

    // Check 5: Stores with cashback
    console.log('\n🔍 Check 5: Stores with Cashback...');
    const storesWithCashback = await Store.countDocuments({
      'offers.cashback': { $exists: true, $gte: 10 },
      isActive: true
    });
    const cashbackCheck: ValidationResult = {
      check: 'Stores with Cashback',
      status: storesWithCashback >= 50 ? 'pass' : storesWithCashback >= 20 ? 'warning' : 'fail',
      message: `${storesWithCashback} stores with cashback >= 10%`,
      count: storesWithCashback,
      target: 50
    };
    results.push(cashbackCheck);
    console.log(`   ${cashbackCheck.status === 'pass' ? '✅' : cashbackCheck.status === 'warning' ? '⚠️' : '❌'} ${cashbackCheck.message}`);

    // Check 6: Stores with location coordinates
    console.log('\n🔍 Check 6: Stores with Location...');
    const storesWithLocation = await Store.countDocuments({
      'location.coordinates': { $exists: true, $ne: null },
      isActive: true
    });
    const locationCheck: ValidationResult = {
      check: 'Stores with Location',
      status: storesWithLocation >= totalStores * 0.9 ? 'pass' : storesWithLocation >= totalStores * 0.7 ? 'warning' : 'fail',
      message: `${storesWithLocation}/${totalStores} stores have location coordinates`,
      count: storesWithLocation,
      target: Math.floor(totalStores * 0.9)
    };
    results.push(locationCheck);
    console.log(`   ${locationCheck.status === 'pass' ? '✅' : locationCheck.status === 'warning' ? '⚠️' : '❌'} ${locationCheck.message}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.status === 'pass').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'fail').length;

    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const statusText = result.status.toUpperCase().padEnd(7);
      console.log(`${icon} ${statusText} - ${result.check}`);
      console.log(`   ${result.message}`);
      if (result.count !== undefined && result.target !== undefined) {
        const percentage = ((result.count / result.target) * 100).toFixed(1);
        console.log(`   Progress: ${result.count}/${result.target} (${percentage}%)`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`Total Checks: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed === 0 && warnings === 0) {
      console.log('\n🎉 All validation checks passed! Discovery UI is ready to use.');
      process.exit(0);
    } else if (failed === 0) {
      console.log('\n⚠️  Some checks have warnings, but discovery UI should work.');
      process.exit(0);
    } else {
      console.log('\n❌ Some validation checks failed. Please review and fix issues.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error validating discovery data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run validation
validateDiscoveryData();














