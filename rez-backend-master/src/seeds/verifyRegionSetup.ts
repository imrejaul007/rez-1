/**
 * Region Setup Verification Script
 * Verifies that the Dubai region implementation is complete and working
 *
 * Run with: npx ts-node src/seeds/verifyRegionSetup.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models and services
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { regionService, getRegionConfig, getActiveRegions, isValidRegion, RegionId } from '../services/regionService';

async function verifyRegionSetup() {
  console.log('🔍 Verifying Dubai Region Setup...\n');

  const results: { test: string; passed: boolean; details?: string }[] = [];

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Region Configuration
    console.log('1️⃣ Testing Region Configuration...');
    const activeRegions = getActiveRegions();
    const hasBangalore = activeRegions.some(r => r.id === 'bangalore');
    const hasDubai = activeRegions.some(r => r.id === 'dubai');
    results.push({
      test: 'Region Configuration',
      passed: hasBangalore && hasDubai,
      details: `Bangalore: ${hasBangalore}, Dubai: ${hasDubai}`
    });

    // Test 2: Region Validation
    console.log('2️⃣ Testing Region Validation...');
    const validDubai = isValidRegion('dubai');
    const validBangalore = isValidRegion('bangalore');
    const invalidRegion = !isValidRegion('london');
    results.push({
      test: 'Region Validation',
      passed: validDubai && validBangalore && invalidRegion,
      details: `Valid 'dubai': ${validDubai}, Valid 'bangalore': ${validBangalore}, Invalid 'london': ${invalidRegion}`
    });

    // Test 3: Dubai Region Config
    console.log('3️⃣ Testing Dubai Region Config...');
    const dubaiConfig = getRegionConfig('dubai');
    const hasCorrectCurrency = dubaiConfig.currency === 'AED';
    const hasCorrectSymbol = dubaiConfig.currencySymbol === 'د.إ';
    results.push({
      test: 'Dubai Region Config',
      passed: hasCorrectCurrency && hasCorrectSymbol,
      details: `Currency: ${dubaiConfig.currency}, Symbol: ${dubaiConfig.currencySymbol}`
    });

    // Test 4: Dubai Stores in Database
    console.log('4️⃣ Testing Dubai Stores in Database...');
    const dubaiStores = await Store.find({ 'location.city': 'Dubai' }).lean();
    const hasDubaiStores = dubaiStores.length > 0;
    results.push({
      test: 'Dubai Stores in Database',
      passed: hasDubaiStores,
      details: `Found ${dubaiStores.length} Dubai stores`
    });

    // Test 5: Dubai Products in Database
    console.log('5️⃣ Testing Dubai Products in Database...');
    const dubaiStoreIds = dubaiStores.map(s => s._id);
    const dubaiProducts = await Product.find({ store: { $in: dubaiStoreIds } }).lean();
    const hasDubaiProducts = dubaiProducts.length > 0;
    results.push({
      test: 'Dubai Products in Database',
      passed: hasDubaiProducts,
      details: `Found ${dubaiProducts.length} Dubai products`
    });

    // Test 6: Store Filter Generation (test by actually querying)
    console.log('6️⃣ Testing Store Filter Generation...');
    const dubaiFilter = regionService.getStoreFilter('dubai');
    // Test the filter by executing a real query
    const filteredStores = await Store.find(dubaiFilter).lean();
    const filterWorksCorrectly = filteredStores.length === dubaiStores.length && filteredStores.every((s: any) => s.location?.city === 'Dubai');
    results.push({
      test: 'Store Filter Generation',
      passed: filterWorksCorrectly,
      details: `Filter returned ${filteredStores.length} stores (expected ${dubaiStores.length})`
    });

    // Test 7: Store Access Validation
    console.log('7️⃣ Testing Store Access Validation...');
    const dubaiStoreAccess = regionService.validateStoreAccess('Dubai', 'dubai');
    const bangaloreStoreAccess = regionService.validateStoreAccess('Bangalore', 'bangalore');
    const crossRegionBlocked = !regionService.validateStoreAccess('Dubai', 'bangalore');
    results.push({
      test: 'Store Access Validation',
      passed: dubaiStoreAccess && bangaloreStoreAccess && crossRegionBlocked,
      details: `Dubai->Dubai: ${dubaiStoreAccess}, Bangalore->Bangalore: ${bangaloreStoreAccess}, Dubai->Bangalore blocked: ${crossRegionBlocked}`
    });

    // Test 8: Product Currency
    console.log('8️⃣ Testing Product Currency...');
    const dubaiProductWithCurrency = dubaiProducts.find((p: any) => p.pricing?.currency === 'AED');
    const hasAEDProducts = !!dubaiProductWithCurrency;
    results.push({
      test: 'Product Currency',
      passed: hasAEDProducts,
      details: `Found products with AED currency: ${hasAEDProducts}`
    });

    // Print Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60) + '\n');

    let passedCount = 0;
    let failedCount = 0;

    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      if (result.details) {
        console.log(`       ${result.details}`);
      }
      if (result.passed) passedCount++;
      else failedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📈 Summary: ${passedCount} passed, ${failedCount} failed`);
    console.log('='.repeat(60));

    if (failedCount === 0) {
      console.log('\n🎉 All verification tests passed! Dubai region is ready for testing.');
      console.log('\n📝 Next steps:');
      console.log('   1. Start the backend server: npm run dev');
      console.log('   2. Start the frontend: npm start (or expo start)');
      console.log('   3. Use a VPN to connect to UAE');
      console.log('   4. Open the app - it should auto-detect Dubai region');
      console.log('   5. Verify you see Dubai stores with AED prices');
      console.log('   6. Switch to Bangalore region and verify you see different stores');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run verification
verifyRegionSetup();
