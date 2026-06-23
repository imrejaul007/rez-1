const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function checkGalleryData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Get the store ID from the URL shown in the screenshot
    const storeId = '6937bc52bbdcc28f8cc26e63';

    // Check the store exists
    console.log('\n=== Checking Store ===');
    const store = await db.collection('stores').findOne({ _id: new ObjectId(storeId) });
    if (store) {
      console.log('Store found:', store.name);
      console.log('Store merchantId:', store.merchantId);
    } else {
      console.log('Store NOT found with ID:', storeId);
    }

    // Check gallery data for this store
    console.log('\n=== Checking Store Gallery ===');
    const galleryItems = await db.collection('storegalleries').find({
      storeId: new ObjectId(storeId)
    }).toArray();

    console.log('Gallery items count:', galleryItems.length);
    if (galleryItems.length > 0) {
      console.log('Sample gallery item:', JSON.stringify(galleryItems[0], null, 2));
    }

    // Check all gallery items in DB
    console.log('\n=== All Gallery Items in DB ===');
    const allGalleryItems = await db.collection('storegalleries').find({}).toArray();
    console.log('Total gallery items in database:', allGalleryItems.length);

    // List all stores to see what's available
    console.log('\n=== All Stores ===');
    const allStores = await db.collection('stores').find({}).project({ _id: 1, name: 1, merchantId: 1 }).toArray();
    console.log('Total stores:', allStores.length);
    allStores.forEach(s => {
      console.log(`  - ${s.name} (ID: ${s._id}, MerchantID: ${s.merchantId})`);
    });

    // Check UGC content as well
    console.log('\n=== Checking UGC Content ===');
    const ugcItems = await db.collection('ugccontents').find({
      storeId: new ObjectId(storeId)
    }).toArray();
    console.log('UGC items count:', ugcItems.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkGalleryData();
