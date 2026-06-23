// Quick script to check transaction structure
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';

async function check() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;

  if (!db) {
    console.log('No DB connection');
    process.exit(1);
  }

  // Get a sample transaction to see the structure
  const transaction = await db.collection('transactions').findOne({
    'source.metadata.storeInfo': { $exists: true }
  });

  console.log('Sample transaction source.metadata:');
  console.log(JSON.stringify(transaction?.source?.metadata, null, 2));
  console.log('\nStore ID in transaction:', transaction?.source?.metadata?.storeInfo?.id);
  console.log('Type of storeId:', typeof transaction?.source?.metadata?.storeInfo?.id);

  // Try the exact query that the controller uses
  const storeId = '6937bc52bbdcc28f8cc26e63';
  console.log('\n--- Testing controller query ---');
  console.log('Looking for storeId:', storeId);

  const results = await db.collection('transactions').find({
    'source.metadata.storeInfo.id': storeId,
    'status.current': 'completed',
    category: { $in: ['spending', 'paybill', 'cashback', 'earning'] }
  }).limit(5).toArray();

  console.log('Results found:', results.length);

  if (results.length === 0) {
    // Try without the category filter
    const results2 = await db.collection('transactions').find({
      'source.metadata.storeInfo.id': storeId
    }).limit(5).toArray();
    console.log('\nWithout category filter:', results2.length);

    // Try without any filter except storeInfo.id
    const results3 = await db.collection('transactions').find({
      'source.metadata.storeInfo.id': storeId
    }).limit(5).toArray();
    console.log('Just storeInfo.id:', results3.length);

    // Check all transactions with storeInfo
    const allWithStore = await db.collection('transactions').find({
      'source.metadata.storeInfo': { $exists: true }
    }).limit(10).toArray();
    console.log('\nAll transactions with storeInfo:', allWithStore.length);
    allWithStore.forEach((t: any, i: number) => {
      console.log(`  ${i+1}. Store ID: ${t.source?.metadata?.storeInfo?.id}, category: ${t.category}, status: ${t.status?.current}`);
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

check().catch(console.error);
