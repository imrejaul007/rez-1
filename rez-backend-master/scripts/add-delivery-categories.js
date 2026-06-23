const mongoose = require('mongoose');
require('dotenv').config();

async function addDeliveryCategories() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const storesCollection = db.collection('stores');

  try {
    console.log('\n🔍 Checking stores without deliveryCategories...\n');

    // Find stores without deliveryCategories field
    const storesWithout = await storesCollection.find({
      deliveryCategories: { $exists: false }
    }).toArray();

    console.log(`📦 Found ${storesWithout.length} stores without deliveryCategories\n`);

    if (storesWithout.length === 0) {
      console.log('✅ All stores have deliveryCategories!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Default deliveryCategories object
    const defaultDeliveryCategories = {
      fastDelivery: false,
      budgetFriendly: false,
      ninetyNineStore: false,
      premium: false,
      organic: false,
      alliance: false,
      lowestPrice: false,
      mall: false,
      cashStore: false
    };

    // Update each store
    for (const store of storesWithout) {
      console.log(`Updating "${store.name}"...`);

      await storesCollection.updateOne(
        { _id: store._id },
        { $set: { deliveryCategories: defaultDeliveryCategories } }
      );
    }

    console.log(`\n✅ Successfully added deliveryCategories to ${storesWithout.length} stores`);

    // Verify
    const remaining = await storesCollection.countDocuments({
      deliveryCategories: { $exists: false }
    });

    console.log(`\n📊 Verification:`);
    console.log(`  Stores without deliveryCategories: ${remaining}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

addDeliveryCategories();
