/**
 * Verification script: Check all category + serviceCapabilities data
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verify() {
  const uri = process.env.MONGODB_URI || '';
  const dbName = process.env.DB_NAME || 'test';
  await mongoose.connect(uri, { dbName });
  console.log('Connected to MongoDB\n');

  const Store = mongoose.connection.db!.collection('stores');
  const Category = mongoose.connection.db!.collection('categories');

  // 1. Store serviceCapabilities overview
  console.log('=== STORE SERVICE CAPABILITIES ===');
  const totalStores = await Store.countDocuments({});
  const hasCapabilities = await Store.countDocuments({ serviceCapabilities: { $exists: true } });
  const homeDelivery = await Store.countDocuments({ 'serviceCapabilities.homeDelivery.enabled': true });
  const driveThru = await Store.countDocuments({ 'serviceCapabilities.driveThru.enabled': true });
  const tableBooking = await Store.countDocuments({ 'serviceCapabilities.tableBooking.enabled': true });
  const dineIn = await Store.countDocuments({ 'serviceCapabilities.dineIn.enabled': true });
  const storePickup = await Store.countDocuments({ 'serviceCapabilities.storePickup.enabled': true });
  console.log(`Total stores: ${totalStores}`);
  console.log(`With serviceCapabilities: ${hasCapabilities}`);
  console.log(`homeDelivery: ${homeDelivery}`);
  console.log(`tableBooking: ${tableBooking}`);
  console.log(`dineIn: ${dineIn}`);
  console.log(`storePickup: ${storePickup}`);
  console.log(`driveThru: ${driveThru}`);

  // 2. Sample homeDelivery store
  console.log('\n=== SAMPLE HOME DELIVERY STORE ===');
  const sampleHD = await Store.findOne(
    { 'serviceCapabilities.homeDelivery.enabled': true },
    { projection: { name: 1, serviceCapabilities: 1, 'operationalInfo.deliveryFee': 1, 'operationalInfo.deliveryTime': 1 } }
  );
  if (sampleHD) {
    console.log('Name:', sampleHD.name);
    console.log('serviceCapabilities.homeDelivery:', JSON.stringify(sampleHD.serviceCapabilities?.homeDelivery, null, 2));
    console.log('Original deliveryFee:', sampleHD.operationalInfo?.deliveryFee);
    console.log('Original deliveryTime:', sampleHD.operationalInfo?.deliveryTime);
  }

  // 3. Sample tableBooking store
  console.log('\n=== SAMPLE TABLE BOOKING STORE ===');
  const sampleTB = await Store.findOne(
    { 'serviceCapabilities.tableBooking.enabled': true },
    { projection: { name: 1, serviceCapabilities: 1, bookingType: 1, 'bookingConfig.enabled': 1 } }
  );
  if (sampleTB) {
    console.log('Name:', sampleTB.name);
    console.log('bookingType:', sampleTB.bookingType);
    console.log('bookingConfig.enabled:', sampleTB.bookingConfig?.enabled);
    console.log('serviceCapabilities:', JSON.stringify(sampleTB.serviceCapabilities, null, 2));
  }

  // 4. Sample dineIn store
  console.log('\n=== SAMPLE DINE-IN STORE ===');
  const sampleDI = await Store.findOne(
    { 'serviceCapabilities.dineIn.enabled': true },
    { projection: { name: 1, serviceCapabilities: 1, bookingType: 1 } }
  );
  if (sampleDI) {
    console.log('Name:', sampleDI.name);
    console.log('bookingType:', sampleDI.bookingType);
    console.log('serviceCapabilities:', JSON.stringify(sampleDI.serviceCapabilities, null, 2));
  }

  // 5. Category pageConfigs overview
  console.log('\n=== CATEGORY PAGE CONFIGS ===');
  const mainCategories = await Category.find(
    { parentCategory: null, isActive: true },
    { projection: { name: 1, slug: 1, pageConfig: 1, sortOrder: 1 } }
  ).sort({ sortOrder: 1 }).toArray();

  console.log(`Main categories: ${mainCategories.length}\n`);
  for (const cat of mainCategories) {
    const pc = cat.pageConfig;
    const status = pc ? 'YES' : 'NO';
    const tabs = pc?.tabs?.length || 0;
    const qa = pc?.quickActions?.length || 0;
    const sec = pc?.sections?.length || 0;
    const st = pc?.serviceTypes?.length || 0;
    console.log(`  [${cat.sortOrder}] ${(cat.slug as string).padEnd(22)} pageConfig:${status}  tabs:${tabs}  quickActions:${qa}  sections:${sec}  serviceTypes:${st}`);
  }

  // 6. Deep check: Food & Dining
  console.log('\n=== FOOD & DINING DEEP CHECK ===');
  const foodCat = await Category.findOne({ slug: 'food-dining', parentCategory: null });
  if (foodCat?.pageConfig) {
    const pc = foodCat.pageConfig;
    console.log('Theme primaryColor:', pc.theme?.primaryColor);
    console.log('Theme gradientColors:', JSON.stringify(pc.theme?.gradientColors));
    console.log('Banner title:', pc.banner?.title);
    console.log('Banner subtitle:', pc.banner?.subtitle);

    console.log('\nTabs:');
    (pc.tabs || []).forEach((t: any) => {
      console.log(`  - ${t.id} (label: ${t.label}, icon: ${t.icon}, serviceFilter: ${t.serviceFilter || 'none'})`);
    });

    console.log('\nQuick Actions:');
    (pc.quickActions || []).forEach((q: any) => {
      console.log(`  - ${q.id}: ${q.label} (${q.icon}) -> ${q.route}`);
    });

    console.log('\nSections:');
    (pc.sections || []).forEach((s: any) => {
      console.log(`  - [${s.sortOrder}] ${s.type} (${s.enabled ? 'ON' : 'OFF'})`);
    });

    console.log('\nService Types:');
    (pc.serviceTypes || []).forEach((s: any) => {
      console.log(`  - ${s.id}: ${s.label} (filterField: ${s.filterField})`);
    });
  } else {
    console.log('ERROR: Food & Dining missing pageConfig!');
  }

  // 7. Food & Dining store filtering
  console.log('\n=== FOOD & DINING STORE FILTERING ===');
  const foodSubcats = await Category.find({ parentCategory: foodCat?._id }).toArray();
  const foodSubcatIds = foodSubcats.map(c => c._id);
  console.log(`Subcategories: ${foodSubcats.length} (${foodSubcats.map(c => c.slug).join(', ')})`);

  const totalFood = await Store.countDocuments({ category: { $in: foodSubcatIds }, isActive: true });
  const foodHD = await Store.countDocuments({ category: { $in: foodSubcatIds }, isActive: true, 'serviceCapabilities.homeDelivery.enabled': true });
  const foodDI = await Store.countDocuments({ category: { $in: foodSubcatIds }, isActive: true, 'serviceCapabilities.dineIn.enabled': true });
  const foodTB = await Store.countDocuments({ category: { $in: foodSubcatIds }, isActive: true, 'serviceCapabilities.tableBooking.enabled': true });
  const foodDT = await Store.countDocuments({ category: { $in: foodSubcatIds }, isActive: true, 'serviceCapabilities.driveThru.enabled': true });

  console.log(`Total active food stores: ${totalFood}`);
  console.log(`  -> homeDelivery: ${foodHD}`);
  console.log(`  -> dineIn: ${foodDI}`);
  console.log(`  -> tableBooking: ${foodTB}`);
  console.log(`  -> driveThru: ${foodDT}`);

  // 8. Cross-check: stores with NO serviceCapabilities
  console.log('\n=== STORES WITHOUT SERVICE CAPABILITIES ===');
  const noCapabilities = await Store.countDocuments({
    $or: [
      { serviceCapabilities: { $exists: false } },
      { serviceCapabilities: null },
    ]
  });
  console.log(`Stores without serviceCapabilities: ${noCapabilities} / ${totalStores}`);

  // 9. Sample a few food delivery stores to see names
  console.log('\n=== TOP 5 FOOD HOME DELIVERY STORES ===');
  const topFoodHD = await Store.find(
    { category: { $in: foodSubcatIds }, 'serviceCapabilities.homeDelivery.enabled': true },
    { projection: { name: 1, 'ratings.average': 1, 'operationalInfo.deliveryTime': 1, 'serviceCapabilities.homeDelivery': 1 } }
  ).sort({ 'ratings.average': -1 }).limit(5).toArray();
  topFoodHD.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (rating: ${s.ratings?.average || 'N/A'}, delivery: ${s.operationalInfo?.deliveryTime || 'N/A'}, fee: ${s.serviceCapabilities?.homeDelivery?.deliveryFee ?? 'N/A'})`);
  });

  // 10. Check other categories have pageConfig
  console.log('\n=== SPOT CHECK: OTHER CATEGORIES ===');
  const groceryCat = await Category.findOne({ slug: 'grocery-essentials', parentCategory: null });
  const beautyCat = await Category.findOne({ slug: 'beauty-wellness', parentCategory: null });
  const electronicsCat = await Category.findOne({ slug: 'electronics', parentCategory: null });

  for (const cat of [groceryCat, beautyCat, electronicsCat]) {
    if (!cat) continue;
    const pc = cat.pageConfig;
    console.log(`\n${cat.slug}:`);
    console.log(`  Theme: ${pc?.theme?.primaryColor || 'MISSING'}`);
    console.log(`  Tabs: ${(pc?.tabs || []).map((t: any) => t.label).join(', ') || 'NONE'}`);
    console.log(`  ServiceTypes: ${(pc?.serviceTypes || []).map((s: any) => s.label).join(', ') || 'NONE'}`);
  }

  await mongoose.disconnect();
  console.log('\n\nVerification complete.');
}

verify().catch(e => { console.error(e); process.exit(1); });
