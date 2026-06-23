const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = process.env.DB_NAME || 'test';

async function checkMerchantStores() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));

    // Find merchant by email
    const merchantEmail = 'mukulraj756@gmail.com';
    const merchant = await Merchant.findOne({ email: merchantEmail.toLowerCase() });

    if (!merchant) {
      console.log(`❌ No merchant found with email: ${merchantEmail}`);
      return;
    }

    console.log(`\n✅ Found merchant:`);
    console.log(`   ID: ${merchant._id}`);
    console.log(`   Business Name: ${merchant.businessName}`);
    console.log(`   Email: ${merchant.email}`);
    console.log(`   Created: ${merchant.createdAt}`);

    // Find stores for this merchant
    const stores = await Store.find({ merchantId: merchant._id });
    
    console.log(`\n📊 Stores for this merchant: ${stores.length}`);
    
    if (stores.length === 0) {
      console.log('❌ No stores found for this merchant!');
      
      // Check if there are any stores without merchantId
      const allStores = await Store.find({}).limit(5);
      console.log(`\n📋 Sample stores in database (first 5):`);
      allStores.forEach((store, index) => {
        console.log(`   ${index + 1}. ${store.name} - merchantId: ${store.merchantId || 'MISSING'}`);
      });
    } else {
      stores.forEach((store, index) => {
        console.log(`\n   Store ${index + 1}:`);
        console.log(`      ID: ${store._id}`);
        console.log(`      Name: ${store.name}`);
        console.log(`      Slug: ${store.slug}`);
        console.log(`      Active: ${store.isActive}`);
        console.log(`      MerchantId: ${store.merchantId}`);
        console.log(`      Created: ${store.createdAt}`);
      });
    }

    // Check for stores with merchantId as string vs ObjectId
    const storesWithStringId = await Store.find({ 
      merchantId: { $type: 'string' } 
    });
    const storesWithObjectId = await Store.find({ 
      merchantId: { $type: 'objectId' } 
    });
    
    console.log(`\n🔍 Store merchantId types:`);
    console.log(`   String type: ${storesWithStringId.length}`);
    console.log(`   ObjectId type: ${storesWithObjectId.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMerchantStores();

