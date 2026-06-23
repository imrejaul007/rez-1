/**
 * End-to-end verification: Simulate what the API endpoints will return
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Store } from '../models/Store';
import { Category } from '../models/Category';

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.DB_NAME || 'test' });
  console.log('Connected\n');

  // ============ TEST 1: GET /categories/food-dining/page-config ============
  console.log('=== TEST 1: GET /categories/food-dining/page-config ===');
  const foodCat = await Category.findOne({ slug: 'food-dining' })
    .populate('childCategories', 'name slug icon image sortOrder')
    .lean();

  if (foodCat?.pageConfig) {
    console.log('PASS - pageConfig exists');
    console.log(`  categoryName: ${foodCat.name}`);
    console.log(`  theme.primaryColor: ${foodCat.pageConfig.theme?.primaryColor}`);
    console.log(`  tabs: ${(foodCat.pageConfig.tabs || []).map((t: any) => t.label).join(', ')}`);
    console.log(`  quickActions: ${(foodCat.pageConfig.quickActions || []).length} items`);
    console.log(`  sections: ${(foodCat.pageConfig.sections || []).length} items`);
    console.log(`  serviceTypes: ${(foodCat.pageConfig.serviceTypes || []).length} items`);
    console.log(`  childCategories: ${(foodCat as any).childCategories?.length || 0}`);
  } else {
    console.log('FAIL - no pageConfig on food-dining');
  }

  // ============ TEST 2: GET /stores?category=food-dining&serviceType=homeDelivery ============
  console.log('\n=== TEST 2: GET /stores?category=food-dining&serviceType=homeDelivery ===');
  const categoryDoc = await Category.findOne({ slug: 'food-dining' }).select('_id');
  const subCategories = await Category.find({ parentCategory: categoryDoc!._id }).select('_id');
  const categoryIds = [categoryDoc!._id, ...subCategories.map(sc => sc._id)];

  const homeDeliveryStores = await Store.find({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.homeDelivery.enabled': true,
  })
    .select('name slug ratings tags operationalInfo serviceCapabilities')
    .sort({ 'ratings.average': -1 })
    .limit(5)
    .lean();

  console.log(`RESULT: ${homeDeliveryStores.length} stores (showing top 5)`);
  homeDeliveryStores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (rating: ${s.ratings?.average || 'N/A'}, delivery: ${(s as any).serviceCapabilities?.homeDelivery?.estimatedTime || 'N/A'}, fee: ${(s as any).serviceCapabilities?.homeDelivery?.deliveryFee ?? 'N/A'})`);
  });

  // Total count
  const totalHD = await Store.countDocuments({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.homeDelivery.enabled': true,
  });
  console.log(`  Total matching: ${totalHD}`);

  // ============ TEST 3: GET /stores?category=food-dining&serviceType=dineIn ============
  console.log('\n=== TEST 3: GET /stores?category=food-dining&serviceType=dineIn ===');
  const dineInStores = await Store.find({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.dineIn.enabled': true,
  })
    .select('name slug ratings bookingType serviceCapabilities')
    .sort({ 'ratings.average': -1 })
    .limit(5)
    .lean();

  console.log(`RESULT: ${dineInStores.length} stores`);
  dineInStores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (bookingType: ${s.bookingType}, rating: ${s.ratings?.average || 'N/A'})`);
  });

  const totalDI = await Store.countDocuments({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.dineIn.enabled': true,
  });
  console.log(`  Total matching: ${totalDI}`);

  // ============ TEST 4: GET /stores?category=food-dining&serviceType=tableBooking ============
  console.log('\n=== TEST 4: GET /stores?category=food-dining&serviceType=tableBooking ===');
  const tbStores = await Store.find({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.tableBooking.enabled': true,
  })
    .select('name slug ratings bookingType')
    .sort({ 'ratings.average': -1 })
    .limit(5)
    .lean();

  console.log(`RESULT: ${tbStores.length} stores`);
  tbStores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (bookingType: ${s.bookingType}, rating: ${s.ratings?.average || 'N/A'})`);
  });

  const totalTB = await Store.countDocuments({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.tableBooking.enabled': true,
  });
  console.log(`  Total matching: ${totalTB}`);

  // ============ TEST 5: GET /stores?category=food-dining&serviceType=driveThru ============
  console.log('\n=== TEST 5: GET /stores?category=food-dining&serviceType=driveThru ===');
  const dtCount = await Store.countDocuments({
    isActive: true,
    category: { $in: categoryIds },
    'serviceCapabilities.driveThru.enabled': true,
  });
  console.log(`RESULT: ${dtCount} stores (expected 0 - new feature)`);

  // ============ TEST 6: Admin categories list ============
  console.log('\n=== TEST 6: GET /admin/categories ===');
  const adminCats = await Category.find({ parentCategory: null, isActive: true })
    .select('name slug icon image type sortOrder metadata pageConfig isActive maxCashback storeCount productCount')
    .sort({ sortOrder: 1 })
    .lean();

  const withPageConfig = adminCats.filter(c => c.pageConfig);
  console.log(`Total main categories: ${adminCats.length}`);
  console.log(`With pageConfig: ${withPageConfig.length}`);
  console.log(`Without pageConfig: ${adminCats.length - withPageConfig.length}`);

  // ============ TEST 7: Other category page configs ============
  console.log('\n=== TEST 7: Spot-check other categories ===');
  for (const slug of ['grocery-essentials', 'beauty-wellness', 'electronics', 'travel-experiences']) {
    const cat = await Category.findOne({ slug, parentCategory: null }).lean();
    const pc = cat?.pageConfig;
    const storesWithCap = await Store.countDocuments({
      isActive: true,
      category: cat?._id,
      'serviceCapabilities.homeDelivery.enabled': true,
    });
    console.log(`${slug}: pageConfig=${pc ? 'YES' : 'NO'}, tabs=${(pc?.tabs as any)?.length || 0}, homeDelivery stores=${storesWithCap}`);
  }

  // ============ SUMMARY ============
  console.log('\n========== VERIFICATION SUMMARY ==========');
  console.log(`Category pageConfigs seeded: ${withPageConfig.length}/12 expected`);
  console.log(`Food stores with homeDelivery: ${totalHD}`);
  console.log(`Food stores with dineIn: ${totalDI}`);
  console.log(`Food stores with tableBooking: ${totalTB}`);
  console.log(`Food stores with driveThru: ${dtCount} (new feature)`);

  const allGood = withPageConfig.length >= 12 && totalHD > 0;
  console.log(`\nOverall status: ${allGood ? 'ALL SYSTEMS GO' : 'ISSUES DETECTED - see above'}`);

  await mongoose.disconnect();
}

verify().catch(e => { console.error(e); process.exit(1); });
