/**
 * Script to update store flags (isBrand, isLocal, isService)
 * Run with: node scripts/updateStoreFlags.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'test';

// Known brand/chain store names (partial matches)
const BRAND_KEYWORDS = [
  'starbucks', 'mcdonald', 'domino', 'pizza hut', 'kfc', 'subway',
  'burger king', 'reliance', 'big bazaar', 'dmart', 'd-mart', 'more',
  'croma', 'vijay sales', 'cinemax', 'inox', 'pvr', 'cinepolis',
  'apollo', 'fortis', 'max hospital', 'medplus', 'apollo pharmacy',
  'lenskart', 'nykaa', 'zara', 'h&m', 'nike', 'adidas', 'puma',
  'decathlon', 'lifestyle', 'shoppers stop', 'westside', 'pantaloons',
  'van heusen', 'peter england', 'raymond', 'fabindia', 'woodland',
  'bata', 'liberty', 'metro shoes', 'haldiram', 'bikanervala',
  'starbucks', 'cafe coffee day', 'ccd', 'costa coffee', 'barista',
  'baskin robbins', 'natural ice cream', 'kwality wall', 'amul',
  'tanishq', 'kalyan jewellers', 'malabar gold', 'joyalukkas',
  'airtel', 'jio', 'vodafone', 'samsung', 'apple', 'oneplus', 'mi',
  'bajaj', 'havells', 'philips', 'godrej', 'tata', 'mahindra',
  'hyundai', 'maruti', 'honda', 'toyota', 'bmw', 'mercedes',
  'chai point', 'chaayos', 'social', 'hard rock cafe', 'tgif',
  'barbeque nation', 'absolute barbecues', 'mainland china',
  'wow momo', 'faasos', 'behrouz biryani', 'box8', 'oven story'
];

// Service category indicators
const SERVICE_KEYWORDS = [
  'salon', 'spa', 'clinic', 'hospital', 'diagnostic', 'lab',
  'physiotherapy', 'gym', 'fitness', 'yoga', 'dental', 'eye',
  'repair', 'service center', 'laundry', 'dry clean', 'tailor',
  'photography', 'studio', 'travel', 'holidays', 'tour',
  'insurance', 'bank', 'consultation', 'therapy', 'coaching',
  'institute', 'academy', 'school', 'training', 'classes'
];

async function updateStoreFlags() {
  console.log('🔄 Updating store flags...\n');
  console.log('Connection URI:', MONGODB_URI?.substring(0, 50) + '...');
  console.log('Database:', DB_NAME);

  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const storesCollection = db.collection('stores');
    const categoriesCollection = db.collection('categories');

    // Get all stores
    const stores = await storesCollection.find({ isActive: true }).toArray();
    console.log(`📊 Found ${stores.length} active stores\n`);

    // Get service categories
    const serviceCategories = await categoriesCollection.find({
      $or: [
        { name: { $regex: /service|health|beauty|fitness|repair/i } },
        { slug: { $regex: /service|health|beauty|fitness|repair/i } }
      ]
    }).toArray();
    const serviceCategoryIds = serviceCategories.map(c => c._id.toString());
    console.log(`📁 Found ${serviceCategories.length} service categories:`, serviceCategories.map(c => c.name));

    let brandCount = 0;
    let localCount = 0;
    let serviceCount = 0;

    for (const store of stores) {
      const nameLower = (store.name || '').toLowerCase();
      const descLower = (store.description || '').toLowerCase();
      const categoryId = store.category?.toString();

      // Check if brand
      const isBrand = BRAND_KEYWORDS.some(keyword =>
        nameLower.includes(keyword) || descLower.includes(keyword)
      );

      // Check if service
      const isService = SERVICE_KEYWORDS.some(keyword =>
        nameLower.includes(keyword) || descLower.includes(keyword)
      ) || serviceCategoryIds.includes(categoryId);

      // Local = not a brand and not primarily online
      const isLocal = !isBrand && !store.isOnline;

      // Update the store
      await storesCollection.updateOne(
        { _id: store._id },
        {
          $set: {
            isBrand: isBrand,
            isLocal: isLocal && !isBrand,
            isService: isService,
            isOnline: store.isOnline || false,
            isHot: store.isFeatured || Math.random() < 0.1, // 10% chance for hot
          }
        }
      );

      if (isBrand) brandCount++;
      if (isLocal && !isBrand) localCount++;
      if (isService) serviceCount++;
    }

    console.log('\n✅ Update complete!');
    console.log(`🏢 Brand stores: ${brandCount}`);
    console.log(`🏠 Local stores: ${localCount}`);
    console.log(`🔧 Service stores: ${serviceCount}`);

    // Verify the update
    console.log('\n📋 Verification:');
    const brandStores = await storesCollection.countDocuments({ isBrand: true });
    const localStores = await storesCollection.countDocuments({ isLocal: true });
    const serviceStores = await storesCollection.countDocuments({ isService: true });
    const hotStores = await storesCollection.countDocuments({ isHot: true });

    console.log(`- Stores with isBrand=true: ${brandStores}`);
    console.log(`- Stores with isLocal=true: ${localStores}`);
    console.log(`- Stores with isService=true: ${serviceStores}`);
    console.log(`- Stores with isHot=true: ${hotStores}`);

    // Show some examples
    console.log('\n📋 Sample brand stores:');
    const sampleBrands = await storesCollection.find({ isBrand: true }).limit(5).toArray();
    sampleBrands.forEach(s => console.log(`  - ${s.name}`));

    console.log('\n📋 Sample local stores:');
    const sampleLocal = await storesCollection.find({ isLocal: true }).limit(5).toArray();
    sampleLocal.forEach(s => console.log(`  - ${s.name}`));

    console.log('\n📋 Sample service stores:');
    const sampleService = await storesCollection.find({ isService: true }).limit(5).toArray();
    sampleService.forEach(s => console.log(`  - ${s.name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoreFlags();
