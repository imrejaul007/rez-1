const mongoose = require('mongoose');
require('dotenv').config();

async function testQuery() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });

  const Store = mongoose.connection.db.collection('stores');

  // Test the exact query used by the controller
  const query = { isActive: true };

  console.log('Query:', JSON.stringify(query));

  const count = await Store.countDocuments(query);
  console.log('Total stores matching query:', count);

  const stores = await Store.find(query).limit(3).toArray();
  console.log('\nFirst 3 stores:');
  stores.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} - isActive: ${s.isActive}, has deliveryCategories: ${!!s.deliveryCategories}`);
  });

  await mongoose.connection.close();
}

testQuery().catch(console.error);
