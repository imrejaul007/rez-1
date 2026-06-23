import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../src/models/Offer';
import OfferCategory from '../src/models/OfferCategory';
import HeroBanner from '../src/models/HeroBanner';
import OfferRedemption from '../src/models/OfferRedemption';
import { Store } from '../src/models/Store';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testOffersSystem() {
  console.log('\n🧪 Testing Offers System - Complete Production Readiness\n');
  console.log('='.repeat(70));
  
  let passed = 0;
  let failed = 0;
  const tests: any[] = [];
  
  try {
    // Test 1: Database Collections
    console.log('\n📦 TEST 1: Database Collections');
    const offerCount = await Offer.countDocuments();
    const categoryCount = await OfferCategory.countDocuments();
    const bannerCount = await HeroBanner.countDocuments();
    const storeCount = await Store.countDocuments();
    
    tests.push({
      name: 'Offers exist',
      passed: offerCount > 0,
      expected: '>0',
      actual: offerCount
    });
    
    tests.push({
      name: 'Categories exist',
      passed: categoryCount > 0,
      expected: '>0',
      actual: categoryCount
    });
    
    tests.push({
      name: 'Hero banners exist',
      passed: bannerCount > 0,
      expected: '>0',
      actual: bannerCount
    });
    
    tests.push({
      name: 'Stores exist',
      passed: storeCount > 0,
      expected: '>0',
      actual: storeCount
    });
    
    // Test 2: Offer Categories Distribution
    console.log('\n📊 TEST 2: Offer Categories Distribution');
    const categories = ['mega', 'student', 'new_arrival', 'trending'];
    for (const cat of categories) {
      const count = await Offer.countDocuments({ category: cat });
      tests.push({
        name: `${cat} offers`,
        passed: count > 0,
        expected: '>0',
        actual: count
      });
    }
    
    // Test 3: New Arrivals Fix
    console.log('\n🆕 TEST 3: New Arrivals Section');
    const newArrivals = await Offer.countDocuments({ category: 'new_arrival' });
    tests.push({
      name: 'New arrivals count',
      passed: newArrivals >= 4,
      expected: '>=4',
      actual: newArrivals
    });
    
    // Test 4: Store Relationships
    console.log('\n🔗 TEST 4: Store Relationships');
    const offersWithStores = await Offer.countDocuments({ 'store.id': { $exists: true } });
    const totalOffers = await Offer.countDocuments();
    tests.push({
      name: 'All offers have stores',
      passed: offersWithStores === totalOffers,
      expected: totalOffers,
      actual: offersWithStores
    });
    
    // Test 5: Active Offers
    console.log('\n✅ TEST 5: Active Offers');
    const activeOffers = await Offer.countDocuments({ 'validity.isActive': true });
    tests.push({
      name: 'Active offers',
      passed: activeOffers > 0,
      expected: '>0',
      actual: activeOffers
    });
    
    // Test 6: Geospatial Indexing
    console.log('\n🌍 TEST 6: Geospatial Indexing');
    try {
      const nearbyOffers = await Offer.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [77.2090, 28.6139] // Delhi coordinates
            },
            $maxDistance: 10000 // 10km
          }
        }
      }).limit(1);
      
      tests.push({
        name: 'Location-based queries work',
        passed: nearbyOffers.length > 0,
        expected: '>0',
        actual: nearbyOffers.length
      });
    } catch (error) {
      tests.push({
        name: 'Location-based queries work',
        passed: false,
        expected: '>0',
        actual: 'Error: ' + (error as Error).message
      });
    }
    
    // Test 7: Offer Validity
    console.log('\n📅 TEST 7: Offer Validity');
    const now = new Date();
    const validOffers = await Offer.countDocuments({
      'validity.startDate': { $lte: now },
      'validity.endDate': { $gte: now },
      'validity.isActive': true
    });
    
    tests.push({
      name: 'Currently valid offers',
      passed: validOffers > 0,
      expected: '>0',
      actual: validOffers
    });
    
    // Test 8: Engagement Metrics
    console.log('\n📈 TEST 8: Engagement Metrics');
    const offersWithEngagement = await Offer.countDocuments({
      'engagement.likesCount': { $exists: true },
      'engagement.sharesCount': { $exists: true },
      'engagement.viewsCount': { $exists: true }
    });
    
    tests.push({
      name: 'Offers have engagement metrics',
      passed: offersWithEngagement === totalOffers,
      expected: totalOffers,
      actual: offersWithEngagement
    });
    
    // Test 9: Restrictions Configuration
    console.log('\n🔒 TEST 9: Restrictions Configuration');
    const offersWithRestrictions = await Offer.countDocuments({
      'restrictions.usageLimitPerUser': { $exists: true }
    });
    
    tests.push({
      name: 'Offers have usage limits',
      passed: offersWithRestrictions > 0,
      expected: '>0',
      actual: offersWithRestrictions
    });
    
    // Test 10: Sample Offer Data Quality
    console.log('\n💎 TEST 10: Data Quality');
    const sampleOffer = await Offer.findOne({ category: 'mega' });
    
    if (sampleOffer) {
      tests.push({
        name: 'Offer has title',
        passed: !!sampleOffer.title && sampleOffer.title.length > 0,
        expected: 'string',
        actual: typeof sampleOffer.title
      });
      
      tests.push({
        name: 'Offer has image',
        passed: !!sampleOffer.image && sampleOffer.image.length > 0,
        expected: 'string',
        actual: typeof sampleOffer.image
      });
      
      tests.push({
        name: 'Offer has cashback percentage',
        passed: sampleOffer.cashbackPercentage > 0,
        expected: '>0',
        actual: sampleOffer.cashbackPercentage
      });
      
      tests.push({
        name: 'Offer has location coordinates',
        passed: Array.isArray(sampleOffer.location?.coordinates) && sampleOffer.location.coordinates.length === 2,
        expected: '[lng, lat]',
        actual: sampleOffer.location?.coordinates?.length || 0
      });
    }
    
    // Calculate results
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 TEST RESULTS:\n');
    
    for (const test of tests) {
      if (test.passed) {
        console.log(`   ✅ ${test.name}`);
        console.log(`      Expected: ${test.expected}, Got: ${test.actual}\n`);
        passed++;
      } else {
        console.log(`   ❌ ${test.name}`);
        console.log(`      Expected: ${test.expected}, Got: ${test.actual}\n`);
        failed++;
      }
    }
    
    const total = passed + failed;
    const percentage = Math.round((passed / total) * 100);
    
    console.log('='.repeat(70));
    console.log(`\n📈 OVERALL SCORE: ${percentage}% (${passed}/${total} tests passed)\n`);
    
    if (percentage >= 95) {
      console.log('🎉 EXCELLENT! System is production-ready!\n');
    } else if (percentage >= 80) {
      console.log('✅ GOOD! Minor fixes may be needed.\n');
    } else if (percentage >= 60) {
      console.log('⚠️  FAIR! Some issues need attention.\n');
    } else {
      console.log('❌ CRITICAL! Major issues detected.\n');
    }
    
    // Provide summary
    console.log('📋 SUMMARY:\n');
    console.log(`   - Total Offers: ${offerCount}`);
    console.log(`   - Categories: ${categoryCount}`);
    console.log(`   - Hero Banners: ${bannerCount}`);
    console.log(`   - Stores: ${storeCount}`);
    console.log(`   - Active Offers: ${activeOffers}`);
    console.log(`   - Valid Offers: ${validOffers}`);
    console.log(`   - New Arrivals: ${newArrivals}`);
    console.log('');
    
    // Next steps
    if (percentage >= 80) {
      console.log('🚀 NEXT STEPS:\n');
      console.log('   1. Test API endpoints: curl http://localhost:5001/api/offers/page-data');
      console.log('   2. Start backend: npm run dev');
      console.log('   3. Test frontend integration');
      console.log('   4. Deploy to production!\n');
    } else {
      console.log('🔧 ACTION REQUIRED:\n');
      console.log('   1. Review failed tests above');
      console.log('   2. Run seed script if data is missing');
      console.log('   3. Re-run this test after fixes\n');
    }
    
    console.log('='.repeat(70) + '\n');
    
    return percentage >= 80;
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    return false;
  }
}

async function main() {
  try {
    await connectToDatabase();
    const success = await testOffersSystem();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

if (require.main === module) {
  main();
}

export { testOffersSystem };

