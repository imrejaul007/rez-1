/**
 * Check Store Data - operationalInfo and hours
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkStoreData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');

    // Find Starbucks
    const starbucks = await storesCollection.findOne({ name: 'Starbucks' });

    if (starbucks) {
      console.log('📋 STARBUCKS STORE DATA:');
      console.log('='.repeat(60));
      console.log('\n🏷️ Basic Info:');
      console.log('Name:', starbucks.name);
      console.log('Slug:', starbucks.slug);

      console.log('\n📍 Address:');
      console.log(JSON.stringify(starbucks.address, null, 2));

      console.log('\n📍 Location:');
      console.log(JSON.stringify(starbucks.location, null, 2));

      console.log('\n📧 Contact:');
      console.log(JSON.stringify(starbucks.contact, null, 2));

      console.log('\n⏰ OperationalInfo:');
      console.log(JSON.stringify(starbucks.operationalInfo, null, 2));

      console.log('\n💰 Offers:');
      console.log(JSON.stringify(starbucks.offers, null, 2));

      console.log('\n📝 Description:');
      console.log(starbucks.description);

      console.log('\n🏷️ Tags:');
      console.log(starbucks.tags);
    } else {
      console.log('❌ Starbucks not found');
    }

    // Check how many stores have operationalInfo.hours
    const storesWithHours = await storesCollection.countDocuments({
      'operationalInfo.hours': { $exists: true }
    });
    console.log(`\n\n📊 Stores with operationalInfo.hours: ${storesWithHours} / 110`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkStoreData();
